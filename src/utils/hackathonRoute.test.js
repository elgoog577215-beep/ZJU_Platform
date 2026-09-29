import test from "node:test";
import assert from "node:assert/strict";

import {
    getDefaultHackathonView,
    getEventView,
    getEventUrl,
    getLegacyWorksUrl,
    getLegacyProjectsUrl,
    getHackathonMediaView,
    getHackathonViewFromLocation,
    isHackathonWorkspaceView,
} from "./hackathonRoute.js";

test("retired project links preserve event context without confusing project and work IDs", () => {
    const url = new URL(
        getLegacyProjectsUrl({
            search: "?competition=season-two&id=42&work=9&create=1&submit=1&photo=17",
            hash: "#old",
        }),
        "https://example.test"
    );
    assert.equal(url.pathname, "/hackathon");
    assert.equal(url.searchParams.get("competition"), "season-two");
    assert.equal(url.searchParams.get("view"), "results");
    assert.equal(url.searchParams.get("work"), "9");
    for (const key of ["id", "create", "submit", "photo", "event"])
        assert.equal(url.searchParams.has(key), false);
    const generic = new URL(getLegacyProjectsUrl({ search: "?id=42" }), "https://example.test");
    assert.equal(generic.searchParams.get("event"), "zhekesong-current");
    assert.equal(generic.searchParams.has("work"), false);
    assert.equal(
        new URL(
            getLegacyProjectsUrl({ search: "?event=zhekesong-ai-x-2026" }),
            "https://example.test"
        ).searchParams.get("event"),
        "zhekesong-ai-x-2026"
    );
});

test("hackathon route defaults to registration and preserves explicit outcome links", () => {
    assert.equal(getHackathonViewFromLocation({ pathname: "/hackathon", search: "" }), "register");
    assert.equal(
        getHackathonViewFromLocation({ pathname: "/hackathon", search: "?event=current" }),
        "register"
    );
    assert.equal(
        getHackathonViewFromLocation({ pathname: "/hackathon", search: "?view=showcase" }),
        "showcase"
    );
    assert.equal(
        getHackathonViewFromLocation({ pathname: "/hackathon/showcase", search: "" }),
        "showcase"
    );
    assert.equal(
        getHackathonViewFromLocation({ pathname: "/hackathon/works", search: "?view=projects" }),
        "showcase"
    );
});

test("hackathon route accepts all stable workspace stages and rejects unknown values", () => {
    for (const view of ["register", "projects", "media", "showcase"]) {
        assert.equal(
            getHackathonViewFromLocation({ pathname: "/hackathon", search: `?view=${view}` }),
            view
        );
        assert.equal(isHackathonWorkspaceView(view), true);
    }
    assert.equal(
        getHackathonViewFromLocation(
            { pathname: "/hackathon", search: "?view=missing" },
            "projects"
        ),
        "projects"
    );
    assert.equal(isHackathonWorkspaceView("missing"), false);
});

test("hackathon default stage follows the selected event lifecycle", () => {
    const base = { navigation: { resultsVisible: true } };
    assert.equal(
        getDefaultHackathonView(
            {
                ...base,
                event: {
                    startAt: "2026-09-01T09:00:00+08:00",
                    endAt: "2026-09-01T18:00:00+08:00",
                    registrationOpen: true,
                },
            },
            new Date("2026-08-20T10:00:00+08:00")
        ),
        "register"
    );
    assert.equal(
        getDefaultHackathonView(
            {
                ...base,
                event: {
                    startAt: "2026-08-20T09:00:00+08:00",
                    endAt: "2026-08-20T18:00:00+08:00",
                    registrationOpen: false,
                },
            },
            new Date("2026-08-20T10:00:00+08:00")
        ),
        "projects"
    );
    assert.equal(
        getDefaultHackathonView(
            {
                ...base,
                event: {
                    startAt: "2026-08-01T09:00:00+08:00",
                    endAt: "2026-08-01T18:00:00+08:00",
                    registrationOpen: false,
                },
            },
            new Date("2026-08-20T10:00:00+08:00")
        ),
        "showcase"
    );
});

test("media subview is namespaced away from the workspace view", () => {
    assert.equal(getHackathonMediaView("?view=media&mediaView=featured"), "featured");
    assert.equal(getHackathonMediaView("?view=showcase&mediaView=live"), "live");
    assert.equal(getHackathonMediaView("?view=featured"), "live");
});

// Backward-compatible links must keep photo/work context when the shell changes.
test("event navigation retains first registration and historical result aliases", () => {
    assert.equal(getEventView({ search: "?event=zhekesong-current&view=register" }), "register");
    assert.equal(getEventView({ search: "?view=showcase&work=42" }), "results");
    assert.equal(getEventView({ pathname: "/hackathon/showcase" }), "results");
    assert.equal(getEventView({ pathname: "/hackathon/works" }), "results");
    assert.equal(getEventView({ search: "?view=media&mediaView=featured&photo=17" }), "media");
    assert.equal(getEventView({ search: "?view=unknown" }), "intro");
    assert.equal(
        getEventUrl("zhekesong-current", "register"),
        "/hackathon?event=zhekesong-current&view=intro"
    );
});

test("legacy work shares never follow the currently active edition", () => {
    const first = new URL(getLegacyWorksUrl({ search: "?id=23" }), "https://example.test");
    assert.equal(first.searchParams.get("event"), "zhekesong-current");
    assert.equal(first.searchParams.get("work"), "23");
    assert.equal(first.searchParams.get("view"), "results");
    const explicit = new URL(
        getLegacyWorksUrl({ search: "?event=zhekesong-ai-x-2026&work=7" }),
        "https://example.test"
    );
    assert.equal(explicit.searchParams.get("event"), "zhekesong-ai-x-2026");
    const scoped = new URL(
        getLegacyWorksUrl({ search: "?competition=another-event&id=8" }),
        "https://example.test"
    );
    assert.equal(scoped.searchParams.get("competition"), "another-event");
    assert.equal(scoped.searchParams.has("event"), false);
});
