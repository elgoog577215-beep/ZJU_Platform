const { getDb } = require('../config/db');

const getComments = async (req, res) => {
  try {
    const db = await getDb();
    const comments = await db.all('SELECT * FROM comments WHERE articleId = ? ORDER BY id DESC', [req.params.id]);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const db = await getDb();
    const { author, content, avatar } = req.body;
    const date = new Date().toISOString().split('T')[0];
    const result = await db.run(
      'INSERT INTO comments (articleId, author, content, date, avatar) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, author, content, date, avatar]
    );
    res.json({ id: result.lastID, author, content, date, avatar });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getComments, addComment };