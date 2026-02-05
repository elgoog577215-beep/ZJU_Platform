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

            await db.exec(`ALTER TABLE ${resource} ADD COLUMN tags TEXT`);
        }
    }
};

const getTags = async (req, res, next) => {
    try {
        await ensureTagsTable();
        const db = await getDb();
        const { type } = req.query;
        
        let targetTable = null;
        if (type) {
            const normalizedType = type.toLowerCase().trim();
            // Handle plural/singular mapping
            if (resources.includes(normalizedType)) {
                targetTable = normalizedType;
            } else if (resources.includes(normalizedType + 's')) {
                targetTable = normalizedType + 's';
            } else if (normalizedType.endsWith('s') && resources.includes(normalizedType.slice(0, -1))) {
                targetTable = normalizedType.slice(0, -1);
            } else if (normalizedType === 'gallery' || normalizedType === 'image') {
                targetTable = 'photos';
            } else if (normalizedType === 'audio') {
                targetTable = 'music';
            }

            // If a type was requested but not found, return empty to prevent leak
            if (!targetTable) {
                return res.json([]);
            }
        }

        if (targetTable) {
             // Only count tags from visible resources (not deleted, approved)
             // Check if columns exist first to avoid errors on tables that might lack them (though they should have them)
             let whereClause = "WHERE 1=1";
             try {
                 const columns = await db.all(`PRAGMA table_info(${targetTable})`);
                 const hasDeletedAt = columns.some(c => c.name === 'deleted_at');
                 const hasStatus = columns.some(c => c.name === 'status');
                 
                 if (hasDeletedAt) whereClause += " AND deleted_at IS NULL";
                 if (hasStatus) whereClause += " AND status = 'approved'";
             } catch (e) {
                 console.warn(`[TagController] Failed to check columns for ${targetTable}:`, e);
             }

             const items = await db.all(`SELECT tags FROM ${targetTable} ${whereClause}`);
             const tagCounts = {};
             
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
             
             const result = [];
             const names = Object.keys(tagCounts);
             
             if (names.length > 0) {
                 const placeholders = names.map(() => '?').join(',');
                 const definedTags = await db.all(`SELECT id, name FROM tags WHERE name IN (${placeholders})`, names);
                 const definedTagMap = new Map(definedTags.map(t => [t.name, t.id]));
                 
                 for (const [name, count] of Object.entries(tagCounts)) {
                     result.push({
                         id: definedTagMap.get(name) || `temp-${name}-${Date.now()}`,
                         name,
                         count
                     });
                 }
             }
             
             result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
             return res.json(result);
        }
        
        // Sync counts (optional, but good for "powerful" management)
        // For now, just return the tags.
        // We can optionally scan resources to populate the tags table if it's empty
        
        const tags = await db.all('SELECT * FROM tags ORDER BY count DESC, name ASC');
        res.json(tags);
    } catch (error) { next(error); }
};

const createTag = async (req, res, next) => {
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
    } catch (error) { next(error); }
};

const updateTag = async (req, res, next) => {
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
    } catch (error) { next(error); }
};

const deleteTag = async (req, res, next) => {
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
    } catch (error) { next(error); }
};

// Scan all resources and populate the tags table (Maintenance tool)
const syncTags = async (req, res, next) => {
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
    } catch (error) { next(error); }
};

module.exports = {
    getTags,
    createTag,
    updateTag,
    deleteTag,
    syncTags
};
