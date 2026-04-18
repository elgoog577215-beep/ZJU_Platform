const { getDb } = require('../config/db');
const { createNotification } = require('./notificationController');
const { normalizeLinkagePayload, serializeLinkageFields, attachLinkedResources } = require('../utils/communityLinks');
const { serializeCommunityPost } = require('../utils/serializeCommunityPost');

const viewerFromReq = (req) => (
  req && req.user && req.user.id != null
    ? { id: req.user.id, role: req.user.role || null }
    : null
);

const ALLOWED_SECTIONS = new Set(['help', 'tech', 'news', 'team', 'groups']);
const ALLOWED_GROUP_PLATFORMS = new Set(['wechat', 'qq', 'discord', 'telegram', 'other']);

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

const sanitizeCommunityText = (input) => {
  if (typeof input !== 'string') return '';
  // Keep text readable while removing executable payloads.
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
};

const reportPostContent = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });

    const post = await db.get('SELECT id, status FROM community_posts WHERE id = ?', [id]);
    if (!post || post.status !== 'approved') {
      return res.status(404).json({ error: 'Post not found' });
    }

    const targetType = String(req.body.target_type || 'post').trim().toLowerCase();
    if (targetType !== 'post' && targetType !== 'comment') {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    let targetCommentId = null;
    if (targetType === 'comment') {
      const parsedCommentId = parseInt(req.body.target_id, 10);
      if (!Number.isInteger(parsedCommentId) || parsedCommentId <= 0) {
        return res.status(400).json({ error: 'Invalid target comment id' });
      }
      const comment = await db.get(
        'SELECT id FROM comments WHERE id = ? AND resource_type = "community_post" AND resource_id = ?',
        [parsedCommentId, id]
      );
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      targetCommentId = parsedCommentId;
    }

    const reason = sanitizeCommunityText(String(req.body.reason || '')).slice(0, 300);
    const duplicate = await db.get(
      `
      SELECT id FROM community_reports
      WHERE post_id = ?
        AND reporter_id = ?
        AND target_type = ?
        AND COALESCE(comment_id, 0) = COALESCE(?, 0)
      `,
      [id, userId, targetType, targetCommentId]
    );
    if (duplicate) {
      return res.status(409).json({ error: 'Already reported' });
    }

    await db.run(
      `
      INSERT INTO community_reports (post_id, comment_id, target_type, reason, reporter_id, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      `,
      [id, targetCommentId, targetType, reason || null, userId]
    );
    res.status(201).json({ success: true });
  } catch (error) { next(error); }
};

const deletePost = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });

    const post = await db.get('SELECT id, author_id, status FROM community_posts WHERE id = ?', [id]);
    if (!post || post.status === 'deleted') {
      return res.status(404).json({ error: 'Post not found' });
    }

    const actor = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    const canDelete = actor?.role === 'admin' || post.author_id === userId;
    if (!canDelete) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await db.run(
      `UPDATE community_posts
       SET status = 'deleted', updated_at = datetime('now')
       WHERE id = ?`,
      [id]
    );
    res.json({ success: true });
  } catch (error) { next(error); }
};

const deletePostComment = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id, commentId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });

    const post = await db.get('SELECT id, author_id, status FROM community_posts WHERE id = ?', [id]);
    if (!post || post.status !== 'approved') {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = await db.get(
      `
      SELECT id, user_id, parent_id
      FROM comments
      WHERE id = ? AND resource_type = 'community_post' AND resource_id = ?
      `,
      [commentId, id]
    );
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const actor = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    const canDelete = actor?.role === 'admin' || comment.user_id === userId || post.author_id === userId;
    if (!canDelete) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    let result;
    if (!comment.parent_id) {
      result = await db.run(
        `
        DELETE FROM comments
        WHERE resource_type = 'community_post'
          AND resource_id = ?
          AND (id = ? OR root_id = ?)
        `,
        [id, comment.id, comment.id]
      );
    } else {
      result = await db.run(
        `
        DELETE FROM comments
        WHERE id = ? AND resource_type = 'community_post' AND resource_id = ?
        `,
        [comment.id, id]
      );
    }

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

    res.json({ success: true, deleted: result?.changes || 0 });
  } catch (error) { next(error); }
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
  return serializeLinkageFields({
    id: row.id,
    section: row.section,
    title: row.title,
    content: row.content,
    tags,
    status: normalizePostStatus(row.section, row.post_status),
    author_id: row.author_id,
    author_name: row.author_name,
    author_avatar: row.author_avatar,
    is_anonymous: row.is_anonymous ? 1 : 0,
    likes_count: row.likes_count || 0,
    comments_count: row.comments_count || 0,
    views_count: row.views_count || 0,
    content_blocks: row.content_blocks || null,
    link: row.link || null,
    deadline: row.deadline || null,
    max_members: row.max_members || null,
    current_members: row.current_members || 0,
    solved_comment_id: row.solved_comment_id || null,
    is_pinned: Boolean(row.is_pinned),
    pin_weight: row.pin_weight || 0,
    last_replied_at: row.last_replied_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    excerpt: row.content ? String(row.content).slice(0, 120) : '',
    related_article_ids: row.related_article_ids,
    related_post_ids: row.related_post_ids,
    related_news_ids: row.related_news_ids,
    related_group_ids: row.related_group_ids,
  });
};

const normalizeHttpUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const normalizeGroupPlatform = (value) => {
  const platform = String(value || '').trim().toLowerCase();
  if (!platform) return 'wechat';
  return ALLOWED_GROUP_PLATFORMS.has(platform) ? platform : null;
};

const normalizeValidUntil = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const deriveExpiredFlag = (validUntil, explicitFlag, fallback = 0) => {
  if (typeof explicitFlag === 'boolean') return explicitFlag ? 1 : 0;
  if (explicitFlag === 1 || explicitFlag === 0) return explicitFlag;
  if (validUntil) {
    const today = new Date().toISOString().slice(0, 10);
    if (validUntil < today) return 1;
  }
  return fallback ? 1 : 0;
};

const serializeGroup = (row) => {
  const validUntil = row.valid_until || null;
  const autoExpired = validUntil ? (validUntil < new Date().toISOString().slice(0, 10) ? 1 : 0) : 0;
  return serializeLinkageFields({
    ...row,
    is_expired: row.is_expired ? 1 : autoExpired,
    review_note: row.review_note || null,
  }, { includePrimaryTags: true });
};

const serializeComment = (row) => ({
  id: row.id,
  resource_type: row.resource_type,
  resource_id: row.resource_id,
  user_id: row.user_id,
  parent_id: row.parent_id || null,
  root_id: row.root_id || null,
  reply_to_comment_id: row.reply_to_comment_id || null,
  floor_number: row.floor_number || null,
  quote_snapshot: (() => {
    if (!row.quote_snapshot) return null;
    try {
      return typeof row.quote_snapshot === 'string'
        ? JSON.parse(row.quote_snapshot)
        : row.quote_snapshot;
    } catch {
      return null;
    }
  })(),
  author: row.author || row.author_name || '匿名用户',
  author_name: row.author || row.author_name || '匿名用户',
  avatar: row.avatar || null,
  content: row.content,
  created_at: row.created_at,
  likes: row.likes || 0,
});

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
      ? 'ORDER BY COALESCE(is_pinned, 0) DESC, COALESCE(pin_weight, 0) DESC, likes_count DESC, comments_count DESC, id DESC'
      : 'ORDER BY COALESCE(is_pinned, 0) DESC, COALESCE(pin_weight, 0) DESC, COALESCE(last_replied_at, created_at) DESC, id DESC';

    const rows = await db.all(
      `SELECT * FROM community_posts ${whereSQL} ${orderSQL} LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );
    const total = await db.get(
      `SELECT COUNT(*) as count FROM community_posts ${whereSQL}`,
      whereParams
    );

    const viewer = viewerFromReq(req);
    res.json({
      data: rows.map((row) => serializePost(serializeCommunityPost(row, viewer))),
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
    const viewer = viewerFromReq(req);
    const serialized = serializePost(serializeCommunityPost(updated, viewer));
    const linked = await attachLinkedResources(db, serialized, { viewer });
    res.json(linked);
  } catch (error) { next(error); }
};

const createPost = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Login required' });
    }

    const mutableBody = { ...req.body };
    normalizeLinkagePayload(mutableBody, { strict: true });
    const section = normalizeSection(mutableBody.section);
    const title = sanitizeCommunityText(String(req.body.title || ''));
    const content = sanitizeCommunityText(String(req.body.content || ''));
    const tags = parseTags(req.body.tags);
    const contentBlocks = mutableBody.content_blocks || null;
    const link = mutableBody.link ? String(mutableBody.link).trim() : null;
    const deadline = mutableBody.deadline ? String(mutableBody.deadline).trim() : null;
    const maxMembersRaw = mutableBody.max_members;

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
    // Anonymous opt-in: only valid for help posts; team section强制实名，忽略字段
    const isAnonymous = section === 'help' && Boolean(req.body.is_anonymous) ? 1 : 0;

    const result = await db.run(
      `
      INSERT INTO community_posts
      (section, title, content, content_blocks, link, tags, status, post_status, deadline, max_members, current_members, author_id, author_name, author_avatar, is_anonymous, related_article_ids, related_post_ids, related_news_ids, related_group_ids, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `,
      [
        section,
        title,
        content,
        contentBlocks,
        link,
        tags,
        status,
        postStatus,
        deadline,
        maxMembers,
        currentMembers,
        userId,
        authorName,
        user.avatar || null,
        isAnonymous,
        mutableBody.related_article_ids || null,
        mutableBody.related_post_ids || null,
        mutableBody.related_news_ids || null,
        mutableBody.related_group_ids || null,
      ]
    );

    if (section === 'team') {
      await db.run(
        'INSERT OR IGNORE INTO community_post_members (post_id, user_id, created_at) VALUES (?, ?, datetime("now"))',
        [result.lastID, userId]
      );
    }

    const post = await db.get('SELECT * FROM community_posts WHERE id = ?', [result.lastID]);
    const viewer = viewerFromReq(req);
    res.status(201).json(serializePost(serializeCommunityPost(post, viewer)));
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

    const post = await db.get(
      'SELECT id, author_id, section, title FROM community_posts WHERE id = ? AND status = "approved"',
      [id]
    );
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
    const sort = String(req.query.sort || 'oldest').trim().toLowerCase();
    const comments = await db.all(
      `
      SELECT id, resource_type, resource_id, user_id, author, author_name, avatar, content, created_at, parent_id, root_id, reply_to_comment_id, floor_number, quote_snapshot, likes
      FROM comments
      WHERE resource_id = ? AND resource_type = 'community_post'
      ORDER BY COALESCE(floor_number, 999999) ASC, created_at ASC
      `,
      [id]
    );
    const normalized = comments.map((item) => ({
      ...item,
      author: item.author || item.author_name || '匿名用户'
    }));
    const floors = normalized
      .filter((item) => !item.parent_id)
      .sort((a, b) => {
        if (sort === 'hot') {
          const likeDiff = (b.likes || 0) - (a.likes || 0);
          if (likeDiff !== 0) return likeDiff;
          return new Date(b.created_at) - new Date(a.created_at);
        }
        if (sort === 'newest') {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        return (a.floor_number || 0) - (b.floor_number || 0);
      });

    const commentById = new Map(normalized.map((item) => [item.id, item]));
    const repliesMap = new Map();
    normalized
      .filter((item) => item.parent_id)
      .forEach((item) => {
        const key = item.root_id || item.parent_id;
        const bucket = repliesMap.get(key) || [];
        bucket.push(item);
        repliesMap.set(key, bucket);
      });
    res.json(
      floors.map((item) => ({
        ...serializeComment(item),
        replies: (repliesMap.get(item.id) || [])
          .sort((a, b) => {
            if (sort === 'hot') {
              const likeDiff = (b.likes || 0) - (a.likes || 0);
              if (likeDiff !== 0) return likeDiff;
              return new Date(b.created_at) - new Date(a.created_at);
            }
            if (sort === 'newest') {
              return new Date(b.created_at) - new Date(a.created_at);
            }
            return new Date(a.created_at) - new Date(b.created_at);
          })
          .map((reply) => {
            const base = serializeComment(reply);
            const replyTarget = reply.reply_to_comment_id ? commentById.get(reply.reply_to_comment_id) : null;
            return {
              ...base,
              reply_to_author: replyTarget ? (replyTarget.author || replyTarget.author_name || '匿名用户') : null,
            };
          }),
      }))
    );
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

    const post = await db.get('SELECT id, author_id, title, section FROM community_posts WHERE id = ? AND status = "approved"', [id]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const content = sanitizeCommunityText(String(req.body.content || ''));
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const user = await db.get('SELECT username, nickname, avatar FROM users WHERE id = ?', [userId]);
    const rawParentId = req.body.parent_id ? parseInt(req.body.parent_id, 10) : null;
    const rawReplyToCommentId = req.body.reply_to_comment_id ? parseInt(req.body.reply_to_comment_id, 10) : null;
    let parentId = Number.isInteger(rawParentId) && rawParentId > 0 ? rawParentId : null;
    let replyToCommentId = Number.isInteger(rawReplyToCommentId) && rawReplyToCommentId > 0 ? rawReplyToCommentId : null;
    let rootId = null;
    let floorNumber = null;
    let quoteSnapshot = null;
    const authorName = user?.nickname || user?.username || '匿名用户';

    let replyTargetUserId = null;
    let replyTargetAuthorName = null;

    if (replyToCommentId) {
      const replyTarget = await db.get(
        'SELECT id, user_id, content, author, author_name, parent_id, root_id FROM comments WHERE id = ? AND resource_type = "community_post" AND resource_id = ?',
        [replyToCommentId, id]
      );
      if (!replyTarget) {
        return res.status(404).json({ error: 'Reply target not found' });
      }
      replyTargetUserId = replyTarget.user_id || null;
      replyTargetAuthorName = replyTarget.author || replyTarget.author_name || '匿名用户';
      quoteSnapshot = JSON.stringify({
        id: replyTarget.id,
        author: replyTarget.author || replyTarget.author_name || '匿名用户',
        content: String(replyTarget.content || '').slice(0, 140)
      });
      if (!parentId) {
        parentId = replyTarget.parent_id
          ? (replyTarget.root_id || replyTarget.parent_id)
          : replyTarget.id;
      }
    }

    if (parentId) {
      const parent = await db.get(
        'SELECT id, parent_id, root_id FROM comments WHERE id = ? AND resource_type = "community_post" AND resource_id = ?',
        [parentId, id]
      );
      if (!parent) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
      // Keep at most 2 levels: any reply to a reply is attached to the root floor.
      const floorRoot = parent.parent_id ? (parent.root_id || parent.parent_id) : parent.id;
      rootId = floorRoot;
      parentId = floorRoot;
      if (!replyToCommentId) {
        replyToCommentId = parent.id;
      }
    } else {
      const floorRow = await db.get(
        'SELECT COALESCE(MAX(floor_number), 0) AS max_floor FROM comments WHERE resource_type = "community_post" AND resource_id = ? AND parent_id IS NULL',
        [id]
      );
      floorNumber = (floorRow?.max_floor || 0) + 1;
    }

    const result = await db.run(
      `
      INSERT INTO comments (resource_type, resource_id, user_id, author, content, avatar, parent_id, root_id, reply_to_comment_id, floor_number, quote_snapshot, created_at)
      VALUES ('community_post', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      [id, userId, authorName, content, user?.avatar || null, parentId, rootId, replyToCommentId, floorNumber, quoteSnapshot]
    );

    await db.run(
      `
      UPDATE community_posts
      SET comments_count = (
        SELECT COUNT(*) FROM comments
        WHERE resource_type = 'community_post' AND resource_id = ?
      ),
      last_replied_at = datetime('now'),
      updated_at = datetime('now')
      WHERE id = ?
      `,
      [id, id]
    );

    const newComment = await db.get('SELECT * FROM comments WHERE id = ?', [result.lastID]);

    if (post.author_id && String(post.author_id) !== String(userId)) {
      await createNotification(
        post.author_id,
        'comment',
        `${authorName} 评论了你的帖子《${post.title || '社区帖子'}》`,
        id,
        `community_post:${post.section || 'help'}`
      );
    }

    if (
      replyTargetUserId &&
      String(replyTargetUserId) !== String(userId) &&
      String(replyTargetUserId) !== String(post.author_id)
    ) {
      await createNotification(
        replyTargetUserId,
        'reply',
        `${authorName} 回复了你在《${post.title || '社区帖子'}》中的评论`,
        id,
        `community_post:${post.section || 'help'}`
      );
    }

    res.status(201).json(serializeComment(newComment));
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
      SELECT id, title, section, tags, author_id, author_name, author_avatar, is_anonymous, created_at
      FROM community_posts
      WHERE status = 'approved' AND (title LIKE ? OR content LIKE ? OR tags LIKE ? OR author_name LIKE ?)
      ORDER BY likes_count DESC, id DESC
      LIMIT 10
      `,
      [term, term, term, term]
    );
    const viewer = viewerFromReq(req);
    res.json(rows.map((row) => serializeCommunityPost(row, viewer)));
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
    const viewer = viewerFromReq(req);
    res.json(serializePost(serializeCommunityPost(updated, viewer)));
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
    const viewer = viewerFromReq(req);
    res.json(serializePost(serializeCommunityPost(updated, viewer)));
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
    const viewer = viewerFromReq(req);
    res.json(serializePost(serializeCommunityPost(updated, viewer)));
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
    const viewer = viewerFromReq(req);
    res.json(serializePost(serializeCommunityPost(updated, viewer)));
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
    const requestedReviewStatus = String(req.query.review_status || 'approved').trim().toLowerCase();
    const actor = req.user?.id
      ? await db.get('SELECT role FROM users WHERE id = ?', [req.user.id])
      : null;
    const reviewStatus = actor?.role === 'admin'
      ? requestedReviewStatus
      : 'approved';
    const params = [];
    let where = '';
    if (reviewStatus !== 'all') {
      where = 'WHERE review_status = ?';
      params.push(reviewStatus);
    }
    const rows = await db.all(`SELECT * FROM community_groups ${where} ORDER BY is_recommended DESC, sort_order DESC, id DESC`, params);
    res.json(rows.map(serializeGroup));
  } catch (error) { next(error); }
};

const updatePost = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Login required' });
    }

    const existing = await db.get('SELECT * FROM community_posts WHERE id = ?', [id]);
    if (!existing || existing.status === 'deleted') {
      return res.status(404).json({ error: 'Post not found' });
    }
    const actor = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    if (!actor || (actor.role !== 'admin' && existing.author_id !== userId)) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const mutableBody = { ...req.body };
    normalizeLinkagePayload(mutableBody, { strict: true });
    const title = mutableBody.title !== undefined
      ? sanitizeCommunityText(String(mutableBody.title || ''))
      : existing.title;
    const content = mutableBody.content !== undefined
      ? sanitizeCommunityText(String(mutableBody.content || ''))
      : existing.content;
    const tags = mutableBody.tags !== undefined ? parseTags(mutableBody.tags) : existing.tags;
    const postStatus = mutableBody.post_status
      ? String(mutableBody.post_status || '').trim().toLowerCase()
      : normalizePostStatus(existing.section, existing.post_status);
    if (!validatePostStatus(existing.section, postStatus)) {
      return res.status(400).json({ error: 'Invalid post_status' });
    }
    if (!title || title.length < 4) {
      return res.status(400).json({ error: 'Title is too short' });
    }
    if (!content || content.length < 8) {
      return res.status(400).json({ error: 'Content is too short' });
    }

    await db.run(
      `
      UPDATE community_posts
      SET title = ?, content = ?, content_blocks = ?, link = ?, tags = ?, post_status = ?, deadline = ?, max_members = ?,
          related_article_ids = ?, related_post_ids = ?, related_news_ids = ?, related_group_ids = ?,
          updated_at = datetime('now')
      WHERE id = ?
      `,
      [
        title,
        content,
        mutableBody.content_blocks ?? existing.content_blocks ?? null,
        mutableBody.link ?? existing.link ?? null,
        tags,
        postStatus,
        mutableBody.deadline ?? existing.deadline ?? null,
        mutableBody.max_members ?? existing.max_members ?? null,
        mutableBody.related_article_ids ?? existing.related_article_ids ?? null,
        mutableBody.related_post_ids ?? existing.related_post_ids ?? null,
        mutableBody.related_news_ids ?? existing.related_news_ids ?? null,
        mutableBody.related_group_ids ?? existing.related_group_ids ?? null,
        id,
      ]
    );

    const updated = await db.get('SELECT * FROM community_posts WHERE id = ?', [id]);
    const viewer = viewerFromReq(req);
    res.json(serializePost(serializeCommunityPost(updated, viewer)));
  } catch (error) { next(error); }
};

const getGroup = async (req, res, next) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const actor = req.user?.id
      ? await db.get('SELECT role FROM users WHERE id = ?', [req.user.id])
      : null;
    const row = await db.get('SELECT * FROM community_groups WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Group not found' });
    if (row.review_status !== 'approved' && actor?.role !== 'admin' && row.created_by !== req.user?.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    const viewer = viewerFromReq(req);
    const linked = await attachLinkedResources(db, serializeGroup(row), { includePrimaryTags: true, viewer });
    res.json(linked);
  } catch (error) { next(error); }
};

const createGroup = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });
    const mutableBody = { ...req.body };
    normalizeLinkagePayload(mutableBody, { includePrimaryTags: true, strict: true });
    const { name, description, platform, qr_code_url, invite_link, member_count, category, valid_until, is_recommended, sort_order, is_expired, review_note, primary_tags, related_article_ids, related_post_ids, related_news_ids, related_group_ids } = mutableBody;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Group name is required' });
    const actor = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    const reviewStatus = actor?.role === 'admin' ? 'approved' : 'pending';
    const normalizedPlatform = normalizeGroupPlatform(platform);
    const normalizedQr = normalizeHttpUrl(qr_code_url);
    const normalizedInvite = normalizeHttpUrl(invite_link);
    const normalizedValidUntil = normalizeValidUntil(valid_until);
    if (!normalizedPlatform) return res.status(400).json({ error: 'Invalid platform type' });
    if (qr_code_url && !normalizedQr) return res.status(400).json({ error: 'Invalid QR code URL' });
    if (invite_link && !normalizedInvite) return res.status(400).json({ error: 'Invalid invite link URL' });
    if (valid_until && !normalizedValidUntil) return res.status(400).json({ error: 'Invalid valid_until date' });
    const adminMode = actor?.role === 'admin';
    const expiredFlag = deriveExpiredFlag(normalizedValidUntil, adminMode ? is_expired : undefined, 0);

    const result = await db.run(
      `INSERT INTO community_groups (name, description, platform, qr_code_url, invite_link, member_count, category, created_by, review_status, valid_until, is_recommended, sort_order, is_expired, review_note, primary_tags, related_article_ids, related_post_ids, related_news_ids, related_group_ids)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description || '',
        normalizedPlatform,
        normalizedQr,
        normalizedInvite,
        member_count || 0,
        category || null,
        userId,
        reviewStatus,
        normalizedValidUntil,
        adminMode && is_recommended ? 1 : 0,
        adminMode ? (sort_order || 0) : 0,
        expiredFlag,
        adminMode ? (review_note || null) : null,
        primary_tags || null,
        related_article_ids || null,
        related_post_ids || null,
        related_news_ids || null,
        related_group_ids || null,
      ]
    );
    const group = await db.get('SELECT * FROM community_groups WHERE id = ?', [result.lastID]);
    res.status(201).json(serializeGroup(group));
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

    const mutableBody = { ...req.body };
    normalizeLinkagePayload(mutableBody, { includePrimaryTags: true, strict: true });
    const { name, description, platform, qr_code_url, invite_link, member_count, category, review_status, valid_until, is_recommended, sort_order, is_expired, review_note, primary_tags, related_article_ids, related_post_ids, related_news_ids, related_group_ids } = mutableBody;
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    const normalizedPlatform = platform !== undefined ? normalizeGroupPlatform(platform) : group.platform;
    const normalizedQr = qr_code_url !== undefined ? normalizeHttpUrl(qr_code_url) : group.qr_code_url;
    const normalizedInvite = invite_link !== undefined ? normalizeHttpUrl(invite_link) : group.invite_link;
    const normalizedValidUntil = valid_until !== undefined ? normalizeValidUntil(valid_until) : group.valid_until;
    if (!normalizedPlatform) return res.status(400).json({ error: 'Invalid platform type' });
    if (qr_code_url !== undefined && qr_code_url && !normalizedQr) return res.status(400).json({ error: 'Invalid QR code URL' });
    if (invite_link !== undefined && invite_link && !normalizedInvite) return res.status(400).json({ error: 'Invalid invite link URL' });
    if (valid_until !== undefined && valid_until && !normalizedValidUntil) return res.status(400).json({ error: 'Invalid valid_until date' });
    const expiredFlag = deriveExpiredFlag(normalizedValidUntil, actor.role === 'admin' ? is_expired : undefined, group.is_expired);
    await db.run(
      `UPDATE community_groups SET name=?, description=?, platform=?, qr_code_url=?, invite_link=?, member_count=?, category=?, review_status=?, valid_until=?, is_recommended=?, sort_order=?, is_expired=?, review_note=?, primary_tags=?, related_article_ids=?, related_post_ids=?, related_news_ids=?, related_group_ids=?, updated_at=datetime('now') WHERE id=?`,
      [
        name !== undefined ? String(name).trim() : group.name,
        description ?? group.description,
        normalizedPlatform,
        normalizedQr,
        normalizedInvite,
        member_count ?? group.member_count,
        category ?? group.category,
        actor.role === 'admin' ? (review_status || group.review_status || 'approved') : group.review_status,
        normalizedValidUntil,
        typeof is_recommended === 'boolean' ? (is_recommended ? 1 : 0) : group.is_recommended,
        sort_order ?? group.sort_order,
        expiredFlag,
        actor.role === 'admin' ? (review_note ?? group.review_note ?? null) : (group.review_note ?? null),
        primary_tags ?? group.primary_tags ?? null,
        related_article_ids ?? group.related_article_ids ?? null,
        related_post_ids ?? group.related_post_ids ?? null,
        related_news_ids ?? group.related_news_ids ?? null,
        related_group_ids ?? group.related_group_ids ?? null,
        id
      ]
    );
    const updated = await db.get('SELECT * FROM community_groups WHERE id = ?', [id]);
    res.json(serializeGroup(updated));
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
    const viewer = viewerFromReq(req);
    res.json(serializePost(serializeCommunityPost(updated, viewer)));
  } catch (error) { next(error); }
};

const trackCommunityMetric = async (req, res, next) => {
  try {
    const db = await getDb();
    const userId = req.user?.id || null;
    const {
      metric_type,
      source_type = null,
      source_id = null,
      target_type = null,
      target_id = null,
    } = req.body || {};

    const allowedTypes = new Set([
      'article_view',
      'article_share',
      'news_to_article_click',
      'article_to_group_click',
    ]);
    if (!allowedTypes.has(metric_type)) {
      return res.status(400).json({ error: 'Unsupported metric_type' });
    }

    await db.run(
      `INSERT INTO community_metrics_events
       (metric_type, source_type, source_id, target_type, target_id, actor_id, date_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        metric_type,
        source_type,
        source_id ? Number(source_id) : null,
        target_type,
        target_id ? Number(target_id) : null,
        userId,
        new Date().toISOString().slice(0, 10),
      ],
    );
    res.status(204).send();
  } catch (error) { next(error); }
};

const adminCommunityMetrics = async (req, res, next) => {
  try {
    const db = await getDb();
    const days = Math.min(Math.max(parseInt(req.query.days || '30', 10) || 30, 1), 90);
    const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);

    const metricRows = await db.all(
      `SELECT metric_type, COUNT(*) as count
       FROM community_metrics_events
       WHERE date_key >= ?
       GROUP BY metric_type`,
      [since]
    );

    const dailyRows = await db.all(
      `SELECT date_key, metric_type, COUNT(*) as count
       FROM community_metrics_events
       WHERE date_key >= ?
       GROUP BY date_key, metric_type
       ORDER BY date_key ASC`,
      [since]
    );

    const summary = {
      article_view: 0,
      article_share: 0,
      news_to_article_click: 0,
      article_to_group_click: 0,
    };
    for (const row of metricRows) {
      if (summary[row.metric_type] !== undefined) {
        summary[row.metric_type] = row.count || 0;
      }
    }

    res.json({
      range_days: days,
      since,
      summary,
      daily: dailyRows,
    });
  } catch (error) { next(error); }
};

module.exports = {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  reportPostContent,
  togglePostLike,
  listPostComments,
  createPostComment,
  deletePostComment,
  searchPosts,
  updatePostStatus,
  joinTeamPost,
  solvePost,
  leaveTeamPost,
  listTeamMembers,
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  adminCommunityStats,
  adminCommunityMetrics,
  trackCommunityMetric,
  batchReviewPosts,
  reviewPost
};
