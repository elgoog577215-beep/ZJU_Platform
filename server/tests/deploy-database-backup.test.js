const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { backupDatabase } = require("../scripts/backup-release-database");
test("release backup includes committed WAL, stays private, and fails without replacing an existing backup", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-backup-"));
    const source = path.join(dir, "source.sqlite"),
        target = path.join(dir, "backup.sqlite");
    const db = await open({ filename: source, driver: sqlite3.Database });
    try {
        await db.exec(
            "PRAGMA journal_mode=WAL; CREATE TABLE registrations(id INTEGER PRIMARY KEY, value TEXT); INSERT INTO registrations VALUES(1,'preserve');"
        );
        await backupDatabase(source, target);
        const snapshot = await open({ filename: target, driver: sqlite3.Database });
        try {
            assert.equal((await snapshot.get("SELECT value FROM registrations")).value, "preserve");
        } finally {
            await snapshot.close();
        }
        assert.equal(fs.statSync(target).mode & 0o777, 0o600);
        await assert.rejects(backupDatabase(source, target));
        await assert.rejects(
            backupDatabase(path.join(dir, "missing.sqlite"), path.join(dir, "empty.sqlite"))
        );
        assert.equal(fs.existsSync(path.join(dir, "missing.sqlite")), false);
        assert.equal((await db.get("SELECT value FROM registrations")).value, "preserve");
    } finally {
        await db.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
