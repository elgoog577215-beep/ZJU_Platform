const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const { runEventAssistantTurn } = require('../src/utils/eventAssistant');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const daysFromNow = (days, hour = 14) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`;
};

const openMemoryDb = () => open({
  filename: ':memory:',
  driver: sqlite3.Database
});

const setupSchema = async (db) => {
  await db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      nickname TEXT,
      organization TEXT,
      organization_cr TEXT,
      gender TEXT,
      age INTEGER
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

const seedEvents = async (db) => {
  await db.run(
    `
      INSERT INTO events (
        title, date, end_date, location, image, description, content, score,
        target_audience, organizer, volunteer_time, status, deleted_at,
        category, views, featured, likes
      ) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, 'approved', NULL, ?, ?, ?, ?)
    `,
    [
      'AI 创新应用工作坊',
      daysFromNow(3, 19),
      daysFromNow(3, 21),
      '紫金港校区 创意空间',
      '面向对 AI 应用和项目实践感兴趣的学生，现场完成小组实践。',
      '<p>AI workshop</p>',
      '综测 0.5',
      '全校学生',
      '计算机学院',
      '',
      'workshop',
      12,
      0,
      2
    ]
  );

  await db.run(
    `
      INSERT INTO events (
        title, date, end_date, location, image, description, content, score,
        target_audience, organizer, volunteer_time, status, deleted_at,
        category, views, featured, likes
      ) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, 'approved', NULL, ?, ?, ?, ?)
    `,
    [
      '经典音乐分享会',
      daysFromNow(2, 15),
      daysFromNow(2, 17),
      '玉泉校区 小剧场',
      '古典音乐赏析和社交交流。',
      '<p>music</p>',
      '',
      '全校学生',
      '艺术社',
      '',
      'culture_sports',
      100,
      1,
      12
    ]
  );

  await db.run(
    `
      INSERT INTO events (
        title, date, end_date, location, image, description, content, score,
        target_audience, organizer, volunteer_time, status, deleted_at,
        category, views, featured, likes
      ) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, 'approved', NULL, ?, ?, ?, ?)
    `,
    [
      '志愿服务说明会',
      daysFromNow(5, 10),
      daysFromNow(5, 11),
      '紫金港校区 学生活动中心',
      '介绍公益服务项目和志愿时长认定。',
      '<p>volunteer</p>',
      '',
      '本科生',
      '青年志愿者协会',
      '2 小时',
      'volunteer',
      30,
      0,
      3
    ]
  );
};

const buildModelRunner = () => async ({ task, messages }) => {
  if (task === 'event_recommendation_intent') {
    return {
      query_summary: '用户想在紫金港参加 AI 相关且有综测收益的活动',
      topics: ['AI', '人工智能', '实践'],
      campuses: ['紫金港'],
      organizers: ['计算机学院'],
      audiences: ['全校学生'],
      benefits: ['score'],
      categories: ['workshop'],
      date_constraints: [],
      format: 'offline',
      allow_historical: false,
      needs_clarification: false,
      clarification_question: '',
      confidence: 0.93
    };
  }

  if (task === 'event_profile') {
    const payload = JSON.parse(messages[1].content);
    const event = payload.event || {};
    const isAi = String(event.title || '').includes('AI');
    return {
      summary: isAi ? 'AI 应用实践活动，适合想做项目并获得综测的学生。' : '普通校园活动。',
      category: isAi ? 'workshop' : event.category || 'other',
      topics: isAi ? ['AI', '人工智能', '实践'] : [event.title],
      campuses: String(event.location || '').includes('紫金港') ? ['紫金港'] : [],
      organizers: event.organizer ? [event.organizer] : [],
      audiences: event.target_audience ? [event.target_audience] : [],
      benefits: String(event.score || '').includes('综测') ? ['score'] : [],
      time_preference_terms: [],
      confidence: isAi ? 0.92 : 0.62,
      rationale: isAi ? '标题、描述和收益都匹配 AI 与综测需求。' : '候选活动画像。'
    };
  }

  if (task === 'event_recommendation_rerank') {
    const payload = JSON.parse(messages[1].content);
    const aiEvent = payload.candidates.find((candidate) => String(candidate.title).includes('AI'));
    const fallback = payload.candidates.filter((candidate) => candidate.id !== aiEvent?.id);
    return {
      summary: 'AI 优先选择了同时匹配主题、校区和综测收益的活动。',
      recommendations: [
        {
          id: aiEvent.id,
          rank: 1,
          confidence: 0.96,
          reason: '它同时匹配 AI 主题、紫金港校区和综测收益，是最贴近需求的选择。',
          matched_signals: ['AI 主题', '紫金港', '综测']
        },
        ...fallback.slice(0, 2).map((candidate, index) => ({
          id: candidate.id,
          rank: index + 2,
          confidence: 0.68 - index * 0.05,
          reason: '它与部分校园参与需求接近，可作为次相关备选。',
          matched_signals: ['校园活动']
        }))
      ]
    };
  }

  throw new Error(`Unexpected AI task: ${task}`);
};

const main = async () => {
  const db = await openMemoryDb();
  try {
    await setupSchema(db);
    await seedEvents(db);

    const result = await runEventAssistantTurn({
      db,
      query: '我想在紫金港参加 AI 相关活动，最好有综测',
      allowHistoricalFallback: false,
      modelRunner: buildModelRunner(),
      now: new Date()
    });

    assert(result.type === 'recommend', 'Expected AI recommendation response.');
    assert(result.modelStatus?.used === true, 'Expected modelStatus.used to be true.');
    assert(
      result.modelStatus.tasks?.includes('event_recommendation_rerank'),
      'Expected rerank task in model status.'
    );
    assert(
      result.recommendations[0]?.event?.title === 'AI 创新应用工作坊',
      'Expected model rerank to place the AI workshop first.'
    );
    assert(
      result.recommendations[0]?.confidence >= 0.9,
      'Expected model confidence to be carried to the client response.'
    );
    assert(
      result.modelStatus.profileStats.generated >= 1,
      'Injected model runner should still exercise profile generation in tests.'
    );

    const storedProfiles = await db.get('SELECT COUNT(*) AS count FROM event_ai_profiles');
    assert(Number(storedProfiles.count) >= 1, 'Expected event AI profiles to be stored.');

    const fallbackDb = await openMemoryDb();
    try {
      await setupSchema(fallbackDb);
      await seedEvents(fallbackDb);
      const fallback = await runEventAssistantTurn({
        db: fallbackDb,
        query: '我想在紫金港参加 AI 相关活动，最好有综测',
        allowHistoricalFallback: false,
        modelRunner: async ({ task }) => {
          if (task === 'event_recommendation_intent') {
            const error = new Error('simulated empty model output');
            error.code = 'AI_RUNTIME_EMPTY_CONTENT';
            throw error;
          }
          if (task === 'event_profile') {
            return {
              summary: '活动画像备用测试',
              category: 'workshop',
              topics: ['AI'],
              campuses: ['紫金港'],
              organizers: [],
              audiences: ['全校学生'],
              benefits: ['score'],
              confidence: 0.7,
              rationale: 'test'
            };
          }
          throw new Error(`Unexpected fallback task: ${task}`);
        },
        now: new Date()
      });

      assert(fallback.type === 'recommend', 'Expected fallback recommendation when intent model fails.');
      assert(fallback.modelStatus?.fallbackUsed === true, 'Expected fallback status to be explicit.');
      assert(fallback.modelStatus?.used === false, 'Fallback recommendation must not pretend model rerank succeeded.');
      assert(fallback.recommendations.length >= 1, 'Expected fallback recommendations to be visible.');
      assert(
        fallback.recommendations[0]?.event?.title === 'AI 创新应用工作坊',
        'Expected fallback semantic ranking to still put the AI workshop first.'
      );
      assert(
        fallback.modelStatus.profileStats.fallback >= 1,
        'Expected fallback path to use lightweight local profile indexing.'
      );
    } finally {
      await fallbackDb.close();
    }

    console.log('Unified AI runtime check passed.');
  } finally {
    await db.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
