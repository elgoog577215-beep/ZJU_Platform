const test = require("node:test");
process.env.SECRET_KEY ||= "structured-import-test-secret";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const express = require("express");
const sharp = require("sharp");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const database = require("../src/config/db");
const profiles = require("../src/services/profileService");
const notifications = require("../src/controllers/notificationController");
const governance = require("../src/services/eventGovernanceTriggerService");
const eventProfiles = require("../src/services/eventAiProfileService");

test.after(() => database.pool.close());

test("structured event imports use real HTTP, authentication, storage and shared creation", async (t) => {
    const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "zju-structured-import-"));
    process.env.UPLOAD_DIR = uploadDir;
    t.after(async () => {
        assert.ok(path.resolve(uploadDir).startsWith(path.resolve(os.tmpdir()) + path.sep));
        await fs.rm(uploadDir, { recursive: true, force: true });
    });
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    t.after(() => db.close());
    t.mock.method(database, "getDb", async () => db);
    t.mock.method(profiles, "resolvePublisherProfileId", async (_db, userId, requested) => {
        if (requested === 999)
            throw Object.assign(
                new Error("You do not have permission to use this publisher profile"),
                { status: 403 }
            );
        return userId + 100;
    });
    t.mock.method(profiles, "resolveOrganizerProfileId", async () => null);
    const fanout = t.mock.method(notifications, "fanOutNewContent", async () => {});
    t.mock.method(governance, "triggerEventGovernance", async () => ({}));
    t.mock.method(eventProfiles, "ensureEventProfile", async () => ({}));
    const { fields } = require("../src/controllers/resourceController");
    const importer = require("../src/controllers/eventImportController");
    const { authenticateToken } = require("../src/middleware/auth");
    const { SECRET_KEY } = require("../src/controllers/authController");
    await db.exec(`
        CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, role TEXT, account_type TEXT, review_permission TEXT, admin_scope TEXT, admin_permissions TEXT, auth_version INTEGER);
        INSERT INTO users VALUES (1, 'reader', 'user', 'personal', 'normal', NULL, NULL, 0);
        INSERT INTO users VALUES (2, 'operator', 'admin', 'personal', 'normal', 'platform', NULL, 0);
        CREATE TABLE events (id INTEGER PRIMARY KEY, ${fields.events.map((field) => `${field} TEXT`).join(",")}, status TEXT, uploader_id INTEGER, created_at TEXT, deleted_at TEXT, publisher_profile_id INTEGER, organizer_profile_id INTEGER);
        CREATE TABLE event_ai_search_fts (event_id INTEGER);
        CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT UNIQUE, count INTEGER DEFAULT 0);
    `);
    const tokens = {
        user: jwt.sign({ id: 1 }, SECRET_KEY),
        admin: jwt.sign({ id: 2 }, SECRET_KEY),
    };
    const app = express();
    app.use(express.json());
    app.post(
        "/api/events/import",
        authenticateToken,
        importer.receive,
        importer.prepare,
        importer.submit
    );
    app.use((error, _req, res, _next) =>
        res.status(error.status || 500).json({ error: error.message })
    );
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(() => new Promise((resolve) => server.close(resolve)));
    const endpoint = `http://127.0.0.1:${server.address().port}/api/events/import`;
    const cover = await sharp({
        create: { width: 3, height: 2, channels: 3, background: "#aaccee" },
    })
        .png()
        .toBuffer();
    const base = {
        title: "Structured event",
        description: "Already reviewed event introduction",
        content: "Existing article text; no re-extraction needed.",
        category: "招新",
        link: "https://example.org/source/1",
        status: "approved",
    };
    const files = () => fs.readdir(path.join(uploadDir, "images"));
    const send = async (
        payload,
        { token = tokens.admin, bytes = cover, multipart = true } = {}
    ) => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        let body;
        if (multipart) {
            body = new FormData();
            body.append("payload", typeof payload === "string" ? payload : JSON.stringify(payload));
            body.append("cover", new Blob([bytes], { type: "image/png" }), "cover.png");
        } else {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(payload);
        }
        const response = await fetch(endpoint, { method: "POST", headers, body });
        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch {
            result = responseText;
        }
        return { status: response.status, result };
    };
    let first;
    await t.test("authentication precedes image storage", async () => {
        assert.equal((await send(base, { token: null })).status, 401);
        assert.equal((await send(base, { token: "invalid" })).status, 401);
        assert.equal((await files()).length, 0);
    });
    await t.test(
        "ordinary users retain pending review, exact text and empty unknown fields",
        async () => {
            first = await send(base, { token: tokens.user });
            assert.equal(first.status, 200, JSON.stringify(first.result));
            const row = await db.get("SELECT * FROM events WHERE id = ?", first.result.id);
            assert.equal(row.status, "pending");
            assert.equal(row.uploader_id, 1);
            assert.equal(row.publisher_profile_id, 101);
            assert.equal(row.description, base.description);
            assert.equal(row.content, base.content);
            assert.equal(row.date, null);
            assert.equal(row.score, null);
            assert.equal(fanout.mock.callCount(), 0);
            assert.deepEqual(
                await fs.readFile(path.join(uploadDir, "images", path.basename(row.image))),
                cover
            );
        }
    );
    await t.test(
        "duplicate tracking URLs return the existing ID without another file or event",
        async () => {
            const duplicate = await send({
                ...base,
                link: base.link + "?utm_source=retry#section",
            });
            assert.equal(duplicate.status, 409);
            assert.equal(duplicate.result.existing_id, first.result.id);
            assert.equal((await files()).length, 1);
            assert.equal((await db.get("SELECT COUNT(*) AS n FROM events")).n, 1);
        }
    );
    await t.test("concurrent same-source requests save a single event and cover", async () => {
        const results = await Promise.all([
            send({ ...base, link: "https://example.org/concurrent" }),
            send({ ...base, link: "https://example.org/concurrent" }),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
        assert.equal((await files()).length, 2);
        assert.equal(fanout.mock.callCount(), 1);
    });
    await t.test(
        "JSON accepts an existing local image; administrator explicitly publishes",
        async () => {
            const result = await send(
                { ...base, link: "https://example.org/json", image: first.result.image },
                { multipart: false }
            );
            assert.equal(result.status, 200, JSON.stringify(result.result));
            assert.equal(result.result.status, "approved");
            assert.equal(result.result.image, first.result.image);
            assert.equal((await files()).length, 2);
            const defaultStatus = await send(
                {
                    ...base,
                    link: "https://example.org/default",
                    image: first.result.image,
                    status: undefined,
                },
                { multipart: false }
            );
            assert.equal(defaultStatus.result.status, "pending");
        }
    );
    await t.test(
        "rejects malformed data, remote/path-traversal images and corrupt covers before writes",
        async () => {
            const invalids = [
                "{",
                { ...base, date: "2026-02-31" },
                { ...base, date: "2026-10-02", end_date: "2026-10-01" },
                { ...base, title: "" },
                { ...base, role: "admin" },
                { ...base, link: ["https://example.org/x"] },
                { ...base, link: "https://user:secret@example.org/x" },
            ];
            for (const value of invalids) assert.equal((await send(value)).status, 400);
            for (const image of [
                "https://remote.invalid/cover.png",
                "/uploads/images/../secret.png",
                "/uploads/images/missing.png",
            ]) {
                assert.equal((await send({ ...base, image }, { multipart: false })).status, 400);
            }
            assert.equal((await send(base, { bytes: Buffer.from("not an image") })).status, 400);
            assert.equal((await send({ ...base, image: first.result.image })).status, 400);
            assert.equal((await files()).length, 2);
        }
    );
    await t.test("oversized covers are rejected without persisting a file", async () => {
        assert.equal((await send(base, { bytes: Buffer.alloc(10 * 1024 * 1024 + 1) })).status, 413);
        assert.equal((await files()).length, 2);
    });
    await t.test("publisher permissions are checked before cover is saved", async () => {
        const response = await send({
            ...base,
            link: "https://example.org/forbidden",
            publisher_profile_id: 999,
        });
        assert.equal(response.status, 403);
        assert.equal((await files()).length, 2);
    });
    await t.test("failed INSERT cleans its unreferenced cover", async () => {
        const run = db.run.bind(db);
        const replacement = t.mock.method(db, "run", async (sql, ...params) => {
            if (sql.startsWith("INSERT INTO events")) throw new Error("injected write failure");
            return run(sql, ...params);
        });
        const result = await send({ ...base, link: "https://example.org/write-failure" });
        replacement.mock.restore();
        assert.equal(result.status, 500);
        assert.equal((await files()).length, 2);
    });
    await t.test(
        "post-INSERT failure retains cover and duplicate reconciliation finds saved row",
        async () => {
            const run = db.run.bind(db);
            const replacement = t.mock.method(db, "run", async (sql, ...params) => {
                if (sql.startsWith("UPDATE events SET publisher_profile_id"))
                    throw new Error("injected follow-up failure");
                return run(sql, ...params);
            });
            const payload = { ...base, link: "https://example.org/ambiguous", status: "pending" };
            assert.equal((await send(payload)).status, 500);
            replacement.mock.restore();
            const saved = await db.get("SELECT * FROM events WHERE link = ?", payload.link);
            assert.ok(saved);
            assert.equal((await files()).length, 3);
            const duplicate = await send(payload);
            assert.equal(duplicate.status, 409);
            assert.equal(duplicate.result.existing_id, saved.id);
            assert.equal((await files()).length, 3);
        }
    );
    await new Promise((resolve) => setImmediate(resolve));
    await db.get("SELECT 1");
});
