const aiRuntime = require('../services/unifiedAiRuntimeService');
const {
  ensureEventProfiles
} = require('../services/eventAiProfileService');
const {
  createEventRecommendationServices
} = require('../services/eventRecommendation');
const {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS: CATEGORY_LABELS,
  EVENT_CAMPUS_OPTIONS,
  EVENT_AUDIENCE_OPTIONS,
  EVENT_AUDIENCE_ALIASES,
  buildEventCatalogPromptText,
  detectCategories,
  detectAudienceTerms,
  detectCampusTerms,
  normalizeEventCategory,
} = require('../services/eventIntelligenceService');

const MAX_CANDIDATES = 80;
const MAX_MODEL_CANDIDATES = 8;
const MAX_RECOMMENDATIONS = 5;
const IDEAL_MIN_RECOMMENDATIONS = 3;
const MAX_QUERY_LENGTH = 500;
const MAX_CLARIFICATION_LENGTH = 300;
const MAX_MODEL_LOG_LENGTH = 2000;

const EVENT_ASSISTANT_PUBLIC_FIELDS = [
  'id',
  'title',
  'description',
  'date',
  'end_date',
  'location',
  'organizer',
  'target_audience',
  'score',
  'volunteer_time',
  'category'
];

const AUDIENCE_ALIASES = EVENT_AUDIENCE_ALIASES;
const AI_RECALL_LIMIT = 24;
const BENEFIT_ALIASES = {
  score: ['综测', '加分', '综合评价', '第二课堂', '学分', '素质分', '成长记实', 'score', 'score credit', 'comprehensive score', 'recognition'],
  volunteer_time: ['志愿', '时长', '工时', '小时', '公益', '志愿时长', 'volunteer', 'volunteer time', 'volunteer hour', 'service hour'],
  skill: ['技能', '实践', '实战', '项目', '作品集', 'demo', 'workshop', 'hands-on', 'hands on', 'project practice', 'portfolio'],
  social: ['社交', '交流', '放松', '分享', '同伴', 'music', 'art', 'social', 'exchange']
};
const BENEFIT_LABELS = {
  score: '综测/加分',
  volunteer_time: '志愿时长',
  skill: '技能成长',
  social: '社交放松'
};
const AI_TOPIC_ALIASES = [
  'ai',
  'aigc',
  'llm',
  'glm',
  'chatgpt',
  '人工智能',
  '大模型',
  '生成式人工智能',
  '智能体',
  '机器学习',
  '深度学习',
  'prompt',
  '提示词'
];
const SEARCH_TERM_ALIASES = {
  紫金港: ['zijingang'],
  玉泉: ['yuquan'],
  西溪: ['xixi'],
  华家池: ['huajiachi'],
  舟山: ['zhoushan'],
  海宁: ['haining'],
  计算机学院: ['college of computer science', 'computer science college', '计算机科学与技术学院'],
  计算机科学与技术学院: ['college of computer science', 'computer science college', '计算机学院'],
  创新创业学院: ['innovation college', 'college of innovation and entrepreneurship'],
  青年志愿者协会: ['youth volunteer association']
};
const OPPORTUNITY_MATCH_STAGE = 'trusted_decision_loop_v1';
const FEEDBACK_REASON_DEFINITIONS = [
  { value: 'not_relevant', label: '不相关', patterns: [/不相关/, /不适合/, /irrelevant/i, /not relevant/i] },
  { value: 'time_mismatch', label: '时间不合适', patterns: [/时间不合适/, /时间冲突/, /没时间/, /time mismatch/i, /wrong time/i] },
  { value: 'location_mismatch', label: '地点不合适', patterns: [/地点不合适/, /校区不合适/, /太远/, /location mismatch/i, /wrong location/i] },
  { value: 'benefit_mismatch', label: '收益不符合', patterns: [/收益不符合/, /收益不匹配/, /没有综测/, /没有加分/, /没有志愿/, /benefit mismatch/i] },
  { value: 'already_joined', label: '已参加过', patterns: [/已参加过/, /参加过/, /already/i] }
];

const createAssistantError = (code, message, statusCode = 500) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const sanitizeText = (value, maxLength = 500) => {
  if (typeof value !== 'string') return '';

  return value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

const safeJsonParse = (value, fallback) => {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const uniqueTextArray = (value, maxItems = 12, itemMaxLength = 80) => {
  const list = Array.isArray(value)
    ? value
    : sanitizeText(value, 1000).split(/[,，、;；\s\/|]+/);
  return unique(
    list
      .map((item) => sanitizeText(String(item || ''), itemMaxLength))
      .filter(Boolean)
  ).slice(0, maxItems);
};

const splitTokens = (value) => sanitizeText(value, 500)
  .split(/[,，、;；\s/|]+/)
  .map((item) => item.trim())
  .filter(Boolean);

const includesAny = (haystack, needles) => needles.some((needle) => haystack.includes(needle.toLowerCase()));

const normalizeSearchText = (...values) => values
  .map((value) => sanitizeText(value, 1000).toLowerCase())
  .join(' ');

const includesPhrase = (haystack, phrase) => {
  const normalizedPhrase = sanitizeText(String(phrase || ''), 80).toLowerCase();
  if (!normalizedPhrase) return false;

  if (/^[a-z0-9+#.-]+$/i.test(normalizedPhrase)) {
    const escaped = normalizedPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9+#.-])${escaped}([^a-z0-9+#.-]|$)`, 'i').test(haystack);
  }

  return haystack.includes(normalizedPhrase);
};

const includesAnyPhrase = (haystack, needles) => needles.some((needle) => includesPhrase(haystack, needle));

const isPersonalizationSignal = (signal) => (
  /行动证据|收藏|报名|正反馈|负反馈/.test(String(signal || ''))
);

const getBenefitMatch = (item, benefit) => {
  const text = buildCandidateSemanticText(item);
  if (benefit === 'score') {
    return getComprehensiveEvaluationSignal(item.event) || includesAnyPhrase(text, BENEFIT_ALIASES.score)
      ? '综测/加分'
      : '';
  }
  if (benefit === 'volunteer_time') {
    const volunteerTime = sanitizeText(item.event?.volunteer_time, 80);
    return volunteerTime || includesAnyPhrase(text, BENEFIT_ALIASES.volunteer_time)
      ? `志愿时长${volunteerTime ? ` ${volunteerTime}` : ''}`
      : '';
  }
  if (benefit === 'skill') {
    const explicitSkillText = normalizeSearchText(
      item.event?.title,
      item.event?.description,
      item.event?.content,
      item.event?.tags,
      item.aiProfile?.summary,
      ...(item.aiProfile?.benefits || [])
    );
    return includesAnyPhrase(explicitSkillText, BENEFIT_ALIASES.skill)
      ? getBenefitLabel(benefit)
      : '';
  }
  if (BENEFIT_ALIASES[benefit]?.length && includesAnyPhrase(text, BENEFIT_ALIASES[benefit])) {
    return getBenefitLabel(benefit);
  }
  return includesTermOrAlias(text, benefit) ? getBenefitLabel(benefit) : '';
};

const expandSearchAliases = (value) => {
  const text = sanitizeText(value, 80);
  const lowered = text.toLowerCase();
  return unique([
    text,
    lowered,
    ...(SEARCH_TERM_ALIASES[text] || []),
    ...(SEARCH_TERM_ALIASES[lowered] || [])
  ]).filter(Boolean);
};

const includesTermOrAlias = (haystack, value) => (
  expandSearchAliases(value).some((term) => includesPhrase(haystack, term))
);

const isNumericRatingText = (value) => {
  const text = sanitizeText(value, 40);
  return /^\d+(?:\.\d+)?$/.test(text);
};

const getComprehensiveEvaluationSignal = (event) => {
  const scoreText = sanitizeText(event.score, 80);
  const allText = normalizeSearchText(event.title, event.description, event.category, event.score);
  const hasKeyword = BENEFIT_ALIASES.score.some((keyword) => allText.includes(keyword.toLowerCase()));

  if (!hasKeyword) return '';
  if (scoreText && !isNumericRatingText(scoreText)) return `含综测信息：${sanitizeText(scoreText, 36)}`;
  return '活动信息提到综测/加分';
};

const hasExplicitTime = (value) => (
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(value.trim())
);

const parseLocalDateTime = (value) => {
  if (typeof value !== 'string' || value.trim() === '') return null;

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  if (!match) return null;

  const [, year, month, day, hours = '0', minutes = '0'] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    0,
    0
  );
};

const getStartOfDay = (date) => new Date(
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
  0,
  0,
  0,
  0
);

const getEndOfDay = (date) => new Date(
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
  23,
  59,
  59,
  999
);

const isSameLocalDay = (left, right) => (
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate()
);

const compareByAscendingDate = (left, right) => {
  const leftDate = parseLocalDateTime(left.date) || new Date(8640000000000000);
  const rightDate = parseLocalDateTime(right.date) || new Date(8640000000000000);

  return leftDate - rightDate || right.id - left.id;
};

const compareByDescendingDate = (left, right) => {
  const leftDate = parseLocalDateTime(left.date) || new Date(-8640000000000000);
  const rightDate = parseLocalDateTime(right.date) || new Date(-8640000000000000);

  return rightDate - leftDate || right.id - left.id;
};

const classifyEventScope = (event, now = new Date()) => {
  const start = parseLocalDateTime(event.date);
  if (!start) return 'unknown';

  const hasTimedStart = hasExplicitTime(event.date);
  const resolvedEnd = parseLocalDateTime(event.end_date) || start;
  const hasTimedEnd = hasExplicitTime(event.end_date);

  if (!hasTimedStart && start >= getStartOfDay(now)) {
    return 'upcoming';
  }

  if (hasTimedStart && start >= now) {
    return 'upcoming';
  }

  const ongoingStart = hasTimedStart ? start : getStartOfDay(start);
  const ongoingEnd = hasTimedEnd
    ? resolvedEnd
    : getEndOfDay(resolvedEnd);

  if (ongoingEnd >= ongoingStart && now >= ongoingStart && now <= ongoingEnd) {
    return 'ongoing';
  }

  if (!hasTimedStart && isSameLocalDay(start, now)) {
    return 'upcoming';
  }

  return 'past';
};

const serializeEventForAssistant = (event) => ({
  id: event.id,
  title: sanitizeText(event.title, 160),
  description: sanitizeText(event.description, 280),
  date: event.date || null,
  end_date: event.end_date || null,
  location: sanitizeText(event.location, 120),
  organizer: sanitizeText(event.organizer, 120),
  target_audience: sanitizeText(event.target_audience, 140),
  score: sanitizeText(event.score, 60),
  volunteer_time: sanitizeText(event.volunteer_time, 60),
  category: sanitizeText(event.category, 80),
  views: Number(event.views || 0)
});

const serializeEventForClient = (event) => ({
  ...serializeEventForAssistant(event),
  image: event.image || null
});

const buildAssistantIntent = ({ query, clarificationAnswer }) => {
  const normalizedQuery = sanitizeText(query, MAX_QUERY_LENGTH);
  const normalizedClarification = sanitizeText(clarificationAnswer, MAX_CLARIFICATION_LENGTH);

  if (!normalizedQuery) {
    throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Query is required.', 400);
  }

  if (normalizedClarification) {
    return `${normalizedQuery}\n补充说明：${normalizedClarification}`;
  }

  return normalizedQuery;
};

const detectBenefits = (text) => {
  const lowered = text.toLowerCase();
  return Object.entries(BENEFIT_ALIASES)
    .filter(([, aliases]) => includesAnyPhrase(lowered, aliases))
    .map(([benefit]) => benefit);
};

const normalizeBenefitValue = (value) => {
  const text = sanitizeText(value, 80);
  const lowered = text.toLowerCase();
  if (!lowered) return '';
  if (lowered === 'score' || includesAnyPhrase(lowered, BENEFIT_ALIASES.score)) return 'score';
  if (
    lowered === 'volunteer_time'
    || lowered === 'volunteer'
    || includesAnyPhrase(lowered, BENEFIT_ALIASES.volunteer_time)
  ) {
    return 'volunteer_time';
  }
  return text;
};

const detectSemanticTopics = (text) => {
  const lowered = normalizeSearchText(text);
  const topics = [];

  if (includesAnyPhrase(lowered, AI_TOPIC_ALIASES)) {
    topics.push('AI', '人工智能');
    if (includesAnyPhrase(lowered, ['大模型', 'llm', 'glm', 'chatgpt'])) {
      topics.push('大模型');
    }
    if (includesAnyPhrase(lowered, ['智能体', 'agent'])) {
      topics.push('智能体');
    }
  }

  if (includesAny(lowered, ['创业', '创新创业', '项目路演'])) topics.push('创新创业');
  if (includesAny(lowered, ['科研', '论文', '实验室'])) topics.push('科研');
  if (includesAny(lowered, ['就业', '实习', '招聘', '简历', 'offer'])) topics.push('就业实习');
  if (includesAny(lowered, ['讲座', '分享', '沙龙', '报告'])) topics.push('讲座分享');

  return unique(topics);
};

const cleanTopicTerms = (topics, { campuses = [], audiences = [] } = {}) => {
  const blocked = new Set([
    ...campuses,
    ...audiences,
    ...Object.values(BENEFIT_ALIASES).flat(),
    '活动',
    '推荐',
    '帮我',
    '想找',
    '一个',
    '一些',
    '有没有'
  ].map((item) => sanitizeText(item, 80).toLowerCase()).filter(Boolean));

  return unique(topics)
    .map((topic) => sanitizeText(topic, 80))
    .filter(Boolean)
    .filter((topic) => !blocked.has(topic.toLowerCase()));
};

const detectOrganizerTerms = (text) => {
  const normalized = normalizeSearchText(text);
  const terms = [
    ...EVENT_AUDIENCE_OPTIONS,
    '计算机学院',
    '计算机科学与技术学院',
    '创新创业学院',
    '青年志愿者协会',
    '学生社团',
    '艺术社'
  ];
  const detected = terms.filter((item) => {
    const value = sanitizeText(item, 80).toLowerCase();
    if (!value) return false;
    if (normalized.includes(value)) return true;
    if (value.includes('科学与技术') && normalized.includes(value.replace('科学与技术', ''))) return true;
    return false;
  });
  return unique(detected);
};

const detectFormat = (text) => {
  const lowered = text.toLowerCase();
  if (includesAny(lowered, ['线上', '在线', '直播', 'online'])) return 'online';
  if (includesAny(lowered, ['线下', '现场', '教室', '校区', 'offline'])) return 'offline';
  return '';
};

const detectTimePreference = (text) => {
  const lowered = text.toLowerCase();
  if (includesAny(lowered, ['历史', '往期', '已结束', '回顾', 'past'])) return 'historical';
  if (includesAny(lowered, ['今天', '今晚'])) return 'today';
  if (includesAny(lowered, ['明天'])) return 'tomorrow';
  if (includesAny(lowered, ['周末', '星期六', '星期日'])) return 'weekend';
  if (includesAny(lowered, ['本周', '这周', '近几天'])) return 'this_week';
  return '';
};

const parseAssistantIntent = ({ query, clarificationAnswer }) => {
  const combined = buildAssistantIntent({ query, clarificationAnswer });
  const lowered = combined.toLowerCase();
  const categories = detectCategories(combined);
  const benefits = detectBenefits(combined);
  const format = detectFormat(combined);
  const timePreference = detectTimePreference(combined);
  const campuses = detectCampusTerms(combined);
  const organizers = detectOrganizerTerms(combined);
  const audiences = unique([
    ...AUDIENCE_ALIASES.filter((item) => lowered.includes(item.toLowerCase())),
    ...detectAudienceTerms(combined)
  ]);
  const semanticTopics = detectSemanticTopics(combined);
  const rawTokens = splitTokens(combined)
    .filter((token) => token.length >= 2 && token.length <= 20)
    .filter((token) => !['活动', '推荐', '帮我', '想找', '一个', '一些', '有没有'].includes(token));
  const topics = unique([
    ...categories.map((category) => CATEGORY_LABELS[category] || category),
    ...semanticTopics,
    ...rawTokens.slice(0, 8)
  ]);
  const cleanedTopics = cleanTopicTerms(topics, { campuses, audiences }).slice(0, 12);

  const wantsMemory = /(记住|以后|下次|长期|偏好|多给我|少给我)/.test(combined);

  return {
    raw: combined,
    query: sanitizeText(query, MAX_QUERY_LENGTH),
    clarificationAnswer: sanitizeText(clarificationAnswer, MAX_CLARIFICATION_LENGTH),
    categories,
    benefits,
    format,
    timePreference,
    campuses,
    organizers,
    audiences,
    topics: cleanedTopics,
    wantsMemory,
    shouldClarify: combined.length <= 14
      && categories.length === 0
      && benefits.length === 0
      && campuses.length === 0
      && audiences.length === 0
      && !format
  };
};

const loadScopedCandidates = async (db, scope, now = new Date()) => {
  const rows = await db.all(
    `
      SELECT
        id,
        title,
        date,
        end_date,
        location,
        image,
        description,
        score,
        target_audience,
        organizer,
        volunteer_time,
        status,
        deleted_at,
        category,
        tags,
        views,
        featured,
        likes
      FROM events
      WHERE status = 'approved'
        AND deleted_at IS NULL
      ORDER BY date ASC, id DESC
    `
  );

  const filtered = rows.filter((event) => classifyEventScope(event, now) === scope);

  if (scope === 'past') {
    return filtered.sort(compareByDescendingDate).slice(0, MAX_CANDIDATES);
  }

  return filtered.sort(compareByAscendingDate).slice(0, MAX_CANDIDATES);
};

const loadAllCandidates = async (db, now = new Date()) => {
  const rows = await db.all(
    `
      SELECT
        id,
        title,
        date,
        end_date,
        location,
        image,
        description,
        score,
        target_audience,
        organizer,
        volunteer_time,
        status,
        deleted_at,
        category,
        tags,
        views,
        featured,
        likes
      FROM events
      WHERE status = 'approved'
        AND deleted_at IS NULL
      ORDER BY date ASC, id DESC
    `
  );

  const grouped = {
    upcoming: [],
    ongoing: [],
    past: [],
    unknown: []
  };

  for (const event of rows) {
    grouped[classifyEventScope(event, now)]?.push(event);
  }

  grouped.upcoming.sort(compareByAscendingDate);
  grouped.ongoing.sort(compareByAscendingDate);
  grouped.past.sort(compareByDescendingDate);
  grouped.unknown.sort(compareByAscendingDate);

  return grouped;
};

const buildCoverageSummary = (grouped) => ({
  upcoming: grouped.upcoming.length,
  ongoing: grouped.ongoing.length,
  past: grouped.past.length,
  unknown: grouped.unknown.length,
  total:
    grouped.upcoming.length +
    grouped.ongoing.length +
    grouped.past.length +
    grouped.unknown.length
});

const pickCandidateScope = async (db, allowScopeExpansion, now = new Date()) => {
  if (!allowScopeExpansion) {
    const upcoming = await loadScopedCandidates(db, 'upcoming', now);
    return {
      scope: 'upcoming',
      candidates: upcoming,
      canExpandScope: upcoming.length === 0
    };
  }

  const ongoing = await loadScopedCandidates(db, 'ongoing', now);
  if (ongoing.length > 0) {
    return {
      scope: 'ongoing',
      candidates: ongoing,
      canExpandScope: false
    };
  }

  const past = await loadScopedCandidates(db, 'past', now);
  return {
    scope: 'past',
    candidates: past,
    canExpandScope: false
  };
};

const getRecommendationCountBounds = (candidateCount) => ({
  min: Math.min(IDEAL_MIN_RECOMMENDATIONS, candidateCount),
  max: Math.min(MAX_RECOMMENDATIONS, candidateCount)
});

const clampNumber = (value, min, max, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
};

const mergeUniqueText = (...groups) => uniqueTextArray(groups.flat(), 16, 80);

const getBenefitLabel = (benefit) => BENEFIT_LABELS[benefit] || sanitizeText(benefit, 40);

const deriveHardConstraintsFromIntent = (intent = {}) => {
  const constraints = [];
  if (intent.dateConstraints?.length) {
    constraints.push(...intent.dateConstraints.map((item) => `时间：${item}`));
  }
  if (intent.campuses?.length) {
    constraints.push(...intent.campuses.map((item) => `校区/地点：${item}`));
  }
  if (intent.organizers?.length) {
    constraints.push(...intent.organizers.map((item) => `主办方/学院：${item}`));
  }
  if (intent.audiences?.length) {
    constraints.push(...intent.audiences.map((item) => `面向对象：${item}`));
  }
  if (intent.benefits?.length) {
    constraints.push(...intent.benefits.map((item) => `收益：${getBenefitLabel(item)}`));
  }
  if (intent.format) constraints.push(`参与形式：${intent.format}`);
  return uniqueTextArray(constraints, 10, 80);
};

const getHardConstraintDiagnostics = (recommendations = []) => {
  const ratios = recommendations
    .map((item) => Number(item.diagnostics?.hardConstraintRatio))
    .filter(Number.isFinite);
  const averageRatio = ratios.length
    ? ratios.reduce((sum, value) => sum + value, 0) / ratios.length
    : 1;
  const missed = unique(
    recommendations.flatMap((item) => item.diagnostics?.hardConstraintMisses || [])
  ).slice(0, 6);

  return {
    averageRatio: Number(averageRatio.toFixed(3)),
    missed,
    complete: missed.length === 0 && averageRatio >= 0.98
  };
};

const normalizeFeedbackReason = (reason) => {
  const text = sanitizeText(reason, 240);
  if (!text) return '';
  const match = FEEDBACK_REASON_DEFINITIONS.find((definition) => (
    definition.patterns.some((pattern) => pattern.test(text))
  ));
  return match?.value || '';
};

const getFeedbackReasonLabel = (value) => (
  FEEDBACK_REASON_DEFINITIONS.find((definition) => definition.value === value)?.label || ''
);

const extractJsonObject = (content) => {
  if (typeof content !== 'string' || content.trim() === '') {
    throw createAssistantError('EVENT_ASSISTANT_MODEL_EMPTY', 'Model returned empty content.', 502);
  }

  const fencedMatch = content.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const objectMatch = content.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0].trim();
  }

  return content.trim();
};

const normalizeModelRunnerOutput = (result) => {
  if (typeof result === 'string') {
    return {
      rawContent: result,
      jsonText: result
    };
  }

  return {
    rawContent: typeof result?.rawContent === 'string' ? result.rawContent : '',
    jsonText: typeof result?.jsonText === 'string' ? result.jsonText : ''
  };
};

const normalizeAiIntent = (rawIntent = {}, fallbackIntent) => {
  const categories = uniqueTextArray(rawIntent.categories || rawIntent.category)
    .map(normalizeEventCategory)
    .filter(Boolean);
  const benefits = uniqueTextArray(rawIntent.benefits, 8)
    .map(normalizeBenefitValue)
    .filter(Boolean);
  const format = ['online', 'offline', 'hybrid'].includes(rawIntent.format)
    ? rawIntent.format
    : fallbackIntent.format;

  const normalized = {
    ...fallbackIntent,
    ai: true,
    querySummary: sanitizeText(rawIntent.query_summary || rawIntent.summary, 180),
    categories: categories.length ? unique(categories) : fallbackIntent.categories,
    topics: cleanTopicTerms([
      ...uniqueTextArray(rawIntent.topics, 12),
      ...fallbackIntent.topics,
    ], {
      campuses: [
        ...uniqueTextArray(rawIntent.campuses, 8),
        ...fallbackIntent.campuses,
      ],
      audiences: [
        ...uniqueTextArray(rawIntent.audiences, 8),
        ...fallbackIntent.audiences,
      ]
    }).slice(0, 12),
    benefits: benefits.length ? benefits : fallbackIntent.benefits,
    format,
    campuses: unique([
      ...uniqueTextArray(rawIntent.campuses, 8),
      ...fallbackIntent.campuses,
    ]).slice(0, 8),
    organizers: mergeUniqueText(
      rawIntent.organizers || rawIntent.colleges,
      fallbackIntent.organizers
    ).slice(0, 8),
    audiences: unique([
      ...uniqueTextArray(rawIntent.audiences, 8),
      ...fallbackIntent.audiences,
    ]).slice(0, 8),
    dateConstraints: mergeUniqueText(
      rawIntent.date_constraints || rawIntent.time_constraints,
      fallbackIntent.dateConstraints,
      fallbackIntent.timePreference ? [fallbackIntent.timePreference] : []
    ).slice(0, 8),
    hardConstraints: mergeUniqueText(
      rawIntent.hard_constraints
      || rawIntent.hardConstraints
      || rawIntent.must_have
      || rawIntent.mustHave,
      fallbackIntent.hardConstraints,
      deriveHardConstraintsFromIntent(fallbackIntent)
    ).slice(0, 10),
    allowHistorical: Boolean(rawIntent.allow_historical || fallbackIntent.allowHistorical),
    needsClarification: Boolean(rawIntent.needs_clarification || fallbackIntent.shouldClarify),
    clarificationQuestion: sanitizeText(rawIntent.clarification_question, 160),
    clarificationOptions: uniqueTextArray(rawIntent.clarification_options || rawIntent.options, 4, 80),
    confidence: Math.min(Math.max(Number(rawIntent.confidence) || 0.55, 0), 1),
  };

  normalized.hardConstraints = mergeUniqueText(
    normalized.hardConstraints,
    deriveHardConstraintsFromIntent(normalized)
  ).slice(0, 10);
  return normalized;
};

const parseAssistantIntentWithModel = async ({
  db,
  query,
  clarificationAnswer,
  profile,
  clarificationUsed,
  modelRunner,
}) => {
  const fallbackIntent = parseAssistantIntent({ query, clarificationAnswer });

  const result = await aiRuntime.callJson(db, {
    task: 'event_recommendation_intent',
    modelRunner,
    messages: [
      {
        role: 'system',
        content: [
          '你是浙江大学活动推荐助手的需求理解层。',
          '你的任务不是直接推荐活动，而是把用户自然语言解析成结构化检索意图。',
          '必须结合标准活动库、用户画像和补充说明，输出 JSON 对象。',
          '必须识别用户显式提出的日期、校区、学院/组织、面向对象、收益和参与形式，这些属于 hard_constraints。',
          '如果本地初步解析已经给出 explicitIntent，除非用户明确否定，否则必须保留其中的校区、主办方、日期、收益、形式和硬约束。',
          '不要把用户没有说的条件补成硬约束；不确定时放进 topics 或 uncertainty，而不是伪造。',
          '如果问题非常模糊且还没有问过澄清问题，可以设置 needs_clarification=true。',
          '只输出 JSON。'
        ].join('\n')
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: 'parse_event_recommendation_intent',
          query: fallbackIntent.query,
          clarificationAnswer: fallbackIntent.clarificationAnswer,
          clarificationAlreadyUsed: Boolean(clarificationUsed),
          explicitIntent: {
            topics: fallbackIntent.topics,
            categories: fallbackIntent.categories,
            campuses: fallbackIntent.campuses,
            organizers: fallbackIntent.organizers,
            audiences: fallbackIntent.audiences,
            benefits: fallbackIntent.benefits,
            format: fallbackIntent.format,
            dateConstraints: fallbackIntent.dateConstraints || [],
            timePreference: fallbackIntent.timePreference || '',
            hardConstraints: deriveHardConstraintsFromIntent(fallbackIntent)
          },
          standardCatalog: buildEventCatalogPromptText(),
          allowedCategories: EVENT_CATEGORIES.map((item) => item.value),
          allowedCampuses: EVENT_CAMPUS_OPTIONS,
          allowedAudiences: EVENT_AUDIENCE_OPTIONS,
          profile: buildProfileSummary(profile),
          outputContract: {
            query_summary: 'short Chinese sentence',
            topics: ['semantic topic terms'],
            campuses: ['campus/location terms'],
            organizers: ['college/organization terms'],
            audiences: ['audience terms'],
            benefits: ['综测/志愿时长/证书/就业/技能/社交等'],
            categories: ['allowed category values'],
            date_constraints: ['today/tomorrow/this_week/weekend/specific date terms'],
            format: 'online/offline/hybrid/empty string',
            hard_constraints: ['explicit must-have constraints from the user, Chinese short phrases'],
            allow_historical: 'boolean',
            needs_clarification: 'boolean',
            clarification_question: 'one concise question or empty string',
            confidence: '0-1 number'
          }
        }, null, 2)
      }
    ]
  });

  return {
    intent: normalizeAiIntent(result.parsed, fallbackIntent),
    modelStatus: result.modelStatus,
    rawIntent: result.parsed
  };
};

const getChatMessageText = (data) => {
  const message = data?.choices?.[0]?.message || {};
  return message.content || message.reasoning_content || '';
};

const clipForLog = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.length > MAX_MODEL_LOG_LENGTH
    ? `${value.slice(0, MAX_MODEL_LOG_LENGTH)}...<truncated>`
    : value;
};

const logInvalidModelOutput = ({ error, scope, candidateCount, rawContent, jsonText, parsedResult }) => {
  const payload = {
    code: error?.code || 'EVENT_ASSISTANT_MODEL_INVALID',
    message: error?.message || 'Invalid model output.',
    scope,
    candidateCount,
    rawContent: clipForLog(rawContent),
    extractedJson: clipForLog(jsonText)
  };

  if (parsedResult !== undefined) {
    payload.parsedResult = parsedResult;
  }

  console.warn('[EventAssistant] Invalid model output:', JSON.stringify(payload));
};

const validateModelResult = (rawResult, context) => {
  if (!rawResult || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    throw createAssistantError('EVENT_ASSISTANT_MODEL_INVALID', 'Model returned an invalid JSON object.', 502);
  }

  if (!['clarify', 'recommend', 'empty'].includes(rawResult.type)) {
    throw createAssistantError('EVENT_ASSISTANT_MODEL_INVALID', 'Model returned an unsupported response type.', 502);
  }

  if (rawResult.type === 'empty') {
    return { type: 'empty' };
  }

  if (rawResult.type === 'clarify') {
    if (!context.clarificationAllowed) {
      return {
        type: 'empty',
        emptyReason: 'clarification_limit_reached'
      };
    }

    const question = sanitizeText(rawResult.question, 160);
    if (!question) {
      throw createAssistantError('EVENT_ASSISTANT_MODEL_INVALID', 'Clarification response did not include a valid question.', 502);
    }

    return {
      type: 'clarify',
      question
    };
  }

  if (!Array.isArray(rawResult.recommendations)) {
    throw createAssistantError('EVENT_ASSISTANT_MODEL_INVALID', 'Recommendation response did not include a recommendations array.', 502);
  }

  const recommendations = [];
  const seenIds = new Set();

  for (const item of rawResult.recommendations) {
    const id = Number(item?.id ?? item?.eventId);
    if (!Number.isInteger(id) || !context.candidateMap.has(id) || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);
    recommendations.push({
      id,
      reason: sanitizeText(item?.reason || '', 120)
    });
  }

  const { min, max } = getRecommendationCountBounds(context.candidateMap.size);
  if (recommendations.length < min) {
    throw createAssistantError('EVENT_ASSISTANT_MODEL_INVALID', 'Recommendation response did not include enough valid candidate IDs.', 502);
  }

  return {
    type: 'recommend',
    recommendations: recommendations.slice(0, max)
  };
};

const summarizeCounts = (items) => Object.entries(
  items.reduce((accumulator, item) => {
    const key = item || '';
    if (!key) return accumulator;
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {})
)
  .sort((a, b) => b[1] - a[1])
  .map(([value]) => value)
  .slice(0, 8);

const addWeightedCount = (counts, key, weight = 1) => {
  if (!key) return;
  counts[key] = Number((counts[key] || 0) + weight);
};

const summarizeWeightedCounts = (counts, limit = 8) => Object.entries(counts)
  .filter(([, weight]) => Number(weight) > 0)
  .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
  .map(([value, weight]) => ({ value, weight: Number(weight.toFixed(2)) }))
  .slice(0, limit);

const inferEventCategory = (event) => {
  const explicit = sanitizeText(event.category, 80);
  const categoryMatch = normalizeEventCategory(explicit);
  if (categoryMatch) return categoryMatch;

  const text = normalizeSearchText(event.category, event.title, event.description);
  return detectCategories(text)[0] || 'other';
};

const buildEmptyActionEvidence = () => ({
  positiveEventIds: [],
  favoriteEventIds: [],
  registeredEventIds: [],
  positiveFeedbackEventIds: [],
  viewedEventIds: [],
  recommendationFavoriteEventIds: [],
  recommendationRegisterEventIds: [],
  negativeActionEventIds: [],
  negativeEventIds: [],
  positiveCategories: [],
  negativeCategories: [],
  negativeReasons: [],
  negativeReasonByEventId: {},
  actionTypeCounts: {},
  recentRecommendationActionCount: 0
});

const RECOMMENDATION_ACTION_WEIGHTS = {
  view_detail: 0.35,
  favorite: 1.2,
  register: 2,
  feedback_up: 1.5,
  unfavorite: -1,
  unregister: -1.6,
  feedback_down: -2
};

const incrementActionTypeCount = (counts, actionType) => {
  const key = sanitizeText(actionType, 40);
  if (!key) return;
  counts[key] = (counts[key] || 0) + 1;
};

const buildActionEvidence = (historyRows = [], feedbackRows = [], recommendationActionRows = []) => {
  const positiveCategoryCounts = {};
  const negativeCategoryCounts = {};
  const favoriteEventIds = [];
  const registeredEventIds = [];
  const positiveFeedbackEventIds = [];
  const viewedEventIds = [];
  const recommendationFavoriteEventIds = [];
  const recommendationRegisterEventIds = [];
  const negativeActionEventIds = [];
  const negativeEventIds = [];
  const negativeReasonCounts = {};
  const negativeReasonByEventId = {};
  const actionTypeCounts = {};
  const seenRecommendationActions = new Set();

  for (const row of historyRows) {
    const eventId = Number(row.id || row.event_id);
    const category = inferEventCategory(row);
    if (row.action_type === 'registration') {
      if (Number.isInteger(eventId)) registeredEventIds.push(eventId);
      addWeightedCount(positiveCategoryCounts, category, 2);
    } else {
      if (Number.isInteger(eventId)) favoriteEventIds.push(eventId);
      addWeightedCount(positiveCategoryCounts, category, 1);
    }
  }

  for (const row of feedbackRows) {
    const eventId = Number(row.event_id);
    const category = inferEventCategory(row);
    if (row.feedback === 'up') {
      if (Number.isInteger(eventId)) positiveFeedbackEventIds.push(eventId);
      addWeightedCount(positiveCategoryCounts, category, 1.5);
    } else if (row.feedback === 'down') {
      if (Number.isInteger(eventId)) negativeEventIds.push(eventId);
      addWeightedCount(negativeCategoryCounts, category, 2);
      const reasonValue = normalizeFeedbackReason(row.reason);
      if (reasonValue) {
        addWeightedCount(negativeReasonCounts, reasonValue, 2);
        if (Number.isInteger(eventId)) negativeReasonByEventId[eventId] = reasonValue;
      }
    }
  }

  for (const row of recommendationActionRows) {
    const eventId = Number(row.event_id);
    const actionType = sanitizeText(row.action_type, 40);
    if (!Number.isInteger(eventId) || !actionType) continue;

    const dedupeKey = `${eventId}:${actionType}`;
    if (seenRecommendationActions.has(dedupeKey)) continue;
    seenRecommendationActions.add(dedupeKey);
    incrementActionTypeCount(actionTypeCounts, actionType);

    const category = inferEventCategory(row);
    const weight = Number(RECOMMENDATION_ACTION_WEIGHTS[actionType] || 0);

    if (actionType === 'view_detail') {
      viewedEventIds.push(eventId);
    } else if (actionType === 'favorite') {
      recommendationFavoriteEventIds.push(eventId);
    } else if (actionType === 'register') {
      recommendationRegisterEventIds.push(eventId);
    }

    if (weight > 0) {
      if (!['feedback_up'].includes(actionType)) {
        addWeightedCount(positiveCategoryCounts, category, weight);
      }
    } else if (weight < 0) {
      negativeActionEventIds.push(eventId);
      if (!['feedback_down'].includes(actionType)) {
        addWeightedCount(negativeCategoryCounts, category, Math.abs(weight));
      }
    }
  }

  return {
    positiveEventIds: unique([
      ...favoriteEventIds,
      ...registeredEventIds,
      ...positiveFeedbackEventIds,
      ...recommendationFavoriteEventIds,
      ...recommendationRegisterEventIds
    ]).slice(0, 60),
    favoriteEventIds: unique(favoriteEventIds).slice(0, 40),
    registeredEventIds: unique(registeredEventIds).slice(0, 40),
    positiveFeedbackEventIds: unique(positiveFeedbackEventIds).slice(0, 40),
    viewedEventIds: unique(viewedEventIds).slice(0, 40),
    recommendationFavoriteEventIds: unique(recommendationFavoriteEventIds).slice(0, 40),
    recommendationRegisterEventIds: unique(recommendationRegisterEventIds).slice(0, 40),
    negativeActionEventIds: unique(negativeActionEventIds).slice(0, 40),
    negativeEventIds: unique([
      ...negativeEventIds,
      ...negativeActionEventIds
    ]).slice(0, 40),
    positiveCategories: summarizeWeightedCounts(positiveCategoryCounts),
    negativeCategories: summarizeWeightedCounts(negativeCategoryCounts),
    negativeReasons: summarizeWeightedCounts(negativeReasonCounts),
    negativeReasonByEventId,
    actionTypeCounts,
    recentRecommendationActionCount: seenRecommendationActions.size
  };
};

const loadRecommendationActionRows = async (db, userId) => {
  try {
    return await db.all(
      `
        SELECT
          a.event_id,
          a.action_type,
          a.source,
          a.recommendation_rank,
          a.created_at AS action_created_at,
          e.title,
          e.description,
          e.category,
          e.location,
          e.organizer,
          e.target_audience,
          e.score,
          e.volunteer_time
        FROM event_recommendation_actions a
        LEFT JOIN events e ON e.id = a.event_id
        WHERE a.user_id = ?
          AND a.created_at >= datetime('now', '-60 days')
        ORDER BY a.created_at DESC, a.id DESC
        LIMIT 80
      `,
      [userId]
    );
  } catch {
    return [];
  }
};

const loadUserEventProfile = async (db, userId) => {
  if (!userId) {
    return {
      isAnonymous: true,
      explicit: {},
      learned: {},
      memory: [],
      negativeEventIds: [],
      actionEvidence: buildEmptyActionEvidence()
    };
  }

  const user = await db.get(
    'SELECT id, username, nickname, organization, organization_cr, gender, age FROM users WHERE id = ?',
    [userId]
  );
  const explicitPreference = await db.get('SELECT * FROM user_event_preferences WHERE user_id = ?', [userId]);
  const memoryRows = await db.all(
    `
      SELECT memory_type, content, weight, updated_at
      FROM assistant_memory
      WHERE user_id = ?
        AND source = 'event_assistant'
      ORDER BY updated_at DESC, id DESC
      LIMIT 12
    `,
    [userId]
  );
  const historyRows = await db.all(
    `
      SELECT e.*, h.action_type, h.created_at AS action_created_at
      FROM events e
      JOIN (
        SELECT item_id AS event_id, 'favorite' AS action_type, created_at FROM favorites WHERE user_id = ? AND item_type = 'event'
        UNION ALL
        SELECT event_id, 'registration' AS action_type, created_at FROM event_registrations WHERE user_id = ?
      ) h ON h.event_id = e.id
      WHERE e.deleted_at IS NULL
      ORDER BY h.created_at DESC
      LIMIT 30
    `,
    [userId, userId]
  );
  const feedbackRows = await db.all(
    `
      SELECT
        f.event_id,
        f.feedback,
        f.created_at AS feedback_created_at,
        e.title,
        e.description,
        e.category,
        e.location,
        e.organizer,
        e.target_audience,
        e.score,
        e.volunteer_time,
        f.reason
      FROM event_recommendation_feedback f
      LEFT JOIN events e ON e.id = f.event_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT 40
    `,
    [userId]
  );
  const recommendationActionRows = await loadRecommendationActionRows(db, userId);

  const learnedCategories = summarizeCounts(historyRows.map(inferEventCategory));
  const actionEvidence = buildActionEvidence(historyRows, feedbackRows, recommendationActionRows);

  return {
    isAnonymous: false,
    user: user || null,
    explicit: {
      college: explicitPreference?.college || user?.organization_cr || user?.organization || '',
      division: explicitPreference?.division || '',
      grade: explicitPreference?.grade || '',
      campus: explicitPreference?.campus || '',
      interestTags: safeJsonParse(explicitPreference?.interest_tags, []),
      preferredCategories: safeJsonParse(explicitPreference?.preferred_categories, []),
      preferredBenefits: safeJsonParse(explicitPreference?.preferred_benefits, []),
      preferredFormat: explicitPreference?.preferred_format || ''
    },
    learned: {
      categories: learnedCategories
    },
    memory: memoryRows.map((row) => ({
      type: row.memory_type,
      content: row.content,
      weight: Number(row.weight || 1)
    })),
    negativeEventIds: actionEvidence.negativeEventIds,
    actionEvidence
  };
};

const buildProfileSummary = (profile) => {
  if (profile.isAnonymous) {
    return {
      label: '未登录用户',
      signals: ['只使用本次提问和公开活动数据']
    };
  }

  const signals = [];
  if (profile.explicit.college) signals.push(`组织/学院：${profile.explicit.college}`);
  if (profile.explicit.grade) signals.push(`年级：${profile.explicit.grade}`);
  if (profile.explicit.campus) signals.push(`常用校区：${profile.explicit.campus}`);
  if (profile.explicit.interestTags?.length) signals.push(`显式兴趣：${profile.explicit.interestTags.slice(0, 4).join('、')}`);
  if (profile.learned.categories?.length) signals.push(`历史偏好：${profile.learned.categories.slice(0, 3).map((item) => CATEGORY_LABELS[item] || item).join('、')}`);
  if (profile.actionEvidence?.positiveCategories?.length) {
    signals.push(`行动证据偏好：${profile.actionEvidence.positiveCategories.slice(0, 3).map((item) => CATEGORY_LABELS[item.value] || item.value).join('、')}`);
  }
  if (profile.actionEvidence?.recentRecommendationActionCount > 0) {
    signals.push(`推荐动作证据：${profile.actionEvidence.recentRecommendationActionCount} 条`);
  }
  if (profile.actionEvidence?.negativeCategories?.length) {
    signals.push(`近期负反馈：${profile.actionEvidence.negativeCategories.slice(0, 2).map((item) => CATEGORY_LABELS[item.value] || item.value).join('、')}`);
  }
  if (profile.actionEvidence?.negativeReasons?.length) {
    signals.push(`负反馈原因：${profile.actionEvidence.negativeReasons.slice(0, 2).map((item) => getFeedbackReasonLabel(item.value) || item.value).join('、')}`);
  }
  if (profile.memory?.length) signals.push(`助手记忆：${profile.memory.slice(0, 2).map((item) => item.content).join('；')}`);

  return {
    label: profile.user?.nickname || profile.user?.username || '已登录用户',
    signals: signals.length ? signals : ['暂无明确画像，主要使用本次提问']
  };
};

const scoreTextMatch = (eventText, values, score, signalBuilder) => {
  let total = 0;
  const signals = [];

  for (const value of values) {
    const normalized = sanitizeText(String(value), 80).toLowerCase();
    if (!normalized) continue;
    if (includesTermOrAlias(eventText, normalized)) {
      total += score;
      const signal = signalBuilder(value);
      if (signal) signals.push(signal);
    }
  }

  return { total, signals };
};

const getActionEvidenceCategory = (profile, eventCategory, type) => (
  profile.actionEvidence?.[type]?.find((item) => item.value === eventCategory) || null
);

const getActionEvidenceReason = (profile, reasonValue) => (
  profile.actionEvidence?.negativeReasons?.find((item) => item.value === reasonValue) || null
);

const getFeedbackReasonPenalty = ({ event, text, profile, intent }) => {
  let penalty = 0;
  const signals = [];
  const eventReason = profile.actionEvidence?.negativeReasonByEventId?.[Number(event.id)];
  const hasEventSpecificReason = Boolean(eventReason);

  if (eventReason) {
    penalty += 12;
    signals.push(`负反馈学习：你曾标记${getFeedbackReasonLabel(eventReason) || '不适合'}`);
  }

  const addReasonPenalty = (reasonValue, condition, amount, label) => {
    if (!condition) return;
    const evidence = getActionEvidenceReason(profile, reasonValue);
    if (!evidence) return;
    const boost = Math.min(amount + 8, amount + Number(evidence.weight || 0) * 2);
    penalty += boost;
    signals.push(`负反馈原因降低优先级：${label}`);
  };

  addReasonPenalty('time_mismatch', hasEventSpecificReason && eventReason === 'time_mismatch', 8, '时间不合适');
  addReasonPenalty('location_mismatch', Boolean(intent.campuses?.length) && !scoreTextMatch(text, intent.campuses, 1, () => '').total, 8, '地点不合适');
  addReasonPenalty(
    'benefit_mismatch',
    Boolean(intent.benefits?.length)
      && !intent.benefits.some((benefit) => {
        if (benefit === 'score') return Boolean(getComprehensiveEvaluationSignal(event));
        if (benefit === 'volunteer_time') return Boolean(sanitizeText(event.volunteer_time, 80));
        return includesTermOrAlias(text, benefit);
      }),
    8,
    '收益不符合'
  );
  addReasonPenalty(
    'not_relevant',
    Boolean(intent.categories?.length || intent.topics?.length)
      && !intent.categories.includes(inferEventCategory(event))
      && !scoreTextMatch(text, intent.topics || [], 1, () => '').total,
    6,
    '相关性不足'
  );
  addReasonPenalty('already_joined', profile.actionEvidence?.registeredEventIds?.includes(Number(event.id)), 16, '已参加过');

  return {
    penalty: Math.round(penalty),
    signals: unique(signals).slice(0, 3)
  };
};

const scoreEvent = (event, intent, profile, scope, now = new Date()) => {
  const text = normalizeSearchText(
    event.title,
    event.description,
    event.location,
    event.target_audience,
    event.organizer,
    event.score,
    event.volunteer_time,
    event.category
  );
  const eventCategory = inferEventCategory(event);
  const signals = [];
  let score = 0;

  if (intent.categories.includes(eventCategory)) {
    score += 36;
    signals.push(`活动类型匹配 ${CATEGORY_LABELS[eventCategory] || eventCategory}`);
  } else if (intent.categories.length > 0 && text.includes(intent.categories[0])) {
    score += 12;
  }

  const topicMatch = scoreTextMatch(text, intent.topics, 7, (value) => `提问关键词匹配「${value}」`);
  score += topicMatch.total;
  signals.push(...topicMatch.signals.slice(0, 2));

  const campusMatch = scoreTextMatch(text, intent.campuses, 14, (value) => `地点贴近 ${value}`);
  score += campusMatch.total;
  signals.push(...campusMatch.signals.slice(0, 2));

  const audienceMatch = scoreTextMatch(text, intent.audiences, 12, (value) => `面向对象包含 ${value}`);
  score += audienceMatch.total;
  signals.push(...audienceMatch.signals.slice(0, 2));

  if (intent.format === 'online' && includesAny(text, ['线上', '在线', '直播', '腾讯会议'])) {
    score += 16;
    signals.push('符合线上参与偏好');
  }
  if (intent.format === 'offline' && !includesAny(text, ['线上', '在线', '直播'])) {
    score += 8;
    signals.push('更偏线下参与');
  }

  const comprehensiveSignal = getComprehensiveEvaluationSignal(event);
  if (intent.benefits.includes('score') && comprehensiveSignal) {
    score += 24;
    signals.push(comprehensiveSignal);
  }
  if (intent.benefits.includes('volunteer_time') && sanitizeText(event.volunteer_time, 80)) {
    score += 24;
    signals.push(`含志愿时长：${sanitizeText(event.volunteer_time, 36)}`);
  }

  if (profile.explicit.preferredCategories?.includes(eventCategory)) {
    score += 12;
    signals.push(`符合你偏好的 ${CATEGORY_LABELS[eventCategory] || eventCategory}`);
  }
  if (profile.learned.categories?.includes(eventCategory)) {
    score += 8;
    signals.push('与你收藏/报名过的活动类型相近');
  }

  const positiveEvidence = getActionEvidenceCategory(profile, eventCategory, 'positiveCategories');
  if (positiveEvidence) {
    const boost = Math.min(14, 5 + positiveEvidence.weight * 2);
    score += boost;
    signals.unshift(`行动证据显示你更常选择 ${CATEGORY_LABELS[eventCategory] || eventCategory}`);
  }

  const negativeEvidence = getActionEvidenceCategory(profile, eventCategory, 'negativeCategories');
  if (negativeEvidence && !intent.categories.includes(eventCategory)) {
    const penalty = Math.min(16, 5 + negativeEvidence.weight * 2);
    score -= penalty;
    signals.unshift(`近期负反馈降低了同类活动优先级`);
  }

  const reasonPenalty = getFeedbackReasonPenalty({
    event,
    text,
    profile,
    intent
  });
  if (reasonPenalty.penalty > 0) {
    score -= reasonPenalty.penalty;
    signals.unshift(...reasonPenalty.signals);
  }

  const profileTagMatch = scoreTextMatch(
    text,
    unique([
      ...(profile.explicit.interestTags || []),
      ...profile.memory.map((item) => item.content)
    ]).slice(0, 12),
    5,
    (value) => `贴近你的兴趣「${value}」`
  );
  score += profileTagMatch.total;
  signals.push(...profileTagMatch.signals.slice(0, 2));

  if (profile.explicit.college && text.includes(profile.explicit.college.toLowerCase())) {
    score += 12;
    signals.push(`与你的组织/学院相关`);
  }
  if (profile.explicit.campus && text.includes(profile.explicit.campus.toLowerCase())) {
    score += 8;
    signals.push(`靠近你的常用校区`);
  }
  if (profile.explicit.preferredFormat === intent.format && intent.format) {
    score += 6;
  }

  if (profile.negativeEventIds.includes(Number(event.id))) {
    score -= 45;
    signals.unshift('你曾对这个活动给过负反馈');
  }

  if (profile.actionEvidence?.negativeActionEventIds?.includes(Number(event.id))) {
    score -= 18;
    signals.unshift('行动证据显示你曾取消或负反馈过这个推荐活动');
  }

  if (profile.actionEvidence?.viewedEventIds?.includes(Number(event.id))) {
    score += 3;
    signals.push('行动证据显示你曾从推荐中查看过详情');
  }

  if (profile.actionEvidence?.recommendationFavoriteEventIds?.includes(Number(event.id))) {
    score += 8;
    signals.unshift('行动证据显示你曾从推荐中收藏过这个活动');
  }

  if (profile.actionEvidence?.recommendationRegisterEventIds?.includes(Number(event.id))) {
    score += 10;
    signals.unshift('行动证据显示你曾从推荐中报名过这个活动');
  }

  if (profile.actionEvidence?.positiveEventIds?.includes(Number(event.id))) {
    score += 6;
    signals.unshift('行动证据显示你曾对这个活动有过收藏、报名或正反馈');
  }

  const start = parseLocalDateTime(event.date);
  if (start && scope !== 'past') {
    const daysAway = Math.max(0, (start - now) / 86400000);
    if (daysAway <= 1) score += 8;
    else if (daysAway <= 7) score += 5;
    else if (daysAway <= 21) score += 2;
  }

  if (Number(event.featured)) score += 4;
  score += Math.min(8, Math.log10(Number(event.views || 0) + 1) * 3);
  score += Math.min(3, Math.log10(Number(event.likes || 0) + 1) * 2);

  if (scope === 'ongoing') {
    score += 5;
    signals.unshift('活动正在进行中');
  }

  if (scope === 'past') {
    score -= 18;
    signals.unshift('这是历史活动，仅供关注后续类似机会');
  }

  if (intent.categories.length === 0 && intent.topics.length <= 2) {
    score += Math.min(6, Number(event.views || 0) / 20);
  }

  const prioritizedSignals = [
    ...signals.filter((signal) => /综测|加分|志愿|收益|技能|作品集|主题|关键词|AI topic|score|skill|volunteer/i.test(String(signal))),
    ...signals.filter((signal) => /校区|地点|主办方|学院|面向对象|形式|日期|时间|campus|organizer|audience|format|date/i.test(String(signal))),
    ...signals.filter((signal) => /行动证据|收藏|报名|负反馈|profile|favorite|registration|feedback/i.test(String(signal))),
    ...signals
  ];
  const uniqueSignals = unique(prioritizedSignals);
  const limitedSignals = uniqueSignals.slice(0, 8);
  const personalizedSignal = uniqueSignals.find(isPersonalizationSignal);
  const visibleSignals = personalizedSignal && !limitedSignals.some(isPersonalizationSignal)
    ? unique([...limitedSignals.slice(0, 7), personalizedSignal]).slice(0, 8)
    : limitedSignals;

  return {
    event,
    score: Math.round(score),
    signals: visibleSignals,
    category: eventCategory,
    scope
  };
};

const rankCandidates = (candidates, intent, profile, scope, now = new Date()) => candidates
  .map((event) => scoreEvent(event, intent, profile, scope, now))
  .sort((left, right) => right.score - left.score || compareByAscendingDate(left.event, right.event));

const includesProfileSignal = (profile, terms) => {
  if (!profile || !Array.isArray(terms) || terms.length === 0) return false;
  const text = normalizeSearchText(
    profile.summary,
    profile.category,
    ...(profile.topics || []),
    ...(profile.benefits || []),
    ...(profile.campuses || []),
    ...(profile.audiences || []),
    ...(profile.organizers || [])
  );
  return terms.some((term) => {
    const normalized = sanitizeText(term, 80).toLowerCase();
    return normalized && text.includes(normalized);
  });
};

const scoreAiProfileCandidate = (rankedItem, intent, aiProfile) => {
  let score = rankedItem.score;
  const signals = [...rankedItem.signals];

  if (aiProfile) {
    if (intent.categories.includes(aiProfile.category)) {
      score += 26;
      signals.push(`AI画像类型匹配 ${CATEGORY_LABELS[aiProfile.category] || aiProfile.category}`);
    }
    if (includesProfileSignal(aiProfile, intent.topics)) {
      score += 22;
      signals.push('AI画像主题贴合');
    }
    if (includesProfileSignal(aiProfile, intent.benefits)) {
      score += 20;
      signals.push('AI画像收益匹配');
    }
    if (includesProfileSignal(aiProfile, intent.campuses)) {
      score += 16;
      signals.push('AI画像地点匹配');
    }
    if (includesProfileSignal(aiProfile, intent.organizers)) {
      score += 16;
      signals.push('AI画像组织/学院匹配');
    }
    if (includesProfileSignal(aiProfile, intent.audiences)) {
      score += 10;
      signals.push('AI画像面向对象匹配');
    }
    score += Math.round((aiProfile.confidence || 0) * 8);
  }

  if (intent.dateConstraints?.length) {
    const dateText = normalizeSearchText(
      rankedItem.event.date,
      rankedItem.event.end_date,
      aiProfile?.raw?.time_preference_terms?.join(' ')
    );
    if (intent.dateConstraints.some((term) => dateText.includes(String(term).toLowerCase()))) {
      score += 8;
      signals.push('时间偏好有匹配信号');
    }
  }

  return {
    ...rankedItem,
    aiScore: score,
    aiProfile,
    signals: unique(signals).slice(0, 8)
  };
};

const buildCandidateSemanticText = (item) => normalizeSearchText(
  item.event?.title,
  item.event?.description,
  item.event?.content,
  item.event?.location,
  item.event?.target_audience,
  item.event?.organizer,
  item.event?.score,
  item.event?.volunteer_time,
  item.event?.category,
  item.event?.tags,
  item.aiProfile?.summary,
  item.aiProfile?.category,
  ...(item.aiProfile?.topics || []),
  ...(item.aiProfile?.benefits || []),
  ...(item.aiProfile?.campuses || []),
  ...(item.aiProfile?.audiences || []),
  ...(item.aiProfile?.organizers || [])
);

const getIntentAiTopicStrength = (intent = {}) => {
  const text = normalizeSearchText(intent.raw, intent.query, ...(intent.topics || []));
  if (!includesAnyPhrase(text, AI_TOPIC_ALIASES)) return 0;
  if (includesAnyPhrase(text, ['大模型', 'llm', 'glm', 'chatgpt', '智能体', 'agent'])) return 2;
  return 1;
};

const getFallbackIntentBoost = (item, intent = {}) => {
  const text = buildCandidateSemanticText(item);
  let boost = 0;
  const signals = [];

  if (getIntentAiTopicStrength(intent) > 0 && includesAnyPhrase(text, AI_TOPIC_ALIASES)) {
    boost += 64;
    signals.push('备用排序：AI 主题强匹配');
  }

  const topicMatch = scoreTextMatch(text, intent.topics || [], 12, (value) => `备用排序：主题匹配「${value}」`);
  boost += topicMatch.total;
  signals.push(...topicMatch.signals.slice(0, 3));

  const campusMatch = scoreTextMatch(text, intent.campuses || [], 14, (value) => `备用排序：地点匹配 ${value}`);
  boost += campusMatch.total;
  signals.push(...campusMatch.signals.slice(0, 2));

  const benefitTerms = intent.benefits || [];
  if (benefitTerms.includes('score')) {
    const comprehensiveSignal = getComprehensiveEvaluationSignal(item.event);
    if (comprehensiveSignal || includesAnyPhrase(text, BENEFIT_ALIASES.score)) {
      boost += 24;
      signals.push('备用排序：综测/加分信息匹配');
    }
  }
  if (benefitTerms.includes('volunteer_time') && sanitizeText(item.event?.volunteer_time, 80)) {
    boost += 24;
    signals.push(`备用排序：含志愿时长 ${sanitizeText(item.event.volunteer_time, 36)}`);
  }

  if ((intent.categories || []).includes(item.category || inferEventCategory(item.event))) {
    boost += 20;
    signals.push('备用排序：活动类型匹配');
  }

  if (intent.format === 'online' && includesAny(text, ['线上', '在线', '直播', '腾讯会议'])) {
    boost += 12;
    signals.push('备用排序：符合线上偏好');
  } else if (intent.format === 'offline' && !includesAny(text, ['线上', '在线', '直播'])) {
    boost += 8;
    signals.push('备用排序：更偏线下参与');
  }

  return {
    boost,
    signals
  };
};

const getEventTimeConstraintMatch = (item, dateConstraints = [], now = new Date()) => {
  const terms = uniqueTextArray(dateConstraints || [], 10);
  if (terms.length === 0) return { score: 0, possible: 0, signals: [], misses: [] };

  const start = parseLocalDateTime(item.event?.date);
  if (!start) return {
    score: 0,
    possible: 20,
    signals: [],
    misses: ['日期']
  };

  const normalizedTerms = terms.map((term) => sanitizeText(term, 80).toLowerCase()).filter(Boolean);
  const dateText = normalizeSearchText(
    item.event?.date,
    item.event?.end_date,
    item.aiProfile?.raw?.time_preference_terms?.join(' '),
    ...(item.aiProfile?.time_preference_terms || [])
  );
  const hasTextMatch = normalizedTerms.some((term) => dateText.includes(term));
  const nowStart = getStartOfDay(now);
  const tomorrowStart = new Date(nowStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = getEndOfDay(tomorrowStart);
  const weekEnd = new Date(nowStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const day = start.getDay();

  const matched = normalizedTerms.some((term) => {
    if (hasTextMatch) return true;
    if (['today', '今天', '今晚'].includes(term)) return isSameLocalDay(start, now);
    if (['tomorrow', '明天'].includes(term)) return start >= tomorrowStart && start <= tomorrowEnd;
    if (['this_week', '本周', '这周', '近几天'].includes(term)) return start >= nowStart && start <= weekEnd;
    if (['weekend', '周末', '星期六', '星期日'].includes(term)) return day === 0 || day === 6;
    const dateMatch = term.match(/(\d{1,2})[./月-](\d{1,2})/);
    if (dateMatch) {
      return start.getMonth() + 1 === Number(dateMatch[1]) && start.getDate() === Number(dateMatch[2]);
    }
    return false;
  });

  return {
    score: matched ? 20 : 0,
    possible: 20,
    signals: matched ? [`日期匹配：${terms[0]}`] : [],
    misses: matched ? [] : ['日期']
  };
};

const getHardConstraintScore = (item, intent = {}, now = new Date()) => {
  const text = buildCandidateSemanticText(item);
  let score = 0;
  let possible = 0;
  const signals = [];
  const misses = [];

  const addGroup = (label, terms, weight) => {
    const values = uniqueTextArray(terms || [], 10);
    if (!values.length) return;
    possible += weight;
    const matched = values.find((term) => includesTermOrAlias(text, term));
    if (matched) {
      score += weight;
      signals.push(`${label}匹配：${matched}`);
    } else {
      misses.push(label);
    }
  };

  addGroup('主办方/学院', intent.organizers, 36);
  addGroup('校区/地点', intent.campuses, 18);
  addGroup('面向对象', intent.audiences, 12);

  const timeMatch = getEventTimeConstraintMatch(item, intent.dateConstraints, now);
  score += timeMatch.score;
  possible += timeMatch.possible;
  signals.push(...timeMatch.signals);
  misses.push(...timeMatch.misses);

  uniqueTextArray(intent.benefits || [], 8).forEach((benefit) => {
    possible += 14;
    const matched = getBenefitMatch(item, benefit);
    if (matched) {
      score += 14;
      signals.push(`收益匹配：${matched}`);
    } else {
      misses.push(`收益：${benefit}`);
    }
  });

  if (intent.format) {
    possible += 8;
    const onlineLike = includesAny(text, ['线上', '在线', '直播', '腾讯会议']);
    const formatMatched = intent.format === 'online' ? onlineLike : !onlineLike;
    if (formatMatched) {
      score += 8;
      signals.push(`形式匹配：${intent.format}`);
    } else {
      misses.push('参与形式');
    }
  }

  return {
    score,
    possible,
    ratio: possible > 0 ? score / possible : 1,
    signals,
    misses
  };
};

const buildAiCandidatePool = async ({
  db,
  grouped,
  intent,
  profile,
  allowScopeExpansion,
  allowHistoricalFallback,
  now,
  modelRunner,
  useProfileModel = true
}) => {
  const futureEvents = [...grouped.ongoing, ...grouped.upcoming];
  let scopedEvents = futureEvents;
  let scope = futureEvents.some((event) => classifyEventScope(event, now) === 'ongoing')
    ? 'mixed_future'
    : 'upcoming';
  let usedHistoricalFallback = false;
  let canExpandScope = false;

  if (scopedEvents.length === 0 && (allowHistoricalFallback || allowScopeExpansion || intent.allowHistorical)) {
    scopedEvents = grouped.past;
    scope = 'past';
    usedHistoricalFallback = true;
  } else if (scopedEvents.length === 0) {
    canExpandScope = grouped.past.length > 0;
  }

  if (scopedEvents.length === 0) {
    return {
      scope: 'upcoming',
      usedHistoricalFallback,
      canExpandScope,
      candidates: [],
      profileStats: { requested: 0, generated: 0, cached: 0, fallback: 0, failed: 0 },
      modelStatuses: []
    };
  }

  const preRanked = [
    ...rankCandidates(scopedEvents, intent, profile, scope === 'past' ? 'past' : 'upcoming', now),
  ]
    .sort((left, right) => right.score - left.score || compareByAscendingDate(left.event, right.event))
    .slice(0, AI_RECALL_LIMIT);

  const profileResult = await ensureEventProfiles(
    db,
    preRanked.map((item) => item.event),
    {
      limit: AI_RECALL_LIMIT,
      modelRunner,
      useModel: useProfileModel,
      persistFallback: useProfileModel,
    }
  );

  const candidates = preRanked
    .map((item) => scoreAiProfileCandidate(
      item,
      intent,
      profileResult.profilesByEventId.get(Number(item.event.id))
    ))
    .map((item) => {
      const hardConstraint = getHardConstraintScore(item, intent, now);
      return {
        ...item,
        hardConstraint,
        aiScore: item.aiScore + Math.round(hardConstraint.score * 1.2),
        signals: unique([
          ...item.signals.filter(isPersonalizationSignal),
          ...hardConstraint.signals,
          ...item.signals
        ]).slice(0, 8)
      };
    })
    .sort((left, right) => (
      (right.hardConstraint?.score || 0) - (left.hardConstraint?.score || 0)
      || right.aiScore - left.aiScore
      || compareByAscendingDate(left.event, right.event)
    ))
    .slice(0, MAX_MODEL_CANDIDATES);

  return {
    scope,
    usedHistoricalFallback,
    canExpandScope,
    candidates,
    profileStats: profileResult.stats,
    modelStatuses: profileResult.modelStatuses
  };
};

const getRankThreshold = (intent, scope) => {
  if (scope === 'past') return -5;
  if (intent.categories.length === 0 && intent.topics.length <= 2 && intent.benefits.length === 0) return 6;
  return 10;
};

const buildReason = (rankedItem) => {
  const signals = rankedItem.signals.filter(Boolean);
  if (signals.length >= 2) return `${signals[0]}，${signals[1]}。`;
  if (signals.length === 1) return `${signals[0]}。`;
  return rankedItem.scope === 'past'
    ? '这是历史活动，可作为后续关注同类活动的线索。'
    : '时间和公开信息较适合作为备选活动。';
};

const buildClarificationOptions = (intent, profile) => {
  const modelOptions = Array.isArray(intent.clarificationOptions)
    ? intent.clarificationOptions
    : [];
  const options = [
    ...modelOptions,
    intent.topics.length ? `优先找 ${intent.topics.slice(0, 2).join('、')} 相关活动` : '',
    intent.campuses.length ? `只看 ${intent.campuses[0]} 附近` : '',
    intent.benefits.includes('score') ? '优先有综测/加分信息' : '',
    intent.benefits.includes('volunteer_time') ? '优先有志愿时长' : '',
    intent.benefits.includes('skill') ? '优先能提升技能或作品集' : '',
    intent.benefits.includes('social') ? '优先轻松交流和社交' : '',
    profile.actionEvidence?.positiveCategories?.length
      ? `按你最近更常选择的 ${CATEGORY_LABELS[profile.actionEvidence.positiveCategories[0].value] || profile.actionEvidence.positiveCategories[0].value} 方向`
      : '',
    '先给我最值得参加的 3 个'
  ];

  return unique(options.map((item) => sanitizeText(item, 80))).slice(0, 4);
};

const buildClarificationQuestion = (profile) => {
  const profileHint = profile.isAnonymous ? '' : '我也会参考你的画像，';
  return `${profileHint}你更想按主题、校区，还是综测/志愿时长来筛选？`;
};

const buildIntentConfidence = (intent) => {
  let score = 0;
  if (intent.categories?.length) score += 0.18;
  if (intent.topics?.length) score += Math.min(0.24, intent.topics.length * 0.06);
  if (intent.campuses?.length) score += 0.16;
  if (intent.audiences?.length) score += 0.1;
  if (intent.benefits?.length) score += 0.14;
  if (intent.format) score += 0.08;
  if (intent.dateConstraints?.length || intent.timePreference) score += 0.1;
  if (intent.ai) score += clampNumber(intent.confidence, 0, 1, 0.55) * 0.1;
  return Number(Math.min(0.96, Math.max(0.28, score)).toFixed(2));
};

const buildReasoningTrace = ({
  intent,
  profile,
  recommendations = [],
  candidateCount = 0,
  usedHistoricalFallback = false,
  fallbackUsed = false,
  clarification = false
}) => {
  const actionTypeCounts = profile.actionEvidence?.actionTypeCounts || {};
  const actionEvidenceSummary = {
    sourceCount: Number(profile.actionEvidence?.recentRecommendationActionCount || 0),
    viewDetailCount: Number(actionTypeCounts.view_detail || 0),
    favoriteActionCount: Number(actionTypeCounts.favorite || 0),
    registerActionCount: Number(actionTypeCounts.register || 0),
    negativeActionCount: Number(actionTypeCounts.unfavorite || 0)
      + Number(actionTypeCounts.unregister || 0)
      + Number(actionTypeCounts.feedback_down || 0)
  };
  const topSignals = unique(
    recommendations
      .flatMap((item) => item.matchSignals || item.candidate?.signals || [])
      .filter(Boolean)
  ).slice(0, 8);
  const actionEvidenceUsed = recommendations.some((item) => (
    (item.matchSignals || item.candidate?.signals || [])
      .some((signal) => String(signal).includes('行动证据') || String(signal).includes('收藏') || String(signal).includes('报名') || String(signal).includes('负反馈'))
  ));
  const signalText = topSignals.join(' ');
  const hasIntentTopicCategory = Boolean(intent.categories?.length || intent.topics?.length);
  const hasIntentHardConstraint = Boolean(
    intent.campuses?.length
    || intent.organizers?.length
    || intent.audiences?.length
    || intent.benefits?.length
    || intent.format
    || intent.dateConstraints?.length
    || intent.timePreference
  );
  const hasHardConstraintDiagnostics = recommendations.some((item) => (
    Number(item.diagnostics?.hardConstraintPossible || 0) > 0
    || Number(item.diagnostics?.hardConstraintScore || 0) > 0
    || Array.isArray(item.diagnostics?.hardConstraintMatched)
  ));
  const weakOrMissing = [];

  if (!intent.campuses?.length) weakOrMissing.push('未指定校区');
  if (!intent.benefits?.length) weakOrMissing.push('未指定希望获得的收益');
  if (!intent.dateConstraints?.length && !intent.timePreference) weakOrMissing.push('时间偏好不明确');
  if (!intent.categories?.length && !intent.topics?.length) weakOrMissing.push('主题/类型较宽泛');

  return {
    intentConfidence: buildIntentConfidence(intent),
    candidateCount,
    topSignals,
    rankingBasis: topSignals.slice(0, 5),
    uncertainty: weakOrMissing.slice(0, 4),
    scoringFactors: {
      lifecycle: true,
      hardConstraints: hasIntentHardConstraint
        || hasHardConstraintDiagnostics
        || /匹配|硬约束|校区|地点|面向对象|主办方|学院|收益|形式|constraint|campus|organizer|audience|benefit|format/i.test(signalText),
      topicCategory: hasIntentTopicCategory
        || /主题|类型|关键词|AI画像|topic|category|keyword|profile/i.test(signalText),
      userProfile: /你|画像|兴趣|收藏|报名|行动证据|profile|interest|favorite|registration|action evidence/i.test(signalText),
      negativeFeedback: /负反馈|降低|negative|downrank|feedback/i.test(signalText),
      historicalFallback: Boolean(usedHistoricalFallback)
    },
    weakOrMissing: weakOrMissing.slice(0, 4),
    actionEvidenceUsed: actionEvidenceUsed || actionEvidenceSummary.sourceCount > 0,
    actionEvidenceSummary,
    fallbackUsed: Boolean(fallbackUsed),
    usedHistoricalFallback: Boolean(usedHistoricalFallback),
    clarificationSuggested: Boolean(clarification),
    rationale: clarification
      ? '问题仍有多种可行解释，因此先给出可选方向，并保留临时推荐。'
      : actionEvidenceUsed
        ? '排序同时参考了本次需求、活动画像和你近期的收藏/报名/反馈行为。'
        : '排序主要参考本次需求、活动画像、时间状态和公开活动信息。'
  };
};

const buildDecisionHint = ({ item, index, recommendations }) => {
  const title = sanitizeText(item.event?.title, 60);
  if (index === 0 && recommendations.length > 1) {
    const next = recommendations[1];
    const betterHardConstraints = Number(item.diagnostics?.hardConstraintScore || 0) >= Number(next.diagnostics?.hardConstraintScore || 0);
    const betterConfidence = Number(item.confidence || 0) >= Number(next.confidence || 0);
    if (betterHardConstraints && betterConfidence) {
      return `优先推荐「${title}」，因为它在硬条件和整体匹配上都更稳。`;
    }
    if (betterHardConstraints) {
      return `优先推荐「${title}」，因为它更完整满足你明确提出的条件。`;
    }
    return `优先推荐「${title}」，因为它和本次主题及活动画像更接近。`;
  }

  if (item.isHistorical) return '这是历史线索，适合作为后续关注同类机会的参考。';
  if (item.diagnostics?.backendCompleted) return '这是后端按硬约束和匹配信号补齐的候选。';
  return '可作为备选，对比时间、地点和收益后再决定是否参加。';
};

const buildDecisionSupport = ({ item, index, recommendations, matched, missing, uncertainty }) => {
  const title = sanitizeText(item.event?.title, 60);
  const tradeoffs = [];
  const fitFor = [];
  const watchouts = [];

  if (index === 0) {
    tradeoffs.push(recommendations.length > 1
      ? '当前排序最靠前，优先对比它的时间、地点和收益是否都能接受。'
      : '当前候选较少，建议先确认活动详情再决定。');
  } else {
    tradeoffs.push('适合作为备选，建议和第一项比较硬条件、时间安排和收益匹配。');
  }

  if (Number(item.diagnostics?.hardConstraintRatio || 0) >= 0.8) {
    fitFor.push('更适合想优先满足明确条件的选择。');
  }
  if (matched.some((signal) => /行动证据|收藏|报名|反馈/.test(String(signal)))) {
    fitFor.push('和你近期的收藏、报名或反馈行为有相关信号。');
  }
  if (matched.some((signal) => /收益|综测|志愿|skill|score|volunteer/i.test(String(signal)))) {
    fitFor.push('适合把活动收益也纳入选择标准。');
  }
  if (fitFor.length === 0) {
    fitFor.push('适合先查看详情，再判断主题、地点和时间是否合适。');
  }

  if (missing.length) {
    watchouts.push(`还缺少确认：${missing.slice(0, 2).join('、')}。`);
  }
  if (uncertainty.length) {
    watchouts.push(`仍不确定：${uncertainty.slice(0, 2).join('、')}。`);
  }
  if (item.isHistorical) {
    watchouts.push('这是历史活动，只适合作为后续同类机会参考。');
  }

  const preferencePrompt = missing.length || uncertainty.length
    ? `如果要更准，可以补充${unique([...missing, ...uncertainty]).slice(0, 2).join('、')}。`
    : '';
  const nextAction = item.isHistorical
    ? `把「${title}」作为同类机会参考`
    : missing.length || uncertainty.length
      ? `查看「${title}」详情并确认关键条件`
      : `优先查看「${title}」详情`;

  return {
    nextAction,
    tradeoffs: unique(tradeoffs).slice(0, 3),
    fitFor: unique(fitFor).slice(0, 3),
    watchouts: unique(watchouts).slice(0, 3),
    preferencePrompt
  };
};

const buildOpportunityMatch = ({ item, index, recommendations, reasoningTrace }) => {
  const matchedSignals = unique(item.matchSignals || []);
  const priorityMatched = [
    ...matchedSignals.filter((signal) => /收益|主题|关键词|类型|AI topic|topic|skill|social|volunteer/i.test(String(signal))),
    ...matchedSignals.filter((signal) => /校区|地点|主办方|学院|面向对象|形式|日期|时间|campus|organizer|audience|format|date/i.test(String(signal))),
    ...matchedSignals.filter((signal) => /行动证据|收藏|报名|负反馈|profile|favorite|registration|feedback/i.test(String(signal))),
    ...matchedSignals
  ];
  const matched = unique(priorityMatched).slice(0, 6);
  const missing = unique(item.diagnostics?.hardConstraintMisses || []).slice(0, 4);
  const uncertainty = unique([
    ...(reasoningTrace?.uncertainty || []),
    ...(item.isHistorical ? ['历史活动不代表仍可报名'] : []),
    ...(item.aiProfile?.status && item.aiProfile.status !== 'ready' ? ['活动画像可能不完整'] : [])
  ]).slice(0, 4);
  const feedbackSignals = matched.filter((signal) => /负反馈|行动证据|收藏|报名/.test(String(signal)));

  return {
    stage: OPPORTUNITY_MATCH_STAGE,
    matched,
    missing,
    uncertainty,
    decisionHint: buildDecisionHint({ item, index, recommendations }),
    decisionSupport: buildDecisionSupport({
      item,
      index,
      recommendations,
      matched,
      missing,
      uncertainty
    }),
    feedbackLearning: {
      used: feedbackSignals.length > 0,
      signals: feedbackSignals.slice(0, 3)
    }
  };
};

const attachOpportunityMatches = ({ recommendations, reasoningTrace }) => recommendations.map((item, index, list) => ({
  ...item,
  opportunityMatch: buildOpportunityMatch({
    item,
    index,
    recommendations: list,
    reasoningTrace
  })
}));

const buildIntentSummary = (intent, profile) => {
  const parts = [];
  if (intent.categories.length) parts.push(`类型：${intent.categories.map((item) => CATEGORY_LABELS[item] || item).join('、')}`);
  if (intent.campuses.length) parts.push(`地点：${intent.campuses.join('、')}`);
  if (intent.audiences.length) parts.push(`对象：${intent.audiences.join('、')}`);
  if (intent.benefits.length) parts.push(`收益：${intent.benefits.map(getBenefitLabel).join('、')}`);
  if (intent.format) parts.push(intent.format === 'online' ? '偏线上' : '偏线下');

  const profileSummary = buildProfileSummary(profile);
  return {
    understood: parts.length ? parts : ['按本次提问寻找活动'],
    profile: profileSummary
  };
};

const maybeRememberPreference = async (db, userId, intent, rememberPreference) => {
  if (!userId || (!rememberPreference && !intent.wantsMemory)) {
    return false;
  }

  const content = sanitizeText(
    [
      intent.categories.length ? `类型偏好：${intent.categories.map((item) => CATEGORY_LABELS[item] || item).join('、')}` : '',
      intent.benefits.length ? `收益偏好：${intent.benefits.map(getBenefitLabel).join('、')}` : '',
      intent.format ? `参与方式：${intent.format === 'online' ? '线上' : '线下'}` : '',
      intent.campuses.length ? `校区：${intent.campuses.join('、')}` : '',
      intent.topics.length ? `关键词：${intent.topics.slice(0, 5).join('、')}` : ''
    ].filter(Boolean).join('；'),
    300
  );

  if (!content) return false;

  await db.run(
    `
      INSERT INTO assistant_memory (user_id, memory_type, content, source, weight, updated_at)
      VALUES (?, 'event_preference', ?, 'event_assistant', 1, datetime('now'))
    `,
    [userId, content]
  );

  return true;
};

const buildModelPrompt = ({ intent, profile, rankedItems }) => ({
  modelRequest: 'polish_recommendation_copy',
  userIntent: {
    query: intent.query,
    categories: intent.categories,
    benefits: intent.benefits,
    format: intent.format,
    campuses: intent.campuses,
    audiences: intent.audiences
  },
  profile: buildProfileSummary(profile),
  candidates: rankedItems.map((item) => ({
    id: item.event.id,
    title: item.event.title,
    date: item.event.date,
    location: item.event.location,
    target_audience: item.event.target_audience,
    score: item.event.score,
    volunteer_time: item.event.volunteer_time,
    deterministicSignals: item.signals,
    deterministicReason: buildReason(item)
  })),
  outputContract: {
    summary: 'short Chinese sentence',
    recommendations: [
      {
        id: 'candidate id',
        reason: 'one concrete Chinese sentence based only on candidate fields and deterministicSignals'
      }
    ]
  }
});

const polishWithModel = async (db, intent, profile, rankedItems) => {
  if (rankedItems.length === 0) return null;

  try {
    const result = await aiRuntime.callJson(
      db,
      {
        messages: [
          {
            role: 'system',
            content: '你是浙江大学活动推荐助手的文案层。只能根据服务端给你的候选活动和匹配信号输出 JSON，不得新增活动、链接、时间或未提供的事实。'
          },
          {
            role: 'user',
            content: JSON.stringify(buildModelPrompt({ intent, profile, rankedItems }), null, 2)
          }
        ],
        task: 'event_recommendation_rerank_legacy',
        temperature: 0.2,
        maxTokens: 900,
        timeout: 25000
      }
    );

    const rawContent = result.rawContent;
    const parsed = result.parsed;
    if (!parsed || typeof parsed !== 'object') return null;

    const reasonById = new Map();
    if (Array.isArray(parsed.recommendations)) {
      for (const item of parsed.recommendations) {
        const id = Number(item?.id);
        const reason = sanitizeText(item?.reason, 140);
        if (Number.isInteger(id) && reason) reasonById.set(id, reason);
      }
    }

    return {
      summary: sanitizeText(parsed.summary, 160),
      reasonById,
      modelStatus: {
        used: true,
        provider: result.config?.name || null,
        fallbackAttempts: result.attempts || []
      }
    };
  } catch (error) {
    return {
      summary: '',
      reasonById: new Map(),
      modelStatus: {
        used: false,
        fallbackUsed: true,
        message: '模型暂不可用，已使用规则推荐结果。',
        attempts: error.attempts || []
      }
    };
  }
};

const runInjectedModelTurn = async ({
  db,
  query,
  clarificationAnswer,
  clarificationUsed = false,
  allowScopeExpansion = false,
  modelRunner,
  now = new Date()
}) => {
  const intent = buildAssistantIntent({ query, clarificationAnswer });
  const scopeInfo = await pickCandidateScope(db, allowScopeExpansion, now);

  if (scopeInfo.candidates.length === 0) {
    return {
      type: 'empty',
      scope: scopeInfo.scope,
      emptyReason: scopeInfo.scope === 'upcoming' ? 'no_upcoming' : 'no_matches',
      canExpandScope: scopeInfo.canExpandScope
    };
  }

  const candidateMap = new Map(scopeInfo.candidates.map((event) => [event.id, event]));
  const assistantCandidates = scopeInfo.candidates.map(serializeEventForAssistant);

  let validated;
  let rawContent = '';
  let jsonText = '';
  let parsedResult;
  try {
    const modelOutput = normalizeModelRunnerOutput(await modelRunner({
      intent,
      scope: scopeInfo.scope,
      clarificationAllowed: !clarificationUsed,
      candidates: assistantCandidates
    }));

    rawContent = modelOutput.rawContent;
    jsonText = modelOutput.jsonText;

    try {
      parsedResult = JSON.parse(jsonText);
    } catch (error) {
      throw createAssistantError('EVENT_ASSISTANT_MODEL_INVALID', 'Model returned invalid JSON.', 502);
    }

    validated = validateModelResult(parsedResult, {
      clarificationAllowed: !clarificationUsed,
      candidateMap
    });
  } catch (error) {
    if (!['EVENT_ASSISTANT_MODEL_INVALID', 'EVENT_ASSISTANT_MODEL_EMPTY'].includes(error?.code)) {
      throw error;
    }

    rawContent = rawContent || error.rawContent || '';

    logInvalidModelOutput({
      error,
      scope: scopeInfo.scope,
      candidateCount: scopeInfo.candidates.length,
      rawContent,
      jsonText,
      parsedResult
    });

    validated = {
      type: 'empty',
      emptyReason: 'assistant_unreliable'
    };
  }

  if (validated.type === 'empty') {
    return {
      type: 'empty',
      scope: scopeInfo.scope,
      emptyReason: validated.emptyReason || 'no_matches',
      canExpandScope: false
    };
  }

  if (validated.type === 'clarify') {
    return {
      type: 'clarify',
      scope: scopeInfo.scope,
      question: validated.question,
      clarificationOptions: [],
      provisionalRecommendations: scopeInfo.candidates
        .slice(0, Math.min(3, MAX_RECOMMENDATIONS))
        .map((event) => ({
          id: event.id,
          reason: '这是可先参考的候选活动，回答澄清问题后我会重新排序。',
          matchSignals: [],
          score: 0,
          isHistorical: false,
          event: serializeEventForClient(event)
        })),
      clarificationUsed: true,
      reasoningTrace: {
        intentConfidence: 0.35,
        candidateCount: scopeInfo.candidates.length,
        topSignals: [],
        weakOrMissing: ['需要更多偏好信息'],
        actionEvidenceUsed: false,
        fallbackUsed: false,
        usedHistoricalFallback: false,
        clarificationSuggested: true,
        rankingBasis: [],
        uncertainty: ['需要更多偏好信息'],
        rationale: '模型要求先澄清用户偏好。'
      }
    };
  }

  return {
    type: 'recommend',
    scope: scopeInfo.scope,
    recommendations: validated.recommendations.map((item) => ({
      id: item.id,
      reason: item.reason,
      event: serializeEventForClient(candidateMap.get(item.id))
    }))
  };
};

const buildAiRerankPrompt = ({ intent, profile, candidates, recommendationCount }) => ({
  modelRequest: 'event_recommendation_rerank',
  instruction: [
    'Rank only the provided candidate events.',
    'Use the user intent, user profile, event AI profiles, deterministic recall signals, and event facts together.',
    'Use actionEvidence as a personalization signal only; it must not override explicit date, campus, organizer, benefit, or activity-type intent.',
    'Treat explicit organizer/college, date, campus, benefit, and format as hard constraints. If two candidates both match the topic, rank the candidate satisfying more hard constraints first even when another candidate has a softer category or popularity advantage.',
    'When the user names a college/organizer, candidates from that organizer should outrank candidates from other organizers unless the organizer-matched candidate clearly lacks the requested topic or benefit.',
    'Return compact JSON only. No long explanations.',
    'Return user-facing reasons and matched signals only; do not expose hidden chain-of-thought.',
    'Do not invent activities, links, rewards, registration status, locations, or dates.',
    'Prefer future and ongoing events. Historical events are only fallback clues.'
  ],
    userIntent: {
      query: intent.query,
      querySummary: intent.querySummary,
      categories: intent.categories,
      benefits: intent.benefits,
      format: intent.format,
      campuses: intent.campuses,
      organizers: intent.organizers,
      audiences: intent.audiences,
      topics: intent.topics,
      dateConstraints: intent.dateConstraints,
      hardConstraints: intent.hardConstraints || []
    },
  profile: buildProfileSummary(profile),
  candidates: candidates.map((item) => ({
    id: item.event.id,
    title: item.event.title,
    description: sanitizeText(item.event.description, 120),
    date: item.event.date,
    end_date: item.event.end_date,
    location: item.event.location,
    organizer: item.event.organizer,
    target_audience: item.event.target_audience,
    score: item.event.score,
    volunteer_time: item.event.volunteer_time,
    category: item.category,
    recallScore: item.aiScore ?? item.score,
    actionEvidence: {
      positiveCategoryWeight: getActionEvidenceCategory(profile, item.category, 'positiveCategories')?.weight || 0,
      negativeCategoryWeight: getActionEvidenceCategory(profile, item.category, 'negativeCategories')?.weight || 0,
      categoryActionWeight: getActionEvidenceCategory(profile, item.category, 'positiveCategories')?.weight || 0,
      priorViewDetail: Boolean(profile.actionEvidence?.viewedEventIds?.includes(Number(item.event.id))),
      priorFavoriteAction: Boolean(profile.actionEvidence?.recommendationFavoriteEventIds?.includes(Number(item.event.id))),
      priorRegisterAction: Boolean(profile.actionEvidence?.recommendationRegisterEventIds?.includes(Number(item.event.id))),
      priorNegativeAction: Boolean(profile.actionEvidence?.negativeActionEventIds?.includes(Number(item.event.id))),
      priorPositiveAction: Boolean(profile.actionEvidence?.positiveEventIds?.includes(Number(item.event.id))),
      priorNegativeFeedback: Boolean(profile.actionEvidence?.negativeEventIds?.includes(Number(item.event.id)))
    },
    deterministicSignals: item.signals,
    hardConstraintScore: item.hardConstraint?.score || 0,
    hardConstraintPossible: item.hardConstraint?.possible || 0,
    hardConstraintMatched: item.hardConstraint?.signals || [],
    hardConstraintMisses: item.hardConstraint?.misses || [],
    deterministicReason: buildReason(item),
    aiProfile: item.aiProfile ? {
      summary: sanitizeText(item.aiProfile.summary, 120),
      category: item.aiProfile.category,
      topics: (item.aiProfile.topics || []).slice(0, 6),
      benefits: (item.aiProfile.benefits || []).slice(0, 5),
      campuses: item.aiProfile.campuses,
      organizers: item.aiProfile.organizers,
      audiences: (item.aiProfile.audiences || []).slice(0, 5),
      confidence: item.aiProfile.confidence,
      status: item.aiProfile.status
    } : null
  })),
  outputContract: {
    summary: 'short Chinese sentence explaining how you ranked the results',
    recommendations: [
      {
        id: 'candidate event id',
        rank: '1-based rank',
        confidence: '0-1 number',
        reason: 'one concrete Chinese sentence grounded in event facts and user intent',
        matched_signals: ['short Chinese match labels']
      }
    ],
    reasoning_trace: {
      ranking_basis: ['short user-facing ranking factors'],
      uncertainty: ['missing or weak preference signals'],
      action_evidence_used: 'boolean'
    },
    style: 'Keep summary under 60 Chinese characters, each reason under 60 Chinese characters, and matched_signals under 4 items.',
    minimumCount: Math.min(IDEAL_MIN_RECOMMENDATIONS, recommendationCount),
    maximumCount: recommendationCount
  }
});

const normalizeRerankResult = (rawResult, candidateMap) => {
  if (!rawResult || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    throw createAssistantError('EVENT_ASSISTANT_MODEL_INVALID', 'Model returned an invalid rerank object.', 502);
  }

  if (!Array.isArray(rawResult.recommendations)) {
    throw createAssistantError('EVENT_ASSISTANT_MODEL_INVALID', 'Model rerank did not include recommendations.', 502);
  }

  const recommendations = [];
  const seenIds = new Set();

  for (const item of rawResult.recommendations) {
    const id = Number(item?.id ?? item?.eventId);
    if (!Number.isInteger(id) || !candidateMap.has(id) || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);
    recommendations.push({
      id,
      rank: Number(item?.rank) || recommendations.length + 1,
      confidence: Math.min(Math.max(Number(item?.confidence) || 0.65, 0), 1),
      reason: sanitizeText(item?.reason, 180),
      matchedSignals: uniqueTextArray(item?.matched_signals || item?.matchedSignals, 5, 60)
    });
  }

  const { max } = getRecommendationCountBounds(candidateMap.size);
  if (recommendations.length === 0) {
    throw createAssistantError('EVENT_ASSISTANT_MODEL_INVALID', 'Model rerank did not include any valid candidate IDs.', 502);
  }

  return {
    summary: sanitizeText(rawResult.summary, 180),
    reasoningTrace: rawResult.reasoning_trace && typeof rawResult.reasoning_trace === 'object'
      ? {
        rankingBasis: uniqueTextArray(rawResult.reasoning_trace.ranking_basis || rawResult.reasoning_trace.rankingBasis, 6, 80),
        uncertainty: uniqueTextArray(rawResult.reasoning_trace.uncertainty, 4, 80),
        actionEvidenceUsed: Boolean(rawResult.reasoning_trace.action_evidence_used || rawResult.reasoning_trace.actionEvidenceUsed)
      }
      : null,
    recommendations: recommendations
      .sort((left, right) => left.rank - right.rank)
      .slice(0, max)
  };
};

const completeRerankRecommendations = ({ recommendations = [], candidates = [] }) => {
  const { min, max } = getRecommendationCountBounds(candidates.length);
  const next = recommendations.slice(0, max);
  const seenIds = new Set(next.map((item) => Number(item.id)));

  if (next.length >= min) return next;

  const fallbackCandidates = [...candidates]
    .sort((left, right) => (
      (right.hardConstraint?.score || 0) - (left.hardConstraint?.score || 0)
      || (right.aiScore ?? right.score ?? 0) - (left.aiScore ?? left.score ?? 0)
      || compareByAscendingDate(left.event, right.event)
    ));

  for (const candidate of fallbackCandidates) {
    const id = Number(candidate.event.id);
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    next.push({
      id,
      rank: next.length + 1,
      confidence: Math.max(0.52, Math.min(0.82, ((candidate.aiScore ?? candidate.score ?? 0) / 150) + 0.42)),
      reason: buildReason(candidate),
      matchedSignals: unique([
        ...(candidate.hardConstraint?.signals || []),
        ...(candidate.signals || [])
      ]).slice(0, 5),
      completedByBackend: true
    });
    if (next.length >= min) break;
  }

  return next.slice(0, max).map((item, index) => ({
    ...item,
    rank: index + 1
  }));
};

const mergeRecommendationSignals = ({
  modelSignals = [],
  candidateSignals = [],
  hardConstraintSignals = [],
  limit = 6
} = {}) => {
  const personalized = candidateSignals.filter(isPersonalizationSignal);
  const merged = unique([
    ...hardConstraintSignals,
    ...modelSignals,
    ...candidateSignals.filter((signal) => !isPersonalizationSignal(signal)),
    ...personalized,
    ...candidateSignals
  ]);
  const limited = merged.slice(0, limit);
  if (personalized.length && !limited.some(isPersonalizationSignal)) {
    return unique([
      ...limited.slice(0, Math.max(0, limit - 1)),
      personalized[0]
    ]).slice(0, limit);
  }
  return limited;
};

const rerankCandidatesWithModel = async ({
  db,
  intent,
  profile,
  candidates,
  modelRunner
}) => {
  const recommendationCount = Math.min(MAX_RECOMMENDATIONS, candidates.length);
  const candidateMap = new Map(candidates.map((item) => [Number(item.event.id), item]));

  const modelRequest = {
    task: 'event_recommendation_rerank',
    modelRunner,
    messages: [
      {
        role: 'system',
        content: [
          '你是浙江大学活动推荐助手的推理排序层。',
          '你必须使用大模型语义理解对候选活动重排，但只能在候选列表内选择 event id。',
          '显式日期、校区、学院/组织、收益和参与形式优先于泛兴趣、热度和画像偏好。',
          '如果候选同时满足主题，满足更多 hardConstraint 的候选必须排在前面。',
          '只返回严格 JSON，不要输出 Markdown，不要输出隐藏思考过程。'
        ].join('\n')
      },
      {
        role: 'user',
        content: JSON.stringify(buildAiRerankPrompt({
          intent,
          profile,
          candidates,
          recommendationCount
        }), null, 2)
      }
    ]
  };
  const compactPrompt = buildAiRerankPrompt({
    intent,
    profile,
    candidates,
    recommendationCount
  });

  let result;
  try {
    result = await aiRuntime.callJson(db, modelRequest);
  } catch (error) {
    if (!['AI_RUNTIME_EMPTY_CONTENT', 'AI_RUNTIME_INVALID_JSON'].includes(error.code)) throw error;
    result = await aiRuntime.callJson(db, {
      ...modelRequest,
      maxTokens: 360,
      timeout: 20000,
      messages: [
        modelRequest.messages[0],
        {
          role: 'user',
          content: JSON.stringify({
            instruction: 'Retry. Return compact valid JSON only. Rank by hardConstraintScore first, then semantic relevance.',
            userIntent: compactPrompt.userIntent,
            candidates: candidates.map((item) => ({
              id: item.event.id,
              title: item.event.title,
              organizer: item.event.organizer,
              category: item.category,
              hardConstraintScore: item.hardConstraint?.score || 0,
              hardConstraintPossible: item.hardConstraint?.possible || 0,
              signals: item.signals.slice(0, 5),
              summary: item.aiProfile?.summary || sanitizeText(item.event.description, 120)
            })),
            outputContract: compactPrompt.outputContract
          })
        }
      ]
    });
  }

  const normalized = normalizeRerankResult(result.parsed, candidateMap);
  return {
    ...normalized,
    modelStatus: result.modelStatus,
    rawRerank: result.parsed
  };
};

const buildAiRecommendationResponse = ({
  rerank,
  candidates,
  intent,
  profile,
  scope,
  canExpandScope,
  usedHistoricalFallback,
  remembered,
  coverage,
  profileStats,
  modelStatuses
}) => {
  const candidateMap = new Map(candidates.map((item) => [Number(item.event.id), item]));
  const sortedByHardConstraints = [...candidates].sort((left, right) => (
    (right.hardConstraint?.score || 0) - (left.hardConstraint?.score || 0)
    || right.aiScore - left.aiScore
    || compareByAscendingDate(left.event, right.event)
  ));
  const bestHardConstraintScore = sortedByHardConstraints[0]?.hardConstraint?.score || 0;
  const selected = rerank.recommendations
    .map((item) => ({
      ...item,
      candidate: candidateMap.get(Number(item.id))
    }))
    .filter((item) => item.candidate);
  if (
    bestHardConstraintScore > 0
    && selected.length > 0
    && (selected[0].candidate?.hardConstraint?.score || 0) < bestHardConstraintScore
  ) {
    const best = sortedByHardConstraints[0];
    const existingIndex = selected.findIndex((item) => Number(item.id) === Number(best.event.id));
    const promoted = existingIndex >= 0
      ? selected.splice(existingIndex, 1)[0]
      : {
        id: best.event.id,
        rank: 1,
        confidence: Math.max(0.68, Math.min(0.92, (best.aiScore / 160) + 0.45)),
        reason: buildReason(best),
        matchedSignals: [],
        candidate: best
      };
    selected.unshift({
      ...promoted,
      confidence: Math.max(Number(promoted.confidence || 0), 0.86),
      matchedSignals: unique([
        ...mergeRecommendationSignals({
          modelSignals: promoted.matchedSignals || [],
          candidateSignals: best.signals || [],
          hardConstraintSignals: best.hardConstraint?.signals || [],
          limit: 8
        })
      ])
    });
  }
  const completedSelected = completeRerankRecommendations({
    recommendations: selected,
    candidates
  }).map((item) => ({
    ...item,
    candidate: item.candidate || candidateMap.get(Number(item.id))
  })).filter((item) => item.candidate);
  const baseRecommendations = completedSelected.map((item, index) => ({
    id: item.candidate.event.id,
    rank: index + 1,
    reason: item.reason || buildReason(item.candidate),
    confidence: item.confidence,
    matchSignals: mergeRecommendationSignals({
      modelSignals: item.matchedSignals || [],
      candidateSignals: item.candidate.signals || [],
      hardConstraintSignals: item.candidate.hardConstraint?.signals || [],
      limit: 8
    }),
    score: Math.round(item.score ?? item.candidate.aiScore ?? item.candidate.score),
    isHistorical: item.candidate.scope === 'past',
    diagnostics: {
      deterministicScore: Math.round(item.candidate.score || 0),
      semanticScore: Math.round(item.candidate.aiScore ?? item.candidate.score ?? 0),
      hardConstraintScore: Math.round(item.candidate.hardConstraint?.score || 0),
      hardConstraintPossible: Math.round(item.candidate.hardConstraint?.possible || 0),
      hardConstraintRatio: Number((item.candidate.hardConstraint?.ratio ?? 1).toFixed(3)),
      hardConstraintMisses: item.candidate.hardConstraint?.misses || [],
      scope: item.candidate.scope,
      backendCompleted: Boolean(item.completedByBackend)
    },
    aiProfile: item.candidate.aiProfile ? {
      summary: item.candidate.aiProfile.summary,
      category: item.candidate.aiProfile.category,
      confidence: item.candidate.aiProfile.confidence,
      status: item.candidate.aiProfile.status
    } : null,
    event: serializeEventForClient(item.candidate.event)
  }));
  const reasoningTrace = buildReasoningTrace({
    intent,
    profile,
    recommendations: baseRecommendations,
    candidateCount: candidates.length,
    usedHistoricalFallback,
    fallbackUsed: Boolean(rerank.modelStatus?.fallbackUsed)
  });
  const recommendations = attachOpportunityMatches({
    recommendations: baseRecommendations,
    reasoningTrace: {
      ...reasoningTrace,
      uncertainty: rerank.reasoningTrace?.uncertainty?.length
        ? rerank.reasoningTrace.uncertainty
        : reasoningTrace.weakOrMissing
    }
  });
  const hardConstraintDiagnostics = getHardConstraintDiagnostics(recommendations);
  const backendCompletedRecommendationCount = recommendations.filter((item) => item.diagnostics?.backendCompleted).length;
  const feedbackLearningUsed = recommendations.some((item) => item.opportunityMatch?.feedbackLearning?.used);

  return {
    type: 'recommend',
    scope,
    recommendationMode: usedHistoricalFallback ? 'historical_fallback' : 'future',
    coverage,
    summary: rerank.summary || (usedHistoricalFallback
      ? 'AI 先检索未来活动，匹配不足后按语义相似度给出历史线索。'
      : 'AI 已结合你的需求、活动画像和候选活动完成重排。'),
    understoodIntent: buildIntentSummary(intent, profile),
    reasoningTrace: {
      ...reasoningTrace,
      rankingBasis: rerank.reasoningTrace?.rankingBasis?.length
        ? rerank.reasoningTrace.rankingBasis
        : reasoningTrace.topSignals.slice(0, 5),
      uncertainty: rerank.reasoningTrace?.uncertainty?.length
        ? rerank.reasoningTrace.uncertainty
        : reasoningTrace.weakOrMissing,
      actionEvidenceUsed: Boolean(rerank.reasoningTrace?.actionEvidenceUsed || reasoningTrace.actionEvidenceUsed),
      opportunityStage: OPPORTUNITY_MATCH_STAGE,
      hardConstraintDiagnostics,
      backendCompletedRecommendationCount,
      feedbackLearning: {
        used: feedbackLearningUsed,
        negativeReasons: profile.actionEvidence?.negativeReasons || []
      }
    },
    canExpandScope,
    remembered,
    warnings: usedHistoricalFallback
      ? ['以下包含历史活动，不代表仍可报名；建议关注后续同类活动。']
      : [],
    modelStatus: {
      ...rerank.modelStatus,
      used: true,
      tasks: [
        'event_recommendation_intent',
        'event_profile_index',
        'event_recommendation_rerank'
      ],
      profileStats,
      profileModelStatuses: modelStatuses || []
    },
    recommendations
  };
};

const buildFallbackRerank = (candidates, intent, summary) => {
  const ranked = candidates
    .map((item) => {
      const fallback = getFallbackIntentBoost(item, intent);
      return {
        ...item,
        aiScore: (item.aiScore ?? item.score ?? 0) + fallback.boost,
        signals: unique([
          ...fallback.signals,
          ...(item.signals || [])
        ]).slice(0, 8)
      };
    })
    .sort((left, right) => (
      (right.hardConstraint?.score || 0) - (left.hardConstraint?.score || 0)
      || right.aiScore - left.aiScore
      || compareByAscendingDate(left.event, right.event)
    ));

  return {
    summary,
    modelStatus: {
      used: false,
      fallbackUsed: true,
      task: 'event_recommendation_fallback',
    },
    reasoningTrace: {
      rankingBasis: unique(ranked.flatMap((item) => item.signals || [])).slice(0, 5),
      uncertainty: [],
      actionEvidenceUsed: ranked.some((item) => (
        (item.signals || []).some((signal) => String(signal).includes('行动证据') || String(signal).includes('负反馈'))
      ))
    },
    recommendations: ranked.slice(0, MAX_RECOMMENDATIONS).map((item, index) => ({
      id: item.event.id,
      rank: index + 1,
      score: Math.round(item.aiScore ?? item.score),
      confidence: Math.max(0.45, Math.min(0.78, ((item.aiScore ?? item.score) / 120) + 0.38)),
      reason: buildReason(item),
      matchedSignals: unique([
        ...(item.hardConstraint?.signals || []),
        ...(item.signals || [])
      ]).slice(0, 6)
    }))
  };
};

const buildFallbackRecommendationResponse = ({
  candidates,
  intent,
  profile,
  scope,
  canExpandScope,
  usedHistoricalFallback,
  remembered,
  coverage,
  profileStats,
  modelStatuses,
  failedTask,
  failureMessage
}) => {
  const rerank = buildFallbackRerank(
    candidates,
    intent,
    usedHistoricalFallback
      ? '大模型本轮没有完成排序，我先用活动画像和匹配信号给出历史活动线索。'
      : '大模型本轮没有完成排序，我先用活动画像和匹配信号给出可参考活动。'
  );
  const response = buildAiRecommendationResponse({
    rerank,
    candidates,
    intent,
    profile,
    scope,
    canExpandScope,
    usedHistoricalFallback,
    remembered,
    coverage,
    profileStats,
    modelStatuses
  });

  return {
    ...response,
    recommendationMode: usedHistoricalFallback ? 'historical_fallback_ai_attempted' : 'fallback_ai_attempted',
    warnings: unique([
      ...(response.warnings || []),
      '本轮已尝试调用大模型，但模型输出不稳定；当前结果来自活动画像索引和匹配信号，建议作为候选参考。'
    ]),
    modelStatus: {
      ...response.modelStatus,
      used: false,
      fallbackUsed: true,
      failedTask,
      message: failureMessage || 'AI model did not return a reliable JSON result.',
      tasks: [
        'event_recommendation_intent_attempted',
        'event_profile_index',
        'fallback_candidate_ranking'
      ],
      profileStats,
      profileModelStatuses: modelStatuses || []
    }
  };
};

const callUnifiedEventAssistantModel = async ({ db, messages, payload, modelRunner }) => {
  if (!db) {
    throw createAssistantError(
      'EVENT_ASSISTANT_UNAVAILABLE',
      'The event AI assistant is not configured on the server.',
      503
    );
  }

  const result = await aiRuntime.callJson(db, {
    task: 'event_assistant_custom',
    modelRunner,
    messages: payload?.messages || messages,
    temperature: payload?.temperature ?? 0.2,
    maxTokens: payload?.max_tokens || payload?.maxTokens || 1200,
    timeout: payload?.timeout || 45000
  });

  return {
    rawContent: result.rawContent,
    jsonText: result.jsonText,
    config: result.config,
    attempts: result.attempts,
    parsed: result.parsed
  };
};

const callEventAssistantModel = callUnifiedEventAssistantModel;

const buildRecommendationResponse = async ({
  db,
  rankedItems,
  intent,
  profile,
  scope,
  canExpandScope,
  usedHistoricalFallback,
  remembered,
  coverage
}) => {
  const selected = rankedItems.slice(0, MAX_RECOMMENDATIONS);
  const polish = await polishWithModel(db, intent, profile, selected.slice(0, MAX_MODEL_CANDIDATES));
  const reasonById = polish?.reasonById || new Map();
  const recommendations = selected.map((item) => ({
    id: item.event.id,
    reason: reasonById.get(item.event.id) || buildReason(item),
    matchSignals: item.signals,
    score: item.score,
    isHistorical: item.scope === 'past',
    event: serializeEventForClient(item.event)
  }));

  return {
    type: 'recommend',
    scope,
    recommendationMode: usedHistoricalFallback ? 'historical_fallback' : 'future',
    coverage,
    summary: polish?.summary || (usedHistoricalFallback
      ? '没有找到足够合适的未来活动，先给你几条历史活动线索。'
      : '我按你的提问和可用画像筛了一组更贴近的活动。'),
    understoodIntent: buildIntentSummary(intent, profile),
    reasoningTrace: buildReasoningTrace({
      intent,
      profile,
      recommendations,
      candidateCount: rankedItems.length,
      usedHistoricalFallback,
      fallbackUsed: polish?.modelStatus?.fallbackUsed
    }),
    canExpandScope,
    remembered,
    warnings: usedHistoricalFallback
      ? ['以下包含历史活动，不代表仍可报名；建议关注后续同类活动。']
      : [],
    modelStatus: polish?.modelStatus || {
      used: false,
      message: '未启用模型润色，使用规则推荐结果。'
    },
    recommendations
  };
};

const buildProvisionalClarificationRecommendations = (grouped, intent, profile, now) => [
  ...rankCandidates(grouped.ongoing, intent, profile, 'ongoing', now),
  ...rankCandidates(grouped.upcoming, intent, profile, 'upcoming', now)
]
  .sort((left, right) => right.score - left.score || compareByAscendingDate(left.event, right.event))
  .slice(0, Math.min(3, MAX_RECOMMENDATIONS))
  .map((item) => ({
    id: item.event.id,
    reason: buildReason(item),
    matchSignals: item.signals,
    score: item.score,
    isHistorical: false,
    event: serializeEventForClient(item.event)
  }));

const buildClarificationResponse = ({
  intent,
  profile,
  grouped,
  coverage,
  remembered,
  modelStatus,
  now,
  question
}) => {
  const provisionalRecommendations = buildProvisionalClarificationRecommendations(grouped, intent, profile, now);
  return {
    type: 'clarify',
    scope: 'upcoming',
    question: question || intent.clarificationQuestion || buildClarificationQuestion(profile),
    clarificationOptions: buildClarificationOptions(intent, profile),
    provisionalRecommendations,
    clarificationUsed: true,
    recommendationMode: 'clarify',
    coverage,
    understoodIntent: buildIntentSummary(intent, profile),
    reasoningTrace: buildReasoningTrace({
      intent,
      profile,
      recommendations: provisionalRecommendations,
      candidateCount: grouped.upcoming.length + grouped.ongoing.length,
      clarification: true
    }),
    remembered,
    modelStatus
  };
};

const runEventAssistantTurn = async ({
  db,
  query,
  clarificationAnswer,
  clarificationUsed = false,
  allowScopeExpansion = false,
  allowHistoricalFallback = true,
  rememberPreference = false,
  userId = null,
  modelRunner,
  now = new Date()
}) => {
  return runUnifiedEventAssistantTurn({
    db,
    query,
    clarificationAnswer,
    clarificationUsed,
    allowScopeExpansion,
    allowHistoricalFallback,
    rememberPreference,
    userId,
    modelRunner,
    now
  });
};

const timeEventAssistantStep = async (timings, key, operation) => {
  const startedAt = Date.now();
  try {
    return await operation();
  } finally {
    timings[key] = Date.now() - startedAt;
  }
};

const attachEventAssistantPerformance = (response = {}, timings = {}, startedAt = Date.now()) => {
  const performance = {
    durationMs: Date.now() - startedAt,
    ...Object.fromEntries(
      Object.entries(timings)
        .filter(([, value]) => Number.isFinite(Number(value)))
        .map(([key, value]) => [key, Number(value)])
    )
  };
  return {
    ...response,
    modelStatus: {
      ...(response.modelStatus || {}),
      performance: {
        ...(response.modelStatus?.performance || {}),
        ...performance
      }
    }
  };
};

const runUnifiedEventAssistantTurn = async ({
  db,
  query,
  clarificationAnswer,
  clarificationUsed = false,
  allowScopeExpansion = false,
  allowHistoricalFallback = true,
  rememberPreference = false,
  userId = null,
  modelRunner,
  now = new Date()
}) => {
  const turnStartedAt = Date.now();
  const timings = {};
  const withPerformance = (response) => attachEventAssistantPerformance(response, timings, turnStartedAt);
  const services = createEventRecommendationServices({
    parseAssistantIntent,
    parseAssistantIntentWithModel,
    loadAllCandidates,
    loadScopedCandidates,
    buildCoverageSummary,
    buildAiCandidatePool,
    scoreEvent,
    rankCandidates,
    rerankCandidatesWithModel,
    buildFallbackRerank,
    loadUserEventProfile,
    maybeRememberPreference,
    buildProfileSummary,
    buildClarificationResponse,
    buildFallbackRecommendationResponse,
    buildAiRecommendationResponse,
    buildReasoningTrace,
    buildIntentSummary,
    recordEventAssistantRun,
    logInvalidModelOutput,
  });
  const [profile, grouped] = await Promise.all([
    timeEventAssistantStep(timings, 'profileLoadMs', () => services.profile.load(db, userId)),
    timeEventAssistantStep(timings, 'candidateLoadMs', () => services.retrieval.loadAll(db, now))
  ]);
  const coverage = services.retrieval.summarizeCoverage(grouped);
  const futurePool = [...grouped.upcoming, ...grouped.ongoing].slice(0, MAX_CANDIDATES);
  let intentModelStatus = null;
  let intentFailure = null;

  let parsedIntent;
  try {
    parsedIntent = await timeEventAssistantStep(timings, 'intentMs', () => services.intent.parseWithModel({
      db,
      query,
      clarificationAnswer,
      profile,
      clarificationUsed,
      modelRunner
    }));
  } catch (error) {
    intentFailure = error;
    services.telemetry.logInvalidModelOutput({
      error,
      scope: 'intent',
      candidateCount: coverage.total,
      rawContent: error.rawContent || '',
      jsonText: error.extractedJson || '',
      parsedResult: null
    });

    const fallbackIntent = services.intent.parseLocal({ query, clarificationAnswer });
    parsedIntent = {
      intent: fallbackIntent,
      modelStatus: {
        used: false,
        task: 'event_recommendation_intent',
        message: error.message || 'AI intent analysis failed.',
        attempts: error.attempts || []
      },
      rawIntent: null
    };
  }

  const intent = parsedIntent.intent;
  intentModelStatus = parsedIntent.modelStatus;
  const remembered = await timeEventAssistantStep(
    timings,
    'preferenceMemoryMs',
    () => services.profile.rememberPreference(db, userId, intent, rememberPreference)
  );

  if (futurePool.length === 0 && !allowScopeExpansion && !allowHistoricalFallback) {
    return withPerformance({
      type: 'empty',
      scope: 'upcoming',
      emptyReason: 'no_upcoming',
      canExpandScope: true,
      recommendationMode: 'empty',
      coverage,
      understoodIntent: services.explanation.buildIntentSummary(intent, profile),
      remembered,
      modelStatus: intentModelStatus
    });
  }

  if (
    (intent.needsClarification || intent.shouldClarify)
    && !clarificationUsed
    && futurePool.length >= IDEAL_MIN_RECOMMENDATIONS
  ) {
    return withPerformance(services.response.clarification({
      intent,
      profile,
      grouped,
      coverage,
      remembered,
      modelStatus: intentModelStatus,
      now,
      question: intent.clarificationQuestion || buildClarificationQuestion(profile)
    }));
  }

  const pool = await timeEventAssistantStep(timings, 'candidatePoolMs', () => services.retrieval.buildCandidatePool({
    db,
    grouped,
    intent,
    profile,
    allowScopeExpansion,
    allowHistoricalFallback,
    now,
    modelRunner,
    useProfileModel: Boolean(modelRunner) && !intentFailure
  }));

  if (intentFailure && pool.candidates.length > 0) {
    return withPerformance(services.response.fallbackRecommendation({
      candidates: pool.candidates,
      intent,
      profile,
      scope: pool.scope,
      canExpandScope: pool.canExpandScope,
      usedHistoricalFallback: pool.usedHistoricalFallback,
      remembered,
      coverage,
      profileStats: pool.profileStats,
      modelStatuses: [
        intentModelStatus,
        ...pool.modelStatuses
      ],
      failedTask: 'event_recommendation_intent',
      failureMessage: intentFailure.message
    }));
  }

  if (pool.candidates.length === 0) {
    return withPerformance({
      type: 'empty',
      scope: pool.scope,
      emptyReason: futurePool.length === 0 ? 'no_upcoming' : 'no_matches',
      canExpandScope: pool.canExpandScope,
      recommendationMode: 'empty',
      coverage,
      understoodIntent: services.explanation.buildIntentSummary(intent, profile),
      remembered,
      modelStatus: {
        ...intentModelStatus,
        used: true,
        tasks: ['event_recommendation_intent'],
        profileStats: pool.profileStats,
        message: 'AI understood the request, but no candidate events were available for reranking.'
      }
    });
  }

  let rerank;
  try {
    rerank = await timeEventAssistantStep(timings, 'rerankMs', () => services.ranking.rerankWithModel({
      db,
      intent,
      profile,
      candidates: pool.candidates,
      modelRunner
    }));
  } catch (error) {
    services.telemetry.logInvalidModelOutput({
      error,
      scope: pool.scope,
      candidateCount: pool.candidates.length,
      rawContent: error.rawContent || '',
      jsonText: error.extractedJson || '',
      parsedResult: null
    });

    return withPerformance(services.response.fallbackRecommendation({
      candidates: pool.candidates,
      intent,
      profile,
      scope: pool.scope,
      canExpandScope: pool.canExpandScope,
      usedHistoricalFallback: pool.usedHistoricalFallback,
      remembered,
      coverage,
      profileStats: pool.profileStats,
      modelStatuses: [
        intentModelStatus,
        ...pool.modelStatuses
      ],
      failedTask: 'event_recommendation_rerank',
      failureMessage: error.message
    }));
  }

  return withPerformance(services.response.aiRecommendation({
    rerank,
    candidates: pool.candidates,
    intent,
    profile,
    scope: pool.scope,
    canExpandScope: pool.canExpandScope,
    usedHistoricalFallback: pool.usedHistoricalFallback,
    remembered,
    coverage,
    profileStats: pool.profileStats,
    modelStatuses: [
      intentModelStatus,
      ...pool.modelStatuses
    ]
  }));
};

const recordEventAssistantRun = async (db, response = {}, userId = null) => {
  if (!db || !response) return null;
  try {
    const recommendations = Array.isArray(response.recommendations) ? response.recommendations : [];
    const provisionalRecommendations = Array.isArray(response.provisionalRecommendations)
      ? response.provisionalRecommendations
      : [];
    const modelStatus = response.modelStatus || {};
    const reasoningTrace = response.reasoningTrace || {};
    const runtimeTelemetry = aiRuntime.summarizeModelStatusTelemetry(modelStatus);
    const performanceTelemetry = Object.fromEntries(
      Object.entries(modelStatus.performance || {})
        .filter(([, value]) => Number.isFinite(Number(value)))
        .map(([key, value]) => [key, Number(value)])
    );
    const recommendedEventIds = recommendations
      .map((item) => Number(item?.event?.id || item?.id))
      .filter((id) => Number.isInteger(id))
      .slice(0, MAX_RECOMMENDATIONS);
    const recommendedEventRanks = recommendations
      .map((item, index) => ({
        eventId: Number(item?.event?.id || item?.id),
        rank: Number.isInteger(Number(item?.rank)) ? Number(item.rank) : index + 1
      }))
      .filter((item) => Number.isInteger(item.eventId) && Number.isInteger(item.rank))
      .slice(0, MAX_RECOMMENDATIONS);
    const recommendedCategories = unique(recommendations
      .map((item) => item?.event?.category || item?.aiProfile?.category || '')
      .filter(Boolean))
      .slice(0, 8);
    const profileStatuses = unique(recommendations
      .map((item) => item?.aiProfile?.status || '')
      .filter(Boolean))
      .slice(0, 6);
    const averageConfidence = recommendations.length > 0
      ? Number((recommendations.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / recommendations.length).toFixed(3))
      : 0;
    const hardConstraintRatios = recommendations
      .map((item) => Number(item.diagnostics?.hardConstraintRatio))
      .filter(Number.isFinite);
    const averageHardConstraintRatio = hardConstraintRatios.length
      ? Number((hardConstraintRatios.reduce((sum, value) => sum + value, 0) / hardConstraintRatios.length).toFixed(3))
      : 1;
    const opportunityMissingCount = recommendations.reduce((sum, item) => (
      sum + Number(item.opportunityMatch?.missing?.length || 0)
    ), 0);
    const opportunityMatchedCount = recommendations.reduce((sum, item) => (
      sum + Number(item.opportunityMatch?.matched?.length || 0)
    ), 0);
    const backendCompletedRecommendationCount = recommendations.filter((item) => item.diagnostics?.backendCompleted).length;
    const opportunityFeedbackLearningUsed = recommendations.some((item) => item.opportunityMatch?.feedbackLearning?.used);
    const decisionSupportNextActionCount = recommendations.filter((item) => item.opportunityMatch?.decisionSupport?.nextAction).length;
    const decisionSupportTradeoffCount = recommendations.reduce((sum, item) => (
      sum + Number(item.opportunityMatch?.decisionSupport?.tradeoffs?.length || 0)
    ), 0);
    const decisionSupportWatchoutCount = recommendations.reduce((sum, item) => (
      sum + Number(item.opportunityMatch?.decisionSupport?.watchouts?.length || 0)
    ), 0);
    const decisionSupportPreferencePromptCount = recommendations.filter((item) => (
      item.opportunityMatch?.decisionSupport?.preferencePrompt
    )).length;
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
        'event_recommendation',
        'turn',
        'completed',
        userId || null,
        JSON.stringify({
          responseType: response.type || null,
          recommendationCount: recommendations.length,
          scope: response.scope || null,
          modelUsed: Boolean(modelStatus.used),
          fallbackUsed: Boolean(modelStatus.fallbackUsed),
          tasks: Array.isArray(modelStatus.tasks) ? modelStatus.tasks.slice(0, 8) : [],
          durationMs: Number(performanceTelemetry.durationMs || 0),
          performance: performanceTelemetry,
          recommendedEventIds,
          recommendedEventRanks,
          recommendedCategories,
          profileStatuses,
          averageConfidence,
          intentConfidence: Number(reasoningTrace.intentConfidence || 0),
          actionEvidenceUsed: Boolean(reasoningTrace.actionEvidenceUsed),
          actionEvidenceSourceCount: Number(reasoningTrace.actionEvidenceSummary?.sourceCount || 0),
          viewDetailEvidenceCount: Number(reasoningTrace.actionEvidenceSummary?.viewDetailCount || 0),
          favoriteActionEvidenceCount: Number(reasoningTrace.actionEvidenceSummary?.favoriteActionCount || 0),
          registerActionEvidenceCount: Number(reasoningTrace.actionEvidenceSummary?.registerActionCount || 0),
          negativeActionEvidenceCount: Number(reasoningTrace.actionEvidenceSummary?.negativeActionCount || 0),
          opportunityStage: reasoningTrace.opportunityStage || OPPORTUNITY_MATCH_STAGE,
          averageHardConstraintRatio,
          opportunityMatchedCount,
          opportunityMissingCount,
          backendCompletedRecommendationCount,
          opportunityFeedbackLearningUsed,
          decisionSupportNextActionCount,
          decisionSupportTradeoffCount,
          decisionSupportWatchoutCount,
          decisionSupportPreferencePromptCount,
          hardConstraintMisses: reasoningTrace.hardConstraintDiagnostics?.missed || [],
          clarificationOptionCount: Array.isArray(response.clarificationOptions) ? response.clarificationOptions.length : 0,
          provisionalRecommendationCount: provisionalRecommendations.length,
          weakSignalCount: Array.isArray(reasoningTrace.weakOrMissing) ? reasoningTrace.weakOrMissing.length : 0,
          profileGenerated: Number(modelStatus.profileStats?.generated || 0),
          profileFallback: Number(modelStatus.profileStats?.fallback || 0),
          runtimeTelemetry,
          warningCount: Array.isArray(response.warnings) ? response.warnings.length : 0,
        }),
      ]
    );
    return result?.lastID || result?.lastId || null;
  } catch {
    // Recommendation should remain available even on older databases without AI run tables.
    return null;
  }
};

const runObservedEventAssistantTurn = async (options = {}) => {
  const response = await runUnifiedEventAssistantTurn(options);
  const assistantRunId = await recordEventAssistantRun(options.db, response, options.userId);
  return assistantRunId
    ? { ...response, assistantRunId }
    : response;
};

const EVENT_ASSISTANT_DECISION_ACTION_TYPES = new Set([
  'view_detail',
  'favorite',
  'unfavorite',
  'register',
  'unregister',
  'feedback_up',
  'feedback_down'
]);

const validateRecommendationActionAttribution = async ({
  db,
  runId,
  eventId,
  recommendationRank
}) => {
  if (!Number.isInteger(runId)) return;

  const row = await db.get(
    `
      SELECT module, summary_json
      FROM ai_assistant_runs
      WHERE id = ?
    `,
    [runId]
  );

  if (!row) {
    throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Assistant run does not exist.', 400);
  }
  if (row.module && row.module !== 'event_recommendation') {
    throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Assistant run does not belong to event recommendations.', 400);
  }

  const summary = safeJsonParse(row.summary_json, {});
  const recommendedEventIds = Array.isArray(summary.recommendedEventIds)
    ? summary.recommendedEventIds.map((id) => Number(id)).filter(Number.isInteger)
    : [];
  const recommendedEventRanks = Array.isArray(summary.recommendedEventRanks)
    ? summary.recommendedEventRanks
      .map((item) => ({
        eventId: Number(item?.eventId),
        rank: Number(item?.rank)
      }))
      .filter((item) => Number.isInteger(item.eventId) && Number.isInteger(item.rank))
    : [];

  if (recommendedEventIds.length > 0 && !recommendedEventIds.includes(eventId)) {
    throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Event was not recommended by this assistant run.', 400);
  }

  if (!Number.isInteger(recommendationRank)) return;

  const rankRecord = recommendedEventRanks.find((item) => item.eventId === eventId);
  if (rankRecord && rankRecord.rank !== recommendationRank) {
    throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Recommendation rank does not match this assistant run.', 400);
  }
  if (
    !rankRecord
    && recommendedEventIds.length > 0
    && (recommendationRank < 1 || recommendationRank > recommendedEventIds.length)
  ) {
    throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Recommendation rank is outside this assistant run.', 400);
  }
};

const recordEventAssistantDecisionAction = async ({
  db,
  userId = null,
  visitorKey = '',
  eventId,
  actionType,
  assistantRunId = null,
  source = 'event_assistant',
  recommendationRank = null,
  metadata = {}
}) => {
  if (!db) return { recorded: false };
  const normalizedEventId = Number(eventId);
  const normalizedRunId = Number(assistantRunId);
  const normalizedRank = Number(recommendationRank);
  const normalizedActionType = sanitizeText(actionType, 40);

  if (!Number.isInteger(normalizedEventId)) {
    throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Valid event id is required.', 400);
  }
  if (!EVENT_ASSISTANT_DECISION_ACTION_TYPES.has(normalizedActionType)) {
    throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Valid decision action is required.', 400);
  }

  if (Number.isInteger(normalizedRunId)) {
    await validateRecommendationActionAttribution({
      db,
      runId: normalizedRunId,
      eventId: normalizedEventId,
      recommendationRank: Number.isInteger(normalizedRank) ? normalizedRank : null
    });
  }

  const safeMetadata = {};
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    for (const [key, value] of Object.entries(metadata).slice(0, 12)) {
      const safeKey = sanitizeText(key, 40);
      if (!safeKey) continue;
      safeMetadata[safeKey] = typeof value === 'number' || typeof value === 'boolean'
        ? value
        : sanitizeText(String(value || ''), 180);
    }
  }

  try {
    await db.run(
      `
        INSERT INTO event_recommendation_actions (
          run_id,
          user_id,
          visitor_key,
          event_id,
          action_type,
          source,
          recommendation_rank,
          metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number.isInteger(normalizedRunId) ? normalizedRunId : null,
        userId || null,
        sanitizeText(visitorKey, 120) || null,
        normalizedEventId,
        normalizedActionType,
        sanitizeText(source, 80) || 'event_assistant',
        Number.isInteger(normalizedRank) ? normalizedRank : null,
        JSON.stringify(safeMetadata)
      ]
    );
    return { recorded: true };
  } catch {
    return { recorded: false };
  }
};

const recordEventAssistantFeedback = async ({
  db,
  userId,
  eventId,
  feedback,
  query,
  reason,
  assistantRunId = null,
  recommendationRank = null,
  source = 'event_assistant'
}) => {
  const normalizedFeedback = feedback === 'up' ? 'up' : feedback === 'down' ? 'down' : '';
  const normalizedEventId = Number(eventId);

  if (!userId) {
    throw createAssistantError('EVENT_ASSISTANT_AUTH_REQUIRED', 'Login is required for feedback.', 401);
  }
  if (!Number.isInteger(normalizedEventId)) {
    throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Valid event id is required.', 400);
  }
  if (!normalizedFeedback) {
    throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Valid feedback is required.', 400);
  }

  await db.run(
    `
      INSERT INTO event_recommendation_feedback (user_id, event_id, feedback, query, reason)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      userId,
      normalizedEventId,
      normalizedFeedback,
      sanitizeText(query, MAX_QUERY_LENGTH),
      sanitizeText(reason, 240)
    ]
  );

  await recordEventAssistantDecisionAction({
    db,
    userId,
    eventId: normalizedEventId,
    actionType: normalizedFeedback === 'up' ? 'feedback_up' : 'feedback_down',
    assistantRunId,
    recommendationRank,
    source,
    metadata: {
      feedback: normalizedFeedback,
      reason
    }
  });

  return { success: true };
};

module.exports = {
  EVENT_ASSISTANT_PUBLIC_FIELDS,
  MAX_QUERY_LENGTH,
  MAX_CLARIFICATION_LENGTH,
  classifyEventScope,
  serializeEventForAssistant,
  serializeEventForClient,
  loadScopedCandidates,
  runEventAssistantTurn: runObservedEventAssistantTurn,
  callEventAssistantModel,
  createAssistantError,
  parseAssistantIntent,
  loadUserEventProfile,
  recordEventAssistantFeedback,
  recordEventAssistantDecisionAction
};
