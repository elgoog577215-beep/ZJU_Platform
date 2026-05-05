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
    tags: '\u670d\u52a1\u65f6',
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

  const before = await fetchEvents(db);
  const overview = await assistantService.getAssistantOverview(db);
  const scan = await assistantService.scanEventGovernance(db, {
    limit: 20,
    minConfidence: 0.45,
    userId: 1,
  });
  const afterScan = await fetchEvents(db);

  assert(overview.modules.length === 4, 'Overview should expose four assistant modules.');
  assert(overview.health.eventCount === 4, 'Overview should count seeded events.');
  assert(JSON.stringify(before) === JSON.stringify(afterScan), 'Scan must not mutate events.');
  assert(scan.summary.scannedEventCount === 4, 'Scan should read all seeded events.');
  assert(scan.summary.suggestionCount >= 7, 'Scan should find governance suggestions.');
  assert(scan.summary.highConfidenceCount >= 7, 'Seeded data should produce high confidence suggestions.');

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
  assert(afterApply[0].target_audience === '\u5168\u6821', 'All-school audience should be normalized.');
  assert(afterApply[1].category === 'volunteer', 'Volunteer event should be normalized.');
  assert(afterApply[1].target_audience === '\u672c\u79d1\u751f,\u7855\u58eb\u751f', 'Audience aliases should be normalized.');
  assert(afterApply[2].category === 'competition', 'Competition event should be normalized.');
  assert(afterApply[3].category === 'exchange', 'Canonical exchange category should stay stable.');

  const runs = await assistantService.getRecentRuns(db, 5);
  const stored = await assistantService.listRecentGovernanceSuggestions(db, 20);
  assert(runs.some((run) => run.action === 'scan'), 'Scan run should be recorded.');
  assert(runs.some((run) => run.action === 'apply'), 'Apply run should be recorded.');
  assert(stored.some((suggestion) => suggestion.status === 'applied'), 'Applied suggestions should be recorded.');

  await db.close();

  return {
    suggestionCount: scan.summary.suggestionCount,
    highConfidenceCount: scan.summary.highConfidenceCount,
    appliedCount: apply.appliedCount,
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
