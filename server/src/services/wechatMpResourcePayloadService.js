const DEFAULT_ARTICLE_TAGS = "微信公众号,浙大资讯";
const DEFAULT_EVENT_TAGS = "微信公众号";
const DEFAULT_ARTICLE_CATEGORY = "campus";
const DEFAULT_EVENT_CATEGORY = "other";
const DEFAULT_STATUS = "approved";
const DEFAULT_EVENT_STATUS = "pending";

const toText = (value) => String(value || "").trim();

const uniqueTexts = (values = []) => {
    const seen = new Set();
    const result = [];
    for (const value of values) {
        const text = toText(value);
        if (!text || seen.has(text)) continue;
        seen.add(text);
        result.push(text);
    }
    return result;
};

const normalizeTagValues = (value) => {
    const values = Array.isArray(value) ? value : [value];
    return values
        .flatMap((item) => String(item || "").split(/[，,;；、]+/))
        .map((item) => item.trim())
        .filter(Boolean);
};

const escapeHtml = (value) =>
    toText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, "&#96;");

const stripHtml = (value) =>
    toText(value)
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const splitParagraphs = (value) => {
    const lines = String(value || "")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.trim());
    const paragraphs = [];
    let current = [];
    for (const line of lines) {
        if (!line) {
            if (current.length > 0) {
                paragraphs.push(current.join("\n").trim());
                current = [];
            }
            continue;
        }
        current.push(line);
    }
    if (current.length > 0) paragraphs.push(current.join("\n").trim());
    return paragraphs.filter(Boolean);
};

const inferTextStyle = (paragraph) => {
    const text = toText(paragraph);
    if (!text) return "paragraph";
    if (text.startsWith(">")) return "quote";
    const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length > 1 && lines.every((line) => /^([-*+•·]|\d+\.)\s+/.test(line))) {
        return "list";
    }
    if (text.length <= 28 && !text.includes("\n") && !/[。！？.!?]$/.test(text)) {
        return "heading";
    }
    return "paragraph";
};

const buildContentBlocks = (contentText, images = []) => {
    const blocks = splitParagraphs(contentText).map((paragraph, index) => ({
        id: `text-${String(index + 1).padStart(3, "0")}`,
        type: "text",
        style: inferTextStyle(paragraph),
        align: "default",
        width: "default",
        text: paragraph,
        url: "",
        caption: "",
        name: "",
        size: 0,
        mime: "",
        language: "",
    }));

    uniqueTexts(images).forEach((imageUrl, index) => {
        blocks.push({
            id: `image-${String(index + 1).padStart(3, "0")}`,
            type: "image",
            style: "default",
            align: "center",
            width: "wide",
            text: "",
            url: imageUrl,
            caption: "",
            name: "",
            size: 0,
            mime: "",
            language: "",
        });
    });

    return blocks;
};

const renderTextBlock = (block) => {
    const text = toText(block.text);
    if (!text) return "";
    if (block.style === "heading") return `<h2>${escapeHtml(text)}</h2>`;
    if (block.style === "quote")
        return `<blockquote>${escapeHtml(text.replace(/^>\s*/, ""))}</blockquote>`;
    if (block.style === "list") {
        const items = text
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => `<li>${escapeHtml(line.replace(/^([-*+•·]|\d+\.)\s+/, ""))}</li>`);
        return items.length > 0 ? `<ul>${items.join("")}</ul>` : "";
    }
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join("");
};

const buildContentHtml = (blocks = [], { sourceUrl = "" } = {}) => {
    const parts = [];
    for (const block of blocks) {
        if (block.type === "text") {
            const html = renderTextBlock(block);
            if (html) parts.push(html);
            continue;
        }
        if (block.type === "image" && block.url) {
            const url = escapeAttribute(block.url);
            const caption = escapeHtml(block.caption || "");
            const figcaption = caption ? `<figcaption>${caption}</figcaption>` : "";
            parts.push(
                '<figure style="text-align:center;">' +
                    `<img style="width:980px;max-width:100%;display:inline-block;" src="${url}" alt="${caption}" />` +
                    figcaption +
                    "</figure>"
            );
        }
    }

    if (sourceUrl) {
        const href = escapeAttribute(sourceUrl);
        parts.push(
            `<p><a href="${href}" target="_blank" rel="noopener noreferrer">阅读原文</a></p>`
        );
    }

    return parts.join("");
};

const buildExcerpt = (value, limit = 160) => {
    const text = String(value || "")
        .replace(/\s+/g, " ")
        .trim();
    if (text.length <= limit) return text;
    return `${text.slice(0, limit).trimEnd()}...`;
};

const normalizeDate = (value) => {
    const text = toText(value);
    const match = text.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : text;
};

const buildRecord = ({ article = {}, content = {} } = {}) => {
    const sourceUrl = toText(content.url || article.link || article.url || article.source_url);
    const title = toText(content.title || article.title || article.source_title) || "未命名文章";
    const contentText = toText(content.contentText || content.content_text || article.content_text);
    const images = uniqueTexts([
        ...(Array.isArray(content.images) ? content.images : []),
        ...(Array.isArray(content.content_images) ? content.content_images : []),
    ]);
    const cover = toText(
        content.coverImage || content.cover || article.cover || article.coverImage || images[0]
    );

    return {
        title,
        account: toText(content.author || article.author || article.account),
        sourceUrl,
        publishedAt: toText(
            article.published_at || article.time_text || article.create_time || content.published_at
        ),
        summary: toText(content.summary || article.summary),
        contentText,
        images,
        cover,
    };
};

const buildArticlePayload = ({
    article = {},
    content = {},
    parsed = null,
    status = DEFAULT_STATUS,
} = {}) => {
    const record = buildRecord({ article, content });
    const blocks = buildContentBlocks(record.contentText, record.images);
    const contentHtml = buildContentHtml(blocks, { sourceUrl: record.sourceUrl });
    const excerpt = buildExcerpt(parsed?.description || record.summary || record.contentText);
    const cover = record.cover || record.images[0] || "";

    return {
        title: (toText(parsed?.title) || record.title).slice(0, 500),
        date: normalizeDate(record.publishedAt),
        excerpt,
        tags: DEFAULT_ARTICLE_TAGS,
        content: contentHtml,
        content_blocks: JSON.stringify(blocks),
        cover,
        featured: 0,
        category: DEFAULT_ARTICLE_CATEGORY,
        related_article_ids: "",
        related_post_ids: "",
        related_news_ids: "",
        related_group_ids: "",
        status,
    };
};

const buildEventPayload = ({
    article = {},
    content = {},
    parsed = null,
    status = DEFAULT_EVENT_STATUS,
    rejectionReason = "",
} = {}) => {
    const record = buildRecord({ article, content });
    const blocks = buildContentBlocks(record.contentText, record.images);
    const contentHtml = buildContentHtml(blocks, { sourceUrl: record.sourceUrl });
    const excerpt = buildExcerpt(
        parsed?.description || record.summary || record.contentText || stripHtml(contentHtml),
        220
    );
    const parsedTags = normalizeTagValues(parsed?.tags);

    return {
        title: (toText(parsed?.title) || record.title).slice(0, 500),
        date: toText(parsed?.date),
        end_date: parsed?.end_date || null,
        location: toText(parsed?.location),
        tags: uniqueTexts([DEFAULT_EVENT_TAGS, ...parsedTags]).join(","),
        image: toText(parsed?.coverImage) || record.cover || record.images[0] || "",
        description: excerpt,
        content: toText(parsed?.content) || contentHtml || `<p>${escapeHtml(excerpt)}</p>`,
        link: record.sourceUrl,
        featured: 0,
        score: toText(parsed?.score),
        target_audience: toText(parsed?.target_audience),
        organizer: toText(parsed?.organizer) || record.account,
        volunteer_time: toText(parsed?.volunteer_time),
        category: toText(parsed?.category) || DEFAULT_EVENT_CATEGORY,
        is_college_notice: [1, "1", true, "true"].includes(parsed?.is_college_notice) ? 1 : 0,
        notice_type: toText(parsed?.notice_type) || null,
        source_college: toText(parsed?.source_college) || null,
        rejection_reason: status === "rejected" ? toText(rejectionReason) || null : null,
        status,
    };
};

const buildWechatMpResourcePayload = ({
    resourceType = "event",
    article = {},
    content = {},
    parsed = null,
    status,
    rejectionReason = "",
} = {}) => {
    const normalizedType = String(resourceType || "event")
        .trim()
        .toLowerCase();
    if (normalizedType === "event" || normalizedType === "events") {
        return {
            resourceType: "event",
            endpoint: "/events",
            payload: buildEventPayload({
                article,
                content,
                parsed,
                status: status || DEFAULT_EVENT_STATUS,
                rejectionReason,
            }),
        };
    }
    if (normalizedType === "article" || normalizedType === "articles") {
        return {
            resourceType: "article",
            endpoint: "/articles",
            payload: buildArticlePayload({
                article,
                content,
                parsed,
                status: status || DEFAULT_STATUS,
            }),
        };
    }
    const error = new Error("Unsupported WeChat MP import resource type");
    error.status = 400;
    error.code = "WECHAT_MP_UNSUPPORTED_IMPORT_TYPE";
    throw error;
};

module.exports = {
    buildArticlePayload,
    buildContentBlocks,
    buildContentHtml,
    buildEventPayload,
    buildWechatMpResourcePayload,
    buildExcerpt,
    inferTextStyle,
    splitParagraphs,
};
