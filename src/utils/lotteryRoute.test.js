import test from "node:test";
import assert from "node:assert/strict";
import { getLotteryUrl } from "./lotteryRoute.js";

test("promotion QR links point to the exact event and campaign, retaining standalone history", () => {
    assert.equal(
        getLotteryUrl({ id: "first", event_key: "zhekesong-current" }),
        "/hackathon/1/lottery?campaign=first"
    );
    assert.equal(
        getLotteryUrl({ id: "second", event_key: "zhekesong-ai-x-2026" }),
        "/hackathon/2/lottery?campaign=second"
    );
    assert.equal(
        getLotteryUrl({ id: "beauty", event_key: "getui-beauty-2026" }),
        "/hackathon/getui-beauty/lottery?campaign=beauty"
    );
    assert.equal(getLotteryUrl({ id: "legacy", event_key: null }), "/lotteries/legacy");
});
