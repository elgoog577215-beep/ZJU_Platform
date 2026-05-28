const { runEventAssistantTurn } = require('../src/utils/eventAssistant');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const now = new Date('2026-06-01T09:00:00+08:00');

const event = {
  id: 9101,
  title: 'AI Agent Product Workshop',
  date: '2026-06-02 19:00',
  end_date: '2026-06-02 21:00',
  location: 'Zijingang',
  image: null,
  description: 'AI project workshop with comprehensive score information.',
  score: 'comprehensive score',
  target_audience: 'All students',
  organizer: 'College of Computer Science',
  volunteer_time: '',
  status: 'approved',
  deleted_at: null,
  category: 'lecture',
  tags: 'AI,workshop',
  views: 12,
  featured: 0,
  likes: 0
};

const createDelayedDb = ({
  profileDelayMs = 120,
  candidateDelayMs = 120
} = {}) => ({
  async get(sql) {
    if (/FROM users WHERE id = \?/i.test(sql)) {
      await delay(profileDelayMs);
      return {
        id: 7,
        username: 'speed-user',
        nickname: 'Speed User',
        organization: 'College of Computer Science',
        organization_cr: '',
        gender: '',
        age: null
      };
    }
    if (/FROM user_event_preferences WHERE user_id = \?/i.test(sql)) {
      return null;
    }
    return null;
  },
  async all(sql) {
    if (/FROM events\s+WHERE status = 'approved'/i.test(sql)) {
      await delay(candidateDelayMs);
      return [event];
    }
    return [];
  },
  async run() {
    return { changes: 1 };
  }
});

const modelRunner = async ({ task }) => {
  if (task === 'event_recommendation_intent') {
    return {
      query_summary: '用户想找紫金港 AI 项目活动',
      topics: ['AI', 'project'],
      campuses: ['Zijingang'],
      benefits: ['score', 'skill'],
      categories: ['lecture'],
      hard_constraints: ['AI topic', 'Zijingang'],
      confidence: 0.92
    };
  }

  if (task === 'event_recommendation_rerank') {
    return {
      recommendations: [
        {
          id: event.id,
          confidence: 0.94,
          reason: '匹配 AI 项目实践、紫金港地点和综测收益。',
          matched_signals: ['AI topic', 'Zijingang', 'score']
        }
      ],
      summary: '已按 AI、紫金港和综测优先排序。',
      confidence: 0.94
    };
  }

  return {};
};

const main = async () => {
  const profileDelayMs = 120;
  const candidateDelayMs = 120;
  const startedAt = Date.now();
  const result = await runEventAssistantTurn({
    db: createDelayedDb({ profileDelayMs, candidateDelayMs }),
    query: 'Find me a Zijingang AI activity with score.',
    userId: 7,
    modelRunner,
    now,
    rememberPreference: false
  });
  const elapsedMs = Date.now() - startedAt;
  const startupSerialMs = profileDelayMs + candidateDelayMs;
  const startupParallelBudgetMs = Math.max(profileDelayMs, candidateDelayMs) + 90;
  const performance = result.modelStatus?.performance || {};

  if (elapsedMs >= startupSerialMs) {
    throw new Error(`Assistant startup appears serial: elapsed=${elapsedMs}ms serial=${startupSerialMs}ms`);
  }
  if (Number(performance.profileLoadMs || 0) < profileDelayMs) {
    throw new Error(`Missing profile startup timing: ${JSON.stringify(performance)}`);
  }
  if (Number(performance.candidateLoadMs || 0) < candidateDelayMs) {
    throw new Error(`Missing candidate startup timing: ${JSON.stringify(performance)}`);
  }
  if (elapsedMs > startupParallelBudgetMs) {
    throw new Error(`Assistant startup exceeded parallel budget: elapsed=${elapsedMs}ms budget=${startupParallelBudgetMs}ms`);
  }

  console.log(JSON.stringify({
    ok: true,
    elapsedMs,
    startupSerialMs,
    startupParallelBudgetMs,
    profileLoadMs: performance.profileLoadMs,
    candidateLoadMs: performance.candidateLoadMs,
    recommendationCount: result.recommendations?.length || 0
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
