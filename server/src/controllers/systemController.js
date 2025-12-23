const { getDb } = require('../config/db');
const path = require('path');
const fs = require('fs');
const { runCrawler } = require('../../crawler');

const searchContent = async (req, res) => {
    try {
        const db = await getDb();
        const { q } = req.query;
        if (!q || q.length < 2) return res.json([]);

        const term = `%${q}%`;
        
        // Parallel search with enhanced fuzzy matching (Description, Content, Artist, Tags, etc.)
        const [photos, music, videos, articles, events] = await Promise.all([
            db.all('SELECT id, title, "photo" as type, url as image FROM photos WHERE title LIKE ? OR tags LIKE ? LIMIT 5', [term, term]),
            db.all('SELECT id, title, "music" as type, cover as image FROM music WHERE title LIKE ? OR artist LIKE ? OR tags LIKE ? LIMIT 5', [term, term, term]),
            db.all('SELECT id, title, "video" as type, thumbnail as image FROM videos WHERE title LIKE ? OR tags LIKE ? LIMIT 5', [term, term]),
            db.all('SELECT id, title, "article" as type, cover as image FROM articles WHERE title LIKE ? OR excerpt LIKE ? OR content LIKE ? OR tags LIKE ? LIMIT 5', [term, term, term, term]),
            db.all('SELECT id, title, "event" as type, image FROM events WHERE title LIKE ? OR description LIKE ? OR content LIKE ? OR tags LIKE ? LIMIT 5', [term, term, term, term])
        ]);

        const results = [
            ...photos.map(i => ({ ...i, link: '/gallery' })),
            ...music.map(i => ({ ...i, link: '/music' })),
            ...videos.map(i => ({ ...i, link: '/videos' })),
            ...articles.map(i => ({ ...i, link: '/articles' })),
            ...events.map(i => ({ ...i, link: '/events' }))
        ];

        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getStats = async (req, res) => {
  try {
    const db = await getDb();
    
    const [photos, music, videos, articles, events, users, audit] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM photos'),
      db.get('SELECT COUNT(*) as count FROM music'),
      db.get('SELECT COUNT(*) as count FROM videos'),
      db.get('SELECT COUNT(*) as count FROM articles'),
      db.get('SELECT COUNT(*) as count FROM events'),
      db.get('SELECT COUNT(*) as count FROM users'),
      db.get('SELECT COUNT(*) as count FROM audit_logs'),
    ]);

    const dbPath = path.join(__dirname, '../../database.sqlite');
    let dbSize = 0;
    if (fs.existsSync(dbPath)) {
        dbSize = fs.statSync(dbPath).size;
    }

    res.json({
      counts: {
        photos: photos.count,
        music: music.count,
        videos: videos.count,
        articles: articles.count,
        events: events.count,
        users: users.count,
        audit_logs: audit.count
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        dbSize
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const handleUpload = (req, res) => {
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const downloadDbBackup = (req, res) => {
  const dbPath = path.join(__dirname, '../../database.sqlite');
  if (fs.existsSync(dbPath)) {
    res.download(dbPath, `backup-${Date.now()}.sqlite`);
  } else {
    res.status(404).json({ error: 'Database file not found' });
  }
};

const getFeaturedContent = async (req, res) => {
  try {
    const db = await getDb();
    
    // Fetch featured items, falling back to recent ones if not enough featured
    // ORDER BY featured DESC ensures featured items come first
    const [photos, music, videos, articles, events] = await Promise.all([
      db.all('SELECT * FROM photos ORDER BY featured DESC, id DESC LIMIT 10'),
      db.all('SELECT * FROM music ORDER BY featured DESC, id DESC LIMIT 10'),
      db.all('SELECT * FROM videos ORDER BY featured DESC, id DESC LIMIT 10'),
      db.all('SELECT * FROM articles ORDER BY featured DESC, id DESC LIMIT 10'),
      db.all('SELECT * FROM events ORDER BY featured DESC, id DESC LIMIT 10')
    ]);

    res.json({
      photos,
      music,
      videos,
      articles,
      events
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const crawlEvents = async (req, res) => {
    try {
        const { url, source } = req.body;
        console.log(`Starting crawler for ${url || 'default'} (${source || 'ZJU'})...`);
        const result = await runCrawler(url, source);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("Crawler failed:", error);
        res.status(500).json({ error: 'Crawler failed', details: error.message });
    }
};

const getAuditLogs = async (req, res) => {
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getPendingContent = async (req, res) => {
    try {
        const db = await getDb();
        
        // Fetch pending items from all tables
        const [photos, music, videos, articles, events] = await Promise.all([
            db.all("SELECT *, 'photos' as resource_type, url as preview_image FROM photos WHERE status = 'pending'"),
            db.all("SELECT *, 'music' as resource_type, cover as preview_image FROM music WHERE status = 'pending'"),
            db.all("SELECT *, 'videos' as resource_type, thumbnail as preview_image FROM videos WHERE status = 'pending'"),
            db.all("SELECT *, 'articles' as resource_type, cover as preview_image FROM articles WHERE status = 'pending'"),
            db.all("SELECT *, 'events' as resource_type, image as preview_image FROM events WHERE status = 'pending'")
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getStats, handleUpload, downloadDbBackup, getFeaturedContent, crawlEvents, searchContent, getAuditLogs, getPendingContent };