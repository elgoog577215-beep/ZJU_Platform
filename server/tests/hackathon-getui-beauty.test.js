const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const template = require("../../shared/hackathonGetuiBeauty.json");
const {
    DEFAULT_HACKATHON_TEMPLATE,
    getHackathonSchedule,
} = require("../src/services/hackathonTemplateService");
const {
    migrateHackathonGetuiBeauty,
    publishHackathonGetuiBeauty,
} = require("../src/config/migrations/hackathonGetuiBeauty");

async function createDb() {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE competitions (
            id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, subtitle TEXT,
            description TEXT, event_date TEXT, is_featured INTEGER, status TEXT
        );
    `);
    const first = { ...structuredClone(DEFAULT_HACKATHON_TEMPLATE), operatorNote: "retain" };
    const second = require("../../shared/hackathonAiX.json");
    const schedule = { activeEventKey: second.event.key, revision: 7, events: [first, second] };
    await db.run("INSERT INTO settings VALUES ('hackathon_schedule_config', ?)", [
        JSON.stringify(schedule),
    ]);
    await db.run("INSERT INTO settings VALUES ('hackathon_title', 'Current operator title')");
    await db.run("INSERT INTO competitions (slug,title,status) VALUES (?, 'Original', 'active')", [
        first.results.competitionSlug,
    ]);
    return { db, schedule };
}

test("beauty publication preserves historical templates, active selection and existing records", async () => {
    const { db, schedule } = await createDb();
    try {
        assert.equal((await publishHackathonGetuiBeauty(db)).added, true);
        const published = JSON.parse(
            (await db.get("SELECT value FROM settings WHERE key='hackathon_schedule_config'")).value
        );
        assert.deepEqual(published.events.slice(0, 2), schedule.events);
        assert.equal(published.activeEventKey, schedule.activeEventKey);
        assert.equal(published.revision, 8);
        assert.equal(published.events[2].event.registrationOpen, false);
        assert.equal(published.events[2].event.program, undefined);
        assert.equal(published.events[2].event.startAt, "2026-06-07T13:30");
        const original = await db.get("SELECT title FROM competitions WHERE id=1");
        assert.equal(original.title, "Original");
        await db.run("UPDATE competitions SET description='Operator update' WHERE slug=?", [
            template.results.competitionSlug,
        ]);
        assert.equal((await publishHackathonGetuiBeauty(db)).added, false);
        assert.equal((await db.get("SELECT COUNT(*) AS count FROM competitions")).count, 2);
        assert.equal(
            (
                await db.get("SELECT description FROM competitions WHERE slug=?", [
                    template.results.competitionSlug,
                ])
            ).description,
            "Operator update"
        );
        assert.deepEqual(
            JSON.parse(
                (await db.get("SELECT value FROM settings WHERE key='hackathon_schedule_config'"))
                    .value
            ),
            published
        );
        assert.equal(
            (await db.get("SELECT value FROM settings WHERE key='hackathon_title'")).value,
            "Current operator title"
        );
        const publicTemplate = (await getHackathonSchedule(db)).events.find(
            (item) => item.event.key === template.event.key
        );
        assert.equal(publicTemplate.event.endAt, "2026-06-07T17:00");
        assert.equal(publicTemplate.event.duration, "3小时开发（路演另计）");
    } finally {
        await db.close();
    }
});

test("production startup does not publish beauty; explicit publication is available", async () => {
    const { db } = await createDb();
    const previous = process.env.NODE_ENV;
    try {
        process.env.NODE_ENV = "production";
        await migrateHackathonGetuiBeauty(db);
        assert.equal((await getHackathonSchedule(db)).events.length, 2);
        await publishHackathonGetuiBeauty(db);
        assert.equal((await getHackathonSchedule(db)).events.length, 3);
    } finally {
        if (previous === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previous;
        await db.close();
    }
});

test("conflicting outcome ownership blocks publication without changing the schedule", async () => {
    const { db, schedule } = await createDb();
    try {
        schedule.events[0].results.competitionSlug = template.results.competitionSlug;
        const before = JSON.stringify(schedule);
        await db.run("UPDATE settings SET value=? WHERE key='hackathon_schedule_config'", [before]);
        await assert.rejects(publishHackathonGetuiBeauty(db), /identity conflicts/);
        assert.equal(
            (await db.get("SELECT value FROM settings WHERE key='hackathon_schedule_config'"))
                .value,
            before
        );
        assert.equal((await db.get("SELECT COUNT(*) AS count FROM competitions")).count, 1);
    } finally {
        await db.close();
    }
});

test("a malformed stored schedule is not replaced by defaults", async () => {
    const { db } = await createDb();
    try {
        await db.run("UPDATE settings SET value='not json' WHERE key='hackathon_schedule_config'");
        await assert.rejects(publishHackathonGetuiBeauty(db));
        assert.equal(
            (await db.get("SELECT value FROM settings WHERE key='hackathon_schedule_config'"))
                .value,
            "not json"
        );
    } finally {
        await db.close();
    }
});
