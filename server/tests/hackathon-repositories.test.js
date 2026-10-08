const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
    normalizeRepositoryUrl,
    AIX_EVENT_KEY,
} = require("../src/services/hackathonRepositoryService");

test("repository URLs accept canonical repositories and reject lookalikes or unsafe links", () => {
    assert.equal(
        normalizeRepositoryUrl(" https://www.github.com/owner/repo.git/ ", "github"),
        "https://github.com/owner/repo"
    );
    for (const kind of ["models", "datasets", "studios"]) {
        assert.equal(
            normalizeRepositoryUrl(
                `https://modelscope.cn/${kind}/owner/repo/summary`,
                "modelscope"
            ),
            `https://modelscope.cn/${kind}/owner/repo`
        );
    }
    for (const provider of ["github", "modelscope"]) {
        for (const url of [
            "javascript:alert(1)",
            "http://github.com/a/b",
            "https://github.com.evil.test/a/b",
            "https://github.com@evil.test/a/b",
            "https://user:secret@github.com/a/b",
            "https://github.com/a/b?token=secret",
            "https://github.com/a/b#readme",
            "https://github.com:444/a/b",
            "https://github.com/a",
            "https://github.com/a/b/issues",
            {},
            "x".repeat(1001),
        ]) {
            assert.throws(() => normalizeRepositoryUrl(url, provider), String(url));
        }
    }
    assert.throws(() =>
        normalizeRepositoryUrl("https://modelscope.cn/studios/owner", "modelscope")
    );
    assert.throws(() => normalizeRepositoryUrl("https://modelscope.cn/owner/repo", "modelscope"));
});

test("real SQLite registration, private repository persistence, edits, deadline and repeat migration", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aix-repositories-"));
    process.env.DATABASE_FILE = path.join(dir, "test.sqlite");
    process.env.NODE_ENV = "test";
    const { getDb, pool } = require("../src/config/db");
    const controller = require("../src/controllers/hackathonController");
    const {
        migrateHackathonRepositories,
    } = require("../src/config/migrations/hackathonRepositories");
    const { saveHackathonTemplate } = require("../src/services/hackathonTemplateService");
    const invoke = async (handler, req) => {
        const res = {
            statusCode: 200,
            headers: {},
            setHeader(k, v) {
                this.headers[k] = v;
            },
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(body) {
                this.body = body;
                return this;
            },
        };
        await handler(req, res, (e) => {
            throw e;
        });
        return res;
    };
    try {
        const db = await getDb();
        await db.exec(`CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT);
            CREATE TABLE competitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                subtitle TEXT,
                description TEXT,
                event_date TEXT,
                cover_image TEXT,
                is_featured INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT
            );

            CREATE TABLE users(id INTEGER PRIMARY KEY); INSERT INTO users VALUES(1),(2),(3);
            CREATE TABLE hackathon_registrations(id INTEGER PRIMARY KEY AUTOINCREMENT, event_key TEXT, user_id INTEGER, name TEXT, student_id TEXT, major TEXT, grade TEXT, ai_tools TEXT, experience TEXT, form_data_json TEXT, template_revision INTEGER, created_at TEXT, UNIQUE(event_key, student_id));
            CREATE UNIQUE INDEX idx_test_registration_user ON hackathon_registrations(event_key,user_id) WHERE user_id IS NOT NULL;`);
        await migrateHackathonRepositories(db);
        await require("../src/config/migrations/registrationProfiles").migrateRegistrationProfiles(
            db
        );
        const profile = {
            name: "验收测试",
            studentId: "TESTREPO01",
            major: "测试",
            grade: "junior",
        };
        await require("../src/services/registrationProfileService").saveRegistrationProfile(
            db,
            1,
            profile
        );
        const template = structuredClone(require("../../shared/hackathonAiX.json"));
        template.event.startAt = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
        template.event.endAt = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16);
        template.event.program.registrationClosesAt = template.event.endAt;
        await saveHackathonTemplate(db, template);
        const body = {
            eventKey: AIX_EVENT_KEY,
            answers: {
                track: ["campus", "industry"],
                contact: "test@example.test",
                strengths: ["exploring"],
                aiTools: ["none"],
            },
        };
        const unauth = await invoke(controller.registerHackathon, { body });
        assert.equal(unauth.statusCode, 401);
        const noProfile = await invoke(controller.registerHackathon, { body, user: { id: 3 } });
        assert.equal(noProfile.statusCode, 403);
        const registered = await invoke(controller.registerHackathon, { body, user: { id: 1 } });
        assert.equal(registered.statusCode, 201, JSON.stringify(registered.body));
        assert.equal(registered.body.answers.name, profile.name);
        const duplicate = await invoke(controller.registerHackathon, { body, user: { id: 1 } });
        assert.equal(duplicate.statusCode, 409);
        const read = (id) =>
            invoke(controller.getMyRegistration, { user: { id }, query: { event: AIX_EVENT_KEY } });
        assert.equal((await read(2)).body.registration, null);
        const save = (id, urls) =>
            invoke(controller.saveMyRepositories, {
                user: id ? { id } : null,
                body: { eventKey: AIX_EVENT_KEY, ...urls },
            });
        const urls = {
            githubUrl: "https://github.com/owner/project.git",
            modelscopeUrl: "https://modelscope.cn/studios/owner/project/summary",
        };
        assert.equal((await save(null, urls)).statusCode, 401);
        assert.equal((await save(2, urls)).statusCode, 403);
        assert.equal((await save(1, {})).statusCode, 400);
        const invalid = await save(1, { ...urls, modelscopeUrl: "https://evil.test/a/b" });
        assert.equal(invalid.statusCode, 400);
        assert.equal(invalid.body.field, "modelscopeUrl");
        assert.equal((await read(1)).body.registration.repositories.githubUrl, "");
        const stored = await save(1, urls);
        assert.equal(stored.statusCode, 200);
        assert.equal(stored.headers["Cache-Control"], "no-store");
        const receipt = (await read(1)).body.registration;
        assert.deepEqual(receipt.repositories, stored.body.repositories);
        assert.equal(receipt.repositories.githubUrl, "https://github.com/owner/project");
        assert.equal(
            receipt.repositories.modelscopeUrl,
            "https://modelscope.cn/studios/owner/project"
        );
        const before = await db.get("SELECT * FROM hackathon_registrations WHERE user_id=1");
        await migrateHackathonRepositories(db);
        await migrateHackathonRepositories(db);
        assert.deepEqual(
            await db.get("SELECT * FROM hackathon_registrations WHERE user_id=1"),
            before
        );
        await save(1, { githubUrl: "https://github.com/owner/updated", modelscopeUrl: "" });
        assert.equal(
            (await read(1)).body.registration.repositories.githubUrl,
            "https://github.com/owner/updated"
        );
        assert.deepEqual((await read(1)).body.registration.answers, receipt.answers);
        const admin = await invoke(controller.getRegistrations, {});
        assert.equal(admin.body[0].github_repository_url, "https://github.com/owner/updated");
        template.event.startAt = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 16);
        template.event.endAt = new Date(Date.now() - 86400000).toISOString().slice(0, 16);
        await saveHackathonTemplate(db, template);
        assert.equal((await save(1, urls)).body.code, "HACKATHON_REPOSITORIES_CLOSED");
        assert.equal(
            (await read(1)).body.registration.repositories.githubUrl,
            "https://github.com/owner/updated"
        );
    } finally {
        await pool.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
