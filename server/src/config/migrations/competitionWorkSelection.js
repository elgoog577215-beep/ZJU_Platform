async function migrateCompetitionWorkSelection(db) {
    const columns = await db.all("PRAGMA table_info(competition_works)");
    if (!columns.some((column) => column.name === "featured"))
        await db.exec(
            "ALTER TABLE competition_works ADD COLUMN featured INTEGER NOT NULL DEFAULT 0"
        );
}
module.exports = { migrateCompetitionWorkSelection };
