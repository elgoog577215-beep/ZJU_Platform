const {
    WEB_ORIGIN,
    PRODUCTION_WEB_ORIGIN,
    USE_LOCAL_WEB_ORIGIN,
    buildWebViewUrl,
    DEFAULT_PATH,
    normalizePath,
} = require("../../utils/webview");
const {
    pickSharePayloadFromEvent,
    buildShareAppMessage,
    buildShareTimelineMessage,
    enableNativeShareMenu,
} = require("../../utils/share");
const {
    COPY: PROJECT_SHARE_COPY,
    cleanText,
    normalizeProject,
    buildProjectState,
} = require("../../utils/projectShare");

const getNavigationTitle = () => {
    if (!USE_LOCAL_WEB_ORIGIN) return "拓途浙享 | TUOTUZJU";
    return "本地调试 | TUOTUZJU";
};

const applyNavigationTitle = () => {
    wx.setNavigationBarTitle({
        title: getNavigationTitle(),
    });
};

const LOCAL_DEBUG_LABEL = USE_LOCAL_WEB_ORIGIN
    ? `本地 WebView: ${WEB_ORIGIN.replace(/^https?:\/\//, "")}`
    : "";
const PROJECT_SHARE_MODE = "project-share";

Page({
    data: {
        isProjectShare: false,
        showWebView: false,
        src: "",
        displaySrc: "",
        debugLabel: LOCAL_DEBUG_LABEL,
        isLocalDebug: USE_LOCAL_WEB_ORIGIN,
        showWebViewStatus: false,
        loadState: "加载中",
        copy: PROJECT_SHARE_COPY,
        project: normalizeProject(),
        metaItems: [],
        tagSections: [],
        projectId: "",
        projectPath: DEFAULT_PATH,
        plazaPath: PROJECT_SHARE_COPY.plazaPath,
        loading: false,
        failed: false,
    },

    loadTimer: null,
    targetPath: DEFAULT_PATH,
    sharePayload: null,
    fallbackProjectPayload: null,

    onLoad(options) {
        const params = options || {};
        if (params.mode === PROJECT_SHARE_MODE) {
            this.loadProjectShare(params);
            return;
        }

        if (!params.path && !params.url) {
            enableNativeShareMenu();
            applyNavigationTitle();
            this.setData({
                showWebView: false,
                src: "",
                displaySrc: "",
                showWebViewStatus: false,
                loadState: "原生首页已就绪",
            });
            return;
        }

        this.targetPath = params.path || params.url || DEFAULT_PATH;
        enableNativeShareMenu();
        this.loadLocal();
        applyNavigationTitle();
    },

    onUnload() {
        this.clearLoadTimer();
    },

    clearLoadTimer() {
        if (!this.loadTimer) return;
        clearTimeout(this.loadTimer);
        this.loadTimer = null;
    },

    setWebViewSrc(src) {
        this.clearLoadTimer();
        console.info("[tuotuzju-miniprogram] index webview src", src);
        this.setData({
            showWebView: true,
            src,
            displaySrc: src,
            showWebViewStatus: false,
            loadState: "加载中",
        });

        this.loadTimer = setTimeout(() => {
            this.setData({
                showWebViewStatus: true,
                loadState: "仍在等待 WebView 渲染",
            });
        }, 5000);
    },

    loadLocal() {
        this.setWebViewSrc(buildWebViewUrl(this.targetPath));
    },

    loadProduction() {
        this.setWebViewSrc(buildWebViewUrl(this.targetPath, { origin: PRODUCTION_WEB_ORIGIN }));
    },

    copyCurrentUrl() {
        wx.setClipboardData({
            data: this.data.src || "",
        });
    },

    exitWebView() {
        wx.redirectTo({
            url: "/pages/fallback/index?reason=manual",
        });
    },

    loadProjectShare(params) {
        const projectId = cleanText(params.id, "");
        const projectPath = normalizePath(
            cleanText(
                params.path,
                projectId ? `/projects?id=${projectId}` : PROJECT_SHARE_COPY.plazaPath
            )
        );
        enableNativeShareMenu();
        this.targetPath = projectPath;
        this.setData({ isProjectShare: false, projectId, projectPath });
        this.loadLocal();
        applyNavigationTitle();
    },

    fetchProject(projectId) {
        wx.request({
            url: `${WEB_ORIGIN}/api/projects/${encodeURIComponent(projectId)}`,
            method: "GET",
            success: (response) => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    this.setData({ loading: false, failed: true });
                    return;
                }
                const project = normalizeProject(response.data, this.fallbackProjectPayload);
                wx.setNavigationBarTitle({ title: project.title });
                this.setData(buildProjectState(project, { loading: false, failed: false }));
            },
            fail: (error) => {
                console.warn("[project-share] fetch project failed", error);
                this.setData({ loading: false, failed: true });
            },
        });
    },

    getProjectSharePayload() {
        const project = this.data.project;
        return {
            title: project.title || PROJECT_SHARE_COPY.fallbackTitle,
            text: project.intro || PROJECT_SHARE_COPY.fallbackIntro,
            path: this.data.projectPath || DEFAULT_PATH,
            imageUrl: project.coverUrl || "",
        };
    },

    openDetail() {
        wx.navigateTo({
            url: `/pages/webview/index?path=${encodeURIComponent(this.data.projectPath || DEFAULT_PATH)}`,
        });
    },

    openPlaza() {
        wx.reLaunch({
            url: `/pages/webview/index?path=${encodeURIComponent(this.data.plazaPath)}`,
        });
    },

    openEvents() {
        wx.navigateTo({
            url: "/pages/webview/index?path=%2Fevents",
        });
    },

    handleLoad(event) {
        this.clearLoadTimer();
        console.info("[tuotuzju-miniprogram] index webview loaded", (event && event.detail) || {});
        this.setData({
            showWebViewStatus: false,
            loadState: "WebView 已触发 load",
        });
        applyNavigationTitle();
        setTimeout(applyNavigationTitle, 500);
    },

    handleError(event) {
        this.clearLoadTimer();
        console.error("[tuotuzju-miniprogram] index webview error", (event && event.detail) || {});
        wx.redirectTo({
            url: "/pages/fallback/index?reason=load",
        });
    },

    handleMessage(event) {
        const sharePayload = pickSharePayloadFromEvent(event);
        if (!sharePayload) return;
        this.sharePayload = sharePayload;
        console.info("[tuotuzju-miniprogram] index share payload updated", sharePayload);
    },

    getCurrentSharePayload(options = {}) {
        return (
            this.sharePayload || {
                title: "Tuotu ZJU",
                path: options.webViewUrl || this.targetPath || DEFAULT_PATH,
            }
        );
    },

    onShareAppMessage(options) {
        if (this.data.isProjectShare) {
            return buildShareAppMessage(this.getProjectSharePayload(options), {
                shellPath: "/pages/index/index",
                projectShellPath: "/pages/index/index",
            });
        }

        return buildShareAppMessage(this.getCurrentSharePayload(options), {
            shellPath: "/pages/index/index",
            projectShellPath: "/pages/index/index",
        });
    },

    onShareTimeline() {
        if (this.data.isProjectShare) {
            return buildShareTimelineMessage(this.getProjectSharePayload());
        }

        return buildShareTimelineMessage(this.getCurrentSharePayload());
    },
});
