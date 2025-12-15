const { getDb } = require('../config/db');

// Map resource names to their singular form or specific category table names if irregular
const getCategoryTable = (resource) => {
    // Simple plural to singular mapping
    const map = {
        photos: 'photo',
        videos: 'video',
        music: 'music',
        articles: 'article',
        events: 'event'
    };
    
    const singular = map[resource];
    if (!singular) throw new Error(`Unknown resource type: ${resource}`);
    return `${singular}_categories`;
};

// Map resource to its category column name (mostly 'category', but articles uses 'tag')
const getCategoryColumn = (resource) => {
    return resource === 'articles' ? 'tag' : 'category';
};

const getCategories = (resource) => async (req, res) => {
  try {
    const db = await getDb();
    const catTable = getCategoryTable(resource);
    const catCol = getCategoryColumn(resource);
    
    // Try to get from category table first
    try {
        const categories = await db.all(`SELECT * FROM ${catTable} ORDER BY name`);
        if (categories.length > 0) {
            return res.json(categories.map(c => c.name));
        }
    } catch (e) {
        // Table might not exist or empty
    }
    
    // Fallback to distinct (should be seeded, but just in case)
    const categories = await db.all(`SELECT DISTINCT ${catCol} FROM ${resource}`);
    res.json(categories.map(c => c[catCol]).filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addCategory = (resource) => async (req, res) => {
    try {
        const db = await getDb();
        const { name } = req.body;
        const catTable = getCategoryTable(resource);
        
        if (!name) return res.status(400).json({ error: 'Name is required' });
        
        await db.run(`INSERT INTO ${catTable} (name) VALUES (?)`, [name]);
        res.json({ success: true, name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateCategory = (resource) => async (req, res) => {
    try {
        const db = await getDb();
        const { oldName } = req.params;
        const { newName } = req.body;
        const catTable = getCategoryTable(resource);
        const catCol = getCategoryColumn(resource);
        
        if (!newName) return res.status(400).json({ error: 'New name is required' });

        // Update the category in the definition table
        await db.run(`UPDATE ${catTable} SET name = ? WHERE name = ?`, [newName, oldName]);
        
        // Also update all items using this category
        await db.run(`UPDATE ${resource} SET ${catCol} = ? WHERE ${catCol} = ?`, [newName, oldName]);
        
        res.json({ success: true, oldName, newName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteCategory = (resource) => async (req, res) => {
    try {
        const db = await getDb();
        const { name } = req.params;
        const catTable = getCategoryTable(resource);
        
        await db.run(`DELETE FROM ${catTable} WHERE name = ?`, [name]);
        
        // Items are already handled by frontend (moved to 'Uncategorized'), 
        // but strictly speaking we could do it here too to be safe.
        // Frontend does: Update items -> Delete category.
        // Let's ensure items are uncategorized here too? 
        // User requirements say "Independent category management".
        // The frontend logic `handleDelete` does: 1. Update items to '未分类', 2. Delete category.
        // So we just delete the definition here.
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { 
    getCategories, 
    addCategory, 
    updateCategory, 
    deleteCategory 
};