import assert from "node:assert/strict";
import test from "node:test";

import { formatServerDateTime, parseServerTimestamp } from "./serverDate.js";

test("server timestamps without an offset are treated as UTC", () => {
    assert.equal(
        parseServerTimestamp("2026-07-29 04:58:00")?.toISOString(),
        "2026-07-29T04:58:00.000Z"
    );
});

test("server timestamps are displayed in China Standard Time", () => {
    assert.equal(formatServerDateTime("2026-07-29 04:58:00", "zh-CN"), "07/29 12:58");
});
