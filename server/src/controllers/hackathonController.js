const { getDb } = require("../config/db");
const {
    MAX_QUERY_LENGTH,
    runHackathonAssistant,
} = require("../services/hackathonAssistantService");
const {
    getHackathonSchedule,
    getHackathonTemplate,
    saveHackathonSchedule,
    saveHackathonTemplate,
    validateRegistrationAnswers,
} = require("../services/hackathonTemplateService");

const sanitizeText = (value, maxLength = 200) => {
    if (typeof value !== "string") return "";
    return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
};

const registerHackathon = async (req, res, next) => {
    try {
        const db = await getDb();
        const eventKey = sanitizeText(req.body?.eventKey, 80);
        const template = await getHackathonTemplate(db, eventKey);
        if (!template.navigation.registrationVisible || !template.event.registrationOpen) {
            return res.status(403).json({
                error: "当前赛事报名尚未开放",
                code: "HACKATHON_REGISTRATION_CLOSED",
            });
        }

        const legacyAnswers = {
            name: req.body?.name,
            studentId: req.body?.studentId,
            major: req.body?.major,
            grade: req.body?.grade,
            aiTools: req.body?.aiTools,
            experience: req.body?.experience,
        };
        const answerPayload =
            req.body?.answers && typeof req.body.answers === "object"
                ? { ...legacyAnswers, ...req.body.answers }
                : legacyAnswers;
        const validation = validateRegistrationAnswers(template, answerPayload);
        if (validation.errors.length > 0) {
            return res.status(400).json({
                error: "请检查并完善报名信息",
                code: "HACKATHON_REGISTRATION_INVALID",
                details: validation.errors,
            });
        }

        const { answers } = validation;
        const name = String(answers.name || "").trim();
        const studentId = String(answers.studentId || "")
            .trim()
            .toLowerCase();
        const major = String(answers.major || "").trim();
        const grade = String(answers.grade || "").trim();
        const aiTools = Array.isArray(answers.aiTools) ? answers.aiTools : [];
        const experience = String(answers.experience || "").trim();

        const existing = await db.get(
            "SELECT id FROM hackathon_registrations WHERE event_key = ? AND student_id = ?",
            [template.event.key, studentId]
        );
        if (existing) {
            return res.status(409).json({ error: "该学号已报名，请勿重复提交" });
        }

        const result = await db.run(
            `INSERT INTO hackathon_registrations
                (event_key, name, student_id, major, grade, ai_tools, experience, form_data_json, template_revision, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                template.event.key,
                name,
                studentId,
                major,
                grade,
                JSON.stringify(aiTools),
                experience,
                JSON.stringify(answers),
                template.revision,
                new Date().toISOString(),
            ]
        );

        res.status(201).json({
            id: result.lastID,
            eventKey: template.event.key,
            message: "报名成功",
        });
    } catch (error) {
        next(error);
    }
};

const getHackathonTemplateConfig = async (req, res, next) => {
    try {
        const db = await getDb();
        res.json(await getHackathonTemplate(db, req.query?.event));
    } catch (error) {
        next(error);
    }
};

const getHackathonScheduleConfig = async (_req, res, next) => {
    try {
        const db = await getDb();
        res.json(await getHackathonSchedule(db));
    } catch (error) {
        next(error);
    }
};

const updateHackathonTemplateConfig = async (req, res, next) => {
    try {
        const db = await getDb();
        const template = await saveHackathonTemplate(db, req.body);
        res.json({ success: true, template });
    } catch (error) {
        next(error);
    }
};

const updateHackathonScheduleConfig = async (req, res, next) => {
    try {
        const db = await getDb();
        const schedule = await saveHackathonSchedule(db, req.body);
        res.json({ success: true, schedule });
    } catch (error) {
        next(error);
    }
};

const getRegistrations = async (req, res, next) => {
    try {
        const db = await getDb();
        const rows = await db.all("SELECT * FROM hackathon_registrations ORDER BY created_at DESC");
        const registrations = rows.map((row) => {
            let formData = null;
            try {
                formData = row.form_data_json ? JSON.parse(row.form_data_json) : null;
            } catch {
                formData = null;
            }
            if (!formData || typeof formData !== "object") {
                let aiTools = [];
                try {
                    aiTools = JSON.parse(row.ai_tools || "[]");
                } catch {
                    aiTools = [];
                }
                formData = {
                    name: row.name,
                    studentId: row.student_id,
                    major: row.major,
                    grade: row.grade,
                    aiTools,
                    experience: row.experience,
                };
            }
            return { ...row, form_data: formData };
        });
        res.json(registrations);
    } catch (error) {
        next(error);
    }
};

const deleteRegistration = async (req, res, next) => {
    try {
        const db = await getDb();
        await db.run("DELETE FROM hackathon_registrations WHERE id = ?", [req.params.id]);
        res.json({ message: "报名记录已删除" });
    } catch (error) {
        next(error);
    }
};

const handleHackathonAssistant = async (req, res) => {
    try {
        const query = req.body?.query;
        if (typeof query !== "string" || query.trim() === "") {
            return res.status(400).json({
                error: "HACKATHON_ASSISTANT_BAD_REQUEST",
                message: "Query is required.",
            });
        }

        if (query.trim().length > MAX_QUERY_LENGTH) {
            return res.status(400).json({
                error: "HACKATHON_ASSISTANT_BAD_REQUEST",
                message: "Query is too long.",
            });
        }

        const db = await getDb();
        const template = await getHackathonTemplate(db, sanitizeText(req.body?.eventKey, 80));
        const result = await runHackathonAssistant({
            db,
            query,
            userId: req.user?.id || null,
            eventProfile: {
                title: template.event.title,
                subtitle: template.event.subtitle,
                date: template.event.timeText || template.event.startAt,
                location: template.event.location,
                format: template.event.format,
                duration: template.event.duration,
                description: template.event.description,
            },
            participantProfile: {
                major: sanitizeText(req.body?.major, 120),
                grade: sanitizeText(req.body?.grade, 60),
                aiTools: Array.isArray(req.body?.aiTools)
                    ? req.body.aiTools
                          .map((item) => sanitizeText(String(item), 40))
                          .filter(Boolean)
                          .slice(0, 8)
                    : [],
                experience: sanitizeText(req.body?.experience, 600),
            },
        });

        res.json(result);
    } catch (error) {
        res.status(error.statusCode || 500).json({
            error: error.code || "HACKATHON_ASSISTANT_FAILED",
            message: error.message || "The hackathon AI assistant failed to respond.",
        });
    }
};

module.exports = {
    getHackathonScheduleConfig,
    getHackathonTemplateConfig,
    updateHackathonScheduleConfig,
    updateHackathonTemplateConfig,
    registerHackathon,
    getRegistrations,
    deleteRegistration,
    handleHackathonAssistant,
};
