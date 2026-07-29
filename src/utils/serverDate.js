const CHINA_TIME_ZONE = "Asia/Shanghai";
const NAIVE_SERVER_TIMESTAMP_PATTERN =
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

export const parseServerTimestamp = (value) => {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === "number") {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const raw = String(value ?? "").trim();
    if (!raw) return null;

    const normalized = NAIVE_SERVER_TIMESTAMP_PATTERN.test(raw) ? `${raw.replace(" ", "T")}Z` : raw;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const formatServerDateTime = (value, language = "zh-CN") => {
    const date = parseServerTimestamp(value);
    if (!date) return value ? String(value) : "";

    return new Intl.DateTimeFormat(language || "zh-CN", {
        timeZone: CHINA_TIME_ZONE,
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
};
