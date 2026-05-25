const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const {
  loadScopedCandidates,
  runEventAssistantTurn
} = require('../src/utils/eventAssistant');

const workspaceRoot = path.join(__dirname, '..');
const defaultDbPath = path.join(workspaceRoot, 'database.sqlite');
const backupDbPath = path.join(workspaceRoot, '../../backups/db_20260319_030001.sqlite');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const openDb = (filename) => open({
  filename,
  driver: sqlite3.Database
});

const buildRecommendRunner = (reasonPrefix) => async ({ task, messages }) => {
  if (task === 'event_recommendation_intent') {
    return {
      query_summary: '用户想找线下、适合新生或近期可参加的活动',
      topics: ['新生', '校园活动'],
      campuses: [],
      organizers: [],
      audiences: ['新生'],
      benefits: [],
      categories: [],
      date_constraints: [],
      format: 'offline',
      hard_constraints: ['线下', '新生'],
      allow_historical: false,
      needs_clarification: false,
      clarification_question: '',
      confidence: 0.86
    };
  }

  if (task === 'event_profile') {
    const payload = JSON.parse(messages[1].content);
    const event = payload.event || {};
    return {
      summary: event.description || event.title || '候选活动',
      category: event.category || 'other',
      topics: [event.title || '校园活动'],
      campuses: event.location ? [event.location] : [],
      organizers: event.organizer ? [event.organizer] : [],
      audiences: event.target_audience ? [event.target_audience] : [],
      benefits: [
        event.score ? 'score' : '',
        event.volunteer_time ? 'volunteer_time' : ''
      ].filter(Boolean),
      time_preference_terms: [],
      confidence: 0.72,
      rationale: '验证脚本使用的稳定活动画像。'
    };
  }

  if (task === 'event_recommendation_rerank') {
    const payload = JSON.parse(messages[1].content);
    const candidates = payload.candidates || [];
    return {
      summary: `${reasonPrefix}，优先选择候选池中更贴近需求的活动。`,
      recommendations: candidates.slice(0, Math.min(3, candidates.length)).map((candidate, index) => ({
        id: candidate.id,
        rank: index + 1,
        confidence: index === 0 ? 0.88 : 0.7,
        reason: `${reasonPrefix} ${index + 1}`,
        matched_signals: candidate.deterministicSignals?.slice(0, 3) || ['候选活动匹配']
      })),
      reasoning_trace: {
        ranking_basis: ['候选活动匹配', '活动画像匹配'],
        uncertainty: [],
        action_evidence_used: false
      }
    };
  }

  throw new Error(`Unexpected event assistant verify task: ${task}`);
};

const buildInvalidIdRunner = async ({ task, messages }) => {
  if (task === 'event_recommendation_intent') {
    return {
      query_summary: '用户想找线下、适合新生且最好有综测的活动',
      topics: ['新生'],
      campuses: [],
      organizers: [],
      audiences: ['新生'],
      benefits: ['score'],
      categories: [],
      date_constraints: [],
      format: 'offline',
      hard_constraints: ['线下', '新生', '综测'],
      allow_historical: false,
      needs_clarification: false,
      clarification_question: '',
      confidence: 0.9
    };
  }

  if (task === 'event_profile') {
    const payload = JSON.parse(messages[1].content);
    const event = payload.event || {};
    return {
      summary: event.description || event.title || '候选活动',
      category: event.category || 'other',
      topics: [event.title || '校园活动'],
      campuses: event.location ? [event.location] : [],
      organizers: event.organizer ? [event.organizer] : [],
      audiences: event.target_audience ? [event.target_audience] : [],
      benefits: event.score ? ['score'] : [],
      time_preference_terms: [],
      confidence: 0.7,
      rationale: '验证非法 ID 防护时使用的候选画像。'
    };
  }

  if (task === 'event_recommendation_rerank') {
    return {
      summary: '非法 ID 测试',
      recommendations: [{ id: 999999, rank: 1, confidence: 0.9, reason: 'bad id', matched_signals: ['bad'] }],
      reasoning_trace: {
        ranking_basis: ['bad'],
        uncertainty: [],
        action_evidence_used: false
      }
    };
  }

  throw new Error(`Unexpected invalid-id task: ${task}`);
};

const buildClarifyRunner = (question) => async ({ task }) => {
  if (task === 'event_recommendation_intent') {
    return {
      query_summary: '用户想找适合自己的活动，但偏好不明确',
      topics: [],
      campuses: [],
      organizers: [],
      audiences: [],
      benefits: [],
      categories: [],
      date_constraints: [],
      format: '',
      hard_constraints: [],
      allow_historical: false,
      needs_clarification: true,
      clarification_question: question,
      clarification_options: ['按主题筛选', '按综测/志愿时长筛选', '按校区筛选'],
      confidence: 0.42
    };
  }

  throw new Error(`Clarify test should stop after intent task, got ${task}.`);
};

const main = async () => {
  const currentDb = await openDb(defaultDbPath);
  const currentTempPath = path.join(os.tmpdir(), `event-assistant-current-${Date.now()}.sqlite`);
  let currentDbClosed = false;
  try {
    const currentUpcoming = await loadScopedCandidates(currentDb, 'upcoming', new Date());
    await currentDb.close();
    currentDbClosed = true;

    fs.copyFileSync(defaultDbPath, currentTempPath);
    const currentTempDb = await openDb(currentTempPath);
    try {
      if (currentUpcoming.length > 0) {
        await currentTempDb.run(
          `DELETE FROM events WHERE id IN (${currentUpcoming.map(() => '?').join(',')})`,
          currentUpcoming.map((event) => event.id)
        );
      }

      const emptyUpcoming = await runEventAssistantTurn({
        db: currentTempDb,
        query: '想找适合新生的活动',
        allowHistoricalFallback: false,
        modelRunner: buildRecommendRunner('空候选')
      });

      assert(emptyUpcoming.type === 'empty', 'Controlled current DB copy should produce an empty response.');
      assert(emptyUpcoming.scope === 'upcoming', 'Controlled current DB copy should stay in upcoming scope.');
      assert(emptyUpcoming.emptyReason === 'no_upcoming', 'Controlled current DB copy should report no_upcoming.');
      assert(emptyUpcoming.canExpandScope === true, 'Controlled current DB copy should allow explicit scope expansion.');
      console.log('✓ 4.1 A controlled copy of the current DB returns a strict no-upcoming empty state.');
    } finally {
      await currentTempDb.close();
      fs.rmSync(currentTempPath, { force: true });
    }
  } finally {
    if (!currentDbClosed) {
      await currentDb.close();
    }
  }

  if (fs.existsSync(backupDbPath)) {
    const backupDb = await openDb(backupDbPath);
    try {
      const recommendUpcoming = await runEventAssistantTurn({
        db: backupDb,
        query: '想找线下、适合新生的活动',
        modelRunner: buildRecommendRunner('候选活动匹配')
      });

      assert(recommendUpcoming.type === 'recommend', 'Backup DB should produce recommendations.');
      assert(recommendUpcoming.scope === 'upcoming', 'Backup DB should recommend from upcoming scope first.');
      assert(recommendUpcoming.recommendations.length >= 1, 'Backup DB should return at least one recommendation.');
      console.log('✓ 4.2 Backup DB can produce recommendations from real upcoming candidates.');

      const fallbackRecommend = await runEventAssistantTurn({
        db: backupDb,
        query: '想找线下、适合新生、最好有综测的活动',
        modelRunner: buildInvalidIdRunner
      });

      assert(fallbackRecommend.type === 'recommend', 'Invalid model IDs should fall back to usable recommendations.');
      assert(
        fallbackRecommend.modelStatus?.fallbackUsed === true,
        'Invalid model IDs should surface explicit fallback status.'
      );
      console.log('✓ 4.2 Invalid model IDs trigger explicit fallback recommendations.');

      const clarify = await runEventAssistantTurn({
        db: backupDb,
        query: '想找个适合我的活动',
        modelRunner: buildClarifyRunner('你更在意主题还是活动收益？')
      });

      assert(clarify.type === 'clarify', 'First ambiguous turn should allow a clarification.');

      const limitedClarify = await runEventAssistantTurn({
        db: backupDb,
        query: '想找个适合我的活动',
        clarificationAnswer: '更想要能加综测的',
        clarificationUsed: true,
        modelRunner: buildClarifyRunner('还想再确认一点')
      });

      assert(limitedClarify.type !== 'clarify', 'Second clarification attempt should not ask again.');
      console.log('✓ 4.3 Clarification limit is enforced.');
    } finally {
      await backupDb.close();
    }
  } else {
    console.log(`↷ Skipped backup DB recommendation checks; file not found: ${backupDbPath}`);
  }

  const tempDbPath = path.join(os.tmpdir(), `event-assistant-verify-${Date.now()}.sqlite`);
  fs.copyFileSync(defaultDbPath, tempDbPath);

  const tempDb = await openDb(tempDbPath);
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const hh = String(today.getHours()).padStart(2, '0');
    const prevHour = String(Math.max(0, today.getHours() - 1)).padStart(2, '0');
    const nextHour = String(Math.min(23, today.getHours() + 1)).padStart(2, '0');
    const dateOnlyToday = `${yyyy}-${mm}-${dd}`;
    const ongoingStart = `${yyyy}-${mm}-${dd}T${prevHour}:00`;
    const ongoingEnd = `${yyyy}-${mm}-${dd}T${nextHour}:30`;

    await tempDb.run(
      `
        INSERT INTO events (
          title,
          date,
          end_date,
          location,
          tags,
          image,
          description,
          content,
          link,
          featured,
          score,
          target_audience,
          organizer,
          volunteer_time,
          category,
          status,
          deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', NULL)
      `,
      [
        '日期型今日活动',
        dateOnlyToday,
        null,
        '紫金港校区',
        '讲座',
        '',
        '今天但没有具体时间',
        '<p>today</p>',
        '',
        0,
        '',
        '全校学生',
        '测试组织',
        '',
        '讲座'
      ]
    );

    await tempDb.run(
      `
        INSERT INTO events (
          title,
          date,
          end_date,
          location,
          tags,
          image,
          description,
          content,
          link,
          featured,
          score,
          target_audience,
          organizer,
          volunteer_time,
          category,
          status,
          deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', NULL)
      `,
      [
        '进行中测试活动',
        ongoingStart,
        ongoingEnd,
        '玉泉校区',
        '文体活动',
        '',
        '正在进行中',
        '<p>ongoing</p>',
        '',
        0,
        '',
        '全校学生',
        '测试组织',
        '',
        '文体活动'
      ]
    );

    await tempDb.run(
      `
        INSERT INTO events (
          title,
          date,
          end_date,
          location,
          tags,
          image,
          description,
          content,
          link,
          featured,
          score,
          target_audience,
          organizer,
          volunteer_time,
          category,
          status,
          deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL)
      `,
      [
        '待审核未来活动',
        `${yyyy}-${mm}-${dd}T23:00`,
        `${yyyy}-${mm}-${dd}T23:59`,
        '紫金港校区',
        '讲座',
        '',
        '不应进入候选池',
        '<p>pending</p>',
        '',
        0,
        '',
        '全校学生',
        '测试组织',
        '',
        '讲座'
      ]
    );

    await tempDb.run(
      `
        INSERT INTO events (
          title,
          date,
          end_date,
          location,
          tags,
          image,
          description,
          content,
          link,
          featured,
          score,
          target_audience,
          organizer,
          volunteer_time,
          category,
          status,
          deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', datetime('now'))
      `,
      [
        '已删除未来活动',
        `${yyyy}-${mm}-${dd}T22:00`,
        `${yyyy}-${mm}-${dd}T22:30`,
        '紫金港校区',
        '讲座',
        '',
        '同样不应进入候选池',
        '<p>deleted</p>',
        '',
        0,
        '',
        '全校学生',
        '测试组织',
        '',
        '讲座'
      ]
    );

    const upcomingCandidates = await loadScopedCandidates(tempDb, 'upcoming', today);
    assert(
      upcomingCandidates.some((event) => event.title === '日期型今日活动'),
      'Date-only event on the current day should stay in the upcoming candidate pool.'
    );
    assert(
      !upcomingCandidates.some((event) => event.title === '待审核未来活动' || event.title === '已删除未来活动'),
      'Pending or deleted events must never enter the assistant candidate pool.'
    );
    console.log('✓ 4.3 Same-day date-only events remain eligible in the upcoming pool.');
    console.log('✓ 2.3 Pending and deleted events stay outside the assistant candidate pool.');

    const expandedScope = await runEventAssistantTurn({
      db: tempDb,
      query: '继续看看最近的活动',
      allowScopeExpansion: true,
      modelRunner: buildRecommendRunner('扩范围候选')
    });

    assert(
      ['ongoing', 'mixed_future', 'upcoming'].includes(expandedScope.scope),
      'Expanded scope should prefer ongoing or future events before past events.'
    );
    console.log('✓ 4.3 Scope expansion keeps ongoing/future events ahead of past events.');
  } finally {
    await tempDb.close();
    fs.rmSync(tempDbPath, { force: true });
  }

  console.log('\nEvent assistant verification finished successfully.');
};

main().catch((error) => {
  console.error('\nEvent assistant verification failed.');
  console.error(error);
  process.exit(1);
});
