const test = require("node:test");
const assert = require("node:assert/strict");
const {
    normalizeWechatRequestUrl,
    wechatRequestOptions,
} = require("../src/utils/wechatRequestPolicy");

test("WeChat requests reject domain-prefix tricks, credentials and internal addresses", () => {
    for (const url of [
        "https://mp.weixin.qq.com.attacker.example/s/demo",
        "https://mp.weixin.qq.com@127.0.0.1/",
        "https://mp.weixin.qq.com:444/s/demo",
        "http://169.254.169.254/latest/meta-data/",
        "https://[::1]/",
        "http://2130706433/",
        "file:///etc/passwd",
        "https://mp.weixin.qq.com@attacker.example/",
        "https://user:password@mp.weixin.qq.com/s/demo",
    ])
        assert.throws(() => normalizeWechatRequestUrl(url), { code: "WECHAT_URL_UNTRUSTED" });
    assert.equal(
        normalizeWechatRequestUrl("http://mp.weixin.qq.com/s/demo#x"),
        "https://mp.weixin.qq.com/s/demo"
    );
    assert.equal(
        normalizeWechatRequestUrl("https://www.weixin.qq.com/s/demo"),
        "https://www.weixin.qq.com/s/demo"
    );
});

test("image fetches are bounded and restricted to official WeChat assets", () => {
    assert.equal(
        normalizeWechatRequestUrl("//mmbiz.qpic.cn/image.png", { asset: true }),
        "https://mmbiz.qpic.cn/image.png"
    );
    for (const url of [
        "http://127.0.0.1/image.png",
        "https://qpic.cn.attacker.example/a.png",
        "https://attacker.example/a.jpg",
    ]) {
        assert.throws(() => normalizeWechatRequestUrl(url, { asset: true }));
    }
    assert.equal(wechatRequestOptions().maxContentLength, 5 * 1024 * 1024);
    assert.equal(wechatRequestOptions({ asset: true }).maxContentLength, 10 * 1024 * 1024);
});

test("every redirect is validated before making the redirected request", () => {
    for (const asset of [false, true]) {
        const { beforeRedirect } = wechatRequestOptions({ asset });
        for (const options of [
            { protocol: "http:", hostname: "mp.weixin.qq.com" },
            { protocol: "https:", hostname: "127.0.0.1" },
            { protocol: "https:", hostname: "mp.weixin.qq.com.attacker.example" },
            { protocol: "https:", hostname: "mp.weixin.qq.com", port: 444 },
            { protocol: "https:", hostname: "mp.weixin.qq.com", auth: "user:pass" },
        ])
            assert.throws(() => beforeRedirect({ path: "/s/demo", ...options }));
        assert.doesNotThrow(() =>
            beforeRedirect({
                protocol: "https:",
                hostname: "mp.weixin.qq.com",
                path: "/s/demo",
                port: 443,
            })
        );
    }
});
