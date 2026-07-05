const { buildWebViewUrl, DEFAULT_PATH } = require("../../utils/webview");

Page({
  data: {
    src: "",
  },

  onLoad(options) {
    const params = options || {};
    const targetPath = params.path || params.url || DEFAULT_PATH;
    const src = buildWebViewUrl(targetPath);
    console.info("[tuotuzju-miniprogram] index webview onLoad", src);
    this.setData({ src });
  },

  handleLoad(event) {
    console.info("[tuotuzju-miniprogram] index webview loaded", (event && event.detail) || {});
  },

  handleError(event) {
    console.error("[tuotuzju-miniprogram] index webview error", (event && event.detail) || {});
    wx.redirectTo({
      url: "/pages/fallback/index?reason=load",
    });
  },

  onShareAppMessage() {
    return {
      title: "Tuotu ZJU",
      path: "/pages/index/index",
    };
  },
});
