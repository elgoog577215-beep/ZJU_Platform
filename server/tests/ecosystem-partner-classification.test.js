const test = require("node:test");
const assert = require("node:assert/strict");

const {
    normalizeSupportCategory,
    SUPPORT_CATEGORY_VALUES,
} = require("../src/utils/ecosystemPartnerClassification");

test("ecosystem partner API classification accepts five support categories", () => {
    assert.deepEqual(
        [...SUPPORT_CATEGORY_VALUES],
        ["college", "technology_enterprise", "industry_enterprise", "capital", "club"]
    );
    assert.equal(normalizeSupportCategory("capital", "enterprise"), "capital");
    assert.equal(
        normalizeSupportCategory("industry_enterprise", "enterprise"),
        "industry_enterprise"
    );
});

test("ecosystem partner API classification derives safe legacy defaults", () => {
    assert.equal(normalizeSupportCategory("", "school"), "college");
    assert.equal(normalizeSupportCategory(null, "organization"), "club");
    assert.equal(
        normalizeSupportCategory("legacy-enterprise", "enterprise"),
        "technology_enterprise"
    );
});
