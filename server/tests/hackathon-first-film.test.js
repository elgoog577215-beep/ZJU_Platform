const test = require("node:test"),
    assert = require("node:assert/strict"),
    sqlite = require("sqlite"),
    sqlite3 = require("sqlite3");
const {
    migrateHackathonFirstFilm: migrate,
} = require("../src/config/migrations/hackathonFirstFilm");
test("restores the explicitly bound original film without changing files, other editions, or later curation", async () => {
    const db = await sqlite.open({ filename: ":memory:", driver: sqlite3.Database });
    try {
        await db.exec(
            "CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT); CREATE TABLE competitions(id INTEGER PRIMARY KEY,slug TEXT); CREATE TABLE videos(id INTEGER PRIMARY KEY,video TEXT,status TEXT,deleted_at TEXT); CREATE TABLE competition_media_links(competition_id INTEGER,resource_type TEXT,resource_id INTEGER,role TEXT,updated_at TEXT)"
        );
        await db.exec(
            "INSERT INTO competitions VALUES(1,'ai-full-stack-hackathon-outcome'),(2,'zhekesong-ai-x-2026'); INSERT INTO videos VALUES(17,'/uploads/videos/1779528636435-d3001584f1e90e30.mp4','approved',NULL),(23,'/uploads/videos/1788259586953-1fa2449e0b4ef4d8.mp4','approved',NULL); INSERT INTO competition_media_links VALUES(1,'video',17,'archive',NULL),(1,'video',23,'official_film',NULL),(2,'video',23,'official_film',NULL)"
        );
        const videos = await db.all("SELECT * FROM videos");
        await migrate(db);
        assert.equal(
            (
                await db.get(
                    "SELECT role FROM competition_media_links WHERE competition_id=1 AND resource_id=17"
                )
            ).role,
            "official_film"
        );
        assert.equal(
            (
                await db.get(
                    "SELECT role FROM competition_media_links WHERE competition_id=1 AND resource_id=23"
                )
            ).role,
            "archive"
        );
        assert.equal(
            (await db.get("SELECT role FROM competition_media_links WHERE competition_id=2")).role,
            "official_film"
        );
        assert.deepEqual(await db.all("SELECT * FROM videos"), videos);
        await db.run(
            "UPDATE competition_media_links SET role='highlight' WHERE competition_id=1 AND resource_id=17"
        );
        await migrate(db);
        assert.equal(
            (
                await db.get(
                    "SELECT role FROM competition_media_links WHERE competition_id=1 AND resource_id=17"
                )
            ).role,
            "highlight"
        );
    } finally {
        await db.close();
    }
});
