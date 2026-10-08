const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "profile-home-test-"));
process.env.DATABASE_FILE = path.join(temp, "test.sqlite");
process.env.NODE_ENV = "test";
const { getDb, pool } = require("../src/config/db");
const { ensureCoreSchema } = require("../src/config/ensureCoreSchema");
const { migrateProfileHome } = require("../src/config/migrations/profileHome");
const cards = require("../src/controllers/profileCardController");
const users = require("../src/controllers/userController");
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
async function call(fn, req) {
    const res = response();
    await fn(req, res, (error) => {
        throw error;
    });
    return res;
}
const request = (body, id = 1) => ({ user: { id }, body });
const read = (viewer = 1) =>
    call(cards.getUserProfileCard, { params: { id: 1 }, user: viewer ? { id: viewer } : null });
test("profile homepage persistence, visibility, source references and concurrency", async (t) => {
    t.after(async () => {
        await pool.close();
        fs.rmSync(temp, { recursive: true, force: true });
    });
    const db = await getDb();
    await ensureCoreSchema(db);
    await migrateProfileHome(db);
    await migrateProfileHome(db);
    await db.exec(`CREATE TABLE profiles(id INTEGER PRIMARY KEY,type TEXT,owner_user_id INTEGER,display_name TEXT,description TEXT,bio TEXT,cover_url TEXT,deleted_at TEXT);
 ALTER TABLE articles ADD COLUMN publisher_profile_id INTEGER;
 ALTER TABLE events ADD COLUMN publisher_profile_id INTEGER;
 CREATE TABLE user_follows(id INTEGER PRIMARY KEY, follower_id INTEGER,following_id INTEGER,created_at TEXT,UNIQUE(follower_id,following_id));
 CREATE TABLE notifications(id INTEGER PRIMARY KEY,user_id INTEGER,type TEXT,content TEXT,related_id INTEGER,related_type TEXT,is_read INTEGER DEFAULT 0,data TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 INSERT INTO users(id,username,password,nickname) VALUES(1,'one','test','One'),(2,'two','test','Two');
 INSERT INTO profiles(id,type,owner_user_id,display_name) VALUES(1,'person',1,'One'),(2,'organization',1,'Org');
 INSERT INTO articles(id,title,uploader_id,status,publisher_profile_id) VALUES(1,'Public article',1,'approved',1),(2,'Private draft',1,'pending',1),(3,'Someone else',2,'approved',NULL),(4,'Organization article',1,'approved',2);
 INSERT INTO events(id,title,uploader_id,status) VALUES(1,'Public event',1,'approved');`);
    await t.test("existing public personal descriptions survive the new homepage", async () => {
        await db.run("UPDATE profiles SET description = 'Existing introduction' WHERE id = 1");
        assert.equal((await read(null)).body.description, "Existing introduction");
    });
    await t.test(
        "saves background and long text; private links/cards never reach visitors",
        async () => {
            const res = await call(
                cards.updateOwnProfileCard,
                request({
                    version: 0,
                    nickname: "新 名称",
                    slogan: "Hello",
                    description: "My experience",
                    background: { color: "#102030", image: "javascript:bad" },
                    tags: ["AI"],
                    social_links: [
                        { platform: "wechat", url: "private-contact", is_visible: false },
                    ],
                    cards: [
                        {
                            card_type: "text",
                            title: "About",
                            description: "A".repeat(500),
                            is_visible: false,
                        },
                        { card_type: "heading", title: "My work" },
                        { card_type: "article", source_type: "article", source_id: 1 },
                    ],
                })
            );
            assert.equal(res.statusCode, 200);
            assert.equal(res.body.version, 1);
            assert.equal(res.body.cards[0].description.length, 500);
            assert.equal(res.body.background.image, "");
            const visitor = (await read(null)).body;
            assert.equal(visitor.cards.length, 2);
            assert.equal(visitor.social_links.length, 0);
            assert.equal(visitor.works.length, 2);
            assert.equal(visitor.nickname, "新 名称");
            assert.equal(
                (await db.get("SELECT description FROM profiles WHERE id = 1")).description,
                "My experience"
            );
        }
    );
    await t.test("clearing old text, links and images does not restore legacy values", async () => {
        const own = (await read()).body;
        const changed = await call(
            cards.updateOwnProfileCard,
            request({
                ...own,
                cards: [
                    {
                        ...own.cards[0],
                        description: "",
                        body: "old body",
                        note: "old note",
                        link_url: "",
                        links: [{ url: "https://example.com" }],
                        cover_url: "",
                        images: ["/images/old.png"],
                    },
                    ...own.cards.slice(1),
                ],
            })
        );
        assert.equal(changed.body.cards[0].description, "");
        assert.equal(changed.body.cards[0].link_url, "");
        assert.equal(changed.body.cards[0].cover_url, "");
    });
    await t.test(
        "source references refresh title and obey revocation; removal leaves source intact",
        async () => {
            await db.run("UPDATE articles SET title='Updated title' WHERE id=1");
            assert.equal((await read(null)).body.cards[1].title, "Updated title");
            await db.run("UPDATE articles SET status='pending' WHERE id=1");
            assert.equal((await read(null)).body.cards.length, 1);
            assert.equal((await read()).body.cards[2].unavailable, true);
            const own = (await read()).body;
            const res = await call(
                cards.updateOwnProfileCard,
                request({ ...own, cards: own.cards.slice(0, 2) })
            );
            assert.equal(res.statusCode, 200);
            assert.ok(await db.get("SELECT id FROM articles WHERE id=1"));
        }
    );
    await t.test(
        "rejects another user or unpublished work reference without changing anything",
        async () => {
            const own = (await read()).body;
            for (const source_id of [2, 3, 4]) {
                const res = await call(
                    cards.updateOwnProfileCard,
                    request({
                        ...own,
                        cards: [{ card_type: "article", source_type: "article", source_id }],
                    })
                );
                assert.equal(res.statusCode, 400);
            }
            assert.equal((await read()).body.version, own.version);
        }
    );
    await t.test(
        "concurrent edits accept one version and preserve the winning payload",
        async () => {
            const own = (await read()).body;
            const results = await Promise.all(
                ["first", "second"].map((slogan) =>
                    call(cards.updateOwnProfileCard, request({ ...own, slogan }))
                )
            );
            assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
            assert.equal(
                (await read()).body.slogan,
                results.find((r) => r.statusCode === 200).body.slogan
            );
        }
    );
    await t.test(
        "profile likes are idempotent, separate from content and cannot target self",
        async () => {
            const req = { user: { id: 2 }, params: { id: 1 }, method: "PUT" };
            const results = await Promise.all(
                Array.from({ length: 5 }, () => call(users.setProfileLike, req))
            );
            assert.ok(results.every((r) => r.body.profile_likes === 1));
            assert.equal(results[0].body.is_liked, true);
            const res = await call(users.setProfileLike, { ...req, method: "DELETE" });
            assert.equal(res.body.profile_likes, 0);
            assert.equal(
                (await call(users.setProfileLike, { ...req, user: { id: 1 } })).statusCode,
                400
            );
        }
    );
    await t.test("parallel follow requests are idempotent and follow can be removed", async () => {
        const req = { user: { id: 2 }, params: { id: 1 }, method: "POST" };
        const results = await Promise.all(
            Array.from({ length: 3 }, () => call(users.toggleFollowUser, req))
        );
        assert.ok(results.every((r) => r.body.followers_count === 1));
        assert.equal(
            (await call(users.listFollowers, { params: { id: 1 }, user: { id: 1 }, query: {} }))
                .body.data[0].id,
            2
        );
        assert.equal(
            (await call(users.toggleFollowUser, { ...req, method: "DELETE" })).body.followers_count,
            0
        );
    });
});
