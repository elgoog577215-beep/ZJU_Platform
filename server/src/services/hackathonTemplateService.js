const templateDefaults = require("../../../shared/hackathonTemplateDefaults.json");

const TEMPLATE_SETTING_KEY = "hackathon_template_config";
const SCHEDULE_SETTING_KEY = "hackathon_schedule_config";
const LEGACY_OUTCOME_SLUG = "ai-full-stack-hackathon-outcome";
const FIELD_TYPES = new Set([
    "text",
    "email",
    "tel",
    "number",
    "textarea",
    "select",
    "multi_select",
    "checkbox",
]);
const FIELD_ID_PATTERN = /^[a-z][a-zA-Z0-9_]{0,39}$/;
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const REQUIRED_SYSTEM_FIELDS = new Set(["name", "studentId"]);

const clone = (value) => JSON.parse(JSON.stringify(value));

const text = (value, maxLength, fallback = "") => {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return (trimmed || fallback).slice(0, maxLength);
};

const optionalText = (value, maxLength, fallback = "") => {
    if (typeof value !== "string") return fallback;
    return value.trim().slice(0, maxLength);
};

const booleanValue = (value, fallback = false) => {
    if (typeof value === "boolean") return value;
    if (value === "true") return true;
    if (value === "false") return false;
    return fallback;
};

const normalizeOutcomeSlug = (value, fallback = "hackathon-outcome") => {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
    return normalized || fallback;
};

const normalizeOptions = (options, fallbackOptions = []) => {
    const source = Array.isArray(options) ? options : fallbackOptions;
    const seen = new Set();
    return source
        .map((option, index) => {
            if (typeof option === "string") {
                const label = text(option, 80);
                return label ? { value: label, label } : null;
            }
            if (!option || typeof option !== "object") return null;
            const label = text(option.label, 80, text(option.value, 80));
            const value = text(option.value, 80, label || `option_${index + 1}`);
            if (!label || !value || seen.has(value)) return null;
            seen.add(value);
            return { value, label };
        })
        .filter(Boolean)
        .slice(0, 30);
};

const normalizeHighlights = (highlights) => {
    const source = Array.isArray(highlights) ? highlights : templateDefaults.event.highlights;
    return source.slice(0, 4).map((highlight, index) => ({
        id: text(highlight?.id, 40, `highlight_${index + 1}`),
        value: text(highlight?.value, 30, "—"),
        unit: text(highlight?.unit, 20),
        code: text(highlight?.code, 30, `FACT ${index + 1}`),
        label: text(highlight?.label, 80, `赛事亮点 ${index + 1}`),
        detail: text(highlight?.detail, 240),
    }));
};

const normalizeRules = (rules) => {
    const source = Array.isArray(rules) ? rules : templateDefaults.rules;
    const seen = new Set();
    return source
        .map((rule, index) => {
            const proposedId = text(rule?.id, 40, `rule_${index + 1}`);
            const id =
                FIELD_ID_PATTERN.test(proposedId) && !seen.has(proposedId)
                    ? proposedId
                    : `rule_${index + 1}`;
            seen.add(id);
            return {
                id,
                title: text(rule?.title, 120, `规则 ${index + 1}`),
                description: text(rule?.description, 800),
                enabled: booleanValue(rule?.enabled, true),
            };
        })
        .filter((rule) => rule.title)
        .slice(0, 12);
};

const normalizeFields = (fields) => {
    const defaultsById = new Map(
        templateDefaults.form.fields.map((field) => [field.id, clone(field)])
    );
    const source = Array.isArray(fields) ? fields : templateDefaults.form.fields;
    const seen = new Set();
    const normalized = source
        .map((field, index) => {
            if (!field || typeof field !== "object") return null;
            const fallback = defaultsById.get(field.id) || {};
            const proposedId = text(field.id, 40, `custom_${index + 1}`);
            const id =
                FIELD_ID_PATTERN.test(proposedId) && !seen.has(proposedId)
                    ? proposedId
                    : `custom_${index + 1}`;
            if (seen.has(id)) return null;
            seen.add(id);
            const fallbackType = FIELD_TYPES.has(fallback.type) ? fallback.type : "text";
            const type = FIELD_TYPES.has(field.type) ? field.type : fallbackType;
            const isSystem = Boolean(fallback.system);

            return {
                id,
                label: text(field.label, 100, fallback.label || `字段 ${index + 1}`),
                type,
                placeholder: text(field.placeholder, 180, fallback.placeholder || ""),
                required: booleanValue(field.required, fallback.required === true),
                enabled: booleanValue(field.enabled, fallback.enabled !== false),
                system: isSystem,
                width: field.width === "half" ? "half" : "full",
                options: normalizeOptions(field.options, fallback.options),
            };
        })
        .filter(Boolean)
        .slice(0, 24);

    for (const fieldId of REQUIRED_SYSTEM_FIELDS) {
        let field = normalized.find((item) => item.id === fieldId);
        if (!field) {
            field = clone(defaultsById.get(fieldId));
            normalized.unshift(field);
        }
        field.required = true;
        field.enabled = true;
        field.system = true;
        field.type = "text";
    }

    return normalized;
};

const normalizeHackathonTemplate = (input = {}) => {
    const source = input && typeof input === "object" ? input : {};
    const eventSource = source.event && typeof source.event === "object" ? source.event : {};
    const formSource = source.form && typeof source.form === "object" ? source.form : {};
    const navigationSource =
        source.navigation && typeof source.navigation === "object" ? source.navigation : {};
    const resultsSource =
        source.results && typeof source.results === "object" ? source.results : {};
    const defaultEvent = templateDefaults.event;
    const defaultForm = templateDefaults.form;
    const eventKey = text(eventSource.key, 80, defaultEvent.key);
    const fallbackCompetitionSlug =
        eventKey === defaultEvent.key ? LEGACY_OUTCOME_SLUG : normalizeOutcomeSlug(eventKey);

    return {
        version: Number(source.version || templateDefaults.version || 1),
        revision: Number(source.revision || templateDefaults.revision || 1),
        updatedAt: source.updatedAt || null,
        navigation: {
            registrationVisible: booleanValue(navigationSource.registrationVisible, true),
            resultsVisible: booleanValue(navigationSource.resultsVisible, true),
        },
        results: {
            competitionSlug: normalizeOutcomeSlug(
                resultsSource.competitionSlug,
                fallbackCompetitionSlug
            ),
        },
        event: {
            key: eventKey,
            brand: text(eventSource.brand, 100, defaultEvent.brand),
            title: text(eventSource.title, 160, defaultEvent.title),
            subtitle: text(eventSource.subtitle, 180, defaultEvent.subtitle),
            description: text(eventSource.description, 1200, defaultEvent.description),
            startAt: text(eventSource.startAt, 40, defaultEvent.startAt),
            endAt: Object.prototype.hasOwnProperty.call(eventSource, "endAt")
                ? optionalText(eventSource.endAt, 40)
                : defaultEvent.endAt,
            timeText: text(eventSource.timeText, 120),
            timezone: text(eventSource.timezone, 80, defaultEvent.timezone),
            location: text(eventSource.location, 180, defaultEvent.location),
            format: text(eventSource.format, 120, defaultEvent.format),
            duration: text(eventSource.duration, 80, defaultEvent.duration),
            prizeValue: text(eventSource.prizeValue, 40, defaultEvent.prizeValue),
            prizeUnit: text(eventSource.prizeUnit, 20, defaultEvent.prizeUnit),
            registrationOpen: booleanValue(eventSource.registrationOpen, true),
            highlights: normalizeHighlights(eventSource.highlights),
        },
        rules: normalizeRules(source.rules),
        form: {
            title: text(formSource.title, 120, defaultForm.title),
            description: text(formSource.description, 600, defaultForm.description),
            requiredHint: text(formSource.requiredHint, 160, defaultForm.requiredHint),
            submitLabel: text(formSource.submitLabel, 80, defaultForm.submitLabel),
            successMessage: text(formSource.successMessage, 200, defaultForm.successMessage),
            privacyNotice: text(formSource.privacyNotice, 500, defaultForm.privacyNotice),
            fields: normalizeFields(formSource.fields),
        },
    };
};

const scheduleTimestamp = (template) => {
    const value = Date.parse(template?.event?.startAt || "");
    return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
};

const normalizeHackathonSchedule = (input = {}, fallbackTemplate = templateDefaults) => {
    const source = input && typeof input === "object" ? input : {};
    const eventSources =
        Array.isArray(source.events) && source.events.length > 0
            ? source.events
            : source.event
              ? [source]
              : [fallbackTemplate];
    const usedKeys = new Set();
    const events = eventSources
        .slice(0, 24)
        .map((eventSource, index) => {
            const normalized = normalizeHackathonTemplate(eventSource);
            const baseKey = text(normalized.event.key, 68, `hackathon-${index + 1}`);
            let key = baseKey;
            let suffix = 2;
            while (usedKeys.has(key)) {
                key = text(`${baseKey}-${suffix}`, 80, `hackathon-${index + 1}`);
                suffix += 1;
            }
            usedKeys.add(key);
            return { ...normalized, event: { ...normalized.event, key } };
        })
        .sort((left, right) => scheduleTimestamp(left) - scheduleTimestamp(right));

    const requestedActiveKey = text(source.activeEventKey, 80);
    const activeEventKey = events.some((item) => item.event.key === requestedActiveKey)
        ? requestedActiveKey
        : events[0].event.key;

    return {
        version: Number(source.version || 1),
        revision: Number(source.revision || 1),
        updatedAt: source.updatedAt || null,
        activeEventKey,
        events,
    };
};

const validateTemplate = (template) => {
    const errors = [];
    if (!template.event.title) errors.push({ field: "event.title", message: "比赛标题不能为空" });
    if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(template.results.competitionSlug)) {
        errors.push({
            field: "results.competitionSlug",
            message: "成果档案标识只能包含小写字母、数字和连字符",
        });
    }
    if (!LOCAL_DATE_TIME_PATTERN.test(template.event.startAt)) {
        errors.push({ field: "event.startAt", message: "请输入有效的比赛开始时间" });
    }
    if (template.event.endAt && !LOCAL_DATE_TIME_PATTERN.test(template.event.endAt)) {
        errors.push({ field: "event.endAt", message: "请输入有效的比赛结束时间" });
    }
    if (
        LOCAL_DATE_TIME_PATTERN.test(template.event.startAt) &&
        LOCAL_DATE_TIME_PATTERN.test(template.event.endAt) &&
        template.event.endAt <= template.event.startAt
    ) {
        errors.push({ field: "event.endAt", message: "比赛结束时间必须晚于开始时间" });
    }
    if (template.rules.filter((rule) => rule.enabled).length === 0) {
        errors.push({ field: "rules", message: "至少需要启用一条比赛规则" });
    }
    for (const field of template.form.fields) {
        if (
            field.enabled &&
            (field.type === "select" || field.type === "multi_select") &&
            field.options.length === 0
        ) {
            errors.push({
                field: `form.fields.${field.id}`,
                message: `${field.label}至少需要一个选项`,
            });
        }
    }
    return errors;
};

const formatScheduleForLegacy = (event) => {
    if (event.timeText) return event.timeText;
    const start = String(event.startAt || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    const end = String(event.endAt || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!start) return "时间待定";
    const startLabel = `${Number(start[2])}月${Number(start[3])}日 ${start[4]}:${start[5]}`;
    if (!end) return startLabel;
    if (start[1] === end[1] && start[2] === end[2] && start[3] === end[3]) {
        return `${startLabel}–${end[4]}:${end[5]}`;
    }
    return `${startLabel}–${Number(end[2])}月${Number(end[3])}日 ${end[4]}:${end[5]}`;
};

const getLegacyOverrides = async (db) => {
    const rows = await db.all(
        `SELECT key, value FROM settings WHERE key IN (?, ?, ?, ?, ?, ?, ?)`,
        [
            "hackathon_title",
            "hackathon_subtitle",
            "hackathon_date",
            "hackathon_location",
            "hackathon_format",
            "hackathon_duration",
            "hackathon_desc",
        ]
    );
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
};

const getLegacyHackathonTemplate = async (db) => {
    const row = await db.get("SELECT value FROM settings WHERE key = ?", [TEMPLATE_SETTING_KEY]);
    if (row?.value) {
        try {
            return normalizeHackathonTemplate(JSON.parse(row.value));
        } catch {
            // Fall through to the legacy-compatible defaults when an old value is malformed.
        }
    }

    const legacy = await getLegacyOverrides(db);
    return normalizeHackathonTemplate({
        event: {
            title: legacy.hackathon_title,
            subtitle: legacy.hackathon_subtitle,
            timeText: legacy.hackathon_date,
            location: legacy.hackathon_location,
            format: legacy.hackathon_format,
            duration: legacy.hackathon_duration,
            description: legacy.hackathon_desc,
        },
    });
};

const getHackathonSchedule = async (db) => {
    const row = await db.get("SELECT value FROM settings WHERE key = ?", [SCHEDULE_SETTING_KEY]);
    if (row?.value) {
        try {
            return normalizeHackathonSchedule(JSON.parse(row.value));
        } catch {
            // A malformed collection must not make the public page unavailable.
        }
    }

    const legacyTemplate = await getLegacyHackathonTemplate(db);
    return normalizeHackathonSchedule(
        {
            version: 1,
            revision: legacyTemplate.revision,
            updatedAt: legacyTemplate.updatedAt,
            activeEventKey: legacyTemplate.event.key,
            events: [legacyTemplate],
        },
        legacyTemplate
    );
};

const selectHackathonTemplate = (schedule, eventKey) =>
    schedule.events.find((item) => item.event.key === eventKey) ||
    schedule.events.find((item) => item.event.key === schedule.activeEventKey) ||
    schedule.events[0];

const getHackathonTemplate = async (db, eventKey) => {
    const schedule = await getHackathonSchedule(db);
    return selectHackathonTemplate(schedule, text(eventKey, 80));
};

const throwValidationError = (errors) => {
    if (errors.length > 0) {
        const error = new Error("赛事模板配置有误");
        error.code = "HACKATHON_TEMPLATE_INVALID";
        error.statusCode = 400;
        error.details = errors;
        throw error;
    }
};

const comparableTemplate = (template) => {
    const normalized = normalizeHackathonTemplate(template);
    return JSON.stringify({ ...normalized, revision: 0, updatedAt: null });
};

const syncOutcomeCompetition = async (db, template) => {
    const slug = template.results.competitionSlug;
    const existing = await db.get("SELECT id FROM competitions WHERE slug = ?", [slug]);
    const values = [
        template.event.title,
        template.event.subtitle,
        template.event.description,
        String(template.event.startAt || "").slice(0, 10) || null,
    ];

    if (existing) {
        await db.run(
            `UPDATE competitions
             SET title = ?, subtitle = ?, description = ?, event_date = ?,
                 status = 'active', deleted_at = NULL, updated_at = datetime('now')
             WHERE id = ?`,
            [...values, existing.id]
        );
        return existing.id;
    }

    const result = await db.run(
        `INSERT INTO competitions
            (slug, title, subtitle, description, event_date, is_featured, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 'active', datetime('now'), datetime('now'))`,
        [slug, ...values]
    );
    return result.lastID;
};

const saveHackathonSchedule = async (db, input) => {
    const current = await getHackathonSchedule(db);
    const normalized = normalizeHackathonSchedule(input, current.events[0]);
    const errors = normalized.events.flatMap((template, index) =>
        validateTemplate(template).map((error) => ({
            ...error,
            field: `events.${index}.${error.field}`,
        }))
    );
    const outcomeOwners = new Map();
    normalized.events.forEach((template, index) => {
        const slug = template.results.competitionSlug;
        if (outcomeOwners.has(slug)) {
            errors.push({
                field: `events.${index}.results.competitionSlug`,
                message: `成果档案“${slug}”已绑定其他比赛日程，请为每场比赛使用独立档案`,
            });
        } else {
            outcomeOwners.set(slug, index);
        }
    });
    throwValidationError(errors);

    const now = new Date().toISOString();
    const previousByKey = new Map(current.events.map((item) => [item.event.key, item]));
    normalized.revision = Math.max(1, Number(current.revision || 0) + 1);
    normalized.updatedAt = now;
    normalized.events = normalized.events.map((template) => {
        const previous = previousByKey.get(template.event.key);
        const unchanged = previous && comparableTemplate(previous) === comparableTemplate(template);
        return {
            ...template,
            revision: unchanged
                ? Number(previous.revision || 1)
                : Math.max(1, Number(previous?.revision || 0) + 1),
            updatedAt: unchanged ? previous.updatedAt || now : now,
        };
    });

    const activeTemplate = selectHackathonTemplate(normalized, normalized.activeEventKey);
    const legacySettings = {
        hackathon_title: activeTemplate.event.title,
        hackathon_subtitle: activeTemplate.event.subtitle,
        hackathon_date: formatScheduleForLegacy(activeTemplate.event),
        hackathon_location: activeTemplate.event.location,
        hackathon_format: activeTemplate.event.format,
        hackathon_duration: activeTemplate.event.duration,
        hackathon_desc: activeTemplate.event.description,
    };

    await db.exec("BEGIN IMMEDIATE");
    try {
        await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [
            SCHEDULE_SETTING_KEY,
            JSON.stringify(normalized),
        ]);
        await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [
            TEMPLATE_SETTING_KEY,
            JSON.stringify(activeTemplate),
        ]);
        for (const [key, value] of Object.entries(legacySettings)) {
            await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [
                key,
                value,
            ]);
        }
        for (const template of normalized.events) {
            await syncOutcomeCompetition(db, template);
        }
        await db.exec("COMMIT");
    } catch (error) {
        await db.exec("ROLLBACK");
        throw error;
    }

    return normalized;
};

const saveHackathonTemplate = async (db, input) => {
    const current = await getHackathonSchedule(db);
    const normalized = normalizeHackathonTemplate(input);
    throwValidationError(validateTemplate(normalized));

    const index = current.events.findIndex((item) => item.event.key === normalized.event.key);
    const events = [...current.events];
    if (index >= 0) {
        events[index] = normalized;
    } else {
        const activeIndex = events.findIndex((item) => item.event.key === current.activeEventKey);
        events[activeIndex >= 0 ? activeIndex : 0] = normalized;
    }

    const savedSchedule = await saveHackathonSchedule(db, {
        ...current,
        activeEventKey: normalized.event.key,
        events,
    });
    return selectHackathonTemplate(savedSchedule, normalized.event.key);
};

const isBlankAnswer = (value) =>
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    value === false;

const validateRegistrationAnswers = (templateInput, rawAnswers) => {
    const template = normalizeHackathonTemplate(templateInput);
    const answersInput = rawAnswers && typeof rawAnswers === "object" ? rawAnswers : {};
    const answers = {};
    const errors = [];

    for (const field of template.form.fields.filter((item) => item.enabled)) {
        const rawValue = answersInput[field.id];
        let value;
        if (field.type === "multi_select") {
            value = (Array.isArray(rawValue) ? rawValue : [])
                .map((item) => text(String(item), 120))
                .filter(Boolean)
                .slice(0, 20);
        } else if (field.type === "checkbox") {
            value = rawValue === true || rawValue === "true" || rawValue === 1;
        } else {
            value = text(String(rawValue ?? ""), field.type === "textarea" ? 4000 : 500);
        }

        if (field.required && isBlankAnswer(value)) {
            errors.push({ field: field.id, message: `请填写${field.label}` });
        }

        const allowedValues = new Set(field.options.map((option) => option.value));
        if (field.type === "select" && value && !allowedValues.has(value)) {
            errors.push({ field: field.id, message: `${field.label}包含无效选项` });
        }
        if (field.type === "multi_select" && value.some((item) => !allowedValues.has(item))) {
            errors.push({ field: field.id, message: `${field.label}包含无效选项` });
        }
        if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push({ field: field.id, message: `${field.label}格式不正确` });
        }
        if (field.type === "number" && value && !Number.isFinite(Number(value))) {
            errors.push({ field: field.id, message: `${field.label}必须是有效数字` });
        }

        answers[field.id] = value;
    }

    if (JSON.stringify(answers).length > 30000) {
        errors.push({ field: "answers", message: "报名内容过长，请精简后重试" });
    }

    return { answers, errors, template };
};

module.exports = {
    TEMPLATE_SETTING_KEY,
    SCHEDULE_SETTING_KEY,
    LEGACY_OUTCOME_SLUG,
    DEFAULT_HACKATHON_TEMPLATE: clone(templateDefaults),
    normalizeHackathonTemplate,
    normalizeHackathonSchedule,
    validateTemplate,
    formatScheduleForLegacy,
    getHackathonSchedule,
    getHackathonTemplate,
    saveHackathonSchedule,
    saveHackathonTemplate,
    validateRegistrationAnswers,
};
