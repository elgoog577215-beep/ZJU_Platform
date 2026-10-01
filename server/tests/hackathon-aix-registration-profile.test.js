const test = require("node:test");
const assert = require("node:assert/strict");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const template = require("../../shared/hackathonAiX.json");
const {
    migrateHackathonAiXRegistration,
} = require("../src/config/migrations/hackathonAiXRegistration");
const { validateRegistrationAnswers } = require("../src/services/hackathonTemplateService");
const clone = (value) => JSON.parse(JSON.stringify(value));

test("AI+X profile migration preserves customized fields, other editions and historical answers", async () => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    try {
        await db.exec(`CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
            CREATE TABLE hackathon_registrations (id INTEGER PRIMARY KEY, form_data_json TEXT);
            INSERT INTO hackathon_registrations VALUES(1, '{"name":"Historical","team":"Original"}');`);
        const event = clone(template);
        event.revision = 4;
        event.form.fields = event.form.fields.slice(0, 7);
        event.form.fields.find((field) => field.id === "track").type = "select";
        event.form.fields.find((field) => field.id === "team").enabled = true;
        event.event.format = "1–5 人组队";
        event.form.description =
            "面向浙江大学各专业学生，支持 1–5 人组队。每位参赛者填写自己的报名信息。";
        event.form.fields.push({
            id: "experience",
            label: "自定义项目问题",
            type: "textarea",
            enabled: false,
        });
        event.operatorExtension = { retained: true };
        const other = { event: { key: "historical" }, form: { fields: [] }, custom: "verbatim" };
        const schedule = { revision: 9, activeEventKey: "historical", events: [other, event] };
        const history = await db.get("SELECT * FROM hackathon_registrations");
        await db.run("INSERT INTO settings VALUES('hackathon_schedule_config', ?)", [
            JSON.stringify(schedule),
        ]);
        await migrateHackathonAiXRegistration(db);
        const stored = await db.get(
            "SELECT value FROM settings WHERE key='hackathon_schedule_config'"
        );
        const migrated = JSON.parse(stored.value);
        assert.equal(migrated.revision, 10);
        assert.equal(migrated.activeEventKey, "historical");
        assert.deepEqual(migrated.events[0], other);
        assert.equal(migrated.events[1].revision, 5);
        assert.deepEqual(migrated.events[1].operatorExtension, event.operatorExtension);
        assert.equal(migrated.events[1].form.fields.length, 13);
        assert.equal(
            migrated.events[1].form.fields.find((field) => field.id === "track").type,
            "multi_select"
        );
        assert.equal(
            migrated.events[1].form.fields.find((field) => field.id === "team").enabled,
            false
        );
        assert.equal(migrated.events[1].event.format, template.event.format);
        assert.equal(migrated.events[1].form.description, template.form.description);
        assert.deepEqual(
            migrated.events[1].form.fields.find((field) => field.id === "experience"),
            event.form.fields[7]
        );
        assert.deepEqual(await db.get("SELECT * FROM hackathon_registrations"), history);
        await migrateHackathonAiXRegistration(db);
        assert.deepEqual(
            await db.get("SELECT value FROM settings WHERE key='hackathon_schedule_config'"),
            stored
        );
        // A later deliberate field removal remains authoritative on the next restart.
        migrated.events[1].form.fields = migrated.events[1].form.fields.filter(
            (field) => field.id !== "researchExperience"
        );
        await db.run("UPDATE settings SET value=? WHERE key='hackathon_schedule_config'", [
            JSON.stringify(migrated),
        ]);
        await migrateHackathonAiXRegistration(db);
        assert.equal(
            JSON.parse(
                (await db.get("SELECT value FROM settings WHERE key='hackathon_schedule_config'"))
                    .value
            ).events[1].form.fields.length,
            12
        );
    } finally {
        await db.close();
    }
});

test("AI+X profile migration never publishes an absent event or creates an absent schedule", async () => {
    for (const schedule of [null, { revision: 2, events: [{ event: { key: "historical" } }] }]) {
        const db = await open({ filename: ":memory:", driver: sqlite3.Database });
        try {
            await db.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)");
            if (schedule)
                await db.run("INSERT INTO settings VALUES('hackathon_schedule_config', ?)", [
                    JSON.stringify(schedule),
                ]);
            await migrateHackathonAiXRegistration(db);
            await migrateHackathonAiXRegistration(db);
            const result = await db.get(
                "SELECT value FROM settings WHERE key='hackathon_schedule_config'"
            );
            assert.deepEqual(result ? JSON.parse(result.value) : null, schedule);
        } finally {
            await db.close();
        }
    }
});

const answers = {
    name: "Example",
    studentId: "TEST",
    major: "Design",
    grade: "junior",
    track: ["campus", "industry"],
    contact: "test@example.test",
    strengths: ["exploring"],
    aiTools: ["none"],
    aiToolsOther: "",
    experience: "",
    researchExperience: "",
    projectLinks: "",
};

test("AI+X registration permits beginners and validates exclusive choices and optional links", () => {
    assert.deepEqual(validateRegistrationAnswers(template, answers).errors, []);
    assert.deepEqual(
        validateRegistrationAnswers(template, { ...answers, track: "campus" }).answers.track,
        ["campus"]
    );
    assert.deepEqual(
        validateRegistrationAnswers(template, { ...answers, team: "Not collected" }).answers.team,
        undefined
    );
    for (const [field, value] of [
        ["aiTools", ["Codex", "none"]],
        ["strengths", ["development", "exploring"]],
        ["track", ["unknown"]],
        ["projectLinks", "javascript:alert(1)"],
        ["projectLinks", "https://user:password@example.test"],
        ["projectLinks", "https://example.test\ninvalid"],
    ]) {
        assert.ok(
            validateRegistrationAnswers(template, { ...answers, [field]: value }).errors.some(
                (error) => error.field === field
            ),
            field
        );
    }
    const links = "https://example.test/project\nhttp://example.test/paper";
    assert.deepEqual(
        validateRegistrationAnswers(template, { ...answers, projectLinks: links }).errors,
        []
    );
    // Disabled fields and earlier editions keep their existing configurable contract.
    const customized = clone(template);
    customized.form.fields.find((field) => field.id === "strengths").enabled = false;
    assert.deepEqual(
        validateRegistrationAnswers(customized, { ...answers, strengths: ["exploring", "design"] })
            .errors,
        []
    );
    customized.event.key = "another-edition";
    assert.deepEqual(
        validateRegistrationAnswers(customized, { ...answers, aiTools: ["none", "Codex"] }).errors,
        []
    );
});
