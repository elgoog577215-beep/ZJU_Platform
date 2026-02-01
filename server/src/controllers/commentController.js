const { getDb } = require('../config/db');

const createComment = async (req, res) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const { resourceId, resourceType, content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Comment content is required' });
        }

        const user = await db.get('SELECT username, avatar, nickname FROM users WHERE id = ?', [userId]);
        const authorName = user.nickname || user.username;

        const result = await db.run(
            'INSERT INTO comments (user_id, resource_id, resource_type, author, content, avatar) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, resourceId, resourceType, authorName, content, user.avatar]
        );

        // Notify resource owner (if not self)
        // Need to find owner of the resource.
        // For simplicity, let's assume we can fetch it or just skip for now unless we implement ownership logic per resource.
        // But for photos/events uploaded by admin, maybe notify admin?
        // Let's implement basic notification if we can find the owner.
        
        // Return the created comment
        const newComment = {
            id: result.lastID,
            user_id: userId,
            resource_id: resourceId,
            resource_type: resourceType,
            author: authorName,
            content,
            avatar: user.avatar,
            created_at: new Date().toISOString() // Approximate, DB has the real one
        };

        res.json(newComment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getComments = async (req, res) => {
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteComment = async (req, res) => {
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createComment,
    getComments,
    deleteComment
};
