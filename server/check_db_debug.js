const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function checkDb() {
  try {
    const db = await open({
      filename: path.join(__dirname, 'database.sqlite'),
      driver: sqlite3.Database
    });

    const tables = ['photos', 'articles', 'music', 'videos', 'events'];
    
    for (const table of tables) {
      try {
        const count = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${count.count}`);
        
        if (count.count > 0) {
            const sample = await db.all(`SELECT * FROM ${table} LIMIT 1`);
            console.log(`Sample from ${table}:`, JSON.stringify(sample, null, 2));
        }
      } catch (e) {
        console.log(`Error checking ${table}:`, e.message);
      }
    }
  } catch (e) {
    console.error('Database connection failed:', e);
  }
}

checkDb();
