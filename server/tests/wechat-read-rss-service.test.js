const test = require("node:test");
const assert = require("node:assert/strict");

const service = require("../src/services/wechatReadRssService");

const atomFixture = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>测试公众号</title>
  <entry>
    <id>https://mp.weixin.qq.com/s/atom-article</id>
    <title>校园活动 &amp; 通知</title>
    <link rel="alternate" href="https://mp.weixin.qq.com/s/atom-article?chksm=tracking#fragment" />
    <author><name>测试公众号</name></author>
    <published>2026-08-28T08:00:00+08:00</published>
    <content type="html"><![CDATA[
      <div class="rich_media_content">
        <p>第一段正文。</p>
        <p>第二段正文 <strong>重点</strong>。</p>
        <img data-src="https://mmbiz.qpic.cn/body.jpg" />
        <script>alert('remove me')</script>
      </div>
    ]]></content>
  </entry>
</feed>`;

const rssFixture = `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>RSS 测试号</title>
    <item>
      <guid>https://mp.weixin.qq.com/s/rss-article</guid>
      <title>RSS 正文</title>
      <link>https://mp.weixin.qq.com/s/rss-article</link>
      <dc:creator>RSS 测试号</dc:creator>
      <pubDate>Fri, 28 Aug 2026 01:00:00 GMT</pubDate>
      <media:content url="https://mmbiz.qpic.cn/cover.jpg" />
      <content:encoded><![CDATA[<p>RSS 正文内容。</p>]]></content:encoded>
    </item>
  </channel>
</rss>`;

test("WeRead RSS parser maps Atom fulltext and removes executable markup", () => {
    const result = service.parseFeed(atomFixture, {
        baseUrl: "https://rss.tuotuzju.com",
    });
    assert.equal(result.format, "atom");
    assert.equal(result.articles.length, 1);
    const article = result.articles[0];
    assert.equal(article.id, "https://mp.weixin.qq.com/s/atom-article");
    assert.equal(article.title, "校园活动 & 通知");
    assert.equal(article.link, "https://mp.weixin.qq.com/s/atom-article");
    assert.equal(article.author, "测试公众号");
    assert.equal(article.cover, "https://mmbiz.qpic.cn/body.jpg");
    assert.equal(article.create_time, "2026-08-28T08:00:00+08:00");
    assert.equal(article.content_text, "第一段正文。\n\n第二段正文 重点。");
    assert.match(article.content_html, /第一段正文/);
    assert.match(article.content_html, /data-src="https:\/\/mmbiz\.qpic\.cn\/body\.jpg"/);
    assert.deepEqual(article.images, ["https://mmbiz.qpic.cn/body.jpg"]);
    assert.equal(article.content_status, "fetched");
    assert.equal(article.content_html.includes("script"), false);
});

test("WeRead RSS parser maps RSS 2.0 namespaced fields", () => {
    const result = service.parseFeed(rssFixture, {
        baseUrl: "https://rss.tuotuzju.com",
    });
    assert.equal(result.format, "rss");
    assert.equal(result.articles[0].author, "RSS 测试号");
    assert.equal(result.articles[0].create_time, "Fri, 28 Aug 2026 01:00:00 GMT");
    assert.equal(result.articles[0].content_text, "RSS 正文内容。");
    assert.equal(result.articles[0].cover, "https://mmbiz.qpic.cn/cover.jpg");
});

test("WeRead RSS URL construction rejects unsafe input and never adds update=true", () => {
    assert.equal(
        service.buildFeedUrl({ feedId: "MP_WXS_123", count: 20, page: 2 }),
        "https://rss.tuotuzju.com/feeds/MP_WXS_123.atom?limit=20&page=2&mode=fulltext"
    );
    assert.throws(
        () => service.buildFeedUrl({ feedId: "../private" }),
        (error) => error.code === "WEWE_RSS_INVALID_FEED_ID" && error.status === 400
    );
    assert.throws(
        () => service.normalizeBaseUrl("http://rss.tuotuzju.com"),
        (error) => error.code === "WEWE_RSS_INVALID_BASE_URL"
    );
});

test("WeRead RSS fetches pages with fulltext and deduplicates links", async () => {
    const requested = [];
    const sleeps = [];
    const result = await service.fetchArticles({
        feedId: "MP_WXS_123",
        count: 1,
        maxPages: 2,
        pacing: { page_pause_seconds: 0.25 },
        runtime: { sleep: async (milliseconds) => sleeps.push(milliseconds) },
        request: async (url) => {
            requested.push(url);
            return {
                status: 200,
                data: requested.length === 1 ? atomFixture : rssFixture,
            };
        },
    });

    assert.equal(result.articles.length, 2);
    assert.equal(requested.length, 2);
    assert.equal(sleeps[0], 250);
    assert.equal(requested[0].includes("mode=fulltext"), true);
    assert.equal(requested[0].includes("update=true"), false);
    assert.equal(requested[1].includes("page=2"), true);
});

test("WeRead RSS rejects malformed feed responses", () => {
    assert.throws(
        () => service.parseFeed("<html>not a feed</html>"),
        (error) => error.code === "WEWE_RSS_INVALID_FEED" && error.status === 502
    );
});

test("WeRead RSS retries a transient request once", async () => {
    let attempts = 0;
    const sleeps = [];
    const xml = await service.fetchFeedPage({
        url: "https://rss.tuotuzju.com/feeds/MP_WXS_TEST.atom",
        retries: 1,
        runtime: { sleep: async (milliseconds) => sleeps.push(milliseconds) },
        request: async () => {
            attempts += 1;
            if (attempts === 1) {
                const error = new Error("temporary timeout");
                error.code = "ECONNABORTED";
                throw error;
            }
            return { status: 200, data: atomFixture };
        },
    });
    assert.equal(attempts, 2);
    assert.deepEqual(sleeps, [500]);
    assert.match(xml, /<feed/);
});
