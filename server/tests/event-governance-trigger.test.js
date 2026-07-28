const test = require("node:test");
const assert = require("node:assert/strict");

const { triggerEventGovernance } = require("../src/services/eventGovernanceTriggerService");

test("automatic event governance scopes the scan to the newly created event", async () => {
    const calls = [];
    const scan = async (db, options) => {
        calls.push({ db, options });
        return {
            runId: 17,
            summary: { scannedEventCount: 1 },
            suggestions: [],
        };
    };

    const db = { name: "test-db" };
    const result = await triggerEventGovernance(db, {
        eventId: "42",
        userId: 9,
        source: "test-automatic-create",
        scan,
    });

    assert.equal(result.status, "completed");
    assert.equal(result.eventId, 42);
    assert.equal(result.runId, 17);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].db, db);
    assert.deepEqual(calls[0].options, {
        eventIds: [42],
        limit: 1,
        minConfidence: 0.45,
        userId: 9,
        action: "auto_scan",
        triggerSource: "test-automatic-create",
    });
});

test("automatic event governance skips invalid event IDs", async () => {
    let called = false;
    const result = await triggerEventGovernance(
        {},
        {
            eventId: "not-an-event",
            scan: async () => {
                called = true;
            },
        }
    );

    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "invalid_event_id");
    assert.equal(called, false);
});

test("automatic event governance records failures without rejecting content creation", async () => {
    const auditCalls = [];
    const db = {
        run: async (...args) => {
            auditCalls.push(args);
        },
    };

    const result = await triggerEventGovernance(db, {
        eventId: 8,
        source: "test-failure",
        scan: async () => {
            const error = new Error("model unavailable");
            error.code = "AI_UNAVAILABLE";
            throw error;
        },
    });

    assert.equal(result.status, "failed");
    assert.equal(result.eventId, 8);
    assert.equal(result.errorCode, "AI_UNAVAILABLE");
    assert.equal(auditCalls.length, 1);
    assert.match(auditCalls[0][0], /INSERT INTO ai_assistant_runs/);
    assert.match(auditCalls[0][1][4], /test-failure/);
});
