const MARKER = "hackathon_first_official_film_restore_20261010_v1";
async function migrateHackathonFirstFilm(db) {
    await db.exec("BEGIN IMMEDIATE");
    try {
        if (!(await db.get("SELECT value FROM settings WHERE key=?", [MARKER]))) {
            const competition = await db.get(
                "SELECT id FROM competitions WHERE slug='ai-full-stack-hackathon-outcome'"
            );
            if (competition) {
                // Restore the original explicitly bound promotional film. Keep every uploaded file.
                const original = await db.get(
                    `SELECT v.id FROM videos v JOIN competition_media_links l ON l.resource_id=v.id AND l.resource_type='video' WHERE l.competition_id=? AND v.id=17 AND v.url='/uploads/videos/1779528636435-d3001584f1e90e30.mp4' AND v.status='approved' AND v.deleted_at IS NULL`,
                    [competition.id]
                );
                if (original) {
                    await db.run(
                        "UPDATE competition_media_links SET role='archive',updated_at=CURRENT_TIMESTAMP WHERE competition_id=? AND resource_type='video' AND resource_id=23 AND EXISTS (SELECT 1 FROM videos WHERE id=23 AND url='/uploads/videos/1788259586953-1fa2449e0b4ef4d8.mp4')",
                        [competition.id]
                    );
                    await db.run(
                        "UPDATE competition_media_links SET role='official_film',updated_at=CURRENT_TIMESTAMP WHERE competition_id=? AND resource_type='video' AND resource_id=?",
                        [competition.id, original.id]
                    );
                }
            }
            await db.run("INSERT INTO settings (key,value) VALUES (?,'1')", [MARKER]);
        }
        await db.exec("COMMIT");
    } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
    }
}
module.exports = { migrateHackathonFirstFilm };
