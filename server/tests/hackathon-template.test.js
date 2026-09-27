const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const {
    DEFAULT_HACKATHON_TEMPLATE,
    getHackathonSchedule,
    getHackathonTemplate,
    saveHackathonSchedule,
    saveHackathonTemplate,
    validateRegistrationAnswers,
} = require("../src/services/hackathonTemplateService");

const createDb = async () => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE competitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            subtitle TEXT,
            description TEXT,
            event_date TEXT,
            cover_image TEXT,
            is_featured INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT
        );
    `);
    return db;
};

test("hackathon template falls back to legacy settings before the first publish", async () => {
    const db = await createDb();
    try {
        await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [
            "hackathon_title",
            "第二届浙客松",
        ]);
        await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [
            "hackathon_location",
            "紫金港体育馆",
        ]);

        const template = await getHackathonTemplate(db);
        assert.equal(template.event.title, "第二届浙客松");
        assert.equal(template.event.location, "紫金港体育馆");
        assert.equal(template.form.fields.find((field) => field.id === "studentId").required, true);
    } finally {
        await db.close();
    }
});

test("hackathon template publish is atomic and mirrors AI-compatible event settings", async () => {
    const db = await createDb();
    try {
        const draft = JSON.parse(JSON.stringify(DEFAULT_HACKATHON_TEMPLATE));
        draft.event.title = "第二届浙客松 AI 创新赛";
        draft.event.startAt = "2026-11-08T09:30";
        draft.event.endAt = "2026-11-08T18:00";
        draft.event.location = "紫金港校区蒙民伟楼";
        draft.form.fields.push({
            id: "diet",
            label: "饮食需求",
            type: "select",
            placeholder: "请选择",
            required: true,
            enabled: true,
            width: "half",
            options: [
                { value: "none", label: "无" },
                { value: "vegetarian", label: "素食" },
            ],
        });

        const saved = await saveHackathonTemplate(db, draft);
        assert.equal(saved.revision, 2);
        assert.equal(saved.event.title, "第二届浙客松 AI 创新赛");

        const titleSetting = await db.get("SELECT value FROM settings WHERE key = ?", [
            "hackathon_title",
        ]);
        const dateSetting = await db.get("SELECT value FROM settings WHERE key = ?", [
            "hackathon_date",
        ]);
        assert.equal(titleSetting.value, saved.event.title);
        assert.equal(dateSetting.value, "11月8日 09:30–18:00");

        const reloaded = await getHackathonTemplate(db);
        assert.equal(reloaded.form.fields.at(-1).id, "diet");
        const outcomeArchive = await db.get("SELECT * FROM competitions WHERE slug = ?", [
            saved.results.competitionSlug,
        ]);
        assert.equal(outcomeArchive.title, saved.event.title);
        assert.equal(outcomeArchive.status, "active");
    } finally {
        await db.close();
    }
});

test("dynamic registration answers follow the published field schema", () => {
    const template = JSON.parse(JSON.stringify(DEFAULT_HACKATHON_TEMPLATE));
    template.form.fields.push({
        id: "diet",
        label: "饮食需求",
        type: "select",
        placeholder: "请选择",
        required: true,
        enabled: true,
        width: "half",
        options: [
            { value: "none", label: "无" },
            { value: "vegetarian", label: "素食" },
        ],
    });

    const missing = validateRegistrationAnswers(template, {
        name: "测试同学",
        studentId: "3230100000",
        major: "计算机科学",
        grade: "junior",
        aiTools: ["codex"],
        experience: "做过一个校园助手",
    });
    assert.equal(
        missing.errors.some((error) => error.field === "diet"),
        true
    );

    const valid = validateRegistrationAnswers(template, {
        name: "测试同学",
        studentId: "3230100000",
        major: "计算机科学",
        grade: "junior",
        aiTools: ["codex"],
        experience: "做过一个校园助手",
        diet: "vegetarian",
    });
    assert.deepEqual(valid.errors, []);
    assert.equal(valid.answers.diet, "vegetarian");
});

test("hackathon schedule sorts events and keeps per-event page visibility", async () => {
    const db = await createDb();
    try {
        const later = JSON.parse(JSON.stringify(DEFAULT_HACKATHON_TEMPLATE));
        later.event.key = "winter-final";
        later.event.title = "冬季总决赛";
        later.event.startAt = "2026-12-20T09:00";
        later.event.endAt = "2026-12-20T18:00";
        later.results.competitionSlug = "winter-final";
        later.navigation.registrationVisible = false;

        const earlier = JSON.parse(JSON.stringify(DEFAULT_HACKATHON_TEMPLATE));
        earlier.event.key = "autumn-qualifier";
        earlier.event.title = "秋季资格赛";
        earlier.event.startAt = "2026-10-10T09:00";
        earlier.event.endAt = "2026-10-10T14:00";
        earlier.results.competitionSlug = "autumn-qualifier";
        earlier.navigation.resultsVisible = false;

        const saved = await saveHackathonSchedule(db, {
            activeEventKey: later.event.key,
            events: [later, earlier],
        });

        assert.deepEqual(
            saved.events.map((item) => item.event.key),
            [earlier.event.key, later.event.key]
        );
        assert.equal(saved.activeEventKey, later.event.key);
        assert.equal(saved.events[0].navigation.resultsVisible, false);
        assert.equal(saved.events[1].navigation.registrationVisible, false);

        const selected = await getHackathonTemplate(db, earlier.event.key);
        assert.equal(selected.event.title, earlier.event.title);
        const reloaded = await getHackathonSchedule(db);
        assert.equal(reloaded.events.length, 2);
        const archives = await db.all("SELECT slug, title FROM competitions ORDER BY slug");
        assert.deepEqual(
            archives.map((archive) => archive.slug),
            ["autumn-qualifier", "winter-final"]
        );
    } finally {
        await db.close();
    }
});

test("hackathon schedule rejects sharing one outcome archive between events", async () => {
    const db = await createDb();
    try {
        const first = JSON.parse(JSON.stringify(DEFAULT_HACKATHON_TEMPLATE));
        first.event.key = "event-one";
        first.results.competitionSlug = "shared-outcome";

        const second = JSON.parse(JSON.stringify(DEFAULT_HACKATHON_TEMPLATE));
        second.event.key = "event-two";
        second.event.startAt = "2026-12-12T09:00";
        second.event.endAt = "2026-12-12T14:00";
        second.results.competitionSlug = "shared-outcome";

        await assert.rejects(
            saveHackathonSchedule(db, { events: [first, second] }),
            (error) =>
                error.code === "HACKATHON_TEMPLATE_INVALID" &&
                error.details.some((detail) => detail.message.includes("已绑定其他比赛日程"))
        );
    } finally {
        await db.close();
    }
});
