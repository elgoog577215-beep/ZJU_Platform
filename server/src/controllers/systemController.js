const { getDb } = require('../config/db');
const path = require('path');
const fs = require('fs');

// Placeholder for crawler until implemented
const runCrawler = async (url, source) => {
    return { status: 'skipped', message: 'Crawler module is not yet implemented.' };
};

const searchContent = async (req, res, next) => {
    try {
        const db = await getDb();
        const { q } = req.query;
        if (!q || q.length < 2) return res.json([]);

        const term = `%${q}%`;
        
        // Parallel search with enhanced fuzzy matching (Description, Content, Artist, Tags, etc.)
        // Ensure we only show visible items (not deleted, approved)
        const [photos, music, videos, articles, events] = await Promise.all([
            db.all('SELECT id, title, "photo" as type, url as image FROM photos WHERE (title LIKE ? OR tags LIKE ?) AND deleted_at IS NULL AND status = "approved" LIMIT 5', [term, term]),
            db.all('SELECT id, title, "music" as type, cover as image FROM music WHERE (title LIKE ? OR artist LIKE ? OR tags LIKE ?) AND deleted_at IS NULL AND status = "approved" LIMIT 5', [term, term, term]),
            db.all('SELECT id, title, "video" as type, thumbnail as image FROM videos WHERE (title LIKE ? OR tags LIKE ?) AND deleted_at IS NULL AND status = "approved" LIMIT 5', [term, term]),
            db.all('SELECT id, title, "article" as type, cover as image FROM articles WHERE (title LIKE ? OR excerpt LIKE ? OR content LIKE ? OR tags LIKE ?) AND deleted_at IS NULL AND status = "approved" LIMIT 5', [term, term, term, term]),
            db.all('SELECT id, title, "event" as type, image FROM events WHERE (title LIKE ? OR description LIKE ? OR content LIKE ? OR tags LIKE ?) AND deleted_at IS NULL AND status = "approved" LIMIT 5', [term, term, term, term])
        ]);

        const results = [
            ...photos.map(i => ({ ...i, link: '/gallery' })),
            ...music.map(i => ({ ...i, link: '/music' })),
            ...videos.map(i => ({ ...i, link: '/videos' })),
            ...articles.map(i => ({ ...i, link: '/articles' })),
            ...events.map(i => ({ ...i, link: '/events' }))
        ];

        res.json(results);
    } catch (error) { next(error); }
};

const getStats = async (req, res, next) => {
  try {
    const db = await getDb();
    
    // Helper to get detailed stats for a table
    const getTableStats = async (table) => {
        try {
          const total = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
          const active = await db.get(`SELECT COUNT(*) as count FROM ${table} WHERE deleted_at IS NULL AND status = 'approved'`);
          const pending = await db.get(`SELECT COUNT(*) as count FROM ${table} WHERE deleted_at IS NULL AND status = 'pending'`);
          const deleted = await db.get(`SELECT COUNT(*) as count FROM ${table} WHERE deleted_at IS NOT NULL`);
          
          return {
              total: total?.count || 0,
              active: active?.count || 0,
              pending: pending?.count || 0,
              deleted: deleted?.count || 0
          };
        } catch (err) {
          console.error(`[Stats] Error getting stats for ${table}:`, err.message);
          return { total: 0, active: 0, pending: 0, deleted: 0 };
        }
    };

    const [photos, music, videos, articles, events, users, audit] = await Promise.all([
      getTableStats('photos'),
      getTableStats('music'),
      getTableStats('videos'),
      getTableStats('articles'),
      getTableStats('events'),
      db.get('SELECT COUNT(*) as count FROM users').catch(() => ({ count: 0 })),
      db.get('SELECT COUNT(*) as count FROM audit_logs').catch(() => ({ count: 0 })),
    ]);

    const dbPath = path.join(__dirname, '../../database.sqlite');
    let dbSize = 0;
    if (fs.existsSync(dbPath)) {
        dbSize = fs.statSync(dbPath).size;
    }

    res.json({
      counts: {
        photos: photos.total,
        music: music.total,
        videos: videos.total,
        articles: articles.total,
        events: events.total,
        users: users.count,
        audit_logs: audit.count
      },
      breakdown: {
        photos,
        music,
        videos,
        articles,
        events
      },
      system: {
        uptime: process.uptime(),
        // Removed sensitive system info
        dbSize
      }
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const handleUpload = (req, res, next) => {
  try {
    const response = {};
    // const baseUrl = `${req.protocol}://${req.get('host')}`; // Remove absolute URL
    
    if (req.files && req.files['file']) {
      response.fileUrl = `/uploads/${req.files['file'][0].filename}`;
    }
    if (req.files && req.files['cover']) {
      response.coverUrl = `/uploads/${req.files['cover'][0].filename}`;
    }
    res.json(response);
  } catch (error) { next(error); }
};

const downloadDbBackup = (req, res, next) => {
  const dbPath = path.join(__dirname, '../../database.sqlite');
  if (fs.existsSync(dbPath)) {
    res.download(dbPath, `backup-${Date.now()}.sqlite`);
  } else {
    res.status(404).json({ error: 'Database file not found' });
  }
};

const getFeaturedContent = async (req, res, next) => {
  try {
    const db = await getDb();
    
    // Fetch featured items, falling back to recent ones if not enough featured
    // ORDER BY featured DESC ensures featured items come first
    // Only show active (approved, not deleted) items
    const [photos, music, videos, articles, events] = await Promise.all([
      db.all('SELECT * FROM photos WHERE deleted_at IS NULL AND status = "approved" ORDER BY featured DESC, id DESC LIMIT 10'),
      db.all('SELECT * FROM music WHERE deleted_at IS NULL AND status = "approved" ORDER BY featured DESC, id DESC LIMIT 10'),
      db.all('SELECT * FROM videos WHERE deleted_at IS NULL AND status = "approved" ORDER BY featured DESC, id DESC LIMIT 10'),
      db.all('SELECT * FROM articles WHERE deleted_at IS NULL AND status = "approved" ORDER BY featured DESC, id DESC LIMIT 10'),
      db.all('SELECT * FROM events WHERE deleted_at IS NULL AND status = "approved" ORDER BY featured DESC, id DESC LIMIT 10')
    ]);

    res.json({
      photos,
      music,
      videos,
      articles,
      events
    });
  } catch (error) { next(error); }
};

const crawlEvents = async (req, res, next) => {
    try {
        const { url, source } = req.body;

        const result = await runCrawler(url, source);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("Crawler failed:", error);
        res.status(500).json({ error: 'Crawler failed', details: error.message });
    }
};

const getAuditLogs = async (req, res, next) => {
    try {
        const db = await getDb();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const logs = await db.all(`
            SELECT audit_logs.*, users.username as admin_name 
            FROM audit_logs 
            LEFT JOIN users ON audit_logs.admin_id = users.id 
            ORDER BY audit_logs.created_at DESC 
            LIMIT ? OFFSET ?
        `, [limit, offset]);
        
        const count = await db.get('SELECT COUNT(*) as count FROM audit_logs');

        res.json({
            data: logs,
            pagination: {
                total: count.count,
                page,
                limit,
                totalPages: Math.ceil(count.count / limit)
            }
        });
    } catch (error) { next(error); }
};

const getPendingContent = async (req, res, next) => {
    try {
        const db = await getDb();
        
        // Fetch pending items from all tables (only active ones)
        const [photos, music, videos, articles, events] = await Promise.all([
            db.all("SELECT *, 'photos' as resource_type, url as preview_image FROM photos WHERE status = 'pending' AND deleted_at IS NULL"),
            db.all("SELECT *, 'music' as resource_type, cover as preview_image FROM music WHERE status = 'pending' AND deleted_at IS NULL"),
            db.all("SELECT *, 'videos' as resource_type, thumbnail as preview_image FROM videos WHERE status = 'pending' AND deleted_at IS NULL"),
            db.all("SELECT *, 'articles' as resource_type, cover as preview_image FROM articles WHERE status = 'pending' AND deleted_at IS NULL"),
            db.all("SELECT *, 'events' as resource_type, image as preview_image FROM events WHERE status = 'pending' AND deleted_at IS NULL")
        ]);

        // Combine and sort (newest first based on ID as proxy)
        const allPending = [
            ...photos.map(i => ({ ...i, type: 'photos' })),
            ...music.map(i => ({ ...i, type: 'music' })),
            ...videos.map(i => ({ ...i, type: 'videos' })),
            ...articles.map(i => ({ ...i, type: 'articles' })),
            ...events.map(i => ({ ...i, type: 'events' }))
        ];
        
        // Sort by ID descending (proxy for recency)
        allPending.sort((a, b) => b.id - a.id);

        res.json(allPending);
    } catch (error) { next(error); }
};

module.exports = { getStats, handleUpload, downloadDbBackup, getFeaturedContent, crawlEvents, searchContent, getAuditLogs, getPendingContent };