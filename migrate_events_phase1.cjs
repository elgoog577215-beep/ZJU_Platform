const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
    const dbPath = path.join(__dirname, 'server/database.sqlite');
    console.log(`Migrating database at: ${dbPath}`);

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    try {
        console.log('Adding new columns to events table...');
        
        // Add score
        try {
            await db.exec('ALTER TABLE events ADD COLUMN score TEXT');
            console.log('Added score column');
        } catch (e) {
            if (e.message.includes('duplicate column')) console.log('score column already exists');
            else console.error('Error adding score:', e.message);
        }

        // Add target_audience
        try {
            await db.exec('ALTER TABLE events ADD COLUMN target_audience TEXT');
            console.log('Added target_audience column');
        } catch (e) {
            if (e.message.includes('duplicate column')) console.log('target_audience column already exists');
            else console.error('Error adding target_audience:', e.message);
        }

        // Add organizer
        try {
            await db.exec('ALTER TABLE events ADD COLUMN organizer TEXT');
            console.log('Added organizer column');
        } catch (e) {
            if (e.message.includes('duplicate column')) console.log('organizer column already exists');
            else console.error('Error adding organizer:', e.message);
        }

        // Add nature
        try {
            await db.exec('ALTER TABLE events ADD COLUMN nature TEXT');
            console.log('Added nature column');
        } catch (e) {
            if (e.message.includes('duplicate column')) console.log('nature column already exists');
            else console.error('Error adding nature:', e.message);
        }

        console.log('Migration complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await db.close();
    }
}

migrate();
