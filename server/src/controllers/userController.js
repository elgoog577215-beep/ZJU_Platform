const bcrypt = require('bcryptjs');
const { getDb } = require('../config/db');
const { createNotification } = require('./notificationController');

const NICKNAME_REGEX = /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/;

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
            const settings = await db.get('SELECT value FROM settings WHERE key = ?', ['invite_code']);
            if (!settings || String(settings.value).trim() !== String(invitation_code).trim()) {

                return res.status(400).json({ error: 'Invalid invitation code' });
            }
        }
        await db.run('UPDATE users SET organization_cr = ? WHERE id = ?', [organization_cr, id]);
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
        // Visitors (non-owner non-admin) see only approved/non-deleted posts AND
        // MUST NOT see anonymous help posts (is_anonymous = 1 AND section = 'help').
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
            postsQuery += ` AND NOT (cp.section = 'help' AND cp.is_anonymous = 1)`;
        }
        postsQuery += ` ORDER BY cp.id DESC`;

        const postsRaw = await db.all(postsQuery, postsParams);
        const viewer = req.user ? { id: req.user.id, role: req.user.role } : null;
        const posts = postsRaw.map((p) => ({
          ...serializeCommunityPost(p, viewer),
          type: p.section, // 'help' or 'team'
        }));
        allResources = [...allResources, ...posts];

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
  deleteUser,
  getPublicProfile,
  getUserResources,
  toggleFollowUser,
  listFollowers,
  listFollowing,
  getFollowingIds,
  getFollowRecommendations,
  getFollowingFeed
};
