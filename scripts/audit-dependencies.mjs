import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The upstream depth-limit fix retains version 3.0.3, so npm audit still reports
// its version-based advisory. Accept only this exact patch, after code and
// behavior checks; every other high/critical advisory continues to block CI.
export const patchedBraces = {
    advisory: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
    resolved:
        "https://codeload.github.com/micromatch/braces/tar.gz/28d440b5dd449dbf1fe6f3506cf94ecca4d02660",
    integrity:
        "sha512-JDNujUUIiVjCw6vVXM92wZbpm+K+0KSTTqjcVa1zjjZLvfkOuDZmVHbKKjYRyE450ii6coDbuCIPqkX/bjmxWQ==",
    files: {
        "index.js": "332ea07c7b006361aad12aa994ca75dc1db8e8382b884909e2f38f10b85c88a4",
        "lib/constants.js": "f9fb688959232eee3e6ad7906a5b0e3234815db49ee857ef86983d65b917dc7c",
        "lib/parse.js": "b1bf766fba6a62035f78ecbda8a5fd94e921aa1c1ec0cdf3f467e9c836abed55",
        "lib/compile.js": "b651f7715e6db8942ce61d3394357b4d81c8ece88240aa31a458ea1165edd195",
        "lib/expand.js": "7ea3e14c2b2b256ef244fd3d83b8fcaa20aa2232b4e6d768c3bb6ab567f66cf5",
        "lib/stringify.js": "49dc2d8bafa74f34715a18a845bcb82ce66caaf3bab4cf117998e06b1f9a50a9",
        "lib/utils.js": "b5a7596aa67730412b3c029ef09e84e6b67b8e445cffd35d1d295549c89066c7",
    },
};

export function verifyPatchedBraces(root) {
    const manifest = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    const lock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"));
    const installation = lock.packages["node_modules/braces"];
    assert.equal(manifest.overrides.braces, patchedBraces.resolved);
    assert.equal(manifest.pnpm.overrides.braces, patchedBraces.resolved);
    assert.equal(installation.resolved, patchedBraces.resolved);
    assert.equal(installation.integrity, patchedBraces.integrity);
    for (const [file, expected] of Object.entries(patchedBraces.files)) {
        const data = readFileSync(path.join(root, "node_modules/braces", file));
        assert.equal(createHash("sha256").update(data).digest("hex"), expected, file);
    }
    const require = createRequire(path.join(root, "package.json"));
    const braces = require("braces");
    assert.deepEqual(braces.expand("src/*.{js,jsx}"), ["src/*.js", "src/*.jsx"]);
    for (const [open, close] of [
        ["{", "}"],
        ["(", ")"],
    ]) {
        assert.doesNotThrow(() => braces.parse(open.repeat(100) + "x" + close.repeat(100)));
        for (const options of [{}, { maxDepth: 1000000 }]) {
            assert.throws(
                () => braces.parse(open.repeat(101) + "x" + close.repeat(101), options),
                /exceeds max depth/
            );
        }
    }
    const deepAst = () => {
        const ast = { type: "root", nodes: [] };
        let parent = ast;
        for (let index = 0; index < 101; index++) {
            const child = { type: "paren", parent, nodes: [] };
            parent.nodes.push(child);
            parent = child;
        }
        return ast;
    };
    for (const operation of ["compile", "expand", "stringify"]) {
        assert.throws(() => braces[operation](deepAst()), /exceeds max depth/);
    }
    const child = { type: "paren", nodes: [] };
    child.parent = child;
    assert.throws(() => braces.expand({ type: "root", nodes: [child] }), /contains a cycle/);
}

export function classifyAudit(report, mitigationVerified) {
    assert.equal(report.auditReportVersion, 2, "Unsupported npm audit report");
    assert.ok(report.vulnerabilities && !report.error, "npm audit did not produce a valid report");
    const vulnerabilities = report.vulnerabilities;
    const mitigated = (name, visiting = new Set()) => {
        const item = vulnerabilities[name];
        if (!item || visiting.has(name) || !item.via?.length) return false;
        const next = new Set([...visiting, name]);
        return item.via.every((via) => {
            if (typeof via === "string") return mitigated(via, next);
            return (
                mitigationVerified &&
                name === "braces" &&
                via.url === patchedBraces.advisory &&
                item.nodes?.length === 1 &&
                item.nodes[0] === "node_modules/braces"
            );
        });
    };
    const high = Object.keys(vulnerabilities).filter((name) =>
        ["high", "critical"].includes(vulnerabilities[name].severity)
    );
    return {
        blocked: high.filter((name) => !mitigated(name)),
        patched: high.filter((name) => mitigated(name)),
    };
}

function main() {
    const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
    // Always verify the installed fix, even if the advisory database changes.
    verifyPatchedBraces(root);
    const windows = process.platform === "win32";
    const audit = spawnSync(
        windows ? process.env.ComSpec || "cmd.exe" : "npm",
        windows ? ["/d", "/s", "/c", "npm audit --json"] : ["audit", "--json"],
        {
            cwd: root,
            encoding: "utf8",
            timeout: 120000,
        }
    );
    if (audit.error || ![0, 1].includes(audit.status)) {
        throw audit.error || new Error(audit.stderr || "npm audit failed");
    }
    const report = JSON.parse(audit.stdout);
    const result = classifyAudit(report, true);
    if (result.patched.length) {
        console.log(
            `[audit] Verified upstream braces patch for ${patchedBraces.advisory}; version-based reports: ${result.patched.join(", ")}`
        );
    }
    if (result.blocked.length) {
        console.error(
            `[audit] Blocking high/critical vulnerabilities: ${result.blocked.join(", ")}`
        );
        console.error(JSON.stringify(report, null, 2));
        process.exitCode = 1;
    } else {
        console.log("[audit] No unmitigated high/critical vulnerabilities.");
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}
