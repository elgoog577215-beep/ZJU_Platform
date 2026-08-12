import fs from "node:fs";
import path from "node:path";

const distPath = path.resolve(process.cwd(), "dist");
const requiredAssets = [
    "images/hero-landscape-day-4k.jpg",
    "images/hero-landscape-night.jpg",
    "images/hero-background.jpg",
    "images/hero-campus-day-4k.jpg",
    "images/partner-logos/getui.svg",
    "images/partner-logos/getui-dark.svg",
    "images/partner-logos/organizations/official/zhejiang-university.png",
    "images/partner-logos/organizations/official/xlab.svg",
    "images/partner-logos/organizations/official/xlab-white.svg",
    "images/partner-logos/organizations/official/zjuai.webp",
];

const missingAssets = requiredAssets.filter((relativePath) => {
    const assetPath = path.join(distPath, relativePath);
    try {
        const stats = fs.statSync(assetPath);
        return !stats.isFile() || stats.size === 0;
    } catch {
        return true;
    }
});

if (missingAssets.length > 0) {
    console.error(
        [
            "[frontend-assets] Required production assets are missing from dist/.",
            ...missingAssets.map((asset) => `- ${asset}`),
            "Run npm run build before checking the frontend artifact.",
        ].join("\n")
    );
    process.exit(1);
}

console.log(
    `[frontend-assets] Verified ${requiredAssets.length} required production assets in dist/.`
);
