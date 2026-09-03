import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = process.cwd();
const sourcePath = path.join(root, "public", "newlogo.png");
const canvasSize = 1024;
const logoBox = { width: 835, height: 841 };
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const mediaDirectories = [
    path.join(root, "zju_app", "AppScope", "resources", "base", "media"),
    path.join(root, "zju_app", "entry", "src", "main", "resources", "base", "media"),
];
const appGalleryDirectory = path.join(root, "zju_app", "AppGalleryConnect");

const resizedLogo = await sharp(sourcePath)
    .resize({
        ...logoBox,
        fit: "contain",
        background: transparent,
        kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

const foreground = await sharp({
    create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: transparent,
    },
})
    .composite([{ input: resizedLogo, gravity: "centre" }])
    .png()
    .toBuffer();

const background = await sharp({
    create: {
        width: canvasSize,
        height: canvasSize,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
    },
})
    .png()
    .toBuffer();

const flatIcon = await sharp(background)
    .composite([{ input: foreground }])
    .removeAlpha()
    .png()
    .toBuffer();

await Promise.all(mediaDirectories.map((directory) => mkdir(directory, { recursive: true })));
await mkdir(appGalleryDirectory, { recursive: true });

await Promise.all([
    ...mediaDirectories.flatMap((directory) => [
        writeFile(path.join(directory, "foreground.png"), foreground),
        writeFile(path.join(directory, "background.png"), background),
        writeFile(path.join(directory, "icon.png"), flatIcon),
    ]),
    writeFile(path.join(appGalleryDirectory, "app_icon_1024.png"), flatIcon),
]);

console.log("HarmonyOS icons generated from public/newlogo.png");
