const { body, validationResult } = require("express-validator");

const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map((validation) => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        res.status(400).json({ errors: errors.array() });
    };
};

const registerValidation = [
    body("username")
        .trim()
        .isLength({ min: 3 })
        .withMessage("Username must be at least 3 characters long")
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage("Username can only contain letters, numbers, and underscores"),
    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
];

const loginValidation = [
    body("username").notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
];

const changePasswordValidation = [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword")
        .isLength({ min: 6 })
        .withMessage("New password must be at least 6 characters long"),
];

const APPEARANCE_SETTING_RANGES = {
    theme_card_opacity: { min: 20, max: 100 },
    theme_glass_blur: { min: 0, max: 40 },
    background_brightness: { min: 0.5, max: 1.4 },
    background_opacity: { min: 0.25, max: 1 },
    background_bloom: { min: 0, max: 1.5 },
    background_vignette: { min: 0, max: 1 },
};

const EDITABLE_SETTING_KEYS = [
    "site_title",
    "site_description",
    "site_name",
    "footer_acknowledgements",
    "allow_registrations",
    "maintenance_mode",
    "theme_color",
    "invite_code",
    "favicon_url",
    "hero_title",
    "hero_subtitle",
    "hero_bg_url",
    "about_title",
    "about_subtitle",
    "profile_image_url",
    "about_intro",
    "about_detail",
    "about_exp_years",
    "about_exhibitions",
    "about_projects",
    "contact_email",
    "contact_phone",
    "contact_address",
    "social_github",
    "social_twitter",
    "social_instagram",
    "social_linkedin",
    "about_team_title",
    "about_team_subtitle",
    "about_team_intro_1",
    "about_team_intro_2",
    "about_support_units",
    "about_stat_1_value",
    "about_stat_1_label",
    "about_stat_2_value",
    "about_stat_2_label",
    "about_stat_3_value",
    "about_stat_3_label",
    "about_community_title",
    "about_community_tagline",
    "about_community_desc",
    "about_community_bullets",
    "about_hackathon_title",
    "about_hackathon_tagline",
    "about_hackathon_desc",
    "about_hackathon_bullets",
    "about_flagship_title",
    "about_flagship_note",
    "about_support_title",
    "about_support_desc",
    "about_support_positioning",
    "about_support_method",
    "about_support_result",
    "about_final_title",
    "about_final_desc",
    "about_final_note",
    ...Object.keys(APPEARANCE_SETTING_RANGES),
    "theme_accent",
    "theme_bg_color",
];

const settingsValidation = [
    body("key").isIn(EDITABLE_SETTING_KEYS).withMessage("Invalid setting key"),
    body("value")
        .exists({ values: "null" })
        .withMessage("Value is required")
        .custom((value, { req }) => {
            if (req.body.key === "footer_acknowledgements") {
                if (typeof value !== "string" || value.length > 4000) {
                    throw new Error("Acknowledgements must be text under 4000 characters");
                }
                const names = value
                    .split(/\r?\n/)
                    .map((name) => name.trim())
                    .filter(Boolean);
                if (names.length > 50 || names.some((name) => name.length > 60)) {
                    throw new Error("Use at most 50 names, each under 60 characters");
                }
                return true;
            }
            if (["theme_accent", "theme_bg_color"].includes(req.body.key)) {
                if (typeof value !== "string" || !/^(?:#[0-9a-f]{3}|#[0-9a-f]{6})?$/i.test(value)) {
                    throw new Error("Theme color must be empty or a hex color");
                }
                return true;
            }
            const range = APPEARANCE_SETTING_RANGES[req.body.key];
            if (!range) return true;

            const numericValue = Number(value);
            if (
                !["number", "string"].includes(typeof value) ||
                String(value).trim() === "" ||
                !Number.isFinite(numericValue)
            ) {
                throw new Error("Appearance setting must be numeric");
            }
            if (numericValue < range.min || numericValue > range.max) {
                throw new Error(`Appearance setting must be between ${range.min} and ${range.max}`);
            }
            return true;
        }),
];

// FIX: BUG-22 — Add validation for resource create/update endpoints
const resourceValidation = [
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required")
        .isLength({ max: 500 })
        .withMessage("Title must be under 500 characters"),
];

module.exports = {
    validate,
    registerValidation,
    loginValidation,
    changePasswordValidation,
    APPEARANCE_SETTING_RANGES,
    EDITABLE_SETTING_KEYS,
    settingsValidation,
    resourceValidation,
};
