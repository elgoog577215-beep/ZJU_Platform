import test from "node:test";
import assert from "node:assert/strict";
import { getEventKey, getEventView, getEventUrl, resolveEventLocation } from "./hackathonRoute.js";

const schedule = {
    activeEventKey: "zhekesong-ai-x-2026",
    events: [
        {
            event: { key: "zhekesong-current" },
            results: { competitionSlug: "ai-full-stack-hackathon-outcome" },
        },
        {
            event: { key: "zhekesong-ai-x-2026" },
            results: { competitionSlug: "zhekesong-ai-x-2026" },
        },
        {
            event: { key: "getui-beauty-2026" },
            results: { competitionSlug: "getui-beauty-2026" },
        },
        { event: { key: "future-event" }, results: { competitionSlug: "future-competition" } },
    ],
};
const locationOf = (url) => new URL(url, "https://example.test");

test("edition paths and their pages remain stable when the active event or order changes", () => {
    for (const [eventKey, path] of [
        ["zhekesong-current", "1"],
        ["zhekesong-ai-x-2026", "2"],
        ["getui-beauty-2026", "getui-beauty"],
        ["future-event", "future-event"],
    ]) {
        for (const view of ["intro", "challenges", "media", "results"]) {
            const url = getEventUrl(eventKey, view);
            assert.equal(url, `/hackathon/${path}${view === "intro" ? "" : `/${view}`}`);
            const location = locationOf(url);
            assert.equal(getEventKey(location), eventKey);
            assert.equal(getEventView(location), view);
            const resolved = resolveEventLocation(location, {
                ...schedule,
                events: [...schedule.events].reverse(),
            });
            assert.equal(resolved.template.event.key, eventKey);
            assert.equal(resolved.url, url);
        }
    }
    assert.equal(resolveEventLocation(locationOf("/hackathon"), schedule).url, "/hackathon/2");
});

test("current media and work links retain selection and anchors", () => {
    const paths = [
        "/hackathon/1/media?photo=17&mediaView=featured#photos",
        "/hackathon/1/results?work=9#showcase-works",
        "/hackathon/getui-beauty/media?photo=57",
    ];
    for (const path of paths)
        assert.equal(resolveEventLocation(locationOf(path), schedule).url, path);
    assert.equal(
        getEventUrl("ai-full-stack-hackathon-outcome", "results", { search: "work=42" }),
        "/hackathon/1/results?work=42"
    );
    assert.equal(
        resolveEventLocation(locationOf("/hackathon/1/media/"), schedule).url,
        "/hackathon/1/media"
    );
});

test("retired query routes, former page aliases and unknown editions are not supported", () => {
    for (const path of [
        "/projects",
        "/hackathon/showcase",
        "/hackathon/works?id=23",
        "/hackathon?event=zhekesong-current&view=register",
        "/hackathon?view=showcase&work=42",
        "/hackathon?competition=ai-full-stack-hackathon-outcome",
        "/hackathon/1/register",
        "/hackathon/1/showcase",
        "/hackathon/1/projects",
        "/hackathon/1/media?view=results",
        "/hackathon/999",
        "/hackathon/1/missing",
        "/hackathon/1/media/extra",
        "/hackathon/%ZZ",
    ]) {
        assert.equal(resolveEventLocation(locationOf(path), schedule), null, path);
    }
});
