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
