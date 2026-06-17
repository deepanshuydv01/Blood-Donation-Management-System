import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { screeningSchema } from '../utils/validation.js';

const router = Router();

const STAFF_ROLES = ['SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'LAB_TECHNICIAN'];

async function checkScreeningAccess(req, res, donorId) {
  if (STAFF_ROLES.includes(req.user.role)) return true;
  const donor = await req.prisma.donor.findUnique({ where: { userId: req.user.id } });
  if (!donor || donor.id !== donorId) {
    res.status(403).json({ error: 'Access denied' });
    return false;
  }
  return true;
}

router.get('/:donorId', authenticate, async (req, res) => {
  try {
    const donorId = req.params.donorId;
    if (!(await checkScreeningAccess(req, res, donorId))) return;
    const screenings = await req.prisma.healthScreening.findMany({
      where: { donorId },
      orderBy: { screeningDate: 'desc' },
      take: 20
    });
    res.json(screenings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch screenings' });
  }
});

router.get('/:donorId/latest', authenticate, async (req, res) => {
  try {
    const donorId = req.params.donorId;
    if (!(await checkScreeningAccess(req, res, donorId))) return;
    const screening = await req.prisma.healthScreening.findFirst({
      where: { donorId },
      orderBy: { screeningDate: 'desc' }
    });
    res.json(screening || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch latest screening' });
  }
});

router.post('/', authenticate, authorize('SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'LAB_TECHNICIAN'), async (req, res) => {
  try {
    const data = screeningSchema.parse(req.body);
    const screening = await req.prisma.healthScreening.create({
      data: {
        donorId: data.donorId,
        haemoglobinLevel: data.haemoglobinLevel ?? null,
        bloodPressureSystolic: data.bloodPressureSystolic ?? null,
        bloodPressureDiastolic: data.bloodPressureDiastolic ?? null,
        heartRate: data.heartRate ?? null,
        bodyTemperature: data.bodyTemperature ?? null,
        bloodSugarLevel: data.bloodSugarLevel ?? null,
        weight: data.weight ?? null,
        notes: data.notes ?? null,
        screeningDate: data.screeningDate ? new Date(data.screeningDate) : new Date()
      }
    });
    res.status(201).json(screening);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create screening' });
  }
});

export default router;
