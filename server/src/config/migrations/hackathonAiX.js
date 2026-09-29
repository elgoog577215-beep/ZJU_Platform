const template = require("../../../../shared/hackathonAiX.json");
const { getHackathonSchedule } = require("../../services/hackathonTemplateService");

async function migrateHackathonAiX(db) {
    const columns = await db.all("PRAGMA table_info(hackathon_registrations)");
    if (!columns.some((column) => column.name === "user_id")) {
        await db.exec(
            "ALTER TABLE hackathon_registrations ADD COLUMN user_id INTEGER REFERENCES users(id)"
        );
    }
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_hackathon_registration_user
        ON hackathon_registrations(event_key, user_id) WHERE user_id IS NOT NULL`);
    // The second edition is still a local prototype, not a production publication.
    if (process.env.NODE_ENV === "production") return;
    const marker = "hackathon_ai_x_2026_seeded";
    if (await db.get("SELECT value FROM settings WHERE key = ?", [marker])) return;
    const schedule = await getHackathonSchedule(db);
    // Preserve the exact stored historical templates, including operator extensions.
    const stored = await db.get(
        "SELECT value FROM settings WHERE key = 'hackathon_schedule_config'"
    );
    const current = stored ? JSON.parse(stored.value) : schedule;
    if (!current.events.some((item) => item.event.key === template.event.key)) {
        current.events.push(template);
        current.activeEventKey = template.event.key;
        current.revision = Number(current.revision || 1) + 1;
    }
    await db.exec("BEGIN IMMEDIATE");
    try {
        await db.run(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('hackathon_schedule_config', ?)",
            [JSON.stringify(current)]
        );
        await db.run(
            `INSERT OR IGNORE INTO competitions
            (slug, title, subtitle, description, event_date, is_featured, status)
            VALUES (?, ?, ?, ?, ?, 0, 'active')`,
            [
                template.results.competitionSlug,
                template.event.title,
                template.event.subtitle,
                template.event.description,
                "2026-10-18",
            ]
        );
        await db.run("INSERT INTO settings (key, value) VALUES (?, '1')", [marker]);
        await db.exec("COMMIT");
    } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
    }
}
module.exports = { migrateHackathonAiX };
