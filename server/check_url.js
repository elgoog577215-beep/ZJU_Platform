const { getDb } = require('./src/config/db');

(async () => {
  try {
    const db = await getDb();
    const row = await db.get("SELECT url FROM photos LIMIT 1");
    console.log("Check Result:", row ? row.url : "No photos found");
  } catch (err) {
    console.error("Error:", err);
  }
})();
