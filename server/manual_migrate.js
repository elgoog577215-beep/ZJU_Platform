const { getDb } = require('./src/config/db');

(async () => {
    try {
        console.log('Starting manual migration...');
        // getDb now includes migration logic
        await getDb(); 
        console.log('Manual migration finished successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
})();
