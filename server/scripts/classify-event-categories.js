require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');

if (process.env.DATABASE_FILE && !path.isAbsolute(process.env.DATABASE_FILE)) {
  process.env.DATABASE_FILE = path.resolve(__dirname, '..', process.env.DATABASE_FILE);
}

const { getDb, pool } = require('../src/config/db');
const {
  classifyEventCategory,
  getCategoryLabel,
} = require('../src/services/eventIntelligenceService');

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getOption = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) return fallback;
  return args[index + 1];
};

const apply = hasFlag('--apply');
const minConfidence = Number(getOption('--min-confidence', '0.6'));
const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '../database.sqlite');

const usage = `
Usage:
  node scripts/classify-event-categories.js --dry-run
  node scripts/classify-event-categories.js --apply
  node scripts/classify-event-categories.js --apply --min-confidence 0.7

Rollout:
  1. Deploy the new code.
  2. Run this script with --dry-run on the server.
  3. Review low-confidence rows.
  4. Run with --apply. A backup is created before updates.
`;

const escapeSqlString = (value) => String(value).replace(/'/g, "''");

async function ensureBackupDir(baseDir) {
  const backupDir = path.join(baseDir, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

async function backupDatabase(db) {
  const backupDir = await ensureBackupDir(path.dirname(dbFile));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `event-category-backup-${stamp}.sqlite`);
  await db.exec(`VACUUM INTO '${escapeSqlString(backupPath)}'`);
  return backupPath;
}

const formatRow = (item) => {
  const from = item.current || '(empty)';
  const to = item.classification.category;
  const label = getCategoryLabel(to);
  const confidence = item.classification.confidence.toFixed(2);
  return `#${item.id} ${item.title || '(untitled)'}: ${from} -> ${to} (${label}), confidence=${confidence}, ${item.classification.reason}`;
};

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    console.log(usage.trim());
    return;
  }

  if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 1) {
    throw new Error('--min-confidence must be a number between 0 and 1');
  }

  const db = await getDb();
  const rows = await db.all(`
    SELECT id, title, category, tags, description, content, organizer, location, target_audience
    FROM events
    WHERE deleted_at IS NULL
    ORDER BY id ASC
  `);

  const plan = rows.map((event) => {
    const classification = classifyEventCategory(event);
    const current = String(event.category || '').trim();
    const changed = current !== classification.category;
    const lowConfidence = classification.confidence < minConfidence;

    return {
      id: event.id,
      title: event.title,
      current,
      changed,
      lowConfidence,
      classification,
    };
  });

  const changed = plan.filter((item) => item.changed && !item.lowConfidence);
  const unchanged = plan.filter((item) => !item.changed);
  const lowConfidence = plan.filter((item) => item.lowConfidence);
  const skipped = plan.filter((item) => item.changed && item.lowConfidence);

  console.log('Event category classification');
  console.log(`Mode: ${apply ? 'apply' : 'dry-run'}`);
  console.log(`Database: ${dbFile}`);
  console.log(`Minimum confidence: ${minConfidence}`);
  console.log(`Total rows: ${rows.length}`);
  console.log(`Changed: ${changed.length}`);
  console.log(`Unchanged: ${unchanged.length}`);
  console.log(`Low confidence: ${lowConfidence.length}`);
  console.log(`Skipped: ${skipped.length}`);

  if (changed.length > 0) {
    console.log('\nPlanned changes:');
    changed.slice(0, 80).forEach((item) => console.log(`  - ${formatRow(item)}`));
    if (changed.length > 80) console.log(`  ... ${changed.length - 80} more`);
  }

  if (lowConfidence.length > 0) {
    console.log('\nLow-confidence rows for review:');
    lowConfidence.slice(0, 80).forEach((item) => console.log(`  - ${formatRow(item)}`));
    if (lowConfidence.length > 80) console.log(`  ... ${lowConfidence.length - 80} more`);
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply after review.');
    return;
  }

  if (changed.length === 0) {
    console.log('\nNo eligible changes to apply.');
    return;
  }

  console.log('\nCreating backup before applying changes...');
  const backupPath = await backupDatabase(db);
  console.log(`Backup created: ${backupPath}`);

  await db.exec('BEGIN');
  try {
    for (const item of changed) {
      await db.run(
        'UPDATE events SET category = ? WHERE id = ?',
        [item.classification.category, item.id]
      );
    }
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }

  console.log(`Applied ${changed.length} category updates.`);
}

main()
  .catch((error) => {
    console.error('Event category classification failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.close();
    } catch {}
  });
