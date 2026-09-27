const WECHAT_LLM_CONTEXT_LIMIT = 30000;
const WECHAT_SIGNAL_PATTERN =
    /报名|参赛|参加|活动安排|时间|日期|地点|地址|校区|线上|线下|截止|提交|奖项|作品|会议|讲座|培训|招募|选拔|申请/;

const compactWechatArticleContent = (value, maxLength = WECHAT_LLM_CONTEXT_LIMIT) => {
    const text = String(value || "")
        .replace(/\r\n?/g, "\n")
        .trim();
    const limit = Math.max(4000, Number(maxLength) || WECHAT_LLM_CONTEXT_LIMIT);
    if (text.length <= limit) return text;

    const marker = "\n\n[中间正文已压缩，以下保留关键段落]\n\n";
    const headLength = Math.floor(limit * 0.32);
    const tailLength = Math.floor(limit * 0.32);
    const head = text.slice(0, headLength).trimEnd();
    const tail = text.slice(-tailLength).trimStart();
    const middleBudget = Math.max(0, limit - head.length - tail.length - marker.length * 2);
    const paragraphs = text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
    const middle = paragraphs
        .filter((paragraph) => WECHAT_SIGNAL_PATTERN.test(paragraph))
        .join("\n\n")
        .slice(0, middleBudget)
        .trim();

    return `${head}${marker}${middle}${marker}${tail}`.slice(0, limit);
};

module.exports = { compactWechatArticleContent, WECHAT_LLM_CONTEXT_LIMIT };
