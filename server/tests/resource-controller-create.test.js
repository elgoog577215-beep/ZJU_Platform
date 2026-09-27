const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const database = require("../src/config/db");
const profiles = require("../src/services/profileService");
const notifications = require("../src/controllers/notificationController");
const governance = require("../src/services/eventGovernanceTriggerService");
const eventProfiles = require("../src/services/eventAiProfileService");

test.after(() => database.pool.close());

test("event creation returns the saved record and rejects duplicate sources without another insert", async (t) => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    t.after(() => db.close());
    t.mock.method(database, "getDb", async () => db);
    t.mock.method(profiles, "resolvePublisherProfileId", async () => 101);
    t.mock.method(profiles, "resolveOrganizerProfileId", async () => 202);
    const fanout = t.mock.method(notifications, "fanOutNewContent", async () => {});
    const scan = t.mock.method(governance, "triggerEventGovernance", async () => ({}));
    const index = t.mock.method(eventProfiles, "ensureEventProfile", async () => ({}));
    const { createHandler, fields } = require("../src/controllers/resourceController");

    await db.exec(`
        CREATE TABLE events (
            id INTEGER PRIMARY KEY,
            ${fields.events.map((field) => `${field} TEXT`).join(",")},
            status TEXT, uploader_id INTEGER, created_at TEXT, deleted_at TEXT,
            publisher_profile_id INTEGER, organizer_profile_id INTEGER
        );
        CREATE TABLE event_ai_search_fts (event_id INTEGER);
        CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT UNIQUE, count INTEGER DEFAULT 0);
    `);

    const app = express();
    app.use(express.json());
    app.post(
        "/events",
        (req, res, next) => {
            req.user = { id: 7, role: "admin", admin_scope: "platform" };
            next();
        },
        createHandler("events", fields.events)
    );
    app.use((error, req, res, next) => res.status(500).json({ error: error.message }));
    const server = app.listen(0, "127.0.0.1");
    t.after(() => new Promise((resolve) => server.close(resolve)));
    await new Promise((resolve) => server.once("listening", resolve));
    const endpoint = `http://127.0.0.1:${server.address().port}/events`;
    const submit = (body) =>
        fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    const payload = {
        title: "Event upload regression",
        link: "https://example.org/events/upload-regression",
        category: "volunteer",
        tags: "volunteer",
    };

    const response = await submit(payload);
    assert.equal(response.status, 200, await response.clone().text());
    const saved = await response.json();
    const row = await db.get("SELECT * FROM events WHERE id = ?", [saved.id]);
    assert.ok(row);
    assert.equal(row.title, payload.title);
    assert.equal(saved.status, "approved");
    assert.equal(row.publisher_profile_id, 101);
    assert.equal(row.organizer_profile_id, 202);
    assert.equal((await db.get("SELECT name FROM tags")).name, "volunteer");
    assert.equal(scan.mock.callCount(), 1);
    assert.equal(scan.mock.calls[0].arguments[1].eventId, saved.id);
    assert.equal(fanout.mock.callCount(), 1);
    assert.equal(fanout.mock.calls[0].arguments[0].resourceId, saved.id);
    await new Promise((resolve) => setImmediate(resolve));
    // Wait for the queued SQLite read used by background indexing.
    await db.get("SELECT 1");
    assert.equal(index.mock.callCount(), 1);
    assert.equal(index.mock.calls[0].arguments[1].id, saved.id);

    const duplicateResponse = await submit(payload);
    assert.equal(duplicateResponse.status, 409);
    const duplicate = await duplicateResponse.json();
    assert.equal(duplicate.error, "RESOURCE_DUPLICATE_SOURCE");
    assert.equal(duplicate.existing_id, saved.id);
    assert.equal(duplicate.existing_title, payload.title);
    assert.equal((await db.get("SELECT COUNT(*) AS count FROM events")).count, 1);
    assert.equal(fanout.mock.callCount(), 1);

    const pendingResponse = await submit({
        ...payload,
        link: "https://example.org/events/pending-regression",
        status: "pending",
    });
    assert.equal(pendingResponse.status, 200, await pendingResponse.clone().text());
    const pending = await pendingResponse.json();
    assert.equal(pending.status, "pending");
    assert.equal(fanout.mock.callCount(), 1);
    await new Promise((resolve) => setImmediate(resolve));
    await db.get("SELECT 1");
    assert.equal(index.mock.callCount(), 1);
});
