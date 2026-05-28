const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const { ensureEventProfiles } = require('../src/services/eventAiProfileService');

const PROFILE_COUNT = 24;
const MODEL_DELAY_MS = 30;

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const createDb = async () => {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE event_ai_profiles (
      event_id INTEGER PRIMARY KEY,
      profile_version INTEGER DEFAULT 1,
      source_hash TEXT NOT NULL,
      profile_json TEXT NOT NULL,
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
  `);
  return db;
};

const createEvents = () => Array.from({ length: PROFILE_COUNT }, (_, index) => ({
  id: index + 1,
  title: `AI Opportunity ${index + 1}`,
  date: '2026-06-01T19:00',
  end_date: '2026-06-01T21:00',
  location: index % 2 === 0 ? 'Zijingang Innovation Space' : 'Yuquan Theater',
  category: index % 3 === 0 ? 'competition' : 'lecture',
  tags: 'AI,practice',
  description: 'Hands-on AI project practice with comprehensive score and portfolio value.',
  content: '<p>Build a demo, receive feedback, and prepare a project story.</p>',
  organizer: index % 2 === 0 ? 'College of Computer Science' : 'Innovation College',
  target_audience: 'All students',
  score: index % 2 === 0 ? 'Comprehensive score' : '',
  volunteer_time: '',
}));

const modelRunner = async ({ task, messages }) => {
  if (task !== 'event_profile') return {};
  const payload = JSON.parse(messages[1].content);
  await sleep(MODEL_DELAY_MS);
  return {
    summary: `${payload.event.title} profile`,
    category: payload.event.category || 'lecture',
    topics: ['AI', 'practice', 'demo'],
    campuses: payload.event.location.includes('Zijingang') ? ['Zijingang'] : ['Yuquan'],
    organizers: [payload.event.organizer].filter(Boolean),
    audiences: ['All students'],
    benefits: payload.event.score ? ['score', 'skill'] : ['skill'],
    time_preference_terms: ['evening'],
    confidence: 0.88,
    rationale: 'Benchmark profile.',
  };
};

const main = async () => {
  const db = await createDb();
  try {
    const startedAt = Date.now();
    const result = await ensureEventProfiles(db, createEvents(), {
      limit: PROFILE_COUNT,
      modelRunner,
      timeout: 5000,
    });
    const elapsedMs = Date.now() - startedAt;
    const expectedSerialMs = PROFILE_COUNT * MODEL_DELAY_MS;
    const maxExpectedConcurrentMs = 450;

    if (elapsedMs >= expectedSerialMs * 0.7) {
      throw new Error(`Event profile preparation is still near-serial: ${elapsedMs}ms for ${PROFILE_COUNT} profiles.`);
    }
    if (elapsedMs > maxExpectedConcurrentMs) {
      throw new Error(`Event profile preparation exceeded speed budget: ${elapsedMs}ms > ${maxExpectedConcurrentMs}ms.`);
    }
    if (result.stats.generated !== PROFILE_COUNT) {
      throw new Error(`Expected ${PROFILE_COUNT} generated profiles, got ${result.stats.generated}.`);
    }

    console.log(JSON.stringify({
      ok: true,
      profileCount: PROFILE_COUNT,
      modelDelayMs: MODEL_DELAY_MS,
      elapsedMs,
      expectedSerialMs,
      generated: result.stats.generated,
      cached: result.stats.cached,
    }, null, 2));
  } finally {
    await db.close();
  }
};

main().catch((error) => {
  console.error('Event profile speed benchmark failed:', error.message);
  process.exitCode = 1;
});
