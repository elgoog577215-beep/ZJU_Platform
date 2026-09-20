/*
THESIS: A quiet, useful starting point for university AI work; links lead the page.
OWN-WORLD: Shared site shell; approved soft daytime surfaces and slate/indigo night theme.
STORY: Find a tool, course or paper, then continue into community and real projects.
FIRST VIEWPORT: Existing global tabs, search and quick links, a three-column directory.
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
    Library,
} from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import SEO from "../../components/SEO";
import { allSites, directory, featuredIds, filterDirectory } from "./directory";
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

    function updateFilters(nextQuery, nextCategory, replace = false) {
        const next = new URLSearchParams(params);
        if (nextQuery.trim()) next.set("q", nextQuery.trim());
        else next.delete("q");
        if (nextCategory !== "all") next.set("category", nextCategory);
        else next.delete("category");
        setParams(next, { replace });
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
                        <div className="directory-quick-links">
                            <span>{t("featured")}</span>
                            {featuredIds.map((id) => {
                                const entry = allSites.find((item) => item.id === id);
                                return (
                                    <a
                                        key={id}
                                        href={entry.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`${name(entry)} · ${t("external")}`}
                                    >
                                        {name(entry)}
                                        <ArrowUpRight size={12} aria-hidden="true" />
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </section>
                <section
                    id="directory-content"
                    className="directory-content"
                    aria-label={t("categories")}
                >
                    <div className="directory-toolbar">
                        <div
                            className="directory-filters"
                            role="group"
                            aria-label={t("categories")}
                        >
                            <button
                                type="button"
                                aria-pressed={category === "all"}
                                onClick={() => updateFilters(query, "all")}
                            >
                                {t("all")}
                            </button>
                            {directory.map((group) => (
                                <button
                                    type="button"
                                    key={group.id}
                                    aria-pressed={category === group.id}
                                    onClick={() => updateFilters(query, group.id)}
                                >
                                    {group[language]}
                                </button>
                            ))}
                        </div>
                        <p className="directory-result-count" role="status">
                            {t(isFiltered ? "results" : "count", { count })}
                            {isFiltered && (
                                <button type="button" onClick={reset}>
                                    {t("reset")}
                                </button>
                            )}
                        </p>
                    </div>
                    <div className="directory-grid">
                        {groups.map((group) => {
                            const Icon = icons[group.id];
                            return (
                                <section
                                    className="directory-group"
                                    key={group.id}
                                    aria-labelledby={`category-${group.id}`}
                                >
                                    <h2 id={`category-${group.id}`}>
                                        <Icon size={19} strokeWidth={1.6} aria-hidden="true" />
                                        {group[language]}
                                        <span>{group.sites.length}</span>
                                    </h2>
                                    <ul>
                                        {group.sites.map((entry) => (
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
