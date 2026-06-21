const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zju-community-material-courses-'));
process.env.DATABASE_FILE = path.join(tempDir, 'database.sqlite');
process.env.NODE_ENV = 'test';

const { getDb, pool } = require('../src/config/db');
const communityController = require('../src/controllers/communityController');

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

const insertMaterialPost = (db, overrides = {}) => db.run(
  `
  INSERT INTO community_posts (
    section, title, content, tags, status, post_status,
    material_course, material_teacher, material_semester, material_type,
    author_id, author_name, created_at, updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [
    overrides.section ?? 'materials',
    overrides.title ?? '大学物理复习资料',
    overrides.content ?? '这是一份用于期末复习的资料正文。',
    overrides.tags ?? '',
    overrides.status ?? 'approved',
    overrides.post_status ?? 'published',
    overrides.material_course ?? '大学物理',
    overrides.material_teacher ?? null,
    overrides.material_semester ?? null,
    overrides.material_type ?? 'outline',
    overrides.author_id ?? 1,
    overrides.author_name ?? 'Alice',
    overrides.created_at ?? '2026-06-01 10:00:00',
    overrides.updated_at ?? '2026-06-01 10:00:00',
  ],
);

test.before(async () => {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      nickname TEXT,
      avatar TEXT,
      role TEXT
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
  await db.exec('DELETE FROM community_posts; DELETE FROM users;');
  await db.run('INSERT INTO users (id, username, nickname, role) VALUES (1, "alice", "Alice", "admin")');
});

test('listMaterialCourses returns reusable course labels from approved material posts only', async () => {
  const db = await getDb();
  await insertMaterialPost(db, { material_course: '大学物理', created_at: '2026-06-01 10:00:00' });
  await insertMaterialPost(db, { material_course: '大学物理', title: '大学物理公式表', created_at: '2026-06-02 10:00:00' });
  await insertMaterialPost(db, { material_course: '微积分', title: '微积分速通', created_at: '2026-06-03 10:00:00' });
  await insertMaterialPost(db, { material_course: '线性代数', status: 'pending', title: '待审核线代资料' });
  await insertMaterialPost(db, { section: 'help', material_course: '大学物理', title: '非资料帖' });

  const res = await invoke(communityController.listMaterialCourses, {
    query: {},
    user: null,
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data.map((item) => item.name), ['大学物理', '微积分']);
  assert.deepEqual(res.body.data.map((item) => item.count), [2, 1]);
  assert.equal(res.body.data[0].latest_post_title, '大学物理公式表');
});

test('listPosts filters final materials by one exact course label', async () => {
  const db = await getDb();
  await insertMaterialPost(db, { material_course: '大学物理', title: '大学物理复习提纲' });
  await insertMaterialPost(db, { material_course: '微积分', title: '微积分错题整理' });

  const res = await invoke(communityController.listPosts, {
    query: {
      section: 'materials',
      material_course: '大学物理',
      page: '1',
      limit: '20',
    },
    user: null,
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.pagination.total, 1);
  assert.deepEqual(res.body.data.map((item) => item.title), ['大学物理复习提纲']);
  assert.equal(res.body.data[0].material_course, '大学物理');
});
