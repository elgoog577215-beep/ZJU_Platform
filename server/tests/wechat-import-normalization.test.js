const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeEventDateTime } = require("../src/services/eventIntelligenceService");
const {
    buildArticlePayload,
    buildEventPayload,
} = require("../src/services/wechatMpResourcePayloadService");
const { cleanWeChatUrl } = require("../src/utils/wechatUrl");
const { compactWechatArticleContent } = require("../src/utils/wechatArticleContext");
const { normalizePlainText } = require("../src/utils/plainText");

test("WeChat source URLs use a stable value for deduplication", () => {
    const url = "https://mp.weixin.qq.com/s/demo?chksm=tracking&scene=1&utm_source=share#content";
    assert.equal(cleanWeChatUrl(url), "https://mp.weixin.qq.com/s/demo");
});

test("WeChat titles are stored as plain text without search or AI markup", () => {
    assert.equal(
        normalizePlainText('<em class="highlight">报名</em> &amp; <strong>交流</strong>'),
        "报名 & 交流"
    );
    assert.equal(normalizePlainText("&lt;em&gt;校园活动&lt;/em&gt;"), "校园活动");
});

test("long WeChat articles keep the beginning, key paragraphs, and ending", () => {
    const content = [
        "文章开头的活动标题和背景。",
        ...Array.from({ length: 80 }, (_, index) => `普通正文段落 ${index + 1}`),
        "报名时间：2026年9月1日。",
        "地点：紫金港校区国际会议中心。",
        "文章结尾的报名入口和联系方式。",
    ].join("\n\n");
    const compacted = compactWechatArticleContent(content, 4000);

    assert.ok(compacted.length <= 4000);
    assert.match(compacted, /文章开头的活动标题/);
    assert.match(compacted, /报名时间：2026年9月1日/);
    assert.match(compacted, /文章结尾的报名入口/);
});

test("AI event dates are normalized for datetime-local fields", () => {
    assert.equal(normalizeEventDateTime("2026年9月19日 14:30"), "2026-09-19T14:30");
    assert.equal(normalizeEventDateTime("2026-09-19"), "2026-09-19T00:00");
    assert.equal(normalizeEventDateTime("2026-09-19", "14:00-16:00", 0), "2026-09-19T14:00");
    assert.equal(normalizeEventDateTime("2026-09-19", "14:00-16:00", 1), "2026-09-19T16:00");
    assert.equal(normalizeEventDateTime("待定"), "");
});

test("WeChat payloads preserve AI summaries and fill normalized event fields", () => {
    const fixture = {
        article: {
            title: "推广丨英语读写大赛",
            link: "https://mp.weixin.qq.com/s/demo?chksm=tracking",
            account: "浙江大学学生会",
        },
        content: {
            contentText: "报名时间和地点见正文。",
            url: "https://mp.weixin.qq.com/s/demo?scene=1",
        },
    };
    const parsed = {
        title: "<strong>英语读写大赛</strong>",
        description: "面向本科生开放的英语读写竞赛，参赛者按要求提交作品并参加后续评审。",
        content: "<h3>活动安排</h3><p>请按通知要求报名。</p>",
        date: "2026年9月19日",
        location: "紫金港校区",
        category: "竞赛",
        organizer: "浙江大学学生会",
    };

    const event = buildEventPayload({ ...fixture, parsed });
    assert.equal(event.link, "https://mp.weixin.qq.com/s/demo");
    assert.equal(event.date, "2026-09-19T00:00");
    assert.equal(event.end_date, "2026-09-19T00:00");
    assert.equal(event.location, "紫金港校区");
    assert.equal(event.category, "competition");
    assert.equal(event.description, parsed.description);
    assert.equal(event.title, "英语读写大赛");

    const article = buildArticlePayload({ ...fixture, parsed });
    assert.equal(article.source_url, "https://mp.weixin.qq.com/s/demo");
    assert.equal(article.excerpt, parsed.description);
    assert.equal(article.title, "英语读写大赛");
});

test("payloads do not turn raw article text into a fake AI summary", () => {
    const record = {
        article: {
            title: "没有摘要的文章",
            link: "https://mp.weixin.qq.com/s/no-summary",
            summary: "",
        },
        content: {
            contentText: "这是一大段原始正文，不能被误写成文章摘要。".repeat(40),
        },
    };

    assert.equal(buildArticlePayload(record).excerpt, "");
    assert.equal(buildEventPayload(record).description, "");
});
