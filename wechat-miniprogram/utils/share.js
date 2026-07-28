const { WEB_ORIGIN, DEFAULT_PATH, normalizePath } = require("./webview");

const SHARE_MESSAGE_TYPE = "tuotu:share";
const DEFAULT_SHARE_TITLE = "Tuotu ZJU";
const PROJECT_SHARE_SHELL_PATH = "/pages/index/index";

const sanitizeText = (value, fallback = "", maxLength = 120) => {
    const text = String(value || "").trim();
    return (text || fallback).slice(0, maxLength);
};

const sanitizeImageUrl = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    if (text.startsWith("/")) return `${WEB_ORIGIN}${text}`;
    return text;
};

const sanitizeSharePayload = (payload = {}) => {
    const title = sanitizeText(payload.title, DEFAULT_SHARE_TITLE, 80);
    const text = sanitizeText(payload.text, "", 180);
    const path = normalizePath(payload.path || payload.url || DEFAULT_PATH);
    const imageUrl = sanitizeImageUrl(payload.imageUrl);
    return {
        title,
        text,
        path,
        imageUrl,
    };
};

const getQueryParam = (path, key) => {
    const query =
        String(path || "")
            .split("#")[0]
            .split("?")[1] || "";
    const params = query.split("&").filter(Boolean);
    for (const item of params) {
        const [rawKey, ...rest] = item.split("=");
        if (decodeURIComponent(rawKey || "") === key) {
            return decodeURIComponent(rest.join("=") || "");
        }
    }
    return "";
};

const getProjectIdFromPath = (path) => {
    const text = String(path || "");
    const pathname = text.split("#")[0].split("?")[0];
    if (pathname !== "/projects") return "";
    return getQueryParam(text, "id");
};

const unwrapMessageItem = (item) => {
    if (!item) return null;
    if (item.type === SHARE_MESSAGE_TYPE) return item;
    if (item.data && item.data.type === SHARE_MESSAGE_TYPE) return item.data;
    return null;
};

const pickSharePayloadFromEvent = (event) => {
    const items = event && event.detail ? event.detail.data : undefined;
    const list = Array.isArray(items) ? items : [items];
    for (let index = list.length - 1; index >= 0; index -= 1) {
        const message = unwrapMessageItem(list[index]);
        if (message && message.payload) {
            return sanitizeSharePayload(message.payload);
        }
    }
    return null;
};

const buildWebViewPagePath = (targetPath, shellPath = "/pages/webview/index") => {
    const path = normalizePath(targetPath || DEFAULT_PATH);
    return `${shellPath}?path=${encodeURIComponent(path)}`;
};

const buildProjectSharePagePath = (sharePayload, shellPath = PROJECT_SHARE_SHELL_PATH) => {
    const payload = sanitizeSharePayload(sharePayload);
    const projectId = getProjectIdFromPath(payload.path);
    if (!projectId) return "";

    const query = [
        ["mode", "project-share"],
        ["id", projectId],
        ["title", payload.title],
        ["text", payload.text],
        ["path", payload.path],
        ["imageUrl", payload.imageUrl],
    ]
        .filter(([, value]) => value)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&");

    return `${shellPath}?${query}`;
};

const buildShareAppMessage = (sharePayload, options = {}) => {
    const payload = sanitizeSharePayload(sharePayload);
    const result = {
        title: payload.title,
        path: buildWebViewPagePath(payload.path, options.shellPath),
    };
    if (payload.imageUrl) {
        result.imageUrl = payload.imageUrl;
    }
    return result;
};

const buildShareTimelineMessage = (sharePayload) => {
    const payload = sanitizeSharePayload(sharePayload);
    const projectSharePath = buildProjectSharePagePath(payload, "");
    const projectQuery = projectSharePath.startsWith("?") ? projectSharePath.slice(1) : "";
    const result = {
        title: payload.title,
        query: projectQuery || `path=${encodeURIComponent(payload.path)}`,
    };
    if (payload.imageUrl) {
        result.imageUrl = payload.imageUrl;
    }
    return result;
};

const enableNativeShareMenu = () => {
    if (typeof wx === "undefined" || !wx.showShareMenu) return;
    wx.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"],
    });
};

module.exports = {
    SHARE_MESSAGE_TYPE,
    sanitizeSharePayload,
    pickSharePayloadFromEvent,
    buildShareAppMessage,
    buildProjectSharePagePath,
    buildShareTimelineMessage,
    enableNativeShareMenu,
    getProjectIdFromPath,
};
