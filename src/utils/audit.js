export const createAuditLog = async (prisma, data) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || null,
        details: data.details ? JSON.stringify(data.details) : null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  BOOK: 'BOOK',
  CANCEL: 'CANCEL',
  RESERVE: 'RESERVE',
  ISSUE: 'ISSUE'
};

export const ENTITY_TYPES = {
  USER: 'User',
  DONOR: 'Donor',
  BLOOD_UNIT: 'BloodUnit',
  APPOINTMENT: 'Appointment',
  BLOOD_REQUEST: 'BloodRequest',
  NOTIFICATION: 'Notification'
};