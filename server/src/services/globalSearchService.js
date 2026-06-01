const {
  normalizeEventCategory,
  getCategoryLabel,
} = require('./eventIntelligenceService');

const MAX_QUERY_LENGTH = 160;
const DEFAULT_LIMITS = {
  events: 8,
  community: 8,
  media: 8,
};

const SECTION_LABELS = {
  help: '求助',
  team: '组队',
  tech: '技术分享',
  news: '新闻',
  groups: '社群',
};

const RESULT_TYPE_LABELS = {
  event: '活动',
  article: 'AI 社区文章',
  post: 'AI 社区帖子',
  group: 'AI 社区社群',
  news: 'AI 社区新闻',
  photo: '照片',
  video: '视频',
};

const CATEGORY_KEYWORDS = {
  lecture: ['讲座', '报告', '论坛', '沙龙', '分享会', '学术', '科研', '宣讲'],
  competition: ['竞赛', '比赛', '大赛', '挑战赛', '黑客松', 'hackathon', '路演'],
  volunteer: ['志愿', '公益', '支教', '义工', '社会实践', '志愿者'],
  recruitment: ['招新', '纳新', '招聘', '实习', '招募', '求职', '职业'],
  culture_sports: ['音乐', '歌手', '演出', '文艺', '体育', '展览', '晚会', '电影'],
  exchange: ['交流', '交换', '访学', '留学', '国际', '校友'],
};

const CAMPUS_KEYWORDS = {
  紫金港: ['紫金港', 'zijingang', 'zjg'],
  玉泉: ['玉泉', 'yuquan'],
  西溪: ['西溪', 'xixi'],
  华家池: ['华家池', 'huajiachi'],
  之江: ['之江', 'zhijiang'],
  舟山: ['舟山', 'zhoushan'],
  海宁: ['海宁', 'haining'],
};

const AUDIENCE_KEYWORDS = {
  全校: ['全校', '全体学生', '全校师生', '所有学生'],
  本科生: ['本科生', '本科'],
  研究生: ['研究生', '硕士', '博士', '硕博'],
  新生: ['新生', '大一', '新同学'],
  开发者: ['开发者', '程序员', '编程', '技术'],
};

const BENEFIT_KEYWORDS = {
  score: ['综素', '综素分', '综测', '综合测评', '第二课堂', '二课', '加分', '学分'],
  volunteer_time: ['志愿时长', '志愿工时', '工时', '公益时长'],
  certificate: ['证书', '证明', '获奖'],
  prize: ['奖金', '奖品', '奖励'],
};

const MODULE_KEYWORDS = {
  events: ['活动', '讲座', '比赛', '竞赛', '志愿', '报名', '招新', '展览', '演出'],
  community: ['社区', '文章', '帖子', '求助', '组队', '社群', '二维码', '技术分享', '经验'],
  media: ['影像', '图片', '照片', '视频', '相册', '画廊', '图库'],
};

const MEDIA_TYPE_KEYWORDS = {
  photo: ['照片', '图片', '相册', '图像', '摄影'],
  video: ['视频', '录像', '影像', '回放'],
};

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '有', '和', '与', '或', '及', '等', '这', '那',
  '什么', '怎么', '如何', '哪些', '哪个', '可以', '没有', '已经', '还',
  '适合', '最近', '一个', '这个', '那个', '不', '都', '就', '也', '很',
  '吗', '呢', '吧', '啊', '哦', '对', '从', '到', '让', '把', '给', '为',
  '搜索', '查找', '找找', '找一下', '看看', '有关', '相关', '全站',
  '活动', '社区', 'ai社区', '文章', '帖子', '求助', '组队',
  '社群', '二维码', '影像', '影像库', '图片', '照片', '视频', '相册',
  '画廊', '图库', '资源',
]);

const sanitizeText = (value, maxLength = 500) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const unique = (items) => [...new Set(items.map((item) => sanitizeText(item, 80)).filter(Boolean))];

const includesAny = (text, words = []) => {
  const haystack = String(text || '').toLowerCase();
  return words.some((word) => haystack.includes(String(word).toLowerCase()));
};

const buildLike = (value) => `%${sanitizeText(value, 80)}%`;

const safeAll = async (db, sql, params = []) => {
  try {
    return await db.all(sql, params);
  } catch {
    return [];
  }
};

const getWeekRange = (now, offset = 0) => {
  const currentDay = now.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const start = new Date(now);
  start.setDate(now.getDate() + distanceToMonday + offset * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString(), label: offset === 0 ? '本周' : '下周' };
};

const getWeekendRange = (now) => {
  const currentDay = now.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const start = new Date(now);
  start.setDate(now.getDate() + distanceToMonday + 5);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString(), label: '周末' };
};

const parseTimeRange = (query, now = new Date()) => {
  if (query.includes('今天')) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: '今天' };
  }
  if (query.includes('明天')) {
    const start = new Date(now);
    start.setDate(now.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: '明天' };
  }
  if (query.includes('后天')) {
    const start = new Date(now);
    start.setDate(now.getDate() + 2);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: '后天' };
  }
  if (query.includes('这周') || query.includes('本周')) return getWeekRange(now, 0);
  if (query.includes('下周')) return getWeekRange(now, 1);
  if (query.includes('周末')) return getWeekendRange(now);
  if (query.includes('这个月') || query.includes('本月')) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString(), label: '本月' };
  }
  return null;
};

const detectMapValues = (query, dictionary) => Object.entries(dictionary)
  .filter(([, aliases]) => includesAny(query, aliases))
  .map(([value]) => value);

const extractKeywords = (query) => {
  const cnWords = query.match(/[\u4e00-\u9fff]{2,8}/g) || [];
  const enWords = query.match(/[a-zA-Z][a-zA-Z0-9_-]{1,24}/g) || [];
  return unique([...cnWords, ...enWords])
    .filter((word) => !STOP_WORDS.has(word) && !STOP_WORDS.has(word.toLowerCase()))
    .slice(0, 10);
};

const parseGlobalSearchQuery = (query, options = {}) => {
  const normalizedQuery = sanitizeText(query, MAX_QUERY_LENGTH);
  const lowered = normalizedQuery.toLowerCase();
  const detectedCategories = detectMapValues(lowered, CATEGORY_KEYWORDS);
  const normalizedCategory = normalizeEventCategory(normalizedQuery);
  const categories = unique([normalizedCategory, ...detectedCategories]).slice(0, 3);
  const modules = unique(Object.entries(MODULE_KEYWORDS)
    .filter(([, aliases]) => includesAny(lowered, aliases))
    .map(([key]) => key));
  const mediaTypes = unique(Object.entries(MEDIA_TYPE_KEYWORDS)
    .filter(([, aliases]) => includesAny(lowered, aliases))
    .map(([key]) => key));
  const benefits = unique(Object.entries(BENEFIT_KEYWORDS)
    .filter(([, aliases]) => includesAny(lowered, aliases))
    .map(([key]) => key));
  const sortBy = includesAny(lowered, ['最热', '热门', '浏览多', '点赞多'])
    ? 'hot'
    : includesAny(lowered, ['最近', '近期', '最新'])
      ? 'recent'
      : 'relevance';

  return {
    query: normalizedQuery,
    modules,
    categories,
    campuses: detectMapValues(lowered, CAMPUS_KEYWORDS),
    audiences: detectMapValues(lowered, AUDIENCE_KEYWORDS),
    benefits,
    mediaTypes,
    timeRange: parseTimeRange(normalizedQuery, options.now || new Date()),
    keywords: extractKeywords(normalizedQuery),
    sortBy,
  };
};

const addKeywordConditions = (fields, keywords, params, { requireAll = false } = {}) => {
  const clauses = [];
  for (const keyword of keywords.slice(0, 5)) {
    const fieldClause = fields.map((field) => `${field} LIKE ?`).join(' OR ');
    clauses.push(`(${fieldClause})`);
    fields.forEach(() => params.push(buildLike(keyword)));
  }
  if (!clauses.length) return '';
  return `(${clauses.join(requireAll ? ' AND ' : ' OR ')})`;
};

const compactReasons = (reasons) => unique(reasons).slice(0, 4);

const createResult = (item) => ({
  ...item,
  typeLabel: RESULT_TYPE_LABELS[item.type] || item.type,
  match_reasons: compactReasons(item.match_reasons || []),
});

const searchEvents = async (db, parsed, limit = DEFAULT_LIMITS.events) => {
  const params = [];
  const where = ['e.deleted_at IS NULL', 'e.status = "approved"'];

  if (parsed.categories.length) {
    const placeholders = parsed.categories.map(() => '?').join(',');
    where.push(`(e.category IN (${placeholders}) OR ${parsed.categories.map(() => 'e.tags LIKE ?').join(' OR ')})`);
    params.push(...parsed.categories, ...parsed.categories.map(buildLike));
  }

  if (parsed.campuses.length) {
    const campusClauses = parsed.campuses.flatMap(() => ['e.location LIKE ?', 'e.description LIKE ?', 'e.content LIKE ?']);
    where.push(`(${campusClauses.join(' OR ')})`);
    parsed.campuses.forEach((campus) => params.push(buildLike(campus), buildLike(campus), buildLike(campus)));
  }

  if (parsed.audiences.length) {
    const audienceClauses = parsed.audiences.flatMap(() => ['e.target_audience LIKE ?', 'e.description LIKE ?']);
    where.push(`(${audienceClauses.join(' OR ')})`);
    parsed.audiences.forEach((audience) => params.push(buildLike(audience), buildLike(audience)));
  }

  if (parsed.benefits.includes('score')) {
    where.push('(e.score IS NOT NULL AND e.score != "")');
  }
  if (parsed.benefits.includes('volunteer_time')) {
    where.push('(e.volunteer_time IS NOT NULL AND e.volunteer_time != "")');
  }

  if (parsed.timeRange) {
    where.push('(date(e.date) >= date(?) AND date(e.date) <= date(?))');
    params.push(parsed.timeRange.start.slice(0, 10), parsed.timeRange.end.slice(0, 10));
  }

  const keywordClause = addKeywordConditions([
    'e.title',
    'e.description',
    'e.content',
    'e.location',
    'e.organizer',
    'e.target_audience',
    'e.score',
    'e.volunteer_time',
    'e.category',
    'e.tags',
  ], parsed.keywords, params);
  if (keywordClause) where.push(keywordClause);

  const orderBy = parsed.sortBy === 'hot'
    ? 'COALESCE(e.views, 0) DESC, COALESCE(e.likes, 0) DESC, e.date DESC, e.id DESC'
    : parsed.sortBy === 'recent'
      ? 'COALESCE(e.date, e.created_at) DESC, e.id DESC'
      : 'CASE WHEN e.date >= date("now", "localtime") THEN 0 ELSE 1 END ASC, COALESCE(e.featured, 0) DESC, COALESCE(e.views, 0) DESC, e.date ASC, e.id DESC';

  const rows = await safeAll(
    db,
    `
      SELECT
        e.id,
        e.title,
        e.description,
        e.category,
        e.image,
        e.date,
        e.end_date,
        e.location,
        e.organizer,
        e.target_audience,
        e.score,
        e.volunteer_time,
        e.views,
        e.likes
      FROM events e
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ?
    `,
    [...params, limit]
  );

  return rows.map((row) => {
    const reasons = [];
    if (parsed.categories.includes(row.category)) reasons.push(`活动类型：${getCategoryLabel(row.category) || row.category}`);
    parsed.campuses.forEach((campus) => {
      if (includesAny(`${row.location} ${row.description}`, [campus])) reasons.push(`校区：${campus}`);
    });
    parsed.audiences.forEach((audience) => {
      if (includesAny(`${row.target_audience} ${row.description}`, [audience])) reasons.push(`面向：${audience}`);
    });
    if (parsed.benefits.includes('score') && row.score) reasons.push(`含综测/加分：${sanitizeText(row.score, 32)}`);
    if (parsed.benefits.includes('volunteer_time') && row.volunteer_time) reasons.push(`含志愿时长：${sanitizeText(row.volunteer_time, 32)}`);
    if (parsed.timeRange) reasons.push(`时间：${parsed.timeRange.label}`);
    if (!reasons.length && parsed.keywords.length) reasons.push(`关键词匹配：${parsed.keywords.slice(0, 2).join('、')}`);

    return createResult({
      id: row.id,
      type: 'event',
      group: 'events',
      title: row.title,
      summary: row.description || row.organizer || '',
      image: row.image,
      link: `/events?id=${row.id}`,
      date: row.date,
      meta: [getCategoryLabel(row.category) || row.category, row.location, row.organizer].filter(Boolean).join(' · '),
      score: Number(row.views || 0) + Number(row.likes || 0),
      match_reasons: reasons,
    });
  });
};

const searchCommunity = async (db, parsed, limit = DEFAULT_LIMITS.community) => {
  const keywords = parsed.keywords;
  const articleParams = [];
  const articleWhere = ['a.deleted_at IS NULL', 'a.status = "approved"'];
  const articleKeywordClause = addKeywordConditions([
    'a.title',
    'a.excerpt',
    'a.content',
    'a.tags',
    'a.category',
    'COALESCE(u.nickname, u.username)',
  ], keywords, articleParams);
  if (articleKeywordClause) articleWhere.push(articleKeywordClause);

  const postParams = [];
  const postWhere = ['p.status = "approved"'];
  const postKeywordClause = addKeywordConditions([
    'p.title',
    'p.content',
    'p.tags',
    'p.section',
    'p.author_name',
  ], keywords, postParams);
  if (postKeywordClause) postWhere.push(postKeywordClause);

  const groupParams = [];
  const groupWhere = ['g.review_status = "approved"', 'COALESCE(g.is_expired, 0) = 0'];
  const groupKeywordClause = addKeywordConditions([
    'g.name',
    'g.description',
    'g.category',
    'g.platform',
    'g.primary_tags',
  ], keywords, groupParams);
  if (groupKeywordClause) groupWhere.push(groupKeywordClause);

  const newsParams = [];
  const newsWhere = ['n.deleted_at IS NULL', 'n.status = "approved"'];
  const newsKeywordClause = addKeywordConditions([
    'n.title',
    'n.excerpt',
    'n.content',
    'n.source_name',
  ], keywords, newsParams);
  if (newsKeywordClause) newsWhere.push(newsKeywordClause);

  const [articles, posts, groups, news] = await Promise.all([
    safeAll(
      db,
      `
        SELECT a.id, a.title, a.excerpt, a.content, a.cover, a.category, a.likes, a.created_at,
               COALESCE(u.nickname, u.username) AS author_name
        FROM articles a
        LEFT JOIN users u ON a.uploader_id = u.id
        WHERE ${articleWhere.join(' AND ')}
        ORDER BY COALESCE(a.featured, 0) DESC, COALESCE(a.likes, 0) DESC, a.id DESC
        LIMIT ?
      `,
      [...articleParams, Math.ceil(limit / 2)]
    ),
    safeAll(
      db,
      `
        SELECT p.id, p.title, p.content, p.section, p.tags, p.author_name, p.likes_count, p.comments_count, p.created_at
        FROM community_posts p
        WHERE ${postWhere.join(' AND ')}
        ORDER BY COALESCE(p.is_pinned, 0) DESC, COALESCE(p.likes_count, 0) DESC, COALESCE(p.comments_count, 0) DESC, p.id DESC
        LIMIT ?
      `,
      [...postParams, Math.ceil(limit / 3)]
    ),
    safeAll(
      db,
      `
        SELECT g.id, g.name, g.description, g.platform, g.category, g.member_count, g.primary_tags, g.is_recommended
        FROM community_groups g
        WHERE ${groupWhere.join(' AND ')}
        ORDER BY COALESCE(g.is_recommended, 0) DESC, COALESCE(g.sort_order, 0) DESC, g.id DESC
        LIMIT ?
      `,
      [...groupParams, Math.ceil(limit / 3)]
    ),
    safeAll(
      db,
      `
        SELECT n.id, n.title, n.excerpt, n.content, n.cover, n.source_name, n.hot_score, n.created_at
        FROM news n
        WHERE ${newsWhere.join(' AND ')}
        ORDER BY COALESCE(n.is_pinned, 0) DESC, COALESCE(n.pin_weight, 0) DESC, COALESCE(n.hot_score, 0) DESC, n.id DESC
        LIMIT ?
      `,
      [...newsParams, Math.ceil(limit / 3)]
    ),
  ]);

  const articleResults = articles.map((row) => createResult({
    id: row.id,
    type: 'article',
    group: 'community',
    title: row.title,
    summary: row.excerpt || sanitizeText(row.content, 120),
    image: row.cover,
    link: `/articles?tab=tech&id=${row.id}`,
    date: row.created_at,
    meta: ['技术分享', row.author_name].filter(Boolean).join(' · '),
    score: Number(row.likes || 0),
    match_reasons: ['AI 社区文章', parsed.keywords.length ? `关键词匹配：${parsed.keywords.slice(0, 2).join('、')}` : '内容匹配'],
  }));

  const postResults = posts.map((row) => createResult({
    id: row.id,
    type: 'post',
    group: 'community',
    title: row.title,
    summary: sanitizeText(row.content, 120),
    image: null,
    link: `/articles?tab=${row.section || 'help'}&post=${row.id}`,
    date: row.created_at,
    meta: [SECTION_LABELS[row.section] || '社区帖子', row.author_name].filter(Boolean).join(' · '),
    score: Number(row.likes_count || 0) + Number(row.comments_count || 0),
    match_reasons: [SECTION_LABELS[row.section] || '社区帖子', parsed.keywords.length ? `关键词匹配：${parsed.keywords.slice(0, 2).join('、')}` : '内容匹配'],
  }));

  const groupResults = groups.map((row) => createResult({
    id: row.id,
    type: 'group',
    group: 'community',
    title: row.name,
    summary: row.description || row.primary_tags || '',
    image: null,
    link: `/articles?tab=groups&group=${row.id}`,
    meta: ['社群', row.platform, row.member_count ? `${row.member_count} 人` : ''].filter(Boolean).join(' · '),
    score: Number(row.is_recommended || 0) * 10 + Number(row.member_count || 0),
    match_reasons: ['AI 社区社群', parsed.keywords.length ? `关键词匹配：${parsed.keywords.slice(0, 2).join('、')}` : '内容匹配'],
  }));

  const newsResults = news.map((row) => createResult({
    id: row.id,
    type: 'news',
    group: 'community',
    title: row.title,
    summary: row.excerpt || sanitizeText(row.content, 120),
    image: row.cover,
    link: `/articles?tab=tech&news=${row.id}`,
    date: row.created_at,
    meta: ['AI 社区新闻', row.source_name].filter(Boolean).join(' · '),
    score: Number(row.hot_score || 0),
    match_reasons: ['AI 社区新闻', parsed.keywords.length ? `关键词匹配：${parsed.keywords.slice(0, 2).join('、')}` : '内容匹配'],
  }));

  return [...articleResults, ...postResults, ...groupResults, ...newsResults]
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
    .slice(0, limit);
};

const searchMedia = async (db, parsed, limit = DEFAULT_LIMITS.media) => {
  const includePhotos = parsed.mediaTypes.length === 0 || parsed.mediaTypes.includes('photo');
  const includeVideos = parsed.mediaTypes.length === 0 || parsed.mediaTypes.includes('video');
  const keywords = parsed.keywords;
  const perTypeLimit = Math.ceil(limit / (includePhotos && includeVideos ? 2 : 1));

  const photoParams = [];
  const photoWhere = ['p.deleted_at IS NULL', 'p.status = "approved"'];
  const photoKeywordClause = addKeywordConditions([
    'p.title',
    'p.tags',
    'p.gameType',
    'p.gameDescription',
    'mc.name',
  ], keywords, photoParams);
  if (photoKeywordClause) photoWhere.push(photoKeywordClause);

  const videoParams = [];
  const videoWhere = ['v.deleted_at IS NULL', 'v.status = "approved"'];
  const videoKeywordClause = addKeywordConditions([
    'v.title',
    'v.tags',
    'v.gameType',
    'v.gameDescription',
    'mc.name',
  ], keywords, videoParams);
  if (videoKeywordClause) videoWhere.push(videoKeywordClause);

  const [photos, videos] = await Promise.all([
    includePhotos
      ? safeAll(
        db,
        `
          SELECT p.id, p.title, p.url, p.tags, p.likes, p.created_at, mc.name AS category_name
          FROM photos p
          LEFT JOIN media_categories mc ON p.category_id = mc.id
          WHERE ${photoWhere.join(' AND ')}
          ORDER BY COALESCE(p.featured, 0) DESC, COALESCE(p.likes, 0) DESC, p.id DESC
          LIMIT ?
        `,
        [...photoParams, perTypeLimit]
      )
      : [],
    includeVideos
      ? safeAll(
        db,
        `
          SELECT v.id, v.title, v.thumbnail, v.tags, v.likes, v.created_at, mc.name AS category_name
          FROM videos v
          LEFT JOIN media_categories mc ON v.category_id = mc.id
          WHERE ${videoWhere.join(' AND ')}
          ORDER BY COALESCE(v.featured, 0) DESC, COALESCE(v.likes, 0) DESC, v.id DESC
          LIMIT ?
        `,
        [...videoParams, perTypeLimit]
      )
      : [],
  ]);

  const photoResults = photos.map((row) => createResult({
    id: row.id,
    type: 'photo',
    group: 'media',
    title: row.title || '未命名照片',
    summary: row.tags || row.category_name || '',
    image: row.url,
    link: `/media?photo=${row.id}`,
    date: row.created_at,
    meta: ['照片', row.category_name].filter(Boolean).join(' · '),
    score: Number(row.likes || 0),
    match_reasons: ['影像库照片', parsed.keywords.length ? `关键词匹配：${parsed.keywords.slice(0, 2).join('、')}` : '内容匹配'],
  }));

  const videoResults = videos.map((row) => createResult({
    id: row.id,
    type: 'video',
    group: 'media',
    title: row.title || '未命名视频',
    summary: row.tags || row.category_name || '',
    image: row.thumbnail,
    link: `/media?video=${row.id}`,
    date: row.created_at,
    meta: ['视频', row.category_name].filter(Boolean).join(' · '),
    score: Number(row.likes || 0),
    match_reasons: ['影像库视频', parsed.keywords.length ? `关键词匹配：${parsed.keywords.slice(0, 2).join('、')}` : '内容匹配'],
  }));

  return [...photoResults, ...videoResults]
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))
    .slice(0, limit);
};

const groupResults = (results) => {
  const groups = [
    { key: 'events', label: '活动', results: [] },
    { key: 'community', label: 'AI 社区', results: [] },
    { key: 'media', label: '影像库', results: [] },
  ];
  const byKey = new Map(groups.map((group) => [group.key, group]));
  results.forEach((item) => {
    byKey.get(item.group)?.results.push(item);
  });
  return groups
    .map((group) => ({ ...group, count: group.results.length }))
    .filter((group) => group.count > 0);
};

const buildLegacyResults = (results) => results.map((item) => ({
  id: item.id,
  title: item.title,
  type: item.type,
  image: item.image,
  link: item.link.split('?')[0],
  deepLink: item.link,
  match_reasons: item.match_reasons,
}));

const searchGlobalContent = async (db, query, options = {}) => {
  const startTime = Date.now();
  const parsed = parseGlobalSearchQuery(query, options);
  if (!parsed.query || parsed.query.length < 2) {
    return {
      query: parsed.query,
      parsed_query: parsed,
      total: 0,
      search_time_ms: 0,
      groups: [],
      results: [],
      legacy: [],
    };
  }

  const selectedModules = parsed.modules.length ? new Set(parsed.modules) : null;
  const searches = await Promise.all([
    !selectedModules || selectedModules.has('events')
      ? searchEvents(db, parsed, options.limits?.events || DEFAULT_LIMITS.events)
      : [],
    !selectedModules || selectedModules.has('community')
      ? searchCommunity(db, parsed, options.limits?.community || DEFAULT_LIMITS.community)
      : [],
    !selectedModules || selectedModules.has('media')
      ? searchMedia(db, parsed, options.limits?.media || DEFAULT_LIMITS.media)
      : [],
  ]);

  const results = searches.flat();
  const groups = groupResults(results);

  return {
    query: parsed.query,
    parsed_query: parsed,
    total: results.length,
    search_time_ms: Date.now() - startTime,
    groups,
    results,
    legacy: buildLegacyResults(results),
  };
};

module.exports = {
  parseGlobalSearchQuery,
  searchGlobalContent,
};
