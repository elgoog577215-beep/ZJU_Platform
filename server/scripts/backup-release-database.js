const fs = require("node:fs");
const path = require("node:path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function backupDatabase(source, destination) {
    // Read-only source + VACUUM INTO takes a consistent snapshot including WAL.
    // Never copy a live SQLite file without its committed WAL contents.
    const db = await open({
        filename: source,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READONLY,
    });
    try {
        await db.exec("PRAGMA busy_timeout=10000");
        await db.run("VACUUM INTO ?", [destination]);
    } finally {
        await db.close();
    }
    fs.chmodSync(destination, 0o600);
    const backup = await open({
        filename: destination,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READONLY,
    });
    try {
        const rows = await backup.all("PRAGMA quick_check");
        if (rows.length !== 1 || rows[0].quick_check !== "ok")
            throw new Error("Database backup integrity check failed");
    } finally {
        await backup.close();
    }
}

async function main() {
    const [serverDirectory, releaseId] = process.argv.slice(2);
    if (!serverDirectory || !/^[a-f0-9]{40}$/.test(releaseId || ""))
        throw new Error("Require current server directory and release commit");
    const root = path.resolve(serverDirectory);
    const env = require("dotenv").parse(fs.readFileSync(path.join(root, ".env")));
    const source = path.resolve(
        root,
        process.env.DATABASE_FILE || env.DATABASE_FILE || "database.sqlite"
    );
    const directory = path.join(root, "backups");
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const destination = path.join(directory, `pre-release-${releaseId}-${Date.now()}.sqlite`);
    process.umask(0o077);
    await backupDatabase(source, destination);
    console.log("Pre-release SQLite backup verified:", path.basename(destination));
}
if (require.main === module)
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
module.exports = { backupDatabase };
