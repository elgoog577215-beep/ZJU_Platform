// Student-facing event detail: the model supplies grounded fields, code owns layout,
// weekdays and image placement so every event reads the same way.
const KEY_LABELS = ["时间", "地点", "面向", "报名方式", "报名截止", "名额", "费用", "收获"];
const WEEKDAYS = "日一二三四五六";
const MAX_IMAGES = 3;

const escapeHtml = (value) =>
    String(value ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );

const cleanLine = (value, max) =>
    String(value ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max);

// Model-written weekdays were wrong in testing, so they are dropped and recomputed.
const withWeekday = (text, year) =>
    String(text || "")
        .replace(/\s*[（(]\s*(?:周|星期)[一二三四五六日天]\s*[)）]/g, "")
        .replace(/(\d{1,2})月(\d{1,2})日/g, (match, month, day) => {
            const date = new Date(Date.UTC(year, Number(month) - 1, Number(day)));
            if (date.getUTCMonth() !== Number(month) - 1) return match;
            return `${match}（周${WEEKDAYS[date.getUTCDay()]}）`;
        });

const normalizeStudentSummary = (parsed = {}) => {
    const highlight = cleanLine(parsed.highlight, 60);
    const seen = new Set();
    const keyInfo = (Array.isArray(parsed.key_info) ? parsed.key_info : [])
        .map((item) => ({ label: cleanLine(item?.label, 8), value: cleanLine(item?.value, 80) }))
        .filter((item) => {
            if (!KEY_LABELS.includes(item.label) || !item.value || seen.has(item.label))
                return false;
            seen.add(item.label);
            return true;
        })
        .sort((a, b) => KEY_LABELS.indexOf(a.label) - KEY_LABELS.indexOf(b.label));
    const sections = (Array.isArray(parsed.sections) ? parsed.sections : [])
        .map((section) => ({
            heading: cleanLine(section?.heading, 12),
            bullets: (Array.isArray(section?.bullets) ? section.bullets : [])
                .map((bullet) => cleanLine(bullet, 60))
                .filter(Boolean)
                .slice(0, 5),
        }))
        .filter((section) => section.heading && section.bullets.length)
        .slice(0, 3);
    if (!highlight && !keyInfo.length && !sections.length) return null;
    return { highlight, key_info: keyInfo, sections };
};

// Only locally stored or HTTPS images; the first one is the event's main image.
const safeImageUrl = (url) => {
    const value = String(url || "").trim();
    if (/^\/uploads\/[\w./-]+$/.test(value) && !value.includes("..")) return value;
    try {
        return new URL(value).protocol === "https:" ? value : "";
    } catch {
        return "";
    }
};

const renderStudentSummary = (summary, { images = [], year = new Date().getFullYear() } = {}) => {
    const urls = [...new Set(images.map(safeImageUrl).filter(Boolean))].slice(0, MAX_IMAGES);
    const image = (url) =>
        `<p><img src="${escapeHtml(url)}" alt="活动配图" style="max-height:640px;width:auto;max-width:100%;margin:0 auto"></p>`;
    const parts = [];
    if (urls[0]) parts.push(image(urls[0]));
    if (summary?.highlight) parts.push(`<p><strong>${escapeHtml(summary.highlight)}</strong></p>`);
    if (summary?.key_info?.length) {
        const items = summary.key_info.map(
            (item) =>
                `<li><strong>${escapeHtml(item.label)}</strong>：${escapeHtml(withWeekday(item.value, year))}</li>`
        );
        parts.push(`<ul>${items.join("")}</ul>`);
    }
    for (const section of summary?.sections || []) {
        const items = section.bullets.map((b) => `<li>${escapeHtml(withWeekday(b, year))}</li>`);
        parts.push(`<h3>${escapeHtml(section.heading)}</h3><ul>${items.join("")}</ul>`);
    }
    for (const url of urls.slice(1)) parts.push(image(url));
    return parts.join("\n");
};

const normalizeDeadline = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
    if (!match) return null;
    const [, y, mo, d, h, mi] = match;
    const [hour, minute] = h === "24" && mi === "00" ? ["23", "59"] : [h, mi];
    const date = new Date(Date.UTC(+y, +mo - 1, +d, +hour, +minute));
    if (date.getUTCMonth() !== +mo - 1 || +hour > 23 || +minute > 59) return null;
    return `${y}-${mo}-${d}T${hour}:${minute}`;
};

const yearOf = (...values) => {
    for (const value of values) {
        const text = String(value || "").trim();
        if (/^\d{10}$/.test(text)) return new Date(Number(text) * 1000).getUTCFullYear();
        const year = Number(text.slice(0, 4));
        if (year > 2000) return year;
    }
    return new Date().getFullYear();
};

module.exports = {
    KEY_LABELS,
    normalizeStudentSummary,
    renderStudentSummary,
    normalizeDeadline,
    withWeekday,
    yearOf,
};
