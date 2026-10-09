const MARKER = "hackathon_ai_x_two_page_results_hidden_v1";
async function migrateHackathonAiXSimplify(db) {
    await db.exec("BEGIN IMMEDIATE");
    try {
        if (!(await db.get("SELECT value FROM settings WHERE key=?", [MARKER]))) {
            const row = await db.get(
                "SELECT value FROM settings WHERE key='hackathon_schedule_config'"
            );
            const schedule = row ? JSON.parse(row.value) : null;
            const event = schedule?.events?.find(
                (item) => item.event?.key === "zhekesong-ai-x-2026"
            );
            if (event && event.navigation?.resultsVisible !== false) {
                event.navigation = { ...event.navigation, resultsVisible: false };
                event.revision = Number(event.revision || 1) + 1;
                event.updatedAt = new Date().toISOString();
                schedule.revision = Number(schedule.revision || 1) + 1;
                schedule.updatedAt = event.updatedAt;
                await db.run("UPDATE settings SET value=? WHERE key='hackathon_schedule_config'", [
                    JSON.stringify(schedule),
                ]);
            }
            await db.run("INSERT INTO settings(key,value) VALUES(?,'1')", [MARKER]);
        }
        await db.exec("COMMIT");
    } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
    }
}
module.exports = { migrateHackathonAiXSimplify };
