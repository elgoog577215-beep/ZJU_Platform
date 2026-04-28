const { getDb } = require('../config/db');

const registerHackathon = async (req, res, next) => {
  const { name, studentId, major, grade, aiTools, experience } = req.body;

  if (!name || !studentId || !major || !grade) {
    return res.status(400).json({ error: '所有必填字段均为必填项' });
  }

  if (name.length > 100) {
    return res.status(400).json({ error: '姓名不能超过 100 个字符' });
  }
  if (studentId.length > 50) {
    return res.status(400).json({ error: '学号不能超过 50 个字符' });
  }
  if (major.length > 100) {
    return res.status(400).json({ error: '专业不能超过 100 个字符' });
  }

  const validGrades = ['freshman', 'sophomore', 'junior', 'senior', 'master', 'phd'];
  if (!validGrades.includes(grade)) {
    return res.status(400).json({ error: '无效的年级选项' });
  }

  if (!Array.isArray(aiTools) || aiTools.length === 0) {
    return res.status(400).json({ error: '请至少选择一个 AI 工具' });
  }

  const validTools = ['claude', 'codex', 'cursor', 'trae', 'other'];
  const invalidTools = aiTools.filter(tool => !validTools.includes(tool));
  if (invalidTools.length > 0) {
    return res.status(400).json({ error: '包含无效的 AI 工具选项' });
  }

  if (experience && experience.length > 500) {
    return res.status(400).json({ error: '开发经历不能超过 500 个字符' });
  }

  try {
    const db = await getDb();

    const existing = await db.get('SELECT id FROM hackathon_registrations WHERE student_id = ?', [studentId.trim()]);
    if (existing) {
      return res.status(409).json({ error: '该学号已报名，请勿重复提交' });
    }

    const aiToolsJson = JSON.stringify(aiTools);
    const experienceText = (experience || '').trim();
    const result = await db.run(
      'INSERT INTO hackathon_registrations (name, student_id, major, grade, ai_tools, experience, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name.trim(), studentId.trim().toLowerCase(), major.trim(), grade, aiToolsJson, experienceText, new Date().toISOString()]
    );

    res.status(201).json({ id: result.lastID, message: '报名成功' });
  } catch (error) {
    next(error);
  }
};

const getRegistrations = async (req, res, next) => {
  try {
    const db = await getDb();
    const registrations = await db.all('SELECT * FROM hackathon_registrations ORDER BY created_at DESC');
    res.json(registrations);
  } catch (error) {
    next(error);
  }
};

const deleteRegistration = async (req, res, next) => {
  try {
    const db = await getDb();
    await db.run('DELETE FROM hackathon_registrations WHERE id = ?', [req.params.id]);
    res.json({ message: '报名记录已删除' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerHackathon,
  getRegistrations,
  deleteRegistration,
};
