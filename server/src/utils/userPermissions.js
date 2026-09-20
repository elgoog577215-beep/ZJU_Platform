const ACCOUNT_TYPES = new Set(["personal", "organization"]);
const REVIEW_PERMISSIONS = new Set(["normal", "trusted", "admin"]);
const ADMIN_SCOPES = new Set(["none", "platform", "organization", "operations"]);
// Operators share the admin workspace, with module grants and no private-system authority.
const ADMIN_PERMISSION_KEYS = new Set([
    "admin.dashboard.read",
    "admin.events.manage",
    "admin.content.manage",
    "admin.review.manage",
    "admin.projects.manage",
    "admin.partners.manage",
    "admin.taxonomy.manage",
    "admin.pages.manage",
]);
const normalize = (value, allowed, fallback) => {
    const key = String(value || "")
        .trim()
        .toLowerCase();
    return allowed.has(key) ? key : fallback;
};
const normalizeAccountType = (value, fallback = "personal") =>
    normalize(value, ACCOUNT_TYPES, fallback);
const normalizeReviewPermission = (value, fallback = "normal") =>
    normalize(value, REVIEW_PERMISSIONS, fallback);
const normalizeAdminScope = (value, fallback = "none") => normalize(value, ADMIN_SCOPES, fallback);
const parseArray = (value) => {
    if (Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};
const normalizeAdminPermissions = (value) =>
    [...new Set(parseArray(value))].filter((key) => ADMIN_PERMISSION_KEYS.has(key));
const isPlatformAdmin = (user) =>
    user?.role === "admin" && (!user.admin_scope || user.admin_scope === "platform");
const isAdmin = (user) =>
    isPlatformAdmin(user) || (user?.role === "operator" && user.admin_scope === "operations");
const getAdminScope = (user) =>
    isPlatformAdmin(user) ? "platform" : isAdmin(user) ? "operations" : "none";
const getAdminPermissions = (user) =>
    isPlatformAdmin(user)
        ? ["*"]
        : isAdmin(user)
          ? normalizeAdminPermissions(user.admin_permissions)
          : [];
const hasAdminPermission = (user, permission) =>
    isPlatformAdmin(user) || getAdminPermissions(user).includes(permission);
const resourcePermission = (table) =>
    table === "events" ? "admin.events.manage" : "admin.content.manage";
const canManageResource = (user, table) => hasAdminPermission(user, resourcePermission(table));
const canReviewResource = (user, table) =>
    canManageResource(user, table) || hasAdminPermission(user, "admin.review.manage");
const canManageCommunity = (user) => hasAdminPermission(user, "admin.content.manage");
const getAdminCapabilities = (user) => ({
    scope: getAdminScope(user),
    permissions: getAdminPermissions(user),
    isPlatformAdmin: isPlatformAdmin(user),
    configurablePermissions: isPlatformAdmin(user) ? [...ADMIN_PERMISSION_KEYS] : [],
});
const canBypassReview = (user = {}) =>
    isPlatformAdmin(user) ||
    ["trusted", "admin"].includes(normalizeReviewPermission(user.review_permission));
const defaultReviewStatusForUser = (
    user = {},
    { requestedStatus = "", allowDraft = true } = {}
) => {
    if (
        allowDraft &&
        String(requestedStatus || "")
            .trim()
            .toLowerCase() === "draft"
    )
        return "draft";
    return canBypassReview(user) ? "approved" : "pending";
};
module.exports = {
    ACCOUNT_TYPES,
    REVIEW_PERMISSIONS,
    ADMIN_SCOPES,
    ADMIN_PERMISSION_KEYS,
    resourcePermission,
    canManageResource,
    canReviewResource,
    canManageCommunity,
    normalizeAccountType,
    normalizeReviewPermission,
    normalizeAdminScope,
    normalizeAdminPermissions,
    getAdminScope,
    getAdminPermissions,
    getAdminCapabilities,
    isAdmin,
    isPlatformAdmin,
    hasAdminPermission,
    canBypassReview,
    defaultReviewStatusForUser,
};
