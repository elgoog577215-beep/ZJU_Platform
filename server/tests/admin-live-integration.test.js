const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const response = () => ({
    statusCode: 200,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
});

test("integrated admin tools preserve protected accounts and report consistent date windows", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zju-admin-integration-"));
    process.env.DATABASE_FILE = path.join(dir, "test.sqlite");
    process.env.NODE_ENV = "test";
    const { getDb, pool } = require("../src/config/db");
    const { bulkUpdateUsers } = require("../src/controllers/userController");
    const { getSiteMetrics } = require("../src/controllers/systemController");
    try {
        const db = await getDb();
        await db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, role TEXT, review_permission TEXT, account_type TEXT);
            CREATE TABLE user_follows (follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE, following_id INTEGER REFERENCES users(id) ON DELETE CASCADE);
            INSERT INTO users VALUES (1,'admin','normal','personal'),(2,'admin','normal','personal'),(3,'user','normal','personal'),(4,'user','normal','personal');
            INSERT INTO user_follows VALUES (1,2),(2,1),(1,3),(3,4);
            CREATE TABLE site_visit_events (date_key TEXT, created_at TEXT);
            CREATE TABLE site_daily_visitors (date_key TEXT);
            CREATE TABLE event_view_events (date_key TEXT);
            CREATE TABLE event_registrations (created_at TEXT);`);
        for (const table of ["photos", "music", "videos", "articles", "events"]) {
            await db.exec(
                `CREATE TABLE ${table} (likes INTEGER, deleted_at TEXT, created_at TEXT, uploader_id INTEGER)`
            );
        }
        const act = async (body) => {
            const res = response();
            await bulkUpdateUsers({ body, user: { id: "1" } }, res, (error) => {
                throw error;
            });
            return res;
        };
        const update = await act({
            ids: [1, 2, 3, 4],
            action: "review_permission",
            value: "trusted",
        });
        assert.equal(update.body.updated, 2);
        assert.equal(update.body.skipped, 2);
        assert.equal(
            (await db.get("SELECT review_permission FROM users WHERE id=2")).review_permission,
            "normal"
        );
        await act({ ids: [4], action: "account_type", value: "organization" });
        assert.equal(
            (await db.get("SELECT account_type FROM users WHERE id=4")).account_type,
            "organization"
        );
        assert.equal(
            (await act({ ids: [4], action: "account_type", value: "admin" })).statusCode,
            400
        );
        assert.equal((await act({ ids: [1], action: "delete" })).statusCode, 400);
        assert.equal(
            (await act({ ids: Array.from({ length: 201 }, (_, i) => i + 1), action: "delete" }))
                .statusCode,
            400
        );
        const deleted = await act({ ids: [1, 2, 3, 3], action: "delete" });
        assert.equal(deleted.body.updated, 1);
        assert.equal(deleted.body.skipped, 2);
        assert.deepEqual(await db.all("SELECT * FROM user_follows ORDER BY follower_id"), [
            { follower_id: 1, following_id: 2 },
            { follower_id: 2, following_id: 1 },
        ]);
        assert.deepEqual(
            (await db.all("SELECT id FROM users ORDER BY id")).map((row) => row.id),
            [1, 2, 4]
        );
        const dateKey = (ago) => new Date(Date.now() - ago * 86400000).toISOString().slice(0, 10);
        // Day 7 is the most recent day of the preceding seven-day window.
        for (const ago of [0, 7, 10, 30])
            await db.run("INSERT INTO site_visit_events VALUES (?,?)", [
                dateKey(ago),
                dateKey(ago),
            ]);
        await db.run("INSERT INTO event_view_events VALUES (?)", [dateKey(0)]);
        await db.run("INSERT INTO event_registrations VALUES (?)", [dateKey(0)]);
        for (const days of [7, 30]) {
            const res = response();
            await getSiteMetrics({ query: { days } }, res, (error) => {
                throw error;
            });
            assert.equal(res.body.trend.length, days);
            assert.equal(res.body.trend.at(-1).eventViews, 1);
            assert.equal(res.body.trend.at(-1).registrations, 1);
            assert.equal(res.body.growth.viewsChange, days === 7 ? -50 : 200);
        }
    } finally {
        await pool.close();
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
