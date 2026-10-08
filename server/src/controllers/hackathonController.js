const {
    AIX_EVENT_KEY,
    normalizeRepositoryUrl,
    repositorySubmission,
} = require("../services/hackathonRepositoryService");
const { getDb } = require("../config/db");
const {
    getRegistrationProfile,
    validateRegistrationProfile,
} = require("../services/registrationProfileService");
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
        if (eventKey && template.event.key !== eventKey) {
            return res.status(404).json({ error: "赛事不存在" });
        }
        // Editor-local event timestamps are Asia/Shanghai, not the server's local timezone.
        const rawEndAt = template.event.endAt || "";
        const endAt = Date.parse(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawEndAt) ? `${rawEndAt}:00+08:00` : rawEndAt
        );
        if (Number.isFinite(endAt) && Date.now() >= endAt) {
            return res.status(403).json({
                error: "本届赛事已结束，报名已截止",
                code: "HACKATHON_REGISTRATION_CLOSED",
            });
        }
        const registrationClosesAt = template.event.program?.registrationClosesAt;
        if (registrationClosesAt && Date.now() >= Date.parse(registrationClosesAt)) {
            return res
                .status(403)
                .json({ error: "报名已截止", code: "HACKATHON_REGISTRATION_CLOSED" });
        }
        if (!req.user?.id) {
            return res
                .status(401)
                .json({ error: "请先登录后报名", code: "HACKATHON_LOGIN_REQUIRED" });
        }
        if (
            await db.get(
                "SELECT id FROM hackathon_registrations WHERE event_key = ? AND user_id = ?",
                [template.event.key, req.user.id]
            )
        ) {
            return res
                .status(409)
                .json({ error: "你已报名该赛事", code: "HACKATHON_ALREADY_REGISTERED" });
        }
        if (!template.navigation.registrationVisible || !template.event.registrationOpen) {
            return res.status(403).json({
                error: "当前赛事报名尚未开放",
                code: "HACKATHON_REGISTRATION_CLOSED",
            });
        }

        const registrationProfile = await getRegistrationProfile(db, req.user.id);
        if (validateRegistrationProfile(registrationProfile).errors.length) {
            return res.status(403).json({
                error: "请先完善账号的姓名、学号、专业和年级",
                code: "HACKATHON_PROFILE_REQUIRED",
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
        const validation = validateRegistrationAnswers(template, {
            ...answerPayload,
            ...registrationProfile,
        });
        if (validation.errors.length > 0) {
            return res.status(400).json({
                error: "请检查并完善报名信息",
                code: "HACKATHON_REGISTRATION_INVALID",
                details: validation.errors,
            });
        }

        const answers = { ...validation.answers, ...registrationProfile };
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
                (event_key, name, student_id, major, grade, ai_tools, experience, form_data_json, template_revision, created_at, user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                req.user.id,
            ]
        );

        res.status(201).json({
            id: result.lastID,
            eventKey: template.event.key,
            answers,
            message: "报名成功",
        });
    } catch (error) {
        if (error.code === "SQLITE_CONSTRAINT" || error.code?.startsWith("SQLITE_CONSTRAINT_")) {
            return res.status(409).json({
                error: "该账号或学号已报名，请勿重复提交",
                code: "HACKATHON_ALREADY_REGISTERED",
            });
        }
        next(error);
    }
};

const getMyRegistration = async (req, res, next) => {
    try {
        const db = await getDb();
        const eventKey = sanitizeText(req.query?.event, 80);
        if (!eventKey) return res.status(400).json({ error: "请指定赛事" });
        const row = await db.get(
            "SELECT * FROM hackathon_registrations WHERE event_key = ? AND user_id = ?",
            [eventKey, req.user.id]
        );
        res.setHeader("Cache-Control", "no-store");
        res.json({
            registration: row
                ? {
                      id: row.id,
                      eventKey: row.event_key,
                      answers: JSON.parse(row.form_data_json || "{}"),
                      createdAt: row.created_at,
                      repositories: repositorySubmission(row),
                  }
                : null,
        });
    } catch (error) {
        next(error);
    }
};

const saveMyRepositories = async (req, res, next) => {
    try {
        if (!req.user?.id)
            return res.status(401).json({ code: "HACKATHON_LOGIN_REQUIRED", error: "请先登录" });
        const eventKey = sanitizeText(req.body?.eventKey, 80);
        if (eventKey !== AIX_EVENT_KEY)
            return res
                .status(400)
                .json({ code: "HACKATHON_REPOSITORY_EVENT", error: "该赛事不支持仓库提交" });
        const db = await getDb();
        const row = await db.get(
            "SELECT * FROM hackathon_registrations WHERE event_key = ? AND user_id = ?",
            [eventKey, req.user.id]
        );
        if (!row)
            return res
                .status(403)
                .json({ code: "HACKATHON_REGISTRATION_REQUIRED", error: "请先完成本届赛事报名" });
        const template = await getHackathonTemplate(db, eventKey);
        if (template.event.key !== eventKey) return res.status(404).json({ error: "赛事不存在" });
        const rawEnd = template.event.endAt || "";
        const endAt = Date.parse(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(rawEnd) ? `${rawEnd}:00+08:00` : rawEnd
        );
        if (!Number.isFinite(endAt) || Date.now() >= endAt)
            return res
                .status(403)
                .json({
                    code: "HACKATHON_REPOSITORIES_CLOSED",
                    error: "本届赛事已结束，仓库提交已关闭",
                });
        let githubUrl, modelscopeUrl;
        try {
            githubUrl = normalizeRepositoryUrl(req.body?.githubUrl, "github");
        } catch {
            return res
                .status(400)
                .json({
                    code: "HACKATHON_REPOSITORY_INVALID",
                    field: "githubUrl",
                    error: "请填写有效的 GitHub 仓库 HTTPS 地址",
                });
        }
        try {
            modelscopeUrl = normalizeRepositoryUrl(req.body?.modelscopeUrl, "modelscope");
        } catch {
            return res
                .status(400)
                .json({
                    code: "HACKATHON_REPOSITORY_INVALID",
                    field: "modelscopeUrl",
                    error: "请填写有效的魔搭模型、数据集或创空间 HTTPS 地址",
                });
        }
        if (!githubUrl && !modelscopeUrl)
            return res
                .status(400)
                .json({ code: "HACKATHON_REPOSITORY_EMPTY", error: "请至少填写一个仓库地址" });
        const updatedAt = new Date().toISOString();
        const result = await db.run(
            "UPDATE hackathon_registrations SET github_repository_url = ?, modelscope_repository_url = ?, repositories_updated_at = ? WHERE id = ? AND user_id = ?",
            [githubUrl, modelscopeUrl, updatedAt, row.id, req.user.id]
        );
        res.setHeader("Cache-Control", "no-store");
        if (!result.changes)
            return res
                .status(403)
                .json({
                    code: "HACKATHON_REGISTRATION_REQUIRED",
                    error: "报名记录不存在，请刷新重试",
                });
        res.json({ repositories: { githubUrl, modelscopeUrl, updatedAt } });
    } catch (error) {
        next(error);
    }
};

const publicTemplate = (template) => {
    if (!template.event.program) return template;
    const program = template.event.program;
    return {
        ...template,
        event: {
            ...template.event,
            program: {
                ...program,
                challenges: program.challenges.filter((item) => {
                    const stage = program.stages.find((value) => value.id === item.stage);
                    return item.published && stage && Date.parse(stage.opensAt) <= Date.now();
                }),
                reports: program.reports.filter((item) => item.published),
            },
        },
    };
};

const getHackathonTemplateConfig = async (req, res, next) => {
    try {
        const db = await getDb();
        res.json(publicTemplate(await getHackathonTemplate(db, req.query?.event)));
    } catch (error) {
        next(error);
    }
};

const getHackathonScheduleConfig = async (req, res, next) => {
    try {
        const db = await getDb();
        const schedule = await getHackathonSchedule(db);
        res.json(
            req.path?.startsWith("/admin/")
                ? schedule
                : { ...schedule, events: schedule.events.map(publicTemplate) }
        );
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
    getMyRegistration,
    saveMyRepositories,
    getHackathonScheduleConfig,
    getHackathonTemplateConfig,
    updateHackathonScheduleConfig,
    updateHackathonTemplateConfig,
    registerHackathon,
    getRegistrations,
    deleteRegistration,
    handleHackathonAssistant,
};
