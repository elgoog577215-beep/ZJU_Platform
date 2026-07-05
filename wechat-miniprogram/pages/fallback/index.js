Page({
  data: {
    reason: "load",
  },

  onLoad(options = {}) {
    this.setData({
      reason: options.reason || "load",
    });
  },

  openHome() {
    wx.reLaunch({
      url: "/pages/webview/index",
    });
  },
});
