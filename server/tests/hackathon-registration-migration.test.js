const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const { runMigrations } = require("../src/config/runMigrations");

test("hackathon registration migration preserves legacy data and scopes uniqueness by event", async () => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    const originalLog = console.log;
    const originalWarn = console.warn;
    const warnings = [];
    console.log = () => {};
    console.warn = (...args) => warnings.push(args.map(String).join(" "));

    try {
        await db.exec(`
            CREATE TABLE hackathon_registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                student_id TEXT NOT NULL UNIQUE,
                major TEXT NOT NULL,
                grade TEXT NOT NULL,
                ai_tools TEXT NOT NULL,
                experience TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            INSERT INTO hackathon_registrations
                (name, student_id, major, grade, ai_tools, experience)
            VALUES
                ('旧报名', '3230100000', '计算机科学', 'junior', '["codex"]', '历史数据');
        `);

        await runMigrations(db);
        await runMigrations(db);

        const registrationColumns = await db.all("PRAGMA table_info(hackathon_registrations)");
        assert.equal(
            registrationColumns.some((column) => column.name === "event_key"),
            true,
            warnings.join("\n")
        );
        const legacyRow = await db.get(
            "SELECT * FROM hackathon_registrations WHERE student_id = ?",
            ["3230100000"]
        );
        assert.equal(legacyRow.name, "旧报名");
        assert.equal(legacyRow.event_key, "zhekesong-current");

        const uniqueIndexes = (await db.all("PRAGMA index_list(hackathon_registrations)")).filter(
            (index) => index.unique
        );
        const uniqueColumns = [];
        for (const index of uniqueIndexes) {
            uniqueColumns.push(
                (await db.all(`PRAGMA index_info(${index.name})`)).map((column) => column.name)
            );
        }
        assert.equal(
            uniqueColumns.some(
                (columns) => columns[0] === "event_key" && columns[1] === "student_id"
            ),
            true
        );

        await db.run(
            `INSERT INTO hackathon_registrations
                (event_key, name, student_id, major, grade, ai_tools)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ["zhekesong-second", "第二场报名", "3230100000", "计算机科学", "junior", "[]"]
        );
        const count = await db.get(
            "SELECT COUNT(*) AS count FROM hackathon_registrations WHERE student_id = ?",
            ["3230100000"]
        );
        assert.equal(count.count, 2);
    } finally {
        console.log = originalLog;
        console.warn = originalWarn;
        await db.close();
    }
});
