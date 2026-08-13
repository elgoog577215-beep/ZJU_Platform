const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const service = require("../src/services/wechatMpScheduledIngestService");

const createDb = () => open({ filename: ":memory:", driver: sqlite3.Database });

test("WeChat MP scheduled ingest settings keep conservative defaults", async () => {
    const db = await createDb();
    try {
        const defaults = await service.getIngestSettings(db);
        assert.equal(defaults.enabled, false);
        assert.equal(defaults.token_health_enabled, true);
        assert.equal(defaults.token_health_interval_hours, 12);
        assert.equal(defaults.daily_run_time, "03:30");
        assert.deepEqual(defaults.query_delay_range, [95, 125]);
        assert.deepEqual(defaults.page_pause_range, [10, 25]);
        assert.equal(defaults.page_pause_seconds, 10);
        assert.deepEqual(defaults.content_delay_range, [10, 20]);
        assert.equal(defaults.auto_parse, true);

        const updated = await service.updateIngestSettings(db, {
            enabled: true,
            daily_run_time: "7:05",
            timezone: "Bad/Timezone",
            query_delay_range: "",
            page_pause_range: [2, 4],
            content_delay_range: [1, 2],
            count_per_page: 10,
            max_pages: 2,
            token_health_enabled: false,
            token_health_interval_hours: 24,
        });

        assert.equal(updated.enabled, true);
        assert.equal(updated.daily_run_time, "07:05");
        assert.equal(updated.timezone, "Asia/Shanghai");
        assert.deepEqual(updated.query_delay_range, [95, 125]);
        assert.deepEqual(updated.page_pause_range, [2, 4]);
        assert.equal(updated.page_pause_seconds, 2);
        assert.deepEqual(updated.content_delay_range, [1, 2]);
        assert.equal(updated.count_per_page, 10);
        assert.equal(updated.max_pages, 2);
        assert.equal(updated.token_health_enabled, false);
        assert.equal(updated.token_health_interval_hours, 24);
    } finally {
        await db.close();
    }
});

test("WeChat MP scheduled ingest migrates legacy pacing defaults without breaking custom page pause", async () => {
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

test("WeChat MP account list parser accepts JSON, CSV, TSV, and simple lines", () => {
    assert.deepEqual(
        service.parseAccountListContent(
            JSON.stringify({
                accounts: [{ name: "浙江大学", fakeid: "fake-1", keywords: ["活动", "讲座"] }],
            }),
            "accounts.json"
        ),
        [
            {
                name: "浙江大学",
                alias: "",
                fakeid: "fake-1",
                keywords: ["活动", "讲座"],
                enabled: true,
                fetch_content: true,
                count_per_page: 20,
                max_pages: 1,
            },
        ]
    );

    const csv = '公众号名称,fakeid,关键词,启用\n求是学院,fake-2,"通知,讲座",是';
    assert.equal(service.parseAccountListContent(csv, "accounts.csv")[0].name, "求是学院");
    assert.deepEqual(service.parseAccountListContent(csv, "accounts.csv")[0].keywords, [
        "通知",
        "讲座",
    ]);

    const tsv = "name\tfakeid\tkeywords\nZJU News\tfake-3\tAI;Campus";
    assert.equal(service.parseAccountListContent(tsv, "accounts.tsv")[0].fakeid, "fake-3");

    const simple = "浙江大学本科生院,fake-4,,竞赛";
    assert.equal(
        service.parseAccountListContent(simple, "accounts.txt")[0].name,
        "浙江大学本科生院"
    );
});

test("WeChat MP account upsert keeps list idempotent", async () => {
    const db = await createDb();
    try {
        const first = await service.upsertIngestAccount(db, {
            name: "浙江大学",
            fakeid: "fake-1",
            keywords: "活动,讲座",
        });
        const second = await service.upsertIngestAccount(db, {
            name: "浙江大学",
            fakeid: "fake-1",
            keywords: "通知",
            enabled: false,
        });
        assert.equal(first.id, second.id);
        assert.equal(second.enabled, false);
        assert.deepEqual(second.keywords, ["通知"]);

        const accounts = await service.listIngestAccounts(db);
        assert.equal(accounts.length, 1);

        await service.deleteIngestAccount(db, second.id);
        assert.equal((await service.listIngestAccounts(db)).length, 0);
    } finally {
        await db.close();
    }
});

test("WeChat MP account enable toggle changes only the enabled state", async () => {
    const db = await createDb();
    try {
        const account = await service.upsertIngestAccount(db, {
            name: "可切换公众号",
            fakeid: "toggle-fake",
            keywords: ["活动"],
            fetch_content: false,
            count_per_page: 7,
            max_pages: 2,
        });

        const disabled = await service.setIngestAccountEnabled(db, account.id, false);
        assert.equal(disabled.enabled, false);
        assert.equal(disabled.name, account.name);
        assert.deepEqual(disabled.keywords, account.keywords);
        assert.equal(disabled.fetch_content, account.fetch_content);
        assert.equal(disabled.count_per_page, account.count_per_page);
        assert.equal(disabled.max_pages, account.max_pages);

        const enabled = await service.setIngestAccountEnabled(db, account.id, true);
        assert.equal(enabled.enabled, true);
        assert.equal(enabled.name, account.name);
    } finally {
        await db.close();
    }
});

test("WeChat MP incremental run saves new articles, bodies, and avoids duplicates", async () => {
    const db = await createDb();
    const sleeps = [];
    const contentCalls = [];
    const parseCalls = [];
    try {
        await service.updateIngestSettings(db, {
            query_delay_range: [1, 1],
            page_pause_range: [0.5, 0.5],
            content_delay_range: [0.25, 0.25],
            count_per_page: 2,
            max_pages: 1,
            fetch_content: true,
            auto_parse: true,
        });
        await service.upsertIngestAccount(db, {
            name: "账号一",
            fakeid: "fake-1",
            keywords: "活动",
        });
        await service.upsertIngestAccount(db, {
            name: "账号二",
            fakeid: "fake-2",
            keywords: "通知",
        });

        const testRuntime = {
            random: () => 0,
            sleep: async (ms) => {
                sleeps.push(ms);
            },
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
                            summary: "summary",
                            author: accountName,
                            cover: "https://mmbiz.qpic.cn/cover.png",
                        },
                        {
                            title: `${accountName} 第二篇`,
                            link: `https://mp.weixin.qq.com/s/${fakeid}-2`,
                            summary: "summary",
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
                    coverImage: "/uploads/covers/wechat-cover.jpg",
                    images: ["https://mmbiz.qpic.cn/body.png"],
                    content_status: "fetched",
                };
            },
        };
        const parser = async (article) => {
            parseCalls.push(article);
            return {
                title: article.title,
                date: "2026-07-20T10:00",
                category: "lecture",
                content: "<p>活动候选</p>",
                aiMeta: { provider: "test", model: "test-model" },
            };
        };

        const firstRun = await service.executeIngestRun(db, {
            triggerType: "manual",
            settings: await service.getIngestSettings(db),
            runtime: testRuntime,
            wechatApi,
            parser,
        });
        assert.equal(firstRun.status, "completed");
        assert.equal(firstRun.total_accounts, 2);
        assert.equal(firstRun.total_articles, 4);
        assert.equal(firstRun.new_articles, 4);
        assert.equal(firstRun.fetched_contents, 4);
        assert.equal(firstRun.extracted_articles, 4);
        assert.equal(firstRun.extraction_failed_count, 0);
        assert.equal(firstRun.progress_stage, "completed");
        assert.equal(firstRun.progress_percent, 100);
        assert.equal(firstRun.processed_accounts, 2);
        assert.equal(firstRun.processed_articles, 4);
        assert.deepEqual(sleeps, [250, 1000, 250]);
        assert.equal(contentCalls.length, 4);

        sleeps.length = 0;
        contentCalls.length = 0;
        const secondRun = await service.executeIngestRun(db, {
            triggerType: "manual",
            settings: await service.getIngestSettings(db),
            runtime: testRuntime,
            wechatApi,
            parser,
        });
        assert.equal(secondRun.status, "completed");
        assert.equal(secondRun.new_articles, 0);
        assert.equal(secondRun.fetched_contents, 0);
        assert.equal(secondRun.extracted_articles, 0);
        assert.deepEqual(sleeps, [1000]);
        assert.equal(contentCalls.length, 0);

        const articles = await service.listIngestArticles(db, { limit: 10 });
        assert.equal(articles.length, 4);
        assert.equal(
            articles.every((article) => article.content_status === "fetched"),
            true
        );
        assert.equal(
            articles.every((article) => article.extraction_status === "completed"),
            true
        );
        assert.equal(
            articles.every((article) => article.extracted_event?.category === "lecture"),
            true
        );
        assert.equal(parseCalls.length, 4);
    } finally {
        await db.close();
    }
});

test("WeChat MP ingest prefers localized covers and repairs linked events", async () => {
    const db = await createDb();
    let fetchContentCalls = 0;
    let parseCalls = 0;
    const article = {
        title: "英语四新专项赛选拔赛",
        link: "https://mp.weixin.qq.com/s/localized-cover",
        summary: "报名通知",
        author: "测试公众号",
        cover: "https://mmbiz.qpic.cn/list-cover.png",
    };

    try {
        await db.exec(`
      CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT, date TEXT, end_date TEXT, location TEXT, tags TEXT,
        status TEXT DEFAULT 'approved', image TEXT, description TEXT, content TEXT,
        link TEXT, featured INTEGER DEFAULT 0, score TEXT, target_audience TEXT,
        organizer TEXT, volunteer_time TEXT, category TEXT, is_college_notice INTEGER DEFAULT 0,
        notice_type TEXT, source_college TEXT, uploader_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME
      )
    `);
        await service.updateIngestSettings(db, {
            query_delay_range: [0, 0],
            content_delay_range: [0, 0],
            auto_parse: true,
        });
        await service.upsertIngestAccount(db, { name: "测试公众号", fakeid: "cover-fake" });

        const wechatApi = {
            async fetchArticles() {
                return { articles: [article] };
            },
            async fetchArticleContent() {
                fetchContentCalls += 1;
                return {
                    contentText: "包含报名时间和参与方式的活动正文",
                    contentHtml: "<p>活动详情</p>",
                    coverImage: "/uploads/covers/wechat-local-cover.jpg",
                    images: ["/uploads/covers/wechat-local-cover.jpg"],
                    content_status: "fetched",
                };
            },
        };
        const parser = async () => {
            parseCalls += 1;
            return {
                title: article.title,
                date: "2026-07-20T10:00",
                category: "competition",
                content: "<p>活动详情</p>",
                is_activity_candidate: true,
                activity_confidence: 0.95,
                activity_reason: "包含明确报名和参与安排",
            };
        };

        const firstRun = await service.executeIngestRun(db, {
            settings: await service.getIngestSettings(db),
            wechatApi,
            parser,
            governanceTrigger: async () => {},
        });
        assert.equal(firstRun.status, "completed");

        let stored = (await service.listIngestArticles(db))[0];
        let events = await db.all("SELECT * FROM events");
        assert.equal(stored.cover, "/uploads/covers/wechat-local-cover.jpg");
        assert.equal(events[0].image, "/uploads/covers/wechat-local-cover.jpg");

        await db.run("UPDATE wechat_mp_ingest_articles SET cover = ? WHERE id = ?", [
            article.cover,
            stored.id,
        ]);
        await db.run("UPDATE events SET image = ? WHERE id = ?", [article.cover, events[0].id]);

        const repairedRun = await service.executeIngestRun(db, {
            settings: await service.getIngestSettings(db),
            wechatApi,
            parser,
            governanceTrigger: async () => {},
        });
        assert.equal(repairedRun.status, "completed");
        assert.equal(fetchContentCalls, 2);
        assert.equal(parseCalls, 1);

        stored = (await service.listIngestArticles(db))[0];
        events = await db.all("SELECT * FROM events");
        assert.equal(stored.cover, "/uploads/covers/wechat-local-cover.jpg");
        assert.equal(events[0].image, "/uploads/covers/wechat-local-cover.jpg");
    } finally {
        await db.close();
    }
});

test("WeChat MP ingest localizes a list cover when article content has no local cover", async () => {
    const db = await createDb();
    try {
        await service.updateIngestSettings(db, {
            query_delay_range: [0, 0],
            content_delay_range: [0, 0],
            auto_parse: false,
        });
        await service.upsertIngestAccount(db, { name: "人民日报", fakeid: "people-daily" });
        const localized = [];
        const result = await service.executeIngestRun(db, {
            settings: await service.getIngestSettings(db),
            wechatApi: {
                async fetchArticles() {
                    return {
                        articles: [{
                            title: "人民日报测试文章",
                            link: "https://mp.weixin.qq.com/s/people-daily-test",
                            cover: "https://mmbiz.qpic.cn/list-cover.jpg",
                        }],
                    };
                },
                async fetchArticleContent() {
                    return {
                        contentText: "测试正文",
                        contentHtml: "<p>测试正文</p>",
                        coverImage: "https://mmbiz.qpic.cn/content-cover.jpg",
                        images: [],
                        content_status: "fetched",
                    };
                },
            },
            localizeImages: async (body) => {
                localized.push(body.coverImage);
                return { ...body, coverImage: "/uploads/covers/people-daily-test.jpg" };
            },
        });
        assert.equal(result.status, "completed");
        const stored = (await service.listIngestArticles(db))[0];
        assert.equal(stored.cover, "/uploads/covers/people-daily-test.jpg");
        assert.deepEqual(localized, ["https://mmbiz.qpic.cn/list-cover.jpg"]);
    } finally {
        await db.close();
    }
});

test("WeChat MP automatic extraction retries failures and can be disabled", async () => {
    const db = await createDb();
    let parseCalls = 0;
    const wechatApi = {
        async fetchArticles() {
            return {
                articles: [
                    {
                        title: "待提取文章",
                        link: "https://mp.weixin.qq.com/s/retry",
                        author: "测试公众号",
                    },
                ],
            };
        },
        async fetchArticleContent() {
            return { contentText: "正文内容", content_status: "fetched" };
        },
    };
    try {
        await service.updateIngestSettings(db, {
            query_delay_range: [0, 0],
            content_delay_range: [0, 0],
            auto_parse: true,
        });
        await service.upsertIngestAccount(db, { name: "测试公众号", fakeid: "retry-fake" });

        const failingRun = await service.executeIngestRun(db, {
            settings: await service.getIngestSettings(db),
            wechatApi,
            parser: async () => {
                parseCalls += 1;
                throw new Error("模型暂时不可用");
            },
        });
        assert.equal(failingRun.status, "completed");
        assert.equal(failingRun.extraction_failed_count, 1);
        assert.equal((await service.listIngestArticles(db))[0].extraction_status, "failed");

        const recoveredRun = await service.executeIngestRun(db, {
            settings: await service.getIngestSettings(db),
            wechatApi,
            parser: async () => {
                parseCalls += 1;
                return { title: "恢复后的活动候选", category: "competition" };
            },
        });
        assert.equal(recoveredRun.extracted_articles, 1);
        assert.equal(
            (await service.listIngestArticles(db))[0].extracted_event?.title,
            "恢复后的活动候选"
        );
        assert.equal(parseCalls, 2);

        await service.updateIngestSettings(db, { auto_parse: false });
        const disabledRun = await service.executeIngestRun(db, {
            settings: await service.getIngestSettings(db),
            wechatApi,
            parser: async () => {
                parseCalls += 1;
                return { title: "不应调用" };
            },
        });
        assert.equal(disabledRun.extracted_articles, 0);
        assert.equal(parseCalls, 2);
    } finally {
        await db.close();
    }
});

test("WeChat MP activity screening only creates pending events for confident candidates", async () => {
    const db = await createDb();
    const articles = [
        {
            title: "校园活动报名",
            link: "https://mp.weixin.qq.com/s/activity-candidate",
            author: "测试公众号",
        },
        {
            title: "校园成果新闻",
            link: "https://mp.weixin.qq.com/s/news-recap",
            author: "测试公众号",
        },
    ];
    try {
        await db.exec(`
      CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT, date TEXT, end_date TEXT, location TEXT, tags TEXT,
        status TEXT DEFAULT 'approved', image TEXT, description TEXT, content TEXT,
        link TEXT, featured INTEGER DEFAULT 0, score TEXT, target_audience TEXT,
        organizer TEXT, volunteer_time TEXT, category TEXT, is_college_notice INTEGER DEFAULT 0,
        notice_type TEXT, source_college TEXT, uploader_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME
      )
    `);
        await service.updateIngestSettings(db, {
            query_delay_range: [0, 0],
            content_delay_range: [0, 0],
            auto_parse: true,
        });
        await service.upsertIngestAccount(db, { name: "测试公众号", fakeid: "activity-fake" });

        const wechatApi = {
            async fetchArticles() {
                return { articles };
            },
            async fetchArticleContent({ url }) {
                return { contentText: `正文 ${url}`, content_status: "fetched" };
            },
        };
        const parser = async (article) => {
            const candidate = article.title.includes("活动");
            return {
                title: article.title,
                date: "2026-07-20T10:00",
                category: "lecture",
                content: "<p>活动详情</p>",
                is_activity_candidate: candidate,
                activity_confidence: candidate ? 0.92 : 0.98,
                activity_reason: candidate
                    ? "包含明确报名和参与安排"
                    : "文章是成果报道，不是参与型活动",
            };
        };
        const governanceCalls = [];

        const firstRun = await service.executeIngestRun(db, {
            settings: await service.getIngestSettings(db),
            wechatApi,
            parser,
            governanceTrigger: async (triggerDb, payload) => {
                governanceCalls.push({ triggerDb, payload });
            },
        });
        assert.equal(firstRun.status, "completed");

        const events = await db.all("SELECT * FROM events ORDER BY id");
        assert.equal(events.length, 1);
        assert.equal(events[0].title, "校园活动报名");
        assert.equal(events[0].status, "pending");
        assert.equal(events[0].uploader_id, null);

        const storedArticles = await service.listIngestArticles(db, { limit: 10 });
        const accepted = storedArticles.find((article) => article.title === "校园活动报名");
        const rejected = storedArticles.find((article) => article.title === "校园成果新闻");
        assert.equal(accepted.activity_status, "accepted");
        assert.equal(accepted.event_id, events[0].id);
        assert.equal(governanceCalls.length, 1);
        assert.equal(governanceCalls[0].triggerDb, db);
        assert.deepEqual(governanceCalls[0].payload, {
            eventId: events[0].id,
            userId: null,
            source: "automatic_wechat_ingest",
        });
        assert.equal(rejected.activity_status, "rejected");
        assert.match(rejected.activity_reason, /成果报道/);

        const secondRun = await service.executeIngestRun(db, {
            settings: await service.getIngestSettings(db),
            wechatApi,
            parser,
        });
        assert.equal(secondRun.status, "completed");
        assert.equal((await db.all("SELECT id FROM events")).length, 1);
    } finally {
        await db.close();
    }
});

test("WeChat MP retries failed activity writes without parsing the article again", async () => {
    const db = await createDb();
    let parseCalls = 0;
    const article = {
        title: "活动报名通知",
        link: "https://mp.weixin.qq.com/s/recover-activity-write",
        author: "测试公众号",
    };
    const wechatApi = {
        async fetchArticles() {
            return { articles: [article] };
        },
        async fetchArticleContent() {
            return { contentText: "包含报名时间和参与方式的活动正文", content_status: "fetched" };
        },
    };
    const parser = async () => {
        parseCalls += 1;
        return {
            title: article.title,
            date: "2026-07-20T10:00",
            category: "lecture",
            content: "<p>活动详情</p>",
            is_activity_candidate: true,
            activity_confidence: 0.92,
            activity_reason: "包含明确报名和参与安排",
        };
    };

    try {
        await service.updateIngestSettings(db, {
            query_delay_range: [0, 0],
            content_delay_range: [0, 0],
            auto_parse: true,
        });
        await service.upsertIngestAccount(db, { name: "测试公众号", fakeid: "recovery-fake" });

        const firstRun = await service.executeIngestRun(db, {
            settings: await service.getIngestSettings(db),
            wechatApi,
            parser,
        });
        assert.equal(firstRun.status, "completed");
        assert.equal(parseCalls, 1);
        assert.equal((await service.listIngestArticles(db))[0].activity_status, "failed");

        await db.exec(`
      CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT, date TEXT, end_date TEXT, location TEXT, tags TEXT,
        status TEXT DEFAULT 'approved', image TEXT, description TEXT, content TEXT,
        link TEXT, featured INTEGER DEFAULT 0, score TEXT, target_audience TEXT,
        organizer TEXT, volunteer_time TEXT, category TEXT, is_college_notice INTEGER DEFAULT 0,
        notice_type TEXT, source_college TEXT, uploader_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME
      )
    `);

        const recoveredRun = await service.executeIngestRun(db, {
            settings: await service.getIngestSettings(db),
            wechatApi,
            parser,
        });
        assert.equal(recoveredRun.status, "completed");
        assert.equal(parseCalls, 1);

        const stored = (await service.listIngestArticles(db))[0];
        const events = await db.all("SELECT * FROM events");
        assert.equal(stored.activity_status, "accepted");
        assert.equal(events.length, 1);
        assert.equal(events[0].status, "pending");
    } finally {
        await db.close();
    }
});

test("WeChat MP scheduler key respects configured timezone", () => {
    const key = service.getZonedDateTimeKey(new Date("2026-07-10T19:30:00.000Z"), "Asia/Shanghai");
    assert.equal(key.dateKey, "2026-07-11");
    assert.equal(key.timeKey, "03:30");
});

test("WeChat MP ingest recovers stale running jobs without touching active jobs", async () => {
    const db = await createDb();
    try {
        await service.ensureWechatMpScheduledIngestSchema(db);
        await db.run(
            `
      INSERT INTO wechat_mp_ingest_runs (
        trigger_type, status, progress_stage, progress_percent, last_heartbeat_at, started_at
      ) VALUES ('scheduled', 'running', 'fetching_content', 42,
        datetime('now', '-45 minutes'), datetime('now', '-45 minutes'))
    `
        );
        await db.run(
            `
      INSERT INTO wechat_mp_ingest_runs (
        trigger_type, status, progress_stage, progress_percent, last_heartbeat_at
      ) VALUES ('manual', 'running', 'fetching_accounts', 5, datetime('now'))
    `
        );

        const runs = await service.listIngestRuns(db, { limit: 10 });
        const staleRun = runs.find((run) => run.trigger_type === "scheduled");
        const activeRun = runs.find((run) => run.trigger_type === "manual");
        assert.equal(staleRun.status, "failed");
        assert.equal(staleRun.progress_stage, "failed");
        assert.equal(staleRun.progress_percent, 42);
        assert.equal(staleRun.error, "采集任务因服务重启或长时间无响应而中止");
        assert.equal(activeRun.status, "running");
    } finally {
        await db.close();
    }
});
