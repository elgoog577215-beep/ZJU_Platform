import { useMemo, useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, ArrowLeft, Github, Search } from "lucide-react";
import { useEventOutcome } from "./useEventOutcome";
import { getEventUrl } from "../../utils/hackathonRoute";
import { safeWebUrl } from "../../utils/hackathonAiX";
import "./FirstEditionArchive.css";
import "./ResultsPresentation.css";
import EventStage from "./EventStage";

const workTitle = (work) =>
    work.title.replace(/^(?:冠军作品|亚军作品|季军作品|前10名优胜奖|前20名鼓励奖)[：:]\s*/u, "");

export default function FirstEditionResults({ template, copyNamespace = "firstEdition" }) {
    const { t } = useTranslation();
    const { outcome, status, reload } = useEventOutcome(template.results.competitionSlug);
    const [params, setParams] = useSearchParams();
    const [query, setQuery] = useState("");
    const [award, setAward] = useState("");
    const [featuredIndex, setFeaturedIndex] = useState(0);
    const works = useMemo(() => outcome?.works || [], [outcome]);
    const filtered = works.filter(
        (work) =>
            (!award || work.award === award) &&
            `${work.title} ${work.author} ${work.summary}`
                .toLowerCase()
                .includes(query.trim().toLowerCase())
    );
    const selected = works.find((work) => String(work.id) === params.get("work"));
    const detailRef = useRef(null);
    const lastSelected = useRef(null);
    const tiles = useRef(new Map());
    const podium = works.filter((work) => Number(work.rank) >= 1 && Number(work.rank) <= 3);
    const featured = podium[featuredIndex] || works[0];
    const entries = filtered;
    useEffect(() => {
        if (selected) {
            lastSelected.current = selected.id;
            detailRef.current?.focus({ preventScroll: true });
            detailRef.current?.scrollIntoView({ block: "start" });
        } else if (lastSelected.current) {
            tiles.current.get(lastSelected.current)?.focus();
        }
    }, [selected]);
    const closeWork = () => {
        const next = new URLSearchParams(params);
        next.delete("work");
        setParams(next, { replace: true });
    };
    const workTile = (work, featured = false) => (
        <button
            type="button"
            className={`hx-exhibit-work ${featured ? "is-featured" : ""}`}
            key={work.id}
            ref={(node) => {
                if (node) tiles.current.set(work.id, node);
                else tiles.current.delete(work.id);
            }}
            onClick={() => selectWork(work)}
        >
            <div className="hx-exhibit-image">
                {work.cover_url ? (
                    <img src={work.cover_url} alt="" loading={featured ? "eager" : "lazy"} />
                ) : (
                    <span>{workTitle(work)}</span>
                )}
            </div>
            <div className="hx-exhibit-caption">
                <span className="hx-first-award">{work.award || t("firstEdition.entry")}</span>
                <strong>{workTitle(work)}</strong>
                <span>
                    {work.author}
                    <ArrowUpRight size={18} />
                </span>
            </div>
        </button>
    );
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
        <div className="hx-content hx-first-results hx-results-presentation">
            {!selected && (
                <EventStage
                    kicker={`${template.event.startAt?.slice(0, 10).replaceAll("-", ".")} · ${template.event.title}`}
                    title={t(`${copyNamespace}.resultsTitle`)
                        .split(/(?=与)/)
                        .map((line, index) => (
                            <span
                                className={index ? "hx-results-title-accent" : undefined}
                                key={line}
                            >
                                {line}
                            </span>
                        ))}
                    description={t(`${copyNamespace}.resultsIntro`)}
                    action={
                        <a className="hx-primary" href="#first-works-heading">
                            {t("firstEdition.worksTitle", { count: works.length })}
                            <ArrowUpRight size={18} />
                        </a>
                    }
                >
                    {featured ? (
                        <div className="hx-feature-board">
                            <div className="hx-stage-board-label">{t("resultStage.featured")}</div>
                            {featured.cover_url && (
                                <button
                                    type="button"
                                    className="hx-feature-cover"
                                    onClick={() => selectWork(featured)}
                                    aria-label={`${t("aix.viewProject")} · ${workTitle(featured)}`}
                                >
                                    <img src={featured.cover_url} alt="" />
                                </button>
                            )}
                            <div className="hx-feature-caption">
                                <span className="hx-first-award">{featured.award}</span>
                                <h2>{workTitle(featured)}</h2>
                                <p>{featured.author}</p>
                            </div>
                            <div className="hx-feature-footer">
                                <div className="hx-feature-select" aria-label={t("aix.awards")}>
                                    {podium.map((work, index) => (
                                        <button
                                            key={work.id}
                                            type="button"
                                            aria-pressed={index === featuredIndex}
                                            onClick={() => setFeaturedIndex(index)}
                                        >
                                            {work.award}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="hx-text-button"
                                    onClick={() => selectWork(featured)}
                                >
                                    {t("aix.viewProject")}
                                    <ArrowUpRight size={17} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="hx-stage-await">
                            <div className="hx-stage-board-label">{t("aix.resultsKicker")}</div>
                            {status === "error" ? (
                                <div role="alert">
                                    <h2>{t("aix.loadFailed")}</h2>
                                    <button className="hx-outline" onClick={reload}>
                                        {t("aix.retry")}
                                    </button>
                                </div>
                            ) : (
                                <h2 role={status === "loading" ? "status" : undefined}>
                                    {t(
                                        status === "loading"
                                            ? "aix.loading"
                                            : "eventWorkspace.noWorks"
                                    )}
                                </h2>
                            )}
                        </div>
                    )}
                </EventStage>
            )}
            {status === "ready" && (
                <>
                    {selected ? (
                        <section
                            className="hx-exhibit-detail"
                            ref={detailRef}
                            tabIndex={-1}
                            aria-label={workTitle(selected)}
                        >
                            <button
                                className="hx-text-button hx-exhibit-back"
                                type="button"
                                onClick={closeWork}
                            >
                                <ArrowLeft size={17} />
                                {t("firstEdition.backToWorks")}
                            </button>
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
                                            alt={t("hackathon.outcome_archive.work_cover_alt", {
                                                title: workTitle(selected),
                                            })}
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
                                        <div className="hx-first-prose">{selected.experience}</div>
                                    </details>
                                )}
                            </article>
                        </section>
                    ) : (
                        <>
                            <section
                                aria-labelledby="first-works-heading"
                                className="hx-exhibit-collection"
                            >
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
                                        {[
                                            ...new Set(works.map((w) => w.award).filter(Boolean)),
                                        ].map((value) => (
                                            <option key={value}>{value}</option>
                                        ))}
                                    </select>
                                    <span role="status">
                                        {t("firstEdition.matchCount", { count: filtered.length })}
                                    </span>
                                </div>
                                {filtered.length ? (
                                    <div className="hx-exhibit-grid">
                                        {entries.map((work) => workTile(work))}
                                    </div>
                                ) : (
                                    <p className="hx-empty">
                                        {t(
                                            works.length
                                                ? "firstEdition.noMatch"
                                                : "eventWorkspace.noWorks"
                                        )}
                                    </p>
                                )}
                            </section>
                        </>
                    )}
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
