const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getDb } = require("../config/db");
const {
    validateRegistrationProfile,
    getRegistrationProfile,
    saveRegistrationProfile,
    createRegisteredUser,
} = require("../services/registrationProfileService");
const {
    WECHAT_BIND_TICKET_RE,
    WECHAT_BIND_TICKET_TTL_MS,
    WECHAT_LOGIN_CODE_RE,
    bindWechatMiniappIdentity,
    createBindingTicket,
    exchangeWechatLoginCode,
    findBoundWechatMiniappUser,
    hashValue,
} = require("../services/wechatMiniappAuthService");

// FIX: BUG-02 — Remove hardcoded JWT secret fallback; fail fast if not configured
const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
    throw new Error(
        "FATAL: SECRET_KEY environment variable is required. Set it before starting the server."
    );
}

const signAuthToken = (user) =>
    jwt.sign(
        {
            id: user.id,
            auth_version: Number(user.auth_version || 0),
            username: user.username,
            role: user.role,
            account_type: user.account_type || "personal",
            review_permission:
                user.review_permission || (user.role === "admin" ? "admin" : "normal"),
            admin_scope: user.admin_scope || (user.role === "admin" ? "platform" : "none"),
        },
        SECRET_KEY,
        { expiresIn: "7d" }
    );

const toAuthUser = (user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    account_type: user.account_type || "personal",
    review_permission: user.review_permission || (user.role === "admin" ? "admin" : "normal"),
    admin_scope: user.admin_scope || (user.role === "admin" ? "platform" : "none"),
    admin_permissions: require("../utils/userPermissions").getAdminPermissions(user),
    nickname: user.nickname,
    avatar: user.avatar,
});

const getWechatMiniappStatus = async (req, res, next) => {
    try {
        const db = await getDb();
        const identity = await db.get(
            `SELECT id, last_login_at, created_at, updated_at
       FROM wechat_miniapp_identities
       WHERE user_id = ?
       LIMIT 1`,
            [req.user.id]
        );

        res.json({
            bound: Boolean(identity),
            lastLoginAt: identity?.last_login_at || null,
            createdAt: identity?.created_at || null,
            updatedAt: identity?.updated_at || null,
        });
    } catch (error) {
        next(error);
    }
};

const createWechatMiniappBindTicket = async (req, res, next) => {
    try {
        if (req.user?.id === undefined || req.user?.id === null) {
            return res
                .status(401)
                .json({ error: "Authentication required", errorCode: "AUTH_REQUIRED" });
        }

        const db = await getDb();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + WECHAT_BIND_TICKET_TTL_MS);
        const ticket = createBindingTicket();
        const ticketHash = hashValue(ticket);

        await db
            .run(
                `DELETE FROM wechat_miniapp_binding_tickets
       WHERE used_at IS NOT NULL OR expires_at <= ?`,
                [now.toISOString()]
            )
            .catch(() => {});

        await db.run(
            `INSERT INTO wechat_miniapp_binding_tickets
        (user_id, ticket_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?)`,
            [req.user.id, ticketHash, expiresAt.toISOString(), now.toISOString()]
        );

        res.json({
            ticket,
            expiresAt: expiresAt.toISOString(),
            expiresIn: Math.floor(WECHAT_BIND_TICKET_TTL_MS / 1000),
        });
    } catch (error) {
        next(error);
    }
};

const wechatMiniappBind = async (req, res, next) => {
    try {
        const code = String(req.body?.code || "").trim();
        const ticket = String(req.body?.ticket || "").trim();

        if (!WECHAT_LOGIN_CODE_RE.test(code)) {
            return res
                .status(400)
                .json({ error: "Invalid WeChat login code", errorCode: "WECHAT_CODE_INVALID" });
        }

        if (!WECHAT_BIND_TICKET_RE.test(ticket)) {
            return res.status(400).json({
                error: "Invalid WeChat binding ticket",
                errorCode: "WECHAT_BIND_TICKET_INVALID",
            });
        }

        const db = await getDb();
        const session = await exchangeWechatLoginCode(code);
        const result = await bindWechatMiniappIdentity(db, session, ticket);

        await db
            .run(
                "INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)",
                [
                    result.userId,
                    "auth",
                    0,
                    "wechat_miniapp_bind",
                    "User bound WeChat mini program account",
                ]
            )
            .catch((error) => {
                console.warn("Audit log warning (wechat_miniapp_bind):", error.message);
            });

        res.json({ success: true });
    } catch (error) {
        if (error.wechatErrcode) {
            console.warn("WeChat mini program bind failed", {
                errcode: error.wechatErrcode,
                errmsg: error.wechatErrmsg,
            });
        }

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                error: error.publicMessage || "WeChat binding failed",
                errorCode: error.errorCode,
            });
        }

        next(error);
    }
};

const register = async (req, res, next) => {
    try {
        const db = await getDb();
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        const validation = validateRegistrationProfile(req.body.registrationProfile);
        if (validation.errors.length) {
            return res.status(400).json({
                error: "请完善姓名、学号、专业和年级",
                errorCode: "REGISTRATION_PROFILE_INVALID",
                details: validation.errors,
            });
        }

        // Check if user already exists
        const existingUser = await db.get("SELECT id FROM users WHERE username = ?", [username]);
        if (existingUser) {
            // Security: Use generic message or keep specific if user enumeration is not a concern
            // For public apps, 'Username already exists' is fine for UX.
            return res.status(400).json({ error: "Username already exists" });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        const hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds

        const user = await createRegisteredUser(db, username, hashedPassword, validation.profile);
        res.setHeader("Cache-Control", "no-store");
        res.json({
            token: signAuthToken(user),
            user: { ...toAuthUser(user), registrationProfile: validation.profile },
        });
    } catch (error) {
        if (
            error.code?.startsWith("SQLITE_CONSTRAINT") &&
            error.message?.includes("users.username")
        ) {
            return res.status(400).json({ error: "Username already exists" });
        }
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const db = await getDb();
        const { username, password } = req.body;

        const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Upgrade hash if using old format (optional, not strictly necessary if all users are new)
        // But good practice if migrating
        const BCRYPT_REGEX = /^\$2[ayb]\$.{56}$/;
        if (!BCRYPT_REGEX.test(user.password)) {
            const newHash = await bcrypt.hash(password, 12);
            await db.run("UPDATE users SET password = ? WHERE id = ?", [newHash, user.id]);
        }

        const token = signAuthToken(user);

        // Log successful login
        await db.run(
            "INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)",
            [user.id, "auth", 0, "login", "User logged in"]
        );

        res.setHeader("Cache-Control", "no-store");
        res.json({
            token,
            user: {
                ...toAuthUser(user),
                registrationProfile: await getRegistrationProfile(db, user.id),
            },
        });
    } catch (error) {
        next(error);
    }
};

// Shared-password login cannot identify or revoke an individual administrator.
const adminLogin = (_req, res) =>
    res.status(410).json({ error: "Shared admin login retired; sign in with your account" });

const wechatMiniappLogin = async (req, res, next) => {
    try {
        const code = String(req.body?.code || "").trim();
        if (!WECHAT_LOGIN_CODE_RE.test(code)) {
            req.loginTracker?.recordFailed();
            return res.status(400).json({ error: "Invalid WeChat login code" });
        }

        const db = await getDb();
        const session = await exchangeWechatLoginCode(code);
        const user = await findBoundWechatMiniappUser(db, session);
        const authUser = {
            ...toAuthUser(user),
            registrationProfile: await getRegistrationProfile(db, user.id),
        };
        const token = signAuthToken(authUser);

        req.loginTracker?.clear();

        await db
            .run(
                "INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, ?, ?, ?, ?)",
                [
                    authUser.id,
                    "auth",
                    0,
                    "wechat_miniapp_login",
                    "User logged in with WeChat mini program",
                ]
            )
            .catch((error) => {
                console.warn("Audit log warning (wechat_miniapp_login):", error.message);
            });

        res.setHeader("Cache-Control", "no-store");
        res.json({ token, user: authUser });
    } catch (error) {
        if (error.wechatErrcode) {
            console.warn("WeChat mini program login failed", {
                errcode: error.wechatErrcode,
                errmsg: error.wechatErrmsg,
            });
        }

        if (error.statusCode) {
            if (error.statusCode >= 400 && error.statusCode < 500) {
                req.loginTracker?.recordFailed();
            }
            return res.status(error.statusCode).json({
                error: error.publicMessage || "WeChat login failed",
                errorCode: error.errorCode,
            });
        }

        next(error);
    }
};

const me = async (req, res, next) => {
    try {
        const db = await getDb();
        // Fetch full user details from DB to ensure we have the latest data
        // Exclude password for security
        const user = await db.get(
            `SELECT id, username, role, account_type, review_permission, admin_scope, admin_permissions,
                  avatar, organization_cr, gender, age, nickname, created_at
           FROM users WHERE id = ?`,
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.setHeader("Cache-Control", "no-store");
        res.json({ ...user, registrationProfile: await getRegistrationProfile(db, user.id) });
    } catch (error) {
        next(error);
    }
};

const updateRegistrationProfile = async (req, res, next) => {
    try {
        const validation = validateRegistrationProfile(req.body?.registrationProfile);
        if (validation.errors.length) {
            return res.status(400).json({
                error: "请完善姓名、学号、专业和年级",
                errorCode: "REGISTRATION_PROFILE_INVALID",
                details: validation.errors,
            });
        }
        const db = await getDb();
        await saveRegistrationProfile(db, req.user.id, validation.profile);
        res.setHeader("Cache-Control", "no-store");
        res.json({ registrationProfile: validation.profile });
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const db = await getDb();
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await db.get("SELECT * FROM users WHERE id = ?", [userId]);
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: "Incorrect current password" });

        if (newPassword.length < 6) {
            return res
                .status(400)
                .json({ error: "New password must be at least 6 characters long" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.run(
            "UPDATE users SET password = ?, auth_version = auth_version + 1 WHERE id = ?",
            [hashedPassword, userId]
        );

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    adminLogin,
    wechatMiniappLogin,
    getWechatMiniappStatus,
    createWechatMiniappBindTicket,
    wechatMiniappBind,
    me,
    changePassword,
    updateRegistrationProfile,
    SECRET_KEY,
};
