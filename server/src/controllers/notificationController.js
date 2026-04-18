const { getDb } = require('../config/db');

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
        const payload = JSON.stringify({
            related_resource_id: resourceId,
            related_resource_type: resourceType,
        });
        await db.run(
            'INSERT INTO notifications (user_id, type, content, data) VALUES (?, ?, ?, ?)',
            [userId, type, content, payload]
        );
    } catch (error) {
        console.error('[Notification] Create error:', error);
    }
};

const RESOURCE_TYPE_LABEL = {
    article: '文章',
    photo: '图片',
    music: '音乐',
    video: '视频',
    event: '活动',
    news: '新闻',
};

/**
 * Fan out a new_content notification to every follower of `authorId`.
 *
 * Filters out banned users and (when the column exists) soft-deleted users.
 * Any internal error is swallowed — fan-out MUST NOT abort the parent resource
 * creation flow (see follow-new-content-notifications spec, "Fan-out failure
 * does not abort resource creation").
 *
 * @param {object} args
 * @param {number} args.authorId - uploader/author id of the new resource
 * @param {string} args.resourceType - one of article/photo/music/video/event/news
 * @param {number} args.resourceId - id of the newly inserted resource row
 * @param {string} args.title - resource title (falls back to "（无标题）")
 */
const fanOutNewContent = async ({ authorId, resourceType, resourceId, title }) => {
    if (!authorId || !resourceType || !resourceId) return;
    const label = RESOURCE_TYPE_LABEL[resourceType];
    if (!label) return; // unknown type: skip fan-out

    try {
        const db = await getDb();
        // Author display name (nickname || username)
        const author = await db.get(
            'SELECT username, nickname FROM users WHERE id = ?',
            [authorId]
        );
        if (!author) return;
        const authorName = author.nickname || author.username || '某用户';

        // Followers, excluding banned (+ deleted_at when the column exists)
        const userCols = await db.all('PRAGMA table_info(users)');
        const hasDeletedAt = userCols.some((c) => c.name === 'deleted_at');
        const followerQuery = hasDeletedAt
            ? `SELECT uf.follower_id FROM user_follows uf
               JOIN users u ON u.id = uf.follower_id
               WHERE uf.following_id = ?
                 AND (u.role IS NULL OR u.role != 'banned')
                 AND u.deleted_at IS NULL`
            : `SELECT uf.follower_id FROM user_follows uf
               JOIN users u ON u.id = uf.follower_id
               WHERE uf.following_id = ?
                 AND (u.role IS NULL OR u.role != 'banned')`;
        const rows = await db.all(followerQuery, [authorId]);

        const safeTitle = title && String(title).trim() ? String(title).trim() : '（无标题）';
        const content = `${authorName} 发布了新${label}《${safeTitle}》`;

        for (const row of rows) {
            await createNotification(row.follower_id, 'new_content', content, resourceId, resourceType);
        }
    } catch (err) {
        console.error('[fanOutNewContent] error:', err);
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
    fanOutNewContent,
    getNotifications,
    markAsRead,
    deleteNotification
};
