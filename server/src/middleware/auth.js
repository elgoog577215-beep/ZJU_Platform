const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../controllers/authController');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('[Auth] No token provided for:', req.originalUrl);
    return res.sendStatus(401);
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.log('[Auth] Token verification failed:', err.message, 'for:', req.originalUrl);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log('[Auth] Token verified. User:', user.username, 'Role:', user.role);
    req.user = user;
    next();
  });
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return next();

  jwt.verify(token, SECRET_KEY, (err, user) => {
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