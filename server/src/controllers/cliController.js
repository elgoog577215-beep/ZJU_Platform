const { getDb } = require('../config/db');
const { cleanupTempFiles } = require('../middleware/upload');
const { importCommunityDocument } = require('../utils/communityDocumentImport');
const { fanOutNewContent } = require('./notificationController');

const CHANNELS = new Set(['tech', 'news']);
const REVIEW_STATUSES = new Set(['draft', 'pending', 'approved', 'rejected']);
const TRACKING_PARAMS = new Set(['spm', 'from', 'ref', 'fbclid', 'gclid', 'igshid']);

const normalizeText = (value = '') => String(value || '').trim();

const normalizeChannel = (value = '') => {
  const channel = normalizeText(value).toLowerCase();
  return CHANNELS.has(channel) ? channel : null;
};

const normalizeTags = (value = '') => normalizeText(value)
  .split(/[,\s]+/)
  .map((tag) => tag.trim())
  .filter(Boolean)
  .slice(0, 12)
  .join(',');

const buildExcerpt = (value = '') => normalizeText(value).replace(/\s+/g, ' ').slice(0, 180);

const normalizeStatus = (requestedStatus, userRole = 'user') => {
  const status = normalizeText(requestedStatus || 'pending').toLowerCase();
  if (userRole === 'admin' && REVIEW_STATUSES.has(status)) return status;
  return status === 'draft' ? 'draft' : 'pending';
};

const normalizeSourceUrl = (value = '') => {
  const raw = normalizeText(value);
  try {
    if (!/^https?:\/\//i.test(raw)) return raw;
    const url = new URL(raw);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    [...url.searchParams.keys()].forEach((key) => {
      const lower = String(key || '').toLowerCase();
      if (lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)) {
        url.searchParams.delete(key);
      }
    });
    const ordered = new URLSearchParams();
    [...url.searchParams.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([key, item]) => ordered.append(key, item));
    url.search = ordered.toString() ? `?${ordered.toString()}` : '';
    url.pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    return url.toString();
  } catch {
    return raw;
  }
};

const sourceNameFromUrl = (sourceUrl = '') => {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const ensureTags = async (db, tags = '') => {
  const items = normalizeTags(tags).split(',').filter(Boolean);
  for (const tag of items) {
    await db.run('INSERT OR IGNORE INTO tags (name, count) VALUES (?, 0)', [tag]);
  }
};

const serializeArticleSubmission = (row) => ({
  id: row.id,
  channel: 'tech',
  type: 'article',
  title: row.title,
  excerpt: row.excerpt || '',
  status: row.status || 'pending',
  url: `/articles?id=${row.id}`,
  created_at: row.created_at,
  updated_at: row.updated_at || null,
});

const serializeNewsSubmission = (row) => ({
  id: row.id,
  channel: 'news',
  type: 'news',
  title: row.title,
  excerpt: row.excerpt || '',
  status: row.status || 'pending',
  source_url: row.source_url || null,
  url: `/articles?postTab=news&news=${row.id}`,
  created_at: row.created_at,
  updated_at: row.updated_at || null,
});

const importCliFile = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Login required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const channel = normalizeChannel(req.body?.channel);
    if (!channel) {
      return res.status(400).json({ error: 'Invalid channel. Use tech or news.' });
    }

    const imported = await importCommunityDocument(req.file);
    const title = normalizeText(req.body?.title) || imported.title;
    const excerpt = normalizeText(req.body?.excerpt || req.body?.summary) || buildExcerpt(imported.plainText);

    res.json({
      channel,
      title,
      excerpt,
      plain_text: imported.plainText,
      content_blocks: imported.contentBlocks,
      meta: {
        ...imported.meta,
        requires_source_url: channel === 'news',
      },
    });
  } catch (error) {
    next(error);
  } finally {
    cleanupTempFiles(req.file).catch(() => {});
  }
};

const publishTech = async ({ db, req, imported, title, excerpt, status }) => {
  const tags = normalizeTags(req.body?.tags || '技术分享');
  const contentBlocks = JSON.stringify(imported.contentBlocks);
  const result = await db.run(
    `
    INSERT INTO articles
    (title, date, excerpt, tags, content, content_blocks, cover, featured, category, status, uploader_id, created_at)
    VALUES (?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    [
      title,
      excerpt,
      tags,
      imported.plainText,
      contentBlocks,
      normalizeText(req.body?.cover) || null,
      req.user?.role === 'admin' && req.body?.featured ? 1 : 0,
      'tech',
      status,
      req.user.id,
    ]
  );
  await ensureTags(db, tags);

  if (status === 'approved') {
    await fanOutNewContent({
      authorId: req.user.id,
      resourceType: 'article',
      resourceId: result.lastID,
      title,
    });
  }

  const row = await db.get('SELECT * FROM articles WHERE id = ?', [result.lastID]);
  return serializeArticleSubmission(row);
};

const publishNews = async ({ db, req, imported, title, excerpt, status }) => {
  const sourceUrl = normalizeSourceUrl(req.body?.source_url || req.body?.sourceUrl || '');
  if (!/^https?:\/\//i.test(sourceUrl)) {
    const error = new Error('A valid source_url is required for news uploads');
    error.statusCode = 400;
    throw error;
  }

  const duplicate = await db.get('SELECT id FROM news WHERE source_url = ? AND deleted_at IS NULL', [sourceUrl]);
  if (duplicate) {
    const error = new Error('This news source URL has already been submitted');
    error.statusCode = 409;
    throw error;
  }

  const sourceName = normalizeText(req.body?.source_name || req.body?.sourceName) || sourceNameFromUrl(sourceUrl);
  const result = await db.run(
    `
    INSERT INTO news
    (title, excerpt, content, content_blocks, cover, source_name, source_url, import_type, hot_score, is_pinned, pin_weight, featured, status, uploader_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `,
    [
      title,
      excerpt,
      imported.plainText,
      JSON.stringify(imported.contentBlocks),
      normalizeText(req.body?.cover) || null,
      sourceName || null,
      sourceUrl,
      'cli',
      0,
      req.user?.role === 'admin' && req.body?.is_pinned ? 1 : 0,
      req.user?.role === 'admin' ? Number.parseInt(req.body?.pin_weight || '0', 10) || 0 : 0,
      req.user?.role === 'admin' && req.body?.featured ? 1 : 0,
      status,
      req.user.id,
    ]
  );

  if (status === 'approved') {
    await fanOutNewContent({
      authorId: req.user.id,
      resourceType: 'news',
      resourceId: result.lastID,
      title,
    });
  }

  const row = await db.get('SELECT * FROM news WHERE id = ?', [result.lastID]);
  return serializeNewsSubmission(row);
};

const publishCliFile = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Login required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const channel = normalizeChannel(req.body?.channel);
    if (!channel) {
      return res.status(400).json({ error: 'Invalid channel. Use tech or news.' });
    }

    const imported = await importCommunityDocument(req.file);
    const title = normalizeText(req.body?.title) || imported.title;
    const excerpt = normalizeText(req.body?.excerpt || req.body?.summary) || buildExcerpt(imported.plainText);
    const status = normalizeStatus(req.body?.status || req.body?.intent, req.user?.role);

    if (title.length < 4) {
      return res.status(400).json({ error: 'Title is too short' });
    }
    if (imported.plainText.length < 8) {
      return res.status(400).json({ error: 'Content is too short' });
    }

    const db = await getDb();
    const submission = channel === 'news'
      ? await publishNews({ db, req, imported, title, excerpt, status })
      : await publishTech({ db, req, imported, title, excerpt, status });

    res.status(201).json({
      success: true,
      submission,
      meta: imported.meta,
    });
  } catch (error) {
    next(error);
  } finally {
    cleanupTempFiles(req.file).catch(() => {});
  }
};

const listCliSubmissions = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Login required' });
    }

    const channel = normalizeChannel(req.query?.channel || '');
    const status = normalizeText(req.query?.status || 'all').toLowerCase();
    const limit = Math.min(Math.max(Number.parseInt(req.query?.limit || '20', 10) || 20, 1), 50);
    const db = await getDb();
    const items = [];

    if (!channel || channel === 'tech') {
      const params = [userId];
      let statusSql = '';
      if (REVIEW_STATUSES.has(status)) {
        statusSql = 'AND status = ?';
        params.push(status);
      }
      params.push(limit);
      const rows = await db.all(
        `
        SELECT id, title, excerpt, status, created_at, NULL AS updated_at
        FROM articles
        WHERE uploader_id = ?
          AND deleted_at IS NULL
          AND category = 'tech'
          ${statusSql}
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        `,
        params
      );
      items.push(...rows.map(serializeArticleSubmission));
    }

    if (!channel || channel === 'news') {
      const params = [userId];
      let statusSql = '';
      if (REVIEW_STATUSES.has(status)) {
        statusSql = 'AND status = ?';
        params.push(status);
      }
      params.push(limit);
      const rows = await db.all(
        `
        SELECT id, title, excerpt, status, source_url, created_at, updated_at
        FROM news
        WHERE uploader_id = ?
          AND deleted_at IS NULL
          ${statusSql}
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        `,
        params
      );
      items.push(...rows.map(serializeNewsSubmission));
    }

    items.sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')));
    res.json({ data: items.slice(0, limit) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importCliFile,
  publishCliFile,
  listCliSubmissions,
};
