const { getDb } = require('../config/db');

const toggleFavorite = async (req, res) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const { itemId, itemType } = req.body;

        if (!itemId || !itemType) {
            return res.status(400).json({ error: 'Item ID and Type are required' });
        }

        // Check if exists
        const existing = await db.get(
            'SELECT id FROM favorites WHERE user_id = ? AND item_id = ? AND item_type = ?', 
            [userId, itemId, itemType]
        );

        if (existing) {
            // Remove
            await db.run(
                'DELETE FROM favorites WHERE id = ?', 
                [existing.id]
            );
            res.json({ favorited: false });
        } else {
            // Add
            await db.run(
                'INSERT INTO favorites (user_id, item_id, item_type) VALUES (?, ?, ?)', 
                [userId, itemId, itemType]
            );
            res.json({ favorited: true });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getFavorites = async (req, res) => {
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
        
        const results = [];
        for (const fav of favorites) {
            const tableMap = {
                'photo': 'photos',
                'music': 'music',
                'video': 'videos',
                'article': 'articles',
                'event': 'events'
            };
            const table = tableMap[fav.item_type];
            if (table) {
                const item = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [fav.item_id]);
                if (item) {
                    results.push({ ...item, type: fav.item_type, favorited_at: fav.created_at });
                }
            }
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const checkFavoriteStatus = async (req, res) => {
    try {
        const db = await getDb();
        const userId = req.user.id;
        const { itemId, itemType } = req.query;
        
        const existing = await db.get(
            'SELECT id FROM favorites WHERE user_id = ? AND item_id = ? AND item_type = ?', 
            [userId, itemId, itemType]
        );
        
        res.json({ favorited: !!existing });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { toggleFavorite, getFavorites, checkFavoriteStatus };