const { getDb } = require('../config/db');

const VALID_STATUSES = new Set(['new', 'contacted', 'in_progress', 'closed']);
const VALID_GENDERS = new Set(['男', '女']);

const normalizeText = (value) => String(value || '').trim();

const lengthOf = (value) => Array.from(String(value || '')).length;

const validateRegistrationPayload = (payload) => {
  const topic = normalizeText(payload.topic);
  const name = normalizeText(payload.name);
  const age = Number(payload.age);
  const gender = normalizeText(payload.gender);
  const organization = normalizeText(payload.organization || payload.org);
  const email = normalizeText(payload.email);
  const phone = normalizeText(payload.phone);
  const message = normalizeText(payload.message);

  if (!topic) return { error: '请填写揭榜问题。' };
  if (!name) return { error: '请填写姓名。' };
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return { error: '请填写有效年龄。' };
  }
  if (!VALID_GENDERS.has(gender)) return { error: '请选择性别。' };
  if (!organization) return { error: '请填写学校或组织。' };
  if (!email && !phone) return { error: '请至少填写邮箱或电话号码中的一项。' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: '邮箱格式不正确。' };
  }

  if (lengthOf(topic) > 2000) return { error: '揭榜问题不能超过 2000 个字符。' };
  if (lengthOf(name) > 64) return { error: '姓名不能超过 64 个字符。' };
  if (lengthOf(organization) > 128) return { error: '学校或组织不能超过 128 个字符。' };
  if (lengthOf(email) > 128) return { error: '邮箱不能超过 128 个字符。' };
  if (lengthOf(phone) > 20) return { error: '电话号码不能超过 20 个字符。' };
  if (lengthOf(message) > 2000) return { error: '留言不能超过 2000 个字符。' };

  return {
    data: {
      topic,
      name,
      age,
      gender,
      organization,
      email,
      phone,
      message,
    },
  };
};

const registerFutureLearning = async (req, res, next) => {
  const validation = validateRegistrationPayload(req.body || {});
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const { topic, name, age, gender, organization, email, phone, message } =
    validation.data;

  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO future_learning_registrations
        (topic, name, age, gender, organization, email, phone, message, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
      [
        topic,
        name,
        age,
        gender,
        organization,
        email || null,
        phone || null,
        message,
        now,
        now,
      ],
    );

    res.status(201).json({ id: result.lastID, message: '提交成功' });
  } catch (error) {
    next(error);
  }
};

const getRegistrations = async (_req, res, next) => {
  try {
    const db = await getDb();
    const registrations = await db.all(
      'SELECT * FROM future_learning_registrations ORDER BY created_at DESC',
    );
    res.json(registrations);
  } catch (error) {
    next(error);
  }
};

const updateRegistration = async (req, res, next) => {
  const status = normalizeText(req.body?.status);
  const adminNote = normalizeText(req.body?.adminNote ?? req.body?.admin_note);

  if (status && !VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: '无效的跟进状态。' });
  }
  if (lengthOf(adminNote) > 2000) {
    return res.status(400).json({ error: '管理员备注不能超过 2000 个字符。' });
  }

  try {
    const db = await getDb();
    const existing = await db.get(
      'SELECT id FROM future_learning_registrations WHERE id = ?',
      [req.params.id],
    );
    if (!existing) {
      return res.status(404).json({ error: '报名记录不存在。' });
    }

    await db.run(
      `UPDATE future_learning_registrations
       SET status = COALESCE(NULLIF(?, ''), status),
           admin_note = ?,
           updated_at = ?
       WHERE id = ?`,
      [status, adminNote, new Date().toISOString(), req.params.id],
    );

    const updated = await db.get(
      'SELECT * FROM future_learning_registrations WHERE id = ?',
      [req.params.id],
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteRegistration = async (req, res, next) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM future_learning_registrations WHERE id = ?', [
      req.params.id,
    ]);
    res.json({ message: '报名记录已删除' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerFutureLearning,
  getRegistrations,
  updateRegistration,
  deleteRegistration,
};
