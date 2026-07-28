const assert = require("node:assert/strict");
const test = require("node:test");

const { buildShareAppMessage } = require("../utils/share");

test("project shares open the existing web project detail directly", () => {
    const result = buildShareAppMessage(
        {
            title: "灵知",
            path: "/projects?id=5",
            imageUrl: "/api/projects/5/share-card.png",
        },
        { shellPath: "/pages/webview/index" }
    );

    assert.deepEqual(result, {
        title: "灵知",
        path: "/pages/webview/index?path=%2Fprojects%3Fid%3D5",
        imageUrl: "https://tuotuzju.com/api/projects/5/share-card.png",
    });
});
