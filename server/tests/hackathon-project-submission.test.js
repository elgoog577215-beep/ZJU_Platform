const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const createResponse = () => ({
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
        this.statusCode = code;
        return this;
    },
    setHeader(name, value) {
        this.headers[name] = value;
        return this;
    },
    json(payload) {
        this.body = payload;
        return this;
    },
});

const runController = async (handler, request) => {
    const response = createResponse();
    await handler(request, response, (error) => {
        if (error) throw error;
    });
    return response;
};

test("hackathon work submissions bind owned projects without leaking removed project links", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zju-hackathon-project-"));
    process.env.DATABASE_FILE = path.join(tempDir, "database.sqlite");
    process.env.NODE_ENV = "test";

    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = () => {};
    console.warn = () => {};

    const { getDb, pool } = require("../src/config/db");
    const { ensureCoreSchema } = require("../src/config/ensureCoreSchema");
    const competitionController = require("../src/controllers/competitionController");
    const projectController = require("../src/controllers/projectCardController");

    try {
        const db = await getDb();
        await ensureCoreSchema(db);
        const owner = await db.run(
            `INSERT INTO users (username, password, role, nickname)
             VALUES ('project-owner', 'test', 'user', '项目主理人')`
        );
        const other = await db.run(
            `INSERT INTO users (username, password, role, nickname)
             VALUES ('other-user', 'test', 'user', '其他用户')`
        );
        const eventA = await db.run(
            `INSERT INTO competitions (slug, title, event_date, status)
             VALUES ('event-a', '赛事 A', '2026-08-12', 'active')`
        );
        await db.run(
            `INSERT INTO competitions (slug, title, event_date, status)
             VALUES ('event-b', '赛事 B', '2026-09-12', 'active')`
        );
        const project = await db.run(
            `INSERT INTO project_cards
                (user_id, title, intro, repo_url, cover_url, status)
             VALUES (?, '长期项目', '项目长期简介', 'https://example.com/project',
                     '/uploads/project.jpg', 'published')`,
            [owner.lastID]
        );
        const removedProject = await db.run(
            `INSERT INTO project_cards (user_id, title, intro, repo_url, status)
             VALUES (?, '下架项目', '不可参赛', 'https://example.com/removed', 'removed')`,
            [owner.lastID]
        );
        const otherProject = await db.run(
            `INSERT INTO project_cards (user_id, title, intro, repo_url, status)
             VALUES (?, '他人项目', '不能冒名提交', 'https://example.com/other', 'published')`,
            [other.lastID]
        );
        await db.run(
            `INSERT INTO project_cards (user_id, title, intro, repo_url, status)
             VALUES (?, '项目草稿', '尚未公开', 'https://example.com/draft', 'draft')`,
            [owner.lastID]
        );

        const baseRequest = {
            query: {},
            body: { project_id: project.lastID, public_consent: true },
            user: { id: owner.lastID, role: "user", review_permission: "normal" },
        };
        const firstSubmit = await runController(competitionController.submitCurrentWork, {
            ...baseRequest,
            params: { competitionSlug: "event-a" },
        });
        assert.equal(firstSubmit.statusCode, 201);
        assert.equal(firstSubmit.body.project_id, project.lastID);
        assert.equal(firstSubmit.body.title, "长期项目");
        assert.equal(firstSubmit.body.status, "pending");

        const duplicate = await runController(competitionController.submitCurrentWork, {
            ...baseRequest,
            params: { competitionSlug: "event-a" },
        });
        assert.equal(duplicate.statusCode, 409);
        assert.equal(duplicate.body.code, "PROJECT_ALREADY_SUBMITTED");

        const nonOwner = await runController(competitionController.submitCurrentWork, {
            params: { competitionSlug: "event-a" },
            query: {},
            body: { project_id: project.lastID },
            user: { id: other.lastID, role: "user", review_permission: "normal" },
        });
        assert.equal(nonOwner.statusCode, 403);

        const removed = await runController(competitionController.submitCurrentWork, {
            params: { competitionSlug: "event-a" },
            query: {},
            body: { project_id: removedProject.lastID },
            user: { id: owner.lastID, role: "user", review_permission: "normal" },
        });
        assert.equal(removed.statusCode, 400);

        const otherEvent = await runController(competitionController.submitCurrentWork, {
            ...baseRequest,
            params: { competitionSlug: "event-b" },
        });
        assert.equal(otherEvent.statusCode, 201);
        assert.notEqual(otherEvent.body.id, firstSubmit.body.id);

        await db.run(
            `UPDATE competition_works
                SET status = 'approved', award = '最佳现场奖', rank = '1'
              WHERE id = ?`,
            [firstSubmit.body.id]
        );

        const eventProjects = await runController(projectController.listProjects, {
            query: { competition: "event-a" },
            user: null,
        });
        assert.equal(eventProjects.statusCode, 200);
        assert.equal(eventProjects.body.competition.slug, "event-a");
        assert.equal(eventProjects.body.competition.approved_project_count, 1);
        assert.deepEqual(
            eventProjects.body.items.map((item) => item.id),
            [project.lastID]
        );
        assert.equal(eventProjects.body.items[0].competitions[0].award, "最佳现场奖");

        const mine = await runController(projectController.listProjects, {
            query: { mine: "1" },
            user: { id: owner.lastID, role: "user" },
        });
        assert.deepEqual(
            mine.body.items.map((item) => item.title).sort(),
            ["项目草稿", "长期项目"].sort()
        );
        assert.equal(
            mine.body.items.some((item) => item.id === otherProject.lastID),
            false
        );

        const publicOutcome = await runController(competitionController.getCurrentOutcome, {
            params: { competitionSlug: "event-a" },
            query: {},
            body: {},
        });
        assert.equal(publicOutcome.body.works[0].project_id, project.lastID);
        assert.equal(publicOutcome.body.works[0].project_title, "长期项目");
        assert.equal("contact_wechat" in publicOutcome.body.works[0], false);

        await db.run("UPDATE project_cards SET status = 'removed' WHERE id = ?", [project.lastID]);
        const hiddenProjectLink = await runController(competitionController.getCurrentOutcome, {
            params: { competitionSlug: "event-a" },
            query: {},
            body: {},
        });
        assert.equal(hiddenProjectLink.body.works[0].title, "长期项目");
        assert.equal(hiddenProjectLink.body.works[0].project_id, null);
        assert.equal(hiddenProjectLink.body.works[0].project_title, null);

        const unknownEvent = await runController(projectController.listProjects, {
            query: { competition: "missing-event" },
            user: null,
        });
        assert.equal(unknownEvent.body.competition, null);
        assert.equal(unknownEvent.body.total, 1);
        assert.equal(unknownEvent.body.items[0].title, "他人项目");

        const storedRelation = await db.get(
            "SELECT competition_id, project_id FROM competition_works WHERE id = ?",
            [firstSubmit.body.id]
        );
        assert.equal(storedRelation.competition_id, eventA.lastID);
        assert.equal(storedRelation.project_id, project.lastID);
    } finally {
        console.log = originalLog;
        console.warn = originalWarn;
        await pool.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
