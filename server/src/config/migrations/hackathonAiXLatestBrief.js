const EVENT_KEY = "zhekesong-ai-x-2026";
const MARKER = "hackathon_ai_x_october_9_brief_v1";

// Apply the organizer's latest brief once. Keep account records, other editions,
// published challenge content and registration permissions untouched.
async function migrateHackathonAiXLatestBrief(db) {
    await db.exec("BEGIN IMMEDIATE");
    try {
        if (!(await db.get("SELECT value FROM settings WHERE key = ?", [MARKER]))) {
            const stored = await db.get(
                "SELECT value FROM settings WHERE key = 'hackathon_schedule_config'"
            );
            const schedule = stored ? JSON.parse(stored.value) : null;
            const template = schedule?.events?.find((item) => item.event?.key === EVENT_KEY);
            if (template) {
                const defaults = require("../../../../shared/hackathonAiX.json");
                for (const key of [
                    "location",
                    "description",
                    "format",
                    "duration",
                    "prizeValue",
                    "prizeUnit",
                ]) {
                    template.event[key] = defaults.event[key];
                }
                const program = template.event.program;
                if (program) {
                    program.challengeReleaseAt = defaults.event.program.challengeReleaseAt;
                    for (const stage of program.stages || []) {
                        if (stage.id === "initial") {
                            if (
                                ["2026-10-18T09:30:00+08:00", "2026-10-18T11:00:00+08:00"].includes(
                                    stage.opensAt
                                )
                            )
                                stage.opensAt = "2026-10-18T11:00:00+08:00";
                            if (
                                ["2026-10-18T15:30:00+08:00", "2026-10-18T17:00:00+08:00"].includes(
                                    stage.closesAt
                                )
                            )
                                stage.closesAt = "2026-10-18T16:00:00+08:00";
                        }
                        if (
                            stage.id === "semifinal" &&
                            stage.closesAt === "2026-10-23T00:00:00+08:00"
                        )
                            stage.closesAt = "2026-10-25T00:00:00+08:00";
                    }
                }
                const rename = (text) =>
                    typeof text === "string"
                        ? text
                              .replaceAll("千问入门赛道", "千问·学科入门赛道")
                              .replaceAll("华为进阶赛道", "华为·产业进阶赛道")
                        : text;
                if (template.form) {
                    template.form.description = rename(template.form.description);
                    const track = template.form.fields?.find((field) => field.id === "track");
                    if (track) {
                        track.placeholder = rename(track.placeholder);
                        for (const option of track.options || [])
                            option.label = rename(option.label);
                    }
                }
                for (const rule of template.rules || [])
                    rule.description = rename(rule.description);
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
module.exports = { migrateHackathonAiXLatestBrief };
