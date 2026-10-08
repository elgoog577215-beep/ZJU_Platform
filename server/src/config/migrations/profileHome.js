async function migrateProfileHome(db) {
    for (const [table, fields] of Object.entries({
        users: {
            profile_description: "TEXT DEFAULT ''",
            profile_background: "TEXT DEFAULT '{}'",
            profile_version: "INTEGER NOT NULL DEFAULT 0",
        },
        user_profile_cards: { source_type: "TEXT", source_id: "INTEGER" },
    })) {
        const columns = new Set(
            (await db.all(`PRAGMA table_info(${table})`)).map((row) => row.name)
        );
        for (const [name, definition] of Object.entries(fields)) {
            if (!columns.has(name))
                await db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
        }
    }
    await db.exec(`CREATE TABLE IF NOT EXISTS user_profile_likes (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(user_id, target_id), CHECK(user_id != target_id)
    ); CREATE INDEX IF NOT EXISTS idx_profile_likes_target ON user_profile_likes(target_id);`);
}
module.exports = { migrateProfileHome };
