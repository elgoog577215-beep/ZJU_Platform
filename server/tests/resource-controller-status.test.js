const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeEventWorkflowStatus } = require("../src/utils/resourceWorkflowStatus");
const { _test: resourceControllerTest } = require("../src/controllers/resourceController");

test("explicit pending event imports stay in manual review for administrators", () => {
    assert.equal(normalizeEventWorkflowStatus("pending", { role: "admin" }), "pending");
});

test("event status defaults preserve existing administrator bypass when no status is requested", () => {
    assert.equal(normalizeEventWorkflowStatus(undefined, { role: "admin" }), null);
    assert.equal(normalizeEventWorkflowStatus("approved", { role: "admin" }), "approved");
});

test("non-admin event approval requests still require review", () => {
    assert.equal(
        normalizeEventWorkflowStatus("approved", {
            role: "user",
            review_permission: "normal",
        }),
        "pending"
    );
});

test("event search qualifies fields when profile joins are present", () => {
    const filter = resourceControllerTest.buildEventSearchFilter("%highlight%", "highlight");

    assert.match(filter.clause, /"events"\."description" LIKE \?/);
    assert.match(filter.clause, /"events"\."title" LIKE \?/);
    assert.doesNotMatch(filter.clause, /(?<!events\.)description LIKE/);
});
