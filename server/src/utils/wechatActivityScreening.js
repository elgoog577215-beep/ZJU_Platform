const ACTIVITY_CONFIDENCE_THRESHOLD = 0.7;

const isActivityCandidate = (value) =>
    value === true ||
    value === 1 ||
    String(value || "")
        .trim()
        .toLowerCase() === "true";

const screenActivityCandidate = (parsed = {}) => {
    const candidate = isActivityCandidate(parsed?.is_activity_candidate);
    const confidence = Number(parsed?.activity_confidence);
    const normalizedConfidence = Number.isFinite(confidence)
        ? Math.min(Math.max(0, confidence), 1)
        : 0;
    const reason = String(parsed?.activity_reason || "")
        .trim()
        .slice(0, 500);
    const accepted = candidate && normalizedConfidence >= ACTIVITY_CONFIDENCE_THRESHOLD;

    return {
        accepted,
        candidate,
        confidence: normalizedConfidence,
        reason: accepted
            ? reason || "通过活动候选筛选"
            : reason ||
              (candidate
                  ? `活动候选置信度 ${normalizedConfidence.toFixed(2)} 低于阈值 ${ACTIVITY_CONFIDENCE_THRESHOLD.toFixed(2)}`
                  : "AI 判定为非活动候选"),
    };
};

const resolveWechatImportDecision = ({
    resourceType = "event",
    analysisStatus = "",
    parsed = null,
    requestedStatus,
} = {}) => {
    const normalizedType = String(resourceType || "event")
        .trim()
        .toLowerCase();
    const isEvent = normalizedType === "event" || normalizedType === "events";

    if (analysisStatus !== "completed") {
        return { status: "pending", rejectionReason: "" };
    }

    if (!isEvent) {
        return { status: requestedStatus, rejectionReason: "" };
    }

    const screening = screenActivityCandidate(parsed);
    if (!screening.accepted) {
        return {
            status: "rejected",
            rejectionReason: screening.reason,
            screening,
        };
    }

    return {
        status: requestedStatus,
        rejectionReason: "",
        screening,
    };
};

module.exports = {
    ACTIVITY_CONFIDENCE_THRESHOLD,
    isActivityCandidate,
    resolveWechatImportDecision,
    screenActivityCandidate,
};
