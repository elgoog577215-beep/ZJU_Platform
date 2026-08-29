const test = require("node:test");
const assert = require("node:assert/strict");

const {
    classifyWechatArticleContent,
    meaningfulTextLength,
} = require("../src/services/wechatArticleContentPolicy");

test("WeChat article policy ignores whitespace when measuring meaningful text", () => {
    assert.equal(meaningfulTextLength("第一段\n\n第二段"), 6);
});

test("WeChat article policy marks image-led content without entering AI", () => {
    const result = classifyWechatArticleContent({
        contentText: "左右滑动查看更多 文案 审核",
        images: ["/uploads/covers/one.jpg", "/uploads/covers/two.jpg"],
    });

    assert.deepEqual(result, {
        contentStatus: "image_only",
        imageOnly: true,
        imageCount: 2,
        textLength: 12,
    });
});

test("WeChat article policy keeps text-rich content fetchable", () => {
    const result = classifyWechatArticleContent({
        contentText: "活动报名时间为本周五，面向全校学生开放。".repeat(8),
        images: ["/uploads/covers/one.jpg", "/uploads/covers/two.jpg"],
    });

    assert.equal(result.contentStatus, "fetched");
    assert.equal(result.imageOnly, false);
});

test("WeChat article policy keeps one-image short content compatible", () => {
    const result = classifyWechatArticleContent({
        contentText: "一段短通知",
        images: ["/uploads/covers/one.jpg"],
    });

    assert.equal(result.contentStatus, "fetched");
    assert.equal(result.imageOnly, false);
});
