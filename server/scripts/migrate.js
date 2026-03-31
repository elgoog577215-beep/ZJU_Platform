require('dotenv').config();

const path = require('path');
const { getDb, pool } = require('../src/config/db');
const { runMigrations } = require('../src/config/runMigrations');

async function main() {
  const dbFile = process.env.DATABASE_FILE || path.join(__dirname, '../database.sqlite');
  console.log(`📦 Target database: ${dbFile}`);

  const db = await getDb();
  await runMigrations(db);
  await pool.close();
  console.log('✅ Manual migration completed');
}

main().catch(async (error) => {
  console.error('❌ Manual migration failed:', error);
  try {
    await pool.close();
  } catch {}
  process.exit(1);
});
