import { readFileSync } from "node:fs";
import path from "node:path";

// Keep previously published image URLs working; edit only the files in images/brand/.
const aliases = {
    "newlogo.png": "images/brand/logo-mark-transparent.png",
    "logo.png": "images/brand/logo-vertical-light.png",
    "tuozhe-ai-ecosystem-logo.svg": "images/brand/logo-horizontal-transparent.svg",
};

export function brandAssetAliases(root) {
    const installAliases = (server) => {
        server.middlewares.use((request, _response, next) => {
            const [pathname, ...query] = (request.url || "").split("?");
            const target = Object.hasOwn(aliases, pathname.slice(1))
                ? aliases[pathname.slice(1)]
                : null;
            if (target && (request.method === "GET" || request.method === "HEAD")) {
                request.url = `/${target}${query.length ? `?${query.join("?")}` : ""}`;
            }
            next();
        });
    };

    return {
        name: "brand-asset-aliases",
        configureServer: installAliases,
        configurePreviewServer: installAliases,
        generateBundle() {
            for (const [fileName, source] of Object.entries(aliases)) {
                this.emitFile({
                    type: "asset",
                    fileName,
                    source: readFileSync(path.join(root, "public", source)),
                });
            }
        },
    };
}
