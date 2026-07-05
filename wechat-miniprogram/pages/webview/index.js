const { buildWebViewUrl, DEFAULT_PATH } = require("../../utils/webview");

Page({
  data: {
    src: "",
  },

  onLoad(options = {}) {
    const targetPath = options.path || options.url || DEFAULT_PATH;
    this.setData({
      src: buildWebViewUrl(targetPath),
    });
  },

  handleError() {
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
