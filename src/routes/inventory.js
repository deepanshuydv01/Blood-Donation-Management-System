import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { bloodUnitSchema } from '../utils/validation.js';
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from '../utils/audit.js';

const router = Router();

const LOW_STOCK_THRESHOLD = 2;

async function checkLowStock(prisma) {
  try {
    const counts = await prisma.bloodUnit.groupBy({
      by: ['bloodType'],
      where: { status: 'AVAILABLE' },
      _count: true
    });

    const adminUsers = await prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'BLOOD_BANK_ADMIN'] } }
    });

    for (const entry of counts) {
      if (entry._count <= LOW_STOCK_THRESHOLD) {
        for (const admin of adminUsers) {
          const existingAlert = await prisma.notification.findFirst({
            where: {
              userId: admin.id,
              type: 'LOW_STOCK',
              message: { contains: entry.bloodType },
              isRead: false
            }
          });
          if (!existingAlert) {
            await prisma.notification.create({
              data: {
                userId: admin.id,
                type: 'LOW_STOCK',
                title: `Low Stock: ${entry.bloodType.replace('_', ' ')}`,
                message: `Only ${entry._count} units of ${entry.bloodType.replace('_', ' ')} remaining in inventory.`
              }
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Low stock check failed:', e.message);
  }
}

// Compatibility matrix for blood type matching
const compatibilityMatrix = {
  O_NEGATIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  O_POSITIVE: ['O_POSITIVE', 'A_POSITIVE', 'B_POSITIVE', 'AB_POSITIVE'],
  A_NEGATIVE: ['A_NEGATIVE', 'A_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  A_POSITIVE: ['A_POSITIVE', 'AB_POSITIVE'],
  B_NEGATIVE: ['B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  B_POSITIVE: ['B_POSITIVE', 'AB_POSITIVE'],
  AB_NEGATIVE: ['AB_NEGATIVE', 'AB_POSITIVE'],
  AB_POSITIVE: ['AB_POSITIVE']
};

// Get all blood units (with filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, bloodType, storageLocation, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const where = {};

    if (status) where.status = status;
    if (bloodType) where.bloodType = bloodType;
    if (storageLocation) where.storageLocation = storageLocation;
    if (search) {
      where.OR = [
        { unitNumber: { contains: search } },
        { storageLocation: { contains: search } }
      ];
    }

    const [units, total, stats] = await Promise.all([
      req.prisma.bloodUnit.findMany({
        where,
        include: {
          collectedFrom: { select: { firstName: true, lastName: true, bloodType: true } }
        },
        orderBy: { expiryDate: 'asc' },
        skip,
        take: limit
      }),
      req.prisma.bloodUnit.count({ where }),
      req.prisma.bloodUnit.groupBy({
        by: ['status', 'bloodType'],
        _count: true
      })
    ]);

    res.json({
      data: units,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Search compatible blood units
router.get('/search', authenticate, async (req, res) => {
  try {
    const { bloodType, excludeStatus, quantity } = req.query;

    if (!bloodType) {
      return res.status(400).json({ error: 'Blood type is required' });
    }

    const compatibleTypes = compatibilityMatrix[bloodType] || [bloodType];

    const where = {
      bloodType: { in: compatibleTypes },
      status: 'AVAILABLE'
    };

    if (excludeStatus) {
      if (excludeStatus === 'AVAILABLE') {
        where.status = { not: 'AVAILABLE' };
      }
    }

    if (quantity) {
      where.volume = { gte: parseInt(quantity) * 450 }; // Approx ml per unit
    }

    // Check expiry - only show units not expiring within 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    where.expiryDate = { gt: sevenDaysFromNow };

    const units = await req.prisma.bloodUnit.findMany({
      where,
      orderBy: { expiryDate: 'asc' }
    });

    res.json({
      requestedType: bloodType,
      compatibleTypes,
      count: units.length,
      units
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to search inventory' });
  }
});

// Get single blood unit
router.get('/:id', authenticate, async (req, res) => {
  try {
    const unit = await req.prisma.bloodUnit.findUnique({
      where: { id: req.params.id },
      include: {
        collectedFrom: { select: { firstName: true, lastName: true, bloodType: true } }
      }
    });

    if (!unit) {
      return res.status(404).json({ error: 'Blood unit not found' });
    }

    res.json(unit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch blood unit' });
  }
});

// Add blood unit (lab technician, admin)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'LAB_TECHNICIAN'), async (req, res) => {
  try {
    const data = bloodUnitSchema.parse(req.body);

    // Check for duplicate unit number
    const existing = await req.prisma.bloodUnit.findUnique({
      where: { unitNumber: data.unitNumber }
    });

    if (existing) {
      return res.status(400).json({ error: 'Unit number already exists' });
    }

    const unit = await req.prisma.bloodUnit.create({
      data: {
        ...data,
        status: 'COLLECTED'
      }
    });

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: ENTITY_TYPES.BLOOD_UNIT,
      entityId: unit.id,
      details: { unitNumber: unit.unitNumber, bloodType: unit.bloodType }
    });

    checkLowStock(req.prisma);

    res.status(201).json(unit);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create blood unit' });
  }
});

// Update blood unit status
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'LAB_TECHNICIAN'), async (req, res) => {
  try {
    const { status, storageLocation, testedById } = req.body;

    const unit = await req.prisma.bloodUnit.findUnique({
      where: { id: req.params.id }
    });

    if (!unit) {
      return res.status(404).json({ error: 'Blood unit not found' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (storageLocation) updateData.storageLocation = storageLocation;
    if (testedById) updateData.testedById = testedById;

    const updated = await req.prisma.bloodUnit.update({
      where: { id: req.params.id },
      data: updateData
    });

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: ENTITY_TYPES.BLOOD_UNIT,
      entityId: unit.id,
      details: { status, storageLocation }
    });

    // Check if expiring soon for notification
    if (status === 'TESTED' || status === 'AVAILABLE') {
      const daysUntilExpiry = Math.floor(
        (new Date(unit.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilExpiry <= 7) {
        // Trigger notification (in real app, use a job queue)
        console.log(`Alert: Blood unit ${unit.unitNumber} expires in ${daysUntilExpiry} days`);
      }
    }

    checkLowStock(req.prisma);

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update blood unit' });
  }
});

// Delete/discard blood unit
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'BLOOD_BANK_ADMIN'), async (req, res) => {
  try {
    const unit = await req.prisma.bloodUnit.findUnique({
      where: { id: req.params.id }
    });

    if (!unit) {
      return res.status(404).json({ error: 'Blood unit not found' });
    }

    await req.prisma.bloodUnit.update({
      where: { id: req.params.id },
      data: { status: 'DISCARDED' }
    });

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.DELETE,
      entityType: ENTITY_TYPES.BLOOD_UNIT,
      entityId: unit.id,
      details: { reason: 'DISCARDED' }
    });

    res.json({ message: 'Blood unit discarded' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to discard blood unit' });
  }
});

// Get inventory summary/dashboard
router.get('/summary/dashboard', authenticate, async (req, res) => {
  try {
    const total = await req.prisma.bloodUnit.count();
    const available = await req.prisma.bloodUnit.count({ where: { status: 'AVAILABLE' } });
    const expiringSoon = await req.prisma.bloodUnit.count({
      where: {
        status: { in: ['TESTED', 'AVAILABLE'] },
        expiryDate: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
      }
    });

    const byType = await req.prisma.bloodUnit.groupBy({
      by: ['bloodType'],
      where: { status: 'AVAILABLE' },
      _count: true
    });

    const byStatus = await req.prisma.bloodUnit.groupBy({
      by: ['status'],
      _count: true
    });

    res.json({
      total,
      available,
      expiringSoon,
      byType,
      byStatus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

export default router;