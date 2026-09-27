const TRACKING_QUERY_PARAMS = [
    "chksm",
    "scene",
    "subscene",
    "ascene",
    "fasttmpl_type",
    "fasttmpl_fullversion",
    "clicktime",
    "enterid",
    "utm_source",
    "utm_medium",
    "utm_campaign",
];

const cleanWeChatUrl = (value) => {
    const text = String(value || "").trim();
    if (!text) return "";

    try {
        const url = new URL(text.startsWith("//") ? `https:${text}` : text);
        TRACKING_QUERY_PARAMS.forEach((param) => url.searchParams.delete(param));
        url.hash = "";
        return url.toString();
    } catch {
        return text;
    }
};

module.exports = { cleanWeChatUrl };
