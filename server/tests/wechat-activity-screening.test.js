const test = require("node:test");
const assert = require("node:assert/strict");

const {
    ACTIVITY_CONFIDENCE_THRESHOLD,
    resolveWechatImportDecision,
    screenActivityCandidate,
} = require("../src/utils/wechatActivityScreening");

test("AI rejects completed imports that are not activity candidates", () => {
    const decision = resolveWechatImportDecision({
        resourceType: "event",
        analysisStatus: "completed",
        parsed: {
            is_activity_candidate: false,
            activity_confidence: 0.98,
            activity_reason: "文章是成果报道，不是参与型活动",
        },
    });

    assert.equal(decision.status, "rejected");
    assert.equal(decision.rejectionReason, "文章是成果报道，不是参与型活动");
});

test("AI rejects low-confidence activity candidates before manual review", () => {
    const screening = screenActivityCandidate({
        is_activity_candidate: true,
        activity_confidence: ACTIVITY_CONFIDENCE_THRESHOLD - 0.01,
    });

    assert.equal(screening.accepted, false);
    assert.match(screening.reason, /低于阈值/);
});

test("AI failures keep manual imports pending for fallback review", () => {
    const decision = resolveWechatImportDecision({
        resourceType: "event",
        analysisStatus: "failed",
    });

    assert.equal(decision.status, "pending");
    assert.equal(decision.rejectionReason, "");
});

test("valid completed event candidates remain in the review workflow", () => {
    const decision = resolveWechatImportDecision({
        resourceType: "event",
        analysisStatus: "completed",
        parsed: {
            is_activity_candidate: true,
            activity_confidence: 0.92,
            activity_reason: "包含明确报名和参与安排",
        },
        requestedStatus: "pending",
    });

    assert.equal(decision.status, "pending");
    assert.equal(decision.rejectionReason, "");
});

test("article imports do not use event candidate rejection", () => {
    const decision = resolveWechatImportDecision({
        resourceType: "article",
        analysisStatus: "completed",
        parsed: { is_activity_candidate: false },
        requestedStatus: "approved",
    });

    assert.equal(decision.status, "approved");
    assert.equal(decision.rejectionReason, "");
});
