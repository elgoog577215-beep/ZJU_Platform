const test = require("node:test");
const assert = require("node:assert/strict");

const storage = () => {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
    };
};

test("remembered login survives a new tab; session-only login does not; logout clears both", async (t) => {
    const original = global.window;
    global.window = { sessionStorage: storage(), localStorage: storage() };
    t.after(() => {
        if (original === undefined) delete global.window;
        else global.window = original;
    });
    const auth = await import("../../src/shared/authTokenStorage.js");
    auth.storeAuthToken("session-only");
    assert.equal(auth.getStoredAuthToken(), "session-only");
    global.window.sessionStorage = storage();
    assert.equal(auth.getStoredAuthToken(), "");

    auth.storeAuthToken("remembered", { persistent: true });
    global.window.sessionStorage = storage();
    assert.equal(auth.getStoredAuthToken(), "remembered");
    auth.clearStoredAuthToken();
    assert.equal(auth.getStoredAuthToken(), "");

    auth.storeAuthToken("old-persistent", { persistent: true });
    auth.storeAuthToken("new-session");
    assert.equal(auth.getStoredAuthToken(), "new-session");
    global.window.sessionStorage = storage();
    assert.equal(auth.getStoredAuthToken(), "");
});

test("blocked session storage does not hide a persistent login", async (t) => {
    const original = global.window;
    global.window = {
        get sessionStorage() {
            throw new Error("Storage access denied");
        },
        localStorage: storage(),
    };
    t.after(() => {
        if (original === undefined) delete global.window;
        else global.window = original;
    });
    const auth = await import("../../src/shared/authTokenStorage.js");
    auth.storeAuthToken("remembered", { persistent: true });
    assert.equal(auth.getStoredAuthToken(), "remembered");
    auth.clearStoredAuthToken();
    assert.equal(auth.getStoredAuthToken(), "");
});

test("blocked persistent storage falls back to the current session", async (t) => {
    const original = global.window;
    global.window = {
        sessionStorage: storage(),
        get localStorage() {
            throw new Error("Storage access denied");
        },
    };
    t.after(() => {
        if (original === undefined) delete global.window;
        else global.window = original;
    });
    const auth = await import("../../src/shared/authTokenStorage.js");
    auth.storeAuthToken("session-fallback", { persistent: true });
    assert.equal(auth.getStoredAuthToken(), "session-fallback");
    auth.clearStoredAuthToken();
    assert.equal(auth.getStoredAuthToken(), "");
});

test("unreadable storage does not prevent reading the other storage or signing out", async (t) => {
    const original = global.window;
    global.window = {
        sessionStorage: {
            getItem() {
                throw new Error("Storage access denied");
            },
            removeItem() {
                throw new Error("Storage access denied");
            },
        },
        localStorage: storage(),
    };
    t.after(() => {
        if (original === undefined) delete global.window;
        else global.window = original;
    });
    const auth = await import("../../src/shared/authTokenStorage.js");
    auth.storeAuthToken("remembered", { persistent: true });
    assert.equal(auth.getStoredAuthToken(), "remembered");
    auth.clearStoredAuthToken();
    assert.equal(auth.getStoredAuthToken(), "");
});

test("WeChat login carries the persistence choice without losing the return route", async () => {
    const { buildWechatLoginBridgeUrl, WECHAT_LOGIN_REMEMBER_QUERY } =
        await import("../../src/utils/wechatMiniProgramBridge.js");
    for (const remember of [true, false]) {
        const bridge = new URL(
            buildWechatLoginBridgeUrl("/events?category=tech#details", { remember }),
            "https://local.invalid"
        );
        const redirect = new URL(bridge.searchParams.get("redirect"), "https://local.invalid");
        assert.equal(bridge.pathname, "/pages/login/index");
        assert.equal(redirect.pathname, "/events");
        assert.equal(redirect.searchParams.get("category"), "tech");
        assert.equal(redirect.hash, "#details");
        assert.equal(redirect.searchParams.get(WECHAT_LOGIN_REMEMBER_QUERY), remember ? "1" : "0");
    }
});
