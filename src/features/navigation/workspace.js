import { directory } from "./directory.js";
import { localizedNames } from "./names.js";
export const newId = () => crypto.randomUUID();
export function defaultGroups(legacyLinks) {
    const groups = directory.map((group) => ({
        id: group.id,
        title: group.zh,
        titleEn: group.en,
        links: group.sites.map((site) => ({
            id: site.id,
            name: localizedNames.zh[site.id] || site.name,
            nameEn: localizedNames.en[site.id] || site.name,
            url: site.url,
            description: site.zh,
            descriptionEn: site.en,
            keywords: site.keywords || "",
        })),
    }));
    if (legacyLinks?.length)
        groups.unshift({
            id: "legacy-shortcuts",
            title: "常用直达",
            titleEn: "My shortcuts",
            links: legacyLinks.map((link) => ({ ...link, id: newId(), description: "" })),
        });
    return groups;
}
export const titleOf = (group, en) => (en && group.titleEn) || group.title;
export const nameOf = (link, en) => (en && link.nameEn) || link.name;
export const descriptionOf = (link, en) => (en && link.descriptionEn) || link.description;
export function validateWorkspace(groups) {
    if (!Array.isArray(groups) || groups.length > 40) throw new Error("invalid_workspace");
    let count = 0;
    const ids = new Set();
    const string = (value, max, required = false) => {
        if (value == null && !required) return "";
        if (typeof value !== "string" || value.trim().length > max || (required && !value.trim()))
            throw new Error("invalid_workspace");
        return value.trim();
    };
    const id = (value, seen) => {
        if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value) || seen.has(value))
            throw new Error("invalid_workspace");
        seen.add(value);
        return value;
    };
    return groups.map((group) => {
        if (!group || !Array.isArray(group.links) || group.links.length > 100)
            throw new Error("invalid_workspace");
        count += group.links.length;
        if (count > 600) throw new Error("invalid_workspace");
        const links = new Set();
        return {
            id: id(group.id, ids),
            title: string(group.title, 80, true),
            titleEn: string(group.titleEn, 80),
            links: group.links.map((link) => {
                if (!link) throw new Error("invalid_workspace");
                const url = new URL(string(link.url, 2048, true));
                if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
                    throw new Error("invalid_workspace");
                return {
                    id: id(link.id, links),
                    name: string(link.name, 100, true),
                    nameEn: string(link.nameEn, 100),
                    url: url.href,
                    description: string(link.description, 200),
                    descriptionEn: string(link.descriptionEn, 200),
                    keywords: string(link.keywords, 500),
                };
            }),
        };
    });
}
export function copyGroups(groups) {
    return validateWorkspace(groups).map((group) => ({
        ...group,
        id: newId(),
        links: group.links.map((link) => ({ ...link, id: newId() })),
    }));
}
export function moveItem(items, index, delta) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
}
export function readBackup(text) {
    const parsed = JSON.parse(text);
    if (parsed.schemaVersion !== 1) throw new Error("invalid_workspace");
    return validateWorkspace(parsed.groups);
}
export const backupText = (groups) =>
    JSON.stringify({ schemaVersion: 1, groups: validateWorkspace(groups) }, null, 2);
const escape = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
    );
export function bookmarksText(groups, en = false) {
    const valid = validateWorkspace(groups);
    return [
        "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
        '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
        "<TITLE>Bookmarks</TITLE>",
        "<H1>Bookmarks</H1>",
        "<DL><p>",
        ...valid.flatMap((group) => [
            `<DT><H3>${escape(titleOf(group, en))}</H3>`,
            "<DL><p>",
            ...group.links.map(
                (link) => `<DT><A HREF="${escape(link.url)}">${escape(nameOf(link, en))}</A>`
            ),
            "</DL><p>",
        ]),
        "</DL><p>",
    ].join("\n");
}
export function download(content, name, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Tab-lifetime drafts survive SPA navigation without writing private URLs to browser storage.
const drafts = new Map();
export const readDraft = (accountId) => drafts.get(accountId) || null;
export function writeDraft(accountId, value) {
    if (!accountId) return;
    if (value) drafts.set(accountId, value);
    else drafts.delete(accountId);
}
export function keepAccountDraft(accountId) {
    for (const id of drafts.keys()) if (id !== accountId) drafts.delete(id);
}
