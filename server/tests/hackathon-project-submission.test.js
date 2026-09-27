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
        const invalidProject = await runController(projectController.createProject, {
            body: {
                title: "无效部署项目",
                deployment_url: "https://",
            },
            user: { id: owner.lastID, role: "user" },
        });
        assert.equal(invalidProject.statusCode, 400);

        const createdProject = await runController(projectController.createProject, {
            body: {
                title: "长期项目",
                intro: "项目长期简介",
                repo_url: "https://example.com/project",
                deployment_url: "https://modelscope.cn/studios/owner/project",
                images: ["/uploads/project.jpg"],
                status: "published",
            },
            user: { id: owner.lastID, role: "user" },
        });
        assert.equal(createdProject.statusCode, 201);
        assert.equal(createdProject.body.deployment_provider, "modelscope");
        const project = { lastID: createdProject.body.id };
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
            body: {
                project_id: project.lastID,
                major: "计算机科学与技术",
                public_consent: true,
            },
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
        assert.equal(firstSubmit.body.major, "计算机科学与技术");
        assert.equal(firstSubmit.body.deployment_provider, "modelscope");
        assert.equal(
            firstSubmit.body.deployment_url,
            "https://modelscope.cn/studios/owner/project"
        );

        const duplicate = await runController(competitionController.submitCurrentWork, {
            ...baseRequest,
            params: { competitionSlug: "event-a" },
        });
        assert.equal(duplicate.statusCode, 409);
        assert.equal(duplicate.body.code, "PROJECT_ALREADY_SUBMITTED");

        const nonOwner = await runController(competitionController.submitCurrentWork, {
            params: { competitionSlug: "event-a" },
            query: {},
            body: { project_id: project.lastID, major: "计算机科学与技术" },
            user: { id: other.lastID, role: "user", review_permission: "normal" },
        });
        assert.equal(nonOwner.statusCode, 403);

        const removed = await runController(competitionController.submitCurrentWork, {
            params: { competitionSlug: "event-a" },
            query: {},
            body: { project_id: removedProject.lastID, major: "计算机科学与技术" },
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
        const legacyWork = await db.run(
            `INSERT INTO competition_works
                (competition_id, title, author, summary, git_url, deployment_provider,
                 deployment_url, cover_url, major, award, rank, status, uploader_id,
                 public_consent)
             VALUES (?, '历史赛事快照-01', '历史团队-01', '未绑定长期项目的历史作品',
                     'https://github.com/example/legacy-work-01', 'modelscope',
                     'https://modelscope.cn/studios/example/legacy-work-01',
                     '/uploads/legacy-work.jpg', '计算机科学与技术', '优秀奖', '2',
                     'approved', ?, 1)`,
            [eventA.lastID, owner.lastID]
        );
        for (let index = 2; index <= 20; index += 1) {
            const suffix = String(index).padStart(2, "0");
            await db.run(
                `INSERT INTO competition_works
                    (competition_id, title, author, summary, git_url, major, award, rank,
                     status, uploader_id, public_consent)
                 VALUES (?, ?, ?, '未绑定长期项目的历史作品', ?, '软件工程', 'Top 20', ?,
                         'approved', ?, 1)`,
                [
                    eventA.lastID,
                    `历史赛事快照-${suffix}`,
                    `历史团队-${suffix}`,
                    `https://github.com/example/legacy-work-${suffix}`,
                    String(index),
                    owner.lastID,
                ]
            );
        }

        const eventProjects = await runController(projectController.listProjects, {
            query: { competition: "event-a" },
            user: null,
        });
        assert.equal(eventProjects.statusCode, 200);
        assert.equal(eventProjects.body.competition.slug, "event-a");
        assert.equal(eventProjects.body.competition.approved_project_count, 21);
        assert.equal(eventProjects.body.total, 21);
        assert.equal(eventProjects.body.items.length, 21);
        assert.equal(
            eventProjects.body.items.filter((item) => item.source_type === "competition_work")
                .length,
            20
        );
        const linkedItem = eventProjects.body.items.find((item) => item.title === "长期项目");
        const legacyItem = eventProjects.body.items.find(
            (item) => item.title === "历史赛事快照-01"
        );
        assert.equal(linkedItem.competitions[0].award, "最佳现场奖");
        assert.equal(legacyItem.id, `competition-work-${legacyWork.lastID}`);
        assert.equal(legacyItem.source_type, "competition_work");
        assert.equal(legacyItem.user_id, null);
        assert.equal(legacyItem.owner_name, "历史团队-01");
        assert.equal(legacyItem.major, "计算机科学与技术");
        assert.equal(legacyItem.repo_url, "https://github.com/example/legacy-work-01");
        assert.equal(legacyItem.deployment_provider, "modelscope");
        assert.equal(
            legacyItem.deployment_url,
            "https://modelscope.cn/studios/example/legacy-work-01"
        );
        assert.equal(legacyItem.competitions[0].rank, "2");

        const defaultHub = await runController(projectController.listProjects, {
            query: {},
            user: null,
        });
        assert.equal(defaultHub.statusCode, 200);
        assert.equal(defaultHub.body.total, 22);
        assert.equal(defaultHub.body.items.length, 22);
        assert.equal(
            defaultHub.body.items.filter((item) => item.source_type === "competition_work").length,
            20
        );
        const defaultLongTermProject = defaultHub.body.items.find(
            (item) => item.title === "长期项目"
        );
        assert.equal(defaultLongTermProject.deployment_provider, "modelscope");
        assert.equal(
            defaultLongTermProject.deployment_url,
            "https://modelscope.cn/studios/owner/project"
        );

        const pagedHub = await runController(projectController.listProjects, {
            query: { limit: "5", page: "2" },
            user: null,
        });
        assert.equal(pagedHub.body.total, 22);
        assert.equal(pagedHub.body.items.length, 5);
        assert.equal(new Set(pagedHub.body.items.map((item) => item.id)).size, 5);

        const searchedHub = await runController(projectController.listProjects, {
            query: { q: "历史赛事快照-19" },
            user: null,
        });
        assert.equal(searchedHub.body.total, 1);
        assert.equal(searchedHub.body.items[0].title, "历史赛事快照-19");

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
        const publicLinkedWork = publicOutcome.body.works.find(
            (item) => item.id === firstSubmit.body.id
        );
        assert.equal(publicLinkedWork.project_id, project.lastID);
        assert.equal(publicLinkedWork.project_title, "长期项目");
        assert.equal("contact_wechat" in publicLinkedWork, false);

        await db.run("UPDATE project_cards SET status = 'removed' WHERE id = ?", [project.lastID]);
        const hiddenProjectLink = await runController(competitionController.getCurrentOutcome, {
            params: { competitionSlug: "event-a" },
            query: {},
            body: {},
        });
        const hiddenLinkedWork = hiddenProjectLink.body.works.find(
            (item) => item.id === firstSubmit.body.id
        );
        assert.equal(hiddenLinkedWork.title, "长期项目");
        assert.equal(hiddenLinkedWork.project_id, null);
        assert.equal(hiddenLinkedWork.project_title, null);

        const unknownEvent = await runController(projectController.listProjects, {
            query: { competition: "missing-event" },
            user: null,
        });
        assert.equal(unknownEvent.body.competition, null);
        assert.equal(unknownEvent.body.total, 22);
        assert.equal(unknownEvent.body.items.length, 22);

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
