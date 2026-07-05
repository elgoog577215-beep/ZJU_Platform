const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../config/db');
const { loginAttemptTracker } = require('../middleware/security');

// FIX: BUG-02 — Remove hardcoded JWT secret fallback; fail fast if not configured
const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error('FATAL: SECRET_KEY environment variable is required. Set it before starting the server.');
}

const WECHAT_LOGIN_CODE_RE = /^[A-Za-z0-9_-]{8,160}$/;
const WECHAT_CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';

const signAuthToken = (user) => jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  SECRET_KEY,
  { expiresIn: '7d' }
);

const toAuthUser = (user) => ({
  id: user.id,
  username: user.username,
  role: user.role,
  nickname: user.nickname,
  avatar: user.avatar,
});

const hashValue = (value) => crypto
  .createHash('sha256')
  .update(String(value || ''))
  .digest('hex');

const buildWechatUsername = (openid) => `wx_${hashValue(openid).slice(0, 16)}`;

const exchangeWechatLoginCode = async (code) => {
  const appid = process.env.WECHAT_MINIAPP_APPID || process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_MINIAPP_SECRET || process.env.WECHAT_APP_SECRET;

  if (!appid || !secret) {
    const error = new Error('WeChat mini program login is not configured');
    error.statusCode = 503;
    error.publicMessage = 'WeChat login is not configured';
    throw error;
  }

  if (typeof fetch !== 'function') {
    const error = new Error('Global fetch is unavailable in this Node.js runtime');
    error.statusCode = 500;
    error.publicMessage = 'Server runtime does not support WeChat login';
    throw error;
  }

  const url = new URL(WECHAT_CODE2SESSION_URL);
  url.searchParams.set('appid', appid);
  url.searchParams.set('secret', secret);
  url.searchParams.set('js_code', code);
  url.searchParams.set('grant_type', 'authorization_code');

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const error = new Error(`WeChat code2session HTTP ${response.status}`);
    error.statusCode = 502;
    error.publicMessage = 'WeChat login failed';
    throw error;
  }

  const data = await response.json();
  if (data.errcode) {
    const error = new Error(`WeChat code2session failed: ${data.errcode}`);
    error.statusCode = 401;
    error.publicMessage = 'WeChat login failed';
    error.wechatErrcode = data.errcode;
    error.wechatErrmsg = data.errmsg;
    throw error;
  }

  if (!data.openid) {
    const error = new Error('WeChat code2session response missing openid');
    error.statusCode = 502;
    error.publicMessage = 'WeChat login failed';
    throw error;
  }

  return data;
};

const findOrCreateWechatMiniappUser = async (db, session) => {
  const now = new Date().toISOString();
  const sessionKeyHash = session.session_key ? hashValue(session.session_key) : null;
  const unionid = session.unionid || null;
  let transactionStarted = false;

  await db.exec('BEGIN IMMEDIATE');
  transactionStarted = true;
  try {
    const existingIdentity = await db.get(
      `SELECT wi.user_id, u.id, u.username, u.role, u.nickname, u.avatar
       FROM wechat_miniapp_identities wi
       JOIN users u ON u.id = wi.user_id
       WHERE wi.openid = ?`,
      [session.openid]
    );

    if (existingIdentity) {
      await db.run(
        `UPDATE wechat_miniapp_identities
         SET unionid = COALESCE(?, unionid),
             session_key_hash = ?,
             last_login_at = ?,
             updated_at = ?
         WHERE openid = ?`,
        [unionid, sessionKeyHash, now, now, session.openid]
      );
      await db.exec('COMMIT');
      return existingIdentity;
    }

    const username = buildWechatUsername(session.openid);
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    const nickname = `WeChat User ${hashValue(session.openid).slice(0, 6)}`;
    const userResult = await db.run(
      'INSERT INTO users (username, password, role, nickname, created_at) VALUES (?, ?, ?, ?, ?)',
      [username, passwordHash, 'user', nickname, now]
    );

    await db.run(
      `INSERT INTO wechat_miniapp_identities
        (user_id, openid, unionid, session_key_hash, last_login_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userResult.lastID, session.openid, unionid, sessionKeyHash, now, now, now]
    );

    await db.exec('COMMIT');
    return {
      id: userResult.lastID,
      username,
      role: 'user',
      nickname,
      avatar: null,
    };
  } catch (error) {
    if (transactionStarted) {
      await db.exec('ROLLBACK').catch((rollbackError) => {
        console.warn('Rollback warning (wechat_miniapp_login):', rollbackError.message);
      });
    }
    throw error;
  }
};

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

    const token = signAuthToken({ id: result.lastID, username, role });

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

    const token = signAuthToken(user);

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

    // FIX: BUG-14 — Look up actual admin user from database instead of hardcoding id:1
    const db = await getDb();
    let adminUser = await db.get("SELECT id, username, role FROM users WHERE role = 'admin' LIMIT 1");
    if (!adminUser) {
      // Fallback: create a virtual admin identity if no admin user exists in DB
      adminUser = { id: 0, username: 'admin', role: 'admin' };
    }

    const token = signAuthToken({ ...adminUser, role: 'admin' });

    res.json({ token, user: { id: adminUser.id, username: adminUser.username, role: 'admin' } });
  } catch (error) { next(error); }
};

const wechatMiniappLogin = async (req, res, next) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!WECHAT_LOGIN_CODE_RE.test(code)) {
      req.loginTracker?.recordFailed();
      return res.status(400).json({ error: 'Invalid WeChat login code' });
    }

    const db = await getDb();
    const session = await exchangeWechatLoginCode(code);
    const user = await findOrCreateWechatMiniappUser(db, session);
    const authUser = toAuthUser(user);
    const token = signAuthToken(authUser);

    req.loginTracker?.clear();

    await db.run(
      'INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)',
      [authUser.id, 'auth', 0, 'wechat_miniapp_login', 'User logged in with WeChat mini program']
    ).catch((error) => {
      console.warn('Audit log warning (wechat_miniapp_login):', error.message);
    });

    res.json({ token, user: authUser });
  } catch (error) {
    if (error.wechatErrcode) {
      console.warn('WeChat mini program login failed', {
        errcode: error.wechatErrcode,
        errmsg: error.wechatErrmsg,
      });
    }

    if (error.statusCode) {
      if (error.statusCode >= 400 && error.statusCode < 500) {
        req.loginTracker?.recordFailed();
      }
      return res.status(error.statusCode).json({ error: error.publicMessage || 'WeChat login failed' });
    }

    next(error);
  }
};

const me = async (req, res, next) => {
    try {
        const db = await getDb();
        // Fetch full user details from DB to ensure we have the latest data
        // Exclude password for security
        const user = await db.get('SELECT id, username, role, avatar, organization_cr, gender, age, nickname, created_at FROM users WHERE id = ?', [req.user.id]);
        
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

module.exports = { register, login, adminLogin, wechatMiniappLogin, me, changePassword, SECRET_KEY };
