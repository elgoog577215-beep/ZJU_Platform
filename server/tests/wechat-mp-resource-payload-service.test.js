const test = require("node:test");
const assert = require("node:assert/strict");

const {
    buildArticlePayload,
    buildContentBlocks,
    buildEventPayload,
    buildWechatMpResourcePayload,
} = require("../src/services/wechatMpResourcePayloadService");

const fixture = {
    article: {
        title: "浙大活动通知",
        link: "https://mp.weixin.qq.com/s/demo",
        summary: "这是一条来自公众号的摘要。",
        time_text: "2026-07-11 12:30:00",
        account: "浙江大学",
    },
    content: {
        title: "浙大活动通知",
        author: "浙江大学",
        contentText: "活动介绍\n\n一、亮点\n\n- 报名方式\n- 参与对象",
        images: ["/uploads/wechat/body.png"],
        coverImage: "/uploads/wechat/cover.png",
        url: "https://mp.weixin.qq.com/s/demo",
    },
};

test("WeChat MP deterministic converter builds readable content blocks", () => {
    const blocks = buildContentBlocks(fixture.content.contentText, fixture.content.images);

    assert.equal(blocks[0].type, "text");
    assert.equal(blocks[0].style, "heading");
    assert.equal(blocks.at(-1).type, "image");
    assert.equal(blocks.at(-1).url, "/uploads/wechat/body.png");
});

test("WeChat MP article payload follows ZJU Platform article shape", () => {
    const payload = buildArticlePayload(fixture);
    const blocks = JSON.parse(payload.content_blocks);

    assert.equal(payload.title, "浙大活动通知");
    assert.equal(payload.date, "2026-07-11");
    assert.equal(payload.cover, "/uploads/wechat/cover.png");
    assert.equal(payload.category, "campus");
    assert.match(payload.content, /<h2>活动介绍<\/h2>/);
    assert.match(payload.content, /阅读原文/);
    assert.equal(
        blocks.some((block) => block.type === "image"),
        true
    );
});

test("WeChat MP event payload avoids inventing event time while preserving body", () => {
    const payload = buildEventPayload(fixture);

    assert.equal(payload.title, "浙大活动通知");
    assert.equal(payload.status, "pending");
    assert.equal(payload.date, "");
    assert.equal(payload.link, "https://mp.weixin.qq.com/s/demo");
    assert.equal(payload.organizer, "浙江大学");
    assert.equal(payload.image, "/uploads/wechat/cover.png");
    assert.match(payload.content, /<ul><li>报名方式<\/li><li>参与对象<\/li><\/ul>/);
});

test("WeChat MP manual imports apply the shared AI analysis to articles and events", () => {
    const parsed = {
        title: "AI 解析后的讲座名称",
        date: "2026-07-21T14:00",
        end_date: "2026-07-21T16:00",
        location: "紫金港校区国际会议中心",
        tags: ["人工智能", "讲座"],
        category: "lecture",
        target_audience: "本科生,研究生",
        organizer: "浙江大学计算学院",
        description: "面向学生的人工智能专题讲座。",
        content: "<h3>活动安排</h3><p>欢迎报名参加。</p>",
        is_college_notice: 1,
        notice_type: "lecture",
        source_college: "计算机科学与技术学院",
    };

    const eventPayload = buildWechatMpResourcePayload({
        ...fixture,
        resourceType: "event",
        parsed,
    }).payload;
    assert.equal(eventPayload.title, parsed.title);
    assert.equal(eventPayload.date, parsed.date);
    assert.equal(eventPayload.end_date, parsed.end_date);
    assert.equal(eventPayload.location, parsed.location);
    assert.equal(eventPayload.category, parsed.category);
    assert.match(eventPayload.tags, /微信公众号/);
    assert.match(eventPayload.tags, /人工智能/);
    assert.equal(eventPayload.content, parsed.content);
    assert.equal(eventPayload.status, "pending");

    const articlePayload = buildWechatMpResourcePayload({
        ...fixture,
        resourceType: "article",
        parsed,
    }).payload;
    assert.equal(articlePayload.title, parsed.title);
    assert.equal(articlePayload.excerpt, parsed.description);
    assert.equal(articlePayload.status, "approved");
});

test("WeChat MP import payload routes supported resource types", () => {
    const defaultPayload = buildWechatMpResourcePayload(fixture);
    assert.equal(defaultPayload.endpoint, "/events");
    assert.equal(defaultPayload.payload.status, "pending");
    assert.deepEqual(
        buildWechatMpResourcePayload({ ...fixture, resourceType: "article" }).endpoint,
        "/articles"
    );
    assert.deepEqual(
        buildWechatMpResourcePayload({ ...fixture, resourceType: "event" }).endpoint,
        "/events"
    );
    assert.throws(
        () => buildWechatMpResourcePayload({ ...fixture, resourceType: "photo" }),
        /Unsupported/
    );
});

test("WeChat MP rejected event payload preserves the AI screening reason", () => {
    const result = buildWechatMpResourcePayload({
        ...fixture,
        resourceType: "event",
        status: "rejected",
        rejectionReason: "文章是成果报道，不是参与型活动",
    });

    assert.equal(result.payload.status, "rejected");
    assert.equal(result.payload.rejection_reason, "文章是成果报道，不是参与型活动");
});
