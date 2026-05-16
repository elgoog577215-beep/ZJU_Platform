const { getDb } = require('../config/db');
const { createNotification } = require('./notificationController');

const MEDIA_TYPES = new Set(['promo_video', 'stage_photo']);
const REVIEW_STATUSES = new Set(['pending', 'approved', 'rejected']);
const COMPETITION_STATUSES = new Set(['active', 'draft', 'archived']);

const MEDIA_LABELS = {
  promo_video: '赛事宣传片',
  stage_photo: '赛场照片',
};

const trimText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, maxLength);
};

const nullableText = (value, maxLength = 500) => {
  const text = trimText(value, maxLength);
  return text || null;
};

const toInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBooleanInt = (value) => {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1;
  return 0;
};

const normalizeStatus = (value, fallback = 'pending') => {
  const status = trimText(value, 20).toLowerCase();
  return REVIEW_STATUSES.has(status) ? status : fallback;
};

const normalizeCompetitionStatus = (value, fallback = 'active') => {
  const status = trimText(value, 20).toLowerCase();
  return COMPETITION_STATUSES.has(status) ? status : fallback;
};

const normalizeSlug = (value) => {
  const slug = trimText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || null;
};

const isSafeAssetUrl = (value, options = {}) => {
  const assetUrl = trimText(value, 1000);
  if (!assetUrl || assetUrl.includes('..')) return false;
  if (assetUrl.startsWith('/uploads/')) return true;
  if (!options.allowExternal) return false;

  try {
    const parsed = new URL(assetUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isHttpUrl = (value) => {
  const url = trimText(value, 1000);
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const sendBadRequest = (res, message) => res.status(400).json({ error: message });

const serializeCompetition = (row) => {
  if (!row) return null;
  return {
    ...row,
    is_featured: Boolean(row.is_featured),
  };
};

const serializeMedia = (row) => ({
  ...row,
  sort_order: toInteger(row.sort_order, 0),
  type_label: MEDIA_LABELS[row.type] || row.type,
});

const serializePhotoOutcome = (row) => ({
  id: `photo-${row.id}`,
  source_table: 'photos',
  source_id: row.id,
  type: 'stage_photo',
  type_label: MEDIA_LABELS.stage_photo,
  title: row.title,
  description: row.gameDescription || '',
  url: row.url,
  cover_url: row.url,
  tags: row.tags,
  status: row.status,
  sort_order: 0,
  uploader_name: row.uploader_name,
  created_at: row.created_at,
});

const serializeVideoOutcome = (row) => ({
  id: `video-${row.id}`,
  source_table: 'videos',
  source_id: row.id,
  type: 'promo_video',
  type_label: MEDIA_LABELS.promo_video,
  title: row.title,
  description: row.gameDescription || '',
  url: row.video,
  cover_url: row.thumbnail,
  tags: row.tags,
  status: row.status,
  sort_order: 0,
  uploader_name: row.uploader_name,
  created_at: row.created_at,
});

const dedupeOutcomeMedia = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.type}:${item.url || item.source_table}:${item.source_id || item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const serializeWork = (row) => ({
  ...row,
  sort_order: toInteger(row.sort_order, 0),
  public_consent: row.public_consent === undefined ? true : Boolean(row.public_consent),
});

const serializePublicWork = (row) => ({
  id: row.id,
  competition_id: row.competition_id,
  title: row.title,
  author: row.author,
  summary: row.summary,
  git_url: row.git_url,
  award: row.award,
  rank: row.rank,
  cover_url: row.cover_url,
  sort_order: toInteger(row.sort_order, 0),
  honor_title: row.honor_title || row.award || (row.rank ? `Top ${row.rank}` : null),
  grade: row.grade,
  major: row.major,
  highlight: row.highlight,
  experience: row.experience,
  story_file_url: row.story_file_url,
  uploader_name: row.uploader_name,
});

const extractWorkStoryFields = (body, options = {}) => {
  const allowExternalStoryFile = Boolean(options.allowExternalStoryFile);
  const storyFileUrl = nullableText(body.story_file_url || body.storyFileUrl, 1000);
  if (storyFileUrl && !isSafeAssetUrl(storyFileUrl, { allowExternal: allowExternalStoryFile })) {
    const error = new Error('经验分享附件地址无效');
    error.statusCode = 400;
    throw error;
  }

  return {
    honorTitle: nullableText(body.honor_title || body.honorTitle, 120),
    grade: nullableText(body.grade, 80),
    major: nullableText(body.major, 160),
    highlight: nullableText(body.highlight, 220),
    experience: nullableText(body.experience, 8000),
    storyFileUrl,
    publicConsent: body.public_consent === undefined && body.publicConsent === undefined
      ? 1
      : toBooleanInt(body.public_consent ?? body.publicConsent),
  };
};

const createAuditLog = async (db, adminId, resourceType, resourceId, action, reason = null) => {
  if (!adminId) return;
  try {
    await db.run(
      'INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)',
      [adminId, resourceType, resourceId, action, reason],
    );
  } catch (error) {
    console.warn('[CompetitionOutcome] audit log skipped:', error.message);
  }
};

const notifyReviewResult = async ({ resource, status, reason, adminId, resourceType }) => {
  if (!resource?.uploader_id || resource.uploader_id === adminId) return;
  if (status !== 'approved' && status !== 'rejected') return;

  const title = resource.title || '比赛成果';
  const type = status === 'approved' ? 'approval' : 'rejection';
  const content =
    status === 'approved'
      ? `你的比赛成果「${title}」已通过审核。`
      : `你的比赛成果「${title}」未通过审核。${reason ? `原因：${reason}` : ''}`;

  await createNotification(resource.uploader_id, type, content, resource.id, resourceType);
};

const getFeaturedCompetition = async (db) => {
  const featured = await db.get(`
    SELECT *
    FROM competitions
    WHERE is_featured = 1
      AND status = 'active'
      AND deleted_at IS NULL
    ORDER BY updated_at DESC, id DESC
    LIMIT 1
  `);
  if (featured) return featured;

  const active = await db.get(`
    SELECT *
    FROM competitions
    WHERE status = 'active'
      AND deleted_at IS NULL
    ORDER BY updated_at DESC, id DESC
    LIMIT 1
  `);
  if (active) return active;

  const result = await db.run(
    `INSERT INTO competitions (
      slug, title, subtitle, description, event_date, is_featured, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, 'active', datetime('now'), datetime('now'))`,
    [
      'ai-full-stack-hackathon-outcome',
      'AI 全栈极速黑客松',
      '比赛成果展示',
      '赛事宣传片、赛场照片和优秀作品会在审核通过后展示在这里。',
      '2026',
    ],
  );

  return getCompetitionById(db, result.lastID);
};

const getCompetitionById = async (db, id) => {
  return db.get(
    'SELECT * FROM competitions WHERE id = ? AND deleted_at IS NULL',
    [id],
  );
};

const makeUniqueSlug = async (db, input, excludeId = null) => {
  const base = normalizeSlug(input) || `competition-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = excludeId
      ? await db.get('SELECT id FROM competitions WHERE slug = ? AND id != ?', [candidate, excludeId])
      : await db.get('SELECT id FROM competitions WHERE slug = ?', [candidate]);
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
};

const getCurrentOutcome = async (_req, res, next) => {
  try {
    const db = await getDb();
    const competition = await getFeaturedCompetition(db);

    if (!competition) {
      return res.json({
        competition: null,
        media: { promo_videos: [], stage_photos: [] },
        works: [],
        stats: { promo_videos: 0, stage_photos: 0, works: 0 },
      });
    }

    const [photoRows, videoRows, workRows] = await Promise.all([
      db.all(
        `SELECT p.*, COALESCE(u.nickname, u.username) AS uploader_name
         FROM photos p
         LEFT JOIN users u ON u.id = p.uploader_id
         WHERE p.status = 'approved'
           AND p.deleted_at IS NULL
           AND p.gameType = 'hackathon'
          ORDER BY p.featured DESC, p.id DESC
          LIMIT 18`,
      ),
      db.all(
        `SELECT v.*, COALESCE(u.nickname, u.username) AS uploader_name
         FROM videos v
         LEFT JOIN users u ON u.id = v.uploader_id
         WHERE v.status = 'approved'
           AND v.deleted_at IS NULL
           AND v.gameType = 'hackathon'
          ORDER BY v.featured DESC, v.id DESC
          LIMIT 8`,
      ),
      db.all(
        `SELECT cw.*, COALESCE(u.nickname, u.username) AS uploader_name
         FROM competition_works cw
         LEFT JOIN users u ON u.id = cw.uploader_id
         WHERE cw.competition_id = ?
           AND cw.status = 'approved'
           AND COALESCE(cw.public_consent, 1) = 1
           AND cw.deleted_at IS NULL
         ORDER BY cw.sort_order ASC, cw.id DESC`,
        [competition.id],
      ),
    ]);

    const media = [
      ...photoRows.map(serializePhotoOutcome),
      ...videoRows.map(serializeVideoOutcome),
    ];
    const promoVideos = dedupeOutcomeMedia(media.filter((item) => item.type === 'promo_video'));
    const stagePhotos = dedupeOutcomeMedia(media.filter((item) => item.type === 'stage_photo'));
    const works = workRows.map(serializePublicWork);

    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      competition: serializeCompetition(competition),
      media: {
        promo_videos: promoVideos,
        stage_photos: stagePhotos,
      },
      works,
      stats: {
        promo_videos: promoVideos.length,
        stage_photos: stagePhotos.length,
        works: works.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const submitCurrentMedia = async (req, res, next) => {
  try {
    const db = await getDb();
    const competition = await getFeaturedCompetition(db);
    if (!competition) {
      return res.status(404).json({ error: '当前没有配置可投稿的比赛' });
    }

    const type = trimText(req.body.type, 40);
    const title = trimText(req.body.title, 140);
    const description = nullableText(req.body.description, 800);
    const url = trimText(req.body.url, 1000);
    const coverUrl = nullableText(req.body.cover_url || req.body.coverUrl, 1000);

    if (!MEDIA_TYPES.has(type)) return sendBadRequest(res, '请选择有效的成果类型');
    if (!title) return sendBadRequest(res, '请填写标题');
    if (!isSafeAssetUrl(url)) return sendBadRequest(res, '请先上传文件后再提交');
    if (coverUrl && !isSafeAssetUrl(coverUrl)) return sendBadRequest(res, '封面地址无效');

    const requestedStatus = normalizeStatus(req.body.status, 'approved');
    const status = req.user?.role === 'admin' ? requestedStatus : 'pending';
    const reviewedBy = status === 'approved' || status === 'rejected' ? req.user.id : null;
    const reviewedAt = reviewedBy ? new Date().toISOString() : null;

    const result = await db.run(
      `INSERT INTO competition_media (
        competition_id, type, title, description, url, cover_url, sort_order,
        status, uploader_id, reviewed_by, reviewed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        competition.id,
        type,
        title,
        description,
        url,
        coverUrl,
        toInteger(req.body.sort_order, 0),
        status,
        req.user.id,
        reviewedBy,
        reviewedAt,
      ],
    );

    const row = await db.get('SELECT * FROM competition_media WHERE id = ?', [result.lastID]);
    return res.status(201).json(serializeMedia(row));
  } catch (error) {
    return next(error);
  }
};

const submitCurrentWork = async (req, res, next) => {
  try {
    const db = await getDb();
    const competition = await getFeaturedCompetition(db);
    if (!competition) {
      return res.status(404).json({ error: '当前没有配置可投稿的比赛' });
    }

    const title = trimText(req.body.title, 140);
    const author = trimText(req.body.author, 140);
    const summary = trimText(req.body.summary, 1200);
    const gitUrl = nullableText(req.body.git_url || req.body.gitUrl, 1000);
    const award = nullableText(req.body.award, 140);
    const rank = nullableText(req.body.rank, 40);
    const coverUrl = nullableText(req.body.cover_url || req.body.coverUrl, 1000);
    const story = extractWorkStoryFields(req.body);

    if (!title) return sendBadRequest(res, '请填写作品名称');
    if (!author) return sendBadRequest(res, '请填写作者');
    if (!summary) return sendBadRequest(res, '请填写作品简介');
    if (!gitUrl || !isHttpUrl(gitUrl)) return sendBadRequest(res, '请填写有效的 Git 链接');
    if (coverUrl && !isSafeAssetUrl(coverUrl)) return sendBadRequest(res, '封面地址无效');

    const requestedStatus = normalizeStatus(req.body.status, 'approved');
    const status = req.user?.role === 'admin' ? requestedStatus : 'pending';
    const reviewedBy = status === 'approved' || status === 'rejected' ? req.user.id : null;
    const reviewedAt = reviewedBy ? new Date().toISOString() : null;

    const result = await db.run(
      `INSERT INTO competition_works (
        competition_id, title, author, summary, git_url, award, rank, cover_url,
        honor_title, grade, major, highlight, experience, story_file_url, public_consent,
        sort_order, status, uploader_id, reviewed_by, reviewed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        competition.id,
        title,
        author,
        summary,
        gitUrl,
        award,
        rank,
        coverUrl,
        story.honorTitle,
        story.grade,
        story.major,
        story.highlight,
        story.experience,
        story.storyFileUrl,
        story.publicConsent,
        toInteger(req.body.sort_order, 0),
        status,
        req.user.id,
        reviewedBy,
        reviewedAt,
      ],
    );

    const row = await db.get('SELECT * FROM competition_works WHERE id = ?', [result.lastID]);
    return res.status(201).json(serializeWork(row));
  } catch (error) {
    return next(error);
  }
};

const listCompetitions = async (_req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT c.*,
        (SELECT COUNT(*) FROM competition_media cm WHERE cm.competition_id = c.id AND cm.deleted_at IS NULL) AS media_count,
        (SELECT COUNT(*) FROM competition_media cm WHERE cm.competition_id = c.id AND cm.type = 'promo_video' AND cm.deleted_at IS NULL) AS promo_video_count,
        (SELECT COUNT(*) FROM competition_media cm WHERE cm.competition_id = c.id AND cm.type = 'stage_photo' AND cm.deleted_at IS NULL) AS stage_photo_count,
        (SELECT COUNT(*) FROM competition_works cw WHERE cw.competition_id = c.id AND cw.deleted_at IS NULL) AS works_count,
        (SELECT COUNT(*) FROM competition_media cm WHERE cm.competition_id = c.id AND cm.status = 'pending' AND cm.deleted_at IS NULL)
          + (SELECT COUNT(*) FROM competition_works cw WHERE cw.competition_id = c.id AND cw.status = 'pending' AND cw.deleted_at IS NULL) AS pending_count
      FROM competitions c
      WHERE c.deleted_at IS NULL
      ORDER BY c.is_featured DESC, c.updated_at DESC, c.id DESC
    `);

    return res.json(rows.map(serializeCompetition));
  } catch (error) {
    return next(error);
  }
};

const createCompetition = async (req, res, next) => {
  try {
    const db = await getDb();
    const title = trimText(req.body.title, 140);
    if (!title) return sendBadRequest(res, '请填写比赛名称');

    const slug = await makeUniqueSlug(db, req.body.slug || title);
    const status = normalizeCompetitionStatus(req.body.status, 'active');
    const isFeatured = toBooleanInt(req.body.is_featured);

    const result = await db.run(
      `INSERT INTO competitions (
        slug, title, subtitle, description, event_date, cover_image,
        is_featured, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        slug,
        title,
        nullableText(req.body.subtitle, 240),
        nullableText(req.body.description, 1600),
        nullableText(req.body.event_date || req.body.eventDate, 80),
        nullableText(req.body.cover_image || req.body.coverImage, 1000),
        0,
        status,
      ],
    );

    if (isFeatured) {
      await setFeaturedCompetition(db, result.lastID);
    }

    await createAuditLog(db, req.user?.id, 'competitions', result.lastID, 'create', null);
    const row = await getCompetitionById(db, result.lastID);
    return res.status(201).json(serializeCompetition(row));
  } catch (error) {
    return next(error);
  }
};

const updateCompetition = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    const existing = await getCompetitionById(db, id);
    if (!existing) return res.status(404).json({ error: '比赛不存在' });

    const title = req.body.title !== undefined ? trimText(req.body.title, 140) : existing.title;
    if (!title) return sendBadRequest(res, '请填写比赛名称');

    const slug = req.body.slug !== undefined
      ? await makeUniqueSlug(db, req.body.slug || title, id)
      : existing.slug;
    const coverImage = nullableText(req.body.cover_image || req.body.coverImage, 1000);

    await db.run(
      `UPDATE competitions
       SET slug = ?,
           title = ?,
           subtitle = ?,
           description = ?,
           event_date = ?,
           cover_image = ?,
           status = ?,
           updated_at = datetime('now')
       WHERE id = ? AND deleted_at IS NULL`,
      [
        slug,
        title,
        req.body.subtitle !== undefined ? nullableText(req.body.subtitle, 240) : existing.subtitle,
        req.body.description !== undefined ? nullableText(req.body.description, 1600) : existing.description,
        req.body.event_date !== undefined || req.body.eventDate !== undefined
          ? nullableText(req.body.event_date || req.body.eventDate, 80)
          : existing.event_date,
        req.body.cover_image !== undefined || req.body.coverImage !== undefined ? coverImage : existing.cover_image,
        req.body.status !== undefined ? normalizeCompetitionStatus(req.body.status, existing.status) : existing.status,
        id,
      ],
    );

    if (req.body.is_featured !== undefined) {
      if (toBooleanInt(req.body.is_featured)) {
        await setFeaturedCompetition(db, id);
      } else {
        await db.run('UPDATE competitions SET is_featured = 0, updated_at = datetime("now") WHERE id = ?', [id]);
      }
    }

    await createAuditLog(db, req.user?.id, 'competitions', id, 'update', null);
    const row = await getCompetitionById(db, id);
    return res.json(serializeCompetition(row));
  } catch (error) {
    return next(error);
  }
};

const setFeaturedCompetition = async (db, id) => {
  const competition = await getCompetitionById(db, id);
  if (!competition) {
    const error = new Error('Competition not found');
    error.statusCode = 404;
    throw error;
  }

  try {
    await db.exec('BEGIN TRANSACTION');
    await db.run('UPDATE competitions SET is_featured = 0, updated_at = datetime("now") WHERE deleted_at IS NULL');
    await db.run(
      'UPDATE competitions SET is_featured = 1, status = "active", updated_at = datetime("now") WHERE id = ? AND deleted_at IS NULL',
      [id],
    );
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
};

const featureCompetition = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    await setFeaturedCompetition(db, id);
    await createAuditLog(db, req.user?.id, 'competitions', id, 'feature', null);
    const row = await getCompetitionById(db, id);
    return res.json(serializeCompetition(row));
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ error: '比赛不存在' });
    return next(error);
  }
};

const deleteCompetition = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    const existing = await getCompetitionById(db, id);
    if (!existing) return res.status(404).json({ error: '比赛不存在' });

    try {
      await db.exec('BEGIN TRANSACTION');
      await db.run(
        'UPDATE competitions SET deleted_at = datetime("now"), is_featured = 0, updated_at = datetime("now") WHERE id = ?',
        [id],
      );
      await db.run(
        'UPDATE competition_media SET deleted_at = COALESCE(deleted_at, datetime("now")), updated_at = datetime("now") WHERE competition_id = ?',
        [id],
      );
      await db.run(
        'UPDATE competition_works SET deleted_at = COALESCE(deleted_at, datetime("now")), updated_at = datetime("now") WHERE competition_id = ?',
        [id],
      );
      await createAuditLog(db, req.user?.id, 'competitions', id, 'soft_delete', 'Admin soft deleted competition outcome bundle');
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }

    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const buildAdminAssetFilters = (query, tableAlias = '') => {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const clauses = [`${prefix}deleted_at IS NULL`];
  const params = [];

  const competitionId = toInteger(query.competition_id || query.competitionId, 0);
  if (competitionId) {
    clauses.push(`${prefix}competition_id = ?`);
    params.push(competitionId);
  }

  const status = trimText(query.status, 20).toLowerCase();
  if (status && status !== 'all' && REVIEW_STATUSES.has(status)) {
    clauses.push(`${prefix}status = ?`);
    params.push(status);
  }

  return { clauses, params };
};

const listAdminMedia = async (req, res, next) => {
  try {
    const db = await getDb();
    const filters = buildAdminAssetFilters(req.query, 'cm');
    const type = trimText(req.query.type, 40);
    if (type && MEDIA_TYPES.has(type)) {
      filters.clauses.push('cm.type = ?');
      filters.params.push(type);
    }

    const rows = await db.all(
      `SELECT cm.*, c.title AS competition_title, COALESCE(u.nickname, u.username) AS uploader_name
       FROM competition_media cm
       LEFT JOIN competitions c ON c.id = cm.competition_id
       LEFT JOIN users u ON u.id = cm.uploader_id
       WHERE ${filters.clauses.join(' AND ')}
         AND c.deleted_at IS NULL
       ORDER BY cm.created_at DESC, cm.id DESC`,
      filters.params,
    );

    return res.json(rows.map(serializeMedia));
  } catch (error) {
    return next(error);
  }
};

const createAdminMedia = async (req, res, next) => {
  try {
    const db = await getDb();
    const competitionId = toInteger(req.body.competition_id || req.body.competitionId, 0);
    const competition = await getCompetitionById(db, competitionId);
    if (!competition) return res.status(404).json({ error: '比赛不存在' });

    const type = trimText(req.body.type, 40);
    const title = trimText(req.body.title, 140);
    const url = trimText(req.body.url, 1000);
    const coverUrl = nullableText(req.body.cover_url || req.body.coverUrl, 1000);
    const status = normalizeStatus(req.body.status, 'approved');

    if (!MEDIA_TYPES.has(type)) return sendBadRequest(res, '请选择有效的成果类型');
    if (!title) return sendBadRequest(res, '请填写标题');
    if (!isSafeAssetUrl(url, { allowExternal: true })) return sendBadRequest(res, '请填写有效的素材地址或上传文件');
    if (coverUrl && !isSafeAssetUrl(coverUrl, { allowExternal: true })) return sendBadRequest(res, '封面地址无效');

    const reviewedBy = status === 'approved' || status === 'rejected' ? req.user.id : null;
    const reviewedAt = reviewedBy ? new Date().toISOString() : null;
    const result = await db.run(
      `INSERT INTO competition_media (
        competition_id, type, title, description, url, cover_url, sort_order,
        status, uploader_id, reviewed_by, reviewed_at, review_note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        competitionId,
        type,
        title,
        nullableText(req.body.description, 800),
        url,
        coverUrl,
        toInteger(req.body.sort_order, 0),
        status,
        req.user.id,
        reviewedBy,
        reviewedAt,
        nullableText(req.body.review_note || req.body.reason, 500),
      ],
    );

    await createAuditLog(db, req.user?.id, 'competition_media', result.lastID, 'create', null);
    const row = await db.get('SELECT * FROM competition_media WHERE id = ?', [result.lastID]);
    return res.status(201).json(serializeMedia(row));
  } catch (error) {
    return next(error);
  }
};

const updateAdminMedia = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    const existing = await db.get('SELECT * FROM competition_media WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!existing) return res.status(404).json({ error: '素材不存在' });

    const competitionId = req.body.competition_id !== undefined || req.body.competitionId !== undefined
      ? toInteger(req.body.competition_id || req.body.competitionId, existing.competition_id)
      : existing.competition_id;
    const competition = await getCompetitionById(db, competitionId);
    if (!competition) return res.status(404).json({ error: '比赛不存在' });

    const type = req.body.type !== undefined ? trimText(req.body.type, 40) : existing.type;
    const title = req.body.title !== undefined ? trimText(req.body.title, 140) : existing.title;
    const url = req.body.url !== undefined ? trimText(req.body.url, 1000) : existing.url;
    const coverUrl = req.body.cover_url !== undefined || req.body.coverUrl !== undefined
      ? nullableText(req.body.cover_url || req.body.coverUrl, 1000)
      : existing.cover_url;
    const status = req.body.status !== undefined ? normalizeStatus(req.body.status, existing.status) : existing.status;

    if (!MEDIA_TYPES.has(type)) return sendBadRequest(res, '请选择有效的成果类型');
    if (!title) return sendBadRequest(res, '请填写标题');
    if (!isSafeAssetUrl(url, { allowExternal: true })) return sendBadRequest(res, '请填写有效的素材地址或上传文件');
    if (coverUrl && !isSafeAssetUrl(coverUrl, { allowExternal: true })) return sendBadRequest(res, '封面地址无效');

    const reviewedBy = status !== existing.status && (status === 'approved' || status === 'rejected')
      ? req.user.id
      : existing.reviewed_by;
    const reviewedAt = status !== existing.status && (status === 'approved' || status === 'rejected')
      ? new Date().toISOString()
      : existing.reviewed_at;

    await db.run(
      `UPDATE competition_media
       SET competition_id = ?,
           type = ?,
           title = ?,
           description = ?,
           url = ?,
           cover_url = ?,
           sort_order = ?,
           status = ?,
           reviewed_by = ?,
           reviewed_at = ?,
           review_note = ?,
           updated_at = datetime('now')
       WHERE id = ? AND deleted_at IS NULL`,
      [
        competitionId,
        type,
        title,
        req.body.description !== undefined ? nullableText(req.body.description, 800) : existing.description,
        url,
        coverUrl,
        req.body.sort_order !== undefined ? toInteger(req.body.sort_order, 0) : existing.sort_order,
        status,
        reviewedBy,
        reviewedAt,
        req.body.review_note !== undefined || req.body.reason !== undefined
          ? nullableText(req.body.review_note || req.body.reason, 500)
          : existing.review_note,
        id,
      ],
    );

    await createAuditLog(db, req.user?.id, 'competition_media', id, 'update', null);
    const row = await db.get('SELECT * FROM competition_media WHERE id = ?', [id]);
    return res.json(serializeMedia(row));
  } catch (error) {
    return next(error);
  }
};

const deleteAdminMedia = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    const existing = await db.get('SELECT id FROM competition_media WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!existing) return res.status(404).json({ error: '素材不存在' });

    await db.run('UPDATE competition_media SET deleted_at = datetime("now"), updated_at = datetime("now") WHERE id = ?', [id]);
    await createAuditLog(db, req.user?.id, 'competition_media', id, 'soft_delete', null);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const reviewAdminMedia = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    const status = normalizeStatus(req.body.status, '');
    const reason = nullableText(req.body.reason || req.body.review_note, 500);
    if (!REVIEW_STATUSES.has(status)) return sendBadRequest(res, '审核状态无效');

    const existing = await db.get('SELECT * FROM competition_media WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!existing) return res.status(404).json({ error: '素材不存在' });

    await db.run(
      `UPDATE competition_media
       SET status = ?,
           reviewed_by = ?,
           reviewed_at = datetime('now'),
           review_note = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [status, req.user.id, reason, id],
    );

    await createAuditLog(db, req.user?.id, 'competition_media', id, status, reason);
    await notifyReviewResult({ resource: existing, status, reason, adminId: req.user.id, resourceType: 'competition_media' });
    return res.json({ success: true, id, status, reason });
  } catch (error) {
    return next(error);
  }
};

const listAdminWorks = async (req, res, next) => {
  try {
    const db = await getDb();
    const filters = buildAdminAssetFilters(req.query, 'cw');

    const rows = await db.all(
      `SELECT cw.*, c.title AS competition_title, COALESCE(u.nickname, u.username) AS uploader_name
       FROM competition_works cw
       LEFT JOIN competitions c ON c.id = cw.competition_id
       LEFT JOIN users u ON u.id = cw.uploader_id
       WHERE ${filters.clauses.join(' AND ')}
         AND c.deleted_at IS NULL
       ORDER BY cw.created_at DESC, cw.id DESC`,
      filters.params,
    );

    return res.json(rows.map(serializeWork));
  } catch (error) {
    return next(error);
  }
};

const createAdminWork = async (req, res, next) => {
  try {
    const db = await getDb();
    const competitionId = toInteger(req.body.competition_id || req.body.competitionId, 0);
    const competition = await getCompetitionById(db, competitionId);
    if (!competition) return res.status(404).json({ error: '比赛不存在' });

    const title = trimText(req.body.title, 140);
    const author = trimText(req.body.author, 140);
    const summary = trimText(req.body.summary, 1200);
    const gitUrl = nullableText(req.body.git_url || req.body.gitUrl, 1000);
    const coverUrl = nullableText(req.body.cover_url || req.body.coverUrl, 1000);
    const status = normalizeStatus(req.body.status, 'approved');
    const story = extractWorkStoryFields(req.body, { allowExternalStoryFile: true });

    if (!title) return sendBadRequest(res, '请填写作品名称');
    if (!author) return sendBadRequest(res, '请填写作者');
    if (!summary) return sendBadRequest(res, '请填写作品简介');
    if (!gitUrl || !isHttpUrl(gitUrl)) return sendBadRequest(res, '请填写有效的 Git 链接');
    if (coverUrl && !isSafeAssetUrl(coverUrl, { allowExternal: true })) return sendBadRequest(res, '封面地址无效');

    const reviewedBy = status === 'approved' || status === 'rejected' ? req.user.id : null;
    const reviewedAt = reviewedBy ? new Date().toISOString() : null;
    const result = await db.run(
      `INSERT INTO competition_works (
        competition_id, title, author, summary, git_url, award, rank, cover_url,
        honor_title, grade, major, highlight, experience, story_file_url, public_consent,
        sort_order, status, uploader_id, reviewed_by, reviewed_at, review_note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        competitionId,
        title,
        author,
        summary,
        gitUrl,
        nullableText(req.body.award, 140),
        nullableText(req.body.rank, 40),
        coverUrl,
        story.honorTitle,
        story.grade,
        story.major,
        story.highlight,
        story.experience,
        story.storyFileUrl,
        story.publicConsent,
        toInteger(req.body.sort_order, 0),
        status,
        req.user.id,
        reviewedBy,
        reviewedAt,
        nullableText(req.body.review_note || req.body.reason, 500),
      ],
    );

    await createAuditLog(db, req.user?.id, 'competition_works', result.lastID, 'create', null);
    const row = await db.get('SELECT * FROM competition_works WHERE id = ?', [result.lastID]);
    return res.status(201).json(serializeWork(row));
  } catch (error) {
    return next(error);
  }
};

const updateAdminWork = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    const existing = await db.get('SELECT * FROM competition_works WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!existing) return res.status(404).json({ error: '作品不存在' });

    const competitionId = req.body.competition_id !== undefined || req.body.competitionId !== undefined
      ? toInteger(req.body.competition_id || req.body.competitionId, existing.competition_id)
      : existing.competition_id;
    const competition = await getCompetitionById(db, competitionId);
    if (!competition) return res.status(404).json({ error: '比赛不存在' });

    const title = req.body.title !== undefined ? trimText(req.body.title, 140) : existing.title;
    const author = req.body.author !== undefined ? trimText(req.body.author, 140) : existing.author;
    const summary = req.body.summary !== undefined ? trimText(req.body.summary, 1200) : existing.summary;
    const gitUrl = req.body.git_url !== undefined || req.body.gitUrl !== undefined
      ? nullableText(req.body.git_url || req.body.gitUrl, 1000)
      : existing.git_url;
    const coverUrl = req.body.cover_url !== undefined || req.body.coverUrl !== undefined
      ? nullableText(req.body.cover_url || req.body.coverUrl, 1000)
      : existing.cover_url;
    const status = req.body.status !== undefined ? normalizeStatus(req.body.status, existing.status) : existing.status;
    const story = extractWorkStoryFields(req.body, { allowExternalStoryFile: true });

    if (!title) return sendBadRequest(res, '请填写作品名称');
    if (!author) return sendBadRequest(res, '请填写作者');
    if (!summary) return sendBadRequest(res, '请填写作品简介');
    if (!gitUrl || !isHttpUrl(gitUrl)) return sendBadRequest(res, '请填写有效的 Git 链接');
    if (coverUrl && !isSafeAssetUrl(coverUrl, { allowExternal: true })) return sendBadRequest(res, '封面地址无效');

    const reviewedBy = status !== existing.status && (status === 'approved' || status === 'rejected')
      ? req.user.id
      : existing.reviewed_by;
    const reviewedAt = status !== existing.status && (status === 'approved' || status === 'rejected')
      ? new Date().toISOString()
      : existing.reviewed_at;

    await db.run(
      `UPDATE competition_works
       SET competition_id = ?,
           title = ?,
           author = ?,
           summary = ?,
           git_url = ?,
           award = ?,
           rank = ?,
           cover_url = ?,
           honor_title = ?,
           grade = ?,
           major = ?,
           highlight = ?,
           experience = ?,
           story_file_url = ?,
           public_consent = ?,
           sort_order = ?,
           status = ?,
           reviewed_by = ?,
           reviewed_at = ?,
           review_note = ?,
           updated_at = datetime('now')
       WHERE id = ? AND deleted_at IS NULL`,
      [
        competitionId,
        title,
        author,
        summary,
        gitUrl,
        req.body.award !== undefined ? nullableText(req.body.award, 140) : existing.award,
        req.body.rank !== undefined ? nullableText(req.body.rank, 40) : existing.rank,
        coverUrl,
        req.body.honor_title !== undefined || req.body.honorTitle !== undefined ? story.honorTitle : existing.honor_title,
        req.body.grade !== undefined ? story.grade : existing.grade,
        req.body.major !== undefined ? story.major : existing.major,
        req.body.highlight !== undefined ? story.highlight : existing.highlight,
        req.body.experience !== undefined ? story.experience : existing.experience,
        req.body.story_file_url !== undefined || req.body.storyFileUrl !== undefined ? story.storyFileUrl : existing.story_file_url,
        req.body.public_consent !== undefined || req.body.publicConsent !== undefined ? story.publicConsent : existing.public_consent,
        req.body.sort_order !== undefined ? toInteger(req.body.sort_order, 0) : existing.sort_order,
        status,
        reviewedBy,
        reviewedAt,
        req.body.review_note !== undefined || req.body.reason !== undefined
          ? nullableText(req.body.review_note || req.body.reason, 500)
          : existing.review_note,
        id,
      ],
    );

    await createAuditLog(db, req.user?.id, 'competition_works', id, 'update', null);
    const row = await db.get('SELECT * FROM competition_works WHERE id = ?', [id]);
    return res.json(serializeWork(row));
  } catch (error) {
    return next(error);
  }
};

const deleteAdminWork = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    const existing = await db.get('SELECT id FROM competition_works WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!existing) return res.status(404).json({ error: '作品不存在' });

    await db.run('UPDATE competition_works SET deleted_at = datetime("now"), updated_at = datetime("now") WHERE id = ?', [id]);
    await createAuditLog(db, req.user?.id, 'competition_works', id, 'soft_delete', null);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const reviewAdminWork = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    const status = normalizeStatus(req.body.status, '');
    const reason = nullableText(req.body.reason || req.body.review_note, 500);
    if (!REVIEW_STATUSES.has(status)) return sendBadRequest(res, '审核状态无效');

    const existing = await db.get('SELECT * FROM competition_works WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!existing) return res.status(404).json({ error: '作品不存在' });

    await db.run(
      `UPDATE competition_works
       SET status = ?,
           reviewed_by = ?,
           reviewed_at = datetime('now'),
           review_note = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [status, req.user.id, reason, id],
    );

    await createAuditLog(db, req.user?.id, 'competition_works', id, status, reason);
    await notifyReviewResult({ resource: existing, status, reason, adminId: req.user.id, resourceType: 'competition_works' });
    return res.json({ success: true, id, status, reason });
  } catch (error) {
    return next(error);
  }
};

const listPendingCompetitionItems = async (db) => {
  const workRows = await db.all(`
    SELECT cw.*, c.title AS competition_title, COALESCE(u.nickname, u.username) AS uploader_name
    FROM competition_works cw
    LEFT JOIN competitions c ON c.id = cw.competition_id
    LEFT JOIN users u ON u.id = cw.uploader_id
    WHERE cw.status = 'pending'
      AND cw.deleted_at IS NULL
      AND c.deleted_at IS NULL
    ORDER BY cw.created_at DESC, cw.id DESC
  `);

  const works = workRows.map((row) => ({
    ...row,
    type: 'competition_works',
    resource_type: 'competition_works',
    title: row.title,
    description: row.summary,
    preview_image: row.cover_url,
    category: row.award || '优秀作品',
    tags: [row.competition_title, row.author].filter(Boolean).join(', '),
  }));

  return works.sort((left, right) => {
    const leftTime = new Date(left.created_at || 0).getTime();
    const rightTime = new Date(right.created_at || 0).getTime();
    if (rightTime !== leftTime) return rightTime - leftTime;
    return right.id - left.id;
  });
};

module.exports = {
  getCurrentOutcome,
  submitCurrentMedia,
  submitCurrentWork,
  listCompetitions,
  createCompetition,
  updateCompetition,
  featureCompetition,
  deleteCompetition,
  listAdminMedia,
  createAdminMedia,
  updateAdminMedia,
  deleteAdminMedia,
  reviewAdminMedia,
  listAdminWorks,
  createAdminWork,
  updateAdminWork,
  deleteAdminWork,
  reviewAdminWork,
  listPendingCompetitionItems,
};
