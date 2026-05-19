const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const assistantService = require('../src/services/unifiedAiAssistantService');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const schemaSql = `
  CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT);
  CREATE TABLE ai_model_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    provider TEXT DEFAULT 'openai-compatible',
    base_url TEXT NOT NULL,
    model TEXT NOT NULL,
    encrypted_api_key TEXT NOT NULL,
    priority INTEGER DEFAULT 100,
    enabled INTEGER DEFAULT 1,
    last_status TEXT,
    last_error TEXT,
    last_checked_at DATETIME,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE assistant_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    memory_type TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'event_assistant',
    weight REAL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE event_recommendation_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    feedback TEXT NOT NULL,
    query TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE ai_assistant_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    requested_by INTEGER,
    summary_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE ai_event_governance_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    confidence REAL DEFAULT 0,
    reason TEXT,
    source TEXT,
    status TEXT DEFAULT 'suggested',
    applied_by INTEGER,
    applied_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    category TEXT,
    tags TEXT,
    description TEXT,
    content TEXT,
    organizer TEXT,
    location TEXT,
    target_audience TEXT,
    score TEXT,
    volunteer_time TEXT,
    status TEXT DEFAULT 'approved',
    deleted_at DATETIME
  );
  CREATE TABLE event_ai_profiles (
    event_id INTEGER PRIMARY KEY,
    profile_version INTEGER DEFAULT 1,
    source_hash TEXT,
    profile_json TEXT,
    summary TEXT,
    category TEXT,
    topic_terms TEXT,
    benefit_terms TEXT,
    campus_terms TEXT,
    audience_terms TEXT,
    organizer_terms TEXT,
    confidence REAL DEFAULT 0,
    status TEXT DEFAULT 'ready',
    last_error TEXT,
    model_name TEXT,
    model_provider TEXT,
    refreshed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

const sampleEvents = [
  {
    title: '\u5927\u6a21\u578b\u4e0e\u667a\u80fd\u4f53\u5e94\u7528\u8bb2\u5ea7',
    category: '',
    tags: '',
    description: '\u4eba\u5de5\u667a\u80fd\u3001\u5927\u6a21\u578b\u3001AI Agent \u5b9e\u6218\u5206\u4eab\uff0c\u9002\u5408\u5168\u6821\u5e08\u751f\u3002',
    content: '\u8bb2\u5ea7\u5305\u542b AIGC\u3001LLM \u4e0e\u79d1\u7814\u6848\u4f8b\u3002',
    organizer: '\u8ba1\u7b97\u673a\u5b66\u9662',
    location: '\u7d2b\u91d1\u6e2f',
    target_audience: '\u5168\u6821\u5e08\u751f',
  },
  {
    title: '\u6691\u671f\u652f\u6559\u5fd7\u613f\u8005\u62db\u52df',
    category: '\u516c\u76ca\u5b9e\u8df5',
    tags: 'volunteer',
    description: '\u62db\u52df\u652f\u6559\u5fd7\u613f\u8005\uff0c\u8ba4\u5b9a\u5fd7\u613f\u670d\u52a1\u65f6\u957f\u3002',
    content: '\u9762\u5411\u672c\u79d1\u751f\u3001\u7814\u7a76\u751f\u3002',
    organizer: '\u9752\u5e74\u5fd7\u613f\u8005\u534f\u4f1a',
    location: '\u7389\u6cc9',
    target_audience: '\u672c\u79d1,\u7855\u58eb',
    volunteer_time: '20\u5c0f\u65f6',
  },
  {
    title: '\u9ed1\u5ba2\u677e\u6311\u6218\u8d5b\u62a5\u540d',
    category: '\u7ade\u8d5b',
    tags: 'AI',
    description: '\u9762\u5411\u65b0\u751f\u7684 AI \u9ed1\u5ba2\u677e\u6bd4\u8d5b\uff0c\u53ef\u8ba1\u7efc\u6d4b\u3002',
    content: '\u56e2\u961f\u8def\u6f14\u3001\u6a21\u578b\u5e94\u7528\u3001\u4ea7\u54c1\u8bbe\u8ba1\u3002',
    organizer: '\u521b\u65b0\u521b\u4e1a\u5b66\u9662',
    location: '\u7d2b\u91d1\u6e2f',
    target_audience: '\u65b0\u751f',
    score: '\u7efc\u6d4b\u52a0\u5206',
  },
  {
    title: '\u6821\u53cb\u4f01\u4e1a\u4ea4\u6d41\u5f00\u653e\u65e5',
    category: 'exchange',
    tags: '',
    description: '\u6821\u53cb\u4f01\u4e1a\u4ea4\u6d41\uff0c\u4e86\u89e3\u884c\u4e1a\u5c97\u4f4d\u4e0e\u804c\u4e1a\u53d1\u5c55\u3002',
    content: '\u542b\u7b80\u5386\u4ea4\u6d41\u548c\u4f01\u4e1a\u53c2\u8bbf\u3002',
    organizer: '\u5c31\u4e1a\u6307\u5bfc\u4e2d\u5fc3',
    location: '\u7ebf\u4e0a',
    target_audience: '\u5168\u6821',
  },
  {
    title: '\u672a\u6765\u79d1\u6280\u4e0e\u6821\u56ed\u751f\u6d3b\u5206\u4eab\u4f1a',
    category: '',
    tags: '',
    description: '\u56f4\u7ed5\u672a\u6765\u5b66\u4e60\u3001\u6821\u56ed\u5de5\u5177\u548c AI \u521b\u610f\u8fdb\u884c\u4ea4\u6d41\u5206\u4eab\u3002',
    content: '\u542b\u5c0f\u7ec4\u8ba8\u8bba\u548c\u7ecf\u9a8c\u5206\u4eab\uff0c\u4e0d\u6d89\u53ca\u6bd4\u8d5b\u6216\u5fd7\u613f\u670d\u52a1\u3002',
    organizer: '\u5b66\u751f\u793e\u56e2',
    location: '\u7d2b\u91d1\u6e2f',
    target_audience: '\u5168\u6821\u5e08\u751f',
  },
];

const createDb = async () => {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec(schemaSql);
  return db;
};

const seedEvents = async (db, events = sampleEvents) => {
  for (const event of events) {
    await db.run(
      `
        INSERT INTO events (
          title, category, tags, description, content, organizer,
          location, target_audience, score, volunteer_time, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
      `,
      [
        event.title,
        event.category || '',
        event.tags || '',
        event.description || '',
        event.content || '',
        event.organizer || '',
        event.location || '',
        event.target_audience || '',
        event.score || '',
        event.volunteer_time || '',
      ]
    );
  }
};

const fetchEvents = (db) =>
  db.all('SELECT id, title, category, tags, target_audience FROM events ORDER BY id ASC');

const runMainFlowCheck = async () => {
  const db = await createDb();
  await seedEvents(db);
  let governanceReviewCalls = 0;
  const governanceReviewRunner = async ({ task, messages }) => {
    if (task !== 'event_governance_review') {
      throw new Error(`Unexpected governance task: ${task}`);
    }
    governanceReviewCalls += 1;
    const payload = JSON.parse(messages[1].content);
    assert(payload.candidates.length > 0, 'Expected model review candidates.');
    return {
      reviews: payload.candidates.map((candidate) => {
        const isAmbiguousFutureShare = candidate.event.title.includes('\u672a\u6765\u79d1\u6280');
        return {
          eventId: candidate.event.id,
          field: candidate.ruleSuggestion.field,
          accepted: true,
          suggestedValue: isAmbiguousFutureShare ? 'other' : candidate.ruleSuggestion.suggestedValue,
          confidence: isAmbiguousFutureShare ? 0.82 : 0.84,
          reason: isAmbiguousFutureShare
            ? 'The evidence is a broad sharing session without a strong standard category signal, so keep it conservative.'
            : 'Model review confirms this category from the event evidence and standard catalog.',
        };
      }),
      memorySignals: [
        {
          pattern: 'AI lecture content with LLM and research sharing is usually lecture.',
          weight: 0.8,
        },
      ],
      warnings: [],
    };
  };

  const before = await fetchEvents(db);
  const overview = await assistantService.getAssistantOverview(db);
  const scan = await assistantService.scanEventGovernance(db, {
    limit: 20,
    minConfidence: 0.45,
    userId: 1,
    modelRunner: governanceReviewRunner,
  });
  const afterScan = await fetchEvents(db);

  const moduleIds = new Set((overview.modules || []).map((module) => module.id));
  [
    'event_recommendation',
    'hackathon_coach',
    'wechat_event_parser',
    'event_governance',
    'model_config_runtime',
    'event_profile_index',
  ].forEach((id) => {
    assert(moduleIds.has(id), `Overview should expose registered AI agent module: ${id}`);
  });
  assert(overview.agentSystem?.summary?.agentCount === 6, 'Overview should expose agent system summary.');
  assert(
    overview.agentSystem.summary.averageMaturity > 0.7,
    'Agent system maturity should stay above the first rollout floor.'
  );
  assert(overview.health.eventCount === 5, 'Overview should count seeded events.');
  assert(overview.health.eventAiProfileCount === 0, 'Overview should expose event AI profile coverage.');
  assert(JSON.stringify(before) === JSON.stringify(afterScan), 'Scan must not mutate events.');
  assert(scan.summary.scannedEventCount === 5, 'Scan should read all seeded events.');
  assert(scan.summary.suggestionCount >= 3, 'Scan should find governance suggestions.');
  assert(scan.summary.highConfidenceCount >= 3, 'Seeded data should produce high confidence suggestions.');
  assert(governanceReviewCalls === 1, 'Governance scan should invoke model review for ambiguous candidates.');
  assert(scan.modelStatus?.used === true, 'Governance scan should expose model review status.');
  assert(
    scan.summary.modelReview.runtimeTelemetry.taskCount === 1,
    'Governance scan should expose model runtime telemetry.'
  );
  assert(
    scan.summary.modelReview.runtimeTelemetry.totalBudgetTokensEstimate > 0,
    'Governance runtime telemetry should include token budget estimates.'
  );
  assert(scan.memorySignals.length === 1, 'Governance scan should expose model memory signals.');
  assert(
    scan.suggestions.some((suggestion) => suggestion.source.includes('model_review')),
    'Expected at least one governance suggestion to be model-reviewed.'
  );

  const selectedIds = scan.suggestions
    .filter((suggestion) => suggestion.confidence >= 0.72)
    .map((suggestion) => suggestion.suggestionId);
  const apply = await assistantService.applyEventGovernanceSuggestions(
    db,
    { runId: scan.runId, suggestionIds: selectedIds, minConfidence: 0.72 },
    1
  );
  const afterApply = await fetchEvents(db);

  assert(apply.appliedCount === selectedIds.length, 'All selected suggestions should apply.');
  assert(apply.skippedCount === 0, 'Main flow should not skip suggestions.');
  assert(afterApply[0].category === 'lecture', 'Lecture event should be normalized.');
  assert(afterApply[1].category === 'volunteer', 'Volunteer event should be normalized.');
  assert(afterApply[2].category === 'competition', 'Competition event should be normalized.');
  assert(afterApply[3].category === 'exchange', 'Canonical exchange category should stay stable.');
  assert(afterApply[4].category === 'other', 'Model-reviewed ambiguous event should be normalized conservatively.');

  const runs = await assistantService.getRecentRuns(db, 5);
  const stored = await assistantService.listRecentGovernanceSuggestions(db, 20);
  const memory = await assistantService.summarizeGovernanceMemory(db);
  assert(runs.some((run) => run.action === 'scan'), 'Scan run should be recorded.');
  assert(runs.some((run) => run.action === 'apply'), 'Apply run should be recorded.');
  assert(stored.some((suggestion) => suggestion.status === 'applied'), 'Applied suggestions should be recorded.');
  assert(memory.decisionCount >= 1, 'Applied admin decisions should be available as governance memory.');

  await db.close();

  return {
    suggestionCount: scan.summary.suggestionCount,
    highConfidenceCount: scan.summary.highConfidenceCount,
    appliedCount: apply.appliedCount,
    governanceReviewCalls,
    governanceMemoryCount: memory.decisionCount,
    finalEvents: afterApply.map((event) => ({
      id: event.id,
      category: event.category,
      tags: event.tags,
      audience: event.target_audience,
    })),
  };
};

const runConflictCheck = async () => {
  const db = await createDb();
  await seedEvents(db, [sampleEvents[0]]);

  const scan = await assistantService.scanEventGovernance(db, {
    limit: 5,
    minConfidence: 0.45,
    userId: 1,
  });
  const categorySuggestion = scan.suggestions.find((suggestion) => suggestion.field === 'category');
  assert(categorySuggestion, 'Conflict check requires a category suggestion.');

  await db.run('UPDATE events SET category = ? WHERE id = ?', ['manual_review', 1]);

  const apply = await assistantService.applyEventGovernanceSuggestions(
    db,
    {
      runId: scan.runId,
      suggestionIds: [categorySuggestion.suggestionId],
      minConfidence: 0.72,
    },
    1
  );
  const finalEvent = await db.get('SELECT id, category FROM events WHERE id = 1');

  assert(apply.appliedCount === 0, 'Conflict suggestion must not apply.');
  assert(apply.skippedCount === 1, 'Conflict suggestion should be skipped.');
  assert(apply.details[0]?.status === 'skipped_conflict', 'Conflict status should be explicit.');
  assert(finalEvent.category === 'manual_review', 'Conflict apply must not overwrite current value.');

  await db.close();

  return {
    requestedSuggestionId: categorySuggestion.suggestionId,
    skippedCount: apply.skippedCount,
    finalCategory: finalEvent.category,
  };
};

const main = async () => {
  const mainFlow = await runMainFlowCheck();
  const conflict = await runConflictCheck();

  console.log(JSON.stringify({
    ok: true,
    mainFlow,
    conflict,
  }, null, 2));
};

main().catch((error) => {
  console.error('Unified AI assistant check failed:', error.message);
  process.exitCode = 1;
});
