const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../controllers/authController");
const { getDb } = require("../config/db");
const {
    isAdmin: isAdminUser,
    isPlatformAdmin,
    hasAdminPermission,
} = require("../utils/userPermissions");

const readIdentity = async (token) => {
    const payload = jwt.verify(token, SECRET_KEY, { algorithms: ["HS256"] });
    const db = await getDb();
    const user = await db.get(
        `SELECT id, username, role, account_type, review_permission,
        admin_scope, admin_permissions, auth_version FROM users WHERE id = ?`,
        [payload.id]
    );
    if (
        !user ||
        user.role === "banned" ||
        Number(payload.auth_version || 0) !== Number(user.auth_version || 0)
    ) {
        const error = new Error("Session revoked");
        error.name = "JsonWebTokenError";
        throw error;
    }
    // All authority comes from the current database row. Never reuse token privileges.
    return user;
};
const tokenFrom = (req) => req.headers.authorization?.split(" ")[1];
const authenticateToken = async (req, res, next) => {
    const token = tokenFrom(req);
    if (!token) return res.sendStatus(401);
    try {
        req.user = await readIdentity(token);
        res.set("Cache-Control", "no-store");
        next();
    } catch (error) {
        const invalid = ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
            error.name
        );
        res.status(invalid ? 401 : 503).json({
            error: invalid ? "Invalid or expired token" : "Authentication unavailable",
        });
    }
};
const optionalAuth = async (req, res, next) => {
    if (!tokenFrom(req)) return next();
    try {
        req.user = await readIdentity(tokenFrom(req));
    } catch (error) {
        if (!["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error.name)) {
            return res.status(503).json({ error: "Authentication unavailable" });
        }
    }
    next();
};
const isAdmin = (req, res, next) =>
    isPlatformAdmin(req.user)
        ? next()
        : res.status(403).json({ error: "Platform admin access required" });
const isScopedAdmin = (req, res, next) =>
    isAdminUser(req.user) ? next() : res.status(403).json({ error: "Admin access required" });
const requireAdminPermission = (key) => (req, res, next) =>
    hasAdminPermission(req.user, key)
        ? next()
        : res.status(403).json({ error: "Admin permission required", permission: key });
const requireAnyAdminPermission =
    (...keys) =>
    (req, res, next) =>
        keys.some((key) => hasAdminPermission(req.user, key))
            ? next()
            : res.status(403).json({ error: "Admin permission required" });
const PAGE_CONTENT_KEYS = new Set([
    "site_title",
    "favicon_url",
    "hero_title",
    "hero_subtitle",
    "hero_bg_url",
    "about_title",
    "about_subtitle",
    "profile_image_url",
    "about_intro",
    "about_detail",
    "about_exp_years",
    "about_exhibitions",
    "about_projects",
    "contact_email",
    "contact_phone",
    "contact_address",
    "social_github",
    "social_twitter",
    "social_instagram",
    "social_linkedin",
]);
const canUpdateSetting = (req, res, next) =>
    isPlatformAdmin(req.user) ||
    (hasAdminPermission(req.user, "admin.pages.manage") && PAGE_CONTENT_KEYS.has(req.body?.key))
        ? next()
        : res.status(403).json({ error: "Setting access denied" });
module.exports = {
    authenticateToken,
    optionalAuth,
    isAdmin,
    isScopedAdmin,
    requireAdminPermission,
    requireAnyAdminPermission,
    canUpdateSetting,
};
