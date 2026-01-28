const { getDb } = require('./server/src/config/db');

async function checkTags() {
    try {
        const db = await getDb();
        console.log("Checking photos tags and category...");
        const photos = await db.all("SELECT id, tags, category FROM photos LIMIT 5");
        console.log(photos);

        console.log("Checking events tags and category...");
        const events = await db.all("SELECT id, tags, category FROM events LIMIT 5");
        console.log(events);
        
        console.log("Checking tags table...");
        const tags = await db.all("SELECT * FROM tags");
        console.log(tags);

    } catch (err) {
        console.error(err);
    }
}

checkTags();
