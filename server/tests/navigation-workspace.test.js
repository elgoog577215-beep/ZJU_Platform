const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "navigation-workspace-"));
process.env.DATABASE_FILE = path.join(fixture, "db.sqlite");
process.env.SECRET_KEY = "navigation-workspace-test-only";
process.env.NODE_ENV = "test";
const express = require("express");
const jwt = require("jsonwebtoken");
const { getDb, pool } = require("../src/config/db");
const { migrateNavigationShortcuts } = require("../src/config/migrations/navigationShortcuts");
const { authenticateToken, optionalAuth } = require("../src/middleware/auth");
const c = require("../src/controllers/navigationController");
const initial = [
    {
        id: "public",
        title: "Research",
        links: [{ id: "paper", name: "Paper <&>", url: "https://example.org/paper?a=1&b=2" }],
    },
    {
        id: "private",
        title: "Private",
        links: [{ id: "note", name: "My notes", url: "https://example.org/private?doc=private" }],
    },
];
test("workspaces isolate accounts, preserve revisions and share only explicit saved snapshots", async () => {
    let server;
    try {
        const db = await getDb();
        await require("../src/config/runMigrations").runMigrations(db);
        for (const id of [1, 2, 3])
            await db.run(
                "INSERT INTO users(id,username,password,role,admin_scope) VALUES (?,?,'fixture',?,?)",
                [id, `workspace_${id}`, id === 3 ? "admin" : "user", id === 3 ? "platform" : "none"]
            );
        const app = express();
        app.use(express.json());
        app.get("/workspace", authenticateToken, c.getWorkspace);
        app.put("/workspace", authenticateToken, c.saveWorkspace);
        app.get("/collections", optionalAuth, c.listCollections);
        app.get("/collections/:id", optionalAuth, c.getCollection);
        app.post("/collections", authenticateToken, c.createCollection);
        app.patch("/collections/:id", authenticateToken, c.updateCollection);
        server = app.listen(0, "127.0.0.1");
        await new Promise((resolve) => server.once("listening", resolve));
        const request = async (id, route = "/workspace", method = "GET", body) => {
            const res = await fetch(`http://127.0.0.1:${server.address().port}${route}`, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    ...(id
                        ? {
                              Authorization: `Bearer ${jwt.sign({ id, role: "admin" }, process.env.SECRET_KEY)}`,
                          }
                        : {}),
                },
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
            const raw = await res.text();
            return {
                status: res.status,
                cache: res.headers.get("cache-control"),
                data: raw.startsWith("{") ? JSON.parse(raw) : raw,
            };
        };
        assert.equal((await request(null)).status, 401);
        await db.run(
            "INSERT INTO user_navigation_shortcuts(user_id,links_json,version) VALUES (1,?,1)",
            [JSON.stringify([{ name: "Old", url: "https://example.org/old" }])]
        );
        assert.equal((await request(1)).data.legacyLinks.length, 1);
        assert.equal(
            (await request(1, "/workspace", "PUT", { version: 0, groups: initial, userId: 2 }))
                .status,
            200
        );
        assert.equal((await request(2)).data.groups, null);
        assert.equal((await request(1)).cache, "no-store");
        const canonical = c.validateGroups(initial);
        assert.deepEqual((await request(1)).data.groups, canonical);
        await migrateNavigationShortcuts(db);
        assert.deepEqual((await request(1)).data.groups, canonical);
        for (const url of [
            "javascript:alert(1)",
            "data:text/html,x",
            "https://user:secret@example.org/",
            "file:///tmp/a",
        ]) {
            assert.equal(
                (
                    await request(1, "/workspace", "PUT", {
                        version: 1,
                        groups: [{ ...initial[0], links: [{ ...initial[0].links[0], url }] }],
                    })
                ).status,
                400
            );
        }
        assert.equal(
            (
                await request(1, "/workspace", "PUT", {
                    version: 1,
                    groups: [initial[0], initial[0]],
                })
            ).status,
            400
        );
        const concurrent = await Promise.all([
            request(1, "/workspace", "PUT", { version: 1, groups: initial }),
            request(1, "/workspace", "PUT", { version: 1, groups: [...initial].reverse() }),
        ]);
        assert.deepEqual(concurrent.map((res) => res.status).sort(), [200, 409]);
        const share = {
            id: "share-1",
            title: "Research links",
            description: "Useful papers",
            groupIds: ["public"],
            version: 2,
            groups: initial,
            userId: 2,
        };
        assert.equal(
            (await request(1, "/collections", "POST", { ...share, groupIds: ["missing"] })).status,
            400
        );
        assert.equal(
            (await request(1, "/collections", "POST", { ...share, version: 1 })).status,
            409
        );
        const created = await request(1, "/collections", "POST", share);
        assert.equal(created.status, 201);
        assert.equal(created.data.status, "pending"); // forged admin token ignored
        assert.equal((await request(1, "/collections", "POST", share)).status, 409);
        assert.equal((await request(null, "/collections")).data.items.length, 0);
        assert.equal((await request(2, "/collections/share-1")).status, 404);
        assert.equal((await request(2, "/collections?scope=review")).status, 403);
        assert.equal((await request(null, "/collections?scope=mine")).status, 401);
        assert.equal((await request(1, "/collections?scope=mine")).data.items.length, 1);
        assert.equal(
            (await request(2, "/collections/share-1", "PATCH", { status: "approved" })).status,
            403
        );
        assert.equal(
            (await request(3, "/collections/share-1", "PATCH", { status: "approved" })).status,
            200
        );
        const publicData = await request(null, "/collections/share-1");
        assert.equal(publicData.data.groups.length, 1);
        assert.equal(JSON.stringify(publicData).includes("private"), false);
        assert.equal(publicData.data.user_id, undefined);
        await request(1, "/workspace", "PUT", { version: 2, groups: [] });
        assert.equal((await request(null, "/collections/share-1")).data.groups.length, 1); // immutable snapshot
        assert.equal((await request(null, "/collections?q=Research")).data.items.length, 1);
        assert.equal((await request(null, "/collections?offset=-1")).status, 400);
        assert.equal(
            (await request(2, "/collections/share-1", "PATCH", { status: "withdrawn" })).status,
            403
        );
        await request(2, "/workspace", "PUT", { version: 0, groups: publicData.data.groups });
        await request(1, "/collections/share-1", "PATCH", { status: "withdrawn" });
        assert.equal((await request(null, "/collections/share-1")).status, 404);
        assert.equal((await request(null, "/collections")).data.items.length, 0);
        assert.equal((await request(2)).data.groups.length, 1); // copied workspace survives withdrawal
        await db.run("UPDATE users SET role='banned' WHERE id=2");
        assert.equal((await request(2)).status, 401);
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await pool.close();
        fs.rmSync(fixture, { recursive: true, force: true });
    }
});
