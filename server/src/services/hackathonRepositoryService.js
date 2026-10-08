const AIX_EVENT_KEY = "zhekesong-ai-x-2026";
function normalizeRepositoryUrl(value, provider) {
    if (value === "" || value === undefined || value === null) return "";
    if (typeof value !== "string" || value.length > 1000) throw new Error(provider);
    const raw = value.trim();
    if (!raw) return "";
    const url = new URL(raw);
    if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.port ||
        url.search ||
        url.hash
    )
        throw new Error(provider);
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    const segment = /^[A-Za-z0-9_.-]+$/;
    if (parts.some((part) => !segment.test(part) || [".", ".."].includes(part)))
        throw new Error(provider);
    if (provider === "github") {
        if (!["github.com", "www.github.com"].includes(host) || parts.length !== 2)
            throw new Error(provider);
        url.hostname = "github.com";
    } else {
        if (
            !["modelscope.cn", "www.modelscope.cn", "modelscope.ai", "www.modelscope.ai"].includes(
                host
            )
        )
            throw new Error(provider);
        if (
            !["models", "datasets", "studios"].includes(parts[0]) ||
            ![3, 4].includes(parts.length) ||
            (parts.length === 4 && parts[3] !== "summary")
        )
            throw new Error(provider);
        if (parts.length === 4) parts.pop();
    }
    parts[parts.length - 1] = parts.at(-1).replace(/\.git$/, "");
    if (!parts.at(-1)) throw new Error(provider);
    url.pathname = "/" + parts.join("/");
    return url.href;
}
const repositorySubmission = (row) => ({
    githubUrl: row?.github_repository_url || "",
    modelscopeUrl: row?.modelscope_repository_url || "",
    updatedAt: row?.repositories_updated_at || null,
});
module.exports = { AIX_EVENT_KEY, normalizeRepositoryUrl, repositorySubmission };
