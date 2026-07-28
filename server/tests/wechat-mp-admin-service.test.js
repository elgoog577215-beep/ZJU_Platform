const test = require("node:test");
const assert = require("node:assert/strict");

const {
    authenticatedUrlFromLoginPayload,
    assertTrustedMpRedirect,
    buildTrustedMpApiUrl,
    checkTokenHealth,
    classifyTokenHealthResponse,
    cookiesToHeader,
    credentialsFromBrowserState,
    extractArticleBody,
    extractAuthenticatedToken,
    localizeWechatArticleImages,
    normalizeDelayRangeSeconds,
    normalizeLoginWaitMs,
    normalizeMpArticle,
    normalizePacingOptions,
    parseMpArticlesPayload,
    randomSecondsInRange,
    redactCredentials,
    resolveArticleCoverUrl,
    sanitizeCredentials,
    trustedWechatAssetUrl,
    waitDelayRange,
    waitSeconds,
} = require("../src/services/wechatMpAdminService");

test("WeChat MP token health classifies valid, expired, and unavailable sessions", async () => {
    assert.equal(
        classifyTokenHealthResponse({ status: 200, data: { base_resp: { ret: 0 }, list: [] } })
            .status,
        "valid"
    );
    assert.equal(
        classifyTokenHealthResponse({
            status: 200,
            data: { base_resp: { ret: 200003, err_msg: "invalid session" } },
        }).status,
        "expired"
    );

    const valid = await checkTokenHealth({
        force: true,
        credentials: { token: "health-valid-token", cookie: "master_sid=health-valid" },
        request: async () => ({ status: 200, data: { base_resp: { ret: 0 }, list: [] } }),
    });
    assert.equal(valid.status, "valid");

    const expired = await checkTokenHealth({
        force: true,
        credentials: { token: "health-expired-token", cookie: "master_sid=health-expired" },
        request: async () => ({
            status: 200,
            data: { base_resp: { ret: 200003, err_msg: "invalid session" } },
        }),
    });
    assert.equal(expired.status, "expired");
    assert.equal(expired.reason, "invalid_session");

    const unavailable = await checkTokenHealth({
        force: true,
        credentials: { token: "health-unavailable-token", cookie: "master_sid=health-unavailable" },
        request: async () => {
            throw new Error("network timeout");
        },
    });
    assert.equal(unavailable.status, "expired");
    assert.equal(unavailable.reason, "check_failed");
});

test("WeChat MP token health cache avoids duplicate checks and refreshes after credentials change", async () => {
    let calls = 0;
    const credentials = { token: "health-cache-token", cookie: "master_sid=health-cache" };
    const request = async () => {
        calls += 1;
        return { status: 200, data: { base_resp: { ret: 0 }, list: [] } };
    };
    await checkTokenHealth({ force: true, credentials, request });
    await checkTokenHealth({ credentials, request });
    assert.equal(calls, 1);

    const changed = await checkTokenHealth({
        credentials: { token: "health-cache-token-2", cookie: "master_sid=health-cache-2" },
        request,
    });
    assert.equal(changed.status, "valid");
    assert.equal(calls, 2);
});

test("WeChat MP token extraction only accepts authenticated trusted backend URLs", () => {
    assert.equal(
        extractAuthenticatedToken(
            "https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&token=123456"
        ),
        "123456"
    );
    assert.equal(
        extractAuthenticatedToken("https://mp.weixin.qq.com/cgi-bin/login?token=123456"),
        ""
    );
    assert.equal(
        extractAuthenticatedToken("https://mp.weixin.qq.evil/cgi-bin/appmsg?token=123456"),
        ""
    );
    assert.equal(
        extractAuthenticatedToken("https://mp.weixin.qq.com/cgi-bin/appmsg?token=abc"),
        ""
    );
    assert.equal(
        extractAuthenticatedToken("https://mp.weixin.qq.com:444/cgi-bin/appmsg?token=123456"),
        ""
    );
    assert.equal(
        extractAuthenticatedToken("https://user:pass@mp.weixin.qq.com/cgi-bin/appmsg?token=123456"),
        ""
    );
});

test("WeChat MP login payload resolves only successful trusted redirects", () => {
    assert.equal(
        authenticatedUrlFromLoginPayload({
            base_resp: { ret: 0 },
            redirect_url: "/cgi-bin/home?t=home/index&token=987654",
        }),
        "https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=987654"
    );
    assert.equal(
        authenticatedUrlFromLoginPayload({
            base_resp: { ret: -1 },
            redirect_url: "/cgi-bin/home?t=home/index&token=987654",
        }),
        ""
    );
    assert.equal(
        authenticatedUrlFromLoginPayload({
            base_resp: { ret: 0 },
            redirect_url: "https://example.com/cgi-bin/home?token=987654",
        }),
        ""
    );
});

test("WeChat MP request boundaries reject untrusted APIs, redirects, and assets", () => {
    assert.equal(
        buildTrustedMpApiUrl("/cgi-bin/searchbiz"),
        "https://mp.weixin.qq.com/cgi-bin/searchbiz"
    );
    assert.throws(() => buildTrustedMpApiUrl("https://example.com/cgi-bin/searchbiz"), /不受信任/);
    assert.doesNotThrow(() =>
        assertTrustedMpRedirect({
            href: "https://mp.weixin.qq.com/s/example",
        })
    );
    assert.throws(() => assertTrustedMpRedirect({ href: "http://127.0.0.1/internal" }), /不受信任/);
    assert.equal(trustedWechatAssetUrl("https://mmbiz.qpic.cn/cover.png"), true);
    assert.equal(trustedWechatAssetUrl("https://qpic.cn.evil.example/cover.png"), false);
});

test("WeChat MP login timeout is bounded to a safe operational range", () => {
    assert.equal(normalizeLoginWaitMs(undefined), 300000);
    assert.equal(normalizeLoginWaitMs(1), 30000);
    assert.equal(normalizeLoginWaitMs(3600), 600000);
    assert.equal(normalizeLoginWaitMs(Number.POSITIVE_INFINITY), 300000);
});

test("WeChat MP delay ranges normalize and use injectable sleep", async () => {
    assert.deepEqual(normalizeDelayRangeSeconds([120, 55], [1, 2]), [55, 120]);
    assert.deepEqual(normalizeDelayRangeSeconds("", [55, 120]), [55, 120]);
    assert.deepEqual(normalizeDelayRangeSeconds("3,8", []), [3, 8]);
    assert.deepEqual(normalizeDelayRangeSeconds("bad", []), []);

    const waits = [];
    await waitDelayRange([10, 20], {
        random: () => 0.5,
        sleep: async (ms) => {
            waits.push(ms);
        },
    });
    assert.deepEqual(waits, [15000]);
});

test("WeChat MP browser state requires token and session cookies", () => {
    const credentials = credentialsFromBrowserState({
        urls: ["https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=24680"],
        cookies: [
            { name: "master_sid", value: "sid-value", path: "/" },
            { name: "data_ticket", value: "ticket-value", path: "/cgi-bin" },
        ],
    });

    assert.equal(credentials.token, "24680");
    assert.match(credentials.cookie, /data_ticket=ticket-value/);
    assert.match(credentials.cookie, /master_sid=sid-value/);

    const incomplete = credentialsFromBrowserState({
        urls: ["https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=24680"],
        cookies: [{ name: "not_session", value: "value", path: "/" }],
    });
    assert.equal(incomplete.token, undefined);
});

test("WeChat MP cookie headers keep specific paths first", () => {
    assert.equal(
        cookiesToHeader([
            { name: "wide", value: "1", path: "/" },
            { name: "deep", value: "2", path: "/cgi-bin" },
            { name: "deeper", value: "3", path: "/cgi-bin/appmsg" },
        ]),
        "deeper=3; deep=2; wide=1"
    );
});

test("WeChat MP article list payload parser unwraps nested publish info", () => {
    const parsed = parseMpArticlesPayload({
        publish_page: JSON.stringify({
            total_count: 2,
            publish_list: [
                {
                    publish_info: JSON.stringify({
                        appmsgex: [
                            { title: "First Article", link: "https://mp.weixin.qq.com/s/first" },
                            {
                                title: "Second Article",
                                content_url: "https://mp.weixin.qq.com/s/second",
                            },
                        ],
                    }),
                },
            ],
        }),
    });

    assert.equal(parsed.total, 2);
    assert.deepEqual(
        parsed.articles.map((article) => article.title),
        ["First Article", "Second Article"]
    );
});

test("WeChat MP article normalization drops unsafe links and cover URLs", () => {
    const article = normalizeMpArticle(
        {
            title: "Unsafe metadata",
            link: "javascript:alert(1)",
            cover: "http://127.0.0.1/private.png",
        },
        {
            accountName: "Test Account",
            fakeid: "fakeid",
            keyword: "",
        }
    );

    assert.equal(article.link, "");
    assert.equal(article.cover, "");

    const upgraded = normalizeMpArticle(
        {
            title: "Legacy metadata",
            link: "http://mp.weixin.qq.com/s/legacy",
            cover: "//mmbiz.qpic.cn/legacy.png",
        },
        {
            accountName: "Test Account",
            fakeid: "fakeid",
            keyword: "",
        }
    );
    assert.equal(upgraded.link, "https://mp.weixin.qq.com/s/legacy");
    assert.equal(upgraded.cover, "https://mmbiz.qpic.cn/legacy.png");
});

test("WeChat MP article extractor returns clean text and image candidates", () => {
    const parsed = extractArticleBody(`
    <html>
      <head>
        <meta property="og:title" content="Campus Notice">
        <meta property="og:article:author" content="ZJU Office">
        <meta name="description" content="Useful notice">
      </head>
      <body>
        <div id="js_content">
          <p>Line one&nbsp; text.</p>
          <script>alert("bad")</script>
          <p>Line two text.</p>
          <img data-src="https://mmbiz.qpic.cn/cover.png">
          <img src="https://mmbiz.qpic.cn/emoji.png">
          <section style="background-image:url('https://mmbiz.qpic.cn/background.png');">Decorated block</section>
          <section style="background:url('https://mmbiz.qpic.cn/qrcode.png') center/cover;">QR block</section>
        </div>
      </body>
    </html>
  `);

    assert.equal(parsed.title, "Campus Notice");
    assert.equal(parsed.author, "ZJU Office");
    assert.equal(parsed.summary, "Useful notice");
    assert.equal(parsed.coverImage, "https://mmbiz.qpic.cn/cover.png");
    assert.match(parsed.contentText, /Line one text/);
    assert.match(parsed.contentText, /Line two text/);
    assert.doesNotMatch(parsed.contentText, /alert/);
    assert.deepEqual(parsed.images, [
        "https://mmbiz.qpic.cn/cover.png",
        "https://mmbiz.qpic.cn/background.png",
    ]);
});

test("WeChat MP article images are localized before admin preview", async () => {
    const localized = await localizeWechatArticleImages(
        {
            coverImage: "https://mmbiz.qpic.cn/cover.png",
            contentHtml:
                '<section style="background-image:url(&quot;https://mmbiz.qpic.cn/background.png&quot;);"><img data-src="https://mmbiz.qpic.cn/body.png" src="https://mp.weixin.qq.com/placeholder"></section>',
            images: ["https://mmbiz.qpic.cn/body.png"],
        },
        {
            downloader: async (url) =>
                `/uploads/covers/${url.includes("cover") ? "cover" : url.includes("background") ? "background" : "body"}.jpg`,
        }
    );

    assert.equal(localized.coverImage, "/uploads/covers/cover.jpg");
    assert.deepEqual(localized.images, [
        "/uploads/covers/body.jpg",
        "/uploads/covers/background.jpg",
    ]);
    assert.match(localized.contentHtml, /src="\/uploads\/covers\/body\.jpg"/);
    assert.match(
        localized.contentHtml,
        /background-image:url\(&quot;\/uploads\/covers\/background\.jpg&quot;\)/
    );
    assert.doesNotMatch(localized.contentHtml, /data-src/);
    assert.doesNotMatch(localized.contentHtml, /srcset/);
    assert.doesNotMatch(localized.contentHtml, /mmbiz\.qpic\.cn/);
});

test("WeChat MP article cover fallback only accepts trusted assets", () => {
    assert.equal(
        resolveArticleCoverUrl({ cover: "//mmbiz.qpic.cn/list-cover.png" }),
        "https://mmbiz.qpic.cn/list-cover.png"
    );
    assert.equal(
        resolveArticleCoverUrl({ coverImage: "https://mmbiz.qpic.cn/list-cover-image.png" }),
        "https://mmbiz.qpic.cn/list-cover-image.png"
    );
    assert.equal(resolveArticleCoverUrl({ cover: "https://qpic.cn.evil.example/cover.png" }), "");
    assert.equal(
        resolveArticleCoverUrl({}, "https://mmbiz.qpic.cn/fallback-cover.png"),
        "https://mmbiz.qpic.cn/fallback-cover.png"
    );
});

test("WeChat MP credential sanitization and redaction avoid leaking secrets", () => {
    const publicCredentials = sanitizeCredentials({
        token: "1234567890",
        cookie: "master_sid=sid-value; data_ticket=ticket-value",
        source: "file",
        updated_at: "2026-07-10T00:00:00.000Z",
    });

    assert.equal(publicCredentials.present, true);
    assert.equal(publicCredentials.token_mask, "1234***7890");
    assert.deepEqual(publicCredentials.cookie_names, ["master_sid", "data_ticket"]);

    const redacted = redactCredentials(
        "request failed token=1234567890 Cookie: master_sid=sid-value; data_ticket=ticket-value",
        {
            token: "1234567890",
            cookie: "master_sid=sid-value; data_ticket=ticket-value",
        }
    );
    assert.doesNotMatch(redacted, /1234567890/);
    assert.doesNotMatch(redacted, /sid-value/);
    assert.match(redacted, /\[REDACTED\]/);
});

test("WeChat MP pacing defaults inherit scrape-hub account delay range", () => {
    assert.deepEqual(normalizePacingOptions({}).queryDelayRangeSeconds, [95, 125]);
    assert.deepEqual(
        normalizePacingOptions({ query_delay_range: "" }).queryDelayRangeSeconds,
        [95, 125]
    );
    assert.deepEqual(
        normalizePacingOptions({ page_pause_range: "" }).pagePauseRangeSeconds,
        [10, 25]
    );
    assert.deepEqual(
        normalizePacingOptions({ content_delay_range: "" }).contentDelayRangeSeconds,
        [10, 20]
    );
    assert.deepEqual(normalizeDelayRangeSeconds([120, 55], [1, 2]), [55, 120]);
    assert.deepEqual(normalizeDelayRangeSeconds([0, 0], [55, 120]), []);
});

test("WeChat MP pacing can compute and wait injected delays without sleeping in tests", async () => {
    assert.equal(
        randomSecondsInRange([95, 125], () => 0),
        95
    );
    assert.equal(
        randomSecondsInRange([95, 125], () => 0.5),
        110
    );

    const waited = [];
    const fixed = await waitSeconds(1.25, {
        sleep: async (ms) => waited.push(ms),
    });
    assert.equal(fixed, 1.25);
    assert.deepEqual(waited, [1250]);

    const randomWait = await waitDelayRange([10, 20], {
        random: () => 0.25,
        sleep: async (ms) => waited.push(ms),
    });
    assert.equal(randomWait, 12.5);
    assert.deepEqual(waited, [1250, 12500]);
});
