const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

(async () => {
  try {
    const dbPath = path.join(__dirname, 'database.sqlite');
    console.log(`Opening database at ${dbPath}`);
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log('Checkpointing WAL...');
    await db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    console.log('Checkpoint complete.');
    await db.close();
  } catch (err) {
    console.error('Error during checkpoint:', err);
    process.exit(1);
  }
})();
