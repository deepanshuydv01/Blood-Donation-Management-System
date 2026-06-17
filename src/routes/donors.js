import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { donorSchema } from '../utils/validation.js';
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from '../utils/audit.js';

const router = Router();

// Get all donors (admin only)
router.get('/', authenticate, authorize('SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'COORDINATOR'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [donors, total] = await Promise.all([
      req.prisma.donor.findMany({
        include: {
          user: { select: { email: true } },
          _count: { select: { donations: true, appointments: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      req.prisma.donor.count()
    ]);

    res.json({
      data: donors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch donors' });
  }
});

// Get donor by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const donor = await req.prisma.donor.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { email: true } },
        appointments: { orderBy: { appointmentDate: 'desc' }, take: 10 },
        donations: { orderBy: { donationDate: 'desc' } }
      }
    });

    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    // Check access - donors can only view themselves
    if (req.user.role === 'DONOR' && req.user.id !== donor.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(donor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch donor' });
  }
});

// Create donor profile
router.post('/', authenticate, async (req, res) => {
  try {
    const data = donorSchema.parse(req.body);

    // For donors, link to their own user account
    if (req.user.role === 'DONOR') {
      const existing = await req.prisma.donor.findUnique({
        where: { userId: req.user.id }
      });

      if (existing) {
        return res.status(400).json({ error: 'Donor profile already exists' });
      }

      const donor = await req.prisma.donor.create({
        data: {
          userId: req.user.id,
          ...data
        }
      });

      await createAuditLog(req.prisma, {
        userId: req.user.id,
        action: AUDIT_ACTIONS.CREATE,
        entityType: ENTITY_TYPES.DONOR,
        entityId: donor.id
      });

      return res.status(201).json(donor);
    }

    // For staff creating donor profile
    const donor = await req.prisma.donor.create({
      data: {
        userId: data.userId || req.user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        bloodType: data.bloodType,
        address: data.address,
        city: data.city,
        state: data.state,
        weight: data.weight
      }
    });

    res.status(201).json(donor);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create donor' });
  }
});

// Update donor
router.put('/:id', authenticate, async (req, res) => {
  try {
    const donor = await req.prisma.donor.findUnique({
      where: { id: req.params.id }
    });

    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    // Check access
    if (req.user.role === 'DONOR' && req.user.id !== donor.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = donorSchema.partial().parse(req.body);
    const updated = await req.prisma.donor.update({
      where: { id: req.params.id },
      data
    });

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: ENTITY_TYPES.DONOR,
      entityId: donor.id
    });

    res.json(updated);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update donor' });
  }
});

// Check donor eligibility
router.get('/:id/eligibility', authenticate, async (req, res) => {
  try {
    const donor = await req.prisma.donor.findUnique({
      where: { id: req.params.id }
    });

    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    const checks = [];
    let eligible = true;

    // Age check (18-65 years)
    const age = new Date().getFullYear() - new Date(donor.dateOfBirth).getFullYear();
    if (age < 18 || age > 65) {
      eligible = false;
      checks.push({ rule: 'age', status: 'failed', message: 'Age must be between 18 and 65' });
    } else {
      checks.push({ rule: 'age', status: 'passed', message: `Age ${age} is within valid range` });
    }

    // Weight check (minimum 50kg)
    if (donor.weight && donor.weight < 50) {
      eligible = false;
      checks.push({ rule: 'weight', status: 'failed', message: 'Weight must be at least 50kg' });
    } else if (donor.weight) {
      checks.push({ rule: 'weight', status: 'passed', message: `Weight ${donor.weight}kg is valid` });
    }

    // Last donation check (minimum 90 days)
    if (donor.lastDonationDate) {
      const daysSinceLastDonation = Math.floor(
        (new Date() - new Date(donor.lastDonationDate)) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastDonation < 90) {
        eligible = false;
        checks.push({
          rule: 'donation_interval',
          status: 'failed',
          message: `Must wait 90 days between donations (${90 - daysSinceLastDonation} days remaining)`
        });
      } else {
        checks.push({ rule: 'donation_interval', status: 'passed', message: 'Eligible to donate again' });
      }
    } else {
      checks.push({ rule: 'donation_interval', status: 'passed', message: 'No previous donations recorded' });
    }

    // Medical conditions check
    if (donor.medicalConditions) {
      checks.push({ rule: 'medical', status: 'review', message: 'Medical conditions require staff review' });
    }

    res.json({ eligible, checks, eligibilityStatus: donor.eligibilityStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

export default router;