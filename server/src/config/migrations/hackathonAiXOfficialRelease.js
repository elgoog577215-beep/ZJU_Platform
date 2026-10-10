const KEY = "zhekesong-ai-x-2026";
const MARKER = "hackathon_ai_x_official_release_20261010_v1";
async function migrateHackathonAiXOfficialRelease(db) {
    await db.exec("BEGIN IMMEDIATE");
    try {
        if (!(await db.get("SELECT value FROM settings WHERE key = ?", [MARKER]))) {
            const stored = await db.get(
                "SELECT value FROM settings WHERE key = 'hackathon_schedule_config'"
            );
            const schedule = stored ? JSON.parse(stored.value) : null;
            const template = schedule?.events?.find((item) => item.event?.key === KEY);
            if (template) {
                const defaults = require("../../../../shared/hackathonAiX.json");
                for (const key of ["startAt", "subtitle", "location", "duration", "prizeValue"])
                    template.event[key] = defaults.event[key];
                // Publication is an explicit editorial decision, independent of date or tab visibility.
                template.navigation = { ...template.navigation, resultsVisible: false };
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
            await db.run("INSERT INTO settings (key, value) VALUES (?, '1')", [MARKER]);
        }
        await db.exec("COMMIT");
    } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
    }
}
module.exports = { migrateHackathonAiXOfficialRelease };
