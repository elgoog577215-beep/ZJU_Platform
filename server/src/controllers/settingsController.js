const { getDb } = require('../config/db');

// FIX: BUG-03 — Filter out sensitive fields from public settings response
const SENSITIVE_SETTINGS_KEYS = ['invite_code', 'admin_password', 'secret_key'];
const DEFAULT_PUBLIC_SETTINGS = {
  allow_registrations: 'true',
};

const normalizeSettingValue = (key, value) => {
  if (key === 'allow_registrations') {
    return ['false', '0', 'off', 'no'].includes(String(value ?? '').trim().toLowerCase())
      ? 'false'
      : 'true';
  }
  return String(value);
};

const getSettings = async (req, res, next) => {
  try {
    const db = await getDb();
    const settings = await db.all('SELECT * FROM settings');
    const settingsObj = settings.reduce((acc, curr) => {
      if (!SENSITIVE_SETTINGS_KEYS.includes(curr.key)) {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, { ...DEFAULT_PUBLIC_SETTINGS });
    res.json(settingsObj);
  } catch (error) { next(error); }
};

const updateSetting = async (req, res, next) => {
  try {
    const db = await getDb();
    const { key, value } = req.body;
    const normalizedValue = normalizeSettingValue(key, value);
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, normalizedValue]);
    res.json({ success: true, key, value: normalizedValue });
  } catch (error) { next(error); }
};

module.exports = { getSettings, updateSetting, normalizeSettingValue };
