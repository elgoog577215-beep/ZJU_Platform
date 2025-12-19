const { getDb } = require('../config/db');

const submitMessage = async (req, res) => {
  const { name, email, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO messages (name, email, message, date, read) VALUES (?, ?, ?, ?, 0)',
      [name, email, message, new Date().toISOString()]
    );
    res.status(201).json({ id: result.lastID, message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const db = await getDb();
    const messages = await db.all('SELECT * FROM messages ORDER BY date DESC');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteMessage = async (req, res) => {
    try {
        const db = await getDb();
        await db.run('DELETE FROM messages WHERE id = ?', [req.params.id]);
        res.json({ message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const db = await getDb();
        await db.run('UPDATE messages SET read = 1 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Message marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
  submitMessage,
  getMessages,
  deleteMessage,
  markAsRead
};
