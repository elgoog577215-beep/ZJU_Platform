const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "zju-admin-access-"));
process.env.DATABASE_FILE = path.join(fixtureDir, "test.sqlite");
process.env.SECRET_KEY = "test-only-secret-for-admin-boundaries";
process.env.NODE_ENV = "test";
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getDb, pool } = require("../src/config/db");
const { migrateAdminAccess } = require("../src/config/migrations/adminAccess");
const permissions = require("../src/utils/userPermissions");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const tokenFor = (id, version = 0) =>
    jwt.sign(
        { id, role: "admin", admin_scope: "platform", auth_version: version },
        process.env.SECRET_KEY
    );

test("admin module permissions are granular, revocable and never inherited from JWT claims", async (t) => {
    let server;
    try {
        const db = await getDb();
        await require("../src/config/runMigrations").runMigrations(db);
        const password = await bcrypt.hash("fixture-password", 4);
        for (const [id, role, scope, grants] of [
            [1, "admin", "platform", []],
            [2, "admin", "platform", []],
            [3, "operator", "operations", [...permissions.ADMIN_PERMISSION_KEYS]],
            [4, "user", "none", []],
            [5, "banned", "none", []],
        ]) {
            await db.run(
                "INSERT INTO users(id,username,password,role,admin_scope,admin_permissions) VALUES (?,?,?,?,?,?)",
                [id, `fixture_${id}`, password, role, scope, JSON.stringify(grants)]
            );
        }
        for (const [id, name] of [
            [901, "Organization A"],
            [902, "Organization B"],
        ]) {
            await db.run(
                "INSERT INTO profiles(id,type,handle,display_name) VALUES (?, 'club', ?, ?)",
                [id, `fixture-${id}`, name]
            );
            await db.run(
                "INSERT INTO events(id,title,status,publisher_profile_id,views) VALUES (?,?, 'pending', ?, 7)",
                [id, `${name} private title`, id]
            );
            await db.run(
                "INSERT INTO articles(id,title,status,publisher_profile_id,content) VALUES (?,?, 'pending', ?, 'PRIVATE BODY')",
                [id, `${name} article`, id]
            );
        }
        const interval = global.setInterval;
        const intervalMock = t.mock.method(global, "setInterval", (...args) =>
            interval(...args).unref()
        );
        const router = require("../src/routes/api");
        intervalMock.mock.restore();
        const app = express();
        app.use(express.json());
        app.use("/api", router);
        app.use((error, req, res, next) => {
            res.status(500).json({ error: error.message });
        });
        server = app.listen(0, "127.0.0.1");
        await new Promise((resolve) => server.once("listening", resolve));
        const base = `http://127.0.0.1:${server.address().port}/api`;
        const request = async (route, id = 3, options = {}) => {
            const response = await fetch(base + route, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...(id
                        ? { Authorization: `Bearer ${tokenFor(id, options.version || 0)}` }
                        : {}),
                    ...options.headers,
                },
            });
            const text = await response.text();
            let body;
            try {
                body = JSON.parse(text);
            } catch {
                body = text;
            }
            return { status: response.status, body, headers: response.headers };
        };
        const update = (id, body, actor = 1) =>
            request(`/admin/access/${id}`, actor, { method: "PUT", body: JSON.stringify(body) });

        await t.test("shared administrator password cannot issue any identity", async () => {
            const previous = process.env.ADMIN_PASSWORD;
            process.env.ADMIN_PASSWORD = "fixture-legacy-admin-secret";
            try {
                for (const actor of [null, 3]) {
                    const response = await request("/auth/admin-login", actor, {
                        method: "POST",
                        body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
                    });
                    assert.equal(response.status, 410);
                    assert.equal(response.body.token, undefined);
                    assert.equal(response.body.user, undefined);
                }
            } finally {
                if (previous === undefined) delete process.env.ADMIN_PASSWORD;
                else process.env.ADMIN_PASSWORD = previous;
            }
        });

        await t.test(
            "legacy admin migration preserves full access once and does not restore revoked grants",
            async () => {
                const old = await open({ filename: ":memory:", driver: sqlite3.Database });
                await old.exec(
                    "CREATE TABLE users(id INTEGER, role TEXT, admin_scope TEXT, review_permission TEXT); INSERT INTO users VALUES(1,'admin','none','admin')"
                );
                await migrateAdminAccess(old);
                assert.equal((await old.get("SELECT * FROM users")).admin_scope, "platform");
                await old.run(
                    "UPDATE users SET role='operator',admin_scope='operations',admin_permissions='[]'"
                );
                await migrateAdminAccess(old);
                assert.equal((await old.get("SELECT * FROM users")).admin_permissions, "[]");
                await old.close();
            }
        );
        await t.test(
            "file migration produces a restorable private snapshot and aborts if backup fails",
            async () => {
                const directory = fs.mkdtempSync(path.join(fixtureDir, "legacy-"));
                const old = await open({
                    filename: path.join(directory, "old.sqlite"),
                    driver: sqlite3.Database,
                });
                const schema =
                    "CREATE TABLE users(id INTEGER, role TEXT, admin_scope TEXT, review_permission TEXT); INSERT INTO users VALUES(7,'admin','none','admin'); INSERT INTO users VALUES(8,'admin','organization','admin')";
                await old.exec(schema);
                // FTS5 integrity validation needs a writable connection to the snapshot.
                await old.exec(
                    "CREATE VIRTUAL TABLE search_fixture USING fts5(body); INSERT INTO search_fixture VALUES ('public fixture text')"
                );
                try {
                    fs.writeFileSync(path.join(directory, "backups"), "block backup directory");
                    await assert.rejects(migrateAdminAccess(old));
                    assert.equal((await old.all("PRAGMA table_info(users)")).length, 4);
                    fs.unlinkSync(path.join(directory, "backups"));
                    await migrateAdminAccess(old);
                    const files = fs.readdirSync(path.join(directory, "backups"));
                    assert.equal(files.length, 1);
                    const source = path.join(directory, "backups", files[0]);
                    assert.equal(fs.statSync(source).mode & 0o777, 0o600);
                    const restoredPath = path.join(directory, "restored.sqlite");
                    fs.copyFileSync(source, restoredPath);
                    const restored = await open({
                        filename: restoredPath,
                        driver: sqlite3.Database,
                    });
                    try {
                        assert.equal(
                            Object.values(await restored.get("PRAGMA integrity_check"))[0],
                            "ok"
                        );
                        assert.deepEqual(
                            await restored.all("SELECT id,role,admin_scope FROM users ORDER BY id"),
                            [
                                { id: 7, role: "admin", admin_scope: "none" },
                                { id: 8, role: "admin", admin_scope: "organization" },
                            ]
                        );
                    } finally {
                        await restored.close();
                    }
                    assert.equal(
                        (await old.get("SELECT role FROM users WHERE id=8")).role,
                        "operator"
                    );
                    await migrateAdminAccess(old);
                    assert.equal(fs.readdirSync(path.join(directory, "backups")).length, 1);
                } finally {
                    await old.close();
                }
            }
        );
        await t.test(
            "platform has all capabilities; operator wildcard/unknown grants never elevate",
            async () => {
                assert.equal((await request("/admin/capabilities", 1)).body.isPlatformAdmin, true);
                assert.equal((await request("/admin/capabilities", 3)).body.isPlatformAdmin, false);
                assert.deepEqual(
                    permissions.normalizeAdminPermissions('["*","admin.users.manage"]'),
                    []
                );
                assert.equal(
                    permissions.hasAdminPermission(
                        {
                            role: "user",
                            admin_scope: "platform",
                            admin_permissions: '["admin.dashboard.read"]',
                        },
                        "admin.dashboard.read"
                    ),
                    false
                );
                assert.equal(
                    permissions.canBypassReview({ role: "operator", review_permission: "normal" }),
                    false
                );
                assert.equal(permissions.normalizeAccountType("operations"), "personal");
                assert.equal(permissions.normalizeAdminScope("operations"), "operations");
            }
        );
        await t.test(
            "every platform-guarded route rejects operators before executing its controller",
            async () => {
                let checked = 0;
                for (const layer of router.stack.filter((layer) => layer.route)) {
                    const route = layer.route;
                    if (!route.stack.some((handler) => handler.name === "isAdmin")) continue;
                    for (const method of Object.keys(route.methods)) {
                        const url = route.path.replace(/:[A-Za-z_]+/g, "1");
                        const result = await request(url, 3, {
                            method: method.toUpperCase(),
                            ...(method === "get" ? {} : { body: "{}" }),
                        });
                        assert.equal(result.status, 403, `${method} ${url}`);
                        checked++;
                    }
                }
                assert.ok(checked > 80, `checked ${checked} protected routes`);
            }
        );
        await t.test(
            "operators share content workflows while private and system data stay restricted",
            async () => {
                for (const table of ["articles", "events"]) {
                    const result = await request(`/${table}?status=pending`);
                    assert.equal(result.status, 200, JSON.stringify(result.body));
                    assert.match(JSON.stringify(result.body), /Organization A/);
                    assert.match(JSON.stringify(result.body), /Organization B/);
                }
                const stats = await request("/stats");
                assert.equal(stats.status, 200);
                assert.equal(stats.body.system, undefined);
                assert.equal(stats.body.counts.audit_logs, undefined);
                assert.doesNotMatch(
                    JSON.stringify(stats.body),
                    /password|contact_email|nodeVersion/
                );
                assert.equal((await request("/admin/pending")).status, 200);
                assert.doesNotMatch(
                    JSON.stringify((await request("/admin/access", 1)).body),
                    /password|auth_version/
                );
                assert.doesNotMatch(
                    JSON.stringify((await request("/auth/me", 1)).body),
                    /password/
                );
            }
        );
        await t.test(
            "granted modules support real operations; other modules are never implied",
            async () => {
                const profiles = await request("/admin/publishing-profiles?resource=events&id=901");
                assert.equal(profiles.status, 200);
                assert.ok(profiles.body.some((profile) => profile.id === 901));
                assert.doesNotMatch(
                    JSON.stringify(profiles.body),
                    /password|username|contact|auth_version/
                );
                assert.equal(
                    (await request("/admin/publishing-profiles?resource=users&id=1")).status,
                    403
                );
                const edited = await request("/articles/901", 3, {
                    method: "PUT",
                    body: JSON.stringify({
                        title: "Edited by operator",
                        category: "General",
                        publisher_profile_id: 901,
                        content: "Operator managed content",
                    }),
                });
                assert.equal(edited.status, 200, JSON.stringify(edited.body));
                assert.equal(
                    (await db.get("SELECT title FROM articles WHERE id=901")).title,
                    "Edited by operator"
                );
                assert.equal(
                    (await db.get("SELECT publisher_profile_id FROM articles WHERE id=901"))
                        .publisher_profile_id,
                    901
                );
                assert.equal(
                    (
                        await request("/articles/901/status", 3, {
                            method: "PUT",
                            body: '{"status":"approved"}',
                        })
                    ).status,
                    200
                );
                assert.equal((await request("/articles/902", 3, { method: "DELETE" })).status, 200);
                assert.equal(
                    (await request("/articles/902/restore", 3, { method: "POST", body: "{}" }))
                        .status,
                    200
                );
                assert.equal(
                    (
                        await request("/settings", 3, {
                            method: "POST",
                            body: '{"key":"hero_title","value":"Operator page copy"}',
                        })
                    ).status,
                    200
                );
                for (const key of [
                    "invite_code",
                    "admin_password",
                    "secret_key",
                    "registration_enabled",
                    "language",
                ]) {
                    assert.equal(
                        (
                            await request("/settings", 3, {
                                method: "POST",
                                body: JSON.stringify({ key, value: "denied" }),
                            })
                        ).status,
                        403,
                        key
                    );
                }
                assert.equal((await request("/admin/projects")).status, 200);
                assert.equal((await request("/admin/ecosystem-partners")).status, 200);
                assert.equal((await request("/admin/media-categories")).status, 200);
                assert.equal((await request("/admin/community/stats")).status, 200);
                await db.run(
                    "INSERT INTO community_posts(id,section,title,content,status,author_id) VALUES(903,'materials','Private material','fixture','pending',4)"
                );
                const postEdit = await request("/community/posts/903", 3, {
                    method: "PUT",
                    body: '{"title":"Operator material","content":"Revised operator material content","status":"approved"}',
                });
                assert.equal(postEdit.status, 200, JSON.stringify(postEdit.body));
                assert.equal(
                    (await db.get("SELECT title FROM community_posts WHERE id=903")).title,
                    "Operator material"
                );
                await db.run(
                    "INSERT INTO project_cards(id,user_id,title,status,contact_email) VALUES(904,4,'Fixture project','published','private@example.test')"
                );
                const projects = await request("/admin/projects");
                assert.doesNotMatch(JSON.stringify(projects.body), /private@example/);
                assert.equal(
                    (
                        await request("/admin/projects/904/takedown", 3, {
                            method: "PUT",
                            body: '{"reason":"fixture moderation"}',
                        })
                    ).status,
                    200
                );
                assert.equal(
                    (await db.get("SELECT status FROM project_cards WHERE id=904")).status,
                    "removed"
                );
                assert.equal(
                    (await request("/admin/projects/904/restore", 3, { method: "PUT", body: "{}" }))
                        .status,
                    200
                );

                await db.run(
                    "UPDATE users SET admin_permissions='[\"admin.events.manage\"]' WHERE id=3"
                );
                assert.equal(
                    (
                        await request("/articles/902", 3, {
                            method: "PUT",
                            body: '{"title":"not allowed"}',
                        })
                    ).status,
                    403
                );
                assert.equal(
                    (await request("/articles/902/permanent", 3, { method: "DELETE" })).status,
                    403
                );
                assert.equal((await request("/admin/projects")).status, 403);
                assert.equal((await request("/stats")).status, 403);
                const queue = await request("/admin/pending");
                assert.equal(queue.status, 200);
                assert.ok(queue.body.every((item) => item.type === "events"));
                await db.run("UPDATE users SET admin_permissions=? WHERE id=3", [
                    JSON.stringify([...permissions.ADMIN_PERMISSION_KEYS]),
                ]);
            }
        );
        await t.test("content grant covers news moderation and pinning", async () => {
            await db.run(
                "INSERT INTO news(id,title,content,status,uploader_id) VALUES(905,'Fixture news','News content','pending',4)"
            );
            assert.equal(
                (
                    await request("/news/905/review", 3, {
                        method: "PUT",
                        body: '{"status":"approved"}',
                    })
                ).status,
                200
            );
            const edited = await request("/news/905", 3, {
                method: "PUT",
                body: '{"title":"Managed news","content":"Updated news content for operations","is_pinned":true}',
            });
            assert.equal(edited.status, 200, JSON.stringify(edited.body));
            assert.equal((await db.get("SELECT is_pinned FROM news WHERE id=905")).is_pinned, 1);
        });
        await t.test(
            "non-admin cannot self-escalate using any profile or access update path",
            async () => {
                for (const id of [3, 4]) {
                    assert.equal(
                        (
                            await request("/auth/profile", id, {
                                method: "PUT",
                                body: JSON.stringify({
                                    role: "admin",
                                    admin_scope: "platform",
                                    admin_permissions: ["*"],
                                }),
                            })
                        ).status,
                        403
                    );
                    assert.equal(
                        (
                            await update(
                                id,
                                { role: "admin", permissions: [], expected_version: 0 },
                                id
                            )
                        ).status,
                        403
                    );
                }
                assert.equal(
                    (
                        await request("/admin/users/3", 1, {
                            method: "PUT",
                            body: '{"role":"admin"}',
                        })
                    ).status,
                    403
                );
            }
        );
        await t.test(
            "permission changes are audited, reject stale edits and take effect with the existing token",
            async () => {
                const result = await update(3, {
                    role: "operator",
                    permissions: ["admin.dashboard.read"],
                    expected_version: 0,
                });
                assert.equal(result.status, 200);
                assert.equal(
                    (
                        await request("/events/901/status", 3, {
                            method: "PUT",
                            body: '{"status":"rejected"}',
                        })
                    ).status,
                    403
                );
                assert.equal((await request("/stats")).status, 200);
                assert.equal(
                    (await update(3, { role: "user", permissions: [], expected_version: 0 }))
                        .status,
                    409
                );
                const audit = await db.get(
                    "SELECT * FROM audit_logs WHERE resource_type='admin_access'"
                );
                assert.equal(audit.admin_id, 1);
                assert.equal(audit.action, "access_update");
                assert.deepEqual(JSON.parse(audit.reason).after.permissions, [
                    "admin.dashboard.read",
                ]);

                assert.equal(
                    (await update(3, { role: "operator", permissions: ["*"], expected_version: 1 }))
                        .status,
                    400
                );
            }
        );
        await t.test("self access edits and direct platform deletion are blocked", async () => {
            assert.equal(
                (await update(1, { role: "user", permissions: [], expected_version: 0 })).status,
                400
            );
            assert.equal((await request("/admin/users/2", 1, { method: "DELETE" })).status, 400);
        });
        await t.test(
            "concurrent administrators cannot revoke each other and remove the last administrator",
            async () => {
                const results = await Promise.all([
                    update(2, { role: "user", permissions: [], expected_version: 0 }, 1),
                    update(1, { role: "user", permissions: [], expected_version: 0 }, 2),
                ]);
                assert.deepEqual(results.map((result) => result.status).sort(), [200, 403]);
                assert.equal(
                    (await db.get("SELECT COUNT(*) AS count FROM users WHERE role='admin'")).count,
                    1
                );
                await db.run(
                    "UPDATE users SET role='admin',admin_scope='platform' WHERE id IN (1,2)"
                );
            }
        );
        await t.test(
            "force logout invalidates old sessions and fresh password login succeeds",
            async () => {
                assert.equal(
                    (await update(3, { force_logout: true, expected_version: 1 })).status,
                    200
                );
                assert.equal((await request("/admin/capabilities", 3)).status, 401);
                const login = await request("/auth/login", null, {
                    method: "POST",
                    body: JSON.stringify({ username: "fixture_3", password: "fixture-password" }),
                });
                assert.equal(login.status, 200);
                assert.equal(
                    (
                        await request("/admin/capabilities", null, {
                            headers: { Authorization: `Bearer ${login.body.token}` },
                        })
                    ).status,
                    200
                );
            }
        );
        await t.test(
            "revoking admin role removes console access; banned and missing users cannot use stale tokens",
            async () => {
                assert.equal(
                    (await update(3, { role: "user", permissions: [], expected_version: 2 }))
                        .status,
                    200
                );
                assert.equal((await request("/admin/capabilities", 3, { version: 1 })).status, 403);
                assert.equal((await request("/admin/capabilities", 4)).status, 403);
                assert.equal((await request("/admin/capabilities", 5)).status, 401);
                assert.equal((await request("/admin/capabilities", 999999)).status, 401);
                assert.equal((await request("/admin/capabilities", null)).status, 401);
            }
        );
        await t.test(
            "failed audit writes roll back changes; database failures fail closed",
            async () => {
                await db.exec("ALTER TABLE audit_logs RENAME TO audit_unavailable");
                assert.equal(
                    (
                        await update(4, {
                            role: "operator",
                            permissions: ["admin.dashboard.read"],
                            expected_version: 0,
                        })
                    ).status,
                    500
                );
                assert.equal((await db.get("SELECT role FROM users WHERE id=4")).role, "user");
                await db.exec("ALTER TABLE users RENAME TO users_unavailable");
                assert.equal((await request("/admin/capabilities", 1)).status, 503);
                assert.equal((await request("/events?status=pending", 1)).status, 503);
            }
        );
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await pool.close();
        fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
});
