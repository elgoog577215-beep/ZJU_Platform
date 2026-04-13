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
    status: row.status,
    author_id: row.author_id,
    author_name: row.author_name,
    author_avatar: row.author_avatar,
    likes_count: row.likes_count || 0,
    comments_count: row.comments_count || 0,
    views_count: row.views_count || 0,
    content_blocks: row.content_blocks || null,
    link: row.link || null,
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
    const q = String(req.query.search || '').trim();
    const sort = String(req.query.sort || 'newest');

    const whereClauses = ['status = "approved"'];
    const whereParams = [];

    if (section) {
      whereClauses.push('section = ?');
      whereParams.push(section);
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
    const result = await db.run(
      `
      INSERT INTO community_posts
      (section, title, content, content_blocks, link, tags, status, author_id, author_name, author_avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      [section, title, content, contentBlocks, link, tags, status, userId, authorName, user.avatar || null]
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

module.exports = {
  listPosts,
  getPost,
  createPost,
  togglePostLike,
  listPostComments,
  createPostComment,
  searchPosts
};
