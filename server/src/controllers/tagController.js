const { getDb } = require('../config/db');

// Resources that have tags
const resources = ['photos', 'videos', 'music', 'articles', 'events'];

const ensureTagsTable = async () => {
    const db = await getDb();
    await db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            count INTEGER DEFAULT 0
        )
    `);
    
    // Ensure 'tags' column exists in all resource tables
    for (const resource of resources) {
        const columns = await db.all(`PRAGMA table_info(${resource})`);
        const hasTags = columns.some(c => c.name === 'tags');
        if (!hasTags) {
            console.log(`Adding tags column to ${resource}...`);
            await db.exec(`ALTER TABLE ${resource} ADD COLUMN tags TEXT`);
        }
    }
};

const getTags = async (req, res) => {
    try {
        await ensureTagsTable();
        const db = await getDb();
        
        // Sync counts (optional, but good for "powerful" management)
        // For now, just return the tags.
        // We can optionally scan resources to populate the tags table if it's empty
        
        const tags = await db.all('SELECT * FROM tags ORDER BY count DESC, name ASC');
        res.json(tags);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createTag = async (req, res) => {
    try {
        await ensureTagsTable();
        const db = await getDb();
        const { name } = req.body;
        
        if (!name) return res.status(400).json({ error: 'Name is required' });
        
        try {
            const result = await db.run('INSERT INTO tags (name, count) VALUES (?, 0)', [name.trim()]);
            res.json({ id: result.lastID, name: name.trim(), count: 0 });
        } catch (e) {
            if (e.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Tag already exists' });
            }
            throw e;
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateTag = async (req, res) => {
    try {
        await ensureTagsTable();
        const db = await getDb();
        const { id } = req.params;
        const { name: newName } = req.body;
        
        if (!newName) return res.status(400).json({ error: 'New name is required' });
        
        const oldTag = await db.get('SELECT name FROM tags WHERE id = ?', id);
        if (!oldTag) return res.status(404).json({ error: 'Tag not found' });
        
        const oldName = oldTag.name;
        
        // Update tag definition
        await db.run('UPDATE tags SET name = ? WHERE id = ?', [newName.trim(), id]);
        
        // Update all resources
        // This is tricky with comma-separated strings.
        // We need to replace "tag" with "newTag", but "tag" might be part of "tagging".
        // Regex replacement in SQLite is hard.
        // We will fetch all items containing the old tag, update in JS, and save back.
        
        for (const resource of resources) {
            const items = await db.all(`SELECT id, tags FROM ${resource} WHERE tags LIKE ?`, [`%${oldName}%`]);
            
            for (const item of items) {
                if (!item.tags) continue;
                
                const currentTags = item.tags.split(',').map(t => t.trim());
                if (currentTags.includes(oldName)) {
                    const updatedTags = currentTags.map(t => t === oldName ? newName.trim() : t).join(',');
                    await db.run(`UPDATE ${resource} SET tags = ? WHERE id = ?`, [updatedTags, item.id]);
                }
            }
        }
        
        res.json({ success: true, oldName, newName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteTag = async (req, res) => {
    try {
        await ensureTagsTable();
        const db = await getDb();
        const { id } = req.params;
        
        const tag = await db.get('SELECT name FROM tags WHERE id = ?', id);
        if (!tag) return res.status(404).json({ error: 'Tag not found' });
        
        const tagName = tag.name;
        
        // Delete definition
        await db.run('DELETE FROM tags WHERE id = ?', id);
        
        // Remove from resources
        for (const resource of resources) {
            const items = await db.all(`SELECT id, tags FROM ${resource} WHERE tags LIKE ?`, [`%${tagName}%`]);
            
            for (const item of items) {
                if (!item.tags) continue;
                
                const currentTags = item.tags.split(',').map(t => t.trim());
                const newTags = currentTags.filter(t => t !== tagName).join(',');
                
                if (newTags !== item.tags) {
                    await db.run(`UPDATE ${resource} SET tags = ? WHERE id = ?`, [newTags, item.id]);
                }
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Scan all resources and populate the tags table (Maintenance tool)
const syncTags = async (req, res) => {
    try {
        await ensureTagsTable();
        const db = await getDb();
        
        const tagCounts = {};
        
        for (const resource of resources) {
            const items = await db.all(`SELECT tags FROM ${resource}`);
            for (const item of items) {
                if (item.tags) {
                    item.tags.split(',').forEach(t => {
                        const tag = t.trim();
                        if (tag) {
                            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                        }
                    });
                }
            }
        }
        
        // Update DB
        for (const [name, count] of Object.entries(tagCounts)) {
            const existing = await db.get('SELECT id FROM tags WHERE name = ?', name);
            if (existing) {
                await db.run('UPDATE tags SET count = ? WHERE id = ?', [count, existing.id]);
            } else {
                await db.run('INSERT INTO tags (name, count) VALUES (?, ?)', [name, count]);
            }
        }
        
        // Clean up tags with 0 count? Maybe not, maybe admins want to keep unused tags.
        // Let's just return the result.
        
        res.json({ success: true, stats: tagCounts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getTags,
    createTag,
    updateTag,
    deleteTag,
    syncTags
};
