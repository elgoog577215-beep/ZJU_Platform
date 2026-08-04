import templateDefaults from "../../shared/hackathonTemplateDefaults.json";

const clone = (value) => JSON.parse(JSON.stringify(value));

const asText = (value, fallback = "") => {
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
};

const asOptionalText = (value, fallback = "") => {
    if (typeof value !== "string") return fallback;
    return value.trim();
};

const asBoolean = (value, fallback = false) =>
    typeof value === "boolean"
        ? value
        : value === "true"
          ? true
          : value === "false"
            ? false
            : fallback;

const normalizeOutcomeSlug = (value, fallback = "hackathon-outcome") => {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
    return normalized || fallback;
};

const normalizeOptions = (options = []) =>
    (Array.isArray(options) ? options : [])
        .map((option, index) => {
            if (typeof option === "string") {
                const label = option.trim();
                return label ? { value: label, label } : null;
            }
            if (!option || typeof option !== "object") return null;
            const label = asText(option.label, asText(option.value));
            const value = asText(option.value, label || `option_${index + 1}`);
            return label && value ? { value, label } : null;
        })
        .filter(Boolean);

const normalizeFields = (fields) => {
    const defaultsById = new Map(
        templateDefaults.form.fields.map((field) => [field.id, clone(field)])
    );
    const seen = new Set();
    const nextFields = (Array.isArray(fields) ? fields : templateDefaults.form.fields)
        .map((field, index) => {
            if (!field || typeof field !== "object") return null;
            const fallback = defaultsById.get(field.id) || {};
            const id = asText(field.id, `custom_${index + 1}`);
            if (seen.has(id)) return null;
            seen.add(id);
            return {
                ...fallback,
                ...field,
                id,
                label: asText(field.label, fallback.label || `字段 ${index + 1}`),
                type: asText(field.type, fallback.type || "text"),
                placeholder: asText(field.placeholder, fallback.placeholder || ""),
                required: asBoolean(field.required, fallback.required === true),
                enabled: asBoolean(field.enabled, fallback.enabled !== false),
                system: fallback.system === true || field.system === true,
                width: field.width === "half" ? "half" : "full",
                options: normalizeOptions(field.options ?? fallback.options),
            };
        })
        .filter(Boolean);

    for (const requiredId of ["name", "studentId"]) {
        const existing = nextFields.find((field) => field.id === requiredId);
        if (existing) {
            existing.enabled = true;
            existing.required = true;
            existing.system = true;
            existing.type = "text";
        } else {
            nextFields.unshift(clone(defaultsById.get(requiredId)));
        }
    }

    return nextFields;
};

export const DEFAULT_HACKATHON_TEMPLATE = clone(templateDefaults);

export const normalizeHackathonTemplate = (input = {}, legacySettings = {}) => {
    const source = input && typeof input === "object" ? input : {};
    const eventInput = source.event && typeof source.event === "object" ? source.event : {};
    const formInput = source.form && typeof source.form === "object" ? source.form : {};
    const navigationInput =
        source.navigation && typeof source.navigation === "object" ? source.navigation : {};
    const resultsInput = source.results && typeof source.results === "object" ? source.results : {};
    const defaultEvent = templateDefaults.event;
    const defaultForm = templateDefaults.form;
    const eventKey = asText(eventInput.key, defaultEvent.key);
    const fallbackCompetitionSlug =
        eventKey === defaultEvent.key
            ? templateDefaults.results.competitionSlug
            : normalizeOutcomeSlug(eventKey);

    const highlights = (
        Array.isArray(eventInput.highlights) ? eventInput.highlights : defaultEvent.highlights
    )
        .map((highlight, index) => ({
            id: asText(highlight?.id, `highlight_${index + 1}`),
            value: asText(highlight?.value, "—"),
            unit: asText(highlight?.unit),
            code: asText(highlight?.code, `FACT ${index + 1}`),
            label: asText(highlight?.label, `赛事亮点 ${index + 1}`),
            detail: asText(highlight?.detail),
        }))
        .slice(0, 4);

    const rules = (Array.isArray(source.rules) ? source.rules : templateDefaults.rules)
        .map((rule, index) => ({
            id: asText(rule?.id, `rule_${index + 1}`),
            title: asText(rule?.title, `规则 ${index + 1}`),
            description: asText(rule?.description),
            enabled: asBoolean(rule?.enabled, true),
        }))
        .filter((rule) => rule.title)
        .slice(0, 12);

    return {
        version: Number(source.version || templateDefaults.version || 1),
        revision: Number(source.revision || templateDefaults.revision || 1),
        updatedAt: source.updatedAt || null,
        navigation: {
            registrationVisible: asBoolean(navigationInput.registrationVisible, true),
            resultsVisible: asBoolean(navigationInput.resultsVisible, true),
        },
        results: {
            competitionSlug: normalizeOutcomeSlug(
                resultsInput.competitionSlug,
                fallbackCompetitionSlug
            ),
        },
        event: {
            ...clone(defaultEvent),
            ...eventInput,
            key: eventKey,
            brand: asText(eventInput.brand, defaultEvent.brand),
            title: asText(
                eventInput.title,
                asText(legacySettings.hackathon_title, defaultEvent.title)
            ),
            subtitle: asText(
                eventInput.subtitle,
                asText(legacySettings.hackathon_subtitle, defaultEvent.subtitle)
            ),
            description: asText(
                eventInput.description,
                asText(legacySettings.hackathon_desc, defaultEvent.description)
            ),
            startAt: asText(eventInput.startAt, defaultEvent.startAt),
            endAt: Object.prototype.hasOwnProperty.call(eventInput, "endAt")
                ? asOptionalText(eventInput.endAt)
                : defaultEvent.endAt,
            timeText: asText(eventInput.timeText, asText(legacySettings.hackathon_date)),
            timezone: asText(eventInput.timezone, defaultEvent.timezone),
            location: asText(
                eventInput.location,
                asText(legacySettings.hackathon_location, defaultEvent.location)
            ),
            format: asText(
                eventInput.format,
                asText(legacySettings.hackathon_format, defaultEvent.format)
            ),
            duration: asText(
                eventInput.duration,
                asText(legacySettings.hackathon_duration, defaultEvent.duration)
            ),
            prizeValue: asText(eventInput.prizeValue, defaultEvent.prizeValue),
            prizeUnit: asText(eventInput.prizeUnit, defaultEvent.prizeUnit),
            registrationOpen: asBoolean(eventInput.registrationOpen, true),
            highlights,
        },
        rules,
        form: {
            ...clone(defaultForm),
            ...formInput,
            title: asText(formInput.title, defaultForm.title),
            description: asText(formInput.description, defaultForm.description),
            requiredHint: asText(formInput.requiredHint, defaultForm.requiredHint),
            submitLabel: asText(formInput.submitLabel, defaultForm.submitLabel),
            successMessage: asText(formInput.successMessage, defaultForm.successMessage),
            privacyNotice: asText(formInput.privacyNotice, defaultForm.privacyNotice),
            fields: normalizeFields(formInput.fields),
        },
    };
};

const scheduleTimestamp = (template) => {
    const value = Date.parse(template?.event?.startAt || "");
    return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
};

export const DEFAULT_HACKATHON_SCHEDULE = {
    version: 1,
    revision: 1,
    updatedAt: null,
    activeEventKey: templateDefaults.event.key,
    events: [clone(templateDefaults)],
};

export const normalizeHackathonSchedule = (input = {}, legacySettings = {}) => {
    const source = input && typeof input === "object" ? input : {};
    const eventSources =
        Array.isArray(source.events) && source.events.length > 0
            ? source.events
            : source.event
              ? [source]
              : [normalizeHackathonTemplate({}, legacySettings)];
    const usedKeys = new Set();
    const events = eventSources
        .map((eventSource, index) => {
            const normalized = normalizeHackathonTemplate(eventSource, legacySettings);
            const baseKey = asText(normalized.event.key, `hackathon-${index + 1}`).slice(0, 68);
            let key = baseKey;
            let suffix = 2;
            while (usedKeys.has(key)) {
                key = `${baseKey}-${suffix}`;
                suffix += 1;
            }
            usedKeys.add(key);
            return { ...normalized, event: { ...normalized.event, key } };
        })
        .sort((left, right) => scheduleTimestamp(left) - scheduleTimestamp(right));

    const requestedActiveKey = asText(source.activeEventKey);
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

export const getHackathonScheduleEvent = (scheduleInput, eventKey) => {
    const schedule = normalizeHackathonSchedule(scheduleInput);
    return (
        schedule.events.find((item) => item.event.key === eventKey) ||
        schedule.events.find((item) => item.event.key === schedule.activeEventKey) ||
        schedule.events[0]
    );
};

export const getFirstAvailableHackathonView = (templateInput, preferredView = "showcase") => {
    const template = normalizeHackathonTemplate(templateInput);
    const available = {
        register: template.navigation.registrationVisible,
        showcase: template.navigation.resultsVisible,
    };
    if (available[preferredView]) return preferredView;
    if (available.register) return "register";
    if (available.showcase) return "showcase";
    return null;
};

const parseLocalDateTime = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return null;
    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: match[4],
        minute: match[5],
    };
};

export const formatHackathonSchedule = (event = {}) => {
    if (asText(event.timeText)) return asText(event.timeText);
    const start = parseLocalDateTime(event.startAt);
    const end = parseLocalDateTime(event.endAt);
    if (!start) return "时间待定";

    const startLabel = `${start.month}月${start.day}日 ${start.hour}:${start.minute}`;
    if (!end) return startLabel;
    if (start.year === end.year && start.month === end.month && start.day === end.day) {
        return `${startLabel}–${end.hour}:${end.minute}`;
    }
    return `${startLabel}–${end.month}月${end.day}日 ${end.hour}:${end.minute}`;
};

export const getHackathonYear = (event = {}) =>
    parseLocalDateTime(event.startAt)?.year || new Date().getFullYear();

export const splitHackathonTitle = (title) => {
    const normalized = asText(title, "浙客松");
    if (normalized.length <= 8) return [normalized];
    if (normalized.endsWith("黑客松") && normalized.length > 3) {
        return [normalized.slice(0, -3), "黑客松"];
    }

    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
        const midpoint = Math.ceil(words.length / 2);
        return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
    }

    const midpoint = Math.ceil(normalized.length / 2);
    return [normalized.slice(0, midpoint), normalized.slice(midpoint)];
};

export const getActiveHackathonFields = (template) =>
    normalizeHackathonTemplate(template).form.fields.filter((field) => field.enabled !== false);

export const buildHackathonInitialAnswers = (template) =>
    Object.fromEntries(
        getActiveHackathonFields(template).map((field) => [
            field.id,
            field.type === "multi_select" ? [] : field.type === "checkbox" ? false : "",
        ])
    );

export const formatHackathonAnswer = (value, field) => {
    if (Array.isArray(value)) {
        const optionMap = new Map(
            (field?.options || []).map((option) => [option.value, option.label])
        );
        return value.map((item) => optionMap.get(item) || item).join("、");
    }
    if (typeof value === "boolean") return value ? "是" : "否";
    const option = (field?.options || []).find((item) => item.value === value);
    return option?.label || String(value ?? "");
};
