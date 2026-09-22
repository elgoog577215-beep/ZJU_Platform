#!/usr/bin/env node
// Relay an immutable, CI-validated master release via this computer.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
const [runId, host, ...sshOptions] = process.argv.slice(2);
if (!/^\d+$/.test(runId || "") || !/^[\w.-]+@[\w.-]+$/.test(host || "")) {
    throw new Error(
        "Usage: node scripts/deploy-via-local.mjs RUN_ID user@host [SSH options, e.g. -o ControlPath=...]"
    );
}
const repo = "elgoog577215-beep/ZJU_Platform";
const output = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" }).trim();
const run = JSON.parse(output("gh", ["api", `repos/${repo}/actions/runs/${runId}`]));
const currentMaster = JSON.parse(output("gh", ["api", `repos/${repo}/commits/master`])).sha;
if (
    run.event !== "push" ||
    run.head_branch !== "master" ||
    run.status !== "completed" ||
    run.conclusion !== "success" ||
    run.head_sha !== currentMaster
) {
    throw new Error("Require a successful completed push run for the current master commit.");
}
const release = run.head_sha;
const dir = mkdtempSync(join(tmpdir(), "zju-release-"));
try {
    execFileSync(
        "gh",
        ["run", "download", runId, "--repo", repo, "--name", `release-${release}`, "--dir", dir],
        { stdio: "inherit" }
    );
    const archive = `zju-platform-${release}.tar.gz`;
    const expected = readFileSync(join(dir, `${archive}.sha256`), "utf8")
        .trim()
        .split(/\s+/)[0];
    const actual = createHash("sha256")
        .update(readFileSync(join(dir, archive)))
        .digest("hex");
    if (actual !== expected) throw new Error("Release checksum mismatch");
    // Check the deployed script against the same immutable GitHub commit, too.
    const source = JSON.parse(
        output("gh", ["api", `repos/${repo}/contents/deploy/deploy-release.sh?ref=${release}`])
    );
    if (!readFileSync(join(dir, "deploy-release.sh")).equals(Buffer.from(source.content, "base64")))
        throw new Error("Deployment script mismatch");
    execFileSync("ssh", [...sshOptions, host, "mkdir -p /tmp/zju-platform/release"], {
        stdio: "inherit",
    });
    execFileSync(
        "scp",
        [
            ...sshOptions,
            join(dir, archive),
            join(dir, `${archive}.sha256`),
            join(dir, "deploy-release.sh"),
            `${host}:/tmp/zju-platform/release/`,
        ],
        { stdio: "inherit" }
    );
    if (JSON.parse(output("gh", ["api", `repos/${repo}/commits/master`])).sha !== release)
        throw new Error("Master changed during upload; deploy the newer successful run instead.");
    execFileSync(
        "ssh",
        [...sshOptions, host, `bash /tmp/zju-platform/release/deploy-release.sh '${release}'`],
        { stdio: "inherit" }
    );
    const manifest = output("ssh", [
        ...sshOptions,
        host,
        "cat /var/www/ZJU_Platform/.deployed-release",
    ]);
    if (!manifest.split("\n").includes(`commit=${release}`))
        throw new Error("Deployed commit does not match");
    execFileSync(
        "curl",
        ["--fail", "--silent", "--show-error", "https://tuotuzju.com/api/health"],
        { stdio: "inherit" }
    );
    console.log(
        `\nDeployed GitHub commit ${release} via local relay. Previous release retained on server.`
    );
} finally {
    rmSync(dir, { recursive: true, force: true });
}
