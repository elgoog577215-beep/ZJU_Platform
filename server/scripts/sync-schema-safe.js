require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getDb, pool } = require('../src/config/db');
const { runMigrations } = require('../src/config/runMigrations');

const REQUIRED_COLUMNS = {
  articles: ['category', 'content_blocks', 'related_article_ids', 'related_post_ids', 'related_news_ids', 'related_group_ids', 'views_count'],
  community_posts: ['content_blocks', 'related_article_ids', 'related_post_ids', 'related_news_ids', 'related_group_ids', 'solved_comment_id', 'is_anonymous'],
  community_groups: ['review_status', 'is_recommended', 'sort_order', 'valid_until', 'primary_tags', 'related_article_ids', 'related_post_ids', 'related_news_ids', 'related_group_ids'],
  news: ['content_blocks', 'featured', 'related_article_ids', 'related_post_ids', 'related_news_ids', 'related_group_ids'],
  notifications: ['content'],
  community_metrics_events: ['metric_type', 'source_type', 'source_id', 'target_type', 'target_id', 'actor_id', 'date_key'],
};

async function ensureBackupDir(baseDir) {
  const backupDir = path.join(baseDir, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

async function backupDatabase(db, dbFile) {
  const baseDir = path.dirname(dbFile);
  const backupDir = await ensureBackupDir(baseDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `schema-sync-backup-${stamp}.sqlite`);
  await db.exec(`VACUUM INTO '${backupPath.replace(/\\/g, '\\\\')}'`);
  return backupPath;
}

async function listMissingColumns(db) {
  const missing = [];
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const info = await db.all(`PRAGMA table_info(${table})`);
    const exists = new Set(info.map((col) => col.name));
    for (const col of columns) {
      if (!exists.has(col)) {
        missing.push(`${table}.${col}`);
      }
    }
  }
  return missing;
}

async function main() {
  const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '../database.sqlite');
  console.log(`📦 Target database: ${dbFile}`);

  const db = await getDb();

  console.log('💾 Creating backup before schema sync...');
  const backupPath = await backupDatabase(db, dbFile);
  console.log(`✅ Backup created: ${backupPath}`);

  console.log('🔄 Running additive migrations...');
  await runMigrations(db);

  console.log('🔍 Verifying required schema fields...');
  const missing = await listMissingColumns(db);
  if (missing.length > 0) {
    console.error('❌ Schema verification failed. Missing fields:');
    missing.forEach((item) => console.error(`  - ${item}`));
    process.exitCode = 2;
  } else {
    console.log('✅ Schema verification passed. Missing fields: 0');
  }

  await pool.close();
  if (process.exitCode === 2) return;
  console.log('🎉 Schema sync completed safely.');
}

main().catch(async (error) => {
  console.error('❌ Schema sync failed:', error);
  try {
    await pool.close();
  } catch {}
  process.exit(1);
});
