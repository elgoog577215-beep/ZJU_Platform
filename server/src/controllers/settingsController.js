const { getDb } = require('../config/db');

// FIX: BUG-03 — Filter out sensitive fields from public settings response
const SENSITIVE_SETTINGS_KEYS = ['invite_code', 'admin_password', 'secret_key'];

const getSettings = async (req, res, next) => {
  try {
    const db = await getDb();
    const settings = await db.all('SELECT * FROM settings');
    const settingsObj = settings.reduce((acc, curr) => {
      if (!SENSITIVE_SETTINGS_KEYS.includes(curr.key)) {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {});
    res.json(settingsObj);
  } catch (error) { next(error); }
};

const updateSetting = async (req, res, next) => {
  try {
    const db = await getDb();
    const { key, value } = req.body;
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    res.json({ success: true, key, value });
  } catch (error) { next(error); }
};

module.exports = { getSettings, updateSetting };