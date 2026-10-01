const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("hackathon controller stores and returns configurable form answers", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zju-hackathon-template-"));
    process.env.DATABASE_FILE = path.join(tempDir, "database.sqlite");
    process.env.NODE_ENV = "test";

    const originalWarn = console.warn;
    console.warn = () => {};
    const { getDb, pool } = require("../src/config/db");
    const {
        saveHackathonTemplate,
        saveHackathonSchedule,
        DEFAULT_HACKATHON_TEMPLATE,
    } = require("../src/services/hackathonTemplateService");
    const hackathonController = require("../src/controllers/hackathonController");

    const createResponse = () => ({
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

    try {
        const db = await getDb();
        await db.exec(`
            CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
            CREATE TABLE users(id INTEGER PRIMARY KEY);
            INSERT INTO users VALUES(1);
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
            CREATE TABLE hackathon_registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_key TEXT NOT NULL DEFAULT 'zhekesong-current',
                user_id INTEGER REFERENCES users(id),
                name TEXT NOT NULL,
                student_id TEXT NOT NULL,
                major TEXT NOT NULL,
                grade TEXT NOT NULL,
                ai_tools TEXT NOT NULL,
                experience TEXT DEFAULT '',
                form_data_json TEXT DEFAULT '{}',
                template_revision INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(event_key, student_id)
            );
        `);

        await require("../src/config/migrations/registrationProfiles").migrateRegistrationProfiles(
            db
        );
        await require("../src/services/registrationProfileService").saveRegistrationProfile(db, 1, {
            name: "测试同学",
            studentId: "3230100000",
            major: "计算机科学",
            grade: "junior",
        });

        const template = JSON.parse(JSON.stringify(DEFAULT_HACKATHON_TEMPLATE));
        // This case tests successful configurable registration, so keep its fixture upcoming.
        template.event.startAt = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16);
        template.event.endAt = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 16);
        template.form.fields.push({
            id: "diet",
            label: "饮食需求",
            type: "select",
            placeholder: "请选择",
            required: true,
            enabled: true,
            width: "half",
            options: [
                { value: "none", label: "无" },
                { value: "vegetarian", label: "素食" },
            ],
        });
        const saved = await saveHackathonTemplate(db, template);

        const registerResponse = createResponse();
        await hackathonController.registerHackathon(
            {
                user: { id: 1 },
                body: {
                    eventKey: saved.event.key,
                    templateRevision: saved.revision,
                    answers: {
                        name: "测试同学",
                        studentId: "3230100000",
                        major: "计算机科学",
                        grade: "junior",
                        aiTools: ["codex"],
                        experience: "做过一个校园助手",
                        diet: "vegetarian",
                    },
                },
            },
            registerResponse,
            (error) => {
                if (error) throw error;
            }
        );
        assert.equal(registerResponse.statusCode, 201);

        const stored = await db.get("SELECT * FROM hackathon_registrations WHERE id = ?", [
            registerResponse.body.id,
        ]);
        assert.equal(JSON.parse(stored.form_data_json).diet, "vegetarian");
        assert.equal(stored.template_revision, saved.revision);
        assert.equal(stored.event_key, saved.event.key);

        const secondTemplate = JSON.parse(JSON.stringify(saved));
        secondTemplate.event.key = "zhekesong-second";
        secondTemplate.event.title = "第二场浙客松";
        secondTemplate.event.startAt = new Date(Date.now() + 14 * 86400000)
            .toISOString()
            .slice(0, 16);
        secondTemplate.event.endAt = new Date(Date.now() + 15 * 86400000)
            .toISOString()
            .slice(0, 16);
        secondTemplate.results.competitionSlug = "zhekesong-second";
        await saveHackathonSchedule(db, {
            activeEventKey: saved.event.key,
            events: [saved, secondTemplate],
        });

        const secondRegisterResponse = createResponse();
        await hackathonController.registerHackathon(
            {
                user: { id: 1 },
                body: {
                    eventKey: secondTemplate.event.key,
                    answers: {
                        name: "测试同学",
                        studentId: "3230100000",
                        major: "计算机科学",
                        grade: "junior",
                        aiTools: ["codex"],
                        experience: "继续参加第二场",
                        diet: "none",
                    },
                },
            },
            secondRegisterResponse,
            (error) => {
                if (error) throw error;
            }
        );
        assert.equal(secondRegisterResponse.statusCode, 201);
        assert.equal(secondRegisterResponse.body.eventKey, secondTemplate.event.key);

        const listResponse = createResponse();
        await hackathonController.getRegistrations({}, listResponse, (error) => {
            if (error) throw error;
        });
        assert.equal(listResponse.body.length, 2);
        // Both rows can share a created_at timestamp; verify answers by registration identity.
        const byId = new Map(listResponse.body.map((row) => [row.id, row]));
        assert.equal(byId.get(registerResponse.body.id).form_data.diet, "vegetarian");
        assert.equal(byId.get(secondRegisterResponse.body.id).form_data.diet, "none");
    } finally {
        console.warn = originalWarn;
        await pool.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
