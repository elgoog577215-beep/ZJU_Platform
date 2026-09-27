const assert = require("node:assert/strict");
const test = require("node:test");
const { validationResult } = require("express-validator");

const { APPEARANCE_SETTING_RANGES, settingsValidation } = require("../src/middleware/validate");

const validateSettingsPayload = async (body) => {
    const request = { body };
    await Promise.all(settingsValidation.map((validation) => validation.run(request)));
    return validationResult(request).array();
};

test("appearance settings accept every supported value at its safe boundaries", async () => {
    for (const [key, range] of Object.entries(APPEARANCE_SETTING_RANGES)) {
        assert.deepEqual(await validateSettingsPayload({ key, value: range.min }), []);
        assert.deepEqual(await validateSettingsPayload({ key, value: String(range.max) }), []);
    }
});

test("appearance settings reject non-numeric and out-of-range values", async () => {
    const nonNumericErrors = await validateSettingsPayload({
        key: "background_opacity",
        value: "transparent",
    });
    assert.equal(nonNumericErrors[0]?.msg, "Appearance setting must be numeric");

    const outOfRangeErrors = await validateSettingsPayload({
        key: "background_brightness",
        value: 5,
    });
    assert.equal(outOfRangeErrors[0]?.msg, "Appearance setting must be between 0.5 and 1.4");
});

test("settings validation still rejects unknown keys", async () => {
    const errors = await validateSettingsPayload({ key: "background_css", value: "url(x)" });
    assert.equal(errors[0]?.msg, "Invalid setting key");
});
