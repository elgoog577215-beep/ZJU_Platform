const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const makeResponse = () => ({
    statusCode: 200,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(payload) {
        this.body = payload;
        return this;
    },
});

test("project admin list exposes reports and attribution, with audited takedown and restore", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zju-project-admin-"));
    process.env.DATABASE_FILE = path.join(tempDir, "database.sqlite");
    process.env.NODE_ENV = "test";

    const originalWarn = console.warn;
    const originalLog = console.log;
    console.warn = () => {};
    console.log = () => {};

    const { getDb, pool } = require("../src/config/db");
    const projectController = require("../src/controllers/projectCardController");

    try {
        const db = await getDb();
        await db.exec(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username TEXT,
                nickname TEXT
            );
            CREATE TABLE project_cards (
                id INTEGER PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                intro TEXT,
                content TEXT,
                progress TEXT DEFAULT 'idea',
                need_tags TEXT DEFAULT '[]',
                tech_tags TEXT DEFAULT '[]',
                repo_url TEXT,
                contact_wechat TEXT,
                contact_email TEXT,
                cover_url TEXT,
                images_json TEXT DEFAULT '[]',
                status TEXT DEFAULT 'published',
                likes INTEGER DEFAULT 0,
                views INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE project_reports (
                id INTEGER PRIMARY KEY,
                project_id INTEGER NOT NULL,
                reporter_id INTEGER NOT NULL,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE profiles (
                id INTEGER PRIMARY KEY,
                display_name TEXT,
                owner_user_id INTEGER,
                status TEXT DEFAULT 'active',
                deleted_at DATETIME
            );
            CREATE TABLE profile_members (
                id INTEGER PRIMARY KEY,
                profile_id INTEGER,
                user_id INTEGER,
                status TEXT DEFAULT 'active'
            );
            CREATE TABLE audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER,
                resource_type TEXT,
                resource_id INTEGER,
                action TEXT,
                reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.run(
            "INSERT INTO users (id, username, nickname) VALUES (1, 'owner', '项目发起人')"
        );
        await db.run(
            `INSERT INTO project_cards
                (id, user_id, title, progress, need_tags, tech_tags, status)
             VALUES (10, 1, '校园 AI 助手', 'dev', '["产品"]', '["React"]', 'published'),
                    (11, 1, '旧项目', 'pause', '[]', '[]', 'removed')`
        );
        await db.run(
            "INSERT INTO project_reports (id, project_id, reporter_id, reason) VALUES (1, 10, 2, '联系方式疑似失效')"
        );
        await db.run(
            "INSERT INTO profiles (id, display_name, owner_user_id, status) VALUES (5, '浙江大学 AI 社团', 1, 'active')"
        );

        const listResponse = makeResponse();
        await projectController.listAdminProjects(
            { query: { status: "all" }, user: { id: 99, role: "admin" } },
            listResponse,
            (error) => {
                if (error) throw error;
            }
        );

        assert.equal(listResponse.statusCode, 200);
        assert.equal(listResponse.body.total, 2);
        assert.equal(listResponse.body.items[0].id, 10);
        assert.equal(listResponse.body.items[0].report_count, 1);
        assert.deepEqual(listResponse.body.items[0].owner_profiles, ["浙江大学 AI 社团"]);

        const takedownResponse = makeResponse();
        await projectController.takedownProject(
            {
                params: { id: "10" },
                body: { reason: "举报核验后下架" },
                user: { id: 99, role: "admin" },
            },
            takedownResponse,
            (error) => {
                if (error) throw error;
            }
        );
        assert.deepEqual(takedownResponse.body, { success: true });
        assert.equal(
            (await db.get("SELECT status FROM project_cards WHERE id = 10")).status,
            "removed"
        );

        const restoreResponse = makeResponse();
        await projectController.restoreProject(
            { params: { id: "10" }, user: { id: 99, role: "admin" } },
            restoreResponse,
            (error) => {
                if (error) throw error;
            }
        );
        assert.deepEqual(restoreResponse.body, { success: true });
        assert.equal(
            (await db.get("SELECT status FROM project_cards WHERE id = 10")).status,
            "published"
        );

        const auditActions = await db.all(
            "SELECT action, reason FROM audit_logs WHERE resource_type = 'project_cards' ORDER BY id"
        );
        assert.deepEqual(auditActions, [
            { action: "takedown", reason: "举报核验后下架" },
            { action: "restore", reason: "Admin restored project" },
        ]);
    } finally {
        console.warn = originalWarn;
        console.log = originalLog;
        await pool.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
