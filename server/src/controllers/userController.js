const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getDb } = require('../config/db');
const { createNotification } = require('./notificationController');

const NICKNAME_REGEX = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;
const IDENTITY_TYPES = new Set(['person', 'team', 'club', 'organization']);
const LINK_STATUSES = new Set(['candidate', 'confirmed', 'rejected', 'revoked']);

const normalizeIdentityType = (value = '') => {
  const type = String(value).trim().toLowerCase();
  return type === 'organization' ? 'club' : type;
};

const isOrganizationIdentityType = (type) => type === 'club' || type === 'organization';

const normalizeIdentityName = (value = '') =>
  String(value)
    .trim()
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLowerCase();

const buildWorkMatchText = (work = {}) =>
  [
    work.author,
    work.honor_title,
    work.title,
    work.summary,
    work.award,
    work.grade,
    work.major,
  ]
    .filter(Boolean)
    .join(' ');

const serializeIdentityClaim = (row) => ({
  id: row.id,
  user_id: row.user_id,
  type: row.type,
  display_name: row.display_name,
  status: row.status,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const buildUploadUrl = (file) => {
  if (!file?.path) return null;
  const marker = /uploads[\\/]/;
  const relative = file.path.split(marker).pop();
  return relative ? `/uploads/${relative.replace(/\\/g, '/')}` : null;
};

const serializeCompetitionWorkForProfile = (row, includeReviewState = false) => {
  const item = {
    id: row.id,
    link_id: row.link_id,
    type: 'competition_work',
    title: row.title,
    cover: row.cover_url,
    image: row.cover_url,
    created_at: row.created_at,
    likes: 0,
    competition_id: row.competition_id,
    competition_title: row.competition_title,
    author: row.author,
    summary: row.summary,
    award: row.award,
    rank: row.rank,
    public_consent: row.public_consent === undefined ? true : Boolean(row.public_consent),
    target_path: `/hackathon?view=showcase&work=${row.id}`,
    uploader_id: row.uploader_id,
    uploader_name: row.uploader_name,
    uploader_avatar: row.uploader_avatar,
    identity_claim_id: row.identity_claim_id,
    bound_identity_name: row.bound_identity_name,
    bound_identity_type: row.bound_identity_type,
    binding_status: row.binding_status,
    matched_text: row.matched_text,
  };
  if (includeReviewState) {
    item.status = row.status;
    item.review_note = row.review_note;
  }
  return item;
};

const verifyInviteCode = async (db, inviteCode) => {
  const settings = await db.get('SELECT value FROM settings WHERE key = ?', ['invite_code']);
  return Boolean(settings && String(settings.value).trim() === String(inviteCode || '').trim());
};

const upsertVerifiedOrganizationClaim = async (db, userId, displayName) => {
  const trimmedName = String(displayName || '').trim();
  const normalizedName = normalizeIdentityName(trimmedName);
  if (!userId || !trimmedName || !normalizedName) return null;

  const existing = await db.get(
    `
    SELECT *
    FROM user_identity_claims
    WHERE user_id = ?
      AND type IN ('club', 'organization')
      AND normalized_name = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [userId, normalizedName]
  );

  if (existing) {
    await db.run(
      `
      UPDATE user_identity_claims
      SET type = 'club',
          display_name = ?,
          normalized_name = ?,
          status = 'verified',
          updated_at = datetime('now')
      WHERE id = ?
      `,
      [trimmedName, normalizedName, existing.id]
    );
    return db.get('SELECT * FROM user_identity_claims WHERE id = ?', [existing.id]);
  }

  const result = await db.run(
    `
    INSERT INTO user_identity_claims (
      user_id, type, display_name, normalized_name, status, created_at, updated_at
    ) VALUES (?, 'club', ?, ?, 'verified', datetime('now'), datetime('now'))
    `,
    [userId, trimmedName, normalizedName]
  );
  return db.get('SELECT * FROM user_identity_claims WHERE id = ?', [result.lastID]);
};

const createCandidateLinksForWork = async (db, work) => {
  if (!work?.id) return [];
  const normalizedText = normalizeIdentityName(buildWorkMatchText(work));
  if (!normalizedText) return [];

  const claims = await db.all(
    `
    SELECT id, user_id, type, display_name, normalized_name, status
    FROM user_identity_claims
    WHERE status IN ('pending', 'verified')
      AND normalized_name IS NOT NULL
      AND TRIM(normalized_name) != ''
    `
  );
  const matches = claims.filter((claim) => normalizedText.includes(claim.normalized_name));
  for (const claim of matches) {
    await db.run(
      `
      INSERT OR IGNORE INTO competition_work_identity_links (
        work_id, claim_id, user_id, matched_text, match_source, status, confidence, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'auto', 'candidate', 1, datetime('now'), datetime('now'))
      `,
      [work.id, claim.id, claim.user_id, claim.display_name]
    );
  }
  return matches;
};

function validateNickname(raw) {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  const trimmed = String(raw).trim();
  if (trimmed === '') return { ok: true, value: null };
  if (trimmed.length < 2 || trimmed.length > 20) {
    return { ok: false, error: 'nickname 长度需为 2-20 字符' };
  }
  if (!NICKNAME_REGEX.test(trimmed)) {
    return { ok: false, error: 'nickname 仅允许中英文、数字和下划线' };
  }
  return { ok: true, value: trimmed };
}

const getAllUsers = async (req, res, next) => {
  try {
    const db = await getDb();
    const users = await db.all('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) { next(error); }
};

const getFollowStats = async (db, profileUserId, viewerUserId = null) => {
  const stats = await db.get(
    `
    SELECT
      (SELECT COUNT(*) FROM user_follows WHERE following_id = ?) as followers_count,
      (SELECT COUNT(*) FROM user_follows WHERE follower_id = ?) as following_count,
      CASE
        WHEN ? IS NULL THEN 0
        WHEN EXISTS(
          SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?
        ) THEN 1 ELSE 0
      END as is_following,
      CASE
        WHEN ? IS NULL THEN 0
        WHEN EXISTS(
          SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?
        ) THEN 1 ELSE 0
      END as is_followed_by
    `,
    [profileUserId, profileUserId, viewerUserId, viewerUserId, profileUserId, viewerUserId, profileUserId, viewerUserId]
  );
  return {
    followers_count: stats?.followers_count || 0,
    following_count: stats?.following_count || 0,
    is_following: Boolean(stats?.is_following),
    is_followed_by: Boolean(stats?.is_followed_by),
  };
};

const updateUser = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { role, password, avatar, organization_cr, gender, age, nickname, invitation_code } = req.body;

    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Validate invite code if setting organization
    if (organization_cr !== undefined && organization_cr !== user.organization_cr) {
        // Only require code if joining an organization (not clearing it)
        if (organization_cr) {
            if (!invitation_code) {
                return res.status(400).json({ error: 'Invitation code required for Organization/Cr' });
            }
            const inviteCodeValid = await verifyInviteCode(db, invitation_code);
            if (!inviteCodeValid) {
                return res.status(400).json({ error: 'Invalid invitation code' });
            }
        }
        await db.run('UPDATE users SET organization_cr = ? WHERE id = ?', [organization_cr, id]);
        if (organization_cr) {
          await upsertVerifiedOrganizationClaim(db, id, organization_cr);
        }
    }

    // FIX: BUG-01 — Only admins can change roles; ignore role field from non-admin users
    if (role && req.user && req.user.role === 'admin') {
      await db.run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    }

    if (avatar !== undefined) await db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, id]);
    if (gender !== undefined) await db.run('UPDATE users SET gender = ? WHERE id = ?', [gender, id]);
    if (age !== undefined) await db.run('UPDATE users SET age = ? WHERE id = ?', [age, id]);
    if (nickname !== undefined) {
      const check = validateNickname(nickname);
      if (!check.ok) {
        return res.status(400).json({ error: check.error });
      }
      try {
        await db.run('UPDATE users SET nickname = ? WHERE id = ?', [check.value, id]);
      } catch (err) {
        if (err && (err.code === 'SQLITE_CONSTRAINT' || /UNIQUE constraint failed/i.test(err.message || ''))) {
          return res.status(409).json({ error: '该昵称已被使用' });
        }
        throw err;
      }
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) { next(error); }
};

const uploadOwnAvatar = async (req, res, next) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Login required' });
    if (!req.file) return res.status(400).json({ error: 'Avatar image is required' });
    let avatar = buildUploadUrl(req.file);
    if (!avatar || !avatar.startsWith('/uploads/avatars/')) {
      return res.status(400).json({ error: 'Avatar upload failed' });
    }
    const cropSize = Math.min(1, Math.max(0.05, Number(req.body?.crop_size) || 1));
    const cropX = Math.min(1 - cropSize, Math.max(0, Number(req.body?.crop_x) || 0));
    const cropY = Math.min(1 - cropSize, Math.max(0, Number(req.body?.crop_y) || 0));
    try {
      const image = sharp(req.file.path);
      const metadata = await image.metadata();
      const sourceWidth = metadata.width || 0;
      const sourceHeight = metadata.height || 0;
      if (sourceWidth > 0 && sourceHeight > 0) {
        const side = Math.max(1, Math.floor(Math.min(sourceWidth, sourceHeight) * cropSize));
        const left = Math.min(sourceWidth - side, Math.max(0, Math.floor(cropX * sourceWidth)));
        const top = Math.min(sourceHeight - side, Math.max(0, Math.floor(cropY * sourceHeight)));
        const parsed = path.parse(req.file.path);
        const croppedPath = path.join(parsed.dir, `${parsed.name}-cropped.webp`);
        await image.extract({ left, top, width: side, height: side }).resize(512, 512).webp({ quality: 86 }).toFile(croppedPath);
        try { await fs.promises.unlink(req.file.path); } catch {}
        avatar = buildUploadUrl({ path: croppedPath });
      }
    } catch (cropError) {
      console.warn('Avatar crop warning:', cropError.message);
    }
    const db = await getDb();
    await db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, req.user.id]);
    const user = await db.get(
      'SELECT id, username, role, avatar, organization_cr, gender, age, nickname, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ avatar, user });
  } catch (error) { next(error); }
};

const deleteUser = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await db.run('DELETE FROM user_follows WHERE follower_id = ? OR following_id = ?', [id, id]);
    await db.run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) { next(error); }
};

const getPublicProfile = async (req, res, next) => {
    try {
        const db = await getDb();
        const { id } = req.params;
        const user = await db.get('SELECT id, username, nickname, avatar, role, created_at, organization_cr, gender, age FROM users WHERE id = ?', [id]);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const viewerId = req.user?.id || null;
        const followStats = await getFollowStats(db, Number(id), viewerId);
        res.json({
          ...user,
          ...followStats
        });
    } catch (error) { next(error); }
};

const toggleFollowUser = async (req, res, next) => {
  try {
    // Self-follow guard — MUST be at top to cover both POST and DELETE routes.
    // See openspec/changes/community-identity-and-follow-notifications Task 6.
    if (Number(req.params.id) === Number(req.user?.id)) {
      return res.status(400).json({ error: '不能关注自己' });
    }

    const db = await getDb();
    const followerId = req.user?.id;
    const followingId = Number(req.params.id);
    if (!followerId) return res.status(401).json({ error: 'Login required' });
    if (!Number.isFinite(followingId)) return res.status(400).json({ error: 'Invalid user id' });

    const targetUser = await db.get('SELECT id, username, nickname FROM users WHERE id = ?', [followingId]);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const existing = await db.get(
      'SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    const isDeleteAction = req.method === 'DELETE';
    let following = false;
    if (isDeleteAction) {
      if (existing) {
        await db.run('DELETE FROM user_follows WHERE id = ?', [existing.id]);
      }
      following = false;
    } else if (existing) {
      following = true;
    } else {
      await db.run(
        'INSERT INTO user_follows (follower_id, following_id, created_at) VALUES (?, ?, datetime("now"))',
        [followerId, followingId]
      );
      following = true;
      const actor = await db.get('SELECT username, nickname FROM users WHERE id = ?', [followerId]);
      const actorName = actor?.nickname || actor?.username || '有用户';
      await createNotification(
        followingId,
        'follow',
        `${actorName} 关注了你`,
        followerId,
        'user'
      );
    }

    const stats = await getFollowStats(db, followingId, followerId);
    res.json({
      success: true,
      following,
      ...stats
    });
  } catch (error) { next(error); }
};

const listFollowers = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const viewerId = req.user?.id || null;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const offset = (page - 1) * limit;

    const rows = await db.all(
      `
      SELECT
        u.id,
        u.username,
        u.nickname,
        u.avatar,
        u.role,
        u.organization_cr,
        u.created_at,
        f.created_at as followed_at,
        CASE
          WHEN ? IS NULL THEN 0
          WHEN EXISTS(
            SELECT 1 FROM user_follows uf
            WHERE uf.follower_id = ? AND uf.following_id = u.id
          ) THEN 1 ELSE 0
        END as is_following
      FROM user_follows f
      JOIN users u ON u.id = f.follower_id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [viewerId, viewerId, id, limit, offset]
    );

    const total = await db.get('SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?', [id]);
    res.json({
      data: rows.map((row) => ({ ...row, is_following: Boolean(row.is_following) })),
      pagination: {
        total: total?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((total?.count || 0) / limit)
      }
    });
  } catch (error) { next(error); }
};

const listFollowing = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const viewerId = req.user?.id || null;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const offset = (page - 1) * limit;

    const rows = await db.all(
      `
      SELECT
        u.id,
        u.username,
        u.nickname,
        u.avatar,
        u.role,
        u.organization_cr,
        u.created_at,
        f.created_at as followed_at,
        CASE
          WHEN ? IS NULL THEN 0
          WHEN EXISTS(
            SELECT 1 FROM user_follows uf
            WHERE uf.follower_id = ? AND uf.following_id = u.id
          ) THEN 1 ELSE 0
        END as is_following
      FROM user_follows f
      JOIN users u ON u.id = f.following_id
      WHERE f.follower_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [viewerId, viewerId, id, limit, offset]
    );

    const total = await db.get('SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?', [id]);
    res.json({
      data: rows.map((row) => ({ ...row, is_following: Boolean(row.is_following) })),
      pagination: {
        total: total?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((total?.count || 0) / limit)
      }
    });
  } catch (error) { next(error); }
};

const getFollowingIds = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    const rows = await db.all(
      'SELECT following_id FROM user_follows WHERE follower_id = ?',
      [userId]
    );
    res.json({ ids: rows.map((row) => row.following_id) });
  } catch (error) { next(error); }
};

const getFollowRecommendations = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    const limit = Math.min(Math.max(parseInt(req.query.limit || '8', 10), 1), 30);
    const rows = await db.all(
      `
      SELECT
        u.id,
        u.username,
        u.nickname,
        u.avatar,
        u.role,
        u.organization_cr,
        u.created_at,
        COALESCE(fc.followers_count, 0) as followers_count
      FROM users u
      LEFT JOIN (
        SELECT following_id as user_id, COUNT(*) as followers_count
        FROM user_follows
        GROUP BY following_id
      ) fc ON fc.user_id = u.id
      WHERE u.id != ?
        AND u.id NOT IN (
          SELECT following_id FROM user_follows WHERE follower_id = ?
        )
      ORDER BY followers_count DESC, u.created_at DESC
      LIMIT ?
      `,
      [userId, userId, limit]
    );
    res.json(rows);
  } catch (error) { next(error); }
};

const getFollowingFeed = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    const limit = Math.min(Math.max(parseInt(req.query.limit || '40', 10), 1), 120);
    const requestedType = String(req.query.type || 'all').toLowerCase();

    const followingRows = await db.all(
      'SELECT following_id FROM user_follows WHERE follower_id = ?',
      [userId]
    );
    const followingIds = followingRows.map((row) => row.following_id);
    if (!followingIds.length) {
      return res.json({ data: [] });
    }

    const placeholders = followingIds.map(() => '?').join(',');
    const tableConfigs = [
      { table: 'photos', type: 'photo', imageField: 'url', route: '/gallery' },
      { table: 'music', type: 'music', imageField: 'cover', route: '/music' },
      { table: 'videos', type: 'video', imageField: 'thumbnail', route: '/videos' },
      { table: 'articles', type: 'article', imageField: 'cover', route: '/articles' },
      { table: 'events', type: 'event', imageField: 'image', route: '/events' }
    ];
    const allowedTypes = new Set(['all', ...tableConfigs.map((item) => item.table)]);
    if (!allowedTypes.has(requestedType)) {
      return res.status(400).json({ error: 'Invalid type filter' });
    }
    const activeConfigs = requestedType === 'all'
      ? tableConfigs
      : tableConfigs.filter((item) => item.table === requestedType);

    const chunks = await Promise.all(activeConfigs.map(async ({ table, type, imageField, route }) => {
      const rows = await db.all(
        `
        SELECT
          r.id,
          r.title,
          r.uploader_id,
          r.tags,
          r.likes,
          r.created_at,
          r.${imageField} as image,
          u.username as author_username,
          u.nickname as author_nickname,
          u.avatar as author_avatar
        FROM ${table} r
        LEFT JOIN users u ON u.id = r.uploader_id
        WHERE uploader_id IN (${placeholders})
          AND status = 'approved'
          AND deleted_at IS NULL
        ORDER BY datetime(r.created_at) DESC, r.id DESC
        LIMIT ?
        `,
        [...followingIds, limit]
      );
      return rows.map((row) => ({
        ...row,
        type,
        resource_type: table,
        author_name: row.author_nickname || row.author_username || '匿名用户',
        target_path: `${route}?id=${row.id}`
      }));
    }));

    const merged = chunks
      .flat()
      .sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return (b.id || 0) - (a.id || 0);
      })
      .slice(0, limit);

    res.json({ data: merged });
  } catch (error) { next(error); }
};

const listOwnIdentityClaims = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    const db = await getDb();
    const rows = await db.all(
      `
      SELECT id, user_id, type, display_name, status, created_at, updated_at
      FROM user_identity_claims
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
      `,
      [userId]
    );
    res.json(rows.map(serializeIdentityClaim));
  } catch (error) { next(error); }
};

const createOwnIdentityClaim = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    const type = normalizeIdentityType(req.body?.type || '');
    const displayName = String(req.body?.display_name || req.body?.displayName || '').trim();
    const invitationCode = String(req.body?.invitation_code || req.body?.invitationCode || '').trim();
    if (!IDENTITY_TYPES.has(type)) {
      return res.status(400).json({ error: 'Invalid identity type' });
    }
    if (displayName.length < 2 || displayName.length > 80) {
      return res.status(400).json({ error: 'Identity name must be 2-80 characters' });
    }
    const normalizedName = normalizeIdentityName(displayName);
    if (!normalizedName) return res.status(400).json({ error: 'Identity name is required' });
    const db = await getDb();
    const isOrganization = isOrganizationIdentityType(type);
    const status = 'pending';

    if (isOrganization && invitationCode) {
      const inviteCodeValid = await verifyInviteCode(db, invitationCode);
      if (!inviteCodeValid) {
        return res.status(400).json({ error: 'Invalid invitation code' });
      }
      const claim = await upsertVerifiedOrganizationClaim(db, userId, displayName);
      await db.run('UPDATE users SET organization_cr = ? WHERE id = ?', [displayName, userId]);
      const works = await db.all(
        "SELECT * FROM competition_works WHERE deleted_at IS NULL AND COALESCE(author, '') != ''"
      );
      for (const work of works) {
        await createCandidateLinksForWork(db, work);
      }
      return res.status(201).json(serializeIdentityClaim(claim));
    }

    const result = await db.run(
      `
      INSERT INTO user_identity_claims (
        user_id, type, display_name, normalized_name, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      [userId, type, displayName, normalizedName, status]
    );
    const claim = await db.get('SELECT * FROM user_identity_claims WHERE id = ?', [result.lastID]);
    const works = await db.all(
      "SELECT * FROM competition_works WHERE deleted_at IS NULL AND COALESCE(author, '') != ''"
    );
    for (const work of works) {
      await createCandidateLinksForWork(db, work);
    }
    res.status(201).json(serializeIdentityClaim(claim));
  } catch (error) { next(error); }
};

const updateOwnIdentityClaim = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    const claimId = Number(req.params.claimId);
    if (!Number.isFinite(claimId)) return res.status(400).json({ error: 'Invalid claim id' });
    const db = await getDb();
    const existing = await db.get('SELECT * FROM user_identity_claims WHERE id = ? AND user_id = ?', [claimId, userId]);
    if (!existing) return res.status(404).json({ error: 'Identity claim not found' });

    const nextType = req.body?.type !== undefined ? normalizeIdentityType(req.body.type) : existing.type;
    const nextDisplayName = req.body?.display_name !== undefined || req.body?.displayName !== undefined
      ? String(req.body.display_name ?? req.body.displayName).trim()
      : existing.display_name;
    const requestedStatus = req.body?.status !== undefined ? String(req.body.status).trim() : existing.status;
    const invitationCode = String(req.body?.invitation_code || req.body?.invitationCode || '').trim();
    let nextStatus = requestedStatus === 'rejected' ? 'rejected' : existing.status;
    if (!IDENTITY_TYPES.has(nextType)) return res.status(400).json({ error: 'Invalid identity type' });
    if (nextDisplayName.length < 2 || nextDisplayName.length > 80) {
      return res.status(400).json({ error: 'Identity name must be 2-80 characters' });
    }
    if (isOrganizationIdentityType(nextType) && invitationCode) {
      const inviteCodeValid = await verifyInviteCode(db, invitationCode);
      if (!inviteCodeValid) return res.status(400).json({ error: 'Invalid invitation code' });
      nextStatus = 'verified';
      await db.run('UPDATE users SET organization_cr = ? WHERE id = ?', [nextDisplayName, userId]);
    }
    await db.run(
      `
      UPDATE user_identity_claims
      SET type = ?, display_name = ?, normalized_name = ?, status = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
      `,
      [nextType, nextDisplayName, normalizeIdentityName(nextDisplayName), nextStatus, claimId, userId]
    );
    const claim = await db.get('SELECT * FROM user_identity_claims WHERE id = ?', [claimId]);
    res.json(serializeIdentityClaim(claim));
  } catch (error) { next(error); }
};

const listOwnOutcomeLinks = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    const status = String(req.query.status || 'all').toLowerCase();
    const db = await getDb();
    const params = [userId];
    let statusClause = '';
    if (status !== 'all') {
      if (!LINK_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid binding status' });
      statusClause = ' AND l.status = ?';
      params.push(status);
    }
    const rows = await db.all(
      `
      SELECT l.id AS link_id, l.status AS binding_status, l.matched_text, l.match_source,
             l.confidence, l.created_at AS linked_at, l.updated_at AS link_updated_at,
             ic.id AS identity_claim_id, ic.type AS bound_identity_type,
             ic.display_name AS bound_identity_name,
             cw.*, c.title AS competition_title,
             COALESCE(u.nickname, u.username) AS uploader_name,
             u.avatar AS uploader_avatar
      FROM competition_work_identity_links l
      JOIN user_identity_claims ic ON ic.id = l.claim_id
      JOIN competition_works cw ON cw.id = l.work_id
      LEFT JOIN competitions c ON c.id = cw.competition_id
      LEFT JOIN users u ON u.id = cw.uploader_id
      WHERE l.user_id = ?
        ${statusClause}
        AND cw.deleted_at IS NULL
        AND (c.deleted_at IS NULL OR c.id IS NULL)
      ORDER BY datetime(l.updated_at) DESC, l.id DESC
      `,
      params
    );
    res.json(rows.map((row) => serializeCompetitionWorkForProfile(row, true)));
  } catch (error) { next(error); }
};

const updateOwnOutcomeLink = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    const linkId = Number(req.params.linkId);
    const action = String(req.body?.action || '').trim();
    const statusByAction = {
      confirm: 'confirmed',
      reject: 'rejected',
      revoke: 'revoked',
    };
    const nextStatus = statusByAction[action];
    if (!Number.isFinite(linkId)) return res.status(400).json({ error: 'Invalid link id' });
    if (!nextStatus) return res.status(400).json({ error: 'Invalid link action' });
    const db = await getDb();
    const existing = await db.get(
      'SELECT id FROM competition_work_identity_links WHERE id = ? AND user_id = ?',
      [linkId, userId]
    );
    if (!existing) return res.status(404).json({ error: 'Outcome link not found' });
    await db.run(
      `
      UPDATE competition_work_identity_links
      SET status = ?,
          updated_at = datetime('now'),
          confirmed_at = CASE WHEN ? = 'confirmed' THEN datetime('now') ELSE confirmed_at END
      WHERE id = ? AND user_id = ?
      `,
      [nextStatus, nextStatus, linkId, userId]
    );
    const row = await db.get(
      `
      SELECT l.id AS link_id, l.status AS binding_status, l.matched_text, l.match_source,
             l.confidence, l.created_at AS linked_at, l.updated_at AS link_updated_at,
             ic.id AS identity_claim_id, ic.type AS bound_identity_type,
             ic.display_name AS bound_identity_name,
             cw.*, c.title AS competition_title,
             COALESCE(u.nickname, u.username) AS uploader_name,
             u.avatar AS uploader_avatar
      FROM competition_work_identity_links l
      JOIN user_identity_claims ic ON ic.id = l.claim_id
      JOIN competition_works cw ON cw.id = l.work_id
      LEFT JOIN competitions c ON c.id = cw.competition_id
      LEFT JOIN users u ON u.id = cw.uploader_id
      WHERE l.id = ?
      `,
      [linkId]
    );
    res.json(serializeCompetitionWorkForProfile(row, true));
  } catch (error) { next(error); }
};

const adminCreateOutcomeLink = async (req, res, next) => {
  try {
    const workId = Number(req.body?.work_id || req.body?.workId);
    const claimId = Number(req.body?.claim_id || req.body?.claimId);
    const requestedStatus = String(req.body?.status || 'confirmed').trim();
    const status = LINK_STATUSES.has(requestedStatus) ? requestedStatus : 'confirmed';
    if (!Number.isFinite(workId) || !Number.isFinite(claimId)) {
      return res.status(400).json({ error: 'work_id and claim_id are required' });
    }
    const db = await getDb();
    const claim = await db.get('SELECT * FROM user_identity_claims WHERE id = ?', [claimId]);
    if (!claim) return res.status(404).json({ error: 'Identity claim not found' });
    const work = await db.get('SELECT * FROM competition_works WHERE id = ? AND deleted_at IS NULL', [workId]);
    if (!work) return res.status(404).json({ error: 'Competition work not found' });
    await db.run(
      `
      INSERT INTO competition_work_identity_links (
        work_id, claim_id, user_id, matched_text, match_source, status, confidence,
        created_at, updated_at, confirmed_at
      ) VALUES (?, ?, ?, ?, 'manual_admin', ?, 1, datetime('now'), datetime('now'),
        CASE WHEN ? = 'confirmed' THEN datetime('now') ELSE NULL END)
      ON CONFLICT(work_id, claim_id) DO UPDATE SET
        status = excluded.status,
        match_source = 'manual_admin',
        matched_text = excluded.matched_text,
        updated_at = datetime('now'),
        confirmed_at = CASE WHEN excluded.status = 'confirmed' THEN datetime('now') ELSE competition_work_identity_links.confirmed_at END
      `,
      [workId, claimId, claim.user_id, claim.display_name, status, status]
    );
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
};

const adminUpdateOutcomeLink = async (req, res, next) => {
  try {
    const linkId = Number(req.params.linkId);
    const status = String(req.body?.status || '').trim();
    if (!Number.isFinite(linkId)) return res.status(400).json({ error: 'Invalid link id' });
    if (!LINK_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid binding status' });
    const db = await getDb();
    const existing = await db.get('SELECT id FROM competition_work_identity_links WHERE id = ?', [linkId]);
    if (!existing) return res.status(404).json({ error: 'Outcome link not found' });
    await db.run(
      `
      UPDATE competition_work_identity_links
      SET status = ?,
          match_source = 'manual_admin',
          updated_at = datetime('now'),
          confirmed_at = CASE WHEN ? = 'confirmed' THEN datetime('now') ELSE confirmed_at END
      WHERE id = ?
      `,
      [status, status, linkId]
    );
    res.json({ success: true });
  } catch (error) { next(error); }
};

const getUserCompetitionWorks = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const isOwner = req.user && String(req.user.id) === String(id);
    const isAdmin = req.user?.role === 'admin';
    const includeReviewState = Boolean(isOwner || isAdmin);
    let query = `
      SELECT cw.*, c.title AS competition_title,
             l.id AS link_id,
             l.status AS binding_status,
             l.matched_text,
             ic.id AS identity_claim_id,
             ic.type AS bound_identity_type,
             ic.display_name AS bound_identity_name,
             COALESCE(u.nickname, u.username) AS uploader_name,
             u.avatar AS uploader_avatar
      FROM competition_work_identity_links l
      JOIN user_identity_claims ic ON ic.id = l.claim_id
      JOIN competition_works cw ON cw.id = l.work_id
      LEFT JOIN competitions c ON c.id = cw.competition_id
      LEFT JOIN users u ON u.id = cw.uploader_id
      WHERE l.user_id = ?
        AND cw.deleted_at IS NULL
        AND (c.deleted_at IS NULL OR c.id IS NULL)
    `;
    if (!includeReviewState) {
      query += " AND l.status = 'confirmed' AND cw.status = 'approved' AND COALESCE(cw.public_consent, 1) = 1";
    }
    query += " ORDER BY datetime(COALESCE(cw.created_at, cw.updated_at, '1970-01-01')) DESC, cw.id DESC";
    const rows = await db.all(query, [id]);
    res.json(rows.map((row) => serializeCompetitionWorkForProfile(row, includeReviewState)));
  } catch (error) { next(error); }
};

const getUserResources = async (req, res, next) => {
    try {
        const { serializeCommunityPost } = require('../utils/serializeCommunityPost');

        const db = await getDb();
        const { id } = req.params;
        const tables = ['photos', 'videos', 'music', 'articles', 'events', 'news'];
        const typeSingular = {
          photos: 'photo',
          videos: 'video',
          music: 'music',
          articles: 'article',
          events: 'event',
          news: 'news',
        };
        let allResources = [];

        // Check if requester is the owner or admin
        const isOwner = req.user && String(req.user.id) === String(id);
        const viewerRole = req.user ? req.user.role : null;
        const isAdmin = viewerRole === 'admin';

        for (const table of tables) {
            const typeValue = typeSingular[table];
            let query = `SELECT *, ? as type FROM ${table} WHERE uploader_id = ?`;
            const params = [typeValue, id];

            // If not owner and not admin, only show approved
            if (!isOwner && !isAdmin) {
                query += ` AND status = 'approved'`;
            }

            query += ` ORDER BY id DESC`;

            const resources = await db.all(query, params);
            allResources = [...allResources, ...resources];
        }

        // community_posts: author_id (not uploader_id).
        // Visitors (non-owner non-admin) see only approved posts. The legacy
        // anonymous-help filter was removed along with the opt-in feature.
        let postsQuery = `SELECT cp.*,
                            COALESCE(u.nickname, u.username) AS author_name,
                            u.avatar AS author_avatar,
                            cp.section AS type_section
                          FROM community_posts cp
                          LEFT JOIN users u ON u.id = cp.author_id
                          WHERE cp.author_id = ?`;
        const postsParams = [id];

        if (!isOwner && !isAdmin) {
            // community_posts has no deleted_at column; only status filter applies.
            postsQuery += ` AND cp.status = 'approved'`;
        }
        postsQuery += ` ORDER BY cp.id DESC`;

        const postsRaw = await db.all(postsQuery, postsParams);
        const viewer = req.user ? { id: req.user.id, role: req.user.role } : null;
        const posts = postsRaw.map((p) => ({
          ...serializeCommunityPost(p, viewer),
          type: p.section, // 'help' or 'team'
        }));
        allResources = [...allResources, ...posts];

        let worksQuery = `
          SELECT cw.*, c.title AS competition_title,
                 l.id AS link_id,
                 l.status AS binding_status,
                 l.matched_text,
                 ic.id AS identity_claim_id,
                 ic.type AS bound_identity_type,
                 ic.display_name AS bound_identity_name,
                 COALESCE(u.nickname, u.username) AS uploader_name,
                 u.avatar AS uploader_avatar
          FROM competition_work_identity_links l
          JOIN user_identity_claims ic ON ic.id = l.claim_id
          JOIN competition_works cw ON cw.id = l.work_id
          LEFT JOIN competitions c ON c.id = cw.competition_id
          LEFT JOIN users u ON u.id = cw.uploader_id
          WHERE l.user_id = ?
            AND cw.deleted_at IS NULL
            AND (c.deleted_at IS NULL OR c.id IS NULL)
            AND l.status = 'confirmed'
            AND cw.status = 'approved'
            AND COALESCE(cw.public_consent, 1) = 1
        `;
        worksQuery += " ORDER BY cw.id DESC";
        const competitionWorks = await db.all(worksQuery, [id]);
        allResources = [
          ...allResources,
          ...competitionWorks.map((work) =>
            serializeCompetitionWorkForProfile(work, Boolean(isOwner || isAdmin))
          )
        ];

        // Unified sort by created_at DESC (fallback to id for ties / missing timestamps)
        allResources.sort((a, b) => {
          const ta = new Date(a.created_at || 0).getTime();
          const tb = new Date(b.created_at || 0).getTime();
          if (tb !== ta) return tb - ta;
          return (b.id || 0) - (a.id || 0);
        });

        res.json(allResources);
    } catch (error) { next(error); }
};

module.exports = {
  getAllUsers,
  updateUser,
  uploadOwnAvatar,
  listOwnIdentityClaims,
  createOwnIdentityClaim,
  updateOwnIdentityClaim,
  listOwnOutcomeLinks,
  updateOwnOutcomeLink,
  adminCreateOutcomeLink,
  adminUpdateOutcomeLink,
  createCandidateLinksForWork,
  deleteUser,
  getPublicProfile,
  getUserResources,
  getUserCompetitionWorks,
  toggleFollowUser,
  listFollowers,
  listFollowing,
  getFollowingIds,
  getFollowRecommendations,
  getFollowingFeed
};
