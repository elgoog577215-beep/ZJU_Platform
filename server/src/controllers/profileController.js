const { getDb } = require('../config/db');
const profileService = require('../services/profileService');

const toInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeFeedType = (value) => {
  const type = String(value || 'all').trim().toLowerCase();
  return ['all', 'events', 'articles', 'news', 'media', 'posts'].includes(type) ? type : 'all';
};

const PROFILE_STATUSES = new Set(['active', 'inactive', 'archived']);
const PROFILE_MEMBER_ROLES = new Set(['owner', 'admin', 'editor']);

const normalizeHandle = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

const normalizeAdminAliases = (aliases) => {
  if (!Array.isArray(aliases)) return null;
  return aliases
    .map((item) => {
      if (typeof item === 'string') {
        return { alias: item, purpose: 'search' };
      }
      return {
        alias: item?.alias,
        purpose: item?.purpose || 'search',
      };
    })
    .filter((item) => String(item.alias || '').trim());
};

const normalizeAdminProfilePayload = (body = {}, existing = {}) => {
  const requestedType = String(body.type || existing.type || 'organization').trim().toLowerCase();
  if (!profileService.PROFILE_TYPES.has(requestedType)) {
    const error = new Error('Invalid profile type');
    error.status = 400;
    throw error;
  }

  const handle = normalizeHandle(body.handle || existing.handle);
  if (handle.length < 2) {
    const error = new Error('Profile handle is required');
    error.status = 400;
    throw error;
  }

  const displayName = String(body.display_name || body.name || existing.display_name || '').trim().slice(0, 120);
  if (!displayName) {
    const error = new Error('Profile display name is required');
    error.status = 400;
    throw error;
  }

  const requestedStatus = String(body.status || existing.status || 'active').trim().toLowerCase();
  const status = PROFILE_STATUSES.has(requestedStatus) ? requestedStatus : 'active';

  return {
    type: requestedType,
    handle,
    display_name: displayName,
    display_name_en: String(body.display_name_en ?? body.name_en ?? existing.display_name_en ?? '').trim().slice(0, 160) || null,
    avatar_url: String(body.avatar_url ?? existing.avatar_url ?? '').trim().slice(0, 1000) || null,
    logo_url: String(body.logo_url ?? existing.logo_url ?? '').trim().slice(0, 1000) || null,
    cover_url: String(body.cover_url ?? existing.cover_url ?? '').trim().slice(0, 1000) || null,
    bio: String(body.bio ?? existing.bio ?? '').trim().slice(0, 500) || null,
    description: String(body.description ?? existing.description ?? '').trim().slice(0, 1200) || null,
    description_en: String(body.description_en ?? existing.description_en ?? '').trim().slice(0, 1200) || null,
    cooperation_direction: String(body.cooperation_direction ?? existing.cooperation_direction ?? '').trim().slice(0, 500) || null,
    cooperation_direction_en: String(body.cooperation_direction_en ?? existing.cooperation_direction_en ?? '').trim().slice(0, 500) || null,
    link_url: String(body.link_url ?? existing.link_url ?? '').trim().slice(0, 1000) || null,
    verified: body.verified !== undefined ? (body.verified ? 1 : 0) : (existing.verified ? 1 : 0),
    status,
  };
};

const isSafeProfileUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return true;
  if (url.includes('..')) return false;
  if (url.startsWith('/uploads/') || url.startsWith('/images/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const normalizeEditableProfilePayload = (body = {}, existing = {}) => {
  const displayName = String(body.display_name ?? body.name ?? existing.display_name ?? '').trim().slice(0, 120);
  if (!displayName) {
    const error = new Error('Profile display name is required');
    error.status = 400;
    throw error;
  }

  const payload = {
    display_name: displayName,
    display_name_en: String(body.display_name_en ?? existing.display_name_en ?? '').trim().slice(0, 160) || null,
    avatar_url: String(body.avatar_url ?? existing.avatar_url ?? '').trim().slice(0, 1000) || null,
    logo_url: String(body.logo_url ?? existing.logo_url ?? '').trim().slice(0, 1000) || null,
    cover_url: String(body.cover_url ?? existing.cover_url ?? '').trim().slice(0, 1000) || null,
    bio: String(body.bio ?? existing.bio ?? '').trim().slice(0, 500) || null,
    description: String(body.description ?? existing.description ?? '').trim().slice(0, 1200) || null,
    description_en: String(body.description_en ?? existing.description_en ?? '').trim().slice(0, 1200) || null,
    cooperation_direction: String(body.cooperation_direction ?? existing.cooperation_direction ?? '').trim().slice(0, 500) || null,
    cooperation_direction_en: String(body.cooperation_direction_en ?? existing.cooperation_direction_en ?? '').trim().slice(0, 500) || null,
    link_url: String(body.link_url ?? existing.link_url ?? '').trim().slice(0, 1000) || null,
  };

  for (const field of ['avatar_url', 'logo_url', 'cover_url', 'link_url']) {
    if (!isSafeProfileUrl(payload[field])) {
      const error = new Error(`${field} is invalid`);
      error.status = 400;
      throw error;
    }
  }

  if (existing.type === 'person') {
    payload.logo_url = null;
    payload.cooperation_direction = null;
    payload.cooperation_direction_en = null;
  }

  return payload;
};

const canEditProfileDetails = async (db, user, profile) => {
  if (!user?.id || !profile?.id) return false;
  if (user.role === 'admin') return true;
  if (profile.owner_user_id && String(profile.owner_user_id) === String(user.id)) return true;
  const membership = await db.get(
    `SELECT id FROM profile_members
     WHERE profile_id = ?
       AND user_id = ?
       AND status = 'active'
       AND role IN ('owner', 'admin')
     LIMIT 1`,
    [profile.id, user.id],
  );
  return Boolean(membership);
};

const pickCover = (row, type) => {
  if (type === 'photo') return row.url || row.cover || '';
  if (type === 'video') return row.thumbnail || row.cover || '';
  if (type === 'music') return row.cover || '';
  if (type === 'event') return row.image || row.cover || '';
  return row.cover || row.image || row.thumbnail || '';
};

const feedItem = (row, type, extra = {}) => ({
  id: row.id,
  type,
  title: row.title || row.name || 'Untitled',
  excerpt: row.excerpt || row.description || row.content || '',
  cover: pickCover(row, type),
  date: row.date || row.created_at || row.updated_at || '',
  created_at: row.created_at || '',
  status: row.status || '',
  url: row.url || row.link || row.source_url || '',
  likes: Number(row.likes || 0),
  views: Number(row.views || 0),
  category: row.category || row.section || row.type_section || '',
  organizer: row.organizer || '',
  publisher_profile_id: row.publisher_profile_id || null,
  organizer_profile_id: row.organizer_profile_id || null,
  ...extra,
});

const loadProfileWithAliases = async (db, handle) => {
  const profile = await profileService.findProfileByHandle(db, handle);
  if (!profile || profile.status !== 'active') return null;
  const aliases = await profileService.listAliases(db, profile.id);
  return profileService.serializeProfile(profile, aliases);
};

const listProfiles = async (req, res, next) => {
  try {
    const db = await getDb();
    const type = profileService.normalizeProfileType(req.query.type, '');
    const q = String(req.query.q || req.query.search || '').trim();
    const limit = Math.min(Math.max(toInteger(req.query.limit, 48), 1), 100);
    const clauses = ['p.deleted_at IS NULL', "p.status = 'active'"];
    const params = [];

    if (type) {
      clauses.push('p.type = ?');
      params.push(type);
    }
    if (q) {
      const term = `%${q.toLowerCase()}%`;
      clauses.push(`(
        lower(p.display_name) LIKE ?
        OR lower(COALESCE(p.display_name_en, '')) LIKE ?
        OR lower(COALESCE(p.description, '')) LIKE ?
        OR EXISTS (
          SELECT 1 FROM profile_aliases pa
          WHERE pa.profile_id = p.id
            AND pa.normalized_alias LIKE ?
        )
      )`);
      params.push(term, term, term, term);
    }

    const rows = await db.all(
      `SELECT p.*
       FROM profiles p
       WHERE ${clauses.join(' AND ')}
       ORDER BY
         CASE p.type WHEN 'person' THEN 1 WHEN 'club' THEN 2 WHEN 'organization' THEN 3 WHEN 'school' THEN 4 WHEN 'enterprise' THEN 5 ELSE 9 END,
         p.verified DESC,
         p.display_name ASC
       LIMIT ?`,
      [...params, limit],
    );

    return res.json(rows.map((row) => profileService.serializeProfile(row)));
  } catch (error) {
    return next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const db = await getDb();
    const profile = await loadProfileWithAliases(db, req.params.handle);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    let memberRole = null;
    if (req.user?.id) {
      if (profile.owner_user_id && String(profile.owner_user_id) === String(req.user.id)) {
        memberRole = 'owner';
      } else {
        const membership = await db.get(
          `SELECT role FROM profile_members
           WHERE profile_id = ?
             AND user_id = ?
             AND status = 'active'
           LIMIT 1`,
          [profile.id, req.user.id],
        );
        memberRole = membership?.role || null;
      }
    }

    const [publishedCount, eventCount] = await Promise.all([
      db.get(
        `SELECT
          (SELECT COUNT(*) FROM photos WHERE publisher_profile_id = ? AND status = 'approved' AND deleted_at IS NULL)
        + (SELECT COUNT(*) FROM music WHERE publisher_profile_id = ? AND status = 'approved' AND deleted_at IS NULL)
        + (SELECT COUNT(*) FROM videos WHERE publisher_profile_id = ? AND status = 'approved' AND deleted_at IS NULL)
        + (SELECT COUNT(*) FROM articles WHERE publisher_profile_id = ? AND status = 'approved' AND deleted_at IS NULL)
        + (SELECT COUNT(*) FROM news WHERE publisher_profile_id = ? AND status = 'approved' AND deleted_at IS NULL)
        + (SELECT COUNT(*) FROM community_posts WHERE publisher_profile_id = ? AND status = 'approved')
        AS count`,
        [profile.id, profile.id, profile.id, profile.id, profile.id, profile.id],
      ),
      db.get(
        `SELECT COUNT(*) AS count
         FROM events
         WHERE (publisher_profile_id = ? OR organizer_profile_id = ?)
           AND status = 'approved'
           AND deleted_at IS NULL`,
        [profile.id, profile.id],
      ),
    ]);

    return res.json({
      ...profile,
      member_role: memberRole,
      stats: {
        published_count: publishedCount?.count || 0,
        event_count: eventCount?.count || 0,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const loadAliasesForSql = async (db, profileId) => {
  const aliases = await profileService.listAliases(db, profileId);
  return profileService.uniqueTextArray(
    aliases
      .filter((item) => item.purpose === 'organizer_match' || item.purpose === 'search')
      .map((item) => item.alias),
    20,
    160,
  );
};

const getProfileFeed = async (req, res, next) => {
  try {
    const db = await getDb();
    const profile = await profileService.findProfileByHandle(db, req.params.handle);
    if (!profile || profile.status !== 'active') {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const type = normalizeFeedType(req.query.type);
    const page = Math.max(toInteger(req.query.page, 1), 1);
    const limit = Math.min(Math.max(toInteger(req.query.limit, 24), 1), 60);
    const offset = (page - 1) * limit;
    const perSourceLimit = offset + limit;
    const items = [];
    let total = 0;

    if (type === 'all' || type === 'events') {
      const aliases = await loadAliasesForSql(db, profile.id);
      const aliasClause = aliases.length
        ? ` OR organizer IN (${aliases.map(() => '?').join(',')})`
        : '';
      const countRow = await db.get(
        `SELECT COUNT(DISTINCT id) AS count
         FROM events
         WHERE status = 'approved'
           AND deleted_at IS NULL
           AND (
             publisher_profile_id = ?
             OR organizer_profile_id = ?
             ${aliasClause}
           )`,
        [profile.id, profile.id, ...aliases],
      );
      total += countRow?.count || 0;
      const rows = await db.all(
        `SELECT *
         FROM events
         WHERE status = 'approved'
           AND deleted_at IS NULL
           AND (
             publisher_profile_id = ?
             OR organizer_profile_id = ?
             ${aliasClause}
           )
         ORDER BY COALESCE(date, created_at) DESC, id DESC
         LIMIT ?`,
        [profile.id, profile.id, ...aliases, perSourceLimit],
      );
      rows.forEach((row) => items.push(feedItem(row, 'event', {
        relation: row.publisher_profile_id === profile.id ? 'published' : 'organized',
      })));
    }

    if (type === 'all' || type === 'articles') {
      const countRow = await db.get(
        `SELECT COUNT(*) AS count
         FROM articles
         WHERE publisher_profile_id = ?
           AND status = 'approved'
           AND deleted_at IS NULL`,
        [profile.id],
      );
      total += countRow?.count || 0;
      const rows = await db.all(
        `SELECT *
         FROM articles
         WHERE publisher_profile_id = ?
           AND status = 'approved'
           AND deleted_at IS NULL
         ORDER BY COALESCE(date, created_at) DESC, id DESC
         LIMIT ?`,
        [profile.id, perSourceLimit],
      );
      rows.forEach((row) => items.push(feedItem(row, 'article')));
    }

    if (type === 'all' || type === 'news') {
      const countRow = await db.get(
        `SELECT COUNT(*) AS count
         FROM news
         WHERE publisher_profile_id = ?
           AND status = 'approved'
           AND deleted_at IS NULL`,
        [profile.id],
      );
      total += countRow?.count || 0;
      const rows = await db.all(
        `SELECT *
         FROM news
         WHERE publisher_profile_id = ?
           AND status = 'approved'
           AND deleted_at IS NULL
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
        [profile.id, perSourceLimit],
      );
      rows.forEach((row) => items.push(feedItem(row, 'news')));
    }

    if (type === 'all' || type === 'media') {
      const sources = [
        { table: 'photos', type: 'photo' },
        { table: 'videos', type: 'video' },
        { table: 'music', type: 'music' },
      ];
      for (const source of sources) {
        const countRow = await db.get(
          `SELECT COUNT(*) AS count
           FROM ${source.table}
           WHERE publisher_profile_id = ?
             AND status = 'approved'
             AND deleted_at IS NULL`,
          [profile.id],
        );
        total += countRow?.count || 0;
        const rows = await db.all(
          `SELECT *
           FROM ${source.table}
           WHERE publisher_profile_id = ?
             AND status = 'approved'
             AND deleted_at IS NULL
           ORDER BY created_at DESC, id DESC
           LIMIT ?`,
          [profile.id, perSourceLimit],
        );
        rows.forEach((row) => items.push(feedItem(row, source.type)));
      }
    }

    if (type === 'all' || type === 'posts') {
      const countRow = await db.get(
        `SELECT COUNT(*) AS count
         FROM community_posts
         WHERE publisher_profile_id = ?
           AND status = 'approved'`,
        [profile.id],
      );
      total += countRow?.count || 0;
      const rows = await db.all(
        `SELECT *
         FROM community_posts
         WHERE publisher_profile_id = ?
           AND status = 'approved'
         ORDER BY created_at DESC, id DESC
         LIMIT ?`,
        [profile.id, perSourceLimit],
      );
      rows.forEach((row) => items.push(feedItem(row, row.section || 'post')));
    }

    const sorted = items
      .sort((left, right) => new Date(right.date || right.created_at || 0) - new Date(left.date || left.created_at || 0))
      .slice(offset, offset + limit);

    return res.json({
      data: sorted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const listOwnProfiles = async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await profileService.listManageableProfiles(db, req.user?.id);
    return res.json(rows.map((row) => profileService.serializeProfile(row)));
  } catch (error) {
    return next(error);
  }
};

const updateOwnProfile = async (req, res, next) => {
  try {
    const db = await getDb();
    const existing = await profileService.findProfileByHandle(db, req.params.handle);
    if (!existing || existing.status !== 'active') {
      return res.status(404).json({ error: 'Profile not found' });
    }
    if (!(await canEditProfileDetails(db, req.user, existing))) {
      return res.status(403).json({ error: 'You do not have permission to edit this profile' });
    }

    const payload = normalizeEditableProfilePayload(req.body, existing);
    await db.run(
      `UPDATE profiles
       SET display_name = ?,
           display_name_en = ?,
           avatar_url = ?,
           logo_url = ?,
           cover_url = ?,
           bio = ?,
           description = ?,
           description_en = ?,
           cooperation_direction = ?,
           cooperation_direction_en = ?,
           link_url = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        payload.display_name,
        payload.display_name_en,
        payload.avatar_url,
        payload.logo_url,
        payload.cover_url,
        payload.bio,
        payload.description,
        payload.description_en,
        payload.cooperation_direction,
        payload.cooperation_direction_en,
        payload.link_url,
        existing.id,
      ],
    );

    if (existing.type === 'person' && existing.owner_user_id) {
      await db.run(
        `UPDATE users
         SET nickname = ?,
             avatar = COALESCE(?, avatar)
         WHERE id = ?`,
        [payload.display_name, payload.avatar_url || null, existing.owner_user_id],
      );
      await profileService.addProfileAlias(db, existing.id, payload.display_name, 'search');
    }

    const updated = await profileService.findProfileById(db, existing.id);
    const aliases = await profileService.listAliases(db, existing.id);
    await syncEcosystemPartnerFromProfile(db, updated, {
      ...updated,
      ...payload,
      type: updated.type,
      status: updated.status,
      verified: updated.verified,
    }, aliases);
    return res.json(profileService.serializeProfile(updated, aliases));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.code === 'SQLITE_CONSTRAINT' || /UNIQUE constraint failed/i.test(error.message || '')) {
      return res.status(409).json({ error: 'Display name is already used' });
    }
    return next(error);
  }
};

const listAdminProfiles = async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT p.*
       FROM profiles p
       WHERE p.deleted_at IS NULL
       ORDER BY p.updated_at DESC, p.id DESC
       LIMIT 200`,
    );
    const profiles = await Promise.all(
      rows.map(async (row) => profileService.serializeProfile(row, await profileService.listAliases(db, row.id))),
    );
    return res.json(profiles);
  } catch (error) {
    return next(error);
  }
};

const syncEcosystemPartnerFromProfile = async (db, profile, payload, aliases) => {
  if (profile.source_type !== 'ecosystem_partner' || !profile.source_id) return;
  const category = payload.type === 'school'
    ? 'school'
    : (payload.type === 'enterprise' ? 'enterprise' : 'organization');
  const visible = payload.status === 'active' ? 1 : 0;
  const aliasTexts = profileService.uniqueTextArray(
    (aliases || []).map((item) => item.alias).filter(Boolean),
    50,
    160,
  );
  await db.run(
    `UPDATE ecosystem_partners
     SET category = ?,
         name = ?,
         name_en = ?,
         description = ?,
         description_en = ?,
         cooperation_direction = ?,
         cooperation_direction_en = ?,
         event_organizer_aliases = ?,
         logo_url = ?,
         dark_logo_url = COALESCE(dark_logo_url, ?),
         link_url = ?,
         enabled = ?,
         featured = ?,
         profile_id = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      category,
      payload.display_name,
      payload.display_name_en,
      payload.description,
      payload.description_en,
      payload.cooperation_direction,
      payload.cooperation_direction_en,
      JSON.stringify(aliasTexts),
      payload.logo_url,
      payload.logo_url,
      payload.link_url,
      visible,
      visible,
      profile.id,
      profile.source_id,
    ],
  );
};

const updateAdminProfile = async (req, res, next) => {
  try {
    const db = await getDb();
    const id = toInteger(req.params.id, 0);
    const existing = await profileService.findProfileById(db, id);
    if (!existing) return res.status(404).json({ error: 'Profile not found' });

    const payload = normalizeAdminProfilePayload(req.body, existing);
    const duplicate = await db.get(
      `SELECT id FROM profiles WHERE handle = ? AND id != ? AND deleted_at IS NULL LIMIT 1`,
      [payload.handle, id],
    );
    if (duplicate) {
      return res.status(409).json({ error: 'Profile handle already exists' });
    }

    await db.run(
      `UPDATE profiles
       SET type = ?,
           handle = ?,
           display_name = ?,
           display_name_en = ?,
           avatar_url = ?,
           logo_url = ?,
           cover_url = ?,
           bio = ?,
           description = ?,
           description_en = ?,
           cooperation_direction = ?,
           cooperation_direction_en = ?,
           link_url = ?,
           verified = ?,
           status = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        payload.type,
        payload.handle,
        payload.display_name,
        payload.display_name_en,
        payload.avatar_url,
        payload.logo_url,
        payload.cover_url,
        payload.bio,
        payload.description,
        payload.description_en,
        payload.cooperation_direction,
        payload.cooperation_direction_en,
        payload.link_url,
        payload.verified,
        payload.status,
        id,
      ],
    );

    const aliases = normalizeAdminAliases(req.body.aliases);
    if (aliases) {
      await db.run(`DELETE FROM profile_aliases WHERE profile_id = ?`, [id]);
      for (const item of aliases) {
        await profileService.addProfileAlias(db, id, item.alias, item.purpose);
      }
    }

    if (req.body.members && Array.isArray(req.body.members)) {
      for (const member of req.body.members) {
        const userId = toInteger(member.user_id, 0);
        const role = PROFILE_MEMBER_ROLES.has(member.role) ? member.role : 'editor';
        const status = member.status === 'inactive' ? 'inactive' : 'active';
        if (!userId) continue;
        await db.run(
          `INSERT INTO profile_members (profile_id, user_id, role, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
           ON CONFLICT(profile_id, user_id) DO UPDATE SET
             role = excluded.role,
             status = excluded.status,
             updated_at = datetime('now')`,
          [id, userId, role, status],
        );
      }
    }

    const updated = await profileService.findProfileById(db, id);
    const nextAliases = await profileService.listAliases(db, id);
    await syncEcosystemPartnerFromProfile(db, updated, payload, aliases || nextAliases);
    return res.json(profileService.serializeProfile(updated, nextAliases));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
};

const listAdminProfileMembers = async (req, res, next) => {
  try {
    const db = await getDb();
    const profileId = toInteger(req.params.id, 0);
    const profile = await profileService.findProfileById(db, profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const rows = await db.all(
      `SELECT pm.*, u.username, u.nickname, u.avatar
       FROM profile_members pm
       LEFT JOIN users u ON u.id = pm.user_id
       WHERE pm.profile_id = ?
       ORDER BY CASE pm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, pm.id ASC`,
      [profileId],
    );
    return res.json(rows.map((row) => ({
      id: row.id,
      profile_id: row.profile_id,
      user_id: row.user_id,
      role: row.role,
      status: row.status,
      username: row.username || '',
      nickname: row.nickname || '',
      avatar: row.avatar || '',
      created_at: row.created_at,
      updated_at: row.updated_at,
    })));
  } catch (error) {
    return next(error);
  }
};

const upsertAdminProfileMember = async (req, res, next) => {
  try {
    const db = await getDb();
    const profileId = toInteger(req.params.id, 0);
    const userId = toInteger(req.params.userId || req.body.user_id, 0);
    const profile = await profileService.findProfileById(db, profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    if (!userId) return res.status(400).json({ error: 'User id is required' });

    const user = await db.get(`SELECT id FROM users WHERE id = ?`, [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const role = PROFILE_MEMBER_ROLES.has(req.body.role) ? req.body.role : 'editor';
    const status = req.body.status === 'inactive' ? 'inactive' : 'active';

    await db.run(
      `INSERT INTO profile_members (profile_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(profile_id, user_id) DO UPDATE SET
         role = excluded.role,
         status = excluded.status,
         updated_at = datetime('now')`,
      [profileId, userId, role, status],
    );
    return res.json({ profile_id: profileId, user_id: userId, role, status });
  } catch (error) {
    return next(error);
  }
};

const deleteAdminProfileMember = async (req, res, next) => {
  try {
    const db = await getDb();
    const profileId = toInteger(req.params.id, 0);
    const userId = toInteger(req.params.userId, 0);
    const profile = await profileService.findProfileById(db, profileId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    await db.run(
      `DELETE FROM profile_members WHERE profile_id = ? AND user_id = ?`,
      [profileId, userId],
    );
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  deleteAdminProfileMember,
  getProfile,
  getProfileFeed,
  listAdminProfiles,
  listAdminProfileMembers,
  listOwnProfiles,
  listProfiles,
  updateAdminProfile,
  updateOwnProfile,
  upsertAdminProfileMember,
};
