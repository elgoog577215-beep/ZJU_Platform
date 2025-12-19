const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function checkDb() {
  try {
    const db = await open({
      filename: path.join(__dirname, 'database.sqlite'),
      driver: sqlite3.Database
    });

    // List all tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables:", tables.map(t => t.name));

    // Check messages table schema if it exists
    if (tables.find(t => t.name === 'messages')) {
        const schema = await db.all("PRAGMA table_info(messages)");
        console.log("Messages Schema:", schema);
        const count = await db.get("SELECT COUNT(*) as count FROM messages");
        console.log("Messages count:", count.count);
    } else {
        console.log("Messages table NOT FOUND");
    }

  } catch (e) {
    console.error('Database connection failed:', e);
  }
}

checkDb();
