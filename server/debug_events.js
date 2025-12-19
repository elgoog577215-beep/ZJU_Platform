const { getDb } = require('./src/config/db');

(async () => {
  try {
    const db = await getDb();
    const events = await db.all('SELECT id, title, status, deleted_at FROM events');
    console.log('Total events:', events.length);
    console.log('Events:', JSON.stringify(events, null, 2));
  } catch (err) {
    console.error(err);
  }
})();
