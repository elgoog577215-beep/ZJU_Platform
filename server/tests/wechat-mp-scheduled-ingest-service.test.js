const test = require('node:test');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const service = require('../src/services/wechatMpScheduledIngestService');

const createDb = () => open({ filename: ':memory:', driver: sqlite3.Database });

test('WeChat MP scheduled ingest settings keep conservative defaults', async () => {
  const db = await createDb();
  try {
    const defaults = await service.getIngestSettings(db);
    assert.equal(defaults.enabled, false);
    assert.equal(defaults.daily_run_time, '03:30');
    assert.deepEqual(defaults.query_delay_range, [95, 125]);
    assert.deepEqual(defaults.page_pause_range, [10, 25]);
    assert.equal(defaults.page_pause_seconds, 10);
    assert.deepEqual(defaults.content_delay_range, [10, 20]);

    const updated = await service.updateIngestSettings(db, {
      enabled: true,
      daily_run_time: '7:05',
      timezone: 'Bad/Timezone',
      query_delay_range: '',
      page_pause_range: [2, 4],
      content_delay_range: [1, 2],
      count_per_page: 10,
      max_pages: 2,
    });

    assert.equal(updated.enabled, true);
    assert.equal(updated.daily_run_time, '07:05');
    assert.equal(updated.timezone, 'Asia/Shanghai');
    assert.deepEqual(updated.query_delay_range, [95, 125]);
    assert.deepEqual(updated.page_pause_range, [2, 4]);
    assert.equal(updated.page_pause_seconds, 2);
    assert.deepEqual(updated.content_delay_range, [1, 2]);
    assert.equal(updated.count_per_page, 10);
    assert.equal(updated.max_pages, 2);
  } finally {
    await db.close();
  }
});

test('WeChat MP scheduled ingest migrates legacy pacing defaults without breaking custom page pause', async () => {
  const db = await createDb();
  try {
    await db.exec(`
      CREATE TABLE wechat_mp_ingest_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER DEFAULT 0,
        daily_run_time TEXT DEFAULT '03:30',
        timezone TEXT DEFAULT 'Asia/Shanghai',
        query_delay_range TEXT DEFAULT '[55,120]',
        page_pause_seconds REAL DEFAULT 3,
        content_delay_range TEXT DEFAULT '[3,8]',
        count_per_page INTEGER DEFAULT 20,
        max_pages INTEGER DEFAULT 1,
        fetch_content INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO wechat_mp_ingest_settings (
        id, enabled, daily_run_time, timezone, query_delay_range,
        page_pause_seconds, content_delay_range, count_per_page, max_pages, fetch_content
      ) VALUES (1, 1, '06:10', 'Asia/Shanghai', '[55,120]', 2, '[3,8]', 20, 1, 1);
    `);

    const migrated = await service.getIngestSettings(db);
    assert.deepEqual(migrated.query_delay_range, [95, 125]);
    assert.deepEqual(migrated.page_pause_range, [2, 2]);
    assert.equal(migrated.page_pause_seconds, 2);
    assert.deepEqual(migrated.content_delay_range, [10, 20]);
  } finally {
    await db.close();
  }
});

test('WeChat MP account list parser accepts JSON, CSV, TSV, and simple lines', () => {
  assert.deepEqual(
    service.parseAccountListContent(JSON.stringify({
      accounts: [
        { name: '浙江大学', fakeid: 'fake-1', keywords: ['活动', '讲座'] },
      ],
    }), 'accounts.json'),
    [{
      name: '浙江大学',
      alias: '',
      fakeid: 'fake-1',
      keywords: ['活动', '讲座'],
      enabled: true,
      fetch_content: true,
      count_per_page: 20,
      max_pages: 1,
    }],
  );

  const csv = '公众号名称,fakeid,关键词,启用\n求是学院,fake-2,"通知,讲座",是';
  assert.equal(service.parseAccountListContent(csv, 'accounts.csv')[0].name, '求是学院');
  assert.deepEqual(service.parseAccountListContent(csv, 'accounts.csv')[0].keywords, ['通知', '讲座']);

  const tsv = 'name\tfakeid\tkeywords\nZJU News\tfake-3\tAI;Campus';
  assert.equal(service.parseAccountListContent(tsv, 'accounts.tsv')[0].fakeid, 'fake-3');

  const simple = '浙江大学本科生院,fake-4,,竞赛';
  assert.equal(service.parseAccountListContent(simple, 'accounts.txt')[0].name, '浙江大学本科生院');
});

test('WeChat MP account upsert keeps list idempotent', async () => {
  const db = await createDb();
  try {
    const first = await service.upsertIngestAccount(db, {
      name: '浙江大学',
      fakeid: 'fake-1',
      keywords: '活动,讲座',
    });
    const second = await service.upsertIngestAccount(db, {
      name: '浙江大学',
      fakeid: 'fake-1',
      keywords: '通知',
      enabled: false,
    });
    assert.equal(first.id, second.id);
    assert.equal(second.enabled, false);
    assert.deepEqual(second.keywords, ['通知']);

    const accounts = await service.listIngestAccounts(db);
    assert.equal(accounts.length, 1);

    await service.deleteIngestAccount(db, second.id);
    assert.equal((await service.listIngestAccounts(db)).length, 0);
  } finally {
    await db.close();
  }
});

test('WeChat MP incremental run saves new articles, bodies, and avoids duplicates', async () => {
  const db = await createDb();
  const sleeps = [];
  const contentCalls = [];
  try {
    await service.updateIngestSettings(db, {
      query_delay_range: [1, 1],
      page_pause_range: [0.5, 0.5],
      content_delay_range: [0.25, 0.25],
      count_per_page: 2,
      max_pages: 1,
      fetch_content: true,
    });
    await service.upsertIngestAccount(db, { name: '账号一', fakeid: 'fake-1', keywords: '活动' });
    await service.upsertIngestAccount(db, { name: '账号二', fakeid: 'fake-2', keywords: '通知' });

    const testRuntime = {
      random: () => 0,
      sleep: async (ms) => { sleeps.push(ms); },
    };
    const wechatApi = {
      async fetchArticles({ accountName, fakeid, pacing, runtime }) {
        assert.deepEqual(pacing.query_delay_range, [1, 1]);
        assert.deepEqual(pacing.page_pause_range, [0.5, 0.5]);
        assert.equal(pacing.page_pause_seconds, 0.5);
        assert.equal(runtime.sleep, testRuntime.sleep);
        return {
          articles: [
            {
              title: `${accountName} 第一篇`,
              link: `https://mp.weixin.qq.com/s/${fakeid}-1`,
              summary: 'summary',
              author: accountName,
              cover: 'https://mmbiz.qpic.cn/cover.png',
            },
            {
              title: `${accountName} 第二篇`,
              link: `https://mp.weixin.qq.com/s/${fakeid}-2`,
              summary: 'summary',
              author: accountName,
            },
          ],
        };
      },
      async fetchArticleContent({ url }) {
        contentCalls.push(url);
        return {
          contentText: `正文 ${url}`,
          contentHtml: `<p>${url}</p>`,
          images: ['https://mmbiz.qpic.cn/body.png'],
          content_status: 'fetched',
        };
      },
    };

    const firstRun = await service.executeIngestRun(db, {
      triggerType: 'manual',
      settings: await service.getIngestSettings(db),
      runtime: testRuntime,
      wechatApi,
    });
    assert.equal(firstRun.status, 'completed');
    assert.equal(firstRun.total_accounts, 2);
    assert.equal(firstRun.total_articles, 4);
    assert.equal(firstRun.new_articles, 4);
    assert.equal(firstRun.fetched_contents, 4);
    assert.deepEqual(sleeps, [250, 1000, 250]);
    assert.equal(contentCalls.length, 4);

    sleeps.length = 0;
    contentCalls.length = 0;
    const secondRun = await service.executeIngestRun(db, {
      triggerType: 'manual',
      settings: await service.getIngestSettings(db),
      runtime: testRuntime,
      wechatApi,
    });
    assert.equal(secondRun.status, 'completed');
    assert.equal(secondRun.new_articles, 0);
    assert.equal(secondRun.fetched_contents, 0);
    assert.deepEqual(sleeps, [1000]);
    assert.equal(contentCalls.length, 0);

    const articles = await service.listIngestArticles(db, { limit: 10 });
    assert.equal(articles.length, 4);
    assert.equal(articles.every((article) => article.content_status === 'fetched'), true);
  } finally {
    await db.close();
  }
});

test('WeChat MP scheduler key respects configured timezone', () => {
  const key = service.getZonedDateTimeKey(new Date('2026-07-10T19:30:00.000Z'), 'Asia/Shanghai');
  assert.equal(key.dateKey, '2026-07-11');
  assert.equal(key.timeKey, '03:30');
});
