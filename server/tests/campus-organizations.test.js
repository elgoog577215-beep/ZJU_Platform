const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { migrateCampusOrganizations } = require("../src/config/migrations/campusOrganizations");
const organizations = require("../../shared/campusOrganizations.json");

const schema = `CREATE TABLE ecosystem_partners (
    id INTEGER PRIMARY KEY, category TEXT, support_category TEXT, name TEXT, name_en TEXT,
    description TEXT, description_en TEXT, event_organizer_aliases TEXT, logo_url TEXT,
    dark_logo_url TEXT, link_url TEXT, sort_order INTEGER, enabled INTEGER,
    featured INTEGER, partner_scope TEXT, deleted_at TEXT
)`;

test("campus import preserves admin records and never restores removed entries", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "campus-import-"));
    const db = await open({
        filename: path.join(directory, "test.sqlite"),
        driver: sqlite3.Database,
    });
    try {
        await db.exec(schema);
        const existing = organizations[0];
        await db.run(
            "INSERT INTO ecosystem_partners (category, name, logo_url, enabled, partner_scope, deleted_at) VALUES ('organization', ?, '/custom.png', 0, 'core_partner', '2026-09-01')",
            [existing.event_organizer_aliases[0]]
        );
        await migrateCampusOrganizations(db);
        const rows = await db.all("SELECT * FROM ecosystem_partners");
        assert.equal(rows.length, organizations.length);
        assert.equal(rows[0].logo_url, "/custom.png");
        assert.equal(rows[0].enabled, 0);
        assert.equal(rows[0].deleted_at, "2026-09-01");
        for (const row of rows.slice(1)) {
            assert.equal(row.partner_scope, "activity_provider");
            assert.equal(row.featured, 0);
            assert.ok(JSON.parse(row.event_organizer_aliases).length);
        }
        const files = await fs.readdir(path.join(directory, "backups"));
        assert.equal(files.length, 1);
        const snapshot = await open({
            filename: path.join(directory, "backups", files[0]),
            driver: sqlite3.Database,
        });
        assert.equal((await snapshot.get("PRAGMA integrity_check")).integrity_check, "ok");
        assert.equal(
            (await snapshot.get("SELECT COUNT(*) AS count FROM ecosystem_partners")).count,
            1
        );
        await snapshot.close();
        await db.run("DELETE FROM ecosystem_partners WHERE name = ?", [organizations[1].name]);
        await db.run(
            "UPDATE ecosystem_partners SET name = '管理员重命名', enabled = 0 WHERE name = ?",
            [organizations[2].name]
        );
        await migrateCampusOrganizations(db);
        assert.equal(
            (await db.get("SELECT COUNT(*) AS count FROM ecosystem_partners")).count,
            organizations.length - 1
        );
        assert.equal(
            (await db.get("SELECT enabled FROM ecosystem_partners WHERE name = '管理员重命名'"))
                .enabled,
            0
        );
        assert.equal((await fs.readdir(path.join(directory, "backups"))).length, 1);
    } finally {
        await db.close();
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("campus sources and original logo assets are available without private contact data", async () => {
    assert.equal(new Set(organizations.map((org) => org.name)).size, organizations.length);
    for (const org of organizations) {
        assert.equal(new URL(org.source.url).protocol, "https:");
        assert.ok(org.description_en);
        assert.doesNotMatch(JSON.stringify(org), /1[3-9]\d{9}|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
        if (org.logo_url) {
            assert.ok(org.source.logo_url);
            const content = await fs.readFile(path.join(__dirname, "../../public", org.logo_url));
            assert.equal(content.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
        }
        if (org.source.status === "historical") assert.match(org.description, /历史资料/);
    }
});
