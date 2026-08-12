const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const { runMigrations } = require("../src/config/runMigrations");

test("ecosystem partner migration syncs verified logos and Getui idempotently", async () => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    const originalLog = console.log;
    const originalWarn = console.warn;
    const warnings = [];
    console.log = () => {};
    console.warn = (...args) => warnings.push(args.map(String).join(" "));

    try {
        await runMigrations(db);
        await runMigrations(db);

        const partners = await db.all(
            `SELECT category, name, name_en, logo_url, dark_logo_url, partner_scope, featured
             FROM ecosystem_partners
             WHERE name IN ('未来学习中心', 'XLAB', 'ZJUAI', '每日互动')
               AND deleted_at IS NULL
             ORDER BY sort_order, id`
        );
        assert.equal(partners.length, 4, warnings.join("\n"));

        const futureLearning = partners.find((partner) => partner.name === "未来学习中心");
        assert.equal(futureLearning.category, "school");
        assert.match(futureLearning.logo_url, /zhejiang-university\.png$/);

        const xlab = partners.find((partner) => partner.name === "XLAB");
        assert.match(xlab.logo_url, /xlab\.svg$/);
        assert.match(xlab.dark_logo_url, /xlab-white\.svg$/);

        const zjuai = partners.find((partner) => partner.name === "ZJUAI");
        assert.match(zjuai.logo_url, /zjuai\.webp$/);

        const getui = partners.find((partner) => partner.name === "每日互动");
        assert.equal(getui.name_en, "Getui");
        assert.equal(getui.partner_scope, "core_partner");
        assert.equal(getui.featured, 1);
        assert.match(getui.logo_url, /getui\.svg$/);

        const getuiCount = await db.get(
            "SELECT COUNT(*) AS count FROM ecosystem_partners WHERE name = '每日互动'"
        );
        assert.equal(getuiCount.count, 1);
    } finally {
        console.log = originalLog;
        console.warn = originalWarn;
        await db.close();
    }
});
