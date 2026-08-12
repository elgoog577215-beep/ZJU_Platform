import test from "node:test";
import assert from "node:assert/strict";

import { getHackathonViewFromLocation } from "./hackathonRoute.js";

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
});
