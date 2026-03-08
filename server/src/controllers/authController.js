const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');
const { loginAttemptTracker } = require('../middleware/security');

const SECRET_KEY = process.env.SECRET_KEY || 'dev-secret-key-change-in-prod';

const register = async (req, res, next) => {
  try {
    const db = await getDb();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
        // Security: Use generic message or keep specific if user enumeration is not a concern
        // For public apps, 'Username already exists' is fine for UX.
        return res.status(400).json({ error: 'Username already exists' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds
    
    // Check if first user, make admin
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    const role = userCount.count === 0 ? 'admin' : 'user';

    const result = await db.run(
      'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, role, new Date().toISOString()]
    );

    const token = jwt.sign({ id: result.lastID, username, role }, SECRET_KEY, { expiresIn: '7d' });

    res.json({ token, user: { id: result.lastID, username, role } });
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const db = await getDb();
    const { username, password } = req.body;

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Upgrade hash if using old format (optional, not strictly necessary if all users are new)
    // But good practice if migrating
    const BCRYPT_REGEX = /^\$2[ayb]\$.{56}$/;
    if (!BCRYPT_REGEX.test(user.password)) {
        const newHash = await bcrypt.hash(password, 12);
        await db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '7d' });

    // Log successful login
    await db.run(
      'INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)',
      [user.id, 'auth', 0, 'login', 'User logged in']
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) { next(error); }
};

const adminLogin = async (req, res, next) => {
  try {
    const { password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    const lockStatus = loginAttemptTracker.isLocked(clientIp);
    if (lockStatus.locked) {
      return res.status(429).json({ 
        error: 'Account temporarily locked',
        message: `Too many failed attempts. Try again in ${lockStatus.remainingMinutes} minutes.`,
        retryAfter: lockStatus.remainingMinutes * 60
      });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('Admin login attempted but ADMIN_PASSWORD not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    if (password !== adminPassword) {
      loginAttemptTracker.recordFailed(clientIp);
      const status = loginAttemptTracker.isLocked(clientIp);
      return res.status(401).json({ 
        error: 'Invalid password',
        attemptsRemaining: status.attemptsRemaining || 0
      });
    }

    loginAttemptTracker.clear(clientIp);

    const token = jwt.sign(
      { id: 1, username: 'admin', role: 'admin' }, 
      SECRET_KEY, 
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: 1, username: 'admin', role: 'admin' } });
  } catch (error) { next(error); }
};

const me = async (req, res, next) => {
    try {
        const db = await getDb();
        // Fetch full user details from DB to ensure we have the latest data
        // Exclude password for security
        const user = await db.get('SELECT id, username, role, avatar, organization as organization_cr, gender, age, nickname, created_at FROM users WHERE id = ?', [req.user.id]);
        
        if (!user) {
            // Handle special case for hardcoded admin (id: 1)
            if (req.user.id === 1 && req.user.username === 'admin') {
                return res.json({
                    id: 1,
                    username: 'admin',
                    role: 'admin',
                    nickname: 'Administrator',
                    created_at: new Date().toISOString()
                });
            }
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) { next(error); }
};

const changePassword = async (req, res, next) => {
    try {
        const db = await getDb();
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        res.json({ message: 'Password updated successfully' });
    } catch (error) { next(error); }
};

module.exports = { register, login, adminLogin, me, changePassword, SECRET_KEY };
