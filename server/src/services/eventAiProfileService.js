const crypto = require('crypto');
const {
  EVENT_CATEGORIES,
  EVENT_CAMPUS_OPTIONS,
  EVENT_AUDIENCE_OPTIONS,
  buildEventCatalogPromptText,
  normalizeEventCategory,
} = require('./eventIntelligenceService');
const aiRuntime = require('./unifiedAiRuntimeService');

const PROFILE_VERSION = 1;
const MAX_PROFILE_EVENTS_PER_TURN = 24;

const toText = (value, maxLength = 600) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const clampConfidence = (value, fallback = 0.5) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, 0), 1);
};

const uniqueTextArray = (value, maxItems = 12, itemMaxLength = 60) => {
  const list = Array.isArray(value) ? value : String(value || '').split(/[,，、;；\s\/|]+/);
  return [...new Set(
    list
      .map((item) => toText(item, itemMaxLength))
      .filter(Boolean)
  )].slice(0, maxItems);
};

const jsonArrayText = (items) => JSON.stringify(uniqueTextArray(items));

const parseJsonArrayText = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const buildEventSourceText = (event = {}) => [
  event.title,
  event.date,
  event.end_date,
  event.location,
  event.category,
  event.tags,
  event.description,
  event.content,
  event.organizer,
  event.target_audience,
  event.score,
  event.volunteer_time,
].map((value) => {
  if (Array.isArray(value)) return value.join(' ');
  return toText(value, 4000);
}).filter(Boolean).join('\n');

const buildSourceHash = (event = {}) => crypto
  .createHash('sha256')
  .update(`v${PROFILE_VERSION}\n${buildEventSourceText(event)}`)
  .digest('hex');

const serializeEventForProfile = (event = {}) => ({
  id: event.id,
  title: toText(event.title, 160),
  date: event.date || null,
  end_date: event.end_date || null,
  location: toText(event.location, 160),
  category: toText(event.category, 80),
  description: toText(event.description, 600),
  content: toText(event.content, 1500),
  organizer: toText(event.organizer, 160),
  target_audience: toText(event.target_audience, 160),
  score: toText(event.score, 100),
  volunteer_time: toText(event.volunteer_time, 100),
});

const normalizeProfile = (profile = {}, event = {}) => {
  const category = normalizeEventCategory(profile.category) || normalizeEventCategory(event.category) || 'other';
  const topics = uniqueTextArray(profile.topics, 12);
  const campuses = uniqueTextArray(profile.campuses, 8);
  const organizers = uniqueTextArray(profile.organizers, 8);
  const audiences = uniqueTextArray(profile.audiences, 8);
  const benefits = uniqueTextArray(profile.benefits, 8);
  const timePreferenceTerms = uniqueTextArray(profile.time_preference_terms || profile.timeTerms, 8);
  const summary = toText(profile.summary, 260)
    || toText(event.description, 180)
    || toText(event.title, 120);

  return {
    summary,
    category,
    topics,
    campuses,
    organizers,
    audiences,
    benefits,
    time_preference_terms: timePreferenceTerms,
    confidence: clampConfidence(profile.confidence, 0.55),
    rationale: toText(profile.rationale || profile.reason, 500),
  };
};

const buildRuleProfile = (event = {}) => {
  const text = buildEventSourceText(event);
  const campusTerms = EVENT_CAMPUS_OPTIONS.filter((item) => text.includes(item));
  const audienceTerms = EVENT_AUDIENCE_OPTIONS.filter((item) => text.includes(item));
  const benefitTerms = [
    /综测|综合评价|加分|素质分/.test(text) ? '综测' : '',
    /志愿|时长|工时|公益/.test(text) ? '志愿时长' : '',
    /证书|证明/.test(text) ? '证书' : '',
    /实习|就业|简历|offer|招聘/.test(text) ? '就业/实习' : '',
  ].filter(Boolean);

  return normalizeProfile({
    summary: event.description || event.title,
    category: event.category,
    topics: uniqueTextArray([event.category, event.title, event.organizer], 8),
    campuses: campusTerms,
    organizers: uniqueTextArray(event.organizer, 4),
    audiences: audienceTerms,
    benefits: benefitTerms,
    confidence: 0.45,
    rationale: '本地兜底画像，仅用于模型暂不可用时标记索引状态。',
  }, event);
};

const profilePrompt = (event) => [
  {
    role: 'system',
    content: [
      '你是浙江大学活动 AI 画像分析器。',
      '你必须基于活动文本输出 JSON，不要编造不存在的活动信息。',
      '分类必须优先使用网站标准活动库的 value。',
      '主题、校区、主办方、对象、收益都要抽取成便于推荐的短词。',
      '只输出 JSON 对象。'
    ].join('\n')
  },
  {
    role: 'user',
    content: JSON.stringify({
      task: 'build_event_ai_profile',
      standard_catalog: buildEventCatalogPromptText(),
      allowed_categories: EVENT_CATEGORIES.map((item) => item.value),
      event: serializeEventForProfile(event),
      output_contract: {
        summary: '80字以内中文摘要',
        category: 'one allowed category value',
        topics: ['主题关键词，如AI/创业/科研'],
        campuses: ['校区或线上'],
        organizers: ['学院/组织/主办方'],
        audiences: ['面向对象'],
        benefits: ['综测/志愿时长/证书/就业/技能等'],
        time_preference_terms: ['周末/晚上/近期等'],
        confidence: '0-1 number',
        rationale: '一句话说明依据'
      }
    }, null, 2)
  }
];

const upsertProfile = async (db, event, profile, meta = {}) => {
  const normalized = normalizeProfile(profile, event);
  const sourceHash = buildSourceHash(event);
  await db.run(
    `
      INSERT INTO event_ai_profiles (
        event_id,
        profile_version,
        source_hash,
        profile_json,
        summary,
        category,
        topic_terms,
        benefit_terms,
        campus_terms,
        audience_terms,
        organizer_terms,
        confidence,
        status,
        last_error,
        model_name,
        model_provider,
        refreshed_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(event_id) DO UPDATE SET
        profile_version = excluded.profile_version,
        source_hash = excluded.source_hash,
        profile_json = excluded.profile_json,
        summary = excluded.summary,
        category = excluded.category,
        topic_terms = excluded.topic_terms,
        benefit_terms = excluded.benefit_terms,
        campus_terms = excluded.campus_terms,
        audience_terms = excluded.audience_terms,
        organizer_terms = excluded.organizer_terms,
        confidence = excluded.confidence,
        status = excluded.status,
        last_error = excluded.last_error,
        model_name = excluded.model_name,
        model_provider = excluded.model_provider,
        refreshed_at = excluded.refreshed_at,
        updated_at = datetime('now')
    `,
    [
      event.id,
      PROFILE_VERSION,
      sourceHash,
      JSON.stringify(normalized),
      normalized.summary,
      normalized.category,
      jsonArrayText(normalized.topics),
      jsonArrayText(normalized.benefits),
      jsonArrayText(normalized.campuses),
      jsonArrayText(normalized.audiences),
      jsonArrayText(normalized.organizers),
      normalized.confidence,
      meta.status || 'ready',
      toText(meta.lastError, 500),
      toText(meta.modelName, 120),
      toText(meta.modelProvider, 120),
    ]
  );

  return {
    event_id: event.id,
    source_hash: sourceHash,
    profile_json: JSON.stringify(normalized),
    summary: normalized.summary,
    category: normalized.category,
    topic_terms: jsonArrayText(normalized.topics),
    benefit_terms: jsonArrayText(normalized.benefits),
    campus_terms: jsonArrayText(normalized.campuses),
    audience_terms: jsonArrayText(normalized.audiences),
    organizer_terms: jsonArrayText(normalized.organizers),
    confidence: normalized.confidence,
    status: meta.status || 'ready',
    model_name: toText(meta.modelName, 120),
    model_provider: toText(meta.modelProvider, 120),
  };
};

const serializeProfileRow = (row) => {
  if (!row) return null;
  let profile = {};
  try {
    profile = row.profile_json ? JSON.parse(row.profile_json) : {};
  } catch {
    profile = {};
  }

  return {
    eventId: Number(row.event_id),
    sourceHash: row.source_hash,
    summary: row.summary || profile.summary || '',
    category: row.category || profile.category || '',
    topics: parseJsonArrayText(row.topic_terms),
    benefits: parseJsonArrayText(row.benefit_terms),
    campuses: parseJsonArrayText(row.campus_terms),
    audiences: parseJsonArrayText(row.audience_terms),
    organizers: parseJsonArrayText(row.organizer_terms),
    confidence: clampConfidence(row.confidence, profile.confidence || 0.5),
    status: row.status || 'ready',
    refreshedAt: row.refreshed_at || null,
    modelName: row.model_name || '',
    modelProvider: row.model_provider || '',
    raw: profile,
  };
};

const getProfileRow = async (db, eventId) => db.get(
  'SELECT * FROM event_ai_profiles WHERE event_id = ?',
  [eventId]
);

const ensureEventProfile = async (db, event, options = {}) => {
  const sourceHash = buildSourceHash(event);
  const existing = await getProfileRow(db, event.id);
  if (
    existing
    && existing.source_hash === sourceHash
    && (existing.status === 'ready' || (options.useModel === false && existing.status === 'fallback'))
    && !options.force
  ) {
    return {
      profile: serializeProfileRow(existing),
      created: false,
      modelStatus: { used: false, task: 'event_profile_cache' }
    };
  }

  if (options.useModel === false) {
    const fallback = buildRuleProfile(event);
    const saved = await upsertProfile(db, event, fallback, {
      status: 'fallback',
      lastError: 'Skipped synchronous profile model call for request latency.',
    });
    return {
      profile: serializeProfileRow(saved),
      created: true,
      modelStatus: {
        used: false,
        task: 'event_profile_fast_fallback',
        message: 'Used a fast fallback profile for this request.'
      }
    };
  }

  try {
    const result = await aiRuntime.callJson(db, {
      task: 'event_profile',
      messages: profilePrompt(event),
      temperature: 0.1,
      maxTokens: 900,
      timeout: options.timeout || 45000,
      modelRunner: options.modelRunner
    });
    const saved = await upsertProfile(db, event, result.parsed, {
      status: 'ready',
      modelName: result.config?.model || '',
      modelProvider: result.config?.name || result.config?.provider || '',
    });
    return {
      profile: serializeProfileRow(saved),
      created: true,
      modelStatus: result.modelStatus
    };
  } catch (error) {
    const fallback = buildRuleProfile(event);
    const saved = await upsertProfile(db, event, fallback, {
      status: 'fallback',
      lastError: error.message,
    });
    return {
      profile: serializeProfileRow(saved),
      created: true,
      error,
      modelStatus: {
        used: false,
        task: 'event_profile',
        message: error.message,
        attempts: error.attempts || []
      }
    };
  }
};

const ensureEventProfiles = async (db, events, options = {}) => {
  const limitedEvents = events.slice(0, options.limit || MAX_PROFILE_EVENTS_PER_TURN);
  const profilesByEventId = new Map();
  const stats = {
    requested: limitedEvents.length,
    generated: 0,
    cached: 0,
    fallback: 0,
    failed: 0,
  };
  const modelStatuses = [];

  for (const event of limitedEvents) {
    const result = await ensureEventProfile(db, event, options);
    if (result.profile) profilesByEventId.set(Number(event.id), result.profile);
    if (result.created) stats.generated += 1;
    else stats.cached += 1;
    if (result.profile?.status === 'fallback') stats.fallback += 1;
    if (result.error) stats.failed += 1;
    if (result.modelStatus) modelStatuses.push(result.modelStatus);
  }

  return {
    profilesByEventId,
    stats,
    modelStatuses
  };
};

const getProfileCoverage = async (db) => {
  const row = await db.get(`
    SELECT
      COUNT(events.id) AS event_count,
      SUM(CASE WHEN profiles.event_id IS NOT NULL THEN 1 ELSE 0 END) AS profile_count,
      SUM(CASE WHEN profiles.status = 'ready' THEN 1 ELSE 0 END) AS ready_count,
      SUM(CASE WHEN profiles.status = 'fallback' THEN 1 ELSE 0 END) AS fallback_count
    FROM events
    LEFT JOIN event_ai_profiles profiles ON profiles.event_id = events.id
    WHERE events.deleted_at IS NULL
      AND events.status = 'approved'
  `);

  const eventCount = Number(row?.event_count || 0);
  const profileCount = Number(row?.profile_count || 0);
  const readyCount = Number(row?.ready_count || 0);
  const fallbackCount = Number(row?.fallback_count || 0);
  const coverageRatio = eventCount > 0 ? profileCount / eventCount : 0;

  return {
    eventCount,
    profileCount,
    readyCount,
    fallbackCount,
    totalProfiles: profileCount,
    readyProfiles: readyCount,
    fallbackProfiles: fallbackCount,
    failedProfiles: 0,
    coverageRatio,
  };
};

module.exports = {
  PROFILE_VERSION,
  buildSourceHash,
  ensureEventProfile,
  ensureEventProfiles,
  getProfileCoverage,
  serializeProfileRow,
};
