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
const eventRecommendationEvidenceService = require('./eventRecommendationEvidenceService');
const resourceSearchIndexService = require('./resourceSearchIndexService');

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

const emptyAgentRuntimeHealth = (agentId) => ({
  agentId,
  status: 'NO_DATA',
  sampleSize: 0,
  runCount: 0,
  modelUsedRate: 0,
  fallbackRate: 0,
  errorCount: 0,
  warningCount: 0,
  avgDurationMs: 0,
  retryCount: 0,
  recentError: null,
  suggestedAction: 'Collect runtime samples before making optimization decisions.',
});

const resolveRuntimeHealthStatus = ({ runCount, fallbackRate, errorCount, avgDurationMs, retryCount }) => {
  if (runCount <= 0) return 'NO_DATA';
  if (errorCount >= 3 || fallbackRate >= 0.6) return 'blocked';
  if (errorCount >= 1 || fallbackRate >= 0.3 || avgDurationMs >= 12000) return 'degraded';
  if (retryCount >= 2 || fallbackRate > 0 || avgDurationMs >= 6000) return 'watch';
  return 'healthy';
};

const buildRuntimeSuggestedAction = (status, { fallbackRate, errorCount, avgDurationMs, retryCount }) => {
  if (status === 'NO_DATA') return 'Collect runtime samples before making optimization decisions.';
  if (status === 'blocked') return 'Inspect provider health, model key status, and fallback path before increasing traffic.';
  if (errorCount > 0) return 'Review recent errors and add a focused golden case for this Agent.';
  if (fallbackRate >= 0.3) return 'Reduce fallback rate by improving prompt contract, model reliability, or context index coverage.';
  if (avgDurationMs >= 6000) return 'Review token budget, candidate size, and timeout policy for this Agent.';
  if (retryCount >= 2) return 'Check JSON repair or stream retry frequency for this Agent.';
  return 'Maintain current runtime checks and monitor trend changes.';
};

const finalizeRuntimeAggregate = (agentId, aggregate) => {
  if (!aggregate || aggregate.runCount <= 0) return emptyAgentRuntimeHealth(agentId);

  const modelUsedRate = aggregate.runCount > 0 ? aggregate.modelUsedCount / aggregate.runCount : 0;
  const fallbackRate = aggregate.runCount > 0 ? aggregate.fallbackCount / aggregate.runCount : 0;
  const avgDurationMs = aggregate.telemetryTaskCount > 0
    ? Math.round(aggregate.totalDurationMs / aggregate.telemetryTaskCount)
    : 0;
  const status = resolveRuntimeHealthStatus({
    runCount: aggregate.runCount,
    fallbackRate,
    errorCount: aggregate.errorCount,
    avgDurationMs,
    retryCount: aggregate.retryCount,
  });

  return {
    agentId,
    status,
    sampleSize: aggregate.runCount,
    runCount: aggregate.runCount,
    modelUsedRate: Number(modelUsedRate.toFixed(2)),
    fallbackRate: Number(fallbackRate.toFixed(2)),
    errorCount: aggregate.errorCount,
    warningCount: aggregate.warningCount,
    avgDurationMs,
    retryCount: aggregate.retryCount,
    recentError: aggregate.recentError || null,
    suggestedAction: buildRuntimeSuggestedAction(status, {
      fallbackRate,
      errorCount: aggregate.errorCount,
      avgDurationMs,
      retryCount: aggregate.retryCount,
    }),
  };
};

const getAgentRuntimeHealthOverview = async (db, agentIds = []) => {
  const aggregates = new Map(agentIds.map((agentId) => [agentId, {
    runCount: 0,
    modelUsedCount: 0,
    fallbackCount: 0,
    errorCount: 0,
    warningCount: 0,
    telemetryTaskCount: 0,
    totalDurationMs: 0,
    retryCount: 0,
    recentError: null,
  }]));

  try {
    const rows = await db.all(`
      SELECT module, status, summary_json
      FROM ai_assistant_runs
      ORDER BY created_at DESC, id DESC
      LIMIT 120
    `);

    for (const row of rows) {
      const agentId = row.module;
      if (!aggregates.has(agentId)) continue;
      const summary = parseJson(row.summary_json, {});
      const aggregate = aggregates.get(agentId);
      const runtimeTelemetry = summary.runtimeTelemetry || summary.modelReview?.runtimeTelemetry || {};

      aggregate.runCount += 1;
      if (summary.modelUsed === true || summary.modelReview?.used === true) aggregate.modelUsedCount += 1;
      if (summary.fallbackUsed === true || summary.modelReview?.fallbackUsed === true) aggregate.fallbackCount += 1;
      if (row.status === 'failed' || summary.status === 'failed' || summary.errorCode || summary.error) {
        aggregate.errorCount += 1;
        aggregate.recentError = aggregate.recentError || toText(summary.errorCode || summary.error || row.status, 180);
      }
      aggregate.warningCount += Number(summary.warningCount || 0);
      aggregate.telemetryTaskCount += Number(runtimeTelemetry.taskCount || 0);
      aggregate.totalDurationMs += Number(runtimeTelemetry.totalDurationMs || 0);
      aggregate.retryCount += Number(runtimeTelemetry.retryCount || 0);
    }
  } catch {
    return Object.fromEntries(agentIds.map((agentId) => [agentId, emptyAgentRuntimeHealth(agentId)]));
  }

  return Object.fromEntries(
    agentIds.map((agentId) => [agentId, finalizeRuntimeAggregate(agentId, aggregates.get(agentId))])
  );
};

const buildModelHealthOverview = (configs = [], runtimeTelemetryOverview = emptyRuntimeTelemetryOverview(), agentRuntimeHealth = {}) => {
  const enabledConfigs = configs.filter((config) => config.enabled);
  const healthyConfigs = configs.filter((config) => config.last_status === 'ok');
  const errorConfigs = configs.filter((config) => config.last_status && config.last_status !== 'ok');
  const agentHealthValues = Object.values(agentRuntimeHealth || {});
  const blockedAgents = agentHealthValues.filter((item) => item.status === 'blocked').length;
  const degradedAgents = agentHealthValues.filter((item) => item.status === 'degraded').length;
  const retryCount = Number(runtimeTelemetryOverview.retryCount || 0);
  const avgDurationMs = Number(runtimeTelemetryOverview.avgDurationMs || 0);

  let status = 'healthy';
  let suggestedAction = 'Maintain current model routing and runtime policy.';
  if (enabledConfigs.length === 0) {
    status = 'blocked';
    suggestedAction = 'Add and test at least one enabled model config.';
  } else if (healthyConfigs.length === 0 || blockedAgents > 0) {
    status = 'blocked';
    suggestedAction = 'Test model keys, inspect provider errors, and keep deterministic fallbacks available.';
  } else if (errorConfigs.length > 0 || degradedAgents > 0 || retryCount >= 3) {
    status = 'degraded';
    suggestedAction = 'Inspect failing configs, lower priority for unstable providers, or rotate keys.';
  } else if (retryCount > 0 || avgDurationMs >= 6000) {
    status = 'watch';
    suggestedAction = 'Watch retry and latency trend before changing provider priority.';
  }

  return {
    status,
    enabledCount: enabledConfigs.length,
    healthyCount: healthyConfigs.length,
    errorCount: errorConfigs.length,
    retryCount,
    avgDurationMs,
    recentErrors: errorConfigs.slice(0, 3).map((config) => ({
      id: config.id,
      name: config.name,
      provider: config.provider,
      model: config.model,
      lastStatus: config.last_status,
      lastError: toText(config.last_error, 180),
      lastCheckedAt: config.last_checked_at || null,
    })),
    circuitBreakerRecommendation: {
      status,
      automaticAction: false,
      suggestedAction,
    },
  };
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
    globalSearchIndexRunCount,
    profileCoverage,
    globalSearchIndexCoverage,
    recommendationActionEvidence,
    runtimeTelemetryOverview,
    agentRuntimeHealth,
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
    safeCount(db, "SELECT COUNT(*) AS count FROM ai_assistant_runs WHERE module = 'global_search_index'"),
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
    resourceSearchIndexService.getResourceSearchIndexCoverage(db).catch(() => ({
      publicResourceCount: 0,
      indexedCount: 0,
      readyCount: 0,
      missingCount: 0,
      coverageRatio: 0,
      byType: {},
      byGroup: {},
    })),
    eventRecommendationEvidenceService.getRecommendationActionEvidence(db).catch(() => ({
      status: 'NO_RECOMMENDATION',
      confidence: 0,
      actionRate: 0,
      observedActions: 0,
      contradictedActions: 0,
      recommendationCount: 0,
    })),
    getRuntimeTelemetryOverview(db),
    getAgentRuntimeHealthOverview(db, aiAgentRegistryService.getAgentDefinitions().map((agent) => agent.id)),
  ]);

  let configs = [];
  try {
    configs = await aiModelConfigService.listConfigs(db);
  } catch {
    configs = [];
  }
  const enabledConfigs = configs.filter((config) => config.enabled);
  const healthyConfigs = configs.filter((config) => config.last_status === 'ok');
  const modelHealth = buildModelHealthOverview(configs, runtimeTelemetryOverview, agentRuntimeHealth);

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
    recommendationActionEvidenceStatus: recommendationActionEvidence.status,
    recommendationActionEvidenceConfidence: recommendationActionEvidence.confidence,
    recommendationActionRate: recommendationActionEvidence.actionRate,
    recommendationObservedActionCount: recommendationActionEvidence.observedActions,
    recommendationContradictedActionCount: recommendationActionEvidence.contradictedActions,
    recommendationEvidenceWindowDays: recommendationActionEvidence.windowDays,
    recommendationEvidenceSummary: recommendationActionEvidence.observedEvidence,
    recommendationEvidenceNextAdjustment: recommendationActionEvidence.nextAdjustment,
    hackathonRunCount,
    wechatParseRunCount,
    profileRefreshRunCount,
    globalSearchIndexRunCount,
    eventAiProfileCount: profileCoverage.totalProfiles,
    readyEventAiProfileCount: profileCoverage.readyProfiles,
    fallbackEventAiProfileCount: profileCoverage.fallbackProfiles,
    staleEventAiProfileCount: profileCoverage.staleProfiles,
    missingEventAiProfileCount: profileCoverage.missingProfiles,
    eventAiProfileIssueCounts: profileCoverage.reasonCounts || {},
    eventAiProfileCoverageRatio: profileCoverage.coverageRatio,
    eventAiProfileStaleRatio: profileCoverage.staleRatio,
    globalSearchPublicResourceCount: globalSearchIndexCoverage.publicResourceCount,
    globalSearchIndexedResourceCount: globalSearchIndexCoverage.indexedCount,
    globalSearchReadyIndexCount: globalSearchIndexCoverage.readyCount,
    globalSearchMissingIndexCount: globalSearchIndexCoverage.missingCount,
    globalSearchIndexCoverageRatio: globalSearchIndexCoverage.coverageRatio,
    globalSearchIndexByType: globalSearchIndexCoverage.byType,
    globalSearchIndexByGroup: globalSearchIndexCoverage.byGroup,
    runtimeTelemetryRunCount: runtimeTelemetryOverview.runCount,
    runtimeTelemetryTaskCount: runtimeTelemetryOverview.taskCount,
    runtimeTelemetryTasks: runtimeTelemetryOverview.tasks,
    runtimeTelemetryAvgDurationMs: runtimeTelemetryOverview.avgDurationMs,
    runtimeTelemetryBudgetTokensEstimate: runtimeTelemetryOverview.totalBudgetTokensEstimate,
    runtimeTelemetryReportedTotalTokens: runtimeTelemetryOverview.reportedTotalTokens,
    runtimeTelemetryRetryCount: runtimeTelemetryOverview.retryCount,
    runtimeTelemetryTaskStats: runtimeTelemetryOverview.taskStats,
    agentRuntimeHealth,
    modelHealth,
    runtimeHealthSummary: {
      agentCount: Object.keys(agentRuntimeHealth || {}).length,
      noDataCount: Object.values(agentRuntimeHealth || {}).filter((item) => item.status === 'NO_DATA').length,
      watchCount: Object.values(agentRuntimeHealth || {}).filter((item) => item.status === 'watch').length,
      degradedCount: Object.values(agentRuntimeHealth || {}).filter((item) => item.status === 'degraded').length,
      blockedCount: Object.values(agentRuntimeHealth || {}).filter((item) => item.status === 'blocked').length,
    },
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
