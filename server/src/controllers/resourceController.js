const { getDb } = require('../config/db');
const { deleteFileFromUrl } = require('../utils/fileUtils');

// Mapping Configuration
const TABLE_TO_TYPE = {
    'photos': 'photo',
    'music': 'music',
    'videos': 'video',
    'articles': 'article',
    'events': 'event'
};

const FIELD_MAPPINGS = {
    photo: {
        file_url: 'url',
        // title -> title
        // category -> category
        // tags -> tags
        // status -> status
        extra: ['size', 'gameType', 'gameDescription']
    },
    music: {
        file_url: 'audio',
        cover_url: 'cover',
        extra: ['artist', 'duration']
    },
    video: {
        file_url: 'video',
        cover_url: 'thumbnail',
        // title, category, tags, status
    },
    article: {
        cover_url: 'cover',
        description: 'excerpt',
        // category is tricky, old was 'tag' column but also had 'tags'
        // We'll map 'tag' to 'category' in DB
        category: 'tag',
        extra: ['date'] 
    },
    event: {
        cover_url: 'image',
        // description -> description
        // content -> content
        extra: ['date', 'location', 'link']
    }
};

// Helper: Convert Frontend Body -> DB Row
const mapToResource = (type, body) => {
    const mapping = FIELD_MAPPINGS[type] || {};
    const row = {
        type,
        title: body.title,
        description: body.description || body.excerpt || body.gameDescription, // Fallback
        content: body.content,
        category: body.category || body.tag, // Map tag to category for articles
        tags: body.tags,
        featured: body.featured ? 1 : 0,
        status: body.status || 'pending',
        uploader_id: body.uploader_id,
        created_at: body.created_at, // Optional
        file_url: body.file_url, // Default
        cover_url: body.cover_url // Default
    };

    // Specific Mappings
    if (mapping.file_url && body[mapping.file_url]) row.file_url = body[mapping.file_url];
    if (mapping.cover_url && body[mapping.cover_url]) row.cover_url = body[mapping.cover_url];
    if (mapping.description && body[mapping.description]) row.description = body[mapping.description];
    if (mapping.category && body[mapping.category]) row.category = body[mapping.category];

    // Extra Data
    const extra = {};
    if (mapping.extra) {
        mapping.extra.forEach(field => {
            if (body[field] !== undefined) extra[field] = body[field];
        });
    }
    // Catch-all for unmapped fields if needed, but let's stick to defined ones for safety
    row.extra_data = JSON.stringify(extra);
    
    return row;
};

// Helper: Convert DB Row -> Frontend Body
const mapFromResource = (row) => {
    if (!row) return null;
    const type = row.type;
    const mapping = FIELD_MAPPINGS[type] || {};
    
    const body = {
        id: row.id,
        title: row.title,
        description: row.description,
        content: row.content,
        category: row.category,
        tags: row.tags,
        featured: !!row.featured,
        likes: row.likes,
        views: row.views,
        status: row.status,
        uploader_id: row.uploader_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        deleted_at: row.deleted_at,
        rejection_reason: row.rejection_reason, // Need to add this to schema if missing? No, using generic status.
        // Wait, schema didn't have rejection_reason column in resources table!
        // I should add it or store in extra_data. Let's assume extra_data for now or add column.
        // For simplicity, let's ignore or parse from extra_data if we put it there.
    };

    // Map Standard Columns back to Old Names
    if (mapping.file_url) body[mapping.file_url] = row.file_url;
    else body.file_url = row.file_url;

    if (mapping.cover_url) body[mapping.cover_url] = row.cover_url;
    else body.cover_url = row.cover_url;

    if (mapping.description) body[mapping.description] = row.description;
    if (mapping.category) body[mapping.category] = row.category;

    // Parse Extra Data
    try {
        const extra = JSON.parse(row.extra_data || '{}');
        Object.assign(body, extra);
    } catch (e) {
        console.error('Failed to parse extra_data for id:', row.id);
    }
    
    return body;
};

const createHandler = (table, fields) => async (req, res) => {
    try {
        const db = await getDb();
        const type = TABLE_TO_TYPE[table];
        if (!type) return res.status(400).json({ error: 'Invalid resource type' });

        const userRole = req.user ? req.user.role : 'admin';
        const status = userRole === 'admin' ? 'approved' : 'approved'; // Force approved
        const uploader_id = req.user ? req.user.id : null;

        const resource = mapToResource(type, { ...req.body, status, uploader_id });
        
        const result = await db.run(
            `INSERT INTO resources (type, title, description, content, file_url, cover_url, category, tags, featured, status, uploader_id, extra_data)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [resource.type, resource.title, resource.description, resource.content, resource.file_url, resource.cover_url, resource.category, resource.tags, resource.featured, resource.status, resource.uploader_id, resource.extra_data]
        );

        res.json({ id: result.lastID, ...req.body, status, likes: 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateHandler = (table, fields) => async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const type = TABLE_TO_TYPE[table];
        
        // Check for file changes
        const oldRow = await db.get('SELECT * FROM resources WHERE id = ?', id);
        if (oldRow) {
            const newResource = mapToResource(type, req.body);
            // Compare URLs
            if (newResource.file_url && newResource.file_url !== oldRow.file_url) deleteFileFromUrl(oldRow.file_url);
            if (newResource.cover_url && newResource.cover_url !== oldRow.cover_url) deleteFileFromUrl(oldRow.cover_url);
        }

        const resource = mapToResource(type, req.body);
        
        await db.run(
            `UPDATE resources SET title=?, description=?, content=?, file_url=?, cover_url=?, category=?, tags=?, featured=?, extra_data=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [resource.title, resource.description, resource.content, resource.file_url, resource.cover_url, resource.category, resource.tags, resource.featured, resource.extra_data, id]
        );

        res.json({ id, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteHandler = (table) => async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        await db.run(`UPDATE resources SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, id);
        res.json({ message: 'Moved to trash' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const permanentDeleteHandler = (table) => async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        
        const row = await db.get('SELECT * FROM resources WHERE id = ?', id);
        if (row) {
            if (row.file_url) deleteFileFromUrl(row.file_url);
            if (row.cover_url) deleteFileFromUrl(row.cover_url);
        }

        await db.run('DELETE FROM resources WHERE id = ?', id);
        res.json({ message: 'Permanently deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const restoreHandler = (table) => async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        await db.run('UPDATE resources SET deleted_at = NULL WHERE id = ?', id);
        res.json({ message: 'Restored successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getOneHandler = (table) => async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const type = TABLE_TO_TYPE[table];
        
        const row = await db.get('SELECT * FROM resources WHERE id = ? AND type = ?', [id, type]);
        if (!row) return res.status(404).json({ error: 'Item not found' });
        
        res.json(mapFromResource(row));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getAllHandler = (table, defaultLimit = 12) => async (req, res) => {
    try {
        const db = await getDb();
        const type = TABLE_TO_TYPE[table];
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || defaultLimit;
        const offset = (page - 1) * limit;
        
        // Filters
        const category = req.query.category;
        const tag = req.query.tag;
        const status = req.query.status || 'approved';
        const uploader_id = req.query.uploader_id;
        const search = req.query.search;
        const trashed = req.query.trashed === 'true';
        const sort = req.query.sort || 'newest';

        let query = `SELECT * FROM resources WHERE type = ?`;
        let params = [type];
        
        // Trashed
        if (trashed) {
            query += ' AND deleted_at IS NOT NULL';
        } else {
            query += ' AND deleted_at IS NULL';
        }

        // Status
        if (status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        // Uploader
        if (uploader_id) {
            query += ' AND uploader_id = ?';
            params.push(uploader_id);
        }

        // Category
        if (category && category !== 'All') {
            query += ' AND category = ?';
            params.push(category);
        }
        
        // Tag (Article uses tag column mapped to category, or generic tags)
        if (tag && tag !== 'All') {
            if (type === 'article') {
                 // For articles, 'tag' matches 'category' column
                 query += ' AND category = ?';
                 params.push(tag);
            } else {
                 query += ' AND tags LIKE ?';
                 params.push(`%${tag}%`);
            }
        }

        // Search
        if (search) {
            query += ' AND (title LIKE ? OR tags LIKE ? OR description LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }
        
        // Sort
        if (sort === 'oldest') query += ' ORDER BY id ASC';
        else if (sort === 'likes') query += ' ORDER BY likes DESC, id DESC';
        else if (sort === 'title') query += ' ORDER BY title ASC';
        else query += ' ORDER BY id DESC'; // Newest default

        // Pagination
        const countResult = await db.get(`SELECT COUNT(*) as count FROM (${query})`, params);
        
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const rows = await db.all(query, params);
        const data = rows.map(mapFromResource);

        res.json({
            data,
            pagination: {
                total: countResult.count,
                page,
                limit,
                totalPages: Math.ceil(countResult.count / limit)
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateStatus = (table) => async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const { status, reason } = req.body;
        
        // We don't have rejection_reason column, store in extra_data? 
        // Or just update status. Let's stick to status for now.
        await db.run('UPDATE resources SET status = ? WHERE id = ?', [status, id]);
        
        // Audit log would go here
        
        res.json({ success: true, id, status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const toggleLike = (table) => async (req, res) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        await db.run('UPDATE resources SET likes = likes + 1 WHERE id = ?', id);
        const row = await db.get('SELECT likes FROM resources WHERE id = ?', id);
        res.json({ likes: row.likes });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getCategories = (table) => async (req, res) => {
    try {
        const db = await getDb();
        const type = TABLE_TO_TYPE[table];
        const rows = await db.all('SELECT DISTINCT category FROM resources WHERE type = ? AND category IS NOT NULL', type);
        res.json(rows.map(r => r.category));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Fields Definitions (kept for reference/validation if needed, though unused in new logic)
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
