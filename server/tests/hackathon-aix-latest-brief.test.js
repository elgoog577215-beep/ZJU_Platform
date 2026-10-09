const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const {
    migrateHackathonAiXLatestBrief: migrate,
} = require("../src/config/migrations/hackathonAiXLatestBrief");
const defaults = require("../../shared/hackathonAiX.json");

async function database(schedule) {
    const db = await sqlite.open({ filename: ":memory:", driver: sqlite3.Database });
    await db.exec(
        "CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT); CREATE TABLE hackathon_registrations (id INTEGER PRIMARY KEY, answers_json TEXT)"
    );
    await db.run("INSERT INTO settings VALUES ('hackathon_schedule_config', ?)", [
        JSON.stringify(schedule),
    ]);
    await db.run("INSERT INTO hackathon_registrations VALUES (1, ?)", [
        '{"track":["campus","industry"]}',
    ]);
    return db;
}
const read = async (db) =>
    JSON.parse(
        (await db.get("SELECT value FROM settings WHERE key = 'hackathon_schedule_config'")).value
    );
test("latest brief extends semifinals and corrects initial hours without disturbing participant or operator data", async () => {
    const event = structuredClone(defaults);
    event.event.program.stages[0] = {
        id: "initial",
        opensAt: "2026-10-18T09:30:00+08:00",
        closesAt: "2026-10-18T15:30:00+08:00",
    };
    event.event.program.stages[1].closesAt = "2026-10-23T00:00:00+08:00";
    event.event.program.challenges = [
        {
            id: "released",
            title: "Official brief",
            published: true,
            briefUrl: "https://example.com/task",
        },
    ];
    event.event.program.registrationClosesAt = "2026-10-17T12:00:00+08:00";
    event.form.fields.find((f) => f.id === "track").options[0].label = "千问入门赛道";
    const historical = { event: { key: "zhekesong-current" }, custom: "Preserve" };
    const db = await database({
        revision: 5,
        activeEventKey: historical.event.key,
        events: [historical, event],
    });
    try {
        await migrate(db);
        const updated = await read(db),
            program = updated.events[1].event.program;
        assert.equal(program.stages[0].opensAt, "2026-10-18T11:00:00+08:00");
        assert.equal(program.stages[0].closesAt, "2026-10-18T16:00:00+08:00");
        assert.equal(program.stages[1].closesAt, "2026-10-25T00:00:00+08:00");
        assert.deepEqual(program.challenges, event.event.program.challenges);
        assert.equal(program.registrationClosesAt, event.event.program.registrationClosesAt);
        assert.deepEqual(updated.events[0], historical);
        assert.equal(updated.activeEventKey, historical.event.key);
        assert.equal(
            (await db.get("SELECT answers_json FROM hackathon_registrations WHERE id = 1"))
                .answers_json,
            '{"track":["campus","industry"]}'
        );
        assert.deepEqual(
            updated.events[1].form.fields.find((f) => f.id === "track").options.map((o) => o.value),
            ["campus", "industry"]
        );
        assert.equal(updated.revision, 6);
        await migrate(db);
        assert.deepEqual(await read(db), updated);
    } finally {
        await db.close();
    }
});
test("keeps custom operator deadlines and does not create a missing event", async () => {
    for (const events of [
        [],
        [
            {
                event: {
                    key: defaults.event.key,
                    program: {
                        stages: [
                            {
                                id: "initial",
                                opensAt: "2026-10-18T12:00:00+08:00",
                                closesAt: "2026-10-18T18:00:00+08:00",
                            },
                            { id: "semifinal", closesAt: "2026-10-24T18:00:00+08:00" },
                        ],
                    },
                },
            },
        ],
    ]) {
        const before = structuredClone(events);
        const db = await database({ events });
        try {
            await migrate(db);
            const updated = await read(db);
            if (events.length)
                assert.deepEqual(
                    updated.events[0].event.program.stages,
                    before[0].event.program.stages
                );
            else assert.deepEqual(updated.events, []);
        } finally {
            await db.close();
        }
    }
});
