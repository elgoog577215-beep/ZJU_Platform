const test = require('node:test');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const migrationService = require('../src/services/eventAttributionMigrationService');

const createDb = async () => {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database,
  });
  await db.exec(`
    CREATE TABLE profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      handle TEXT,
      display_name TEXT,
      display_name_en TEXT,
      verified INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      source_type TEXT,
      source_id INTEGER,
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

    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      organizer TEXT,
      location TEXT,
      link TEXT,
      source_url TEXT,
      status TEXT DEFAULT 'approved',
      uploader_id INTEGER,
      publisher_profile_id INTEGER,
      organizer_profile_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE event_attribution_migration_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT,
      event_id INTEGER,
      target_profile_id INTEGER,
      previous_publisher_profile_id INTEGER,
      previous_organizer_profile_id INTEGER,
      next_publisher_profile_id INTEGER,
      next_organizer_profile_id INTEGER,
      match_level TEXT,
      confidence REAL,
      matched_by TEXT,
      evidence TEXT,
      status TEXT DEFAULT 'applied',
      confirmed_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      reverted_at TEXT
    );
  `);
  return db;
};

const addProfile = async (db, overrides = {}) => {
  const result = await db.run(
    `INSERT INTO profiles (type, handle, display_name, display_name_en, verified, status, source_type, source_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      overrides.type || 'organization',
      overrides.handle || 'zju-student-union',
      overrides.display_name || '浙江大学学生会',
      overrides.display_name_en || 'ZJU Student Union',
      overrides.verified ?? 1,
      overrides.status || 'active',
      overrides.source_type || 'ecosystem_partner',
      overrides.source_id || 23,
    ],
  );
  const profileId = result.lastID;
  const aliases = overrides.aliases || ['浙江大学学生会', '学生会'];
  for (const alias of aliases) {
    await db.run(
      `INSERT INTO profile_aliases (profile_id, alias, normalized_alias, purpose)
       VALUES (?, ?, ?, ?)`,
      [profileId, alias, alias.trim().toLowerCase(), 'organizer_match'],
    );
  }
  return profileId;
};

const addEvent = (db, overrides = {}) => db.run(
  `INSERT INTO events (
    title, description, organizer, location, link, source_url, status,
    uploader_id, publisher_profile_id, organizer_profile_id, created_at
   )
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    overrides.title || '浙江大学学生会招新说明会',
    overrides.description || '欢迎同学参加。',
    overrides.organizer || '',
    overrides.location || '',
    overrides.link || '',
    overrides.source_url || '',
    overrides.status || 'approved',
    overrides.uploader_id ?? 1,
    overrides.publisher_profile_id ?? null,
    overrides.organizer_profile_id ?? null,
    overrides.created_at || '2026-06-01 10:00:00',
  ],
);

test('scanEventAttributionCandidates marks exact organizer alias as strong', async () => {
  const db = await createDb();
  const profileId = await addProfile(db);
  await addEvent(db, {
    title: '招新宣讲',
    organizer: '学生会',
    uploader_id: 7,
  });

  const result = await migrationService.scanEventAttributionCandidates(db, {
    profileId,
  });

  assert.equal(result.profile.id, profileId);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].match_level, 'strong');
  assert.equal(result.candidates[0].matched_by, 'organizer_alias');
  assert.equal(result.candidates[0].event.uploader_id, 7);
  assert.match(result.candidates[0].evidence, /学生会/);
});

test('scanEventAttributionCandidates marks title or description matches as medium', async () => {
  const db = await createDb();
  const profileId = await addProfile(db);
  await addEvent(db, {
    title: 'AI 沙龙',
    description: '本次活动由浙江大学学生会学习部协助组织。',
    organizer: '平台官方',
  });

  const result = await migrationService.scanEventAttributionCandidates(db, {
    profileId,
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].match_level, 'medium');
  assert.equal(result.candidates[0].matched_by, 'content_text');
});

test('scanEventAttributionCandidates never promotes location-only evidence to strong', async () => {
  const db = await createDb();
  const profileId = await addProfile(db, {
    aliases: ['浙江大学学生会', '学生会', '学生活动中心'],
  });
  await addEvent(db, {
    title: '校园夜跑',
    description: '请准时集合。',
    organizer: '平台官方',
    location: '学生活动中心',
  });

  const result = await migrationService.scanEventAttributionCandidates(db, {
    profileId,
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].match_level, 'weak');
  assert.equal(result.candidates[0].matched_by, 'location_text');
});

test('applyEventAttributionMigration updates attribution, keeps uploader audit, and writes logs', async () => {
  const db = await createDb();
  const profileId = await addProfile(db);
  const eventInsert = await addEvent(db, {
    title: '招新宣讲',
    organizer: '学生会',
    uploader_id: 42,
    created_at: '2026-06-01 10:00:00',
  });

  const preview = await migrationService.scanEventAttributionCandidates(db, {
    profileId,
  });
  const applyResult = await migrationService.applyEventAttributionMigration(db, {
    candidates: preview.candidates.map((candidate) => ({
      eventId: candidate.event.id,
      targetProfileId: candidate.target_profile.id,
      matchLevel: candidate.match_level,
      confidence: candidate.confidence,
      matchedBy: candidate.matched_by,
      evidence: candidate.evidence,
    })),
    adminUserId: 99,
  });

  assert.equal(applyResult.applied.length, 1);
  assert.equal(applyResult.skipped.length, 0);

  const event = await db.get('SELECT * FROM events WHERE id = ?', [eventInsert.lastID]);
  assert.equal(event.publisher_profile_id, profileId);
  assert.equal(event.organizer_profile_id, profileId);
  assert.equal(event.uploader_id, 42);
  assert.equal(event.created_at, '2026-06-01 10:00:00');

  const logs = await db.all('SELECT * FROM event_attribution_migration_logs');
  assert.equal(logs.length, 1);
  assert.equal(logs[0].event_id, eventInsert.lastID);
  assert.equal(logs[0].target_profile_id, profileId);
  assert.equal(logs[0].confirmed_by, 99);
  assert.equal(logs[0].previous_publisher_profile_id, null);
  assert.equal(logs[0].next_publisher_profile_id, profileId);
  assert.match(logs[0].batch_id, /^attr-/);
});

test('applyEventAttributionMigration skips conflicting attribution unless overwrite is allowed', async () => {
  const db = await createDb();
  const profileId = await addProfile(db);
  await addProfile(db, {
    handle: 'other-org',
    display_name: '其他组织',
    source_id: 99,
    aliases: ['其他组织'],
  });
  const eventInsert = await addEvent(db, {
    organizer: '学生会',
    publisher_profile_id: 2,
    organizer_profile_id: 2,
  });

  const result = await migrationService.applyEventAttributionMigration(db, {
    candidates: [{
      eventId: eventInsert.lastID,
      targetProfileId: profileId,
      matchLevel: 'strong',
      confidence: 1,
      matchedBy: 'organizer_alias',
      evidence: 'organizer: 学生会',
    }],
    adminUserId: 99,
  });

  assert.equal(result.applied.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, 'conflict');

  const event = await db.get('SELECT publisher_profile_id, organizer_profile_id FROM events WHERE id = ?', [eventInsert.lastID]);
  assert.equal(event.publisher_profile_id, 2);
  assert.equal(event.organizer_profile_id, 2);
});
