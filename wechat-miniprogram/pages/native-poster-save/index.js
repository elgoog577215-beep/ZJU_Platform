const { DEFAULT_PATH, normalizePath } = require("../../utils/webview");

const COPY = {
  kickerSave: "POSTER SAVE",
  kickerShare: "POSTER SHARE",
  saveTitle: "\u4fdd\u5b58\u6d77\u62a5",
  shareTitle: "\u5206\u4eab\u6d77\u62a5",
  saveDescription: "\u6b63\u5728\u4f7f\u7528\u5fae\u4fe1\u5c0f\u7a0b\u5e8f\u539f\u751f\u80fd\u529b\u4fdd\u5b58 PNG \u6d77\u62a5\u5230\u76f8\u518c\u3002",
  shareDescription: "\u6b63\u5728\u4f7f\u7528\u5fae\u4fe1\u56fe\u7247\u5206\u4eab\u9762\u677f\u53d1\u9001\u8fd9\u5f20\u6d77\u62a5\u3002",
  save: "\u4fdd\u5b58\u5230\u76f8\u518c",
  share: "\u5206\u4eab\u6d77\u62a5",
  saving: "\u4fdd\u5b58\u4e2d...",
  sharing: "\u5206\u4eab\u4e2d...",
  retrySave: "\u91cd\u8bd5\u4fdd\u5b58",
  retryShare: "\u91cd\u8bd5\u5206\u4eab",
  back: "\u8fd4\u56de\u7f51\u9875",
  saveReady: "\u70b9\u51fb\u4fdd\u5b58\u5230\u76f8\u518c",
  shareReady: "\u70b9\u51fb\u5206\u4eab\u6d77\u62a5",
  downloading: "\u6b63\u5728\u51c6\u5907\u6d77\u62a5",
  saved: "\u5df2\u4fdd\u5b58\u5230\u76f8\u518c",
  sharePanelOpened: "\u5df2\u6253\u5f00\u5fae\u4fe1\u56fe\u7247\u5206\u4eab",
  saveFailed: "\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5",
  shareFailed: "\u5206\u4eab\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u6216\u5148\u4fdd\u5b58\u6d77\u62a5",
  noImage: "\u6d77\u62a5\u5730\u5740\u4e22\u5931\uff0c\u8bf7\u8fd4\u56de\u7f51\u9875\u91cd\u65b0\u751f\u6210\u3002",
  imageShareUnavailable: "\u5f53\u524d\u5fae\u4fe1\u7248\u672c\u6682\u4e0d\u652f\u6301\u76f4\u63a5\u5206\u4eab\u56fe\u7247\uff0c\u53ef\u5148\u4fdd\u5b58\u5230\u76f8\u518c\u540e\u53d1\u9001\u3002",
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
    pageCopy: {},
    imageUrl: "",
    fileName: "",
    returnPath: DEFAULT_PATH,
    action: "save",
    status: "ready",
    isBusy: false,
    auto: false,
    tempFilePath: "",
  },

  onLoad(options) {
    const imageUrl = cleanText(options?.imageUrl, "");
    const returnPath = normalizePath(cleanText(options?.returnPath, DEFAULT_PATH));
    const fileName = cleanText(options?.fileName, "tuotuzju-poster.png");
    const action = options?.action === "share" ? "share" : "save";
    const pageCopy = this.getPageCopy(action);

    wx.setNavigationBarTitle({
      title: pageCopy.title,
    });
    this.setData({
      imageUrl,
      fileName,
      returnPath,
      action,
      pageCopy,
      auto: options?.auto === "1",
      status: imageUrl ? "ready" : "failed",
    });
  },

  onReady() {
    if (!this.data.auto || !this.data.imageUrl) return;
    setTimeout(() => {
      if (this.data.action === "share") {
        this.sharePoster();
        return;
      }
      this.savePoster();
    }, 120);
  },

  getPageCopy(action = this.data.action) {
    const isShare = action === "share";
    return {
      kicker: isShare ? COPY.kickerShare : COPY.kickerSave,
      title: isShare ? COPY.shareTitle : COPY.saveTitle,
      description: isShare ? COPY.shareDescription : COPY.saveDescription,
      ready: isShare ? COPY.shareReady : COPY.saveReady,
      busy: isShare ? COPY.sharing : COPY.saving,
      failed: isShare ? COPY.shareFailed : COPY.saveFailed,
      primary: isShare ? COPY.share : COPY.save,
      retry: isShare ? COPY.retryShare : COPY.retrySave,
    };
  },

  preparePosterFile(onReady, onFail) {
    if (this.data.isBusy) return;
    if (!this.data.imageUrl) {
      wx.showToast({ title: COPY.noImage, icon: "none" });
      this.setData({ status: "failed" });
      return;
    }

    if (this.data.tempFilePath) {
      this.setData({ isBusy: true });
      onReady(this.data.tempFilePath);
      return;
    }

    this.setData({ isBusy: true, status: "downloading" });
    wx.showLoading({ title: COPY.downloading, mask: true });

    wx.downloadFile({
      url: this.data.imageUrl,
      success: (downloadResult) => {
        if (downloadResult.statusCode < 200 || downloadResult.statusCode >= 300 || !downloadResult.tempFilePath) {
          onFail({ errMsg: `download status ${downloadResult.statusCode}` });
          return;
        }

        this.setData({ tempFilePath: downloadResult.tempFilePath });
        onReady(downloadResult.tempFilePath);
      },
      fail: onFail,
    });
  },

  savePoster() {
    this.preparePosterFile(
      (filePath) => {
        wx.showLoading({ title: COPY.saving, mask: true });
        wx.saveImageToPhotosAlbum({
          filePath,
          success: () => {
            wx.hideLoading();
            this.setData({ isBusy: false, status: "saved" });
            wx.showToast({ title: COPY.saved, icon: "success" });
          },
          fail: (error) => this.handleFailure(error, "save"),
        });
      },
      (error) => this.handleFailure(error, "save"),
    );
  },

  sharePoster() {
    if (typeof wx.showShareImageMenu !== "function") {
      this.setData({ status: "failed" });
      wx.showToast({ title: COPY.imageShareUnavailable, icon: "none" });
      return;
    }

    this.preparePosterFile(
      (filePath) => {
        wx.showLoading({ title: COPY.sharing, mask: true });
        wx.showShareImageMenu({
          path: filePath,
          success: () => {
            wx.hideLoading();
            this.setData({ isBusy: false, status: "shared" });
            wx.showToast({ title: COPY.sharePanelOpened, icon: "success" });
          },
          fail: (error) => this.handleFailure(error, "share"),
        });
      },
      (error) => this.handleFailure(error, "share"),
    );
  },

  handlePrimaryAction() {
    if (this.data.action === "share") {
      this.sharePoster();
      return;
    }
    this.savePoster();
  },

  handleFailure(error, action) {
    wx.hideLoading();
    console.warn("[native-poster-save] poster action failed", action, error);
    this.setData({ isBusy: false, status: "failed" });

    if (action === "save" && isPermissionDenied(error)) {
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

    wx.showToast({ title: action === "share" ? COPY.shareFailed : COPY.saveFailed, icon: "none" });
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
