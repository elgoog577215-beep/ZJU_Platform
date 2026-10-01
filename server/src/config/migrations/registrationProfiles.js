// Private account details deliberately live outside public users/profile projections.
async function migrateRegistrationProfiles(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS user_registration_profiles (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            student_id TEXT NOT NULL,
            major TEXT NOT NULL,
            grade TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

module.exports = { migrateRegistrationProfiles };
