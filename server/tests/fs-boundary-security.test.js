const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { getFileContent, saveFileContent } = require("../src/controllers/fsController");
const root = path.resolve(__dirname, "../../src");
const response = () => ({
    statusCode: 200,
    status(n) {
        this.statusCode = n;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
});

test("file editor refuses absolute sibling paths and invalid input", () => {
    for (const value of [
        root + "-private/secret.txt",
        "/etc/passwd",
        "../package.json",
        ["index.css"],
    ]) {
        const res = response();
        getFileContent({ query: { path: value } }, res);
        assert.equal(res.statusCode, 400);
    }
});

test("file editor refuses symlink escape for both reads and writes", (t) => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "fs-boundary-"));
    const folder = fs.mkdtempSync(path.join(root, ".security-test-"));
    const target = path.join(outside, "secret.txt");
    fs.writeFileSync(target, "unchanged");
    fs.symlinkSync(outside, path.join(folder, "escape"));
    t.after(() => {
        fs.rmSync(folder, { recursive: true, force: true });
        fs.rmSync(outside, { recursive: true, force: true });
    });
    const relative = path.relative(root, path.join(folder, "escape/secret.txt"));
    const read = response();
    getFileContent({ query: { path: relative } }, read);
    assert.equal(read.statusCode, 400);
    const write = response();
    saveFileContent({ body: { path: relative, content: "changed" } }, write);
    assert.equal(write.statusCode, 400);
    assert.equal(fs.readFileSync(target, "utf8"), "unchanged");
});
