const assert = require("node:assert/strict");
const test = require("node:test");
const { validationResult } = require("express-validator");

const { APPEARANCE_SETTING_RANGES, settingsValidation } = require("../src/middleware/validate");

const validateSettingsPayload = async (body) => {
    const request = { body };
    await Promise.all(settingsValidation.map((validation) => validation.run(request)));
    return validationResult(request).array();
};

test("footer names allow ordered text or an empty list and reject oversized or non-text values", async () => {
    const key = "footer_acknowledgements";
    for (const value of ["", "应奇\n周子涵", Array(50).fill("A".repeat(60)).join("\n")]) {
        assert.deepEqual(await validateSettingsPayload({ key, value }), []);
    }
    for (const value of [
        null,
        {},
        [],
        false,
        123,
        "A".repeat(61),
        Array(51).fill("A").join("\n"),
        " ".repeat(4001),
    ]) {
        assert.ok((await validateSettingsPayload({ key, value })).length > 0);
    }
});

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

test("theme colors reject CSS injection while allowing defaults and hex colors", async () => {
    for (const key of ["theme_accent", "theme_bg_color"]) {
        for (const value of ["", "#abc", "#A1B2C3"]) {
            assert.deepEqual(await validateSettingsPayload({ key, value }), []);
        }
        for (const value of ["red; background:url(x)", "red", {}, 123]) {
            assert.ok((await validateSettingsPayload({ key, value })).length > 0);
        }
    }
});

test("numeric theme settings preserve zero blur and reject coercion of empty values", async () => {
    assert.deepEqual(await validateSettingsPayload({ key: "theme_glass_blur", value: "0" }), []);
    for (const value of ["", false, [], {}]) {
        assert.ok((await validateSettingsPayload({ key: "theme_glass_blur", value })).length > 0);
    }
});
