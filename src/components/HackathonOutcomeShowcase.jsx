import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ExternalLink, Github, Play, Upload, X } from "lucide-react";

import CompetitionOutcomeUploadModal from "./CompetitionOutcomeUploadModal";
import SEO from "./SEO";
import SmartImage from "./SmartImage";
import { normalizeHackathonTemplate, splitHackathonTitle } from "../data/hackathonTemplate";
import { podiumWorks as fallbackPodiumWorks } from "../data/hackathonWorks";
import { getPartnerLogoSrc } from "../data/partnerLogos";
import { useSettings } from "../context/SettingsContext";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import { useBackClose, useBodyScrollLock } from "../hooks/useBackClose";
import api from "../services/api";
import { normalizeExternalImageUrl } from "../utils/imageUtils";

const FALLBACK_HERO = "/images/hero-campus-day-4k.jpg";
const FALLBACK_PHOTO = "/images/hero-landscape-day-4k.jpg";

const formatDate = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}` : String(value || "");
};

const normalizeRank = (rank, index) => {
    const value = String(rank || index + 1).trim();
    return /^\d+$/.test(value) ? value.padStart(2, "0") : value;
};

const stripWorkAwardPrefix = (title) =>
    String(title || "").replace(/^(?:冠军作品|亚军作品|季军作品)[：:]\s*/u, "");

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
    cover: work.cover_url || work.cover || (index % 2 === 0 ? FALLBACK_HERO : FALLBACK_PHOTO),
    gitUrl: work.git_url || work.gitUrl || "",
    summary: work.summary || work.description || "",
    highlight: work.highlight || "",
    experience: work.experience || work.highlight || "",
    grade: work.grade || "",
    major: work.major || "",
    storyFileUrl: work.story_file_url || work.storyFileUrl || "",
});

const WorkDetail = ({ work, t, compact = false, summaryOnly = false }) => {
    if (!work) return null;
    return (
        <article className={`outcome-work-detail ${compact ? "is-compact" : ""}`}>
            <div className="outcome-work-detail-head">
                <span>{work.rank}</span>
                <div>
                    <p>{getLocalizedHonorTitle(work, t)}</p>
                    <h3>{getLocalizedWorkTitle(work, t)}</h3>
                </div>
            </div>
            <div className="outcome-work-detail-body">
                <div className="outcome-work-detail-image">
                    <SmartImage
                        src={normalizeExternalImageUrl(work.cover, 1000)}
                        alt={t("hackathon.outcome_archive.work_cover_alt", { title: work.title })}
                        type="image"
                        className="h-full w-full"
                        imageClassName="h-full w-full object-cover"
                    />
                </div>
                <div className="outcome-work-detail-copy">
                    <dl className="outcome-work-detail-meta">
                        <div><dt>{t("hackathon.outcome_archive.author")}</dt><dd>{work.author}</dd></div>
                        <div><dt>{t("hackathon.outcome_archive.background")}</dt><dd>{[work.grade, work.major].filter(Boolean).join(" / ") || t("hackathon.outcome_archive.not_filled")}</dd></div>
                    </dl>
                    <section>
                        <h4>{t("hackathon.outcome_archive.work_intro")}</h4>
                        <p>{(summaryOnly && work.highlight) || work.summary || t("hackathon.outcome_archive.empty_intro")}</p>
                    </section>
                    {!summaryOnly && work.experience ? (
                        <section>
                            <h4>{t("hackathon.outcome_archive.experience")}</h4>
                            <blockquote>{work.experience}</blockquote>
                        </section>
                    ) : null}
                    <div className="outcome-work-detail-actions">
                        {work.gitUrl ? (
                            <a href={work.gitUrl} target="_blank" rel="noreferrer">
                                <Github className="h-4 w-4" />
                                {t("hackathon.outcome_archive.project_link")}
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        ) : null}
                        {work.storyFileUrl ? (
                            <a href={work.storyFileUrl} target="_blank" rel="noreferrer">
                                {t("hackathon.outcome_archive.story_file")}
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        ) : null}
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
                className="outcome-mobile-work"
                role="dialog"
                aria-modal="true"
                aria-label={t("hackathon.outcome_archive.work_dialog", { title: getLocalizedWorkTitle(work, t) })}
            >
                <div className="outcome-mobile-work-bar">
                    <div><span>{work.rank}</span><strong>{getLocalizedWorkTitle(work, t)}</strong></div>
                    <button type="button" onClick={onClose} aria-label={t("common.close")}>
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="outcome-mobile-work-scroll">
                    <WorkDetail work={work} t={t} compact />
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

const VideoDialog = ({ video, open, onClose, t }) => {
    useBackClose(open, onClose);
    useBodyScrollLock(open);
    if (!open || !video || typeof document === "undefined") return null;
    const source = video.url || video.video;
    const poster = video.cover_url || video.thumbnail || FALLBACK_HERO;
    return createPortal(
        <div className="outcome-video-dialog" role="dialog" aria-modal="true" onMouseDown={onClose}>
            <article onMouseDown={(event) => event.stopPropagation()}>
                <video src={source} poster={poster} controls autoPlay />
                <button type="button" onClick={onClose} aria-label={t("common.close")}>
                    <X className="h-5 w-5" />
                </button>
            </article>
        </div>,
        document.body
    );
};

const SectionNumber = ({ number, eyebrow, title, id }) => (
    <div className="outcome-section-heading">
        <span>{number}</span>
        <div>
            <p>{eyebrow}</p>
            <h2 id={id}>{title}</h2>
        </div>
    </div>
);

const OutcomeField = ({ className = "" }) => (
    <picture className={`outcome-section-field ${className}`} aria-hidden="true">
        <source media="(max-width: 767px)" srcSet="/images/hackathon/x-field-mobile.webp" />
        <img src="/images/hackathon/x-field-desktop.webp" alt="" />
    </picture>
);

const HackathonOutcomeShowcase = ({ template: templateInput }) => {
    const { t, i18n } = useTranslation();
    const { uiMode } = useSettings();
    const isDayMode = uiMode === "day";
    const [searchParams, setSearchParams] = useSearchParams();
    const template = useMemo(() => normalizeHackathonTemplate(templateInput || {}), [templateInput]);
    const event = template.event;
    const competitionSlug = template.results.competitionSlug;
    const useEnglishContent = i18n.resolvedLanguage?.startsWith("en");
    const titleParts = useEnglishContent
        ? [t("hackathon.hero.title_line_1"), t("hackathon.hero.title_line_2")]
        : splitHackathonTitle(event.title);
    const eventDescription = useEnglishContent
        ? t("hackathon.hero.description")
        : event.description;
    const eventLocation = useEnglishContent
        ? t("hackathon.event.location")
        : event.location;
    const [outcome, setOutcome] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploadType, setUploadType] = useState(null);
    const [videoOpen, setVideoOpen] = useState(false);
    const [mobileWorkOpen, setMobileWorkOpen] = useState(false);
    const { groups: partnerGroups, enterpriseLogos } = useEcosystemPartners();

    const loadOutcome = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get(
                `/competitions/${encodeURIComponent(competitionSlug)}/outcome`,
                { params: { stagePhotoLimit: 120, promoVideoLimit: 24, workLimit: 100 } }
            );
            setOutcome(response.data || null);
        } catch {
            setOutcome(null);
        } finally {
            setLoading(false);
        }
    }, [competitionSlug]);

    useEffect(() => {
        loadOutcome();
    }, [loadOutcome]);

    useEffect(() => {
        if (loading || typeof window === "undefined") return undefined;
        const targetId = window.location.hash.replace(/^#/, "");
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
    const works = useMemo(() => {
        const source = Array.isArray(outcome?.works) && outcome.works.length > 0
            ? outcome.works
            : fallbackPodiumWorks;
        const usingFallback = source === fallbackPodiumWorks;
        return source.map((work, index) =>
            normalizeWork(
                usingFallback
                    ? { ...work, award: "", honorTitle: "", title: "", author: "" }
                    : work,
                index,
                t
            )
        );
    }, [outcome, t]);
    const requestedWork = String(searchParams.get("work") || "").trim();
    const selectedWork =
        works.find((work) => String(work.id) === requestedWork) || works[0] || null;
    const podium = works.slice(0, 3);
    const remainingWorks = works.slice(3);

    const selectWork = (work) => {
        const next = new URLSearchParams(searchParams);
        next.set("work", String(work.id));
        setSearchParams(next);
        if (window.matchMedia?.("(max-width: 767px)").matches) setMobileWorkOpen(true);
    };

    const closeMobileWork = () => {
        setMobileWorkOpen(false);
        const next = new URLSearchParams(searchParams);
        next.delete("work");
        setSearchParams(next, { replace: true });
    };

    const heroCover =
        officialVideo?.cover_url || officialVideo?.thumbnail || photos[0]?.url || FALLBACK_HERO;
    const eventStats = useMemo(() => {
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
    }, [event.highlights, event.prizeUnit, event.prizeValue, t, useEnglishContent]);
    const partnerCount = (partnerGroups || []).reduce(
        (total, group) => total + (group.partners?.length || 0),
        0
    );
    const communitySupportGroups = (partnerGroups || []).filter(
        (group) => group.id !== "enterprise"
    );
    const useEnglishPartnerNames = useEnglishContent;

    return (
        <div className={`hackathon-outcome showcase-compact-flow ${isDayMode ? "is-day" : "is-dark"}`} data-showcase-page>
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
            <picture className="outcome-x-field" aria-hidden="true">
                <source
                    media="(max-width: 767px)"
                    srcSet="/images/hackathon/x-field-mobile.webp"
                />
                <img src="/images/hackathon/x-field-desktop.webp" alt="" />
            </picture>

            <main className="hackathon-outcome-inner">
                <section id="showcase-overview" className="outcome-overview" aria-labelledby="outcome-title">
                    <div className="outcome-overview-grid">
                        <div className="outcome-hero-copy">
                            <h1 id="outcome-title">
                                {titleParts.map((part, index) => (
                                    <span key={part} className={index === titleParts.length - 1 ? "is-accent" : ""}>
                                        {part}
                                    </span>
                                ))}
                            </h1>
                            <h2 className="sr-only" id="overview-heading">
                                {t("hackathon.outcome_archive.overview")}
                            </h2>
                            <div className="outcome-title-rule" aria-hidden="true" />
                            <p className="outcome-date-line">
                                {formatDate(event.startAt)} · {eventLocation}
                            </p>
                            <p className="outcome-overview-name">
                                {t("hackathon.outcome_archive.overview")}
                            </p>
                            <p className="outcome-description">{eventDescription}</p>
                            <div className="outcome-stat-grid">
                                {eventStats.map((stat) => (
                                    <div key={stat.id}>
                                        <strong>{stat.value}<small>{stat.unit}</small></strong>
                                        <span>{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="outcome-primary-actions">
                                <button type="button" onClick={() => setUploadType("stage_photo")}>
                                    <Upload className="h-4 w-4" />
                                    {t("hackathon.outcome_archive.submit")}
                                </button>
                                <button type="button" onClick={() => document.getElementById("showcase-works")?.scrollIntoView({ behavior: "smooth" })}>
                                    {t("hackathon.outcome_archive.view_works")}
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="outcome-film">
                            <div className="outcome-film-frame">
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
                                    {officialVideo ? <span className="outcome-film-play"><Play className="h-6 w-6" fill="currentColor" /></span> : null}
                                </button>
                            </div>
                            <div className="outcome-film-caption"><span>{t("hackathon.outcome_archive.official_film")}</span><strong>{officialVideo?.title || t("hackathon.outcome_archive.film_pending")}</strong></div>
                        </div>
                    </div>
                    <div className="outcome-next-section">
                        <div>
                            <span aria-hidden="true">02</span>
                            <strong>{t("hackathon.outcome_archive.archive_title")}</strong>
                        </div>
                        <Link to={`/media?event=${encodeURIComponent(competitionSlug)}`}>
                            {t("hackathon.outcome_archive.view_all_photos", { count: outcome?.stats?.stage_photos || photos.length })}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>

                <section id="showcase-archive" className="outcome-archive" aria-labelledby="archive-heading">
                    <OutcomeField className="is-archive" />
                    {photos.length > 0 ? (
                        <>
                            <div className="outcome-archive-stage">
                                <div className="outcome-archive-intro">
                                    <SectionNumber number="02" eyebrow={t("hackathon.outcome_archive.archive_eyebrow")} title={t("hackathon.outcome_archive.archive_title")} id="archive-heading" />
                                    <Link to={`/media?event=${encodeURIComponent(competitionSlug)}`}>
                                        {t("hackathon.outcome_archive.view_all_photos", { count: outcome?.stats?.stage_photos || photos.length })}
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                                <figure className="outcome-archive-feature">
                                    <Link to={`/media?event=${encodeURIComponent(competitionSlug)}&photo=${photos[0].source_id || photos[0].id}`}>
                                        <SmartImage
                                            src={normalizeExternalImageUrl(photos[0].url || photos[0].cover_url, 1400)}
                                            alt={photos[0].title}
                                            type="image"
                                            className="h-full w-full"
                                            imageClassName="h-full w-full object-cover"
                                        />
                                    </Link>
                                    <figcaption><span>01</span><strong>{photos[0].title}</strong></figcaption>
                                </figure>
                            </div>
                            <div className="outcome-photo-strip">
                            {photos.slice(1).map((photo, index) => (
                                <figure key={photo.id || `${photo.url}-${index}`}>
                                    <Link to={`/media?event=${encodeURIComponent(competitionSlug)}&photo=${photo.source_id || photo.id}`}>
                                        <SmartImage
                                            src={normalizeExternalImageUrl(photo.url || photo.cover_url, 900)}
                                            alt={photo.title}
                                            type="image"
                                            className="h-full w-full"
                                            imageClassName="h-full w-full object-cover"
                                        />
                                    </Link>
                                    <figcaption><span>{String(index + 2).padStart(2, "0")}</span><strong>{photo.title}</strong></figcaption>
                                </figure>
                            ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="outcome-archive-intro">
                                <SectionNumber number="02" eyebrow={t("hackathon.outcome_archive.archive_eyebrow")} title={t("hackathon.outcome_archive.archive_title")} id="archive-heading" />
                            </div>
                            <div className="outcome-empty-line">{loading ? t("hackathon.outcome_archive.loading") : t("hackathon.outcome_archive.no_photos")}</div>
                        </>
                    )}
                </section>

                <section id="showcase-works" className="outcome-works" aria-labelledby="works-heading">
                    <OutcomeField className="is-works" />
                    <div className="outcome-section-topline">
                        <SectionNumber number="03" eyebrow={t("hackathon.outcome_archive.works_eyebrow")} title={t("hackathon.outcome_archive.works_title")} id="works-heading" />
                        <button type="button" onClick={() => setUploadType("work")}>
                            {t("hackathon.outcome_archive.submit_work")}
                            <Upload className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="outcome-works-layout">
                        <div className="outcome-podium">
                            <h3>{t("hackathon.outcome_archive.top_three")}</h3>
                            {podium.map((work, index) => (
                                <button key={work.id} type="button" onClick={() => selectWork(work)} className={selectedWork?.id === work.id ? "is-selected" : ""}>
                                    <div className="outcome-podium-thumb"><SmartImage src={normalizeExternalImageUrl(work.cover, 500)} alt={work.title} type="image" className="h-full w-full" imageClassName="h-full w-full object-cover" /></div>
                                    <span>{work.rank}</span>
                                    <div>
                                        <em>{t(`hackathon.outcome_archive.podium_award_${index + 1}`)}</em>
                                        <strong>{work.displayTitle || work.title}</strong>
                                        <small>{work.award} · {work.author}</small>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <WorkDetail work={selectedWork} t={t} summaryOnly />
                        <div className="outcome-ranking">
                            <h3>{t("hackathon.outcome_archive.complete_ranking", { count: works.length })}</h3>
                            <div>
                                {(remainingWorks.length > 0 ? remainingWorks : podium).map((work) => (
                                    <button key={work.id} type="button" onClick={() => selectWork(work)} className={selectedWork?.id === work.id ? "is-selected" : ""}>
                                        <div className="outcome-ranking-thumb">
                                            <SmartImage src={normalizeExternalImageUrl(work.cover, 360)} alt="" type="image" className="h-full w-full" imageClassName="h-full w-full object-cover" />
                                        </div>
                                        <span>{work.rank}</span>
                                        <div><strong>{work.displayTitle || work.title}</strong><small>{work.author}</small></div>
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                ))}
                            </div>
                            <p className="outcome-ranking-hint">
                                {t("hackathon.outcome_archive.ranking_hint")}
                                <ArrowRight className="h-3.5 w-3.5" />
                            </p>
                        </div>
                    </div>
                    <footer id="showcase-support" className="outcome-credits">
                        <OutcomeField className="is-support" />
                        <div className="outcome-credits-head">
                            <div className="outcome-credits-index">
                                <span>{t("hackathon.outcome_archive.support_eyebrow")}</span>
                                <strong>{partnerCount}</strong>
                                <small>{t("hackathon.outcome_archive.support_partner_unit")}</small>
                            </div>
                            <div className="outcome-credits-lead">
                                <div>
                                    <strong>04</strong>
                                    <h3>{t("hackathon.outcome_archive.support_title")}</h3>
                                </div>
                                <p>{t("hackathon.outcome_archive.support_statement")}</p>
                                <p className="outcome-credits-deck">{t("hackathon.outcome_archive.support_enterprise_desc")}</p>
                            </div>
                        </div>

                        <section id="showcase-enterprise-support" className="outcome-enterprise-stage">
                            <header>
                                <div>
                                    <span>Enterprise Backers</span>
                                    <h4>{t("hackathon.outcome_archive.support_enterprise_title")}</h4>
                                </div>
                                <strong>{String(enterpriseLogos?.length || 0).padStart(2, "0")}</strong>
                            </header>
                            <div className="outcome-enterprise-logos">
                                {(enterpriseLogos || []).map((logo, logoIndex) => {
                                    const logoSrc = getPartnerLogoSrc(logo, isDayMode);
                                    const logoName = useEnglishPartnerNames
                                        ? logo.name_en || logo.name
                                        : logo.name;
                                    return (
                                        <div key={logo.id || logo.src || logo.name}>
                                            <span aria-hidden="true">{String(logoIndex + 1).padStart(2, "0")}</span>
                                            {logoSrc ? (
                                                <img
                                                    src={logoSrc}
                                                    alt={logo.alt || `${logoName || "Partner"} logo`}
                                                    className={!isDayMode ? logo.darkClassName || "" : ""}
                                                />
                                            ) : (
                                                <strong>{logoName}</strong>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <div id="showcase-campus-support" className="outcome-support-network">
                            <div className="outcome-support-network-intro">
                                <span>{t("hackathon.outcome_archive.support_network_label")}</span>
                                <h4>{t("hackathon.outcome_archive.support_lineup")}</h4>
                                <p>{t("hackathon.outcome_archive.support_network_desc")}</p>
                                <strong>{t("hackathon.outcome_archive.support_count", { count: partnerCount })}</strong>
                            </div>
                            <div className="outcome-credits-groups">
                                {communitySupportGroups.map((group, groupIndex) => (
                                    <section key={group.id}>
                                        <header>
                                            <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                                            <div>
                                                <p>{group.code}</p>
                                                <h4>{t(`hackathon.outcome_archive.support_groups.${group.id}`)}</h4>
                                            </div>
                                        </header>
                                        <p>{t(`hackathon.outcome_archive.support_group_desc.${group.id}`)}</p>
                                        <div>
                                            {(group.partners || []).map((partner, partnerIndex) => (
                                                <span key={partner.id || partner.name}>
                                                    <small>{String(partnerIndex + 1).padStart(2, "0")}</small>
                                                    <strong>
                                                        {useEnglishPartnerNames
                                                            ? partner.name_en || partner.name
                                                            : partner.name}
                                                    </strong>
                                                </span>
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </div>
                    </footer>
                </section>
            </main>

            <CompetitionOutcomeUploadModal open={Boolean(uploadType)} onClose={() => setUploadType(null)} onSubmitted={loadOutcome} initialType={uploadType || "stage_photo"} competitionSlug={competitionSlug} competitionTitle={event.title} />
            <VideoDialog video={officialVideo} open={videoOpen} onClose={() => setVideoOpen(false)} t={t} />
            <MobileWorkDetail work={selectedWork} open={mobileWorkOpen} onClose={closeMobileWork} t={t} />

            <style>{`
                .hackathon-outcome{
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
                .outcome-x-field{position:absolute;z-index:-1;inset:0 0 auto 0;height:min(1120px,100svh);pointer-events:none;overflow:hidden}
                .outcome-x-field img{width:100%;height:100%;object-fit:cover;object-position:center top;filter:saturate(1.08) contrast(1.05)}
                .hackathon-outcome-inner{width:min(1480px,calc(100% - 5.75rem));margin:0 auto}
                .outcome-overview,.outcome-archive,.outcome-works{position:relative;isolation:isolate;padding:0 0 clamp(4rem,7vw,7rem)}
                .outcome-section-field{position:absolute;z-index:-2;inset:0 calc((100vw - min(1480px,calc(100vw - 4rem)))/-2) auto;height:min(1080px,100svh);overflow:hidden;pointer-events:none;opacity:.58}
                .outcome-section-field img{width:100%;height:100%;object-fit:cover;filter:saturate(1.1) contrast(1.04)}
                .outcome-section-field.is-archive img{object-position:60% top}
                .outcome-section-field.is-works{top:1rem;opacity:.38}.outcome-section-field.is-works img{object-position:72% center}
                .outcome-section-field.is-support{inset:0;z-index:-1;width:100%;height:100%;opacity:.52}.outcome-section-field.is-support img{object-position:72% top}
                .outcome-archive,.outcome-works,.outcome-support{scroll-margin-top:5.25rem}
                .outcome-overview{min-height:900px;display:flex;align-items:flex-start;padding-bottom:2rem}
                .outcome-overview-grid{display:grid;width:100%;min-height:min(766px,calc(100svh - 8.15rem));grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(1.25rem,2.2vw,2.5rem);align-items:stretch}
                .outcome-hero-copy{position:relative;z-index:2;align-self:start;padding:2.75rem 0 0}
                .outcome-date-line{margin:0;color:var(--x-lime);font-size:1rem;font-weight:900;letter-spacing:.045em}
                .outcome-hero-copy h1{display:grid;row-gap:1.4rem;margin:0;font-size:clamp(6rem,8.65vw,8rem);font-weight:950;line-height:.84;letter-spacing:-.04em;text-shadow:0 10px 40px rgba(0,0,0,.32)}
                .outcome-hero-copy h1>span{transform:scaleX(.963);transform-origin:left center;white-space:nowrap}
                .outcome-hero-copy h1 .is-accent{color:var(--x-lime)}
                .outcome-title-rule{width:min(100%,46rem);height:1px;margin:3rem 0 1.05rem;background:rgba(185,255,24,.48)}
                .outcome-overview-name{margin:1.45rem 0 0;color:var(--x-text);font-size:1.05rem;font-weight:900;letter-spacing:.03em}
                .outcome-description{max-width:620px;margin:1rem 0 0;color:rgba(247,248,242,.7);font-size:.85rem;font-weight:650;line-height:1.85}
                .outcome-stat-grid{display:grid;width:min(100%,594px);grid-template-columns:repeat(4,1fr);margin-top:6.4rem;border-block:0}
                .outcome-stat-grid>div{position:relative;padding:1rem 1rem 1rem 0}
                .outcome-stat-grid>div:not(:last-child)::after{content:"";position:absolute;right:.7rem;top:24%;height:52%;width:1px;background:rgba(185,255,24,.34)}
                .outcome-stat-grid strong{display:block;color:var(--x-lime);font:900 clamp(1.9rem,2.65vw,2.8rem)/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-stat-grid small{margin-left:.28rem;font-size:.78rem;color:var(--x-text)}
                .outcome-stat-grid span{display:block;margin-top:.62rem;color:var(--x-muted);font-size:.74rem;font-weight:800}
                .outcome-primary-actions{display:flex;gap:1rem;margin-top:2.9rem}
                .outcome-primary-actions button,.outcome-section-topline>a,.outcome-section-topline>button,.outcome-work-detail-actions a{display:inline-flex;min-height:50px;align-items:center;justify-content:center;gap:.65rem;padding:.76rem 1.2rem;border:1px solid rgba(185,255,24,.48);border-radius:11px;background:rgba(2,8,6,.35);color:inherit;font-size:.8rem;font-weight:900;transition:transform .2s ease,background-color .2s ease,border-color .2s ease}
                .outcome-primary-actions button{min-width:13.25rem;min-height:64px;border-radius:2px;font-size:1rem}
                .outcome-primary-actions button:first-child{border-color:var(--x-lime);background:var(--x-lime);color:#071006}
                .outcome-primary-actions button:hover,.outcome-section-topline>a:hover,.outcome-section-topline>button:hover,.outcome-work-detail-actions a:hover{transform:translateY(-2px);border-color:var(--x-lime);background:rgba(185,255,24,.12)}
                .outcome-primary-actions button:first-child:hover{background:var(--x-lime-soft)}
                .outcome-film{position:relative;z-index:1;align-self:end;width:calc(100% + 4.5vw);margin-right:calc((100vw - min(1480px,calc(100vw - 5.75rem)))/-2);margin-left:-.55vw;padding-bottom:0}
                .outcome-film-frame{width:100%;aspect-ratio:16/8.4;overflow:hidden;padding:1px;background:rgba(185,255,24,.72);clip-path:polygon(18% 0,100% 0,100% 100%,0 100%);filter:drop-shadow(0 26px 34px rgba(0,0,0,.5))}
                .outcome-film button{position:relative;display:block;width:100%;height:100%;overflow:hidden;border:0;background:var(--x-surface);padding:0;clip-path:inherit}
                @supports (clip-path:shape(from 0 0,line to 100% 0,line to 100% 100%,close)){
                    .outcome-film-frame,.outcome-film button{clip-path:shape(from 19% 0,line to 100% 0,line to 100% 100%,line to 2% 100%,curve to 0 94% with 0 98%,line to 15% 10%,curve to 19% 0 with 16.5% 1%,close)}
                }
                .outcome-film button img{transition:transform .7s cubic-bezier(.2,.65,.2,1)}
                .outcome-film button:hover img{transform:scale(1.018)}
                .outcome-film-play{display:none}
                .outcome-film-caption{display:none}
                .outcome-film-caption span{color:var(--x-lime);font-weight:900;letter-spacing:.12em;text-transform:uppercase}
                .outcome-film-caption strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--x-muted)}
                .outcome-next-section{position:absolute;z-index:3;right:0;bottom:.35rem;left:0;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:2rem;color:var(--x-text)}
                .outcome-next-section>div{display:grid;grid-template-columns:minmax(10rem,1fr) auto minmax(10rem,1fr);align-items:center;gap:1.5rem}
                .outcome-next-section>div::before,.outcome-next-section>div::after{content:"";height:1px;background:rgba(185,255,24,.42)}
                .outcome-next-section span{color:var(--x-lime);font:300 3.1rem/.9 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-next-section strong{white-space:nowrap;font-size:1.05rem;letter-spacing:.02em}
                .outcome-next-section a{display:flex;align-items:center;gap:.75rem;color:var(--x-muted);font-size:.7rem;font-weight:850;white-space:nowrap}
                .outcome-section-heading{display:flex;align-items:flex-end;gap:1.05rem;padding:1rem 0 1.5rem}
                .outcome-section-heading>span{color:var(--x-lime);font:300 clamp(3.8rem,7vw,6.8rem)/.72 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-section-heading p{margin:0 0 .38rem;color:var(--x-lime);font-size:.64rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
                .outcome-section-heading h2{margin:0;font-size:clamp(1.2rem,2vw,1.8rem);font-weight:950;letter-spacing:-.035em}
                .outcome-section-topline{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;border-top:1px solid rgba(185,255,24,.35)}
                .outcome-section-topline::after{content:"";position:absolute;right:0;top:-1px;width:clamp(70px,13vw,190px);height:1px;background:var(--x-lime)}
                .outcome-section-topline .outcome-section-heading{padding-bottom:1.25rem}
                .outcome-section-topline>a,.outcome-section-topline>button{margin-bottom:1.25rem}
                .outcome-archive{min-height:780px;padding-top:8rem;padding-bottom:3rem}
                .outcome-archive-stage{display:grid;grid-template-columns:minmax(300px,.49fr) minmax(0,1.51fr);gap:clamp(1.5rem,3.5vw,3.5rem);align-items:start}
                .outcome-archive-intro{align-self:start;padding-top:2rem}
                .outcome-archive-intro .outcome-section-heading{display:block;padding:0}
                .outcome-archive-intro .outcome-section-heading>span{display:block;font-size:clamp(6.5rem,10vw,10rem);line-height:.72}
                .outcome-archive-intro .outcome-section-heading>div{display:flex;flex-direction:column;margin-top:2rem}
                .outcome-archive-intro .outcome-section-heading p{order:2;margin:.85rem 0 0}
                .outcome-archive-intro .outcome-section-heading h2{order:1;font-size:clamp(3rem,5.25vw,5.25rem);line-height:1;letter-spacing:-.04em}
                .outcome-archive-intro>a{display:inline-flex;min-width:18.75rem;min-height:58px;align-items:center;justify-content:center;gap:.8rem;margin-top:4.75rem;padding:.8rem 1rem;border:1px solid rgba(185,255,24,.5);border-radius:2px;color:inherit;font-size:.88rem;font-weight:900;transition:transform .2s ease,border-color .2s ease,background-color .2s ease}
                .outcome-archive-intro>a:hover{transform:translateY(-2px);border-color:var(--x-lime);background:rgba(185,255,24,.1)}
                .outcome-archive-feature{min-width:0;margin:0}
                .outcome-archive-feature>a{display:block;aspect-ratio:16/7.05;overflow:hidden;padding:1px;border-radius:18px 2px 18px 2px;background:rgba(185,255,24,.72);clip-path:polygon(12% 0,100% 0,100% 100%,0 100%)}
                .outcome-archive-feature>a>div{clip-path:inherit}
                @supports (clip-path:shape(from 0 0,line to 100% 0,line to 100% 100%,close)){
                    .outcome-archive-feature>a,.outcome-archive-feature>a>div{clip-path:shape(from 12% 0,line to 100% 0,line to 100% 100%,line to 3% 100%,curve to 0 91% with 0 97%,line to 9% 12%,curve to 12% 0 with 10% 1%,close)}
                }
                .outcome-archive-feature figcaption,.outcome-photo-strip figcaption{display:grid;grid-template-columns:2rem minmax(0,1fr);gap:.4rem;padding:.78rem .05rem;border-bottom:1px solid rgba(247,248,242,.13)}
                .outcome-archive-feature figcaption span,.outcome-photo-strip figcaption span{color:var(--x-lime);font:800 .68rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-archive-feature figcaption strong,.outcome-photo-strip figcaption strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}
                .outcome-archive-feature figcaption,.outcome-photo-strip figcaption{display:none}
                .outcome-photo-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin:4rem 1.25rem 0}
                .outcome-photo-strip figure{min-width:0;margin:0}
                .outcome-photo-strip figure>a{display:block;aspect-ratio:1.28/1;overflow:hidden;padding:1px;border-radius:14px 4px 14px 4px;background:rgba(185,255,24,.65);clip-path:polygon(7% 0,100% 0,100% 88%,93% 100%,0 100%,0 12%)}
                .outcome-photo-strip img{transition:transform .55s ease}
                .outcome-photo-strip a:hover img{transform:scale(1.025)}
                .outcome-empty-line{min-height:210px;display:grid;place-items:center;border-block:1px solid rgba(247,248,242,.13);font-weight:800;opacity:.48}
                .outcome-works{padding-top:clamp(1.5rem,3vw,3rem)}
                .outcome-works .outcome-section-heading>span{font-size:clamp(5.5rem,8vw,8rem)}
                .outcome-works .outcome-section-heading h2{font-size:clamp(2.35rem,4vw,4.25rem);line-height:1;letter-spacing:-.04em}
                .outcome-works .outcome-section-heading>div{display:flex;flex-direction:column}
                .outcome-works .outcome-section-heading h2{order:1}.outcome-works .outcome-section-heading p{order:2;margin:.55rem 0 0}
                .outcome-works .outcome-section-topline{align-items:center}
                .outcome-works .outcome-section-topline>button{border-color:var(--x-lime);background:var(--x-lime);color:#071006}
                .outcome-works .outcome-section-topline>button{margin-bottom:0}
                .outcome-works .outcome-section-topline>button:hover{background:var(--x-lime-soft);color:#071006}
                .outcome-works-layout{display:grid;grid-template-columns:minmax(0,1.03fr) minmax(420px,.97fr);gap:clamp(1.5rem,2.5vw,2.6rem);align-items:start}
                .outcome-works-layout h3{margin:0 0 1rem;font-size:.76rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
                .outcome-podium{grid-column:1/-1;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:.65rem;margin-bottom:1.25rem}
                .outcome-podium>h3{grid-column:1/-1;margin:0;padding-bottom:.72rem;border-bottom:1px solid rgba(185,255,24,.38)}
                .outcome-podium>button{position:relative;width:100%;display:grid;grid-template-columns:3.6rem minmax(0,1fr);align-items:center;gap:.7rem;overflow:hidden;padding:0 .25rem .7rem;border:0;border-bottom:1px solid rgba(247,248,242,.22);border-radius:0;background:transparent;color:inherit;text-align:left;transition:transform .25s ease,border-color .25s ease,background-color .25s ease}
                .outcome-podium>button:hover{transform:translateY(-4px);border-color:rgba(185,255,24,.62);background:rgba(185,255,24,.035)}
                .outcome-podium>button.is-selected{border-color:var(--x-lime);background:rgba(185,255,24,.045)}
                .outcome-podium>button:focus-visible,.outcome-ranking button:focus-visible{outline:2px solid var(--x-lime);outline-offset:3px}
                .outcome-podium-thumb{grid-column:1/-1;width:100%;margin:0 0 .1rem;aspect-ratio:2.7/1;overflow:hidden;border-radius:7px 2px 7px 2px;background:var(--x-surface)}
                .outcome-podium>button>span{align-self:start;color:var(--x-lime);font:300 clamp(2.2rem,3.25vw,3.45rem)/.85 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-podium em,.outcome-podium strong,.outcome-podium small{display:block}
                .outcome-podium em{margin-bottom:.28rem;color:var(--x-lime);font-size:.58rem;font-style:normal;font-weight:900}
                .outcome-podium strong{font-size:clamp(.78rem,1vw,.96rem);line-height:1.28}
                .outcome-podium small{margin-top:.35rem;font-size:.63rem;color:var(--x-muted)}
                @media(min-width:768px){
                    .outcome-podium>button:first-of-type{grid-template-columns:8.5rem minmax(0,1fr);grid-template-rows:1fr auto;align-items:end}
                    .outcome-podium>button:first-of-type .outcome-podium-thumb{grid-column:2;grid-row:1/3;height:180px;min-height:0;aspect-ratio:auto;margin:0}
                    .outcome-podium>button:first-of-type>span{grid-column:1;grid-row:1;align-self:end}
                    .outcome-podium>button:first-of-type>div{grid-column:1;grid-row:2;align-self:start;padding-bottom:.15rem}
                }
                .outcome-ranking{grid-column:2;position:sticky;top:5.5rem;padding-left:.35rem;border-left:1px solid rgba(247,248,242,.14)}
                .outcome-ranking>div{max-height:345px;overflow-y:auto;border-top:1px solid rgba(247,248,242,.16);scrollbar-width:thin;scrollbar-color:rgba(185,255,24,.45) transparent}
                .outcome-ranking button{width:100%;display:grid;grid-template-columns:clamp(78px,6.2vw,98px) 2.25rem minmax(0,1fr) 1.1rem;align-items:center;gap:clamp(.6rem,1vw,.9rem);padding:.5rem .25rem .5rem 0;border:0;border-bottom:1px solid rgba(247,248,242,.12);background:transparent;color:inherit;text-align:left;transition:background-color .2s ease,color .2s ease,transform .2s ease}
                .outcome-ranking button:hover,.outcome-ranking button.is-selected{transform:translateX(.25rem);background:rgba(185,255,24,.08);color:var(--x-lime-soft)}
                .outcome-ranking-thumb{aspect-ratio:16/9;overflow:hidden;border-radius:6px;background:var(--x-surface)}
                .outcome-ranking button>span{color:var(--x-lime);font:850 clamp(.8rem,1vw,1rem)/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-ranking button>div:nth-of-type(2){min-width:0}
                .outcome-ranking strong,.outcome-ranking small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
                .outcome-ranking strong{font-size:clamp(.8rem,1vw,.95rem)}
                .outcome-ranking small{margin-top:.34rem;font-size:.63rem;color:var(--x-muted)}
                .outcome-ranking-hint{display:flex;align-items:center;gap:.5rem;margin:.8rem 0 0;color:var(--x-lime);font-size:.68rem;font-weight:900}
                .outcome-work-detail{grid-column:1;overflow:visible;border:0;border-right:1px solid rgba(247,248,242,.16);border-radius:0;background:transparent;padding:0 1.35rem 0 .1rem}
                .outcome-work-detail:not(.is-compact){max-height:none;overflow:visible}
                .outcome-work-detail-head{display:grid;grid-template-columns:5.1rem minmax(0,1fr);gap:.8rem;align-items:end;padding-bottom:.7rem;border-bottom:1px solid rgba(185,255,24,.26)}
                .outcome-work-detail-head>span,.outcome-work-detail-head p{color:var(--x-lime)}
                .outcome-work-detail-head>span{font:300 clamp(2.4rem,3.5vw,3.6rem)/.78 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-work-detail-head p{margin:0;font-size:.58rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
                .outcome-work-detail-head h3{margin:.28rem 0 0;font-size:clamp(1.2rem,1.8vw,1.72rem);line-height:1.08;letter-spacing:-.035em;text-transform:none}
                .outcome-work-detail-body{display:grid;grid-template-columns:minmax(0,1.52fr) minmax(158px,.48fr);gap:1.15rem;margin-top:.85rem;align-items:start}
                .outcome-work-detail-image{aspect-ratio:1.5/1;overflow:hidden;border-radius:12px 2px 12px 2px;background:var(--x-surface)}
                .outcome-work-detail-copy{min-width:0}
                .outcome-work-detail-meta{display:grid;grid-template-columns:1fr;margin:0}
                .outcome-work-detail-meta>div{padding:.48rem .05rem;border-bottom:1px solid rgba(247,248,242,.12)}
                .outcome-work-detail-meta>div+div{padding-left:.1rem;border-left:0}
                .outcome-work-detail-meta dt{font-size:.58rem;font-weight:900;opacity:.45;text-transform:uppercase}
                .outcome-work-detail-meta dd{margin:.32rem 0 0;font-size:.76rem;font-weight:850}
                .outcome-work-detail section{margin-top:.72rem}
                .outcome-work-detail h4{margin:0;font-size:.72rem;font-weight:950}
                .outcome-work-detail section p,.outcome-work-detail blockquote{margin:.42rem 0 0;color:rgba(247,248,242,.68);font-size:.7rem;line-height:1.7}
                .outcome-work-detail blockquote{padding-left:1rem;border-left:1px solid var(--x-lime)}
                .outcome-work-detail-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:.75rem}
                .outcome-work-detail-actions a{min-height:42px;padding:.58rem .85rem;font-size:.68rem}
                .outcome-credits{position:relative;isolation:isolate;display:grid;min-height:calc(100svh - 5.25rem);overflow:hidden;margin-top:clamp(5rem,9vw,9rem);padding:clamp(6.8rem,7.8vw,7.7rem) 0 clamp(3rem,4.4vw,4rem);border-top:1px solid rgba(185,255,24,.72);background:transparent}
                .outcome-credits-head{position:relative;z-index:1;display:grid;grid-template-columns:minmax(220px,.36fr) minmax(0,.64fr);gap:clamp(2.5rem,6vw,6.5rem);align-items:end;padding-bottom:clamp(2rem,3vw,3.2rem);border-bottom:1px solid rgba(247,248,242,.22);animation:support-matrix-rise .72s cubic-bezier(.16,1,.3,1) both}
                .outcome-credits-index{display:flex;min-width:0;flex-wrap:wrap;align-items:flex-end;gap:.35rem 1rem;padding-right:clamp(1.5rem,4vw,4rem);border-right:1px solid rgba(185,255,24,.4)}
                .outcome-credits-index>span,.outcome-enterprise-stage header span,.outcome-support-network-intro>span{display:block;width:100%;color:var(--x-lime);font-size:.65rem;font-weight:950;letter-spacing:.17em;text-transform:uppercase}
                .outcome-credits-index>strong{color:var(--x-lime);font:300 clamp(8.8rem,13.5vw,13.2rem)/.68 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.09em;text-shadow:0 0 42px rgba(185,255,24,.12)}
                .outcome-credits-index>small{margin-bottom:.3rem;color:rgba(247,248,242,.68);font-size:.72rem;font-weight:900;letter-spacing:.08em}
                .outcome-credits-lead{min-width:0;padding-bottom:.2rem}
                .outcome-credits-lead>div{display:grid;grid-template-columns:auto minmax(0,1fr);gap:1.4rem;align-items:baseline}
                .outcome-credits-lead>div>strong{color:var(--x-lime);font:300 clamp(3rem,4.2vw,4.15rem)/.8 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-credits-lead>div>strong::after{content:"/";display:inline-block;margin-left:.65rem;color:rgba(185,255,24,.45);font-size:.42em;vertical-align:.45em}
                .outcome-credits-lead h3{margin:0;font-size:clamp(3.65rem,5.4vw,5.6rem);font-weight:950;line-height:.9;letter-spacing:-.055em}
                .outcome-credits-lead>p:not(.outcome-credits-deck){max-width:740px;margin:1.3rem 0 0;color:rgba(247,248,242,.88);font-size:clamp(1.08rem,1.55vw,1.42rem);font-weight:850;line-height:1.4}
                .outcome-credits-deck{max-width:45rem;margin:.8rem 0 0;color:var(--x-muted);font-size:.72rem;line-height:1.75}
                .outcome-enterprise-stage{position:relative;z-index:1;margin-top:clamp(1.9rem,2.8vw,2.7rem);padding:0;border:0;border-radius:0;background:transparent;animation:support-matrix-rise .78s .08s cubic-bezier(.16,1,.3,1) both}
                .outcome-enterprise-stage>header{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2rem;align-items:end}
                .outcome-enterprise-stage h4{margin:.58rem 0 0;font-size:clamp(1.35rem,1.8vw,1.75rem);line-height:1.05;letter-spacing:-.03em}
                .outcome-enterprise-stage>header>strong{color:var(--x-lime);font:300 clamp(2.5rem,3.6vw,3.55rem)/.78 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.06em}
                .outcome-enterprise-logos{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));margin-top:1.25rem;border-top:1px solid rgba(185,255,24,.4);border-left:1px solid rgba(247,248,242,.16);background:rgba(2,8,6,.36);backdrop-filter:blur(3px)}
                .outcome-enterprise-logos>div{position:relative;display:flex;min-width:0;min-height:92px;align-items:center;justify-content:center;padding:1.25rem .8rem .85rem;border-right:1px solid rgba(247,248,242,.16);border-bottom:1px solid rgba(247,248,242,.16);background:linear-gradient(180deg,rgba(185,255,24,.035),rgba(2,8,6,.08));transition:background-color .25s ease,transform .25s ease}
                .outcome-enterprise-logos>div:hover{z-index:1;transform:translateY(-3px);background:rgba(185,255,24,.075)}
                .outcome-enterprise-logos>div>span{position:absolute;left:.55rem;top:.48rem;color:rgba(185,255,24,.7);font:850 .52rem/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-enterprise-logos img{display:block;max-width:82%;max-height:34px;object-fit:contain;filter:drop-shadow(0 0 14px rgba(247,248,242,.08))}
                .outcome-enterprise-logos strong{font-size:.82rem;text-align:center}
                .outcome-support-network{position:relative;z-index:1;display:grid;grid-template-columns:minmax(250px,.37fr) minmax(0,.63fr);gap:clamp(2rem,4.8vw,5rem);margin-top:clamp(2rem,3vw,3rem);animation:support-matrix-rise .82s .16s cubic-bezier(.16,1,.3,1) both}
                .outcome-support-network-intro{align-self:stretch;padding:1.15rem clamp(1.5rem,3vw,3rem) 1.2rem 0;border-top:1px solid rgba(247,248,242,.24);border-bottom:1px solid rgba(247,248,242,.16)}
                .outcome-support-network-intro h4{margin:.72rem 0 0;font-size:clamp(1.8rem,3vw,3.1rem);line-height:1.03;letter-spacing:-.045em}
                .outcome-support-network-intro p{max-width:30rem;margin:1rem 0 0;color:var(--x-muted);font-size:.72rem;line-height:1.75}
                .outcome-support-network-intro>strong{display:block;margin-top:1.15rem;color:rgba(247,248,242,.86);font-size:.66rem;font-weight:900;letter-spacing:.04em}
                .outcome-credits-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;border-top:1px solid rgba(247,248,242,.24)}
                .outcome-credits-groups>section{min-width:0;padding:1.25rem 1.4rem 1.25rem 0;border-bottom:1px solid rgba(247,248,242,.16)}
                .outcome-credits-groups>section+section{padding-left:1.4rem;border-left:1px solid rgba(247,248,242,.16)}
                .outcome-credits-groups header{display:grid;grid-template-columns:2rem minmax(0,1fr);gap:.75rem;align-items:start}
                .outcome-credits-groups header>span,.outcome-credits-groups small{color:var(--x-lime);font:850 .65rem/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-credits-groups header p{margin:0;color:var(--x-muted);font-size:.58rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}
                .outcome-credits-groups h4{margin:.28rem 0 0;font-size:1.05rem;font-weight:950}
                .outcome-credits-groups section>p{min-height:3.3em;margin:.8rem 0 0;color:var(--x-muted);font-size:.66rem;line-height:1.65}
                .outcome-credits-groups section>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 1rem;margin-top:.75rem}
                .outcome-credits-groups section>div>span{display:grid;grid-template-columns:1.8rem minmax(0,1fr);gap:.5rem;align-items:baseline;padding:.52rem 0;border-bottom:1px solid rgba(247,248,242,.11)}
                .outcome-credits-groups section>div strong{font-size:clamp(.76rem,.9vw,.9rem);line-height:1.4}
                @keyframes support-matrix-rise{from{transform:translateY(24px);clip-path:inset(0 0 100% 0)}to{transform:translateY(0);clip-path:inset(0)}}
                .outcome-video-dialog{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:1rem;background:rgba(0,0,0,.88);backdrop-filter:blur(12px)}
                .outcome-video-dialog article{position:relative;width:min(1120px,100%);overflow:hidden;border:1px solid rgba(185,255,24,.36);border-radius:16px;background:#000}
                .outcome-video-dialog video{display:block;width:100%;max-height:calc(100dvh - 2rem)}
                .outcome-video-dialog button{position:absolute;right:1rem;top:1rem;display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(255,255,255,.35);border-radius:50%;background:rgba(0,0,0,.68);color:#fff}
                .outcome-mobile-work{--x-ink:#020806;--x-text:#f7f8f2;--x-lime:#b9ff18;--x-lime-soft:#d6ff73;--x-surface:#08110d;--x-muted:#a8b0a6;position:fixed;inset:0;z-index:400;display:none;height:100dvh;isolation:isolate;background:var(--x-ink);color:var(--x-text)}
                .outcome-mobile-work-bar{display:flex;min-height:58px;align-items:center;justify-content:space-between;gap:1rem;padding:.6rem 1rem;border-bottom:1px solid rgba(185,255,24,.28)}
                .outcome-mobile-work-bar>div{display:flex;min-width:0;align-items:center;gap:.7rem}.outcome-mobile-work-bar span{color:var(--x-lime);font:900 .72rem/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-mobile-work-bar strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.82rem}
                .outcome-mobile-work-bar button{display:grid;width:40px;height:40px;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:transparent;color:#fff}
                .outcome-mobile-work-scroll{height:calc(100dvh - 58px);overflow-y:auto;padding:1rem 1rem calc(env(safe-area-inset-bottom) + 2rem)}
                @media(min-width:1121px){.outcome-archive{margin-top:0}}
                @media(max-width:1120px){
                    .hackathon-outcome{padding-top:7rem}
                    .outcome-overview{min-height:auto}
                    .outcome-overview-grid{min-height:auto;grid-template-columns:1fr}
                    .outcome-hero-copy{max-width:760px}
                    .outcome-title-rule{margin-top:2.6rem}
                    .outcome-hero-copy h1{row-gap:.8rem;font-size:clamp(5rem,9.6vw,6.8rem)}
                    .outcome-overview-name{margin-top:1.4rem}
                    .outcome-stat-grid{margin-top:3rem}
                    .outcome-primary-actions{margin-top:2.5rem}
                    .outcome-film{width:min(100%,900px);margin-right:0;margin-left:auto}
                    .outcome-next-section{display:none}
                    .outcome-works-layout{grid-template-columns:1fr}
                    .outcome-podium,.outcome-work-detail,.outcome-ranking{grid-column:1}
                    .outcome-ranking{position:relative;top:auto}
                    .outcome-work-detail{padding-right:0;border-right:0}
                    .outcome-ranking{padding-left:0;border-left:0}
                    .outcome-work-detail:not(.is-compact){position:relative;top:auto}
                    .outcome-credits-head{grid-template-columns:minmax(190px,.3fr) minmax(0,.7fr);gap:2.5rem}
                    .outcome-credits-index>strong{font-size:8.4rem}
                    .outcome-support-network{grid-template-columns:1fr}
                    .outcome-enterprise-logos{grid-template-columns:repeat(3,minmax(0,1fr))}
                }
                @media(max-width:767px){
                    .hackathon-outcome{padding-top:5.5rem}
                    .outcome-x-field{height:780px;opacity:.92}.outcome-x-field img{object-position:58% top}
                    .hackathon-outcome-inner{width:100%}
                    .outcome-overview,.outcome-archive,.outcome-works{padding-inline:1rem;padding-bottom:3.6rem}.outcome-overview{padding-bottom:2rem}
                    .outcome-overview-grid{gap:1.7rem}
                    .outcome-hero-copy{padding-top:.5rem}
                    .outcome-date-line{font-size:.82rem}
                    .outcome-hero-copy h1{row-gap:.2rem;font-size:clamp(3.15rem,14vw,4.1rem);line-height:.9;letter-spacing:-.04em}
                    .outcome-title-rule{margin:1.4rem 0 .8rem}.outcome-overview-name{margin-top:1rem;font-size:.92rem}
                    .outcome-description{display:-webkit-box;overflow:hidden;-webkit-line-clamp:4;-webkit-box-orient:vertical;font-size:.84rem;line-height:1.78}
                    .outcome-stat-grid{grid-template-columns:repeat(2,1fr);margin-top:1.7rem}
                    .outcome-stat-grid>div:nth-child(2)::after{display:none}
                    .outcome-stat-grid>div{border-bottom:1px solid rgba(247,248,242,.1)}
                    .outcome-primary-actions{display:grid;grid-template-columns:1fr 1fr}.outcome-primary-actions button{min-width:0;min-height:54px;font-size:.83rem}
                    .outcome-film{padding-bottom:0}
                    .outcome-film-frame{aspect-ratio:4/3;border-radius:28px 10px 28px 10px;clip-path:none;filter:drop-shadow(0 20px 30px rgba(0,0,0,.38))}
                    .outcome-film button{border-radius:27px 9px 27px 9px;clip-path:none}
                    .outcome-film-play{width:50px;height:50px}
                    .outcome-section-heading{gap:.65rem;padding-bottom:1.2rem}.outcome-section-heading>span{font-size:3.45rem}
                    .outcome-section-topline{align-items:flex-end}.outcome-section-topline>a,.outcome-section-topline>button{margin-bottom:1rem;min-height:42px;padding:.55rem .72rem}
                    .outcome-section-field{inset:0 -1rem auto;height:780px}.outcome-section-field.is-support{inset:0;width:100%;height:100%}
                    .outcome-archive{min-height:0;padding-top:3rem}
                    .outcome-archive-stage{grid-template-columns:1fr;gap:1.5rem}
                    .outcome-archive-intro .outcome-section-heading{display:flex;align-items:flex-end;padding-bottom:0}
                    .outcome-archive-intro .outcome-section-heading>span{font-size:4.3rem}
                    .outcome-archive-intro .outcome-section-heading>div{margin-top:0}
                    .outcome-archive-intro .outcome-section-heading h2{font-size:2rem}
                    .outcome-archive-intro{padding-top:0}
                    .outcome-archive-intro>a{width:100%;min-width:0;min-height:46px;margin-top:1.2rem}
                    .outcome-archive-feature>a{aspect-ratio:4/3;border-radius:16px 6px 16px 6px;clip-path:none}
                    .outcome-photo-strip{display:flex;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x mandatory;gap:.75rem;margin-inline:-1rem;padding:0 1rem .35rem;scrollbar-width:none}
                    .outcome-photo-strip::-webkit-scrollbar{display:none}.outcome-photo-strip figure{min-width:78vw;scroll-snap-align:start}.outcome-photo-strip figure>a{aspect-ratio:4/3;border-radius:12px;clip-path:none}
                    .outcome-works .outcome-section-topline{flex-wrap:wrap}
                    .outcome-works .outcome-section-heading{flex:1 1 100%;padding-bottom:0}
                    .outcome-works .outcome-section-heading>span{font-size:4.3rem}.outcome-works .outcome-section-heading h2{font-size:1.95rem;white-space:nowrap}
                    .outcome-works .outcome-section-topline>button{margin-left:auto}
                    .outcome-works-layout{grid-template-columns:1fr;gap:2rem}
                    .outcome-podium{grid-template-columns:1fr 1fr;gap:.75rem}
                    .outcome-podium>h3,.outcome-podium>button:first-of-type{grid-column:1/-1}
                    .outcome-podium>button{grid-template-columns:2.75rem minmax(0,1fr);padding:0 .35rem .85rem;border-radius:0}
                    .outcome-podium-thumb{width:100%;margin-inline:0;aspect-ratio:16/11.5}
                    .outcome-podium>button:first-of-type .outcome-podium-thumb{aspect-ratio:16/8.8}
                    .outcome-podium>button>span{font-size:2rem}
                    .outcome-podium strong{font-size:.8rem}.outcome-podium small{font-size:.61rem}
                    .outcome-ranking>div{max-height:none}.outcome-ranking-hint{display:none}.outcome-work-detail:not(.is-compact){display:none}.outcome-mobile-work{display:block}
                    .outcome-ranking button{grid-template-columns:76px 2rem minmax(0,1fr) 1rem;gap:.6rem;padding:.65rem 0}
                    .outcome-credits{margin-top:4rem;padding:4.6rem 1rem 2.6rem;border-radius:0}
                    .outcome-credits-head{grid-template-columns:5.6rem minmax(0,1fr);gap:1.25rem;align-items:start;padding-bottom:1.65rem}
                    .outcome-credits-index{display:block;padding-right:1rem;border-right-color:rgba(185,255,24,.32)}
                    .outcome-credits-index>span{font-size:.48rem;line-height:1.4;letter-spacing:.12em}
                    .outcome-credits-index>strong{display:block;margin-top:.8rem;font-size:4.45rem;line-height:.72;letter-spacing:-.1em}
                    .outcome-credits-index>small{display:block;margin-top:.85rem;font-size:.54rem;line-height:1.45}
                    .outcome-credits-lead>div{display:block}
                    .outcome-credits-lead>div>strong{font-size:1.25rem;line-height:1}
                    .outcome-credits-lead>div>strong::after{margin-left:.35rem;font-size:.65em;vertical-align:.18em}
                    .outcome-credits-lead h3{margin-top:.9rem;font-size:2.65rem;line-height:.93}
                    .outcome-credits-lead>p:not(.outcome-credits-deck){margin-top:1rem;font-size:.94rem;line-height:1.5}
                    .outcome-credits-deck{margin-top:.65rem;font-size:.68rem;line-height:1.65}
                    .outcome-enterprise-stage{margin-top:1.8rem}
                    .outcome-enterprise-stage>header{gap:1rem;align-items:end}
                    .outcome-enterprise-stage h4{font-size:1.35rem}
                    .outcome-enterprise-stage>header>strong{font-size:2.25rem}
                    .outcome-enterprise-logos{grid-template-columns:repeat(2,minmax(0,1fr))}
                    .outcome-enterprise-logos>div{min-height:76px;padding:1.2rem .6rem .7rem}
                    .outcome-enterprise-logos img{max-width:86%;max-height:26px}
                    .outcome-support-network{gap:1.35rem;margin-top:2.2rem}
                    .outcome-support-network-intro{padding-right:0;padding-bottom:1.25rem}
                    .outcome-support-network-intro h4{font-size:2.1rem}
                    .outcome-credits-groups{grid-template-columns:1fr}
                    .outcome-credits-groups>section{padding:1.2rem 0 1.4rem}
                    .outcome-credits-groups>section+section{padding-left:0;border-left:0}
                    .outcome-credits-groups section>p{min-height:0}
                    .outcome-credits-groups section>div{grid-template-columns:1fr}
                    .outcome-video-dialog{padding:0}.outcome-video-dialog article{border:0;border-radius:0}.outcome-video-dialog video{max-height:100dvh}
                    .outcome-work-detail.is-compact{border:0;padding:0;background:transparent}.outcome-work-detail-body{grid-template-columns:1fr}.outcome-work-detail.is-compact .outcome-work-detail-image{aspect-ratio:16/11}
                }
                @media(min-width:1121px) and (max-height:850px){
                    .hackathon-outcome{padding-top:7rem}
                    .outcome-overview{min-height:calc(100svh - 7rem);padding-bottom:1rem}
                    .outcome-overview-grid{min-height:calc(100svh - 9rem)}
                    .outcome-hero-copy{padding-top:.7rem}
                    .outcome-hero-copy h1{row-gap:.4rem;font-size:clamp(4.7rem,6vw,5.6rem);line-height:.96}
                    .outcome-title-rule{margin:1.9rem 0 .8rem}
                    .outcome-overview-name{margin-top:1rem}
                    .outcome-description{margin-top:.65rem;line-height:1.65}
                    .outcome-stat-grid{margin-top:2rem}
                    .outcome-primary-actions{margin-top:1.45rem}
                    .outcome-primary-actions button{min-height:54px}
                    .outcome-credits{padding-top:6.3rem}
                    .outcome-credits-index>strong{font-size:8.5rem}
                    .outcome-credits-lead h3{font-size:4.25rem}
                    .outcome-enterprise-logos>div{min-height:78px}
                }
                @media(prefers-reduced-motion:reduce){.outcome-credits-head,.outcome-enterprise-stage,.outcome-support-network{animation:none}.outcome-enterprise-logos>div{transition:none}}
                @media(max-width:380px){.outcome-primary-actions{grid-template-columns:1fr}.outcome-section-topline>a,.outcome-section-topline>button{max-width:46%;font-size:.68rem}.outcome-stat-grid strong{font-size:1.22rem}}
                @media(prefers-reduced-motion:reduce){.hackathon-outcome *{scroll-behavior:auto!important;animation:none!important;transition-duration:.01ms!important}}
            `}</style>
        </div>
    );
};

export default HackathonOutcomeShowcase;
