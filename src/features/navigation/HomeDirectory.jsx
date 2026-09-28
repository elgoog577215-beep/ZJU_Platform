/*
THESIS: A quiet, useful starting point for learning, work and creation; links lead the page.
OWN-WORLD: Shared site shell; approved soft daytime surfaces and slate/indigo night theme.
STORY: Find a tool, course or paper, then continue into community and real projects.
FIRST VIEWPORT: Existing global tabs, search and expandable category groups, a three-column directory.
FORM: User-approved campus directory reference: dense link grids, generous group spacing.
*/
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    ArrowUpRight,
    ArrowRight,
    Search,
    X,
    Bot,
    Boxes,
    FlaskConical,
    Code2,
    GraduationCap,
    BookOpen,
    Trophy,
    Radio,
    ChevronDown,
    ChevronUp,
    Library,
    Briefcase,
    Palette,
    Image,
    Type,
    PenTool,
    FileText,
    Folder,
    Settings2,
    Download,
} from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import SEO from "../../components/SEO";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import WorkspaceEditor from "./WorkspaceEditor";
import {
    readDraft,
    writeDraft,
    keepAccountDraft,
    defaultGroups,
    validateWorkspace,
    nameOf,
    readBackup,
    backupText,
    bookmarksText,
    download,
} from "./workspace";
import "./locales";
import "./navigation.css";

const icons = {
    assistants: Bot,
    models: Boxes,
    "ai-dev": FlaskConical,
    development: Code2,
    learning: GraduationCap,
    research: BookOpen,
    practice: Trophy,
    news: Radio,
    campus: Library,
    office: Briefcase,
    design: Palette,
    assets: Image,
    icons: Type,
    diagrams: PenTool,
    productivity: FileText,
};
export default function HomeDirectory() {
    const { user, loading } = useAuth();
    useEffect(() => {
        if (!loading) keepAccountDraft(user?.id);
    }, [user?.id, loading]);
    return <WorkspaceHome key={user?.id || "guest"} user={user} authLoading={loading} />;
}
function WorkspaceHome({ user, authLoading }) {
    const { t, i18n } = useTranslation("navigation");
    const { uiMode } = useSettings();
    const [params, setParams] = useSearchParams();
    const query = params.get("q") || "";
    const [saved, setSaved] = useState(() => defaultGroups());
    const [recovered] = useState(() => readDraft(user?.id));
    const [version, setVersion] = useState(recovered?.version || 0);
    const [draft, updateDraft] = useState(recovered?.groups || null);
    function setDraft(groups) {
        writeDraft(
            user?.id,
            groups ? { groups, version, pendingLink: pendingLinkRef.current } : null
        );
        if (!groups) {
            pendingLinkRef.current = null;
            setPendingLinkState(null);
        }
        updateDraft(groups);
    }
    const [loadState, setLoadState] = useState(user ? "loading" : "ready");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(recovered ? t("custom.draftRecovered") : "");
    const [problem, setProblem] = useState("");
    const [conflict, setConflict] = useState(false);
    const [pendingLink, setPendingLinkState] = useState(recovered?.pendingLink || null);
    const pendingLinkRef = useRef(pendingLink);
    const setPendingLink = useCallback(
        (value) => {
            pendingLinkRef.current = value;
            setPendingLinkState(value);
            const cached = readDraft(user?.id);
            if (cached) writeDraft(user?.id, { ...cached, pendingLink: value });
        },
        [user?.id]
    );
    const importRef = useRef(null);
    const login = () => window.dispatchEvent(new Event("open-auth-modal"));
    useEffect(() => {
        if (!user) return;
        let active = true;
        api.get("/users/me/navigation-workspace", { silent: true, noRetry: true, timeout: 15000 })
            .then(({ data }) => {
                if (!active) return;
                setSaved(data.groups || defaultGroups(data.legacyLinks));
                if (recovered) {
                    setVersion(recovered.version);
                    if (recovered.version !== data.version) {
                        setConflict(true);
                        setProblem(t("custom.conflict"));
                    }
                } else setVersion(data.version);
                setLoadState("ready");
            })
            .catch(() => {
                if (active) setLoadState("error");
            });
        return () => {
            active = false;
        };
    }, [user?.id]);
    useEffect(() => {
        if (!draft) return;
        const warn = (e) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [draft]);
    async function reloadWorkspace() {
        if (draft && !window.confirm(t("custom.discardConfirm"))) return;
        setBusy(true);
        setProblem("");
        try {
            const { data } = await api.get("/users/me/navigation-workspace", {
                silent: true,
                noRetry: true,
                timeout: 15000,
            });
            setSaved(data.groups || defaultGroups(data.legacyLinks));
            setVersion(data.version);
            setDraft(null);
            setConflict(false);
            setLoadState("ready");
        } catch {
            setLoadState("error");
        } finally {
            setBusy(false);
        }
    }
    async function saveGroups(groups) {
        if (busy) return;
        let valid;
        try {
            valid = validateWorkspace(groups);
        } catch {
            setProblem(t("custom.invalidWorkspace"));
            return;
        }
        setBusy(true);
        setProblem("");
        setMessage("");
        try {
            const { data } = await api.put(
                "/users/me/navigation-workspace",
                { groups: valid, version },
                { silent: true, noRetry: true, timeout: 15000 }
            );
            setSaved(data.groups);
            setVersion(data.version);
            setDraft(null);
            setConflict(false);
            setMessage(t("custom.saved"));
        } catch (err) {
            setConflict(err.response?.status === 409);
            setProblem(t(err.response?.status === 409 ? "custom.conflict" : "custom.saveError"));
        } finally {
            setBusy(false);
        }
    }
    function exportGroups(type) {
        try {
            const groups = draft || saved;
            download(
                type === "html" ? bookmarksText(groups, english) : backupText(groups),
                type === "html" ? "首页书签.html" : "首页配置.json",
                type === "html" ? "text/html;charset=utf-8" : "application/json"
            );
        } catch {
            setProblem(t("custom.invalidWorkspace"));
        }
    }
    async function importGroups(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            if (file.size > 2 * 1024 * 1024) throw new Error("too_large");
            const groups = readBackup(await file.text());
            if (draft && !window.confirm(t("custom.discardConfirm"))) return;
            setDraft(groups);
            setProblem("");
            setMessage(t("custom.imported"));
        } catch {
            setProblem(t("custom.invalidBackup"));
        }
    }
    const directory = saved.map((group) => ({
        id: group.id,
        zh: group.title,
        en: group.titleEn || group.title,
        sites: group.links.map((link) => ({
            ...link,
            zh: link.description,
            en: link.descriptionEn || link.description,
        })),
    }));
    const requestedCategory = params.get("category") || "all";
    const category = directory.some((group) => group.id === requestedCategory)
        ? requestedCategory
        : "all";
    const [input, setInput] = useState(query);
    const inputRef = useRef(null);
    const english = i18n.resolvedLanguage?.startsWith("en");
    const language = english ? "en" : "zh";
    const groups = directory
        .filter((group) => category === "all" || group.id === category)
        .map((group) => ({
            ...group,
            sites: group.sites.filter((entry) => {
                const haystack = [
                    entry.name,
                    entry.nameEn,
                    entry.keywords,
                    entry.zh,
                    entry.en,
                    entry.url,
                    group.zh,
                    group.en,
                ]
                    .join(" ")
                    .toLocaleLowerCase();
                return query
                    .trim()
                    .toLocaleLowerCase()
                    .split(/\s+/)
                    .filter(Boolean)
                    .every((term) => haystack.includes(term));
            }),
        }))
        .filter((group) => !query || group.sites.length);
    const count = groups.reduce((total, group) => total + group.sites.length, 0);
    const isFiltered = Boolean(query || category !== "all");
    const expanded = new Set((params.get("expanded") || "").split(",").filter(Boolean));
    function toggleGroup(id) {
        const next = new URLSearchParams(params);
        const ids = new Set(expanded);
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);
        const validIds = directory.map((group) => group.id).filter((key) => ids.has(key));
        if (validIds.length) next.set("expanded", validIds.join(","));
        else next.delete("expanded");
        setParams(next);
    }
    const name = (entry) => nameOf(entry, english);

    useEffect(() => {
        setInput(query);
    }, [query]);
    useEffect(() => {
        const focusSearch = (event) => {
            const editing =
                event.target instanceof HTMLElement &&
                (event.target.isContentEditable ||
                    /INPUT|TEXTAREA|SELECT/.test(event.target.tagName));
            if (
                event.key === "/" &&
                !editing &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.altKey
            ) {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", focusSearch);
        return () => window.removeEventListener("keydown", focusSearch);
    }, []);

    function filterUrl(nextQuery, nextCategory) {
        const next = new URLSearchParams(params);
        if (nextQuery.trim()) next.set("q", nextQuery.trim());
        else next.delete("q");
        if (nextCategory !== "all") next.set("category", nextCategory);
        else next.delete("category");
        return next;
    }
    function updateFilters(nextQuery, nextCategory, replace = false) {
        setParams(filterUrl(nextQuery, nextCategory), { replace });
    }
    function reset() {
        setInput("");
        updateFilters("", "all");
    }

    return (
        <div className="ai-directory" data-appearance={uiMode}>
            <SEO title={t("meta")} description={t("description")} />
            <div className="directory-container">
                <section className="directory-intro" aria-labelledby="directory-title">
                    <div className="directory-intro-copy">
                        <h1 id="directory-title">{t("title")}</h1>
                        <p>{t("subtitle")}</p>
                    </div>
                    <div className="directory-intro-tools">
                        <div
                            className={`workspace-actions directory-header-actions ${draft ? "is-editing" : ""}`}
                        >
                            {!user ? (
                                <button
                                    type="button"
                                    className="workspace-button"
                                    disabled={authLoading}
                                    onClick={login}
                                >
                                    <Settings2 size={16} />
                                    {t("custom.edit")}
                                </button>
                            ) : (
                                <>
                                    {draft ? (
                                        <>
                                            <button
                                                className="workspace-button primary"
                                                disabled={
                                                    busy ||
                                                    conflict ||
                                                    !!pendingLink ||
                                                    loadState !== "ready"
                                                }
                                                onClick={() => saveGroups(draft)}
                                            >
                                                {t(busy ? "custom.saving" : "custom.save")}
                                            </button>
                                            <button
                                                className="workspace-button"
                                                disabled={busy}
                                                onClick={() => {
                                                    if (
                                                        window.confirm(t("custom.discardConfirm"))
                                                    ) {
                                                        setDraft(null);
                                                        setProblem("");
                                                        setConflict(false);
                                                        setMessage("");
                                                    }
                                                }}
                                            >
                                                {t("custom.cancel")}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="workspace-button"
                                            disabled={loadState !== "ready" || busy}
                                            onClick={() => {
                                                setDraft(structuredClone(saved));
                                                setProblem("");
                                                setMessage("");
                                            }}
                                        >
                                            <Settings2 size={16} />
                                            {t("custom.edit")}
                                        </button>
                                    )}
                                </>
                            )}
                            {draft && (
                                <details className="workspace-export">
                                    <summary>
                                        <Download size={16} />
                                        {t("custom.importExport")}
                                    </summary>
                                    <div className="workspace-export-menu">
                                        <button
                                            disabled={
                                                busy || !!pendingLink || loadState !== "ready"
                                            }
                                            onClick={() => exportGroups("html")}
                                        >
                                            {t("custom.exportBookmarks")}
                                        </button>
                                        <button
                                            disabled={
                                                busy || !!pendingLink || loadState !== "ready"
                                            }
                                            onClick={() => exportGroups("json")}
                                        >
                                            {t("custom.exportBackup")}
                                        </button>
                                        {user && (
                                            <button
                                                disabled={
                                                    busy || !!pendingLink || loadState !== "ready"
                                                }
                                                onClick={() => importRef.current?.click()}
                                            >
                                                {t("custom.importBackup")}
                                            </button>
                                        )}
                                    </div>
                                </details>
                            )}
                            <input
                                ref={importRef}
                                hidden
                                type="file"
                                accept=".json,application/json"
                                onChange={importGroups}
                            />
                        </div>
                        <div className="directory-search-area">
                            <form
                                role="search"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    updateFilters(input, category);
                                }}
                            >
                                <Search size={20} aria-hidden="true" />
                                <input
                                    ref={inputRef}
                                    type="search"
                                    disabled={!!draft}
                                    aria-label={t("searchLabel")}
                                    placeholder={t("search")}
                                    value={input}
                                    onChange={(event) => {
                                        setInput(event.target.value);
                                        updateFilters(event.target.value, category, true);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Escape") {
                                            setInput("");
                                            updateFilters("", category, true);
                                        }
                                    }}
                                    autoComplete="off"
                                    spellCheck="false"
                                />
                                {input ? (
                                    <button
                                        type="button"
                                        aria-label={t("clear")}
                                        disabled={!!draft}
                                        onClick={() => {
                                            setInput("");
                                            updateFilters("", category, true);
                                            inputRef.current?.focus();
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                ) : (
                                    <kbd title={t("shortcut")}>/</kbd>
                                )}
                            </form>
                        </div>
                    </div>
                </section>
                {message && (
                    <p className="workspace-notice" role="status">
                        {message}
                    </p>
                )}
                {problem && (
                    <div className="workspace-notice" role="alert">
                        {problem}
                        {conflict && (
                            <button disabled={busy} onClick={reloadWorkspace}>
                                {t("custom.reloadSaved")}
                            </button>
                        )}
                    </div>
                )}
                {loadState === "error" && (
                    <div className="workspace-notice" role="alert">
                        {t("custom.loadError")}
                        <button disabled={busy} onClick={reloadWorkspace}>
                            {t("custom.retry")}
                        </button>
                    </div>
                )}
                {loadState === "loading" && <p role="status">{t("custom.loading")}</p>}
                {draft ? (
                    <>
                        <div className="workspace-edit-heading">
                            <p>{t("custom.editHelp")}</p>
                            <button
                                className="workspace-button"
                                disabled={busy || !!pendingLink}
                                onClick={() => {
                                    if (window.confirm(t("custom.resetConfirm"))) {
                                        setDraft(defaultGroups());
                                        setProblem("");
                                    }
                                }}
                            >
                                {t("custom.restoreDefault")}
                            </button>
                        </div>
                        <WorkspaceEditor
                            icons={icons}
                            appearance={uiMode}
                            form={pendingLink}
                            setForm={setPendingLink}
                            groups={draft}
                            onChange={setDraft}
                            disabled={busy}
                            english={english}
                        />
                    </>
                ) : (
                    loadState === "ready" && (
                        <section
                            id="directory-content"
                            className="directory-content"
                            aria-label={t("categories")}
                        >
                            <div className="directory-toolbar">
                                <p className="directory-result-count" role="status">
                                    {t(isFiltered ? "results" : "count", { count })}
                                    {isFiltered && (
                                        <button type="button" onClick={reset}>
                                            {t("reset")}
                                        </button>
                                    )}
                                </p>
                            </div>
                            <div
                                className="directory-grid"
                                data-view={category === "all" ? "overview" : "category"}
                            >
                                {groups.map((group) => {
                                    const Icon = icons[group.id] || Folder;
                                    const open = expanded.has(group.id);
                                    const canExpand = !isFiltered && group.sites.length > 9;
                                    const sites =
                                        isFiltered || open ? group.sites : group.sites.slice(0, 9);
                                    return (
                                        <section
                                            className="directory-group"
                                            key={group.id}
                                            aria-labelledby={`category-${group.id}`}
                                        >
                                            <div className="directory-group-heading">
                                                <h2 id={`category-${group.id}`}>
                                                    <Icon
                                                        size={19}
                                                        strokeWidth={1.6}
                                                        aria-hidden="true"
                                                    />
                                                    {group[language]}
                                                    <span>{group.sites.length}</span>
                                                </h2>
                                                {canExpand && (
                                                    <button
                                                        type="button"
                                                        className="directory-view-all"
                                                        onClick={() => toggleGroup(group.id)}
                                                        aria-expanded={open}
                                                        aria-controls={`sites-${group.id}`}
                                                        aria-label={t(
                                                            open
                                                                ? "collapseCategory"
                                                                : "viewCategory",
                                                            { category: group[language] }
                                                        )}
                                                    >
                                                        {t(open ? "collapse" : "viewAll")}
                                                        {open ? (
                                                            <ChevronUp
                                                                size={13}
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            <ChevronDown
                                                                size={13}
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            <ul id={`sites-${group.id}`}>
                                                {sites.map((entry) => (
                                                    <li key={entry.id}>
                                                        <a
                                                            href={entry.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            aria-label={`${name(entry)} · ${entry[language]} · ${t("external")}`}
                                                            title={`${entry[language]} · ${new URL(entry.url).hostname}`}
                                                        >
                                                            <span className="directory-site-name">
                                                                {name(entry)}
                                                                <ArrowUpRight
                                                                    size={13}
                                                                    aria-hidden="true"
                                                                />
                                                            </span>
                                                            <span className="directory-site-description">
                                                                {entry[language]}
                                                            </span>
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </section>
                                    );
                                })}
                            </div>
                            {!count && (
                                <div className="directory-empty">
                                    <Search size={30} aria-hidden="true" />
                                    <h2>{t("empty")}</h2>
                                    <p>{t("emptyHelp")}</p>
                                    <button type="button" onClick={reset}>
                                        {t("reset")}
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            )}
                        </section>
                    )
                )}
            </div>
        </div>
    );
}
