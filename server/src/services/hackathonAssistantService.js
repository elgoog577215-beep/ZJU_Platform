const { runStructuredTask, toText } = require('./assistantOrchestratorService');
const aiRuntime = require('./unifiedAiRuntimeService');

const MAX_QUERY_LENGTH = 600;

const QUICK_CONTEXT_CARD_IDS = [
  'format',
  'tools',
  'judging',
  'deliverables',
];

const DEFAULT_HACKATHON_PARTNERS = [
  'MiniMax',
  '阿里云 Qoder',
  'Bonjour',
  '魔搭',
  '阶跃星辰',
];

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const normalizeArray = (value, maxItems = 8) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return toText(item, 260);
      if (item && typeof item === 'object') return item;
      return '';
    })
    .filter(Boolean)
    .slice(0, maxItems);
};

const parsePartnerList = (value) => toText(value, 1000)
  .split(/[,，、/|]/)
  .map((item) => toText(item, 60))
  .filter(Boolean);

const getSettingsMap = async (db) => {
  if (!db) return {};
  try {
    const rows = await db.all('SELECT key, value FROM settings');
    return rows.reduce((accumulator, row) => {
      accumulator[row.key] = row.value;
      return accumulator;
    }, {});
  } catch {
    return {};
  }
};

const getEcosystemPartnerNames = async (db) => {
  if (!db) return null;
  try {
    const rows = await db.all(`
      SELECT name
      FROM ecosystem_partners
      WHERE deleted_at IS NULL
        AND enabled = 1
        AND featured = 1
      ORDER BY
        CASE category
          WHEN 'school' THEN 1
          WHEN 'organization' THEN 2
          WHEN 'enterprise' THEN 3
          ELSE 4
        END,
        sort_order ASC,
        id ASC
    `);
    return rows.map((row) => toText(row.name, 80)).filter(Boolean);
  } catch {
    return null;
  }
};

const buildHackathonProfile = (settings = {}, ecosystemPartnerNames = null) => {
  const partnerNames = Array.isArray(ecosystemPartnerNames)
    ? ecosystemPartnerNames
    : [
      ...parsePartnerList(settings.hackathon_partners),
      ...DEFAULT_HACKATHON_PARTNERS,
    ];

  return {
  title: toText(settings.hackathon_title, 120) || 'AI 全栈极速黑客松',
  subtitle: '5小时、个人赛、0路演',
  date: toText(settings.hackathon_date, 120) || '5月10日 9:00 A.M.',
  location: toText(settings.hackathon_location, 120) || '西一-112',
  format: toText(settings.hackathon_format, 120) || '个人赛',
  duration: toText(settings.hackathon_duration, 80) || '5 小时',
  description: toText(settings.hackathon_desc, 500)
    || '在限定时间内独立完成一个可运行的 AI 应用，允许使用 AI 开发工具，作品完成度优先。',
  partners: unique(partnerNames).slice(0, 16),
  rules: [
    '个人独立完成',
    '允许并鼓励使用 Codex、Claude、Cursor、Trae 等 AI 工具',
    '现场完成一个可运行、可体验、能说明问题的 AI 应用',
    '不以路演包装为主，作品完成度和真实体验优先',
  ],
  };
};

const buildContextCards = (profile) => [
  {
    id: 'partners',
    title: '支持阵容',
    keywords: ['合作方', '赞助', '支持', '学校', '社团', '企业', '伙伴', '生态'],
    content: profile.partners.length
      ? `当前支持阵容包括：${profile.partners.join('、')}。`
      : '当前支持阵容暂未公开，以页面最新发布信息为准。',
  },
  {
    id: 'format',
    title: '赛制',
    keywords: ['赛制', '规则', '时间', '多久', '个人', '组队', '报名', '形式'],
    content: `${profile.title} 是 ${profile.format}，核心节奏是 ${profile.duration} 内完成可运行作品。`,
  },
  {
    id: 'tools',
    title: 'AI 工具',
    keywords: ['工具', 'codex', 'cursor', 'claude', 'trae', 'qoder', '模型', 'api'],
    content: '允许使用 AI 开发工具。更推荐把 AI 用在需求拆解、代码生成、调试、测试、文案和数据处理上，而不是只做一个包装页面。',
  },
  {
    id: 'judging',
    title: '评审重点',
    keywords: ['评分', '评审', '获奖', '奖金', '标准', '看什么'],
    content: '建议把优先级放在真实问题、可运行程度、AI 原生能力、体验完整性和现场稳定性上。',
  },
  {
    id: 'deliverables',
    title: '交付物',
    keywords: ['交付', '提交', '作品', 'demo', '演示', '路演'],
    content: '最稳的交付是一个能打开、能走完整流程、有清楚输入输出、有少量示例数据的应用。',
  },
  {
    id: 'beginner',
    title: '新手路径',
    keywords: ['新手', '不会', '零基础', '没经验', '适合吗', '前端'],
    content: '新手更适合做范围小但闭环完整的工具，例如资料整理、活动推荐、简历润色、校园服务问答或自动化表单助手。',
  },
  {
    id: 'builder',
    title: '工程路径',
    keywords: ['后端', 'python', 'react', '全栈', '数据库', '接口', '工程'],
    content: '有工程基础的参赛者可以做带数据、登录状态、AI 调用和结果保存的完整小应用，注意减少技术栈数量。',
  },
  {
    id: 'product',
    title: '产品路径',
    keywords: ['产品', '设计', '不会代码', '用户', '场景', '需求'],
    content: '偏产品/设计的参赛者可以把目标放在场景选择、交互闭环、提示词体验和高质量样例上，用 AI 工具补齐实现。',
  },
  {
    id: 'event_day',
    title: '现场策略',
    keywords: ['现场', '准备', '当天', '5小时', '计划', '节奏'],
    content: '现场建议先冻结范围，再做最短主流程，最后补样例、错误状态和演示数据。不要把时间耗在大而全的架构上。',
  },
  {
    id: 'risk_scope',
    title: '范围风险',
    keywords: ['风险', '来不及', '太难', '时间', '失败'],
    content: '最大风险是范围过大。建议只保留一个核心用户、一个关键输入、一个关键输出和一个可复用 AI 能力。',
  },
  {
    id: 'registration',
    title: '报名信息',
    keywords: ['报名', '登记', '学号', '专业', '年级', '微信群'],
    content: `页面报名表会收集姓名、学号、专业、年级、常用 AI 工具和项目经历；地点信息为 ${profile.location}。`,
  },
];

const includesKeyword = (text, keyword) => text.includes(keyword.toLowerCase());

const detectIntent = (query) => {
  const text = query.toLowerCase();
  const goals = [];
  const profileSignals = [];

  if (['适合', '能参加', '要不要', '可以参加', '水平'].some((item) => includesKeyword(text, item))) {
    goals.push('suitability');
  }
  if (['准备', '怎么做', '计划', '当天', '5小时', '时间'].some((item) => includesKeyword(text, item))) {
    goals.push('preparation');
  }
  if (['工具', 'codex', 'cursor', 'claude', 'trae', 'qoder', 'api'].some((item) => includesKeyword(text, item))) {
    goals.push('tooling');
  }
  if (['评分', '评审', '获奖', '奖金', '标准'].some((item) => includesKeyword(text, item))) {
    goals.push('judging');
  }
  if (['交付', '提交', '作品', 'demo', '路演'].some((item) => includesKeyword(text, item))) {
    goals.push('deliverable');
  }

  if (['不会前端', '前端不强', '不会代码', '零基础', '新手'].some((item) => includesKeyword(text, item))) {
    profileSignals.push('beginner_or_non_frontend');
  }
  if (['python', '后端', '数据库', '接口', 'react', '全栈'].some((item) => includesKeyword(text, item))) {
    profileSignals.push('engineering');
  }
  if (['产品', '设计', '运营', '用户'].some((item) => includesKeyword(text, item))) {
    profileSignals.push('product_design');
  }
  if (['codex', 'cursor', 'claude', 'trae', 'qoder'].some((item) => includesKeyword(text, item))) {
    profileSignals.push('ai_tool_user');
  }

  return {
    primaryGoal: goals[0] || 'general_advice',
    goals: unique(goals.length ? goals : ['general_advice']),
    profileSignals: unique(profileSignals),
    confidence: goals.length || profileSignals.length ? 0.68 : 0.48,
  };
};

const scoreCard = (card, query, intent) => {
  const text = query.toLowerCase();
  let score = QUICK_CONTEXT_CARD_IDS.includes(card.id) ? 1 : 0;
  for (const keyword of card.keywords) {
    if (includesKeyword(text, keyword)) score += 3;
  }
  if (intent.profileSignals.includes('beginner_or_non_frontend') && card.id === 'beginner') score += 5;
  if (intent.profileSignals.includes('engineering') && card.id === 'builder') score += 5;
  if (intent.profileSignals.includes('product_design') && card.id === 'product') score += 5;
  if (intent.goals.includes('preparation') && card.id === 'event_day') score += 4;
  if (intent.goals.includes('tooling') && card.id === 'tools') score += 4;
  if (intent.goals.includes('judging') && card.id === 'judging') score += 4;
  if (intent.goals.includes('deliverable') && card.id === 'deliverables') score += 4;
  return score;
};

const selectContextCards = (cards, query, intent) => cards
  .map((card) => ({ ...card, score: scoreCard(card, query, intent) }))
  .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
  .slice(0, 7)
  .map(({ score, ...card }) => card);

const inferFallbackTrack = (intent) => {
  if (intent.profileSignals.includes('engineering')) return 'AI 工具型全栈应用';
  if (intent.profileSignals.includes('product_design')) return '校园场景 AI 产品原型';
  if (intent.profileSignals.includes('beginner_or_non_frontend')) return '小而完整的 AI 助手工具';
  return '问题明确、闭环短的 AI 应用';
};

const buildFallbackResponse = ({
  query,
  profile,
  intent,
  contextCards,
  failedTask,
  failureMessage,
}) => {
  const track = inferFallbackTrack(intent);
  return {
    type: 'hackathon_coach',
    query,
    summary: `建议你把目标收敛到「${track}」：范围要小，但必须能完整跑通。`,
    intent,
    recommendation: {
      track,
      focus: '先做一个真实可用的主流程，再用 AI 工具补齐实现、测试和展示样例。',
      fitScore: Math.round((intent.confidence + 0.2) * 100),
      rationale: '备用策略根据你的问题关键词、赛制信息和参赛风险卡片生成，优先保证可执行。',
      nextAction: '写下一个用户、一个输入、一个输出，然后马上做最短 demo。',
    },
    prepPlan: [
      {
        step: 1,
        title: '冻结题目',
        detail: '选择一个你 5 小时内能解释清楚的校园/学习/效率场景。',
      },
      {
        step: 2,
        title: '搭最短流程',
        detail: '只保留输入、AI 处理、结果展示三个环节，先让它能跑。',
      },
      {
        step: 3,
        title: '准备样例',
        detail: '提前准备 2-3 条能体现效果的输入，避免现场临时找材料。',
      },
      {
        step: 4,
        title: '最后打磨',
        detail: '补充错误状态、加载状态和一段清楚的作品说明。',
      },
    ],
    strategy: {
      eventDay: '前 45 分钟定范围，中间 3 小时做主流程，最后 60-75 分钟做稳定性和样例。',
      tooling: '让 AI 工具帮你生成代码、排错和写测试，但关键产品判断自己定。',
      delivery: '交付一个能现场打开并完成核心流程的 demo。',
    },
    risks: [
      {
        risk: '范围过大',
        mitigation: '砍到一个核心用户和一个核心动作。',
        severity: 'high',
      },
      {
        risk: '模型/API 不稳定',
        mitigation: '准备静态样例、错误提示和降级结果。',
        severity: 'medium',
      },
    ],
    sources: contextCards.map((card) => ({
      id: card.id,
      title: card.title,
    })),
    suggestedQuestions: [
      '我会一点 Python，5 小时做什么最稳？',
      '不会前端怎么参加这场黑客松？',
      '现场当天时间应该怎么分配？',
    ],
    confidence: clampNumber(intent.confidence, 0, 1, 0.55),
    warnings: [
      '本轮大模型没有完成可靠结构化输出，当前结果使用本地赛事画像和策略索引生成。',
    ],
    modelStatus: {
      used: false,
      fallbackUsed: true,
      task: 'hackathon_ai_coach_fallback',
      failedTask,
      message: toText(failureMessage, 240),
    },
    eventProfile: {
      title: profile.title,
      date: profile.date,
      location: profile.location,
      format: profile.format,
      duration: profile.duration,
    },
  };
};

const normalizeIntent = (rawIntent, fallbackIntent) => ({
  primaryGoal: toText(rawIntent?.primaryGoal || rawIntent?.primary_goal, 80)
    || fallbackIntent.primaryGoal,
  goals: unique([
    ...normalizeArray(rawIntent?.goals, 8).map((item) => toText(item, 80)),
    ...fallbackIntent.goals,
  ]).slice(0, 8),
  profileSignals: unique([
    ...normalizeArray(rawIntent?.profileSignals || rawIntent?.profile_signals, 8)
      .map((item) => toText(item, 80)),
    ...fallbackIntent.profileSignals,
  ]).slice(0, 8),
  confidence: clampNumber(rawIntent?.confidence, 0, 1, fallbackIntent.confidence),
});

const normalizePrepPlan = (value, fallback) => {
  const items = normalizeArray(value, 6)
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          step: index + 1,
          title: item,
          detail: item,
        };
      }
      return {
        step: Number.isInteger(Number(item.step)) ? Number(item.step) : index + 1,
        title: toText(item.title, 80) || `步骤 ${index + 1}`,
        detail: toText(item.detail || item.description, 260),
      };
    })
    .filter((item) => item.title || item.detail);

  return items.length ? items : fallback.prepPlan;
};

const normalizeRisks = (value, fallback) => {
  const items = normalizeArray(value, 5)
    .map((item) => {
      if (typeof item === 'string') {
        return {
          risk: item,
          mitigation: '',
          severity: 'medium',
        };
      }
      return {
        risk: toText(item.risk || item.title, 120),
        mitigation: toText(item.mitigation || item.solution, 220),
        severity: ['low', 'medium', 'high'].includes(item.severity) ? item.severity : 'medium',
      };
    })
    .filter((item) => item.risk);

  return items.length ? items : fallback.risks;
};

const normalizeSources = (value, contextCards) => {
  const allowed = new Map(contextCards.map((card) => [card.id, card]));
  const items = normalizeArray(value, 8)
    .map((item) => {
      const id = toText(typeof item === 'string' ? item : item.id, 80);
      const card = allowed.get(id);
      if (!card) return null;
      return { id: card.id, title: card.title };
    })
    .filter(Boolean);

  return items.length
    ? items
    : contextCards.slice(0, 5).map((card) => ({ id: card.id, title: card.title }));
};

const normalizeModelResponse = ({
  raw,
  fallback,
  fallbackIntent,
  contextCards,
  profile,
  query,
  modelStatus,
}) => ({
  type: 'hackathon_coach',
  query,
  summary: toText(raw.summary, 320) || fallback.summary,
  intent: normalizeIntent(raw.intent, fallbackIntent),
  recommendation: {
    track: toText(raw.recommendation?.track, 120) || fallback.recommendation.track,
    focus: toText(raw.recommendation?.focus, 260) || fallback.recommendation.focus,
    fitScore: clampNumber(raw.recommendation?.fitScore || raw.recommendation?.fit_score, 0, 100, fallback.recommendation.fitScore),
    rationale: toText(raw.recommendation?.rationale, 320) || fallback.recommendation.rationale,
    nextAction: toText(raw.recommendation?.nextAction || raw.recommendation?.next_action, 220)
      || fallback.recommendation.nextAction,
  },
  prepPlan: normalizePrepPlan(raw.prepPlan || raw.prep_plan, fallback),
  strategy: {
    eventDay: toText(raw.strategy?.eventDay || raw.strategy?.event_day, 260)
      || fallback.strategy.eventDay,
    tooling: toText(raw.strategy?.tooling, 260) || fallback.strategy.tooling,
    delivery: toText(raw.strategy?.delivery, 260) || fallback.strategy.delivery,
  },
  risks: normalizeRisks(raw.risks, fallback),
  sources: normalizeSources(raw.sources, contextCards),
  suggestedQuestions: normalizeArray(raw.suggestedQuestions || raw.suggested_questions, 4)
    .map((item) => toText(item, 120))
    .filter(Boolean)
    .slice(0, 4),
  confidence: clampNumber(raw.confidence, 0, 1, fallback.confidence),
  warnings: normalizeArray(raw.warnings, 4).map((item) => toText(item, 160)).filter(Boolean),
  modelStatus: {
    ...(modelStatus || {}),
    used: true,
    fallbackUsed: false,
    tasks: ['hackathon_intent_context', 'hackathon_ai_coach'],
  },
  eventProfile: {
    title: profile.title,
    date: profile.date,
    location: profile.location,
    format: profile.format,
    duration: profile.duration,
  },
});

const buildOutputContract = () => ({
  summary: 'Chinese answer in 1-2 concise sentences',
  intent: {
    primaryGoal: 'suitability | preparation | tooling | judging | deliverable | general_advice',
    goals: ['short normalized goals'],
    profileSignals: ['skills or constraints inferred from user text'],
    confidence: '0-1 number',
  },
  recommendation: {
    track: 'recommended project/participation track',
    focus: 'what to optimize for',
    fitScore: '0-100 number',
    rationale: 'why this fits the user and event',
    nextAction: 'one concrete next action',
  },
  prepPlan: [
    { step: 1, title: 'short title', detail: 'concrete action' },
  ],
  strategy: {
    eventDay: 'time allocation strategy',
    tooling: 'AI tool strategy',
    delivery: 'demo/submission strategy',
  },
  risks: [
    { risk: 'risk name', mitigation: 'mitigation', severity: 'low | medium | high' },
  ],
  sources: [
    { id: 'one of provided context card ids' },
  ],
  suggestedQuestions: ['follow-up question'],
  confidence: '0-1 number',
  warnings: ['only include if needed'],
});

const recordHackathonRun = async (db, result) => {
  if (!db || !result) return;
  try {
    await db.run(
      `
        INSERT INTO ai_assistant_runs (
          module,
          action,
          status,
          requested_by,
          summary_json
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        'hackathon_coach',
        'coach',
        'completed',
        null,
        JSON.stringify({
          queryLength: result.query?.length || 0,
          modelUsed: Boolean(result.modelStatus?.used),
          fallbackUsed: Boolean(result.modelStatus?.fallbackUsed),
          confidence: result.confidence,
          primaryGoal: result.intent?.primaryGoal || null,
          sourceCount: result.sources?.length || 0,
          runtimeTelemetry: aiRuntime.summarizeModelStatusTelemetry(result.modelStatus),
        }),
      ]
    );
  } catch {
    // Older local test databases may not include assistant run tables; coaching should still work.
  }
};

const runHackathonAssistant = async ({
  db,
  query,
  participantProfile = {},
  userId = null,
  modelRunner,
}) => {
  const normalizedQuery = toText(query, MAX_QUERY_LENGTH);
  if (!normalizedQuery) {
    const error = new Error('Query is required.');
    error.code = 'HACKATHON_ASSISTANT_BAD_REQUEST';
    error.statusCode = 400;
    throw error;
  }

  const [settings, ecosystemPartnerNames] = await Promise.all([
    getSettingsMap(db),
    getEcosystemPartnerNames(db),
  ]);
  const profile = buildHackathonProfile(settings, ecosystemPartnerNames);
  const allCards = buildContextCards(profile);
  const intent = detectIntent(normalizedQuery);
  const contextCards = selectContextCards(allCards, normalizedQuery, intent);
  const fallback = buildFallbackResponse({
    query: normalizedQuery,
    profile,
    intent,
    contextCards,
  });

  try {
    const result = await runStructuredTask(db, {
      task: 'hackathon_ai_coach',
      modelRunner,
      temperature: 0.25,
      maxTokens: 1500,
      timeout: 45000,
      systemPrompt: [
        'You are the AI coach for a Zhejiang University AI full-stack hackathon.',
        'You must reason with the large model, but every answer must stay grounded in the provided event profile and context cards.',
        'Be specific, practical, and honest about risk. Do not invent rules, dates, prizes, sponsors, or judging policies that are not present in context.',
        'If the user is deciding whether/how to participate, act like a senior builder helping them choose a small shippable scope.',
      ].join('\n'),
      payload: {
        task: 'hackathon_ai_coach',
        query: normalizedQuery,
        userId,
        participantProfile,
        detectedIntent: intent,
        eventProfile: profile,
        contextCards,
        allAvailableCardIds: allCards.map((card) => card.id),
      },
      outputContract: buildOutputContract(),
    });

    const response = normalizeModelResponse({
      raw: result.parsed,
      fallback,
      fallbackIntent: intent,
      contextCards,
      profile,
      query: normalizedQuery,
      modelStatus: result.modelStatus,
    });
    await recordHackathonRun(db, response);
    return response;
  } catch (error) {
    const response = buildFallbackResponse({
      query: normalizedQuery,
      profile,
      intent,
      contextCards,
      failedTask: 'hackathon_ai_coach',
      failureMessage: error.message,
    });
    await recordHackathonRun(db, response);
    return response;
  }
};

module.exports = {
  MAX_QUERY_LENGTH,
  buildHackathonProfile,
  buildContextCards,
  detectIntent,
  getEcosystemPartnerNames,
  runHackathonAssistant,
};
