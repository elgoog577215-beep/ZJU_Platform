const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

// Loading the full router starts shared service timers; isolate their lifecycle from the test runner.
test("deferred plaza cannot be read or published through the production router", () => {
    const result = spawnSync(
        process.execPath,
        [
            "-e",
            `
        const assert = require('node:assert/strict');
        const fs = require('node:fs');
        const os = require('node:os');
        const path = require('node:path');
        const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'navigation-plaza-disabled-'));
        process.env.DATABASE_FILE = path.join(fixture, 'db.sqlite');
        process.env.SECRET_KEY = 'navigation-disabled-test-only';
        process.env.NODE_ENV = 'test';
        const app = require('express')();
        app.use('/api', require('./src/routes/api'));
        const server = app.listen(0, '127.0.0.1', async () => {
            let code = 0;
            try {
                const base = 'http://127.0.0.1:' + server.address().port + '/api/navigation/collections';
                for (const [method, suffix] of [['GET',''], ['GET','/known-id'], ['POST',''], ['PATCH','/known-id']]) {
                    const response = await fetch(base + suffix, { method });
                    assert.equal(response.status, 404);
                    assert.equal(response.headers.get('cache-control'), 'no-store');
                    assert.deepEqual(await response.json(), { error: 'not_found' });
                }
            } catch (error) { console.error(error); code = 1; }
            finally {
                await new Promise(resolve => server.close(resolve));
                await require('./src/config/db').pool.close();
                fs.rmSync(fixture, { recursive: true, force: true });
                process.exit(code);
            }
        });
    `,
        ],
        { cwd: path.join(__dirname, ".."), encoding: "utf8", timeout: 15000 }
    );
    assert.equal(result.status, 0, result.stderr || result.error?.message);
});
