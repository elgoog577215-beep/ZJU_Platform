const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

// Additive, transactional migration. Existing admins retain access once; subsequent
// starts never restore revoked grants. A failed backup/migration aborts startup.
async function migrateAdminAccess(db) {
    const columns = (await db.all("PRAGMA table_info(users)")).map((row) => row.name);
    const firstRun = !columns.includes("admin_access_version");
    if (firstRun) {
        const database = (await db.all("PRAGMA database_list")).find((row) => row.name === "main");
        const count = await db.get("SELECT COUNT(*) AS count FROM users");
        if (database?.file && count.count > 0) {
            const directory = path.join(path.dirname(database.file), "backups");
            await fs.mkdir(directory, { recursive: true, mode: 0o700 });
            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = path.join(directory, `admin-access-${stamp}-${randomUUID()}.sqlite`);
            await db.run("VACUUM INTO ?", [filename]);
            await fs.chmod(filename, 0o600);
            const snapshot = await open({
                filename,
                driver: sqlite3.Database,
                // FTS5 integrity_check writes temporary validation state even on a
                // valid database. Validate the private copy through a writable handle.
                mode: sqlite3.OPEN_READWRITE,
            });
            try {
                const check = await snapshot.get("PRAGMA integrity_check");
                const backupCount = await snapshot.get("SELECT COUNT(*) AS count FROM users");
                if (Object.values(check)[0] !== "ok") {
                    throw new Error("Administrator access backup integrity check failed");
                }
                if (backupCount.count !== count.count) {
                    throw new Error("Administrator access backup account count mismatch");
                }
            } finally {
                await snapshot.close();
            }
        }
    }
    await db.exec("BEGIN IMMEDIATE");
    try {
        for (const [name, definition] of Object.entries({
            admin_permissions: "TEXT DEFAULT '[]'",
            auth_version: "INTEGER NOT NULL DEFAULT 0",
            admin_access_version: "INTEGER NOT NULL DEFAULT 0",
        })) {
            if (!columns.includes(name))
                await db.exec(`ALTER TABLE users ADD COLUMN ${name} ${definition}`);
        }
        if (firstRun) {
            await db.run(
                "UPDATE users SET role = 'operator', admin_scope = 'operations', review_permission = 'normal' WHERE role = 'admin' AND admin_scope = 'organization'"
            );
            await db.run("UPDATE users SET admin_scope = 'platform' WHERE role = 'admin'");
        }
        await db.exec("COMMIT");
    } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
    }
}
module.exports = { migrateAdminAccess };
