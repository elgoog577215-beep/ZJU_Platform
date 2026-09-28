const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { runMigrations } = require("../src/config/runMigrations");
const { migrateEcosystemResources } = require("../src/config/migrations/ecosystemResources");
const resources = require("../../shared/ecosystemResources.json");

async function fixture() {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    await db.exec(`CREATE TABLE ecosystem_partners (
        id INTEGER PRIMARY KEY, category TEXT, support_category TEXT, name TEXT,
        name_en TEXT, event_organizer_aliases TEXT, sort_order INTEGER,
        enabled INTEGER DEFAULT 1, featured INTEGER, partner_scope TEXT,
        profile_id INTEGER, description TEXT, deleted_at TEXT, updated_at TEXT
    )`);
    return db;
}

test("resource import reuses aliases and ownership, keeps admin copy, and runs once", async () => {
    const db = await fixture();
    try {
        await db.run(
            `INSERT INTO ecosystem_partners (id, name, category, support_category, profile_id, description, event_organizer_aliases) VALUES (7, 'ZJUAI', 'organization', 'club', 91, '运营已确认文案', '["旧别名"]')`
        );
        await db.run(
            `INSERT INTO ecosystem_partners (id, name, category, support_category) VALUES (9, 'ModelScope 魔搭社区', 'enterprise', 'technology_enterprise')`
        );
        await migrateEcosystemResources(db);
        assert.equal((await db.get("SELECT COUNT(*) AS count FROM ecosystem_partners")).count, 37);
        const existing = await db.get("SELECT * FROM ecosystem_partners WHERE id = 7");
        assert.equal(existing.profile_id, 91);
        assert.equal(existing.description, "运营已确认文案");
        assert.equal(existing.name, "ZJUAI");
        assert.ok(JSON.parse(existing.event_organizer_aliases).includes("人工智能协会"));
        assert.equal(
            (await db.get("SELECT support_category FROM ecosystem_partners WHERE id = 9"))
                .support_category,
            "club"
        );
        await db.run("UPDATE ecosystem_partners SET name = '运营新名称', enabled = 0 WHERE id = 7");
        await db.run("DELETE FROM ecosystem_partners WHERE name = '真格基金'");
        await migrateEcosystemResources(db);
        assert.equal((await db.get("SELECT COUNT(*) AS count FROM ecosystem_partners")).count, 36);
        assert.equal(
            (await db.get("SELECT name FROM ecosystem_partners WHERE id = 7")).name,
            "运营新名称"
        );
    } finally {
        await db.close();
    }
});

test("disabled and deleted resources are not revived or duplicated", async () => {
    const db = await fixture();
    try {
        await db.run("INSERT INTO ecosystem_partners (name, enabled) VALUES ('真格基金', 0)");
        await db.run(
            "INSERT INTO ecosystem_partners (name, deleted_at) VALUES ('观猹社区', '2026-09-01')"
        );
        await migrateEcosystemResources(db);
        assert.equal((await db.get("SELECT COUNT(*) AS count FROM ecosystem_partners")).count, 37);
        assert.equal(
            (await db.get("SELECT enabled FROM ecosystem_partners WHERE name = '真格基金'"))
                .enabled,
            0
        );
        assert.equal(
            (await db.get("SELECT deleted_at FROM ecosystem_partners WHERE name = '观猹社区'"))
                .deleted_at,
            "2026-09-01"
        );
    } finally {
        await db.close();
    }
});

test("ambiguous aliases abort the whole import with no partial rows or success marker", async () => {
    const db = await fixture();
    try {
        await db.run("INSERT INTO ecosystem_partners (name) VALUES ('ZJUAI'), ('人工智能协会')");
        await assert.rejects(migrateEcosystemResources(db), /Ambiguous/);
        assert.equal((await db.get("SELECT COUNT(*) AS count FROM ecosystem_partners")).count, 2);
        assert.equal(
            await db.get("SELECT name FROM sqlite_master WHERE name = 'campus_directory_imports'"),
            undefined
        );
    } finally {
        await db.close();
    }
});

test("full migrations preserve the 37-source roster across repeated startup", async () => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    const log = console.log;
    const warn = console.warn;
    console.log = () => {};
    console.warn = () => {};
    try {
        await runMigrations(db);
        await runMigrations(db);
        const rows = await db.all(
            "SELECT * FROM ecosystem_partners WHERE partner_scope = 'core_partner' AND enabled = 1 AND deleted_at IS NULL"
        );
        for (const resource of resources) {
            const names = new Set(
                [resource.name, resource.name_en, ...resource.event_organizer_aliases].map((s) =>
                    s.toLowerCase()
                )
            );
            const matches = rows.filter((row) =>
                [row.name, row.name_en, ...JSON.parse(row.event_organizer_aliases || "[]")]
                    .filter(Boolean)
                    .some((s) => names.has(s.toLowerCase()))
            );
            assert.equal(matches.length, 1, resource.name);
            assert.equal(matches[0].support_category, resource.support_category, resource.name);
        }
        assert.ok(rows.some((row) => row.name === "AI 联合实验室"));
        assert.ok(rows.some((row) => row.name === "创非凡"));
    } finally {
        console.log = log;
        console.warn = warn;
        await db.close();
    }
});
