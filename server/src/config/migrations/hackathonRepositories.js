async function migrateHackathonRepositories(db) {
    const columns = new Set(
        (await db.all("PRAGMA table_info(hackathon_registrations)")).map((c) => c.name)
    );
    for (const name of [
        "github_repository_url",
        "modelscope_repository_url",
        "repositories_updated_at",
    ]) {
        if (!columns.has(name))
            await db.exec(`ALTER TABLE hackathon_registrations ADD COLUMN ${name} TEXT`);
    }
}
module.exports = { migrateHackathonRepositories };
