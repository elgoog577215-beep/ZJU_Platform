const { getDb } = require('../config/db');

const createNotification = async (userId, type, content, resourceId = null, resourceType = null) => {
    try {
        const db = await getDb();
        await db.run(
            'INSERT INTO notifications (user_id, type, content, related_resource_id, related_resource_type) VALUES (?, ?, ?, ?, ?)',
            [userId, type, content, resourceId, resourceType]
        );

    } catch (error) {
        console.error('[Notification] Create error:', error);
    }
};

const getNotifications = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const notifications = await db.all(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [userId, limit, offset]
        );

        const countResult = await db.get(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
            [userId]
        );
        
        const unreadCountResult = await db.get(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId]
        );

        res.json({
            data: notifications,
            unreadCount: unreadCountResult.count,
            pagination: {
                total: countResult.count,
                page,
                limit,
                totalPages: Math.ceil(countResult.count / limit)
            }
        });
    } catch (error) { next(error); }
};

const markAsRead = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const { id } = req.params;

        if (id === 'all') {
            await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
        } else {
            await db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId]);
        }

        res.json({ success: true });
    } catch (error) { next(error); }
};

const deleteNotification = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const { id } = req.params;

        if (id === 'all') {
            await db.run('DELETE FROM notifications WHERE user_id = ?', [userId]);
        } else {
            await db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
        }

        res.json({ success: true });
    } catch (error) { next(error); }
};

module.exports = {
    createNotification,
    getNotifications,
    markAsRead,
    deleteNotification
};
