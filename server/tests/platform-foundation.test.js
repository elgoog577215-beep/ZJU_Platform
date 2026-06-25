const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const repoRoot = path.resolve(__dirname, '../..');

test('ensureColumns is idempotent migration infrastructure', async () => {
  const { ensureColumns } = require('../src/config/migrations/helpers');
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec('CREATE TABLE demo (id INTEGER PRIMARY KEY)');

  await ensureColumns(db, 'demo', { title: 'TEXT', count: 'INTEGER DEFAULT 0' });
  await ensureColumns(db, 'demo', { title: 'TEXT', count: 'INTEGER DEFAULT 0' });

  const columns = await db.all('PRAGMA table_info(demo)');
  assert.deepEqual(columns.map((column) => column.name), ['id', 'title', 'count']);
  await db.close();
});

test('controllers do not own schema migration statements', () => {
  const controllerDir = path.join(repoRoot, 'server/src/controllers');
  const offenders = [];

  for (const file of fs.readdirSync(controllerDir).filter((name) => name.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(controllerDir, file), 'utf8');
    if (/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS|ALTER\s+TABLE/i.test(source)) {
      offenders.push(file);
    }
  }

  assert.deepEqual(offenders, []);
});

test('errorHandler keeps the unified error response shape', () => {
  const errorHandler = require('../src/middleware/errorHandler');
  const originalError = console.error;
  console.error = () => {};
  const error = new Error('Bad profile payload');
  error.statusCode = 422;
  error.code = 'PROFILE_INVALID';
  error.details = [{ field: 'display_name', message: 'Required' }];

  const res = {
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
  };

  try {
    errorHandler(error, {}, res, () => {});
    assert.equal(res.statusCode, 422);
    assert.deepEqual(res.body, {
      error: 'Bad profile payload',
      code: 'PROFILE_INVALID',
      details: [{ field: 'display_name', message: 'Required' }],
    });
  } finally {
    console.error = originalError;
  }
});

test('frontend API foundation keeps writes non-retried and token storage session-first', () => {
  const apiSource = fs.readFileSync(path.join(repoRoot, 'src/services/api.js'), 'utf8');
  const authSource = fs.readFileSync(path.join(repoRoot, 'src/context/AuthContext.jsx'), 'utf8');

  assert.match(apiSource, /const canRetry = method === 'get' \|\| config\?\.retryWrites === true/);
  assert.doesNotMatch(authSource, /localStorage\.setItem\('token'/);
  assert.match(authSource, /storeAuthToken\(token, \{ persistent: options\.remember === true \}\)/);
});

test('tag update rewrites exact comma-separated tags without runtime schema changes', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zju-platform-foundation-'));
  process.env.DATABASE_FILE = path.join(tempDir, 'database.sqlite');
  process.env.NODE_ENV = 'test';

  const originalWarn = console.warn;
  console.warn = () => {};
  const { getDb, pool } = require('../src/config/db');
  try {
    const tagController = require('../src/controllers/tagController');
    const db = await getDb();
    await db.exec(`
      CREATE TABLE tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, count INTEGER DEFAULT 0);
      CREATE TABLE photos (id INTEGER PRIMARY KEY AUTOINCREMENT, tags TEXT);
      CREATE TABLE videos (id INTEGER PRIMARY KEY AUTOINCREMENT, tags TEXT);
      CREATE TABLE music (id INTEGER PRIMARY KEY AUTOINCREMENT, tags TEXT);
      CREATE TABLE articles (id INTEGER PRIMARY KEY AUTOINCREMENT, tags TEXT);
    `);
    const tag = await db.run('INSERT INTO tags (name, count) VALUES (?, ?)', ['AI', 1]);
    await db.run('INSERT INTO photos (tags) VALUES (?)', ['AI, AIGC']);
    await db.run('INSERT INTO videos (tags) VALUES (?)', ['AIGC']);

    const res = {
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
    };

    await tagController.updateTag(
      { params: { id: String(tag.lastID) }, body: { name: 'AI Lab' } },
      res,
      (error) => { if (error) throw error; },
    );

    const photo = await db.get('SELECT tags FROM photos WHERE id = 1');
    const video = await db.get('SELECT tags FROM videos WHERE id = 1');
    assert.equal(res.statusCode, 200);
    assert.equal(photo.tags, 'AI Lab,AIGC');
    assert.equal(video.tags, 'AIGC');
  } finally {
    console.warn = originalWarn;
    await pool.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
