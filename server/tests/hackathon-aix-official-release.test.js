const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const {
    migrateHackathonAiXOfficialRelease: migrate,
} = require("../src/config/migrations/hackathonAiXOfficialRelease");
const defaults = require("../../shared/hackathonAiX.json");
test("official release updates only the current edition copy, preserves signup and challenge data and is idempotent", async () => {
    const db = await sqlite.open({ filename: ":memory:", driver: sqlite3.Database });
    try {
        await db.exec(
            "CREATE TABLE settings (key TEXT PRIMARY KEY,value TEXT); CREATE TABLE hackathon_registrations(id INTEGER PRIMARY KEY,answers_json TEXT)"
        );
        const current = structuredClone(defaults);
        current.event.startAt = "2026-10-09T00:00";
        current.event.location = "时代强鹰三墩镇元空间";
        current.event.program.challenges = [
            { id: "draft", published: false },
            { id: "published", published: true },
        ];
        const history = {
            event: { key: "zhekesong-current", location: "Original" },
            navigation: { resultsVisible: true },
        };
        const schedule = {
            events: [history, current],
            revision: 8,
            activeEventKey: history.event.key,
        };
        await db.run("INSERT INTO settings VALUES('hackathon_schedule_config',?)", [
            JSON.stringify(schedule),
        ]);
        await db.run("INSERT INTO hackathon_registrations VALUES(1,?)", [
            '{"track":["campus","industry"]}',
        ]);
        const read = async () =>
            JSON.parse(
                (await db.get("SELECT value FROM settings WHERE key='hackathon_schedule_config'"))
                    .value
            );
        await migrate(db);
        const after = await read();
        assert.equal(after.events[1].event.startAt, "2026-10-11T00:00");
        assert.match(after.events[1].event.location, /管理学院/);
        assert.deepEqual(after.events[0], history);
        assert.deepEqual(after.events[1].event.program, current.event.program);
        assert.deepEqual(after.events[1].form, current.form);
        assert.equal(after.events[1].navigation.resultsVisible, false);
        assert.equal(after.activeEventKey, history.event.key);
        assert.equal(
            (await db.get("SELECT answers_json FROM hackathon_registrations WHERE id=1"))
                .answers_json,
            '{"track":["campus","industry"]}'
        );
        await migrate(db);
        assert.deepEqual(await read(), after);
    } finally {
        await db.close();
    }
});
