const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');

const SECRET_KEY = 'your-secret-key'; // In production, use environment variable

const register = async (req, res) => {
  try {
    const db = await getDb();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if first user, make admin
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    const role = userCount.count === 0 ? 'admin' : 'user';

    const result = await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );

    const token = jwt.sign({ id: result.lastID, username, role }, SECRET_KEY, { expiresIn: '7d' });

    res.json({ token, user: { id: result.lastID, username, role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
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

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '7d' });

    // Log successful login
    await db.run(
      'INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)',
      [user.id, 'auth', 0, 'login', 'User logged in']
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { password } = req.body;

    if (password !== '12345') {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Issue a token for a generic admin user
    // We use a fixed ID (e.g., 1) and username 'admin'
    // This allows access to protected routes without a database user lookup
    const token = jwt.sign(
      { id: 1, username: 'admin', role: 'admin' }, 
      SECRET_KEY, 
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: 1, username: 'admin', role: 'admin' } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const me = async (req, res) => {
    // User is already attached by middleware
    res.json(req.user);
};

const changePassword = async (req, res) => {
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { register, login, adminLogin, me, changePassword, SECRET_KEY };