const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const { runHackathonAssistant } = require('../src/services/hackathonAssistantService');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const openMemoryDb = () => open({
  filename: ':memory:',
  driver: sqlite3.Database,
});

const setupSchema = async (db) => {
  await db.exec(`
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [
    'hackathon_title',
    'AI Full-stack Hackathon',
  ]);
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [
    'hackathon_location',
    'Room X1-112',
  ]);
};

const successRunner = async ({ task, messages }) => {
  assert(task === 'hackathon_ai_coach', 'Expected hackathon task.');
  const payload = JSON.parse(messages[1].content);
  assert(payload.contextCards.length > 0, 'Expected grounded context cards.');

  return {
    summary: 'You are a good fit if you keep the scope small and ship one complete AI assistant workflow.',
    intent: {
      primaryGoal: 'suitability',
      goals: ['suitability', 'tooling'],
      profileSignals: ['beginner_or_non_frontend', 'ai_tool_user'],
      confidence: 0.9,
    },
    recommendation: {
      track: 'Compact AI assistant tool',
      focus: 'Use Codex to build one complete workflow instead of a broad platform.',
      fitScore: 88,
      rationale: 'The user can use AI tools and worries about frontend, so a low-UI, high-AI-value tool is the safest path.',
      nextAction: 'Write one input/output example and build the shortest runnable demo.',
    },
    prepPlan: [
      { step: 1, title: 'Pick a scenario', detail: 'Choose one campus productivity problem.' },
      { step: 2, title: 'Build the main flow', detail: 'Complete input, AI processing, and result display.' },
      { step: 3, title: 'Add examples', detail: 'Prepare two demo inputs.' },
    ],
    strategy: {
      eventDay: 'Freeze scope in 45 minutes, build the flow, then polish demo data.',
      tooling: 'Use Codex for code scaffolding and debugging.',
      delivery: 'Ship a demo that opens and completes the core flow.',
    },
    risks: [
      { risk: 'Scope too large', mitigation: 'Keep one core action only.', severity: 'high' },
    ],
    sources: payload.contextCards.slice(0, 3).map((card) => ({ id: card.id })),
    suggestedQuestions: ['How should I split the 5 hours?'],
    confidence: 0.91,
    warnings: [],
  };
};

const main = async () => {
  const db = await openMemoryDb();
  try {
    await setupSchema(db);

    const result = await runHackathonAssistant({
      db,
      query: 'I cannot do frontend well but I can use Codex. Am I suitable?',
      modelRunner: successRunner,
    });

    assert(result.type === 'hackathon_coach', 'Expected hackathon coach response.');
    assert(result.modelStatus.used === true, 'Expected model to be marked as used.');
    assert(result.recommendation.track.includes('AI'), 'Expected AI-oriented recommendation.');
    assert(result.prepPlan.length >= 3, 'Expected concrete preparation plan.');
    assert(result.sources.length > 0, 'Expected grounded sources.');

    const fallback = await runHackathonAssistant({
      db,
      query: 'I know a little Python. What is the safest plan on event day?',
      modelRunner: async () => {
        const error = new Error('simulated model failure');
        error.code = 'AI_RUNTIME_EMPTY_CONTENT';
        throw error;
      },
    });

    assert(fallback.type === 'hackathon_coach', 'Expected fallback coach response.');
    assert(fallback.modelStatus.fallbackUsed === true, 'Expected fallback to be explicit.');
    assert(fallback.prepPlan.length >= 3, 'Expected fallback preparation plan.');
    assert(fallback.recommendation.track, 'Expected fallback track.');

    console.log('Hackathon AI assistant check passed.');
  } finally {
    await db.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
