import test from "node:test";
import assert from "node:assert/strict";
import {
    defaultGroups,
    validateWorkspace,
    bookmarksText,
    backupText,
    readBackup,
    copyGroups,
    moveItem,
    readDraft,
    writeDraft,
    keepAccountDraft,
} from "./workspace.js";
test("curated defaults and backup round trips preserve exact group and link order", () => {
    const groups = validateWorkspace(
        defaultGroups([{ name: "Old link", url: "https://example.org/old" }])
    );
    assert.equal(groups.length, 16);
    assert.equal(groups[0].title, "常用直达");
    const moved = moveItem(groups, 2, -1);
    assert.deepEqual(readBackup(backupText(moved)), moved);
    const copied = copyGroups(moved);
    assert.notEqual(copied[0].id, moved[0].id);
    assert.equal(copied[0].links[0].url, moved[0].links[0].url);
    assert.throws(() => readBackup('{"schemaVersion":2,"groups":[]}'));
});
test("bookmark export escapes content and attributes without losing hierarchy or URLs", () => {
    const groups = [
        {
            id: "g",
            title: 'A < B & "C"',
            links: [
                {
                    id: "a",
                    name: '<script>alert("x")</script>',
                    url: "https://example.org/?a=1&b=%22",
                },
            ],
        },
    ];
    const html = bookmarksText(groups);
    assert.ok(html.startsWith("<!DOCTYPE NETSCAPE-Bookmark-file-1>"));
    assert.ok(html.includes("A &lt; B &amp; &quot;C&quot;"));
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("?a=1&amp;b=%22"));
    assert.ok(html.indexOf("<H3>") < html.indexOf("<A HREF="));
    assert.throws(() =>
        validateWorkspace([
            { ...groups[0], links: [{ ...groups[0].links[0], url: "javascript:alert(1)" }] },
        ])
    );
    assert.throws(() => validateWorkspace([...groups, ...groups]));
    assert.throws(() =>
        validateWorkspace(Array.from({ length: 41 }, (_, i) => ({ ...groups[0], id: `g${i}` })))
    );
});

test("SPA drafts preserve the base revision and clear on account changes", () => {
    const draft = { groups: defaultGroups(), version: 7 };
    writeDraft(1, draft);
    keepAccountDraft(1);
    assert.equal(readDraft(1), draft);
    assert.equal(readDraft(2), null);
    keepAccountDraft(2);
    assert.equal(readDraft(1), null);
    writeDraft(2, draft);
    writeDraft(2, null);
    assert.equal(readDraft(2), null);
    writeDraft(2, draft);
    keepAccountDraft(undefined);
    assert.equal(readDraft(2), null);
});
