const { DEFAULT_PATH, normalizePath } = require("../../utils/webview");

const COPY = {
  kicker: "POSTER SAVE",
  title: "\u4fdd\u5b58\u6d77\u62a5",
  description: "\u6b63\u5728\u4f7f\u7528\u5fae\u4fe1\u5c0f\u7a0b\u5e8f\u539f\u751f\u80fd\u529b\u4fdd\u5b58 PNG \u6d77\u62a5\u5230\u76f8\u518c\u3002",
  save: "\u4fdd\u5b58\u5230\u76f8\u518c",
  saving: "\u4fdd\u5b58\u4e2d...",
  retry: "\u91cd\u8bd5\u4fdd\u5b58",
  back: "\u8fd4\u56de\u7f51\u9875",
  ready: "\u70b9\u51fb\u4fdd\u5b58\u5230\u76f8\u518c",
  downloading: "\u6b63\u5728\u51c6\u5907\u6d77\u62a5",
  saved: "\u5df2\u4fdd\u5b58\u5230\u76f8\u518c",
  failed: "\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5",
  noImage: "\u6d77\u62a5\u5730\u5740\u4e22\u5931\uff0c\u8bf7\u8fd4\u56de\u7f51\u9875\u91cd\u65b0\u751f\u6210\u3002",
  permissionTitle: "\u9700\u8981\u76f8\u518c\u6743\u9650",
  permissionContent: "\u8bf7\u5728\u8bbe\u7f6e\u4e2d\u5141\u8bb8\u4fdd\u5b58\u56fe\u7247\u5230\u76f8\u518c\u3002",
  openSettings: "\u53bb\u8bbe\u7f6e",
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

const isPermissionDenied = (error) => {
  const message = `${error?.errMsg || error?.message || ""}`;
  return message.includes("auth deny") || message.includes("authorize:fail") || message.includes("permission");
};

Page({
  data: {
    copy: COPY,
    imageUrl: "",
    fileName: "",
    returnPath: DEFAULT_PATH,
    status: "ready",
    isSaving: false,
    autoSave: false,
  },

  onLoad(options) {
    const imageUrl = cleanText(options?.imageUrl, "");
    const returnPath = normalizePath(cleanText(options?.returnPath, DEFAULT_PATH));
    const fileName = cleanText(options?.fileName, "tuotuzju-poster.png");

    wx.setNavigationBarTitle({ title: COPY.title });
    this.setData({
      imageUrl,
      fileName,
      returnPath,
      autoSave: options?.auto === "1",
      status: imageUrl ? "ready" : "failed",
    });
  },

  onReady() {
    if (this.data.autoSave && this.data.imageUrl) {
      setTimeout(() => this.savePoster(), 120);
    }
  },

  savePoster() {
    if (this.data.isSaving) return;
    if (!this.data.imageUrl) {
      wx.showToast({ title: COPY.noImage, icon: "none" });
      this.setData({ status: "failed" });
      return;
    }

    this.setData({ isSaving: true, status: "downloading" });
    wx.showLoading({ title: COPY.saving, mask: true });

    wx.downloadFile({
      url: this.data.imageUrl,
      success: (downloadResult) => {
        if (downloadResult.statusCode < 200 || downloadResult.statusCode >= 300 || !downloadResult.tempFilePath) {
          this.handleSaveFailure({ errMsg: `download status ${downloadResult.statusCode}` });
          return;
        }

        wx.saveImageToPhotosAlbum({
          filePath: downloadResult.tempFilePath,
          success: () => {
            wx.hideLoading();
            this.setData({ isSaving: false, status: "saved" });
            wx.showToast({ title: COPY.saved, icon: "success" });
          },
          fail: (error) => this.handleSaveFailure(error),
        });
      },
      fail: (error) => this.handleSaveFailure(error),
    });
  },

  handleSaveFailure(error) {
    wx.hideLoading();
    console.warn("[native-poster-save] save failed", error);
    this.setData({ isSaving: false, status: "failed" });

    if (isPermissionDenied(error)) {
      wx.showModal({
        title: COPY.permissionTitle,
        content: COPY.permissionContent,
        confirmText: COPY.openSettings,
        success: (result) => {
          if (result.confirm) {
            wx.openSetting({});
          }
        },
      });
      return;
    }

    wx.showToast({ title: COPY.failed, icon: "none" });
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
