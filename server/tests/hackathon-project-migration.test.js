const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const { runMigrations } = require("../src/config/runMigrations");

test("project relation migration preserves legacy competition works and is idempotent", async () => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = () => {};
    console.warn = () => {};

    try {
        await db.exec(`
            CREATE TABLE competition_works (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                competition_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                summary TEXT NOT NULL,
                git_url TEXT,
                status TEXT DEFAULT 'approved'
            );
            INSERT INTO competition_works
                (competition_id, title, author, summary, git_url, status)
            VALUES
                (1, '历史作品', '旧作者', '旧简介', 'https://example.com/legacy', 'approved');
        `);

        await runMigrations(db);
        await db.run(
            `UPDATE competition_works
                SET deployment_provider = 'modelscope',
                    deployment_url = 'https://modelscope.cn/studios/example/demo'
              WHERE title = '历史作品'`
        );
        await runMigrations(db);

        const columns = await db.all("PRAGMA table_info(competition_works)");
        assert.equal(
            columns.some((column) => column.name === "project_id"),
            true
        );
        assert.equal(
            columns.some((column) => column.name === "deployment_provider"),
            true
        );
        assert.equal(
            columns.some((column) => column.name === "deployment_url"),
            true
        );

        const projectColumns = await db.all("PRAGMA table_info(project_cards)");
        assert.equal(
            projectColumns.some((column) => column.name === "deployment_provider"),
            true
        );
        assert.equal(
            projectColumns.some((column) => column.name === "deployment_url"),
            true
        );

        const legacy = await db.get("SELECT * FROM competition_works WHERE title = '历史作品'");
        assert.equal(legacy.author, "旧作者");
        assert.equal(legacy.project_id, null);
        assert.equal(legacy.deployment_provider, "modelscope");
        assert.equal(legacy.deployment_url, "https://modelscope.cn/studios/example/demo");

        const indexes = await db.all("PRAGMA index_list(competition_works)");
        assert.equal(
            indexes.some((index) => index.name === "idx_competition_works_project"),
            true
        );
        assert.equal(
            indexes.some(
                (index) =>
                    index.name === "idx_competition_works_comp_project_unique" && index.unique === 1
            ),
            true
        );
    } finally {
        console.log = originalLog;
        console.warn = originalWarn;
        await db.close();
    }
});
