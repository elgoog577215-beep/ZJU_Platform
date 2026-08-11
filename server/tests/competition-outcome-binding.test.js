const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("competition outcomes stay isolated by the schedule-bound archive slug", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zju-outcome-binding-"));
    process.env.DATABASE_FILE = path.join(tempDir, "database.sqlite");
    process.env.NODE_ENV = "test";

    const originalLog = console.log;
    const originalWarn = console.warn;
    console.log = () => {};
    console.warn = () => {};

    const { getDb, pool } = require("../src/config/db");
    const { ensureCoreSchema } = require("../src/config/ensureCoreSchema");
    const competitionController = require("../src/controllers/competitionController");

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

    try {
        const db = await getDb();
        await ensureCoreSchema(db);
        const userResult = await db.run(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            ["outcome-admin", "test", "admin"]
        );
        const firstResult = await db.run(
            `INSERT INTO competitions (slug, title, status)
             VALUES ('event-one-outcome', '第一场比赛', 'active')`
        );
        const secondResult = await db.run(
            `INSERT INTO competitions (slug, title, status)
             VALUES ('event-two-outcome', '第二场比赛', 'active')`
        );

        await db.run(
            `INSERT INTO competition_media
                (competition_id, type, title, url, status, uploader_id)
             VALUES (?, 'stage_photo', '第一场照片', '/uploads/one.jpg', 'approved', ?)`,
            [firstResult.lastID, userResult.lastID]
        );
        await db.run(
            `INSERT INTO competition_media
                (competition_id, type, title, url, status, uploader_id)
             VALUES (?, 'stage_photo', '第二场照片', '/uploads/two.jpg', 'approved', ?)`,
            [secondResult.lastID, userResult.lastID]
        );
        await db.run(
            `INSERT INTO competition_works
                (competition_id, title, author, summary, git_url, status, uploader_id)
             VALUES (?, '第一场作品', '甲同学', '第一场成果', 'https://example.com/one', 'approved', ?)`,
            [firstResult.lastID, userResult.lastID]
        );
        await db.run(
            `INSERT INTO competition_works
                (competition_id, title, author, summary, git_url, status, uploader_id)
             VALUES (?, '第二场作品', '乙同学', '第二场成果', 'https://example.com/two', 'approved', ?)`,
            [secondResult.lastID, userResult.lastID]
        );

        const firstResponse = await runController(competitionController.getCurrentOutcome, {
            params: { competitionSlug: "event-one-outcome" },
            query: {},
            body: {},
        });
        assert.equal(firstResponse.statusCode, 200);
        assert.equal(firstResponse.body.competition.slug, "event-one-outcome");
        assert.deepEqual(
            firstResponse.body.media.stage_photos.map((item) => item.title),
            ["第一场照片"]
        );
        assert.deepEqual(
            firstResponse.body.works.map((item) => item.title),
            ["第一场作品"]
        );

        const secondResponse = await runController(competitionController.getCurrentOutcome, {
            params: { competitionSlug: "event-two-outcome" },
            query: {},
            body: {},
        });
        assert.deepEqual(
            secondResponse.body.media.stage_photos.map((item) => item.title),
            ["第二场照片"]
        );
        assert.deepEqual(
            secondResponse.body.works.map((item) => item.title),
            ["第二场作品"]
        );

        const submitResponse = await runController(competitionController.submitCurrentMedia, {
            params: { competitionSlug: "event-two-outcome" },
            query: {},
            body: {
                type: "stage_photo",
                title: "第二场新投稿",
                url: "/uploads/two-new.jpg",
            },
            user: { id: userResult.lastID, role: "admin" },
        });
        assert.equal(submitResponse.statusCode, 201);
        assert.equal(submitResponse.body.source_table, "photos");
        const submitted = await db.get("SELECT * FROM photos WHERE id = ?", [
            submitResponse.body.id,
        ]);
        assert.equal(submitted.title, "第二场新投稿");
        const submittedLink = await db.get(
            `SELECT * FROM competition_media_links
             WHERE resource_type = 'photo' AND resource_id = ?`,
            [submitResponse.body.id]
        );
        assert.equal(submittedLink.competition_id, secondResult.lastID);

        const publicArchiveResponse = await runController(
            competitionController.listPublicCompetitions,
            { params: {}, query: {}, body: {} }
        );
        assert.equal(publicArchiveResponse.statusCode, 200);
        const secondArchive = publicArchiveResponse.body.find(
            (item) => item.slug === "event-two-outcome"
        );
        assert.equal(secondArchive.stage_photo_count, 2);
        assert.equal(secondArchive.works_count, 1);

        await db.run(
            `INSERT INTO competitions (slug, title, status)
             VALUES ('ai-full-stack-hackathon-outcome', '历史浙客松', 'active')`
        );
        await db.run(
            `INSERT INTO photos (title, url, gameType, status, uploader_id)
             VALUES ('历史赛场照片', '/uploads/legacy.jpg', 'hackathon', 'approved', ?)`,
            [userResult.lastID]
        );
        await db.run(
            `INSERT INTO videos (title, video, thumbnail, gameType, status, uploader_id)
             VALUES ('历史赛事视频', '/uploads/legacy.mp4', '/uploads/legacy-cover.jpg',
                     'hackathon', 'approved', ?)`,
            [userResult.lastID]
        );
        const legacyResponse = await runController(competitionController.getCurrentOutcome, {
            params: { competitionSlug: "ai-full-stack-hackathon-outcome" },
            query: {},
            body: {},
        });
        assert.deepEqual(
            legacyResponse.body.media.stage_photos.map((item) => item.title),
            ["历史赛场照片"]
        );
        assert.deepEqual(
            legacyResponse.body.media.promo_videos.map((item) => item.title),
            ["历史赛事视频"]
        );

        const missingResponse = await runController(competitionController.getCurrentOutcome, {
            params: { competitionSlug: "missing-outcome" },
            query: {},
            body: {},
        });
        assert.equal(missingResponse.statusCode, 404);
        assert.equal(missingResponse.body.code, "COMPETITION_OUTCOME_NOT_FOUND");
    } finally {
        console.log = originalLog;
        console.warn = originalWarn;
        await pool.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});
