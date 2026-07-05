const test = require('node:test');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

process.env.NODE_ENV = 'test';
process.env.SECRET_KEY = 'test-secret-for-wechat-binding';

const {
  bindWechatMiniappIdentity,
  findBoundWechatMiniappUser,
  hashValue,
} = require('../src/services/wechatMiniappAuthService');

const createDb = async () => {
  const db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      nickname TEXT,
      avatar TEXT,
      created_at TEXT
    );

    CREATE TABLE wechat_miniapp_identities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      openid TEXT NOT NULL UNIQUE,
      unionid TEXT,
      session_key_hash TEXT,
      last_login_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE wechat_miniapp_binding_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ticket_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  return db;
};

const seedUser = async (db, id, username) => {
  await db.run(
    `INSERT INTO users (id, username, password, role, nickname, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, username, 'hash', 'user', username, new Date().toISOString()]
  );
};

const insertTicket = async (db, userId, ticket, expiresAt = new Date(Date.now() + 300000)) => {
  await db.run(
    `INSERT INTO wechat_miniapp_binding_tickets
      (user_id, ticket_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
    [userId, hashValue(ticket), expiresAt.toISOString(), new Date().toISOString()]
  );
};

const session = (code) => ({
  openid: `openid-${code}`,
  unionid: `unionid-${code}`,
  session_key: `session-${code}`,
});

test('WeChat miniapp binding requires an existing website account', async () => {
  const db = await createDb();

  try {
    await seedUser(db, 1, 'alice');

    await assert.rejects(
      () => findBoundWechatMiniappUser(db, session('unbound')),
      (error) => error.statusCode === 409 && error.errorCode === 'WECHAT_NOT_BOUND'
    );
    const userCount = await db.get('SELECT COUNT(*) AS count FROM users');
    assert.equal(userCount.count, 1);

    const ticket = 'bind-ticket-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    await insertTicket(db, 1, ticket);
    await bindWechatMiniappIdentity(db, session('bound'), ticket);

    const identity = await db.get('SELECT user_id, openid FROM wechat_miniapp_identities');
    assert.equal(identity.user_id, 1);
    assert.equal(identity.openid, 'openid-bound');

    const user = await findBoundWechatMiniappUser(db, session('bound'));
    assert.equal(user.id, 1);
    assert.equal(user.username, 'alice');

    await assert.rejects(
      () => bindWechatMiniappIdentity(db, session('bound'), ticket),
      (error) => error.statusCode === 400 && error.errorCode === 'WECHAT_BIND_TICKET_INVALID'
    );

    const secondTicket = 'bind-ticket-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    await insertTicket(db, 1, secondTicket);
    await assert.rejects(
      () => bindWechatMiniappIdentity(db, session('another'), secondTicket),
      (error) => error.statusCode === 409 && error.errorCode === 'WECHAT_USER_ALREADY_BOUND'
    );

    await seedUser(db, 2, 'bob');
    const bobTicket = 'bind-ticket-cccccccccccccccccccccccccccccccc';
    await insertTicket(db, 2, bobTicket);
    await assert.rejects(
      () => bindWechatMiniappIdentity(db, session('bound'), bobTicket),
      (error) => error.statusCode === 409 && error.errorCode === 'WECHAT_ALREADY_BOUND'
    );
  } finally {
    await db.close();
  }
});
