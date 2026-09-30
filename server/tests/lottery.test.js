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
test("migration is repeatable; input, unpublished privacy, versions and publication locks", async () => {
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
    await assert.rejects(service.save(id, { ...body(), version: 2 }, 1), { code: "locked" });
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
    } finally {
        await new Promise((r) => server.close(r));
        await require("../src/config/db").pool.close();
    }
});
