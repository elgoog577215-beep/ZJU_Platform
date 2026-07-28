const { WEB_ORIGIN } = require("./webview");

const COPY = {
    kicker: "PROJECT SHARE",
    plazaPath: "/projects",
    fallbackTitle: "校园项目",
    fallbackIntro: "一个正在项目广场里生长的校园项目。",
    loading: "正在读取项目介绍",
    failed: "项目介绍暂时加载失败",
    viewDetail: "查看项目详情",
    openPlaza: "进入项目广场",
    shareAgain: "分享给朋友",
    owner: "发起人",
    progress: "项目进度",
    needs: "正在寻找",
    tech: "特点 / 技术栈",
    views: "浏览",
    likes: "收藏",
    anonymousOwner: "匿名发起人",
};

const PROGRESS_LABELS = {
    idea: "构思中",
    dev: "开发中",
    live: "已上线",
    pause: "暂停",
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

const titleInitials = (value) =>
    String(value || COPY.fallbackTitle)
        .trim()
        .slice(0, 2) || "项目";

const normalizeList = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== "string") return [];
    const text = value.trim();
    if (!text) return [];
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (error) {
        void error;
    }
    return text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
};

const resolveWebAssetUrl = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    if (text.startsWith("/")) return `${WEB_ORIGIN}${text}`;
    return text;
};

const normalizeProject = (raw = {}, fallback = {}) => {
    const project = raw.project || raw.data || raw;
    const title = project.title || project.name || fallback.title || COPY.fallbackTitle;
    const intro = project.intro || project.description || fallback.text || COPY.fallbackIntro;
    const coverUrl = resolveWebAssetUrl(
        project.cover_url ||
            project.coverUrl ||
            project.imageUrl ||
            project.thumbnail ||
            (Array.isArray(project.images) ? project.images[0] : "") ||
            fallback.imageUrl ||
            ""
    );
    const ownerName =
        project.owner_name ||
        project.ownerName ||
        project.author_name ||
        project.authorName ||
        project.owner ||
        COPY.anonymousOwner;
    const needTags = normalizeList(project.need_tags || project.needTags || project.needs);
    const techTags = normalizeList(project.tech_tags || project.techTags || project.tags);
    const progress = project.progress || fallback.progress || "idea";

    return {
        id: project.id || fallback.id || "",
        title,
        titleInitials: titleInitials(title),
        intro,
        coverUrl,
        ownerName,
        progress,
        progressLabel: PROGRESS_LABELS[progress] || progress || PROGRESS_LABELS.idea,
        needTags,
        techTags,
        views: Number(project.views || project.view_count || project.viewCount || 0),
        likes: Number(project.likes || project.like_count || project.likeCount || 0),
        hasCover: Boolean(coverUrl),
    };
};

const buildProjectViewModel = (project) => ({
    metaItems: [
        { id: "owner", label: COPY.owner, value: project.ownerName },
        { id: "progress", label: COPY.progress, value: project.progressLabel },
        { id: "views", label: COPY.views, value: project.views },
        { id: "likes", label: COPY.likes, value: project.likes },
    ],
    tagSections: [
        { id: "needs", label: COPY.needs, tone: "need", items: project.needTags },
        { id: "tech", label: COPY.tech, tone: "tech", items: project.techTags },
    ].filter((section) => section.items.length > 0),
});

const buildProjectState = (project, extras = {}) => ({
    project,
    ...buildProjectViewModel(project),
    ...extras,
});

module.exports = {
    COPY,
    cleanText,
    normalizeProject,
    buildProjectState,
};
