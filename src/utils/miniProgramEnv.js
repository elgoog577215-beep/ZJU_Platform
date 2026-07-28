const MINI_PROGRAM_SESSION_KEY = "tuotu:wechat-miniapp-webview";
const MINI_PROGRAM_QUERY_KEY = "miniapp";
const MINI_PROGRAM_NAV_INSET_QUERY_KEY = "miniapp_nav_inset";

const BLOCKED_PATH_PREFIXES = ["/admin", "/download", "/app", "/api", "/uploads", "/downloads"];

const hasMiniProgramQuery = () => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search || "");
    return params.get(MINI_PROGRAM_QUERY_KEY) === "1";
};

const hasMiniProgramReferrer = () => {
    if (typeof document === "undefined") return false;
    const referrer = document.referrer || "";
    return /servicewechat\.com/i.test(referrer);
};

const hasMiniProgramRuntimeFlag = () => {
    if (typeof window === "undefined") return false;
    return window.__wxjs_environment === "miniprogram";
};

const getStoredMiniProgramMode = () => {
    if (typeof window === "undefined") return false;
    try {
        return window.sessionStorage.getItem(MINI_PROGRAM_SESSION_KEY) === "1";
    } catch {
        return false;
    }
};

const storeMiniProgramMode = () => {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(MINI_PROGRAM_SESSION_KEY, "1");
    } catch {
        /* sessionStorage can be unavailable in restricted WebViews */
    }
};

export const isMiniProgramSignalPresent = () =>
    hasMiniProgramQuery() || hasMiniProgramReferrer() || hasMiniProgramRuntimeFlag();

export const rememberMiniProgramWebView = () => {
    const detected = isMiniProgramSignalPresent();
    if (detected) {
        storeMiniProgramMode();
        return true;
    }
    return getStoredMiniProgramMode();
};

export const isMiniProgramWebView = () =>
    isMiniProgramSignalPresent() || getStoredMiniProgramMode();

export const getMiniProgramNavInset = () => {
    if (typeof window === "undefined") return 0;
    const params = new URLSearchParams(window.location.search || "");
    const value = Number.parseInt(params.get(MINI_PROGRAM_NAV_INSET_QUERY_KEY) || "", 10);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(value, 180));
};

export const isMiniProgramBlockedPath = (pathname = "") => {
    const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
    return BLOCKED_PATH_PREFIXES.some(
        (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
    );
};

export const toMiniProgramPath = (path = "/events") => {
    const [pathAndQuery, hash = ""] = path.split("#");
    const [pathname, query = ""] = pathAndQuery.split("?");
    const params = new URLSearchParams(query);
    params.set(MINI_PROGRAM_QUERY_KEY, "1");
    const navInset = getMiniProgramNavInset();
    if (navInset > 0) {
        params.set(MINI_PROGRAM_NAV_INSET_QUERY_KEY, String(navInset));
    }
    const nextQuery = params.toString();
    return `${pathname || "/events"}${nextQuery ? `?${nextQuery}` : ""}${hash ? `#${hash}` : ""}`;
};
