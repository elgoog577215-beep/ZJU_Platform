const EVENT_KEY = "zhekesong-ai-x-2026";
const MARKER = "hackathon_ai_x_october_8_schedule_v1";

// Correct only dates from the superseded brief. Preserve operator changes,
// registration cutoffs, published challenges, historical editions and answers.
async function migrateHackathonAiXOctoberSchedule(db) {
    await db.exec("BEGIN IMMEDIATE");
    try {
        if (!(await db.get("SELECT value FROM settings WHERE key = ?", [MARKER]))) {
            const stored = await db.get(
                "SELECT value FROM settings WHERE key = 'hackathon_schedule_config'"
            );
            const schedule = stored ? JSON.parse(stored.value) : null;
            const template = schedule?.events?.find((item) => item.event?.key === EVENT_KEY);
            if (template) {
                const before = JSON.stringify(template);
                const event = template.event;
                if (event.startAt === "2026-10-18T09:00") event.startAt = "2026-10-09T00:00";
                if (event.endAt === "2026-10-24T17:00") event.endAt = "2026-10-25T17:00";
                for (const stage of event.program?.stages || []) {
                    if (stage.id === "initial") {
                        if (stage.opensAt === "2026-10-18T11:00:00+08:00")
                            stage.opensAt = "2026-10-18T09:30:00+08:00";
                        if (stage.closesAt === "2026-10-18T17:00:00+08:00")
                            stage.closesAt = "2026-10-18T15:30:00+08:00";
                    }
                    if (stage.id === "final") {
                        if (stage.opensAt === "2026-10-24T13:30:00+08:00")
                            stage.opensAt = "2026-10-25T13:30:00+08:00";
                        if (stage.closesAt === "2026-10-24T15:30:00+08:00")
                            stage.closesAt = "2026-10-25T15:30:00+08:00";
                    }
                }
                if (JSON.stringify(template) !== before) {
                    const updatedAt = new Date().toISOString();
                    template.updatedAt = updatedAt;
                    template.revision = Number(template.revision || 1) + 1;
                    schedule.updatedAt = updatedAt;
                    schedule.revision = Number(schedule.revision || 1) + 1;
                    await db.run(
                        "UPDATE settings SET value = ? WHERE key = 'hackathon_schedule_config'",
                        [JSON.stringify(schedule)]
                    );
                }
            }
            await db.run("INSERT INTO settings (key, value) VALUES (?, '1')", [MARKER]);
        }
        await db.exec("COMMIT");
    } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
    }
}
module.exports = { migrateHackathonAiXOctoberSchedule };
