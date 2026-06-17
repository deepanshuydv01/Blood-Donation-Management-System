import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { updateUserRoleSchema } from '../utils/validation.js';
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from '../utils/audit.js';

const router = Router();

// Get all users (admin only)
router.get('/users', authenticate, authorize('SUPER_ADMIN', 'BLOOD_BANK_ADMIN'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      req.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          donor: { select: { firstName: true, lastName: true, bloodType: true } },
          staff: { select: { firstName: true, lastName: true, department: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      req.prisma.user.count()
    ]);

    res.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user (admin only)
router.post('/users', authenticate, authorize('SUPER_ADMIN'), async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const existingUser = await req.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await req.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'DONOR'
      }
    });

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: ENTITY_TYPES.USER,
      entityId: user.id,
      details: { newRole: role }
    });

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user role
router.put('/users/:id/role', authenticate, authorize('SUPER_ADMIN'), async (req, res) => {
  try {
    const data = updateUserRoleSchema.parse(req.body);

    const user = await req.prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent self-demotion
    if (user.id === req.user.id && data.role !== 'SUPER_ADMIN') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const updated = await req.prisma.user.update({
      where: { id: req.params.id },
      data: { role: data.role }
    });

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: ENTITY_TYPES.USER,
      entityId: user.id,
      details: { oldRole: user.role, newRole: data.role }
    });

    res.json({ id: updated.id, email: updated.email, role: updated.role });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user
router.delete('/users/:id', authenticate, authorize('SUPER_ADMIN'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await req.prisma.user.delete({
      where: { id: req.params.id }
    });

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.DELETE,
      entityType: ENTITY_TYPES.USER,
      entityId: req.params.id
    });

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get audit logs
router.get('/audit-logs', authenticate, authorize('SUPER_ADMIN', 'BLOOD_BANK_ADMIN'), async (req, res) => {
  try {
    const { entityType, action, userId, limit = 100, offset = 0 } = req.query;

    const where = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const logs = await req.prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await req.prisma.auditLog.count({ where });

    res.json({ logs, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get system stats
router.get('/stats', authenticate, authorize('SUPER_ADMIN', 'BLOOD_BANK_ADMIN'), async (req, res) => {
  try {
    const [
      totalUsers,
      totalDonors,
      totalBloodUnits,
      availableUnits,
      pendingRequests,
      completedDonations
    ] = await Promise.all([
      req.prisma.user.count(),
      req.prisma.donor.count(),
      req.prisma.bloodUnit.count(),
      req.prisma.bloodUnit.count({ where: { status: 'AVAILABLE' } }),
      req.prisma.bloodRequest.count({ where: { status: 'PENDING' } }),
      req.prisma.donation.count({ where: { screeningResult: 'PASSED' } })
    ]);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentDonations = await req.prisma.donation.count({
      where: { donationDate: { gte: sevenDaysAgo } }
    });

    const recentRequests = await req.prisma.bloodRequest.count({
      where: { createdAt: { gte: sevenDaysAgo } }
    });

    res.json({
      totalUsers,
      totalDonors,
      totalBloodUnits,
      availableUnits,
      pendingRequests,
      completedDonations,
      recentDonations,
      recentRequests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;