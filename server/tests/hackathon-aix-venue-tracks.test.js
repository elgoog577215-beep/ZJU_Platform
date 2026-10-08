const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const {
    migrateHackathonAiXVenueTracks: migrate,
} = require("../src/config/migrations/hackathonAiXVenueTracks");
const defaults = require("../../shared/hackathonAiX.json");
test("venue and track labels migrate once without changing identities, rules or other editions", async () => {
    const target = structuredClone(defaults);
    target.event.location = "浙江大学紫金港校区";
    target.event.duration = "学科入门 · 产业进阶 · 双赛道路演";
    const track = target.form.fields.find((f) => f.id === "track");
    track.options = [
        { value: "campus", label: "千问赛道" },
        { value: "industry", label: "华为赛道" },
    ];
    target.event.program.challenges = [{ title: "华为赛道：管理员题目", published: true }];
    const history = { event: { key: "zhekesong-current", location: "浙江大学紫金港校区" } };
    const db = await sqlite.open({ filename: ":memory:", driver: sqlite3.Database });
    await db.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)");
    const before = { revision: 7, events: [history, target] };
    await db.run("INSERT INTO settings VALUES ('hackathon_schedule_config', ?)", [
        JSON.stringify(before),
    ]);
    const read = async () =>
        JSON.parse(
            (await db.get("SELECT value FROM settings WHERE key = 'hackathon_schedule_config'"))
                .value
        );
    try {
        await migrate(db);
        const after = await read();
        assert.equal(after.events[1].event.location, "北2112 · 三墩镇元空间");
        assert.equal(after.events[1].event.duration, "千问入门 · 华为进阶 · 双赛道路演");
        assert.deepEqual(after.events[1].form.fields.find((f) => f.id === "track").options, [
            { value: "campus", label: "千问入门赛道" },
            { value: "industry", label: "华为进阶赛道" },
        ]);
        assert.deepEqual(after.events[1].event.program, target.event.program);
        assert.deepEqual(after.events[0], history);
        assert.equal(after.revision, 8);
        await migrate(db);
        assert.deepEqual(await read(), after);
    } finally {
        await db.close();
    }
});
test("a custom venue is preserved and missing events are not created", async () => {
    for (const events of [
        [],
        [{ event: { key: defaults.event.key, location: "管理员确认场地" } }],
    ]) {
        const db = await sqlite.open({ filename: ":memory:", driver: sqlite3.Database });
        await db.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)");
        const original = JSON.stringify({ events });
        await db.run("INSERT INTO settings VALUES ('hackathon_schedule_config', ?)", [original]);
        try {
            await migrate(db);
            assert.equal(
                (await db.get("SELECT value FROM settings WHERE key = 'hackathon_schedule_config'"))
                    .value,
                original
            );
        } finally {
            await db.close();
        }
    }
});
