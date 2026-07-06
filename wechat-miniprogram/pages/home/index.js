const { WEB_ORIGIN } = require("../../utils/webview");

Page({
  data: {
    webOrigin: WEB_ORIGIN,
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
