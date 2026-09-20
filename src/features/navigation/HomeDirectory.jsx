/*
THESIS: A quiet, useful starting point for learning, work and creation; links lead the page.
OWN-WORLD: Shared site shell; approved soft daytime surfaces and slate/indigo night theme.
STORY: Find a tool, course or paper, then continue into community and real projects.
FIRST VIEWPORT: Existing global tabs, search and expandable category groups, a three-column directory.
FORM: User-approved campus directory reference: dense link grids, generous group spacing.
*/
import { useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import SEO from "../../components/SEO";
import { directory, filterDirectory } from "./directory";
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
    const { t, i18n } = useTranslation("navigation");
    const { uiMode } = useSettings();
    const [params, setParams] = useSearchParams();
    const query = params.get("q") || "";
    const requestedCategory = params.get("category") || "all";
    const category = directory.some((group) => group.id === requestedCategory)
        ? requestedCategory
        : "all";
    const [input, setInput] = useState(query);
    const inputRef = useRef(null);
    const english = i18n.resolvedLanguage?.startsWith("en");
    const language = english ? "en" : "zh";
    const groups = useMemo(() => filterDirectory(query, category), [query, category]);
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
    const name = (entry) => t(`names.${entry.id}`, { defaultValue: entry.name });

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
                </section>
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
                            const Icon = icons[group.id];
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
                                            <Icon size={19} strokeWidth={1.6} aria-hidden="true" />
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
                                                    open ? "collapseCategory" : "viewCategory",
                                                    { category: group[language] }
                                                )}
                                            >
                                                {t(open ? "collapse" : "viewAll")}
                                                {open ? (
                                                    <ChevronUp size={13} aria-hidden="true" />
                                                ) : (
                                                    <ChevronDown size={13} aria-hidden="true" />
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
            </div>
        </div>
    );
}
