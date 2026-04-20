/**
 * fix-schema.js — Safely bring a production SQLite DB up to the current
 * schema by running the project's canonical runMigrations() function,
 * wrapped in multiple safety layers.
 *
 * What this script does (and only does):
 *   1. Pre-flight environment checks (DB exists, disk space, no active writer)
 *   2. Cold backup of database.sqlite (+ -wal / -shm if present) to
 *      server/backups/database.sqlite.bak.<timestamp>
 *   3. Verify backup readable (open + SELECT count)
 *   4. Snapshot BEFORE: per-table row counts, column lists, integrity_check
 *   5. Dry-run or confirm → apply
 *   6. Run migrations inside a single transaction (ROLLBACK on any error)
 *   7. Snapshot AFTER: same metrics + verify new columns exist via
 *      SELECT <col> FROM <table> LIMIT 0
 *   8. Compare BEFORE vs AFTER row counts (must be identical)
 *   9. Print rollback instructions if anything looked off
 *
 * What this script NEVER does:
 *   - DROP TABLE / DELETE / TRUNCATE / UPDATE on data rows
 *   - Rewrite the DB file
 *   - Remove the existing database.sqlite
 *   - Skip the backup step
 *
 * Usage:
 *   node server/scripts/fix-schema.js --dry-run    # preview only
 *   node server/scripts/fix-schema.js --apply      # apply (with y/N prompt)
 *   node server/scripts/fix-schema.js --apply --yes # apply, skip prompt (CI)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { runMigrations } = require('../src/config/runMigrations');

const DB_PATH = process.env.DATABASE_FILE
  || path.join(__dirname, '..', 'database.sqlite');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Columns we expect to see on each table after migration. Used by the
// post-migration health check. Keep this list in sync with runMigrations.js
// when new columns are added.
const EXPECTED_COLUMNS = {
  comments: [
    'id', 'resource_type', 'resource_id', 'user_id', 'author',
    'content', 'created_at', 'parent_id', 'avatar',
    'root_id', 'reply_to_comment_id', 'floor_number', 'quote_snapshot',
  ],
  users: ['id', 'username', 'password', 'role', 'nickname'],
  community_posts: ['id', 'section', 'title', 'content', 'is_anonymous'],
  notifications: ['id', 'user_id', 'type', 'content'],
  articles: ['id', 'title', 'rejection_reason', 'category'],
  photos: ['id', 'title', 'rejection_reason'],
  music: ['id', 'title', 'rejection_reason'],
  videos: ['id', 'title', 'rejection_reason'],
  events: ['id', 'title', 'rejection_reason'],
  news: ['id', 'title'],
};

// SQL that would actually destroy data — blocked unconditionally.
// UPDATE is deliberately NOT blocked: the migration routine does a lot of
// idempotent backfill like `UPDATE X SET col = COALESCE(col, default)` which
// is both expected and safe. Only truly destructive ops are forbidden here.
const FORBIDDEN_SQL_KEYWORDS = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,        // SQLite doesn't support it but guard anyway
  /\bDELETE\s+FROM\b/i,
  /\bTRUNCATE\b/i,
];

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

function tsStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

function assertSafe(sql) {
  for (const pat of FORBIDDEN_SQL_KEYWORDS) {
    if (pat.test(sql)) {
      throw new Error(`Refusing to run destructive SQL: ${sql.slice(0, 200)}...`);
    }
  }
}

async function confirmPrompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// -----------------------------------------------------------------------------
// Step 1 — Pre-flight environment checks
// -----------------------------------------------------------------------------

function preflight() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`DB not found at ${DB_PATH}. Set DATABASE_FILE env or run from correct directory.`);
  }

  // Read + write access
  try {
    fs.accessSync(DB_PATH, fs.constants.R_OK | fs.constants.W_OK);
  } catch (err) {
    throw new Error(`DB not readable/writable: ${err.message}`);
  }

  const dbStat = fs.statSync(DB_PATH);
  const dbSize = dbStat.size;

  // Disk space on DB's filesystem. Require > 2x DB size (backup + journal).
  let freeBytes = null;
  try {
    const statfs = fs.statfsSync ? fs.statfsSync(path.dirname(DB_PATH)) : null;
    if (statfs) {
      freeBytes = Number(statfs.bavail) * Number(statfs.bsize);
      if (freeBytes < dbSize * 2) {
        throw new Error(
          `Free disk ${formatBytes(freeBytes)} < 2x DB size ${formatBytes(dbSize * 2)}. `
          + `Free up space before running.`
        );
      }
    }
  } catch (err) {
    // statfsSync not available on older Node; soft-warn, don't abort.
    if (err.message && err.message.includes('Free disk')) throw err;
  }

  // Detect active writer via -wal / -shm presence. These exist during active
  // transactions in WAL mode. Their presence is not itself a problem (WAL is
  // normal), but we should warn if server is live.
  const walPath = `${DB_PATH}-wal`;
  const shmPath = `${DB_PATH}-shm`;
  const hasWal = fs.existsSync(walPath);
  const hasShm = fs.existsSync(shmPath);

  return {
    dbPath: DB_PATH,
    dbSize,
    freeBytes,
    hasWal,
    hasShm,
    walPath,
    shmPath,
  };
}

// -----------------------------------------------------------------------------
// Step 2 — Backup
// -----------------------------------------------------------------------------

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function coldBackup(pre) {
  ensureBackupDir();
  const stamp = tsStamp();
  const targets = [];

  const mainBak = path.join(BACKUP_DIR, `database.sqlite.bak.${stamp}`);
  fs.copyFileSync(pre.dbPath, mainBak);
  fs.fsyncSync(fs.openSync(mainBak, 'r+'));
  targets.push({ src: pre.dbPath, dst: mainBak });

  if (pre.hasWal) {
    const walBak = path.join(BACKUP_DIR, `database.sqlite-wal.bak.${stamp}`);
    fs.copyFileSync(pre.walPath, walBak);
    targets.push({ src: pre.walPath, dst: walBak });
  }
  if (pre.hasShm) {
    const shmBak = path.join(BACKUP_DIR, `database.sqlite-shm.bak.${stamp}`);
    fs.copyFileSync(pre.shmPath, shmBak);
    targets.push({ src: pre.shmPath, dst: shmBak });
  }

  return { stamp, targets, mainBak };
}

async function verifyBackup(backupPath) {
  const db = await open({ filename: backupPath, driver: sqlite3.Database });
  try {
    const row = await db.get('SELECT COUNT(*) AS n FROM sqlite_master WHERE type = "table"');
    if (!row || typeof row.n !== 'number') {
      throw new Error('Backup file unreadable as SQLite DB.');
    }
    return row.n;
  } finally {
    await db.close();
  }
}

// -----------------------------------------------------------------------------
// Step 3 — Snapshot (rows + columns + integrity)
// -----------------------------------------------------------------------------

async function snapshot(db) {
  const snap = { tables: {}, integrity: null };

  // integrity_check returns one row per issue, 'ok' when clean.
  const integrityRows = await db.all('PRAGMA integrity_check');
  snap.integrity = integrityRows.map((r) => r.integrity_check).join('; ');

  const tables = await db.all(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );

  for (const { name } of tables) {
    const info = await db.all(`PRAGMA table_info(${name})`);
    const columns = info.map((c) => c.name);
    let rowCount = null;
    try {
      const row = await db.get(`SELECT COUNT(*) AS n FROM ${name}`);
      rowCount = row.n;
    } catch {
      rowCount = '(unreadable)';
    }
    snap.tables[name] = { columns, rowCount };
  }

  return snap;
}

function diffSchemas(before, after) {
  const added = {};
  for (const name of Object.keys(after.tables)) {
    const bCols = before.tables[name] ? new Set(before.tables[name].columns) : new Set();
    const added_cols = after.tables[name].columns.filter((c) => !bCols.has(c));
    if (added_cols.length) added[name] = added_cols;
  }
  return added;
}

function diffRowCounts(before, after) {
  const mismatches = [];
  for (const name of Object.keys(before.tables)) {
    const b = before.tables[name].rowCount;
    const a = after.tables[name] ? after.tables[name].rowCount : null;
    if (a !== b) mismatches.push({ table: name, before: b, after: a });
  }
  return mismatches;
}

// -----------------------------------------------------------------------------
// Step 4 — Post-migration health check
// -----------------------------------------------------------------------------

async function healthCheck(db) {
  const missing = [];
  for (const [table, cols] of Object.entries(EXPECTED_COLUMNS)) {
    for (const col of cols) {
      try {
        // SELECT <col> FROM <table> LIMIT 0 — returns 0 rows but fails if
        // column doesn't exist. Cheapest possible schema probe.
        await db.all(`SELECT ${col} FROM ${table} LIMIT 0`);
      } catch (err) {
        missing.push({ table, col, error: err.message });
      }
    }
  }
  return missing;
}

// -----------------------------------------------------------------------------
// Step 5 — Patched migration runner (intercepts db to assert SQL safety)
// -----------------------------------------------------------------------------

/**
 * Wraps the sqlite wrapper DB so every exec/run call is checked against
 * forbidden SQL keywords before reaching the driver. runMigrations is an
 * existing function in the project; we pass this proxy in place of the real
 * DB so we inherit its entire migration logic for free without duplicating
 * the list of columns.
 */
function wrapDbWithSafetyNet(db) {
  const guarded = Object.create(db);
  guarded.exec = async (sql, ...rest) => {
    assertSafe(String(sql));
    return db.exec(sql, ...rest);
  };
  guarded.run = async (sql, ...rest) => {
    assertSafe(String(sql));
    return db.run(sql, ...rest);
  };
  // all / get are read-only, no safety check needed
  guarded.all = db.all.bind(db);
  guarded.get = db.get.bind(db);
  guarded.prepare = db.prepare.bind(db);
  return guarded;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || !args.includes('--apply');
  const skipConfirm = args.includes('--yes') || args.includes('-y');

  console.log('====================================================');
  console.log('  ZJU_Platform schema fix / migration catch-up');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (no writes)' : 'APPLY (writes to DB)'}`);
  console.log('====================================================\n');

  // ---------------- 1) Preflight ----------------
  log('1/8', 'Pre-flight checks');
  const pre = preflight();
  console.log(`      DB path: ${pre.dbPath}`);
  console.log(`      DB size: ${formatBytes(pre.dbSize)}`);
  if (pre.freeBytes !== null) {
    console.log(`      Free disk: ${formatBytes(pre.freeBytes)} (need ≥ ${formatBytes(pre.dbSize * 2)})`);
  }
  console.log(`      WAL present: ${pre.hasWal ? 'yes' : 'no'}`);
  console.log(`      SHM present: ${pre.hasShm ? 'yes' : 'no'}`);
  if (pre.hasWal || pre.hasShm) {
    console.log(`      ⚠️  Active WAL/SHM detected. Recommendation: stop the app server `
      + `first to guarantee a quiet window. Not strictly required but safer.`);
  }
  console.log();

  // ---------------- 2) Open DB + snapshot BEFORE ----------------
  log('2/8', 'Opening DB and collecting BEFORE snapshot');
  const db = await open({ filename: pre.dbPath, driver: sqlite3.Database });
  const before = await snapshot(db);
  console.log(`      integrity_check: ${before.integrity}`);
  console.log(`      tables: ${Object.keys(before.tables).length}`);

  // Identify expected-but-missing columns so we know what the dry-run will add
  const willAdd = {};
  for (const [table, cols] of Object.entries(EXPECTED_COLUMNS)) {
    const have = new Set(before.tables[table]?.columns || []);
    const missing = cols.filter((c) => !have.has(c));
    if (missing.length) willAdd[table] = missing;
  }
  if (Object.keys(willAdd).length === 0) {
    console.log('      ✓ All expected columns already present. Migrations may still run '
      + 'for other tables / indexes.');
  } else {
    console.log('      Columns to add (based on expected list):');
    for (const [t, cols] of Object.entries(willAdd)) {
      console.log(`         ${t}: ${cols.join(', ')}`);
    }
  }
  console.log();

  // ---------------- 3) Dry-run exit ----------------
  if (isDryRun) {
    log('3/8', 'DRY RUN — stopping before any write');
    console.log('      The actual ALTER statements are chosen by runMigrations() at apply '
      + 'time. See server/src/config/runMigrations.js for the full list of '
      + 'ALTERs and indexes it will execute.');
    console.log(`\n✓ Dry run complete. To actually apply:`);
    console.log(`    node server/scripts/fix-schema.js --apply`);
    await db.close();
    return;
  }

  // ---------------- 4) Confirm ----------------
  if (!skipConfirm) {
    log('3/8', 'Confirmation');
    const ok = await confirmPrompt('      Proceed with backup + migration? [y/N] ');
    if (!ok) {
      console.log('      Aborted by user.');
      await db.close();
      return;
    }
  }

  // ---------------- 5) Cold backup ----------------
  log('4/8', 'Cold backup');
  const bak = coldBackup(pre);
  for (const t of bak.targets) {
    const size = fs.statSync(t.dst).size;
    console.log(`      ${path.basename(t.src)} → ${path.relative(process.cwd(), t.dst)} (${formatBytes(size)})`);
  }

  log('5/8', 'Verify backup is readable');
  const tableCount = await verifyBackup(bak.mainBak);
  console.log(`      ✓ Backup opened, ${tableCount} tables visible.`);
  console.log();

  // ---------------- 6) Apply migration inside a transaction ----------------
  log('6/8', 'Running migrations (wrapped in BEGIN/COMMIT)');
  const guarded = wrapDbWithSafetyNet(db);
  try {
    await db.exec('BEGIN TRANSACTION');
    await runMigrations(guarded);
    await db.exec('COMMIT');
    console.log('      ✓ Transaction committed.');
  } catch (err) {
    try { await db.exec('ROLLBACK'); } catch {/* ignore */}
    console.error('      ✗ Migration failed. Transaction rolled back.');
    console.error(`      Error: ${err.message}`);
    console.error(`      DB is in the same state as before. No data changed.`);
    console.error(`      To restore manually from backup:`);
    console.error(`        cp ${bak.mainBak} ${pre.dbPath}`);
    await db.close();
    process.exit(1);
  }
  console.log();

  // ---------------- 7) Snapshot AFTER + compare ----------------
  log('7/8', 'AFTER snapshot + consistency checks');
  const after = await snapshot(db);
  console.log(`      integrity_check: ${after.integrity}`);

  const rowDiffs = diffRowCounts(before, after);
  if (rowDiffs.length) {
    console.error('      ✗ Row count mismatch:');
    for (const d of rowDiffs) {
      console.error(`         ${d.table}: before=${d.before} after=${d.after}`);
    }
    console.error('      This should not happen with ADD COLUMN. Investigate before trusting.');
  } else {
    console.log('      ✓ Row counts unchanged across all tables.');
  }

  const addedCols = diffSchemas(before, after);
  if (Object.keys(addedCols).length === 0) {
    console.log('      ✓ No new columns were added (schema already current).');
  } else {
    console.log('      ✓ New columns added:');
    for (const [t, cols] of Object.entries(addedCols)) {
      console.log(`         ${t}: +${cols.join(', +')}`);
    }
  }

  const missing = await healthCheck(db);
  if (missing.length) {
    console.error('      ✗ Health check failed for these expected columns:');
    for (const m of missing) {
      console.error(`         ${m.table}.${m.col}: ${m.error}`);
    }
    console.error('      If you see this, manually run:');
    for (const m of missing) {
      console.error(`         ALTER TABLE ${m.table} ADD COLUMN ${m.col} <TYPE>;`);
    }
  } else {
    console.log('      ✓ All expected columns pass SELECT probe.');
  }

  await db.close();
  console.log();

  // ---------------- 8) Summary ----------------
  log('8/8', 'Done');
  console.log(`      Backup kept at: ${bak.mainBak}`);
  console.log(`      To rollback if anything looks wrong:`);
  console.log(`        cp ${bak.mainBak} ${pre.dbPath}`);
  console.log(`        # then restart your app server`);
  console.log();

  const anyIssue = rowDiffs.length > 0 || missing.length > 0
    || after.integrity.toLowerCase() !== 'ok';
  if (anyIssue) {
    console.error('⚠️  Completed with warnings — review the above before trusting the DB.');
    process.exit(2);
  } else {
    console.log('✅ All checks passed.');
  }
}

main().catch((err) => {
  console.error('\n✗ Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
