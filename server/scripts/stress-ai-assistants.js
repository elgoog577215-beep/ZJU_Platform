const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const { runEventAssistantTurn } = require('../src/utils/eventAssistant');
const { refreshEventProfileIndex } = require('../src/services/eventAiProfileService');
const { runHackathonAssistant } = require('../src/services/hackathonAssistantService');
const { parseWithLLM } = require('../src/utils/wechat');
const assistantService = require('../src/services/unifiedAiAssistantService');
const aiRuntime = require('../src/services/unifiedAiRuntimeService');
const { pool } = require('../src/config/db');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const tomorrow = (days, hour) => {
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
    'stress_user',
    '测试用户',
    '计算机学院',
    20,
  ]);
  await db.run(
    'INSERT INTO user_event_preferences (user_id, college, grade, campus, interest_tags, preferred_categories, preferred_benefits, preferred_format) VALUES (1, ?, ?, ?, ?, ?, ?, ?)',
    ['计算机学院', '本科二年级', '紫金港', 'AI,创业,志愿', 'competition,lecture,volunteer', 'score,volunteer_time', 'offline']
  );
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['hackathon_title', 'AI 全栈黑客松']);
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['hackathon_duration', '5 小时']);
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['hackathon_location', '紫金港 X1-112']);

  const events = [
    {
      title: 'AI Agent 创新工作坊',
      date: tomorrow(2, 19),
      endDate: tomorrow(2, 21),
      location: '紫金港 创意空间',
      description: '面向想做 AI 应用和项目实践的学生，现场完成小组实战，可记录综测。',
      content: '<p>包含大模型、智能体、Demo 打磨和项目复盘。</p>',
      score: '综测 0.5',
      audience: '全校学生',
      organizer: '计算机学院',
      volunteerTime: '',
      category: 'lecture',
      tags: 'AI,Agent',
    },
    {
      title: '青年志愿服务说明会',
      date: tomorrow(3, 10),
      endDate: tomorrow(3, 11),
      location: '紫金港 学生活动中心',
      description: '介绍公益服务项目和志愿时长认定。',
      content: '<p>适合想获取志愿时长并长期参与公益的同学。</p>',
      score: '',
      audience: '本科生',
      organizer: '青年志愿者协会',
      volunteerTime: '2 小时',
      category: 'volunteer',
      tags: 'volunteer',
    },
    {
      title: '黑客松挑战赛报名宣讲',
      date: tomorrow(4, 14),
      endDate: tomorrow(4, 16),
      location: '紫金港 会议中心',
      description: '面向新生的 AI 黑客松比赛，可计综测。',
      content: '<p>团队路演、模型应用、产品设计。</p>',
      score: '综测加分',
      audience: '新生',
      organizer: '创新创业学院',
      volunteerTime: '',
      category: 'competition',
      tags: 'AI',
    },
    {
      title: '未来校园生活分享会',
      date: tomorrow(5, 15),
      endDate: tomorrow(5, 17),
      location: '玉泉 小剧场',
      description: '围绕未来学习、校园工具和 AI 创意进行交流分享。',
      content: '<p>不涉及比赛或志愿服务。</p>',
      score: '',
      audience: '全校师生',
      organizer: '学生社团',
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

const stressModelRunner = async ({ task, messages }) => {
  const systemText = messages.map((message) => String(message.content || '')).join('\n');
  assert(
    systemText.includes('Quality requirements for every AI assistant task'),
    `Missing shared quality instruction for ${task}.`
  );

  if (task === 'event_recommendation_intent') {
    return {
      query_summary: '用户想在紫金港参加 AI 相关、能获得综测或实践收益的近期活动',
      topics: ['AI', '智能体', '项目实践'],
      campuses: ['紫金港'],
      organizers: ['计算机学院'],
      audiences: ['全校学生'],
      benefits: ['score', '技能'],
      categories: ['lecture', 'competition'],
      date_constraints: ['this_week'],
      format: 'offline',
      allow_historical: false,
      needs_clarification: false,
      clarification_question: '',
      confidence: 0.94,
    };
  }

  if (task === 'event_profile') {
    const payload = extractPayload(messages);
    const event = payload.event || {};
    const text = `${event.title || ''} ${event.description || ''} ${event.score || ''} ${event.volunteer_time || ''}`;
    const isAi = /AI|Agent|黑客松/.test(text);
    const isVolunteer = /志愿|公益|时长/.test(text);
    return {
      summary: isAi
        ? 'AI 实践活动，适合希望做项目并获得成长记录的学生。'
        : isVolunteer
          ? '志愿服务说明活动，适合关注公益和志愿时长的学生。'
          : '校园分享活动，适合对学习和校园工具感兴趣的学生。',
      category: isAi ? (String(event.title).includes('黑客松') ? 'competition' : 'lecture') : (event.category || 'other'),
      topics: isAi ? ['AI', '智能体', '项目实践'] : [event.title || '校园活动'],
      campuses: String(event.location || '').includes('紫金港') ? ['紫金港'] : [],
      organizers: event.organizer ? [event.organizer] : [],
      audiences: event.target_audience ? [event.target_audience] : [],
      benefits: [
        String(event.score || '').includes('综测') ? 'score' : '',
        isVolunteer ? 'volunteer_time' : '',
      ].filter(Boolean),
      time_preference_terms: [],
      confidence: isAi ? 0.91 : 0.7,
      rationale: '基于标题、描述、地点和收益字段抽取画像。',
    };
  }

  if (task === 'event_recommendation_rerank') {
    const payload = extractPayload(messages);
    const candidates = payload.candidates || [];
    const ranked = [...candidates].sort((left, right) => {
      const leftAi = /AI|Agent|黑客松/.test(`${left.title} ${left.description}`);
      const rightAi = /AI|Agent|黑客松/.test(`${right.title} ${right.description}`);
      if (leftAi !== rightAi) return leftAi ? -1 : 1;
      return Number(right.recallScore || 0) - Number(left.recallScore || 0);
    });
    return {
      summary: '优先选择同时匹配 AI 主题、紫金港线下参与和综测/实践收益的活动。',
      recommendations: ranked.slice(0, 3).map((candidate, index) => ({
        id: candidate.id,
        rank: index + 1,
        confidence: index === 0 ? 0.96 : 0.78 - index * 0.06,
        reason: `${candidate.title} 与需求中的主题、地点或收益信号匹配，且来源于候选活动事实。`,
        matched_signals: [
          /AI|Agent|黑客松/.test(`${candidate.title} ${candidate.description}`) ? 'AI 主题' : '校园活动',
          String(candidate.location || '').includes('紫金港') ? '紫金港' : '地点可选',
          String(candidate.score || '').includes('综测') ? '综测收益' : '部分匹配',
        ],
      })),
    };
  }

  if (task === 'hackathon_ai_coach') {
    const payload = extractPayload(messages);
    assert(payload.contextCards.length > 0, 'Hackathon coach should provide context cards.');
    return {
      summary: '你适合选择一个小而完整的 AI 工具方向，把重点放在可运行 Demo 和清晰场景上。',
      intent: {
        primaryGoal: 'preparation',
        goals: ['preparation', 'tooling'],
        profileSignals: ['ai_tool_user', 'scope_risk'],
        confidence: 0.88,
      },
      recommendation: {
        track: '校园活动智能推荐小工具',
        focus: '用一个输入场景打通数据、AI 分析和结果展示。',
        fitScore: 86,
        rationale: '用户强调 AI 能力和可用性，适合做窄场景闭环而不是泛平台。',
        nextAction: '写下 2 个真实用户问题，并准备对应的演示数据。',
      },
      prepPlan: [
        { step: 1, title: '确定单场景', detail: '只选一个用户问题，避免扩大范围。' },
        { step: 2, title: '准备样例数据', detail: '至少准备 5 条可展示活动。' },
        { step: 3, title: '打通主流程', detail: '完成输入、AI 分析、推荐输出。' },
      ],
      strategy: {
        eventDay: '前 45 分钟冻结范围，中段完成主链路，最后留时间演示。',
        tooling: '用 AI 工具生成样例、检查边界、压缩说明。',
        delivery: '演示一个从问题到推荐的完整闭环。',
      },
      risks: [
        { risk: '范围过大', mitigation: '只交付一个可跑主流程。', severity: 'high' },
        { risk: '模型输出不稳', mitigation: '准备 fallback 和固定样例。', severity: 'medium' },
      ],
      sources: payload.contextCards.slice(0, 3).map((card) => ({ id: card.id })),
      suggestedQuestions: ['如何把范围压到 5 小时内？'],
      confidence: 0.9,
      warnings: [],
    };
  }

  if (task === 'wechat_event_parse') {
    return {
      title: 'AI 产品实践工作坊',
      description: '面向全校学生的 AI 项目实践活动，含综测说明。',
      content: '<h3>活动介绍</h3><p>围绕 AI 工具和项目 Demo 展开。</p>',
      date_reasoning: '文章明确出现 5 月 20 日 19:00，因此使用当前年份。',
      date: '2026-05-20T19:00',
      end_date: '2026-05-20T21:00',
      time: '19:00-21:00',
      location: '紫金港 创意空间',
      organizer: '计算机学院',
      category: 'competition',
      category_confidence: 0.9,
      category_reason: '文本强调工作坊和项目实践。',
      target_audience: '全校学生',
      volunteer_time: null,
      score: '综测 0.5',
      tags: ['AI'],
    };
  }

  if (task === 'event_governance_review') {
    const payload = extractPayload(messages);
    return {
      reviews: (payload.candidates || []).map((candidate) => {
        const isAmbiguous = String(candidate.event.title || '').includes('未来校园');
        return {
          eventId: candidate.event.id,
          field: candidate.ruleSuggestion.field,
          accepted: !isAmbiguous,
          suggestedValue: isAmbiguous ? 'other' : candidate.ruleSuggestion.suggestedValue,
          confidence: isAmbiguous ? 0.35 : 0.84,
          reason: isAmbiguous
            ? '活动证据偏泛分享，保守不强行归类。'
            : '活动标题和内容与标准分类证据一致。',
        };
      }),
      memorySignals: [
        { pattern: 'AI 实践、Demo、路演活动优先归入 competition 或 lecture。', weight: 0.8 },
      ],
      warnings: [],
    };
  }

  throw new Error(`Unexpected stress task: ${task}`);
};

const assertNoRawLeak = (value, forbidden, label) => {
  const text = JSON.stringify(value);
  for (const item of forbidden) {
    assert(!text.includes(item), `${label} leaked raw sensitive text: ${item}`);
  }
};

const assertUsefulText = (value, label, minLength = 8) => {
  assert(typeof value === 'string' && value.trim().length >= minLength, `${label} should be useful text.`);
};

const stressEventRecommendation = async (db) => {
  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: '这周我想在紫金港参加一个 AI 相关活动，最好能有综测，也想认识做项目的人',
    rememberPreference: true,
    allowHistoricalFallback: false,
    modelRunner: stressModelRunner,
    now: new Date(),
  });

  assert(result.type === 'recommend', 'Event recommendation should return recommendations.');
  assert(result.recommendations.length >= 2, 'Event recommendation should include multiple ranked options.');
  assert(result.recommendations[0].confidence >= 0.85, 'Top recommendation should carry strong confidence.');
  assert(/AI|黑客松|Agent/.test(result.recommendations[0].event.title), 'Top recommendation should match AI intent.');
  for (const item of result.recommendations) {
    assertUsefulText(item.reason, 'Recommendation reason');
    assert(Array.isArray(item.matchSignals) && item.matchSignals.length > 0, 'Recommendation should expose match signals.');
  }
  assert(result.modelStatus.tasks.includes('event_recommendation_rerank'), 'Recommendation should use model rerank.');
  assert(result.modelStatus.profileStats.generated >= 1, 'Recommendation should exercise profile indexing.');
  assert(result.remembered === true, 'Recommendation should write opt-in preference memory.');
};

const stressHackathonCoach = async (db) => {
  const result = await runHackathonAssistant({
    db,
    userId: 1,
    query: '我会用 AI 工具但前端一般，想参加黑客松，5 小时内怎么保证作品能跑？',
    participantProfile: { skills: ['AI 工具', 'Python'], concerns: ['前端不稳', '时间短'] },
    modelRunner: stressModelRunner,
  });

  assert(result.type === 'hackathon_coach', 'Hackathon coach should return its contract.');
  assertUsefulText(result.summary, 'Hackathon summary', 16);
  assert(result.recommendation.fitScore >= 70, 'Hackathon fit score should be normalized and useful.');
  assert(result.prepPlan.length >= 3, 'Hackathon coach should include a concrete prep plan.');
  assert(result.risks.some((risk) => risk.severity === 'high'), 'Hackathon coach should identify high-impact risks.');
  assert(result.sources.length > 0, 'Hackathon coach should ground answer in context cards.');
};

const stressWechatParser = async (db) => {
  const parsed = await parseWithLLM({
    title: '推文：AI 产品实践工作坊报名',
    author: '计算机学院',
    content: '5月20日19:00-21:00，紫金港创意空间，面向全校学生，参加可获综测0.5。',
    coverImage: '',
  }, {
    db,
    modelRunner: stressModelRunner,
  });

  assert(parsed.title.includes('AI'), 'WeChat parser should preserve activity title.');
  assert(parsed.category === 'competition', 'WeChat parser should normalize to a standard category.');
  assert(parsed.category_confidence > 0.5, 'WeChat parser should expose category confidence.');
  assert(parsed.target_audience, 'WeChat parser should normalize target audience.');
  assert(parsed.aiMeta.runtimeTelemetry.taskCount === 1, 'WeChat parser should expose runtime telemetry.');
};

const stressGovernance = async (db) => {
  const scan = await assistantService.scanEventGovernance(db, {
    limit: 20,
    minConfidence: 0.45,
    userId: 1,
    modelRunner: stressModelRunner,
  });

  assert(scan.summary.scannedEventCount >= 4, 'Governance should scan seeded events.');
  assert(scan.summary.modelReview.used === true, 'Governance should use model review for ambiguous candidates.');
  assert(scan.summary.modelReview.runtimeTelemetry.taskCount === 1, 'Governance should expose runtime telemetry.');
  assert(
    scan.suggestions.every((suggestion) => ['category', 'target_audience'].includes(suggestion.field)),
    'Governance should only suggest whitelisted fields.'
  );
};

const stressProfileIndex = async (db) => {
  const refresh = await refreshEventProfileIndex(db, {
    limit: 4,
    force: true,
    modelRunner: stressModelRunner,
  });

  assert(refresh.summary.generated >= 4, 'Profile refresh should generate profiles.');
  assert(refresh.summary.modelUsedCount >= 4, 'Profile refresh should use model for profiles.');
  assert(refresh.coverage.coverageRatio === 1, 'Profile refresh should reach full coverage.');
  assert(refresh.coverage.staleCount === 0, 'Profile refresh should not leave stale profiles.');
  assert(refresh.summary.runtimeTelemetry.taskCount >= 4, 'Profile refresh should aggregate telemetry.');
};

const stressRuntimeQuality = async (db) => {
  let sawQualityInstruction = false;
  const result = await aiRuntime.callJson(db, {
    task: 'json_repair',
    messages: [
      { role: 'system', content: 'Return a tiny JSON object.' },
      { role: 'user', content: '{"need":"quality"}' },
    ],
    modelRunner: async ({ messages }) => {
      sawQualityInstruction = messages.some((message) => String(message.content || '').includes('Quality requirements'));
      return { ok: true, confidence: 0.91 };
    },
  });

  assert(sawQualityInstruction, 'Runtime should inject shared quality instruction.');
  assert(result.parsed.ok === true, 'Runtime should parse injected output.');
  assert(result.modelStatus.telemetry.promptTokensEstimate > 0, 'Runtime should record telemetry.');
};

const runStage = async (name, fn) => {
  await fn();
  console.log(`[stress:ai] ${name} passed`);
};

const main = async () => {
  const db = await createDb();
  try {
    await runStage('model_config_runtime', () => stressRuntimeQuality(db));
    await runStage('event_recommendation', () => stressEventRecommendation(db));
    await runStage('hackathon_coach', () => stressHackathonCoach(db));
    await runStage('wechat_event_parser', () => stressWechatParser(db));
    await runStage('event_governance', () => stressGovernance(db));
    await runStage('event_profile_index', () => stressProfileIndex(db));

    const runs = await db.all('SELECT module, action, summary_json FROM ai_assistant_runs ORDER BY id ASC');
    assert(runs.length >= 4, 'Stress test should record assistant runs.');
    assertNoRawLeak(runs, ['这周我想在紫金港参加', '5月20日19:00-21:00'], 'assistant run summaries');

    const overview = await assistantService.getAssistantOverview(db);
    assert(overview.health.runtimeTelemetryTaskCount >= 6, 'Overview should aggregate runtime telemetry after stress.');

    console.log(JSON.stringify({
      ok: true,
      modulesStressed: [
        'model_config_runtime',
        'event_recommendation',
        'hackathon_coach',
        'wechat_event_parser',
        'event_governance',
        'event_profile_index',
      ],
      runCount: runs.length,
      runtimeTelemetryTaskCount: overview.health.runtimeTelemetryTaskCount,
      eventAiProfileCoverageRatio: overview.health.eventAiProfileCoverageRatio,
    }, null, 2));
  } finally {
    await db.close();
    await pool.close();
  }
};

main().catch((error) => {
  console.error('AI assistant stress check failed:', error.message);
  process.exitCode = 1;
});
