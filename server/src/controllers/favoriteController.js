const { getDb } = require('../config/db');
const { createNotification } = require('./notificationController');

// FIX: O2 — Extract shared tableMap to module level (was duplicated in toggleFavorite and getFavorites)
const FAVORITE_TABLE_MAP = {
    'photo': 'photos',
    'music': 'music',
    'video': 'videos',
    'article': 'articles',
    'event': 'events'
};

const FAVORITE_RESOURCE_META = {
    photo: { table: 'photos', ownerColumn: 'uploader_id', label: '图片' },
    music: { table: 'music', ownerColumn: 'uploader_id', label: '音乐' },
    video: { table: 'videos', ownerColumn: 'uploader_id', label: '视频' },
    article: { table: 'articles', ownerColumn: 'uploader_id', label: '文章' },
    event: { table: 'events', ownerColumn: 'uploader_id', label: '活动' },
};

const resolveActorName = async (db, userId) => {
    const actor = await db.get('SELECT username, nickname FROM users WHERE id = ?', [userId]);
    return actor?.nickname || actor?.username || '有用户';
};

const resolveFavoriteTarget = async (db, itemType, itemId) => {
    const meta = FAVORITE_RESOURCE_META[itemType];
    if (!meta) return null;

    return db.get(
        `SELECT id, ${meta.ownerColumn} AS owner_id, title FROM ${meta.table} WHERE id = ?`,
        [itemId]
    );
};

const toggleFavorite = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const { itemId, itemType } = req.body;

        if (!itemId || !itemType) {
            return res.status(400).json({ error: 'Item ID and Type are required' });
        }

        const tableName = FAVORITE_TABLE_MAP[itemType];

        // Check if exists
        const existing = await db.get(
            'SELECT id FROM favorites WHERE user_id = ? AND item_id = ? AND item_type = ?', 
            [userId, itemId, itemType]
        );

        let newLikes = 0;

        if (existing) {
            // Remove
            await db.run(
                'DELETE FROM favorites WHERE id = ?',
                [existing.id]
            );

            // Recount likes authoritatively from favorites (self-heals NULL / drift)
            if (tableName) {
                await db.run(
                    `UPDATE ${tableName} SET likes = (SELECT COUNT(*) FROM favorites WHERE item_id = ? AND item_type = ?) WHERE id = ?`,
                    [itemId, itemType, itemId]
                );
                const item = await db.get(`SELECT likes FROM ${tableName} WHERE id = ?`, [itemId]);
                newLikes = item && typeof item.likes === 'number' ? item.likes : 0;
            }

            res.json({ favorited: false, likes: newLikes });
        } else {
            // Add
            await db.run(
                'INSERT INTO favorites (user_id, item_id, item_type) VALUES (?, ?, ?)',
                [userId, itemId, itemType]
            );

            // Recount likes authoritatively from favorites (self-heals NULL / drift)
            if (tableName) {
                await db.run(
                    `UPDATE ${tableName} SET likes = (SELECT COUNT(*) FROM favorites WHERE item_id = ? AND item_type = ?) WHERE id = ?`,
                    [itemId, itemType, itemId]
                );
                const item = await db.get(`SELECT likes FROM ${tableName} WHERE id = ?`, [itemId]);
                newLikes = item && typeof item.likes === 'number' ? item.likes : 0;
            }

            const target = await resolveFavoriteTarget(db, itemType, itemId);
            if (target?.owner_id && String(target.owner_id) !== String(userId)) {
                const actorName = await resolveActorName(db, userId);
                const resourceLabel = FAVORITE_RESOURCE_META[itemType]?.label || '内容';
                const resourceTitle = target.title || `这条${resourceLabel}`;
                await createNotification(
                    target.owner_id,
                    'favorite',
                    `${actorName} 收藏了你的${resourceLabel}《${resourceTitle}》`,
                    itemId,
                    itemType
                );
            }

            res.json({ favorited: true, likes: newLikes });
        }
    } catch (error) { next(error); }
};

const getFavorites = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const { type } = req.query; // optional filter

        let sql = 'SELECT * FROM favorites WHERE user_id = ?';
        let params = [userId];

        if (type) {
            sql += ' AND item_type = ?';
            params.push(type);
        }

        const favorites = await db.all(sql, params);
        
        // Enhance with actual item data if needed, but for now just return IDs map
        // Or better, fetch the items details. 
        // Let's just return the list first, user can fetch details on frontend or we do a JOIN here.
        // Doing a JOIN is complex because tables are dynamic. 
        // Let's return the list of {itemId, itemType} and let frontend fetch details or specific endpoint.
        
        // Actually, for "My Favorites" page, we want the item details.
        // We can do a loop or separate queries.
        
        // FIX: B11 — Batch-fetch favorites by type to eliminate N+1 query loop
        const grouped = {};
        for (const fav of favorites) {
            const table = FAVORITE_TABLE_MAP[fav.item_type];
            if (!table) continue;
            if (!grouped[fav.item_type]) grouped[fav.item_type] = { table, favs: [] };
            grouped[fav.item_type].favs.push(fav);
        }

        const results = [];
        for (const [itemType, { table, favs }] of Object.entries(grouped)) {
            const ids = favs.map(f => f.item_id);
            const placeholders = ids.map(() => '?').join(',');
            const items = await db.all(`SELECT * FROM ${table} WHERE id IN (${placeholders})`, ids);
            const itemMap = new Map(items.map(i => [i.id, i]));
            for (const fav of favs) {
                const item = itemMap.get(fav.item_id);
                if (item) results.push({ ...item, type: itemType, favorited_at: fav.created_at });
            }
        }

        res.json(results);
    } catch (error) { next(error); }
};

const checkFavoriteStatus = async (req, res, next) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const { itemId, itemType } = req.query;
        
        const existing = await db.get(
            'SELECT id FROM favorites WHERE user_id = ? AND item_id = ? AND item_type = ?', 
            [userId, itemId, itemType]
        );
        
        res.json({ favorited: !!existing });
    } catch (error) { next(error); }
}

module.exports = { toggleFavorite, getFavorites, checkFavoriteStatus };
