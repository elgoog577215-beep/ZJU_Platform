const resources = ['photos', 'music', 'videos', 'articles', 'events'];

async function runMigrations(db) {
  console.log('Running database migrations...');
  
  for (const table of resources) {
    try {
      const columns = await db.all(`PRAGMA table_info(${table})`);
      const hasDeletedAt = columns.some(c => c.name === 'deleted_at');
      
      if (!hasDeletedAt) {
        console.log(`Adding deleted_at column to ${table}...`);
        await db.exec(`ALTER TABLE ${table} ADD COLUMN deleted_at DATETIME`);
      }
    } catch (error) {
      console.error(`Error migrating table ${table}:`, error.message);
    }
  }
  
  console.log('Migrations completed.');
}

module.exports = { runMigrations };