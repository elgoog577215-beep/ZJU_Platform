const fs = require("node:fs/promises");
const path = require("node:path");
const {
    localizeWechatArticleImages,
    classifyWechatArticleContent,
} = require("./wechatMpAdminService");
const { sanitizeHtml, isTrustedArticleLink } = require("./wechatReadRssService");

const SOURCE_TYPE = "weread_mp";
const cacheRoot = () => process.env.WEREAD_CACHE_DIR || "/opt/we-mp-rss-trial/data/weread-live";
const normalizeFeedId = (id) => {
    if (!/^MP_WXS_\d+$/.test(String(id || ""))) throw new Error("无效的微信读书公众号 ID");
    return String(id);
};
const readFeed = async (id, root) => {
    try {
        return JSON.parse(
            await fs.readFile(path.join(root, `${normalizeFeedId(id)}.json`), "utf8")
        );
    } catch (error) {
        if (error.code === "ENOENT") throw new Error("微信读书采集尚未成功，请查看轮询状态");
        throw error;
    }
};
const fetchArticles = async ({ feedId, root = cacheRoot() } = {}) => {
    const feed = await readFeed(feedId, root);
    const articles = (feed.articles || [])
        .filter((a) => isTrustedArticleLink(a.link))
        .map((a) => ({
            ...a,
            create_time: a.published_at || "",
            time_text: a.published_at || "",
            collector_content_status: a.content_status,
            content_status: "not_fetched",
        }));
    return { articles, total: articles.length, checked_at: feed.checked_at };
};
const fetchArticleContent = async ({
    feedId,
    url,
    root = cacheRoot(),
    localize = localizeWechatArticleImages,
} = {}) => {
    const feed = await readFeed(feedId, root);
    const article = feed.articles.find((a) => a.link === url && a.content_status === "ready");
    if (!article || !/^[a-f0-9]{64}\.json$/.test(article.body_file || ""))
        throw new Error("微信读书正文尚未就绪");
    const body = JSON.parse(
        await fs.readFile(path.join(root, "bodies", article.body_file), "utf8")
    );
    const html = sanitizeHtml(body.content_html);
    // Preserve extracted images even when downloading is paused for disk pressure.
    let result = {
        title: article.title,
        author: feed.name,
        url,
        coverImage: article.cover,
        contentText: body.content_text || "",
        contentHtml: html,
        images: body.images || [],
    };
    const disk = await fs.statfs(root);
    if (disk.bavail * disk.bsize >= 512 * 1024 * 1024) result = await localize(result);
    const policy = classifyWechatArticleContent(result);
    return {
        ...result,
        content_status: policy.imageOnly ? "image_only" : result.contentText ? "fetched" : "empty",
    };
};
module.exports = { SOURCE_TYPE, normalizeFeedId, fetchArticles, fetchArticleContent };
