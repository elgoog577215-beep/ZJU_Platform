const template = require("../../../../shared/hackathonAiX.json");

const MARKER = "hackathon_ai_x_registration_profile_v1";
const PROFILE_FIELDS = new Set([
    "strengths",
    "aiTools",
    "aiToolsOther",
    "experience",
    "researchExperience",
    "projectLinks",
]);

// Extend the published event in place. Never publish a missing/retired event,
// reinterpret previously submitted answers, or overwrite custom profile fields.
// Track selection/team collection follow the newly confirmed rules explicitly.
async function migrateHackathonAiXRegistration(db) {
    await db.exec("BEGIN IMMEDIATE");
    try {
        if (!(await db.get("SELECT value FROM settings WHERE key = ?", [MARKER]))) {
            const stored = await db.get(
                "SELECT value FROM settings WHERE key = 'hackathon_schedule_config'"
            );
            const schedule = stored ? JSON.parse(stored.value) : null;
            const event = schedule?.events?.find((item) => item.event?.key === template.event.key);
            if (event && Array.isArray(event.form?.fields)) {
                const before = JSON.stringify(event);
                const existing = new Set(event.form.fields.map((field) => field.id));
                const missing = template.form.fields.filter(
                    (field) => PROFILE_FIELDS.has(field.id) && !existing.has(field.id)
                );
                // Do not truncate an administrator's larger custom form through normalization.
                if (event.form.fields.length + missing.length > 24) {
                    throw new Error(
                        "AI+X registration has no room for the additional profile fields"
                    );
                }
                event.form.fields.push(...missing);
                const track = event.form.fields.find((field) => field.id === "track");
                if (track) {
                    const currentTrack = template.form.fields.find((field) => field.id === "track");
                    Object.assign(track, {
                        type: "multi_select",
                        required: true,
                        enabled: true,
                        width: "full",
                        placeholder: currentTrack.placeholder,
                        options: currentTrack.options,
                    });
                }
                const team = event.form.fields.find((field) => field.id === "team");
                if (team) team.enabled = false;
                if (event.event.format === "1–5 人组队") event.event.format = template.event.format;
                if (
                    event.event.description ===
                    "面向不同专业的真实问题，组建跨学科团队，用 AI 完成可运行、可验证的应用。"
                ) {
                    event.event.description = template.event.description;
                }
                if (
                    event.form.description ===
                    "面向浙江大学各专业学生，支持 1–5 人组队。每位参赛者填写自己的报名信息。"
                ) {
                    event.form.description = template.form.description;
                }
                const rule = event.rules?.find((item) => item.id === "cross_discipline");
                if (rule?.title === "跨学科组队与真实应用") rule.title = template.rules[0].title;
                if (
                    rule?.description ===
                    "面向浙江大学各专业学生，支持 1–5 人组队，以可运行的 AI 应用参与比赛。"
                ) {
                    rule.description = template.rules[0].description;
                }
                if (JSON.stringify(event) !== before) {
                    const updatedAt = new Date().toISOString();
                    event.revision = Number(event.revision || 1) + 1;
                    event.updatedAt = updatedAt;
                    schedule.revision = Number(schedule.revision || 1) + 1;
                    schedule.updatedAt = updatedAt;
                    await db.run(
                        "UPDATE settings SET value = ? WHERE key = 'hackathon_schedule_config'",
                        [JSON.stringify(schedule)]
                    );
                }
            }
            await db.run("INSERT INTO settings (key, value) VALUES (?, '1')", [MARKER]);
        }
        await db.exec("COMMIT");
    } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
    }
}

module.exports = { migrateHackathonAiXRegistration };
