const LINKAGE_ID_FIELDS = [
  'related_article_ids',
  'related_post_ids',
  'related_news_ids',
  'related_group_ids',
];

const MAX_LINKED_IDS = 12;
const MAX_PRIMARY_TAGS = 12;

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const parseRawIdTokens = (value, { strict = false, fieldName = 'linkage ids' } = {}) => {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') {
    if (strict) throw createValidationError(`Invalid ${fieldName}: must be an array or comma-separated string`);
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (strict) throw createValidationError(`Invalid ${fieldName}: JSON value must be an array`);
    return [];
  } catch (_error) {
    return trimmed.split(/[,\s]+/).filter(Boolean);
  }
};

const normalizeIdArray = (value, { strict = false, fieldName = 'linkage ids' } = {}) => {
  const raw = parseRawIdTokens(value, { strict, fieldName });
  const invalidItems = [];
  const ids = [...new Set(raw
    .map((item) => Number.parseInt(item, 10))
    .filter((item, index) => {
      const valid = Number.isInteger(item) && item > 0;
      if (!valid && strict) invalidItems.push(raw[index]);
      return valid;
    }))]
    .slice(0, MAX_LINKED_IDS);
  if (strict && invalidItems.length > 0) {
    throw createValidationError(`Invalid ${fieldName}: contains non-numeric IDs`);
  }

  return ids.length > 0 ? JSON.stringify(ids) : null;
};

const parseIdArray = (value) => {
  if (!value) return [];

  const raw = (() => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch (_error) {
        return value.split(/[,\s]+/);
      }
    }
    return [];
  })();

  return [...new Set(raw
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isInteger(item) && item > 0))]
    .slice(0, MAX_LINKED_IDS);
};

const normalizePrimaryTags = (value, { strict = false } = {}) => {
  if (value == null || value === '') return null;
  if (!Array.isArray(value) && typeof value !== 'string') {
    if (strict) throw createValidationError('Invalid primary_tags: must be an array or comma-separated string');
    return null;
  }
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,\n]+/)
      : [];

  const tags = [...new Set(raw
    .map((item) => String(item || '').trim())
    .filter(Boolean))]
    .slice(0, MAX_PRIMARY_TAGS);

  return tags.length > 0 ? tags.join(',') : null;
};

const parsePrimaryTags = (value) => {
  if (!value) return [];
  return [...new Set(String(value)
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean))]
    .slice(0, MAX_PRIMARY_TAGS);
};

const normalizeLinkagePayload = (body = {}, { includePrimaryTags = false, strict = false } = {}) => {
  if (!body || typeof body !== 'object') return body;
  LINKAGE_ID_FIELDS.forEach((field) => {
    if (field in body) {
      body[field] = normalizeIdArray(body[field], { strict, fieldName: field });
    }
  });
  if (includePrimaryTags && 'primary_tags' in body) {
    body.primary_tags = normalizePrimaryTags(body.primary_tags, { strict });
  }
  return body;
};

const serializeLinkageFields = (item = {}, { includePrimaryTags = false } = {}) => {
  const normalized = { ...item };
  LINKAGE_ID_FIELDS.forEach((field) => {
    normalized[field] = parseIdArray(item[field]);
  });
  if (includePrimaryTags) {
    normalized.primary_tags = parsePrimaryTags(item.primary_tags);
  }
  return normalized;
};

const buildInClause = (ids = []) => ids.map(() => '?').join(',');

const fetchSummaryRows = async (db, table, ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];

  if (table === 'articles') {
    return db.all(
      `
      SELECT id, title, excerpt, cover, tags, category, featured, views_count, created_at
      FROM articles
      WHERE id IN (${buildInClause(ids)}) AND status = 'approved' AND deleted_at IS NULL
      `,
      ids
    );
  }

  if (table === 'community_posts') {
    return db.all(
      `
      SELECT id, section, title, content, tags, post_status, author_id, author_name, author_avatar, is_anonymous, created_at
      FROM community_posts
      WHERE id IN (${buildInClause(ids)}) AND status = 'approved'
      `,
      ids
    );
  }

  if (table === 'news') {
    return db.all(
      `
      SELECT id, title, excerpt, cover, source_name, featured, hot_score, created_at
      FROM news
      WHERE id IN (${buildInClause(ids)}) AND status = 'approved' AND deleted_at IS NULL
      `,
      ids
    );
  }

  if (table === 'community_groups') {
    return db.all(
      `
      SELECT id, name, description, platform, category, is_recommended, primary_tags
      FROM community_groups
      WHERE id IN (${buildInClause(ids)}) AND review_status = 'approved'
      `,
      ids
    );
  }

  return [];
};

const mapRowsById = (rows = []) => {
  const map = new Map();
  rows.forEach((row) => map.set(row.id, row));
  return map;
};

const orderRowsByIds = (rows = [], ids = [], transform = (row) => row) => {
  const rowMap = mapRowsById(rows);
  return ids
    .map((id) => rowMap.get(id))
    .filter(Boolean)
    .map(transform);
};

const serializeArticleSummary = (row) => ({
  id: row.id,
  type: 'article',
  title: row.title,
  excerpt: row.excerpt || '',
  cover: row.cover || null,
  tags: row.tags
    ? String(row.tags).split(',').map((tag) => tag.trim()).filter(Boolean)
    : [],
  category: row.category || 'tech',
  featured: Boolean(row.featured),
  views_count: row.views_count || 0,
  created_at: row.created_at || null,
});

// Lazy-require to avoid circular dep risk; helper is pure so require-at-use is fine
const { serializeCommunityPost } = require('./serializeCommunityPost');

const serializePostSummary = (row, viewer = null) => {
  const redacted = serializeCommunityPost(row, viewer);
  return {
    id: redacted.id,
    type: 'post',
    section: redacted.section,
    title: redacted.title,
    excerpt: redacted.content ? String(redacted.content).slice(0, 120) : '',
    tags: redacted.tags
      ? String(redacted.tags).split(',').map((tag) => tag.trim()).filter(Boolean)
      : [],
    post_status: redacted.post_status || null,
    author_id: redacted.author_id != null ? redacted.author_id : null,
    author_name: redacted.author_name || null,
    author_avatar: redacted.author_avatar || null,
    is_anonymous: redacted.is_anonymous ? 1 : 0,
    created_at: redacted.created_at || null,
  };
};

const serializeNewsSummary = (row) => ({
  id: row.id,
  type: 'news',
  title: row.title,
  excerpt: row.excerpt || '',
  cover: row.cover || null,
  source_name: row.source_name || null,
  featured: Boolean(row.featured),
  hot_score: row.hot_score || 0,
  created_at: row.created_at || null,
});

const serializeGroupSummary = (row) => ({
  id: row.id,
  type: 'group',
  name: row.name,
  description: row.description || '',
  platform: row.platform || 'wechat',
  category: row.category || null,
  is_recommended: Boolean(row.is_recommended),
  primary_tags: parsePrimaryTags(row.primary_tags),
});

const attachLinkedResources = async (db, item, { includePrimaryTags = false, viewer = null } = {}) => {
  if (!item) return item;

  const normalized = serializeLinkageFields(item, { includePrimaryTags });
  const articleIds = normalized.related_article_ids || [];
  const postIds = normalized.related_post_ids || [];
  const newsIds = normalized.related_news_ids || [];
  const groupIds = normalized.related_group_ids || [];

  const [articleRows, postRows, newsRows, groupRows] = await Promise.all([
    fetchSummaryRows(db, 'articles', articleIds),
    fetchSummaryRows(db, 'community_posts', postIds),
    fetchSummaryRows(db, 'news', newsIds),
    fetchSummaryRows(db, 'community_groups', groupIds),
  ]);

  return {
    ...normalized,
    linked_resources: {
      articles: orderRowsByIds(articleRows, articleIds, serializeArticleSummary),
      posts: orderRowsByIds(postRows, postIds, (row) => serializePostSummary(row, viewer)),
      news: orderRowsByIds(newsRows, newsIds, serializeNewsSummary),
      groups: orderRowsByIds(groupRows, groupIds, serializeGroupSummary),
    },
  };
};

module.exports = {
  LINKAGE_ID_FIELDS,
  normalizeIdArray,
  parseIdArray,
  normalizePrimaryTags,
  parsePrimaryTags,
  normalizeLinkagePayload,
  serializeLinkageFields,
  attachLinkedResources,
};
