const { getDb } = require('../config/db');
const { deleteFileFromUrl } = require('../utils/fileUtils');
const { createNotification } = require('./notificationController');

// Helper to ensure tags exist in the tags table
const processTags = async (tagsString) => {
  if (!tagsString) return;
  try {
    const db = await getDb();
    // Ensure table exists just in case
    await db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            count INTEGER DEFAULT 0
        )
    `);
    
    const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean);
    for (const tag of tags) {
      await db.run('INSERT OR IGNORE INTO tags (name, count) VALUES (?, 0)', [tag]);
    }
  } catch (e) {
    console.error('Error processing tags:', e);
  }
};

// Helper Factories
const createHandler = (table, fields) => async (req, res, next) => {
  try {
    const db = await getDb();
    const placeholders = fields.map(() => '?').join(',');
    
    // Determine status based on user role
    const userRole = req.user ? req.user.role : 'user'; 
    const status = userRole === 'admin' ? 'approved' : 'pending'; 
    const uploader_id = req.user ? req.user.id : null;

    const sql = `INSERT INTO ${table} (${fields.join(',')}, status, uploader_id) VALUES (${placeholders}, ?, ?)`;
    const values = [...fields.map(field => req.body[field]), status, uploader_id];
    
    const result = await db.run(sql, values);
    
    // Process tags to ensure they exist in the centralized tags table
    if (req.body.tags) {
        await processTags(req.body.tags);
    }

    res.json({ id: result.lastID, ...req.body, status, likes: 0 });
  } catch (error) { next(error); }
};

const updateHandler = (table, fields) => async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    
    // Check ownership
    const oldItem = await db.get(`SELECT * FROM ${table} WHERE id = ?`, id);
    if (!oldItem) {
        return res.status(404).json({ error: 'Item not found' });
    }

    if (req.user.role !== 'admin' && oldItem.uploader_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to update this resource' });
    }

    // Check for file changes to delete old files
    const fileFields = ['url', 'cover', 'thumbnail', 'image', 'audio', 'video'];
    fileFields.forEach(field => {
    if (req.body[field] && req.body[field] !== oldItem[field]) {
        deleteFileFromUrl(oldItem[field]);
    }
    });

    const setClause = fields.map(field => `${field} = ?`).join(',');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const values = [...fields.map(field => req.body[field]), id];
    await db.run(sql, values);
    
    // Process tags to ensure they exist in the centralized tags table
    if (req.body.tags) {
        await processTags(req.body.tags);
    }

    res.json({ id, ...req.body });
  } catch (error) { next(error); }
};

const deleteHandler = (table) => async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    
    // Check ownership
    const item = await db.get(`SELECT * FROM ${table} WHERE id = ?`, id);
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }

    if (req.user.role !== 'admin' && item.uploader_id !== req.user.id) {
        return res.status(403).json({ error: 'You do not have permission to delete this resource' });
    }

    // Soft delete: Update deleted_at timestamp
    await db.run(`UPDATE ${table} SET deleted_at = datetime('now') WHERE id = ?`, id);
    
    // Audit Log for Admins
    if (req.user.role === 'admin') {
         await db.run(
            `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, table, id, 'soft_delete', 'Admin soft deleted resource']
        );
    }

    res.json({ message: 'Moved to trash' });
  } catch (error) { next(error); }
};

const permanentDeleteHandler = (table) => async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const singularType = getSingularType(table);

    // Delete associated files
    const item = await db.get(`SELECT * FROM ${table} WHERE id = ?`, id);
    if (item) {

        const fileFields = ['url', 'cover', 'thumbnail', 'image', 'audio', 'video'];
        fileFields.forEach(field => {
            if (item[field]) {

                deleteFileFromUrl(item[field]);
            }
        });
    }

    // 1. Delete from favorites (handle both singular and plural types for safety)
    await db.run(
        'DELETE FROM favorites WHERE item_id = ? AND (item_type = ? OR item_type = ?)', 
        [id, singularType, table]
    );
    
    // 2. Delete from comments (handle both singular and plural types)
    // Check if comments table exists first? It should.
    await db.run(
        'DELETE FROM comments WHERE resource_id = ? AND (resource_type = ? OR resource_type = ?)', 
        [id, singularType, table]
    );

    // 3. Delete from notifications (handle both singular and plural types)
    await db.run(
        'DELETE FROM notifications WHERE related_resource_id = ? AND (related_resource_type = ? OR related_resource_type = ?)', 
        [id, singularType, table]
    );

    // 4. Delete from event_registrations (only for events)
    if (table === 'events') {
        await db.run('DELETE FROM event_registrations WHERE event_id = ?', [id]);
    }

    // 5. Delete from table
    await db.run(`DELETE FROM ${table} WHERE id = ?`, id);
    
    // Audit Log for Admins
    if (req.user.role === 'admin') {
         await db.run(
            `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, table, id, 'permanent_delete', 'Admin permanently deleted resource']
        );
    }

    res.json({ message: 'Permanently deleted with all associated data' });
  } catch (error) { next(error); }
};

const restoreHandler = (table) => async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    await db.run(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, id);
    
    // Audit Log for Admins
    if (req.user.role === 'admin') {
         await db.run(
            `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)`,
            [req.user.id, table, id, 'restore', 'Admin restored resource']
        );
    }

    res.json({ message: 'Restored successfully' });
  } catch (error) { next(error); }
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

const getOneHandler = (table) => async (req, res, next) => {
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
    
    // Access Control: Only admin or owner can see non-approved/deleted items
    if (item.status !== 'approved' || item.deleted_at) {
        const isAdmin = req.user && req.user.role === 'admin';
        const isOwner = req.user && req.user.id === item.uploader_id;
        
        if (!isAdmin && !isOwner) {
             return res.status(403).json({ error: 'Access denied' });
        }
    }

    // Convert favorited to boolean
    if (userId) {
        item.favorited = !!item.favorited;
    }

    res.json(item);
  } catch (error) { next(error); }
};

const getAllHandler = (table, defaultLimit = 12) => async (req, res, next) => {
    try {
        const db = await getDb();
        const page = parseInt(req.query.page) || 1;
        // Limit max limit to 100 to prevent DoS
        const limit = Math.min(parseInt(req.query.limit) || defaultLimit, 100);
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
            if (table === 'events') {
                whereClauses.push('(title LIKE ? OR tags LIKE ? OR description LIKE ? OR organizer LIKE ? OR target_audience LIKE ?)');
                params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
                countParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            } else if (table === 'articles') {
                whereClauses.push('(title LIKE ? OR tags LIKE ? OR excerpt LIKE ? OR content LIKE ?)');
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
                countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
            } else {
                whereClauses.push('(title LIKE ? OR tags LIKE ?)');
                params.push(searchTerm, searchTerm);
                countParams.push(searchTerm, searchTerm);
            }
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

        if (tag && tag !== 'All') {
            whereClauses.push('tag = ?');
            params.push(tag);
            countParams.push(tag);
        }

        // Dynamic Field Filtering
        if (table === 'events') {
            const filterableFields = ['location', 'organizer', 'target_audience'];
            filterableFields.forEach(field => {
                if (req.query[field]) {
                    whereClauses.push(`"${field}" = ?`);
                    params.push(req.query[field]);
                    countParams.push(req.query[field]);
                }
            });
        }
        
        // Tags Search (comma separated for multiple tags OR logic)
        const tagsQuery = req.query.tags;
        if (tagsQuery && tagsQuery.trim() !== '') {
             const tagsList = tagsQuery.split(',').map(t => t.trim()).filter(Boolean);
             if (tagsList.length > 0) {
                 // Optimize tag matching to avoid substring matches (e.g. 'art' matching 'smart')
                 const tagConditions = tagsList.map(() => 
                    '(tags = ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?)'
                 ).join(' OR ');
                 
                 whereClauses.push(`(${tagConditions})`);
                 
                 tagsList.forEach(tag => {
                     // Exact match
                     params.push(tag);
                     countParams.push(tag);
                     // Start of string
                     params.push(`${tag},%`);
                     countParams.push(`${tag},%`);
                     // End of string
                     params.push(`%,${tag}`);
                     countParams.push(`%,${tag}`);
                     // Middle of string
                     params.push(`%,${tag},%`);
                     countParams.push(`%,${tag},%`);
                 });
             }
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
            case 'date_asc':
                query += ' ORDER BY date ASC';
                break;
            case 'date_desc':
                query += ' ORDER BY date DESC';
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
    } catch (error) { next(error); }
}

const updateStatus = (table) => async (req, res, next) => {
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

        // Get resource details to find uploader
        const resource = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        
        // Add audit log
        if (adminId) {
             await db.run(
                `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)`,
                [adminId, table, id, status, reason || null]
            );
        }

        // Send notification to uploader
        if (resource && resource.uploader_id && resource.uploader_id !== adminId) {
            let notificationContent = '';
            let notificationType = 'system';
            
            if (status === 'approved') {
                notificationContent = `Your ${getSingularType(table)} "${resource.title}" has been approved!`;
                notificationType = 'approval';
            } else if (status === 'rejected') {
                notificationContent = `Your ${getSingularType(table)} "${resource.title}" was rejected. Reason: ${reason || 'No reason provided'}`;
                notificationType = 'rejection';
            }
            
            if (notificationContent) {
                await createNotification(
                    resource.uploader_id,
                    notificationType,
                    notificationContent,
                    id,
                    table
                );
            }
        }

        res.json({ success: true, id, status, reason });
    } catch (error) { next(error); }
};

const toggleLike = (table) => async (req, res, next) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        // Simple increment for now, no user tracking
        await db.run(`UPDATE ${table} SET likes = likes + 1 WHERE id = ?`, [id]);
        const item = await db.get(`SELECT likes FROM ${table} WHERE id = ?`, [id]);
        res.json({ likes: item.likes });
    } catch (error) { next(error); }
}

// Specific Handlers
const getCategories = (table) => async (req, res, next) => {
    try {
        const db = await getDb();
        const categories = await db.all(`SELECT DISTINCT category FROM ${table}`);
        res.json(categories.map(c => c.category));
    } catch (error) { next(error); }
}

const getDistinctValues = (table) => async (req, res, next) => {
    try {
        const db = await getDb();
        const { field } = req.params;
        
        // Validate field to prevent SQL injection
        const allowedFields = fields[table];
        if (!allowedFields || !allowedFields.includes(field)) {
             return res.status(400).json({ error: `Invalid field: ${field}` });
        }

        let query = `SELECT DISTINCT "${field}" FROM ${table}`;
        let whereClauses = [];
        let params = [];

        // Always exclude null/empty
        whereClauses.push(`"${field}" IS NOT NULL AND "${field}" != ''`);

        // Apply filters from req.query (similar to getAllHandler)
        const status = req.query.status || 'approved';
        if (status !== 'all') {
            whereClauses.push('status = ?');
            params.push(status);
        }

        // Dynamic Field Filtering for Events
        if (table === 'events') {
            const filterableFields = ['location', 'organizer', 'target_audience'];
            filterableFields.forEach(f => {
                // Don't filter by the field we are querying distinct values for
                if (f !== field && req.query[f]) {
                    whereClauses.push(`"${f}" = ?`);
                    params.push(req.query[f]);
                }
            });

            // Lifecycle filter
            const lifecycle = req.query.lifecycle;
            if (lifecycle) {
                 if (lifecycle === 'upcoming') {
                     whereClauses.push('date > date("now", "localtime")');
                 } else if (lifecycle === 'past') {
                     whereClauses.push('date < date("now", "localtime")');
                 } else if (lifecycle === 'ongoing') {
                     whereClauses.push('date = date("now", "localtime")');
                 }
            }
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        query += ` ORDER BY "${field}" ASC`;

        const values = await db.all(query, params);
        res.json(values.map(v => v[field]));
    } catch (error) { next(error); }
}

// Fields Definitions
const fields = {
    photos: ['url', 'title', 'tags', 'size', 'gameType', 'gameDescription', 'featured'],
    music: ['title', 'artist', 'duration', 'cover', 'audio', 'featured', 'tags'],
    videos: ['title', 'tags', 'thumbnail', 'video', 'featured'],
    articles: ['title', 'date', 'excerpt', 'tags', 'content', 'cover', 'featured'],
    events: ['title', 'date', 'end_date', 'location', 'tags', 'image', 'description', 'content', 'link', 'featured', 'score', 'target_audience', 'organizer', 'volunteer_time', 'category']
};

const getRelatedHandler = (table) => async (req, res, next) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 6;
        
        const item = await db.get(`SELECT tags, category FROM ${table} WHERE id = ?`, id);
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        let whereClauses = [`id != ?`, `status = 'approved'`, `deleted_at IS NULL`];
        let params = [id];
        
        if (item.tags) {
            const tags = item.tags.split(',').map(t => t.trim()).filter(Boolean);
            if (tags.length > 0) {
                 const tagConditions = tags.map(() => 
                    '(tags LIKE ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?)'
                 ).join(' OR ');
                 
                 whereClauses.push(`(${tagConditions})`);
                 
                 tags.forEach(tag => {
                     params.push(tag);
                     params.push(`${tag},%`);
                     params.push(`%,${tag}`);
                     params.push(`%,${tag},%`);
                 });
            } else if (item.category) {
                 whereClauses.push('category = ?');
                 params.push(item.category);
            }
        } else if (item.category) {
             whereClauses.push('category = ?');
             params.push(item.category);
        }

        const whereSQL = ' WHERE ' + whereClauses.join(' AND ');
        const query = `SELECT * FROM ${table} ${whereSQL} ORDER BY RANDOM() LIMIT ?`;
        params.push(limit);

        const related = await db.all(query, params);
        res.json(related);
    } catch (error) { next(error); }
}

module.exports = {
    createHandler,
    updateHandler,
    deleteHandler,
    permanentDeleteHandler,
    restoreHandler,
    getAllHandler,
    getOneHandler,
    getRelatedHandler,
    getDistinctValues,
    toggleLike,
    updateStatus,
    fields
};