Page({
  data: {
    redirect: "",
  },

  onLoad(options = {}) {
    this.setData({
      redirect: options.redirect || "",
    });
  },

  openHome() {
    wx.reLaunch({
      url: "/pages/webview/index",
    });
  },
});
