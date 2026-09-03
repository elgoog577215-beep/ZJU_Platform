import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = process.cwd();
const mediaDirectories = [
    path.join(root, "zju_app", "AppScope", "resources", "base", "media"),
    path.join(root, "zju_app", "entry", "src", "main", "resources", "base", "media"),
];
const storeIconPath = path.join(root, "zju_app", "AppGalleryConnect", "app_icon_1024.png");

function fail(message) {
    throw new Error(message);
}

async function inspectImage(filePath, expected) {
    const file = await readFile(filePath);
    const image = sharp(file);
    const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);

    if (metadata.format !== "png") {
        fail(`${filePath}: expected PNG, received ${metadata.format}`);
    }
    if (metadata.width !== expected.width || metadata.height !== expected.height) {
        fail(
            `${filePath}: expected ${expected.width}x${expected.height}, received ${metadata.width}x${metadata.height}`
        );
    }
    if (expected.alpha === "none" && (metadata.hasAlpha || !stats.isOpaque)) {
        fail(`${filePath}: must not contain transparent pixels`);
    }
    if (expected.alpha === "required") {
        const alpha = stats.channels[3];
        if (!metadata.hasAlpha || !alpha || alpha.min !== 0 || alpha.max !== 255) {
            fail(`${filePath}: foreground must contain transparent and opaque pixels`);
        }
    }
    if (expected.pureColor) {
        const rgb = stats.channels.slice(0, 3);
        if (!rgb.every((channel) => channel.min === channel.max)) {
            fail(`${filePath}: background must be a pure color`);
        }
    }
    if (expected.maxBytes && file.length > expected.maxBytes) {
        fail(`${filePath}: exceeds ${expected.maxBytes} bytes`);
    }

    return {
        path: path.relative(root, filePath),
        width: metadata.width,
        height: metadata.height,
        hasAlpha: metadata.hasAlpha,
        bytes: file.length,
        sha256: createHash("sha256").update(file).digest("hex"),
    };
}

const results = [];
for (const directory of mediaDirectories) {
    results.push(
        await inspectImage(path.join(directory, "foreground.png"), {
            width: 1024,
            height: 1024,
            alpha: "required",
        }),
        await inspectImage(path.join(directory, "background.png"), {
            width: 1024,
            height: 1024,
            alpha: "none",
            pureColor: true,
        }),
        await inspectImage(path.join(directory, "icon.png"), {
            width: 1024,
            height: 1024,
            alpha: "none",
        })
    );
}
results.push(
    await inspectImage(storeIconPath, {
        width: 1024,
        height: 1024,
        alpha: "none",
        maxBytes: 3 * 1024 * 1024,
    })
);

for (const directory of mediaDirectories) {
    const descriptor = JSON.parse(
        await readFile(path.join(directory, "layered_image.json"), "utf8")
    );
    if (
        descriptor["layered-image"]?.background !== "$media:background" ||
        descriptor["layered-image"]?.foreground !== "$media:foreground"
    ) {
        fail(`${directory}: layered_image.json must reference foreground and background`);
    }
}

const [appConfig, moduleConfig] = await Promise.all([
    readFile(path.join(root, "zju_app", "AppScope", "app.json5"), "utf8"),
    readFile(path.join(root, "zju_app", "entry", "src", "main", "module.json5"), "utf8"),
]);
if (!appConfig.includes('icon: "$media:layered_image"')) {
    fail("AppScope/app.json5 must reference the layered icon");
}
if (!moduleConfig.includes('icon: "$media:layered_image"')) {
    fail("entry/src/main/module.json5 must reference the layered icon");
}

const hashes = new Map(results.map((result) => [result.path, result.sha256]));
const appScopePrefix = "zju_app/AppScope/resources/base/media";
const entryPrefix = "zju_app/entry/src/main/resources/base/media";
for (const filename of ["foreground.png", "background.png", "icon.png"]) {
    if (hashes.get(`${appScopePrefix}/${filename}`) !== hashes.get(`${entryPrefix}/${filename}`)) {
        fail(`${filename}: AppScope and entry resources must be identical`);
    }
}
if (
    hashes.get(`${appScopePrefix}/icon.png`) !==
    hashes.get("zju_app/AppGalleryConnect/app_icon_1024.png")
) {
    fail("AppGallery icon must match the package's flat icon composition");
}

console.log(JSON.stringify({ ok: true, images: results }, null, 2));
