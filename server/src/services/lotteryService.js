const { randomUUID, randomInt, createHash } = require("node:crypto");
const path = require("node:path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const eventKeys = new Set(
    require("../../../shared/hackathonRoutes.json").map((event) => event.eventKey)
);

class LotteryError extends Error {
    constructor(code, status = 400) {
        super(code);
        this.code = code;
        this.status = status;
    }
}
const fail = (code, status) => {
    throw new LotteryError(code, status);
};
const clean = (v, max, required = false) => {
    if (typeof v !== "string" || v.trim().length > max || (required && !v.trim()))
        fail("invalid_fields");
    return v.trim();
};
function validateEvent(event) {
    if (typeof event !== "string" || !eventKeys.has(event)) fail("invalid_event");
    return event;
}
function likes(value) {
    if (typeof value === "string" && /^\d+$/.test(value)) value = Number(value);
    if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000) fail("invalid_likes");
    return value;
}
function promotionUrl(value = "") {
    const text = clean(value, 2000);
    if (text) {
        let url;
        try {
            url = new URL(text);
        } catch {
            fail("invalid_promotion_url");
        }
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
            fail("invalid_promotion_url");
    }
    return text;
}
function validateCampaign(body, now) {
    const data = {
        title: clean(body.title, 100, true),
        event_key:
            body.event_key == null || body.event_key === "" ? null : validateEvent(body.event_key),
        promotion_url: promotionUrl(body.promotion_url),
        min_likes: likes(body.min_likes ?? 0),
        description: clean(body.description, 4000),
        rules: clean(body.rules, 6000, true),
        opens_at: Number(body.opens_at),
        closes_at: Number(body.closes_at),
        draws_at: Number(body.draws_at),
        claims_until: Number(body.claims_until),
    };
    if (
        ![data.opens_at, data.closes_at, data.draws_at, data.claims_until].every(
            Number.isSafeInteger
        ) ||
        !(
            data.opens_at < data.closes_at &&
            data.closes_at < data.draws_at &&
            data.draws_at < data.claims_until
        ) ||
        data.draws_at <= now
    )
        fail("invalid_dates");
    if (typeof body.proof_required !== "boolean" || typeof body.review_required !== "boolean")
        fail("invalid_fields");
    data.proof_required = data.event_key ? 1 : Number(body.proof_required);
    data.review_required = data.event_key ? 1 : Number(body.review_required);
    if (!Array.isArray(body.prizes) || !body.prizes.length || body.prizes.length > 20)
        fail("invalid_prizes");
    data.prizes = body.prizes.map((p) => {
        if (!Number.isInteger(p.quantity) || p.quantity < 1 || p.quantity > 100)
            fail("invalid_prizes");
        return { id: randomUUID(), name: clean(p.name, 100, true), quantity: p.quantity };
    });
    if (data.prizes.reduce((n, p) => n + p.quantity, 0) > 1000) fail("invalid_prizes");
    return data;
}
function createLotteryService({
    filename = process.env.DATABASE_FILE || path.join(__dirname, "../../database.sqlite"),
    now = Date.now,
    choose = randomInt,
} = {}) {
    const connect = async () => {
        const db = await open({ filename, driver: sqlite3.Database });
        await db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;");
        return db;
    };
    const transaction = async (fn) => {
        const db = await connect();
        try {
            await db.exec("BEGIN IMMEDIATE");
            const value = await fn(db);
            await db.exec("COMMIT");
            return value;
        } catch (e) {
            await db.exec("ROLLBACK").catch(() => {});
            throw e;
        } finally {
            await db.close();
        }
    };
    const read = async (fn) => {
        const db = await connect();
        try {
            return await fn(db);
        } finally {
            await db.close();
        }
    };
    const campaign = async (db, id) =>
        (await db.get("SELECT * FROM lotteries WHERE id=?", id)) || fail("not_found", 404);
    const audit = (db, id, actor, action, detail = {}) =>
        db.run(
            "INSERT INTO lottery_audit(lottery_id,actor_id,action,detail,created_at) VALUES (?,?,?,?,?)",
            id,
            actor,
            action,
            JSON.stringify(detail),
            now()
        );
    const publicCampaign = (row) => {
        const { prizes_json, created_by, ...rest } = row;
        return { ...rest, prizes: JSON.parse(prizes_json) };
    };
    const entryColumns =
        "id,lottery_id,user_id,ticket,status,note,like_count,review_note,submitted_at,reviewed_at,eligible,(proof IS NOT NULL) AS has_proof";
    const requireOpen = (c) => {
        if (c.status !== "open" || now() < c.opens_at || now() >= c.closes_at)
            fail("registration_closed", 409);
    };
    return {
        async list(admin = false, event) {
            if (event !== undefined) validateEvent(event);
            const conditions = [
                ...(admin ? [] : ["status != 'draft'"]),
                ...(event === undefined ? [] : ["event_key=?"]),
            ];
            return read(async (db) =>
                (
                    await db.all(
                        `SELECT * FROM lotteries ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 100`,
                        ...(event === undefined ? [] : [event])
                    )
                ).map(publicCampaign)
            );
        },
        async detail(id, userId, admin = false, event) {
            if (event !== undefined) validateEvent(event);
            return read(async (db) => {
                const c = await campaign(db, id);
                if (
                    (c.status === "draft" && !admin) ||
                    (event !== undefined && c.event_key !== event)
                )
                    fail("not_found", 404);
                const entry = userId
                    ? await db.get(
                          `SELECT ${entryColumns} FROM lottery_entries WHERE lottery_id=? AND user_id=?`,
                          id,
                          userId
                      )
                    : null;
                const myWin = entry
                    ? await db.get("SELECT * FROM lottery_winners WHERE entry_id=?", entry.id)
                    : null;
                const winners =
                    c.status === "drawn"
                        ? await db.all(
                              "SELECT e.ticket,w.prize_name FROM lottery_winners w JOIN lottery_entries e ON e.id=w.entry_id WHERE w.lottery_id=? ORDER BY w.rowid",
                              id
                          )
                        : [];
                const counts = await db.get(
                    "SELECT COUNT(*) AS submitted, SUM(status='approved') AS approved, SUM(status='pending') AS pending FROM lottery_entries WHERE lottery_id=?",
                    id
                );
                return {
                    ...publicCampaign(c),
                    entry: entry || null,
                    my_win: myWin || null,
                    winners,
                    counts,
                    server_now: now(),
                };
            });
        },
        async save(id, body, actor) {
            return transaction(async (db) => {
                const c = id ? await campaign(db, id) : null;
                const timestamp = now();
                if (
                    c &&
                    (!["draft", "open"].includes(c.status) ||
                        c.version !== body.version ||
                        (c.status === "open" && timestamp >= c.draws_at))
                )
                    fail("locked", 409);
                const d = validateCampaign(body, timestamp);
                if (c?.status === "open" && d.event_key && !d.promotion_url)
                    fail("promotion_url_required");
                const changes = {};
                if (c) {
                    const prizes = JSON.parse(c.prizes_json);
                    const prizeContent = (items) =>
                        items.map(({ name, quantity }) => ({ name, quantity }));
                    if (
                        JSON.stringify(prizeContent(prizes)) ===
                        JSON.stringify(prizeContent(d.prizes))
                    )
                        d.prizes = prizes;
                    const before = { ...c, prizes };
                    for (const key of Object.keys(d)) {
                        if (JSON.stringify(before[key]) !== JSON.stringify(d[key]))
                            changes[key] = { before: before[key], after: d[key] };
                    }
                }
                const values = [
                    d.title,
                    d.description,
                    d.rules,
                    JSON.stringify(d.prizes),
                    d.proof_required,
                    d.review_required,
                    d.opens_at,
                    d.closes_at,
                    d.draws_at,
                    d.claims_until,
                    d.event_key,
                    d.promotion_url,
                    d.min_likes,
                ];
                if (c)
                    await db.run(
                        "UPDATE lotteries SET title=?,description=?,rules=?,prizes_json=?,proof_required=?,review_required=?,opens_at=?,closes_at=?,draws_at=?,claims_until=?,event_key=?,promotion_url=?,min_likes=?,version=version+1 WHERE id=?",
                        ...values,
                        id
                    );
                else {
                    id = randomUUID();
                    await db.run(
                        "INSERT INTO lotteries(title,description,rules,prizes_json,proof_required,review_required,opens_at,closes_at,draws_at,claims_until,event_key,promotion_url,min_likes,id,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                        ...values,
                        id,
                        actor,
                        now()
                    );
                }
                await audit(
                    db,
                    id,
                    actor,
                    c ? "updated" : "created",
                    c ? { version: c.version + 1, changes } : {}
                );
                return { id };
            });
        },
        async publish(id, actor, version) {
            return transaction(async (db) => {
                const c = await campaign(db, id);
                if (c.status !== "draft" || c.version !== version || c.closes_at <= now())
                    fail("locked", 409);
                if (c.event_key && !promotionUrl(c.promotion_url)) fail("promotion_url_required");
                await db.run("UPDATE lotteries SET status='open',version=version+1 WHERE id=?", id);
                await audit(db, id, actor, "published");
                return { id };
            });
        },
        async cancel(id, actor, reason) {
            return transaction(async (db) => {
                const c = await campaign(db, id);
                const text = clean(reason, 500, true);
                if (!["draft", "open"].includes(c.status) || now() >= c.draws_at)
                    fail("locked", 409);
                await db.run(
                    "UPDATE lotteries SET status='cancelled',cancel_reason=?,version=version+1 WHERE id=?",
                    text,
                    id
                );
                await audit(db, id, actor, "cancelled", { reason: text });
                return { id };
            });
        },
        async enter(id, userId, { note = "", proof = null, like_count } = {}) {
            return transaction(async (db) => {
                const c = await campaign(db, id);
                requireOpen(c);
                const old = await db.get(
                    "SELECT id,status,proof IS NOT NULL AS has_proof FROM lottery_entries WHERE lottery_id=? AND user_id=?",
                    id,
                    userId
                );
                if (old && old.status !== "rejected") return { id: old.id, duplicate: true };
                if ((c.proof_required || c.event_key) && !proof && !old?.has_proof)
                    fail("proof_required");
                const likeCount =
                    like_count === undefined && !c.event_key ? null : likes(like_count);
                if (c.event_key && likeCount < c.min_likes) fail("insufficient_likes");
                const text = clean(note, 1000);
                const status = c.review_required || c.event_key ? "pending" : "approved";
                let entryId = old?.id;
                if (old)
                    await db.run(
                        "UPDATE lottery_entries SET note=?,proof=COALESCE(?,proof),like_count=?,status=?,review_note='',eligible=0,reviewed_by=NULL,reviewed_at=NULL,submitted_at=? WHERE id=?",
                        text,
                        proof,
                        likeCount,
                        status,
                        now(),
                        old.id
                    );
                else {
                    const result = await db.run(
                        "INSERT INTO lottery_entries(lottery_id,user_id,ticket,status,note,proof,like_count,submitted_at) VALUES (?,?,?,?,?,?,?,?)",
                        id,
                        userId,
                        randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase(),
                        status,
                        text,
                        proof,
                        likeCount,
                        now()
                    );
                    entryId = result.lastID;
                }
                await audit(db, id, userId, old ? "resubmitted" : "entered", { entryId });
                return { id: entryId };
            });
        },
        async entries(id, page = 1) {
            return read(async (db) => {
                await campaign(db, id);
                return {
                    items: await db.all(
                        `SELECT e.id,e.ticket,e.status,e.note,e.like_count,e.review_note,e.submitted_at,e.reviewed_at,(e.proof IS NOT NULL) AS has_proof,u.username,w.prize_name,w.claim_text,w.claimed_at,w.fulfilled_at FROM lottery_entries e JOIN users u ON u.id=e.user_id LEFT JOIN lottery_winners w ON w.entry_id=e.id WHERE e.lottery_id=? ORDER BY e.id DESC LIMIT 50 OFFSET ?`,
                        id,
                        (page - 1) * 50
                    ),
                    total: (
                        await db.get(
                            "SELECT COUNT(*) AS n FROM lottery_entries WHERE lottery_id=?",
                            id
                        )
                    ).n,
                };
            });
        },
        async proof(id, entryId, userId, admin) {
            return read(async (db) => {
                const e = await db.get(
                    "SELECT user_id,proof FROM lottery_entries WHERE lottery_id=? AND id=?",
                    id,
                    entryId
                );
                if (!e || (!admin && e.user_id !== userId) || !e.proof) fail("not_found", 404);
                return e.proof;
            });
        },
        async review(id, entryId, actor, status, note = "") {
            return transaction(async (db) => {
                const c = await campaign(db, id);
                if (c.status !== "open" || now() >= c.draws_at) fail("locked", 409);
                if (!["approved", "rejected"].includes(status)) fail("invalid_fields");
                const text = clean(note, 500, status === "rejected");
                if (status === "approved" && c.event_key) {
                    const entry = await db.get(
                        "SELECT like_count,proof IS NOT NULL AS has_proof FROM lottery_entries WHERE lottery_id=? AND id=?",
                        id,
                        entryId
                    );
                    if (!entry) fail("not_found", 404);
                    if (!entry.has_proof) fail("proof_required");
                    if (!Number.isSafeInteger(entry.like_count) || entry.like_count < c.min_likes)
                        fail("insufficient_likes");
                }
                const result = await db.run(
                    "UPDATE lottery_entries SET status=?,review_note=?,reviewed_by=?,reviewed_at=? WHERE lottery_id=? AND id=?",
                    status,
                    text,
                    actor,
                    now(),
                    id,
                    entryId
                );
                if (!result.changes) fail("not_found", 404);
                await audit(db, id, actor, "reviewed", { entryId, status, note: text });
                return { id: entryId };
            });
        },
        async draw(id) {
            return transaction(async (db) => {
                const c = await campaign(db, id);
                if (c.status !== "open" || now() < c.draws_at) return false;
                const entries = await db.all(
                    "SELECT e.id,e.ticket FROM lottery_entries e JOIN users u ON u.id=e.user_id WHERE e.lottery_id=? AND e.status='approved' AND u.role!='banned' AND (? IS NULL OR (e.proof IS NOT NULL AND e.like_count>=?)) ORDER BY e.id",
                    id,
                    c.event_key,
                    c.min_likes
                );
                const hash = createHash("sha256")
                    .update(JSON.stringify({ entries, prizes: JSON.parse(c.prizes_json) }))
                    .digest("hex");
                await db.run(
                    "UPDATE lottery_entries SET eligible=1 WHERE lottery_id=? AND status='approved' AND user_id IN (SELECT id FROM users WHERE role!='banned') AND (? IS NULL OR (proof IS NOT NULL AND like_count>=?))",
                    id,
                    c.event_key,
                    c.min_likes
                );
                const pool = [...entries];
                let won = 0;
                for (const prize of JSON.parse(c.prizes_json))
                    for (let i = 0; i < prize.quantity && pool.length; i++) {
                        const index = choose(pool.length);
                        const winner = pool[index];
                        pool[index] = pool[pool.length - 1];
                        pool.pop();
                        await db.run(
                            "INSERT INTO lottery_winners(entry_id,lottery_id,prize_id,prize_name) VALUES (?,?,?,?)",
                            winner.id,
                            id,
                            prize.id,
                            prize.name
                        );
                        won++;
                    }
                await db.run(
                    "UPDATE lotteries SET status='drawn',drawn_at=?,eligible_count=?,pool_hash=?,version=version+1 WHERE id=?",
                    now(),
                    entries.length,
                    hash,
                    id
                );
                await audit(db, id, null, "drawn", {
                    eligible: entries.length,
                    winners: won,
                    pool_hash: hash,
                });
                return true;
            });
        },
        async due() {
            return read((db) =>
                db.all(
                    "SELECT id FROM lotteries WHERE status='open' AND draws_at<=? ORDER BY draws_at LIMIT 100",
                    now()
                )
            );
        },
        async claim(id, userId, text) {
            return transaction(async (db) => {
                const c = await campaign(db, id);
                if (c.status !== "drawn" || now() >= c.claims_until) fail("claim_closed", 409);
                const e = await db.get(
                    "SELECT id FROM lottery_entries WHERE lottery_id=? AND user_id=?",
                    id,
                    userId
                );
                const w =
                    e && (await db.get("SELECT * FROM lottery_winners WHERE entry_id=?", e.id));
                if (!w) fail("not_winner", 403);
                if (w.claimed_at) return { ok: true };
                await db.run(
                    "UPDATE lottery_winners SET claim_text=?,claimed_at=? WHERE entry_id=?",
                    clean(text, 1000, true),
                    now(),
                    e.id
                );
                await audit(db, id, userId, "claimed", { entryId: e.id });
                return { ok: true };
            });
        },
        async fulfill(id, entryId, actor) {
            return transaction(async (db) => {
                const w = await db.get(
                    "SELECT * FROM lottery_winners WHERE lottery_id=? AND entry_id=?",
                    id,
                    entryId
                );
                if (!w?.claimed_at) fail("not_claimed", 409);
                if (w.fulfilled_at) return { ok: true };
                await db.run(
                    "UPDATE lottery_winners SET fulfilled_at=?,fulfilled_by=? WHERE entry_id=?",
                    now(),
                    actor,
                    entryId
                );
                await audit(db, id, actor, "fulfilled", { entryId });
                return { ok: true };
            });
        },
        async audit(id) {
            return read((db) =>
                db.all(
                    "SELECT actor_id,action,detail,created_at FROM lottery_audit WHERE lottery_id=? ORDER BY id DESC LIMIT 100",
                    id
                )
            );
        },
    };
}
module.exports = { createLotteryService, LotteryError, validateCampaign };
