const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { createLotteryService } = require("../src/services/lotteryService");
const { migrateLotteries } = require("../src/config/migrations/lotteries");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zju-lottery-"));
process.env.DATABASE_FILE = path.join(dir, "test.sqlite");
process.env.SECRET_KEY = "lottery-test-only-secret";
process.env.NODE_ENV = "test";
let db,
    clock = Date.now();
const service = createLotteryService({ now: () => clock });
let campaignNumber = 0;
const body = () => ({
    title: `Draw ${++campaignNumber}`,
    description: "Test campaign",
    rules: "One account, one ticket",
    proof_required: true,
    review_required: true,
    opens_at: clock - 1000,
    closes_at: clock + 10000,
    draws_at: clock + 20000,
    claims_until: clock + 100000,
    prizes: [
        { name: "First", quantity: 1 },
        { name: "Second", quantity: 2 },
    ],
});
async function create(overrides = {}) {
    const data = { ...body(), ...overrides };
    const { id } = await service.save(null, data, 1);
    await service.publish(id, 1, 0);
    return { id, data };
}
test.before(async () => {
    db = await open({ filename: process.env.DATABASE_FILE, driver: sqlite3.Database });
    await db.exec(
        `PRAGMA journal_mode=WAL; CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT,role TEXT,account_type TEXT DEFAULT 'personal',review_permission TEXT DEFAULT 'normal',admin_scope TEXT,admin_permissions TEXT DEFAULT '[]',auth_version INTEGER DEFAULT 0);`
    );
    for (let i = 1; i <= 8; i++)
        await db.run(
            "INSERT INTO users(id,username,role,admin_scope) VALUES (?,?,?,?)",
            i,
            `user${i}`,
            i === 1 ? "admin" : "user",
            i === 1 ? "platform" : "none"
        );
    await migrateLotteries(db);
});
test.after(async () => {
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
});
test("migration is repeatable; input, unpublished privacy and optimistic versions", async () => {
    await migrateLotteries(db);
    await assert.rejects(service.save(null, { ...body(), draws_at: clock - 1000 }, 1), {
        code: "invalid_dates",
    });
    await assert.rejects(
        service.save(null, { ...body(), prizes: [{ name: "bad", quantity: 1.5 }] }, 1),
        { code: "invalid_prizes" }
    );
    const { id } = await service.save(null, body(), 1);
    await assert.rejects(service.detail(id, 2), { code: "not_found" });
    assert(!(await service.list()).some((x) => x.id === id));
    await service.save(id, { ...body(), version: 0 }, 1);
    await assert.rejects(service.publish(id, 1, 0), { code: "locked" });
    await service.publish(id, 1, 1);
    await assert.rejects(service.save(id, { ...body(), version: 1 }, 1), { code: "locked" });
    await service.save(id, { ...body(), version: 2 }, 1);
    assert.equal((await service.detail(id)).status, "open");
    assert.equal((await service.detail(id)).version, 3);
});
const editBody = (campaign) => ({
    ...campaign,
    proof_required: Boolean(campaign.proof_required),
    review_required: Boolean(campaign.review_required),
});
test("published edits preserve entries, proofs, reviews, identity and unchanged prize IDs", async () => {
    const { id } = await create();
    const approved = await service.enter(id, 2, { proof: Buffer.from("approved-proof") });
    await service.review(id, approved.id, 1, "approved", "Verified");
    await service.enter(id, 3, { proof: Buffer.from("pending-proof") });
    const original = await service.detail(id, 2);
    const entries = await service.entries(id);
    const updated = {
        ...editBody(original),
        title: "Published title correction",
        rules: "Updated public instructions",
        closes_at: original.closes_at + 1000,
        draws_at: original.draws_at + 2000,
        claims_until: original.claims_until + 3000,
    };
    await service.save(id, updated, 1);
    const result = await service.detail(id, 2);
    assert.equal(result.id, id);
    assert.equal(result.status, "open");
    assert.equal(result.title, updated.title);
    assert.equal(result.draws_at, updated.draws_at);
    assert.equal(result.version, original.version + 1);
    assert.deepEqual(result.prizes, original.prizes);
    assert.deepEqual(result.entry, original.entry);
    assert.deepEqual(await service.entries(id), entries);
    assert.equal((await service.proof(id, approved.id, 2, false)).toString(), "approved-proof");
    const audit = (await service.audit(id)).find((item) => item.action === "updated");
    const detail = JSON.parse(audit.detail);
    assert.equal(audit.actor_id, 1);
    assert.equal(detail.version, result.version);
    assert.deepEqual(detail.changes.rules, { before: original.rules, after: updated.rules });
    assert(!detail.changes.prizes);
    await assert.rejects(service.save(id, updated, 1), { code: "locked" });
    assert.equal((await service.detail(id)).version, result.version);
});
test("published edits retain validation and permit only one concurrent save", async () => {
    const { id } = await create();
    const original = await service.detail(id);
    await assert.rejects(
        service.save(id, { ...editBody(original), closes_at: original.draws_at }, 1),
        { code: "invalid_dates" }
    );
    await assert.rejects(
        service.save(id, { ...editBody(original), prizes: [{ name: "Bad", quantity: 0 }] }, 1),
        { code: "invalid_prizes" }
    );
    const outcomes = await Promise.allSettled([
        service.save(id, { ...editBody(original), title: "First concurrent edit" }, 1),
        service.save(id, { ...editBody(original), title: "Second concurrent edit" }, 1),
    ]);
    assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(outcomes.find((result) => result.status === "rejected").reason.code, "locked");
    assert.equal((await service.detail(id)).version, original.version + 1);
});
test("edits cannot postpone a due draw or overwrite drawn and cancelled campaigns", async () => {
    const { id, data } = await create();
    const original = await service.detail(id);
    clock = data.draws_at;
    const postponed = {
        ...editBody(original),
        draws_at: clock + 1000,
        claims_until: clock + 100000,
    };
    await assert.rejects(service.save(id, postponed, 1), { code: "locked" });
    await service.draw(id);
    const drawn = await service.detail(id);
    await assert.rejects(service.save(id, { ...postponed, version: drawn.version }, 1), {
        code: "locked",
    });
    assert.deepEqual(await service.detail(id), drawn);
    const cancelled = await create();
    await service.cancel(cancelled.id, 1, "Event cancelled");
    const closed = await service.detail(cancelled.id);
    await assert.rejects(service.save(cancelled.id, editBody(closed), 1), { code: "locked" });
});
test("unique concurrent entries, private evidence, corrections and registration boundaries", async () => {
    const { id, data } = await create();
    await assert.rejects(service.enter(id, 2), { code: "proof_required" });
    const both = await Promise.all([
        service.enter(id, 2, { proof: Buffer.from("private") }),
        service.enter(id, 2, { proof: Buffer.from("private") }),
    ]);
    assert.equal(both[0].id, both[1].id);
    assert.equal((await service.entries(id)).total, 1);
    await assert.rejects(service.proof(id, both[0].id, 3, false), { code: "not_found" });
    assert.equal((await service.proof(id, both[0].id, 2, false)).toString(), "private");
    await service.review(id, both[0].id, 1, "rejected", "Please clarify");
    await service.enter(id, 2, { note: "corrected" });
    assert.equal((await service.detail(id, 2)).entry.status, "pending");
    clock = data.closes_at;
    await assert.rejects(service.enter(id, 3, { proof: Buffer.from("x") }), {
        code: "registration_closed",
    });
    await service.review(id, both[0].id, 1, "approved");
    assert.equal((await service.detail(id, 2)).entry.status, "approved");
});
test("atomic concurrent draw excludes pending/rejected/banned users and never issues duplicate prizes", async () => {
    const { id, data } = await create();
    for (let u = 2; u <= 8; u++) {
        const e = await service.enter(id, u, { proof: Buffer.from("private") });
        if (u !== 7)
            await service.review(
                id,
                e.id,
                1,
                u === 6 ? "rejected" : "approved",
                u === 6 ? "Rejected" : ""
            );
    }
    await db.run("UPDATE users SET role='banned' WHERE id=8");
    assert.equal(await service.draw(id), false);
    clock = data.draws_at;
    const results = await Promise.all([service.draw(id), service.draw(id), service.draw(id)]);
    assert.equal(results.filter(Boolean).length, 1);
    const detail = await service.detail(id, 2);
    assert.equal(detail.eligible_count, 4);
    assert.equal(detail.winners.length, 3);
    assert.equal(new Set(detail.winners.map((w) => w.ticket)).size, 3);
    assert.match(detail.pool_hash, /^[a-f0-9]{64}$/);
    assert.equal(
        (
            await db.get(
                "SELECT COUNT(*) AS n FROM lottery_audit WHERE lottery_id=? AND action='drawn'",
                id
            )
        ).n,
        1
    );
    await assert.rejects(service.review(id, 1, 1, "approved"), { code: "locked" });
    await assert.rejects(service.cancel(id, 1, "cancel"), { code: "locked" });
    const w = await db.get(
        "SELECT e.user_id,e.id FROM lottery_winners w JOIN lottery_entries e ON e.id=w.entry_id WHERE w.lottery_id=?",
        id
    );
    await assert.rejects(service.claim(id, 7, "not mine"), { code: "not_winner" });
    await service.claim(id, w.user_id, "private contact");
    await service.claim(id, w.user_id, "repeated");
    assert.equal((await service.detail(id, w.user_id)).my_win.claim_text, "private contact");
    assert(!JSON.stringify((await service.detail(id, 7)).winners).includes("private contact"));
    await service.fulfill(id, w.id, 1);
    await service.fulfill(id, w.id, 1);
    assert.equal(
        (
            await db.get(
                "SELECT COUNT(*) AS n FROM lottery_audit WHERE lottery_id=? AND action='fulfilled'",
                id
            )
        ).n,
        1
    );
    clock = data.claims_until;
    await assert.rejects(service.claim(id, w.user_id, "late"), { code: "claim_closed" });
});
test("cancelled and empty draws, restart catch-up, rollback on failure", async () => {
    const c = await create({ proof_required: false, review_required: false });
    await service.cancel(c.id, 1, "cancelled");
    await assert.rejects(service.enter(c.id, 2), { code: "registration_closed" });
    const empty = await create();
    clock = empty.data.draws_at;
    assert.equal(await service.draw(empty.id), true);
    assert.equal((await service.detail(empty.id)).eligible_count, 0);
    const c2 = await create({ proof_required: false, review_required: false });
    await service.enter(c2.id, 2);
    clock = c2.data.draws_at;
    const broken = createLotteryService({
        now: () => clock,
        choose: () => {
            throw new Error("simulated failure");
        },
    });
    await assert.rejects(broken.draw(c2.id), /simulated failure/);
    assert.equal((await service.detail(c2.id)).status, "open");
    const recovered = createLotteryService({ now: () => clock });
    assert((await recovered.due()).some((x) => x.id === c2.id));
    await recovered.draw(c2.id);
    assert.equal((await recovered.detail(c2.id)).winners.length, 1);
});
const eventKey = "zhekesong-current";
const otherEvent = "getui-beauty-2026";
const eventFields = {
    event_key: eventKey,
    promotion_url: "https://example.org/event-post",
    min_likes: 10,
};
test("existing databases gain event fields without reassigning campaigns or entries", async () => {
    const legacy = await open({ filename: ":memory:", driver: sqlite3.Database });
    try {
        await legacy.exec(`
            CREATE TABLE lotteries(id TEXT PRIMARY KEY,status TEXT,draws_at INTEGER,created_at INTEGER);
            CREATE TABLE lottery_entries(id INTEGER PRIMARY KEY,lottery_id TEXT,user_id INTEGER,status TEXT,proof BLOB);
            INSERT INTO lotteries VALUES ('old','open',1,1);
            INSERT INTO lottery_entries VALUES (1,'old',2,'approved',NULL);
        `);
        await migrateLotteries(legacy);
        await migrateLotteries(legacy);
        const old = await legacy.get("SELECT * FROM lotteries WHERE id='old'");
        assert.equal(old.event_key, null);
        assert.equal(old.promotion_url, "");
        assert.equal(old.min_likes, 0);
        assert.equal(
            (await legacy.get("SELECT * FROM lottery_entries WHERE id=1")).like_count,
            null
        );
    } finally {
        await legacy.close();
    }
});
test("event campaigns validate configuration, isolate event queries and mandate proof review", async () => {
    for (const invalid of [
        { event_key: "invented" },
        { event_key: [] },
        { promotion_url: "javascript:alert(1)" },
        { promotion_url: "https://user:secret@example.org" },
        { min_likes: -1 },
        { min_likes: 1.5 },
        { min_likes: false },
        { min_likes: 1_000_000_001 },
    ])
        await assert.rejects(service.save(null, { ...body(), ...eventFields, ...invalid }, 1));
    const draft = await service.save(null, { ...body(), ...eventFields, promotion_url: "" }, 1);
    await assert.rejects(service.publish(draft.id, 1, 0), { code: "promotion_url_required" });
    const event = await create({ ...eventFields, proof_required: false, review_required: false });
    const other = await create({ ...eventFields, event_key: otherEvent });
    const legacy = await create();
    const detail = await service.detail(event.id);
    assert.equal(detail.proof_required, 1);
    assert.equal(detail.review_required, 1);
    assert.equal(detail.promotion_url, eventFields.promotion_url);
    const ids = (await service.list(false, eventKey)).map((c) => c.id);
    assert(ids.includes(event.id));
    assert(!ids.includes(other.id));
    assert(!ids.includes(legacy.id));
    assert(!ids.includes(draft.id));
    assert((await service.list(true, eventKey)).some((c) => c.id === draft.id));
    await assert.rejects(service.detail(event.id, 2, false, otherEvent), { code: "not_found" });
    await assert.rejects(service.list(false, "invented"), { code: "invalid_event" });
    await assert.rejects(service.enter(event.id, 2, { like_count: 12 }), {
        code: "proof_required",
    });
    for (const like_count of [undefined, "", "1.5", "-1", false, null, -1, 1.5, "1e2", Infinity]) {
        await assert.rejects(
            service.enter(event.id, 2, { proof: Buffer.from("screenshot"), like_count }),
            { code: "invalid_likes" }
        );
    }
    await assert.rejects(
        service.enter(event.id, 2, { proof: Buffer.from("screenshot"), like_count: 9 }),
        { code: "insufficient_likes" }
    );
    const entry = await service.enter(event.id, 2, {
        proof: Buffer.from("screenshot"),
        like_count: "12",
    });
    assert.equal((await service.detail(event.id, 2)).entry.status, "pending");
    assert.equal((await service.entries(event.id)).items[0].like_count, 12);
    await service.review(event.id, entry.id, 1, "rejected", "Screenshot unclear");
    const resubmitted = await service.enter(event.id, 2, {
        proof: Buffer.from("clear screenshot"),
        like_count: 15,
    });
    assert.equal(resubmitted.id, entry.id);
    const updated = (await service.detail(event.id, 2)).entry;
    assert.equal(updated.status, "pending");
    assert.equal(updated.like_count, 15);
    assert.equal(updated.review_note, "");
    assert.equal(updated.reviewed_at, null);
    assert.equal(
        (await service.proof(event.id, entry.id, 2, false)).toString(),
        "clear screenshot"
    );
    await service.review(event.id, entry.id, 1, "approved");
    assert.equal((await service.detail(event.id, 2)).entry.status, "approved");
});
test("published event edits keep required promotion and draw with the latest prizes and threshold", async () => {
    const event = await create(eventFields);
    for (const [user, like_count] of [
        [2, 12],
        [3, 30],
    ]) {
        const entry = await service.enter(event.id, user, {
            proof: Buffer.from("proof"),
            like_count,
        });
        await service.review(event.id, entry.id, 1, "approved");
    }
    const original = await service.detail(event.id);
    await assert.rejects(service.save(event.id, { ...editBody(original), promotion_url: "" }, 1), {
        code: "promotion_url_required",
    });
    assert.equal((await service.detail(event.id)).version, original.version);
    await service.save(
        event.id,
        {
            ...editBody(original),
            min_likes: 20,
            promotion_url: "https://example.org/updated-post",
            prizes: [{ name: "Updated prize", quantity: 2 }],
            proof_required: false,
            review_required: false,
        },
        1
    );
    const updated = await service.detail(event.id);
    assert.equal(updated.proof_required, 1);
    assert.equal(updated.review_required, 1);
    assert.equal(updated.counts.approved, 2);
    clock = updated.draws_at;
    await service.draw(event.id);
    const result = await service.detail(event.id, 3);
    assert.equal(result.eligible_count, 1);
    assert.equal(result.winners.length, 1);
    assert.equal(result.my_win.prize_name, "Updated prize");
    assert.equal((await service.detail(event.id, 2)).my_win, null);
});
test("event approval and draw enforce screenshots and threshold, with one chance per approved account", async () => {
    const event = await create(eventFields);
    for (const [user, count] of [
        [2, 10],
        [3, 10000],
        [4, 15],
        [5, 15],
        [6, 15],
        [7, 15],
    ]) {
        const entry = await service.enter(event.id, user, {
            proof: Buffer.from("proof"),
            like_count: count,
        });
        if ([2, 3, 6, 7].includes(user)) await service.review(event.id, entry.id, 1, "approved");
        if (user === 5) await service.review(event.id, entry.id, 1, "rejected", "Wrong post");
    }
    // Defense in depth: corrupted/imported rows cannot be approved or drawn.
    await db.run(
        "UPDATE lottery_entries SET proof=NULL WHERE lottery_id=? AND user_id=6",
        event.id
    );
    await db.run(
        "UPDATE lottery_entries SET like_count=2 WHERE lottery_id=? AND user_id=7",
        event.id
    );
    const badProof = await db.get(
        "SELECT id FROM lottery_entries WHERE lottery_id=? AND user_id=6",
        event.id
    );
    const badLikes = await db.get(
        "SELECT id FROM lottery_entries WHERE lottery_id=? AND user_id=7",
        event.id
    );
    await assert.rejects(service.review(event.id, badProof.id, 1, "approved"), {
        code: "proof_required",
    });
    await assert.rejects(service.review(event.id, badLikes.id, 1, "approved"), {
        code: "insufficient_likes",
    });
    clock = event.data.draws_at;
    const poolSizes = [];
    const drawService = createLotteryService({
        now: () => clock,
        choose: (size) => {
            poolSizes.push(size);
            return 0;
        },
    });
    await drawService.draw(event.id);
    const result = await service.detail(event.id);
    assert.equal(result.eligible_count, 2);
    assert.equal(result.winners.length, 2);
    assert.deepEqual(poolSizes, [2, 1]);
    const selected = await db.all(
        "SELECT user_id FROM lottery_entries WHERE lottery_id=? AND eligible=1 ORDER BY user_id",
        event.id
    );
    assert.deepEqual(
        selected.map((row) => row.user_id),
        [2, 3]
    );
});
test("HTTP permissions, screenshot decoding, proof ownership, and public data minimization", async () => {
    const express = require("express");
    const jwt = require("jsonwebtoken");
    const sharp = require("sharp");
    const app = express();
    app.use(express.json());
    app.use("/lotteries", require("../src/routes/lotteries"));
    const server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${server.address().port}/lotteries`;
    const req = (url, user = 0, options = {}) =>
        fetch(base + url, {
            ...options,
            headers: {
                ...(user
                    ? { Authorization: `Bearer ${jwt.sign({ id: user }, process.env.SECRET_KEY)}` }
                    : {}),
                ...options.headers,
            },
        });
    try {
        assert.equal((await req("/admin")).status, 401);
        assert.equal((await req("/admin", 2)).status, 403);
        assert.equal((await req("/admin", 1)).status, 200);
        // Route service uses the real clock.
        clock = Date.now();
        const { id } = await create();
        const campaign = await service.detail(id);
        const update = {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...editBody(campaign), title: "Published HTTP edit" }),
        };
        assert.equal((await req(`/admin/${id}`, 0, update)).status, 401);
        assert.equal((await req(`/admin/${id}`, 2, update)).status, 403);
        assert.equal((await req(`/admin/${id}`, 1, update)).status, 200);
        assert.equal((await req(`/admin/${id}`, 1, update)).status, 409);
        const publicUpdate = await (await req(`/${id}`)).json();
        assert.equal(publicUpdate.title, "Published HTTP edit");
        assert.equal(publicUpdate.status, "open");
        const invalid = new FormData();
        invalid.append("proof", new Blob(["not an image"], { type: "image/png" }), "test.png");
        assert.equal(
            (await req(`/${id}/entries`, 2, { method: "POST", body: invalid })).status,
            400
        );
        const form = new FormData();
        form.append("note", "private note");
        form.append(
            "proof",
            new Blob(
                [
                    await sharp({
                        create: { width: 10, height: 10, channels: 3, background: "red" },
                    })
                        .png()
                        .toBuffer(),
                ],
                { type: "image/png" }
            ),
            "test.png"
        );
        const response = await req(`/${id}/entries`, 2, { method: "POST", body: form });
        assert.equal(response.status, 200);
        const entry = await response.json();
        assert.equal((await req(`/${id}/entries/${entry.id}/proof`, 3)).status, 404);
        const proof = await req(`/${id}/entries/${entry.id}/proof`, 2);
        assert.equal(proof.status, 200);
        assert.equal(proof.headers.get("content-type"), "image/webp");
        assert.equal(proof.headers.get("cache-control"), "no-store");
        const anon = await req(`/${id}`);
        assert.equal(anon.status, 200);
        assert(!JSON.stringify(await anon.json()).includes("private note"));
        await db.run(
            "UPDATE users SET role='operator',admin_scope='operations',admin_permissions='[\"admin.events.manage\"]' WHERE id=5"
        );
        assert.equal((await req("/admin", 5)).status, 403);
        const event = await create(eventFields);
        assert.equal((await req(`/${event.id}?event=${otherEvent}`)).status, 404);
        const eventList = await (await req(`/?event=${eventKey}`)).json();
        assert(eventList.every((campaign) => campaign.event_key === eventKey));
        assert.equal((await req("/?event=unknown")).status, 400);
        assert.equal((await req(`/${event.id}/entries`, 0, { method: "POST" })).status, 401);
        const eventForm = new FormData();
        eventForm.append("note", "event private note");
        eventForm.append("like_count", "18");
        eventForm.append(
            "proof",
            new Blob(
                [
                    await sharp({
                        create: { width: 10, height: 10, channels: 3, background: "blue" },
                    })
                        .png()
                        .toBuffer(),
                ],
                { type: "image/png" }
            ),
            "event.png"
        );
        const submitted = await req(`/${event.id}/entries`, 3, { method: "POST", body: eventForm });
        assert.equal(submitted.status, 200);
        const eventEntry = await submitted.json();
        const eventDetail = await (await req(`/${event.id}?event=${eventKey}`, 3)).json();
        assert.equal(eventDetail.entry.like_count, 18);
        assert.equal(eventDetail.entry.status, "pending");
        const reviewUrl = `/admin/${event.id}/entries/${eventEntry.id}/review`;
        const review = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "approved" }),
        };
        assert.equal((await req(reviewUrl, 3, review)).status, 403);
        assert.equal((await req(reviewUrl, 5, review)).status, 403);
        assert.equal((await req(reviewUrl, 1, review)).status, 200);
        assert.equal((await (await req(`/${event.id}`, 3)).json()).entry.status, "approved");
    } finally {
        await new Promise((r) => server.close(r));
        await require("../src/config/db").pool.close();
    }
});
