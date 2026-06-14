const { getDb } = require('../config/db');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const { searchGlobalContent } = require('../services/globalSearchService');
const { listPendingCompetitionItems } = require('./competitionController');
const {
    scrapeWeChat,
    parseWithLLM,
    cleanWeChatUrl,
    wechatCache,
    CACHE_TTL,
    downloadWeChatImage,
} = require('../utils/wechat');

const runCrawler = async (url, source) => {
    if (!url) {
        return {
            status: 'skipped',
            message: '请提供需要解析的活动通知链接。',
            events: [],
            total: 0,
            added: 0,
        };
    }

    const cleanedUrl = cleanWeChatUrl(url);
    const hostname = new URL(cleanedUrl).hostname;
    const isWeChatUrl = hostname.includes('weixin.qq.com') || hostname.includes('mp.weixin.qq.com');
    if (!isWeChatUrl) {
        return {
            status: 'skipped',
            message: '当前爬虫入口已接入微信公众号活动/通知解析；普通网页源还未实现。',
            source: source || hostname,
            events: [],
            total: 0,
            added: 0,
        };
    }

    if (wechatCache.has(cleanedUrl)) {
        const { data, timestamp } = wechatCache.get(cleanedUrl);
        if (Date.now() - timestamp < CACHE_TTL) {
            return {
                status: 'parsed',
                source: source || data?.source_college || data?.organizer || hostname,
                events: [data],
                total: 1,
                added: 0,
                cacheHit: true,
            };
        }
        wechatCache.delete(cleanedUrl);
    }

    const scrapedData = await scrapeWeChat(cleanedUrl);
    const parsedData = await parseWithLLM(scrapedData);
    if (!parsedData.content) parsedData.content = scrapedData.content;
    parsedData.title = parsedData.title || scrapedData.title || 'Untitled';
    parsedData.description = parsedData.description || scrapedData.content?.substring(0, 200) || '';
    parsedData.link = cleanedUrl;

    if (scrapedData.coverImage) {
        try {
            const localImagePath = await downloadWeChatImage(scrapedData.coverImage);
            parsedData.coverImage = localImagePath || scrapedData.coverImage;
            parsedData.image = parsedData.coverImage;
        } catch {
            parsedData.coverImage = scrapedData.coverImage;
            parsedData.image = scrapedData.coverImage;
        }
    }

    wechatCache.set(cleanedUrl, {
        data: parsedData,
        timestamp: Date.now(),
    });

    return {
        status: 'parsed',
        source: source || parsedData.source_college || parsedData.organizer || hostname,
        events: [parsedData],
        total: 1,
        added: 0,
        cacheHit: false,
    };
};

const searchContent = async (req, res, next) => {
    try {
        const db = await getDb();
        const { q } = req.query;
        if (!q || String(q).trim().length < 2) {
            return res.json({
                query: String(q || '').trim(),
                parsed_query: null,
                total: 0,
                search_time_ms: 0,
                groups: [],
                results: [],
                legacy: []
            });
        }

        const result = await searchGlobalContent(db, q);
        res.json(result);
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

const uploadRoot = path.resolve(__dirname, '../../uploads');
const imageVariantRoot = path.join(uploadRoot, '_variants');
const variantWidths = [320, 480, 640, 960, 1200, 1600];
const allowedVariantExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);

const pickVariantWidth = (value) => {
    const requested = Number.parseInt(value, 10);
    if (!Number.isFinite(requested)) return 960;
    return variantWidths.find((width) => width >= requested) || variantWidths[variantWidths.length - 1];
};

const resolveUploadImagePath = (src) => {
    const cleanSrc = String(src || '').split('?')[0].replace(/\\/g, '/');
    if (!cleanSrc.startsWith('/uploads/') || cleanSrc.includes('\0') || cleanSrc.includes('..')) {
        return null;
    }

    const relativePath = cleanSrc.replace(/^\/uploads\//, '');
    const resolvedPath = path.resolve(uploadRoot, relativePath);
    if (!resolvedPath.startsWith(uploadRoot + path.sep)) {
        return null;
    }

    const extension = path.extname(resolvedPath).toLowerCase();
    if (!allowedVariantExtensions.has(extension)) {
        return null;
    }

    return { cleanSrc, resolvedPath };
};

const getImageVariant = async (req, res, next) => {
    try {
        const resolved = resolveUploadImagePath(req.query.src);
        if (!resolved || !fs.existsSync(resolved.resolvedPath)) {
            return res.status(404).json({ error: 'Image not found' });
        }

        const width = pickVariantWidth(req.query.w || req.query.width);
        const quality = Math.min(Math.max(Number.parseInt(req.query.q || req.query.quality, 10) || 78, 50), 88);
        const sourceStat = fs.statSync(resolved.resolvedPath);
        const cacheKey = crypto
            .createHash('sha1')
            .update(`${resolved.cleanSrc}:${sourceStat.mtimeMs}:${sourceStat.size}:${width}:${quality}`)
            .digest('hex');
        const variantDir = path.join(imageVariantRoot, String(width));
        const variantPath = path.join(variantDir, `${cacheKey}.webp`);

        if (!fs.existsSync(variantPath)) {
            fs.mkdirSync(variantDir, { recursive: true });
            await sharp(resolved.resolvedPath, { animated: false })
                .rotate()
                .resize({ width, withoutEnlargement: true })
                .webp({ quality, effort: 4 })
                .toFile(variantPath);
        }

        res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Vary', 'Accept');
        return res.sendFile(variantPath);
    } catch (error) {
        return next(error);
    }
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
        const [photos, music, videos, articles, events, competitionItems] = await Promise.all([
            db.all("SELECT *, 'photos' as resource_type, url as preview_image FROM photos WHERE status = 'pending' AND deleted_at IS NULL"),
            db.all("SELECT *, 'music' as resource_type, cover as preview_image FROM music WHERE status = 'pending' AND deleted_at IS NULL"),
            db.all("SELECT *, 'videos' as resource_type, thumbnail as preview_image FROM videos WHERE status = 'pending' AND deleted_at IS NULL"),
            db.all("SELECT *, 'articles' as resource_type, cover as preview_image FROM articles WHERE status = 'pending' AND deleted_at IS NULL"),
            db.all("SELECT *, 'events' as resource_type, image as preview_image FROM events WHERE status = 'pending' AND deleted_at IS NULL"),
            listPendingCompetitionItems(db).catch(() => [])
        ]);

        // Combine and sort (newest first based on ID as proxy)
        const allPending = [
            ...photos.map(i => ({ ...i, type: 'photos' })),
            ...music.map(i => ({ ...i, type: 'music' })),
            ...videos.map(i => ({ ...i, type: 'videos' })),
            ...articles.map(i => ({ ...i, type: 'articles' })),
            ...events.map(i => ({ ...i, type: 'events' })),
            ...competitionItems
        ];
        
        // Sort by creation time first, then ID as a fallback.
        allPending.sort((a, b) => {
            const rightTime = new Date(b.created_at || 0).getTime();
            const leftTime = new Date(a.created_at || 0).getTime();
            if (rightTime !== leftTime) return rightTime - leftTime;
            return b.id - a.id;
        });

        res.json(allPending);
    } catch (error) { next(error); }
};

module.exports = { getStats, getSiteMetrics, trackVisit, handleUpload, getImageVariant, downloadDbBackup, getFeaturedContent, crawlEvents, searchContent, getAuditLogs, getPendingContent };
