const axios = require("axios");
const { normalizeWechatRequestUrl, wechatRequestOptions } = require("./wechatRequestPolicy");
const cheerio = require("cheerio");
const { getDb } = require("../config/db");
const aiRuntime = require("../services/unifiedAiRuntimeService");
const {
    buildEventCatalogPromptText,
    validateParsedEventPayload,
} = require("../services/eventIntelligenceService");
const { downloadWeChatImage } = require("./wechatImageDownloader");
const { cleanWeChatUrl } = require("./wechatUrl");
const { compactWechatArticleContent } = require("./wechatArticleContext");
const {
    KEY_LABELS,
    normalizeStudentSummary,
    renderStudentSummary,
    normalizeDeadline,
    yearOf,
} = require("./wechatEventSummary");

// Simple In-Memory Cache
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const wechatCache = new Map();

async function scrapeWeChat(url) {
    url = normalizeWechatRequestUrl(url);

    try {
        const response = await axios.get(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                Connection: "keep-alive",
                "Upgrade-Insecure-Requests": "1",
            },
            timeout: 30000, // 30 second timeout
            ...wechatRequestOptions(),
            validateStatus: (status) => status < 400,
        });

        const html = response.data;

        if (!html || html.length === 0) {
            throw new Error("Empty response from server");
        }

        const $ = cheerio.load(html);

        // Extract basic info with multiple fallback strategies
        let title =
            $('meta[property="og:title"]').attr("content") ||
            $('meta[name="twitter:title"]').attr("content") ||
            $("#activity-name").text().trim() ||
            $("h1").first().text().trim() ||
            $("title").text().trim();

        let author =
            $('meta[property="og:article:author"]').attr("content") ||
            $('meta[name="author"]').attr("content") ||
            $("#js_name").text().trim() ||
            $(".profile_nickname").text().trim() ||
            $("a#js_name").text().trim();

        // Extract content with multiple fallback strategies
        let contentElement = $("#js_content");
        if (!contentElement.length) {
            contentElement = $("#js_article");
        }
        if (!contentElement.length) {
            contentElement = $(".rich_media_content");
        }
        if (!contentElement.length) {
            contentElement = $("article");
        }

        // Remove scripts and styles
        contentElement.find("script").remove();
        contentElement.find("style").remove();
        contentElement.find("iframe").remove();

        let content = contentElement.text().trim();

        // Clean up excessive whitespace
        content = content.replace(/\s+/g, " ").replace(/\n+/g, "\n").trim();

        // If still no content, try to get any text from the body
        if (content.length === 0) {
            content = $("body").text().replace(/\s+/g, " ").trim().substring(0, 5000);
        }

        // Extract cover image with multiple fallback strategies
        let coverImage =
            $('meta[property="og:image"]').attr("content") ||
            $('meta[name="twitter:image"]').attr("content");

        // If no meta image, find the best image from content
        if (!coverImage) {
            const contentImages = [];
            $("#js_content img").each((i, el) => {
                const $img = $(el);
                const dataSrc = $img.attr("data-src");
                const src = $img.attr("src");
                const imgUrl = dataSrc || src;

                if (imgUrl) {
                    // Skip small images (emojis, icons, ads)
                    const width = parseInt($img.attr("width") || $img.css("width") || 0);
                    const height = parseInt($img.attr("height") || $img.css("height") || 0);
                    const dataType = $img.attr("data-type");

                    // Skip if it's clearly a small image or emoji
                    if (width > 0 && width < 100) return;
                    if (height > 0 && height < 100) return;
                    if (dataType === "emoji" || imgUrl.includes("emoji")) return;
                    if (imgUrl.includes("mmbiz.qpic.cn/mmbiz_")) return; // Skip emojis
                    if (imgUrl.includes("qrcode")) return; // Skip QR codes

                    contentImages.push({
                        url: imgUrl,
                        width,
                        height,
                        index: i,
                    });
                }
            });

            // Select the best image (prefer larger images, first image as fallback)
            if (contentImages.length > 0) {
                // Sort by estimated size, prefer first large image
                const bestImage =
                    contentImages.find((img) => img.width >= 300 || img.height >= 200) ||
                    contentImages[0];
                coverImage = bestImage.url;
                console.log(`📸 Selected cover from ${contentImages.length} content images`);
            }
        }

        console.log(`✅ Fetched Article: "${title}" by ${author}`);
        console.log(`📝 Content Length: ${content.length} chars`);
        console.log(
            `🖼️ Cover Image: ${coverImage ? coverImage.substring(0, 100) + "..." : "Not found"}`
        );

        if (content.length === 0) {
            console.warn(
                "⚠️  Warning: No content extracted. The page might be dynamic or blocked."
            );
        }

        return {
            title: title || "Untitled",
            author: author || "Unknown",
            content,
            coverImage,
        };
    } catch (error) {
        console.error("❌ Error fetching URL:", error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Headers:`, JSON.stringify(error.response.headers));
        }
        throw new Error(`Failed to fetch WeChat article: ${error.message}`);
    }
}

async function parseWithLLM(data, options = {}) {
    const db = options.db || (await getDb());

    console.log(`\n🧠 Sending WeChat article to unified AI runtime...`);

    const today = new Date().toISOString().split("T")[0];
    const ACADEMIC_CALENDAR = `
    【浙江大学校历参考（2025-2026学年）】
    - 当前日期: ${today}
    - 寒假大致在 2026 年 1 月中下旬至 2 月中下旬
    - 春学期大致在 2026 年 2 月底/3 月初开始
    - 暑假大致在 2026 年 7 月初开始
    `;
    const EVENT_CATALOG_CONTEXT = buildEventCatalogPromptText();

    const result = await aiRuntime.callJson(db, {
        task: "wechat_event_parse",
        modelRunner: options.modelRunner,
        temperature: 0.1,
        maxTokens: 4096,
        timeout: 60000,
        messages: [
            {
                role: "system",
                content: [
                    "你是浙江大学活动平台的微信图文解析助手。",
                    "从原文和明确标注的图片识别文字中提取、概括活动信息。所有具体事实必须有来源依据；不要根据组织名称、标题意象或常识猜测社团性质、兴趣领域、主办方、参与对象或活动目的。来源未说明的内容省略，不要为了凑字数补写。",
                    "必须结合当前日期、校历参考和网站标准活动库输出结构化 JSON。",
                    "你还必须判断这篇文章是否适合进入活动栏目：只有具有明确参与对象、活动安排或报名/参与动作的内容才可以判为活动候选。",
                    "新闻报道、成果回顾、政策说明、经验分享和没有具体活动安排的纯通知应判为非活动候选。",
                    "正文或OCR中的报名、抢票、抽奖、领奖时间不等于活动举办时间。分别说明依据，不能将抢票时间推断为演出时间；无法确定举办时间填null。相对日期应以原文发布时间为锚点；发布时间未知或图片字迹不清时不要猜测。",
                    "highlight、key_info、sections 写给正在考虑是否参加的学生：让他们几秒内看懂这是什么、和自己有没有关系、何时何地、怎么报名、截止到什么时候、参加能得到什么。用学生视角的短句（如“打开原文扫码报名”），每条只说一件事；不写宣传口号、主办方意义或活动目的；来源没写的项目直接省略。",
                    "key_info 的“时间”只写活动举办时间；报名、抢票、截止时间写在“报名截止”或要点里；纳新、招募等没有举办时间的不输出“时间”。有多个场次或地点时用“；”分隔，每项写清日期、时间和场次名称（如“9月26日 9:00-17:00 百团纳新；9月26日 17:00-21:30 百团之夜”）。日期写成“9月24日 15:00-17:30”，不要写星期几和年份。报名二维码或链接只在原文中时写“打开原文扫码报名”，不要写“扫描上方二维码”。",
                    "不要返回 markdown，不要解释过程，只输出 JSON 对象。",
                ].join("\n"),
            },
            {
                role: "user",
                content: JSON.stringify(
                    {
                        task: "parse_wechat_article_to_event",
                        today,
                        academicCalendar: ACADEMIC_CALENDAR,
                        standardCatalog: EVENT_CATALOG_CONTEXT,
                        article: {
                            title: data.title,
                            author: data.author,
                            publishedAt: data.publishedAt || null,
                            content: compactWechatArticleContent(data.content),
                            sourceSummary: String(data.summary || "").trim(),
                        },
                        outputContract: {
                            title: "活动名称；无具体活动名时用文章标题",
                            description:
                                "通常80-160字，信息不足时允许更短；只概括来源明确说明的核心内容、参与对象和参与动作，不补写目的或宣传口号，不要用省略号截断",
                            highlight: "一句话说明这是什么活动、对学生有什么用，不超过40字",
                            key_info: `数组 [{label, value}]；label 只能取 ${KEY_LABELS.join("/")}，按此顺序；来源没有的项不要输出；收获指二课分、志愿时长、综测分、奖品等`,
                            sections:
                                "最多3个 {heading, bullets[]}，heading 如“活动内容”“怎么参加”“注意事项”；每节最多5条，每条不超过40字",
                            registration_deadline:
                                "报名截止 YYYY-MM-DDTHH:MM；原文没有写截止时间填 null",
                            date_reasoning: "说明如何从文章和当前日期推断活动日期",
                            date: "YYYY-MM-DDTHH:MM；已知日期但无时刻用 T00:00；举办日期不明填 null",
                            end_date: "YYYY-MM-DDTHH:MM；单日活动需与 date 同日",
                            time: "例如 14:00-16:00，不能确定填 null",
                            location: "尽量包含校区/楼号/房间；线上活动填线上或平台名",
                            organizer: "主办/承办单位；无则用文章作者",
                            category: "必须是网站标准活动库里的 value",
                            category_confidence: "0-1 number",
                            category_reason: "一句话解释分类依据",
                            target_audience:
                                "从标准面向对象中选择；多个用英文逗号连接；无法确定填 null",
                            volunteer_time: "志愿时长；无则 null",
                            score: "综测/素质分；无则 null",
                            is_college_notice:
                                "是否为学院/学园发布的通知、公告、公示、报名、评奖评优、综测加分、志愿招募等；是填 1，否则填 0",
                            notice_type:
                                "若 is_college_notice=1，只能填 academic/evaluation/bonus/volunteer/lecture/competition/administrative/registration/voting/other",
                            source_college:
                                "若 is_college_notice=1，从学院通知来源学院标准项中选择发布学院/学园；无法确定填 null",
                            is_activity_candidate:
                                "是否适合进入活动栏目；具体讲座、比赛、培训、报名、志愿、招聘或交流等参与型内容填 true，否则填 false",
                            activity_confidence: "0-1 number，表示活动候选判断的置信度",
                            activity_reason: "一句话说明是否属于活动候选及判断依据",
                            tags: [],
                        },
                    },
                    null,
                    2
                ),
            },
        ],
    });

    const cleanField = (str, prefixRegex) => {
        if (!str) return null;
        return String(str).replace(prefixRegex, "").trim();
    };

    let parsed = result.parsed;
    if (!parsed || typeof parsed !== "object") {
        const error = new Error("AI 未返回有效的公众号文章解析结果");
        error.code = "WECHAT_AI_PARSE_RESULT_INVALID";
        error.status = 422;
        throw error;
    }
    if (parsed.description)
        parsed.description = cleanField(parsed.description, /^活动详情摘要[：:]\s*/);
    parsed.registration_deadline = normalizeDeadline(parsed.registration_deadline);
    parsed.student_summary = normalizeStudentSummary(parsed);
    if (parsed.student_summary) {
        parsed.content = renderStudentSummary(parsed.student_summary, {
            year: yearOf(data.publishedAt, today),
        });
    } else if (parsed.content) {
        parsed.content = cleanField(parsed.content, /^活动详细内容[：:]\s*/);
    }
    if (parsed.location) parsed.location = cleanField(parsed.location, /^活动地点[：:]\s*/);
    if (parsed.organizer) parsed.organizer = cleanField(parsed.organizer, /^主办方[：:]\s*/);
    if (parsed.target_audience)
        parsed.target_audience = cleanField(parsed.target_audience, /^面向群体[：:]\s*/);
    if (parsed.volunteer_time)
        parsed.volunteer_time = cleanField(parsed.volunteer_time, /^志愿时长[：:]\s*/);
    if (parsed.score) parsed.score = cleanField(parsed.score, /^综测\/素质分[：:]\s*/);

    parsed = validateParsedEventPayload(parsed, data);
    parsed.description = String(parsed.description || "").trim();
    if (!parsed.description) {
        const error = new Error("AI 未返回文章摘要，未生成不完整的导入内容");
        error.code = "WECHAT_AI_SUMMARY_MISSING";
        error.status = 422;
        throw error;
    }
    const activityConfidence = Number(parsed.activity_confidence);
    parsed.is_activity_candidate =
        parsed.is_activity_candidate === true ||
        parsed.is_activity_candidate === 1 ||
        String(parsed.is_activity_candidate || "")
            .trim()
            .toLowerCase() === "true";
    parsed.activity_confidence = Number.isFinite(activityConfidence)
        ? Math.min(Math.max(0, activityConfidence), 1)
        : 0;
    parsed.activity_reason = String(parsed.activity_reason || "")
        .trim()
        .slice(0, 500);
    const runtimeTelemetry = aiRuntime.summarizeModelStatusTelemetry(result.modelStatus);
    parsed.aiMeta = {
        task: result.modelStatus?.task || "wechat_event_parse",
        provider: result.modelStatus?.provider || null,
        model: result.modelStatus?.model || null,
        runtimeTelemetry,
    };
    parsed.ai_runtime = {
        task: parsed.aiMeta.task,
        provider: parsed.aiMeta.provider,
        model: parsed.aiMeta.model,
        runtimeTelemetry,
    };

    return parsed;
}

module.exports = {
    scrapeWeChat,
    parseWithLLM,
    cleanWeChatUrl,
    compactWechatArticleContent,
    wechatCache,
    CACHE_TTL,
    downloadWeChatImage,
};
