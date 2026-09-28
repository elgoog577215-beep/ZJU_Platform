async function migrateNavigationShortcuts(db) {
    await db.exec(`CREATE TABLE IF NOT EXISTS user_navigation_shortcuts (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        links_json TEXT NOT NULL DEFAULT 'null',
        version INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.exec(`CREATE TABLE IF NOT EXISTS user_navigation_workspaces (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        groups_json TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS navigation_collections (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        groups_json TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','withdrawn')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_navigation_collections_status ON navigation_collections(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_navigation_collections_owner ON navigation_collections(user_id, created_at);`);
}
module.exports = { migrateNavigationShortcuts };
