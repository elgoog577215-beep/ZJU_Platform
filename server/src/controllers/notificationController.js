const { getDb } = require('../config/db');

let notificationColumnCache = null;

const getNotificationColumns = async (db) => {
    if (notificationColumnCache) return notificationColumnCache;
    const info = await db.all('PRAGMA table_info(notifications)');
    notificationColumnCache = new Set(info.map((col) => col.name));
    return notificationColumnCache;
};

const safeParseNotificationData = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

const normalizeNotificationRow = (row) => {
    const data = safeParseNotificationData(row?.data);
    return {
        ...row,
        content: row?.content || row?.message || row?.title || '',
        related_resource_id: row?.related_resource_id ?? data.related_resource_id ?? data.resourceId ?? null,
        related_resource_type: row?.related_resource_type ?? data.related_resource_type ?? data.resourceType ?? null,
        is_read: Boolean(row?.is_read),
    };
};

const createNotification = async (userId, type, content, resourceId = null, resourceType = null) => {
    try {
        const db = await getDb();
        const columns = await getNotificationColumns(db);

        if (columns.has('content')) {
            await db.run(
                'INSERT INTO notifications (user_id, type, content, related_resource_id, related_resource_type) VALUES (?, ?, ?, ?, ?)',
                [userId, type, content, resourceId, resourceType]
            );
            return;
        }

        const payload = JSON.stringify({
            related_resource_id: resourceId,
            related_resource_type: resourceType,
        });

        await db.run(
            'INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, ?, ?, ?, ?)',
            [userId, type, type, content, payload]
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

        // FIX: O1 — Parallelize 3 independent queries with Promise.all()
        const [notifications, countResult, unreadCountResult] = await Promise.all([
            db.all(
                'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
                [userId, limit, offset]
            ),
            db.get(
                'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
                [userId]
            ),
            db.get(
                'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
                [userId]
            )
        ]);

        res.json({
            data: notifications.map(normalizeNotificationRow),
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
