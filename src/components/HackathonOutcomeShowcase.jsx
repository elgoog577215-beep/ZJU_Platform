import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ExternalLink, Github, Play, X } from "lucide-react";

import SEO from "./SEO";
import SmartImage from "./SmartImage";
import MediaViewer from "./hackathon-event/MediaViewer";
import { normalizeHackathonTemplate } from "../data/hackathonTemplate";
import { getFirstEditionPartnerGroups } from "../data/firstEditionPartners";
import { getEventUrl } from "../utils/hackathonRoute";
import { safeWebUrl } from "../utils/hackathonAiX";
import { useEventOutcome } from "./hackathon-event/useEventOutcome";
import "./hackathon-event/OriginalResultsIntegration.css";
import { getPartnerLogoSrc } from "../data/partnerLogos";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import { useBackClose, useBodyScrollLock } from "../hooks/useBackClose";
import { normalizeExternalImageUrl } from "../utils/imageUtils";

const FALLBACK_HERO = "/images/hero-campus-day-4k.jpg";

const formatDate = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}` : String(value || "");
};

const normalizeRank = (rank) => {
    const value = String(rank || "").trim();
    return /^\d+$/.test(value) ? value.padStart(2, "0") : value;
};

const stripWorkAwardPrefix = (title) =>
    String(title || "").replace(
        /^(?:冠军作品|亚军作品|季军作品|前10名优胜奖|前20名鼓励奖)[：:]\s*/u,
        ""
    );

const getPodiumRank = (work) => {
    const rank = Number.parseInt(work?.rank, 10);
    return rank >= 1 && rank <= 3 ? rank : null;
};

const getLocalizedWorkTitle = (work, t) => {
    const podiumRank = getPodiumRank(work);
    const title = work.displayTitle || work.title;
    return podiumRank
        ? t(`hackathon.outcome_archive.podium_title_${podiumRank}`, { title })
        : title;
};

const getLocalizedHonorTitle = (work, t) => {
    const podiumRank = getPodiumRank(work);
    return podiumRank
        ? t("hackathon.outcome_archive.podium_creator", { rank: podiumRank })
        : work.honorTitle;
};

const normalizeWork = (work, index, t) => ({
    ...work,
    id: work.id || `fallback-${index + 1}`,
    rank: normalizeRank(work.rank, index),
    award: work.award || work.honor_title || t("hackathon.outcome_archive.fallback_award"),
    honorTitle:
        work.honor_title ||
        work.honorTitle ||
        work.award ||
        t("hackathon.outcome_archive.fallback_honor"),
    title:
        work.title ||
        t("hackathon.outcome_archive.fallback_title", {
            rank: normalizeRank(work.rank, index),
        }),
    displayTitle: stripWorkAwardPrefix(
        work.title ||
            t("hackathon.outcome_archive.fallback_title", {
                rank: normalizeRank(work.rank, index),
            })
    ),
    author: work.author || work.uploader_name || t("hackathon.outcome_archive.fallback_author"),
    cover: work.cover_url || work.cover || "",
    gitUrl: safeWebUrl(work.git_url || work.gitUrl) || "",
    deploymentUrl: safeWebUrl(work.deployment_url) || "",
    summary: work.summary || work.description || "",
    highlight: work.highlight || "",
    experience: work.experience || work.highlight || "",
    grade: work.grade || "",
    major: work.major || "",
    storyFileUrl: work.story_file_url || work.storyFileUrl || "",
    projectId: work.project_id || work.projectId || null,
    projectTitle: work.project_title || work.projectTitle || "",
});

const WorkDetail = ({ work, t, compact = false, summaryOnly = false }) => {
    if (!work) return null;
    return (
        <article
            className={`original-outcome-work-detail ${compact ? "is-compact" : ""} ${work.cover ? "" : "without-cover"}`}
        >
            <div className="original-outcome-work-detail-head">
                <span>{getPodiumRank(work) ? work.rank : "—"}</span>
                <div>
                    <p>{getLocalizedHonorTitle(work, t)}</p>
                    <h3>{getLocalizedWorkTitle(work, t)}</h3>
                </div>
            </div>
            <div className="original-outcome-work-detail-body">
                <div className="original-outcome-work-detail-image">
                    {work.cover ? (
                        <SmartImage
                            src={normalizeExternalImageUrl(work.cover, 1000)}
                            alt={t("hackathon.outcome_archive.work_cover_alt", {
                                title: work.title,
                            })}
                            type="image"
                            className="h-full w-full"
                            imageClassName="h-full w-full object-cover"
                        />
                    ) : (
                        <span className="original-outcome-cover-title">{work.displayTitle}</span>
                    )}
                </div>
                <div className="original-outcome-work-detail-copy">
                    <dl className="original-outcome-work-detail-meta">
                        <div>
                            <dt>{t("hackathon.outcome_archive.author")}</dt>
                            <dd>{work.author}</dd>
                        </div>
                        <div>
                            <dt>{t("hackathon.outcome_archive.background")}</dt>
                            <dd>
                                {[work.grade, work.major].filter(Boolean).join(" / ") ||
                                    t("hackathon.outcome_archive.not_filled")}
                            </dd>
                        </div>
                    </dl>
                    <section>
                        <h4>{t("hackathon.outcome_archive.work_intro")}</h4>
                        <p>
                            {(summaryOnly && work.highlight) ||
                                work.summary ||
                                t("hackathon.outcome_archive.empty_intro")}
                        </p>
                    </section>
                    {!summaryOnly && work.experience ? (
                        <details className="original-outcome-story">
                            <summary>{t("firstEdition.readStory")}</summary>
                            <p>{t("firstEdition.authorStory")}</p>
                            <blockquote>{work.experience}</blockquote>
                        </details>
                    ) : null}
                    <div className="original-outcome-work-detail-actions">
                        {work.gitUrl ? (
                            <a href={work.gitUrl} target="_blank" rel="noreferrer">
                                <Github className="h-4 w-4" />
                                {t("hackathon.outcome_archive.project_link")}
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        ) : null}
                        {work.storyFileUrl?.startsWith("/uploads/") ? (
                            <a href={work.storyFileUrl} target="_blank" rel="noreferrer">
                                {t("hackathon.outcome_archive.story_file")}
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        ) : null}
                        {work.deploymentUrl && (
                            <a href={work.deploymentUrl} target="_blank" rel="noreferrer">
                                {t("firstEdition.deployment")}
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
};

const MobileWorkDetail = ({ work, open, onClose, t }) => {
    useBackClose(open, onClose);
    useBodyScrollLock(open);
    if (!open || !work || typeof document === "undefined") return null;
    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="original-outcome-mobile-work"
                role="dialog"
                aria-modal="true"
                aria-label={t("hackathon.outcome_archive.work_dialog", {
                    title: getLocalizedWorkTitle(work, t),
                })}
            >
                <div className="original-outcome-mobile-work-bar">
                    <div>
                        <span>{getPodiumRank(work) ? work.rank : "—"}</span>
                        <strong>{getLocalizedWorkTitle(work, t)}</strong>
                    </div>
                    <button type="button" onClick={onClose} aria-label={t("common.close")}>
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="original-outcome-mobile-work-scroll">
                    <WorkDetail work={work} t={t} compact />
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

const VideoDialog = ({ video, open, onClose }) =>
    open && video ? <MediaViewer item={video} video onClose={onClose} /> : null;

const SectionNumber = ({ number, eyebrow, title, id }) => (
    <div className="original-outcome-section-heading">
        <span>{number}</span>
        <div>
            <p>{eyebrow}</p>
            <h2 id={id}>{title}</h2>
        </div>
    </div>
);

const OutcomeField = ({ className = "" }) => (
    <picture className={`original-outcome-section-field ${className}`} aria-hidden="true">
        <source media="(max-width: 767px)" srcSet="/images/hackathon/x-field-mobile.webp" />
        <img src="/images/hackathon/x-field-desktop.webp" alt="" />
    </picture>
);

const HackathonOutcomeShowcase = ({ template: templateInput }) => {
    const { t, i18n } = useTranslation();
    const isDayMode = false;
    const [searchParams, setSearchParams] = useSearchParams();
    const template = useMemo(
        () => normalizeHackathonTemplate(templateInput || {}),
        [templateInput]
    );
    const event = template.event;
    const competitionSlug = template.results.competitionSlug;
    const workspaceProjectsHref = "#showcase-works";
    const workspaceMediaHref = getEventUrl(event.key, "media");
    const useEnglishContent = i18n.resolvedLanguage?.startsWith("en");
    const titleParts = [t("hackathon.hero.title_line_1"), t("hackathon.hero.title_line_2")];
    const eventDescription = useEnglishContent
        ? t("hackathon.hero.description")
        : event.description;
    const eventLocation = useEnglishContent ? t("hackathon.event.location") : event.location;
    const { outcome, status, reload } = useEventOutcome(competitionSlug);
    const loading = status === "loading";
    const [videoOpen, setVideoOpen] = useState(false);
    const [mobileWorkOpen, setMobileWorkOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [award, setAward] = useState("");
    const { groups: directory } = useEcosystemPartners();
    const partnerGroups = getFirstEditionPartnerGroups(directory, t, useEnglishContent);
    const enterpriseLogos = partnerGroups.find((group) => group.id === "enterprise").partners;

    useEffect(() => {
        if (loading || typeof window === "undefined") return undefined;
        const targetId = new URLSearchParams(window.location.search).has("work")
            ? "showcase-works"
            : window.location.hash.replace(/^#/, "");
        if (!["showcase-archive", "showcase-works", "showcase-support"].includes(targetId)) {
            return undefined;
        }
        const frame = window.requestAnimationFrame(() => {
            document.getElementById(targetId)?.scrollIntoView({ block: "start" });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [loading, outcome]);

    const photos = useMemo(
        () =>
            (Array.isArray(outcome?.media?.stage_photos) ? outcome.media.stage_photos : [])
                .filter((item) => item.url || item.cover_url)
                .slice(0, 5),
        [outcome]
    );
    const officialVideo = outcome?.media?.promo_videos?.[0] || null;
    const works = useMemo(
        () => (outcome?.works || []).map((work, index) => normalizeWork(work, index, t)),
        [outcome, t]
    );
    const requestedWork = String(searchParams.get("work") || "").trim();
    const selectedWork =
        works.find((work) => String(work.id) === requestedWork) || works[0] || null;
    const podium = works
        .filter((work) => Number(work.rank) >= 1 && Number(work.rank) <= 3)
        .sort((a, b) => Number(a.rank) - Number(b.rank));
    const remainingWorks = works.filter(
        (work) =>
            (!award || work.award === award) &&
            `${work.title} ${work.author} ${work.summary}`
                .toLowerCase()
                .includes(query.trim().toLowerCase())
    );

    const selectWork = (work) => {
        const next = new URLSearchParams(searchParams);
        next.set("work", String(work.id));
        setSearchParams(next, { replace: true });
        if (window.matchMedia?.("(max-width: 767px)").matches) setMobileWorkOpen(true);
        else if (window.matchMedia?.("(max-width: 1120px)").matches) {
            requestAnimationFrame(() =>
                document
                    .querySelector(".first-edition-original .original-outcome-work-detail")
                    ?.scrollIntoView({ block: "start" })
            );
        }
    };

    const closeMobileWork = () => {
        setMobileWorkOpen(false);
        const next = new URLSearchParams(searchParams);
        next.delete("work");
        setSearchParams(next, { replace: true });
    };

    const heroCover =
        officialVideo?.cover_url || officialVideo?.thumbnail || photos[0]?.url || FALLBACK_HERO;
    const eventStats = (() => {
        const stats = [...(event.highlights || []).slice(0, 4)];
        if (stats.length < 4 && event.prizeValue) {
            stats.push({
                id: "prize_pool",
                value: event.prizeValue,
                unit: event.prizeUnit,
                label: t("hackathon.outcome_archive.prize_pool"),
            });
        }
        const normalized = stats.slice(0, 4);
        if (!useEnglishContent) return normalized;
        const englishStatCopy = [
            { unit: t("hackathon.hero.hours_unit"), label: t("hackathon.board.title_line_1") },
            { unit: t("hackathon.hero.solo_unit"), label: t("hackathon.chips.solo") },
            { unit: t("hackathon.hero.pitch_unit"), label: t("hackathon.board.title_line_2") },
        ];
        return normalized.map((stat, index) =>
            englishStatCopy[index] ? { ...stat, ...englishStatCopy[index] } : stat
        );
    })();
    const partnerCount = (partnerGroups || []).reduce(
        (total, group) => total + (group.partners?.length || 0),
        0
    );
    const communitySupportGroups = (partnerGroups || []).filter(
        (group) => group.id !== "enterprise"
    );

    if (loading || status === "error")
        return (
            <div className="hx-content" role={status === "error" ? "alert" : "status"}>
                <p>
                    {t(status === "error" ? "aix.loadFailed" : "hackathon.outcome_archive.loading")}
                </p>
                {status === "error" && (
                    <button className="hx-outline" onClick={reload}>
                        {t("aix.retry")}
                    </button>
                )}
            </div>
        );
    return (
        <div
            className={`first-edition-original showcase-compact-flow ${isDayMode ? "is-day" : "is-dark"}`}
            data-showcase-page
        >
            <SEO
                title={t("hackathon.outcome_archive.meta_title", { title: event.title })}
                description={t("hackathon.outcome_archive.meta_desc", { title: event.title })}
                image={heroCover}
            />

            {/*
              DESIGN CONTRACT
              Thesis: turn a finite hackathon into a monumental, living event archive.
              Own-world: one translucent X-field, acid-lime signals, documentary media, and
              oversized type. The X remains the spatial backbone instead of becoming card chrome.
              Story: overview -> field archive -> works and honors. The first viewport must show
              the title, event facts, real photo, and actions without hiding the background.
              Form: selective rounding only on media and controls; lists and statistics stay open.
            */}
            <picture className="original-outcome-x-field" aria-hidden="true">
                <source media="(max-width: 767px)" srcSet="/images/hackathon/x-field-mobile.webp" />
                <img src="/images/hackathon/x-field-desktop.webp" alt="" />
            </picture>

            <div className="first-edition-original-inner">
                <section
                    id="showcase-overview"
                    className="original-outcome-overview"
                    aria-labelledby="original-outcome-title"
                >
                    <div className="original-outcome-overview-grid">
                        <div className="original-outcome-hero-copy">
                            <h1 id="original-outcome-title">
                                {titleParts.map((part, index) => (
                                    <span
                                        key={part}
                                        className={
                                            index === titleParts.length - 1 ? "is-accent" : ""
                                        }
                                    >
                                        {part}
                                    </span>
                                ))}
                            </h1>
                            <h2 className="sr-only" id="overview-heading">
                                {t("hackathon.outcome_archive.overview")}
                            </h2>
                            <div className="original-outcome-title-rule" aria-hidden="true" />
                            <p className="original-outcome-date-line">
                                {formatDate(event.startAt)} · {eventLocation}
                            </p>
                            <p className="original-outcome-overview-name">
                                {t("hackathon.outcome_archive.overview")}
                            </p>
                            <p className="original-outcome-description">{eventDescription}</p>
                            <div className="original-outcome-stat-grid">
                                {eventStats.map((stat) => (
                                    <div key={stat.id}>
                                        <strong>
                                            {stat.value}
                                            <small>{stat.unit}</small>
                                        </strong>
                                        <span>{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="original-outcome-primary-actions">
                                <a href={workspaceProjectsHref}>
                                    {t(
                                        "hackathon.outcome_archive.browse_projects",
                                        "进入本场项目广场"
                                    )}
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            </div>
                        </div>
                        <div className="original-outcome-film">
                            <div className="original-outcome-film-frame">
                                <button
                                    type="button"
                                    onClick={() => officialVideo && setVideoOpen(true)}
                                    disabled={!officialVideo}
                                    aria-label={t("hackathon.outcome_archive.play_film")}
                                >
                                    <SmartImage
                                        src={normalizeExternalImageUrl(heroCover, 1400)}
                                        alt={t("hackathon.outcome_archive.film_alt")}
                                        type="video"
                                        priority
                                        className="h-full w-full"
                                        imageClassName="h-full w-full object-cover"
                                    />
                                    {officialVideo ? (
                                        <span className="original-outcome-film-play">
                                            <Play className="h-6 w-6" fill="currentColor" />
                                        </span>
                                    ) : null}
                                </button>
                            </div>
                            <div className="original-outcome-film-caption">
                                <span>{t("hackathon.outcome_archive.official_film")}</span>
                                <strong>
                                    {officialVideo?.title ||
                                        t("hackathon.outcome_archive.film_pending")}
                                </strong>
                            </div>
                        </div>
                    </div>
                    <div className="original-outcome-next-section">
                        <div>
                            <span aria-hidden="true">02</span>
                            <strong>{t("hackathon.outcome_archive.archive_title")}</strong>
                        </div>
                        <Link to={workspaceMediaHref}>
                            {t("hackathon.outcome_archive.view_all_photos", {
                                count: outcome?.stats?.stage_photos || photos.length,
                            })}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>

                <section
                    id="showcase-archive"
                    className="original-outcome-archive"
                    aria-labelledby="archive-heading"
                >
                    <OutcomeField className="is-archive" />
                    {photos.length > 0 ? (
                        <>
                            <div className="original-outcome-archive-stage">
                                <div className="original-outcome-archive-intro">
                                    <SectionNumber
                                        number="02"
                                        eyebrow={t("hackathon.outcome_archive.archive_eyebrow")}
                                        title={t("hackathon.outcome_archive.archive_title")}
                                        id="archive-heading"
                                    />
                                    <Link to={workspaceMediaHref}>
                                        {t("hackathon.outcome_archive.view_all_photos", {
                                            count: outcome?.stats?.stage_photos || photos.length,
                                        })}
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                                <figure className="original-outcome-archive-feature">
                                    <Link
                                        to={`${workspaceMediaHref}?photo=${photos[0].source_id || photos[0].id}`}
                                    >
                                        <SmartImage
                                            src={normalizeExternalImageUrl(
                                                photos[0].url || photos[0].cover_url,
                                                1400
                                            )}
                                            alt={photos[0].title}
                                            type="image"
                                            className="h-full w-full"
                                            imageClassName="h-full w-full object-cover"
                                        />
                                    </Link>
                                    <figcaption>
                                        <span>01</span>
                                        <strong>{photos[0].title}</strong>
                                    </figcaption>
                                </figure>
                            </div>
                            <div className="original-outcome-photo-strip">
                                {photos.slice(1).map((photo, index) => (
                                    <figure key={photo.id || `${photo.url}-${index}`}>
                                        <Link
                                            to={`${workspaceMediaHref}?photo=${photo.source_id || photo.id}`}
                                        >
                                            <SmartImage
                                                src={normalizeExternalImageUrl(
                                                    photo.url || photo.cover_url,
                                                    900
                                                )}
                                                alt={photo.title}
                                                type="image"
                                                className="h-full w-full"
                                                imageClassName="h-full w-full object-cover"
                                            />
                                        </Link>
                                        <figcaption>
                                            <span>{String(index + 2).padStart(2, "0")}</span>
                                            <strong>{photo.title}</strong>
                                        </figcaption>
                                    </figure>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="original-outcome-archive-intro">
                                <SectionNumber
                                    number="02"
                                    eyebrow={t("hackathon.outcome_archive.archive_eyebrow")}
                                    title={t("hackathon.outcome_archive.archive_title")}
                                    id="archive-heading"
                                />
                            </div>
                            <div className="original-outcome-empty-line">
                                {loading
                                    ? t("hackathon.outcome_archive.loading")
                                    : t("hackathon.outcome_archive.no_photos")}
                            </div>
                        </>
                    )}
                </section>

                <section
                    id="showcase-works"
                    className="original-outcome-works"
                    aria-labelledby="works-heading"
                >
                    <OutcomeField className="is-works" />
                    <div className="original-outcome-section-topline">
                        <SectionNumber
                            number="03"
                            eyebrow={t("hackathon.outcome_archive.works_eyebrow")}
                            title={t("hackathon.outcome_archive.works_title")}
                            id="works-heading"
                        />
                        <p className="original-outcome-award-note">{t("firstEdition.awardNote")}</p>
                    </div>
                    <div className="original-outcome-works-layout">
                        <div className="original-outcome-podium">
                            <h3>{t("hackathon.outcome_archive.top_three")}</h3>
                            {podium.map((work, index) => (
                                <button
                                    key={work.id}
                                    type="button"
                                    onClick={() => selectWork(work)}
                                    className={selectedWork?.id === work.id ? "is-selected" : ""}
                                >
                                    <div className="original-outcome-podium-thumb">
                                        <SmartImage
                                            src={normalizeExternalImageUrl(work.cover, 500)}
                                            alt={work.title}
                                            type="image"
                                            className="h-full w-full"
                                            imageClassName="h-full w-full object-cover"
                                        />
                                    </div>
                                    <span>{getPodiumRank(work) ? work.rank : "—"}</span>
                                    <div>
                                        <em>
                                            {t(
                                                `hackathon.outcome_archive.podium_award_${index + 1}`
                                            )}
                                        </em>
                                        <strong>{work.displayTitle || work.title}</strong>
                                        <small>
                                            {work.award} · {work.author}
                                        </small>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <WorkDetail work={selectedWork} t={t} />
                        <div className="original-outcome-ranking">
                            <h3>
                                {t("eventRecap.allEntries", {
                                    count: works.length,
                                })}
                            </h3>
                            <label className="original-outcome-search">
                                <input
                                    type="search"
                                    aria-label={t("firstEdition.search")}
                                    placeholder={t("firstEdition.search")}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                                <select
                                    aria-label={t("firstEdition.awardFilter")}
                                    value={award}
                                    onChange={(e) => setAward(e.target.value)}
                                >
                                    <option value="">{t("firstEdition.allAwards")}</option>
                                    {[
                                        ...new Set(works.map((work) => work.award).filter(Boolean)),
                                    ].map((value) => (
                                        <option key={value}>{value}</option>
                                    ))}
                                </select>
                            </label>
                            <div>
                                {remainingWorks.map((work) => (
                                    <button
                                        key={work.id}
                                        type="button"
                                        onClick={() => selectWork(work)}
                                        className={
                                            selectedWork?.id === work.id ? "is-selected" : ""
                                        }
                                    >
                                        <div className="original-outcome-ranking-thumb">
                                            {work.cover && (
                                                <SmartImage
                                                    src={normalizeExternalImageUrl(work.cover, 360)}
                                                    alt=""
                                                    type="image"
                                                    className="h-full w-full"
                                                    imageClassName="h-full w-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <span>{getPodiumRank(work) ? work.rank : "—"}</span>
                                        <div>
                                            <strong>{work.displayTitle || work.title}</strong>
                                            <small>
                                                {work.award} · {work.author}
                                            </small>
                                        </div>
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                ))}
                            </div>
                            {!remainingWorks.length && (
                                <p>
                                    {t(
                                        works.length
                                            ? "firstEdition.noMatch"
                                            : "eventWorkspace.noWorks"
                                    )}
                                </p>
                            )}
                            <p className="original-outcome-ranking-hint">
                                {t("hackathon.outcome_archive.ranking_hint")}
                                <ArrowRight className="h-3.5 w-3.5" />
                            </p>
                        </div>
                    </div>
                    <footer id="showcase-support" className="original-outcome-credits">
                        <OutcomeField className="is-support" />
                        <div className="original-outcome-credits-head">
                            <div className="original-outcome-credits-index">
                                <span>{t("hackathon.outcome_archive.support_eyebrow")}</span>
                                <strong>{partnerCount}</strong>
                                <small>{t("hackathon.outcome_archive.support_partner_unit")}</small>
                            </div>
                            <div className="original-outcome-credits-lead">
                                <div>
                                    <strong>04</strong>
                                    <h3>{t("hackathon.outcome_archive.support_title")}</h3>
                                </div>
                                <p>{t("hackathon.outcome_archive.support_statement")}</p>
                                <p className="original-outcome-credits-deck">
                                    {t("hackathon.outcome_archive.support_enterprise_desc")}
                                </p>
                            </div>
                        </div>

                        <section
                            id="showcase-enterprise-support"
                            className="original-outcome-enterprise-stage"
                        >
                            <header>
                                <div>
                                    <span>Enterprise Backers</span>
                                    <h4>{t("firstEdition.partnerRoles.technology")}</h4>
                                </div>
                                <strong>
                                    {String(enterpriseLogos?.length || 0).padStart(2, "0")}
                                </strong>
                            </header>
                            <div className="original-outcome-enterprise-logos">
                                {(enterpriseLogos || []).map((logo, logoIndex) => {
                                    const logoSrc = getPartnerLogoSrc(logo, isDayMode);
                                    const logoName = logo.displayName;
                                    return (
                                        <div key={logo.id || logo.src || logo.name}>
                                            <span aria-hidden="true">
                                                {String(logoIndex + 1).padStart(2, "0")}
                                            </span>
                                            {logoSrc ? (
                                                <img
                                                    src={logoSrc}
                                                    alt={
                                                        logo.alt || `${logoName || "Partner"} logo`
                                                    }
                                                    className={
                                                        !isDayMode ? logo.darkClassName || "" : ""
                                                    }
                                                />
                                            ) : (
                                                <strong>{logoName}</strong>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <div
                            id="showcase-campus-support"
                            className="original-outcome-support-network"
                        >
                            <div className="original-outcome-support-network-intro">
                                <span>{t("hackathon.outcome_archive.support_network_label")}</span>
                                <h4>{t("hackathon.outcome_archive.support_lineup")}</h4>
                                <p>{t("hackathon.outcome_archive.support_network_desc")}</p>
                                <strong>
                                    {t("hackathon.outcome_archive.support_count", {
                                        count: partnerCount,
                                    })}
                                </strong>
                            </div>
                            <div className="original-outcome-credits-groups">
                                {communitySupportGroups.map((group, groupIndex) => (
                                    <section key={group.id}>
                                        <header>
                                            <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                                            <div>
                                                <p>{group.id.toUpperCase()}</p>
                                                <h4>{group.label}</h4>
                                            </div>
                                        </header>

                                        <div>
                                            {(group.partners || []).map((partner, partnerIndex) => {
                                                const partnerLogoSrc = getPartnerLogoSrc(
                                                    partner,
                                                    isDayMode
                                                );
                                                const partnerName = partner.displayName;
                                                return (
                                                    <span
                                                        key={partner.id || partner.name}
                                                        className={partnerLogoSrc ? "has-logo" : ""}
                                                    >
                                                        <small>
                                                            {String(partnerIndex + 1).padStart(
                                                                2,
                                                                "0"
                                                            )}
                                                        </small>
                                                        {partnerLogoSrc ? (
                                                            <img
                                                                src={partnerLogoSrc}
                                                                alt={`${partnerName} logo`}
                                                            />
                                                        ) : null}
                                                        <strong>{partnerName}</strong>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </div>
                    </footer>
                </section>
            </div>

            <VideoDialog
                video={officialVideo}
                open={videoOpen}
                onClose={() => setVideoOpen(false)}
                t={t}
            />
            <MobileWorkDetail
                work={selectedWork}
                open={mobileWorkOpen}
                onClose={closeMobileWork}
                t={t}
            />

            <style>{`
                .first-edition-original{
                    --x-lime:#b9ff18;
                    --x-lime-soft:#dcff72;
                    --x-ink:#020806;
                    --x-surface:#07100b;
                    --x-text:#f7f8f2;
                    --x-muted:#a8b0a6;
                    position:relative;
                    isolation:isolate;
                    min-height:100svh;
                    overflow:hidden;
                    padding:clamp(8.4rem,11vw,10rem) 0 calc(var(--mobile-content-bottom-padding,0px) + 4rem);
                    color:var(--x-text);
                    background:var(--x-ink);
                    font-family:"HarmonyOS Sans SC","MiSans","PingFang SC",system-ui,sans-serif;
                }
                .original-outcome-x-field{position:absolute;z-index:-1;inset:0 0 auto 0;height:min(1120px,100svh);pointer-events:none;overflow:hidden}
                .original-outcome-x-field img{width:100%;height:100%;object-fit:cover;object-position:center top;filter:saturate(1.08) contrast(1.05)}
                .first-edition-original-inner{width:min(1720px,calc(100% - 5.75rem));margin:0 auto}
                .original-outcome-overview,.original-outcome-archive,.original-outcome-works{position:relative;isolation:isolate;padding:0 0 clamp(4rem,7vw,7rem)}
                .original-outcome-section-field{position:absolute;z-index:-2;inset:0 calc((100vw - min(1480px,calc(100vw - 4rem)))/-2) auto;height:min(1080px,100svh);overflow:hidden;pointer-events:none;opacity:.58}
                .original-outcome-section-field img{width:100%;height:100%;object-fit:cover;filter:saturate(1.1) contrast(1.04)}
                .original-outcome-section-field.is-archive img{object-position:60% top}
                .original-outcome-section-field.is-works{top:1rem;opacity:.38}.original-outcome-section-field.is-works img{object-position:72% center}
                .original-outcome-section-field.is-support{inset:0;z-index:-1;width:100%;height:100%;opacity:.52}.original-outcome-section-field.is-support img{object-position:72% top}
                .original-outcome-archive,.original-outcome-works,.original-outcome-support{scroll-margin-top:5.25rem}
                .original-outcome-overview{min-height:900px;display:flex;align-items:flex-start;padding-bottom:2rem}
                .original-outcome-overview-grid{display:grid;width:100%;min-height:min(766px,calc(100svh - 8.15rem));grid-template-columns:minmax(0,.96fr) minmax(0,1.04fr);gap:clamp(1.25rem,2.2vw,2.75rem);align-items:stretch}
                .original-outcome-hero-copy{position:relative;z-index:2;align-self:start;padding:2.75rem 0 0}
                .original-outcome-date-line{margin:0;color:var(--x-lime);font-size:1rem;font-weight:900;letter-spacing:.045em}
                .original-outcome-hero-copy h1{display:grid;row-gap:1.4rem;margin:0;font-size:clamp(6rem,8.65vw,8rem);font-weight:950;line-height:.84;letter-spacing:-.04em;text-shadow:0 10px 40px rgba(0,0,0,.32)}
                .original-outcome-hero-copy h1>span{display:block;width:max-content;max-width:none;transform:scaleX(.963);transform-origin:left center;white-space:nowrap}
                .original-outcome-hero-copy h1 .is-accent{color:var(--x-lime)}
                .original-outcome-title-rule{width:min(100%,46rem);height:1px;margin:3rem 0 1.05rem;background:rgba(185,255,24,.48)}
                .original-outcome-overview-name{margin:1.45rem 0 0;color:var(--x-text);font-size:1.05rem;font-weight:900;letter-spacing:.03em}
                .original-outcome-description{max-width:620px;margin:1rem 0 0;color:rgba(247,248,242,.7);font-size:.85rem;font-weight:650;line-height:1.85}
                .original-outcome-stat-grid{display:grid;width:min(100%,594px);grid-template-columns:repeat(4,1fr);margin-top:6.4rem;border-block:0}
                .original-outcome-stat-grid>div{position:relative;padding:1rem 1rem 1rem 0}
                .original-outcome-stat-grid>div:not(:last-child)::after{content:"";position:absolute;right:.7rem;top:24%;height:52%;width:1px;background:rgba(185,255,24,.34)}
                .original-outcome-stat-grid strong{display:block;color:var(--x-lime);font:900 clamp(1.9rem,2.65vw,2.8rem)/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .original-outcome-stat-grid small{margin-left:.28rem;font-size:.78rem;color:var(--x-text)}
                .original-outcome-stat-grid span{display:block;margin-top:.62rem;color:var(--x-muted);font-size:.74rem;font-weight:800}
                .original-outcome-primary-actions{display:flex;gap:1rem;margin-top:2.9rem}
                .original-outcome-primary-actions button,.original-outcome-primary-actions>a,.original-outcome-section-topline>a,.original-outcome-section-topline>button,.original-outcome-work-detail-actions a{display:inline-flex;min-height:50px;align-items:center;justify-content:center;gap:.65rem;padding:.76rem 1.2rem;border:1px solid rgba(185,255,24,.48);border-radius:11px;background:rgba(2,8,6,.35);color:inherit;font-size:.8rem;font-weight:900;transition:transform .2s ease,background-color .2s ease,border-color .2s ease}
                .original-outcome-primary-actions button,.original-outcome-primary-actions>a{min-width:13.25rem;min-height:64px;border-radius:2px;font-size:1rem}
                .original-outcome-primary-actions button:first-child{border-color:var(--x-lime);background:var(--x-lime);color:#071006}
                .original-outcome-primary-actions button:hover,.original-outcome-primary-actions>a:hover,.original-outcome-section-topline>a:hover,.original-outcome-section-topline>button:hover,.original-outcome-work-detail-actions a:hover{transform:translateY(-2px);border-color:var(--x-lime);background:rgba(185,255,24,.12)}
                .original-outcome-primary-actions button:first-child:hover{background:var(--x-lime-soft)}
                .original-outcome-film{position:relative;z-index:1;align-self:end;width:calc(100% + 5.5vw);margin-right:calc((100vw - min(1720px,calc(100vw - 5.75rem)))/-2);margin-left:-.8vw;padding-bottom:0}
                .original-outcome-film-frame{width:100%;aspect-ratio:16/8.4;overflow:hidden;padding:1px;background:rgba(185,255,24,.72);clip-path:polygon(18% 0,100% 0,100% 100%,0 100%);filter:drop-shadow(0 26px 34px rgba(0,0,0,.5))}
                .original-outcome-film button{position:relative;display:block;width:100%;height:100%;overflow:hidden;border:0;background:var(--x-surface);padding:0;clip-path:inherit}
                @supports (clip-path:shape(from 0 0,line to 100% 0,line to 100% 100%,close)){
                    .original-outcome-film-frame,.original-outcome-film button{clip-path:shape(from 19% 0,line to 100% 0,line to 100% 100%,line to 2% 100%,curve to 0 94% with 0 98%,line to 15% 10%,curve to 19% 0 with 16.5% 1%,close)}
                }
                .original-outcome-film button img{transition:transform .7s cubic-bezier(.2,.65,.2,1)}
                .original-outcome-film button:hover img{transform:scale(1.018)}
                .original-outcome-film-play{display:none}
                .original-outcome-film-caption{display:none}
                .original-outcome-film-caption span{color:var(--x-lime);font-weight:900;letter-spacing:.12em;text-transform:uppercase}
                .original-outcome-film-caption strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--x-muted)}
                .original-outcome-next-section{position:absolute;z-index:3;right:0;bottom:.35rem;left:0;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:2rem;color:var(--x-text)}
                .original-outcome-next-section>div{display:grid;grid-template-columns:minmax(10rem,1fr) auto minmax(10rem,1fr);align-items:center;gap:1.5rem}
                .original-outcome-next-section>div::before,.original-outcome-next-section>div::after{content:"";height:1px;background:rgba(185,255,24,.42)}
                .original-outcome-next-section span{color:var(--x-lime);font:300 3.1rem/.9 ui-monospace,SFMono-Regular,Menlo,monospace}
                .original-outcome-next-section strong{white-space:nowrap;font-size:1.05rem;letter-spacing:.02em}
                .original-outcome-next-section a{display:flex;align-items:center;gap:.75rem;color:var(--x-muted);font-size:.7rem;font-weight:850;white-space:nowrap}
                .original-outcome-section-heading{display:flex;align-items:flex-end;gap:1.05rem;padding:1rem 0 1.5rem}
                .original-outcome-section-heading>span{color:var(--x-lime);font:300 clamp(3.8rem,7vw,6.8rem)/.72 ui-monospace,SFMono-Regular,Menlo,monospace}
                .original-outcome-section-heading p{margin:0 0 .38rem;color:var(--x-lime);font-size:.64rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
                .original-outcome-section-heading h2{margin:0;font-size:clamp(1.2rem,2vw,1.8rem);font-weight:950;letter-spacing:-.035em}
                .original-outcome-section-topline{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;border-top:1px solid rgba(185,255,24,.35)}
                .original-outcome-section-topline::after{content:"";position:absolute;right:0;top:-1px;width:clamp(70px,13vw,190px);height:1px;background:var(--x-lime)}
                .original-outcome-section-topline .original-outcome-section-heading{padding-bottom:1.25rem}
                .original-outcome-section-topline>a,.original-outcome-section-topline>button{margin-bottom:1.25rem}
                .original-outcome-archive{min-height:780px;padding-top:8rem;padding-bottom:3rem}
                .original-outcome-archive-stage{display:grid;grid-template-columns:minmax(300px,.49fr) minmax(0,1.51fr);gap:clamp(1.5rem,3.5vw,3.5rem);align-items:start}
                .original-outcome-archive-intro{align-self:start;padding-top:2rem}
                .original-outcome-archive-intro .original-outcome-section-heading{display:block;padding:0}
                .original-outcome-archive-intro .original-outcome-section-heading>span{display:block;font-size:clamp(6.5rem,10vw,10rem);line-height:.72}
                .original-outcome-archive-intro .original-outcome-section-heading>div{display:flex;flex-direction:column;margin-top:2rem}
                .original-outcome-archive-intro .original-outcome-section-heading p{order:2;margin:.85rem 0 0}
                .original-outcome-archive-intro .original-outcome-section-heading h2{order:1;font-size:clamp(3rem,5.25vw,5.25rem);line-height:1;letter-spacing:-.04em}
                .original-outcome-archive-intro>a{display:inline-flex;min-width:18.75rem;min-height:58px;align-items:center;justify-content:center;gap:.8rem;margin-top:4.75rem;padding:.8rem 1rem;border:1px solid rgba(185,255,24,.5);border-radius:2px;color:inherit;font-size:.88rem;font-weight:900;transition:transform .2s ease,border-color .2s ease,background-color .2s ease}
                .original-outcome-archive-intro>a:hover{transform:translateY(-2px);border-color:var(--x-lime);background:rgba(185,255,24,.1)}
                .original-outcome-archive-feature{min-width:0;margin:0}
                .original-outcome-archive-feature>a{display:block;aspect-ratio:16/7.05;overflow:hidden;padding:1px;border-radius:18px 2px 18px 2px;background:rgba(185,255,24,.72);clip-path:polygon(12% 0,100% 0,100% 100%,0 100%)}
                .original-outcome-archive-feature>a>div{clip-path:inherit}
                @supports (clip-path:shape(from 0 0,line to 100% 0,line to 100% 100%,close)){
                    .original-outcome-archive-feature>a,.original-outcome-archive-feature>a>div{clip-path:shape(from 12% 0,line to 100% 0,line to 100% 100%,line to 3% 100%,curve to 0 91% with 0 97%,line to 9% 12%,curve to 12% 0 with 10% 1%,close)}
                }
                .original-outcome-archive-feature figcaption,.original-outcome-photo-strip figcaption{display:grid;grid-template-columns:2rem minmax(0,1fr);gap:.4rem;padding:.78rem .05rem;border-bottom:1px solid rgba(247,248,242,.13)}
                .original-outcome-archive-feature figcaption span,.original-outcome-photo-strip figcaption span{color:var(--x-lime);font:800 .68rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
                .original-outcome-archive-feature figcaption strong,.original-outcome-photo-strip figcaption strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}
                .original-outcome-archive-feature figcaption,.original-outcome-photo-strip figcaption{display:none}
                .original-outcome-photo-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(.55rem,.72vw,.8rem);margin:4rem 0 0}
                .original-outcome-photo-strip figure{min-width:0;margin:0}
                .original-outcome-photo-strip figure>a{display:block;aspect-ratio:1.28/1;overflow:hidden;padding:1px;border-radius:14px 4px 14px 4px;background:rgba(185,255,24,.65);clip-path:polygon(7% 0,100% 0,100% 88%,93% 100%,0 100%,0 12%)}
                .original-outcome-photo-strip img{transition:transform .55s ease}
                .original-outcome-photo-strip a:hover img{transform:scale(1.025)}
                .original-outcome-empty-line{min-height:210px;display:grid;place-items:center;border-block:1px solid rgba(247,248,242,.13);font-weight:800;opacity:.48}
                .original-outcome-works{padding-top:clamp(1.5rem,3vw,3rem)}
                .original-outcome-works .original-outcome-section-heading>span{font-size:clamp(5.5rem,8vw,8rem)}
                .original-outcome-works .original-outcome-section-heading h2{font-size:clamp(2.35rem,4vw,4.25rem);line-height:1;letter-spacing:-.04em}
                .original-outcome-works .original-outcome-section-heading>div{display:flex;flex-direction:column}
                .original-outcome-works .original-outcome-section-heading h2{order:1}.original-outcome-works .original-outcome-section-heading p{order:2;margin:.55rem 0 0}
                .original-outcome-works .original-outcome-section-topline{align-items:center}
                .original-outcome-works .original-outcome-section-topline>button{border-color:var(--x-lime);background:var(--x-lime);color:#071006}
                .original-outcome-works .original-outcome-section-topline>button{margin-bottom:0}
                .original-outcome-works .original-outcome-section-topline>button:hover{background:var(--x-lime-soft);color:#071006}
                .original-outcome-works-layout{display:grid;grid-template-columns:minmax(0,1.03fr) minmax(420px,.97fr);gap:clamp(1.5rem,2.5vw,2.6rem);align-items:start}
                .original-outcome-works-layout h3{margin:0 0 1rem;font-size:.76rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
                .original-outcome-podium{grid-column:1/-1;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:.65rem;margin-bottom:1.25rem}
                .original-outcome-podium>h3{grid-column:1/-1;margin:0;padding-bottom:.72rem;border-bottom:1px solid rgba(185,255,24,.38)}
                .original-outcome-podium>button{position:relative;width:100%;display:grid;grid-template-columns:3.6rem minmax(0,1fr);align-items:center;gap:.7rem;overflow:hidden;padding:0 .25rem .7rem;border:0;border-bottom:1px solid rgba(247,248,242,.22);border-radius:0;background:transparent;color:inherit;text-align:left;transition:transform .25s ease,border-color .25s ease,background-color .25s ease}
                .original-outcome-podium>button:hover{transform:translateY(-4px);border-color:rgba(185,255,24,.62);background:rgba(185,255,24,.035)}
                .original-outcome-podium>button.is-selected{border-color:var(--x-lime);background:rgba(185,255,24,.045)}
                .original-outcome-podium>button:focus-visible,.original-outcome-ranking button:focus-visible{outline:2px solid var(--x-lime);outline-offset:3px}
                .original-outcome-podium-thumb{grid-column:1/-1;width:100%;margin:0 0 .1rem;aspect-ratio:2.7/1;overflow:hidden;border-radius:7px 2px 7px 2px;background:var(--x-surface)}
                .original-outcome-podium>button>span{align-self:start;color:var(--x-lime);font:300 clamp(2.2rem,3.25vw,3.45rem)/.85 ui-monospace,SFMono-Regular,Menlo,monospace}
                .original-outcome-podium em,.original-outcome-podium strong,.original-outcome-podium small{display:block}
                .original-outcome-podium em{margin-bottom:.28rem;color:var(--x-lime);font-size:.58rem;font-style:normal;font-weight:900}
                .original-outcome-podium strong{font-size:clamp(.78rem,1vw,.96rem);line-height:1.28}
                .original-outcome-podium small{margin-top:.35rem;font-size:.63rem;color:var(--x-muted)}
                @media(min-width:768px){
                    .original-outcome-podium>button:first-of-type{grid-template-columns:8.5rem minmax(0,1fr);grid-template-rows:1fr auto;align-items:end}
                    .original-outcome-podium>button:first-of-type .original-outcome-podium-thumb{grid-column:2;grid-row:1/3;height:180px;min-height:0;aspect-ratio:auto;margin:0}
                    .original-outcome-podium>button:first-of-type>span{grid-column:1;grid-row:1;align-self:end}
                    .original-outcome-podium>button:first-of-type>div{grid-column:1;grid-row:2;align-self:start;padding-bottom:.15rem}
                }
                .original-outcome-ranking{grid-column:2;position:sticky;top:5.5rem;padding-left:.35rem;border-left:1px solid rgba(247,248,242,.14)}
                .original-outcome-ranking>div{max-height:345px;overflow-y:auto;border-top:1px solid rgba(247,248,242,.16);scrollbar-width:thin;scrollbar-color:rgba(185,255,24,.45) transparent}
                .original-outcome-ranking button{width:100%;display:grid;grid-template-columns:clamp(78px,6.2vw,98px) 2.25rem minmax(0,1fr) 1.1rem;align-items:center;gap:clamp(.6rem,1vw,.9rem);padding:.5rem .25rem .5rem 0;border:0;border-bottom:1px solid rgba(247,248,242,.12);background:transparent;color:inherit;text-align:left;transition:background-color .2s ease,color .2s ease,transform .2s ease}
                .original-outcome-ranking button:hover,.original-outcome-ranking button.is-selected{transform:translateX(.25rem);background:rgba(185,255,24,.08);color:var(--x-lime-soft)}
                .original-outcome-ranking-thumb{aspect-ratio:16/9;overflow:hidden;border-radius:6px;background:var(--x-surface)}
                .original-outcome-ranking button>span{color:var(--x-lime);font:850 clamp(.8rem,1vw,1rem)/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .original-outcome-ranking button>div:nth-of-type(2){min-width:0}
                .original-outcome-ranking strong,.original-outcome-ranking small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
                .original-outcome-ranking strong{font-size:clamp(.8rem,1vw,.95rem)}
                .original-outcome-ranking small{margin-top:.34rem;font-size:.63rem;color:var(--x-muted)}
                .original-outcome-ranking-hint{display:flex;align-items:center;gap:.5rem;margin:.8rem 0 0;color:var(--x-lime);font-size:.68rem;font-weight:900}
                .original-outcome-work-detail{grid-column:1;overflow:visible;border:0;border-right:1px solid rgba(247,248,242,.16);border-radius:0;background:transparent;padding:0 1.35rem 0 .1rem}
                .original-outcome-work-detail:not(.is-compact){max-height:none;overflow:visible}
                .original-outcome-work-detail-head{display:grid;grid-template-columns:5.1rem minmax(0,1fr);gap:.8rem;align-items:end;padding-bottom:.7rem;border-bottom:1px solid rgba(185,255,24,.26)}
                .original-outcome-work-detail-head>span,.original-outcome-work-detail-head p{color:var(--x-lime)}
                .original-outcome-work-detail-head>span{font:300 clamp(2.4rem,3.5vw,3.6rem)/.78 ui-monospace,SFMono-Regular,Menlo,monospace}
                .original-outcome-work-detail-head p{margin:0;font-size:.58rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
                .original-outcome-work-detail-head h3{margin:.28rem 0 0;font-size:clamp(1.2rem,1.8vw,1.72rem);line-height:1.08;letter-spacing:-.035em;text-transform:none}
                .original-outcome-work-detail-body{display:grid;grid-template-columns:minmax(0,1.52fr) minmax(158px,.48fr);gap:1.15rem;margin-top:.85rem;align-items:start}
                .original-outcome-work-detail-image{aspect-ratio:1.5/1;overflow:hidden;border-radius:12px 2px 12px 2px;background:var(--x-surface)}
                .original-outcome-work-detail-copy{min-width:0}
                .original-outcome-work-detail-meta{display:grid;grid-template-columns:1fr;margin:0}
                .original-outcome-work-detail-meta>div{padding:.48rem .05rem;border-bottom:1px solid rgba(247,248,242,.12)}
                .original-outcome-work-detail-meta>div+div{padding-left:.1rem;border-left:0}
                .original-outcome-work-detail-meta dt{font-size:.58rem;font-weight:900;opacity:.45;text-transform:uppercase}
                .original-outcome-work-detail-meta dd{margin:.32rem 0 0;font-size:.76rem;font-weight:850}
                .original-outcome-work-detail section{margin-top:.72rem}
                .original-outcome-work-detail h4{margin:0;font-size:.72rem;font-weight:950}
                .original-outcome-work-detail section p,.original-outcome-work-detail blockquote{margin:.42rem 0 0;color:rgba(247,248,242,.68);font-size:.7rem;line-height:1.7}
                .original-outcome-work-detail blockquote{padding-left:1rem;border-left:1px solid var(--x-lime)}
                .original-outcome-work-detail-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:.75rem}
                .original-outcome-work-detail-actions a{min-height:42px;padding:.58rem .85rem;font-size:.68rem}
                .original-outcome-credits{position:relative;isolation:isolate;display:grid;min-height:calc(100svh - 5.25rem);overflow:hidden;margin-top:clamp(5rem,9vw,9rem);padding:clamp(6.8rem,7.8vw,7.7rem) 0 clamp(3rem,4.4vw,4rem);border-top:1px solid rgba(185,255,24,.72);background:transparent}
                .original-outcome-credits-head{position:relative;z-index:1;display:grid;grid-template-columns:minmax(220px,.36fr) minmax(0,.64fr);gap:clamp(2.5rem,6vw,6.5rem);align-items:end;padding-bottom:clamp(2rem,3vw,3.2rem);border-bottom:1px solid rgba(247,248,242,.22);animation:support-matrix-rise .72s cubic-bezier(.16,1,.3,1) both}
                .original-outcome-credits-index{display:flex;min-width:0;flex-wrap:wrap;align-items:flex-end;gap:.35rem 1rem;padding-right:clamp(1.5rem,4vw,4rem);border-right:1px solid rgba(185,255,24,.4)}
                .original-outcome-credits-index>span,.original-outcome-enterprise-stage header span,.original-outcome-support-network-intro>span{display:block;width:100%;color:var(--x-lime);font-size:.65rem;font-weight:950;letter-spacing:.17em;text-transform:uppercase}
                .original-outcome-credits-index>strong{color:var(--x-lime);font:300 clamp(8.8rem,13.5vw,13.2rem)/.68 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.09em;text-shadow:0 0 42px rgba(185,255,24,.12)}
                .original-outcome-credits-index>small{margin-bottom:.3rem;color:rgba(247,248,242,.68);font-size:.72rem;font-weight:900;letter-spacing:.08em}
                .original-outcome-credits-lead{min-width:0;padding-bottom:.2rem}
                .original-outcome-credits-lead>div{display:grid;grid-template-columns:auto minmax(0,1fr);gap:1.4rem;align-items:baseline}
                .original-outcome-credits-lead>div>strong{color:var(--x-lime);font:300 clamp(3rem,4.2vw,4.15rem)/.8 ui-monospace,SFMono-Regular,Menlo,monospace}
                .original-outcome-credits-lead>div>strong::after{content:"/";display:inline-block;margin-left:.65rem;color:rgba(185,255,24,.45);font-size:.42em;vertical-align:.45em}
                .original-outcome-credits-lead h3{margin:0;font-size:clamp(3.65rem,5.4vw,5.6rem);font-weight:950;line-height:.9;letter-spacing:-.055em}
                .original-outcome-credits-lead>p:not(.original-outcome-credits-deck){max-width:740px;margin:1.3rem 0 0;color:rgba(247,248,242,.88);font-size:clamp(1.08rem,1.55vw,1.42rem);font-weight:850;line-height:1.4}
                .original-outcome-credits-deck{max-width:45rem;margin:.8rem 0 0;color:var(--x-muted);font-size:.72rem;line-height:1.75}
                .original-outcome-enterprise-stage{position:relative;z-index:1;margin-top:clamp(1.9rem,2.8vw,2.7rem);padding:0;border:0;border-radius:0;background:transparent;animation:support-matrix-rise .78s .08s cubic-bezier(.16,1,.3,1) both}
                .original-outcome-enterprise-stage>header{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2rem;align-items:end}
                .original-outcome-enterprise-stage h4{margin:.58rem 0 0;font-size:clamp(1.35rem,1.8vw,1.75rem);line-height:1.05;letter-spacing:-.03em}
                .original-outcome-enterprise-stage>header>strong{color:var(--x-lime);font:300 clamp(2.5rem,3.6vw,3.55rem)/.78 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.06em}
                .original-outcome-enterprise-logos{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));margin-top:1.25rem;border-top:1px solid rgba(185,255,24,.4);border-left:1px solid rgba(247,248,242,.16);background:rgba(2,8,6,.36);backdrop-filter:blur(3px)}
                .original-outcome-enterprise-logos>div{position:relative;display:flex;min-width:0;min-height:92px;align-items:center;justify-content:center;padding:1.25rem .8rem .85rem;border-right:1px solid rgba(247,248,242,.16);border-bottom:1px solid rgba(247,248,242,.16);background:linear-gradient(180deg,rgba(185,255,24,.035),rgba(2,8,6,.08));transition:background-color .25s ease,transform .25s ease}
                .original-outcome-enterprise-logos>div:hover{z-index:1;transform:translateY(-3px);background:rgba(185,255,24,.075)}
                .original-outcome-enterprise-logos>div>span{position:absolute;left:.55rem;top:.48rem;color:rgba(185,255,24,.7);font:850 .52rem/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .original-outcome-enterprise-logos img{display:block;max-width:82%;max-height:34px;object-fit:contain;filter:drop-shadow(0 0 14px rgba(247,248,242,.08))}
                .original-outcome-enterprise-logos strong{font-size:.82rem;text-align:center}
                .original-outcome-support-network{position:relative;z-index:1;display:grid;grid-template-columns:minmax(250px,.37fr) minmax(0,.63fr);gap:clamp(2rem,4.8vw,5rem);margin-top:clamp(2rem,3vw,3rem);animation:support-matrix-rise .82s .16s cubic-bezier(.16,1,.3,1) both}
                .original-outcome-support-network-intro{align-self:stretch;padding:1.15rem clamp(1.5rem,3vw,3rem) 1.2rem 0;border-top:1px solid rgba(247,248,242,.24);border-bottom:1px solid rgba(247,248,242,.16)}
                .original-outcome-support-network-intro h4{margin:.72rem 0 0;font-size:clamp(1.8rem,3vw,3.1rem);line-height:1.03;letter-spacing:-.045em}
                .original-outcome-support-network-intro p{max-width:30rem;margin:1rem 0 0;color:var(--x-muted);font-size:.72rem;line-height:1.75}
                .original-outcome-support-network-intro>strong{display:block;margin-top:1.15rem;color:rgba(247,248,242,.86);font-size:.66rem;font-weight:900;letter-spacing:.04em}
                .original-outcome-credits-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;border-top:1px solid rgba(247,248,242,.24)}
                .original-outcome-credits-groups>section{min-width:0;padding:1.25rem 1.4rem 1.25rem 0;border-bottom:1px solid rgba(247,248,242,.16)}
                .original-outcome-credits-groups>section+section{padding-left:1.4rem;border-left:1px solid rgba(247,248,242,.16)}
                .original-outcome-credits-groups header{display:grid;grid-template-columns:2rem minmax(0,1fr);gap:.75rem;align-items:start}
                .original-outcome-credits-groups header>span,.original-outcome-credits-groups small{color:var(--x-lime);font:850 .65rem/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
                .original-outcome-credits-groups header p{margin:0;color:var(--x-muted);font-size:.58rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}
                .original-outcome-credits-groups h4{margin:.28rem 0 0;font-size:1.05rem;font-weight:950}
                .original-outcome-credits-groups section>p{min-height:3.3em;margin:.8rem 0 0;color:var(--x-muted);font-size:.66rem;line-height:1.65}
                .original-outcome-credits-groups section>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 1rem;margin-top:.75rem}
                .original-outcome-credits-groups section>div>span{display:grid;grid-template-columns:1.8rem minmax(0,1fr);gap:.5rem;align-items:baseline;padding:.52rem 0;border-bottom:1px solid rgba(247,248,242,.11)}
                .original-outcome-credits-groups section>div>span.has-logo{grid-template-columns:1.8rem 1.75rem minmax(0,1fr);align-items:center}
                .original-outcome-credits-groups section>div img{display:block;width:1.55rem;height:1.55rem;object-fit:contain;filter:drop-shadow(0 0 10px rgba(247,248,242,.1))}
                .original-outcome-credits-groups section>div strong{font-size:clamp(.76rem,.9vw,.9rem);line-height:1.4}
                @keyframes support-matrix-rise{from{transform:translateY(24px);clip-path:inset(0 0 100% 0)}to{transform:translateY(0);clip-path:inset(0)}}
                .original-outcome-video-dialog{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:1rem;background:rgba(0,0,0,.88);backdrop-filter:blur(12px)}
                .original-outcome-video-dialog article{position:relative;width:min(1120px,100%);overflow:hidden;border:1px solid rgba(185,255,24,.36);border-radius:16px;background:#000}
                .original-outcome-video-dialog video{display:block;width:100%;max-height:calc(100dvh - 2rem)}
                .original-outcome-video-dialog button{position:absolute;right:1rem;top:1rem;display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(255,255,255,.35);border-radius:50%;background:rgba(0,0,0,.68);color:#fff}
                .original-outcome-mobile-work{--x-ink:#020806;--x-text:#f7f8f2;--x-lime:#b9ff18;--x-lime-soft:#d6ff73;--x-surface:#08110d;--x-muted:#a8b0a6;position:fixed;inset:0;z-index:400;display:none;height:100dvh;isolation:isolate;background:var(--x-ink);color:var(--x-text)}
                .original-outcome-mobile-work-bar{display:flex;min-height:58px;align-items:center;justify-content:space-between;gap:1rem;padding:.6rem 1rem;border-bottom:1px solid rgba(185,255,24,.28)}
                .original-outcome-mobile-work-bar>div{display:flex;min-width:0;align-items:center;gap:.7rem}.original-outcome-mobile-work-bar span{color:var(--x-lime);font:900 .72rem/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .original-outcome-mobile-work-bar strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.82rem}
                .original-outcome-mobile-work-bar button{display:grid;width:40px;height:40px;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:transparent;color:#fff}
                .original-outcome-mobile-work-scroll{height:calc(100dvh - 58px);overflow-y:auto;padding:1rem 1rem calc(env(safe-area-inset-bottom) + 2rem)}
                @media(min-width:1121px){.original-outcome-archive{margin-top:0}}
                @media(max-width:1120px){
                    .first-edition-original{padding-top:7rem}
                    .original-outcome-overview{min-height:auto}
                    .original-outcome-overview-grid{min-height:auto;grid-template-columns:1fr}
                    .original-outcome-hero-copy{max-width:760px}
                    .original-outcome-title-rule{margin-top:2.6rem}
                    .original-outcome-hero-copy h1{row-gap:.8rem;font-size:clamp(5rem,9.6vw,6.8rem)}
                    .original-outcome-overview-name{margin-top:1.4rem}
                    .original-outcome-stat-grid{margin-top:3rem}
                    .original-outcome-primary-actions{margin-top:2.5rem}
                    .original-outcome-film{width:min(100%,900px);margin-right:0;margin-left:auto}
                    .original-outcome-next-section{display:none}
                    .original-outcome-works-layout{grid-template-columns:1fr}
                    .original-outcome-podium,.original-outcome-work-detail,.original-outcome-ranking{grid-column:1}
                    .original-outcome-ranking{position:relative;top:auto}
                    .original-outcome-work-detail{padding-right:0;border-right:0}
                    .original-outcome-ranking{padding-left:0;border-left:0}
                    .original-outcome-work-detail:not(.is-compact){position:relative;top:auto}
                    .original-outcome-credits-head{grid-template-columns:minmax(190px,.3fr) minmax(0,.7fr);gap:2.5rem}
                    .original-outcome-credits-index>strong{font-size:8.4rem}
                    .original-outcome-support-network{grid-template-columns:1fr}
                    .original-outcome-enterprise-logos{grid-template-columns:repeat(3,minmax(0,1fr))}
                }
                @media(max-width:767px){
                    .first-edition-original{padding-top:5.5rem}
                    .original-outcome-x-field{height:780px;opacity:.92}.original-outcome-x-field img{object-position:58% top}
                    .first-edition-original-inner{width:100%}
                    .original-outcome-overview,.original-outcome-archive,.original-outcome-works{padding-inline:1rem;padding-bottom:3.6rem}.original-outcome-overview{padding-bottom:2rem}
                    .original-outcome-overview-grid{gap:1.7rem}
                    .original-outcome-hero-copy{padding-top:.5rem}
                    .original-outcome-date-line{font-size:.82rem}
                    .original-outcome-hero-copy h1{row-gap:.2rem;font-size:clamp(3.15rem,14vw,4.1rem);line-height:.9;letter-spacing:-.04em}
                    .original-outcome-hero-copy h1:lang(en){font-size:clamp(2.55rem,11.35vw,3rem);letter-spacing:-.055em}
                    .original-outcome-title-rule{margin:1.4rem 0 .8rem}.original-outcome-overview-name{margin-top:1rem;font-size:.92rem}
                    .original-outcome-description{display:-webkit-box;overflow:hidden;-webkit-line-clamp:4;-webkit-box-orient:vertical;font-size:.84rem;line-height:1.78}
                    .original-outcome-stat-grid{grid-template-columns:repeat(2,1fr);margin-top:1.7rem}
                    .original-outcome-stat-grid>div:nth-child(2)::after{display:none}
                    .original-outcome-stat-grid>div{border-bottom:1px solid rgba(247,248,242,.1)}
                    .original-outcome-primary-actions{display:grid;grid-template-columns:1fr 1fr}.original-outcome-primary-actions button,.original-outcome-primary-actions>a{min-width:0;min-height:54px;font-size:.83rem}
                    .original-outcome-film{padding-bottom:0}
                    .original-outcome-film-frame{aspect-ratio:4/3;border-radius:28px 10px 28px 10px;clip-path:none;filter:drop-shadow(0 20px 30px rgba(0,0,0,.38))}
                    .original-outcome-film button{border-radius:27px 9px 27px 9px;clip-path:none}
                    .original-outcome-film-play{width:50px;height:50px}
                    .original-outcome-section-heading{gap:.65rem;padding-bottom:1.2rem}.original-outcome-section-heading>span{font-size:3.45rem}
                    .original-outcome-section-topline{align-items:flex-end}.original-outcome-section-topline>a,.original-outcome-section-topline>button{margin-bottom:1rem;min-height:42px;padding:.55rem .72rem}
                    .original-outcome-section-field{inset:0 -1rem auto;height:780px}.original-outcome-section-field.is-support{inset:0;width:100%;height:100%}
                    .original-outcome-archive{min-height:0;padding-top:3rem}
                    .original-outcome-archive-stage{grid-template-columns:1fr;gap:1.5rem}
                    .original-outcome-archive-intro .original-outcome-section-heading{display:flex;align-items:flex-end;padding-bottom:0}
                    .original-outcome-archive-intro .original-outcome-section-heading>span{font-size:4.3rem}
                    .original-outcome-archive-intro .original-outcome-section-heading>div{margin-top:0}
                    .original-outcome-archive-intro .original-outcome-section-heading h2{font-size:2rem}
                    .original-outcome-archive-intro{padding-top:0}
                    .original-outcome-archive-intro>a{width:100%;min-width:0;min-height:46px;margin-top:1.2rem}
                    .original-outcome-archive-feature>a{aspect-ratio:4/3;border-radius:16px 6px 16px 6px;clip-path:none}
                    .original-outcome-photo-strip{display:flex;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x mandatory;gap:.75rem;margin-inline:-1rem;padding:0 1rem .35rem;scrollbar-width:none}
                    .original-outcome-photo-strip::-webkit-scrollbar{display:none}.original-outcome-photo-strip figure{min-width:78vw;scroll-snap-align:start}.original-outcome-photo-strip figure>a{aspect-ratio:4/3;border-radius:12px;clip-path:none}
                    .original-outcome-works .original-outcome-section-topline{flex-wrap:wrap}
                    .original-outcome-works .original-outcome-section-heading{flex:1 1 100%;padding-bottom:0}
                    .original-outcome-works .original-outcome-section-heading>span{font-size:4.3rem}.original-outcome-works .original-outcome-section-heading h2{font-size:1.95rem;white-space:nowrap}
                    .original-outcome-works .original-outcome-section-topline>button{margin-left:auto}
                    .original-outcome-works-layout{grid-template-columns:1fr;gap:2rem}
                    .original-outcome-podium{grid-template-columns:1fr 1fr;gap:.75rem}
                    .original-outcome-podium>h3,.original-outcome-podium>button:first-of-type{grid-column:1/-1}
                    .original-outcome-podium>button{grid-template-columns:2.75rem minmax(0,1fr);padding:0 .35rem .85rem;border-radius:0}
                    .original-outcome-podium-thumb{width:100%;margin-inline:0;aspect-ratio:16/11.5}
                    .original-outcome-podium>button:first-of-type .original-outcome-podium-thumb{aspect-ratio:16/8.8}
                    .original-outcome-podium>button>span{font-size:2rem}
                    .original-outcome-podium strong{font-size:.8rem}.original-outcome-podium small{font-size:.61rem}
                    .original-outcome-ranking>div{max-height:none}.original-outcome-ranking-hint{display:none}.original-outcome-work-detail:not(.is-compact){display:none}.original-outcome-mobile-work{display:block}
                    .original-outcome-ranking button{grid-template-columns:76px 2rem minmax(0,1fr) 1rem;gap:.6rem;padding:.65rem 0}
                    .original-outcome-credits{margin-top:4rem;padding:4.6rem 1rem 2.6rem;border-radius:0}
                    .original-outcome-credits-head{grid-template-columns:5.6rem minmax(0,1fr);gap:1.25rem;align-items:start;padding-bottom:1.65rem}
                    .original-outcome-credits-index{display:block;padding-right:1rem;border-right-color:rgba(185,255,24,.32)}
                    .original-outcome-credits-index>span{font-size:.48rem;line-height:1.4;letter-spacing:.12em}
                    .original-outcome-credits-index>strong{display:block;margin-top:.8rem;font-size:4.45rem;line-height:.72;letter-spacing:-.1em}
                    .original-outcome-credits-index>small{display:block;margin-top:.85rem;font-size:.54rem;line-height:1.45}
                    .original-outcome-credits-lead>div{display:block}
                    .original-outcome-credits-lead>div>strong{font-size:1.25rem;line-height:1}
                    .original-outcome-credits-lead>div>strong::after{margin-left:.35rem;font-size:.65em;vertical-align:.18em}
                    .original-outcome-credits-lead h3{margin-top:.9rem;font-size:2.65rem;line-height:.93}
                    .original-outcome-credits-lead>p:not(.original-outcome-credits-deck){margin-top:1rem;font-size:.94rem;line-height:1.5}
                    .original-outcome-credits-deck{margin-top:.65rem;font-size:.68rem;line-height:1.65}
                    .original-outcome-enterprise-stage{margin-top:1.8rem}
                    .original-outcome-enterprise-stage>header{gap:1rem;align-items:end}
                    .original-outcome-enterprise-stage h4{font-size:1.35rem}
                    .original-outcome-enterprise-stage>header>strong{font-size:2.25rem}
                    .original-outcome-enterprise-logos{grid-template-columns:repeat(2,minmax(0,1fr))}
                    .original-outcome-enterprise-logos>div{min-height:76px;padding:1.2rem .6rem .7rem}
                    .original-outcome-enterprise-logos img{max-width:86%;max-height:26px}
                    .original-outcome-support-network{gap:1.35rem;margin-top:2.2rem}
                    .original-outcome-support-network-intro{padding-right:0;padding-bottom:1.25rem}
                    .original-outcome-support-network-intro h4{font-size:2.1rem}
                    .original-outcome-credits-groups{grid-template-columns:1fr}
                    .original-outcome-credits-groups>section{padding:1.2rem 0 1.4rem}
                    .original-outcome-credits-groups>section+section{padding-left:0;border-left:0}
                    .original-outcome-credits-groups section>p{min-height:0}
                    .original-outcome-credits-groups section>div{grid-template-columns:1fr}
                    .original-outcome-video-dialog{padding:0}.original-outcome-video-dialog article{border:0;border-radius:0}.original-outcome-video-dialog video{max-height:100dvh}
                    .original-outcome-work-detail.is-compact{border:0;padding:0;background:transparent}.original-outcome-work-detail-body{grid-template-columns:1fr}.original-outcome-work-detail.is-compact .original-outcome-work-detail-image{aspect-ratio:16/11}
                }
                @media(min-width:1121px) and (max-height:850px){
                    .first-edition-original{padding-top:7rem}
                    .original-outcome-overview{min-height:calc(100svh - 7rem);padding-bottom:1rem}
                    .original-outcome-overview-grid{min-height:calc(100svh - 9rem)}
                    .original-outcome-hero-copy{padding-top:.7rem}
                    .original-outcome-hero-copy h1{row-gap:.4rem;font-size:clamp(4.7rem,6vw,5.6rem);line-height:.96}
                    .original-outcome-title-rule{margin:1.9rem 0 .8rem}
                    .original-outcome-overview-name{margin-top:1rem}
                    .original-outcome-description{margin-top:.65rem;line-height:1.65}
                    .original-outcome-stat-grid{margin-top:2rem}
                    .original-outcome-primary-actions{margin-top:1.45rem}
                    .original-outcome-primary-actions button,.original-outcome-primary-actions>a{min-height:54px}
                    .original-outcome-credits{padding-top:6.3rem}
                    .original-outcome-credits-index>strong{font-size:8.5rem}
                    .original-outcome-credits-lead h3{font-size:4.25rem}
                    .original-outcome-enterprise-logos>div{min-height:78px}
                }
                @media(prefers-reduced-motion:reduce){.original-outcome-credits-head,.original-outcome-enterprise-stage,.original-outcome-support-network{animation:none}.original-outcome-enterprise-logos>div{transition:none}}
                @media(max-width:380px){.original-outcome-primary-actions{grid-template-columns:1fr}.original-outcome-section-topline>a,.original-outcome-section-topline>button{max-width:46%;font-size:.68rem}.original-outcome-stat-grid strong{font-size:1.22rem}}
                @media(prefers-reduced-motion:reduce){.first-edition-original *{scroll-behavior:auto!important;animation:none!important;transition-duration:.01ms!important}}
            `}</style>
        </div>
    );
};

export default HackathonOutcomeShowcase;
