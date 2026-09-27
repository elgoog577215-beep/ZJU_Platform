const test = require("node:test");
const assert = require("node:assert/strict");

const {
    extensionFromContentType,
    extensionFromImageUrl,
} = require("../src/utils/wechatImageDownloader");

test("WeChat image downloader honors wx_fmt query parameters", () => {
    assert.equal(
        extensionFromImageUrl("https://mmbiz.qpic.cn/image/cover/640?wx_fmt=gif&from=appmsg"),
        "gif"
    );
    assert.equal(extensionFromImageUrl("https://mmbiz.qpic.cn/image/cover/640?wx_fmt=jpeg"), "jpg");
    assert.equal(extensionFromImageUrl("https://mmbiz.qpic.cn/image/cover.png"), "png");
});

test("WeChat image downloader maps response content types to safe extensions", () => {
    assert.equal(extensionFromContentType("image/png; charset=binary"), "png");
    assert.equal(extensionFromContentType("image/jpeg"), "jpg");
    assert.equal(extensionFromContentType("text/html"), "");
});
