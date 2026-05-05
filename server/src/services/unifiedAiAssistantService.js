const {
  classifyEventCategory,
  getCategoryLabel,
  normalizeEventAudience,
} = require('./eventIntelligenceService');
const aiModelConfigService = require('./aiModelConfigService');

const GOVERNANCE_FIELDS = new Set(['category', 'target_audience']);
const MAX_SCAN_LIMIT = 500;

const toText = (value, maxLength = 600) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const normalizeLimit = (value, fallback = 200) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return fallback;
  return Math.min(number, MAX_SCAN_LIMIT);
};

const normalizeConfidence = (value, fallback = 0.45) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, 0), 1);
};

const safeJson = (value) => JSON.stringify(value || {});

const parseJson = (value, fallback = {}) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const safeCount = async (db, sql, params = []) => {
  try {
    const row = await db.get(sql, params);
    return Number(row?.count || 0);
  } catch {
    return 0;
  }
};

const createRun = async (db, { module, action, status = 'completed', userId, summary }) => {
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
    [module, action, status, userId || null, safeJson(summary)]
  );
  return result.lastID;
};

const insertSuggestion = async (db, runId, suggestion) => {
  const result = await db.run(
    `
      INSERT INTO ai_event_governance_suggestions (
        run_id,
        event_id,
        field_name,
        old_value,
        new_value,
        confidence,
        reason,
        source,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'suggested')
    `,
    [
      runId,
      suggestion.eventId,
      suggestion.field,
      suggestion.currentValue,
      suggestion.suggestedValue,
      suggestion.confidence,
      suggestion.reason,
      suggestion.source,
    ]
  );
  return result.lastID;
};

const buildSuggestionId = (eventId, field, suggestedValue) =>
  `${eventId}:${field}:${Buffer.from(String(suggestedValue || '')).toString('base64url').slice(0, 24)}`;

const toSuggestion = ({
  event,
  field,
  fieldLabel,
  currentValue,
  suggestedValue,
  confidence,
  reason,
  source,
}) => ({
  id: buildSuggestionId(event.id, field, suggestedValue),
  suggestionId: null,
  eventId: event.id,
  eventTitle: event.title || '未命名活动',
  field,
  fieldLabel,
  currentValue: toText(currentValue, 1000),
  suggestedValue: toText(suggestedValue, 1000),
  confidence: Number(Number(confidence || 0).toFixed(2)),
  reason: toText(reason, 500),
  source: source || 'rules',
  status: 'suggested',
});

const buildEventSuggestions = (event, minConfidence) => {
  const suggestions = [];
  const classification = classifyEventCategory(event);
  const currentCategory = toText(event.category, 120);

  if (
    classification.category &&
    currentCategory !== classification.category &&
    classification.confidence >= minConfidence
  ) {
    suggestions.push(toSuggestion({
      event,
      field: 'category',
      fieldLabel: '活动分类',
      currentValue: currentCategory,
      suggestedValue: classification.category,
      confidence: classification.confidence,
      reason: `${classification.reason || '根据活动标题、标签和正文推断'}：${getCategoryLabel(classification.category)}`,
      source: classification.source || 'category',
    }));
  }

  const currentAudience = toText(event.target_audience, 300);
  const normalizedAudience = normalizeEventAudience(currentAudience);
  if (normalizedAudience && normalizedAudience !== currentAudience) {
    suggestions.push(toSuggestion({
      event,
      field: 'target_audience',
      fieldLabel: '面向对象',
      currentValue: currentAudience,
      suggestedValue: normalizedAudience,
      confidence: 0.78,
      reason: '把面向对象收敛到站内标准学院/年级/全校口径',
      source: 'audience_rules',
    }));
  }

  return suggestions.filter((item) => item.confidence >= minConfidence);
};

const serializeStoredSuggestion = (row) => ({
  suggestionId: row.id,
  id: buildSuggestionId(row.event_id, row.field_name, row.new_value),
  runId: row.run_id,
  eventId: row.event_id,
  eventTitle: row.title || '未命名活动',
  field: row.field_name,
  fieldLabel: {
    category: '活动分类',
    target_audience: '面向对象',
  }[row.field_name] || row.field_name,
  currentValue: row.old_value || '',
  suggestedValue: row.new_value || '',
  confidence: Number(Number(row.confidence || 0).toFixed(2)),
  reason: row.reason || '',
  source: row.source || '',
  status: row.status || 'suggested',
  appliedAt: row.applied_at || null,
});

const getAssistantOverview = async (db) => {
  const [
    eventCount,
    uncategorizedEventCount,
    feedbackCount,
    memoryCount,
    governanceRunCount,
  ] = await Promise.all([
    safeCount(db, 'SELECT COUNT(*) AS count FROM events WHERE deleted_at IS NULL'),
    safeCount(db, "SELECT COUNT(*) AS count FROM events WHERE deleted_at IS NULL AND (category IS NULL OR TRIM(category) = '')"),
    safeCount(db, 'SELECT COUNT(*) AS count FROM event_recommendation_feedback'),
    safeCount(db, 'SELECT COUNT(*) AS count FROM assistant_memory'),
    safeCount(db, "SELECT COUNT(*) AS count FROM ai_assistant_runs WHERE module = 'event_governance'"),
  ]);

  let configs = [];
  try {
    configs = await aiModelConfigService.listConfigs(db);
  } catch {
    configs = [];
  }
  const enabledConfigs = configs.filter((config) => config.enabled);
  const healthyConfigs = configs.filter((config) => config.last_status === 'ok');

  return {
    generatedAt: new Date().toISOString(),
    health: {
      eventCount,
      uncategorizedEventCount,
      modelConfigCount: configs.length,
      enabledModelConfigCount: enabledConfigs.length,
      healthyModelConfigCount: healthyConfigs.length,
      feedbackCount,
      memoryCount,
      governanceRunCount,
    },
    modules: [
      {
        id: 'event_recommendation',
        title: '活动推荐',
        status: eventCount > 0 ? 'live' : 'attention',
        entrance: '活动页 AI 助手',
        description: '面向用户做活动推荐，读取活动库、用户画像、偏好记忆和反馈。',
        metrics: [
          { label: '活动库', value: eventCount },
          { label: '偏好记忆', value: memoryCount },
          { label: '反馈', value: feedbackCount },
        ],
      },
      {
        id: 'event_governance',
        title: '活动治理',
        status: uncategorizedEventCount > 0 ? 'attention' : 'ready',
        entrance: '后台 AI 助手 / 活动治理',
        description: '扫描活动分类和面向对象，先给建议，再由管理员应用。',
        metrics: [
          { label: '待补分类', value: uncategorizedEventCount },
          { label: '扫描记录', value: governanceRunCount },
        ],
      },
      {
        id: 'content_parsing',
        title: '微信解析',
        status: 'planned',
        entrance: '后台 AI 助手 / 解析入口',
        description: '作为同一个助手的内容导入技能，后续接入微信图文、海报和活动链接解析。',
        metrics: [
          { label: '当前状态', value: '待接入' },
        ],
      },
      {
        id: 'model_config',
        title: '模型 Key',
        status: enabledConfigs.length > 0 ? 'ready' : 'attention',
        entrance: '后台 AI 助手 / 模型 Key',
        description: '管理多个兼容 OpenAI 接口的 Key，推荐和解析失败时按优先级自动切换。',
        metrics: [
          { label: '总 Key', value: configs.length },
          { label: '启用', value: enabledConfigs.length },
          { label: '已测通', value: healthyConfigs.length },
        ],
      },
    ],
  };
};

const scanEventGovernance = async (db, options = {}) => {
  const limit = normalizeLimit(options.limit);
  const minConfidence = normalizeConfidence(options.minConfidence);
  const userId = options.userId || null;

  const events = await db.all(
    `
      SELECT
        id,
        title,
        category,
        tags,
        description,
        content,
        organizer,
        location,
        target_audience,
        score,
        volunteer_time,
        status
      FROM events
      WHERE deleted_at IS NULL
      ORDER BY id DESC
      LIMIT ?
    `,
    [limit]
  );

  const suggestions = events.flatMap((event) => buildEventSuggestions(event, minConfidence));
  const summary = {
    scannedEventCount: events.length,
    suggestionCount: suggestions.length,
    highConfidenceCount: suggestions.filter((item) => item.confidence >= 0.72).length,
    minConfidence,
    fieldCounts: suggestions.reduce((accumulator, item) => {
      accumulator[item.field] = (accumulator[item.field] || 0) + 1;
      return accumulator;
    }, {}),
  };

  const runId = await createRun(db, {
    module: 'event_governance',
    action: 'scan',
    status: 'completed',
    userId,
    summary,
  });

  for (const suggestion of suggestions) {
    suggestion.suggestionId = await insertSuggestion(db, runId, suggestion);
    suggestion.runId = runId;
  }

  return {
    runId,
    summary,
    suggestions,
  };
};

const getCurrentEventValue = (event, field) => {
  if (field === 'target_audience') return toText(event.target_audience, 1000);
  return toText(event[field], 1000);
};

const applyEventGovernanceSuggestions = async (db, payload = {}, userId = null) => {
  const runId = Number(payload.runId);
  const ids = Array.isArray(payload.suggestionIds)
    ? payload.suggestionIds.map((id) => Number(id)).filter((id) => Number.isInteger(id))
    : [];
  const minConfidence = normalizeConfidence(payload.minConfidence, 0.72);

  if (!Number.isInteger(runId) || runId <= 0) {
    const error = new Error('治理扫描记录不存在。请先扫描活动库。');
    error.statusCode = 400;
    error.code = 'AI_ASSISTANT_RUN_REQUIRED';
    throw error;
  }

  if (ids.length === 0) {
    const error = new Error('请选择要应用的建议。');
    error.statusCode = 400;
    error.code = 'AI_ASSISTANT_SUGGESTION_REQUIRED';
    throw error;
  }

  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.all(
    `
      SELECT
        suggestion.*,
        event.title,
        event.category,
        event.tags,
        event.target_audience
      FROM ai_event_governance_suggestions suggestion
      JOIN events event ON event.id = suggestion.event_id
      WHERE suggestion.run_id = ?
        AND suggestion.id IN (${placeholders})
        AND suggestion.status = 'suggested'
      ORDER BY suggestion.confidence DESC, suggestion.id ASC
    `,
    [runId, ...ids]
  );

  const summary = {
    requestedCount: ids.length,
    eligibleCount: rows.length,
    appliedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    minConfidence,
    details: [],
  };

  await db.exec('BEGIN');
  try {
    for (const row of rows) {
      const field = row.field_name;
      const detail = {
        suggestionId: row.id,
        eventId: row.event_id,
        eventTitle: row.title || '',
        field,
        status: 'pending',
      };

      if (!GOVERNANCE_FIELDS.has(field) || Number(row.confidence || 0) < minConfidence) {
        detail.status = 'skipped';
        detail.reason = '建议字段不在允许范围内，或置信度低于应用阈值。';
        summary.skippedCount += 1;
        summary.details.push(detail);
        await db.run(
          'UPDATE ai_event_governance_suggestions SET status = ? WHERE id = ?',
          ['skipped', row.id]
        );
        continue;
      }

      const currentValue = getCurrentEventValue(row, field);
      const scannedValue = toText(row.old_value, 1000);
      if (currentValue !== scannedValue) {
        detail.status = 'skipped_conflict';
        detail.reason = '活动已被其他操作修改，本次不覆盖。';
        summary.skippedCount += 1;
        summary.details.push(detail);
        await db.run(
          'UPDATE ai_event_governance_suggestions SET status = ? WHERE id = ?',
          ['skipped_conflict', row.id]
        );
        continue;
      }

      await db.run(
        `UPDATE events SET "${field}" = ? WHERE id = ?`,
        [toText(row.new_value, 1000), row.event_id]
      );
      await db.run(
        `
          UPDATE ai_event_governance_suggestions
          SET status = 'applied',
              applied_by = ?,
              applied_at = datetime('now')
          WHERE id = ?
        `,
        [userId || null, row.id]
      );
      detail.status = 'applied';
      detail.from = scannedValue;
      detail.to = toText(row.new_value, 1000);
      summary.appliedCount += 1;
      summary.details.push(detail);
    }

    const applyRunId = await createRun(db, {
      module: 'event_governance',
      action: 'apply',
      status: 'completed',
      userId,
      summary,
    });
    summary.applyRunId = applyRunId;
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  return summary;
};

const listRecentGovernanceSuggestions = async (db, limit = 40) => {
  const rows = await db.all(
    `
      SELECT
        suggestion.*,
        event.title
      FROM ai_event_governance_suggestions suggestion
      LEFT JOIN events event ON event.id = suggestion.event_id
      ORDER BY suggestion.created_at DESC, suggestion.id DESC
      LIMIT ?
    `,
    [normalizeLimit(limit, 40)]
  );

  return rows.map(serializeStoredSuggestion);
};

const getRecentRuns = async (db, limit = 10) => {
  const rows = await db.all(
    `
      SELECT *
      FROM ai_assistant_runs
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `,
    [normalizeLimit(limit, 10)]
  );

  return rows.map((row) => ({
    id: row.id,
    module: row.module,
    action: row.action,
    status: row.status,
    requestedBy: row.requested_by,
    summary: parseJson(row.summary_json, {}),
    createdAt: row.created_at,
  }));
};

module.exports = {
  getAssistantOverview,
  scanEventGovernance,
  applyEventGovernanceSuggestions,
  listRecentGovernanceSuggestions,
  getRecentRuns,
};
