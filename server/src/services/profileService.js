const crypto = require('crypto');

const PROFILE_TYPES = new Set(['person', 'club', 'school', 'enterprise', 'organization']);
const ORG_PROFILE_TYPES = new Set(['club', 'school', 'enterprise', 'organization']);

const CONTENT_TABLES = [
  { table: 'photos', ownerColumn: 'uploader_id' },
  { table: 'music', ownerColumn: 'uploader_id' },
  { table: 'videos', ownerColumn: 'uploader_id' },
  { table: 'articles', ownerColumn: 'uploader_id' },
  { table: 'events', ownerColumn: 'uploader_id' },
  { table: 'news', ownerColumn: 'uploader_id' },
  { table: 'community_posts', ownerColumn: 'author_id' },
];

const normalizeProfileType = (value, fallback = 'organization') => {
  const type = String(value || '').trim().toLowerCase();
  if (type === 'partner' || type === 'other_org') return 'organization';
  return PROFILE_TYPES.has(type) ? type : fallback;
};

const profileTypeForPartnerCategory = (category) => {
  const normalized = String(category || '').trim().toLowerCase();
  if (normalized === 'school') return 'school';
  if (normalized === 'enterprise') return 'enterprise';
  return 'organization';
};

const trimText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, maxLength);
};

const nullableText = (value, maxLength = 500) => {
  const text = trimText(value, maxLength);
  return text || null;
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return text.split(/[\n,]/);
  }
  return [];
};

const uniqueTextArray = (items = [], maxItems = 50, maxLength = 160) => {
  const seen = new Set();
  const next = [];
  for (const item of items) {
    const text = trimText(item, maxLength);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    next.push(text);
    if (next.length >= maxItems) break;
  }
  return next;
};

const normalizeAlias = (value) => trimText(value, 160).toLowerCase();

const slugifyHandlePart = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);

const hashText = (value) => crypto
  .createHash('sha1')
  .update(String(value || ''))
  .digest('hex')
  .slice(0, 8);

const addProfileAlias = async (db, profileId, alias, purpose = 'search') => {
  const text = trimText(alias, 160);
  if (!profileId || !text) return;
  await db.run(
    `INSERT OR IGNORE INTO profile_aliases
      (profile_id, alias, normalized_alias, purpose, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [profileId, text, normalizeAlias(text), purpose],
  );
};

const ensurePersonalProfileForUser = async (db, user) => {
  if (!user?.id) return null;
  const handle = `user-${user.id}`;
  const displayName = trimText(user.nickname || user.username || `User ${user.id}`, 120);

  await db.run(
    `INSERT OR IGNORE INTO profiles (
      type, handle, display_name, avatar_url, owner_user_id,
      source_type, source_id, verified, status, created_at, updated_at
    ) VALUES ('person', ?, ?, ?, ?, 'user', ?, 1, 'active', datetime('now'), datetime('now'))`,
    [handle, displayName, user.avatar || null, user.id, user.id],
  );

  await db.run(
    `UPDATE profiles
     SET display_name = ?,
         avatar_url = COALESCE(?, avatar_url),
         owner_user_id = ?,
         status = COALESCE(status, 'active'),
         updated_at = datetime('now')
     WHERE source_type = 'user' AND source_id = ?`,
    [displayName, user.avatar || null, user.id, user.id],
  );

  const profile = await db.get(
    `SELECT * FROM profiles WHERE source_type = 'user' AND source_id = ? LIMIT 1`,
    [user.id],
  );

  if (profile?.id) {
    await db.run(
      `INSERT OR IGNORE INTO profile_members
        (profile_id, user_id, role, status, created_at, updated_at)
       VALUES (?, ?, 'owner', 'active', datetime('now'), datetime('now'))`,
      [profile.id, user.id],
    );
    await addProfileAlias(db, profile.id, user.username, 'search');
    await addProfileAlias(db, profile.id, user.nickname, 'search');
    await addProfileAlias(db, profile.id, user.organization_cr, 'search');
  }

  return profile;
};

const ensurePersonalProfiles = async (db) => {
  const users = await db.all(
    `SELECT id, username, nickname, avatar, organization_cr FROM users ORDER BY id ASC`,
  );
  for (const user of users) {
    await ensurePersonalProfileForUser(db, user);
  }
};

const syncPartnerProfile = async (db, partnerId) => {
  const partner = await db.get(
    `SELECT * FROM ecosystem_partners WHERE id = ?`,
    [partnerId],
  );
  if (!partner) return null;

  const type = profileTypeForPartnerCategory(partner.category);
  const handle = `partner-${partner.id}`;
  const displayName = trimText(partner.name, 120) || `Partner ${partner.id}`;
  const verified = partner.enabled === 0 || partner.deleted_at ? 0 : 1;
  const status = partner.deleted_at ? 'archived' : (partner.enabled === 0 ? 'inactive' : 'active');

  await db.run(
    `INSERT OR IGNORE INTO profiles (
      type, handle, display_name, display_name_en, logo_url, avatar_url,
      description, description_en, cooperation_direction, cooperation_direction_en,
      link_url, source_type, source_id, verified, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ecosystem_partner', ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      type,
      handle,
      displayName,
      nullableText(partner.name_en, 160),
      partner.logo_url || null,
      partner.logo_url || partner.dark_logo_url || null,
      nullableText(partner.description, 1200),
      nullableText(partner.description_en, 1200),
      nullableText(partner.cooperation_direction, 300),
      nullableText(partner.cooperation_direction_en, 360),
      nullableText(partner.link_url, 1000),
      partner.id,
      verified,
      status,
    ],
  );

  await db.run(
    `UPDATE profiles
     SET type = ?,
         display_name = ?,
         display_name_en = ?,
         logo_url = ?,
         avatar_url = ?,
         description = ?,
         description_en = ?,
         cooperation_direction = ?,
         cooperation_direction_en = ?,
         link_url = ?,
         verified = ?,
         status = ?,
         updated_at = datetime('now')
     WHERE source_type = 'ecosystem_partner' AND source_id = ?`,
    [
      type,
      displayName,
      nullableText(partner.name_en, 160),
      partner.logo_url || null,
      partner.logo_url || partner.dark_logo_url || null,
      nullableText(partner.description, 1200),
      nullableText(partner.description_en, 1200),
      nullableText(partner.cooperation_direction, 300),
      nullableText(partner.cooperation_direction_en, 360),
      nullableText(partner.link_url, 1000),
      verified,
      status,
      partner.id,
    ],
  );

  const profile = await db.get(
    `SELECT * FROM profiles WHERE source_type = 'ecosystem_partner' AND source_id = ? LIMIT 1`,
    [partner.id],
  );

  if (profile?.id) {
    await db.run(
      `DELETE FROM profile_aliases
       WHERE profile_id = ?
         AND purpose IN ('organizer_match', 'search')`,
      [profile.id],
    );

    await db.run(
      `UPDATE ecosystem_partners SET profile_id = ? WHERE id = ?`,
      [profile.id, partner.id],
    ).catch(() => {});

    const aliases = uniqueTextArray([
      ...parseJsonArray(partner.event_organizer_aliases),
      partner.name,
      partner.name_en,
    ], 30, 160);
    for (const alias of aliases) {
      await addProfileAlias(db, profile.id, alias, 'organizer_match');
      await addProfileAlias(db, profile.id, alias, 'search');
    }
  }

  return profile;
};

const syncPartnerProfiles = async (db) => {
  const partners = await db.all(`SELECT id FROM ecosystem_partners ORDER BY id ASC`);
  for (const partner of partners) {
    await syncPartnerProfile(db, partner.id);
  }
};

const ensureLegacyOrganizerProfiles = async (db) => {
  const rows = await db.all(`
    SELECT DISTINCT trim(organizer) AS organizer
    FROM events
    WHERE organizer IS NOT NULL
      AND trim(organizer) != ''
    ORDER BY organizer ASC
  `).catch(() => []);

  for (const row of rows) {
    const organizer = trimText(row.organizer, 160);
    const normalized = normalizeAlias(organizer);
    if (!organizer || !normalized) continue;

    const existingAlias = await db.get(
      `SELECT p.id
       FROM profile_aliases pa
       JOIN profiles p ON p.id = pa.profile_id
       WHERE pa.normalized_alias = ?
         AND pa.purpose IN ('organizer_match', 'search')
         AND p.type IN ('club', 'school', 'enterprise', 'organization')
         AND p.status = 'active'
         AND p.deleted_at IS NULL
       LIMIT 1`,
      [normalized],
    );
    if (existingAlias?.id) continue;

    const slug = slugifyHandlePart(organizer) || 'organizer';
    const handle = `organizer-${slug}-${hashText(normalized)}`.slice(0, 64);
    await db.run(
      `INSERT OR IGNORE INTO profiles (
        type, handle, display_name, description,
        source_type, source_id, verified, status, created_at, updated_at
      ) VALUES ('organization', ?, ?, ?, 'event_organizer', NULL, 0, 'active', datetime('now'), datetime('now'))`,
      [handle, organizer, '由历史活动主办方文本自动生成的组织主体。'],
    );

    const profile = await db.get(
      `SELECT id FROM profiles WHERE handle = ? AND deleted_at IS NULL LIMIT 1`,
      [handle],
    );
    if (profile?.id) {
      await addProfileAlias(db, profile.id, organizer, 'organizer_match');
      await addProfileAlias(db, profile.id, organizer, 'search');
    }
  }
};

const backfillPublisherProfiles = async (db) => {
  for (const { table, ownerColumn } of CONTENT_TABLES) {
    await db.run(`
      UPDATE ${table}
      SET publisher_profile_id = (
        SELECT p.id
        FROM profiles p
        WHERE p.source_type = 'user'
          AND p.source_id = ${table}.${ownerColumn}
        LIMIT 1
      )
      WHERE publisher_profile_id IS NULL
        AND ${ownerColumn} IS NOT NULL
    `).catch(() => {});
  }

  await db.run(`
    UPDATE events
    SET organizer_profile_id = (
      SELECT pa.profile_id
      FROM profile_aliases pa
      JOIN profiles p ON p.id = pa.profile_id
      WHERE p.type IN ('club', 'school', 'enterprise', 'organization')
        AND p.status = 'active'
        AND pa.purpose IN ('organizer_match', 'search')
        AND pa.normalized_alias = lower(trim(events.organizer))
      ORDER BY p.verified DESC, p.id ASC
      LIMIT 1
    )
    WHERE organizer_profile_id IS NULL
      AND organizer IS NOT NULL
      AND trim(organizer) != ''
  `).catch(() => {});
};

const bootstrapProfiles = async (db) => {
  await ensurePersonalProfiles(db);
  await syncPartnerProfiles(db);
  await ensureLegacyOrganizerProfiles(db);
  await backfillPublisherProfiles(db);
};

const findProfileById = (db, id) => db.get(
  `SELECT * FROM profiles WHERE id = ? AND deleted_at IS NULL`,
  [id],
);

const findProfileByHandle = (db, handle) => db.get(
  `SELECT * FROM profiles WHERE handle = ? AND deleted_at IS NULL`,
  [String(handle || '').trim()],
);

const canManageProfile = async (db, userId, profileId, userRole = 'user') => {
  if (!userId || !profileId) return false;
  if (userRole === 'admin') return true;
  const membership = await db.get(
    `SELECT id FROM profile_members
     WHERE profile_id = ?
       AND user_id = ?
       AND status = 'active'
       AND role IN ('owner', 'admin', 'editor')
     LIMIT 1`,
    [profileId, userId],
  );
  return Boolean(membership);
};

const resolvePublisherProfileId = async (db, userId, requestedProfileId, userRole = 'user') => {
  if (!userId) return null;
  const user = await db.get(
    `SELECT id, username, nickname, avatar, organization_cr FROM users WHERE id = ?`,
    [userId],
  );
  const personalProfile = user ? await ensurePersonalProfileForUser(db, user) : null;
  const requestedId = Number.parseInt(requestedProfileId, 10);

  if (!Number.isInteger(requestedId) || requestedId <= 0) {
    return personalProfile?.id || null;
  }

  const requestedProfile = await findProfileById(db, requestedId);
  if (!requestedProfile || requestedProfile.status !== 'active') {
    const error = new Error('Invalid publisher profile');
    error.status = 400;
    throw error;
  }

  if (!(await canManageProfile(db, userId, requestedId, userRole))) {
    const error = new Error('You do not have permission to publish as this profile');
    error.status = 403;
    throw error;
  }

  return requestedId;
};

const inferOrganizerProfileId = async (db, organizer) => {
  const normalized = normalizeAlias(organizer);
  if (!normalized) return null;
  const match = await db.get(
    `SELECT p.id
     FROM profile_aliases pa
     JOIN profiles p ON p.id = pa.profile_id
     WHERE pa.normalized_alias = ?
       AND pa.purpose IN ('organizer_match', 'search')
       AND p.type IN ('club', 'school', 'enterprise', 'organization')
       AND p.status = 'active'
       AND p.deleted_at IS NULL
     ORDER BY p.verified DESC, p.id ASC
     LIMIT 1`,
    [normalized],
  );
  return match?.id || null;
};

const resolveOrganizerProfileId = async (db, userId, requestedProfileId, organizer, userRole = 'user') => {
  const requestedId = Number.parseInt(requestedProfileId, 10);
  if (Number.isInteger(requestedId) && requestedId > 0) {
    const profile = await findProfileById(db, requestedId);
    if (!profile || !ORG_PROFILE_TYPES.has(profile.type) || profile.status !== 'active') {
      const error = new Error('Invalid organizer profile');
      error.status = 400;
      throw error;
    }
    if (!(await canManageProfile(db, userId, requestedId, userRole))) {
      const error = new Error('You do not have permission to use this organizer profile');
      error.status = 403;
      throw error;
    }
    return requestedId;
  }
  return inferOrganizerProfileId(db, organizer);
};

const listManageableProfiles = async (db, userId) => {
  if (!userId) return [];
  const user = await db.get(
    `SELECT id, username, nickname, avatar, organization_cr FROM users WHERE id = ?`,
    [userId],
  );
  if (user) await ensurePersonalProfileForUser(db, user);

  return db.all(
    `SELECT p.*, pm.role AS member_role
     FROM profiles p
     JOIN profile_members pm ON pm.profile_id = p.id
     WHERE pm.user_id = ?
       AND pm.status = 'active'
       AND p.status = 'active'
       AND p.deleted_at IS NULL
     ORDER BY
       CASE p.type WHEN 'person' THEN 0 WHEN 'club' THEN 1 WHEN 'organization' THEN 2 WHEN 'school' THEN 3 WHEN 'enterprise' THEN 4 ELSE 9 END,
       p.display_name ASC`,
    [userId],
  );
};

const listAliases = async (db, profileId) => {
  const rows = await db.all(
    `SELECT alias, purpose FROM profile_aliases WHERE profile_id = ? ORDER BY id ASC`,
    [profileId],
  );
  return rows.map((row) => ({ alias: row.alias, purpose: row.purpose }));
};

const serializeProfile = (profile, aliases = []) => {
  if (!profile) return null;
  return {
    id: profile.id,
    type: profile.type,
    handle: profile.handle,
    display_name: profile.display_name,
    display_name_en: profile.display_name_en || '',
    avatar_url: profile.avatar_url || '',
    logo_url: profile.logo_url || '',
    cover_url: profile.cover_url || '',
    bio: profile.bio || '',
    description: profile.description || '',
    description_en: profile.description_en || '',
    cooperation_direction: profile.cooperation_direction || '',
    cooperation_direction_en: profile.cooperation_direction_en || '',
    link_url: profile.link_url || '',
    verified: Boolean(profile.verified),
    status: profile.status || 'active',
    owner_user_id: profile.owner_user_id || null,
    source_type: profile.source_type || '',
    source_id: profile.source_id || null,
    member_role: profile.member_role || null,
    aliases,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
};

module.exports = {
  CONTENT_TABLES,
  ORG_PROFILE_TYPES,
  PROFILE_TYPES,
  addProfileAlias,
  backfillPublisherProfiles,
  bootstrapProfiles,
  canManageProfile,
  ensurePersonalProfileForUser,
  findProfileByHandle,
  findProfileById,
  inferOrganizerProfileId,
  ensureLegacyOrganizerProfiles,
  listAliases,
  listManageableProfiles,
  normalizeProfileType,
  parseJsonArray,
  resolveOrganizerProfileId,
  resolvePublisherProfileId,
  serializeProfile,
  syncPartnerProfile,
  syncPartnerProfiles,
  trimText,
  uniqueTextArray,
};
