const test = require("node:test");
const assert = require("node:assert/strict");

const service = require("../src/services/wechatReadRssAdminService");

const baseOptions = {
    baseUrl: "https://rss.example.test",
    authCode: "server-only-auth-code",
};

test("WeWe RSS management proxy encodes tRPC requests and unwraps batch responses", async () => {
    const calls = [];
    const result = await service.requestTrpc(
        "account.list",
        { limit: 20 },
        {
            ...baseOptions,
            request: async (options) => {
                calls.push(options);
                return {
                    status: 200,
                    data: [
                        {
                            result: {
                                data: {
                                    json: { items: [{ id: "1", name: "测试账号", status: 1 }] },
                                },
                            },
                        },
                    ],
                };
            },
        }
    );

    assert.deepEqual(result, { items: [{ id: "1", name: "测试账号", status: 1 }] });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "GET");
    assert.equal(calls[0].headers.Authorization, "server-only-auth-code");
    const url = new URL(calls[0].url);
    assert.equal(url.pathname, "/trpc/account.list");
    assert.equal(url.searchParams.get("batch"), "1");
    assert.deepEqual(JSON.parse(url.searchParams.get("input")), {
        0: { json: { limit: 20 } },
    });
});

test("WeWe RSS management proxy never exposes its authorization code when listing accounts", async () => {
    const result = await service.listAccounts({
        ...baseOptions,
        request: async () => ({
            status: 200,
            data: {
                result: {
                    data: {
                        json: {
                            blocks: ["blocked"],
                            items: [
                                {
                                    id: "reader-1",
                                    token: "must-not-leak",
                                    name: "读书账号",
                                    status: 1,
                                },
                            ],
                        },
                    },
                },
            },
        }),
    });

    assert.deepEqual(result, {
        blocks: ["blocked"],
        items: [
            {
                id: "reader-1",
                name: "读书账号",
                status: 1,
                createdAt: null,
                updatedAt: null,
            },
        ],
        nextCursor: null,
    });
    assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
});

test("WeRead login is completed server-side and only returns a sanitized account", async () => {
    const responses = [
        {
            status: 200,
            data: [
                {
                    result: {
                        data: { json: { uuid: "login-session-1", scanUrl: "https://scan" } },
                    },
                },
            ],
        },
        {
            status: 200,
            data: [
                {
                    result: {
                        data: {
                            json: {
                                vid: 12345,
                                token: "private-weread-token",
                                username: "测试账号",
                            },
                        },
                    },
                },
            ],
        },
        {
            status: 200,
            data: [
                {
                    result: {
                        data: {
                            json: {
                                id: "12345",
                                name: "测试账号",
                                status: 1,
                                token: "private-weread-token",
                            },
                        },
                    },
                },
            ],
        },
    ];
    const calls = [];
    const request = async (options) => {
        calls.push(options);
        return responses.shift();
    };

    const login = await service.startLogin({ ...baseOptions, request });
    const status = await service.getLoginStatus(login.uuid, { ...baseOptions, request });

    assert.equal(login.scan_url, "https://scan");
    assert.equal(status.stage, "saved");
    assert.deepEqual(status.account, {
        id: "12345",
        name: "测试账号",
        status: 1,
        createdAt: null,
        updatedAt: null,
    });
    assert.equal(JSON.stringify(status).includes("private-weread-token"), false);
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[1].method, "GET");
    assert.equal(calls[2].method, "POST");
    assert.deepEqual(calls[2].data[0].json, {
        id: "12345",
        token: "private-weread-token",
        name: "测试账号",
        status: 1,
    });
});

test("WeWe RSS management API reports missing server-side authorization without making a request", async () => {
    let requestCount = 0;
    await assert.rejects(
        () =>
            service.listFeeds({
                baseUrl: baseOptions.baseUrl,
                request: async () => {
                    requestCount += 1;
                },
            }),
        (error) => error.code === "WEWE_RSS_MANAGEMENT_AUTH_NOT_CONFIGURED" && error.status === 503
    );
    assert.equal(requestCount, 0);
});

test("WeWe RSS management maps feed and article operations to protected procedures", async () => {
    const procedures = [];
    const request = async (options) => {
        procedures.push({ method: options.method, url: options.url, data: options.data });
        const path = new URL(options.url).pathname;
        if (path.endsWith("/platform.getMpInfo")) {
            return {
                status: 200,
                data: [
                    {
                        result: {
                            data: {
                                json: [
                                    {
                                        id: "MP_DISCOVERED",
                                        name: "发现的公众号",
                                        cover: "https://cdn.example.test/cover.jpg",
                                        intro: "公众号介绍",
                                        updateTime: 123,
                                    },
                                ],
                            },
                        },
                    },
                ],
            };
        }
        if (path.endsWith("/feed.list")) {
            return {
                status: 200,
                data: {
                    result: {
                        data: { json: { items: [{ id: "MP_TEST", mpName: "测试公众号" }] } },
                    },
                },
            };
        }
        if (path.endsWith("/article.list")) {
            return {
                status: 200,
                data: {
                    result: {
                        data: {
                            json: { items: [{ id: "article-1", mpId: "MP_TEST", title: "文章" }] },
                        },
                    },
                },
            };
        }
        return { status: 200, data: [{ result: { data: { json: null } } }] };
    };

    const discovered = await service.discoverFeed("https://mp.weixin.qq.com/s/discover", {
        ...baseOptions,
        request,
    });
    const feeds = await service.listFeeds({ ...baseOptions, request });
    const articles = await service.listArticles({
        mpId: "MP_TEST",
        limit: 10,
        ...baseOptions,
        request,
    });
    await service.refreshFeed("MP_TEST", { ...baseOptions, request });

    assert.equal(discovered.items[0].mpName, "发现的公众号");
    assert.equal(discovered.items[0].mpCover, "https://cdn.example.test/cover.jpg");
    assert.equal(discovered.items[0].mpIntro, "公众号介绍");
    assert.equal(feeds.items[0].feedUrl, "https://rss.example.test/feeds/MP_TEST.atom");
    assert.equal(articles.items[0].title, "文章");
    assert.equal(procedures[0].method, "POST");
    assert.equal(procedures[1].method, "GET");
    assert.equal(procedures[2].method, "GET");
    assert.equal(procedures[3].method, "POST");
    assert.deepEqual(procedures[3].data[0].json, { mpId: "MP_TEST" });
});
