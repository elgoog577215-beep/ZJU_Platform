const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let db;

async function getDb() {
  if (!db) {
    db = await open({
      filename: process.env.DATABASE_FILE || path.join(__dirname, '../../database.sqlite'),
      driver: sqlite3.Database
    });
    await db.exec('PRAGMA journal_mode = WAL;'); // Better concurrency
    await db.exec('PRAGMA synchronous = NORMAL;');
  }
  return db;
}

module.exports = { getDb };
