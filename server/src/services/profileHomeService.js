const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { getDb } = require("../config/db");

// A dedicated connection keeps this transaction out of unrelated requests on the pool.
async function withProfileWrite(fn) {
    const poolDb = await getDb();
    const db = await open({ filename: poolDb.config.filename, driver: sqlite3.Database });
    try {
        await db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; BEGIN IMMEDIATE");
        const result = await fn(db);
        await db.exec("COMMIT");
        return result;
    } catch (error) {
        await db.exec("ROLLBACK").catch(() => {});
        throw error;
    } finally {
        await db.close();
    }
}

const safeUrl = (value, local = false) => {
    const text = String(value || "").trim();
    if (local && /^\/(?:uploads|images)\/[a-zA-Z0-9_./%\-]+$/.test(text) && !text.includes(".."))
        return text;
    try {
        const url = new URL(text);
        return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
            ? text
            : "";
    } catch {
        return "";
    }
};

async function listProfileWorks(db, userId) {
    const rows = [];
    for (const [table, type, image] of [
        ["events", "event", "image"],
        ["articles", "article", "cover"],
    ]) {
        const items = await db.all(
            `SELECT id, title, ${image} AS cover, created_at FROM ${table}
            WHERE uploader_id = ? AND status = 'approved' AND deleted_at IS NULL
            AND (publisher_profile_id IS NULL OR publisher_profile_id IN
                (SELECT id FROM profiles WHERE type = 'person' AND owner_user_id = ? AND deleted_at IS NULL))
            ORDER BY created_at DESC, id DESC`,
            [userId, userId]
        );
        rows.push(
            ...items.map((item) => ({
                ...item,
                type,
                relation: "published",
                cover: safeUrl(item.cover, true),
                url: type === "event" ? `/events?id=${item.id}` : `/articles?article=${item.id}`,
            }))
        );
    }
    return rows.sort(
        (a, b) =>
            String(b.created_at || "").localeCompare(String(a.created_at || "")) || b.id - a.id
    );
}
module.exports = { withProfileWrite, listProfileWorks, safeUrl };
