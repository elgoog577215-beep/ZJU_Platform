const { getDb } = require('../config/db');

const ALLOWED_SECTIONS = new Set(['help', 'tech', 'news', 'team', 'groups']);

const normalizeSection = (value) => {
  const section = String(value || '').trim().toLowerCase();
  return ALLOWED_SECTIONS.has(section) ? section : null;
};

const parseTags = (input) => {
  if (!input) return '';
  return String(input)
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12)
    .join(',');
};

const normalizePostStatus = (section, status) => {
  const normalizedSection = normalizeSection(section);
  const normalizedStatus = String(status || '').trim().toLowerCase();
  if (normalizedSection === 'help') {
    if (normalizedStatus === 'solved') return 'solved';
    return 'open';
  }
  if (normalizedSection === 'team') {
    if (normalizedStatus === 'full' || normalizedStatus === 'closed') return normalizedStatus;
    return 'recruiting';
  }
  return 'published';
};

const validatePostStatus = (section, status) => {
  const s = String(status || '').trim().toLowerCase();
  if (section === 'help') return s === 'open' || s === 'solved';
  if (section === 'team') return s === 'recruiting' || s === 'full' || s === 'closed';
  return s === 'published';
};

const serializePost = (row) => {
  const tags = row.tags
    ? String(row.tags).split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];
  return {
    id: row.id,
    section: row.section,
    title: row.title,
    content: row.content,
    tags,
    status: normalizePostStatus(row.section, row.post_status),
    author_id: row.author_id,
    author_name: row.author_name,
    author_avatar: row.author_avatar,
    likes_count: row.likes_count || 0,
    comments_count: row.comments_count || 0,
    views_count: row.views_count || 0,
    content_blocks: row.content_blocks || null,
    link: row.link || null,
    deadline: row.deadline || null,
    max_members: row.max_members || null,
    current_members: row.current_members || 0,
    solved_comment_id: row.solved_comment_id || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    excerpt: row.content ? String(row.content).slice(0, 120) : ''
  };
};

const listPosts = async (req, res, next) => {
  try {
    const db = await getDb();
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
    const offset = (page - 1) * limit;
    const section = normalizeSection(req.query.section);
    const status = String(req.query.status || '').trim().toLowerCase();
    const q = String(req.query.search || '').trim();
    const sort = String(req.query.sort || 'newest');

    const whereClauses = ['status = "approved"'];
    const whereParams = [];

    if (section) {
      whereClauses.push('section = ?');
      whereParams.push(section);
    }

    if (section && status && status !== 'all' && validatePostStatus(section, status)) {
      whereClauses.push('post_status = ?');
      whereParams.push(status);
    }

    if (q.length >= 2) {
      const term = `%${q}%`;
      whereClauses.push('(title LIKE ? OR content LIKE ? OR tags LIKE ? OR author_name LIKE ?)');
      whereParams.push(term, term, term, term);
    }

    const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;
    const orderSQL = sort === 'hot'
      ? 'ORDER BY likes_count DESC, comments_count DESC, id DESC'
      : 'ORDER BY id DESC';

    const rows = await db.all(
      `SELECT * FROM community_posts ${whereSQL} ${orderSQL} LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );
    const total = await db.get(
      `SELECT COUNT(*) as count FROM community_posts ${whereSQL}`,
      whereParams
    );

    res.json({
      data: rows.map(serializePost),
      pagination: {
        total: total?.count || 0,
        page,
        limit,
        totalPages: Math.ceil((total?.count || 0) / limit)
      }
    });
  } catch (error) { next(error); }
};

const getPost = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const post = await db.get('SELECT * FROM community_posts WHERE id = ? AND status = "approved"', [id]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await db.run('UPDATE community_posts SET views_count = COALESCE(views_count, 0) + 1 WHERE id = ?', [id]);
    const updated = await db.get('SELECT * FROM community_posts WHERE id = ?', [id]);
    res.json(serializePost(updated));
  } catch (error) { next(error); }
};

const createPost = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Login required' });
    }

    const section = normalizeSection(req.body.section);
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const tags = parseTags(req.body.tags);
    const contentBlocks = req.body.content_blocks || null;
    const link = req.body.link ? String(req.body.link).trim() : null;
    const deadline = req.body.deadline ? String(req.body.deadline).trim() : null;
    const maxMembersRaw = req.body.max_members;

    if (!section) {
      return res.status(400).json({ error: 'Invalid section' });
    }
    if (title.length < 4) {
      return res.status(400).json({ error: 'Title is too short' });
    }
    if (content.length < 8) {
      return res.status(400).json({ error: 'Content is too short' });
    }

    const user = await db.get('SELECT username, nickname, avatar, role FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const authorName = user.nickname || user.username;
    const status = user.role === 'admin' ? 'approved' : 'pending';
    const postStatus = normalizePostStatus(section, req.body.post_status);
    const maxMembers = section === 'team' && Number.isInteger(Number(maxMembersRaw))
      ? Math.min(Math.max(parseInt(maxMembersRaw, 10), 2), 100)
      : null;
    const currentMembers = section === 'team' ? 1 : 0;
    const result = await db.run(
      `
      INSERT INTO community_posts
      (section, title, content, content_blocks, link, tags, status, post_status, deadline, max_members, current_members, author_id, author_name, author_avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      [section, title, content, contentBlocks, link, tags, status, postStatus, deadline, maxMembers, currentMembers, userId, authorName, user.avatar || null]
    );

    const post = await db.get('SELECT * FROM community_posts WHERE id = ?', [result.lastID]);
    res.status(201).json(serializePost(post));
  } catch (error) { next(error); }
};

const togglePostLike = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Login required' });
    }

    const post = await db.get('SELECT id FROM community_posts WHERE id = ? AND status = "approved"', [id]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // FIX: BUG-21 — Wrap like toggle + count update in transaction for consistency
    const existing = await db.get('SELECT id FROM community_post_likes WHERE post_id = ? AND user_id = ?', [id, userId]);
    let liked = false;
    await db.exec('BEGIN TRANSACTION');
    try {
      if (existing) {
        await db.run('DELETE FROM community_post_likes WHERE id = ?', [existing.id]);
      } else {
        await db.run('INSERT INTO community_post_likes (post_id, user_id) VALUES (?, ?)', [id, userId]);
        liked = true;
      }

      await db.run(
        `
        UPDATE community_posts
        SET likes_count = (SELECT COUNT(*) FROM community_post_likes WHERE post_id = ?),
            updated_at = datetime('now')
        WHERE id = ?
        `,
        [id, id]
      );
      await db.exec('COMMIT');
    } catch (txError) {
      await db.exec('ROLLBACK');
      throw txError;
    }

    const row = await db.get('SELECT likes_count FROM community_posts WHERE id = ?', [id]);
    res.json({ liked, likes_count: row?.likes_count || 0 });
  } catch (error) { next(error); }
};

const listPostComments = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const comments = await db.all(
      `
      SELECT id, resource_type, resource_id, user_id, author, author_name, avatar, content, created_at
      FROM comments
      WHERE resource_id = ? AND resource_type = 'community_post'
      ORDER BY created_at DESC
      `,
      [id]
    );
    const normalized = comments.map((item) => ({
      ...item,
      author: item.author || item.author_name || '匿名用户'
    }));
    res.json(normalized);
  } catch (error) { next(error); }
};

const createPostComment = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Login required' });
    }

    const post = await db.get('SELECT id FROM community_posts WHERE id = ? AND status = "approved"', [id]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const content = String(req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const user = await db.get('SELECT username, nickname, avatar FROM users WHERE id = ?', [userId]);
    const authorName = user?.nickname || user?.username || '匿名用户';

    const result = await db.run(
      `
      INSERT INTO comments (resource_type, resource_id, user_id, author, content, avatar, created_at)
      VALUES ('community_post', ?, ?, ?, ?, ?, datetime('now'))
      `,
      [id, userId, authorName, content, user?.avatar || null]
    );

    await db.run(
      `
      UPDATE community_posts
      SET comments_count = (
        SELECT COUNT(*) FROM comments
        WHERE resource_type = 'community_post' AND resource_id = ?
      ),
      updated_at = datetime('now')
      WHERE id = ?
      `,
      [id, id]
    );

    const newComment = await db.get('SELECT * FROM comments WHERE id = ?', [result.lastID]);
    res.status(201).json({
      ...newComment,
      author: newComment.author || newComment.author_name || authorName
    });
  } catch (error) { next(error); }
};

const searchPosts = async (req, res, next) => {
  try {
    const db = await getDb();
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    const term = `%${q}%`;
    const rows = await db.all(
      `
      SELECT id, title, section, tags, author_name, created_at
      FROM community_posts
      WHERE status = 'approved' AND (title LIKE ? OR content LIKE ? OR tags LIKE ? OR author_name LIKE ?)
      ORDER BY likes_count DESC, id DESC
      LIMIT 10
      `,
      [term, term, term, term]
    );
    res.json(rows);
  } catch (error) { next(error); }
};

const updatePostStatus = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Login required' });
    }

    const status = String(req.body.status || '').trim().toLowerCase();
    const post = await db.get('SELECT * FROM community_posts WHERE id = ? AND status = "approved"', [id]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.section !== 'help' && post.section !== 'team') {
      return res.status(400).json({ error: 'Status update is not supported for this section' });
    }

    const actor = await db.get('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!actor || (actor.role !== 'admin' && post.author_id !== userId)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    if (!validatePostStatus(post.section, status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await db.run(
      'UPDATE community_posts SET post_status = ?, updated_at = datetime("now") WHERE id = ?',
      [status, id]
    );
    const updated = await db.get('SELECT * FROM community_posts WHERE id = ?', [id]);
    res.json(serializePost(updated));
  } catch (error) { next(error); }
};

const joinTeamPost = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Login required' });
    }

    const post = await db.get('SELECT * FROM community_posts WHERE id = ? AND status = "approved"', [id]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (post.section !== 'team') {
      return res.status(400).json({ error: 'This post is not a team post' });
    }
    if (normalizePostStatus(post.section, post.post_status) !== 'recruiting') {
      return res.status(400).json({ error: 'Team is not recruiting' });
    }

    const existed = await db.get(
      'SELECT id FROM community_post_members WHERE post_id = ? AND user_id = ?',
      [id, userId]
    );
    if (existed) {
      return res.status(400).json({ error: 'Already joined' });
    }

    const maxMembers = post.max_members || 0;
    const currentMembers = post.current_members || 0;
    if (maxMembers > 0 && currentMembers >= maxMembers) {
      await db.run('UPDATE community_posts SET post_status = "full", updated_at = datetime("now") WHERE id = ?', [id]);
      return res.status(400).json({ error: 'Team is full' });
    }

    await db.run(
      'INSERT INTO community_post_members (post_id, user_id, created_at) VALUES (?, ?, datetime("now"))',
      [id, userId]
    );

    await db.run(
      `
      UPDATE community_posts
      SET current_members = COALESCE(current_members, 0) + 1,
          post_status = CASE
            WHEN max_members IS NOT NULL AND max_members > 0 AND COALESCE(current_members, 0) + 1 >= max_members THEN 'full'
            ELSE post_status
          END,
          updated_at = datetime('now')
      WHERE id = ?
      `,
      [id]
    );

    const updated = await db.get('SELECT * FROM community_posts WHERE id = ?', [id]);
    res.json(serializePost(updated));
  } catch (error) { next(error); }
};

// --- 4.1 Help: solve with best-answer comment ---
const solvePost = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });

    const commentId = req.body.comment_id;
    const post = await db.get('SELECT * FROM community_posts WHERE id = ? AND status = "approved"', [id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.section !== 'help') return res.status(400).json({ error: 'Only help posts can be solved' });

    const actor = await db.get('SELECT id, role FROM users WHERE id = ?', [userId]);
    if (!actor || (actor.role !== 'admin' && post.author_id !== userId)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (commentId) {
      const comment = await db.get('SELECT id FROM comments WHERE id = ? AND resource_type = "community_post" AND resource_id = ?', [commentId, id]);
      if (!comment) return res.status(404).json({ error: 'Comment not found' });
    }

    await db.run(
      'UPDATE community_posts SET post_status = "solved", solved_comment_id = ?, updated_at = datetime("now") WHERE id = ?',
      [commentId || null, id]
    );
    const updated = await db.get('SELECT * FROM community_posts WHERE id = ?', [id]);
    res.json(serializePost(updated));
  } catch (error) { next(error); }
};

// --- 4.2 Team: leave and members ---
const leaveTeamPost = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });

    const post = await db.get('SELECT * FROM community_posts WHERE id = ? AND status = "approved"', [id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.section !== 'team') return res.status(400).json({ error: 'Not a team post' });
    if (post.author_id === userId) return res.status(400).json({ error: 'Post owner cannot leave' });

    const membership = await db.get('SELECT id FROM community_post_members WHERE post_id = ? AND user_id = ?', [id, userId]);
    if (!membership) return res.status(400).json({ error: 'Not a member' });

    await db.run('DELETE FROM community_post_members WHERE id = ?', [membership.id]);
    await db.run(`
      UPDATE community_posts
      SET current_members = MAX(0, COALESCE(current_members, 1) - 1),
          post_status = CASE WHEN post_status = 'full' THEN 'recruiting' ELSE post_status END,
          updated_at = datetime('now')
      WHERE id = ?
    `, [id]);

    const updated = await db.get('SELECT * FROM community_posts WHERE id = ?', [id]);
    res.json(serializePost(updated));
  } catch (error) { next(error); }
};

const listTeamMembers = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const members = await db.all(`
      SELECT u.id, u.username, u.nickname, u.avatar, cpm.created_at as joined_at
      FROM community_post_members cpm
      JOIN users u ON u.id = cpm.user_id
      WHERE cpm.post_id = ?
      ORDER BY cpm.created_at ASC
    `, [id]);
    res.json(members.map(m => ({
      id: m.id,
      username: m.nickname || m.username,
      avatar: m.avatar,
      joined_at: m.joined_at
    })));
  } catch (error) { next(error); }
};

// --- 4.3 Groups CRUD ---
const listGroups = async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM community_groups ORDER BY id DESC');
    res.json(rows);
  } catch (error) { next(error); }
};

const createGroup = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    const { name, description, platform, qr_code_url, invite_link, member_count, category } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required' });

    const result = await db.run(
      `INSERT INTO community_groups (name, description, platform, qr_code_url, invite_link, member_count, category, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description || '', platform || 'wechat', qr_code_url || null, invite_link || null, member_count || 0, category || null, userId]
    );
    const group = await db.get('SELECT * FROM community_groups WHERE id = ?', [result.lastID]);
    res.status(201).json(group);
  } catch (error) { next(error); }
};

const updateGroup = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    const { id } = req.params;
    const group = await db.get('SELECT * FROM community_groups WHERE id = ?', [id]);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const actor = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    if (!actor || (actor.role !== 'admin' && group.created_by !== userId)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { name, description, platform, qr_code_url, invite_link, member_count, category } = req.body;
    await db.run(
      `UPDATE community_groups SET name=?, description=?, platform=?, qr_code_url=?, invite_link=?, member_count=?, category=?, updated_at=datetime('now') WHERE id=?`,
      [name || group.name, description ?? group.description, platform || group.platform, qr_code_url ?? group.qr_code_url, invite_link ?? group.invite_link, member_count ?? group.member_count, category ?? group.category, id]
    );
    const updated = await db.get('SELECT * FROM community_groups WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) { next(error); }
};

const deleteGroup = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    const { id } = req.params;
    const group = await db.get('SELECT * FROM community_groups WHERE id = ?', [id]);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const actor = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    if (!actor || (actor.role !== 'admin' && group.created_by !== userId)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await db.run('DELETE FROM community_groups WHERE id = ?', [id]);
    res.json({ message: 'Group deleted' });
  } catch (error) { next(error); }
};

// --- 5.1 Admin: community stats ---
const adminCommunityStats = async (req, res, next) => {
  try {
    const db = await getDb();

    const totalPosts = await db.get('SELECT COUNT(*) as count FROM community_posts');
    const pendingPosts = await db.get('SELECT COUNT(*) as count FROM community_posts WHERE status = "pending"');
    const approvedPosts = await db.get('SELECT COUNT(*) as count FROM community_posts WHERE status = "approved"');
    const rejectedPosts = await db.get('SELECT COUNT(*) as count FROM community_posts WHERE status = "rejected"');

    const bySectionRows = await db.all(
      'SELECT section, COUNT(*) as count FROM community_posts GROUP BY section'
    );
    const bySection = {};
    for (const row of bySectionRows) {
      bySection[row.section] = row.count;
    }

    const totalGroups = await db.get('SELECT COUNT(*) as count FROM community_groups');
    const totalComments = await db.get(
      'SELECT COUNT(*) as count FROM comments WHERE resource_type = "community_post"'
    );
    const totalLikes = await db.get('SELECT COUNT(*) as count FROM community_post_likes');

    res.json({
      posts: {
        total: totalPosts?.count || 0,
        pending: pendingPosts?.count || 0,
        approved: approvedPosts?.count || 0,
        rejected: rejectedPosts?.count || 0,
        bySection
      },
      groups: totalGroups?.count || 0,
      comments: totalComments?.count || 0,
      likes: totalLikes?.count || 0
    });
  } catch (error) { next(error); }
};

// --- 5.2 Admin: batch review posts ---
const batchReviewPosts = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });

    const { ids, action } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids must be a non-empty array' });
    }
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const placeholders = ids.map(() => '?').join(',');

    const result = await db.run(
      `UPDATE community_posts SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders}) AND status = 'pending'`,
      [newStatus, ...ids]
    );

    res.json({
      updated: result.changes || 0,
      status: newStatus
    });
  } catch (error) { next(error); }
};

// --- 5.1 Admin: single post review ---
const reviewPost = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    const { id } = req.params;
    const { action, reason } = req.body;

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'action must be "approve" or "reject"' });
    }

    const post = await db.get('SELECT * FROM community_posts WHERE id = ?', [id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await db.run(
      'UPDATE community_posts SET status = ?, updated_at = datetime("now") WHERE id = ?',
      [newStatus, id]
    );

    console.log(JSON.stringify({ action: 'review', postId: id, reviewAction: action, reason: reason || null, userId, timestamp: new Date().toISOString() }));

    const updated = await db.get('SELECT * FROM community_posts WHERE id = ?', [id]);
    res.json(serializePost(updated));
  } catch (error) { next(error); }
};

module.exports = {
  listPosts,
  getPost,
  createPost,
  togglePostLike,
  listPostComments,
  createPostComment,
  searchPosts,
  updatePostStatus,
  joinTeamPost,
  solvePost,
  leaveTeamPost,
  listTeamMembers,
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  adminCommunityStats,
  batchReviewPosts,
  reviewPost
};
