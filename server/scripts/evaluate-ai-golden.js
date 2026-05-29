const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const {
  runEventAssistantTurn,
  recordEventAssistantDecisionAction,
  recordEventAssistantFeedback
} = require('../src/utils/eventAssistant');
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
    CREATE TABLE event_recommendation_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER,
      user_id INTEGER,
      visitor_key TEXT,
      event_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      source TEXT,
      recommendation_rank INTEGER,
      metadata_json TEXT,
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
    const payload = extractPayload(messages);
    const query = String(payload.query || '');
    if (/活动推荐|推荐活动|找活动|some events/i.test(query)) {
      return {
        query_summary: 'User broadly asks for activity recommendations but has not specified topic, campus, benefit, or time.',
        topics: [],
        campuses: [],
        organizers: [],
        audiences: ['All students'],
        benefits: [],
        categories: [],
        date_constraints: [],
        format: '',
        allow_historical: false,
        needs_clarification: true,
        clarification_question: '你更想按主题、校区，还是综测/志愿时长来筛选？',
        clarification_options: ['按 AI/科创方向', '只看紫金港', '优先有综测', '先给我最值得参加的 3 个'],
        confidence: 0.42,
      };
    }

    if (/志愿|公益|volunteer|时长/i.test(query)) {
      return {
        query_summary: '用户想找有志愿时长或公益服务价值的活动。',
        topics: ['志愿', '公益服务'],
        campuses: /紫金港|zijingang/i.test(query) ? ['Zijingang'] : [],
        organizers: ['Youth Volunteer Association'],
        audiences: ['Undergraduates'],
        benefits: ['volunteer_time'],
        categories: ['volunteer'],
        date_constraints: /周末|weekend/i.test(query) ? ['weekend'] : ['this_week'],
        format: /线上|online/i.test(query) ? 'online' : 'offline',
        allow_historical: false,
        needs_clarification: false,
        clarification_question: '',
        confidence: 0.92,
      };
    }

    if (/创业|路演|startup|roadshow|pitch/i.test(query)) {
      return {
        query_summary: '用户想找 AI 创业、路演或挑战赛类机会。',
        topics: ['AI', '创业', '路演', '挑战赛'],
        campuses: /紫金港|zijingang/i.test(query) ? ['Zijingang'] : [],
        organizers: ['Innovation Hub'],
        audiences: ['Student teams'],
        benefits: /加分|综测|score/i.test(query) ? ['score', 'skill'] : ['skill'],
        categories: ['competition'],
        date_constraints: /这周|本周|this week/i.test(query) ? ['this_week'] : [],
        format: /线上|online/i.test(query) ? 'online' : 'offline',
        allow_historical: false,
        needs_clarification: false,
        clarification_question: '',
        confidence: 0.93,
      };
    }

    if (/音乐|文体|艺术|\bmusic\b|\bart\b|放松|社交/i.test(query)) {
      return {
        query_summary: '用户想找音乐、艺术或轻社交类校园活动。',
        topics: ['音乐', '艺术', '社交'],
        campuses: /玉泉|yuquan/i.test(query) ? ['Yuquan'] : [],
        organizers: ['Art Club'],
        audiences: ['All students'],
        benefits: ['social'],
        categories: ['culture_sports'],
        date_constraints: /周末|weekend/i.test(query) ? ['weekend'] : [],
        format: 'offline',
        allow_historical: false,
        needs_clarification: false,
        clarification_question: '',
        confidence: 0.9,
      };
    }

    if (/新生|fresh/i.test(query)) {
      return {
        query_summary: '用户想找适合新生的线下活动。',
        topics: ['新生', '校园生活'],
        campuses: /紫金港|zijingang/i.test(query) ? ['Zijingang'] : [],
        organizers: [],
        audiences: ['Freshmen'],
        benefits: ['social'],
        categories: ['other'],
        date_constraints: ['this_week'],
        format: 'offline',
        allow_historical: false,
        needs_clarification: false,
        clarification_question: '',
        confidence: 0.88,
      };
    }

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
    assert(
      candidates.every((candidate) => candidate.actionEvidence && typeof candidate.actionEvidence.priorViewDetail === 'boolean'),
      'Rerank prompt should include recommendation action learning details.'
    );
    const scored = candidates.map((candidate) => {
      const text = `${candidate.title || ''} ${candidate.description || ''} ${candidate.score || ''}`;
      const isHackathon = /hackathon|challenge|competition/i.test(text);
      const isWorkshop = /AI Agent|workshop|agent/i.test(text);
      const isVolunteer = /volunteer|service|hour/i.test(text);
      const isMusic = /music|art|sharing/i.test(text);
      const isFreshman = /freshmen|freshman/i.test(text);
      const hasScore = /score/i.test(text);
      const isZijingang = /Zijingang/i.test(candidate.location || '');
      const actionEvidence = candidate.actionEvidence || {};
      return {
        candidate,
        score: (isHackathon ? 10 : 0)
          + (isWorkshop ? 8 : 0)
          + (isVolunteer ? 14 : 0)
          + (isMusic ? 12 : 0)
          + (isFreshman ? 5 : 0)
          + (hasScore ? 4 : 0)
          + (isZijingang ? 3 : 0)
          + Number(candidate.hardConstraintScore || 0) * 0.4
          + Number(actionEvidence.positiveCategoryWeight || 0)
          + (actionEvidence.priorPositiveAction ? 12 : 0)
          + (actionEvidence.priorFavoriteAction ? 5 : 0)
          + (actionEvidence.priorRegisterAction ? 8 : 0)
          + (actionEvidence.priorViewDetail ? 1 : 0)
          - Number(actionEvidence.negativeCategoryWeight || 0)
          - (actionEvidence.priorNegativeFeedback ? 30 : 0)
          - (actionEvidence.priorNegativeAction ? 12 : 0),
      };
    }).sort((left, right) => right.score - left.score || Number(left.candidate.id) - Number(right.candidate.id));

    return {
      summary: 'Ranked by AI topic fit, practical project value, Zijingang offline access, and score benefit.',
      reasoning_trace: {
        ranking_basis: ['AI topic fit', 'Zijingang offline access', 'score benefit'],
        uncertainty: ['exact date flexibility is inferred'],
        action_evidence_used: scored.some(({ candidate }) => (
          Boolean(candidate.actionEvidence?.priorPositiveAction)
          || Boolean(candidate.actionEvidence?.priorViewDetail)
          || Boolean(candidate.actionEvidence?.priorFavoriteAction)
          || Boolean(candidate.actionEvidence?.priorRegisterAction)
          || Boolean(candidate.actionEvidence?.priorNegativeAction)
        )),
      },
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

const assertOpportunityMatch = (item, label = 'Recommendation') => {
  assert(Array.isArray(item.opportunityMatch?.matched), `${label} should expose opportunity matched signals.`);
  assert(Array.isArray(item.opportunityMatch?.missing), `${label} should expose opportunity missing signals.`);
  assert(Array.isArray(item.opportunityMatch?.uncertainty), `${label} should expose opportunity uncertainty signals.`);
  assertUsefulText(item.opportunityMatch?.decisionHint, `${label} decision hint`, 12);
  assertUsefulText(item.opportunityMatch?.decisionSupport?.nextAction, `${label} next action`, 12);
  assert(Array.isArray(item.opportunityMatch?.decisionSupport?.tradeoffs), `${label} should expose decision tradeoffs.`);
  assert(Array.isArray(item.opportunityMatch?.decisionSupport?.fitFor), `${label} should expose decision fit reasons.`);
  assert(Array.isArray(item.opportunityMatch?.decisionSupport?.watchouts), `${label} should expose decision watchouts.`);
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
  assert(result.reasoningTrace?.intentConfidence > 0, 'Recommendation should expose intent confidence in reasoning trace.');
  assert(result.reasoningTrace?.candidateCount >= result.recommendations.length, 'Recommendation trace should expose candidate count.');
  assert(Array.isArray(result.reasoningTrace?.rankingBasis) && result.reasoningTrace.rankingBasis.length >= 1, 'Recommendation trace should expose ranking basis.');
  assert(Array.isArray(result.reasoningTrace?.uncertainty), 'Recommendation trace should expose uncertainty signals.');
  assert(result.reasoningTrace?.scoringFactors?.hardConstraints === true, 'Recommendation trace should expose structured hard-constraint scoring factors.');
  assert(result.reasoningTrace?.scoringFactors?.topicCategory === true, 'Recommendation trace should expose structured topic/category scoring factors.');
  assert(Number.isInteger(Number(result.assistantRunId)), 'Recommendation should expose assistant run id for decision-action attribution.');
  assert(typeof result.recommendations[0].diagnostics?.deterministicScore === 'number', 'Recommendation should expose deterministic score diagnostics.');
  assert(typeof result.recommendations[0].diagnostics?.semanticScore === 'number', 'Recommendation should expose semantic score diagnostics.');
  assert(typeof result.recommendations[0].diagnostics?.hardConstraintRatio === 'number', 'Recommendation should expose hard-constraint ratio diagnostics.');
  assertOpportunityMatch(result.recommendations[0], 'Top recommendation');
  assert(result.reasoningTrace?.opportunityStage === 'trusted_decision_loop_v1', 'Recommendation trace should expose opportunity matching stage.');
  assert(result.modelStatus.tasks.includes('event_recommendation_rerank'), 'Recommendation should use rerank task.');
  assert(result.modelStatus.profileStats.generated >= 1, 'Recommendation should use event profile generation.');
  assert(result.remembered === true, 'Recommendation should persist opt-in preference memory.');

  const run = await db.get(
    "SELECT summary_json FROM ai_assistant_runs WHERE module = 'event_recommendation' ORDER BY id DESC"
  );
  const runSummary = JSON.parse(run.summary_json || '{}');
  assert(Array.isArray(runSummary.recommendedEventIds) && runSummary.recommendedEventIds.length >= 1, 'Recommendation run should store bounded event evidence anchors.');
  assert(runSummary.averageConfidence >= 0.7, 'Recommendation run should store average confidence.');
  assert(runSummary.opportunityStage === 'trusted_decision_loop_v1', 'Recommendation run should store opportunity stage.');
  assert(typeof runSummary.averageHardConstraintRatio === 'number', 'Recommendation run should store hard-constraint ratio.');
  assert(typeof runSummary.opportunityMatchedCount === 'number' && runSummary.opportunityMatchedCount >= 1, 'Recommendation run should store opportunity matched count.');
  assert(typeof runSummary.opportunityMissingCount === 'number', 'Recommendation run should store opportunity missing count.');
  assert(typeof runSummary.durationMs === 'number' && runSummary.durationMs >= 0, 'Recommendation run should store total assistant duration.');
  assert(typeof runSummary.performance?.candidateLoadMs === 'number', 'Recommendation run should store candidate load duration.');
  assert(typeof runSummary.performance?.candidatePoolMs === 'number', 'Recommendation run should store candidate pool duration.');
  assert(typeof runSummary.performance?.rerankMs === 'number', 'Recommendation run should store rerank duration.');
  assert(typeof runSummary.decisionSupportNextActionCount === 'number' && runSummary.decisionSupportNextActionCount >= 1, 'Recommendation run should store decision-support next-action count.');
  assert(typeof runSummary.decisionSupportTradeoffCount === 'number' && runSummary.decisionSupportTradeoffCount >= 1, 'Recommendation run should store decision-support tradeoff count.');
  assert(typeof runSummary.decisionSupportWatchoutCount === 'number', 'Recommendation run should store decision-support watchout count.');
  assert(!run.summary_json.includes('Find me a Zijingang AI activity'), 'Recommendation run should avoid raw query text.');

  await recordEventAssistantDecisionAction({
    db,
    userId: 1,
    eventId: result.recommendations[0].event.id,
    actionType: 'view_detail',
    assistantRunId: result.assistantRunId,
    recommendationRank: result.recommendations[0].rank,
    source: 'golden_eval',
    metadata: {
      nextAction: result.recommendations[0].opportunityMatch?.decisionSupport?.nextAction || ''
    }
  });
  await recordEventAssistantFeedback({
    db,
    userId: 1,
    eventId: result.recommendations[0].event.id,
    feedback: 'up',
    query: 'Find me a Zijingang AI activity this week.',
    reason: 'golden positive action',
    assistantRunId: result.assistantRunId,
    recommendationRank: result.recommendations[0].rank,
    source: 'golden_eval'
  });
  const actionRows = await db.all(
    'SELECT action_type, run_id, event_id, source FROM event_recommendation_actions WHERE run_id = ? ORDER BY id ASC',
    [result.assistantRunId]
  );
  assert(actionRows.some((row) => row.action_type === 'view_detail'), 'Decision action log should store view_detail.');
  assert(actionRows.some((row) => row.action_type === 'feedback_up'), 'Decision action log should store feedback action.');

  return {
    topEvent: result.recommendations[0].event.title,
    recommendationCount: result.recommendations.length,
    topConfidence: result.recommendations[0].confidence,
  };
};

const evaluateEventRecommendationQueryMatrix = async (db) => {
  const cases = [
    { query: 'Find me a Zijingang AI activity this week with comprehensive score.', expected: /AI Agent|AI Hackathon|AI Startup/i, matched: /综测|score/i },
    { query: 'I want an offline AI project workshop at Zijingang with score credit.', expected: /AI Agent|AI Hackathon|AI Startup/i, matched: /skill|AI topic|综测|score/i },
    { query: 'Recommend an AI agent event for all students near Zijingang.', expected: /AI Agent|AI Hackathon|AI Startup/i },
    { query: 'Any practical AI demo activity this week with comprehensive score?', expected: /AI Agent|AI Hackathon|AI Startup/i },
    { query: 'Find a College of Computer Science AI activity at Zijingang.', expected: /AI Agent/i },
    { query: 'I need a hands-on agent workshop, preferably offline and score-bearing.', expected: /AI Agent|AI Hackathon|AI Startup/i },
    { query: 'Show me AI activities that help build a project demo.', expected: /AI Agent|AI Hackathon|AI Startup/i },
    { query: 'What Zijingang activity combines AI, product practice, and score value?', expected: /AI Agent|AI Hackathon|AI Startup/i },
    { query: 'Recommend a near-term AI lecture for students who want to build demos.', expected: /AI Agent/i },
    { query: 'Find an AI campus event with score recognition and offline participation.', expected: /AI Agent|AI Hackathon|AI Startup/i },
    { query: '我想找紫金港这周有综测的 AI 活动。', expected: /AI Agent|AI Hackathon|AI Startup/i, matched: /综测|加分|score/i },
    { query: '有没有计算机学院办的智能体线下活动？', expected: /AI Agent/i },
    { query: '帮我找能做项目 demo 的大模型活动。', expected: /AI Agent|AI Hackathon|AI Startup/i },
    { query: '我想参加 AI 创业或路演类活动，最好有加分。', expected: /AI Hackathon|AI Startup/i },
    { query: '推荐一个适合做作品集的 AI 实践活动。', expected: /AI Agent|AI Startup/i, matched: /技能成长/, intentSummary: /收益：.*技能成长/ },
    { query: '想找有志愿时长的公益服务活动。', expected: /Volunteer Service Orientation/i, matched: /志愿时长|volunteer/i },
    { query: '紫金港附近有没有志愿时长活动？', expected: /Volunteer Service Orientation/i, matched: /志愿时长|volunteer/i },
    { query: '推荐本科生可以参加的志愿服务。', expected: /Volunteer Service Orientation/i },
    { query: '我想做公益，最好有服务小时。', expected: /Volunteer Service Orientation/i },
    { query: '有没有青年志愿者协会相关活动？', expected: /Volunteer Service Orientation/i },
    { query: '想找玉泉的音乐或艺术活动放松一下。', expected: /Classical Music Sharing Session/i, matched: /social|音乐|艺术|partial topic/i },
    { query: '推荐一个轻松社交的文体活动。', expected: /Classical Music Sharing Session/i, matched: /社交放松|音乐|艺术|partial topic/i, intentSummary: /收益：.*社交放松/ },
    { query: '有没有音乐分享类校园活动？', expected: /Classical Music Sharing Session/i },
    { query: '我想参加艺术社相关活动。', expected: /Classical Music Sharing Session/i },
    { query: '推荐适合新生参加的线下活动，最好在紫金港。', expected: /AI Hackathon|Future Campus|AI Agent/i },
  ];

  const failures = [];
  for (const item of cases) {
    const result = await runEventAssistantTurn({
      db,
      userId: 1,
      query: item.query,
      allowHistoricalFallback: false,
      modelRunner: goldenModelRunner,
      now: new Date(),
    });
    const top = result.recommendations?.[0];
    const ok = result.type === 'recommend'
      && top
      && item.expected.test(top.event?.title || '')
      && Array.isArray(result.reasoningTrace?.rankingBasis)
      && result.reasoningTrace.rankingBasis.length >= 1
      && typeof top.diagnostics?.hardConstraintRatio === 'number'
      && top.diagnostics.hardConstraintScore > 0
      && Array.isArray(top.opportunityMatch?.matched)
      && (!item.matched || item.matched.test(top.opportunityMatch.matched.join(' ')))
      && (!item.intentSummary || item.intentSummary.test((result.understoodIntent?.understood || []).join(' ')))
      && typeof top.opportunityMatch?.decisionHint === 'string'
      && top.opportunityMatch.decisionHint.length >= 12
      && !top.isHistorical;

    if (!ok) {
      failures.push({
        query: item.query,
        responseType: result.type,
        topTitle: top?.event?.title || '',
        expected: String(item.expected),
        expectedMatched: item.matched ? String(item.matched) : '',
        expectedIntentSummary: item.intentSummary ? String(item.intentSummary) : '',
        understoodIntent: result.understoodIntent || null,
        diagnostics: top?.diagnostics || null,
        opportunityMatch: top?.opportunityMatch || null,
      });
    }
  }

  assert(failures.length === 0, `Recommendation query matrix failed: ${JSON.stringify(failures, null, 2)}`);

  return {
    queryCount: cases.length,
    failedCount: failures.length,
  };
};

const evaluateIntentLocalConstraintRetention = async (db) => {
  const sparseIntentRunner = async ({ task, messages }) => {
    if (task === 'event_recommendation_intent') {
      return {
        query_summary: '用户想找计算机学院的 AI 线下活动，但模型省略了部分结构字段。',
        topics: ['AI'],
        categories: ['lecture'],
        benefits: [],
        confidence: 0.78,
      };
    }
    return goldenModelRunner({ task, messages });
  };

  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: '帮我找计算机学院在紫金港的线下 AI 活动，最好本周有综测',
    rememberPreference: false,
    allowHistoricalFallback: false,
    modelRunner: sparseIntentRunner,
    now: new Date(),
  });

  const top = result.recommendations?.[0];
  assert(result.type === 'recommend', 'Sparse intent output should still return recommendations.');
  assert(top?.event?.organizer === 'College of Computer Science', 'Local organizer constraint should survive sparse model intent output.');
  assert(top.diagnostics?.hardConstraintScore > 0, 'Retained local constraints should contribute to hard-constraint score.');
  assertOpportunityMatch(top, 'Chinese sparse-intent recommendation');
  assert(
    top.matchSignals.some((signal) => signal.includes('紫金港') || signal.includes('Zijingang') || signal.includes('地点')),
    'Local campus constraint should survive sparse model intent output.'
  );

  return {
    topEvent: top.event.title,
    topOrganizer: top.event.organizer,
    hardConstraintScore: top.diagnostics.hardConstraintScore,
  };
};

const evaluateNegativeFeedbackReasonLearning = async (db) => {
  await db.run(
    'INSERT INTO event_recommendation_feedback (user_id, event_id, feedback, query, reason) VALUES (?, ?, ?, ?, ?)',
    [1, 2, 'down', 'redacted golden query', '时间不合适：AI Hackathon Challenge Briefing']
  );

  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: 'Find me a Zijingang AI activity this week with comprehensive score.',
    rememberPreference: false,
    allowHistoricalFallback: false,
    modelRunner: goldenModelRunner,
    now: new Date(),
  });

  assert(result.type === 'recommend', 'Negative feedback reason learning should still return recommendations.');
  assert(
    result.reasoningTrace?.feedbackLearning?.negativeReasons?.some((item) => item.value === 'time_mismatch'),
    'Reasoning trace should expose parsed negative feedback reason.'
  );
  assert(
    result.recommendations[0].event.id !== 2,
    'Event-specific time mismatch feedback should lower the previously downvoted event.'
  );
  assert(
    !result.recommendations[0].matchSignals.some((signal) => signal.includes('时间不合适')),
    'Time mismatch feedback should not penalize a different top event that otherwise matches the request.'
  );

  return {
    topEvent: result.recommendations[0].event.title,
    negativeReasons: result.reasoningTrace.feedbackLearning.negativeReasons,
  };
};

const evaluateLocalBenefitAliasBoundaries = async (db) => {
  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: 'Find an AI campus event with offline participation near Zijingang.',
    rememberPreference: false,
    allowHistoricalFallback: false,
    modelRunner: async ({ task, messages }) => {
      if (task === 'event_recommendation_intent') {
        return {
          query_summary: 'Local parser boundary check for participation wording.',
          topics: ['AI'],
          campuses: ['Zijingang'],
          audiences: ['All students'],
          benefits: [],
          categories: ['lecture'],
          format: 'offline',
          confidence: 0.84,
        };
      }
      return goldenModelRunner({ task, messages });
    },
    now: new Date(),
  });

  const top = result.recommendations?.[0];
  assert(result.type === 'recommend', 'Benefit alias boundary check should return recommendations.');
  assert(/AI Agent|AI Hackathon|AI Startup/i.test(top?.event?.title || ''), 'Participation wording should not redirect to art/social events.');
  assert(
    !top.opportunityMatch?.matched?.some((signal) => /收益匹配：social|social/i.test(String(signal))),
    'Participation wording should not be misclassified as social benefit through art substring.'
  );

  return {
    topEvent: top.event.title,
    matched: top.opportunityMatch?.matched || [],
  };
};

const evaluateRerankBackendCompletionAndGuardrail = async (db) => {
  const underReturningRunner = async ({ task, messages }) => {
    if (task === 'event_recommendation_rerank') {
      const payload = extractPayload(messages);
      const candidates = payload.candidates || [];
      const weak = candidates.find((candidate) => /Music|Campus Life/i.test(candidate.title || '')) || candidates[candidates.length - 1];
      return {
        summary: 'The model returned too few candidates and placed a weaker candidate first.',
        reasoning_trace: {
          ranking_basis: ['model semantic guess'],
          uncertainty: ['model returned a partial list'],
          action_evidence_used: false,
        },
        recommendations: [
          {
            id: weak.id,
            rank: 1,
            confidence: 0.8,
            reason: 'Partial model result.',
            matched_signals: ['partial model signal'],
          },
        ],
      };
    }
    return goldenModelRunner({ task, messages });
  };

  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: 'Find a College of Computer Science AI activity at Zijingang with comprehensive score.',
    rememberPreference: false,
    allowHistoricalFallback: false,
    modelRunner: underReturningRunner,
    now: new Date(),
  });

  const top = result.recommendations?.[0];
  assert(result.type === 'recommend', 'Partial rerank output should still return recommendations.');
  assert(result.recommendations.length >= 3, 'Backend should complete partial model rerank results.');
  assert(top?.event?.organizer === 'College of Computer Science', 'Hard-constraint guardrail should promote the best constrained candidate.');
  assert(
    result.recommendations.some((item) => item.diagnostics?.backendCompleted === true),
    'Completed recommendations should be marked in diagnostics.'
  );
  assert(
    result.reasoningTrace?.backendCompletedRecommendationCount >= 1,
    'Reasoning trace should expose backend completion count.'
  );

  return {
    topEvent: top.event.title,
    recommendationCount: result.recommendations.length,
    completedCount: result.reasoningTrace.backendCompletedRecommendationCount,
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

const evaluateSmartClarification = async (db) => {
  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: '推荐活动',
    rememberPreference: false,
    allowHistoricalFallback: false,
    modelRunner: goldenModelRunner,
    now: new Date(),
  });

  assert(result.type === 'clarify', 'Broad recommendation query should trigger smart clarification.');
  assertUsefulText(result.question, 'Clarification question', 10);
  assert(Array.isArray(result.clarificationOptions) && result.clarificationOptions.length >= 2, 'Clarification should expose bounded options.');
  assert(Array.isArray(result.provisionalRecommendations) && result.provisionalRecommendations.length >= 1, 'Clarification should expose provisional recommendations.');
  assert(result.reasoningTrace?.clarificationSuggested === true, 'Clarification should expose trace flag.');
  assert(result.reasoningTrace?.candidateCount >= result.provisionalRecommendations.length, 'Clarification trace should expose candidate count.');

  return {
    optionCount: result.clarificationOptions.length,
    provisionalCount: result.provisionalRecommendations.length,
    intentConfidence: result.reasoningTrace.intentConfidence,
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

const evaluateRecommendationActionLearning = async (db) => {
  const staleRun = await db.run(
    `INSERT INTO ai_assistant_runs (module, action, status, requested_by, summary_json)
     VALUES (?, ?, ?, ?, ?)`,
    ['event_recommendation', 'turn', 'completed', 1, JSON.stringify({ seed: 'action-learning' })]
  );
  await recordEventAssistantDecisionAction({
    db,
    userId: 1,
    eventId: 1,
    actionType: 'view_detail',
    assistantRunId: staleRun.lastID,
    recommendationRank: 1,
    source: 'golden_action_learning',
    metadata: {
      longPrivateNote: 'PRIVATE_METADATA_SHOULD_NOT_APPEAR_IN_SUMMARY'
    }
  });
  await recordEventAssistantDecisionAction({
    db,
    userId: 1,
    eventId: 1,
    actionType: 'favorite',
    assistantRunId: staleRun.lastID,
    recommendationRank: 1,
    source: 'golden_action_learning'
  });
  await recordEventAssistantDecisionAction({
    db,
    userId: 1,
    eventId: 2,
    actionType: 'unregister',
    assistantRunId: staleRun.lastID,
    recommendationRank: 2,
    source: 'golden_action_learning'
  });

  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: 'Find me a practical AI project workshop with score credit at Zijingang.',
    rememberPreference: false,
    allowHistoricalFallback: false,
    modelRunner: goldenModelRunner,
    now: new Date(),
  });

  assert(result.type === 'recommend', 'Recommendation action learning should still return recommendations.');
  assert(result.reasoningTrace?.actionEvidenceUsed === true, 'Recommendation should mark action learning evidence as used.');
  assert(
    result.recommendations[0].matchSignals.some((signal) => signal.includes('行动证据')),
    'Recommendation action learning should expose action evidence in match signals.'
  );

  const run = await db.get(
    "SELECT summary_json FROM ai_assistant_runs WHERE module = 'event_recommendation' ORDER BY id DESC"
  );
  const runSummary = JSON.parse(run.summary_json || '{}');
  assert(runSummary.actionEvidenceUsed === true, 'Run summary should record action evidence usage.');
  assert(runSummary.actionEvidenceSourceCount >= 3, 'Run summary should count recommendation action evidence sources.');
  assert(runSummary.viewDetailEvidenceCount >= 1, 'Run summary should count view detail evidence.');
  assert(runSummary.favoriteActionEvidenceCount >= 1, 'Run summary should count favorite action evidence.');
  assert(runSummary.negativeActionEvidenceCount >= 1, 'Run summary should count negative action evidence.');
  assert(!run.summary_json.includes('PRIVATE_METADATA_SHOULD_NOT_APPEAR_IN_SUMMARY'), 'Run summary should avoid raw action metadata.');
  assert(!run.summary_json.includes('Find me a practical AI project workshop'), 'Run summary should avoid raw query text.');

  return {
    topEvent: result.recommendations[0].event.title,
    actionEvidenceSourceCount: runSummary.actionEvidenceSourceCount,
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
    const eventRecommendationQueryMatrix = await evaluateEventRecommendationQueryMatrix(db);
    const intentLocalConstraintRetention = await evaluateIntentLocalConstraintRetention(db);
    const localBenefitAliasBoundaries = await evaluateLocalBenefitAliasBoundaries(db);
    const rerankBackendCompletionAndGuardrail = await evaluateRerankBackendCompletionAndGuardrail(db);
    const negativeFeedbackReasonLearning = await evaluateNegativeFeedbackReasonLearning(db);
    const recommendationActionEvidence = await evaluateRecommendationActionEvidence(db);
    const smartClarification = await evaluateSmartClarification(db);
    const recommendationActionEvidenceRanking = await evaluateRecommendationActionEvidenceRanking(db);
    const recommendationActionLearning = await evaluateRecommendationActionLearning(db);
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
        eventRecommendationQueryMatrix,
        intentLocalConstraintRetention,
        localBenefitAliasBoundaries,
        rerankBackendCompletionAndGuardrail,
        negativeFeedbackReasonLearning,
        recommendationActionEvidence,
        smartClarification,
        recommendationActionEvidenceRanking,
        recommendationActionLearning,
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
