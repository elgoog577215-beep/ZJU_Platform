const { getDb } = require('../config/db');

const getSettings = async (req, res) => {
  try {
    const db = await getDb();
    const settings = await db.all('SELECT * FROM settings');
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateSetting = async (req, res) => {
  try {
    const db = await getDb();
    const { key, value } = req.body;
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    res.json({ success: true, key, value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getSettings, updateSetting };