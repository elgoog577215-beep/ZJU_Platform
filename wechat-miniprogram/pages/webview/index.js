const { buildWebViewUrl, DEFAULT_PATH } = require("../../utils/webview");

Page({
  data: {
    src: "",
  },

  loadTimer: null,

  onLoad(options) {
    const params = options || {};
    const targetPath = params.path || params.url || DEFAULT_PATH;
    const src = buildWebViewUrl(targetPath);
    console.info("[tuotuzju-miniprogram] webview onLoad", src);
    this.setData({
      src,
    });

    this.loadTimer = setTimeout(() => {
      wx.redirectTo({
        url: "/pages/fallback/index?reason=timeout",
      });
    }, 8000);
  },

  onUnload() {
    this.clearLoadTimer();
  },

  clearLoadTimer() {
    if (!this.loadTimer) return;
    clearTimeout(this.loadTimer);
    this.loadTimer = null;
  },

  handleLoad() {
    this.clearLoadTimer();
  },

  handleError() {
    this.clearLoadTimer();
    wx.redirectTo({
      url: "/pages/fallback/index?reason=load",
    });
  },

  onShareAppMessage() {
    return {
      title: "Tuotu ZJU",
      path: "/pages/webview/index",
    };
  },
});
