const test = require("node:test");
const assert = require("node:assert/strict");

const {
    SALON_EVENT_CATEGORY,
    SALON_EVENT_TAG,
    normalizeSalonEventPayload,
    normalizeSalonEventQuery,
} = require("../src/utils/salonEventContract");

test("salon event payload forces the shared event contract", () => {
    const normalized = normalizeSalonEventPayload({
        title: "AI 工具夜谈",
        category: "competition",
        tags: "AI,交流,沙龙",
    });

    assert.equal(normalized.category, SALON_EVENT_CATEGORY);
    assert.equal(normalized.tags, "AI,交流,沙龙");
    assert.equal(normalized.tag, "AI,交流,沙龙");
});

test("salon event payload restores a removed salon tag", () => {
    const normalized = normalizeSalonEventPayload({
        title: "模型应用分享",
        category: "recruitment",
        tags: "AI",
    });

    assert.equal(normalized.category, SALON_EVENT_CATEGORY);
    assert.equal(normalized.tags, `AI,${SALON_EVENT_TAG}`);
});

test("salon event query cannot be widened by client filters", () => {
    const normalized = normalizeSalonEventQuery({
        category: "other",
        tag: "招新",
        status: "all",
        search: "Agent",
    });

    assert.deepEqual(normalized, {
        category: SALON_EVENT_CATEGORY,
        category_exact: SALON_EVENT_CATEGORY,
        tag: SALON_EVENT_TAG,
        status: "approved",
        search: "Agent",
    });
});
