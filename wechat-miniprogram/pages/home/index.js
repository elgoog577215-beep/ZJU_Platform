Page({
  data: {
    webOrigin: "https://tuotuzju.com",
  },

  openEvents() {
    wx.navigateTo({
      url: "/pages/webview/index?path=%2Fevents",
    });
  },

  openFallback() {
    wx.navigateTo({
      url: "/pages/fallback/index?reason=diagnostic",
    });
  },
});
