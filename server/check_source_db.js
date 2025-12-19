const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

// Target the source database file directly
const sourceDbPath = 'C:\\Users\\Administrator\\Desktop\\777\\server\\database.sqlite';

async function checkSourceDb() {
  console.log(`Checking source database at: ${sourceDbPath}`);
  try {
    const db = await open({
      filename: sourceDbPath,
      driver: sqlite3.Database
    });

    const tables = ['photos', 'articles'];
    
    for (const table of tables) {
      try {
        const count = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${count.count}`);
      } catch (e) {
        console.log(`Error checking ${table}:`, e.message);
      }
    }
  } catch (e) {
    console.error('Source database connection failed:', e);
  }
}

checkSourceDb();
