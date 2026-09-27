const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");
const service = require("../src/services/wechatArticleVisionService");
test("vision OCR is cached, bounded, uses local images, and only selects original eligible images", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "wechat-vision-"));
    const uploads = path.join(root, "uploads");
    await fs.mkdir(path.join(uploads, "covers"), { recursive: true });
    const urls = ["/uploads/covers/wechat_abc.png", "/uploads/covers/wechat_def.png"];
    for (const url of urls)
        await sharp({ create: { width: 1000, height: 2200, channels: 3, background: "#fff" } })
            .png()
            .toFile(path.join(uploads, url.slice(9)));
    let calls = 0;
    let writes = [];
    const db = { run: async (...args) => writes.push(args) };
    let article = {
        id: 1,
        title: "讲座",
        images_json: JSON.stringify(urls),
        content_text: "短文",
        content_status: "image_only",
        cover: urls[0],
    };
    const run = async (_, payload) => {
        calls++;
        assert.equal(payload.messages[1].content.filter((x) => x.type === "image_url").length, 2);
        return {
            parsed: {
                text: "这是从图中识别的活动时间地点报名说明。".repeat(10),
                kind: calls === 1 ? "qr" : "poster",
                relevance: 0.9,
                reason: "清晰讲座海报",
                uncertain: false,
            },
            config: { model: "qwen3.8-27b" },
        };
    };
    const options = {
        dir: path.join(root, "state"),
        uploadRoot: uploads,
        run,
        budget: { remaining: 1 },
    };
    try {
        article = await service.enrichArticle(db, article, options);
        assert.equal(writes.length, 0);
        assert.equal((await service.readVision(1, options.dir)).status, "processing");
        options.budget.remaining = 1;
        article = await service.enrichArticle(db, article, options);
        assert.equal(article.cover, urls[1]);
        assert.match(article.content_text, /图片 2/);
        assert.doesNotMatch(article.content_text, /图片 1/);
        assert.equal(article.extraction_status, "not_started");
        assert.equal(article.content_status, "fetched");
        await service.enrichArticle(db, article, options);
        assert.equal(calls, 2);
        assert.equal(writes.length, 1);
        const refreshed = {
            ...article,
            content_text: "短文",
            content_status: "image_only",
            cover: urls[0],
        };
        const restored = await service.enrichArticle(db, refreshed, options);
        assert.equal(restored.content_text, article.content_text);
        assert.equal(restored.content_status, "fetched");
        assert.equal(restored.cover, urls[1]);
        assert.equal(calls, 2);
        assert.equal(writes.length, 2);
        await service.enrichArticle(db, restored, options);
        assert.equal(calls, 2);
        assert.equal(writes.length, 2);
        await assert.rejects(
            service.prepareImage("https://example.com/private", uploads),
            /image_not_local/
        );
        await assert.rejects(
            service.prepareImage("/uploads/covers/../../.env", uploads),
            /image_not_local/
        );
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});
test("failed image calls leave existing article intact and keep retry status", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "wechat-vision-fail-"));
    const uploads = path.join(root, "uploads");
    await fs.mkdir(path.join(uploads, "covers"), { recursive: true });
    await sharp({ create: { width: 300, height: 300, channels: 3, background: "#fff" } })
        .png()
        .toFile(path.join(uploads, "covers/wechat_abc.png"));
    let calls = 0;
    const article = {
        id: 2,
        title: "test",
        images_json: '["/uploads/covers/wechat_abc.png"]',
        content_text: "原始正文",
        cover: "original",
    };
    const options = {
        dir: path.join(root, "state"),
        uploadRoot: uploads,
        run: async () => {
            calls++;
            throw new Error("unavailable");
        },
    };
    try {
        const result = await service.enrichArticle(
            { run: async () => assert.fail() },
            article,
            options
        );
        assert.equal(result, article);
        const state = await service.readVision(2, options.dir);
        assert.equal(state.status, "retrying");
        await service.enrichArticle({}, article, options);
        assert.equal(calls, 1);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});
