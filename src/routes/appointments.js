import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { appointmentSchema } from '../utils/validation.js';
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from '../utils/audit.js';

const router = Router();

// Get available slots
router.get('/slots', authenticate, async (req, res) => {
  try {
    const { date, bloodBankId } = req.query;

    const where = {
      isActive: true,
      available: { gt: 0 }
    };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = { gte: startOfDay, lte: endOfDay };
    }

    if (bloodBankId) {
      where.bloodBankId = bloodBankId;
    }

    const slots = await req.prisma.appointmentSlot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    });

    res.json(slots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Get appointments (user's own or all for admin)
router.get('/', authenticate, async (req, res) => {
  try {
    let where = {};

    // Regular donors see only their own appointments
    if (req.user.role === 'DONOR') {
      const donor = await req.prisma.donor.findFirst({
        where: { userId: req.user.id }
      });
      if (donor) {
        where.donorId = donor.id;
      }
    } else if (req.query.donorId) {
      where.donorId = req.query.donorId;
    }

    const appointments = await req.prisma.appointment.findMany({
      where,
      include: {
        donor: true
      },
      orderBy: { appointmentDate: 'desc' }
    });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Book appointment
router.post('/', authenticate, async (req, res) => {
  try {
    const data = appointmentSchema.parse(req.body);

    // Verify donor exists and belongs to user (if donor is booking)
    const donor = await req.prisma.donor.findUnique({
      where: { id: data.donorId }
    });

    if (!donor) {
      return res.status(404).json({ error: 'Donor not found' });
    }

    if (req.user.role === 'DONOR' && donor.userId !== req.user.id) {
      return res.status(403).json({ error: 'Cannot book for another donor' });
    }

    // Check slot availability
    const startOfDay = new Date(data.appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(data.appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    const slot = await req.prisma.appointmentSlot.findFirst({
      where: {
        bloodBankId: data.bloodBankId || 'default',
        date: { gte: startOfDay, lte: endOfDay },
        startTime: data.startTime,
        isActive: true
      }
    });

    if (slot && slot.available <= 0) {
      return res.status(400).json({ error: 'No available slots for this time' });
    }

    const appointment = await req.prisma.appointment.create({
      data: {
        donorId: data.donorId,
        bloodBankId: data.bloodBankId || 'default',
        appointmentDate: data.appointmentDate,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes,
        status: 'SCHEDULED'
      }
    });

    // Update slot availability
    if (slot) {
      await req.prisma.appointmentSlot.update({
        where: { id: slot.id },
        data: { available: slot.available - 1 }
      });
    }

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.BOOK,
      entityType: ENTITY_TYPES.APPOINTMENT,
      entityId: appointment.id
    });

    res.status(201).json(appointment);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// Reschedule appointment
router.put('/:id', authenticate, async (req, res) => {
  try {
    const appointment = await req.prisma.appointment.findUnique({
      where: { id: req.params.id }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check ownership or admin
    if (req.user.role === 'DONOR') {
      const donor = await req.prisma.donor.findFirst({
        where: { userId: req.user.id }
      });
      if (donor?.id !== appointment.donorId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const data = appointmentSchema.partial().parse(req.body);
    const updated = await req.prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        appointmentDate: data.appointmentDate,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes
      }
    });

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: ENTITY_TYPES.APPOINTMENT,
      entityId: appointment.id
    });

    res.json(updated);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Cancel appointment
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const appointment = await req.prisma.appointment.findUnique({
      where: { id: req.params.id }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check ownership or admin
    if (req.user.role === 'DONOR') {
      const donor = await req.prisma.donor.findFirst({
        where: { userId: req.user.id }
      });
      if (donor?.id !== appointment.donorId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    await req.prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.CANCEL,
      entityType: ENTITY_TYPES.APPOINTMENT,
      entityId: appointment.id
    });

    res.json({ message: 'Appointment cancelled' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// Create appointment slot (admin only)
router.post('/slots', authenticate, authorize('SUPER_ADMIN', 'BLOOD_BANK_ADMIN'), async (req, res) => {
  try {
    const { bloodBankId, date, startTime, endTime, capacity } = req.body;

    const slot = await req.prisma.appointmentSlot.create({
      data: {
        bloodBankId: bloodBankId || 'default',
        date: new Date(date),
        startTime,
        endTime,
        capacity: capacity || 10,
        available: capacity || 10
      }
    });

    res.status(201).json(slot);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create slot' });
  }
});

export default router;