const { getDb } = require("../config/db");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const {
    ADMIN_PERMISSION_KEYS,
    getAdminCapabilities,
    normalizeAdminPermissions,
    isPlatformAdmin,
    canManageResource,
} = require("../utils/userPermissions");

const accessFields =
    "id, username, nickname, role, admin_scope, admin_permissions, admin_access_version";
const serializeAccess = (user) => ({
    ...user,
    admin_permissions: normalizeAdminPermissions(user.admin_permissions),
});
const getCapabilities = (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(getAdminCapabilities(req.user));
};
const listAccess = async (req, res, next) => {
    try {
        const db = await getDb();
        const users = await db.all(
            `SELECT ${accessFields} FROM users ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'operator' THEN 1 ELSE 2 END, id`
        );
        res.set("Cache-Control", "no-store");
        res.json({
            users: users.map(serializeAccess),
            permissions: [...ADMIN_PERMISSION_KEYS],
        });
    } catch (error) {
        next(error);
    }
};
const fail = (status, code) => Object.assign(new Error(code), { statusCode: status });

const updateAccess = async (req, res, next) => {
    let transaction;
    try {
        const id = Number(req.params.id);
        const body = req.body || {};
        if (!Number.isSafeInteger(id) || id <= 0) throw fail(400, "INVALID_ACCOUNT");
        if (id === req.user.id) throw fail(400, "CANNOT_CHANGE_OWN_ACCESS");
        if (!Number.isSafeInteger(body.expected_version))
            throw fail(400, "ACCESS_VERSION_REQUIRED");
        const logoutOnly = body.force_logout === true;
        if (
            !logoutOnly &&
            (!["user", "admin", "operator"].includes(body.role) ||
                !Array.isArray(body.permissions) ||
                body.permissions.some((key) => !ADMIN_PERMISSION_KEYS.has(key)))
        ) {
            throw fail(400, "INVALID_ACCESS_SETTINGS");
        }
        const db = await getDb();
        const database = (await db.all("PRAGMA database_list")).find((row) => row.name === "main");
        // A separate connection keeps the transaction isolated from ordinary requests.
        transaction = await open({ filename: database.file, driver: sqlite3.Database });
        await transaction.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; BEGIN IMMEDIATE");
        const actor = await transaction.get("SELECT role, admin_scope FROM users WHERE id = ?", [
            req.user.id,
        ]);
        if (!isPlatformAdmin(actor)) throw fail(403, "PLATFORM_ADMIN_REQUIRED");
        const before = await transaction.get(
            `SELECT ${accessFields}, review_permission FROM users WHERE id = ?`,
            [id]
        );
        if (!before) throw fail(404, "ACCOUNT_NOT_FOUND");
        if (before.role === "banned") throw fail(400, "ACCOUNT_DISABLED");
        if (before.admin_access_version !== body.expected_version)
            throw fail(409, "ACCESS_CHANGED_RELOAD");
        const permissions =
            body.role === "operator" ? normalizeAdminPermissions(body.permissions) : [];
        if (!logoutOnly && before.role === "admin" && body.role !== "admin") {
            const admins = await transaction.get(
                "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND admin_scope = 'platform'"
            );
            if (admins.count <= 1) throw fail(400, "LAST_PLATFORM_ADMIN");
        }
        if (logoutOnly) {
            await transaction.run(
                "UPDATE users SET auth_version = auth_version + 1, admin_access_version = admin_access_version + 1 WHERE id = ?",
                [id]
            );
        } else {
            // Changing admin tier does not grant publishing privileges. A former platform
            // admin's legacy review bypass is cleared when becoming an operator/user.
            const review =
                before.role === "admin" && body.role !== "admin"
                    ? "normal"
                    : before.review_permission;
            await transaction.run(
                `UPDATE users SET role = ?, admin_scope = ?, admin_permissions = ?,
                review_permission = ?, admin_access_version = admin_access_version + 1 WHERE id = ?`,
                [
                    body.role,
                    body.role === "admin"
                        ? "platform"
                        : body.role === "operator"
                          ? "operations"
                          : "none",
                    JSON.stringify(permissions),
                    review,
                    id,
                ]
            );
        }
        const after = await transaction.get(`SELECT ${accessFields} FROM users WHERE id = ?`, [id]);
        const snapshot = (row) => ({
            role: row.role,
            scope: row.admin_scope,
            permissions: normalizeAdminPermissions(row.admin_permissions),
        });
        await transaction.run(
            "INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason) VALUES (?, 'admin_access', ?, ?, ?)",
            [
                req.user.id,
                id,
                logoutOnly ? "force_logout" : "access_update",
                JSON.stringify({ before: snapshot(before), after: snapshot(after) }),
            ]
        );
        await transaction.exec("COMMIT");
        res.json(serializeAccess(after));
    } catch (error) {
        if (transaction) await transaction.exec("ROLLBACK").catch(() => {});
        if (error.statusCode) res.status(error.statusCode).json({ error: error.message });
        else next(error);
    } finally {
        if (transaction) await transaction.close();
    }
};

const getPublishingProfiles = async (req, res, next) => {
    try {
        const table = req.query.resource;
        if (
            !["events", "articles", "photos", "videos", "music"].includes(table) ||
            !canManageResource(req.user, table)
        ) {
            return res.status(403).json({ error: "Publishing scope denied" });
        }
        const db = await getDb();
        const item =
            Number.isSafeInteger(Number(req.query.id)) && Number(req.query.id) > 0
                ? await db.get(
                      `SELECT publisher_profile_id${table === "events" ? ", organizer_profile_id" : ""} FROM ${table} WHERE id = ?`,
                      [Number(req.query.id)]
                  )
                : null;
        const profiles = await db.all(
            "SELECT id, type, display_name FROM profiles WHERE status='active' AND deleted_at IS NULL AND (type != 'person' OR owner_user_id = ? OR id = ? OR id = ?) ORDER BY display_name",
            [req.user.id, item?.publisher_profile_id || null, item?.organizer_profile_id || null]
        );
        res.json(profiles);
    } catch (error) {
        next(error);
    }
};
module.exports = { getCapabilities, listAccess, updateAccess, getPublishingProfiles };
