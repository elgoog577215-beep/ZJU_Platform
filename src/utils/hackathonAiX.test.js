import test from "node:test";
import assert from "node:assert/strict";
import {
    stageState,
    currentStage,
    registrationOpen,
    resolveAiXView,
    safeWebUrl,
} from "./hackathonAiX.js";
const stages = [
    { id: "initial", opensAt: "2026-10-18T11:00:00+08:00", closesAt: "2026-10-18T17:00:00+08:00" },
    {
        id: "semifinal",
        opensAt: "2026-10-19T00:00:00+08:00",
        closesAt: "2026-10-23T00:00:00+08:00",
    },
];
test("stages use absolute China time, including between-round and deadline boundaries", () => {
    assert.equal(stageState(stages[0], Date.parse("2026-10-18T10:59:59+08:00")), "upcoming");
    assert.equal(stageState(stages[0], Date.parse("2026-10-18T03:00:00Z")), "live");
    assert.equal(stageState(stages[0], Date.parse("2026-10-18T17:00:00+08:00")), "ended");
    assert.equal(currentStage(stages, Date.parse("2026-10-18T20:00:00+08:00")).id, "semifinal");
    assert.equal(currentStage(stages, Date.parse("2026-10-25T00:00:00Z")).id, "semifinal");
});
test("registration follows event visibility, availability and cutoff", () => {
    const template = {
        navigation: { registrationVisible: true },
        event: { registrationOpen: true, program: { registrationClosesAt: stages[0].opensAt } },
    };
    assert.equal(registrationOpen(template, Date.parse("2026-10-01")), true);
    assert.equal(registrationOpen(template, Date.parse(stages[0].opensAt)), false);
    template.event.registrationOpen = false;
    assert.equal(registrationOpen(template, Date.parse("2026-10-01")), false);
});
test("legacy view aliases remain useful and external links reject executable schemes", () => {
    assert.equal(resolveAiXView("register"), "intro");
    assert.equal(resolveAiXView("showcase"), "results");
    assert.equal(safeWebUrl("javascript:alert(1)"), null);
    assert.equal(safeWebUrl("https://example.com/submit"), "https://example.com/submit");
});
