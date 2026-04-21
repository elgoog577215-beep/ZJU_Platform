const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const { runMigrations } = require('./src/config/runMigrations');

const REQUIRED_COLUMNS = {
  comments: {
    user_id: 'INTEGER',
    parent_id: 'INTEGER',
    author: 'TEXT',
    avatar: 'TEXT',
    root_id: 'INTEGER',
    reply_to_comment_id: 'INTEGER',
    floor_number: 'INTEGER',
    quote_snapshot: 'TEXT',
  },
  notifications: {
    content: 'TEXT',
  },
};

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function copyIfExists(source, target) {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
  }
}

async function ensureColumns(db, tableName, columns) {
  const info = await db.all(`PRAGMA table_info(${tableName})`);
  const existing = new Set(info.map((col) => col.name));

  for (const [name, type] of Object.entries(columns)) {
    if (!existing.has(name)) {
      await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${name} ${type}`);
      console.log(`[fix] added ${tableName}.${name}`);
    }
  }
}

async function verifyColumns(db, tableName, columns) {
  const info = await db.all(`PRAGMA table_info(${tableName})`);
  const existing = new Set(info.map((col) => col.name));
  const missing = Object.keys(columns).filter((name) => !existing.has(name));

  if (missing.length > 0) {
    throw new Error(`table ${tableName} still missing columns: ${missing.join(', ')}`);
  }
}

async function main() {
  const dbPath = process.env.DATABASE_FILE || path.join(__dirname, 'database.sqlite');
  const backupSuffix = getTimestamp();
  const backupBase = `${dbPath}.bak.${backupSuffix}`;

  console.log(`[fix] database: ${dbPath}`);

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  try {
    await db.exec('PRAGMA busy_timeout = 10000');
    await db.exec('PRAGMA foreign_keys = ON');
    await db.exec('PRAGMA wal_checkpoint(FULL)');

    copyIfExists(dbPath, backupBase);
    copyIfExists(`${dbPath}-wal`, `${backupBase}-wal`);
    copyIfExists(`${dbPath}-shm`, `${backupBase}-shm`);
    console.log(`[fix] backup created: ${backupBase}`);

    await runMigrations(db);

    await ensureColumns(db, 'comments', REQUIRED_COLUMNS.comments);
    await ensureColumns(db, 'notifications', REQUIRED_COLUMNS.notifications);

    await db.exec(`
      UPDATE comments
      SET author = author_name
      WHERE (author IS NULL OR TRIM(author) = '')
        AND author_name IS NOT NULL
        AND TRIM(author_name) != ''
    `);

    await db.exec('CREATE INDEX IF NOT EXISTS idx_comments_resource ON comments(resource_id, resource_type)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC)');

    await verifyColumns(db, 'comments', REQUIRED_COLUMNS.comments);
    await verifyColumns(db, 'notifications', REQUIRED_COLUMNS.notifications);

    console.log('[fix] schema check passed');
    console.log('[fix] done');
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error('[fix] failed:', error.message);
  process.exit(1);
});
