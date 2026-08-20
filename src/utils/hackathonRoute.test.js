import test from "node:test";
import assert from "node:assert/strict";

import {
    getDefaultHackathonView,
    getHackathonMediaView,
    getHackathonViewFromLocation,
    isHackathonWorkspaceView,
} from "./hackathonRoute.js";

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
