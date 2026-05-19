const {
  buildEventCatalogPromptContext,
  classifyEventCategory,
  getCategoryLabel,
  normalizeEventAudience,
  normalizeEventCategory,
} = require('./eventIntelligenceService');
const { runStructuredTask } = require('./assistantOrchestratorService');
const aiRuntime = require('./unifiedAiRuntimeService');
const aiModelConfigService = require('./aiModelConfigService');
const aiAgentRegistryService = require('./aiAgentRegistryService');
const eventAiProfileService = require('./eventAiProfileService');

const GOVERNANCE_FIELDS = new Set(['category', 'target_audience']);
const MAX_SCAN_LIMIT = 500;
const GOVERNANCE_MODEL_REVIEW_LIMIT = 12;
const GOVERNANCE_MODEL_REVIEW_THRESHOLD = 0.72;

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

const emptyRuntimeTelemetryOverview = () => ({
  runCount: 0,
  taskCount: 0,
  tasks: [],
  totalDurationMs: 0,
  avgDurationMs: 0,
  totalBudgetTokensEstimate: 0,
  reportedTotalTokens: 0,
  retryCount: 0,
  taskStats: [],
});

const addRuntimeTelemetry = (aggregate, telemetry) => {
  if (!telemetry || typeof telemetry !== 'object' || Number(telemetry.taskCount || 0) <= 0) {
    return;
  }

  aggregate.runCount += 1;
  aggregate.taskCount += Number(telemetry.taskCount || 0);
  aggregate.totalDurationMs += Number(telemetry.totalDurationMs || 0);
  aggregate.totalBudgetTokensEstimate += Number(telemetry.totalBudgetTokensEstimate || 0);
  aggregate.reportedTotalTokens += Number(telemetry.reportedTotalTokens || 0);
  aggregate.retryCount += Number(telemetry.retryCount || 0);

  for (const taskStat of telemetry.taskStats || []) {
    const task = taskStat.task || 'unknown';
    const existing = aggregate.taskMap.get(task) || {
      task,
      count: 0,
      durationMs: 0,
      budgetTokensEstimate: 0,
      reportedTotalTokens: 0,
      retryCount: 0,
    };
    existing.count += Number(taskStat.count || 0);
    existing.durationMs += Number(taskStat.durationMs || 0);
    existing.budgetTokensEstimate += Number(taskStat.budgetTokensEstimate || 0);
    existing.reportedTotalTokens += Number(taskStat.reportedTotalTokens || 0);
    existing.retryCount += Number(taskStat.retryCount || 0);
    aggregate.taskMap.set(task, existing);
  }
};

const getRuntimeTelemetryOverview = async (db) => {
  try {
    const rows = await db.all(`
      SELECT summary_json
      FROM ai_assistant_runs
      ORDER BY created_at DESC, id DESC
      LIMIT 80
    `);
    const aggregate = {
      ...emptyRuntimeTelemetryOverview(),
      taskMap: new Map(),
    };

    for (const row of rows) {
      const summary = parseJson(row.summary_json, {});
      addRuntimeTelemetry(aggregate, summary.runtimeTelemetry);
      addRuntimeTelemetry(aggregate, summary.modelReview?.runtimeTelemetry);
    }

    const taskStats = [...aggregate.taskMap.values()]
      .sort((left, right) => right.durationMs - left.durationMs || left.task.localeCompare(right.task))
      .slice(0, 12);

    return {
      runCount: aggregate.runCount,
      taskCount: aggregate.taskCount,
      tasks: taskStats.map((item) => item.task),
      totalDurationMs: aggregate.totalDurationMs,
      avgDurationMs: aggregate.taskCount > 0
        ? Math.round(aggregate.totalDurationMs / aggregate.taskCount)
        : 0,
      totalBudgetTokensEstimate: aggregate.totalBudgetTokensEstimate,
      reportedTotalTokens: aggregate.reportedTotalTokens,
      retryCount: aggregate.retryCount,
      taskStats,
    };
  } catch {
    return emptyRuntimeTelemetryOverview();
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

const buildGovernanceEventSnapshot = (event = {}) => ({
  id: event.id,
  title: toText(event.title, 180),
  category: toText(event.category, 80),
  tags: toText(event.tags, 160),
  description: toText(event.description, 500),
  content: toText(event.content, 900),
  organizer: toText(event.organizer, 120),
  location: toText(event.location, 120),
  targetAudience: toText(event.target_audience, 160),
  score: toText(event.score, 80),
  volunteerTime: toText(event.volunteer_time, 80),
});

const buildGovernanceReviewContract = () => ({
  reviews: [
    {
      eventId: 'number',
      field: 'category | target_audience',
      accepted: 'boolean',
      suggestedValue: 'canonical category value or normalized audience string',
      confidence: '0..1',
      reason: 'short grounded reason',
    },
  ],
  memorySignals: [
    {
      pattern: 'short reusable admin preference or correction pattern',
      weight: '0..1',
    },
  ],
  warnings: ['string'],
});

const loadGovernanceMemory = async (db, limit = 8) => {
  try {
    const rows = await db.all(
      `
        SELECT
          suggestion.field_name,
          suggestion.old_value,
          suggestion.new_value,
          suggestion.confidence,
          suggestion.source,
          suggestion.status,
          suggestion.applied_at,
          event.title
        FROM ai_event_governance_suggestions suggestion
        LEFT JOIN events event ON event.id = suggestion.event_id
        WHERE suggestion.status IN ('applied', 'skipped', 'skipped_conflict')
        ORDER BY COALESCE(suggestion.applied_at, suggestion.created_at) DESC, suggestion.id DESC
        LIMIT ?
      `,
      [normalizeLimit(limit, 8)]
    );

    return rows.map((row) => ({
      field: row.field_name,
      from: toText(row.old_value, 100),
      to: toText(row.new_value, 100),
      status: row.status,
      source: row.source,
      confidence: Number(Number(row.confidence || 0).toFixed(2)),
      eventTitle: toText(row.title, 120),
    }));
  } catch {
    return [];
  }
};

const shouldReviewSuggestionWithModel = (suggestion) => (
  suggestion.field === 'category'
  && suggestion.confidence <= GOVERNANCE_MODEL_REVIEW_THRESHOLD
  && suggestion.confidence >= 0.45
);

const selectModelReviewCandidates = (events, suggestions) => {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  return suggestions
    .filter(shouldReviewSuggestionWithModel)
    .slice(0, GOVERNANCE_MODEL_REVIEW_LIMIT)
    .map((suggestion) => ({
      suggestion,
      event: eventsById.get(suggestion.eventId),
    }))
    .filter((item) => item.event);
};

const normalizeModelGovernanceReview = (review = {}, fallbackSuggestion) => {
  const field = GOVERNANCE_FIELDS.has(review.field) ? review.field : fallbackSuggestion.field;
  const rawSuggestedValue = toText(review.suggestedValue, 500);
  const suggestedValue = field === 'category'
    ? normalizeEventCategory(rawSuggestedValue)
    : normalizeEventAudience(rawSuggestedValue);
  const confidence = normalizeConfidence(review.confidence, fallbackSuggestion.confidence);

  if (!suggestedValue) {
    return null;
  }

  return {
    field,
    accepted: review.accepted !== false,
    suggestedValue,
    confidence,
    reason: toText(review.reason, 500) || fallbackSuggestion.reason,
  };
};

const reviewGovernanceSuggestionsWithModel = async (db, {
  events,
  suggestions,
  memory,
  modelRunner,
}) => {
  const candidates = selectModelReviewCandidates(events, suggestions);
  if (candidates.length === 0) {
    return {
      suggestions,
      modelStatus: { used: false, fallbackUsed: false },
      memorySignals: [],
      warnings: [],
    };
  }

  try {
    const result = await runStructuredTask(db, {
      task: 'event_governance_review',
      modelRunner,
      temperature: 0.1,
      maxTokens: 1400,
      timeout: 35000,
      systemPrompt: [
        'You are the admin governance reviewer for a campus event platform.',
        'Use the standard event catalog and recent admin decisions to review only the provided candidate suggestions.',
        'Do not invent categories. Accept only standard category values or normalized audience strings.',
        'Prefer conservative decisions: reject a suggestion when the event evidence is ambiguous.',
      ].join('\n'),
      payload: {
        task: 'event_governance_review',
        standardCatalog: buildEventCatalogPromptContext(),
        recentAdminDecisionMemory: memory,
        candidates: candidates.map(({ event, suggestion }) => ({
          event: buildGovernanceEventSnapshot(event),
          ruleSuggestion: {
            id: suggestion.id,
            field: suggestion.field,
            currentValue: suggestion.currentValue,
            suggestedValue: suggestion.suggestedValue,
            confidence: suggestion.confidence,
            reason: suggestion.reason,
            source: suggestion.source,
          },
        })),
      },
      outputContract: buildGovernanceReviewContract(),
    });

    const reviews = Array.isArray(result.parsed.reviews) ? result.parsed.reviews : [];
    const reviewByKey = new Map(reviews.map((review) => [
      `${review.eventId}:${review.field}`,
      review,
    ]));

    const reviewed = suggestions.map((suggestion) => {
      if (!shouldReviewSuggestionWithModel(suggestion)) return suggestion;
      const rawReview = reviewByKey.get(`${suggestion.eventId}:${suggestion.field}`);
      if (!rawReview) return suggestion;
      const normalizedReview = normalizeModelGovernanceReview(rawReview, suggestion);
      if (!normalizedReview || normalizedReview.accepted === false) {
        return {
          ...suggestion,
          confidence: Math.min(suggestion.confidence, 0.44),
          reason: normalizedReview?.reason || `${suggestion.reason} Model review did not accept this change.`,
          source: `${suggestion.source}+model_rejected`,
        };
      }
      return {
        ...suggestion,
        field: normalizedReview.field,
        suggestedValue: normalizedReview.suggestedValue,
        confidence: Number(Math.max(suggestion.confidence, normalizedReview.confidence).toFixed(2)),
        reason: normalizedReview.reason,
        source: `${suggestion.source}+model_review`,
      };
    });

    return {
      suggestions: reviewed,
      modelStatus: result.modelStatus,
      memorySignals: Array.isArray(result.parsed.memorySignals) ? result.parsed.memorySignals : [],
      warnings: Array.isArray(result.parsed.warnings) ? result.parsed.warnings.map((item) => toText(item, 160)) : [],
    };
  } catch (error) {
    return {
      suggestions,
      modelStatus: {
        used: false,
        fallbackUsed: true,
        errorCode: error.code || 'EVENT_GOVERNANCE_REVIEW_FAILED',
      },
      memorySignals: [],
      warnings: ['Model governance review failed; deterministic governance suggestions were used.'],
    };
  }
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
    recommendationRunCount,
    hackathonRunCount,
    wechatParseRunCount,
    profileRefreshRunCount,
    profileCoverage,
    runtimeTelemetryOverview,
  ] = await Promise.all([
    safeCount(db, 'SELECT COUNT(*) AS count FROM events WHERE deleted_at IS NULL'),
    safeCount(db, "SELECT COUNT(*) AS count FROM events WHERE deleted_at IS NULL AND (category IS NULL OR TRIM(category) = '')"),
    safeCount(db, 'SELECT COUNT(*) AS count FROM event_recommendation_feedback'),
    safeCount(db, 'SELECT COUNT(*) AS count FROM assistant_memory'),
    safeCount(db, "SELECT COUNT(*) AS count FROM ai_assistant_runs WHERE module = 'event_governance'"),
    safeCount(db, "SELECT COUNT(*) AS count FROM ai_assistant_runs WHERE module = 'event_recommendation'"),
    safeCount(db, "SELECT COUNT(*) AS count FROM ai_assistant_runs WHERE module = 'hackathon_coach'"),
    safeCount(db, "SELECT COUNT(*) AS count FROM ai_assistant_runs WHERE module = 'wechat_event_parser'"),
    safeCount(db, "SELECT COUNT(*) AS count FROM ai_assistant_runs WHERE module = 'event_profile_index'"),
    eventAiProfileService.getProfileCoverage(db).catch(() => ({
      totalProfiles: 0,
      readyProfiles: 0,
      fallbackProfiles: 0,
      staleProfiles: 0,
      missingProfiles: 0,
      reasonCounts: {},
      failedProfiles: 0,
      coverageRatio: 0,
      staleRatio: 0,
    })),
    getRuntimeTelemetryOverview(db),
  ]);

  let configs = [];
  try {
    configs = await aiModelConfigService.listConfigs(db);
  } catch {
    configs = [];
  }
  const enabledConfigs = configs.filter((config) => config.enabled);
  const healthyConfigs = configs.filter((config) => config.last_status === 'ok');

  const health = {
    eventCount,
    uncategorizedEventCount,
    modelConfigCount: configs.length,
    enabledModelConfigCount: enabledConfigs.length,
    healthyModelConfigCount: healthyConfigs.length,
    feedbackCount,
    memoryCount,
    governanceRunCount,
    recommendationRunCount,
    hackathonRunCount,
    wechatParseRunCount,
    profileRefreshRunCount,
    eventAiProfileCount: profileCoverage.totalProfiles,
    readyEventAiProfileCount: profileCoverage.readyProfiles,
    fallbackEventAiProfileCount: profileCoverage.fallbackProfiles,
    staleEventAiProfileCount: profileCoverage.staleProfiles,
    missingEventAiProfileCount: profileCoverage.missingProfiles,
    eventAiProfileIssueCounts: profileCoverage.reasonCounts || {},
    eventAiProfileCoverageRatio: profileCoverage.coverageRatio,
    eventAiProfileStaleRatio: profileCoverage.staleRatio,
    runtimeTelemetryRunCount: runtimeTelemetryOverview.runCount,
    runtimeTelemetryTaskCount: runtimeTelemetryOverview.taskCount,
    runtimeTelemetryTasks: runtimeTelemetryOverview.tasks,
    runtimeTelemetryAvgDurationMs: runtimeTelemetryOverview.avgDurationMs,
    runtimeTelemetryBudgetTokensEstimate: runtimeTelemetryOverview.totalBudgetTokensEstimate,
    runtimeTelemetryReportedTotalTokens: runtimeTelemetryOverview.reportedTotalTokens,
    runtimeTelemetryRetryCount: runtimeTelemetryOverview.retryCount,
    runtimeTelemetryTaskStats: runtimeTelemetryOverview.taskStats,
  };

  return {
    generatedAt: new Date().toISOString(),
    health,
    agentSystem: aiAgentRegistryService.getAgentSystemOverview(health),
    modules: aiAgentRegistryService.buildOverviewModules(health),
  };
};

const scanEventGovernance = async (db, options = {}) => {
  const limit = normalizeLimit(options.limit);
  const minConfidence = normalizeConfidence(options.minConfidence);
  const userId = options.userId || null;
  const modelRunner = options.modelRunner;

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

  const ruleSuggestions = events.flatMap((event) => buildEventSuggestions(
    event,
    Math.min(minConfidence, GOVERNANCE_MODEL_REVIEW_THRESHOLD)
  ));
  const governanceMemory = await loadGovernanceMemory(db);
  const modelReview = await reviewGovernanceSuggestionsWithModel(db, {
    events,
    suggestions: ruleSuggestions,
    memory: governanceMemory,
    modelRunner,
  });
  const suggestions = modelReview.suggestions.filter((item) => item.confidence >= minConfidence);
  const summary = {
    scannedEventCount: events.length,
    suggestionCount: suggestions.length,
    highConfidenceCount: suggestions.filter((item) => item.confidence >= 0.72).length,
    minConfidence,
    modelReview: {
      used: Boolean(modelReview.modelStatus?.used),
      fallbackUsed: Boolean(modelReview.modelStatus?.fallbackUsed),
      task: modelReview.modelStatus?.task || null,
      reviewedCandidateCount: selectModelReviewCandidates(events, ruleSuggestions).length,
      memorySignalCount: modelReview.memorySignals.length,
      warningCount: modelReview.warnings.length,
      runtimeTelemetry: aiRuntime.summarizeModelStatusTelemetry(modelReview.modelStatus),
    },
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
    modelStatus: modelReview.modelStatus,
    memorySignals: modelReview.memorySignals,
    warnings: modelReview.warnings,
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

const summarizeGovernanceMemory = async (db) => {
  const rows = await loadGovernanceMemory(db, 20);
  const fieldCounts = rows.reduce((accumulator, row) => {
    const key = `${row.field}:${row.status}`;
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  return {
    decisionCount: rows.length,
    fieldCounts,
    examples: rows.slice(0, 5),
  };
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
  buildGovernanceReviewContract,
  getAssistantOverview,
  scanEventGovernance,
  applyEventGovernanceSuggestions,
  summarizeGovernanceMemory,
  listRecentGovernanceSuggestions,
  getRecentRuns,
};
