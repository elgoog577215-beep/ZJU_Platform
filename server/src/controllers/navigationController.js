const { getDb } = require("../config/db");

function validateLinks(value) {
    if (value === null) return null;
    if (!Array.isArray(value) || value.length > 12) throw new Error("invalid_links");
    const seen = new Set();
    return value.map((link) => {
        if (!link || typeof link.name !== "string" || typeof link.url !== "string") {
            throw new Error("invalid_links");
        }
        const name = link.name.trim();
        if (!name || name.length > 40 || link.url.length > 2048) throw new Error("invalid_links");
        const url = new URL(link.url);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
            throw new Error("invalid_links");
        }
        if (seen.has(url.href)) throw new Error("duplicate_link");
        seen.add(url.href);
        return { name, url: url.href };
    });
}

async function getShortcuts(req, res) {
    res.set("Cache-Control", "no-store");
    try {
        const db = await getDb();
        const row = await db.get(
            "SELECT links_json, version FROM user_navigation_shortcuts WHERE user_id = ?",
            [req.user.id]
        );
        res.json({ links: row ? JSON.parse(row.links_json) : null, version: row?.version || 0 });
    } catch {
        res.status(503).json({ error: "shortcuts_unavailable" });
    }
}

async function saveShortcuts(req, res) {
    res.set("Cache-Control", "no-store");
    let links;
    const version = req.body?.version;
    try {
        if (!Number.isSafeInteger(version) || version < 0) throw new Error("invalid_version");
        links = validateLinks(req.body?.links);
    } catch {
        return res.status(400).json({ error: "invalid_shortcuts" });
    }
    try {
        const db = await getDb();
        // Atomic revision check prevents one device from silently overwriting another.
        const result =
            version === 0
                ? await db.run(
                      "INSERT OR IGNORE INTO user_navigation_shortcuts(user_id, links_json, version) VALUES (?, ?, 1)",
                      [req.user.id, JSON.stringify(links)]
                  )
                : await db.run(
                      "UPDATE user_navigation_shortcuts SET links_json = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND version = ?",
                      [JSON.stringify(links), req.user.id, version]
                  );
        if (!result.changes) return res.status(409).json({ error: "shortcuts_conflict" });
        return res.json({ links, version: version + 1 });
    } catch {
        return res.status(503).json({ error: "shortcuts_unavailable" });
    }
}
module.exports = { getShortcuts, saveShortcuts, validateLinks };

const { canBypassReview, canReviewResource } = require("../utils/userPermissions");
const MAX_GROUPS = 40;
const MAX_LINKS = 600;
const validId = (id) => typeof id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
function textField(value, max, required = false) {
    if (typeof value !== "string") {
        if (!required && value == null) return "";
        throw new Error("invalid_text");
    }
    const valueText = value.trim();
    if (valueText.length > max || (required && !valueText)) throw new Error("invalid_text");
    return valueText;
}
function validateGroups(groups) {
    if (!Array.isArray(groups) || groups.length > MAX_GROUPS) throw new Error("invalid_groups");
    const ids = new Set();
    let count = 0;
    return groups.map((group) => {
        if (!group || !validId(group.id) || ids.has(group.id)) throw new Error("invalid_group");
        ids.add(group.id);
        if (!Array.isArray(group.links) || group.links.length > 100)
            throw new Error("invalid_links");
        count += group.links.length;
        if (count > MAX_LINKS) throw new Error("too_many_links");
        const linkIds = new Set();
        return {
            id: group.id,
            title: textField(group.title, 80, true),
            titleEn: textField(group.titleEn, 80),
            links: group.links.map((link) => {
                if (!link || !validId(link.id) || linkIds.has(link.id))
                    throw new Error("invalid_link");
                linkIds.add(link.id);
                const raw = textField(link.url, 2048, true);
                const url = new URL(raw);
                if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
                    throw new Error("invalid_url");
                return {
                    id: link.id,
                    name: textField(link.name, 100, true),
                    nameEn: textField(link.nameEn, 100),
                    url: url.href,
                    description: textField(link.description, 200),
                    descriptionEn: textField(link.descriptionEn, 200),
                    keywords: textField(link.keywords, 500),
                };
            }),
        };
    });
}
const canReview = (user) => canReviewResource(user, "navigation_collections");
const handle = (fn) => async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
        await fn(req, res, await getDb());
    } catch {
        if (!res.headersSent) res.status(503).json({ error: "navigation_unavailable" });
    }
};
const getWorkspace = handle(async (req, res, db) => {
    const row = await db.get(
        "SELECT groups_json, version FROM user_navigation_workspaces WHERE user_id = ?",
        [req.user.id]
    );
    const legacy =
        !row &&
        (await db.get("SELECT links_json FROM user_navigation_shortcuts WHERE user_id = ?", [
            req.user.id,
        ]));
    res.json({
        groups: row ? JSON.parse(row.groups_json) : null,
        version: row?.version || 0,
        legacyLinks: legacy ? JSON.parse(legacy.links_json) : null,
    });
});
const saveWorkspace = handle(async (req, res, db) => {
    const version = req.body?.version;
    let groups;
    try {
        if (!Number.isSafeInteger(version) || version < 0) throw new Error("invalid_version");
        groups = validateGroups(req.body?.groups);
    } catch {
        return res.status(400).json({ error: "invalid_workspace" });
    }
    const json = JSON.stringify(groups);
    const result =
        version === 0
            ? await db.run(
                  "INSERT OR IGNORE INTO user_navigation_workspaces(user_id,groups_json,version) VALUES (?,?,1)",
                  [req.user.id, json]
              )
            : await db.run(
                  "UPDATE user_navigation_workspaces SET groups_json=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND version=?",
                  [json, req.user.id, version]
              );
    if (!result.changes) return res.status(409).json({ error: "workspace_conflict" });
    res.json({ groups, version: version + 1 });
});
const createCollection = handle(async (req, res, db) => {
    let title, description;
    const { groupIds, id } = req.body || {};
    try {
        if (
            !validId(id) ||
            !Array.isArray(groupIds) ||
            !groupIds.length ||
            groupIds.length > MAX_GROUPS ||
            new Set(groupIds).size !== groupIds.length ||
            !groupIds.every(validId)
        )
            throw new Error("invalid_share");
        title = textField(req.body.title, 100, true);
        description = textField(req.body.description, 500);
    } catch {
        return res.status(400).json({ error: "invalid_collection" });
    }
    const existing = await db.get("SELECT user_id,status FROM navigation_collections WHERE id=?", [
        id,
    ]);
    if (existing) return res.status(409).json({ error: "collection_exists" });
    const row = await db.get(
        "SELECT groups_json,version FROM user_navigation_workspaces WHERE user_id=?",
        [req.user.id]
    );
    if (!row || row.version !== req.body.version)
        return res.status(409).json({ error: "workspace_conflict" });
    const groups = JSON.parse(row.groups_json).filter((group) => groupIds.includes(group.id));
    if (groups.length !== groupIds.length || !groups.some((group) => group.links.length))
        return res.status(400).json({ error: "invalid_selection" });
    const status = canBypassReview(req.user) ? "approved" : "pending";
    await db.run(
        "INSERT INTO navigation_collections(id,user_id,title,description,groups_json,status) VALUES (?,?,?,?,?,?)",
        [id, req.user.id, title, description, JSON.stringify(groups), status]
    );
    res.status(201).json({ id, status });
});
const listCollections = handle(async (req, res, db) => {
    const scope = req.query.scope || "public";
    if (!["public", "mine", "review"].includes(scope))
        return res.status(400).json({ error: "invalid_scope" });
    if (scope !== "public" && !req.user)
        return res.status(401).json({ error: "authentication_required" });
    if (scope === "review" && !canReview(req.user))
        return res.status(403).json({ error: "permission_denied" });
    const offset = Number(req.query.offset || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
        return res.status(400).json({ error: "invalid_offset" });
    const q = String(req.query.q || "")
        .trim()
        .slice(0, 100);
    const condition =
        scope === "mine"
            ? "c.user_id=? AND c.status!='withdrawn'"
            : scope === "review"
              ? "c.status IN ('pending','approved')"
              : "c.status='approved'";
    const args = scope === "mine" ? [req.user.id] : [];
    const rows = await db.all(
        `SELECT c.id,c.title,c.description,c.status,c.created_at,c.user_id
        FROM navigation_collections c JOIN users u ON u.id=c.user_id
        WHERE ${condition} AND u.role!='banned' AND (c.title LIKE ? OR c.description LIKE ?)
        ORDER BY c.created_at DESC,c.id DESC LIMIT 13 OFFSET ?`,
        [...args, `%${q}%`, `%${q}%`, offset]
    );
    res.json({
        items: rows
            .slice(0, 12)
            .map(({ user_id, ...item }) => ({ ...item, owned: user_id === req.user?.id })),
        hasMore: rows.length > 12,
        canReview: !!req.user && canReview(req.user),
    });
});
const getCollection = handle(async (req, res, db) => {
    const row = await db.get(
        "SELECT c.* FROM navigation_collections c JOIN users u ON u.id=c.user_id WHERE c.id=? AND u.role!='banned'",
        [req.params.id]
    );
    if (
        !row ||
        row.status === "withdrawn" ||
        (row.status !== "approved" &&
            row.user_id !== req.user?.id &&
            !(req.user && canReview(req.user)))
    )
        return res.status(404).json({ error: "collection_not_found" });
    res.json({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        groups: JSON.parse(row.groups_json),
    });
});
const updateCollection = handle(async (req, res, db) => {
    const status = req.body?.status;
    if (!["approved", "rejected", "withdrawn"].includes(status))
        return res.status(400).json({ error: "invalid_status" });
    const row = await db.get("SELECT user_id,status FROM navigation_collections WHERE id=?", [
        req.params.id,
    ]);
    if (!row || row.status === "withdrawn")
        return res.status(404).json({ error: "collection_not_found" });
    if (
        status === "withdrawn"
            ? row.user_id !== req.user.id && !canReview(req.user)
            : !canReview(req.user)
    )
        return res.status(403).json({ error: "permission_denied" });
    const result = await db.run(
        "UPDATE navigation_collections SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?",
        [status, req.params.id, row.status]
    );
    if (!result.changes) return res.status(409).json({ error: "collection_conflict" });
    res.json({ status });
});
Object.assign(module.exports, {
    validateGroups,
    getWorkspace,
    saveWorkspace,
    createCollection,
    listCollections,
    getCollection,
    updateCollection,
});
