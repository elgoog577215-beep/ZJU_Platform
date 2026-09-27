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
