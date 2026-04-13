const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../controllers/authController');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('[Auth] No token provided for:', req.originalUrl);
    return res.sendStatus(401);
  }

  // FIX: BUG-12 — Specify algorithm to prevent "none" algorithm attack
  jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] }, async (err, user) => {
    if (err) {
      console.log('[Auth] Token verification failed:', err.message, 'for:', req.originalUrl);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // FIX: BUG-13 — Refresh role from database to prevent stale JWT role persistence
    try {
      const { getDb } = require('../config/db');
      const db = await getDb();
      const dbUser = await db.get('SELECT id, username, role FROM users WHERE id = ?', [user.id]);
      if (dbUser) {
        user.role = dbUser.role;
      }
    } catch (dbErr) {
      // Fall back to JWT role if DB lookup fails
    }
    req.user = user;
    next();
  });
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next();

  // FIX: BUG-12 — Specify algorithm for optionalAuth as well
  jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] }, (err, user) => {
    if (!err) {
        req.user = user;
    }
    next();
  });
};

const isAdmin = (req, res, next) => {
    console.log('[Auth] isAdmin check. User:', req.user?.username, 'Role:', req.user?.role);
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        console.log('[Auth] Admin access denied. User role:', req.user?.role);
        res.status(403).json({ error: 'Admin access required' });
    }
};

module.exports = { authenticateToken, isAdmin, optionalAuth };