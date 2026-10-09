const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("AI+X seed preserves the old event; registration is authenticated, isolated and durable", async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hackathon-aix-"));
    process.env.DATABASE_FILE = path.join(temp, "test.sqlite");
    process.env.NODE_ENV = "test";
    const { getDb, pool } = require("../src/config/db");
    const { migrateHackathonAiX } = require("../src/config/migrations/hackathonAiX");
    const { DEFAULT_HACKATHON_TEMPLATE } = require("../src/services/hackathonTemplateService");
    const controller = require("../src/controllers/hackathonController");
    const response = () => ({
        statusCode: 200,
        body: null,
        status(value) {
            this.statusCode = value;
            return this;
        },
        json(value) {
            this.body = value;
            return this;
        },
        setHeader() {},
    });
    const next = (error) => {
        throw error;
    };
    try {
        const db = await getDb();
        await db.exec(`CREATE TABLE settings (key TEXT PRIMARY KEY,value TEXT);
        CREATE TABLE users(id INTEGER PRIMARY KEY);
        INSERT INTO users(id) VALUES (1),(2);
        CREATE TABLE competitions(id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, subtitle TEXT, description TEXT, event_date TEXT, is_featured INTEGER, status TEXT);
        CREATE TABLE hackathon_registrations(id INTEGER PRIMARY KEY,event_key TEXT,name TEXT,student_id TEXT,major TEXT,grade TEXT,ai_tools TEXT,experience TEXT,form_data_json TEXT,template_revision INTEGER,created_at TEXT, UNIQUE(event_key,student_id));`);
        const old = JSON.parse(JSON.stringify(DEFAULT_HACKATHON_TEMPLATE));
        old.operatorNote = "preserve";
        old.event.endAt = "2000-01-01T14:00";
        await db.run("INSERT INTO settings VALUES('hackathon_schedule_config', ?)", [
            JSON.stringify({ events: [old], activeEventKey: old.event.key, revision: 3 }),
        ]);
        await db.run("INSERT INTO competitions(slug,title) VALUES(?,?)", [
            old.results.competitionSlug,
            "original untouched",
        ]);
        process.env.NODE_ENV = "production";
        await migrateHackathonAiX(db);
        assert.equal(
            JSON.parse(
                (await db.get("SELECT value FROM settings WHERE key='hackathon_schedule_config'"))
                    .value
            ).events.length,
            1
        );
        process.env.NODE_ENV = "test";
        await migrateHackathonAiX(db);
        await migrateHackathonAiX(db);
        const schedule = JSON.parse(
            (await db.get("SELECT value FROM settings WHERE key='hackathon_schedule_config'")).value
        );
        assert.equal(schedule.events.length, 2);
        assert.deepEqual(schedule.events[0], old);
        assert.equal(
            (
                await db.get("SELECT title FROM competitions WHERE slug=?", [
                    old.results.competitionSlug,
                ])
            ).title,
            "original untouched"
        );
        const eventKey = schedule.activeEventKey;
        // The test is independent of wall clock and must keep the production cutoff unchanged.
        schedule.events[1].event.endAt = "2099-01-02T17:00";
        schedule.events[1].event.program.registrationClosesAt = "2099-01-01T00:00:00+08:00";
        await db.run("UPDATE settings SET value=? WHERE key='hackathon_schedule_config'", [
            JSON.stringify(schedule),
        ]);
        const program = schedule.events[1].event.program;
        program.stages[0].opensAt = "2000-01-01T00:00:00Z";
        program.stages[1].opensAt = "2099-01-01T00:00:00Z";
        program.challenges = [
            { id: "open", stage: "initial", track: "campus", title: "Released", published: true },
            {
                id: "future",
                stage: "semifinal",
                track: "industry",
                title: "Future",
                published: true,
            },
            { id: "draft", stage: "initial", track: "campus", title: "Draft", published: false },
        ];
        await db.run("UPDATE settings SET value=? WHERE key='hackathon_schedule_config'", [
            JSON.stringify(schedule),
        ]);
        const publicResponse = response();
        await controller.getHackathonScheduleConfig(
            { path: "/hackathon/schedule" },
            publicResponse,
            next
        );
        assert.deepEqual(
            publicResponse.body.events
                .find((item) => item.event.key === eventKey)
                .event.program.challenges.map((item) => item.id),
            ["open"]
        );
        const adminResponse = response();
        await controller.getHackathonScheduleConfig(
            { path: "/admin/hackathon/schedule" },
            adminResponse,
            next
        );
        assert.equal(
            adminResponse.body.events.find((item) => item.event.key === eventKey).event.program
                .challenges.length,
            3
        );
        const settingsResponse = response();
        await require("../src/controllers/settingsController").getSettings(
            {},
            settingsResponse,
            next
        );
        assert.equal(settingsResponse.body.hackathon_schedule_config, undefined);
        assert.equal(settingsResponse.body.hackathon_template_config, undefined);
        // Huawei's initial brief is released at the opening, before development.
        const originalProgram = structuredClone(program);
        program.stages[0].opensAt = "2026-10-18T11:00:00+08:00";
        program.challengeReleaseAt = "2026-10-18T09:00:00+08:00";
        program.challenges.push({
            id: "opening",
            stage: "initial",
            track: "industry",
            title: "Opening brief",
            published: true,
        });
        await db.run("UPDATE settings SET value=? WHERE key='hackathon_schedule_config'", [
            JSON.stringify(schedule),
        ]);
        const originalNow = Date.now;
        try {
            for (const [instant, expected] of [
                ["2026-10-18T08:59:59+08:00", []],
                ["2026-10-18T09:00:00+08:00", ["opening"]],
            ]) {
                Date.now = () => Date.parse(instant);
                const published = response();
                await controller.getHackathonScheduleConfig(
                    { path: "/hackathon/schedule" },
                    published,
                    next
                );
                const event = published.body.events.find((item) => item.event.key === eventKey);
                assert.equal(event.event.program.challengeReleaseAt, program.challengeReleaseAt);
                assert.deepEqual(
                    event.event.program.challenges.map((item) => item.id),
                    expected
                );
            }
        } finally {
            Date.now = originalNow;
        }
        schedule.events[1].event.program = originalProgram;
        await db.run("UPDATE settings SET value=? WHERE key='hackathon_schedule_config'", [
            JSON.stringify(schedule),
        ]);
        const answers = {
            name: "Test participant",
            studentId: "TEST-001",
            major: "Test",
            grade: "junior",
            track: ["campus", "industry"],
            contact: "test@example.test",
            strengths: ["development", "research"],
            aiTools: ["Codex", "DeepSeek"],
            aiToolsOther: "",
            experience: "搭建课程检索工具，负责接口与评测。",
            researchExperience: "参与课题文献整理及数据分析。",
            projectLinks: "https://example.test/demo\nhttps://example.test/paper",
        };
        const {
            migrateRegistrationProfiles,
        } = require("../src/config/migrations/registrationProfiles");
        const { saveRegistrationProfile } = require("../src/services/registrationProfileService");
        await migrateRegistrationProfiles(db);
        const accountProfile = {
            name: answers.name,
            studentId: answers.studentId,
            major: answers.major,
            grade: answers.grade,
        };
        let incomplete = response();
        await controller.registerHackathon(
            { user: { id: 1 }, body: { eventKey, answers } },
            incomplete,
            next
        );
        assert.equal(incomplete.statusCode, 403);
        assert.equal(incomplete.body.code, "HACKATHON_PROFILE_REQUIRED");
        await saveRegistrationProfile(db, 1, accountProfile);
        await saveRegistrationProfile(db, 2, accountProfile);
        let res = response();
        const beforeHistoricalAttempt = await db.get(
            "SELECT COUNT(*) AS count FROM hackathon_registrations"
        );
        await controller.registerHackathon(
            { body: { eventKey: old.event.key, answers } },
            res,
            next
        );
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.code, "HACKATHON_REGISTRATION_CLOSED");
        assert.deepEqual(
            await db.get("SELECT COUNT(*) AS count FROM hackathon_registrations"),
            beforeHistoricalAttempt
        );
        res = response();
        await controller.registerHackathon({ body: { eventKey, answers } }, res, next);
        assert.equal(res.statusCode, 401);
        res = response();
        await controller.registerHackathon(
            { user: { id: 1 }, body: { eventKey: "missing", answers } },
            res,
            next
        );
        assert.equal(res.statusCode, 404);
        res = response();
        await controller.registerHackathon(
            {
                user: { id: 1 },
                body: { eventKey, answers: { ...answers, aiTools: ["none", "Codex"] } },
            },
            res,
            next
        );
        assert.equal(res.statusCode, 400);
        assert.ok(res.body.details.some((detail) => detail.field === "aiTools"));
        assert.equal(
            (await db.get("SELECT COUNT(*) AS count FROM hackathon_registrations")).count,
            0
        );
        res = response();
        await controller.registerHackathon(
            {
                user: { id: 1 },
                body: {
                    eventKey,
                    answers: {
                        ...answers,
                        name: "forged",
                        studentId: "FORGED",
                        major: "forged",
                        grade: "phd",
                    },
                },
            },
            res,
            next
        );
        assert.equal(res.statusCode, 201);
        const stored = await db.get("SELECT * FROM hackathon_registrations WHERE id = ?", [
            res.body.id,
        ]);
        assert.deepEqual(res.body.answers, answers);
        assert.deepEqual(JSON.parse(stored.form_data_json), answers);
        assert.deepEqual(JSON.parse(stored.ai_tools), answers.aiTools);
        assert.equal(stored.experience, answers.experience);
        const registrationsResponse = response();
        await controller.getRegistrations({}, registrationsResponse, next);
        assert.deepEqual(registrationsResponse.body[0].form_data, answers);
        res = response();
        await controller.getMyRegistration(
            { user: { id: 1 }, query: { event: eventKey } },
            res,
            next
        );
        assert.deepEqual(res.body.registration.answers, answers);
        res = response();
        await controller.getMyRegistration(
            { user: { id: 2 }, query: { event: eventKey } },
            res,
            next
        );
        assert.equal(res.body.registration, null);
        res = response();
        await controller.registerHackathon(
            { user: { id: 1 }, body: { eventKey, answers: { ...answers, studentId: "TEST-002" } } },
            res,
            next
        );
        assert.equal(res.statusCode, 409);
        res = response();
        await controller.registerHackathon(
            { user: { id: 2 }, body: { eventKey, answers } },
            res,
            next
        );
        assert.equal(res.statusCode, 409);
        await saveRegistrationProfile(db, 1, { ...accountProfile, name: "Changed later" });
        assert.deepEqual(
            JSON.parse(
                (await db.get("SELECT form_data_json FROM hackathon_registrations WHERE user_id=1"))
                    .form_data_json
            ),
            answers
        );
        // The prerequisite also applies to another open edition, not only AI+X.
        schedule.events[0].event.endAt = "2099-01-02T17:00";
        schedule.events[0].event.registrationOpen = true;
        schedule.events[0].navigation.registrationVisible = true;
        await db.run("UPDATE settings SET value=? WHERE key='hackathon_schedule_config'", [
            JSON.stringify(schedule),
        ]);
        res = response();
        await controller.registerHackathon(
            { body: { eventKey: old.event.key, answers } },
            res,
            next
        );
        assert.equal(res.statusCode, 401);
        schedule.events[1].event.program.registrationClosesAt = "2000-01-01T00:00:00Z";
        await db.run("UPDATE settings SET value=? WHERE key='hackathon_schedule_config'", [
            JSON.stringify(schedule),
        ]);
        res = response();
        await controller.registerHackathon(
            { user: { id: 2 }, body: { eventKey, answers: { ...answers, studentId: "TEST-002" } } },
            res,
            next
        );
        assert.equal(res.statusCode, 403);
    } finally {
        await pool.close();
        fs.rmSync(temp, { recursive: true, force: true });
    }
});
