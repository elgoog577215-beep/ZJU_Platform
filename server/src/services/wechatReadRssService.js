const axios = require("axios");
const cheerio = require("cheerio");

const { cleanWeChatUrl } = require("../utils/wechatUrl");

const SOURCE_TYPE = "wewe_rss";
const DEFAULT_BASE_URL = "https://rss.tuotuzju.com";
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_FEED_BYTES = 16 * 1024 * 1024;
const FEED_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const FEED_TYPES = new Set(["atom", "rss"]);

const toText = (value) => String(value || "").trim();

const createRssError = (message, code = "WEWE_RSS_REQUEST_FAILED", status = 502) => {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
};

const normalizeFeedId = (value) => {
    const feedId = toText(value);
    if (!feedId || !FEED_ID_PATTERN.test(feedId)) {
        throw createRssError(
            "WeWe RSS feed ID 只能包含字母、数字、下划线和连字符",
            "WEWE_RSS_INVALID_FEED_ID",
            400
        );
    }
    return feedId;
};

const normalizeBaseUrl = (value = process.env.WEWE_RSS_BASE_URL || DEFAULT_BASE_URL) => {
    const raw = toText(value) || DEFAULT_BASE_URL;
    let url;
    try {
        url = new URL(raw);
    } catch {
        throw createRssError("WeWe RSS 基地址无效", "WEWE_RSS_INVALID_BASE_URL", 500);
    }
    if (url.protocol !== "https:") {
        throw createRssError("WeWe RSS 基地址必须使用 HTTPS", "WEWE_RSS_INVALID_BASE_URL", 500);
    }
    if (url.username || url.password || url.search || url.hash) {
        throw createRssError(
            "WeWe RSS 基地址不能包含凭据、查询参数或 hash",
            "WEWE_RSS_INVALID_BASE_URL",
            500
        );
    }
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString().replace(/\/$/, "");
};

const buildFeedUrl = ({
    feedId,
    baseUrl,
    type = "atom",
    limit = 20,
    page = 1,
    mode = "fulltext",
} = {}) => {
    const normalizedFeedId = normalizeFeedId(feedId);
    const normalizedType = FEED_TYPES.has(String(type || "").toLowerCase())
        ? String(type).toLowerCase()
        : "atom";
    const url = new URL(normalizeBaseUrl(baseUrl));
    const basePath = url.pathname.replace(/\/+$/, "");
    url.pathname = `${basePath}/feeds/${encodeURIComponent(normalizedFeedId)}.${normalizedType}`;
    url.search = "";
    url.searchParams.set("limit", String(Math.min(Math.max(Number(limit) || 20, 1), 100)));
    url.searchParams.set("page", String(Math.min(Math.max(Number(page) || 1, 1), 20)));
    if (toText(mode)) url.searchParams.set("mode", toText(mode));
    return url.toString();
};

const childByName = ($, node, names = []) => {
    const expected = new Set(names.map((name) => String(name || "").toLowerCase()));
    return $(node)
        .children()
        .filter((_, child) => expected.has(String(child.name || "").toLowerCase()))
        .first();
};

const childText = ($, node, names = []) => toText(childByName($, node, names).text());

const firstHttpUrl = (value, baseUrl = "") => {
    const text = toText(value);
    if (!text) return "";
    try {
        const url = new URL(text.startsWith("//") ? `https:${text}` : text, baseUrl || undefined);
        return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
    } catch {
        return "";
    }
};

const isTrustedArticleLink = (value) => {
    try {
        return new URL(value).hostname.toLowerCase() === "mp.weixin.qq.com";
    } catch {
        return false;
    }
};

const readFeedLink = ($, node) => {
    const links = $(node)
        .children()
        .filter((_, child) => String(child.name || "").toLowerCase() === "link")
        .toArray();
    const candidates = links
        .map((link) => ({
            rel: toText($(link).attr("rel")).toLowerCase(),
            value: firstHttpUrl($(link).attr("href") || $(link).text()),
        }))
        .filter((item) => item.value);
    return (
        candidates.find((item) => item.rel === "alternate")?.value ||
        candidates.find((item) => !item.rel || item.rel === "related")?.value ||
        candidates[0]?.value ||
        ""
    );
};

const readFeedAuthor = ($, node) => {
    const author = childByName($, node, ["author"]);
    return (
        childText($, author, ["name"]) || childText($, node, ["dc:creator", "creator", "author"])
    );
};

const readFeedImage = ($, node, baseUrl = "") => {
    const imageNodes = $(node)
        .children()
        .filter((_, child) =>
            ["image", "media:content", "media:thumbnail", "enclosure"].includes(
                String(child.name || "").toLowerCase()
            )
        )
        .toArray();
    for (const imageNode of imageNodes) {
        const image = firstHttpUrl(
            $(imageNode).attr("url") ||
                $(imageNode).attr("href") ||
                $(imageNode).attr("src") ||
                $(imageNode).text(),
            baseUrl
        );
        if (image) return image;
    }
    return "";
};

const sanitizeHtml = (html) => {
    const source = toText(html);
    if (!source || !source.includes("<")) return "";
    const $ = cheerio.load(source, { decodeEntities: false });
    $("script,style,iframe,object,embed,form,noscript").remove();
    $("*").each((_, element) => {
        const attributes = element.attribs || {};
        Object.keys(attributes).forEach((name) => {
            const value = toText(attributes[name]);
            if (/^on/i.test(name) || /^javascript:/i.test(value)) {
                $(element).removeAttr(name);
            }
        });
    });
    const body = $("body").first();
    return toText(body.length ? body.html() : $.root().html());
};

const htmlToText = (html) => {
    const sanitized = sanitizeHtml(html);
    if (!sanitized) return toText(html);
    const $ = cheerio.load(sanitized, { decodeEntities: true });
    $("script,style,noscript").remove();
    const root = $(".rich_media_content").first().length
        ? $(".rich_media_content").first()
        : $.root();
    const clone = root.clone();
    clone.find("br").replaceWith("\n");
    clone.find("p,li,h1,h2,h3,h4,h5,h6,blockquote").each((_, element) => {
        $(element).prepend("\n").append("\n");
    });
    return clone
        .text()
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
};

const extractContentImages = (html, baseUrl = "") => {
    const source = sanitizeHtml(html);
    if (!source) return [];
    const $ = cheerio.load(source, { decodeEntities: true });
    const images = [];
    $("img").each((_, element) => {
        const image = firstHttpUrl(
            $(element).attr("data-src") ||
                $(element).attr("data-original") ||
                $(element).attr("src"),
            baseUrl
        );
        if (image && !images.includes(image)) images.push(image);
    });
    return images;
};

const readContent = ($, node, baseUrl = "") => {
    const contentNode = childByName($, node, [
        "content",
        "content:encoded",
        "description",
        "summary",
    ]);
    const rawContent = toText(contentNode.text());
    const contentHtml = sanitizeHtml(rawContent);
    const contentText = contentHtml ? htmlToText(contentHtml) : rawContent;
    const images = extractContentImages(contentHtml, baseUrl);
    return {
        contentHtml,
        contentText,
        images,
    };
};

const normalizeSummary = (value) => {
    const text = toText(value);
    return text.includes("<") ? htmlToText(text) : text;
};

const parseFeed = (xml, { baseUrl = "" } = {}) => {
    const source = String(xml || "").trim();
    if (!source) throw createRssError("WeWe RSS feed 响应为空", "WEWE_RSS_EMPTY_FEED", 502);

    const $ = cheerio.load(source, { xmlMode: true, decodeEntities: true });
    const isAtom = $("feed").length > 0;
    const isRss = $("rss").length > 0 || $("channel").length > 0;
    if (!isAtom && !isRss) {
        throw createRssError("WeWe RSS 返回的内容不是 Atom/RSS feed", "WEWE_RSS_INVALID_FEED", 502);
    }

    const nodes = isAtom
        ? $("feed")
              .first()
              .children()
              .filter((_, child) => String(child.name || "").toLowerCase() === "entry")
              .toArray()
        : $("channel")
              .first()
              .children()
              .filter((_, child) => String(child.name || "").toLowerCase() === "item")
              .toArray();

    const articles = nodes
        .map((node) => {
            const link = cleanWeChatUrl(readFeedLink($, node));
            if (!isTrustedArticleLink(link)) return null;
            const identity = cleanWeChatUrl(childText($, node, isAtom ? ["id"] : ["guid", "id"]));
            const content = readContent($, node, baseUrl);
            const publishedAt = childText(
                $,
                node,
                isAtom ? ["published", "updated"] : ["pubDate", "dc:date", "date", "updated"]
            );
            const title = childText($, node, ["title"]) || "未命名文章";
            const summary =
                normalizeSummary(childText($, node, ["summary", "description"])) ||
                content.contentText.slice(0, 180);
            const cover = readFeedImage($, node, baseUrl) || content.images[0] || "";
            return {
                id: identity || link,
                title,
                link,
                summary,
                author: readFeedAuthor($, node),
                cover,
                create_time: publishedAt,
                time_text: publishedAt,
                published_at: publishedAt,
                content_text: content.contentText,
                content_html: content.contentHtml,
                images: content.images,
                content_status: content.contentText ? "fetched" : "empty",
            };
        })
        .filter((article) => article?.link);

    return {
        format: isAtom ? "atom" : "rss",
        articles,
    };
};

const fetchFeedPage = async ({
    url,
    request = axios.get,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = 1,
    runtime = {},
} = {}) => {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const response = await request(url, {
                responseType: "text",
                timeout: timeoutMs,
                maxContentLength: MAX_FEED_BYTES,
                maxBodyLength: MAX_FEED_BYTES,
                headers: {
                    Accept: "application/atom+xml,application/rss+xml,application/xml,text/xml;q=0.9",
                    "User-Agent": "ZJU-Platform-WeWe-RSS-Importer/1.0",
                },
                validateStatus: (status) => status >= 200 && status < 300,
            });
            if (
                !response ||
                (response.status && (response.status < 200 || response.status >= 300))
            ) {
                throw createRssError(
                    `WeWe RSS feed 请求返回 HTTP ${response?.status || "未知状态"}`,
                    "WEWE_RSS_HTTP_ERROR",
                    response?.status || 502
                );
            }
            return String(response.data || "");
        } catch (error) {
            lastError = error;
            if (error?.code?.startsWith("WEWE_RSS_") || attempt >= retries) break;
            await sleepFor(500 * (attempt + 1), runtime);
        }
    }

    if (lastError?.code?.startsWith("WEWE_RSS_")) throw lastError;
    const detail = lastError?.response?.status
        ? `HTTP ${lastError.response.status}`
        : lastError?.code === "ECONNABORTED"
          ? "请求超时"
          : lastError?.message || "网络错误";
    throw createRssError(`WeWe RSS feed 获取失败：${detail}`, "WEWE_RSS_REQUEST_FAILED", 502);
};

const sleepFor = async (milliseconds, runtime = {}) => {
    const delay = Math.max(Number(milliseconds) || 0, 0);
    if (!delay) return;
    if (typeof runtime.sleep === "function") {
        await runtime.sleep(delay);
        return;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
};

const fetchArticles = async ({
    feedId,
    baseUrl,
    count = 20,
    maxPages = 1,
    mode = "fulltext",
    type = "atom",
    request = axios.get,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    pacing = {},
    runtime = {},
} = {}) => {
    const normalizedFeedId = normalizeFeedId(feedId);
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
    const pageSize = Math.min(Math.max(Number(count) || 20, 1), 100);
    const pages = Math.min(Math.max(Number(maxPages) || 1, 1), 20);
    const articles = [];
    const seenLinks = new Set();

    for (let page = 1; page <= pages; page += 1) {
        const url = buildFeedUrl({
            feedId: normalizedFeedId,
            baseUrl: normalizedBaseUrl,
            type,
            limit: pageSize,
            page,
            mode,
        });
        const xml = await fetchFeedPage({ url, request, timeoutMs, runtime });
        const result = parseFeed(xml, { baseUrl: normalizedBaseUrl });
        result.articles.forEach((article) => {
            if (!seenLinks.has(article.link)) {
                seenLinks.add(article.link);
                articles.push({ ...article, feed_id: normalizedFeedId });
            }
        });
        if (result.articles.length < pageSize || page >= pages) break;
        const pagePauseSeconds = Number(pacing.page_pause_seconds ?? pacing.pagePauseSeconds ?? 0);
        await sleepFor(pagePauseSeconds * 1000, runtime);
    }

    return {
        feed_id: normalizedFeedId,
        format: String(type || "atom").toLowerCase(),
        articles,
        total: articles.length,
        remote_total: articles.length,
    };
};

module.exports = {
    DEFAULT_BASE_URL,
    FEED_ID_PATTERN,
    SOURCE_TYPE,
    buildFeedUrl,
    fetchArticles,
    fetchFeedPage,
    htmlToText,
    isTrustedArticleLink,
    normalizeBaseUrl,
    normalizeFeedId,
    parseFeed,
    sanitizeHtml,
};
