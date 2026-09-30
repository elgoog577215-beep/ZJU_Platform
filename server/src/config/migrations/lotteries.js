async function migrateLotteries(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS lotteries (
            id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
            rules TEXT NOT NULL, prizes_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','open','drawn','cancelled')),
            proof_required INTEGER NOT NULL, review_required INTEGER NOT NULL,
            opens_at INTEGER NOT NULL, closes_at INTEGER NOT NULL, draws_at INTEGER NOT NULL,
            claims_until INTEGER NOT NULL, created_by INTEGER NOT NULL REFERENCES users(id),
            created_at INTEGER NOT NULL, drawn_at INTEGER, eligible_count INTEGER,
            pool_hash TEXT, cancel_reason TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_lotteries_due ON lotteries(status, draws_at);
        CREATE TABLE IF NOT EXISTS lottery_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lottery_id TEXT NOT NULL REFERENCES lotteries(id), user_id INTEGER NOT NULL REFERENCES users(id),
            ticket TEXT NOT NULL UNIQUE, status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected')),
            note TEXT NOT NULL DEFAULT '', proof BLOB, review_note TEXT NOT NULL DEFAULT '',
            submitted_at INTEGER NOT NULL, reviewed_at INTEGER, reviewed_by INTEGER REFERENCES users(id),
            eligible INTEGER NOT NULL DEFAULT 0, UNIQUE(lottery_id,user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_lottery_entries_review ON lottery_entries(lottery_id,status,id);
        CREATE TABLE IF NOT EXISTS lottery_winners (
            entry_id INTEGER PRIMARY KEY REFERENCES lottery_entries(id),
            lottery_id TEXT NOT NULL REFERENCES lotteries(id), prize_id TEXT NOT NULL, prize_name TEXT NOT NULL,
            claim_text TEXT, claimed_at INTEGER, fulfilled_at INTEGER, fulfilled_by INTEGER REFERENCES users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_lottery_winners_campaign ON lottery_winners(lottery_id);
        CREATE TABLE IF NOT EXISTS lottery_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT, lottery_id TEXT NOT NULL REFERENCES lotteries(id),
            actor_id INTEGER REFERENCES users(id), action TEXT NOT NULL, detail TEXT NOT NULL, created_at INTEGER NOT NULL
        );
    `);
}
module.exports = { migrateLotteries };
