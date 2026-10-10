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
                (competition_id, type, title, url, status, uploader_id, created_at)
             VALUES (?, 'stage_photo', '第一场照片', '/uploads/one.jpg', 'approved', ?, '2026-01-01 09:00:00')`,
            [firstResult.lastID, userResult.lastID]
        );
        await db.run(
            `INSERT INTO competition_media
                (competition_id, type, title, url, status, uploader_id, created_at)
             VALUES (?, 'stage_photo', '第二场照片', '/uploads/two.jpg', 'approved', ?, '2026-01-01 09:00:00')`,
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

        // These fixtures represent works explicitly selected by the event operator.
        await db.run("UPDATE competition_works SET featured = 1 WHERE status = 'approved'");
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
        assert.equal(submitted.category_id, null);
        const submittedLink = await db.get(
            `SELECT * FROM competition_media_links
             WHERE resource_type = 'photo' AND resource_id = ?`,
            [submitResponse.body.id]
        );
        assert.equal(submittedLink.competition_id, secondResult.lastID);
        assert.equal(submittedLink.role, "archive");

        for (const [requestedRole, expectedRole] of [
            [undefined, "archive"],
            ["official_film", "official_film"],
        ]) {
            const response = await runController(competitionController.submitCurrentMedia, {
                params: { competitionSlug: "event-two-outcome" },
                query: {},
                body: {
                    type: "promo_video",
                    title: "New event film",
                    url: "/uploads/new-film.mp4",
                    role: requestedRole,
                },
                user: { id: userResult.lastID, role: "admin" },
            });
            assert.equal(response.statusCode, 201);
            const link = await db.get(
                "SELECT role FROM competition_media_links WHERE resource_type='video' AND resource_id=?",
                [response.body.id]
            );
            assert.equal(link.role, expectedRole);
        }

        const featureResponse = await runController(
            competitionController.updateAdminMediaLinkRole,
            {
                params: { id: submittedLink.id },
                query: {},
                body: { role: "highlight" },
                user: { id: userResult.lastID, role: "admin" },
            }
        );
        assert.equal(featureResponse.statusCode, 200);
        assert.equal(featureResponse.body.role, "highlight");

        const mediaLinksResponse = await runController(competitionController.listAdminMediaLinks, {
            params: {},
            query: { competition_id: secondResult.lastID, resource_type: "photo" },
            body: {},
            user: { id: userResult.lastID, role: "admin" },
        });
        assert.equal(mediaLinksResponse.statusCode, 200);
        assert.equal(mediaLinksResponse.body.length, 1);
        assert.equal(mediaLinksResponse.body[0].role, "highlight");

        const liveResponse = await runController(competitionController.getCurrentOutcome, {
            params: { competitionSlug: "event-two-outcome" },
            query: {},
            body: {},
        });
        assert.deepEqual(
            liveResponse.body.media.live_photos.map((item) => item.title),
            ["第二场新投稿", "第二场照片"]
        );
        assert.deepEqual(
            liveResponse.body.media.featured_photos.map((item) => item.title),
            ["第二场新投稿"]
        );
        assert.equal(liveResponse.body.stats.featured_photos, 1);

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

        const firstScene = await db.run(
            "INSERT INTO media_categories (name) VALUES ('第一场交流')"
        );
        const secondScene = await db.run(
            "INSERT INTO media_categories (name) VALUES ('第二场颁奖')"
        );
        await db.run("INSERT INTO media_categories (name) VALUES ('尚未绑定的场景')");
        const firstScenePhoto = await db.run(
            `INSERT INTO photos (title, url, status, category_id, uploader_id)
             VALUES ('第一场场景样本', '/uploads/scene-one.jpg', 'approved', ?, ?)`,
            [firstScene.lastID, userResult.lastID]
        );
        await db.run(
            `INSERT INTO competition_media_links
             (competition_id, resource_type, resource_id, role)
             VALUES (?, 'photo', ?, 'archive')`,
            [firstResult.lastID, firstScenePhoto.lastID]
        );
        await db.run("UPDATE photos SET category_id = ? WHERE id = ?", [
            secondScene.lastID,
            submitted.id,
        ]);

        const submitScenePhoto = (categoryName, user = { id: userResult.lastID, role: "admin" }) =>
            runController(competitionController.submitCurrentMedia, {
                params: { competitionSlug: "event-two-outcome" },
                query: {},
                body: {
                    type: "stage_photo",
                    title: "按场景投稿",
                    url: "/uploads/scene-new.jpg",
                    category_name: categoryName,
                    status: "approved",
                },
                user,
            });
        const categorizedResponse = await submitScenePhoto("  第二场颁奖  ");
        assert.equal(categorizedResponse.statusCode, 201);
        const categorized = await db.get("SELECT * FROM photos WHERE id = ?", [
            categorizedResponse.body.id,
        ]);
        assert.equal(categorized.category_id, secondScene.lastID);
        assert.equal(categorized.status, "approved");
        const categorizedLink = await db.get(
            "SELECT competition_id FROM competition_media_links WHERE resource_type = 'photo' AND resource_id = ?",
            [categorized.id]
        );
        assert.equal(categorizedLink.competition_id, secondResult.lastID);

        const blankSceneResponse = await submitScenePhoto("   ");
        assert.equal(blankSceneResponse.statusCode, 201);
        assert.equal(
            (
                await db.get("SELECT category_id FROM photos WHERE id = ?", [
                    blankSceneResponse.body.id,
                ])
            ).category_id,
            null
        );

        const ordinaryUser = await db.run(
            "INSERT INTO users (username, password, role) VALUES ('scene-member', 'test', 'user')"
        );
        const pendingResponse = await submitScenePhoto("第二场颁奖", {
            id: ordinaryUser.lastID,
            role: "user",
            review_permission: "normal",
        });
        assert.equal(pendingResponse.statusCode, 201);
        assert.equal(pendingResponse.body.status, "pending");
        const pendingPhoto = await db.get("SELECT * FROM photos WHERE id = ?", [
            pendingResponse.body.id,
        ]);
        assert.equal(pendingPhoto.category_id, secondScene.lastID);
        assert.equal(pendingPhoto.status, "pending");
        assert.equal(pendingPhoto.uploader_id, ordinaryUser.lastID);

        const counts = () =>
            db.get(
                `SELECT (SELECT COUNT(*) FROM photos) AS photos,
                    (SELECT COUNT(*) FROM competition_media_links) AS links,
                    (SELECT COUNT(*) FROM media_categories) AS categories`
            );
        const beforeRejected = await counts();
        for (const invalidScene of ["第一场交流", "不存在的场景", "尚未绑定的场景"]) {
            const invalidResponse = await submitScenePhoto(invalidScene);
            assert.equal(invalidResponse.statusCode, 400, invalidScene);
            assert.deepEqual(
                await counts(),
                beforeRejected,
                `${invalidScene} must not create records`
            );
        }

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
