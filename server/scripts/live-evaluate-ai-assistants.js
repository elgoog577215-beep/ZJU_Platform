const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const aiRuntime = require('../src/services/unifiedAiRuntimeService');
const modelConfigService = require('../src/services/aiModelConfigService');
const { runEventAssistantTurn } = require('../src/utils/eventAssistant');
const { runHackathonAssistant } = require('../src/services/hackathonAssistantService');
const { parseWithLLM } = require('../src/utils/wechat');
const assistantService = require('../src/services/unifiedAiAssistantService');
const {
  buildSourceHash,
  refreshEventProfileIndex,
} = require('../src/services/eventAiProfileService');
const { pool } = require('../src/config/db');

const workspaceRoot = path.join(__dirname, '..', '..');
const sourceDbPath = process.env.DATABASE_FILE
  ? path.resolve(path.join(__dirname, '..'), process.env.DATABASE_FILE)
  : path.join(__dirname, '..', 'database.sqlite');

const OUTPUT_DIR = path.join(workspaceRoot, 'output', 'ai-live-eval');
const DEFAULT_SCORE_TARGET = 0.78;

const toText = (value, maxLength = 500) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const assertCase = (condition, message, category = 'quality') => {
  if (!condition) {
    const error = new Error(message);
    error.category = category;
    throw error;
  }
};

const daysFromNow = (days, hour = 14) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`;
};

const redact = (value) => JSON.parse(JSON.stringify(value, (key, item) => {
  if (/api.?key|token|authorization|encrypted/i.test(key)) return '[redacted]';
  if (typeof item === 'string' && /^ms-[A-Za-z0-9-]{12,}/.test(item)) return '[redacted]';
  return item;
}));

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

const copyModelConfigs = async (evalDb) => {
  const sourceDb = await open({ filename: sourceDbPath, driver: sqlite3.Database });
  try {
    const rows = await sourceDb.all(`
      SELECT *
      FROM ai_model_configs
      WHERE enabled = 1
      ORDER BY priority ASC, id ASC
    `);

    if (rows.length === 0) {
      throw new Error('No enabled ai_model_configs found in local backend database.');
    }

    for (const row of rows) {
      await evalDb.run(
        `
          INSERT INTO ai_model_configs (
            id,
            name,
            provider,
            base_url,
            model,
            encrypted_api_key,
            priority,
            enabled,
            last_status,
            last_error,
            last_checked_at,
            created_by,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          row.id,
          row.name,
          row.provider,
          row.base_url,
          row.model,
          row.encrypted_api_key,
          row.priority,
          row.enabled,
          row.last_status,
          row.last_error,
          row.last_checked_at,
          row.created_by,
          row.created_at,
          row.updated_at,
        ]
      );
    }

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      provider: row.provider,
      base_url: row.base_url,
      model: row.model,
      priority: row.priority,
      enabled: Boolean(row.enabled),
    }));
  } finally {
    await sourceDb.close();
  }
};

const seedSettings = async (db) => {
  const settings = [
    ['hackathon_title', 'AI 全栈极速黑客松'],
    ['hackathon_duration', '5 小时'],
    ['hackathon_location', '紫金港西一 112'],
    ['hackathon_format', '个人赛'],
    ['hackathon_desc', '在限定时间内独立完成一个可运行的 AI 应用，允许使用 Codex、Cursor、Qoder 等 AI 工具。'],
    ['hackathon_partners', '浙江大学, 计算机学院, MiniMax, Qoder'],
  ];
  for (const [key, value] of settings) {
    await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
};

const eventFixtures = [
  {
    id: 1,
    title: '计算机学院 AI Agent 产品工作坊',
    date: daysFromNow(2, 19),
    endDate: daysFromNow(2, 21),
    location: '紫金港校区 创意空间',
    description: '面向想做 AI 应用和项目 Demo 的同学，现场完成小组实战，可记录综测。',
    content: '<p>包含大模型、智能体流程、产品设计、Demo 打磨和项目复盘。</p>',
    score: '综测 0.5',
    audience: '全校学生',
    organizer: '计算机学院',
    volunteerTime: '',
    category: 'lecture',
    tags: 'AI,Agent,产品',
    profile: {
      summary: '计算机学院 AI Agent 工作坊，适合想做项目 Demo 并获得综测的学生。',
      category: 'lecture',
      topics: ['AI', 'Agent', '产品设计', 'Demo'],
      campuses: ['紫金港'],
      organizers: ['计算机学院'],
      audiences: ['全校学生'],
      benefits: ['综测', '技能'],
      time_preference_terms: ['晚上', '近期'],
      confidence: 0.94,
      rationale: '标题、描述、地点和综测字段共同支持该画像。',
    },
  },
  {
    id: 2,
    title: 'AI 创业挑战赛路演报名',
    date: daysFromNow(4, 14),
    endDate: daysFromNow(4, 17),
    location: '紫金港校区 会议中心',
    description: 'AI 创业与产品路演比赛，面向新生和跨专业团队，可获得综测加分。',
    content: '<p>团队路演、模型应用、商业表达和评委问答。</p>',
    score: '综测加分',
    audience: '新生,全校学生',
    organizer: '创新创业学院',
    volunteerTime: '',
    category: 'competition',
    tags: 'AI,competition,startup',
    profile: {
      summary: 'AI 创业路演比赛，适合希望参加竞赛并获得综测的学生。',
      category: 'competition',
      topics: ['AI', '创业', '路演', '竞赛'],
      campuses: ['紫金港'],
      organizers: ['创新创业学院'],
      audiences: ['新生', '全校学生'],
      benefits: ['综测', '技能', '社交'],
      time_preference_terms: ['近期'],
      confidence: 0.92,
      rationale: '比赛、路演和综测信号明确。',
    },
  },
  {
    id: 3,
    title: '青年志愿服务说明会',
    date: daysFromNow(3, 10),
    endDate: daysFromNow(3, 11),
    location: '紫金港校区 学生活动中心',
    description: '介绍公益服务项目和志愿时长认定，适合长期参与公益的同学。',
    content: '<p>包含志愿服务报名、服务时长认定和后续项目介绍。</p>',
    score: '',
    audience: '本科生',
    organizer: '青年志愿者协会',
    volunteerTime: '2 小时',
    category: 'volunteer',
    tags: 'volunteer',
    profile: {
      summary: '志愿服务说明会，适合关注公益和志愿时长的学生。',
      category: 'volunteer',
      topics: ['志愿服务', '公益'],
      campuses: ['紫金港'],
      organizers: ['青年志愿者协会'],
      audiences: ['本科生'],
      benefits: ['志愿时长'],
      time_preference_terms: ['上午'],
      confidence: 0.9,
      rationale: '志愿时长和公益服务字段明确。',
    },
  },
  {
    id: 4,
    title: '未来校园生活分享会',
    date: daysFromNow(5, 15),
    endDate: daysFromNow(5, 17),
    location: '玉泉校区 小剧场',
    description: '围绕未来学习、校园工具和社团经验进行交流分享。',
    content: '<p>不涉及比赛、综测或志愿服务。</p>',
    score: '',
    audience: '全校师生',
    organizer: '学生社团',
    volunteerTime: '',
    category: '',
    tags: '',
    profile: {
      summary: '校园生活分享会，主题较宽泛，适合社交和经验交流。',
      category: 'other',
      topics: ['校园生活', '经验分享'],
      campuses: ['玉泉'],
      organizers: ['学生社团'],
      audiences: ['全校师生'],
      benefits: ['社交'],
      time_preference_terms: [],
      confidence: 0.68,
      rationale: '缺少明确标准分类信号，保守归为其他。',
    },
  },
  {
    id: 5,
    title: '玉泉古典音乐赏析夜',
    date: daysFromNow(6, 19),
    endDate: daysFromNow(6, 21),
    location: '玉泉校区 永谦剧场',
    description: '古典音乐赏析和艺术交流活动。',
    content: '<p>不包含 AI、竞赛、综测或志愿服务收益。</p>',
    score: '',
    audience: '全校学生',
    organizer: '艺术社',
    volunteerTime: '',
    category: 'culture_sports',
    tags: 'music',
    profile: {
      summary: '古典音乐赏析活动，适合艺术兴趣用户。',
      category: 'culture_sports',
      topics: ['音乐', '艺术'],
      campuses: ['玉泉'],
      organizers: ['艺术社'],
      audiences: ['全校学生'],
      benefits: ['社交'],
      time_preference_terms: ['晚上'],
      confidence: 0.86,
      rationale: '音乐和艺术信号明确。',
    },
  },
];

const seedEvents = async (db) => {
  for (const event of eventFixtures) {
    await db.run(
      `
        INSERT INTO events (
          id, title, date, end_date, location, image, description, content, score,
          target_audience, organizer, volunteer_time, status, deleted_at,
          category, tags, views, featured, likes
        ) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, 'approved', NULL, ?, ?, 0, 0, 0)
      `,
      [
        event.id,
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

const seedProfiles = async (db) => {
  for (const event of eventFixtures) {
    await db.run(
      `
        INSERT INTO event_ai_profiles (
          event_id,
          profile_version,
          source_hash,
          profile_json,
          summary,
          category,
          topic_terms,
          benefit_terms,
          campus_terms,
          audience_terms,
          organizer_terms,
          confidence,
          status,
          last_error,
          model_name,
          model_provider,
          refreshed_at,
          created_at,
          updated_at
        ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', '', 'fixture', 'fixture', datetime('now'), datetime('now'), datetime('now'))
      `,
      [
        event.id,
        buildSourceHash({
          id: event.id,
          title: event.title,
          date: event.date,
          end_date: event.endDate,
          location: event.location,
          category: event.category,
          tags: event.tags,
          description: event.description,
          content: event.content,
          organizer: event.organizer,
          target_audience: event.audience,
          score: event.score,
          volunteer_time: event.volunteerTime,
        }),
        JSON.stringify(event.profile),
        event.profile.summary,
        event.profile.category,
        JSON.stringify(event.profile.topics),
        JSON.stringify(event.profile.benefits),
        JSON.stringify(event.profile.campuses),
        JSON.stringify(event.profile.audiences),
        JSON.stringify(event.profile.organizers),
        event.profile.confidence,
      ]
    );
  }
};

const seedBaseData = async (db, { profiles = true } = {}) => {
  await db.run('INSERT INTO users (id, username, nickname, organization, age) VALUES (1, ?, ?, ?, ?)', [
    'live_eval_user',
    'Live Eval User',
    '计算机学院',
    20,
  ]);
  await db.run(
    `
      INSERT INTO user_event_preferences (
        user_id, college, grade, campus, interest_tags, preferred_categories,
        preferred_benefits, preferred_format
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `,
    ['计算机学院', '本科二年级', '紫金港', 'AI,Agent,产品,志愿', 'competition,lecture,volunteer', 'score,volunteer_time,skill', 'offline']
  );
  await db.run('INSERT INTO favorites (user_id, item_id, item_type) VALUES (1, 1, ?)', ['event']);
  await db.run('INSERT INTO event_registrations (user_id, event_id) VALUES (1, 1)');
  await seedSettings(db);
  await seedEvents(db);
  if (profiles) await seedProfiles(db);
};

const createEvalDb = async ({ profiles = true } = {}) => {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await setupSchema(db);
  const modelConfigs = await copyModelConfigs(db);
  await seedBaseData(db, { profiles });
  return { db, modelConfigs };
};

const getCaseFilter = () => {
  const raw = process.env.AI_LIVE_EVAL_CASES || process.argv.find((arg) => arg.startsWith('--cases='))?.slice('--cases='.length) || '';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const addMetricScore = (checks) => {
  const total = checks.length;
  if (total === 0) return 1;
  return checks.filter((item) => item.pass).length / total;
};

const makeCheck = (name, pass, detail = '') => ({
  name,
  pass: Boolean(pass),
  detail: toText(detail, 260),
});

const evaluateRuntimeJson = async (db) => {
  const result = await aiRuntime.callJson(db, {
    task: 'live_eval_runtime_json',
    messages: [
      {
        role: 'system',
        content: '你是拓途浙享 AI 评测器。只输出合法 JSON，不要 markdown。',
      },
      {
        role: 'user',
        content: JSON.stringify({
          instruction: '返回严格 JSON：{"status":"ok","agent":"runtime","next":"evaluate"}',
        }),
      },
    ],
    temperature: 0,
    maxTokens: 180,
    timeout: 45000,
  });
  const parsed = result.parsed || {};
  const checks = [
    makeCheck('runtime returns object', parsed && typeof parsed === 'object' && !Array.isArray(parsed)),
    makeCheck('status is ok-like', /ok|success|ready|evaluate/i.test(JSON.stringify(parsed))),
    makeCheck('model used', result.modelStatus?.used === true),
    makeCheck('provider is DeepSeek config', String(result.modelStatus?.model || '').includes('DeepSeek')),
  ];
  return {
    score: addMetricScore(checks),
    checks,
    sample: redact({
      parsed,
      modelStatus: result.modelStatus,
    }),
  };
};

const evaluateEventRecommendation = async (db) => {
  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: '我这周想在紫金港参加计算机学院的 AI 活动，最好能有综测，也想做一个能展示的项目。',
    rememberPreference: false,
    allowHistoricalFallback: false,
    now: new Date(),
  });
  const top = result.recommendations?.[0];
  const titles = (result.recommendations || []).map((item) => item.event?.title || '');
  const checks = [
    makeCheck('returns recommendations', result.type === 'recommend' && result.recommendations.length >= 2),
    makeCheck('model rerank used', result.modelStatus?.used === true && result.modelStatus?.tasks?.includes('event_recommendation_rerank')),
    makeCheck('top result is CS AI workshop', top?.event?.id === 1, `top=${top?.event?.title || 'none'}`),
    makeCheck('reasons are grounded', (result.recommendations || []).every((item) => /AI|紫金港|综测|项目|计算机|工作坊|路演|竞赛/.test(`${item.reason} ${item.matchSignals?.join(' ')}`))),
    makeCheck('no music distraction', !titles.slice(0, 3).some((title) => title.includes('音乐'))),
    makeCheck('confidence is useful', Number(top?.confidence || 0) >= 0.65),
  ];
  return {
    score: addMetricScore(checks),
    checks,
    sample: redact({
      type: result.type,
      summary: result.summary,
      topRecommendations: (result.recommendations || []).slice(0, 3).map((item) => ({
        id: item.event?.id,
        title: item.event?.title,
        confidence: item.confidence,
        reason: item.reason,
        matchSignals: item.matchSignals,
      })),
      modelStatus: result.modelStatus,
      reasoningTrace: result.reasoningTrace,
    }),
  };
};

const evaluateEventClarification = async (db) => {
  const result = await runEventAssistantTurn({
    db,
    userId: 1,
    query: '帮我推荐活动',
    rememberPreference: false,
    allowHistoricalFallback: false,
    now: new Date(),
  });
  const provisionalCount = result.provisionalRecommendations?.length || 0;
  const checks = [
    makeCheck('clarifies broad request', result.type === 'clarify'),
    makeCheck('has clear question', toText(result.question, 160).length >= 8),
    makeCheck('has options or provisional results', (result.clarificationOptions?.length || 0) > 0 || provisionalCount > 0),
    makeCheck('model attempted intent', result.modelStatus?.used === true),
  ];
  return {
    score: addMetricScore(checks),
    checks,
    sample: redact({
      type: result.type,
      question: result.question,
      clarificationOptions: result.clarificationOptions,
      provisionalCount,
      modelStatus: result.modelStatus,
    }),
  };
};

const evaluateHackathonCoach = async (db) => {
  const result = await runHackathonAssistant({
    db,
    userId: 1,
    query: '我会用 AI 工具和一点 Python，但前端一般。5 小时黑客松里怎么保证作品能跑起来？给我一个最稳的方向。',
    participantProfile: {
      skills: ['AI 工具', 'Python', '简单后端'],
      concerns: ['前端不稳', '时间很短', '需要可演示'],
    },
  });
  const checks = [
    makeCheck('contract type', result.type === 'hackathon_coach'),
    makeCheck('model used', result.modelStatus?.used === true && result.modelStatus?.fallbackUsed !== true),
    makeCheck('concrete prep plan', result.prepPlan?.length >= 3),
    makeCheck('high risk identified', result.risks?.some((item) => item.severity === 'high' || /范围|时间|前端|跑/.test(`${item.risk} ${item.mitigation}`))),
    makeCheck('fit score useful', Number(result.recommendation?.fitScore || 0) >= 65),
    makeCheck('grounded sources', result.sources?.length > 0),
  ];
  return {
    score: addMetricScore(checks),
    checks,
    sample: redact({
      summary: result.summary,
      recommendation: result.recommendation,
      prepPlan: result.prepPlan,
      risks: result.risks,
      sources: result.sources,
      modelStatus: result.modelStatus,
    }),
  };
};

const evaluateWechatParser = async (db) => {
  const parsed = await parseWithLLM({
    title: '报名 | 计算机学院 AI 产品实战工作坊',
    author: '计算机学院学生科创中心',
    content: [
      '计算机学院 AI 产品实战工作坊开放报名。',
      '时间：2026年5月28日 19:00-21:00。',
      '地点：紫金港校区创意空间 A201。',
      '面向对象：全校学生，尤其欢迎本科生和研究生。',
      '活动内容：围绕大模型、AI Agent、产品原型与 Demo 展示进行实战训练。',
      '参加并完成现场任务可获得综测 0.5。',
      '主办：计算机学院。',
    ].join('\n'),
    coverImage: '',
  }, { db });
  const checks = [
    makeCheck('title extracted', /AI|工作坊|产品/.test(parsed.title || '')),
    makeCheck('date extracted', /^2026-05-28T19:00/.test(parsed.date || ''), parsed.date),
    makeCheck('location extracted', /紫金港|A201|创意空间/.test(parsed.location || '')),
    makeCheck('organizer extracted', /计算机学院/.test(parsed.organizer || '')),
    makeCheck('score extracted', /综测|0\.5/.test(parsed.score || '')),
    makeCheck('standard category', ['lecture', 'competition', 'other'].includes(parsed.category)),
    makeCheck('runtime telemetry', parsed.aiMeta?.runtimeTelemetry?.taskCount >= 1),
  ];
  return {
    score: addMetricScore(checks),
    checks,
    sample: redact({
      title: parsed.title,
      date: parsed.date,
      end_date: parsed.end_date,
      location: parsed.location,
      organizer: parsed.organizer,
      category: parsed.category,
      category_confidence: parsed.category_confidence,
      target_audience: parsed.target_audience,
      score: parsed.score,
      aiMeta: parsed.aiMeta,
    }),
  };
};

const evaluateGovernance = async (db) => {
  const scan = await assistantService.scanEventGovernance(db, {
    limit: 10,
    minConfidence: 0.4,
    userId: 1,
  });
  const allowedFields = new Set(['category', 'target_audience']);
  const checks = [
    makeCheck('scan sees events', scan.summary.scannedEventCount >= 5),
    makeCheck('model review used', scan.summary.modelReview.used === true),
    makeCheck('suggestions generated', scan.suggestions.length >= 1),
    makeCheck('whitelisted fields only', scan.suggestions.every((item) => allowedFields.has(item.field))),
    makeCheck('confidence normalized', scan.suggestions.every((item) => Number(item.confidence) >= 0 && Number(item.confidence) <= 1)),
    makeCheck('runtime telemetry', scan.summary.modelReview.runtimeTelemetry.taskCount >= 1),
  ];
  return {
    score: addMetricScore(checks),
    checks,
    sample: redact({
      summary: scan.summary,
      suggestions: scan.suggestions.slice(0, 5).map((item) => ({
        eventId: item.eventId,
        field: item.field,
        oldValue: item.oldValue,
        newValue: item.newValue,
        confidence: item.confidence,
        reason: item.reason,
      })),
    }),
  };
};

const evaluateProfileIndex = async () => {
  const { db, modelConfigs } = await createEvalDb({ profiles: false });
  try {
    const refresh = await refreshEventProfileIndex(db, {
      limit: 2,
      force: true,
      useModel: true,
      timeout: 60000,
    });
    const rows = await db.all('SELECT * FROM event_ai_profiles ORDER BY event_id ASC LIMIT 2');
    const checks = [
      makeCheck('model configs loaded', modelConfigs.length > 0),
      makeCheck('profiles generated', refresh.summary.generated >= 2),
      makeCheck('model used', refresh.summary.modelUsedCount >= 1),
      makeCheck('coverage updated', refresh.coverage.profileCount >= 2),
      makeCheck('profile fields complete', rows.every((row) => row.summary && row.category && row.profile_json)),
      makeCheck('runtime telemetry', refresh.summary.runtimeTelemetry.taskCount >= 1),
    ];
    return {
      score: addMetricScore(checks),
      checks,
      sample: redact({
        summary: refresh.summary,
        coverage: refresh.coverage,
        profiles: rows.map((row) => ({
          event_id: row.event_id,
          summary: row.summary,
          category: row.category,
          confidence: row.confidence,
          status: row.status,
          model_provider: row.model_provider,
          model_name: row.model_name,
        })),
      }),
    };
  } finally {
    await db.close();
  }
};

const cases = [
  {
    id: 'runtime-json',
    agent: 'model_config_runtime',
    category: 'contract',
    run: evaluateRuntimeJson,
  },
  {
    id: 'event-recommendation-specific',
    agent: 'event_recommendation',
    category: 'quality',
    run: evaluateEventRecommendation,
  },
  {
    id: 'event-recommendation-clarify',
    agent: 'event_recommendation',
    category: 'quality',
    run: evaluateEventClarification,
  },
  {
    id: 'hackathon-coach-new-builder',
    agent: 'hackathon_coach',
    category: 'quality',
    run: evaluateHackathonCoach,
  },
  {
    id: 'wechat-parser-event-post',
    agent: 'wechat_event_parser',
    category: 'contract',
    run: evaluateWechatParser,
  },
  {
    id: 'event-governance-review',
    agent: 'event_governance',
    category: 'safety',
    run: evaluateGovernance,
  },
  {
    id: 'event-profile-index-refresh',
    agent: 'event_profile_index',
    category: 'contract',
    isolated: true,
    run: evaluateProfileIndex,
  },
];

const classifyError = (error) => {
  if (error.category) return error.category;
  if (error.code && /JSON|EMPTY|INVALID|CONTRACT/i.test(error.code)) return 'contract';
  if (error.response?.status === 429 || /429|rate|quota|limit/i.test(error.message || '')) return 'provider';
  if (/429|rate|quota|limit|exceeded/i.test(JSON.stringify(error.attempts || []))) return 'provider';
  if (/timeout|ETIMEDOUT|ECONNRESET|network/i.test(error.message || '')) return 'provider';
  if (/key|auth|401|403/i.test(error.message || '')) return 'infrastructure';
  return 'quality';
};

const suggestFix = (result) => {
  if (result.pass) return '';
  const category = result.failureCategory || result.category;
  if (category === 'contract') return '优先检查输出 JSON contract、字段别名、空输出重试和 JSON repair。';
  if (category === 'safety') return '优先检查白名单校验、候选 ID 校验、字段越权和幻觉事实过滤。';
  if (category === 'provider') return '优先检查供应商限流、超时、重试节奏和小样本过滤。';
  if (category === 'infrastructure') return '优先检查模型配置、数据库配置、密钥解密和本地后端环境。';
  return '优先检查提示词约束、候选上下文质量、排序阈值和用户可读理由。';
};

const hasProviderLimit = (value) => /429|rate|quota|limit|exceeded/i.test(JSON.stringify(value || {}));

const runCase = async (testCase, sharedDb) => {
  const startedAt = Date.now();
  try {
    const result = await testCase.run(sharedDb);
    const pass = result.checks.every((item) => item.pass);
    const providerLimited = hasProviderLimit(result);
    const output = {
      id: testCase.id,
      agent: testCase.agent,
      category: testCase.category,
      pass,
      score: Number((result.score || 0).toFixed(3)),
      durationMs: Date.now() - startedAt,
      checks: result.checks,
      sample: result.sample,
    };
    if (providerLimited) {
      output.failureCategory = 'provider';
      output.providerLimited = true;
    }
    output.suggestedFix = suggestFix(output);
    return output;
  } catch (error) {
    const failureCategory = classifyError(error);
    const output = {
      id: testCase.id,
      agent: testCase.agent,
      category: testCase.category,
      pass: false,
      score: 0,
      durationMs: Date.now() - startedAt,
      failureCategory,
      providerLimited: failureCategory === 'provider',
      error: {
        code: error.code || null,
        message: toText(error.message, 500),
        attempts: redact(error.attempts || []),
        raw: toText(error.rawContent, 1000),
        extracted: toText(error.extractedJson, 1000),
      },
    };
    output.suggestedFix = suggestFix(output);
    return output;
  }
};

const summarize = (results, modelConfigs) => {
  const providerBlocked = results.some((item) => item.providerLimited || hasProviderLimit(item));
  const passCount = results.filter((item) => item.pass).length;
  const total = results.length;
  const averageScore = total
    ? results.reduce((sum, item) => sum + Number(item.score || 0), 0) / total
    : 0;
  const failed = results.filter((item) => !item.pass);
  return {
    ok: !providerBlocked && failed.length === 0 && averageScore >= DEFAULT_SCORE_TARGET,
    providerBlocked,
    providerNote: providerBlocked
      ? '评测期间模型供应商返回限流或额度错误，本轮不能作为助手质量失败结论。'
      : '',
    generatedAt: new Date().toISOString(),
    modelConfigs: redact(modelConfigs),
    total,
    passCount,
    failCount: failed.length,
    passRate: total ? Number((passCount / total).toFixed(3)) : 0,
    averageScore: Number(averageScore.toFixed(3)),
    targetAverageScore: DEFAULT_SCORE_TARGET,
    failedCases: failed.map((item) => ({
      id: item.id,
      agent: item.agent,
      category: item.failureCategory || item.category,
      score: item.score,
      suggestedFix: item.suggestedFix,
      message: item.error?.message || item.checks?.filter((check) => !check.pass).map((check) => check.name).join('; '),
    })),
    slowCases: results
      .filter((item) => Number(item.durationMs || 0) >= 30000)
      .map((item) => ({
        id: item.id,
        agent: item.agent,
        durationMs: item.durationMs,
        score: item.score,
      })),
    agentScores: Object.values(results.reduce((accumulator, item) => {
      const current = accumulator[item.agent] || {
        agent: item.agent,
        total: 0,
        passCount: 0,
        scoreSum: 0,
      };
      current.total += 1;
      current.passCount += item.pass ? 1 : 0;
      current.scoreSum += Number(item.score || 0);
      accumulator[item.agent] = current;
      return accumulator;
    }, {})).map((item) => ({
      agent: item.agent,
      total: item.total,
      passCount: item.passCount,
      averageScore: Number((item.scoreSum / item.total).toFixed(3)),
    })),
    nextFixes: unique(failed.map((item) => item.suggestedFix)).filter(Boolean),
  };
};

const writeReport = (report) => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(OUTPUT_DIR, `ai-live-eval-${stamp}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(redact(report), null, 2)}\n`, 'utf8');
  return filePath;
};

const main = async () => {
  const filter = getCaseFilter();
  const selectedCases = filter.length
    ? cases.filter((testCase) => filter.includes(testCase.id) || filter.includes(testCase.agent))
    : cases;

  if (selectedCases.length === 0) {
    throw new Error(`No live eval cases matched filter: ${filter.join(', ')}`);
  }

  const { db, modelConfigs } = await createEvalDb({ profiles: true });
  const results = [];

  try {
    console.log(`[live-eval] Running ${selectedCases.length} case(s) with ${modelConfigs[0]?.model || 'configured model'}...`);
    for (const testCase of selectedCases) {
      process.stdout.write(`[live-eval] ${testCase.id} (${testCase.agent}) ... `);
      const result = await runCase(testCase, db);
      results.push(result);
      console.log(`${result.pass ? 'PASS' : 'FAIL'} score=${result.score} duration=${result.durationMs}ms`);
    }
  } finally {
    await db.close();
    await pool.close();
  }

  const summary = summarize(results, modelConfigs);
  const report = {
    summary,
    results,
  };
  const reportPath = writeReport(report);

  console.log(JSON.stringify(redact({
    summary,
    reportPath,
  }), null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
};

main().catch(async (error) => {
  console.error('[live-eval] failed:', error.message);
  try {
    await pool.close();
  } catch {}
  process.exitCode = 1;
});
