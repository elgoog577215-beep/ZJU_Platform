const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const database = require("../src/config/db");

test.after(() => database.pool.close());

test("event lists default to actual event time across pages, independent of upload order", async (t) => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    t.after(() => db.close());
    t.mock.method(database, "getDb", async () => db);
    const { getAllHandler } = require("../src/controllers/resourceController");
    await db.exec(`
        CREATE TABLE users (id INTEGER, nickname TEXT, username TEXT, avatar TEXT);
        CREATE TABLE profiles (id INTEGER, handle TEXT, display_name TEXT, type TEXT, verified INTEGER, status TEXT);
        CREATE TABLE event_registrations (event_id INTEGER);
        CREATE TABLE events (
            id INTEGER PRIMARY KEY, title TEXT, date TEXT, created_at TEXT,
            status TEXT DEFAULT 'approved', deleted_at TEXT, uploader_id INTEGER,
            publisher_profile_id INTEGER, organizer_profile_id INTEGER
        );
        CREATE TABLE articles AS SELECT * FROM events WHERE 0;
        INSERT INTO events (id, title, date, created_at) VALUES
            (1, 'Latest event uploaded first', '2026-10-01', '2026-01-01'),
            (2, 'Older event uploaded later', '2025-01-01', '2026-09-22'),
            (3, 'Same event time', '2026-10-01', '2026-02-01'),
            (4, 'Unknown date', NULL, '2026-09-22'),
            (5, 'Empty date', '', '2026-09-22'),
            (6, 'Unparseable date', '待定', '2026-09-22'),
            (7, 'Earlier absolute time', '2026-09-30T23:00:00+08:00', '2026-03-01'),
            (8, 'Later absolute time', '2026-09-30T16:00:00Z', '2026-03-01');
        INSERT INTO articles SELECT * FROM events WHERE id <= 3;
    `);
    const app = express();
    app.get("/events", getAllHandler("events"));
    app.get("/articles", getAllHandler("articles"));
    app.use((error, req, res, next) => res.status(500).json({ error: error.message }));
    const server = app.listen(0, "127.0.0.1");
    t.after(() => new Promise((resolve) => server.close(resolve)));
    await new Promise((resolve) => server.once("listening", resolve));
    const endpoint = `http://127.0.0.1:${server.address().port}`;
    const list = async (path) => {
        const response = await fetch(endpoint + path);
        assert.equal(response.status, 200, await response.clone().text());
        return response.json();
    };
    const expected = [3, 1, 8, 7, 2, 6, 5, 4];
    for (const query of ["", "&sort=date_desc"]) {
        const ids = [];
        for (let page = 1; page <= 3; page++) {
            const result = await list(`/events?limit=3&page=${page}${query}`);
            assert.equal(result.pagination.total, 8);
            ids.push(...result.data.map((item) => item.id));
        }
        assert.deepEqual(ids, expected);
    }
    const articles = await list("/articles");
    assert.deepEqual(
        articles.data.map((item) => item.id),
        [3, 2, 1]
    );
    const uploads = await list("/events?sort=newest");
    assert.deepEqual(
        uploads.data.map((item) => item.id),
        [8, 7, 6, 5, 4, 3, 2, 1]
    );
});
