const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

process.env.SECRET_KEY = "test-only-admin-rate-limit-secret";
const database = require("../src/config/db");
test.after(() => database.pool.close());

test("administrator rate-limit exemptions require a current verified identity", async (t) => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    t.after(() => db.close());
    const getDb = t.mock.method(database, "getDb", async () => db);
    const { authenticateToken } = require("../src/middleware/auth");
    const { createApiRateLimiters } = require("../src/middleware/rateLimiting");
    const interval = global.setInterval;
    const intervalMock = t.mock.method(global, "setInterval", (...args) =>
        interval(...args).unref()
    );
    const { customRateLimit } = require("../src/middleware/security");

    await db.exec(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY, username TEXT, role TEXT, account_type TEXT,
            review_permission TEXT, admin_scope TEXT, admin_permissions TEXT,
            auth_version INTEGER DEFAULT 0
        );
        INSERT INTO users(id, username, role, admin_scope) VALUES
            (1, 'admin', 'admin', 'platform'),
            (2, 'operator', 'operator', 'operations'),
            (3, 'member', 'user', 'none'),
            (4, 'revoked', 'admin', 'platform'),
            (5, 'banned', 'banned', 'platform');
        UPDATE users SET auth_version = 1 WHERE id = 4;
    `);

    const tokenFor = (id, options = {}) =>
        jwt.sign(
            { id, role: "admin", admin_scope: "platform", auth_version: 0 },
            process.env.SECRET_KEY,
            options
        );
    const start = async (subtest, { max = 2 } = {}) => {
        const app = express();
        const { generalLimiter, authLimiter } = createApiRateLimiters({
            NODE_ENV: "production",
            RATE_LIMIT_MAX_REQUESTS: String(max),
            AUTH_RATE_LIMIT_MAX: "2",
        });
        app.use("/api", generalLimiter);
        app.use("/api/auth", authLimiter);
        app.use(express.json());
        app.get("/api/events", (_req, res) => res.json({ ok: true }));
        app.get("/api/settings", (_req, res) => res.json({ ok: true }));
        app.get("/api/protected", authenticateToken, (req, res) => res.json({ id: req.user.id }));
        app.get("/api/auth/me", authenticateToken, (req, res) => res.json({ id: req.user.id }));
        // Exercise the production auth limiter with deterministic route outcomes.
        app.post("/api/auth/login", (req, res) =>
            res.sendStatus(req.body.validFixtureCredentials ? 200 : 401)
        );
        app.post(
            "/api/posts",
            authenticateToken,
            customRateLimit({ maxRequests: 1 }),
            (_req, res) => res.json({ ok: true })
        );
        const server = app.listen(0, "127.0.0.1");
        subtest.after(() => new Promise((resolve) => server.close(resolve)));
        await new Promise((resolve) => server.once("listening", resolve));
        const base = `http://127.0.0.1:${server.address().port}`;
        return async (path, { token, body, headers = {} } = {}) => {
            const response = await fetch(base + path, {
                method: body ? "POST" : "GET",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(body ? { "Content-Type": "application/json" } : {}),
                    ...headers,
                },
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
            await response.text();
            return response;
        };
    };

    await t.test("admins bypass exhausted shared-IP quotas without consuming them", async (t) => {
        const request = await start(t);
        for (const id of [1, 2]) {
            for (let i = 0; i < 5; i++) {
                const before = getDb.mock.callCount();
                const response = await request("/api/protected", { token: tokenFor(id) });
                assert.equal(response.status, 200);
                assert.equal(response.headers.get("ratelimit-limit"), null);
                assert.equal(getDb.mock.callCount() - before, 1);
            }
        }
        assert.equal((await request("/api/events")).status, 200);
        assert.equal((await request("/api/events")).status, 200);
        assert.equal((await request("/api/events")).status, 429);
        assert.equal((await request("/api/settings")).status, 200);
        assert.equal((await request("/api/protected", { token: tokenFor(1) })).status, 200);
        for (const token of [
            tokenFor(3),
            tokenFor(4),
            tokenFor(5),
            tokenFor(999),
            tokenFor(1, { expiresIn: -1 }),
            jwt.sign({ id: 1, role: "admin" }, "wrong-signing-key"),
        ]) {
            assert.equal((await request("/api/events", { token })).status, 429);
        }
        assert.equal(
            (await request("/api/events", { headers: { "X-Admin": "true" } })).status,
            429
        );
        await db.run("UPDATE users SET role = 'user', admin_scope = 'none' WHERE id = 1");
        assert.equal((await request("/api/events", { token: tokenFor(1) })).status, 429);
        await db.run("UPDATE users SET role = 'admin', admin_scope = 'platform' WHERE id = 1");
    });

    await t.test(
        "login is independent of browsing quotas and failed attempts stay limited",
        async (t) => {
            const request = await start(t, { max: 1 });
            assert.equal((await request("/api/events")).status, 200);
            assert.equal((await request("/api/events")).status, 429);
            for (let i = 0; i < 4; i++) {
                assert.equal(
                    (await request("/api/auth/login", { body: { validFixtureCredentials: true } }))
                        .status,
                    200
                );
            }
            const attempt = { body: { username: "admin", role: "admin" } };
            assert.equal((await request("/api/auth/login", attempt)).status, 401);
            assert.equal((await request("/api/auth/login", attempt)).status, 401);
            assert.equal((await request("/api/auth/login", attempt)).status, 429);
            assert.equal(
                (await request("/api/auth/login", { ...attempt, token: tokenFor(1) })).status,
                401
            );
            assert.equal((await request("/api/auth/me", { token: tokenFor(1) })).status, 200);
        }
    );

    await t.test("authenticated admin publishing bypasses endpoint-specific quotas", async (t) => {
        const request = await start(t, { max: 50 });
        for (const id of [1, 2]) {
            for (let i = 0; i < 4; i++) {
                const response = await request("/api/posts", { token: tokenFor(id), body: {} });
                assert.equal(response.status, 200);
                assert.equal(response.headers.get("x-ratelimit-limit"), null);
            }
        }
        assert.equal((await request("/api/posts", { token: tokenFor(3), body: {} })).status, 200);
        assert.equal((await request("/api/posts", { token: tokenFor(3), body: {} })).status, 429);
        assert.equal((await request("/api/posts", { token: tokenFor(4), body: {} })).status, 401);
        assert.equal((await request("/api/posts", { body: { role: "admin" } })).status, 401);
    });

    await t.test(
        "database failure cannot grant an exemption and protected routes fail closed",
        async (t) => {
            const request = await start(t, { max: 1 });
            getDb.mock.mockImplementation(async () => {
                throw new Error("Database unavailable");
            });
            assert.equal((await request("/api/protected", { token: tokenFor(1) })).status, 503);
            assert.equal((await request("/api/events", { token: tokenFor(1) })).status, 429);
            getDb.mock.mockImplementation(async () => db);
        }
    );
    intervalMock.mock.restore();
});
