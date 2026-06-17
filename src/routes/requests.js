import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { bloodRequestSchema } from '../utils/validation.js';
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from '../utils/audit.js';

const router = Router();

const COMPATIBLE_DONORS = {
  O_NEGATIVE: ['O_NEGATIVE', 'O_POSITIVE', 'A_NEGATIVE', 'A_POSITIVE', 'B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  O_POSITIVE: ['O_POSITIVE', 'A_POSITIVE', 'B_POSITIVE', 'AB_POSITIVE'],
  A_NEGATIVE: ['A_NEGATIVE', 'A_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  A_POSITIVE: ['A_POSITIVE', 'AB_POSITIVE'],
  B_NEGATIVE: ['B_NEGATIVE', 'B_POSITIVE', 'AB_NEGATIVE', 'AB_POSITIVE'],
  B_POSITIVE: ['B_POSITIVE', 'AB_POSITIVE'],
  AB_NEGATIVE: ['AB_NEGATIVE', 'AB_POSITIVE'],
  AB_POSITIVE: ['AB_POSITIVE']
};

// Get all requests
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, priority, bloodType } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (bloodType) where.bloodType = bloodType;

    const [requests, total] = await Promise.all([
      req.prisma.bloodRequest.findMany({
        where,
        include: {
          reservations: {
            include: {
              bloodUnit: true
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      req.prisma.bloodRequest.count({ where })
    ]);

    res.json({
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get single request
router.get('/:id', authenticate, async (req, res) => {
  try {
    const request = await req.prisma.bloodRequest.findUnique({
      where: { id: req.params.id },
      include: {
        reservations: {
          include: {
            bloodUnit: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// Create blood request (staff/admin only)
router.post('/', authenticate, authorize('SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'HOSPITAL_STAFF', 'COORDINATOR'), async (req, res) => {
  try {
    const data = bloodRequestSchema.parse(req.body);

    const request = await req.prisma.bloodRequest.create({
      data: {
        hospitalId: data.hospitalId || null,
        patientName: data.patientName || null,
        patientContact: data.patientContact || null,
        requesterRelation: data.requesterRelation || null,
        requestedById: req.user.id,
        bloodType: data.bloodType,
        quantity: data.quantity,
        priority: data.priority,
        requiredDate: data.requiredDate,
        notes: data.notes,
        status: 'PENDING'
      }
    });

    // Notify blood bank admins
    const adminUsers = await req.prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'BLOOD_BANK_ADMIN'] } }
    });

    for (const admin of adminUsers) {
      await req.prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'REQUEST_STATUS',
          title: 'New Blood Request',
          message: `New ${data.priority} priority request for ${data.quantity} units of ${data.bloodType}`
        }
      });
    }

    // Notify compatible donors (Feature 2)
    const compatibleTypes = COMPATIBLE_DONORS[data.bloodType] || [data.bloodType];
    const compatibleDonors = await req.prisma.donor.findMany({
      where: {
        bloodType: { in: compatibleTypes },
        eligibilityStatus: true,
        OR: [
          { lastDonationDate: null },
          { lastDonationDate: { lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } }
        ]
      },
      include: { user: { select: { id: true } } }
    });

    for (const donor of compatibleDonors) {
      await req.prisma.notification.create({
        data: {
          userId: donor.user.id,
          type: 'BLOOD_NEEDED',
          title: `Blood Needed: ${data.bloodType.replace('_', ' ')}`,
          message: `A ${data.priority.toLowerCase()} request for ${data.quantity} units of ${data.bloodType.replace('_', ' ')} has been placed. Your blood type is compatible!`
        }
      });
    }

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.CREATE,
      entityType: ENTITY_TYPES.BLOOD_REQUEST,
      entityId: request.id,
      details: { bloodType: data.bloodType, quantity: data.quantity, priority: data.priority }
    });

    res.status(201).json(request);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// Update request
router.put('/:id', authenticate, async (req, res) => {
  try {
    const request = await req.prisma.bloodRequest.findUnique({
      where: { id: req.params.id }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const isAdmin = ['SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'HOSPITAL_STAFF'].includes(req.user.role);
    const isOwner = request.requestedById === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {};

    if (isAdmin) {
      // Staff/admin can update status and notes
      const { status, notes } = req.body;
      if (status) {
        updateData.status = status;
        if (status === 'FULFILLED') {
          updateData.fulfillmentDate = new Date();
        }
      }
      if (notes) updateData.notes = notes;
    }

    if (isOwner && request.status === 'PENDING') {
      // Requester can edit details while request is pending
      const { bloodType, quantity, priority, requiredDate, notes, patientName, patientContact, requesterRelation, hospitalId } = req.body;
      if (bloodType) updateData.bloodType = bloodType;
      if (quantity) updateData.quantity = quantity;
      if (priority) updateData.priority = priority;
      if (requiredDate) updateData.requiredDate = new Date(requiredDate);
      if (notes !== undefined) updateData.notes = notes;
      if (patientName !== undefined) updateData.patientName = patientName;
      if (patientContact !== undefined) updateData.patientContact = patientContact;
      if (requesterRelation !== undefined) updateData.requesterRelation = requesterRelation;
      if (hospitalId !== undefined) updateData.hospitalId = hospitalId;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updated = await req.prisma.bloodRequest.update({
      where: { id: req.params.id },
      data: updateData
    });

    if (isAdmin && updateData.status) {
      await req.prisma.notification.create({
        data: {
          userId: request.requestedById,
          type: 'REQUEST_STATUS',
          title: 'Request Updated',
          message: `Your blood request has been updated to: ${updateData.status}`
        }
      });
    }

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: ENTITY_TYPES.BLOOD_REQUEST,
      entityId: request.id,
      details: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// Fulfill request (reserve blood units)
router.put('/:id/fulfill', authenticate, authorize('SUPER_ADMIN', 'BLOOD_BANK_ADMIN'), async (req, res) => {
  try {
    const { unitIds } = req.body;

    const request = await req.prisma.bloodRequest.findUnique({
      where: { id: req.params.id }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status === 'FULFILLED') {
      return res.status(400).json({ error: 'Request already fulfilled' });
    }

    // Reserve units
    const reservations = [];
    for (const unitId of unitIds) {
      const unit = await req.prisma.bloodUnit.findUnique({
        where: { id: unitId }
      });

      if (!unit || unit.status !== 'AVAILABLE') {
        return res.status(400).json({ error: `Unit ${unitId} is not available` });
      }

      // Update unit status
      await req.prisma.bloodUnit.update({
        where: { id: unitId },
        data: { status: 'RESERVED' }
      });

      // Create reservation
      const reservation = await req.prisma.reservation.create({
        data: {
          bloodRequestId: request.id,
          bloodUnitId: unitId,
          status: 'ACTIVE'
        }
      });

      reservations.push(reservation);

      await createAuditLog(req.prisma, {
        userId: req.user.id,
        action: AUDIT_ACTIONS.RESERVE,
        entityType: ENTITY_TYPES.BLOOD_UNIT,
        entityId: unitId,
        details: { requestId: request.id }
      });
    }

    // Update request status
    await req.prisma.bloodRequest.update({
      where: { id: request.id },
      data: { status: 'APPROVED', fulfillmentDate: new Date() }
    });

    // Notify requester
    await req.prisma.notification.create({
      data: {
        userId: request.requestedById,
        type: 'REQUEST_STATUS',
        title: 'Request Approved',
        message: `${reservations.length} units have been reserved for your request`
      }
    });

    res.json({ message: 'Request fulfilled', reservations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fulfill request' });
  }
});

// Cancel request
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const request = await req.prisma.bloodRequest.findUnique({
      where: { id: req.params.id }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Only the requester or admin can cancel
    if (request.requestedById !== req.user.id && !['SUPER_ADMIN', 'BLOOD_BANK_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Release reserved units
    const reservations = await req.prisma.reservation.findMany({
      where: { bloodRequestId: request.id, status: 'ACTIVE' }
    });

    for (const reservation of reservations) {
      await req.prisma.bloodUnit.update({
        where: { id: reservation.bloodUnitId },
        data: { status: 'AVAILABLE' }
      });

      await req.prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED', releasedAt: new Date() }
      });
    }

    await req.prisma.bloodRequest.update({
      where: { id: request.id },
      data: { status: 'CANCELLED' }
    });

    await createAuditLog(req.prisma, {
      userId: req.user.id,
      action: AUDIT_ACTIONS.CANCEL,
      entityType: ENTITY_TYPES.BLOOD_REQUEST,
      entityId: request.id
    });

    res.json({ message: 'Request cancelled and units released' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

export default router;