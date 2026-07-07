const { DEFAULT_PATH, normalizePath } = require("../../utils/webview");
const {
  buildShareAppMessage,
  buildShareTimelineMessage,
  enableNativeShareMenu,
  sanitizeSharePayload,
} = require("../../utils/share");

const COPY = {
  kicker: "WECHAT SHARE",
  title: "\u5fae\u4fe1\u5206\u4eab",
  description: "\u70b9\u51fb\u4e0b\u65b9\u6309\u94ae\uff0c\u76f4\u63a5\u6253\u5f00\u5fae\u4fe1\u539f\u751f\u5206\u4eab\u9762\u677f\u3002",
  share: "\u53d1\u9001\u7ed9\u597d\u53cb",
  back: "\u8fd4\u56de\u8be6\u60c5",
  imagePreparing: "\u6b63\u5728\u51c6\u5907\u5206\u4eab\u5c01\u9762",
  imageReady: "\u5c01\u9762\u5df2\u51c6\u5907",
  imageFallback: "\u4f7f\u7528\u7f51\u7edc\u5c01\u9762",
  fallbackTitle: "\u62d3\u9014\u6d59\u4eab | TUOTUZJU",
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
    shareImageUrl: "",
    imageStatus: "idle",
  },

  onLoad(options) {
    const params = options || {};
    const sharePath = normalizePath(cleanText(params.path, DEFAULT_PATH));
    const returnPath = normalizePath(cleanText(params.returnPath, sharePath));
    const shareTitle = cleanText(params.title, COPY.fallbackTitle).slice(0, 80);
    const shareText = cleanText(params.text, "").slice(0, 180);
    const sharePayload = sanitizeSharePayload({
      title: shareTitle,
      path: sharePath,
      imageUrl: cleanText(params.imageUrl, ""),
    });

    enableNativeShareMenu();
    wx.setNavigationBarTitle({ title: COPY.title });
    this.setData({
      shareTitle,
      shareText,
      sharePath,
      returnPath,
      imageUrl: sharePayload.imageUrl,
      shareImageUrl: sharePayload.imageUrl,
      imageStatus: sharePayload.imageUrl ? "loading" : "idle",
    });

    this.prepareShareImage(sharePayload.imageUrl);
  },

  prepareShareImage(imageUrl) {
    if (!imageUrl || !wx.downloadFile) return;

    wx.downloadFile({
      url: imageUrl,
      success: (result) => {
        if (result.statusCode >= 200 && result.statusCode < 300 && result.tempFilePath) {
          this.setData({
            shareImageUrl: result.tempFilePath,
            imageStatus: "ready",
          });
          return;
        }
        this.setData({ imageStatus: "fallback" });
      },
      fail: (error) => {
        console.warn("[native-share] download share image failed", error);
        this.setData({ imageStatus: "fallback" });
      },
    });
  },

  getSharePayload() {
    return {
      title: this.data.shareTitle,
      path: this.data.sharePath,
      imageUrl: this.data.shareImageUrl || this.data.imageUrl,
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
