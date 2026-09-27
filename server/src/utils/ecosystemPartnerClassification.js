const SUPPORT_CATEGORY_VALUES = new Set([
    "college",
    "technology_enterprise",
    "industry_enterprise",
    "capital",
    "club",
]);

const defaultSupportCategoryFor = (category) => {
    if (category === "school") return "college";
    if (category === "organization") return "club";
    return "technology_enterprise";
};

const normalizeSupportCategory = (value, category = "enterprise") => {
    const supportCategory = String(value || "")
        .trim()
        .toLowerCase()
        .slice(0, 60);
    return SUPPORT_CATEGORY_VALUES.has(supportCategory)
        ? supportCategory
        : defaultSupportCategoryFor(category);
};

module.exports = {
    SUPPORT_CATEGORY_VALUES,
    normalizeSupportCategory,
};
