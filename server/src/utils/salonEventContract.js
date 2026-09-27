const SALON_EVENT_CATEGORY = "lecture";
const SALON_EVENT_TAG = "沙龙";

const splitTags = (value = "") =>
    String(value || "")
        .split(/[，,;；、\n\t]+/)
        .map((tag) => tag.trim())
        .filter(Boolean);

const addSalonTag = (value = "") =>
    Array.from(new Set([...splitTags(value), SALON_EVENT_TAG])).join(",");

const normalizeSalonEventPayload = (body = {}) => {
    const tags = addSalonTag(body.tags || body.tag);
    return {
        ...body,
        category: SALON_EVENT_CATEGORY,
        tags,
        tag: tags,
    };
};

const normalizeSalonEventQuery = (query = {}) => ({
    ...query,
    category: SALON_EVENT_CATEGORY,
    category_exact: SALON_EVENT_CATEGORY,
    tag: SALON_EVENT_TAG,
    status: "approved",
});

module.exports = {
    SALON_EVENT_CATEGORY,
    SALON_EVENT_TAG,
    addSalonTag,
    normalizeSalonEventPayload,
    normalizeSalonEventQuery,
};
