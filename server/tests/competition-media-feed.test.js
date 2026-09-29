const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { getCompetitionMediaFeed } = require("../src/services/competitionMediaFeed");
test("media pagination includes every approved linked record without collisions or other events", async () => {
    const raw = new sqlite3.Database(":memory:");
    const db = Object.fromEntries(
        ["all", "get", "run", "exec"].map((method) => [
            method,
            (...args) =>
                new Promise((resolve, reject) =>
                    raw[method](...args, function (error, data) {
                        error ? reject(error) : resolve(data);
                    })
                ),
        ])
    );
    try {
        await db.exec(`CREATE TABLE media_categories(id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE photos(id INTEGER PRIMARY KEY,title TEXT,url TEXT,category_id INTEGER,status TEXT,deleted_at TEXT,created_at TEXT);
        CREATE TABLE videos(id INTEGER PRIMARY KEY,title TEXT,video TEXT,thumbnail TEXT,category_id INTEGER,status TEXT,deleted_at TEXT,created_at TEXT);
        CREATE TABLE competition_media_links(competition_id INTEGER,resource_id INTEGER,resource_type TEXT);
        CREATE TABLE competition_media(id INTEGER PRIMARY KEY,competition_id INTEGER,type TEXT,title TEXT,url TEXT,cover_url TEXT,status TEXT,deleted_at TEXT,created_at TEXT);
        INSERT INTO media_categories VALUES(1,'论坛');`);
        for (let i = 1; i <= 130; i++) {
            await db.run(
                `INSERT INTO photos VALUES(?,?,'/test.jpg',1,'approved',NULL,'2026-10-18')`,
                [i, `photo ${i}`]
            );
            await db.run(`INSERT INTO competition_media_links VALUES(1,?,'photo')`, [i]);
        }
        await db.exec(`INSERT INTO photos VALUES(131,'pending','/pending.jpg',1,'pending',NULL,'2026-10-18'),(132,'deleted','/deleted.jpg',1,'approved','2026-10-19','2026-10-18'),(133,'other','/other.jpg',1,'approved',NULL,'2026-10-18');
        INSERT INTO competition_media_links VALUES(1,131,'photo'),(1,132,'photo'),(2,133,'photo');
        INSERT INTO competition_media VALUES(1,1,'stage_photo','additional','/extra.jpg',NULL,'approved',NULL,'2026-10-18');
        INSERT INTO videos VALUES(1,'video','/test.mp4','/poster.jpg',1,'approved',NULL,'2026-10-18');
        INSERT INTO competition_media_links VALUES(1,1,'video');`);
        const records = [];
        for (let offset = 0; offset < 144; offset += 36) {
            const result = await getCompetitionMediaFeed(db, 1, { offset, limit: 36 });
            assert.equal(result.total, 131);
            assert.equal(result.hasMore, offset < 108);
            records.push(...result.items);
        }
        assert.equal(new Set(records.map((row) => row.id)).size, 131);
        assert.ok(records.some((row) => row.id === "photos-1"));
        assert.ok(records.some((row) => row.id === "competition_media-1"));
        assert.ok(!records.some((row) => ["pending", "deleted", "other"].includes(row.title)));
        assert.equal((await getCompetitionMediaFeed(db, 1, { category: "论坛" })).total, 130);
        assert.equal(
            (await getCompetitionMediaFeed(db, 1, { type: "videos" })).items[0].url,
            "/test.mp4"
        );
    } finally {
        await new Promise((resolve) => raw.close(resolve));
    }
});
