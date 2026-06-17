import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import donorRoutes from './routes/donors.js';
import appointmentRoutes from './routes/appointments.js';
import inventoryRoutes from './routes/inventory.js';
import requestRoutes from './routes/requests.js';
import notificationRoutes from './routes/notifications.js';
import screeningRoutes from './routes/screenings.js';
import adminRoutes from './routes/admin.js';
import { authLimiter } from './middleware/rateLimiter.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Make prisma available in routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/screenings', screeningRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`BDMS Server running on port ${PORT}`);
});

export { prisma };