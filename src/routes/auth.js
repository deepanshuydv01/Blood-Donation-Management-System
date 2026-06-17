import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../utils/validation.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { createAuditLog, AUDIT_ACTIONS, ENTITY_TYPES } from '../utils/audit.js';

const router = Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await req.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await req.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        role: data.role || 'DONOR'
      }
    });

    if (data.role === 'DONOR') {
      await req.prisma.donor.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          bloodType: data.bloodType || null,
          weight: data.weight || null
        }
      });
    } else {
      await req.prisma.staff.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          department: null,
          hospitalName: data.role === 'HOSPITAL_STAFF' ? '' : null,
          bloodBankName: data.role === 'LAB_TECHNICIAN' ? '' : null
        }
      });
    }

    await createAuditLog(req.prisma, {
      userId: user.id,
      action: AUDIT_ACTIONS.REGISTER,
      entityType: ENTITY_TYPES.USER,
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const userWithProfile = await req.prisma.user.findUnique({
      where: { id: user.id },
      include: { donor: true, staff: true }
    });

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: userWithProfile.id,
        email: userWithProfile.email,
        role: userWithProfile.role,
        donor: userWithProfile.donor,
        staff: userWithProfile.staff
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await req.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await createAuditLog(req.prisma, {
      userId: user.id,
      action: AUDIT_ACTIONS.LOGIN,
      entityType: ENTITY_TYPES.USER,
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    const rememberMe = data.rememberMe === true;
    const accessToken = generateAccessToken(user, rememberMe);
    const refreshToken = generateRefreshToken(user);

    const userWithProfile = await req.prisma.user.findUnique({
      where: { id: user.id },
      include: { donor: true, staff: true }
    });

    res.json({
      message: 'Login successful',
      user: {
        id: userWithProfile.id,
        email: userWithProfile.email,
        role: userWithProfile.role,
        donor: userWithProfile.donor,
        staff: userWithProfile.staff
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        donor: true,
        staff: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;