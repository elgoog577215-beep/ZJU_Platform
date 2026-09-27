const crypto = require("crypto");

const LOCAL_SEMANTIC_MODEL = "local-event-semantic-v1";
const LOCAL_SEMANTIC_DIMENSIONS = 256;

const EVENT_SEMANTIC_TOPICS = [
    {
        value: "声乐歌唱",
        category: "culture_sports",
        aliases: [
            "唱歌",
            "歌唱",
            "声乐",
            "演唱",
            "歌手",
            "校园歌手",
            "十佳歌手",
            "合唱",
            "独唱",
            "清唱",
            "k歌",
            "singing",
            "singer",
            "vocal",
            "choir",
        ],
    },
    {
        value: "音乐",
        category: "culture_sports",
        aliases: [
            "音乐",
            "歌曲",
            "乐队",
            "乐器",
            "音乐会",
            "音乐节",
            "民乐",
            "钢琴",
            "吉他",
            "music",
            "concert",
            "band",
        ],
    },
    {
        value: "舞蹈",
        category: "culture_sports",
        aliases: ["舞蹈", "跳舞", "街舞", "国标舞", "现代舞", "dance", "dancing"],
    },
    {
        value: "戏剧表演",
        category: "culture_sports",
        aliases: ["戏剧", "话剧", "表演", "舞台剧", "小品", "戏曲", "drama", "theater"],
    },
    {
        value: "体育运动",
        category: "culture_sports",
        aliases: [
            "体育",
            "运动",
            "跑步",
            "篮球",
            "足球",
            "羽毛球",
            "乒乓球",
            "网球",
            "健身",
            "sport",
            "fitness",
        ],
    },
    {
        value: "人工智能",
        category: "lecture",
        aliases: [
            "ai",
            "aigc",
            "人工智能",
            "大模型",
            "llm",
            "glm",
            "chatgpt",
            "生成式人工智能",
            "智能体",
            "agent",
            "机器学习",
            "深度学习",
            "prompt",
            "提示词",
        ],
    },
    {
        value: "计算机技术",
        category: "lecture",
        aliases: [
            "计算机",
            "计算机科学",
            "信息技术",
            "编程",
            "代码",
            "开发",
            "软件",
            "算法",
            "技术",
            "computer",
            "programming",
            "coding",
            "software",
            "algorithm",
            "technology",
        ],
    },
    {
        value: "创新创业",
        category: "competition",
        aliases: ["创业", "创新创业", "项目路演", "商业计划", "创客", "startup", "pitch"],
    },
    {
        value: "科研学术",
        category: "lecture",
        aliases: ["科研", "学术", "论文", "实验室", "课题", "研究", "research", "paper"],
    },
    {
        value: "就业实习",
        category: "recruitment",
        aliases: ["就业", "实习", "招聘", "简历", "求职", "offer", "internship", "career"],
    },
    {
        value: "志愿公益",
        category: "volunteer",
        aliases: ["志愿", "公益", "服务时长", "志愿时长", "支教", "志愿者", "volunteer"],
    },
    {
        value: "讲座分享",
        category: "lecture",
        aliases: ["讲座", "分享", "沙龙", "报告", "论坛", "lecture", "seminar", "talk"],
    },
];

const normalizeText = (...values) =>
    values
        .flat()
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const includesAlias = (text, alias) => {
    const value = String(alias || "")
        .toLowerCase()
        .trim();
    if (!value) return false;
    if (/^[a-z0-9+#.-]+$/i.test(value)) {
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|[^a-z0-9+#.-])${escaped}([^a-z0-9+#.-]|$)`, "i").test(text);
    }
    return text.includes(value);
};

const findSemanticTopicDefinitions = (...values) => {
    const text = normalizeText(values);
    if (!text) return [];
    return EVENT_SEMANTIC_TOPICS.filter(
        (topic) =>
            includesAlias(text, topic.value) ||
            topic.aliases.some((alias) => includesAlias(text, alias))
    );
};

const detectSemanticTopics = (...values) =>
    findSemanticTopicDefinitions(values).map((topic) => topic.value);

const detectSemanticCategories = (...values) => [
    ...new Set(
        findSemanticTopicDefinitions(values)
            .map((topic) => topic.category)
            .filter(Boolean)
    ),
];

const expandSemanticTerms = (values, maxTerms = 32) => {
    const input = Array.isArray(values) ? values : [values];
    const definitions = findSemanticTopicDefinitions(input);
    return [
        ...new Set([
            ...input.map((value) => String(value || "").trim()).filter(Boolean),
            ...definitions.flatMap((topic) => [topic.value, ...topic.aliases]),
        ]),
    ].slice(0, maxTerms);
};

const buildTokens = (value) => {
    const text = normalizeText(value);
    const semanticTerms = expandSemanticTerms([text], 80).map((term) => term.toLowerCase());
    const tokens = [...semanticTerms];

    for (const word of text.split(/[^\p{L}\p{N}+#.-]+/u).filter(Boolean)) {
        tokens.push(word);
        const chars = [...word];
        for (const size of [2, 3]) {
            for (let index = 0; index <= chars.length - size; index += 1) {
                tokens.push(chars.slice(index, index + size).join(""));
            }
        }
    }
    return [...new Set(tokens.filter(Boolean))];
};

const buildLocalSemanticVector = (value, dimensions = LOCAL_SEMANTIC_DIMENSIONS) => {
    const vector = Array.from({ length: dimensions }, () => 0);
    const tokens = buildTokens(value);
    for (const token of tokens) {
        const digest = crypto.createHash("sha256").update(token).digest();
        const index = digest.readUInt32BE(0) % dimensions;
        const sign = digest[4] % 2 === 0 ? 1 : -1;
        const semanticWeight = EVENT_SEMANTIC_TOPICS.some(
            (topic) => topic.value === token || topic.aliases.includes(token)
        )
            ? 2
            : 1;
        vector[index] += sign * semanticWeight;
    }
    const norm = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0));
    return norm ? vector.map((item) => Number((item / norm).toFixed(6))) : vector;
};

module.exports = {
    LOCAL_SEMANTIC_MODEL,
    LOCAL_SEMANTIC_DIMENSIONS,
    EVENT_SEMANTIC_TOPICS,
    detectSemanticTopics,
    detectSemanticCategories,
    expandSemanticTerms,
    buildLocalSemanticVector,
};
