const test = require("node:test");
const assert = require("node:assert/strict");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { migrateHackathonAiXSimplify } = require("../src/config/migrations/hackathonAiXSimplify");
const { resultsPublishedSql } = require("../src/services/competitionPublication");
test("hide AI+X results once, preserve other editions, signup and briefs, and exclude public works", async () => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    try {
        await db.exec(
            "CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE competitions(id INTEGER PRIMARY KEY,slug TEXT); CREATE TABLE works(id INTEGER PRIMARY KEY, competition_id INTEGER); INSERT INTO competitions VALUES(1,'first'),(2,'aix'); INSERT INTO works VALUES(1,1),(2,2);"
        );
        const first = {
            event: { key: "zhekesong-current" },
            navigation: { resultsVisible: true },
            results: { competitionSlug: "first" },
        };
        const aix = {
            event: {
                key: "zhekesong-ai-x-2026",
                registrationOpen: true,
                program: { challenges: [{ id: "preserved" }] },
            },
            navigation: { resultsVisible: true, registrationVisible: true },
            results: { competitionSlug: "aix" },
        };
        const schedule = { events: [first, aix], activeEventKey: first.event.key, revision: 7 };
        await db.run("INSERT INTO settings VALUES('hackathon_schedule_config',?)", [
            JSON.stringify(schedule),
        ]);
        await migrateHackathonAiXSimplify(db);
        const row = await db.get(
            "SELECT value FROM settings WHERE key='hackathon_schedule_config'"
        );
        const saved = JSON.parse(row.value);
        assert.deepEqual(saved.events[0], first);
        assert.deepEqual(saved.events[1].event, aix.event);
        assert.equal(saved.events[1].navigation.resultsVisible, false);
        assert.equal(saved.events[1].navigation.registrationVisible, true);
        assert.equal(saved.activeEventKey, first.event.key);
        assert.deepEqual(
            await db.all(`SELECT id FROM works cw WHERE ${resultsPublishedSql("cw")}`),
            [{ id: 1 }]
        );
        await migrateHackathonAiXSimplify(db);
        assert.deepEqual(
            await db.get("SELECT value FROM settings WHERE key='hackathon_schedule_config'"),
            row
        );
        saved.events[1].navigation.resultsVisible = true;
        await db.run("UPDATE settings SET value=? WHERE key='hackathon_schedule_config'", [
            JSON.stringify(saved),
        ]);
        await migrateHackathonAiXSimplify(db);
        assert.equal(
            JSON.parse(
                (await db.get("SELECT value FROM settings WHERE key='hackathon_schedule_config'"))
                    .value
            ).events[1].navigation.resultsVisible,
            true
        );
    } finally {
        await db.close();
    }
});
test("AI+X has two page tabs and retired links redirect without changing first edition", async () => {
    const { resolveEventLocation, getEventViews } =
        await import("../../src/utils/hackathonRoute.js");
    const schedule = {
        events: [
            { event: { key: "zhekesong-ai-x-2026" }, results: {} },
            { event: { key: "zhekesong-current" }, results: {} },
        ],
    };
    assert.deepEqual(getEventViews("zhekesong-ai-x-2026"), ["intro", "challenges"]);
    for (const view of ["media", "results"]) {
        assert.equal(
            resolveEventLocation({ pathname: `/hackathon/2/${view}`, hash: "#old" }, schedule).url,
            "/hackathon/2"
        );
        assert.equal(
            resolveEventLocation({ pathname: `/hackathon/1/${view}` }, schedule).view,
            view
        );
    }
    assert.equal(
        resolveEventLocation({ pathname: "/hackathon/2/challenges", hash: "#submission" }, schedule)
            .url,
        "/hackathon/2/challenges#submission"
    );
});
