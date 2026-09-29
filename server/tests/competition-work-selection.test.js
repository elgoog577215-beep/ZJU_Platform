const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const run = async (handler, req) => {
    const res = {
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        setHeader() {},
        json(body) {
            this.body = body;
            return this;
        },
    };
    await handler({ params: {}, query: {}, body: {}, ...req }, res, (err) => {
        if (err) throw err;
    });
    return res;
};
test("only explicitly selected, approved and consenting works reach public event and project APIs", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "event-selection-"));
    process.env.DATABASE_FILE = path.join(dir, "db.sqlite");
    process.env.NODE_ENV = "test";
    const { getDb, pool } = require("../src/config/db");
    const { ensureCoreSchema } = require("../src/config/ensureCoreSchema");
    const {
        migrateCompetitionWorkSelection,
    } = require("../src/config/migrations/competitionWorkSelection");
    const ctl = require("../src/controllers/competitionController");
    const projects = require("../src/controllers/projectCardController");
    const users = require("../src/controllers/userController");
    const previousLog = console.log,
        previousWarn = console.warn;
    console.log = () => {};
    console.warn = () => {};
    try {
        const db = await getDb();
        await ensureCoreSchema(db);
        await db.exec(
            "CREATE TABLE audit_logs(id INTEGER PRIMARY KEY, admin_id INTEGER, resource_type TEXT, resource_id INTEGER, action TEXT, reason TEXT)"
        );
        const { lastID: user } = await db.run(
            "INSERT INTO users(username,password,role) VALUES('selection-admin','test','admin')"
        );
        const { lastID: event } = await db.run(
            "INSERT INTO competitions(slug,title,status) VALUES('selection-event','Selection event','active')"
        );
        const make = async (status, consent) =>
            (
                await db.run(
                    "INSERT INTO competition_works(competition_id,title,author,summary,git_url,status,public_consent,uploader_id) VALUES(?,'A real work','Author','Summary','https://example.test/repo',?,?,?)",
                    [event, status, consent, user]
                )
            ).lastID;
        const approved = await make("approved", 1),
            pending = await make("pending", 1),
            privateWork = await make("approved", 0);
        const outcome = () =>
            run(ctl.getCurrentOutcome, { params: { competitionSlug: "selection-event" } });
        // Existing records are not silently promoted, and migration can be rerun safely.
        await db.exec("ALTER TABLE competition_works DROP COLUMN featured");
        await migrateCompetitionWorkSelection(db);
        await migrateCompetitionWorkSelection(db);
        assert.equal((await outcome()).body.works.length, 0);
        const feature = (id, featured) =>
            run(ctl.setAdminWorkFeatured, {
                params: { id },
                body: { featured },
                user: { id: user, role: "admin" },
            });
        assert.equal((await feature(pending, true)).statusCode, 400);
        assert.equal((await feature(privateWork, true)).statusCode, 400);
        assert.equal((await feature(approved, "true")).statusCode, 400);
        assert.equal((await feature(approved, true)).statusCode, 200);
        let result = await outcome();
        assert.deepEqual(
            result.body.works.map((w) => w.id),
            [approved]
        );
        assert.equal(result.body.stats.works, 1);
        const { lastID: claim } = await db.run(
            "INSERT INTO user_identity_claims(user_id,type,display_name,normalized_name) VALUES(?,'person','Author','author')",
            [user]
        );
        await db.run(
            "INSERT INTO competition_work_identity_links(work_id,claim_id,user_id,status,matched_text) VALUES(?,?,?,'confirmed','Author')",
            [approved, claim, user]
        );
        const profileWorks = () => run(users.getUserCompetitionWorks, { params: { id: user } });
        assert.equal(
            (await profileWorks()).body[0].target_path,
            `/hackathon/selection-event/results?work=${approved}`
        );
        await db.run("UPDATE competitions SET slug='ai-full-stack-hackathon-outcome' WHERE id=?", [
            event,
        ]);
        assert.equal(
            (await profileWorks()).body[0].target_path,
            `/hackathon/1/results?work=${approved}`
        );
        await db.run("UPDATE competitions SET slug='selection-event' WHERE id=?", [event]);
        // Public project projection must apply the same selection condition.
        const list = await run(projects.listProjects, { query: {} });
        const records = Array.isArray(list.body) ? list.body : list.body.items;
        assert.ok(records.some((w) => w.source_type === "competition_work"));
        await db.run(
            "INSERT OR REPLACE INTO settings(key,value) VALUES('hackathon_schedule_config',?)",
            [
                JSON.stringify({
                    activeEventKey: "selection-event",
                    events: [
                        {
                            event: { key: "selection-event", title: "Selection event" },
                            results: { competitionSlug: "selection-event" },
                            navigation: { resultsVisible: false },
                        },
                    ],
                }),
            ]
        );
        assert.equal((await outcome()).body.works.length, 0);
        const hiddenProjects = await run(projects.listProjects, { query: {} });
        assert.equal(
            hiddenProjects.body.items.filter((w) => w.source_type === "competition_work").length,
            0
        );
        await db.run("DELETE FROM settings WHERE key='hackathon_schedule_config'");
        assert.equal((await feature(approved, false)).statusCode, 200);
        result = await outcome();
        assert.equal(result.body.works.length, 0);
        assert.equal(result.body.stats.works, 0);
        await feature(approved, true);
        await run(ctl.reviewAdminWork, {
            params: { id: approved },
            body: { status: "rejected" },
            user: { id: user, role: "admin" },
        });
        assert.equal(
            (await db.get("SELECT featured FROM competition_works WHERE id=?", [approved]))
                .featured,
            0
        );
        await run(ctl.reviewAdminWork, {
            params: { id: approved },
            body: { status: "approved" },
            user: { id: user, role: "admin" },
        });
        assert.equal((await outcome()).body.works.length, 0);
        // Participants can submit without going through the retired project center, never self-select.
        const submit = await run(ctl.submitCurrentWork, {
            params: { competitionSlug: "selection-event" },
            user: { id: user, role: "user" },
            body: {
                title: "Direct work",
                author: "Participant",
                major: "Computer science",
                summary: "A direct submission",
                git_url: "https://example.test/direct",
                public_consent: true,
                featured: true,
                award: "Winner",
                rank: "1",
            },
        });
        assert.equal(submit.statusCode, 201);
        assert.equal(submit.body.project_id, null);
        assert.equal(submit.body.featured, false);
        assert.equal(submit.body.status, "pending");
        assert.equal(submit.body.award, null);
        assert.equal((await outcome()).body.works.length, 0);
    } finally {
        await pool.close();
        console.log = previousLog;
        console.warn = previousWarn;
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
