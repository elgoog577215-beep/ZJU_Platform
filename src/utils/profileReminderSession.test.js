import test from "node:test";
import assert from "node:assert/strict";
import {
    hasSeenProfileReminder,
    markProfileReminderSeen,
    resetProfileReminders,
} from "./profileReminderSession.js";

test("reminders are isolated by account and reset when the login session ends", () => {
    const values = {};
    globalThis.sessionStorage = {
        getItem: (key) => values[key] ?? null,
        setItem: (key, value) => {
            values[key] = value;
            globalThis.sessionStorage[key] = value;
        },
        removeItem: (key) => {
            delete values[key];
            delete globalThis.sessionStorage[key];
        },
    };
    sessionStorage.setItem("unrelated", "keep");
    resetProfileReminders();
    assert.equal(hasSeenProfileReminder(1), false);
    markProfileReminderSeen(1);
    assert.equal(hasSeenProfileReminder(1), true);
    assert.equal(hasSeenProfileReminder(2), false);
    resetProfileReminders();
    assert.equal(hasSeenProfileReminder(1), false);
    assert.equal(sessionStorage.getItem("unrelated"), "keep");
    delete globalThis.sessionStorage;
});

test("unavailable session storage still prevents repeated reminders in the current page", () => {
    resetProfileReminders();
    markProfileReminderSeen(3);
    assert.equal(hasSeenProfileReminder(3), true);
    resetProfileReminders();
    assert.equal(hasSeenProfileReminder(3), false);
});
