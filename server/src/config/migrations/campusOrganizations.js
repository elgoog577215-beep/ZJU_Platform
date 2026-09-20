const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const organizations = require("../../../../shared/campusOrganizations.json");
const IMPORT_KEY = "campus-organizations-2026-09-20";

// Import once: admin edits, disables, renames and deletions remain authoritative.
async function migrateCampusOrganizations(db) {
    const ledger = await db.get(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'campus_directory_imports'"
    );
    if (
        ledger &&
        (await db.get("SELECT import_key FROM campus_directory_imports WHERE import_key = ?", [
            IMPORT_KEY,
        ]))
    )
        return;

    const database = (await db.all("PRAGMA database_list")).find((row) => row.name === "main");
    if (database?.file) {
        const directory = path.join(path.dirname(database.file), "backups");
        await fs.mkdir(directory, { recursive: true, mode: 0o700 });
        const filename = path.join(
            directory,
            `campus-directory-${Date.now()}-${randomUUID()}.sqlite`
        );
        // SQLite makes a consistent snapshot before any directory mutation.
        await db.run("VACUUM INTO ?", [filename]);
        await fs.chmod(filename, 0o600);
    }

    await db.exec("BEGIN IMMEDIATE");
    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS campus_directory_imports (
            import_key TEXT PRIMARY KEY,
            imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        if (
            !(await db.get("SELECT import_key FROM campus_directory_imports WHERE import_key = ?", [
                IMPORT_KEY,
            ]))
        ) {
            for (const org of organizations) {
                // Also match aliases to avoid duplicating an existing, differently named record.
                const names = [org.name, org.name_en, ...org.event_organizer_aliases];
                const existing = await db.get(
                    `SELECT id FROM ecosystem_partners WHERE category = 'organization' AND (name IN (${names.map(() => "?").join(",")}) OR name_en = ?) LIMIT 1`,
                    [...names, org.name_en]
                );
                if (existing) continue;
                await db.run(
                    `INSERT INTO ecosystem_partners (
                    category, support_category, name, name_en, description, description_en,
                    event_organizer_aliases, logo_url, dark_logo_url, link_url,
                    sort_order, enabled, featured, partner_scope
                ) VALUES ('organization', 'club', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'activity_provider')`,
                    [
                        org.name,
                        org.name_en,
                        org.description,
                        org.description_en,
                        JSON.stringify(org.event_organizer_aliases),
                        org.logo_url,
                        org.logo_url,
                        org.link_url,
                        org.sort_order,
                    ]
                );
            }
            await db.run("INSERT INTO campus_directory_imports (import_key) VALUES (?)", [
                IMPORT_KEY,
            ]);
        }
        await db.exec("COMMIT");
    } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
    }
}
module.exports = { migrateCampusOrganizations };
