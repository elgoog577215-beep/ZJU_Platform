const {
  callChatCompletionWithFailover
} = require('../services/aiModelConfigService');
const {
  EVENT_CATEGORY_LABELS: CATEGORY_LABELS,
  EVENT_CAMPUS_OPTIONS,
  EVENT_AUDIENCE_ALIASES,
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
const BENEFIT_ALIASES = {
  score: ['综测', '加分', '综合评价', '第二课堂', '学分'],
  volunteer_time: ['志愿', '时长', '工时', '小时', '公益']
};

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

const splitTokens = (value) => sanitizeText(value, 500)
  .split(/[,，、;；\s/|]+/)
  .map((item) => item.trim())
  .filter(Boolean);

const includesAny = (haystack, needles) => needles.some((needle) => haystack.includes(needle.toLowerCase()));

const normalizeSearchText = (...values) => values
  .map((value) => sanitizeText(value, 1000).toLowerCase())
  .join(' ');

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
  const rawTokens = splitTokens(combined)
    .filter((token) => token.length >= 2 && token.length <= 20)
    .filter((token) => !['活动', '推荐', '帮我', '想找', '一个', '一些', '有没有'].includes(token));
  const topics = unique([
    ...categories.map((category) => CATEGORY_LABELS[category] || category),
    ...campuses,
    ...audiences,
    ...rawTokens.slice(0, 8)
  ]).slice(0, 12);

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
    topics,
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
    if (eventText.includes(normalized)) {
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
    const result = await callChatCompletionWithFailover(
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
        temperature: 0.2,
        max_tokens: 900
      },
      { timeout: 25000 }
    );

    const rawContent = result.data?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(extractJsonObject(rawContent));
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

const callEventAssistantModel = async ({ db, messages, payload }) => {
  if (!db) {
    throw createAssistantError(
      'EVENT_ASSISTANT_UNAVAILABLE',
      'The event AI assistant is not configured on the server.',
      503
    );
  }

  const result = await callChatCompletionWithFailover(db, payload || { messages });
  const rawContent = result.data?.choices?.[0]?.message?.content || '';
  return {
    rawContent,
    jsonText: extractJsonObject(rawContent),
    config: result.config,
    attempts: result.attempts
  };
};

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
  runEventAssistantTurn,
  callEventAssistantModel,
  createAssistantError,
  parseAssistantIntent,
  loadUserEventProfile,
  recordEventAssistantFeedback
};
