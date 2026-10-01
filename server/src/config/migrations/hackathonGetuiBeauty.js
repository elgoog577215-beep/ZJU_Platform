const template = require("../../../../shared/hackathonGetuiBeauty.json");
const { getHackathonSchedule } = require("../../services/hackathonTemplateService");

// Publication is explicit in production. Development uses the same data contract.
// Preserve every existing event verbatim and never change the active event.
async function publishHackathonGetuiBeauty(db) {
    await db.exec("BEGIN IMMEDIATE");
    try {
        const stored = await db.get(
            "SELECT value FROM settings WHERE key = 'hackathon_schedule_config'"
        );
        const schedule = stored ? JSON.parse(stored.value) : await getHackathonSchedule(db);
        if (!Array.isArray(schedule.events) || !schedule.events.length) {
            throw new Error("Cannot publish into an invalid hackathon schedule");
        }
        const matching = schedule.events.filter((item) => item.event?.key === template.event.key);
        if (
            matching.length > 1 ||
            (matching[0] &&
                matching[0].results?.competitionSlug !== template.results.competitionSlug) ||
            schedule.events.some(
                (item) =>
                    item.event?.key !== template.event.key &&
                    item.results?.competitionSlug === template.results.competitionSlug
            )
        ) {
            throw new Error("Beauty event identity conflicts with an existing event");
        }
        const added = !matching.length;
        if (added) {
            schedule.events.push(template);
            schedule.revision = Number(schedule.revision || 1) + 1;
            schedule.updatedAt = new Date().toISOString();
            await db.run(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('hackathon_schedule_config', ?)",
                [JSON.stringify(schedule)]
            );
        }
        // Existing competition content and publication state belong to its operators.
        await db.run(
            `INSERT OR IGNORE INTO competitions
             (slug, title, subtitle, description, event_date, is_featured, status)
             VALUES (?, ?, ?, ?, ?, 0, 'active')`,
            [
                template.results.competitionSlug,
                template.event.title,
                template.event.subtitle,
                template.event.description,
                template.event.startAt.slice(0, 10),
            ]
        );
        const competition = await db.get("SELECT id FROM competitions WHERE slug = ?", [
            template.results.competitionSlug,
        ]);
        await db.exec("COMMIT");
        return { added, eventKey: template.event.key, competitionId: competition.id };
    } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
    }
}

async function migrateHackathonGetuiBeauty(db) {
    if (process.env.NODE_ENV === "production") return;
    return publishHackathonGetuiBeauty(db);
}

module.exports = { migrateHackathonGetuiBeauty, publishHackathonGetuiBeauty };
