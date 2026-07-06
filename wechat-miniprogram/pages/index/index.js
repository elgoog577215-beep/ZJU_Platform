const {
  WEB_ORIGIN,
  PRODUCTION_WEB_ORIGIN,
  USE_LOCAL_WEB_ORIGIN,
  buildWebViewUrl,
  DEFAULT_PATH,
} = require("../../utils/webview");
const {
  pickSharePayloadFromEvent,
  buildShareAppMessage,
  buildShareTimelineMessage,
} = require("../../utils/share");

const getNavigationTitle = () => {
  if (!USE_LOCAL_WEB_ORIGIN) return "拓途浙享 | TUOTUZJU";
  return "本地调试 | TUOTUZJU";
};

const applyNavigationTitle = () => {
  wx.setNavigationBarTitle({
    title: getNavigationTitle(),
  });
};

const LOCAL_DEBUG_LABEL = USE_LOCAL_WEB_ORIGIN
  ? `本地 WebView: ${WEB_ORIGIN.replace(/^https?:\/\//, "")}`
  : "";

Page({
  data: {
    src: "",
    displaySrc: "",
    debugLabel: LOCAL_DEBUG_LABEL,
    isLocalDebug: USE_LOCAL_WEB_ORIGIN,
    loadState: "加载中",
  },

  loadTimer: null,
  targetPath: DEFAULT_PATH,
  sharePayload: null,

  onLoad(options) {
    const params = options || {};
    this.targetPath = params.path || params.url || DEFAULT_PATH;
    this.loadLocal();
    applyNavigationTitle();
  },

  onUnload() {
    this.clearLoadTimer();
  },

  clearLoadTimer() {
    if (!this.loadTimer) return;
    clearTimeout(this.loadTimer);
    this.loadTimer = null;
  },

  setWebViewSrc(src) {
    this.clearLoadTimer();
    console.info("[tuotuzju-miniprogram] index webview src", src);
    this.setData({
      src,
      displaySrc: src,
      loadState: "加载中",
    });

    this.loadTimer = setTimeout(() => {
      this.setData({
        loadState: "仍在等待 WebView 渲染",
      });
    }, 5000);
  },

  loadLocal() {
    this.setWebViewSrc(buildWebViewUrl(this.targetPath));
  },

  loadProduction() {
    this.setWebViewSrc(buildWebViewUrl(this.targetPath, { origin: PRODUCTION_WEB_ORIGIN }));
  },

  copyCurrentUrl() {
    wx.setClipboardData({
      data: this.data.src || "",
    });
  },

  exitWebView() {
    wx.redirectTo({
      url: "/pages/fallback/index?reason=manual",
    });
  },

  handleLoad(event) {
    this.clearLoadTimer();
    console.info("[tuotuzju-miniprogram] index webview loaded", (event && event.detail) || {});
    this.setData({
      loadState: "WebView 已触发 load",
    });
    applyNavigationTitle();
    setTimeout(applyNavigationTitle, 500);
  },

  handleError(event) {
    this.clearLoadTimer();
    console.error("[tuotuzju-miniprogram] index webview error", (event && event.detail) || {});
    wx.redirectTo({
      url: "/pages/fallback/index?reason=load",
    });
  },

  handleMessage(event) {
    const sharePayload = pickSharePayloadFromEvent(event);
    if (!sharePayload) return;
    this.sharePayload = sharePayload;
    console.info("[tuotuzju-miniprogram] index share payload updated", sharePayload);
  },

  getCurrentSharePayload(options = {}) {
    return this.sharePayload || {
      title: "Tuotu ZJU",
      path: options.webViewUrl || this.targetPath || DEFAULT_PATH,
    };
  },

  onShareAppMessage(options) {
    return buildShareAppMessage(this.getCurrentSharePayload(options), {
      shellPath: "/pages/index/index",
    });
  },

  onShareTimeline() {
    return buildShareTimelineMessage(this.getCurrentSharePayload());
  },
});
