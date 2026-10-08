const EVENT_KEY = "zhekesong-ai-x-2026";
const MARKER = "hackathon_ai_x_october_8_venue_tracks_v1";
const rename = (text) =>
    typeof text === "string"
        ? text
              .replaceAll("学科入门", "千问入门")
              .replaceAll("产业进阶", "华为进阶")
              .replaceAll("千问赛道", "千问入门赛道")
              .replaceAll("华为赛道", "华为进阶赛道")
        : text;

// Migrate only this event's public labels. Stored answers, field IDs, track values,
// registration rules, authored challenge briefs and historical events are untouched.
async function migrateHackathonAiXVenueTracks(db) {
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
                if (template.event.location === "浙江大学紫金港校区")
                    template.event.location = "北2112 · 三墩镇元空间";
                for (const key of ["format", "duration"]) {
                    if (key in template.event) template.event[key] = rename(template.event[key]);
                }
                for (const rule of template.rules || []) {
                    if (rule.id === "cross_discipline") rule.description = rename(rule.description);
                }
                if (template.form) {
                    template.form.description = rename(template.form.description);
                    const field = template.form.fields?.find((item) => item.id === "track");
                    if (field) {
                        field.placeholder = rename(field.placeholder);
                        for (const option of field.options || [])
                            option.label = rename(option.label);
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
module.exports = { migrateHackathonAiXVenueTracks };
