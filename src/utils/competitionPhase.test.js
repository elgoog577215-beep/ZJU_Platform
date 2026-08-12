import assert from "node:assert/strict";
import test from "node:test";

import { getCompetitionPhase } from "./competitionPhase.js";

const event = { startAt: "2026-05-10T09:00:00+08:00", endAt: "2026-05-10T18:00:00+08:00" };

test("competition phase follows the configured start and end time", () => {
    assert.equal(getCompetitionPhase(event, Date.parse("2026-05-10T08:59:00+08:00")), "upcoming");
    assert.equal(getCompetitionPhase(event, Date.parse("2026-05-10T12:00:00+08:00")), "live");
    assert.equal(getCompetitionPhase(event, Date.parse("2026-05-10T18:01:00+08:00")), "ended");
});

test("competition phase stays compatible when no schedule is bound", () => {
    assert.equal(getCompetitionPhase(null), "archive");
});
