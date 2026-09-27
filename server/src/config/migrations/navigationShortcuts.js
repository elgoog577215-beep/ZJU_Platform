async function migrateNavigationShortcuts(db) {
    await db.exec(`CREATE TABLE IF NOT EXISTS user_navigation_shortcuts (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        links_json TEXT NOT NULL DEFAULT 'null',
        version INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
}
module.exports = { migrateNavigationShortcuts };
