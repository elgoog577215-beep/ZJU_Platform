const PRODUCTION_WEB_ORIGIN = "https://tuotuzju.com";
const LOCAL_WEB_ORIGIN = "http://10.195.244.93:5180";

// Toggle this to true only for local DevTools debugging. Release builds must use production.
const USE_LOCAL_WEB_ORIGIN = false;
const WEB_ORIGIN = USE_LOCAL_WEB_ORIGIN ? LOCAL_WEB_ORIGIN : PRODUCTION_WEB_ORIGIN;
const DEFAULT_PATH = "/events";
const WEBVIEW_CACHE_VERSION = "20260710_project_share_card";

const KNOWN_WEB_ORIGINS = Array.from(
    new Set([WEB_ORIGIN, LOCAL_WEB_ORIGIN, PRODUCTION_WEB_ORIGIN])
);

const ALLOWED_EXACT_PATHS = new Set([
    "/events",
    "/articles",
    "/projects",
    "/hackathon",
    "/about",
    "/profiles",
    "/media",
    "/gallery",
    "/videos",
]);

const ALLOWED_PREFIXES = [
    "/events/",
    "/articles/",
    "/projects/",
    "/hackathon/",
    "/profiles/",
    "/u/",
    "/org/",
    "/user/",
    "/media/",
    "/gallery/",
    "/videos/",
];

const BLOCKED_PREFIXES = ["/admin", "/download", "/app", "/api", "/uploads", "/downloads"];

const safeDecode = (value) => {
    try {
        return decodeURIComponent(value || "");
    } catch (error) {
        return value || "";
    }
};

const stripOrigin = (value) => {
    const text = safeDecode(String(value || "").trim());
    if (!text) return DEFAULT_PATH;
    const matchedOrigin = KNOWN_WEB_ORIGINS.find((origin) => text.startsWith(origin));
    if (matchedOrigin) {
        return text.slice(matchedOrigin.length) || DEFAULT_PATH;
    }
    if (/^https?:\/\//i.test(text)) return DEFAULT_PATH;
    return text;
};

const getPathname = (path) => {
    const clean = String(path || DEFAULT_PATH);
    const withoutHash = clean.split("#")[0];
    const withoutQuery = withoutHash.split("?")[0];
    return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
};

const isBlockedPath = (pathname) =>
    BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const isAllowedPath = (pathname) => {
    if (ALLOWED_EXACT_PATHS.has(pathname)) return true;
    return ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
};

const normalizePath = (input) => {
    const raw = stripOrigin(input);
    const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
    const pathname = getPathname(withSlash);

    if (isBlockedPath(pathname) || !isAllowedPath(pathname)) {
        return DEFAULT_PATH;
    }

    return withSlash;
};

const appendQueryParam = (path, key, value) => {
    const [beforeHash, hash = ""] = String(path).split("#");
    const [pathname, query = ""] = beforeHash.split("?");
    const params = query ? query.split("&").filter(Boolean) : [];
    const alreadySet = params.some((item) => item.split("=")[0] === key);
    if (!alreadySet) {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
    const nextQuery = params.length ? `?${params.join("&")}` : "";
    const nextHash = hash ? `#${hash}` : "";
    return `${pathname}${nextQuery}${nextHash}`;
};

const getMiniappNavInset = () => {
    try {
        const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        const screenHeight = Number((windowInfo && windowInfo.screenHeight) || 0);
        const windowHeight = Number((windowInfo && windowInfo.windowHeight) || 0);
        const windowDiff = Math.round(screenHeight - windowHeight);
        if (windowDiff > 40 && windowDiff < 180) {
            return windowDiff;
        }

        const statusBarHeight = Number((windowInfo && windowInfo.statusBarHeight) || 0);
        const menuButton = wx.getMenuButtonBoundingClientRect
            ? wx.getMenuButtonBoundingClientRect()
            : null;
        if (menuButton && statusBarHeight > 0) {
            const navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height;
            return Math.round(statusBarHeight + navBarHeight);
        }
    } catch (error) {
        console.warn("[tuotuzju-miniprogram] nav inset fallback", error);
    }

    return 112;
};

const buildWebViewUrl = (inputPath, options = {}) => {
    const targetOrigin = options.origin || WEB_ORIGIN;
    let path = normalizePath(inputPath);
    path = appendQueryParam(path, "miniapp", "1");
    path = appendQueryParam(path, "miniapp_nav_inset", String(getMiniappNavInset()));
    path = appendQueryParam(path, "miniapp_build", WEBVIEW_CACHE_VERSION);
    if (targetOrigin === LOCAL_WEB_ORIGIN) {
        path = appendQueryParam(path, "miniapp_debug_ts", String(Date.now()));
    }
    path = appendQueryParam(path, "utm_source", "wechat_miniprogram");
    return `${targetOrigin}${path}`;
};

module.exports = {
    WEB_ORIGIN,
    PRODUCTION_WEB_ORIGIN,
    LOCAL_WEB_ORIGIN,
    USE_LOCAL_WEB_ORIGIN,
    DEFAULT_PATH,
    WEBVIEW_CACHE_VERSION,
    buildWebViewUrl,
    normalizePath,
    isBlockedPath,
    isAllowedPath,
};
