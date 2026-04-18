const { getDb } = require('../config/db');
const path = require('path');
const fs = require('fs');
const { serializeCommunityPost } = require('../utils/serializeCommunityPost');

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
        const [photos, music, videos, articles, events, communityPosts] = await Promise.all([
            db.all('SELECT id, title, "photo" as type, url as image FROM photos WHERE (title LIKE ? OR tags LIKE ?) AND deleted_at IS NULL AND status = "approved" LIMIT 5', [term, term]),
            db.all('SELECT id, title, "music" as type, cover as image FROM music WHERE (title LIKE ? OR artist LIKE ? OR tags LIKE ?) AND deleted_at IS NULL AND status = "approved" LIMIT 5', [term, term, term]),
            db.all('SELECT id, title, "video" as type, thumbnail as image FROM videos WHERE (title LIKE ? OR tags LIKE ?) AND deleted_at IS NULL AND status = "approved" LIMIT 5', [term, term]),
            db.all('SELECT id, title, "article" as type, cover as image FROM articles WHERE (title LIKE ? OR excerpt LIKE ? OR content LIKE ? OR tags LIKE ?) AND deleted_at IS NULL AND status = "approved" LIMIT 5', [term, term, term, term]),
            db.all('SELECT id, title, "event" as type, image FROM events WHERE (title LIKE ? OR description LIKE ? OR content LIKE ? OR tags LIKE ?) AND deleted_at IS NULL AND status = "approved" LIMIT 5', [term, term, term, term]),
            // Community posts: exclude anonymous help posts entirely from search,
            // and drop author_name from the WHERE clause — matching by author name
            // would let an attacker reverse who authored an anonymous post.
            db.all(
                `SELECT id, title, "community" as type, section, is_anonymous, author_id
                 FROM community_posts
                 WHERE status = "approved"
                   AND NOT (section = 'help' AND is_anonymous = 1)
                   AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
                 LIMIT 5`,
                [term, term, term]
            ).catch(() => [])
        ]);

        const viewer = req.user ? { id: req.user.id, role: req.user.role } : null;
        const results = [
            ...photos.map(i => ({ ...i, link: '/gallery' })),
            ...music.map(i => ({ ...i, link: '/music' })),
            ...videos.map(i => ({ ...i, link: '/videos' })),
            ...articles.map(i => ({ ...i, link: '/articles' })),
            ...events.map(i => ({ ...i, link: '/events' })),
            ...communityPosts
                .map(p => serializeCommunityPost(p, viewer))
                .map(i => ({ ...i, link: `/community/${i.section || 'help'}` }))
        ];

        res.json(results);
    } catch (error) { next(error); }
};

const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const generateRecentDateKeys = (days = 7) => {
    const dates = [];

    for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date();
        date.setDate(date.getDate() - index);
        dates.push(getDateKey(date));
    }

    return dates;
};

const getRelativeThresholdLabel = (minutesDiff) => {
    if (minutesDiff < 1) return 'just_now';
    if (minutesDiff < 60) return `${Math.floor(minutesDiff)}m`;
    if (minutesDiff < 1440) return `${Math.floor(minutesDiff / 60)}h`;
    return `${Math.floor(minutesDiff / 1440)}d`;
};

const getSiteMetrics = async (req, res, next) => {
    try {
        const db = await getDb();
        const today = getDateKey();
        const recentDateKeys = generateRecentDateKeys(7);
        const sevenDaysAgo = recentDateKeys[0];
        const previousWindowStart = getDateKey(new Date(Date.now() - (13 * 24 * 60 * 60 * 1000)));
        const previousWindowEnd = getDateKey(new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)));
        const contentTables = ['photos', 'music', 'videos', 'articles', 'events'];

        const contentStats = await Promise.all(contentTables.map(async (table) => {
            const [uploads, likes] = await Promise.all([
                db.get(`SELECT COUNT(*) as count FROM ${table} WHERE deleted_at IS NULL`),
                db.get(`SELECT COALESCE(SUM(likes), 0) as total FROM ${table} WHERE deleted_at IS NULL`)
            ]);

            return {
                table,
                uploads: uploads?.count || 0,
                likes: likes?.total || 0
            };
        }));

        const totalUploads = contentStats.reduce((sum, item) => sum + item.uploads, 0);
        const totalEngagement = contentStats.reduce((sum, item) => sum + item.likes, 0);

        const [totalViewsRow, todayViewsRow, todayVisitorsRow, totalVisitorsRow, totalUsersRow, activeCreatorsRow, latestVisitRow, latestUploadRow] = await Promise.all([
            db.get('SELECT COUNT(*) as count FROM site_visit_events').catch(() => ({ count: 0 })),
            db.get('SELECT COUNT(*) as count FROM site_visit_events WHERE date_key = ?', [today]).catch(() => ({ count: 0 })),
            db.get('SELECT COUNT(*) as count FROM site_daily_visitors WHERE date_key = ?', [today]).catch(() => ({ count: 0 })),
            db.get('SELECT COUNT(*) as count FROM site_daily_visitors').catch(() => ({ count: 0 })),
            db.get('SELECT COUNT(*) as count FROM users').catch(() => ({ count: 0 })),
            db.get(`
                SELECT COUNT(DISTINCT uploader_id) as count
                FROM (
                    SELECT uploader_id FROM photos WHERE uploader_id IS NOT NULL
                    UNION ALL
                    SELECT uploader_id FROM music WHERE uploader_id IS NOT NULL
                    UNION ALL
                    SELECT uploader_id FROM videos WHERE uploader_id IS NOT NULL
                    UNION ALL
                    SELECT uploader_id FROM articles WHERE uploader_id IS NOT NULL
                    UNION ALL
                    SELECT uploader_id FROM events WHERE uploader_id IS NOT NULL
                )
            `).catch(() => ({ count: 0 })),
            db.get('SELECT MAX(created_at) as updated_at FROM site_visit_events').catch(() => ({ updated_at: null })),
            db.get(`
                SELECT MAX(created_at) as updated_at
                FROM (
                    SELECT created_at FROM photos WHERE deleted_at IS NULL AND created_at IS NOT NULL
                    UNION ALL
                    SELECT created_at FROM music WHERE deleted_at IS NULL AND created_at IS NOT NULL
                    UNION ALL
                    SELECT created_at FROM videos WHERE deleted_at IS NULL AND created_at IS NOT NULL
                    UNION ALL
                    SELECT created_at FROM articles WHERE deleted_at IS NULL AND created_at IS NOT NULL
                    UNION ALL
                    SELECT created_at FROM events WHERE deleted_at IS NULL AND created_at IS NOT NULL
                )
            `).catch(() => ({ updated_at: null }))
        ]);

        const visitsTrendRows = await db.all(`
            SELECT date_key, COUNT(*) as views
            FROM site_visit_events
            WHERE date_key >= ?
            GROUP BY date_key
            ORDER BY date_key ASC
        `, [sevenDaysAgo]).catch(() => []);

        const uniqueVisitorsTrendRows = await db.all(`
            SELECT date_key, COUNT(*) as visitors
            FROM site_daily_visitors
            WHERE date_key >= ?
            GROUP BY date_key
            ORDER BY date_key ASC
        `, [sevenDaysAgo]).catch(() => []);

        const uploadTrendRows = await db.all(`
            SELECT date_key, SUM(upload_count) as uploads
            FROM (
                SELECT substr(created_at, 1, 10) as date_key, COUNT(*) as upload_count FROM photos WHERE deleted_at IS NULL AND created_at IS NOT NULL GROUP BY substr(created_at, 1, 10)
                UNION ALL
                SELECT substr(created_at, 1, 10) as date_key, COUNT(*) as upload_count FROM music WHERE deleted_at IS NULL AND created_at IS NOT NULL GROUP BY substr(created_at, 1, 10)
                UNION ALL
                SELECT substr(created_at, 1, 10) as date_key, COUNT(*) as upload_count FROM videos WHERE deleted_at IS NULL AND created_at IS NOT NULL GROUP BY substr(created_at, 1, 10)
                UNION ALL
                SELECT substr(created_at, 1, 10) as date_key, COUNT(*) as upload_count FROM articles WHERE deleted_at IS NULL AND created_at IS NOT NULL GROUP BY substr(created_at, 1, 10)
                UNION ALL
                SELECT substr(created_at, 1, 10) as date_key, COUNT(*) as upload_count FROM events WHERE deleted_at IS NULL AND created_at IS NOT NULL GROUP BY substr(created_at, 1, 10)
            )
            WHERE date_key >= ?
            GROUP BY date_key
            ORDER BY date_key ASC
        `, [sevenDaysAgo]).catch(() => []);

        const todayUploadsRow = await db.get(`
            SELECT COALESCE(SUM(upload_count), 0) as count
            FROM (
                SELECT COUNT(*) as upload_count FROM photos WHERE deleted_at IS NULL AND substr(created_at, 1, 10) = ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM music WHERE deleted_at IS NULL AND substr(created_at, 1, 10) = ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM videos WHERE deleted_at IS NULL AND substr(created_at, 1, 10) = ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM articles WHERE deleted_at IS NULL AND substr(created_at, 1, 10) = ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM events WHERE deleted_at IS NULL AND substr(created_at, 1, 10) = ?
            )
        `, [today, today, today, today, today]).catch(() => ({ count: 0 }));

        const currentPeriodViews = await db.get(`
            SELECT COUNT(*) as count
            FROM site_visit_events
            WHERE date_key >= ?
        `, [sevenDaysAgo]).catch(() => ({ count: 0 }));

        const previousPeriodViews = await db.get(`
            SELECT COUNT(*) as count
            FROM site_visit_events
            WHERE date_key >= ? AND date_key < ?
        `, [previousWindowStart, previousWindowEnd]).catch(() => ({ count: 0 }));

        const currentPeriodUploads = await db.get(`
            SELECT COALESCE(SUM(upload_count), 0) as count
            FROM (
                SELECT COUNT(*) as upload_count FROM photos WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM music WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM videos WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM articles WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM events WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ?
            )
        `, [sevenDaysAgo, sevenDaysAgo, sevenDaysAgo, sevenDaysAgo, sevenDaysAgo]).catch(() => ({ count: 0 }));

        const previousPeriodUploads = await db.get(`
            SELECT COALESCE(SUM(upload_count), 0) as count
            FROM (
                SELECT COUNT(*) as upload_count FROM photos WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) < ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM music WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) < ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM videos WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) < ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM articles WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) < ?
                UNION ALL
                SELECT COUNT(*) as upload_count FROM events WHERE deleted_at IS NULL AND substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) < ?
            )
        `, [
            previousWindowStart, previousWindowEnd,
            previousWindowStart, previousWindowEnd,
            previousWindowStart, previousWindowEnd,
            previousWindowStart, previousWindowEnd,
            previousWindowStart, previousWindowEnd
        ]).catch(() => ({ count: 0 }));

        const visitsTrendMap = new Map(visitsTrendRows.map(row => [row.date_key, row.views]));
        const visitorsTrendMap = new Map(uniqueVisitorsTrendRows.map(row => [row.date_key, row.visitors]));
        const uploadsTrendMap = new Map(uploadTrendRows.map(row => [row.date_key, row.uploads]));

        const trend = recentDateKeys.map((dateKey) => ({
            date: dateKey,
            label: dateKey.slice(5).replace('-', '/'),
            views: visitsTrendMap.get(dateKey) || 0,
            visitors: visitorsTrendMap.get(dateKey) || 0,
            uploads: uploadsTrendMap.get(dateKey) || 0
        }));

        const growthRate = (current, previous) => {
            if (!previous) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        const latestUpdateCandidates = [latestVisitRow?.updated_at, latestUploadRow?.updated_at].filter(Boolean);
        const updatedAt = latestUpdateCandidates.length > 0
            ? latestUpdateCandidates.sort((left, right) => new Date(right) - new Date(left))[0]
            : new Date().toISOString();

        const generatedAt = new Date().toISOString();
        const minutesDiff = Math.max((new Date(generatedAt) - new Date(updatedAt)) / (1000 * 60), 0);

        res.json({
            summary: {
                todayViews: todayViewsRow?.count || 0,
                todayVisitors: todayVisitorsRow?.count || 0,
                todayUploads: todayUploadsRow?.count || 0,
                totalViews: totalViewsRow?.count || 0,
                totalVisitors: totalVisitorsRow?.count || 0,
                totalUploads,
                totalEngagement,
                totalUsers: totalUsersRow?.count || 0,
                activeCreators: activeCreatorsRow?.count || 0
            },
            growth: {
                views7d: currentPeriodViews?.count || 0,
                uploads7d: currentPeriodUploads?.count || 0,
                viewsChange: growthRate(currentPeriodViews?.count || 0, previousPeriodViews?.count || 0),
                uploadsChange: growthRate(currentPeriodUploads?.count || 0, previousPeriodUploads?.count || 0)
            },
            breakdown: contentStats.reduce((accumulator, item) => {
                accumulator[item.table] = item.uploads;
                return accumulator;
            }, {}),
            trend,
            meta: {
                updatedAt,
                generatedAt,
                freshnessLabel: getRelativeThresholdLabel(minutesDiff)
            }
        });
    } catch (error) { next(error); }
};

const trackVisit = async (req, res, next) => {
    try {
        const db = await getDb();
        const { visitorKey, pagePath = '/' } = req.body || {};

        if (!visitorKey || typeof visitorKey !== 'string') {
            return res.status(400).json({ error: 'visitorKey is required' });
        }

        const sanitizedVisitorKey = visitorKey.slice(0, 128);
        const sanitizedPath = typeof pagePath === 'string' ? pagePath.slice(0, 255) : '/';
        const dateKey = getDateKey();

        if (sanitizedPath.startsWith('/admin') || req.user?.role === 'admin') {
            return res.json({ success: true, ignored: 'admin' });
        }

        const recentVisit = await db.get(
            `
                SELECT id
                FROM site_visit_events
                WHERE visitor_key = ?
                  AND page_path = ?
                  AND created_at >= datetime('now', '-10 minutes')
                LIMIT 1
            `,
            [sanitizedVisitorKey, sanitizedPath]
        ).catch(() => null);

        if (recentVisit) {
            return res.json({ success: true, deduped: true });
        }

        await db.run(
            'INSERT INTO site_visit_events (visitor_key, page_path, date_key) VALUES (?, ?, ?)',
            [sanitizedVisitorKey, sanitizedPath, dateKey]
        );

        await db.run(
            'INSERT OR IGNORE INTO site_daily_visitors (date_key, visitor_key, first_path) VALUES (?, ?, ?)',
            [dateKey, sanitizedVisitorKey, sanitizedPath]
        );

        res.json({ success: true });
    } catch (error) { next(error); }
};

const getStats = async (req, res, next) => {
  try {
    const db = await getDb();
    
    // Helper to get detailed stats for a table
    // FIX: O3 — Merge 4 queries per table into a single query
    const getTableStats = async (table) => {
        try {
          const row = await db.get(`
            SELECT
              COUNT(*) as total,
              SUM(CASE WHEN deleted_at IS NULL AND status = 'approved' THEN 1 ELSE 0 END) as active,
              SUM(CASE WHEN deleted_at IS NULL AND status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) as deleted
            FROM ${table}
          `);
          return {
              total: row?.total || 0,
              active: row?.active || 0,
              pending: row?.pending || 0,
              deleted: row?.deleted || 0
          };
        } catch (err) {
          console.error(`[Stats] Error getting stats for ${table}:`, err.message);
          return { total: 0, active: 0, pending: 0, deleted: 0 };
        }
    };

    const [photos, music, videos, articles, events, users, audit, totalEventViewsRow, totalEventRegistrationsRow, upcomingEventsRow, recentEventViewsRow, recentEventRegistrationsRow, hottestEvents] = await Promise.all([
      getTableStats('photos'),
      getTableStats('music'),
      getTableStats('videos'),
      getTableStats('articles'),
      getTableStats('events'),
      db.get('SELECT COUNT(*) as count FROM users').catch(() => ({ count: 0 })),
      db.get('SELECT COUNT(*) as count FROM audit_logs').catch(() => ({ count: 0 })),
      db.get('SELECT COALESCE(SUM(views), 0) as count FROM events WHERE deleted_at IS NULL').catch(() => ({ count: 0 })),
      db.get('SELECT COUNT(*) as count FROM event_registrations').catch(() => ({ count: 0 })),
      db.get(`
        SELECT COUNT(*) as count
        FROM events
        WHERE deleted_at IS NULL
          AND status = 'approved'
          AND date >= date('now', 'localtime')
      `).catch(() => ({ count: 0 })),
      db.get(`
        SELECT COUNT(*) as count
        FROM event_view_events
        WHERE date_key >= date('now', '-6 days')
      `).catch(() => ({ count: 0 })),
      db.get(`
        SELECT COUNT(*) as count
        FROM event_registrations
        WHERE created_at >= datetime('now', '-6 days')
      `).catch(() => ({ count: 0 })),
      db.all(`
        SELECT
          events.id,
          events.title,
          events.date,
          COALESCE(events.views, 0) as views,
          (
            SELECT COUNT(*)
            FROM event_registrations
            WHERE event_registrations.event_id = events.id
          ) as registrations
        FROM events
        WHERE events.deleted_at IS NULL
        ORDER BY COALESCE(events.views, 0) DESC, registrations DESC, events.date DESC
        LIMIT 5
      `).catch(() => [])
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
      eventAnalytics: {
        totalViews: totalEventViewsRow?.count || 0,
        totalRegistrations: totalEventRegistrationsRow?.count || 0,
        upcomingCount: upcomingEventsRow?.count || 0,
        views7d: recentEventViewsRow?.count || 0,
        registrations7d: recentEventRegistrationsRow?.count || 0,
        hottestEvents
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
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

    // Build URL that includes the subdirectory (images/, videos/, etc.)
    const buildUrl = (fileObj) => {
      const uploadsDir = path.join(__dirname, '../../uploads');
      const relativePath = path.relative(uploadsDir, fileObj.path).replace(/\\/g, '/');
      return `/uploads/${relativePath}`;
    };

    if (req.files && req.files['file']) {
      response.fileUrl = buildUrl(req.files['file'][0]);
    }
    if (req.files && req.files['cover']) {
      response.coverUrl = buildUrl(req.files['cover'][0]);
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

module.exports = { getStats, getSiteMetrics, trackVisit, handleUpload, downloadDbBackup, getFeaturedContent, crawlEvents, searchContent, getAuditLogs, getPendingContent };
