const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const axios = require("axios");
const service = require("../src/services/wechatWereadAdminService");

async function fixture(work) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "weread-admin-"));
    const root = path.join(dir, "weread-live");
    await fs.mkdir(root);
    await fs.writeFile(
        path.join(dir, "weread-accounts.json"),
        JSON.stringify([{ mp_id: "MP_WXS_123", name: "测试来源" }])
    );
    await fs.writeFile(
        path.join(root, "status.json"),
        JSON.stringify({
            worker_version: 2,
            heartbeat_at: new Date().toISOString(),
            auth_digest: "PRIVATE",
            cookie: "PRIVATE",
            accounts: {},
        })
    );
    try {
        await work(root);
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
}
test("maintenance overview joins collector state and import configuration without credentials", async () =>
    fixture(async (root) => {
        await fs.writeFile(
            path.join(root, "MP_WXS_123.json"),
            JSON.stringify({
                articles: [
                    {
                        title: "待补文章",
                        content_status: "pending",
                        body_error: "article_body_missing",
                    },
                ],
            })
        );
        const data = await service.getOverview(
            { all: async () => [{ rss_feed_id: "MP_WXS_123", enabled: 1 }], get: async () => null },
            { root }
        );
        assert.equal(data.online, true);
        assert.equal(data.sources[0].pending, 1);
        assert.equal(data.sources[0].import_enabled, true);
        assert.doesNotMatch(JSON.stringify(data), /PRIVATE|cookie|auth_digest/);
    }));
test("concurrent maintenance patches preserve settings; invalid inputs cannot change control state", async () =>
    fixture(async (root) => {
        await Promise.all([
            service.updateControl({ paused: true }, { root }),
            service.updateControl({ poll_seconds: 1800 }, { root }),
        ]);
        await service.updateControl(
            { feed_id: "MP_WXS_123", retry: true, feed_paused: true },
            { root }
        );
        const saved = await fs.readFile(path.join(root, "control.json"), "utf8");
        const control = JSON.parse(saved);
        assert.equal(control.paused, true);
        assert.equal(control.poll_seconds, 1800);
        assert.equal(control.feeds.MP_WXS_123.paused, true);
        assert.ok(control.feeds.MP_WXS_123.retry_token);
        await assert.rejects(service.updateControl({ poll_seconds: 30 }, { root }), {
            code: "WEREAD_INVALID_INTERVAL",
        });
        await assert.rejects(
            service.updateControl({ feed_id: "../status", retry: true }, { root }),
            { code: "WEREAD_SOURCE_NOT_FOUND" }
        );
        assert.equal(await fs.readFile(path.join(root, "control.json"), "utf8"), saved);
    }));
test("old collectors cannot silently accept unsupported maintenance commands", async () =>
    fixture(async (root) => {
        await fs.writeFile(path.join(root, "status.json"), "{}");
        await assert.rejects(service.updateControl({ paused: true }, { root }), {
            code: "WEREAD_WORKER_UPGRADE_REQUIRED",
        });
    }));
test("QR status redacts upstream credentials; QR retrieval only uses the fixed local image", async (t) => {
    const before = {
        username: process.env.WEREAD_ADMIN_USERNAME,
        password: process.env.WEREAD_ADMIN_PASSWORD,
    };
    process.env.WEREAD_ADMIN_USERNAME = "fixture";
    process.env.WEREAD_ADMIN_PASSWORD = "fixture";
    const requests = [];
    const client = {
        defaults: { headers: { common: {} } },
        post: async () => ({ data: { access_token: "PRIVATE" } }),
        get: async (url) => {
            requests.push(url);
            if (url.endsWith("/status"))
                return {
                    data: {
                        code: 0,
                        data: {
                            login_status: true,
                            data: { cookies: "PRIVATE", accessToken: "PRIVATE" },
                        },
                    },
                };
            if (url.endsWith("/code"))
                return { data: { code: 0, data: { code: "/static/weread_qrcode.png" } } };
            return { data: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) };
        },
    };
    t.mock.method(axios, "create", () => client);
    try {
        assert.deepEqual(await service.loginStatus(), { logged_in: true });
        assert.match((await service.startLogin()).image, /^data:image\/png;base64,/);
        assert.ok(requests.includes("/static/weread_qrcode.png"));
    } finally {
        for (const [key, value] of [
            ["WEREAD_ADMIN_USERNAME", before.username],
            ["WEREAD_ADMIN_PASSWORD", before.password],
        ]) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
});
