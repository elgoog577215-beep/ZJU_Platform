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
  score: ['综测', '加分', '综合评价', '第二课堂', '学分', '素质分', '成长记实'],
  volunteer_time: ['志愿', '时长', '工时', '小时', '公益', '志愿时长']
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
    .filter(([, aliases]) => includesAny(lowered, aliases))
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

  return {
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
    organizers: uniqueTextArray(rawIntent.organizers || rawIntent.colleges, 8),
    audiences: unique([
      ...uniqueTextArray(rawIntent.audiences, 8),
      ...fallbackIntent.audiences,
    ]).slice(0, 8),
    dateConstraints: uniqueTextArray(rawIntent.date_constraints || rawIntent.time_constraints, 8),
    hardConstraints: uniqueTextArray(
      rawIntent.hard_constraints
      || rawIntent.hardConstraints
      || rawIntent.must_have
      || rawIntent.mustHave,
      10,
      80
    ),
    allowHistorical: Boolean(rawIntent.allow_historical),
    needsClarification: Boolean(rawIntent.needs_clarification),
    clarificationQuestion: sanitizeText(rawIntent.clarification_question, 160),
    clarificationOptions: uniqueTextArray(rawIntent.clarification_options || rawIntent.options, 4, 80),
    confidence: Math.min(Math.max(Number(rawIntent.confidence) || 0.55, 0), 1),
  };
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
  negativeEventIds: [],
  positiveCategories: [],
  negativeCategories: []
});

const buildActionEvidence = (historyRows = [], feedbackRows = []) => {
  const positiveCategoryCounts = {};
  const negativeCategoryCounts = {};
  const favoriteEventIds = [];
  const registeredEventIds = [];
  const positiveFeedbackEventIds = [];
  const negativeEventIds = [];

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
    }
  }

  return {
    positiveEventIds: unique([
      ...favoriteEventIds,
      ...registeredEventIds,
      ...positiveFeedbackEventIds
    ]).slice(0, 60),
    favoriteEventIds: unique(favoriteEventIds).slice(0, 40),
    registeredEventIds: unique(registeredEventIds).slice(0, 40),
    positiveFeedbackEventIds: unique(positiveFeedbackEventIds).slice(0, 40),
    negativeEventIds: unique(negativeEventIds).slice(0, 40),
    positiveCategories: summarizeWeightedCounts(positiveCategoryCounts),
    negativeCategories: summarizeWeightedCounts(negativeCategoryCounts)
  };
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
        e.volunteer_time
      FROM event_recommendation_feedback f
      LEFT JOIN events e ON e.id = f.event_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT 40
    `,
    [userId]
  );

  const learnedCategories = summarizeCounts(historyRows.map(inferEventCategory));
  const actionEvidence = buildActionEvidence(historyRows, feedbackRows);

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
  if (profile.actionEvidence?.negativeCategories?.length) {
    signals.push(`近期负反馈：${profile.actionEvidence.negativeCategories.slice(0, 2).map((item) => CATEGORY_LABELS[item.value] || item.value).join('、')}`);
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
    if (includesPhrase(eventText, normalized)) {
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

  if (profile.actionEvidence?.positiveEventIds?.includes(Number(event.id))) {
    score += 6;
    signals.unshift('你曾对这个活动有过收藏、报名或正反馈');
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

  return {
    event,
    score: Math.round(score),
    signals: unique(signals).slice(0, 5),
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
    const matched = values.find((term) => text.includes(sanitizeText(term, 80).toLowerCase()));
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

  if (intent.benefits?.includes('score')) {
    possible += 14;
    if (getComprehensiveEvaluationSignal(item.event) || includesAnyPhrase(text, BENEFIT_ALIASES.score)) {
      score += 14;
      signals.push('收益匹配：综测/加分');
    } else {
      misses.push('综测/加分');
    }
  }

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
        signals: unique([...hardConstraint.signals, ...item.signals]).slice(0, 8)
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
  const topSignals = unique(
    recommendations
      .flatMap((item) => item.matchSignals || item.candidate?.signals || [])
      .filter(Boolean)
  ).slice(0, 8);
  const actionEvidenceUsed = recommendations.some((item) => (
    (item.matchSignals || item.candidate?.signals || [])
      .some((signal) => String(signal).includes('行动证据') || String(signal).includes('收藏') || String(signal).includes('报名') || String(signal).includes('负反馈'))
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
      hardConstraints: topSignals.some((signal) => /匹配|硬约束|校区|地点|面向对象|主办方|学院|收益|形式/.test(String(signal))),
      topicCategory: topSignals.some((signal) => /主题|类型|关键词|AI画像/.test(String(signal))),
      userProfile: topSignals.some((signal) => /你|画像|兴趣|收藏|报名|行动证据/.test(String(signal))),
      negativeFeedback: topSignals.some((signal) => /负反馈|降低/.test(String(signal))),
      historicalFallback: Boolean(usedHistoricalFallback)
    },
    weakOrMissing: weakOrMissing.slice(0, 4),
    actionEvidenceUsed,
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

const buildIntentSummary = (intent, profile) => {
  const parts = [];
  if (intent.categories.length) parts.push(`类型：${intent.categories.map((item) => CATEGORY_LABELS[item] || item).join('、')}`);
  if (intent.campuses.length) parts.push(`地点：${intent.campuses.join('、')}`);
  if (intent.audiences.length) parts.push(`对象：${intent.audiences.join('、')}`);
  if (intent.benefits.includes('score')) parts.push('希望有综测信息');
  if (intent.benefits.includes('volunteer_time')) parts.push('希望有志愿时长');
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
      intent.benefits.length ? `收益偏好：${intent.benefits.join('、')}` : '',
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

  const { min, max } = getRecommendationCountBounds(candidateMap.size);
  if (recommendations.length < min) {
    throw createAssistantError('EVENT_ASSISTANT_MODEL_INVALID', 'Model rerank did not include enough valid candidate IDs.', 502);
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

const isPersonalizationSignal = (signal) => (
  /行动证据|收藏|报名|正反馈|负反馈/.test(String(signal || ''))
);

const mergeRecommendationSignals = ({
  modelSignals = [],
  candidateSignals = [],
  hardConstraintSignals = [],
  limit = 6
} = {}) => {
  const personalized = candidateSignals.filter(isPersonalizationSignal);
  return unique([
    ...personalized,
    ...hardConstraintSignals,
    ...modelSignals,
    ...candidateSignals
  ]).slice(0, limit);
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
          limit: 4
        })
      ])
    });
  }
  const recommendations = selected.map((item) => ({
    id: item.candidate.event.id,
    reason: item.reason || buildReason(item.candidate),
    confidence: item.confidence,
    matchSignals: mergeRecommendationSignals({
      modelSignals: item.matchedSignals || [],
      candidateSignals: item.candidate.signals || [],
      hardConstraintSignals: item.candidate.hardConstraint?.signals || [],
      limit: 6
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
      scope: item.candidate.scope
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
    recommendations,
    candidateCount: candidates.length,
    usedHistoricalFallback,
    fallbackUsed: Boolean(rerank.modelStatus?.fallbackUsed)
  });

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
      actionEvidenceUsed: Boolean(rerank.reasoningTrace?.actionEvidenceUsed || reasoningTrace.actionEvidenceUsed)
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
  const profile = await services.profile.load(db, userId);
  const grouped = await services.retrieval.loadAll(db, now);
  const coverage = services.retrieval.summarizeCoverage(grouped);
  const futurePool = [...grouped.upcoming, ...grouped.ongoing].slice(0, MAX_CANDIDATES);
  let intentModelStatus = null;
  let intentFailure = null;

  let parsedIntent;
  try {
    parsedIntent = await services.intent.parseWithModel({
      db,
      query,
      clarificationAnswer,
      profile,
      clarificationUsed,
      modelRunner
    });
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
  const remembered = await services.profile.rememberPreference(db, userId, intent, rememberPreference);

  if (futurePool.length === 0 && !allowScopeExpansion && !allowHistoricalFallback) {
    return {
      type: 'empty',
      scope: 'upcoming',
      emptyReason: 'no_upcoming',
      canExpandScope: true,
      recommendationMode: 'empty',
      coverage,
      understoodIntent: services.explanation.buildIntentSummary(intent, profile),
      remembered,
      modelStatus: intentModelStatus
    };
  }

  if (
    (intent.needsClarification || intent.shouldClarify)
    && !clarificationUsed
    && futurePool.length >= IDEAL_MIN_RECOMMENDATIONS
  ) {
    return services.response.clarification({
      intent,
      profile,
      grouped,
      coverage,
      remembered,
      modelStatus: intentModelStatus,
      now,
      question: intent.clarificationQuestion || buildClarificationQuestion(profile)
    });
  }

  const pool = await services.retrieval.buildCandidatePool({
    db,
    grouped,
    intent,
    profile,
    allowScopeExpansion,
    allowHistoricalFallback,
    now,
    modelRunner,
    useProfileModel: Boolean(modelRunner) && !intentFailure
  });

  if (intentFailure && pool.candidates.length > 0) {
    return services.response.fallbackRecommendation({
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
    });
  }

  if (pool.candidates.length === 0) {
    return {
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
    };
  }

  let rerank;
  try {
    rerank = await services.ranking.rerankWithModel({
      db,
      intent,
      profile,
      candidates: pool.candidates,
      modelRunner
    });
  } catch (error) {
    services.telemetry.logInvalidModelOutput({
      error,
      scope: pool.scope,
      candidateCount: pool.candidates.length,
      rawContent: error.rawContent || '',
      jsonText: error.extractedJson || '',
      parsedResult: null
    });

    return services.response.fallbackRecommendation({
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
    });
  }

  return services.response.aiRecommendation({
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
  });
};

const recordEventAssistantRun = async (db, response = {}, userId = null) => {
  if (!db || !response) return;
  try {
    const recommendations = Array.isArray(response.recommendations) ? response.recommendations : [];
    const provisionalRecommendations = Array.isArray(response.provisionalRecommendations)
      ? response.provisionalRecommendations
      : [];
    const modelStatus = response.modelStatus || {};
    const reasoningTrace = response.reasoningTrace || {};
    const runtimeTelemetry = aiRuntime.summarizeModelStatusTelemetry(modelStatus);
    const recommendedEventIds = recommendations
      .map((item) => Number(item?.event?.id || item?.id))
      .filter((id) => Number.isInteger(id))
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
    await db.run(
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
          recommendedEventIds,
          recommendedCategories,
          profileStatuses,
          averageConfidence,
          intentConfidence: Number(reasoningTrace.intentConfidence || 0),
          actionEvidenceUsed: Boolean(reasoningTrace.actionEvidenceUsed),
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
  } catch {
    // Recommendation should remain available even on older databases without AI run tables.
  }
};

const runObservedEventAssistantTurn = async (options = {}) => {
  const response = await runUnifiedEventAssistantTurn(options);
  await recordEventAssistantRun(options.db, response, options.userId);
  return response;
};

const recordEventAssistantFeedback = async ({
  db,
  userId,
  eventId,
  feedback,
  query,
  reason
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
  recordEventAssistantFeedback
};
