Page({
  data: {
    webOrigin: "https://tuotuzju.com",
  },

  openEvents() {
    wx.navigateTo({
      url: "/pages/webview/index?path=%2Fevents",
    });
  },

  openProjects() {
    wx.navigateTo({
      url: "/pages/webview/index?path=%2Fprojects",
    });
  },

  openFallback() {
    wx.navigateTo({
      url: "/pages/fallback/index?reason=diagnostic",
    });
  },
});
