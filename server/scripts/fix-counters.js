require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getDb, pool } = require('../src/config/db');

const DB_FILE = process.env.DATABASE_FILE || path.join(__dirname, '../database.sqlite');

const ITEM_TYPE_MAP = {
  photos: 'photo',
  videos: 'video',
  articles: 'article',
};

const RESOURCE_TABLES = [
  { table: 'photos', itemType: 'photo' },
  { table: 'music', itemType: 'music' },
  { table: 'videos', itemType: 'video' },
  { table: 'articles', itemType: 'article' },
  { table: 'events', itemType: 'event' },
];

const backupDatabase = () => {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`Database file not found at ${DB_FILE}`);
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${DB_FILE}.bak.${timestamp}`;
  fs.copyFileSync(DB_FILE, backupPath);
  console.log(`[backup] ${DB_FILE} → ${backupPath}`);
  return backupPath;
};

const normalizeFavoriteItemTypes = async (db) => {
  console.log('\n[1/3] Normalizing favorites.item_type (plural → singular)');
  const before = await db.all(
    `SELECT item_type, COUNT(*) AS n FROM favorites GROUP BY item_type ORDER BY item_type`
  );
  console.log('  before:', before);

  let totalChanged = 0;
  for (const [from, to] of Object.entries(ITEM_TYPE_MAP)) {
    const result = await db.run(
      `UPDATE favorites SET item_type = ? WHERE item_type = ?`,
      [to, from]
    );
    if (result?.changes) {
      console.log(`  ${from} → ${to}: ${result.changes} rows`);
      totalChanged += result.changes;
    }
  }
  console.log(`  total normalized: ${totalChanged}`);

  const after = await db.all(
    `SELECT item_type, COUNT(*) AS n FROM favorites GROUP BY item_type ORDER BY item_type`
  );
  console.log('  after:', after);
};

const recountPostComments = async (db) => {
  console.log('\n[2/3] Recounting community_posts.comments_count');
  const drift = await db.all(`
    SELECT cp.id, cp.comments_count AS stored,
      (SELECT COUNT(*) FROM comments
         WHERE resource_type = 'community_post' AND resource_id = cp.id) AS actual
    FROM community_posts cp
  `);
  const mismatched = drift.filter((row) => Number(row.stored || 0) !== Number(row.actual || 0));
  console.log(`  total posts: ${drift.length}, drifted: ${mismatched.length}`);
  if (mismatched.length) {
    console.log('  sample drift (up to 10):', mismatched.slice(0, 10));
  }

  const result = await db.run(`
    UPDATE community_posts
    SET comments_count = (
      SELECT COUNT(*) FROM comments
      WHERE resource_type = 'community_post' AND resource_id = community_posts.id
    )
  `);
  console.log(`  UPDATE affected: ${result?.changes ?? 'n/a'} rows`);
};

const recountResourceLikes = async (db) => {
  console.log('\n[3/3] Recounting {table}.likes = COUNT(favorites)');
  for (const { table, itemType } of RESOURCE_TABLES) {
    const drift = await db.all(
      `
      SELECT t.id, t.likes AS stored,
        (SELECT COUNT(*) FROM favorites WHERE item_id = t.id AND item_type = ?) AS actual
      FROM ${table} t
      `,
      [itemType]
    );
    const mismatched = drift.filter((row) => Number(row.stored || 0) !== Number(row.actual || 0));
    console.log(`  ${table} (${itemType}): total ${drift.length}, drifted ${mismatched.length}`);
    if (mismatched.length) {
      console.log(`    sample drift (up to 5):`, mismatched.slice(0, 5));
    }

    const result = await db.run(
      `
      UPDATE ${table}
      SET likes = (SELECT COUNT(*) FROM favorites WHERE item_id = ${table}.id AND item_type = ?)
      `,
      [itemType]
    );
    console.log(`    UPDATE affected: ${result?.changes ?? 'n/a'} rows`);
  }
};

const run = async () => {
  console.log(`[fix-counters] DB: ${DB_FILE}`);
  const backupPath = backupDatabase();

  const db = await getDb();
  try {
    await db.exec('BEGIN TRANSACTION');
    await normalizeFavoriteItemTypes(db);
    await recountPostComments(db);
    await recountResourceLikes(db);
    await db.exec('COMMIT');
    console.log('\n[done] COMMIT successful.');
    console.log(`[rollback-hint] If something looks wrong: cp "${backupPath}" "${DB_FILE}"`);
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('\n[error] Rolled back. Backup preserved at:', backupPath);
    throw error;
  } finally {
    if (pool && typeof pool.close === 'function') {
      await pool.close();
    }
  }
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
