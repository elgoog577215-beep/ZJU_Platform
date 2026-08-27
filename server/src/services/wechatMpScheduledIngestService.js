const fs = require("fs");

const wechatMpAdminService = require("./wechatMpAdminService");
const wechatReadRssService = require("./wechatReadRssService");
const { recordWechatParseRun } = require("./wechatParseAuditService");
const { triggerEventGovernance } = require("./eventGovernanceTriggerService");
const { screenActivityCandidate } = require("../utils/wechatActivityScreening");
const { cleanWeChatUrl } = require("../utils/wechatUrl");
const { normalizeEventCategory, normalizeEventDateTime } = require("./eventIntelligenceService");

const DEFAULT_SETTINGS = Object.freeze({
    enabled: false,
    token_health_enabled: true,
    token_health_interval_hours: 12,
    daily_run_time: "03:30",
    timezone: "Asia/Shanghai",
    query_delay_range: [95, 125],
    page_pause_range: [10, 25],
    page_pause_seconds: 10,
    content_delay_range: [10, 20],
    count_per_page: 20,
    max_pages: 1,
    fetch_content: true,
    auto_parse: true,
});
const INGEST_STALE_AFTER_MINUTES = 30;
const STALE_RUN_ERROR = "采集任务因服务重启或长时间无响应而中止";
const INGEST_SOURCE_TYPES = new Set(["wechat_mp", wechatReadRssService.SOURCE_TYPE]);
let activeRun = null;
let activeRunId = null;
let schedulerTimer = null;
let schedulerLastKey = "";
let tokenHealthSchedulerTimer = null;
let tokenHealthLastCheckedAt = 0;
let tokenHealthRun = null;

const nowIso = () => new Date().toISOString();

const parseJson = (value, fallback) => {
    if (value == null || value === "") return fallback;
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const toBool = (value, fallback = false) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const text = String(value).trim().toLowerCase();
    if (["1", "true", "yes", "y", "on", "启用", "是"].includes(text)) return true;
    if (["0", "false", "no", "n", "off", "停用", "否"].includes(text)) return false;
    return fallback;
};

const toInt = (value, fallback, min, max) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
};

const toNumber = (value, fallback, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
};

const normalizeTime = (value, fallback = DEFAULT_SETTINGS.daily_run_time) => {
    const text = String(value || "").trim();
    const match = text.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!match) return fallback;
    return `${match[1].padStart(2, "0")}:${match[2]}`;
};

const normalizeTimezone = (value) => {
    const timezone = String(value || DEFAULT_SETTINGS.timezone).trim() || DEFAULT_SETTINGS.timezone;
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
        return timezone;
    } catch {
        return DEFAULT_SETTINGS.timezone;
    }
};

const normalizeDelayRange = (value, fallback) => {
    const normalized = wechatMpAdminService.normalizeDelayRangeSeconds(value, fallback);
    return normalized.length ? normalized : [];
};

const normalizeSettings = (row = {}) => {
    const pagePauseRange = normalizeDelayRange(
        parseJson(
            row.page_pause_range ?? row.page_pause_seconds,
            row.page_pause_range ?? row.page_pause_seconds
        ),
        DEFAULT_SETTINGS.page_pause_range
    );
    return {
        enabled: toBool(row.enabled, DEFAULT_SETTINGS.enabled),
        token_health_enabled: toBool(
            row.token_health_enabled,
            DEFAULT_SETTINGS.token_health_enabled
        ),
        token_health_interval_hours: toInt(
            row.token_health_interval_hours,
            DEFAULT_SETTINGS.token_health_interval_hours,
            1,
            168
        ),
        daily_run_time: normalizeTime(row.daily_run_time, DEFAULT_SETTINGS.daily_run_time),
        timezone: normalizeTimezone(row.timezone),
        query_delay_range: normalizeDelayRange(
            parseJson(row.query_delay_range, row.query_delay_range),
            DEFAULT_SETTINGS.query_delay_range
        ),
        page_pause_range: pagePauseRange,
        page_pause_seconds: pagePauseRange[0] || DEFAULT_SETTINGS.page_pause_seconds,
        content_delay_range: normalizeDelayRange(
            parseJson(row.content_delay_range, row.content_delay_range),
            DEFAULT_SETTINGS.content_delay_range
        ),
        count_per_page: toInt(row.count_per_page, DEFAULT_SETTINGS.count_per_page, 1, 100),
        max_pages: toInt(row.max_pages, DEFAULT_SETTINGS.max_pages, 1, 5),
        fetch_content: toBool(row.fetch_content, DEFAULT_SETTINGS.fetch_content),
        auto_parse: toBool(row.auto_parse, DEFAULT_SETTINGS.auto_parse),
        updated_at: row.updated_at || null,
    };
};

const stringifyArray = (value) => JSON.stringify(Array.isArray(value) ? value : []);

const isLocalUploadUrl = (value) =>
    String(value || "")
        .trim()
        .startsWith("/uploads/");

const resolveIngestCover = ({ article = {}, content = {}, existingCover = "" } = {}) => {
    const normalizedContent = content || {};
    const candidates = [
        normalizedContent.coverImage,
        normalizedContent.cover,
        ...(Array.isArray(normalizedContent.images) ? normalizedContent.images : []),
        article.cover,
        article.coverImage,
        existingCover,
    ]
        .map((value) => String(value || "").trim())
        .filter(Boolean);

    return candidates.find(isLocalUploadUrl) || candidates[0] || "";
};

const localizeIngestCover = async (cover, localizeImages) => {
    const normalizedCover = String(cover || "").trim();
    if (!normalizedCover || isLocalUploadUrl(normalizedCover)) return normalizedCover;
    const localize = localizeImages || wechatMpAdminService.localizeWechatArticleImages;
    if (typeof localize !== "function") return normalizedCover;
    try {
        const localized = await localize({
            coverImage: normalizedCover,
            contentText: "",
            contentHtml: "",
            images: [],
        });
        return String(localized?.coverImage || "").trim() || normalizedCover;
    } catch (error) {
        console.warn(
            `[WeChat MP Ingest] cover localization failed: ${error?.message || String(error)}`
        );
        return normalizedCover;
    }
};

const syncEventCover = async (db, eventId, cover) => {
    if (!eventId || !isLocalUploadUrl(cover)) return;

    await db.run(
        `
    UPDATE events
    SET image = ?
    WHERE id = ?
      AND (image IS NULL OR image = '' OR image NOT LIKE '/uploads/%')
  `,
        [cover, eventId]
    );
};

const calculateIngestProgressPercent = ({
    stage = "starting",
    totalAccounts = 0,
    processedAccounts = 0,
    totalArticles = 0,
    processedArticles = 0,
} = {}) => {
    if (stage === "completed") return 100;
    if (stage === "finalizing") return 98;
    if (stage === "starting") return 1;

    const accountsTotal = Math.max(Number(totalAccounts) || 0, 0);
    const accountsDone = Math.min(Math.max(Number(processedAccounts) || 0, 0), accountsTotal);
    if (stage === "fetching_accounts") {
        return accountsTotal
            ? Math.min(20, 5 + Math.round((accountsDone / accountsTotal) * 15))
            : 5;
    }

    const articlesTotal = Math.max(Number(totalArticles) || 0, 0);
    const articlesDone = Math.min(Math.max(Number(processedArticles) || 0, 0), articlesTotal);
    const articleProgress = articlesTotal ? articlesDone / articlesTotal : 0;
    return Math.min(95, 20 + Math.round(articleProgress * 75));
};

const updateRunProgress = async (
    db,
    runId,
    {
        stage = "starting",
        totalAccounts = 0,
        processedAccounts = 0,
        totalArticles = 0,
        processedArticles = 0,
        currentAccount = "",
        currentArticle = "",
    } = {}
) => {
    if (!runId) return;
    const progressPercent = calculateIngestProgressPercent({
        stage,
        totalAccounts,
        processedAccounts,
        totalArticles,
        processedArticles,
    });
    await db.run(
        `
    UPDATE wechat_mp_ingest_runs
    SET total_accounts = ?,
        processed_accounts = ?,
        total_articles = ?,
        processed_articles = ?,
        progress_stage = ?,
        progress_percent = MAX(COALESCE(progress_percent, 0), ?),
        current_account = ?,
        current_article = ?,
        last_heartbeat_at = datetime('now')
    WHERE id = ? AND status = 'running'
  `,
        [
            Math.max(Number(totalAccounts) || 0, 0),
            Math.max(Number(processedAccounts) || 0, 0),
            Math.max(Number(totalArticles) || 0, 0),
            Math.max(Number(processedArticles) || 0, 0),
            String(stage || "starting"),
            progressPercent,
            String(currentAccount || "").trim(),
            String(currentArticle || "").trim(),
            runId,
        ]
    );
};

const recoverStaleIngestRuns = async (db) => {
    const activeRunClause = activeRunId ? "AND id != ?" : "";
    const params = [STALE_RUN_ERROR];
    if (activeRunId) params.push(activeRunId);
    await db.run(
        `
    UPDATE wechat_mp_ingest_runs
    SET status = 'failed',
        finished_at = COALESCE(finished_at, datetime('now')),
        progress_stage = 'failed',
        error = CASE WHEN error IS NULL OR error = '' THEN ? ELSE error END
    WHERE status = 'running'
      AND (
        last_heartbeat_at IS NULL
        OR last_heartbeat_at < datetime('now', '-${INGEST_STALE_AFTER_MINUTES} minutes')
      )
      ${activeRunClause}
  `,
        params
    );
};

const ensureWechatMpScheduledIngestSchema = async (db) => {
    await db.exec(`
    CREATE TABLE IF NOT EXISTS wechat_mp_ingest_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER DEFAULT 0,
      token_health_enabled INTEGER DEFAULT 1,
      token_health_interval_hours INTEGER DEFAULT 12,
      daily_run_time TEXT DEFAULT '03:30',
      timezone TEXT DEFAULT 'Asia/Shanghai',
      query_delay_range TEXT DEFAULT '[95,125]',
      page_pause_range TEXT DEFAULT '[10,25]',
      page_pause_seconds REAL DEFAULT 10,
      content_delay_range TEXT DEFAULT '[10,20]',
      count_per_page INTEGER DEFAULT 20,
      max_pages INTEGER DEFAULT 1,
      fetch_content INTEGER DEFAULT 1,
      auto_parse INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wechat_mp_ingest_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      alias TEXT DEFAULT '',
      fakeid TEXT DEFAULT '',
      source_type TEXT DEFAULT 'wechat_mp',
      rss_feed_id TEXT DEFAULT '',
      keywords TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      fetch_content INTEGER DEFAULT 1,
      count_per_page INTEGER DEFAULT 20,
      max_pages INTEGER DEFAULT 1,
      last_checked_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_mp_ingest_accounts_name
      ON wechat_mp_ingest_accounts(name);
    CREATE INDEX IF NOT EXISTS idx_wechat_mp_ingest_accounts_enabled
      ON wechat_mp_ingest_accounts(enabled);
    CREATE INDEX IF NOT EXISTS idx_wechat_mp_ingest_accounts_fakeid
      ON wechat_mp_ingest_accounts(fakeid);

    CREATE TABLE IF NOT EXISTS wechat_mp_ingest_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER,
      fakeid TEXT DEFAULT '',
      title TEXT DEFAULT '',
      link TEXT NOT NULL UNIQUE,
      summary TEXT DEFAULT '',
      author TEXT DEFAULT '',
      cover TEXT DEFAULT '',
      create_time TEXT DEFAULT '',
      time_text TEXT DEFAULT '',
      content_text TEXT DEFAULT '',
      content_html TEXT DEFAULT '',
      images_json TEXT DEFAULT '[]',
      content_status TEXT DEFAULT 'not_fetched',
      extraction_status TEXT DEFAULT 'not_started',
      extracted_event_json TEXT DEFAULT '',
      extraction_error TEXT DEFAULT '',
      extracted_at DATETIME,
      activity_status TEXT DEFAULT 'not_screened',
      activity_reason TEXT DEFAULT '',
      event_id INTEGER,
      first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      fetched_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_wechat_mp_ingest_articles_account
      ON wechat_mp_ingest_articles(account_id);
    CREATE INDEX IF NOT EXISTS idx_wechat_mp_ingest_articles_first_seen
      ON wechat_mp_ingest_articles(first_seen_at DESC);

    CREATE TABLE IF NOT EXISTS wechat_mp_ingest_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress_stage TEXT DEFAULT 'starting',
      progress_percent INTEGER DEFAULT 0,
      processed_accounts INTEGER DEFAULT 0,
      processed_articles INTEGER DEFAULT 0,
      current_account TEXT DEFAULT '',
      current_article TEXT DEFAULT '',
      last_heartbeat_at DATETIME,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      total_accounts INTEGER DEFAULT 0,
      total_articles INTEGER DEFAULT 0,
      new_articles INTEGER DEFAULT 0,
      fetched_contents INTEGER DEFAULT 0,
      extracted_articles INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      extraction_failed_count INTEGER DEFAULT 0,
      error TEXT DEFAULT '',
      options_json TEXT DEFAULT '{}',
      created_by INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_wechat_mp_ingest_runs_started
      ON wechat_mp_ingest_runs(started_at DESC);
  `);
    const columns = await db.all("PRAGMA table_info(wechat_mp_ingest_settings)");
    const hasTokenHealthEnabled = columns.some((column) => column.name === "token_health_enabled");
    const hasTokenHealthInterval = columns.some(
        (column) => column.name === "token_health_interval_hours"
    );
    const hasPagePauseRange = columns.some((column) => column.name === "page_pause_range");
    const hasAutoParse = columns.some((column) => column.name === "auto_parse");
    if (!hasAutoParse) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_settings ADD COLUMN auto_parse INTEGER DEFAULT 1"
        );
    }
    if (!hasTokenHealthEnabled) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_settings ADD COLUMN token_health_enabled INTEGER DEFAULT 1"
        );
    }
    if (!hasTokenHealthInterval) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_settings ADD COLUMN token_health_interval_hours INTEGER DEFAULT 12"
        );
    }
    if (!hasPagePauseRange) {
        await db.exec(
            `ALTER TABLE wechat_mp_ingest_settings ADD COLUMN page_pause_range TEXT DEFAULT '[10,25]'`
        );
        await db.run(`
      UPDATE wechat_mp_ingest_settings
      SET page_pause_range = CASE
            WHEN page_pause_seconds IS NOT NULL
             AND page_pause_seconds > 0
             AND page_pause_seconds != 3
            THEN '[' || page_pause_seconds || ',' || page_pause_seconds || ']'
            ELSE '[10,25]'
          END,
          page_pause_seconds = CASE
            WHEN page_pause_seconds IS NOT NULL
             AND page_pause_seconds > 0
             AND page_pause_seconds != 3
            THEN page_pause_seconds
            ELSE 10
          END
    `);
    }
    const accountColumns = await db.all("PRAGMA table_info(wechat_mp_ingest_accounts)");
    const accountColumnNames = new Set(accountColumns.map((column) => column.name));
    if (!accountColumnNames.has("source_type")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_accounts ADD COLUMN source_type TEXT DEFAULT 'wechat_mp'"
        );
    }
    if (!accountColumnNames.has("rss_feed_id")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_accounts ADD COLUMN rss_feed_id TEXT DEFAULT ''"
        );
    }
    await db.exec(
        "CREATE INDEX IF NOT EXISTS idx_wechat_mp_ingest_accounts_source_type ON wechat_mp_ingest_accounts(source_type)"
    );
    await db.run(
        "UPDATE wechat_mp_ingest_accounts SET source_type = 'wechat_mp' WHERE source_type IS NULL OR source_type = ''"
    );
    await db.run(`
    UPDATE wechat_mp_ingest_settings
    SET query_delay_range = '[95,125]'
    WHERE query_delay_range IS NULL
       OR query_delay_range = ''
       OR replace(query_delay_range, ' ', '') = '[55,120]'
  `);
    await db.run(`
    UPDATE wechat_mp_ingest_settings
    SET page_pause_range = '[10,25]',
        page_pause_seconds = 10
    WHERE page_pause_range IS NULL
       OR page_pause_range = ''
       OR replace(page_pause_range, ' ', '') IN ('[3,3]', '[3]', '3')
  `);
    const articleColumns = await db.all("PRAGMA table_info(wechat_mp_ingest_articles)");
    const articleColumnNames = new Set(articleColumns.map((column) => column.name));
    if (!articleColumnNames.has("extraction_status")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_articles ADD COLUMN extraction_status TEXT DEFAULT 'not_started'"
        );
    }
    if (!articleColumnNames.has("extracted_event_json")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_articles ADD COLUMN extracted_event_json TEXT DEFAULT ''"
        );
    }
    if (!articleColumnNames.has("extraction_error")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_articles ADD COLUMN extraction_error TEXT DEFAULT ''"
        );
    }
    if (!articleColumnNames.has("extracted_at")) {
        await db.exec("ALTER TABLE wechat_mp_ingest_articles ADD COLUMN extracted_at DATETIME");
    }
    if (!articleColumnNames.has("activity_status")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_articles ADD COLUMN activity_status TEXT DEFAULT 'not_screened'"
        );
    }
    if (!articleColumnNames.has("activity_reason")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_articles ADD COLUMN activity_reason TEXT DEFAULT ''"
        );
    }
    if (!articleColumnNames.has("event_id")) {
        await db.exec("ALTER TABLE wechat_mp_ingest_articles ADD COLUMN event_id INTEGER");
    }
    const runColumns = await db.all("PRAGMA table_info(wechat_mp_ingest_runs)");
    const runColumnNames = new Set(runColumns.map((column) => column.name));
    if (!runColumnNames.has("extracted_articles")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_runs ADD COLUMN extracted_articles INTEGER DEFAULT 0"
        );
    }
    if (!runColumnNames.has("extraction_failed_count")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_runs ADD COLUMN extraction_failed_count INTEGER DEFAULT 0"
        );
    }
    if (!runColumnNames.has("progress_stage")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_runs ADD COLUMN progress_stage TEXT DEFAULT 'starting'"
        );
    }
    if (!runColumnNames.has("progress_percent")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_runs ADD COLUMN progress_percent INTEGER DEFAULT 0"
        );
    }
    if (!runColumnNames.has("processed_accounts")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_runs ADD COLUMN processed_accounts INTEGER DEFAULT 0"
        );
    }
    if (!runColumnNames.has("processed_articles")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_runs ADD COLUMN processed_articles INTEGER DEFAULT 0"
        );
    }
    if (!runColumnNames.has("current_account")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_runs ADD COLUMN current_account TEXT DEFAULT ''"
        );
    }
    if (!runColumnNames.has("current_article")) {
        await db.exec(
            "ALTER TABLE wechat_mp_ingest_runs ADD COLUMN current_article TEXT DEFAULT ''"
        );
    }
    if (!runColumnNames.has("last_heartbeat_at")) {
        await db.exec("ALTER TABLE wechat_mp_ingest_runs ADD COLUMN last_heartbeat_at DATETIME");
    }
    await db.run(`
    UPDATE wechat_mp_ingest_settings
    SET content_delay_range = '[10,20]'
    WHERE content_delay_range IS NULL
       OR content_delay_range = ''
       OR replace(content_delay_range, ' ', '') = '[3,8]'
  `);
    await db.run(`
    INSERT OR IGNORE INTO wechat_mp_ingest_settings (
      id, enabled, token_health_enabled, token_health_interval_hours, daily_run_time, timezone, query_delay_range,
      page_pause_range, page_pause_seconds, content_delay_range, count_per_page, max_pages, fetch_content, auto_parse
    ) VALUES (1, 0, 1, 12, '03:30', 'Asia/Shanghai', '[95,125]', '[10,25]', 10, '[10,20]', 20, 1, 1, 1)
  `);
    await recoverStaleIngestRuns(db);
};

const getIngestSettings = async (db) => {
    await ensureWechatMpScheduledIngestSchema(db);
    const row = await db.get("SELECT * FROM wechat_mp_ingest_settings WHERE id = 1");
    return normalizeSettings(row || {});
};

const updateIngestSettings = async (db, payload = {}) => {
    await ensureWechatMpScheduledIngestSchema(db);
    const current = await getIngestSettings(db);
    const next = normalizeSettings({ ...current, ...payload });
    await db.run(
        `
    UPDATE wechat_mp_ingest_settings
    SET enabled = ?,
        token_health_enabled = ?,
        token_health_interval_hours = ?,
        daily_run_time = ?,
        timezone = ?,
        query_delay_range = ?,
        page_pause_range = ?,
        page_pause_seconds = ?,
        content_delay_range = ?,
        count_per_page = ?,
        max_pages = ?,
        fetch_content = ?,
        auto_parse = ?,
        updated_at = datetime('now')
    WHERE id = 1
  `,
        [
            next.enabled ? 1 : 0,
            next.token_health_enabled ? 1 : 0,
            next.token_health_interval_hours,
            next.daily_run_time,
            next.timezone,
            stringifyArray(next.query_delay_range),
            stringifyArray(next.page_pause_range),
            next.page_pause_seconds,
            stringifyArray(next.content_delay_range),
            next.count_per_page,
            next.max_pages,
            next.fetch_content ? 1 : 0,
            next.auto_parse ? 1 : 0,
        ]
    );
    return getIngestSettings(db);
};

const normalizeKeywords = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    const parsed = parseJson(value, null);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    return String(value || "")
        .split(/[，,;；\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
};

const serializeAccount = (row) => ({
    id: row.id,
    name: row.name || "",
    alias: row.alias || "",
    fakeid: row.fakeid || "",
    source_type: row.source_type || "wechat_mp",
    rss_feed_id: row.rss_feed_id || "",
    keywords: normalizeKeywords(row.keywords),
    enabled: Boolean(row.enabled),
    fetch_content: Boolean(row.fetch_content),
    count_per_page: row.count_per_page || DEFAULT_SETTINGS.count_per_page,
    max_pages: row.max_pages || DEFAULT_SETTINGS.max_pages,
    last_checked_at: row.last_checked_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
});

const normalizeAccountPayload = (payload = {}) => ({
    name: String(payload.name || payload.account_name || payload.nickname || "").trim(),
    alias: String(payload.alias || "").trim(),
    fakeid: String(payload.fakeid || "").trim(),
    source_type: String(payload.source_type || payload.sourceType || "wechat_mp")
        .trim()
        .toLowerCase(),
    rss_feed_id: String(
        payload.rss_feed_id || payload.rssFeedId || payload.feed_id || payload.feedId || ""
    ).trim(),
    keywords: normalizeKeywords(payload.keywords || payload.keyword || ""),
    enabled: toBool(payload.enabled, true),
    fetch_content: toBool(payload.fetch_content ?? payload.fetchContent, true),
    count_per_page: toInt(
        payload.count_per_page ?? payload.countPerPage ?? payload.count,
        DEFAULT_SETTINGS.count_per_page,
        1,
        100
    ),
    max_pages: toInt(payload.max_pages ?? payload.maxPages, DEFAULT_SETTINGS.max_pages, 1, 5),
});

const listIngestAccounts = async (db, { includeDisabled = true } = {}) => {
    await ensureWechatMpScheduledIngestSchema(db);
    const rows = await db.all(`
    SELECT *
    FROM wechat_mp_ingest_accounts
    ${includeDisabled ? "" : "WHERE enabled = 1"}
    ORDER BY enabled DESC, updated_at DESC, id DESC
  `);
    return rows.map(serializeAccount);
};

const upsertIngestAccount = async (db, payload = {}) => {
    await ensureWechatMpScheduledIngestSchema(db);
    const account = normalizeAccountPayload(payload);
    if (!INGEST_SOURCE_TYPES.has(account.source_type)) {
        const error = new Error("公众号来源类型无效");
        error.status = 400;
        throw error;
    }
    if (account.source_type === wechatReadRssService.SOURCE_TYPE) {
        account.rss_feed_id = wechatReadRssService.normalizeFeedId(account.rss_feed_id);
    }
    if (
        account.source_type === wechatReadRssService.SOURCE_TYPE &&
        !account.name &&
        account.rss_feed_id
    ) {
        account.name = account.rss_feed_id;
    }
    if (account.source_type === "wechat_mp" && !account.name && !account.fakeid) {
        const error = new Error("公众号名称或 fakeid 不能为空");
        error.status = 400;
        throw error;
    }
    if (!account.name) account.name = account.fakeid || account.rss_feed_id;
    const id = Number.parseInt(payload.id, 10);
    if (Number.isFinite(id) && id > 0) {
        await db.run(
            `
      UPDATE wechat_mp_ingest_accounts
      SET name = ?, alias = ?, fakeid = ?, source_type = ?, rss_feed_id = ?, keywords = ?, enabled = ?,
          fetch_content = ?, count_per_page = ?, max_pages = ?, updated_at = datetime('now')
      WHERE id = ?
    `,
            [
                account.name,
                account.alias,
                account.fakeid,
                account.source_type,
                account.rss_feed_id,
                stringifyArray(account.keywords),
                account.enabled ? 1 : 0,
                account.fetch_content ? 1 : 0,
                account.count_per_page,
                account.max_pages,
                id,
            ]
        );
        const row = await db.get("SELECT * FROM wechat_mp_ingest_accounts WHERE id = ?", [id]);
        return serializeAccount(row);
    }

    const existing = await db.get(
        `
    SELECT *
    FROM wechat_mp_ingest_accounts
    WHERE name = ?
       OR (source_type = ? AND rss_feed_id != '' AND rss_feed_id = ?)
       OR (source_type = 'wechat_mp' AND fakeid != '' AND fakeid = ?)
    ORDER BY CASE
        WHEN source_type = ? AND rss_feed_id != '' AND rss_feed_id = ? THEN 0
        WHEN source_type = 'wechat_mp' AND fakeid != '' AND fakeid = ? THEN 1
        ELSE 2
    END
    LIMIT 1
  `,
        [
            account.name,
            account.source_type,
            account.rss_feed_id,
            account.fakeid,
            account.source_type,
            account.rss_feed_id,
            account.fakeid,
        ]
    );
    if (existing) {
        return upsertIngestAccount(db, { ...account, id: existing.id });
    }

    const result = await db.run(
        `
    INSERT INTO wechat_mp_ingest_accounts (
      name, alias, fakeid, source_type, rss_feed_id, keywords, enabled, fetch_content,
      count_per_page, max_pages, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `,
        [
            account.name,
            account.alias,
            account.fakeid,
            account.source_type,
            account.rss_feed_id,
            stringifyArray(account.keywords),
            account.enabled ? 1 : 0,
            account.fetch_content ? 1 : 0,
            account.count_per_page,
            account.max_pages,
        ]
    );
    const row = await db.get("SELECT * FROM wechat_mp_ingest_accounts WHERE id = ?", [
        result.lastID,
    ]);
    return serializeAccount(row);
};

const setIngestAccountEnabled = async (db, id, enabled) => {
    await ensureWechatMpScheduledIngestSchema(db);
    const parsedId = Number.parseInt(id, 10);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
        const error = new Error("公众号 ID 无效");
        error.status = 400;
        throw error;
    }
    const normalizedEnabled = toBool(enabled, null);
    if (normalizedEnabled === null) {
        const error = new Error("公众号启用状态无效");
        error.status = 400;
        throw error;
    }
    const result = await db.run(
        `
      UPDATE wechat_mp_ingest_accounts
      SET enabled = ?, updated_at = datetime('now')
      WHERE id = ?
    `,
        [normalizedEnabled ? 1 : 0, parsedId]
    );
    if (!result.changes) {
        const error = new Error("公众号不存在");
        error.status = 404;
        throw error;
    }
    const row = await db.get("SELECT * FROM wechat_mp_ingest_accounts WHERE id = ?", [parsedId]);
    return serializeAccount(row);
};

const deleteIngestAccount = async (db, id) => {
    await ensureWechatMpScheduledIngestSchema(db);
    const parsedId = Number.parseInt(id, 10);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
        const error = new Error("公众号 ID 无效");
        error.status = 400;
        throw error;
    }
    await db.run("DELETE FROM wechat_mp_ingest_accounts WHERE id = ?", [parsedId]);
    return { deleted: true, id: parsedId };
};

const parseCsvLine = (line) => {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"') {
            if (quoted && line[index + 1] === '"') {
                current += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if ((char === "," || char === "\t") && !quoted) {
            cells.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    cells.push(current.trim());
    return cells;
};

const parseAccountListContent = (content, fileName = "") => {
    const text = String(content || "")
        .replace(/^\uFEFF/, "")
        .trim();
    if (!text) return [];
    if (fileName.toLowerCase().endsWith(".json") || text.startsWith("[") || text.startsWith("{")) {
        const parsed = JSON.parse(text);
        const rows = Array.isArray(parsed) ? parsed : parsed.accounts;
        if (!Array.isArray(rows)) return [];
        return rows.map(normalizeAccountPayload).filter((item) => item.name || item.fakeid);
    }

    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (!lines.length) return [];
    const firstCells = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
    const hasHeader = firstCells.some((cell) =>
        [
            "name",
            "account_name",
            "公众号",
            "公众号名称",
            "fakeid",
            "alias",
            "keywords",
            "source_type",
            "source",
            "rss_feed_id",
            "feed_id",
            "来源类型",
        ].includes(cell)
    );
    const header = hasHeader ? firstCells : [];
    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines
        .map((line) => {
            const cells = parseCsvLine(line);
            if (hasHeader) {
                const row = {};
                header.forEach((key, index) => {
                    row[key] = cells[index] || "";
                });
                return normalizeAccountPayload({
                    name: row.name || row.account_name || row["公众号"] || row["公众号名称"],
                    fakeid: row.fakeid,
                    alias: row.alias || row["别名"],
                    keywords: row.keywords || row.keyword || row["关键词"],
                    source_type: row.source_type || row.source || row["来源类型"],
                    rss_feed_id:
                        row.rss_feed_id || row.feed_id || row["rss feed id"] || row["RSS Feed ID"],
                    enabled: row.enabled || row["启用"],
                });
            }
            return normalizeAccountPayload({
                name: cells[0],
                fakeid: cells[1],
                alias: cells[2],
                keywords: cells[3],
            });
        })
        .filter((item) => item.name || item.fakeid);
};

const importIngestAccountsFromText = async (db, { content, fileName = "" } = {}) => {
    const accounts = parseAccountListContent(content, fileName);
    const imported = [];
    for (const account of accounts) {
        imported.push(await upsertIngestAccount(db, account));
    }
    return {
        imported_count: imported.length,
        accounts: imported,
    };
};

const importIngestAccountsFromFile = async (db, file) => {
    if (!file?.path) {
        const error = new Error("请上传公众号列表文件");
        error.status = 400;
        throw error;
    }
    const content = await fs.promises.readFile(file.path, "utf8");
    return importIngestAccountsFromText(db, {
        content,
        fileName: file.originalname || file.filename || "",
    });
};

const createRun = async (db, { triggerType, userId, settings }) => {
    const result = await db.run(
        `
    INSERT INTO wechat_mp_ingest_runs (
      trigger_type, status, progress_stage, progress_percent, last_heartbeat_at,
      started_at, options_json, created_by
    ) VALUES (?, 'running', 'starting', 1, datetime('now'), datetime('now'), ?, ?)
  `,
        [triggerType, JSON.stringify(settings), userId || null]
    );
    return result.lastID;
};

const getRun = async (db, id) => db.get("SELECT * FROM wechat_mp_ingest_runs WHERE id = ?", [id]);

const listIngestRuns = async (db, { limit = 20 } = {}) => {
    await ensureWechatMpScheduledIngestSchema(db);
    return db.all(
        `
    SELECT *
    FROM wechat_mp_ingest_runs
    ORDER BY started_at DESC, id DESC
    LIMIT ?
  `,
        [Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100)]
    );
};

const serializeIngestArticle = (row) => ({
    ...row,
    images: parseJson(row.images_json, []),
    extracted_event: parseJson(row.extracted_event_json, null),
});

const listIngestArticles = async (db, { limit = 50 } = {}) => {
    await ensureWechatMpScheduledIngestSchema(db);
    const rows = await db.all(
        `
    SELECT a.*,
           acc.name AS account_name,
           acc.source_type AS account_source_type,
           acc.rss_feed_id AS account_rss_feed_id
    FROM wechat_mp_ingest_articles a
    LEFT JOIN wechat_mp_ingest_accounts acc ON acc.id = a.account_id
    ORDER BY a.first_seen_at DESC, a.id DESC
    LIMIT ?
  `,
        [Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200)]
    );
    return rows.map(serializeIngestArticle);
};

const upsertArticle = async (db, { account, article, content }) => {
    const link = cleanWeChatUrl(article.link || "");
    if (!link) return { inserted: false, skipped: true };
    const existing = await db.get("SELECT * FROM wechat_mp_ingest_articles WHERE link = ?", [link]);
    const contentStatus = content?.content_status || article.content_status || "not_fetched";
    const imagesJson = stringifyArray(content?.images || []);
    const contentText = String(content?.contentText || content?.content_text || "").trim();
    const cover = resolveIngestCover({ article, content, existingCover: existing?.cover });
    if (existing) {
        if (cover && cover !== existing.cover && (!existing.cover || isLocalUploadUrl(cover))) {
            await db.run(
                `
        UPDATE wechat_mp_ingest_articles
        SET cover = ?, updated_at = datetime('now')
        WHERE id = ?
      `,
                [cover, existing.id]
            );
        }
        await syncEventCover(db, existing.event_id, cover || existing.cover);
        if (contentText && !existing.content_text) {
            await db.run(
                `
        UPDATE wechat_mp_ingest_articles
        SET content_text = ?, content_html = ?, images_json = ?, content_status = ?,
            fetched_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `,
                [contentText, content?.contentHtml || "", imagesJson, contentStatus, existing.id]
            );
        }
        return { inserted: false, skipped: false, id: existing.id };
    }

    const result = await db.run(
        `
    INSERT INTO wechat_mp_ingest_articles (
      account_id, fakeid, title, link, summary, author, cover, create_time,
      time_text, content_text, content_html, images_json, content_status,
      first_seen_at, fetched_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))
  `,
        [
            account.id,
            account.fakeid || article.fakeid || "",
            article.title || "",
            link,
            article.summary || "",
            article.author || content?.author || "",
            cover,
            article.create_time || "",
            article.time_text || "",
            contentText,
            content?.contentHtml || "",
            imagesJson,
            contentStatus,
            contentText ? new Date().toISOString() : null,
        ]
    );
    return { inserted: true, skipped: false, id: result.lastID };
};

const updateArticleExtraction = async (
    db,
    articleId,
    { status, parsed = null, error = "" } = {}
) => {
    await db.run(
        `
    UPDATE wechat_mp_ingest_articles
    SET extraction_status = ?,
        extracted_event_json = ?,
        extraction_error = ?,
        extracted_at = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `,
        [
            status,
            parsed ? JSON.stringify(parsed) : "",
            String(error || "").slice(0, 2000),
            status === "completed" ? new Date().toISOString() : null,
            articleId,
        ]
    );
};

const updateArticleActivity = async (db, articleId, { status, reason = "", eventId } = {}) => {
    const updates = ["activity_status = ?", "activity_reason = ?", "updated_at = datetime('now')"];
    const values = [status, String(reason || "").slice(0, 1000)];
    if (eventId !== undefined) {
        updates.splice(2, 0, "event_id = ?");
        values.splice(2, 0, eventId || null);
    }
    values.push(articleId);
    await db.run(
        `
    UPDATE wechat_mp_ingest_articles
    SET ${updates.join(", ")}
    WHERE id = ?
  `,
        values
    );
};

const activityEventPayload = (article, parsed) => {
    const tags = Array.isArray(parsed.tags)
        ? parsed.tags
              .map((tag) => String(tag || "").trim())
              .filter(Boolean)
              .join(",")
        : String(parsed.tags || "").trim();
    const contentText = String(article.content_text || "").trim();
    const date =
        normalizeEventDateTime(parsed.date, parsed.time, 0) ||
        normalizeEventDateTime(article.time_text) ||
        "";
    return {
        title: String(parsed.title || article.title || "未命名活动").trim(),
        date,
        end_date: normalizeEventDateTime(parsed.end_date, parsed.time, 1) || date || null,
        location: String(parsed.location || "").trim(),
        tags,
        status: "pending",
        image: String(article.cover || "").trim(),
        description: String(parsed.description || article.summary || "").trim(),
        content: String(parsed.content || article.content_html || contentText).trim(),
        link: cleanWeChatUrl(article.link || ""),
        featured: 0,
        score: parsed.score || null,
        target_audience: parsed.target_audience || null,
        organizer: parsed.organizer || article.author || article.account_name || null,
        volunteer_time: parsed.volunteer_time || null,
        category: normalizeEventCategory(parsed.category) || "other",
        is_college_notice: [1, "1", true, "true"].includes(parsed.is_college_notice) ? 1 : 0,
        notice_type: parsed.notice_type || null,
        source_college: parsed.source_college || null,
    };
};

const upsertActivityEvent = async (db, article, parsed) => {
    const payload = activityEventPayload(article, parsed);
    if (!payload.link) throw new Error("活动候选缺少公众号原文链接");

    let existing = null;
    if (article.event_id) {
        existing = await db.get("SELECT id, status FROM events WHERE id = ?", [article.event_id]);
    }
    if (!existing) {
        existing = await db.get(
            `
      SELECT id, status
      FROM events
      WHERE link = ? AND (deleted_at IS NULL OR deleted_at = '')
      LIMIT 1
    `,
            [payload.link]
        );
    }

    const fields = [
        "title",
        "date",
        "end_date",
        "location",
        "tags",
        "image",
        "description",
        "content",
        "link",
        "score",
        "target_audience",
        "organizer",
        "volunteer_time",
        "category",
        "is_college_notice",
        "notice_type",
        "source_college",
    ];
    const values = fields.map((field) => payload[field]);
    if (existing) {
        if (
            !existing.status ||
            ["pending", "draft"].includes(String(existing.status).toLowerCase())
        ) {
            await db.run(
                `
        UPDATE events
        SET ${fields.map((field) => `${field} = ?`).join(", ")}, status = 'pending'
        WHERE id = ?
      `,
                [...values, existing.id]
            );
        }
        return { id: existing.id, created: false, status: existing.status || "pending" };
    }

    const result = await db.run(
        `
    INSERT INTO events (
      ${fields.join(", ")}, status, uploader_id, created_at
    ) VALUES (${fields.map(() => "?").join(", ")}, 'pending', NULL, datetime('now'))
  `,
        values
    );
    return { id: result.lastID, created: true, status: "pending" };
};

const screenArticleActivity = async (
    db,
    article,
    parsed,
    { userId = null, governanceTrigger = triggerEventGovernance } = {}
) => {
    const screening = screenActivityCandidate(parsed);
    if (!screening.accepted) {
        await updateArticleActivity(db, article.id, {
            status: "rejected",
            reason: screening.reason,
        });
        return {
            status: "rejected",
            confidence: screening.confidence,
            reason: screening.reason,
            event_id: article.event_id || null,
        };
    }

    try {
        const event = await upsertActivityEvent(db, article, parsed);
        await updateArticleActivity(db, article.id, {
            status: "accepted",
            reason: screening.reason,
            eventId: event.id,
        });
        void Promise.resolve(
            governanceTrigger(db, {
                eventId: event.id,
                userId,
                source: "automatic_wechat_ingest",
            })
        ).catch((error) => {
            console.error("[WeChat MP Ingest] automatic event governance failed:", error);
        });
        return {
            status: "accepted",
            confidence: screening.confidence,
            reason: screening.reason,
            event_id: event.id,
            event_created: event.created,
            governance_triggered: true,
        };
    } catch (error) {
        const errorMessage = error?.message || String(error);
        await updateArticleActivity(db, article.id, {
            status: "failed",
            reason: `活动入库失败：${errorMessage}`,
        });
        return {
            status: "failed",
            confidence: screening.confidence,
            reason: errorMessage,
            event_id: null,
        };
    }
};

const extractArticleRecord = async (
    db,
    article,
    { parser = null, audit = recordWechatParseRun, userId = null } = {}
) => {
    const content = String(article?.content_text || "").trim();
    if (!content) {
        return { status: "not_started", parsed: null, skipped: true };
    }

    await updateArticleExtraction(db, article.id, { status: "processing" });
    try {
        const parseArticle = parser || require("../utils/wechat").parseWithLLM;
        const parsed = await parseArticle(
            {
                title: article.title || "Untitled",
                author: article.author || article.account_name || "Unknown",
                content,
                coverImage: article.cover || "",
            },
            { db }
        );
        if (!parsed || typeof parsed !== "object") {
            throw new Error("公众号文章信息提取返回为空");
        }

        await updateArticleExtraction(db, article.id, { status: "completed", parsed });
        await audit(
            {
                status: "completed",
                userId,
                contentLength: content.length,
                modelUsed: true,
                provider: parsed.aiMeta?.provider,
                model: parsed.aiMeta?.model,
                runtimeTelemetry: parsed.aiMeta?.runtimeTelemetry,
                hasCoverImage: Boolean(article.cover),
                category: parsed.category,
                isCollegeNotice: parsed.is_college_notice,
                noticeType: parsed.notice_type,
                sourceCollege: parsed.source_college,
            },
            db
        );
        return { status: "completed", parsed, skipped: false };
    } catch (error) {
        const errorMessage = error?.message || String(error);
        await updateArticleExtraction(db, article.id, {
            status: "failed",
            error: errorMessage,
        });
        await audit(
            {
                status: "failed",
                userId,
                contentLength: content.length,
                modelUsed: false,
                errorCode: error?.code || errorMessage,
            },
            db
        );
        return { status: "failed", parsed: null, skipped: false, error: errorMessage };
    }
};

const extractIngestArticle = async (db, articleId, options = {}) => {
    await ensureWechatMpScheduledIngestSchema(db);
    const parsedId = Number.parseInt(articleId, 10);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
        const error = new Error("公众号增量文章 ID 无效");
        error.status = 400;
        throw error;
    }
    const article = await db.get(
        `
    SELECT a.*, acc.name AS account_name
    FROM wechat_mp_ingest_articles a
    LEFT JOIN wechat_mp_ingest_accounts acc ON acc.id = a.account_id
    WHERE a.id = ?
  `,
        [parsedId]
    );
    if (!article) {
        const error = new Error("公众号增量文章不存在");
        error.status = 404;
        throw error;
    }
    const result = await extractArticleRecord(db, article, options);
    const activity =
        result.status === "completed"
            ? await screenArticleActivity(db, article, result.parsed, options)
            : null;
    return {
        ...result,
        activity,
        article: serializeIngestArticle(
            await db.get("SELECT * FROM wechat_mp_ingest_articles WHERE id = ?", [parsedId])
        ),
    };
};

const executeIngestRun = async (
    db,
    {
        runId,
        triggerType = "manual",
        userId = null,
        settings,
        runtime,
        wechatApi = wechatMpAdminService,
        rssApi = wechatReadRssService,
        parser = null,
        localizeImages = null,
        audit = recordWechatParseRun,
        governanceTrigger = triggerEventGovernance,
    } = {}
) => {
    await ensureWechatMpScheduledIngestSchema(db);
    const effectiveSettings = settings || (await getIngestSettings(db));
    const accounts = await listIngestAccounts(db, { includeDisabled: false });
    let totalArticles = 0;
    let newArticles = 0;
    let fetchedContents = 0;
    let extractedArticles = 0;
    let failedCount = 0;
    let extractionFailedCount = 0;
    const sourceErrors = [];
    let processedAccounts = 0;
    let processedArticles = 0;
    const createdRunId =
        runId || (await createRun(db, { triggerType, userId, settings: effectiveSettings }));

    try {
        await updateRunProgress(db, createdRunId, {
            stage: "fetching_accounts",
            totalAccounts: accounts.length,
            processedAccounts,
            totalArticles,
            processedArticles,
        });
        for (let index = 0; index < accounts.length; index += 1) {
            const account = accounts[index];
            await updateRunProgress(db, createdRunId, {
                stage: "fetching_accounts",
                totalAccounts: accounts.length,
                processedAccounts,
                totalArticles,
                processedArticles,
                currentAccount: account.name,
            });
            if (index > 0) {
                await wechatMpAdminService.waitDelayRange(
                    effectiveSettings.query_delay_range,
                    runtime
                );
            }
            let listResult;
            try {
                if (account.source_type === wechatReadRssService.SOURCE_TYPE) {
                    listResult = await rssApi.fetchArticles({
                        feedId: account.rss_feed_id,
                        count: account.count_per_page || effectiveSettings.count_per_page,
                        maxPages: account.max_pages || effectiveSettings.max_pages,
                        mode: effectiveSettings.fetch_content ? "fulltext" : "",
                        pacing: {
                            page_pause_seconds: effectiveSettings.page_pause_seconds,
                        },
                        runtime,
                    });
                } else {
                    listResult = await wechatApi.fetchArticles({
                        accountName: account.name,
                        fakeid: account.fakeid,
                        keyword: account.keywords[0] || "",
                        count: account.count_per_page || effectiveSettings.count_per_page,
                        maxPages: account.max_pages || effectiveSettings.max_pages,
                        allowFirst: false,
                        pacing: {
                            page_pause_seconds: effectiveSettings.page_pause_seconds,
                            page_pause_range: effectiveSettings.page_pause_range,
                            query_delay_range: effectiveSettings.query_delay_range,
                            content_delay_range: effectiveSettings.content_delay_range,
                        },
                        runtime,
                    });
                }
            } catch (error) {
                if (account.source_type !== wechatReadRssService.SOURCE_TYPE) throw error;
                failedCount += 1;
                sourceErrors.push(`${account.name}: ${error?.message || String(error)}`);
                await db.run(
                    "UPDATE wechat_mp_ingest_accounts SET last_checked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
                    [account.id]
                );
                processedAccounts = index + 1;
                await updateRunProgress(db, createdRunId, {
                    stage: processedAccounts < accounts.length ? "fetching_accounts" : "finalizing",
                    totalAccounts: accounts.length,
                    processedAccounts,
                    totalArticles,
                    processedArticles,
                    currentAccount: "",
                    currentArticle: "",
                });
                continue;
            }
            const articles = listResult.articles || [];
            totalArticles += articles.length;
            await updateRunProgress(db, createdRunId, {
                stage: articles.length ? "processing_articles" : "fetching_accounts",
                totalAccounts: accounts.length,
                processedAccounts,
                totalArticles,
                processedArticles,
                currentAccount: account.name,
                currentArticle: articles[0]?.title || "",
            });
            for (let articleIndex = 0; articleIndex < articles.length; articleIndex += 1) {
                const article = articles[articleIndex];
                await updateRunProgress(db, createdRunId, {
                    stage: "fetching_content",
                    totalAccounts: accounts.length,
                    processedAccounts,
                    totalArticles,
                    processedArticles,
                    currentAccount: account.name,
                    currentArticle: article.title,
                });
                const existing = article.link
                    ? await db.get(
                          "SELECT id, content_text, cover FROM wechat_mp_ingest_articles WHERE link = ?",
                          [article.link]
                      )
                    : null;
                let content = null;
                const shouldFetchContent =
                    account.fetch_content &&
                    effectiveSettings.fetch_content &&
                    (!existing || !existing.content_text || !isLocalUploadUrl(existing.cover));
                if (shouldFetchContent && article.link) {
                    if (account.source_type === wechatReadRssService.SOURCE_TYPE) {
                        content = {
                            contentText: article.content_text || "",
                            contentHtml: article.content_html || "",
                            images: Array.isArray(article.images) ? article.images : [],
                            coverImage: article.cover || "",
                            author: article.author || "",
                            content_status: article.content_status || "empty",
                        };
                        if (content.contentText) fetchedContents += 1;
                    } else {
                        if (articleIndex > 0)
                            await wechatMpAdminService.waitDelayRange(
                                effectiveSettings.content_delay_range,
                                runtime
                            );
                        try {
                            content = await wechatApi.fetchArticleContent({ url: article.link });
                            if (content?.contentText) fetchedContents += 1;
                        } catch (error) {
                            failedCount += 1;
                            content = { content_status: error.message || "fetch_failed" };
                        }
                    }
                }
                const contentCover = String(content?.coverImage || content?.cover || "").trim();
                const listCover = String(article.cover || "").trim();
                if (listCover && !isLocalUploadUrl(contentCover || listCover)) {
                    const localizedCover = await localizeIngestCover(listCover, localizeImages);
                    if (localizedCover && localizedCover !== listCover) {
                        content = {
                            ...(content || {}),
                            coverImage: localizedCover,
                            images: Array.isArray(content?.images)
                                ? content.images
                                : [localizedCover],
                        };
                    }
                }
                await updateRunProgress(db, createdRunId, {
                    stage: effectiveSettings.auto_parse ? "analyzing" : "processing_articles",
                    totalAccounts: accounts.length,
                    processedAccounts,
                    totalArticles,
                    processedArticles,
                    currentAccount: account.name,
                    currentArticle: article.title,
                });
                const saved = await upsertArticle(db, { account, article, content });
                if (saved.inserted) newArticles += 1;
                if (effectiveSettings.auto_parse && saved.id) {
                    const storedArticle = await db.get(
                        `
            SELECT a.*, acc.name AS account_name
            FROM wechat_mp_ingest_articles a
            LEFT JOIN wechat_mp_ingest_accounts acc ON acc.id = a.account_id
            WHERE a.id = ?
          `,
                        [saved.id]
                    );
                    if (storedArticle?.content_text) {
                        let extraction = {
                            status: storedArticle.extraction_status,
                            parsed: parseJson(storedArticle.extracted_event_json, null),
                        };
                        if (storedArticle.extraction_status !== "completed") {
                            extraction = await extractArticleRecord(db, storedArticle, {
                                parser,
                                audit,
                                userId,
                            });
                            if (extraction.status === "completed") extractedArticles += 1;
                            if (extraction.status === "failed") extractionFailedCount += 1;
                        }
                        if (
                            extraction.status === "completed" &&
                            ["not_screened", "failed"].includes(
                                storedArticle.activity_status || "not_screened"
                            )
                        ) {
                            await screenArticleActivity(db, storedArticle, extraction.parsed, {
                                userId,
                                governanceTrigger,
                            });
                        }
                    }
                }
                processedArticles += 1;
                await updateRunProgress(db, createdRunId, {
                    stage: "processing_articles",
                    totalAccounts: accounts.length,
                    processedAccounts,
                    totalArticles,
                    processedArticles,
                    currentAccount: account.name,
                    currentArticle: "",
                });
            }
            processedAccounts = index + 1;
            await updateRunProgress(db, createdRunId, {
                stage: processedAccounts < accounts.length ? "fetching_accounts" : "finalizing",
                totalAccounts: accounts.length,
                processedAccounts,
                totalArticles,
                processedArticles,
                currentAccount: processedAccounts < accounts.length ? "" : account.name,
                currentArticle: "",
            });
            await db.run(
                "UPDATE wechat_mp_ingest_accounts SET last_checked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
                [account.id]
            );
        }

        await db.run(
            `
      UPDATE wechat_mp_ingest_runs
      SET status = 'completed',
          progress_stage = 'completed',
          progress_percent = 100,
          processed_accounts = ?,
          processed_articles = ?,
          current_account = '',
          current_article = '',
          last_heartbeat_at = datetime('now'),
          finished_at = datetime('now'),
          total_accounts = ?,
          total_articles = ?,
          new_articles = ?,
          fetched_contents = ?,
          extracted_articles = ?,
          failed_count = ?,
          extraction_failed_count = ?,
          error = ?
      WHERE id = ?
    `,
            [
                processedAccounts,
                processedArticles,
                accounts.length,
                totalArticles,
                newArticles,
                fetchedContents,
                extractedArticles,
                failedCount,
                extractionFailedCount,
                sourceErrors.join("\n").slice(0, 2000),
                createdRunId,
            ]
        );
    } catch (error) {
        await db.run(
            `
      UPDATE wechat_mp_ingest_runs
      SET status = 'failed',
          progress_stage = 'failed',
          current_account = '',
          current_article = '',
          last_heartbeat_at = datetime('now'),
          finished_at = datetime('now'),
          total_accounts = ?,
          total_articles = ?,
          new_articles = ?,
          fetched_contents = ?,
          extracted_articles = ?,
          failed_count = ?,
          extraction_failed_count = ?,
          error = ?
      WHERE id = ?
    `,
            [
                accounts.length,
                totalArticles,
                newArticles,
                fetchedContents,
                extractedArticles,
                failedCount + 1,
                extractionFailedCount,
                [...sourceErrors, error.message || String(error)].join("\n").slice(0, 2000),
                createdRunId,
            ]
        );
    }

    return getRun(db, createdRunId);
};

const runWechatMpIngestNow = async (db, options = {}) => {
    if (activeRun) {
        const error = new Error("微信 MP 增量采集任务正在运行");
        error.status = 409;
        throw error;
    }
    activeRun = executeIngestRun(db, options).finally(() => {
        activeRun = null;
    });
    return activeRun;
};

const startWechatMpIngestRun = async (db, options = {}) => {
    if (activeRun) {
        const error = new Error("微信 MP 增量采集任务正在运行");
        error.status = 409;
        throw error;
    }
    await ensureWechatMpScheduledIngestSchema(db);
    const settings = options.settings || (await getIngestSettings(db));
    const runId = await createRun(db, {
        triggerType: options.triggerType || "manual",
        userId: options.userId,
        settings,
    });
    activeRunId = runId;
    activeRun = executeIngestRun(db, { ...options, runId, settings }).finally(() => {
        activeRun = null;
        activeRunId = null;
    });
    activeRun.catch((error) => {
        console.error("[WeChat MP Ingest] background run failed:", error);
    });
    return getRun(db, runId);
};

const getZonedDateTimeKey = (date = new Date(), timezone = DEFAULT_SETTINGS.timezone) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: normalizeTimezone(timezone),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    })
        .formatToParts(date)
        .reduce((acc, part) => {
            acc[part.type] = part.value;
            return acc;
        }, {});
    return {
        dateKey: `${parts.year}-${parts.month}-${parts.day}`,
        timeKey: `${parts.hour}:${parts.minute}`,
    };
};

const startWechatMpIngestScheduler = ({ getDb, intervalMs = 60 * 1000 } = {}) => {
    if (!getDb || schedulerTimer || process.env.WECHAT_MP_INGEST_SCHEDULER_DISABLED === "1") {
        return;
    }
    schedulerTimer = setInterval(async () => {
        try {
            const db = await getDb();
            const settings = await getIngestSettings(db);
            if (!settings.enabled) return;
            const zoned = getZonedDateTimeKey(new Date(), settings.timezone);
            const tickKey = `${zoned.dateKey}:${settings.daily_run_time}`;
            if (zoned.timeKey !== settings.daily_run_time || schedulerLastKey === tickKey) return;
            schedulerLastKey = tickKey;
            await startWechatMpIngestRun(db, {
                triggerType: "scheduled",
                settings,
            });
        } catch (error) {
            console.error("[WeChat MP Ingest] scheduler tick failed:", error.message || error);
        }
    }, intervalMs);
    if (schedulerTimer.unref) schedulerTimer.unref();
};

const stopWechatMpIngestScheduler = () => {
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = null;
};

const runWechatMpTokenHealthCheck = async ({ getDb } = {}) => {
    if (!getDb) return null;
    if (tokenHealthRun) return tokenHealthRun;
    tokenHealthRun = (async () => {
        const db = await getDb();
        const settings = await getIngestSettings(db);
        if (!settings.token_health_enabled) return null;
        tokenHealthLastCheckedAt = Date.now();
        return wechatMpAdminService.checkTokenHealth({ force: true });
    })().finally(() => {
        tokenHealthRun = null;
    });
    return tokenHealthRun;
};

const startWechatMpTokenHealthScheduler = ({ getDb, intervalMs = 60 * 1000 } = {}) => {
    if (
        !getDb ||
        tokenHealthSchedulerTimer ||
        process.env.WECHAT_MP_TOKEN_HEALTH_SCHEDULER_DISABLED === "1"
    ) {
        return;
    }
    const tick = async () => {
        try {
            const db = await getDb();
            const settings = await getIngestSettings(db);
            if (!settings.token_health_enabled) return;
            const interval = settings.token_health_interval_hours * 60 * 60 * 1000;
            if (!tokenHealthLastCheckedAt || Date.now() - tokenHealthLastCheckedAt >= interval) {
                await runWechatMpTokenHealthCheck({ getDb });
            }
        } catch (error) {
            console.error(
                "[WeChat MP Token Health] scheduler tick failed:",
                error.message || error
            );
        }
    };
    void tick();
    tokenHealthSchedulerTimer = setInterval(tick, intervalMs);
    if (tokenHealthSchedulerTimer.unref) tokenHealthSchedulerTimer.unref();
};

const stopWechatMpTokenHealthScheduler = () => {
    if (tokenHealthSchedulerTimer) clearInterval(tokenHealthSchedulerTimer);
    tokenHealthSchedulerTimer = null;
    tokenHealthLastCheckedAt = 0;
    tokenHealthRun = null;
};

module.exports = {
    DEFAULT_SETTINGS,
    deleteIngestAccount,
    ensureWechatMpScheduledIngestSchema,
    executeIngestRun,
    extractArticleRecord,
    extractIngestArticle,
    screenArticleActivity,
    getIngestSettings,
    getZonedDateTimeKey,
    importIngestAccountsFromFile,
    importIngestAccountsFromText,
    listIngestAccounts,
    listIngestArticles,
    listIngestRuns,
    localizeIngestCover,
    normalizeAccountPayload,
    normalizeSettings,
    parseAccountListContent,
    runWechatMpIngestNow,
    setIngestAccountEnabled,
    startWechatMpIngestRun,
    startWechatMpIngestScheduler,
    startWechatMpTokenHealthScheduler,
    stopWechatMpTokenHealthScheduler,
    stopWechatMpIngestScheduler,
    serializeIngestArticle,
    updateIngestSettings,
    upsertIngestAccount,
    runWechatMpTokenHealthCheck,
};
