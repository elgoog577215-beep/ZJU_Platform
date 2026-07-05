const { buildWebViewUrl, DEFAULT_PATH } = require("../../utils/webview");

Page({
  data: {
    src: "",
  },

  loadTimer: null,

  onLoad(options = {}) {
    const targetPath = options.path || options.url || DEFAULT_PATH;
    this.setData({
      src: buildWebViewUrl(targetPath),
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
      title: "拓途浙享",
      path: "/pages/webview/index",
    };
  },
});
