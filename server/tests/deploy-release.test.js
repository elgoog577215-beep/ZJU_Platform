const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createHash } = require("node:crypto");
const { execFileSync, spawnSync } = require("node:child_process");
const script = path.resolve(__dirname, "../../deploy/deploy-release.sh");
const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'";

for (const failHealth of [false, true]) {
    test(`release switch ${failHealth ? "rolls back after failed health" : "retains runtime and previous release"}`, () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zju-deploy-test-"));
        const write = (file, text) => {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, text);
        };
        try {
            const app = path.join(dir, "app");
            const incoming = path.join(dir, "incoming");
            const payload = path.join(dir, "package/payload");
            const bin = path.join(dir, "bin");
            fs.mkdirSync(incoming);
            fs.mkdirSync(bin);
            write(path.join(app, "server/index.js"), "// old server");
            write(path.join(app, "dist/index.html"), "old frontend");
            write(path.join(app, "shared/value"), "old shared");
            write(path.join(app, "server/.env"), "DATABASE_FILE=/existing/database.sqlite\n");
            write(path.join(app, "server/uploads/keep"), "upload");
            write(path.join(app, "server/database.sqlite"), "existing database");
            write(path.join(app, ".deployed-release"), "commit=old\n");
            const sha = "a".repeat(40);
            write(path.join(payload, "release-manifest.txt"), `commit=${sha}\n`);
            write(path.join(payload, "server/index.js"), "// new server");
            write(path.join(payload, "dist/index.html"), "new frontend");
            write(path.join(payload, "shared/hackathonTemplateDefaults.json"), "{}");
            for (const match of fs
                .readFileSync(script, "utf8")
                .matchAll(/test -s "\$payload\/([^"\n]+)"/g))
                write(path.join(payload, match[1]), "asset");
            const archive = path.join(incoming, `zju-platform-${sha}.tar.gz`);
            execFileSync("tar", ["-czf", archive, "-C", path.dirname(payload), "payload"]);
            write(
                `${archive}.sha256`,
                `${createHash("sha256").update(fs.readFileSync(archive)).digest("hex")}  ${path.basename(archive)}\n`
            );
            const shims = {
                npm: "exit 0",
                npx: "exit 0",
                caddy: "exit 0",
                systemctl: "exit 0",
                pm2: "exit 0",
                sleep: "exit 0",
                flock: "exit 0",
                curl: failHealth ? "exit 22" : 'echo \'{"status":"ok"}\'',
                node: `if [ "$1" = '-e' ]; then exit 0; fi\nexec ${quote(process.execPath)} "$@"`,
                sha256sum: 'exec shasum -a 256 "$@"',
            };
            for (const [name, text] of Object.entries(shims)) {
                write(path.join(bin, name), `#!/bin/sh\n${text}\n`);
                fs.chmodSync(path.join(bin, name), 0o755);
            }
            const result = spawnSync("bash", [script, sha], {
                encoding: "utf8",
                env: {
                    ...process.env,
                    PATH: `${bin}:${process.env.PATH}`,
                    ZJU_APP_ROOT: app,
                    ZJU_ARTIFACT_DIR: incoming,
                    ZJU_DEPLOY_LOCK: path.join(dir, "lock"),
                    ZJU_QWEN_BASE_URL: "http://fixture.invalid",
                },
            });
            assert.equal(result.status, failHealth ? 1 : 0, result.stdout + result.stderr);
            assert.equal(
                fs.readFileSync(path.join(app, "dist/index.html"), "utf8"),
                failHealth ? "old frontend" : "new frontend"
            );
            assert.equal(
                fs.readFileSync(path.join(app, "server/database.sqlite"), "utf8"),
                "existing database"
            );
            assert.equal(fs.readFileSync(path.join(app, "server/uploads/keep"), "utf8"), "upload");
            assert.match(
                fs.readFileSync(path.join(app, "server/.env"), "utf8"),
                /DATABASE_FILE=\/existing\/database.sqlite/
            );
            assert.equal(
                fs.readFileSync(path.join(app, ".deployed-release"), "utf8"),
                failHealth ? "commit=old\n" : `commit=${sha}\n`
            );
            if (!failHealth)
                assert.equal(
                    fs.readFileSync(
                        path.join(app, `.deployments/${sha}/previous/dist/index.html`),
                        "utf8"
                    ),
                    "old frontend"
                );
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
}
