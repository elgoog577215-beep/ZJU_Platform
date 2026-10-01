// Usage: node server/scripts/publish-getui-beauty.js --database /private/db.sqlite
//        --backup /private/backups/before-beauty.sqlite --publish
const fs = require("node:fs");
const path = require("node:path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { publishHackathonGetuiBeauty } = require("../src/config/migrations/hackathonGetuiBeauty");

async function main() {
    const args = process.argv.slice(2);
    const value = (key) => args[args.indexOf(key) + 1];
    if (!args.includes("--publish") || !args.includes("--database") || !args.includes("--backup")) {
        throw new Error("Specify --database, a new --backup path, and --publish");
    }
    const database = path.resolve(value("--database"));
    const backup = path.resolve(value("--backup"));
    const repo = path.resolve(__dirname, "../..");
    if (!fs.existsSync(database) || fs.existsSync(backup)) {
        throw new Error("Database must exist and backup must not already exist");
    }
    if (backup === repo || backup.startsWith(`${repo}${path.sep}`)) {
        throw new Error("Backups must be outside the repository");
    }
    const db = await open({
        filename: database,
        driver: sqlite3.Database,
        mode: sqlite3.OPEN_READWRITE,
    });
    try {
        await db.exec("PRAGMA busy_timeout = 5000");
        await db.run("VACUUM INTO ?", [backup]);
        fs.chmodSync(backup, 0o600);
        const snapshot = await open({
            filename: backup,
            driver: sqlite3.Database,
            mode: sqlite3.OPEN_READONLY,
        });
        try {
            const check = await snapshot.get("PRAGMA integrity_check");
            if (check.integrity_check !== "ok") throw new Error("Backup integrity check failed");
        } finally {
            await snapshot.close();
        }
        const result = await publishHackathonGetuiBeauty(db);
        console.log(JSON.stringify({ ...result, backupVerified: true }));
    } finally {
        await db.close();
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
