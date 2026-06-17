import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['DONOR', 'HOSPITAL_STAFF', 'LAB_TECHNICIAN']).optional().default('DONOR'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  dateOfBirth: z.string().transform(str => new Date(str)),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  bloodType: z.enum([
    'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
    'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'
  ]).optional(),
  weight: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().positive().optional()
  )
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false)
});

export const donorSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  dateOfBirth: z.string().transform(str => new Date(str)),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  bloodType: z.enum([
    'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
    'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'
  ]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  weight: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().positive().optional()
  )
});

export const appointmentSchema = z.object({
  donorId: z.string().uuid(),
  bloodBankId: z.string().optional(),
  appointmentDate: z.string().transform(str => new Date(str)),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  notes: z.string().optional()
});

export const bloodUnitSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  bloodType: z.enum([
    'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
    'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'
  ]),
  component: z.string().default('WHOLE_BLOOD'),
  volume: z.number().positive(),
  collectedDate: z.string().transform(str => new Date(str)),
  expiryDate: z.string().transform(str => new Date(str)),
  storageLocation: z.string().optional(),
  collectedFromId: z.string().uuid().optional()
});

export const bloodRequestSchema = z.object({
  hospitalId: z.string().optional(),
  patientName: z.string().optional(),
  patientContact: z.string().optional(),
  requesterRelation: z.string().optional(),
  bloodType: z.enum([
    'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
    'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE'
  ]),
  quantity: z.number().int().positive(),
  priority: z.enum(['NORMAL', 'URGENT', 'EMERGENCY']).default('NORMAL'),
  requiredDate: z.string().transform(str => new Date(str)).optional(),
  notes: z.string().optional()
});

export const screeningSchema = z.object({
  donorId: z.string().uuid(),
  haemoglobinLevel: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().positive().max(25).optional()
  ),
  bloodPressureSystolic: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().positive().max(300).optional()
  ),
  bloodPressureDiastolic: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().positive().max(200).optional()
  ),
  heartRate: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().positive().max(300).optional()
  ),
  bodyTemperature: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().positive().max(45).optional()
  ),
  bloodSugarLevel: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().positive().max(600).optional()
  ),
  weight: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().positive().max(300).optional()
  ),
  notes: z.string().optional(),
  screeningDate: z.string().optional()
});

export const updateUserRoleSchema = z.object({
  role: z.enum([
    'SUPER_ADMIN', 'BLOOD_BANK_ADMIN', 'HOSPITAL_STAFF',
    'LAB_TECHNICIAN', 'DONOR', 'COORDINATOR'
  ])
});

export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};