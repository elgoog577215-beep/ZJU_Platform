const { getDb } = require('../config/db');

const incrementView = async (req, res) => {
    try {
        const db = await getDb();
        const { type, id } = req.params;

        const tableMap = {
            'photo': 'photos',
            'music': 'music',
            'video': 'videos',
            'article': 'articles',
            'event': 'events'
        };

        const tableName = tableMap[type];
        if (!tableName) {
            return res.status(400).json({ error: 'Invalid resource type' });
        }

        // Increment views count
        await db.run(`UPDATE ${tableName} SET views = COALESCE(views, 0) + 1 WHERE id = ?`, [id]);
        
        // Get updated count
        const item = await db.get(`SELECT views FROM ${tableName} WHERE id = ?`, [id]);
        
        res.json({ views: item ? item.views : 0 });
    } catch (error) {
        console.error('Error incrementing view:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    incrementView
};
