const crypto = require('crypto');
const {
  getCategoryLabel,
  normalizeEventCategory,
} = require('./eventIntelligenceService');

const INDEX_VERSION = 1;
const VECTOR_DIMENSIONS = 64;
const DEFAULT_REFRESH_LIMIT = 280;
const DEFAULT_SEARCH_LIMIT = 12;

// This is a lightweight hashed token vector for local ranking only. It is not
// a model embedding and should not be described as semantic vector search.

const RESOURCE_TYPE_GROUPS = {
  event: 'events',
  article: 'community',
  post: 'community',
  group: 'community',
  news: 'community',
  photo: 'media',
  video: 'media',
};

const RESOURCE_TYPE_LABELS = {
  event: '活动',
  article: 'AI 社区文章',
  post: 'AI 社区帖子',
  group: 'AI 社区社群',
  news: 'AI 社区新闻',
  photo: '照片',
  video: '视频',
};

const GROUP_TYPES = {
  events: ['event'],
  community: ['article', 'post', 'group', 'news'],
  media: ['photo', 'video'],
};

const SECTION_LABELS = {
  help: '求助',
  team: '组队',
  tech: '技术分享',
  news: '新闻',
  groups: '社群',
};

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '有', '和', '与', '或', '及', '等', '这', '那',
  '一个', '这个', '那个', '什么', '怎么', '如何', '哪些', '哪个', '可以',
  '没有', '已经', '搜索', '查找', '找找', '全站', '资源', '活动', '社区',
  '文章', '帖子', '社群', '影像', '影像库', '图片', '照片', '视频',
]);

const clamp = (value, min = 0, max = 1) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
};

const normalizeLimit = (value, fallback = DEFAULT_REFRESH_LIMIT, max = 2000) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return fallback;
  return Math.min(number, max);
};

const toText = (value, maxLength = 800) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

const safeJsonParse = (value, fallback = null) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const collectJsonText = (value, output = []) => {
  if (value === null || value === undefined) return output;
  if (typeof value === 'string' || typeof value === 'number') {
    const text = toText(value, 600);
    if (text && !/^https?:\/\//i.test(text)) output.push(text);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectJsonText(item, output));
    return output;
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (/url|href|src|image|avatar|cover/i.test(key)) return;
      collectJsonText(item, output);
    });
  }
  return output;
};

const textFromBlocks = (value, maxLength = 1800) => {
  const parsed = safeJsonParse(value, null);
  if (!parsed) return '';
  return toText(collectJsonText(parsed).join(' '), maxLength);
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  const parsed = safeJsonParse(value, null);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') return collectJsonText(parsed);
  return String(value || '').split(/[,，、;；\s/|#]+/);
};

const uniqueTextArray = (value, maxItems = 16, itemMaxLength = 80) => {
  const items = Array.isArray(value) ? value : asArray(value);
  return [...new Set(
    items
      .map((item) => toText(item, itemMaxLength))
      .filter(Boolean)
  )].slice(0, maxItems);
};

const flattenFacetValues = (facets = {}) => Object.values(facets)
  .flatMap((value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return value ? [value] : [];
  })
  .flatMap((value) => (Array.isArray(value) ? value : [value]))
  .map((value) => toText(value, 80))
  .filter(Boolean);

const extractTokens = (text) => {
  const normalized = toText(text, 8000).toLowerCase();
  const tokens = [];
  const english = normalized.match(/[a-z0-9][a-z0-9_-]{1,30}/g) || [];
  english.forEach((token) => {
    if (!STOP_WORDS.has(token)) tokens.push(token);
  });

  const chineseSegments = normalized.match(/[\u4e00-\u9fff]{2,18}/g) || [];
  chineseSegments.forEach((segment) => {
    const chars = Array.from(segment);
    if (chars.length <= 8 && !STOP_WORDS.has(segment)) tokens.push(segment);
    for (const size of [2, 3]) {
      if (chars.length < size) continue;
      for (let index = 0; index <= chars.length - size; index += 1) {
        const token = chars.slice(index, index + size).join('');
        if (!STOP_WORDS.has(token)) tokens.push(token);
      }
    }
  });

  return tokens;
};

const tokenizeSearchText = (text) => [...new Set(extractTokens(text))].slice(0, 80);

const stableHashInt = (value) => crypto
  .createHash('sha256')
  .update(String(value))
  .digest()
  .readUInt32BE(0);

const buildLocalTokenVector = (text) => {
  const counts = new Map();
  extractTokens(text).forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });

  const vector = Array.from({ length: VECTOR_DIMENSIONS }, () => 0);
  counts.forEach((count, token) => {
    const index = stableHashInt(token) % VECTOR_DIMENSIONS;
    vector[index] += 1 + Math.log(count);
  });

  const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0));
  if (!norm) return vector;
  return vector.map((item) => Number((item / norm).toFixed(6)));
};

const parseVector = (value) => {
  const parsed = safeJsonParse(value, []);
  return Array.isArray(parsed) ? parsed.map((item) => Number(item) || 0) : [];
};

const cosineSimilarity = (left = [], right = []) => {
  const length = Math.min(left.length, right.length);
  if (!length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < length; index += 1) {
    const leftValue = Number(left[index]) || 0;
    const rightValue = Number(right[index]) || 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }
  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
};

const safeAll = async (db, sql, params = []) => {
  try {
    return await db.all(sql, params);
  } catch {
    return [];
  }
};

const safeGet = async (db, sql, params = []) => {
  try {
    return await db.get(sql, params);
  } catch {
    return null;
  }
};

const firstSuccessfulAll = async (db, candidates = []) => {
  let lastRows = [];
  for (const candidate of candidates) {
    try {
      const rows = await db.all(candidate.sql, candidate.params || []);
      lastRows = rows;
      if (rows.length > 0) return rows;
    } catch {
      // Older databases may not have the newest media category table.
    }
  }
  return lastRows;
};

const normalizeResourceTypes = (types) => {
  const rawItems = Array.isArray(types)
    ? types
    : String(types || '').split(',');
  const selected = new Set();
  rawItems
    .map((item) => String(item).trim())
    .filter(Boolean)
    .forEach((item) => {
      if (GROUP_TYPES[item]) {
        GROUP_TYPES[item].forEach((type) => selected.add(type));
      } else if (item === 'events') {
        selected.add('event');
      } else if (item === 'community') {
        GROUP_TYPES.community.forEach((type) => selected.add(type));
      } else if (item === 'media') {
        GROUP_TYPES.media.forEach((type) => selected.add(type));
      } else if (RESOURCE_TYPE_GROUPS[item]) {
        selected.add(item);
      }
    });

  return selected.size ? [...selected] : Object.keys(RESOURCE_TYPE_GROUPS);
};

const buildSourceHash = (resource) => crypto
  .createHash('sha256')
  .update([
    `resource-search-index:v${INDEX_VERSION}`,
    resource.resource_type,
    resource.id,
    resource.title,
    resource.description,
    resource.excerpt,
    resource.content,
    resource.content_blocks,
    resource.tags,
    resource.category,
    resource.category_name,
    resource.section,
    resource.platform,
    resource.primary_tags,
    resource.gameType,
    resource.gameDescription,
    resource.profile_source_hash,
    resource.profile_summary,
    resource.profile_topic_terms,
    resource.profile_benefit_terms,
    resource.profile_campus_terms,
    resource.profile_audience_terms,
    resource.profile_organizer_terms,
  ].map((item) => toText(item, 5000)).join('\n'))
  .digest('hex');

const getTopTokens = (text, maxItems = 14) => {
  const counts = new Map();
  extractTokens(text).forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([token]) => token)
    .filter((token) => token.length >= 2)
    .slice(0, maxItems);
};

const buildEventIndexPayload = (resource) => {
  const profileTopics = uniqueTextArray(resource.profile_topic_terms, 12);
  const profileBenefits = uniqueTextArray(resource.profile_benefit_terms, 8);
  const profileCampuses = uniqueTextArray(resource.profile_campus_terms, 8);
  const profileAudiences = uniqueTextArray(resource.profile_audience_terms, 8);
  const profileOrganizers = uniqueTextArray(resource.profile_organizer_terms, 8);
  const category = normalizeEventCategory(resource.profile_category || resource.category) || toText(resource.category, 60);
  const categoryLabel = getCategoryLabel(category) || category;
  const contentText = [
    resource.title,
    resource.description,
    resource.content,
    resource.tags,
    resource.location,
    resource.organizer,
    resource.target_audience,
    resource.score,
    resource.volunteer_time,
    resource.profile_summary,
    profileTopics.join(' '),
    profileBenefits.join(' '),
  ].map((item) => toText(item, 3000)).filter(Boolean).join('\n');
  const facets = {
    categories: uniqueTextArray([category], 4),
    categoryLabels: uniqueTextArray([categoryLabel], 4),
    topics: uniqueTextArray([...profileTopics, resource.tags, categoryLabel], 16),
    benefits: profileBenefits,
    campuses: profileCampuses,
    audiences: profileAudiences,
    organizers: uniqueTextArray([...profileOrganizers, resource.organizer], 8),
    resourceType: 'event',
  };
  return {
    title: toText(resource.title, 180) || '未命名活动',
    summary: toText(resource.profile_summary || resource.description || resource.content || resource.title, 260),
    contentText,
    imageUrl: toText(resource.image_url, 500),
    resourceDate: resource.date || resource.created_at || '',
    facets,
    keywordTerms: uniqueTextArray([
      ...flattenFacetValues(facets),
      ...getTopTokens(contentText, 16),
    ], 24),
    popularityScore: Number(resource.views || 0) + Number(resource.likes || 0),
    qualityScore: clamp(0.45 + (resource.profile_summary ? 0.2 : 0) + (profileTopics.length ? 0.15 : 0), 0.3, 0.95),
  };
};

const buildCommunityIndexPayload = (resource) => {
  const blockText = textFromBlocks(resource.content_blocks);
  const contentText = [
    resource.title,
    resource.excerpt,
    resource.description,
    resource.content,
    blockText,
    resource.tags,
    resource.primary_tags,
    resource.category,
    resource.section,
    resource.platform,
    resource.author_name,
    resource.source_name,
  ].map((item) => toText(item, 3000)).filter(Boolean).join('\n');
  const section = resource.resource_type === 'post'
    ? toText(resource.section || 'help', 40)
    : resource.resource_type === 'group'
      ? 'groups'
      : 'tech';
  const facets = {
    sections: uniqueTextArray([section, SECTION_LABELS[section]], 4),
    categories: uniqueTextArray([resource.category], 8),
    topics: uniqueTextArray([resource.tags, resource.primary_tags, resource.category, resource.title], 16),
    authors: uniqueTextArray([resource.author_name, resource.source_name], 6),
    platforms: uniqueTextArray([resource.platform], 4),
    resourceType: resource.resource_type,
  };
  return {
    title: toText(resource.title || resource.name, 180) || RESOURCE_TYPE_LABELS[resource.resource_type],
    summary: toText(resource.excerpt || resource.description || resource.content || blockText, 260),
    contentText,
    imageUrl: toText(resource.image_url, 500),
    resourceDate: resource.created_at || resource.date || resource.updated_at || '',
    facets,
    keywordTerms: uniqueTextArray([
      ...flattenFacetValues(facets),
      ...getTopTokens(contentText, 16),
    ], 24),
    popularityScore: Number(resource.likes || resource.likes_count || 0)
      + Number(resource.comments_count || 0)
      + Number(resource.views_count || resource.hot_score || 0),
    qualityScore: clamp(0.42 + (resource.excerpt || resource.description ? 0.12 : 0) + (resource.tags || resource.primary_tags ? 0.1 : 0), 0.3, 0.9),
  };
};

const buildMediaIndexPayload = (resource) => {
  const mediaType = resource.resource_type;
  const contentText = [
    resource.title,
    resource.tags,
    resource.category,
    resource.category_name,
    resource.gameType,
    resource.gameDescription,
  ].map((item) => toText(item, 1200)).filter(Boolean).join('\n');
  const facets = {
    mediaTypes: uniqueTextArray([mediaType, RESOURCE_TYPE_LABELS[mediaType]], 4),
    categories: uniqueTextArray([resource.category_name, resource.category], 8),
    topics: uniqueTextArray([resource.tags, resource.gameType, resource.gameDescription], 14),
    resourceType: mediaType,
  };
  return {
    title: toText(resource.title, 180) || (mediaType === 'video' ? '未命名视频' : '未命名照片'),
    summary: toText(resource.tags || resource.gameDescription || resource.category_name || resource.category, 260),
    contentText,
    imageUrl: toText(resource.image_url, 500),
    resourceDate: resource.created_at || '',
    facets,
    keywordTerms: uniqueTextArray([
      ...flattenFacetValues(facets),
      ...getTopTokens(contentText, 16),
    ], 24),
    popularityScore: Number(resource.likes || 0),
    qualityScore: clamp(0.4 + (resource.tags ? 0.1 : 0) + (resource.gameDescription ? 0.1 : 0), 0.3, 0.85),
  };
};

const buildResourceIndexRow = (resource) => {
  const groupKey = RESOURCE_TYPE_GROUPS[resource.resource_type];
  if (!groupKey) throw new Error(`Unsupported resource type: ${resource.resource_type}`);

  const payload = groupKey === 'events'
    ? buildEventIndexPayload(resource)
    : groupKey === 'community'
      ? buildCommunityIndexPayload(resource)
      : buildMediaIndexPayload(resource);
  const embeddingText = [
    payload.title,
    payload.summary,
    payload.keywordTerms.join(' '),
    flattenFacetValues(payload.facets).join(' '),
    payload.contentText,
  ].filter(Boolean).join('\n');

  return {
    resource_type: resource.resource_type,
    resource_id: Number(resource.id),
    group_key: groupKey,
    source_hash: buildSourceHash(resource),
    title: payload.title,
    summary: payload.summary,
    content_text: toText(payload.contentText, 5000),
    image_url: payload.imageUrl,
    resource_date: toText(payload.resourceDate, 80),
    keyword_terms: JSON.stringify(payload.keywordTerms),
    facet_json: JSON.stringify(payload.facets),
    embedding_text: toText(embeddingText, 6000),
    vector_json: JSON.stringify(buildLocalTokenVector(embeddingText)),
    quality_score: payload.qualityScore,
    popularity_score: payload.popularityScore,
    status: 'ready',
    last_error: '',
    source_updated_at: toText(resource.updated_at || resource.created_at || resource.date, 80),
  };
};

const loadIndexableResources = async (db, options = {}) => {
  const limit = normalizeLimit(options.limit, DEFAULT_REFRESH_LIMIT);
  const types = new Set(normalizeResourceTypes(options.types));
  const tasks = [];

  if (types.has('event')) {
    tasks.push(safeAll(db, `
      SELECT
        'event' AS resource_type,
        e.id,
        e.title,
        e.date,
        e.end_date,
        e.location,
        e.category,
        e.tags,
        e.image AS image_url,
        e.description,
        e.content,
        e.organizer,
        e.target_audience,
        e.score,
        e.volunteer_time,
        e.views,
        e.likes,
        e.created_at,
        p.source_hash AS profile_source_hash,
        p.summary AS profile_summary,
        p.category AS profile_category,
        p.topic_terms AS profile_topic_terms,
        p.benefit_terms AS profile_benefit_terms,
        p.campus_terms AS profile_campus_terms,
        p.audience_terms AS profile_audience_terms,
        p.organizer_terms AS profile_organizer_terms
      FROM events e
      LEFT JOIN event_ai_profiles p ON p.event_id = e.id
      WHERE e.deleted_at IS NULL
        AND e.status = 'approved'
      ORDER BY COALESCE(e.created_at, e.date) DESC, e.id DESC
      LIMIT ?
    `, [limit]));
  }

  if (types.has('article')) {
    tasks.push(safeAll(db, `
      SELECT
        'article' AS resource_type,
        a.id,
        a.title,
        a.excerpt,
        a.content,
        a.content_blocks,
        a.cover AS image_url,
        a.category,
        a.tags,
        a.date,
        a.created_at,
        a.likes,
        a.views_count,
        COALESCE(u.nickname, u.username) AS author_name
      FROM articles a
      LEFT JOIN users u ON a.uploader_id = u.id
      WHERE a.deleted_at IS NULL
        AND a.status = 'approved'
      ORDER BY COALESCE(a.created_at, a.date) DESC, a.id DESC
      LIMIT ?
    `, [limit]));
  }

  if (types.has('post')) {
    tasks.push(safeAll(db, `
      SELECT
        'post' AS resource_type,
        p.id,
        p.title,
        p.content,
        p.content_blocks,
        p.tags,
        p.section,
        p.author_name,
        p.likes_count,
        p.comments_count,
        p.views_count,
        p.created_at,
        p.updated_at
      FROM community_posts p
      WHERE p.status = 'approved'
      ORDER BY COALESCE(p.updated_at, p.created_at) DESC, p.id DESC
      LIMIT ?
    `, [limit]));
  }

  if (types.has('group')) {
    tasks.push(safeAll(db, `
      SELECT
        'group' AS resource_type,
        g.id,
        g.name AS title,
        g.description,
        g.platform,
        g.category,
        g.primary_tags,
        g.member_count,
        g.is_recommended,
        g.created_at,
        g.updated_at
      FROM community_groups g
      WHERE g.review_status = 'approved'
        AND COALESCE(g.is_expired, 0) = 0
      ORDER BY COALESCE(g.updated_at, g.created_at) DESC, g.id DESC
      LIMIT ?
    `, [limit]));
  }

  if (types.has('news')) {
    tasks.push(safeAll(db, `
      SELECT
        'news' AS resource_type,
        n.id,
        n.title,
        n.excerpt,
        n.content,
        n.content_blocks,
        n.cover AS image_url,
        n.source_name,
        n.hot_score,
        n.created_at,
        n.updated_at
      FROM news n
      WHERE n.deleted_at IS NULL
        AND n.status = 'approved'
      ORDER BY COALESCE(n.updated_at, n.created_at) DESC, n.id DESC
      LIMIT ?
    `, [limit]));
  }

  if (types.has('photo')) {
    tasks.push(firstSuccessfulAll(db, [
      {
        sql: `
          SELECT
            'photo' AS resource_type,
            p.id,
            p.title,
            p.url AS image_url,
            p.category,
            mc.name AS category_name,
            p.tags,
            p.gameType,
            p.gameDescription,
            p.likes,
            p.created_at
          FROM photos p
          LEFT JOIN media_categories mc ON p.category_id = mc.id
          WHERE p.deleted_at IS NULL
            AND p.status = 'approved'
          ORDER BY COALESCE(p.created_at, '') DESC, p.id DESC
          LIMIT ?
        `,
        params: [limit],
      },
      {
        sql: `
          SELECT
            'photo' AS resource_type,
            p.id,
            p.title,
            p.url AS image_url,
            p.category,
            pc.name AS category_name,
            p.tags,
            p.gameType,
            p.gameDescription,
            p.likes,
            p.created_at
          FROM photos p
          LEFT JOIN photo_categories pc ON p.category_id = pc.id
          WHERE p.deleted_at IS NULL
            AND p.status = 'approved'
          ORDER BY COALESCE(p.created_at, '') DESC, p.id DESC
          LIMIT ?
        `,
        params: [limit],
      },
      {
        sql: `
          SELECT
            'photo' AS resource_type,
            p.id,
            p.title,
            p.url AS image_url,
            p.category,
            NULL AS category_name,
            p.tags,
            p.gameType,
            p.gameDescription,
            p.likes,
            p.created_at
          FROM photos p
          WHERE p.deleted_at IS NULL
            AND p.status = 'approved'
          ORDER BY COALESCE(p.created_at, '') DESC, p.id DESC
          LIMIT ?
        `,
        params: [limit],
      },
    ]));
  }

  if (types.has('video')) {
    tasks.push(firstSuccessfulAll(db, [
      {
        sql: `
          SELECT
            'video' AS resource_type,
            v.id,
            v.title,
            v.thumbnail AS image_url,
            v.category,
            mc.name AS category_name,
            v.tags,
            v.gameType,
            v.gameDescription,
            v.likes,
            v.created_at
          FROM videos v
          LEFT JOIN media_categories mc ON v.category_id = mc.id
          WHERE v.deleted_at IS NULL
            AND v.status = 'approved'
          ORDER BY COALESCE(v.created_at, '') DESC, v.id DESC
          LIMIT ?
        `,
        params: [limit],
      },
      {
        sql: `
          SELECT
            'video' AS resource_type,
            v.id,
            v.title,
            v.thumbnail AS image_url,
            v.category,
            vc.name AS category_name,
            v.tags,
            v.gameType,
            v.gameDescription,
            v.likes,
            v.created_at
          FROM videos v
          LEFT JOIN video_categories vc ON v.category_id = vc.id
          WHERE v.deleted_at IS NULL
            AND v.status = 'approved'
          ORDER BY COALESCE(v.created_at, '') DESC, v.id DESC
          LIMIT ?
        `,
        params: [limit],
      },
      {
        sql: `
          SELECT
            'video' AS resource_type,
            v.id,
            v.title,
            v.thumbnail AS image_url,
            v.category,
            NULL AS category_name,
            v.tags,
            v.gameType,
            v.gameDescription,
            v.likes,
            v.created_at
          FROM videos v
          WHERE v.deleted_at IS NULL
            AND v.status = 'approved'
          ORDER BY COALESCE(v.created_at, '') DESC, v.id DESC
          LIMIT ?
        `,
        params: [limit],
      },
    ]));
  }

  const rows = (await Promise.all(tasks)).flat();
  return rows
    .filter((row) => row && RESOURCE_TYPE_GROUPS[row.resource_type]);
};

const upsertResourceIndex = async (db, row) => {
  await db.run(
    `
      INSERT INTO resource_search_index (
        resource_type,
        resource_id,
        group_key,
        source_hash,
        title,
        summary,
        content_text,
        image_url,
        resource_date,
        keyword_terms,
        facet_json,
        embedding_text,
        vector_json,
        quality_score,
        popularity_score,
        status,
        last_error,
        source_updated_at,
        indexed_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(resource_type, resource_id) DO UPDATE SET
        group_key = excluded.group_key,
        source_hash = excluded.source_hash,
        title = excluded.title,
        summary = excluded.summary,
        content_text = excluded.content_text,
        image_url = excluded.image_url,
        resource_date = excluded.resource_date,
        keyword_terms = excluded.keyword_terms,
        facet_json = excluded.facet_json,
        embedding_text = excluded.embedding_text,
        vector_json = excluded.vector_json,
        quality_score = excluded.quality_score,
        popularity_score = excluded.popularity_score,
        status = excluded.status,
        last_error = excluded.last_error,
        source_updated_at = excluded.source_updated_at,
        indexed_at = excluded.indexed_at,
        updated_at = datetime('now')
    `,
    [
      row.resource_type,
      row.resource_id,
      row.group_key,
      row.source_hash,
      row.title,
      row.summary,
      row.content_text,
      row.image_url,
      row.resource_date,
      row.keyword_terms,
      row.facet_json,
      row.embedding_text,
      row.vector_json,
      row.quality_score,
      row.popularity_score,
      row.status,
      row.last_error,
      row.source_updated_at,
    ]
  );
};

const loadExistingIndexRows = async (db, types) => {
  const selectedTypes = normalizeResourceTypes(types);
  const placeholders = selectedTypes.map(() => '?').join(', ');
  const rows = await safeAll(
    db,
    `SELECT resource_type, resource_id, source_hash FROM resource_search_index WHERE resource_type IN (${placeholders})`,
    selectedTypes
  );
  return new Map(rows.map((row) => [`${row.resource_type}:${row.resource_id}`, row]));
};

const deleteUnavailable = async (db, resourceType, tableName, alias, publicWhere) => {
  try {
    const result = await db.run(`
      DELETE FROM resource_search_index
      WHERE resource_type = ?
        AND NOT EXISTS (
          SELECT 1
          FROM ${tableName} ${alias}
          WHERE ${alias}.id = resource_search_index.resource_id
            AND ${publicWhere}
        )
    `, [resourceType]);
    return Number(result.changes || 0);
  } catch {
    return 0;
  }
};

const pruneUnavailableResources = async (db, types) => {
  const selectedTypes = new Set(normalizeResourceTypes(types));
  let pruned = 0;
  if (selectedTypes.has('event')) {
    pruned += await deleteUnavailable(db, 'event', 'events', 'e', "e.deleted_at IS NULL AND e.status = 'approved'");
  }
  if (selectedTypes.has('article')) {
    pruned += await deleteUnavailable(db, 'article', 'articles', 'a', "a.deleted_at IS NULL AND a.status = 'approved'");
  }
  if (selectedTypes.has('post')) {
    pruned += await deleteUnavailable(db, 'post', 'community_posts', 'p', "p.status = 'approved'");
  }
  if (selectedTypes.has('group')) {
    pruned += await deleteUnavailable(db, 'group', 'community_groups', 'g', "g.review_status = 'approved' AND COALESCE(g.is_expired, 0) = 0");
  }
  if (selectedTypes.has('news')) {
    pruned += await deleteUnavailable(db, 'news', 'news', 'n', "n.deleted_at IS NULL AND n.status = 'approved'");
  }
  if (selectedTypes.has('photo')) {
    pruned += await deleteUnavailable(db, 'photo', 'photos', 'p', "p.deleted_at IS NULL AND p.status = 'approved'");
  }
  if (selectedTypes.has('video')) {
    pruned += await deleteUnavailable(db, 'video', 'videos', 'v', "v.deleted_at IS NULL AND v.status = 'approved'");
  }
  return pruned;
};

const countPublicResourcesByType = async (db) => {
  const entries = await Promise.all([
    ['event', safeGet(db, "SELECT COUNT(*) AS count FROM events WHERE deleted_at IS NULL AND status = 'approved'")],
    ['article', safeGet(db, "SELECT COUNT(*) AS count FROM articles WHERE deleted_at IS NULL AND status = 'approved'")],
    ['post', safeGet(db, "SELECT COUNT(*) AS count FROM community_posts WHERE status = 'approved'")],
    ['group', safeGet(db, "SELECT COUNT(*) AS count FROM community_groups WHERE review_status = 'approved' AND COALESCE(is_expired, 0) = 0")],
    ['news', safeGet(db, "SELECT COUNT(*) AS count FROM news WHERE deleted_at IS NULL AND status = 'approved'")],
    ['photo', safeGet(db, "SELECT COUNT(*) AS count FROM photos WHERE deleted_at IS NULL AND status = 'approved'")],
    ['video', safeGet(db, "SELECT COUNT(*) AS count FROM videos WHERE deleted_at IS NULL AND status = 'approved'")],
  ].map(async ([type, promise]) => [type, Number((await promise)?.count || 0)]));
  return Object.fromEntries(entries);
};

const getResourceSearchIndexCoverage = async (db) => {
  const [publicCounts, indexRows] = await Promise.all([
    countPublicResourcesByType(db),
    safeAll(db, `
      SELECT resource_type, group_key, status, COUNT(*) AS count
      FROM resource_search_index
      GROUP BY resource_type, group_key, status
    `),
  ]);

  const byType = {};
  const byGroup = {};
  for (const type of Object.keys(RESOURCE_TYPE_GROUPS)) {
    byType[type] = {
      publicCount: publicCounts[type] || 0,
      indexedCount: 0,
      readyCount: 0,
      failedCount: 0,
    };
  }

  indexRows.forEach((row) => {
    if (!byType[row.resource_type]) {
      byType[row.resource_type] = {
        publicCount: 0,
        indexedCount: 0,
        readyCount: 0,
        failedCount: 0,
      };
    }
    const count = Number(row.count || 0);
    byType[row.resource_type].indexedCount += count;
    if (row.status === 'ready') byType[row.resource_type].readyCount += count;
    if (row.status !== 'ready') byType[row.resource_type].failedCount += count;

    const group = row.group_key || RESOURCE_TYPE_GROUPS[row.resource_type] || 'unknown';
    if (!byGroup[group]) byGroup[group] = { indexedCount: 0, readyCount: 0 };
    byGroup[group].indexedCount += count;
    if (row.status === 'ready') byGroup[group].readyCount += count;
  });

  const publicResourceCount = Object.values(publicCounts).reduce((sum, count) => sum + count, 0);
  const indexedCount = Object.values(byType).reduce((sum, item) => sum + item.indexedCount, 0);
  const readyCount = Object.values(byType).reduce((sum, item) => sum + item.readyCount, 0);

  return {
    publicResourceCount,
    indexedCount,
    readyCount,
    missingCount: Math.max(publicResourceCount - readyCount, 0),
    coverageRatio: publicResourceCount > 0 ? Math.min(readyCount / publicResourceCount, 1) : 0,
    byType,
    byGroup,
  };
};

const recordResourceIndexRefreshRun = async (db, summary = {}) => {
  try {
    const result = await db.run(
      `
        INSERT INTO ai_assistant_runs (
          module,
          action,
          status,
          requested_by,
          summary_json
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        'global_search_index',
        'refresh',
        summary.status || 'completed',
        summary.userId || null,
        JSON.stringify(summary),
      ]
    );
    return result.lastID;
  } catch {
    return null;
  }
};

const refreshResourceSearchIndex = async (db, options = {}) => {
  const limit = normalizeLimit(options.limit, DEFAULT_REFRESH_LIMIT);
  const types = normalizeResourceTypes(options.types);
  const force = Boolean(options.force);
  const pruned = await pruneUnavailableResources(db, types);
  const [resources, existingMap] = await Promise.all([
    loadIndexableResources(db, { limit, types }),
    loadExistingIndexRows(db, types),
  ]);

  const summary = {
    requested: resources.length,
    indexed: 0,
    skipped: 0,
    failed: 0,
    pruned,
    status: 'completed',
    indexVersion: INDEX_VERSION,
    types,
    userId: options.userId || null,
  };

  for (const resource of resources) {
    try {
      const row = buildResourceIndexRow(resource);
      const existing = existingMap.get(`${row.resource_type}:${row.resource_id}`);
      if (!force && existing?.source_hash === row.source_hash) {
        summary.skipped += 1;
        continue;
      }
      await upsertResourceIndex(db, row);
      summary.indexed += 1;
    } catch (error) {
      summary.failed += 1;
    }
  }

  if (summary.failed > 0) summary.status = 'completed_with_warnings';
  const coverage = await getResourceSearchIndexCoverage(db);
  summary.coverageRatio = coverage.coverageRatio;
  summary.readyCount = coverage.readyCount;
  summary.publicResourceCount = coverage.publicResourceCount;
  summary.missingCount = coverage.missingCount;
  const runId = await recordResourceIndexRefreshRun(db, summary);

  return {
    runId,
    summary,
    coverage,
  };
};

const buildGroupFilter = (groups = []) => {
  const normalized = uniqueTextArray(groups, 3).filter((group) => ['events', 'community', 'media'].includes(group));
  if (!normalized.length) return { sql: '', params: [] };
  return {
    sql: `AND i.group_key IN (${normalized.map(() => '?').join(', ')})`,
    params: normalized,
  };
};

const loadSearchableIndexRows = async (db, groups = [], limit = 500) => {
  const groupFilter = buildGroupFilter(groups);
  const selects = [
    {
      sql: `SELECT i.* FROM resource_search_index i JOIN events e ON e.id = i.resource_id WHERE i.resource_type = 'event' AND i.status = 'ready' AND e.deleted_at IS NULL AND e.status = 'approved' ${groupFilter.sql}`,
      params: groupFilter.params,
    },
    {
      sql: `SELECT i.* FROM resource_search_index i JOIN articles a ON a.id = i.resource_id WHERE i.resource_type = 'article' AND i.status = 'ready' AND a.deleted_at IS NULL AND a.status = 'approved' ${groupFilter.sql}`,
      params: groupFilter.params,
    },
    {
      sql: `SELECT i.* FROM resource_search_index i JOIN community_posts p ON p.id = i.resource_id WHERE i.resource_type = 'post' AND i.status = 'ready' AND p.status = 'approved' ${groupFilter.sql}`,
      params: groupFilter.params,
    },
    {
      sql: `SELECT i.* FROM resource_search_index i JOIN community_groups g ON g.id = i.resource_id WHERE i.resource_type = 'group' AND i.status = 'ready' AND g.review_status = 'approved' AND COALESCE(g.is_expired, 0) = 0 ${groupFilter.sql}`,
      params: groupFilter.params,
    },
    {
      sql: `SELECT i.* FROM resource_search_index i JOIN news n ON n.id = i.resource_id WHERE i.resource_type = 'news' AND i.status = 'ready' AND n.deleted_at IS NULL AND n.status = 'approved' ${groupFilter.sql}`,
      params: groupFilter.params,
    },
    {
      sql: `SELECT i.* FROM resource_search_index i JOIN photos p ON p.id = i.resource_id WHERE i.resource_type = 'photo' AND i.status = 'ready' AND p.deleted_at IS NULL AND p.status = 'approved' ${groupFilter.sql}`,
      params: groupFilter.params,
    },
    {
      sql: `SELECT i.* FROM resource_search_index i JOIN videos v ON v.id = i.resource_id WHERE i.resource_type = 'video' AND i.status = 'ready' AND v.deleted_at IS NULL AND v.status = 'approved' ${groupFilter.sql}`,
      params: groupFilter.params,
    },
  ];
  const sql = `
    SELECT *
    FROM (
      ${selects.map((select) => select.sql).join('\nUNION ALL\n')}
    )
    ORDER BY quality_score DESC, popularity_score DESC, updated_at DESC
    LIMIT ?
  `;
  const params = selects.flatMap((select) => select.params).concat([normalizeLimit(limit, 500, 2000)]);
  return safeAll(db, sql, params);
};

const intersects = (left = [], right = []) => {
  const rightSet = new Set(right.map((item) => String(item).toLowerCase()));
  return left.some((item) => rightSet.has(String(item).toLowerCase()));
};

const containsAny = (text, terms = []) => {
  const haystack = String(text || '').toLowerCase();
  return terms.some((term) => haystack.includes(String(term || '').toLowerCase()));
};

const isDateWithinRange = (dateText, range) => {
  if (!dateText || !range) return true;
  const date = String(dateText).slice(0, 10);
  return date >= range.start.slice(0, 10) && date <= range.end.slice(0, 10);
};

const scoreIndexRow = (row, parsed, queryVector) => {
  const facets = safeJsonParse(row.facet_json, {}) || {};
  const keywords = uniqueTextArray(row.keyword_terms, 30);
  const facetValues = flattenFacetValues(facets);
  const searchableText = [
    row.title,
    row.summary,
    row.content_text,
    keywords.join(' '),
    facetValues.join(' '),
  ].join(' ').toLowerCase();
  const reasons = [];
  let score = Number(row.quality_score || 0) * 1.5;

  if (parsed.timeRange && row.resource_type === 'event' && !isDateWithinRange(row.resource_date, parsed.timeRange)) {
    return null;
  }
  if (
    parsed.mediaTypes?.length
    && ['photo', 'video'].includes(row.resource_type)
    && !parsed.mediaTypes.includes(row.resource_type)
  ) {
    return null;
  }

  if (parsed.query && containsAny(`${row.title} ${row.summary}`, [parsed.query])) {
    score += 8;
    reasons.push('索引标题/摘要匹配');
  }

  const keywordHits = (parsed.keywords || []).filter((keyword) => (
    containsAny(searchableText, [keyword]) || intersects([keyword], keywords)
  ));
  if (keywordHits.length) {
    score += keywordHits.length * 2.5;
    reasons.push(`索引关键词：${keywordHits.slice(0, 3).join('、')}`);
  }

  if (parsed.categories?.length) {
    const categories = [
      ...uniqueTextArray(facets.categories, 8),
      ...uniqueTextArray(facets.categoryLabels, 8),
    ];
    const matched = parsed.categories.filter((category) => (
      intersects([category, getCategoryLabel(category)], categories)
      || containsAny(searchableText, [category, getCategoryLabel(category)])
    ));
    if (matched.length) {
      score += matched.length * 3.5;
      reasons.push(`索引分类：${matched.map((item) => getCategoryLabel(item) || item).slice(0, 2).join('、')}`);
    }
  }

  const campusHits = (parsed.campuses || []).filter((campus) => containsAny(searchableText, [campus]));
  if (campusHits.length) {
    score += campusHits.length * 2.5;
    reasons.push(`索引校区：${campusHits.slice(0, 2).join('、')}`);
  }

  const audienceHits = (parsed.audiences || []).filter((audience) => containsAny(searchableText, [audience]));
  if (audienceHits.length) {
    score += audienceHits.length * 2.2;
    reasons.push(`索引对象：${audienceHits.slice(0, 2).join('、')}`);
  }

  const benefitHits = (parsed.benefits || []).filter((benefit) => containsAny(searchableText, [benefit]));
  if (benefitHits.length) {
    score += benefitHits.length * 2.2;
    reasons.push(`索引收益：${benefitHits.slice(0, 2).join('、')}`);
  }

  const vectorScore = cosineSimilarity(queryVector, parseVector(row.vector_json));
  if (vectorScore >= 0.08) {
    score += vectorScore * 7;
    reasons.push(`索引向量相似：${Math.round(vectorScore * 100)}%`);
  }

  if (parsed.modules?.includes(row.group_key)) {
    score += 1;
    reasons.push('模块意图匹配');
  }

  score += Math.log1p(Number(row.popularity_score || 0)) * 0.25;
  const hasStrongIntent = Boolean(
    parsed.keywords?.length
    || parsed.categories?.length
    || parsed.campuses?.length
    || parsed.audiences?.length
    || parsed.benefits?.length
    || parsed.mediaTypes?.length
  );
  const threshold = hasStrongIntent ? 1.25 : 0.4;
  if (score < threshold) return null;

  return {
    ...row,
    facets,
    keywords,
    searchScore: Number(score.toFixed(4)),
    matchReasons: reasons.length ? reasons : ['结构化索引补充'],
  };
};

const searchResourceIndex = async (db, parsed, options = {}) => {
  if (!parsed?.query || parsed.query.length < 2) return [];
  const selectedGroups = parsed.modules?.length ? parsed.modules : [];
  const rows = await loadSearchableIndexRows(
    db,
    selectedGroups,
    options.poolLimit || 500
  );
  if (!rows.length) return [];

  const queryText = [
    parsed.query,
    ...(parsed.keywords || []),
    ...(parsed.categories || []).flatMap((category) => [category, getCategoryLabel(category)]),
    ...(parsed.campuses || []),
    ...(parsed.audiences || []),
    ...(parsed.benefits || []),
    ...(parsed.mediaTypes || []),
  ].filter(Boolean).join(' ');
  const queryVector = buildLocalTokenVector(queryText);

  return rows
    .map((row) => scoreIndexRow(row, parsed, queryVector))
    .filter(Boolean)
    .sort((left, right) => right.searchScore - left.searchScore || Number(right.popularity_score || 0) - Number(left.popularity_score || 0))
    .slice(0, normalizeLimit(options.limit, DEFAULT_SEARCH_LIMIT, 80));
};

module.exports = {
  INDEX_VERSION,
  RESOURCE_TYPE_GROUPS,
  RESOURCE_TYPE_LABELS,
  buildLocalTokenVector,
  buildResourceIndexRow,
  getResourceSearchIndexCoverage,
  loadIndexableResources,
  refreshResourceSearchIndex,
  searchResourceIndex,
  tokenizeSearchText,
};
