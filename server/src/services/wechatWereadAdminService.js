const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const axios = require("axios");

const cacheRoot = () => process.env.WEREAD_CACHE_DIR || "/opt/we-mp-rss-trial/data/weread-live";
const manifestPath = (root) =>
    process.env.WEREAD_MANIFEST || path.join(root, "..", "weread-accounts.json");
const fail = (code, status = 400) => Object.assign(new Error(code), { code, status });
const readJson = async (file, fallback) => {
    try {
        return JSON.parse(await fs.readFile(file, "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") return fallback;
        throw error;
    }
};
const readControl = (root) =>
    readJson(path.join(root, "control.json"), { paused: false, poll_seconds: 900, feeds: {} });
const validId = (id) => /^MP_WXS_\d+$/.test(String(id || ""));
let writing = Promise.resolve();

async function getOverview(db, { root = cacheRoot() } = {}) {
    const [manifest, state, control, rows, lastRun] = await Promise.all([
        readJson(manifestPath(root), []),
        readJson(path.join(root, "status.json"), {}),
        readControl(root),
        db.all(
            "SELECT id, name, rss_feed_id, enabled FROM wechat_mp_ingest_accounts WHERE source_type = 'weread_mp'"
        ),
        db.get(
            "SELECT id, status, started_at, finished_at, total_accounts, new_articles, fetched_contents, failed_count FROM wechat_mp_ingest_runs ORDER BY id DESC LIMIT 1"
        ),
    ]);
    const sources = await Promise.all(
        manifest
            .filter((a) => validId(a.mp_id))
            .map(async (a) => {
                const feed = await readJson(path.join(root, `${a.mp_id}.json`), { articles: [] });
                const progress = state.accounts?.[a.mp_id] || {};
                const row = rows.find((r) => r.rss_feed_id === a.mp_id);
                const pending = (feed.articles || []).filter((x) => x.content_status !== "ready");
                const latest = feed.articles?.at(-1);
                return {
                    id: a.mp_id,
                    name: feed.name || a.name,
                    import_enabled: Boolean(row?.enabled),
                    paused: Boolean(control.feeds?.[a.mp_id]?.paused),
                    checked_at: progress.last_success_at || null,
                    next_check: progress.next_check || null,
                    error: progress.error || "",
                    total: feed.articles?.length || 0,
                    pending: pending.length,
                    latest_title: latest?.title || "",
                    pending_articles: pending.slice(0, 20).map((x) => ({
                        title: x.title,
                        error: x.body_error || "",
                        next_retry: x.body_next_retry || null,
                    })),
                    retry_pending: Boolean(
                        control.feeds?.[a.mp_id]?.retry_token &&
                        control.feeds[a.mp_id].retry_token !== state.retry_tokens?.[a.mp_id]
                    ),
                };
            })
    );
    const heartbeat = Date.parse(state.heartbeat_at || "");
    return {
        configured: manifest.length > 0,
        online: Number.isFinite(heartbeat) && Date.now() - heartbeat < 120000,
        heartbeat_at: state.heartbeat_at || null,
        auth_required: Boolean(state.auth_required),
        last_success_at:
            sources
                .map((x) => x.checked_at)
                .filter(Boolean)
                .sort()
                .at(-1) || null,
        pause_until: state.global_pause_until || 0,
        error: state.error || "",
        paused: Boolean(control.paused),
        poll_seconds: control.poll_seconds || 900,
        control_pending: Boolean(control.revision && state.control_revision !== control.revision),
        worker_version: state.worker_version || 1,
        login_available: Boolean(
            process.env.WEREAD_ADMIN_USERNAME && process.env.WEREAD_ADMIN_PASSWORD
        ),
        import_minutes: Number(process.env.WEREAD_INGEST_INTERVAL_MINUTES) || 0,
        sources,
        last_run: lastRun || null,
    };
}

function updateControl(patch, { root = cacheRoot() } = {}) {
    const operation = writing.then(async () => {
        const state = await readJson(path.join(root, "status.json"), {});
        if (state.worker_version !== 2) throw fail("WEREAD_WORKER_UPGRADE_REQUIRED", 409);
        const control = await readControl(root);
        if (Object.hasOwn(patch, "paused")) {
            if (typeof patch.paused !== "boolean") throw fail("WEREAD_INVALID_CONTROL");
            control.paused = patch.paused;
        }
        if (Object.hasOwn(patch, "poll_seconds")) {
            if (
                !Number.isInteger(patch.poll_seconds) ||
                patch.poll_seconds < 900 ||
                patch.poll_seconds > 21600
            )
                throw fail("WEREAD_INVALID_INTERVAL");
            control.poll_seconds = patch.poll_seconds;
        }
        if (patch.feed_id !== undefined) {
            const manifest = await readJson(manifestPath(root), []);
            if (!validId(patch.feed_id) || !manifest.some((a) => a.mp_id === patch.feed_id))
                throw fail("WEREAD_SOURCE_NOT_FOUND", 404);
            control.feeds ||= {};
            const feed = { ...control.feeds[patch.feed_id] };
            if (Object.hasOwn(patch, "feed_paused")) {
                if (typeof patch.feed_paused !== "boolean") throw fail("WEREAD_INVALID_CONTROL");
                feed.paused = patch.feed_paused;
            }
            if (patch.retry === true) feed.retry_token = randomUUID();
            control.feeds[patch.feed_id] = feed;
        }
        control.revision = randomUUID();
        const file = path.join(root, "control.json");
        const temp = `${file}.${randomUUID()}.tmp`;
        try {
            await fs.writeFile(temp, JSON.stringify(control), { mode: 0o600 });
            await fs.rename(temp, file);
        } finally {
            await fs.rm(temp, { force: true }).catch(() => {});
        }
        return { queued: true, revision: control.revision };
    });
    writing = operation.catch(() => {});
    return operation;
}

// Fixed endpoints only. Credentials and upstream login payloads never leave this service.
async function authClient() {
    if (!process.env.WEREAD_ADMIN_USERNAME || !process.env.WEREAD_ADMIN_PASSWORD)
        throw fail("WEREAD_LOGIN_UNCONFIGURED", 503);
    const client = axios.create({
        baseURL: process.env.WEREAD_ADMIN_BASE_URL || "http://127.0.0.1:18001",
        timeout: 30000,
        maxRedirects: 0,
        maxContentLength: 2 * 1024 * 1024,
    });
    const response = await client.post(
        "/api/v1/wx/auth/token",
        new URLSearchParams({
            username: process.env.WEREAD_ADMIN_USERNAME,
            password: process.env.WEREAD_ADMIN_PASSWORD,
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    if (!response.data?.access_token) throw fail("WEREAD_LOGIN_UNAVAILABLE", 502);
    client.defaults.headers.common.Authorization = `Bearer ${response.data.access_token}`;
    return client;
}
async function startLogin() {
    const client = await authClient();
    const response = await client.get("/api/v1/wx/weread/qr/code");
    if (response.data?.code !== 0 || response.data?.data?.code !== "/static/weread_qrcode.png")
        throw fail("WEREAD_LOGIN_UNAVAILABLE", 502);
    const image = await client.get("/static/weread_qrcode.png", { responseType: "arraybuffer" });
    if (
        !Buffer.from(image.data)
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
        throw fail("WEREAD_LOGIN_UNAVAILABLE", 502);
    return { image: `data:image/png;base64,${Buffer.from(image.data).toString("base64")}` };
}
async function loginStatus() {
    const client = await authClient();
    const response = await client.get("/api/v1/wx/weread/qr/status");
    if (response.data?.code !== 0) throw fail("WEREAD_LOGIN_UNAVAILABLE", 502);
    return { logged_in: response.data?.data?.login_status === true };
}
module.exports = { getOverview, updateControl, startLogin, loginStatus };
