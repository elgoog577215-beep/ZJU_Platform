const { getDb } = require('../config/db');

const submitMessage = async (req, res, next) => {
  const { name, email, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate field lengths
  if (name.length > 100) {
    return res.status(400).json({ error: 'Name is too long (max 100 characters)' });
  }
  if (email.length > 255) {
    return res.status(400).json({ error: 'Email is too long (max 255 characters)' });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message is too long (max 5000 characters)' });
  }

  try {
    const db = await getDb();
    const result = await db.run(
      'INSERT INTO messages (name, email, message, date, read) VALUES (?, ?, ?, ?, 0)',
      [name.trim(), email.trim().toLowerCase(), message.trim(), new Date().toISOString()]
    );
    res.status(201).json({ id: result.lastID, message: 'Message sent successfully' });
  } catch (error) { next(error); }
};

const getMessages = async (req, res, next) => {
  try {
    const db = await getDb();
    const messages = await db.all('SELECT * FROM messages ORDER BY date DESC');
    res.json(messages);
  } catch (error) { next(error); }
};

const deleteMessage = async (req, res, next) => {
    try {
        const db = await getDb();
        await db.run('DELETE FROM messages WHERE id = ?', [req.params.id]);
        res.json({ message: 'Message deleted' });
    } catch (error) { next(error); }
};

const markAsRead = async (req, res, next) => {
    try {
        const db = await getDb();
        await db.run('UPDATE messages SET read = 1 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Message marked as read' });
    } catch (error) { next(error); }
}

module.exports = {
  submitMessage,
  getMessages,
  deleteMessage,
  markAsRead
};
