const rateLimit = require("express-rate-limit");
const { readRequestIdentity } = require("./auth");
const { isAdmin } = require("../utils/userPermissions");

const isAuthenticatedAdmin = async (req) => {
    try {
        return isAdmin(await readRequestIdentity(req));
    } catch {
        // Invalid, revoked, or unverifiable sessions receive no exemption.
        return false;
    }
};

const createApiRateLimiters = (env = process.env) => {
    const isLocalDevRequest = (req) => {
        if (env.NODE_ENV === "production") return false;
        const ip = String(req.ip || req.connection?.remoteAddress || "").trim();
        return (
            ip === "127.0.0.1" ||
            ip === "::1" ||
            ip === "::ffff:127.0.0.1" ||
            ip.endsWith("localhost")
        );
    };
    const windowMs = parseInt(env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
    const generalLimiter = rateLimit({
        windowMs,
        max: parseInt(env.RATE_LIMIT_MAX_REQUESTS) || 5000,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => {
            // Mounted at /api: req.path no longer contains that prefix.
            const path = req.path || "";
            return (
                isLocalDevRequest(req) ||
                path === "/settings" ||
                path === "/auth" ||
                path.startsWith("/auth/") ||
                isAuthenticatedAdmin(req)
            );
        },
        handler: (req, res) => {
            res.status(429).json({
                error: "Rate limit exceeded",
                message: "Too many requests, please try again later.",
                retryAfter: Math.ceil(windowMs / 1000),
            });
        },
    });
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: parseInt(env.AUTH_RATE_LIMIT_MAX) || 20,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => isLocalDevRequest(req) || req.path === "/me" || isAuthenticatedAdmin(req),
        skipSuccessfulRequests: true,
        message: {
            error: "Too many login attempts, please try again later.",
            retryAfter: "900",
        },
    });
    return { generalLimiter, authLimiter };
};

module.exports = { createApiRateLimiters };
