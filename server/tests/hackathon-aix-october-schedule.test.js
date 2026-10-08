const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const {
    migrateHackathonAiXOctoberSchedule: migrate,
} = require("../src/config/migrations/hackathonAiXOctoberSchedule");
const defaults = require("../../shared/hackathonAiX.json");

async function database(schedule) {
    const db = await sqlite.open({ filename: ":memory:", driver: sqlite3.Database });
    await db.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)");
    if (schedule)
        await db.run("INSERT INTO settings VALUES ('hackathon_schedule_config', ?)", [
            JSON.stringify(schedule),
        ]);
    return db;
}
async function read(db) {
    return JSON.parse(
        (await db.get("SELECT value FROM settings WHERE key = 'hackathon_schedule_config'")).value
    );
}
test("October brief updates the published event once, preserving signup, challenges and other editions", async () => {
    const event = structuredClone(defaults);
    event.event.endAt = "2026-10-24T17:00";
    const final = event.event.program.stages.find((s) => s.id === "final");
    final.opensAt = "2026-10-24T13:30:00+08:00";
    final.closesAt = "2026-10-24T15:30:00+08:00";
    event.event.program.challenges = [{ id: "private", published: false, title: "Operator draft" }];
    const historical = {
        event: { key: "zhekesong-current", endAt: "2026-05-10T14:00" },
        custom: true,
    };
    const schedule = {
        revision: 7,
        activeEventKey: historical.event.key,
        events: [historical, event],
    };
    const db = await database(schedule);
    try {
        await migrate(db);
        const updated = await read(db);
        assert.equal(updated.events[1].event.endAt, "2026-10-25T17:00");
        assert.equal(
            updated.events[1].event.program.stages.find((s) => s.id === "final").opensAt,
            "2026-10-25T13:30:00+08:00"
        );
        assert.deepEqual(updated.events[0], historical);
        assert.deepEqual(updated.events[1].form, event.form);
        assert.deepEqual(
            updated.events[1].event.program.challenges,
            event.event.program.challenges
        );
        assert.equal(
            updated.events[1].event.program.registrationClosesAt,
            event.event.program.registrationClosesAt
        );
        assert.equal(updated.activeEventKey, schedule.activeEventKey);
        assert.equal(updated.revision, 8);
        await migrate(db);
        assert.deepEqual(await read(db), updated);
    } finally {
        await db.close();
    }
});
test("does not overwrite a later operator schedule or publish a missing event", async () => {
    for (const schedule of [
        null,
        {
            revision: 2,
            events: [
                {
                    event: {
                        key: defaults.event.key,
                        endAt: "2026-10-26T18:00",
                        program: { stages: [{ id: "final", opensAt: "2026-10-26T12:00" }] },
                    },
                },
            ],
        },
    ]) {
        const db = await database(schedule);
        try {
            await migrate(db);
            if (schedule) assert.deepEqual(await read(db), schedule);
            else
                assert.equal(
                    await db.get(
                        "SELECT value FROM settings WHERE key = 'hackathon_schedule_config'"
                    ),
                    undefined
                );
        } finally {
            await db.close();
        }
    }
});
