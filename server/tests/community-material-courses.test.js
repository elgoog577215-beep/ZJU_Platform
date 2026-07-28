const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zju-community-material-courses-"));
process.env.DATABASE_FILE = path.join(tempDir, "database.sqlite");
process.env.NODE_ENV = "test";

const { getDb, pool } = require("../src/config/db");
const communityController = require("../src/controllers/communityController");

const createRes = () => {
    const res = {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
    };
    return res;
};

const invoke = async (handler, req) => {
    const res = createRes();
    let nextError = null;
    await handler(req, res, (error) => {
        nextError = error;
    });
    if (nextError) throw nextError;
    return res;
};

const insertMaterialPost = (db, overrides = {}) =>
    db.run(
        `
  INSERT INTO community_posts (
    section, title, content, tags, status, post_status,
    material_course, material_teacher, material_semester, material_type,
    author_id, author_name, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
        [
            overrides.section ?? "materials",
            overrides.title ?? "大学物理复习资料",
            overrides.content ?? "这是一份用于期末复习的资料正文。",
            overrides.tags ?? "",
            overrides.status ?? "approved",
            overrides.post_status ?? "published",
            overrides.material_course ?? "大学物理",
            overrides.material_teacher ?? null,
            overrides.material_semester ?? null,
            overrides.material_type ?? "outline",
            overrides.author_id ?? 1,
            overrides.author_name ?? "Alice",
            overrides.created_at ?? "2026-06-01 10:00:00",
            overrides.updated_at ?? "2026-06-01 10:00:00",
        ]
    );

test.before(async () => {
    const db = await getDb();
    await db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      avatar TEXT,
      organization_cr TEXT,
      nickname TEXT,
      role TEXT,
      review_permission TEXT
    );

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
      deleted_at DATETIME
    );

    CREATE TABLE profile_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'editor',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(profile_id, user_id)
    );

    CREATE TABLE profile_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      alias TEXT NOT NULL,
      normalized_alias TEXT NOT NULL,
      purpose TEXT DEFAULT 'search',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(profile_id, normalized_alias, purpose)
    );

    CREATE TABLE community_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section TEXT,
      title TEXT,
      content TEXT,
      content_blocks TEXT,
      link TEXT,
      tags TEXT,
      status TEXT,
      post_status TEXT,
      deadline TEXT,
      max_members INTEGER,
      material_course TEXT,
      material_teacher TEXT,
      material_semester TEXT,
      material_type TEXT,
      current_members INTEGER DEFAULT 0,
      author_id INTEGER,
      author_name TEXT,
      author_avatar TEXT,
      is_anonymous INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      solved_comment_id INTEGER,
      is_pinned INTEGER DEFAULT 0,
      pin_weight INTEGER DEFAULT 0,
      last_replied_at TEXT,
      related_article_ids TEXT,
      related_post_ids TEXT,
      related_news_ids TEXT,
      related_group_ids TEXT,
      rejection_reason TEXT,
      publisher_profile_id INTEGER,
      created_at TEXT,
      updated_at TEXT
    );
  `);
});

test.after(async () => {
    await pool.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
});

test.beforeEach(async () => {
    const db = await getDb();
    await db.exec(
        "DELETE FROM community_posts; DELETE FROM profile_aliases; DELETE FROM profile_members; DELETE FROM profiles; DELETE FROM users;"
    );
    await db.run(
        'INSERT INTO users (id, username, nickname, role, review_permission) VALUES (1, "alice", "Alice", "admin", "admin")'
    );
});

test("listMaterialCourses returns reusable course labels from approved material posts only", async () => {
    const db = await getDb();
    await insertMaterialPost(db, {
        material_course: "大学物理",
        created_at: "2026-06-01 10:00:00",
    });
    await insertMaterialPost(db, {
        material_course: "大学物理",
        title: "大学物理公式表",
        created_at: "2026-06-02 10:00:00",
    });
    await insertMaterialPost(db, {
        material_course: "微积分",
        title: "微积分速通",
        created_at: "2026-06-03 10:00:00",
    });
    await insertMaterialPost(db, {
        material_course: "线性代数",
        status: "pending",
        title: "待审核线代资料",
    });
    await insertMaterialPost(db, {
        section: "help",
        material_course: "大学物理",
        title: "非资料帖",
    });

    const res = await invoke(communityController.listMaterialCourses, {
        query: {},
        user: null,
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(
        res.body.data.map((item) => item.name),
        ["大学物理", "微积分"]
    );
    assert.deepEqual(
        res.body.data.map((item) => item.count),
        [2, 1]
    );
    assert.equal(res.body.data[0].latest_post_title, "大学物理公式表");
});

test("listPosts filters final materials by one exact course label", async () => {
    const db = await getDb();
    await insertMaterialPost(db, { material_course: "大学物理", title: "大学物理复习提纲" });
    await insertMaterialPost(db, { material_course: "微积分", title: "微积分错题整理" });

    const res = await invoke(communityController.listPosts, {
        query: {
            section: "materials",
            material_course: "大学物理",
            page: "1",
            limit: "20",
        },
        user: null,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.pagination.total, 1);
    assert.deepEqual(
        res.body.data.map((item) => item.title),
        ["大学物理复习提纲"]
    );
    assert.equal(res.body.data[0].material_course, "大学物理");
});

test("listMaterialTypes returns resource categories and listPosts filters by category", async () => {
    const db = await getDb();
    await insertMaterialPost(db, {
        material_course: "大学物理",
        title: "大学物理往年题",
        material_type: "exam",
    });
    await insertMaterialPost(db, {
        material_course: "大学物理",
        title: "大学物理复习提纲",
        material_type: "outline",
    });
    await insertMaterialPost(db, {
        material_course: null,
        title: "AI 工具教程",
        material_type: "ai",
    });
    await insertMaterialPost(db, {
        material_course: "线性代数",
        title: "待审核题解",
        material_type: "solution",
        status: "pending",
    });

    const types = await invoke(communityController.listMaterialTypes, {
        query: {},
        user: null,
    });

    assert.equal(types.statusCode, 200);
    const typeCounts = Object.fromEntries(types.body.data.map((item) => [item.type, item.count]));
    assert.equal(typeCounts.course, 2);
    assert.equal(typeCounts.ai, 1);
    assert.equal(typeCounts.other, 0);

    const res = await invoke(communityController.listPosts, {
        query: {
            section: "materials",
            material_type: "course",
            page: "1",
            limit: "20",
        },
        user: null,
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.pagination.total, 2);
    assert.deepEqual(
        res.body.data.map((item) => item.title),
        ["大学物理复习提纲", "大学物理往年题"]
    );
    assert.equal(res.body.data[0].material_type, "outline");
});

test("material upload review flow keeps pending hidden until admin approval", async () => {
    const db = await getDb();
    await db.run(
        'INSERT INTO users (id, username, nickname, role, review_permission) VALUES (2, "bob", "Bob", "user", "normal")'
    );

    const contentBlocks = JSON.stringify([
        { id: "b1", type: "text", style: "heading", text: "创新思维复习提纲" },
        { id: "b2", type: "text", style: "paragraph", text: "课堂案例、作业重点与期末复习提示。" },
    ]);

    const created = await invoke(communityController.createPost, {
        user: { id: 2, role: "user" },
        body: {
            section: "materials",
            title: "创新思维复习资料",
            content: "创新思维复习提纲\n\n课堂案例、作业重点与期末复习提示。",
            content_blocks: contentBlocks,
            tags: "创新思维,复习",
            status: "pending",
            post_status: "published",
            material_course: "创新思维与创新设计",
            material_teacher: "王老师",
            material_semester: "2026 春夏",
            material_type: "course",
        },
    });

    assert.equal(created.statusCode, 201);
    assert.equal(created.body.section, "materials");
    assert.equal(created.body.status, "published");
    assert.equal(created.body.workflow_status, "pending");
    assert.equal(created.body.review_status, "pending");
    assert.equal(created.body.material_course, "创新思维与创新设计");
    assert.equal(created.body.content_blocks, contentBlocks);

    const hiddenBeforeApproval = await invoke(communityController.listPosts, {
        query: { section: "materials", page: "1", limit: "20" },
        user: null,
    });
    assert.equal(hiddenBeforeApproval.statusCode, 200);
    assert.equal(hiddenBeforeApproval.body.pagination.total, 0);

    const pendingForAdmin = await invoke(communityController.listPosts, {
        query: { section: "materials", workflow_status: "pending", page: "1", limit: "20" },
        user: { id: 1, role: "admin" },
    });
    assert.equal(pendingForAdmin.statusCode, 200);
    assert.equal(pendingForAdmin.body.pagination.total, 1);
    assert.equal(pendingForAdmin.body.data[0].id, created.body.id);

    const reviewed = await invoke(communityController.reviewPost, {
        params: { id: created.body.id },
        body: { action: "approve" },
        user: { id: 1, role: "admin" },
    });
    assert.equal(reviewed.statusCode, 200);
    assert.equal(reviewed.body.status, "published");
    assert.equal(reviewed.body.workflow_status, "approved");
    assert.equal(reviewed.body.review_status, "approved");
    assert.equal(reviewed.body.rejection_reason, null);

    const visibleAfterApproval = await invoke(communityController.listPosts, {
        query: {
            section: "materials",
            material_course: "创新思维与创新设计",
            page: "1",
            limit: "20",
        },
        user: null,
    });
    assert.equal(visibleAfterApproval.statusCode, 200);
    assert.equal(visibleAfterApproval.body.pagination.total, 1);
    assert.equal(visibleAfterApproval.body.data[0].title, "创新思维复习资料");
    assert.equal(visibleAfterApproval.body.data[0].content_blocks, contentBlocks);

    const courses = await invoke(communityController.listMaterialCourses, {
        query: { search: "创新思维", limit: "20" },
        user: null,
    });
    assert.deepEqual(
        courses.body.data.map((item) => item.name),
        ["创新思维与创新设计"]
    );
});
