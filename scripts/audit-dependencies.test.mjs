import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { classifyAudit, patchedBraces, verifyPatchedBraces } from "./audit-dependencies.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const report = () => ({
    auditReportVersion: 2,
    vulnerabilities: {
        braces: {
            severity: "high",
            nodes: ["node_modules/braces"],
            via: [{ url: patchedBraces.advisory }],
        },
        micromatch: { severity: "high", via: ["braces"] },
        tailwindcss: { severity: "high", via: ["micromatch"] },
    },
});

test("installed pinned patch rejects excessive string/AST depth and cycles", () => {
    verifyPatchedBraces(root);
});

test("only the verified advisory and its transitive effects are mitigated", () => {
    assert.deepEqual(classifyAudit(report(), true), {
        blocked: [],
        patched: ["braces", "micromatch", "tailwindcss"],
    });
    assert.equal(classifyAudit(report(), false).blocked.length, 3);
});

test("additional advisories, installations and unknown dependencies still block", () => {
    for (const change of [
        (r) => r.vulnerabilities.braces.via.push({ url: "https://github.com/advisories/new" }),
        (r) => r.vulnerabilities.braces.nodes.push("node_modules/other/node_modules/braces"),
        (r) => r.vulnerabilities.micromatch.via.push("unknown-package"),
        (r) => r.vulnerabilities.micromatch.via.push("tailwindcss"),
    ]) {
        const r = report();
        change(r);
        assert.ok(classifyAudit(r, true).blocked.includes("tailwindcss"));
    }
    const r = report();
    r.vulnerabilities.other = { severity: "critical", via: [{ url: "other" }] };
    assert.deepEqual(classifyAudit(r, true).blocked, ["other"]);
});

test("invalid audit reports fail closed", () => {
    assert.throws(() => classifyAudit({ error: { code: "network" } }, true));
    assert.throws(() => classifyAudit({ ...report(), error: { code: "network" } }, true));
});

test("changed resolution, archive integrity or installed code rejects the mitigation", () => {
    const temporary = mkdtempSync(path.join(tmpdir(), "zju-audit-test-"));
    try {
        for (const file of ["package.json", "package-lock.json"]) {
            copyFileSync(path.join(root, file), path.join(temporary, file));
        }
        for (const file of Object.keys(patchedBraces.files)) {
            const target = path.join(temporary, "node_modules/braces", file);
            mkdirSync(path.dirname(target), { recursive: true });
            copyFileSync(path.join(root, "node_modules/braces", file), target);
        }
        const lockPath = path.join(temporary, "package-lock.json");
        const original = readFileSync(lockPath, "utf8");
        for (const field of ["resolved", "integrity"]) {
            const lock = JSON.parse(original);
            lock.packages["node_modules/braces"][field] = "changed";
            writeFileSync(lockPath, JSON.stringify(lock));
            assert.throws(() => verifyPatchedBraces(temporary));
        }
        writeFileSync(lockPath, original);
        writeFileSync(path.join(temporary, "node_modules/braces/lib/parse.js"), "unpatched");
        assert.throws(() => verifyPatchedBraces(temporary));
    } finally {
        rmSync(temporary, { recursive: true, force: true });
    }
});

test("mixed lower-severity branches do not inherit a patched high advisory", () => {
    const r = report();
    r.vulnerabilities.parser = {
        severity: "moderate",
        via: [{ url: "parser-advisory", severity: "moderate" }],
    };
    r.vulnerabilities.tailwindcss.via.push("parser");
    assert.deepEqual(classifyAudit(r, true).blocked, []);
    assert.ok(classifyAudit(r, false).blocked.includes("tailwindcss"));
    for (const severity of ["high", "critical", undefined, "unknown"]) {
        r.vulnerabilities.parser.via[0].severity = severity;
        assert.ok(classifyAudit(r, true).blocked.includes("tailwindcss"));
    }
});
