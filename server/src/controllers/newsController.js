const axios = require('axios');
const cheerio = require('cheerio');
const { getDb } = require('../config/db');
const { normalizeLinkagePayload, serializeLinkageFields, attachLinkedResources } = require('../utils/communityLinks');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildExcerpt = (value = '') =>
  String(value).replace(/\s+/g, ' ').trim().slice(0, 180);

const normalizeBlocks = (contentBlocks) => {
  if (!contentBlocks) return null;
  if (typeof contentBlocks === 'string') return contentBlocks;
  if (Array.isArray(contentBlocks)) return JSON.stringify(contentBlocks);
  return null;
};

const TRACKING_PARAMS = new Set(['spm', 'from', 'ref', 'fbclid', 'gclid', 'igshid']);
const normalizeSourceUrl = (value = '') => {
  try {
    if (!/^https?:\/\//i.test(String(value || '').trim())) return String(value || '').trim();
    const url = new URL(String(value).trim());
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    // Remove common tracking params while preserving semantic query params.
    [...url.searchParams.keys()].forEach((key) => {
      const lower = String(key || '').toLowerCase();
      if (lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)) {
        url.searchParams.delete(key);
      }
    });
    const ordered = new URLSearchParams();
    [...url.searchParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([k, v]) => ordered.append(k, v));
    url.search = ordered.toString() ? `?${ordered.toString()}` : '';
    const normalizedPath = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    url.pathname = normalizedPath || '/';
    return url.toString();
  } catch {
    return String(value || '').trim();
  }
};

const serializeNews = (row) => serializeLinkageFields({
  id: row.id,
  title: row.title,
  excerpt: row.excerpt || '',
  content: row.content || '',
  content_blocks: row.content_blocks || null,
  cover: row.cover || null,
  source_name: row.source_name || null,
  source_url: row.source_url || null,
  import_type: row.import_type || 'manual',
  hot_score: row.hot_score || 0,
  views_count: row.views_count || 0,
  is_pinned: Boolean(row.is_pinned),
  pin_weight: row.pin_weight || 0,
  featured: Boolean(row.featured),
  status: row.status || 'approved',
  uploader_id: row.uploader_id || null,
  created_at: row.created_at,
  updated_at: row.updated_at,
  author_name: row.author_name || null,
  author_avatar: row.author_avatar || null,
  related_article_ids: row.related_article_ids,
  related_post_ids: row.related_post_ids,
  related_news_ids: row.related_news_ids,
  related_group_ids: row.related_group_ids,
});

const listNews = async (req, res, next) => {
  try {
    const db = await getDb();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = clamp(parseInt(req.query.limit || '12', 10), 1, 50);
    const offset = (page - 1) * limit;
    const sort = String(req.query.sort || 'hot').trim().toLowerCase();
    const status = String(req.query.status || 'approved').trim().toLowerCase();
    const q = String(req.query.search || '').trim();

    const whereClauses = ['deleted_at IS NULL'];
    const params = [];

    if (status !== 'all') {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (q.length >= 2) {
      const term = `%${q}%`;
      whereClauses.push('(title LIKE ? OR excerpt LIKE ? OR source_name LIKE ?)');
      params.push(term, term, term);
    }

    const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;
    const orderSQL =
      sort === 'latest'
        ? 'ORDER BY is_pinned DESC, pin_weight DESC, featured DESC, created_at DESC, id DESC'
        : 'ORDER BY is_pinned DESC, pin_weight DESC, featured DESC, hot_score DESC, created_at DESC, id DESC';

    const rows = await db.all(
      `
      SELECT news.*, users.nickname AS author_name, users.avatar AS author_avatar
      FROM news
      LEFT JOIN users ON users.id = news.uploader_id
      ${whereSQL}
      ${orderSQL}
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );
    const total = await db.get(`SELECT COUNT(*) as count FROM news ${whereSQL}`, params);

    res.json({
      data: rows.map(serializeNews),
      pagination: {
        total: total?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((total?.count || 0) / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getNews = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const item = await db.get(
      `
      SELECT news.*, users.nickname AS author_name, users.avatar AS author_avatar
      FROM news
      LEFT JOIN users ON users.id = news.uploader_id
      WHERE news.id = ? AND news.deleted_at IS NULL
      `,
      [id]
    );
    if (!item) {
      return res.status(404).json({ error: 'News item not found' });
    }

    await db.run('UPDATE news SET views_count = COALESCE(views_count, 0) + 1, hot_score = COALESCE(hot_score, 0) + 1 WHERE id = ?', [id]);
    const updated = await db.get(
      `
      SELECT news.*, users.nickname AS author_name, users.avatar AS author_avatar
      FROM news
      LEFT JOIN users ON users.id = news.uploader_id
      WHERE news.id = ?
      `,
      [id]
    );
    const serialized = serializeNews(updated);
    const linked = await attachLinkedResources(db, serialized);
    res.json(linked);
  } catch (error) {
    next(error);
  }
};

const checkNewsSourceHealth = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const item = await db.get('SELECT id, source_url FROM news WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!item) {
      return res.status(404).json({ error: 'News item not found' });
    }
    if (!item.source_url) {
      return res.json({
        reachable: false,
        reason: 'missing_source_url',
      });
    }

    try {
      const response = await axios.head(item.source_url, {
        timeout: 8000,
        maxRedirects: 3,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0 Codex News Health Checker',
        },
      });
      const status = response?.status || 0;
      const reachable = status >= 200 && status < 400;
      return res.json({
        reachable,
        status,
      });
    } catch {
      return res.json({
        reachable: false,
        reason: 'network_error',
      });
    }
  } catch (error) {
    next(error);
  }
};

const buildNewsPayload = (body = {}, userRole = 'user') => {
  const mutableBody = { ...body };
  normalizeLinkagePayload(mutableBody, { strict: true });
  const title = String(body.title || '').trim();
  const excerpt = String(body.excerpt || '').trim();
  const content = String(body.content || '').trim();
  const sourceName = String(body.source_name || '').trim();
  const sourceUrl = normalizeSourceUrl(String(body.source_url || '').trim());

  return {
    title,
    excerpt: excerpt || buildExcerpt(content),
    content,
    content_blocks: normalizeBlocks(body.content_blocks),
    cover: body.cover || null,
    source_name: sourceName || null,
    source_url: sourceUrl || null,
    import_type: body.import_type || 'manual',
    external_id: body.external_id || null,
    hot_score: clamp(parseInt(body.hot_score || '0', 10) || 0, 0, 999999),
    is_pinned: body.is_pinned ? 1 : 0,
    pin_weight: clamp(parseInt(body.pin_weight || '0', 10) || 0, 0, 9999),
    featured: body.featured ? 1 : 0,
    status: userRole === 'admin' ? 'approved' : 'pending',
    related_article_ids: mutableBody.related_article_ids || null,
    related_post_ids: mutableBody.related_post_ids || null,
    related_news_ids: mutableBody.related_news_ids || null,
    related_group_ids: mutableBody.related_group_ids || null,
  };
};

const createNews = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });

    const payload = buildNewsPayload(req.body, req.user?.role);
    if (payload.title.length < 4) {
      return res.status(400).json({ error: 'Title is too short' });
    }
    if (payload.content.length < 8) {
      return res.status(400).json({ error: 'Content is too short' });
    }

    const result = await db.run(
      `
      INSERT INTO news
      (title, excerpt, content, content_blocks, cover, source_name, source_url, import_type, external_id, hot_score, is_pinned, pin_weight, featured, status, related_article_ids, related_post_ids, related_news_ids, related_group_ids, uploader_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      [
        payload.title,
        payload.excerpt,
        payload.content,
        payload.content_blocks,
        payload.cover,
        payload.source_name,
        payload.source_url,
        payload.import_type,
        payload.external_id,
        payload.hot_score,
        payload.is_pinned,
        payload.pin_weight,
        payload.featured,
        payload.status,
        payload.related_article_ids,
        payload.related_post_ids,
        payload.related_news_ids,
        payload.related_group_ids,
        userId,
      ]
    );

    const item = await db.get(
      `
      SELECT news.*, users.nickname AS author_name, users.avatar AS author_avatar
      FROM news
      LEFT JOIN users ON users.id = news.uploader_id
      WHERE news.id = ?
      `,
      [result.lastID]
    );

    res.status(201).json(serializeNews(item));
  } catch (error) {
    next(error);
  }
};

const updateNews = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM news WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!existing) return res.status(404).json({ error: 'News item not found' });
    if (req.user?.role !== 'admin' && existing.uploader_id !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const payload = buildNewsPayload({ ...existing, ...req.body }, req.user?.role);
    await db.run(
      `
      UPDATE news
      SET title = ?, excerpt = ?, content = ?, content_blocks = ?, cover = ?, source_name = ?, source_url = ?, import_type = ?, external_id = ?, hot_score = ?, is_pinned = ?, pin_weight = ?, featured = ?, status = ?, related_article_ids = ?, related_post_ids = ?, related_news_ids = ?, related_group_ids = ?, updated_at = datetime('now')
      WHERE id = ?
      `,
      [
        payload.title,
        payload.excerpt,
        payload.content,
        payload.content_blocks,
        payload.cover,
        payload.source_name,
        payload.source_url,
        payload.import_type,
        payload.external_id,
        payload.hot_score,
        payload.is_pinned,
        payload.pin_weight,
        payload.featured,
        req.user?.role === 'admin' ? (req.body.status || existing.status || 'approved') : existing.status,
        payload.related_article_ids,
        payload.related_post_ids,
        payload.related_news_ids,
        payload.related_group_ids,
        id,
      ]
    );

    const item = await db.get(
      `
      SELECT news.*, users.nickname AS author_name, users.avatar AS author_avatar
      FROM news
      LEFT JOIN users ON users.id = news.uploader_id
      WHERE news.id = ?
      `,
      [id]
    );
    res.json(serializeNews(item));
  } catch (error) {
    next(error);
  }
};

const deleteNews = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM news WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!existing) return res.status(404).json({ error: 'News item not found' });
    if (req.user?.role !== 'admin' && existing.uploader_id !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    await db.run('UPDATE news SET deleted_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const reviewNews = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const status = String(req.body.status || req.body.action || '').trim().toLowerCase();
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await db.run('UPDATE news SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', [status, id]);
    const item = await db.get('SELECT * FROM news WHERE id = ?', [id]);
    res.json(item ? serializeNews(item) : null);
  } catch (error) {
    next(error);
  }
};

const importNews = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });

    const sourceUrl = normalizeSourceUrl(String(req.body.source_url || req.body.url || '').trim());
    if (!/^https?:\/\//i.test(sourceUrl)) {
      return res.status(400).json({ error: 'A valid source URL is required' });
    }

    const duplicate = await db.get('SELECT id FROM news WHERE source_url = ? AND deleted_at IS NULL', [sourceUrl]);
    if (duplicate) {
      return res.status(409).json({ error: 'This news URL has already been imported' });
    }

    const response = await axios.get(sourceUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 Codex News Importer',
      },
    });
    const $ = cheerio.load(response.data || '');
    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').first().text().trim();
    const excerpt =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      buildExcerpt($('article p').first().text() || $('p').first().text());
    const cover =
      $('meta[property="og:image"]').attr('content') ||
      null;
    const paragraphs = [];
    $('article p, main p').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length >= 20 && paragraphs.length < 8) paragraphs.push(text);
    });
    const content = paragraphs.length > 0 ? paragraphs.join('\n\n') : excerpt;

    const payload = buildNewsPayload(
      {
        title,
        excerpt,
        content,
        cover,
        source_name: new URL(sourceUrl).hostname.replace(/^www\./, ''),
        source_url: sourceUrl,
        import_type: 'external',
      },
      req.user?.role
    );
    // Imported news must always go through edit-and-confirm before publishing.
    payload.status = 'draft';

    const result = await db.run(
      `
      INSERT INTO news
      (title, excerpt, content, content_blocks, cover, source_name, source_url, import_type, external_id, hot_score, is_pinned, pin_weight, featured, status, uploader_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      [
        payload.title,
        payload.excerpt,
        payload.content,
        payload.content_blocks,
        payload.cover,
        payload.source_name,
        payload.source_url,
        payload.import_type,
        payload.external_id,
        payload.hot_score,
        payload.is_pinned,
        payload.pin_weight,
        payload.featured,
        payload.status,
        userId,
      ]
    );

    const item = await db.get('SELECT * FROM news WHERE id = ?', [result.lastID]);
    res.status(201).json(serializeNews(item));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listNews,
  getNews,
  checkNewsSourceHealth,
  createNews,
  updateNews,
  deleteNews,
  reviewNews,
  importNews,
};
