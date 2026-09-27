const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const { uploadSecurityHeaders } = require("../src/middleware/uploadServing");

test("uploaded active content is downloaded without same-origin script execution", async (t) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-security-"));
    await fs.writeFile(
        path.join(dir, "import.HTML"),
        '<img src=x onerror="alert(document.domain)">'
    );
    await fs.writeFile(path.join(dir, "legacy.svg"), '<svg onload="alert(1)"></svg>');
    await fs.writeFile(path.join(dir, "photo.png"), Buffer.from([137, 80, 78, 71]));
    const app = express();
    app.use("/uploads", express.static(dir, { setHeaders: uploadSecurityHeaders }));
    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(async () => {
        server.closeAllConnections();
        await new Promise((resolve) => server.close(resolve));
        await fs.rm(dir, { recursive: true, force: true });
    });
    const base = `http://127.0.0.1:${server.address().port}/uploads`;
    for (const filename of ["import.HTML", "legacy.svg"]) {
        for (const method of ["GET", "HEAD"]) {
            const response = await fetch(`${base}/${filename}`, { method });
            assert.equal(response.status, 200);
            assert.match(response.headers.get("content-type"), /^text\/plain/);
            assert.equal(response.headers.get("content-disposition"), "attachment");
            assert.equal(response.headers.get("x-content-type-options"), "nosniff");
            assert.match(response.headers.get("content-security-policy"), /^sandbox;/);
            assert.equal(response.headers.get("cache-control"), "no-store");
            await response.arrayBuffer();
        }
    }
    const image = await fetch(`${base}/photo.png`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/png");
    assert.equal(image.headers.get("content-disposition"), null);
    await image.arrayBuffer();
});
