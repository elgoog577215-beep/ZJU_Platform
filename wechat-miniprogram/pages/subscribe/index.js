Page({
  data: {
    eventId: "",
  },

  onLoad(options = {}) {
    this.setData({
      eventId: options.eventId || "",
    });
  },

  openHome() {
    wx.reLaunch({
      url: "/pages/webview/index",
    });
  },
});
