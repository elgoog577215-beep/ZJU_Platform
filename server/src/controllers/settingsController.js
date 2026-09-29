const { getDb } = require("../config/db");
const footerAcknowledgements = require("../../../shared/footerAcknowledgements.json");

// FIX: BUG-03 — Filter out sensitive fields from public settings response
// Full event configurations include unpublished problems and summaries.
// The public event endpoints return their own filtered projections.
const SENSITIVE_SETTINGS_KEYS = [
    "invite_code",
    "admin_password",
    "secret_key",
    "hackathon_schedule_config",
    "hackathon_template_config",
];

const getSettings = async (req, res, next) => {
    try {
        const db = await getDb();
        const settings = await db.all("SELECT * FROM settings");
        const settingsObj = settings.reduce(
            (acc, curr) => {
                if (!SENSITIVE_SETTINGS_KEYS.includes(curr.key)) {
                    acc[curr.key] = curr.value;
                }
                return acc;
            },
            { footer_acknowledgements: footerAcknowledgements.join("\n") }
        );
        res.json(settingsObj);
    } catch (error) {
        next(error);
    }
};

const updateSetting = async (req, res, next) => {
    try {
        const db = await getDb();
        const { key, value } = req.body;
        await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [
            key,
            String(value),
        ]);
        res.json({ success: true, key, value });
    } catch (error) {
        next(error);
    }
};

module.exports = { getSettings, updateSetting };
