const { DEFAULT_PATH, normalizePath } = require("../../utils/webview");
const {
  buildShareAppMessage,
  buildShareTimelineMessage,
  enableNativeShareMenu,
} = require("../../utils/share");

const COPY = {
  kicker: "WECHAT SHARE",
  title: "微信分享",
  description: "点击下方按钮，直接打开微信原生分享面板。",
  share: "发送给好友",
  back: "返回详情",
  fallbackTitle: "拓途浙享 | TUOTUZJU",
};

const decodeParam = (value) => {
  try {
    return decodeURIComponent(value || "");
  } catch (error) {
    return value || "";
  }
};

const cleanText = (value, fallback = "") => {
  const text = decodeParam(value).trim();
  return text || fallback;
};

Page({
  data: {
    copy: COPY,
    shareTitle: COPY.fallbackTitle,
    shareText: "",
    sharePath: DEFAULT_PATH,
    returnPath: DEFAULT_PATH,
    imageUrl: "",
  },

  onLoad(options) {
    const params = options || {};
    const sharePath = normalizePath(cleanText(params.path, DEFAULT_PATH));
    const returnPath = normalizePath(cleanText(params.returnPath, sharePath));
    const shareTitle = cleanText(params.title, COPY.fallbackTitle).slice(0, 80);
    const shareText = cleanText(params.text, "").slice(0, 180);
    const imageUrl = cleanText(params.imageUrl, "");

    enableNativeShareMenu();
    wx.setNavigationBarTitle({ title: COPY.title });
    this.setData({
      shareTitle,
      shareText,
      sharePath,
      returnPath,
      imageUrl,
    });
  },

  getSharePayload() {
    return {
      title: this.data.shareTitle,
      path: this.data.sharePath,
      imageUrl: this.data.imageUrl,
    };
  },

  onShareAppMessage() {
    return buildShareAppMessage(this.getSharePayload(), {
      shellPath: "/pages/webview/index",
    });
  },

  onShareTimeline() {
    return buildShareTimelineMessage(this.getSharePayload());
  },

  goBack() {
    const pages =
      typeof globalThis.getCurrentPages === "function"
        ? globalThis.getCurrentPages()
        : [];
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1,
        fail: () => this.openWebView(),
      });
      return;
    }
    this.openWebView();
  },

  openWebView() {
    wx.reLaunch({
      url: `/pages/webview/index?path=${encodeURIComponent(this.data.returnPath || DEFAULT_PATH)}`,
    });
  },
});
