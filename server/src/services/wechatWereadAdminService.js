const { readVision, publicVision } = require("./wechatArticleVisionService");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const axios = require("axios");
const { isTrustedArticleLink } = require("./wechatReadRssService");
const { cleanWeChatUrl } = require("../utils/wechatUrl");

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

const newestFirst = (a, b) => (Date.parse(b.observed_at) || 0) - (Date.parse(a.observed_at) || 0);
async function articleStates(db, feed, source) {
    const captured = [
        ...new Map(
            (feed.articles || [])
                .filter((a) => isTrustedArticleLink(a.link))
                .map((a) => [a.link, a])
        ).values(),
    ];
    const records = new Map();
    for (let offset = 0; offset < captured.length; offset += 400) {
        // Ingest stores cleaned links; search-discovered links keep chksm for the public page.
        const links = captured.slice(offset, offset + 400).map((a) => cleanWeChatUrl(a.link));
        const rows = await db.all(
            `SELECT a.id, a.link, a.content_status, a.extraction_status,
            a.activity_status, a.activity_reason, a.event_id, e.status AS review_status,
            e.deleted_at AS event_deleted_at
            FROM wechat_mp_ingest_articles a LEFT JOIN events e ON e.id = a.event_id
            WHERE a.link IN (${links.map(() => "?").join(",")})`,
            links
        );
        for (const row of rows) records.set(row.link, row);
    }
    return (
        await Promise.all(
            captured.map(async (a) => {
                const row = records.get(cleanWeChatUrl(a.link));
                return {
                    id: a.id,
                    link: a.link,
                    title: a.title || "",
                    source_id: source.mp_id,
                    source_name: feed.name || source.name,
                    observed_at: a.observed_at || null,
                    published_at: a.published_at || null,
                    body_status: a.content_status === "ready" ? "ready" : "pending",
                    body_error: a.body_error || "",
                    weread_error: a.weread_error || "",
                    public_error: a.public_error || "",
                    body_failures: a.body_failures || 0,
                    body_last_attempt_at: a.body_last_attempt_at || null,
                    body_next_retry: a.body_next_retry
                        ? new Date(a.body_next_retry * 1000).toISOString()
                        : null,
                    body_source: a.body_source || "weread",
                    vision: row?.id ? publicVision(await readVision(row.id)) : null,
                    imported: Boolean(row),
                    content_status: row?.content_status || "not_imported",
                    extraction_status: row?.extraction_status || "not_started",
                    activity_status: row?.activity_status || "not_screened",
                    activity_reason: row?.activity_reason || "",
                    event_id: row?.event_id || null,
                    review_status: row?.event_deleted_at ? "deleted" : row?.review_status || "",
                };
            })
        )
    ).sort(newestFirst);
}
async function getSourceArticles(db, id, page = 1, { root = cacheRoot() } = {}) {
    const manifest = await readJson(manifestPath(root), []);
    const source = manifest.find((a) => a.mp_id === id);
    if (!validId(id) || !source) throw fail("WEREAD_SOURCE_NOT_FOUND", 404);
    page = Number(page);
    if (!Number.isInteger(page) || page < 1) throw fail("WEREAD_INVALID_PAGE");
    const feed = await readJson(path.join(root, `${id}.json`), { articles: [] });
    const articles = await articleStates(db, feed, source);
    return {
        id,
        name: feed.name || source.name,
        total: articles.length,
        page,
        page_size: 20,
        articles: articles.slice((page - 1) * 20, page * 20),
    };
}

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
    const allArticles = [];
    const sources = await Promise.all(
        manifest
            .filter((a) => validId(a.mp_id))
            .map(async (a) => {
                const feed = await readJson(path.join(root, `${a.mp_id}.json`), { articles: [] });
                const progress = state.accounts?.[a.mp_id] || {};
                const row = rows.find((r) => r.rss_feed_id === a.mp_id);
                const pending = (feed.articles || []).filter((x) => x.content_status !== "ready");
                const articles = await articleStates(db, feed, a);
                allArticles.push(...articles);
                const latest = articles[0];
                return {
                    id: a.mp_id,
                    name: feed.name || a.name,
                    import_enabled: Boolean(row?.enabled),
                    paused: Boolean(control.feeds?.[a.mp_id]?.paused),
                    checked_at: progress.last_success_at || null,
                    next_check: progress.next_check || null,
                    error: progress.error || "",
                    total: articles.length,
                    captured_at: latest?.observed_at || null,
                    captured_24h: articles.filter(
                        (x) => Date.parse(x.observed_at) >= Date.now() - 86400000
                    ).length,
                    imported: articles.filter((x) => x.imported).length,
                    extracted: articles.filter((x) => x.extraction_status === "completed").length,
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
        vision_enabled: process.env.WEREAD_VISION_ENABLED === "true",
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
        sources: sources.sort(
            (a, b) => (Date.parse(b.captured_at) || 0) - (Date.parse(a.captured_at) || 0)
        ),
        captured_total: allArticles.length,
        captured_24h: allArticles.filter((x) => Date.parse(x.observed_at) >= Date.now() - 86400000)
            .length,
        captured_sources_24h: new Set(
            allArticles
                .filter((x) => Date.parse(x.observed_at) >= Date.now() - 86400000)
                .map((x) => x.source_id)
        ).size,
        recent_articles: allArticles.sort(newestFirst).slice(0, 30),
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
module.exports = { getOverview, getSourceArticles, updateControl, startLogin, loginStatus };
