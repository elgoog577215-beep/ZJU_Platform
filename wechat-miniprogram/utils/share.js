const { DEFAULT_PATH, normalizePath } = require("./webview");

const SHARE_MESSAGE_TYPE = "tuotu:share";
const DEFAULT_SHARE_TITLE = "Tuotu ZJU";

const sanitizeText = (value, fallback = "", maxLength = 120) => {
  const text = String(value || "").trim();
  return (text || fallback).slice(0, maxLength);
};

const sanitizeImageUrl = (value) => {
  const text = String(value || "").trim();
  if (!/^https?:\/\//i.test(text)) return "";
  return text;
};

const sanitizeSharePayload = (payload = {}) => {
  const title = sanitizeText(payload.title, DEFAULT_SHARE_TITLE, 80);
  const path = normalizePath(payload.path || payload.url || DEFAULT_PATH);
  const imageUrl = sanitizeImageUrl(payload.imageUrl);
  return {
    title,
    path,
    imageUrl,
  };
};

const unwrapMessageItem = (item) => {
  if (!item) return null;
  if (item.type === SHARE_MESSAGE_TYPE) return item;
  if (item.data?.type === SHARE_MESSAGE_TYPE) return item.data;
  return null;
};

const pickSharePayloadFromEvent = (event) => {
  const items = event?.detail?.data;
  const list = Array.isArray(items) ? items : [items];
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const message = unwrapMessageItem(list[index]);
    if (message?.payload) {
      return sanitizeSharePayload(message.payload);
    }
  }
  return null;
};

const buildWebViewPagePath = (targetPath, shellPath = "/pages/webview/index") => {
  const path = normalizePath(targetPath || DEFAULT_PATH);
  return `${shellPath}?path=${encodeURIComponent(path)}`;
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
  const result = {
    title: payload.title,
    query: `path=${encodeURIComponent(payload.path)}`,
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
  buildShareTimelineMessage,
  enableNativeShareMenu,
};
