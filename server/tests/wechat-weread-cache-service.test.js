const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const service = require("../src/services/wechatWereadCacheService");

test("WeRead cache preserves unknown publication time and pending article metadata", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "weread-cache-"));
    try {
        const feedId = "MP_WXS_123";
        await fs.writeFile(
            path.join(root, `${feedId}.json`),
            JSON.stringify({
                articles: [
                    {
                        link: "https://mp.weixin.qq.com/s/abc",
                        content_status: "ready",
                        published_at: "",
                    },
                    { link: "https://mp.weixin.qq.com/s/def", content_status: "pending" },
                    { link: "https://other.test/s/abc", content_status: "ready" },
                ],
            })
        );
        const result = await service.fetchArticles({ feedId, root });
        assert.equal(result.articles.length, 2);
        assert.equal(result.articles[1].collector_content_status, "pending");
        assert.equal(result.articles[0].create_time, "");
        await assert.rejects(service.fetchArticles({ feedId: "../../etc/passwd", root }));
    } finally {
        await fs.rm(root, { recursive: true });
    }
});

test("WeRead cache localizes the collected body without fetching the MP backend", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "weread-body-"));
    try {
        const name = "a".repeat(64) + ".json";
        const url = "https://mp.weixin.qq.com/s/abc";
        await fs.mkdir(path.join(root, "bodies"));
        await fs.writeFile(
            path.join(root, "MP_WXS_123.json"),
            JSON.stringify({
                name: "测试",
                articles: [{ link: url, title: "推文", content_status: "ready", body_file: name }],
            })
        );
        await fs.writeFile(
            path.join(root, "bodies", name),
            JSON.stringify({
                content_text: "有效正文".repeat(100),
                content_html: "<p>正文</p><script>bad()</script>",
                images: [],
            })
        );
        let calls = 0;
        const body = await service.fetchArticleContent({
            feedId: "MP_WXS_123",
            url,
            root,
            localize: async (value) => {
                calls++;
                return value;
            },
        });
        assert.equal(calls, 1);
        assert.equal(body.content_status, "fetched");
        assert.equal(body.author, "测试");
        assert.ok(!body.contentHtml.includes("script"));
    } finally {
        await fs.rm(root, { recursive: true });
    }
});
