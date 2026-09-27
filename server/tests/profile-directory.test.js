const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zju-profile-directory-"));
process.env.DATABASE_FILE = path.join(tempDir, "database.sqlite");
process.env.NODE_ENV = "test";

const { getDb, pool } = require("../src/config/db");
const profileController = require("../src/controllers/profileController");

const createResponse = () => ({
    statusCode: 200,
    body: null,
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(payload) {
        this.body = payload;
        return this;
    },
});

const requestProfileDirectory = async (query = {}) => {
    const res = createResponse();
    await profileController.listProfiles({ query }, res, (error) => {
        if (error) throw error;
    });
    return res.body;
};

test("public profile directory excludes personal account profiles", async (t) => {
    const originalWarn = console.warn;
    console.warn = () => {};
    t.after(async () => {
        console.warn = originalWarn;
        await pool.close();
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    const db = await getDb();
    await db.exec(`
    CREATE TABLE profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      handle TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      display_name_en TEXT,
      avatar_url TEXT,
      logo_url TEXT,
      cover_url TEXT,
      bio TEXT,
      description TEXT,
      description_en TEXT,
      cooperation_direction TEXT,
      cooperation_direction_en TEXT,
      link_url TEXT,
      verified INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      owner_user_id INTEGER,
      source_type TEXT,
      source_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE profile_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      alias TEXT NOT NULL,
      normalized_alias TEXT NOT NULL,
      purpose TEXT DEFAULT 'search',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

    await db.run(
        `INSERT INTO profiles (type, handle, display_name, verified, status, source_type, source_id, owner_user_id)
     VALUES ('person', 'user-325', '3250103218', 1, 'active', 'user', 325, 325)`
    );
    await db.run(
        `INSERT INTO profiles (type, handle, display_name, verified, status, source_type, source_id)
     VALUES ('club', 'ai-club', 'AI 社团', 1, 'active', 'manual', 1)`
    );
    const org = await db.run(
        `INSERT INTO profiles (type, handle, display_name, verified, status, source_type, source_id)
     VALUES ('organization', 'zju-student-union', '浙江大学学生会', 1, 'active', 'ecosystem_partner', 2)`
    );
    await db.run(
        `INSERT INTO profile_aliases (profile_id, alias, normalized_alias, purpose)
     VALUES (?, '学生会', '学生会', 'search')`,
        [org.lastID]
    );

    const defaultRows = await requestProfileDirectory();
    assert.deepEqual(
        defaultRows.map((row) => row.type),
        ["club", "organization"]
    );
    assert.equal(
        defaultRows.some((row) => row.display_name === "3250103218"),
        false
    );

    const personRows = await requestProfileDirectory({ type: "person" });
    assert.deepEqual(personRows, []);

    const studentIdSearchRows = await requestProfileDirectory({ q: "3250103218" });
    assert.deepEqual(studentIdSearchRows, []);

    const orgSearchRows = await requestProfileDirectory({ q: "学生会" });
    assert.equal(orgSearchRows.length, 1);
    assert.equal(orgSearchRows[0].handle, "zju-student-union");
});
