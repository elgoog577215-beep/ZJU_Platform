const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const { runEventAssistantTurn } = require('../src/utils/eventAssistant');
const { runHackathonAssistant } = require('../src/services/hackathonAssistantService');
const { parseWithLLM } = require('../src/utils/wechat');
const assistantService = require('../src/services/unifiedAiAssistantService');
const eventRecommendationEvidenceService = require('../src/services/eventRecommendationEvidenceService');
const { EVENT_CATEGORIES } = require('../src/services/eventIntelligenceService');
const { pool } = require('../src/config/db');

const STANDARD_CATEGORIES = new Set(EVENT_CATEGORIES.map((item) => item.value));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const daysFromNow = (days, hour) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`;
};

const setupSchema = async (db) => {
  await db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      nickname TEXT,
      organization TEXT,
      organization_cr TEXT,
      gender TEXT,
      age INTEGER
    );
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE user_event_preferences (
      user_id INTEGER PRIMARY KEY,
      college TEXT,
      grade TEXT,
      campus TEXT,
      interest_tags TEXT,
      preferred_categories TEXT,
      preferred_benefits TEXT,
      preferred_format TEXT
    );
    CREATE TABLE assistant_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      memory_type TEXT,
      content TEXT,
      source TEXT,
      weight REAL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      item_id INTEGER,
      item_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE event_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      event_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE event_recommendation_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      event_id INTEGER,
      feedback TEXT,
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
      date TEXT,
      end_date TEXT,
      location TEXT,
      image TEXT,
      description TEXT,
      content TEXT,
      score TEXT,
      target_audience TEXT,
      organizer TEXT,
      volunteer_time TEXT,
      status TEXT DEFAULT 'approved',
      deleted_at DATETIME,
      category TEXT,
      tags TEXT,
      views INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0
    );
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
};

const seedData = async (db) => {
  await db.run('INSERT INTO users (id, username, nickname, organization, age) VALUES (1, ?, ?, ?, ?)', [
    'golden_user',
    'Golden User',
    'College of Computer Science',
    20,
  ]);
  await db.run(
    'INSERT INTO user_event_preferences (user_id, college, grade, campus, interest_tags, preferred_categories, preferred_benefits, preferred_format) VALUES (1, ?, ?, ?, ?, ?, ?, ?)',
    ['College of Computer Science', 'Year 2', 'Zijingang', 'AI,product,volunteer', 'competition,lecture,volunteer', 'score,volunteer_time', 'offline']
  );
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['hackathon_title', 'AI Full-stack Hackathon']);
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['hackathon_duration', '5 hours']);
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['hackathon_location', 'Zijingang X1-112']);

  const events = [
    {
      title: 'AI Agent Product Workshop',
      date: daysFromNow(2, 19),
      endDate: daysFromNow(2, 21),
      location: 'Zijingang Innovation Space',
      description: 'Hands-on AI agent product workshop for students who want to build a project demo. Comprehensive score is available.',
      content: '<p>Includes LLM, agent workflow, demo polishing and project review.</p>',
      score: 'Comprehensive score 0.5',
      audience: 'All students',
      organizer: 'College of Computer Science',
      volunteerTime: '',
      category: 'lecture',
      tags: 'AI,Agent',
    },
    {
      title: 'AI Hackathon Challenge Briefing',
      date: daysFromNow(3, 14),
      endDate: daysFromNow(3, 16),
      location: 'Zijingang Conference Center',
      description: 'AI hackathon competition briefing with team demo, pitch and score policy.',
      content: '<p>Product design, model application and final pitch.</p>',
      score: 'Comprehensive score',
      audience: 'Freshmen',
      organizer: 'Innovation College',
      volunteerTime: '',
      category: 'competition',
      tags: 'AI,hackathon',
    },
    {
      title: 'Volunteer Service Orientation',
      date: daysFromNow(4, 10),
      endDate: daysFromNow(4, 11),
      location: 'Zijingang Student Center',
      description: 'Public service orientation with volunteer hour recognition.',
      content: '<p>Suitable for students interested in long-term public service.</p>',
      score: '',
      audience: 'Undergraduates',
      organizer: 'Youth Volunteer Association',
      volunteerTime: '2 hours',
      category: 'volunteer',
      tags: 'volunteer',
    },
    {
      title: 'Classical Music Sharing Session',
      date: daysFromNow(5, 15),
      endDate: daysFromNow(5, 17),
      location: 'Yuquan Theater',
      description: 'Music appreciation and social exchange.',
      content: '<p>No AI, competition, score, or volunteer benefit.</p>',
      score: '',
      audience: 'All students',
      organizer: 'Art Club',
      volunteerTime: '',
      category: 'culture_sports',
      tags: 'music',
    },
    {
      title: 'Future Campus Life Sharing',
      date: daysFromNow(6, 15),
      endDate: daysFromNow(6, 17),
      location: 'Zijingang',
      description: 'Broad sharing about study tools, campus life and future learning.',
      content: '<p>No competition or volunteer service evidence.</p>',
      score: '',
      audience: 'All students',
      organizer: 'Student Club',
      volunteerTime: '',
      category: '',
      tags: '',
    },
    {
      title: 'AI Startup Challenge Roadshow',
      date: daysFromNow(7, 18),
      endDate: daysFromNow(7, 20),
      location: 'Zijingang',
      description: 'Student teams join an AI startup competition roadshow with final pitch and score recognition.',
      content: '<p>Competition, demo, pitch and awards review.</p>',
      score: 'Comprehensive score',
      audience: 'All students',
      organizer: 'Innovation College',
      volunteerTime: '',
      category: '',
      tags: '',
    },
  ];

  for (const event of events) {
    await db.run(
      `
        INSERT INTO events (
          title, date, end_date, location, image, description, content, score,
          target_audience, organizer, volunteer_time, status, deleted_at,
          category, tags, views, featured, likes
        ) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, 'approved', NULL, ?, ?, 0, 0, 0)
      `,
      [
        event.title,
        event.date,
        event.endDate,
        event.location,
        event.description,
        event.content,
        event.score,
        event.audience,
        event.organizer,
        event.volunteerTime,
        event.category,
        event.tags,
      ]
    );
  }
};

const createDb = async () => {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await setupSchema(db);
  await seedData(db);
  return db;
};

const extractPayload = (messages) => JSON.parse(messages[1].content);

const goldenModelRunner = async ({ task, messages }) => {
  const systemText = messages.map((message) => String(message.content || '')).join('\n');
  assert(
    systemText.includes('Quality requirements for every AI assistant task'),
    `Missing shared quality instruction for ${task}.`
  );

  if (task === 'event_recommendation_intent') {
    return {
      query_summary: 'User wants a Zijingang AI event with comprehensive score and practical project value.',
      topics: ['AI', 'agent', 'product demo'],
      campuses: ['Zijingang'],
      organizers: ['College of Computer Science'],
      audiences: ['All students'],
      benefits: ['score', 'skill'],
      categories: ['competition', 'lecture'],
      date_constraints: ['this_week'],
      format: 'offline',
      allow_historical: false,
      needs_clarification: false,
      clarification_question: '',
      confidence: 0.95,
    };
  }

  if (task === 'event_profile') {
    const payload = extractPayload(messages);
    const event = payload.event || {};
    const text = `${event.title || ''} ${event.description || ''} ${event.content || ''}`;
    const isHackathon = /hackathon|challenge|competition|pitch/i.test(text);
    const isAi = /AI|agent|LLM|demo/i.test(text);
    const isVolunteer = /volunteer|public service|hour/i.test(text);
    const isMusic = /music|art/i.test(text);
    return {
      summary: isHackathon
        ? 'AI hackathon competition with pitch, demo and score value.'
        : isAi
          ? 'Practical AI agent workshop for project demo builders.'
          : isVolunteer
            ? 'Volunteer service orientation with recognized service hours.'
            : 'Campus sharing event with broad participation value.',
      category: isHackathon ? 'competition' : isAi ? 'lecture' : isVolunteer ? 'volunteer' : isMusic ? 'culture_sports' : 'other',
      topics: isAi ? ['AI', 'agent', 'demo'] : [event.title || 'campus event'],
      campuses: String(event.location || '').includes('Zijingang') ? ['Zijingang'] : [],
      organizers: event.organizer ? [event.organizer] : [],
      audiences: event.target_audience ? [event.target_audience] : [],
      benefits: [
        String(event.score || '').toLowerCase().includes('score') ? 'score' : '',
        isVolunteer ? 'volunteer_time' : '',
        isAi ? 'skill' : '',
      ].filter(Boolean),
      time_preference_terms: [],
      confidence: isAi || isVolunteer ? 0.92 : 0.72,
      rationale: 'Profile is extracted from title, description, location, organizer and benefit fields.',
    };
  }

  if (task === 'event_recommendation_rerank') {
    const payload = extractPayload(messages);
    const candidates = payload.candidates || [];
    assert(
      candidates.some((candidate) => candidate.actionEvidence && typeof candidate.actionEvidence.positiveCategoryWeight === 'number'),
      'Rerank prompt should include action evidence telemetry for candidate personalization.'
    );
    const scored = candidates.map((candidate) => {
      const text = `${candidate.title || ''} ${candidate.description || ''} ${candidate.score || ''}`;
      const isHackathon = /hackathon|challenge|competition/i.test(text);
      const isWorkshop = /AI Agent|workshop|agent/i.test(text);
      const hasScore = /score/i.test(text);
      const isZijingang = /Zijingang/i.test(candidate.location || '');
      const actionEvidence = candidate.actionEvidence || {};
      return {
        candidate,
        score: (isHackathon ? 10 : 0)
          + (isWorkshop ? 8 : 0)
          + (hasScore ? 4 : 0)
          + (isZijingang ? 3 : 0)
          + Number(actionEvidence.positiveCategoryWeight || 0)
          + (actionEvidence.priorPositiveAction ? 12 : 0)
          - Number(actionEvidence.negativeCategoryWeight || 0)
          - (actionEvidence.priorNegativeFeedback ? 30 : 0),
      };
    }).sort((left, right) => right.score - left.score || Number(left.candidate.id) - Number(right.candidate.id));

    return {
      summary: 'Ranked by AI topic fit, practical project value, Zijingang offline access, and score benefit.',
      recommendations: scored.slice(0, 3).map(({ candidate }, index) => ({
        id: candidate.id,
        rank: index + 1,
        confidence: index === 0 ? 0.95 : 0.84 - index * 0.06,
        reason: `${candidate.title} matches the AI/project intent and is grounded in the provided event fields.`,
        matched_signals: [
          /AI|hackathon|agent/i.test(`${candidate.title} ${candidate.description}`) ? 'AI topic' : 'partial topic fit',
          /Zijingang/i.test(candidate.location || '') ? 'Zijingang' : 'location is less direct',
          /score/i.test(candidate.score || candidate.description || '') ? 'score benefit' : 'no explicit score',
        ],
      })),
    };
  }

  if (task === 'hackathon_ai_coach') {
    const payload = extractPayload(messages);
    assert(payload.contextCards.length > 0, 'Hackathon golden sample should pass context cards.');
    return {
      summary: 'You should aim for one narrow AI workflow that can run end to end in the room, not a broad platform.',
      intent: {
        primaryGoal: 'preparation',
        goals: ['preparation', 'tooling', 'deliverable'],
        profileSignals: ['ai_tool_user', 'beginner_or_non_frontend'],
        confidence: 0.9,
      },
      recommendation: {
        track: 'Compact AI assistant demo',
        focus: 'One input, one model-assisted analysis step, and one useful result screen.',
        fitScore: 88,
        rationale: 'The user has AI-tool ability but worries about frontend stability, so a small workflow has the best completion odds.',
        nextAction: 'Write one user story and prepare two demo inputs before building.',
      },
      prepPlan: [
        { step: 1, title: 'Freeze scope', detail: 'Pick one user, one input and one output before touching UI.' },
        { step: 2, title: 'Build main path', detail: 'Make the input, AI call, validation and result display work first.' },
        { step: 3, title: 'Prepare demo data', detail: 'Use two stable sample inputs so the final presentation does not depend on luck.' },
      ],
      strategy: {
        eventDay: 'Spend 45 minutes on scope, 3 hours on the main path, and the rest on fallback and demo polish.',
        tooling: 'Use AI tools for scaffolding, debugging and concise copy, but keep product judgment manual.',
        delivery: 'Show a working loop and explain what the model contributes.',
      },
      risks: [
        { risk: 'Scope too large', mitigation: 'Cut every feature except the main AI loop.', severity: 'high' },
        { risk: 'Unstable model output', mitigation: 'Validate JSON and keep fixed demo examples.', severity: 'medium' },
      ],
      sources: payload.contextCards.slice(0, 3).map((card) => ({ id: card.id })),
      suggestedQuestions: ['How should I split the 5 hours?', 'What is the smallest impressive demo?'],
      confidence: 0.91,
      warnings: [],
    };
  }

  if (task === 'wechat_event_parse') {
    return {
      title: 'AI Hackathon Challenge Registration',
      description: 'AI hackathon competition for all students with demo, pitch and comprehensive score.',
      content: '<h3>Event Introduction</h3><p>Participants build an AI demo and present the result.</p>',
      date_reasoning: 'The article explicitly says May 20, 19:00-21:00; use the current academic year.',
      date: '2026-05-20T19:00',
      end_date: '2026-05-20T21:00',
      time: '19:00-21:00',
      location: 'Zijingang Innovation Space',
      organizer: 'College of Computer Science',
      category: 'competition',
      category_confidence: 0.93,
      category_reason: 'The article mentions hackathon, challenge, demo and pitch.',
      target_audience: 'All students',
      volunteer_time: null,
      score: 'Comprehensive score 0.5',
      tags: ['AI', 'hackathon'],
    };
  }

  if (task === 'event_governance_review') {
    const payload = extractPayload(messages);
    return {
      reviews: (payload.candidates || []).map((candidate) => {
        const title = String(candidate.event.title || '');
        const isAmbiguous = title.includes('Future Campus Life');
        return {
          eventId: candidate.event.id,
          field: candidate.ruleSuggestion.field,
          accepted: !isAmbiguous,
          suggestedValue: isAmbiguous ? 'other' : candidate.ruleSuggestion.suggestedValue,
          confidence: isAmbiguous ? 0.35 : 0.86,
          reason: isAmbiguous
            ? 'The evidence is broad and should remain conservative.'
            : 'The standard category is supported by the title and description.',
        };
      }),
      memorySignals: [
        { pattern: 'Hackathon and pitch evidence should remain competition.', weight: 0.8 },
      ],
      warnings: [],
    };
  }

  throw new Error(`Unexpected golden task: ${task}`);
};

const assertUsefulText = (value, label, minLength = 20) => {
  assert(typeof value === 'string' && value.trim().length >= minLength, `${label} should be useful text.`);
};

const assertNoInventedIds = (recommendations) => {
  for (const item of recommendations) {
    assert(Number.isInteger(Number(item.id)), 'Recommendation should use a numeric provided event id.');
    assert(item.event?.id === item.id, 'Recommendation event id should match the selected candidate.');
  }
};

const evaluateEventRecommendation = async (db) => {
  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: 'Find me a Zijingang AI activity this week. I want a practical project and comprehensive score.',
    rememberPreference: true,
    allowHistoricalFallback: false,
    modelRunner: goldenModelRunner,
    now: new Date(),
  });

  assert(result.type === 'recommend', 'Event recommendation should return recommend.');
  assert(result.recommendations.length >= 2, 'Recommendation should return ranked alternatives.');
  assertNoInventedIds(result.recommendations);
  assert(/AI|Hackathon|Agent/i.test(result.recommendations[0].event.title), 'Top event should match AI intent.');
  assert(result.recommendations[0].confidence >= 0.85, 'Top event should have strong confidence.');
  assert(result.recommendations[0].matchSignals.length >= 2, 'Top event should expose matched signals.');
  assertUsefulText(result.recommendations[0].reason, 'Top recommendation reason');
  assert(result.modelStatus.tasks.includes('event_recommendation_rerank'), 'Recommendation should use rerank task.');
  assert(result.modelStatus.profileStats.generated >= 1, 'Recommendation should use event profile generation.');
  assert(result.remembered === true, 'Recommendation should persist opt-in preference memory.');

  const run = await db.get(
    "SELECT summary_json FROM ai_assistant_runs WHERE module = 'event_recommendation' ORDER BY id DESC"
  );
  const runSummary = JSON.parse(run.summary_json || '{}');
  assert(Array.isArray(runSummary.recommendedEventIds) && runSummary.recommendedEventIds.length >= 1, 'Recommendation run should store bounded event evidence anchors.');
  assert(runSummary.averageConfidence >= 0.7, 'Recommendation run should store average confidence.');
  assert(!run.summary_json.includes('Find me a Zijingang AI activity'), 'Recommendation run should avoid raw query text.');

  return {
    topEvent: result.recommendations[0].event.title,
    recommendationCount: result.recommendations.length,
    topConfidence: result.recommendations[0].confidence,
  };
};

const evaluateRecommendationActionEvidence = async (db) => {
  await db.run(
    'INSERT INTO favorites (user_id, item_id, item_type) VALUES (?, ?, ?)',
    [1, 2, 'event']
  );
  await db.run(
    'INSERT INTO event_registrations (user_id, event_id) VALUES (?, ?)',
    [1, 2]
  );
  await db.run(
    'INSERT INTO event_recommendation_feedback (user_id, event_id, feedback, query, reason) VALUES (?, ?, ?, ?, ?)',
    [1, 2, 'up', 'redacted golden query', 'AI topic fit']
  );

  const evidence = await eventRecommendationEvidenceService.getRecommendationActionEvidence(db);
  assert(['OBSERVED', 'PARTIALLY_OBSERVED'].includes(evidence.status), 'Recommendation evidence should observe positive action.');
  assert(evidence.observedActions >= 1, 'Recommendation evidence should count observed actions.');
  assert(evidence.actionRate > 0, 'Recommendation evidence should expose action rate.');
  assertUsefulText(evidence.nextAdjustment, 'Recommendation evidence next adjustment', 20);

  return {
    status: evidence.status,
    actionRate: evidence.actionRate,
    observedActions: evidence.observedActions,
  };
};

const evaluateRecommendationActionEvidenceRanking = async (db) => {
  await db.run(
    'INSERT INTO event_recommendation_feedback (user_id, event_id, feedback, query, reason) VALUES (?, ?, ?, ?, ?)',
    [1, 2, 'down', 'redacted golden query', 'too competition-heavy']
  );
  await db.run(
    'INSERT INTO event_registrations (user_id, event_id) VALUES (?, ?)',
    [1, 1]
  );
  await db.run(
    'INSERT INTO favorites (user_id, item_id, item_type) VALUES (?, ?, ?)',
    [1, 1, 'event']
  );

  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: 'Find me a Zijingang AI activity this week. I want a practical project and comprehensive score.',
    rememberPreference: false,
    allowHistoricalFallback: false,
    modelRunner: goldenModelRunner,
    now: new Date(),
  });

  assert(result.type === 'recommend', 'Action evidence ranking should still return recommendations.');
  assert(result.recommendations[0].event.id === 1, 'Positive action evidence should lift the matching AI workshop above a downvoted competition.');
  assert(
    result.recommendations[0].matchSignals.some((signal) => signal.includes('行动证据')),
    'Top recommendation should expose action-evidence personalization signal.'
  );

  return {
    topEvent: result.recommendations[0].event.title,
    topSignals: result.recommendations[0].matchSignals,
  };
};

const evaluateEventRecommendationFallbackPerformance = async (db) => {
  await db.run('DELETE FROM event_ai_profiles');
  const failingIntentRunner = async ({ task, messages }) => {
    if (task === 'event_recommendation_intent') {
      throw new Error('Simulated intent model timeout.');
    }
    return goldenModelRunner({ task, messages });
  };

  const before = await db.get('SELECT COUNT(*) AS count FROM event_ai_profiles');
  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: 'Find a Zijingang AI hackathon for all students with comprehensive score.',
    rememberPreference: false,
    allowHistoricalFallback: false,
    modelRunner: failingIntentRunner,
    now: new Date(),
  });
  const after = await db.get('SELECT COUNT(*) AS count FROM event_ai_profiles');

  assert(result.type === 'recommend', 'Fallback recommendation should still return recommend.');
  assert(result.recommendations.length >= 1, 'Fallback recommendation should keep useful candidates.');
  assert(/AI|Hackathon|Agent/i.test(result.recommendations[0].event.title), 'Fallback top event should preserve AI intent.');
  assert(result.modelStatus.fallbackUsed === true, 'Fallback recommendation should expose model fallback status.');
  assert(result.modelStatus.profileStats.transient >= 1, 'Fallback recommendation should use transient request profiles.');
  assert(after.count === before.count, 'Transient request profiles should not be written into the profile index.');
  assertNoInventedIds(result.recommendations);

  return {
    topEvent: result.recommendations[0].event.title,
    recommendationCount: result.recommendations.length,
    transientProfiles: result.modelStatus.profileStats.transient,
    persistedProfileDelta: after.count - before.count,
  };
};

const evaluateHackathonCoach = async (db) => {
  const result = await runHackathonAssistant({
    db,
    userId: 1,
    query: 'I can use AI tools but my frontend is weak. How do I ship something reliable in five hours?',
    participantProfile: { skills: ['AI tools', 'Python'], concerns: ['frontend stability', 'time limit'] },
    modelRunner: goldenModelRunner,
  });

  assert(result.type === 'hackathon_coach', 'Hackathon coach should return its contract.');
  assertUsefulText(result.summary, 'Hackathon summary');
  assert(result.recommendation.fitScore >= 80, 'Hackathon fit score should be actionable.');
  assertUsefulText(result.recommendation.nextAction, 'Hackathon next action', 15);
  assert(result.prepPlan.length >= 3, 'Hackathon coach should include a three-step plan.');
  assert(result.risks.some((risk) => risk.severity === 'high'), 'Hackathon coach should identify high risk.');
  assert(result.sources.length > 0, 'Hackathon coach should cite context cards.');
  assert(result.modelStatus.tasks.includes('hackathon_ai_coach'), 'Hackathon coach should expose model task.');

  return {
    track: result.recommendation.track,
    fitScore: result.recommendation.fitScore,
    planSteps: result.prepPlan.length,
  };
};

const evaluateWechatParser = async (db) => {
  const parsed = await parseWithLLM({
    title: 'AI Hackathon Challenge Registration',
    author: 'College of Computer Science',
    content: 'May 20, 19:00-21:00, Zijingang Innovation Space. AI hackathon challenge, demo pitch, comprehensive score 0.5, open to all students.',
    coverImage: '',
  }, {
    db,
    modelRunner: goldenModelRunner,
  });

  assert(parsed.title.includes('AI'), 'WeChat parser should keep title signal.');
  assert(parsed.category === 'competition', 'WeChat parser should normalize to competition.');
  assert(STANDARD_CATEGORIES.has(parsed.category), 'WeChat parser should use standard category.');
  assert(parsed.category_confidence >= 0.7, 'WeChat parser should expose useful confidence.');
  assertUsefulText(parsed.category_reason, 'WeChat category reason', 12);
  assert(parsed.date === '2026-05-20T19:00', 'WeChat parser should preserve specific date.');
  assert(parsed.target_audience === '全校', 'WeChat parser should normalize English audience to the standard catalog.');
  assert(parsed.tags.length === 0, 'WeChat parser should retire generated tags.');
  assert(parsed.aiMeta.runtimeTelemetry.taskCount === 1, 'WeChat parser should expose runtime telemetry.');

  return {
    title: parsed.title,
    category: parsed.category,
    confidence: parsed.category_confidence,
  };
};

const evaluateGovernance = async (db) => {
  const scan = await assistantService.scanEventGovernance(db, {
    limit: 20,
    minConfidence: 0.45,
    userId: 1,
    modelRunner: goldenModelRunner,
  });

  assert(scan.summary.scannedEventCount >= 5, 'Governance should scan seeded events.');
  assert(scan.summary.modelReview.used === true, 'Governance should use model review on ambiguous candidates.');
  assert(scan.summary.modelReview.runtimeTelemetry.taskCount === 1, 'Governance should expose model telemetry.');
  assert(scan.summary.suggestionCount >= 1, 'Governance should keep clearly supported suggestions.');
  assert(
    scan.suggestions.some((item) => item.field === 'category' && item.suggestedValue === 'competition' && item.confidence >= 0.72),
    'Governance should accept clearly supported competition suggestions.'
  );
  assert(scan.suggestions.every((item) => ['category', 'target_audience'].includes(item.field)), 'Governance should only use whitelisted fields.');
  assert(scan.suggestions.every((item) => item.field !== 'category' || STANDARD_CATEGORIES.has(item.suggestedValue)), 'Governance category suggestions should be standard values.');
  assert(
    scan.suggestions.every((item) => !String(item.source).includes('model_rejected') || item.confidence < 0.45),
    'Rejected governance suggestions should be downgraded below apply threshold.'
  );

  return {
    suggestionCount: scan.summary.suggestionCount,
    reviewedCandidateCount: scan.summary.modelReview.reviewedCandidateCount,
    highConfidenceCount: scan.summary.highConfidenceCount,
  };
};

const main = async () => {
  const db = await createDb();
  try {
    const eventRecommendation = await evaluateEventRecommendation(db);
    const recommendationActionEvidence = await evaluateRecommendationActionEvidence(db);
    const recommendationActionEvidenceRanking = await evaluateRecommendationActionEvidenceRanking(db);
    const eventRecommendationFallbackPerformance = await evaluateEventRecommendationFallbackPerformance(db);
    const hackathonCoach = await evaluateHackathonCoach(db);
    const wechatParser = await evaluateWechatParser(db);
    const eventGovernance = await evaluateGovernance(db);

    const runs = await db.all('SELECT module, action, summary_json FROM ai_assistant_runs ORDER BY id ASC');
    const persisted = JSON.stringify(runs);
    assert(!persisted.includes('Find me a Zijingang AI activity'), 'Golden summaries should not store raw recommendation query.');
    assert(!persisted.includes('May 20, 19:00-21:00'), 'Golden summaries should not store raw WeChat content.');

    console.log(JSON.stringify({
      ok: true,
      goldenSuites: {
        eventRecommendation,
        recommendationActionEvidence,
        recommendationActionEvidenceRanking,
        eventRecommendationFallbackPerformance,
        hackathonCoach,
        wechatParser,
        eventGovernance,
      },
      runCount: runs.length,
    }, null, 2));
  } finally {
    await db.close();
    await pool.close();
  }
};

main().catch((error) => {
  console.error('AI golden evaluation failed:', error.message);
  process.exitCode = 1;
});
