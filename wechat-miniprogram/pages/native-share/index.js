const { WEB_ORIGIN, DEFAULT_PATH, normalizePath } = require("../../utils/webview");
const {
    buildShareAppMessage,
    buildShareTimelineMessage,
    enableNativeShareMenu,
    getProjectIdFromPath,
    sanitizeSharePayload,
} = require("../../utils/share");
const {
    COPY: PROJECT_SHARE_COPY,
    cleanText,
    normalizeProject,
    buildProjectState,
} = require("../../utils/projectShare");

const COPY = {
    ...PROJECT_SHARE_COPY,
    kicker: "MINI PROGRAM SHARE",
    loading: "正在读取项目介绍",
    failed: "项目介绍暂时加载失败，仍可分享此项目",
    shareNow: "分享给朋友",
    back: "返回项目详情",
};

const decodeOption = (value) => {
    const text = cleanText(value, "");
    if (!text) return "";
    try {
        return decodeURIComponent(text);
    } catch (error) {
        return text;
    }
};

Page({
    data: {
        copy: COPY,
        project: normalizeProject(),
        metaItems: [],
        tagSections: [],
        projectPath: DEFAULT_PATH,
        returnPath: DEFAULT_PATH,
        loading: false,
        failed: false,
    },

    fallbackProjectPayload: null,

    onLoad(options) {
        const params = options || {};
        const explicitProjectId = decodeOption(params.id);
        const rawPath = decodeOption(params.path);
        const projectPath = normalizePath(
            rawPath ||
                (explicitProjectId
                    ? `/projects?id=${encodeURIComponent(explicitProjectId)}`
                    : "/projects")
        );
        const returnPath = normalizePath(decodeOption(params.returnPath) || projectPath);
        const projectId = explicitProjectId || getProjectIdFromPath(projectPath);
        const fallbackPayload = sanitizeSharePayload({
            title: decodeOption(params.title) || PROJECT_SHARE_COPY.fallbackTitle,
            text: decodeOption(params.text) || PROJECT_SHARE_COPY.fallbackIntro,
            path: projectPath,
            imageUrl: decodeOption(params.imageUrl),
        });

        this.fallbackProjectPayload = {
            ...fallbackPayload,
            id: projectId,
        };

        enableNativeShareMenu();
        wx.setNavigationBarTitle({ title: "分享项目" });
        this.setData({
            projectPath,
            returnPath,
            ...buildProjectState(normalizeProject({}, this.fallbackProjectPayload), {
                loading: Boolean(projectId),
                failed: false,
            }),
        });

        if (projectId) this.fetchProject(projectId);
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
                this.setData(buildProjectState(project, { loading: false, failed: false }));
            },
            fail: (error) => {
                console.warn("[native-share] fetch project failed", error);
                this.setData({ loading: false, failed: true });
            },
        });
    },

    getSharePayload() {
        const project = this.data.project;
        return {
            title: project.title || PROJECT_SHARE_COPY.fallbackTitle,
            text: project.intro || PROJECT_SHARE_COPY.fallbackIntro,
            path: this.data.projectPath || DEFAULT_PATH,
            imageUrl: project.coverUrl || "",
        };
    },

    onShareAppMessage() {
        return buildShareAppMessage(this.getSharePayload(), {
            shellPath: "/pages/webview/index",
            projectShellPath: "/pages/index/index",
        });
    },

    onShareTimeline() {
        return buildShareTimelineMessage(this.getSharePayload());
    },

    goBack() {
        const pages =
            typeof globalThis.getCurrentPages === "function" ? globalThis.getCurrentPages() : [];
        if (pages.length > 1) {
            wx.navigateBack({ delta: 1, fail: () => this.openWebView() });
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
