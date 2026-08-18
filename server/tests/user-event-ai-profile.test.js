const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const profileService = require("../src/services/userEventAiProfileService");
const { refreshSearchArtifacts } = require("../src/services/eventAiProfileService");

const createDb = async () => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE user_event_ai_profiles (
            user_id INTEGER PRIMARY KEY, profile_version INTEGER, profile_json TEXT,
            long_term_preferences TEXT, short_term_interests TEXT, dislikes TEXT,
            decision_factors TEXT, evidence_json TEXT, confidence REAL, status TEXT,
            source_hash TEXT, last_error TEXT, personalization_reset_at DATETIME,
            generated_at DATETIME, updated_at DATETIME
        );
        CREATE TABLE user_ai_profile_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, reason TEXT,
            status TEXT DEFAULT 'pending', priority INTEGER DEFAULT 50,
            attempts INTEGER DEFAULT 0, available_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            locked_at DATETIME, locked_by TEXT, last_error TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE assistant_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, source TEXT, content TEXT
        );
    `);
    return db;
};

test("behavior weights preserve high-value and negative signal ordering", () => {
    const now = new Date().toISOString();
    const summary = profileService._test.summarizeBehavior([
        { action_type: "view_detail", created_at: now, category: "lecture", title: "浏览讲座" },
        { action_type: "register", created_at: now, category: "volunteer", title: "报名志愿" },
        {
            action_type: "feedback_down",
            created_at: now,
            category: "competition",
            title: "不喜欢竞赛",
        },
    ]);
    assert.equal(summary.categories[0].value, "志愿");
    assert.equal(summary.negatives[0].value, "竞赛");
    assert.ok(profileService.ACTION_WEIGHTS.register > profileService.ACTION_WEIGHTS.view_detail);
    assert.ok(profileService.ACTION_WEIGHTS.feedback_down < 0);
});

test("7/30/90 day decay becomes progressively weaker", () => {
    const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();
    const decay = profileService._test.decayForDate;
    assert.ok(decay(daysAgo(2)) > decay(daysAgo(14)));
    assert.ok(decay(daysAgo(14)) > decay(daysAgo(45)));
    assert.ok(decay(daysAgo(45)) > decay(daysAgo(120)));
});

test("profile jobs coalesce per user and retain the higher priority", async (t) => {
    const db = await createDb();
    t.after(() => db.close());
    const first = await profileService.enqueueProfileRefresh(db, 7, {
        reason: "view_detail",
        priority: 30,
        delaySeconds: 600,
    });
    const second = await profileService.enqueueProfileRefresh(db, 7, {
        reason: "register",
        priority: 95,
        delaySeconds: 5,
    });
    assert.equal(first.coalesced, false);
    assert.equal(second.coalesced, true);
    const rows = await db.all("SELECT * FROM user_ai_profile_jobs WHERE user_id = 7");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].priority, 95);
    assert.equal(rows[0].reason, "register");
});

test("reset clears semantic profile and assistant memory while setting a cutoff", async (t) => {
    const db = await createDb();
    t.after(() => db.close());
    await db.run(
        "INSERT INTO assistant_memory (user_id, source, content) VALUES (9, 'event_assistant', '旧偏好')"
    );
    await profileService.enqueueProfileRefresh(db, 9, { reason: "favorite", delaySeconds: 0 });
    const result = await profileService.resetUserProfile(db, 9);
    assert.equal(result.status, "reset");
    assert.ok(result.personalizationResetAt);
    assert.deepEqual(result.longTermPreferences, []);
    assert.equal(
        (
            await db.get(
                "SELECT COUNT(*) AS count FROM assistant_memory WHERE user_id = 9 AND source = 'event_assistant'"
            )
        ).count,
        0
    );
    assert.equal(
        (await db.get("SELECT COUNT(*) AS count FROM user_ai_profile_jobs WHERE user_id = 9"))
            .count,
        0
    );
});

test("event search artifacts populate FTS without requiring embeddings", async (t) => {
    const db = await createDb();
    t.after(() => db.close());
    await db.exec(`
        CREATE VIRTUAL TABLE event_ai_search_fts USING fts5(
            event_id UNINDEXED, title, summary, topics, organizer, campus, audience, benefits
        );
    `);
    const result = await refreshSearchArtifacts(
        db,
        { id: 21, title: "AI 智能体实践课" },
        {
            summary: "面向全校学生的人工智能项目实践",
            category: "lecture",
            topics: ["AI", "智能体"],
            campuses: ["紫金港"],
            audiences: ["全校学生"],
            benefits: ["技能成长"],
            organizers: ["计算机学院"],
            raw: { time_preference_terms: ["周末"] },
        },
        { embedding: false }
    );
    assert.equal(result.ftsIndexed, true);
    const row = await db.get(
        "SELECT event_id FROM event_ai_search_fts WHERE event_ai_search_fts MATCH 'AI'"
    );
    assert.equal(Number(row.event_id), 21);
});
