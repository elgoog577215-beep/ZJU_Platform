const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const { runMigrations } = require('./migrate');

let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const db = await open({
          filename: process.env.DATABASE_FILE || path.join(__dirname, '../../database.sqlite'),
          driver: sqlite3.Database
        });
        
        await db.exec('PRAGMA journal_mode = WAL;'); // Better concurrency
        await db.exec('PRAGMA synchronous = NORMAL;');
        
        // Run migrations
        await runMigrations(db);
        
        return db;
      } catch (error) {
        console.error('Database initialization failed:', error);
        dbPromise = null; // Reset to allow retry
        throw error;
      }
    })();
  }
  return dbPromise;
}

module.exports = { getDb };
