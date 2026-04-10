const { getDb } = require('../config/db');

let commentsColumnCache = null;

const getCommentsColumns = async (db) => {
    if (commentsColumnCache) return commentsColumnCache;
    const info = await db.all('PRAGMA table_info(comments)');
    commentsColumnCache = new Set(info.map((col) => col.name));
    return commentsColumnCache;
};

const createComment = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const { resourceId, resourceType, content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Comment content is required' });
        }

        const user = await db.get('SELECT username, avatar, nickname FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const authorName = user.nickname || user.username;

        const columns = await getCommentsColumns(db);
        const names = ['user_id', 'resource_id', 'resource_type', 'content'];
        const values = [userId, resourceId, resourceType, content];

        if (columns.has('author')) {
            names.push('author');
            values.push(authorName);
        } else if (columns.has('author_name')) {
            names.push('author_name');
            values.push(authorName);
        }

        if (columns.has('avatar')) {
            names.push('avatar');
            values.push(user.avatar || null);
        }

        const placeholders = names.map(() => '?').join(', ');
        const result = await db.run(
            `INSERT INTO comments (${names.join(', ')}) VALUES (${placeholders})`,
            values
        );

        const newComment = {
            id: result.lastID,
            user_id: userId,
            resource_id: resourceId,
            resource_type: resourceType,
            author: authorName,
            content,
            avatar: user.avatar || null,
            created_at: new Date().toISOString() // Approximate, DB has the real one
        };

        res.json(newComment);
    } catch (error) { next(error); }
};

const getComments = async (req, res, next) => {
    try {
        const db = await getDb();
        const { resourceId, resourceType } = req.query;

        if (!resourceId || !resourceType) {
            return res.status(400).json({ error: 'Resource ID and Type are required' });
        }

        const comments = await db.all(
            'SELECT * FROM comments WHERE resource_id = ? AND resource_type = ? ORDER BY created_at DESC',
            [resourceId, resourceType]
        );

        res.json(comments);
    } catch (error) { next(error); }
};

const deleteComment = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const { id } = req.params;

        const comment = await db.get('SELECT * FROM comments WHERE id = ?', [id]);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        // Allow author or admin to delete
        if (comment.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await db.run('DELETE FROM comments WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) { next(error); }
};

module.exports = {
    createComment,
    getComments,
    deleteComment
};
