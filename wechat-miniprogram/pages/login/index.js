Page({
  data: {
    redirect: "",
  },

  onLoad(options) {
    const params = options || {};
    this.setData({
      redirect: params.redirect || "",
    });
  },

  openHome() {
    wx.reLaunch({
      url: "/pages/webview/index",
    });
  },
});
