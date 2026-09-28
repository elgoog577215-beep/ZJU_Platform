const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const resources = require("../../../../shared/ecosystemResources.json");
const IMPORT_KEY = "ecosystem-resources-2026-09-29";

const aliasesOf = (record) => {
    if (Array.isArray(record.event_organizer_aliases)) return record.event_organizer_aliases;
    try {
        const aliases = JSON.parse(record.event_organizer_aliases || "[]");
        return Array.isArray(aliases) ? aliases : [];
    } catch {
        return [];
    }
};
const namesOf = (record) =>
    [record.name, record.name_en, ...aliasesOf(record)]
        .filter(Boolean)
        .map((name) => String(name).trim().toLowerCase());

// Import once. Preserve IDs, profile ownership, curated copy, disabled/deleted
// records and all subsequent admin edits. Public directory membership is explicit.
async function migrateEcosystemResources(db) {
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
            `ecosystem-resources-${Date.now()}-${randomUUID()}.sqlite`
        );
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
            const existing = await db.all("SELECT * FROM ecosystem_partners");
            for (const resource of resources) {
                const names = new Set(namesOf(resource));
                const matches = existing.filter((record) =>
                    namesOf(record).some((name) => names.has(name))
                );
                if (matches.length > 1)
                    throw new Error(`Ambiguous ecosystem resource: ${resource.name}`);
                const record = matches[0];
                if (record) {
                    if (record.deleted_at || !record.enabled) continue;
                    const aliases = [
                        ...new Set([
                            ...aliasesOf(record),
                            resource.name,
                            resource.name_en,
                            ...resource.event_organizer_aliases,
                        ]),
                    ];
                    await db.run(
                        `UPDATE ecosystem_partners SET support_category = ?, partner_scope = 'core_partner', featured = 1, event_organizer_aliases = ?, updated_at = datetime('now') WHERE id = ?`,
                        [resource.support_category, JSON.stringify(aliases), record.id]
                    );
                    continue;
                }
                await db.run(
                    `INSERT INTO ecosystem_partners (category, support_category, name, name_en, event_organizer_aliases, sort_order, enabled, featured, partner_scope)
                    VALUES (?, ?, ?, ?, ?, ?, 1, 1, 'core_partner')`,
                    [
                        resource.category,
                        resource.support_category,
                        resource.name,
                        resource.name_en,
                        JSON.stringify(resource.event_organizer_aliases),
                        resource.sort_order,
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
module.exports = { migrateEcosystemResources };
