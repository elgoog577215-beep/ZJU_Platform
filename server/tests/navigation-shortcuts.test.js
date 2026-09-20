const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "zju-shortcuts-"));
process.env.DATABASE_FILE = path.join(fixtureDir, "test.sqlite");
process.env.SECRET_KEY = "fixture-only-shortcuts-secret";
process.env.NODE_ENV = "test";
const express = require("express");
const jwt = require("jsonwebtoken");
const { getDb, pool } = require("../src/config/db");
const { migrateNavigationShortcuts } = require("../src/config/migrations/navigationShortcuts");
const { authenticateToken } = require("../src/middleware/auth");
const controller = require("../src/controllers/navigationController");

test("private shortcuts persist per account, reject unsafe URLs, and protect concurrent edits", async () => {
    let server;
    try {
        const db = await getDb();
        await require("../src/config/runMigrations").runMigrations(db);
        for (const id of [1, 2])
            await db.run(
                "INSERT INTO users(id,username,password,role) VALUES (?,?,'fixture','user')",
                [id, `shortcuts_${id}`]
            );
        const app = express();
        app.use(express.json());
        app.get("/shortcuts", authenticateToken, controller.getShortcuts);
        app.put("/shortcuts", authenticateToken, controller.saveShortcuts);
        server = app.listen(0, "127.0.0.1");
        await new Promise((resolve) => server.once("listening", resolve));
        const url = `http://127.0.0.1:${server.address().port}/shortcuts`;
        const request = async (id, body) => {
            const response = await fetch(url, {
                method: body === undefined ? "GET" : "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(id
                        ? { Authorization: `Bearer ${jwt.sign({ id }, process.env.SECRET_KEY)}` }
                        : {}),
                },
                ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            });
            return {
                status: response.status,
                cache: response.headers.get("cache-control"),
                data: await response.text(),
            };
        };
        assert.equal((await request(null)).status, 401);
        assert.deepEqual(JSON.parse((await request(1)).data), { links: null, version: 0 });
        const links = [
            { name: "Private notebook", url: "https://example.com/my-notes?document=private" },
            { name: "Figma", url: "https://www.figma.com/" },
        ];
        const saved = await request(1, { links, version: 0, userId: 2 });
        assert.equal(saved.status, 200);
        assert.equal(saved.cache, "no-store");
        // A second client reads the same saved order, while another account sees defaults.
        assert.deepEqual(JSON.parse((await request(1)).data).links, links);
        assert.deepEqual(JSON.parse((await request(2)).data), { links: null, version: 0 });
        await migrateNavigationShortcuts(db);
        assert.deepEqual(JSON.parse((await request(1)).data).links, links);
        for (const url of [
            "javascript:alert(1)",
            "data:text/html,test",
            "file:///tmp/test",
            "https://user:secret@example.com/",
        ]) {
            assert.equal(
                (await request(1, { links: [{ name: "Invalid", url }], version: 1 })).status,
                400
            );
        }
        assert.equal((await request(1, { links: [...links, links[0]], version: 1 })).status, 400);
        assert.equal(
            (
                await request(1, {
                    links: Array.from({ length: 13 }, (_, n) => ({
                        name: `Site ${n}`,
                        url: `https://example.com/${n}`,
                    })),
                    version: 1,
                })
            ).status,
            400
        );
        assert.equal((await request(1, { links: [], version: -1 })).status, 400);
        const concurrent = await Promise.all([
            request(1, { links: [], version: 1 }),
            request(1, { links: [...links].reverse(), version: 1 }),
        ]);
        assert.deepEqual(concurrent.map((item) => item.status).sort(), [200, 409]);
        assert.equal((await request(1, { links: [], version: 2 })).status, 200);
        assert.deepEqual(JSON.parse((await request(1)).data).links, []);
        assert.equal((await request(1, { links: null, version: 3 })).status, 200);
        assert.deepEqual(JSON.parse((await request(1)).data), { links: null, version: 4 });
        await db.run("UPDATE users SET role = 'banned' WHERE id = 1");
        assert.equal((await request(1)).status, 401);
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await pool.close();
        fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
});
