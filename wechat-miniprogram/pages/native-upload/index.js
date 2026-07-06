const { WEB_ORIGIN, DEFAULT_PATH, normalizePath } = require("../../utils/webview");

const COPY = {
  kicker: "NATIVE UPLOAD",
  title: "\u5c0f\u7a0b\u5e8f\u4e0a\u4f20",
  description: "\u8bf7\u9009\u62e9\u8981\u4e0a\u4f20\u7684\u6587\u4ef6\u3002\u4e0a\u4f20\u5b8c\u6210\u540e\u4f1a\u81ea\u52a8\u8fd4\u56de\u7f51\u9875\uff0c\u5e76\u4fdd\u7559\u5f53\u524d\u8868\u5355\u3002",
  choose: "\u9009\u62e9\u6587\u4ef6",
  retry: "\u91cd\u65b0\u9009\u62e9",
  back: "\u8fd4\u56de\u7f51\u9875",
  uploading: "\u4e0a\u4f20\u4e2d",
  completed: "\u5df2\u5b8c\u6210",
  missingToken: "\u7f3a\u5c11\u4e0a\u4f20\u51ed\u8bc1\uff0c\u8bf7\u8fd4\u56de\u7f51\u9875\u91cd\u8bd5",
  chooseFailed: "\u65e0\u6cd5\u6253\u5f00\u6587\u4ef6\u9009\u62e9\u5668",
  uploadFailed: "\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5",
  returning: "\u4e0a\u4f20\u6210\u529f\uff0c\u6b63\u5728\u8fd4\u56de\u7f51\u9875",
  sourceMedia: "\u76f8\u518c/\u62cd\u6444",
  sourceFile: "\u804a\u5929\u6587\u4ef6",
};

const decodeParam = (value) => {
  try {
    return decodeURIComponent(value || "");
  } catch (error) {
    return value || "";
  }
};

const getWebOrigin = () => getApp().globalData?.webOrigin || WEB_ORIGIN;

const formatWxError = (fallback, error) => {
  const message = error?.errMsg || error?.message || "";
  return message ? `${fallback}: ${message}` : fallback;
};

Page({
  data: {
    copy: COPY,
    sessionId: "",
    uploadToken: "",
    field: "file",
    accept: "*/*",
    redirect: DEFAULT_PATH,
    status: "idle",
    progress: 0,
    fileName: "",
    error: "",
    cancelSubmitted: false,
  },

  onLoad(options) {
    const params = options || {};
    const sessionId = String(params.sessionId || "");
    const uploadToken = String(params.uploadToken || "");
    const accept = decodeParam(params.accept || "*/*");

    this.setData({
      sessionId,
      uploadToken,
      field: params.field === "cover" ? "cover" : "file",
      accept,
      redirect: normalizePath(params.redirect || DEFAULT_PATH),
      error: !sessionId || !uploadToken ? COPY.missingToken : "",
    });
  },

  onUnload() {
    this.cancelSession();
  },

  chooseAndUpload() {
    if (!this.data.sessionId || !this.data.uploadToken || this.data.status === "uploading") {
      return;
    }

    this.setData({
      status: "choosing",
      progress: 0,
      fileName: "",
      error: "",
    });

    if (this.data.accept.startsWith("image/")) {
      this.chooseMedia(["image"]);
      return;
    }

    if (this.data.accept.startsWith("video/")) {
      this.chooseMedia(["video"]);
      return;
    }

    this.chooseFile();
  },

  chooseMedia(mediaType) {
    wx.chooseMedia({
      count: 1,
      mediaType,
      sourceType: ["album", "camera"],
      success: (result) => {
        const item = result.tempFiles?.[0];
        if (!item?.tempFilePath) {
          this.fail(COPY.chooseFailed);
          return;
        }
        this.uploadTempFile({
          path: item.tempFilePath,
          name: item.tempFilePath.split("/").pop() || COPY.sourceMedia,
          size: item.size || 0,
        });
      },
      fail: (error) => {
        if (error?.errMsg && error.errMsg.includes("cancel")) {
          this.setData({ status: "idle" });
          return;
        }
        console.error("[native-upload] chooseMedia failed", error);
        this.fail(formatWxError(COPY.chooseFailed, error));
      },
    });
  },

  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: "all",
      success: (result) => {
        const item = result.tempFiles?.[0];
        if (!item?.path) {
          this.fail(COPY.chooseFailed);
          return;
        }
        this.uploadTempFile({
          path: item.path,
          name: item.name || item.path.split("/").pop() || COPY.sourceFile,
          size: item.size || 0,
        });
      },
      fail: (error) => {
        if (error?.errMsg && error.errMsg.includes("cancel")) {
          this.setData({ status: "idle" });
          return;
        }
        console.error("[native-upload] chooseMessageFile failed", error);
        this.fail(formatWxError(COPY.chooseFailed, error));
      },
    });
  },

  uploadTempFile(file) {
    this.setData({
      status: "uploading",
      progress: 1,
      fileName: file.name,
      error: "",
    });

    const uploadTask = wx.uploadFile({
      url: `${getWebOrigin()}/api/upload/native`,
      filePath: file.path,
      name: this.data.field === "cover" ? "cover" : "file",
      header: {
        "X-Native-Upload-Token": this.data.uploadToken,
      },
      formData: {
        sessionId: this.data.sessionId,
      },
      success: (response) => {
        console.info("[native-upload] uploadFile response", response.statusCode, response.data);
        let body = {};
        try {
          body = JSON.parse(response.data || "{}");
        } catch (error) {
          body = {};
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          this.setData({
            status: "completed",
            progress: 100,
            error: COPY.returning,
          });
          setTimeout(() => this.goBack(), 700);
          return;
        }

        console.error("[native-upload] uploadFile non-2xx", response.statusCode, body, response.data);
        this.fail(body.error || body.message || COPY.uploadFailed);
      },
      fail: (error) => {
        console.error("[native-upload] uploadFile failed", error);
        this.fail(formatWxError(COPY.uploadFailed, error));
      },
    });

    if (uploadTask?.onProgressUpdate) {
      uploadTask.onProgressUpdate((event) => {
        this.setData({ progress: Math.max(1, event.progress || 1) });
      });
    }
  },

  fail(message) {
    this.setData({
      status: "failed",
      progress: 0,
      error: message || COPY.uploadFailed,
    });
  },

  goBack() {
    this.cancelSession();
    const pages = typeof getCurrentPages === "function" ? getCurrentPages() : [];
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
      url: `/pages/webview/index?path=${encodeURIComponent(this.data.redirect || DEFAULT_PATH)}`,
    });
  },

  cancelSession() {
    if (
      !this.data.uploadToken ||
      this.data.cancelSubmitted ||
      this.data.status === "completed"
    ) {
      return;
    }

    this.setData({ cancelSubmitted: true });
    wx.request({
      url: `${getWebOrigin()}/api/upload/native/cancel`,
      method: "POST",
      header: {
        "X-Native-Upload-Token": this.data.uploadToken,
      },
    });
  },
});
