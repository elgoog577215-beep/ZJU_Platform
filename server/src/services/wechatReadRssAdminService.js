const axios = require("axios");

const { DEFAULT_BASE_URL, normalizeBaseUrl, normalizeFeedId } = require("./wechatReadRssService");

const DEFAULT_TIMEOUT_MS = 15_000;
const LOGIN_TIMEOUT_MS = 125_000;
const STATUS_VALUES = new Set([0, 1, 2]);
const ID_PATTERN = /^[A-Za-z0-9_-]{1,255}$/;
const WECHAT_ARTICLE_URL_PATTERN = /^https:\/\/mp\.weixin\.qq\.com\/s\//i;

const loginSessions = new Map();

const toText = (value) => String(value ?? "").trim();

const createAdminError = (message, code, status = 502) => {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
};

const normalizeId = (value, label = "ID") => {
    const id = toText(value);
    if (!id || !ID_PATTERN.test(id)) {
        throw createAdminError(`${label} 无效`, "WEWE_RSS_INVALID_ID", 400);
    }
    return id;
};

const normalizeStatus = (value, fallback = 1) => {
    const status = Number(value);
    return STATUS_VALUES.has(status) ? status : fallback;
};

const normalizeLimit = (value, fallback = 1000) => {
    const limit = Number.parseInt(value, 10);
    if (!Number.isFinite(limit)) return fallback;
    return Math.min(Math.max(limit, 1), 1000);
};

const normalizePage = (value, fallback = 1) => {
    const page = Number.parseInt(value, 10);
    if (!Number.isFinite(page)) return fallback;
    return Math.min(Math.max(page, 1), 1000);
};

const normalizeManagementConfig = ({ baseUrl, authCode } = {}) => {
    const normalizedBaseUrl = normalizeBaseUrl(
        baseUrl ?? process.env.WEWE_RSS_BASE_URL ?? DEFAULT_BASE_URL
    );
    const normalizedAuthCode = toText(authCode ?? process.env.WEWE_RSS_AUTH_CODE);
    return {
        baseUrl: normalizedBaseUrl,
        authCode: normalizedAuthCode,
    };
};

const assertManagementAuth = (config) => {
    if (!config.authCode) {
        throw createAdminError(
            "WeWe RSS 管理授权未配置，请在平台后端设置 WEWE_RSS_AUTH_CODE",
            "WEWE_RSS_MANAGEMENT_AUTH_NOT_CONFIGURED",
            503
        );
    }
};

const buildServiceUrl = (baseUrl, pathname) => {
    const url = new URL(baseUrl);
    const root = url.pathname.replace(/\/+$/, "");
    url.pathname = `${root}/${String(pathname || "").replace(/^\/+/, "")}`;
    url.search = "";
    url.hash = "";
    return url;
};

const encodeBatchInput = (input) =>
    JSON.stringify({
        0: {
            json: input === undefined ? null : input,
        },
    });

const getTrpcError = (errorPayload) => {
    const data = errorPayload?.json || errorPayload?.data?.json || errorPayload?.data || {};
    return {
        message: toText(data?.message || errorPayload?.message) || "WeWe RSS API 请求失败",
        status: Number(data?.httpStatus || data?.http_status) || 502,
        code: toText(data?.code || errorPayload?.code) || "WEWE_RSS_API_ERROR",
    };
};

const unwrapTrpcResponse = (payload) => {
    const envelope = Array.isArray(payload) ? payload[0] : payload;
    if (envelope?.error) {
        const details = getTrpcError(envelope.error);
        throw createAdminError(details.message, details.code, details.status);
    }
    const result = envelope?.result?.data ?? envelope?.data;
    if (
        result &&
        typeof result === "object" &&
        Object.prototype.hasOwnProperty.call(result, "json")
    ) {
        return result.json;
    }
    return result ?? envelope;
};

const requestTrpc = async (
    procedure,
    input,
    {
        type = "query",
        request = axios.request.bind(axios),
        timeoutMs = DEFAULT_TIMEOUT_MS,
        ...options
    } = {}
) => {
    const config = normalizeManagementConfig(options);
    assertManagementAuth(config);
    const url = buildServiceUrl(config.baseUrl, `trpc/${procedure}`);
    const requestOptions = {
        method: type === "mutation" ? "POST" : "GET",
        url: url.toString(),
        timeout: timeoutMs,
        headers: {
            Accept: "application/json",
            Authorization: config.authCode,
        },
        validateStatus: (status) => status >= 200 && status < 300,
    };

    if (type === "mutation") {
        url.searchParams.set("batch", "1");
        requestOptions.url = url.toString();
        requestOptions.data = JSON.parse(encodeBatchInput(input));
    } else {
        url.searchParams.set("batch", "1");
        url.searchParams.set("input", encodeBatchInput(input));
        requestOptions.url = url.toString();
    }

    let response;
    try {
        response = await request(requestOptions);
    } catch (error) {
        const detail = error?.code === "ECONNABORTED" ? "请求超时" : error?.message || "网络错误";
        throw createAdminError(
            `WeWe RSS 管理 API 请求失败：${detail}`,
            "WEWE_RSS_API_REQUEST_FAILED"
        );
    }
    if (!response || response.status < 200 || response.status >= 300) {
        throw createAdminError(
            `WeWe RSS 管理 API 返回 HTTP ${response?.status || "未知状态"}`,
            "WEWE_RSS_API_HTTP_ERROR",
            response?.status || 502
        );
    }
    return unwrapTrpcResponse(response.data);
};

const sanitizeAccount = (account) => {
    if (!account || typeof account !== "object") return null;
    return {
        id: toText(account.id),
        name: toText(account.name),
        status: normalizeStatus(account.status, 1),
        createdAt: account.createdAt || account.created_at || null,
        updatedAt: account.updatedAt || account.updated_at || null,
    };
};

const sanitizeFeed = (feed, baseUrl) => {
    if (!feed || typeof feed !== "object") return null;
    const id = toText(feed.id);
    let feedUrl = "";
    if (id) {
        try {
            feedUrl = buildServiceUrl(baseUrl, `feeds/${encodeURIComponent(id)}.atom`).toString();
        } catch {
            feedUrl = "";
        }
    }
    return {
        id,
        mpName: toText(feed.mpName ?? feed.mp_name ?? feed.name),
        mpCover: toText(feed.mpCover ?? feed.mp_cover ?? feed.cover),
        mpIntro: toText(feed.mpIntro ?? feed.mp_intro ?? feed.intro),
        status: normalizeStatus(feed.status, 1),
        syncTime: Number(feed.syncTime ?? feed.sync_time) || 0,
        updateTime: Number(feed.updateTime ?? feed.update_time) || 0,
        hasHistory: Number(feed.hasHistory ?? feed.has_history) || 0,
        createdAt: feed.createdAt || feed.created_at || null,
        updatedAt: feed.updatedAt || feed.updated_at || null,
        feedUrl,
    };
};

const sanitizeArticle = (article) => {
    if (!article || typeof article !== "object") return null;
    return {
        id: toText(article.id),
        mpId: toText(article.mpId ?? article.mp_id),
        title: toText(article.title),
        picUrl: toText(article.picUrl ?? article.pic_url),
        publishTime: Number(article.publishTime ?? article.publish_time) || 0,
        createdAt: article.createdAt || article.created_at || null,
        updatedAt: article.updatedAt || article.updated_at || null,
    };
};

const listAccounts = async (options = {}) => {
    const result = await requestTrpc(
        "account.list",
        { limit: normalizeLimit(options.limit) },
        options
    );
    const items = Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : [];
    return {
        blocks: Array.isArray(result?.blocks) ? result.blocks.map(toText).filter(Boolean) : [],
        items: items.map(sanitizeAccount).filter(Boolean),
        nextCursor: toText(result?.nextCursor) || null,
    };
};

const addAccount = async ({ id, token, name, status = 1, ...options } = {}) => {
    const normalizedId = normalizeId(id, "读书账号 ID");
    const normalizedToken = toText(token);
    if (!normalizedToken) {
        throw createAdminError("读书账号令牌为空", "WEWE_RSS_ACCOUNT_TOKEN_EMPTY", 502);
    }
    const normalizedName = toText(name) || normalizedId;
    const result = await requestTrpc(
        "account.add",
        {
            id: normalizedId,
            token: normalizedToken,
            name: normalizedName,
            status: normalizeStatus(status),
        },
        { type: "mutation", ...options }
    );
    return sanitizeAccount(result);
};

const updateAccount = async (id, data = {}, options = {}) => {
    const normalizedId = normalizeId(id, "读书账号 ID");
    const update = {};
    if (data.name !== undefined) update.name = toText(data.name).slice(0, 1024);
    if (data.status !== undefined) update.status = normalizeStatus(data.status);
    if (!Object.keys(update).length) {
        throw createAdminError("没有可更新的读书账号字段", "WEWE_RSS_ACCOUNT_UPDATE_EMPTY", 400);
    }
    const result = await requestTrpc(
        "account.edit",
        { id: normalizedId, data: update },
        { type: "mutation", ...options }
    );
    return sanitizeAccount(result);
};

const deleteAccount = async (id, options = {}) => {
    const normalizedId = normalizeId(id, "读书账号 ID");
    await requestTrpc("account.delete", normalizedId, { type: "mutation", ...options });
    return { id: normalizedId, deleted: true };
};

const startLogin = async (options = {}) => {
    const result = await requestTrpc("platform.createLoginUrl", undefined, {
        type: "mutation",
        ...options,
    });
    const uuid = toText(result?.uuid);
    const scanUrl = toText(result?.scanUrl || result?.scan_url);
    if (!uuid || !scanUrl) {
        throw createAdminError("WeWe RSS 未返回有效的登录二维码", "WEWE_RSS_LOGIN_QR_INVALID", 502);
    }
    loginSessions.set(uuid, { cancelled: false, startedAt: Date.now() });
    return {
        active: true,
        stage: "waiting_for_scan",
        uuid,
        scan_url: scanUrl,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
};

const getLoginStatus = async (uuid, options = {}) => {
    const normalizedUuid = normalizeId(uuid, "登录会话 ID");
    const session = loginSessions.get(normalizedUuid);
    if (session?.cancelled) {
        return { active: false, stage: "cancelled", uuid: normalizedUuid, message: "登录已取消" };
    }
    const result = await requestTrpc(
        "platform.getLoginResult",
        { id: normalizedUuid },
        { type: "query", timeoutMs: LOGIN_TIMEOUT_MS, ...options }
    );
    const accountId = toText(result?.vid || result?.id);
    const token = toText(result?.token);
    if (accountId && token) {
        const account = await addAccount({
            id: accountId,
            token,
            name: toText(result?.username) || accountId,
            status: 1,
            ...options,
        });
        loginSessions.delete(normalizedUuid);
        return {
            active: false,
            stage: "saved",
            uuid: normalizedUuid,
            account,
            message: "登录成功，读书账号已保存",
        };
    }

    const message = toText(result?.message);
    const terminal = /过期|失效|expired|invalid|失败/i.test(message);
    return {
        active: !terminal,
        stage: terminal ? "failed" : "waiting_for_scan",
        uuid: normalizedUuid,
        message,
    };
};

const cancelLogin = (uuid) => {
    const normalizedUuid = normalizeId(uuid, "登录会话 ID");
    loginSessions.set(normalizedUuid, { cancelled: true, startedAt: Date.now() });
    return { active: false, stage: "cancelled", uuid: normalizedUuid, message: "登录已取消" };
};

const normalizeWechatArticleUrl = (value) => {
    const url = toText(value);
    if (!WECHAT_ARTICLE_URL_PATTERN.test(url)) {
        throw createAdminError(
            "公众号文章链接必须来自 mp.weixin.qq.com",
            "WEWE_RSS_INVALID_WECHAT_ARTICLE_URL",
            400
        );
    }
    return url;
};

const discoverFeed = async (wxsLink, options = {}) => {
    const result = await requestTrpc(
        "platform.getMpInfo",
        { wxsLink: normalizeWechatArticleUrl(wxsLink) },
        { type: "mutation", ...options }
    );
    const items = Array.isArray(result) ? result : [];
    return {
        items: items
            .map((item) => sanitizeFeed(item, normalizeManagementConfig(options).baseUrl))
            .filter(Boolean),
    };
};

const listFeeds = async (options = {}) => {
    const config = normalizeManagementConfig(options);
    const result = await requestTrpc(
        "feed.list",
        { limit: normalizeLimit(options.limit) },
        options
    );
    const items = Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : [];
    return {
        items: items.map((item) => sanitizeFeed(item, config.baseUrl)).filter(Boolean),
        nextCursor: toText(result?.nextCursor) || null,
    };
};

const normalizeFeedInput = (data = {}, { partial = false } = {}) => {
    const result = {};
    if (!partial || data.id !== undefined) result.id = normalizeFeedId(data.id);
    if (!partial || data.mpName !== undefined || data.mp_name !== undefined) {
        result.mpName = toText(data.mpName ?? data.mp_name).slice(0, 512);
    }
    if (!partial || data.mpCover !== undefined || data.mp_cover !== undefined) {
        result.mpCover = toText(data.mpCover ?? data.mp_cover).slice(0, 1024);
    }
    if (!partial || data.mpIntro !== undefined || data.mp_intro !== undefined) {
        result.mpIntro = toText(data.mpIntro ?? data.mp_intro).slice(0, 10000);
    }
    if (!partial || data.syncTime !== undefined || data.sync_time !== undefined) {
        result.syncTime = Math.max(0, Number(data.syncTime ?? data.sync_time) || 0);
    }
    if (!partial || data.updateTime !== undefined || data.update_time !== undefined) {
        result.updateTime = Math.max(
            0,
            Number(data.updateTime ?? data.update_time) || Math.floor(Date.now() / 1000)
        );
    }
    if (!partial || data.status !== undefined) result.status = normalizeStatus(data.status);
    if (!partial || data.hasHistory !== undefined || data.has_history !== undefined) {
        result.hasHistory = Number(data.hasHistory ?? data.has_history) ? 1 : 0;
    }
    if (!partial && !result.mpName) {
        throw createAdminError("订阅源名称不能为空", "WEWE_RSS_FEED_NAME_EMPTY", 400);
    }
    return result;
};

const addFeed = async (data = {}, options = {}) => {
    const payload = normalizeFeedInput(data);
    const result = await requestTrpc("feed.add", payload, { type: "mutation", ...options });
    return sanitizeFeed(result, normalizeManagementConfig(options).baseUrl);
};

const updateFeed = async (id, data = {}, options = {}) => {
    const normalizedId = normalizeFeedId(id);
    const payload = normalizeFeedInput(data, { partial: true });
    delete payload.id;
    if (!Object.keys(payload).length) {
        throw createAdminError("没有可更新的订阅源字段", "WEWE_RSS_FEED_UPDATE_EMPTY", 400);
    }
    const result = await requestTrpc(
        "feed.edit",
        { id: normalizedId, data: payload },
        { type: "mutation", ...options }
    );
    return sanitizeFeed(result, normalizeManagementConfig(options).baseUrl);
};

const deleteFeed = async (id, options = {}) => {
    const normalizedId = normalizeFeedId(id);
    await requestTrpc("feed.delete", normalizedId, { type: "mutation", ...options });
    return { id: normalizedId, deleted: true };
};

const refreshFeed = async (id, options = {}) => {
    const normalizedId = normalizeFeedId(id);
    await requestTrpc(
        "feed.refreshArticles",
        { mpId: normalizedId },
        { type: "mutation", ...options }
    );
    return { id: normalizedId, refreshed: true };
};

const refreshAllFeeds = async (options = {}) => {
    await requestTrpc("feed.refreshArticles", {}, { type: "mutation", ...options });
    return { refreshed: true };
};

const getRefreshStatus = async (options = {}) =>
    Boolean(await requestTrpc("feed.isRefreshAllMpArticlesRunning", undefined, options));

const listArticles = async ({ mpId, limit, cursor, ...options } = {}) => {
    const input = {
        limit: normalizeLimit(limit, 100),
        cursor: toText(cursor) || null,
        mpId: mpId ? normalizeFeedId(mpId) : null,
    };
    const result = await requestTrpc("article.list", input, options);
    const items = Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : [];
    return {
        items: items.map(sanitizeArticle).filter(Boolean),
        nextCursor: toText(result?.nextCursor) || null,
    };
};

const deleteArticle = async (id, options = {}) => {
    const normalizedId = normalizeId(id, "文章 ID");
    await requestTrpc("article.delete", normalizedId, { type: "mutation", ...options });
    return { id: normalizedId, deleted: true };
};

const startHistory = async (mpId, options = {}) => {
    const normalizedId = normalizeFeedId(mpId);
    await requestTrpc(
        "feed.getHistoryArticles",
        { mpId: normalizedId },
        { type: "mutation", ...options }
    );
    return { id: normalizedId, started: true };
};

const cancelHistory = async (options = {}) => {
    await requestTrpc("feed.getHistoryArticles", { mpId: "" }, { type: "mutation", ...options });
    return { cancelled: true };
};

const getHistoryStatus = async (options = {}) => {
    const result = await requestTrpc("feed.getInProgressHistoryMp", undefined, options);
    return {
        id: toText(result?.id),
        page: normalizePage(result?.page),
    };
};

const getOverview = async (options = {}) => {
    const config = normalizeManagementConfig(options);
    if (!config.authCode) {
        return {
            configured: false,
            base_url: config.baseUrl,
            accounts: { blocks: [], items: [], nextCursor: null },
            feeds: { items: [], nextCursor: null },
            refresh_running: false,
            history: { id: "", page: 1 },
        };
    }
    const [accounts, feeds, refreshRunning, history] = await Promise.all([
        listAccounts(options),
        listFeeds(options),
        getRefreshStatus(options),
        getHistoryStatus(options),
    ]);
    return {
        configured: true,
        base_url: config.baseUrl,
        accounts,
        feeds,
        refresh_running: refreshRunning,
        history,
    };
};

module.exports = {
    addAccount,
    addFeed,
    cancelHistory,
    cancelLogin,
    deleteAccount,
    deleteArticle,
    deleteFeed,
    discoverFeed,
    getHistoryStatus,
    getLoginStatus,
    getOverview,
    getRefreshStatus,
    listAccounts,
    listArticles,
    listFeeds,
    normalizeManagementConfig,
    refreshAllFeeds,
    refreshFeed,
    requestTrpc,
    sanitizeAccount,
    sanitizeArticle,
    sanitizeFeed,
    startHistory,
    startLogin,
    unwrapTrpcResponse,
    updateAccount,
    updateFeed,
};
