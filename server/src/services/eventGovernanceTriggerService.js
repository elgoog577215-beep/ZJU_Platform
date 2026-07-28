const toText = (value, maxLength = 240) =>
    String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);

const normalizeEventId = (value) => {
    const eventId = Number(value);
    return Number.isInteger(eventId) && eventId > 0 ? eventId : null;
};

const resolveScan = (scan) => scan || require("./unifiedAiAssistantService").scanEventGovernance;

const recordTriggerFailure = async (db, { eventId, userId, source, error } = {}) => {
    try {
        await db.run(
            `
        INSERT INTO ai_assistant_runs (
          module,
          action,
          status,
          requested_by,
          summary_json
        ) VALUES (?, ?, ?, ?, ?)
      `,
            [
                "event_governance",
                "auto_scan",
                "failed",
                userId || null,
                JSON.stringify({
                    eventIds: eventId ? [eventId] : [],
                    triggerSource: source || "automatic",
                    errorCode: error?.code || "EVENT_GOVERNANCE_AUTO_SCAN_FAILED",
                    error: toText(error?.message || error),
                }),
            ]
        );
    } catch {
        // Automatic governance must not make content creation fail when audit tables are unavailable.
    }
};

const triggerEventGovernance = async (
    db,
    { eventId, userId = null, source = "automatic", scan = null } = {}
) => {
    const normalizedEventId = normalizeEventId(eventId);
    if (!normalizedEventId) {
        return {
            status: "skipped",
            reason: "invalid_event_id",
            eventId: null,
        };
    }

    try {
        const result = await resolveScan(scan)(db, {
            eventIds: [normalizedEventId],
            limit: 1,
            minConfidence: 0.45,
            userId,
            action: "auto_scan",
            triggerSource: source,
        });
        return {
            status: "completed",
            eventId: normalizedEventId,
            ...result,
        };
    } catch (error) {
        await recordTriggerFailure(db, {
            eventId: normalizedEventId,
            userId,
            source,
            error,
        });
        return {
            status: "failed",
            eventId: normalizedEventId,
            errorCode: error?.code || "EVENT_GOVERNANCE_AUTO_SCAN_FAILED",
            error: toText(error?.message || error),
        };
    }
};

module.exports = {
    normalizeEventId,
    triggerEventGovernance,
};
