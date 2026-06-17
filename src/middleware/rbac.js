// Role-Based Access Control middleware

const roleHierarchy = {
  SUPER_ADMIN: 5,
  BLOOD_BANK_ADMIN: 4,
  HOSPITAL_STAFF: 3,
  LAB_TECHNICIAN: 3,
  COORDINATOR: 2,
  DONOR: 1
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

export const isOwnerOrAdmin = (getOwnerId) => {
  return (req, res, next) => {
    const ownerId = getOwnerId(req);
    const userId = req.user.id;
    const role = req.user.role;

    if (role === 'SUPER_ADMIN' || role === 'BLOOD_BANK_ADMIN') {
      return next();
    }

    if (ownerId === userId) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied' });
  };
};

export { roleHierarchy };
