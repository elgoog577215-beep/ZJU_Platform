const aiRuntime = require('../services/unifiedAiRuntimeService');
const {
  ensureEventProfiles
} = require('../services/eventAiProfileService');
const {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS: CATEGORY_LABELS,
  EVENT_CAMPUS_OPTIONS,
  EVENT_AUDIENCE_OPTIONS,
  EVENT_AUDIENCE_ALIASES,
  buildEventCatalogPromptText,
  detectCategories,
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

const CAMPUS_ALIASES = EVENT_CAMPUS_OPTIONS;
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
  const campuses = CAMPUS_ALIASES.filter((item) => lowered.includes(item.toLowerCase()));
  const audiences = AUDIENCE_ALIASES.filter((item) => lowered.includes(item.toLowerCase()));
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
    allowHistorical: Boolean(rawIntent.allow_historical),
    needsClarification: Boolean(rawIntent.needs_clarification),
    clarificationQuestion: sanitizeText(rawIntent.clarification_question, 160),
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
    temperature: 0.1,
    maxTokens: 900,
    messages: [
      {
        role: 'system',
        content: [
          '你是浙江大学活动推荐助手的需求理解层。',
          '你的任务不是直接推荐活动，而是把用户自然语言解析成结构化检索意图。',
          '必须结合标准活动库、用户画像和补充说明，输出 JSON 对象。',
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

const inferEventCategory = (event) => {
  const explicit = sanitizeText(event.category, 80);
  const categoryMatch = normalizeEventCategory(explicit);
  if (categoryMatch) return categoryMatch;

  const text = normalizeSearchText(event.category, event.title, event.description);
  return detectCategories(text)[0] || 'other';
};

const loadUserEventProfile = async (db, userId) => {
  if (!userId) {
    return {
      isAnonymous: true,
      explicit: {},
      learned: {},
      memory: [],
      negativeEventIds: []
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
      SELECT e.*
      FROM events e
      JOIN (
        SELECT item_id AS event_id, created_at FROM favorites WHERE user_id = ? AND item_type = 'event'
        UNION ALL
        SELECT event_id, created_at FROM event_registrations WHERE user_id = ?
      ) h ON h.event_id = e.id
      WHERE e.deleted_at IS NULL
      ORDER BY h.created_at DESC
      LIMIT 30
    `,
    [userId, userId]
  );
  const feedbackRows = await db.all(
    `
      SELECT event_id, feedback
      FROM event_recommendation_feedback
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 40
    `,
    [userId]
  );

  const learnedCategories = summarizeCounts(historyRows.map(inferEventCategory));
  const negativeEventIds = feedbackRows
    .filter((row) => row.feedback === 'down')
    .map((row) => Number(row.event_id))
    .filter(Number.isInteger);

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
    negativeEventIds
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
    }
  );

  const candidates = preRanked
    .map((item) => scoreAiProfileCandidate(
      item,
      intent,
      profileResult.profilesByEventId.get(Number(item.event.id))
    ))
    .sort((left, right) => right.aiScore - left.aiScore || compareByAscendingDate(left.event, right.event))
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

const buildClarificationQuestion = (profile) => {
  const profileHint = profile.isAnonymous ? '' : '我也会参考你的画像，';
  return `${profileHint}你更想按主题、校区，还是综测/志愿时长来筛选？`;
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
      clarificationUsed: true
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
    dateConstraints: intent.dateConstraints
  },
  profile: buildProfileSummary(profile),
  candidates: candidates.map((item) => ({
    id: item.event.id,
    title: item.event.title,
    description: sanitizeText(item.event.description, 240),
    date: item.event.date,
    end_date: item.event.end_date,
    location: item.event.location,
    organizer: item.event.organizer,
    target_audience: item.event.target_audience,
    score: item.event.score,
    volunteer_time: item.event.volunteer_time,
    category: item.category,
    recallScore: item.aiScore ?? item.score,
    deterministicSignals: item.signals,
    deterministicReason: buildReason(item),
    aiProfile: item.aiProfile ? {
      summary: item.aiProfile.summary,
      category: item.aiProfile.category,
      topics: item.aiProfile.topics,
      benefits: item.aiProfile.benefits,
      campuses: item.aiProfile.campuses,
      organizers: item.aiProfile.organizers,
      audiences: item.aiProfile.audiences,
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
    recommendations: recommendations
      .sort((left, right) => left.rank - right.rank)
      .slice(0, max)
  };
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

  const result = await aiRuntime.callJson(db, {
    task: 'event_recommendation_rerank',
    modelRunner,
    temperature: 0.2,
    maxTokens: 1300,
    timeout: 45000,
    messages: [
      {
        role: 'system',
        content: [
          'You are the reasoning and ranking layer for a Zhejiang University activity recommendation assistant.',
          'You must use semantic understanding from the large model to rerank provided candidates.',
          'Return strict JSON only. Never recommend an event id outside the candidate list.'
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
  });

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
  const selected = rerank.recommendations
    .map((item) => ({
      ...item,
      candidate: candidateMap.get(Number(item.id))
    }))
    .filter((item) => item.candidate);

  return {
    type: 'recommend',
    scope,
    recommendationMode: usedHistoricalFallback ? 'historical_fallback' : 'future',
    coverage,
    summary: rerank.summary || (usedHistoricalFallback
      ? 'AI 先检索未来活动，匹配不足后按语义相似度给出历史线索。'
      : 'AI 已结合你的需求、活动画像和候选活动完成重排。'),
    understoodIntent: buildIntentSummary(intent, profile),
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
    recommendations: selected.map((item) => ({
      id: item.candidate.event.id,
      reason: item.reason || buildReason(item.candidate),
      confidence: item.confidence,
      matchSignals: unique([
        ...item.matchedSignals,
        ...item.candidate.signals
      ]).slice(0, 6),
      score: Math.round(item.score ?? item.candidate.aiScore ?? item.candidate.score),
      isHistorical: item.candidate.scope === 'past',
      aiProfile: item.candidate.aiProfile ? {
        summary: item.candidate.aiProfile.summary,
        category: item.candidate.aiProfile.category,
        confidence: item.candidate.aiProfile.confidence,
        status: item.candidate.aiProfile.status
      } : null,
      event: serializeEventForClient(item.candidate.event)
    }))
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
    .sort((left, right) => right.aiScore - left.aiScore || compareByAscendingDate(left.event, right.event));

  return {
    summary,
    modelStatus: {
      used: false,
      fallbackUsed: true,
      task: 'event_recommendation_fallback',
    },
    recommendations: ranked.slice(0, MAX_RECOMMENDATIONS).map((item, index) => ({
      id: item.event.id,
      rank: index + 1,
      score: Math.round(item.aiScore ?? item.score),
      confidence: Math.max(0.45, Math.min(0.78, ((item.aiScore ?? item.score) / 120) + 0.38)),
      reason: buildReason(item),
      matchedSignals: item.signals || []
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

  return {
    type: 'recommend',
    scope,
    recommendationMode: usedHistoricalFallback ? 'historical_fallback' : 'future',
    coverage,
    summary: polish?.summary || (usedHistoricalFallback
      ? '没有找到足够合适的未来活动，先给你几条历史活动线索。'
      : '我按你的提问和可用画像筛了一组更贴近的活动。'),
    understoodIntent: buildIntentSummary(intent, profile),
    canExpandScope,
    remembered,
    warnings: usedHistoricalFallback
      ? ['以下包含历史活动，不代表仍可报名；建议关注后续同类活动。']
      : [],
    modelStatus: polish?.modelStatus || {
      used: false,
      message: '未启用模型润色，使用规则推荐结果。'
    },
    recommendations: selected.map((item) => ({
      id: item.event.id,
      reason: reasonById.get(item.event.id) || buildReason(item),
      matchSignals: item.signals,
      score: item.score,
      isHistorical: item.scope === 'past',
      event: serializeEventForClient(item.event)
    }))
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
  if (modelRunner) {
    return runInjectedModelTurn({
      db,
      query,
      clarificationAnswer,
      clarificationUsed,
      allowScopeExpansion,
      modelRunner,
      now
    });
  }

  const intent = parseAssistantIntent({ query, clarificationAnswer });
  const profile = await loadUserEventProfile(db, userId);
  const remembered = await maybeRememberPreference(db, userId, intent, rememberPreference);

  const grouped = await loadAllCandidates(db, now);
  const coverage = buildCoverageSummary(grouped);
  const futurePool = [...grouped.upcoming, ...grouped.ongoing].slice(0, MAX_CANDIDATES);

  if (futurePool.length === 0 && !allowScopeExpansion && !allowHistoricalFallback) {
    return {
      type: 'empty',
      scope: 'upcoming',
      emptyReason: 'no_upcoming',
      canExpandScope: true,
      recommendationMode: 'empty',
      coverage,
      understoodIntent: buildIntentSummary(intent, profile),
      remembered
    };
  }

  if (intent.shouldClarify && !clarificationUsed && futurePool.length >= IDEAL_MIN_RECOMMENDATIONS) {
    return {
      type: 'clarify',
      scope: 'upcoming',
      question: buildClarificationQuestion(profile),
      clarificationUsed: true,
      recommendationMode: 'clarify',
      coverage,
      understoodIntent: buildIntentSummary(intent, profile),
      remembered
    };
  }

  const rankedFuture = [
    ...rankCandidates(grouped.ongoing, intent, profile, 'ongoing', now),
    ...rankCandidates(grouped.upcoming, intent, profile, 'upcoming', now)
  ].sort((left, right) => right.score - left.score || compareByAscendingDate(left.event, right.event));

  const futureThreshold = getRankThreshold(intent, 'upcoming');
  const futureMatches = rankedFuture.filter((item) => item.score >= futureThreshold);

  if (futureMatches.length > 0) {
    return buildRecommendationResponse({
      db,
      rankedItems: futureMatches,
      intent,
      profile,
      scope: futureMatches.some((item) => item.scope === 'ongoing') ? 'mixed_future' : 'upcoming',
      canExpandScope: false,
      usedHistoricalFallback: false,
      remembered,
      coverage
    });
  }

  if (!allowHistoricalFallback && !allowScopeExpansion) {
    return {
      type: 'empty',
      scope: 'upcoming',
      emptyReason: futurePool.length === 0 ? 'no_upcoming' : 'no_matches',
      canExpandScope: true,
      recommendationMode: 'empty',
      coverage,
      understoodIntent: buildIntentSummary(intent, profile),
      remembered
    };
  }

  const rankedPast = rankCandidates(grouped.past, intent, profile, 'past', now)
    .filter((item) => item.score >= getRankThreshold(intent, 'past'));

  if (rankedPast.length > 0) {
    return buildRecommendationResponse({
      db,
      rankedItems: rankedPast,
      intent,
      profile,
      scope: 'past',
      canExpandScope: false,
      usedHistoricalFallback: true,
      remembered,
      coverage
    });
  }

  return {
    type: 'empty',
    scope: futurePool.length === 0 ? 'upcoming' : 'mixed_future',
    emptyReason: futurePool.length === 0 ? 'no_upcoming' : 'no_matches',
    canExpandScope: futurePool.length === 0 || grouped.past.length > 0,
    recommendationMode: 'empty',
    coverage,
    understoodIntent: buildIntentSummary(intent, profile),
    remembered,
    modelStatus: {
      used: false,
      message: '没有足够匹配的候选活动。'
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
  const profile = await loadUserEventProfile(db, userId);
  const grouped = await loadAllCandidates(db, now);
  const coverage = buildCoverageSummary(grouped);
  const futurePool = [...grouped.upcoming, ...grouped.ongoing].slice(0, MAX_CANDIDATES);
  let intentModelStatus = null;
  let intentFailure = null;

  let parsedIntent;
  try {
    parsedIntent = await parseAssistantIntentWithModel({
      db,
      query,
      clarificationAnswer,
      profile,
      clarificationUsed,
      modelRunner
    });
  } catch (error) {
    intentFailure = error;
    logInvalidModelOutput({
      error,
      scope: 'intent',
      candidateCount: coverage.total,
      rawContent: error.rawContent || '',
      jsonText: error.extractedJson || '',
      parsedResult: null
    });

    const fallbackIntent = parseAssistantIntent({ query, clarificationAnswer });
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
  const remembered = await maybeRememberPreference(db, userId, intent, rememberPreference);

  if (futurePool.length === 0 && !allowScopeExpansion && !allowHistoricalFallback) {
    return {
      type: 'empty',
      scope: 'upcoming',
      emptyReason: 'no_upcoming',
      canExpandScope: true,
      recommendationMode: 'empty',
      coverage,
      understoodIntent: buildIntentSummary(intent, profile),
      remembered,
      modelStatus: intentModelStatus
    };
  }

  if (
    (intent.needsClarification || intent.shouldClarify)
    && !clarificationUsed
    && futurePool.length >= IDEAL_MIN_RECOMMENDATIONS
  ) {
    return {
      type: 'clarify',
      scope: 'upcoming',
      question: intent.clarificationQuestion || buildClarificationQuestion(profile),
      clarificationUsed: true,
      recommendationMode: 'clarify',
      coverage,
      understoodIntent: buildIntentSummary(intent, profile),
      remembered,
      modelStatus: intentModelStatus
    };
  }

  const pool = await buildAiCandidatePool({
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
    return buildFallbackRecommendationResponse({
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
      understoodIntent: buildIntentSummary(intent, profile),
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
    rerank = await rerankCandidatesWithModel({
      db,
      intent,
      profile,
      candidates: pool.candidates,
      modelRunner
    });
  } catch (error) {
    logInvalidModelOutput({
      error,
      scope: pool.scope,
      candidateCount: pool.candidates.length,
      rawContent: error.rawContent || '',
      jsonText: error.extractedJson || '',
      parsedResult: null
    });

    return buildFallbackRecommendationResponse({
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

  return buildAiRecommendationResponse({
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
  runEventAssistantTurn: runUnifiedEventAssistantTurn,
  callEventAssistantModel,
  createAssistantError,
  parseAssistantIntent,
  loadUserEventProfile,
  recordEventAssistantFeedback
};
