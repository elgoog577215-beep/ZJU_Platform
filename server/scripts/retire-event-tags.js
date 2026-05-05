require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');

if (process.env.DATABASE_FILE && !path.isAbsolute(process.env.DATABASE_FILE)) {
  process.env.DATABASE_FILE = path.resolve(__dirname, '..', process.env.DATABASE_FILE);
}

const { getDb, pool } = require('../src/config/db');
const { EVENT_CATEGORIES } = require('../src/constants/eventCatalog');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const force = args.includes('--force');
const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '../database.sqlite');
const validCategories = new Set(EVENT_CATEGORIES.map((item) => item.value));

const usage = `
Usage:
  node scripts/retire-event-tags.js --dry-run
  node scripts/retire-event-tags.js --apply
  node scripts/retire-event-tags.js --apply --force

Recommended rollout:
  1. node scripts/classify-event-categories.js --dry-run
  2. node scripts/classify-event-categories.js --apply
  3. node scripts/retire-event-tags.js --dry-run
  4. node scripts/retire-event-tags.js --apply
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
  const backupPath = path.join(backupDir, `event-tags-retire-backup-${stamp}.sqlite`);
  await db.exec(`VACUUM INTO '${escapeSqlString(backupPath)}'`);
  return backupPath;
}

const splitTags = (value) =>
  String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

async function rebuildTagDictionary(db) {
  const resources = ['photos', 'videos', 'music', 'articles'];
  const tagCounts = {};

  for (const resource of resources) {
    const rows = await db.all(`SELECT tags FROM ${resource}`);
    for (const row of rows) {
      for (const tag of splitTags(row.tags)) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }
  }

  await db.run('DELETE FROM tags');
  for (const [name, count] of Object.entries(tagCounts)) {
    await db.run('INSERT INTO tags (name, count) VALUES (?, ?)', [name, count]);
  }

  return tagCounts;
}

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage.trim());
    return;
  }

  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      count INTEGER DEFAULT 0
    )
  `);

  const eventsWithTags = await db.all(`
    SELECT id, title, category, tags
    FROM events
    WHERE tags IS NOT NULL AND TRIM(tags) <> ''
    ORDER BY id ASC
  `);

  const incomplete = eventsWithTags.filter((event) => !validCategories.has(String(event.category || '').trim()));

  console.log('Retire event tags');
  console.log(`Mode: ${apply ? 'apply' : 'dry-run'}`);
  console.log(`Database: ${dbFile}`);
  console.log(`Events with tags: ${eventsWithTags.length}`);
  console.log(`Events missing a standard category: ${incomplete.length}`);

  if (incomplete.length > 0) {
    console.log('\nRows needing category review before tag cleanup:');
    incomplete.slice(0, 80).forEach((event) => {
      console.log(`  - #${event.id} ${event.title || '(untitled)'} category=${event.category || '(empty)'} tags=${event.tags}`);
    });
    if (incomplete.length > 80) console.log(`  ... ${incomplete.length - 80} more`);

    if (!force) {
      console.log('\nStop: run classify-event-categories first, or pass --force if you intentionally want to clear anyway.');
      process.exitCode = apply ? 1 : 0;
      return;
    }
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply after category review.');
    return;
  }

  console.log('\nCreating backup before clearing event tags...');
  const backupPath = await backupDatabase(db);
  console.log(`Backup created: ${backupPath}`);

  await db.exec('BEGIN');
  try {
    await db.run("UPDATE events SET tags = NULL WHERE tags IS NOT NULL AND TRIM(tags) <> ''");
    const tagCounts = await rebuildTagDictionary(db);
    await db.exec('COMMIT');
    console.log(`Cleared tags on ${eventsWithTags.length} events.`);
    console.log(`Rebuilt tag dictionary from non-event content: ${Object.keys(tagCounts).length} tags.`);
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Retire event tags failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.close();
    } catch {}
  });
