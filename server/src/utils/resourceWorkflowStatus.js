const { canBypassReview, canManageResource } = require("./userPermissions");

const normalizeEventWorkflowStatus = (requestedStatus, user = {}) => {
    const normalized = String(requestedStatus || "")
        .trim()
        .toLowerCase();
    if (!normalized) return null;

    // Event import payloads explicitly use pending so that imported content still
    // enters the review queue even when the uploader is an administrator.
    if (normalized === "draft" || normalized === "pending") return normalized;

    if (canManageResource(user, "events") && ["approved", "rejected"].includes(normalized)) {
        return normalized;
    }

    return canManageResource(user, "events") || canBypassReview(user) ? "approved" : "pending";
};

module.exports = {
    normalizeEventWorkflowStatus,
};
