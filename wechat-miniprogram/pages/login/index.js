const { WEB_ORIGIN, DEFAULT_PATH, normalizePath } = require("../../utils/webview");

const appendQueryParam = (path, key, value) => {
  const [beforeHash, hash = ""] = String(path || DEFAULT_PATH).split("#");
  const [pathname, query = ""] = beforeHash.split("?");
  const encodedKey = encodeURIComponent(key);
  const encodedValue = encodeURIComponent(value);
  const params = query
    ? query.split("&").filter((item) => item && item.split("=")[0] !== encodedKey)
    : [];
  params.push(`${encodedKey}=${encodedValue}`);
  const nextQuery = params.join("&");
  return `${pathname || DEFAULT_PATH}${nextQuery ? `?${nextQuery}` : ""}${hash ? `#${hash}` : ""}`;
};

Page({
  data: {
    redirect: DEFAULT_PATH,
    loading: false,
    error: "",
  },

  onLoad(options) {
    const params = options || {};
    this.setData({
      redirect: normalizePath(params.redirect || DEFAULT_PATH),
    });
  },

  handleWechatLogin() {
    if (this.data.loading) return;

    this.setData({ loading: true, error: "" });
    wx.showLoading({ title: "登录中", mask: true });

    wx.login({
      timeout: 10000,
      success: (result) => {
        if (!result.code) {
          this.failLogin("未获取到微信登录凭证，请重试");
          return;
        }
        this.exchangeLoginCode(result.code);
      },
      fail: () => {
        this.failLogin("微信登录授权失败，请重试");
      },
    });
  },

  exchangeLoginCode(code) {
    const app = getApp();
    const webOrigin = app.globalData?.webOrigin || WEB_ORIGIN;

    wx.request({
      url: `${webOrigin}/api/auth/wechat-miniapp/login`,
      method: "POST",
      header: {
        "content-type": "application/json",
      },
      data: {
        code,
      },
      success: (response) => {
        const token = response.data?.token;
        if (response.statusCode >= 200 && response.statusCode < 300 && token) {
          this.openWebViewWithToken(token);
          return;
        }

        this.failLogin(response.data?.error || "微信登录暂不可用，请稍后重试");
      },
      fail: () => {
        this.failLogin("无法连接登录服务，请稍后重试");
      },
      complete: () => {
        wx.hideLoading();
      },
    });
  },

  openWebViewWithToken(token) {
    let targetPath = appendQueryParam(this.data.redirect || DEFAULT_PATH, "wechat_login_token", token);
    targetPath = appendQueryParam(targetPath, "miniapp", "1");

    wx.reLaunch({
      url: `/pages/webview/index?path=${encodeURIComponent(targetPath)}`,
      fail: () => {
        this.failLogin("登录成功，但返回网页失败，请重新打开小程序");
      },
    });
  },

  failLogin(message) {
    wx.hideLoading();
    this.setData({
      loading: false,
      error: message,
    });
  },

  openHome() {
    wx.reLaunch({
      url: "/pages/webview/index",
    });
  },
});
