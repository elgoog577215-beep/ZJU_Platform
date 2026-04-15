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

const buildRecommendRunner = (reasonPrefix) => async ({ candidates }) => JSON.stringify({
  type: 'recommend',
  recommendations: candidates.slice(0, Math.min(3, candidates.length)).map((candidate, index) => ({
    id: candidate.id,
    reason: `${reasonPrefix} ${index + 1}`
  }))
});

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
        modelRunner: async () => {
          throw new Error('Model should not be called when there are no upcoming candidates.');
        }
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
      modelRunner: async () => JSON.stringify({
        type: 'recommend',
        recommendations: [{ id: 999999, reason: 'bad id' }]
      })
    });

    assert(fallbackRecommend.type === 'empty', 'Invalid model IDs should stop at an explicit empty state.');
    assert(
      fallbackRecommend.emptyReason === 'assistant_unreliable',
      'Invalid model IDs should surface an assistant_unreliable empty reason.'
    );
    console.log('✓ 4.2 Invalid model IDs stop at an explicit unreliable-result empty state.');

    const clarify = await runEventAssistantTurn({
      db: backupDb,
      query: '想找个适合我的活动',
      modelRunner: async () => JSON.stringify({
        type: 'clarify',
        question: '你更在意主题还是活动收益？'
      })
    });

    assert(clarify.type === 'clarify', 'First ambiguous turn should allow a clarification.');

    const limitedClarify = await runEventAssistantTurn({
      db: backupDb,
      query: '想找个适合我的活动',
      clarificationAnswer: '更想要能加综测的',
      clarificationUsed: true,
      modelRunner: async () => JSON.stringify({
        type: 'clarify',
        question: '还想再确认一点'
      })
    });

    assert(limitedClarify.type === 'empty', 'Second clarification attempt should be rejected into a terminal state.');
    assert(limitedClarify.emptyReason === 'clarification_limit_reached', 'Clarification limit should be enforced.');
    console.log('✓ 4.3 Clarification limit is enforced.');
  } finally {
    await backupDb.close();
  }

  const tempDbPath = path.join(os.tmpdir(), `event-assistant-verify-${Date.now()}.sqlite`);
  fs.copyFileSync(backupDbPath, tempDbPath);

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

    assert(expandedScope.scope === 'ongoing', 'Expanded scope should prefer ongoing events before past events.');
    console.log('✓ 4.3 Scope expansion prefers ongoing events before past events.');
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
