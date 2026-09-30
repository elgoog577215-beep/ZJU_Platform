import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Github, Search } from "lucide-react";
import { useEventOutcome } from "./useEventOutcome";
import { getEventUrl } from "../../utils/hackathonRoute";
import { safeWebUrl } from "../../utils/hackathonAiX";
import "./FirstEditionArchive.css";

const workTitle = (work) =>
    work.title.replace(/^(?:冠军作品|亚军作品|季军作品|前10名优胜奖|前20名鼓励奖)[：:]\s*/u, "");

export default function FirstEditionResults({ template }) {
    const { t } = useTranslation();
    const { outcome, status, reload } = useEventOutcome(template.results.competitionSlug);
    const [params, setParams] = useSearchParams();
    const [query, setQuery] = useState("");
    const [award, setAward] = useState("");
    const works = useMemo(() => outcome?.works || [], [outcome]);
    const filtered = works.filter(
        (work) =>
            (!award || work.award === award) &&
            `${work.title} ${work.author} ${work.summary}`
                .toLowerCase()
                .includes(query.trim().toLowerCase())
    );
    const selected = filtered.find((work) => String(work.id) === params.get("work")) || filtered[0];
    const photos = (outcome?.media?.featured_photos || []).slice(0, 4);
    const mediaHref = getEventUrl(template.event.key, "media");
    const selectWork = (work) => {
        const next = new URLSearchParams(params);
        next.set("work", String(work.id));
        setParams(next, { replace: true });
    };
    if (template.navigation?.resultsVisible === false)
        return (
            <div className="hx-content">
                <h1>{t("eventWorkspace.resultsPending")}</h1>
            </div>
        );
    return (
        <div className="hx-content hx-first-results">
            <header className="hx-page-heading hx-first-heading">
                <div>
                    <p className="hx-overline">2026.05.10 · {template.event.title}</p>
                    <h1>{t("firstEdition.resultsTitle")}</h1>
                    <p>{t("firstEdition.resultsIntro")}</p>
                </div>
                <Link className="hx-outline" to={mediaHref}>
                    {t("firstEdition.viewScene")}
                    <ArrowUpRight size={16} />
                </Link>
            </header>
            {status === "loading" ? (
                <p role="status">{t("aix.loading")}</p>
            ) : status === "error" ? (
                <div role="alert" className="hx-empty">
                    <p>{t("aix.loadFailed")}</p>
                    <button className="hx-outline" onClick={reload}>
                        {t("aix.retry")}
                    </button>
                </div>
            ) : (
                <>
                    <section aria-labelledby="first-works-heading">
                        <div className="hx-first-section-head">
                            <h2 id="first-works-heading">
                                {t("firstEdition.worksTitle", { count: works.length })}
                            </h2>
                            <p>{t("firstEdition.awardNote")}</p>
                        </div>
                        <div className="hx-first-toolbar">
                            <label className="hx-first-search">
                                <Search size={18} />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    aria-label={t("firstEdition.search")}
                                    placeholder={t("firstEdition.search")}
                                />
                            </label>
                            <select
                                aria-label={t("firstEdition.awardFilter")}
                                value={award}
                                onChange={(e) => setAward(e.target.value)}
                            >
                                <option value="">{t("firstEdition.allAwards")}</option>
                                {[...new Set(works.map((w) => w.award).filter(Boolean))].map(
                                    (value) => (
                                        <option key={value}>{value}</option>
                                    )
                                )}
                            </select>
                            <span role="status">
                                {t("firstEdition.matchCount", { count: filtered.length })}
                            </span>
                        </div>
                        {filtered.length ? (
                            <div className="hx-first-works">
                                <nav
                                    className="hx-first-work-list"
                                    aria-label={t("firstEdition.workList")}
                                >
                                    {filtered.map((work) => (
                                        <button
                                            type="button"
                                            key={work.id}
                                            aria-pressed={selected?.id === work.id}
                                            onClick={() => selectWork(work)}
                                        >
                                            <span className="hx-first-award">
                                                {work.award || t("firstEdition.entry")}
                                            </span>
                                            <strong>{workTitle(work)}</strong>
                                            <span>{work.author}</span>
                                        </button>
                                    ))}
                                </nav>
                                {selected && (
                                    <article className="hx-first-work-detail" key={selected.id}>
                                        <header>
                                            <p className="hx-first-award">
                                                {selected.award || t("firstEdition.entry")}
                                            </p>
                                            <h2>{workTitle(selected)}</h2>
                                            <p>
                                                {[selected.author, selected.grade, selected.major]
                                                    .filter(Boolean)
                                                    .join(" · ")}
                                            </p>
                                        </header>
                                        {selected.cover_url && (
                                            <a
                                                className="hx-first-work-image"
                                                href={selected.cover_url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <img
                                                    src={selected.cover_url}
                                                    alt={t(
                                                        "hackathon.outcome_archive.work_cover_alt",
                                                        { title: workTitle(selected) }
                                                    )}
                                                    loading="lazy"
                                                />
                                            </a>
                                        )}
                                        <section>
                                            <h3>{t("hackathon.outcome_archive.work_intro")}</h3>
                                            <p className="hx-first-prose">{selected.summary}</p>
                                        </section>
                                        <div className="hx-first-actions">
                                            {safeWebUrl(selected.git_url) && (
                                                <a
                                                    className="hx-outline"
                                                    href={safeWebUrl(selected.git_url)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Github size={16} />
                                                    {t("firstEdition.repository")}
                                                    <ArrowUpRight size={15} />
                                                </a>
                                            )}
                                            {safeWebUrl(selected.deployment_url) && (
                                                <a
                                                    className="hx-outline"
                                                    href={safeWebUrl(selected.deployment_url)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {t("firstEdition.deployment")}
                                                    <ArrowUpRight size={15} />
                                                </a>
                                            )}
                                            {selected.story_file_url?.startsWith("/uploads/") && (
                                                <a
                                                    className="hx-outline"
                                                    href={selected.story_file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {t("hackathon.outcome_archive.story_file")}
                                                    <ArrowUpRight size={15} />
                                                </a>
                                            )}
                                        </div>
                                        {selected.deployment_url && (
                                            <p className="hx-first-link-note">
                                                {t("firstEdition.deploymentNote")}
                                            </p>
                                        )}
                                        {selected.experience && (
                                            <details className="hx-first-story">
                                                <summary>{t("firstEdition.readStory")}</summary>
                                                <p className="hx-first-link-note">
                                                    {t("firstEdition.authorStory")}
                                                </p>
                                                <div className="hx-first-prose">
                                                    {selected.experience}
                                                </div>
                                            </details>
                                        )}
                                    </article>
                                )}
                            </div>
                        ) : (
                            <p className="hx-empty">
                                {t(
                                    works.length ? "firstEdition.noMatch" : "eventWorkspace.noWorks"
                                )}
                            </p>
                        )}
                    </section>
                    {photos.length > 0 && (
                        <section className="hx-first-scene" aria-labelledby="first-scene-heading">
                            <div className="hx-first-section-head">
                                <h2 id="first-scene-heading">{t("firstEdition.sceneTitle")}</h2>
                                <Link to={mediaHref}>
                                    {t("firstEdition.allPhotos", {
                                        count: outcome.stats.stage_photos,
                                    })}{" "}
                                    →
                                </Link>
                            </div>
                            <div className="hx-first-photo-strip">
                                {photos.map((photo) => (
                                    <Link
                                        key={photo.id}
                                        to={`${mediaHref}?photo=${photo.source_id || photo.id}`}
                                    >
                                        <figure>
                                            <img
                                                src={photo.url || photo.cover_url}
                                                alt={photo.title}
                                                loading="lazy"
                                            />
                                            <figcaption>{photo.title}</figcaption>
                                        </figure>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
