const { getDb } = require('../config/db');
const { deleteFileFromUrl } = require('../utils/fileUtils');

// Helper Factories
const createHandler = (table, fields) => async (req, res) => {
  try {
    const db = await getDb();
    const placeholders = fields.map(() => '?').join(',');
    
    // Determine status based on user role
    const userRole = req.user ? req.user.role : 'admin'; // Default to admin/approved for this demo/personal project
    // If not authenticated, maybe reject? For now let's assume auth middleware is used.
    // If user is admin, auto-approve. Else pending.
    const status = userRole === 'admin' ? 'approved' : 'approved'; // Force approved for smoother experience as requested
    const uploader_id = req.user ? req.user.id : null;

    const sql = `INSERT INTO ${table} (${fields.join(',')}, status, uploader_id) VALUES (${placeholders}, ?, ?)`;
    const values = [...fields.map(field => req.body[field]), status, uploader_id];
    
    const result = await db.run(sql, values);
    res.json({ id: result.lastID, ...req.body, status, likes: 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateHandler = (table, fields) => async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    
    // Check for file changes to delete old files
    const oldItem = await db.get(`SELECT * FROM ${table} WHERE id = ?`, id);
    if (oldItem) {
      const fileFields = ['url', 'cover', 'thumbnail', 'image', 'audio', 'video'];
      fileFields.forEach(field => {
        if (req.body[field] && req.body[field] !== oldItem[field]) {
          deleteFileFromUrl(oldItem[field]);
        }
      });
    }

    const setClause = fields.map(field => `${field} = ?`).join(',');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const values = [...fields.map(field => req.body[field]), id];
    await db.run(sql, values);
    res.json({ id, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteHandler = (table) => async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    console.log(`[ResourceController] Soft deleting from ${table}, ID: ${id}`);
    
    // Soft delete: Update deleted_at timestamp
    await db.run(`UPDATE ${table} SET deleted_at = datetime('now') WHERE id = ?`, id);
    
    console.log(`[ResourceController] Item moved to trash`);
    res.json({ message: 'Moved to trash' });
  } catch (error) {
    console.error(`[ResourceController] Delete error:`, error);
    res.status(500).json({ error: error.message });
  }
};

const permanentDeleteHandler = (table) => async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    console.log(`[ResourceController] Permanently deleting from ${table}, ID: ${id}`);
    
    // Delete associated files
    const item = await db.get(`SELECT * FROM ${table} WHERE id = ?`, id);
    if (item) {
        console.log(`[ResourceController] Item found, deleting files...`);
        const fileFields = ['url', 'cover', 'thumbnail', 'image', 'audio', 'video'];
        fileFields.forEach(field => {
            if (item[field]) {
                console.log(`[ResourceController] Deleting file: ${item[field]}`);
                deleteFileFromUrl(item[field]);
            }
        });
    }

    await db.run(`DELETE FROM ${table} WHERE id = ?`, id);
    console.log(`[ResourceController] DB permanent delete executed`);
    res.json({ message: 'Permanently deleted' });
  } catch (error) {
    console.error(`[ResourceController] Permanent delete error:`, error);
    res.status(500).json({ error: error.message });
  }
};

const restoreHandler = (table) => async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    console.log(`[ResourceController] Restoring item in ${table}, ID: ${id}`);
    
    await db.run(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, id);
    
    console.log(`[ResourceController] Item restored`);
    res.json({ message: 'Restored successfully' });
  } catch (error) {
    console.error(`[ResourceController] Restore error:`, error);
    res.status(500).json({ error: error.message });
  }
};

const getSingularType = (table) => {
    const map = {
        'photos': 'photo',
        'music': 'music',
        'videos': 'video',
        'articles': 'article',
        'events': 'event'
    };
    return map[table] || table.slice(0, -1);
};

const getOneHandler = (table) => async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const itemType = getSingularType(table);

    let query = `SELECT ${table}.*`;
    let params = [];

    if (userId) {
         query += `, (SELECT 1 FROM favorites WHERE favorites.item_id = ${table}.id AND favorites.item_type = ? AND favorites.user_id = ?) as favorited`;
         params.push(itemType, userId);
    }

    query += ` FROM ${table} WHERE id = ?`;
    params.push(id);

    const item = await db.get(query, params);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Convert favorited to boolean
    if (userId) {
        item.favorited = !!item.favorited;
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllHandler = (table, defaultLimit = 12) => async (req, res) => {
    try {
        const db = await getDb();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || defaultLimit;
        const category = req.query.category;
        const tag = req.query.tag; // For articles
        const status = req.query.status || 'approved'; // Default to approved only
        const uploader_id = req.query.uploader_id;
        const sort = req.query.sort || 'newest'; // Default to newest
        const search = req.query.search; // Generic search
        const trashed = req.query.trashed === 'true'; // Check if requesting trash
        const offset = (page - 1) * limit;

        const userId = (req.user && req.user.id) ? req.user.id : null;
        const itemType = getSingularType(table);

        let query = `SELECT ${table}.*`;
        let params = [];

        if (userId) {
             query += `, (SELECT 1 FROM favorites WHERE favorites.item_id = ${table}.id AND favorites.item_type = ? AND favorites.user_id = ?) as favorited`;
             params.push(itemType, userId);
        }

        query += ` FROM ${table}`;

        let countQuery = `SELECT COUNT(*) as count FROM ${table}`;
        let countParams = [];
        let whereClauses = [];
        
        // Trash Filter
        if (trashed) {
            whereClauses.push('deleted_at IS NOT NULL');
        } else {
            whereClauses.push('deleted_at IS NULL');
        }

        // Generic Search
        if (search && search.trim() !== '') {
            const searchTerm = `%${search}%`;
            whereClauses.push('(title LIKE ? OR tags LIKE ?)');
            params.push(searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm);
        }

        // Filter by status unless asking for 'all'
        if (status !== 'all') {
            whereClauses.push('status = ?');
            params.push(status);
            countParams.push(status);
        }

        if (uploader_id) {
            whereClauses.push('uploader_id = ?');
            params.push(uploader_id);
            countParams.push(uploader_id);
        }

        if (category && category !== 'All') {
            whereClauses.push('category = ?');
            params.push(category);
            countParams.push(category);
        }
        if (tag && tag !== 'All') {
            whereClauses.push('tag = ?');
            params.push(tag);
            countParams.push(tag);
        }
        
        // Tags Search (comma separated in DB, but simple LIKE here for single tag search)
        const tagsQuery = req.query.tags;
        if (tagsQuery && tagsQuery.trim() !== '') {
             whereClauses.push('tags LIKE ?');
             const tagTerm = `%${tagsQuery}%`;
             params.push(tagTerm);
             countParams.push(tagTerm);
        }

        // Lifecycle filter for events
        const lifecycle = req.query.lifecycle;
        if (lifecycle && table === 'events') {
             if (lifecycle === 'upcoming') {
                 whereClauses.push('date > date("now", "localtime")');
             } else if (lifecycle === 'past') {
                 whereClauses.push('date < date("now", "localtime")');
             } else if (lifecycle === 'ongoing') {
                 whereClauses.push('date = date("now", "localtime")');
             }
        }

        if (whereClauses.length > 0) {
            const whereSQL = ' WHERE ' + whereClauses.join(' AND ');
            query += whereSQL;
            countQuery += whereSQL;
        }

        // Sorting Logic
        switch (sort) {
            case 'oldest':
                query += ' ORDER BY id ASC';
                break;
            case 'likes':
                query += ' ORDER BY likes DESC, id DESC';
                break;
            case 'title':
                query += ' ORDER BY title ASC';
                break;
            case 'newest':
            default:
                query += ' ORDER BY id DESC';
                break;
        }

        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const items = await db.all(query, params);
        const countResult = await db.get(countQuery, countParams);

        // Convert favorited to boolean for all items
        if (userId) {
            items.forEach(item => {
                item.favorited = !!item.favorited;
            });
        }

        res.json({
            data: items,
            pagination: {
                total: countResult.count,
                page,
                limit,
                totalPages: Math.ceil(countResult.count / limit)
            }
        });
    } catch (error) {
        console.error(`[ResourceController] getAllHandler Error for ${table}:`, error);
        res.status(500).json({ error: error.message });
    }
}

const updateStatus = (table) => async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { status, reason } = req.body;
        const adminId = req.user ? req.user.id : null;
        
        if (!['approved', 'pending', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Update resource status and rejection_reason
        await db.run(`UPDATE ${table} SET status = ?, rejection_reason = ? WHERE id = ?`, [status, reason || null, id]);

        // Add audit log
        if (adminId) {
             await db.run(
                `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)`,
                [adminId, table, id, status, reason || null]
            );
        }

        res.json({ success: true, id, status, reason });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const toggleLike = (table) => async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        // Simple increment for now, no user tracking
        await db.run(`UPDATE ${table} SET likes = likes + 1 WHERE id = ?`, [id]);
        const item = await db.get(`SELECT likes FROM ${table} WHERE id = ?`, [id]);
        res.json({ likes: item.likes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Specific Handlers
const getCategories = (table) => async (req, res) => {
    try {
        const db = await getDb();
        const categories = await db.all(`SELECT DISTINCT category FROM ${table}`);
        res.json(categories.map(c => c.category));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Fields Definitions
const fields = {
    photos: ['url', 'title', 'category', 'tags', 'size', 'gameType', 'gameDescription', 'featured'],
    music: ['title', 'artist', 'duration', 'cover', 'audio', 'featured', 'category', 'tags'],
    videos: ['title', 'category', 'tags', 'thumbnail', 'video', 'featured'],
    articles: ['title', 'date', 'excerpt', 'tag', 'tags', 'content', 'cover', 'featured'],
    events: ['title', 'date', 'location', 'category', 'tags', 'image', 'description', 'content', 'link', 'featured']
};

module.exports = {
    createHandler,
    updateHandler,
    deleteHandler,
    permanentDeleteHandler,
    restoreHandler,
    getAllHandler,
    getOneHandler,
    getCategories,
    toggleLike,
    updateStatus,
    fields
};