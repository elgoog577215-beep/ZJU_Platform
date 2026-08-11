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
    author: work.author || work.uploader_name || t("hackathon.outcome_archive.fallback_author"),
    cover: work.cover_url || work.cover || (index % 2 === 0 ? FALLBACK_HERO : FALLBACK_PHOTO),
    gitUrl: work.git_url || work.gitUrl || "",
    summary: work.summary || work.description || "",
    experience: work.experience || work.highlight || "",
    grade: work.grade || "",
    major: work.major || "",
    storyFileUrl: work.story_file_url || work.storyFileUrl || "",
});

const WorkDetail = ({ work, t, compact = false }) => {
    if (!work) return null;
    return (
        <article className={`outcome-work-detail ${compact ? "is-compact" : ""}`}>
            <div className="outcome-work-detail-head">
                <span>{work.rank}</span>
                <div>
                    <p>{work.honorTitle}</p>
                    <h3>{work.title}</h3>
                </div>
            </div>
            <div className="outcome-work-detail-image">
                <SmartImage
                    src={normalizeExternalImageUrl(work.cover, 1000)}
                    alt={t("hackathon.outcome_archive.work_cover_alt", { title: work.title })}
                    type="image"
                    className="h-full w-full"
                    imageClassName="h-full w-full object-cover"
                />
            </div>
            <dl className="outcome-work-detail-meta">
                <div><dt>{t("hackathon.outcome_archive.author")}</dt><dd>{work.author}</dd></div>
                <div><dt>{t("hackathon.outcome_archive.background")}</dt><dd>{[work.grade, work.major].filter(Boolean).join(" / ") || t("hackathon.outcome_archive.not_filled")}</dd></div>
            </dl>
            <section>
                <h4>{t("hackathon.outcome_archive.work_intro")}</h4>
                <p>{work.summary || t("hackathon.outcome_archive.empty_intro")}</p>
            </section>
            {work.experience ? (
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
                aria-label={t("hackathon.outcome_archive.work_dialog", { title: work.title })}
            >
                <div className="outcome-mobile-work-bar">
                    <div><span>{work.rank}</span><strong>{work.title}</strong></div>
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

const HackathonOutcomeShowcase = ({ template: templateInput }) => {
    const { t, i18n } = useTranslation();
    const { uiMode } = useSettings();
    const isDayMode = uiMode === "day";
    const [searchParams, setSearchParams] = useSearchParams();
    const template = useMemo(() => normalizeHackathonTemplate(templateInput || {}), [templateInput]);
    const event = template.event;
    const competitionSlug = template.results.competitionSlug;
    const titleParts = splitHackathonTitle(event.title);
    const [outcome, setOutcome] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploadType, setUploadType] = useState(null);
    const [videoOpen, setVideoOpen] = useState(false);
    const [mobileWorkOpen, setMobileWorkOpen] = useState(false);
    const { groups: partnerGroups } = useEcosystemPartners();

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
        return stats.slice(0, 4);
    }, [event.highlights, event.prizeUnit, event.prizeValue, t]);
    const partnerCount = (partnerGroups || []).reduce(
        (total, group) => total + (group.partners?.length || 0),
        0
    );
    const useEnglishPartnerNames = i18n.resolvedLanguage?.startsWith("en");

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
                                {formatDate(event.startAt)} · {event.location}
                            </p>
                            <p className="outcome-overview-name">
                                {t("hackathon.outcome_archive.overview")}
                            </p>
                            <p className="outcome-description">{event.description}</p>
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
                </section>

                <section id="showcase-archive" className="outcome-archive" aria-labelledby="archive-heading">
                    <div className="outcome-section-topline">
                        <SectionNumber number="02" eyebrow={t("hackathon.outcome_archive.archive_eyebrow")} title={t("hackathon.outcome_archive.archive_title")} id="archive-heading" />
                        <Link to={`/media?event=${encodeURIComponent(competitionSlug)}`}>
                            {t("hackathon.outcome_archive.view_all_photos", { count: outcome?.stats?.stage_photos || photos.length })}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    {photos.length > 0 ? (
                        <div className="outcome-photo-strip">
                            {photos.map((photo, index) => (
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
                                    <figcaption><span>{String(index + 1).padStart(2, "0")}</span><strong>{photo.title}</strong></figcaption>
                                </figure>
                            ))}
                        </div>
                    ) : (
                        <div className="outcome-empty-line">{loading ? t("hackathon.outcome_archive.loading") : t("hackathon.outcome_archive.no_photos")}</div>
                    )}
                </section>

                <section id="showcase-works" className="outcome-works" aria-labelledby="works-heading">
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
                            {podium.map((work) => (
                                <button key={work.id} type="button" onClick={() => selectWork(work)} className={selectedWork?.id === work.id ? "is-selected" : ""}>
                                    <div className="outcome-podium-thumb"><SmartImage src={normalizeExternalImageUrl(work.cover, 500)} alt={work.title} type="image" className="h-full w-full" imageClassName="h-full w-full object-cover" /></div>
                                    <span>{work.rank}</span>
                                    <div><strong>{work.title}</strong><small>{work.award} · {work.author}</small></div>
                                </button>
                            ))}
                        </div>
                        <WorkDetail work={selectedWork} t={t} />
                        <div className="outcome-ranking">
                            <h3>{t("hackathon.outcome_archive.complete_ranking", { count: works.length })}</h3>
                            <div>
                                {(remainingWorks.length > 0 ? remainingWorks : podium).map((work) => (
                                    <button key={work.id} type="button" onClick={() => selectWork(work)} className={selectedWork?.id === work.id ? "is-selected" : ""}>
                                        <div className="outcome-ranking-thumb">
                                            <SmartImage src={normalizeExternalImageUrl(work.cover, 360)} alt="" type="image" className="h-full w-full" imageClassName="h-full w-full object-cover" />
                                        </div>
                                        <span>{work.rank}</span>
                                        <div><strong>{work.title}</strong><small>{work.author}</small></div>
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <footer className="outcome-credits">
                        <div className="outcome-credits-lead">
                            <span>{t("hackathon.outcome_archive.support_eyebrow")}</span>
                            <strong>{partnerCount}</strong>
                            <div>
                                <h3>{t("hackathon.outcome_archive.support_title")}</h3>
                                <p>{t("hackathon.outcome_archive.support_lineup")}</p>
                            </div>
                            <p>{t("hackathon.outcome_archive.support_count", { count: partnerCount })}</p>
                        </div>
                        <div className="outcome-credits-groups">
                            {(partnerGroups || []).map((group, groupIndex) => (
                                <section key={group.id}>
                                    <header>
                                        <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                                        <div>
                                            <p>{group.code}</p>
                                            <h4>{t(`hackathon.outcome_archive.support_groups.${group.id}`)}</h4>
                                        </div>
                                    </header>
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
                .hackathon-outcome-inner{width:min(1480px,calc(100% - 4rem));margin:0 auto}
                .outcome-overview,.outcome-archive,.outcome-works{position:relative;padding:0 0 clamp(4rem,7vw,7rem)}
                .outcome-archive,.outcome-works{scroll-margin-top:9.5rem}
                .outcome-overview{min-height:min(850px,calc(100svh - 8rem));display:flex;align-items:center;padding-bottom:2rem}
                .outcome-overview-grid{display:grid;width:100%;min-height:800px;grid-template-columns:minmax(560px,.96fr) minmax(620px,1.04fr);gap:clamp(1.5rem,2.5vw,3rem);align-items:stretch}
                .outcome-hero-copy{position:relative;z-index:2;align-self:start;padding:clamp(.25rem,1vw,.8rem) 0}
                .outcome-date-line{margin:0;color:var(--x-lime);font-size:1rem;font-weight:900;letter-spacing:.045em}
                .outcome-hero-copy h1{display:grid;margin:0;font-size:clamp(6.25rem,8.65vw,9.55rem);font-weight:950;line-height:.78;letter-spacing:-.078em;text-shadow:0 10px 40px rgba(0,0,0,.32)}
                .outcome-hero-copy h1 .is-accent{color:var(--x-lime)}
                .outcome-title-rule{width:min(100%,46rem);height:1px;margin:2.2rem 0 1.05rem;background:rgba(185,255,24,.48)}
                .outcome-overview-name{margin:1.35rem 0 0;color:var(--x-text);font-size:1.05rem;font-weight:900;letter-spacing:.03em}
                .outcome-description{max-width:620px;margin:1rem 0 0;color:rgba(247,248,242,.7);font-size:.85rem;font-weight:650;line-height:1.85}
                .outcome-stat-grid{display:grid;width:min(100%,594px);grid-template-columns:repeat(4,1fr);margin-top:3.9rem;border-block:0}
                .outcome-stat-grid>div{position:relative;padding:1rem 1rem 1rem 0}
                .outcome-stat-grid>div:not(:last-child)::after{content:"";position:absolute;right:.7rem;top:24%;height:52%;width:1px;background:rgba(185,255,24,.34)}
                .outcome-stat-grid strong{display:block;color:var(--x-lime);font:900 clamp(1.9rem,2.65vw,2.8rem)/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-stat-grid small{margin-left:.28rem;font-size:.78rem;color:var(--x-text)}
                .outcome-stat-grid span{display:block;margin-top:.62rem;color:var(--x-muted);font-size:.74rem;font-weight:800}
                .outcome-primary-actions{display:flex;gap:1rem;margin-top:2rem}
                .outcome-primary-actions button,.outcome-section-topline>a,.outcome-section-topline>button,.outcome-work-detail-actions a{display:inline-flex;min-height:50px;align-items:center;justify-content:center;gap:.65rem;padding:.76rem 1.2rem;border:1px solid rgba(185,255,24,.48);border-radius:11px;background:rgba(2,8,6,.35);color:inherit;font-size:.8rem;font-weight:900;transition:transform .2s ease,background-color .2s ease,border-color .2s ease}
                .outcome-primary-actions button{min-width:13.25rem;min-height:64px;font-size:1rem}
                .outcome-primary-actions button:first-child{border-color:var(--x-lime);background:var(--x-lime);color:#071006}
                .outcome-primary-actions button:hover,.outcome-section-topline>a:hover,.outcome-section-topline>button:hover,.outcome-work-detail-actions a:hover{transform:translateY(-2px);border-color:var(--x-lime);background:rgba(185,255,24,.12)}
                .outcome-primary-actions button:first-child:hover{background:var(--x-lime-soft)}
                .outcome-film{position:relative;z-index:1;align-self:end;width:calc(100% + 4.25vw);margin-right:calc((100vw - min(1480px,calc(100vw - 4rem)))/-2);margin-left:-4.25vw;padding-bottom:1.5rem}
                .outcome-film-frame{width:100%;aspect-ratio:16/9.35;overflow:hidden;padding:1px;background:rgba(185,255,24,.72);clip-path:polygon(18% 0,100% 0,100% 100%,0 100%);filter:drop-shadow(0 26px 34px rgba(0,0,0,.5))}
                .outcome-film button{position:relative;display:block;width:100%;height:100%;overflow:hidden;border:0;background:var(--x-surface);padding:0;clip-path:inherit}
                @supports (clip-path:shape(from 0 0,line to 100% 0,line to 100% 100%,close)){
                    .outcome-film-frame,.outcome-film button{clip-path:shape(from 19% 0,line to 100% 0,line to 100% 100%,line to 2% 100%,curve to 0 94% with 0 98%,line to 15% 10%,curve to 19% 0 with 16.5% 1%,close)}
                }
                .outcome-film button img{transition:transform .7s cubic-bezier(.2,.65,.2,1)}
                .outcome-film button:hover img{transform:scale(1.018)}
                .outcome-film-play{position:absolute;right:1.1rem;bottom:1.1rem;display:grid;width:56px;height:56px;place-items:center;border:1px solid rgba(255,255,255,.72);border-radius:50%;background:rgba(2,8,6,.62);color:#fff;backdrop-filter:blur(10px)}
                .outcome-film-caption{display:flex;justify-content:space-between;gap:1rem;padding:.85rem .25rem 0;font-size:.69rem}
                .outcome-film-caption span{color:var(--x-lime);font-weight:900;letter-spacing:.12em;text-transform:uppercase}
                .outcome-film-caption strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--x-muted)}
                .outcome-section-heading{display:flex;align-items:flex-end;gap:1.05rem;padding:1rem 0 1.5rem}
                .outcome-section-heading>span{color:var(--x-lime);font:300 clamp(3.8rem,7vw,6.8rem)/.72 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-section-heading p{margin:0 0 .38rem;color:var(--x-lime);font-size:.64rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
                .outcome-section-heading h2{margin:0;font-size:clamp(1.2rem,2vw,1.8rem);font-weight:950;letter-spacing:-.035em}
                .outcome-section-topline{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;border-top:1px solid rgba(185,255,24,.35)}
                .outcome-section-topline::after{content:"";position:absolute;right:0;top:-1px;width:clamp(70px,13vw,190px);height:1px;background:var(--x-lime)}
                .outcome-section-topline .outcome-section-heading{padding-bottom:1.25rem}
                .outcome-section-topline>a,.outcome-section-topline>button{margin-bottom:1.25rem}
                .outcome-archive .outcome-section-topline{display:grid;grid-template-columns:1fr auto 1fr;align-items:end}
                .outcome-archive .outcome-section-heading{grid-column:2}
                .outcome-archive .outcome-section-heading>span{font-size:clamp(3rem,4vw,4.5rem)}
                .outcome-archive .outcome-section-topline>a{grid-column:3;justify-self:end}
                .outcome-photo-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.65rem}
                .outcome-photo-strip figure{min-width:0;margin:0}
                .outcome-photo-strip figure>a{display:block;aspect-ratio:1.45/1;overflow:hidden;border-radius:13px;background:var(--x-surface)}
                .outcome-photo-strip img{transition:transform .55s ease}
                .outcome-photo-strip a:hover img{transform:scale(1.025)}
                .outcome-photo-strip figcaption{display:grid;grid-template-columns:2rem minmax(0,1fr);gap:.4rem;padding:.78rem .05rem;border-bottom:1px solid rgba(247,248,242,.13)}
                .outcome-photo-strip figcaption span{color:var(--x-lime);font:800 .68rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-photo-strip figcaption strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}
                .outcome-empty-line{min-height:210px;display:grid;place-items:center;border-block:1px solid rgba(247,248,242,.13);font-weight:800;opacity:.48}
                .outcome-works-layout{display:grid;grid-template-columns:minmax(0,1.03fr) minmax(420px,.97fr);gap:clamp(1.5rem,2.5vw,2.6rem);align-items:start}
                .outcome-works-layout h3{margin:0 0 1rem;font-size:.76rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
                .outcome-podium{grid-column:1/-1;display:grid;grid-template-columns:1.45fr 1fr 1fr;gap:1rem;margin-bottom:clamp(1.2rem,2vw,2rem)}
                .outcome-podium>h3{grid-column:1/-1;margin:0;padding-bottom:1rem;border-bottom:1px solid rgba(185,255,24,.38)}
                .outcome-podium>button{position:relative;width:100%;display:grid;grid-template-columns:4.25rem minmax(0,1fr);align-items:center;gap:.85rem;overflow:hidden;padding:0 1rem 1.05rem;border:1px solid rgba(247,248,242,.12);border-radius:16px;background:rgba(2,8,6,.54);color:inherit;text-align:left;transition:transform .25s ease,border-color .25s ease,background-color .25s ease}
                .outcome-podium>button:hover{transform:translateY(-4px);border-color:rgba(185,255,24,.46);background:rgba(8,19,12,.84)}
                .outcome-podium>button.is-selected{border-color:var(--x-lime);background:rgba(185,255,24,.055)}
                .outcome-podium>button:focus-visible,.outcome-ranking button:focus-visible{outline:2px solid var(--x-lime);outline-offset:3px}
                .outcome-podium-thumb{grid-column:1/-1;width:calc(100% + 2rem);margin:0 -1rem .2rem;aspect-ratio:16/10.6;overflow:hidden;background:var(--x-surface)}
                .outcome-podium>button:first-of-type .outcome-podium-thumb{aspect-ratio:16/8.6}
                .outcome-podium>button>span{align-self:start;color:var(--x-lime);font:300 clamp(2.4rem,3.8vw,4rem)/.85 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-podium strong,.outcome-podium small{display:block}
                .outcome-podium strong{font-size:clamp(.88rem,1.15vw,1.08rem);line-height:1.35}
                .outcome-podium small{margin-top:.42rem;font-size:.68rem;color:var(--x-muted)}
                .outcome-ranking{grid-column:2;position:sticky;top:5.5rem}
                .outcome-ranking>div{max-height:720px;overflow-y:auto;border-top:1px solid rgba(247,248,242,.16);scrollbar-width:thin;scrollbar-color:rgba(185,255,24,.45) transparent}
                .outcome-ranking button{width:100%;display:grid;grid-template-columns:clamp(92px,8.2vw,132px) 2.5rem minmax(0,1fr) 1.25rem;align-items:center;gap:clamp(.7rem,1.25vw,1.15rem);padding:.8rem .5rem .8rem 0;border:0;border-bottom:1px solid rgba(247,248,242,.12);background:transparent;color:inherit;text-align:left;transition:background-color .2s ease,color .2s ease,transform .2s ease}
                .outcome-ranking button:hover,.outcome-ranking button.is-selected{transform:translateX(.25rem);background:rgba(185,255,24,.08);color:var(--x-lime-soft)}
                .outcome-ranking-thumb{aspect-ratio:16/10;overflow:hidden;border-radius:10px;background:var(--x-surface)}
                .outcome-ranking button>span{color:var(--x-lime);font:850 clamp(.8rem,1vw,1rem)/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-ranking button>div:nth-of-type(2){min-width:0}
                .outcome-ranking strong,.outcome-ranking small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
                .outcome-ranking strong{font-size:clamp(.8rem,1vw,.95rem)}
                .outcome-ranking small{margin-top:.45rem;font-size:.68rem;color:var(--x-muted)}
                .outcome-work-detail{grid-column:1;overflow:hidden;border:1px solid rgba(185,255,24,.32);border-radius:16px;background:rgba(4,12,8,.76);padding:clamp(1rem,2vw,1.6rem);backdrop-filter:blur(14px)}
                .outcome-work-detail:not(.is-compact){max-height:680px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(185,255,24,.45) transparent}
                .outcome-work-detail-head{display:grid;grid-template-columns:clamp(3.7rem,7vw,6.5rem) minmax(0,1fr);gap:1rem;align-items:end;padding-bottom:1rem;border-bottom:1px solid rgba(185,255,24,.26)}
                .outcome-work-detail-head>span,.outcome-work-detail-head p{color:var(--x-lime)}
                .outcome-work-detail-head>span{font:300 clamp(3.25rem,5.8vw,5.4rem)/.75 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-work-detail-head p{margin:0;font-size:.62rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
                .outcome-work-detail-head h3{margin:.38rem 0 0;font-size:clamp(1.45rem,2.5vw,2.45rem);line-height:1.08;letter-spacing:-.035em;text-transform:none}
                .outcome-work-detail-image{margin-top:1.25rem;aspect-ratio:16/8.8;overflow:hidden;border-radius:13px;background:var(--x-surface)}
                .outcome-work-detail-meta{display:grid;grid-template-columns:1fr 1fr;margin:0}
                .outcome-work-detail-meta>div{padding:1rem .1rem;border-bottom:1px solid rgba(247,248,242,.12)}
                .outcome-work-detail-meta>div+div{padding-left:1rem;border-left:1px solid rgba(247,248,242,.12)}
                .outcome-work-detail-meta dt{font-size:.58rem;font-weight:900;opacity:.45;text-transform:uppercase}
                .outcome-work-detail-meta dd{margin:.32rem 0 0;font-size:.76rem;font-weight:850}
                .outcome-work-detail section{margin-top:1.25rem}
                .outcome-work-detail h4{margin:0;font-size:.72rem;font-weight:950}
                .outcome-work-detail section p,.outcome-work-detail blockquote{margin:.55rem 0 0;color:rgba(247,248,242,.68);font-size:.76rem;line-height:1.85}
                .outcome-work-detail blockquote{padding-left:1rem;border-left:1px solid var(--x-lime)}
                .outcome-work-detail-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1rem}
                .outcome-work-detail-actions a{min-height:38px;padding:.5rem .75rem;font-size:.68rem}
                .outcome-credits{display:grid;grid-template-columns:minmax(280px,.72fr) minmax(0,1.28fr);gap:clamp(2rem,5vw,5rem);margin-top:clamp(5rem,9vw,9rem);padding:clamp(2.5rem,5vw,5rem) 0 1rem;border-top:1px solid rgba(185,255,24,.5)}
                .outcome-credits-lead{align-self:start}
                .outcome-credits-lead>span{display:block;color:var(--x-lime);font-size:.66rem;font-weight:950;letter-spacing:.18em;text-transform:uppercase}
                .outcome-credits-lead>strong{display:block;margin-top:1rem;color:var(--x-lime);font:300 clamp(7rem,13vw,12rem)/.72 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.08em}
                .outcome-credits-lead>div{margin-top:1.6rem;padding-top:1.1rem;border-top:1px solid rgba(247,248,242,.2)}
                .outcome-credits-lead h3{margin:0;font-size:clamp(2rem,4vw,4rem);font-weight:950;letter-spacing:-.04em}
                .outcome-credits-lead>div p{margin:.55rem 0 0;color:var(--x-lime);font-size:.82rem;font-weight:900;letter-spacing:.08em}
                .outcome-credits-lead>p{max-width:34rem;margin:1.2rem 0 0;color:var(--x-muted);font-size:.76rem;line-height:1.8}
                .outcome-credits-groups{display:grid;align-content:start}
                .outcome-credits-groups>section{display:grid;grid-template-columns:minmax(150px,.55fr) minmax(0,1.45fr);gap:1rem;padding:1.4rem 0;border-top:1px solid rgba(247,248,242,.18)}
                .outcome-credits-groups>section:last-child{border-bottom:1px solid rgba(247,248,242,.18)}
                .outcome-credits-groups header{display:grid;grid-template-columns:2rem minmax(0,1fr);gap:.75rem;align-items:start}
                .outcome-credits-groups header>span,.outcome-credits-groups small{color:var(--x-lime);font:850 .65rem/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-credits-groups header p{margin:0;color:var(--x-muted);font-size:.58rem;font-weight:850;letter-spacing:.1em;text-transform:uppercase}
                .outcome-credits-groups h4{margin:.3rem 0 0;font-size:1rem;font-weight:950}
                .outcome-credits-groups section>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 1.25rem}
                .outcome-credits-groups section>div>span{display:grid;grid-template-columns:1.8rem minmax(0,1fr);gap:.5rem;align-items:baseline;padding:.5rem 0;border-bottom:1px solid rgba(247,248,242,.09)}
                .outcome-credits-groups section>div strong{font-size:clamp(.8rem,1vw,.95rem);line-height:1.4}
                .outcome-video-dialog{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:1rem;background:rgba(0,0,0,.88);backdrop-filter:blur(12px)}
                .outcome-video-dialog article{position:relative;width:min(1120px,100%);overflow:hidden;border:1px solid rgba(185,255,24,.36);border-radius:16px;background:#000}
                .outcome-video-dialog video{display:block;width:100%;max-height:calc(100dvh - 2rem)}
                .outcome-video-dialog button{position:absolute;right:1rem;top:1rem;display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(255,255,255,.35);border-radius:50%;background:rgba(0,0,0,.68);color:#fff}
                .outcome-mobile-work{position:fixed;inset:0;z-index:190;display:none;height:100dvh;background:var(--x-ink);color:#fff}
                .outcome-mobile-work-bar{display:flex;min-height:58px;align-items:center;justify-content:space-between;gap:1rem;padding:.6rem 1rem;border-bottom:1px solid rgba(185,255,24,.28)}
                .outcome-mobile-work-bar>div{display:flex;min-width:0;align-items:center;gap:.7rem}.outcome-mobile-work-bar span{color:var(--x-lime);font:900 .72rem/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .outcome-mobile-work-bar strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.82rem}
                .outcome-mobile-work-bar button{display:grid;width:40px;height:40px;place-items:center;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:transparent;color:#fff}
                .outcome-mobile-work-scroll{height:calc(100dvh - 58px);overflow-y:auto;padding:1rem 1rem calc(env(safe-area-inset-bottom) + 2rem)}
                @media(min-width:1121px){.outcome-archive{margin-top:-4rem}}
                @media(max-width:1120px){
                    .hackathon-outcome{padding-top:11.8rem}
                    .outcome-overview{min-height:auto}
                    .outcome-overview-grid{min-height:auto;grid-template-columns:1fr}
                    .outcome-hero-copy{max-width:760px}
                    .outcome-film{width:min(100%,900px);margin-right:0;margin-left:auto}
                    .outcome-works-layout{grid-template-columns:1fr}
                    .outcome-podium,.outcome-work-detail,.outcome-ranking{grid-column:1}
                    .outcome-ranking{position:relative;top:auto}
                    .outcome-work-detail:not(.is-compact){position:relative;top:auto}
                    .outcome-credits{grid-template-columns:1fr}
                }
                @media(max-width:767px){
                    .hackathon-outcome{padding-top:10.8rem}
                    .outcome-x-field{height:780px;opacity:.92}.outcome-x-field img{object-position:58% top}
                    .hackathon-outcome-inner{width:100%}
                    .outcome-overview,.outcome-archive,.outcome-works{padding-inline:1rem;padding-bottom:3.6rem}.outcome-overview{padding-bottom:2rem}
                    .outcome-overview-grid{gap:1.7rem}
                    .outcome-hero-copy{padding-top:.5rem}
                    .outcome-date-line{font-size:.82rem}
                    .outcome-hero-copy h1{font-size:clamp(3.7rem,18vw,5.35rem);line-height:.79;letter-spacing:-.072em}
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
                    .outcome-section-topline{align-items:flex-end}.outcome-section-topline>a,.outcome-section-topline>button{margin-bottom:1rem;min-height:42px;padding:.55rem .72rem}.outcome-archive .outcome-section-topline{display:flex}.outcome-archive .outcome-section-heading{grid-column:auto}.outcome-archive .outcome-section-topline>a{grid-column:auto;justify-self:auto}
                    .outcome-photo-strip{display:flex;overflow-x:auto;overscroll-behavior-inline:contain;scroll-snap-type:x mandatory;gap:.75rem;margin-inline:-1rem;padding:0 1rem .35rem;scrollbar-width:none}
                    .outcome-photo-strip::-webkit-scrollbar{display:none}.outcome-photo-strip figure{min-width:78vw;scroll-snap-align:start}.outcome-photo-strip figure>a{aspect-ratio:4/3;border-radius:12px}
                    .outcome-works-layout{grid-template-columns:1fr;gap:2rem}
                    .outcome-podium{grid-template-columns:1fr 1fr;gap:.75rem}
                    .outcome-podium>h3,.outcome-podium>button:first-of-type{grid-column:1/-1}
                    .outcome-podium>button{grid-template-columns:2.75rem minmax(0,1fr);padding:0 .75rem .85rem;border-radius:13px}
                    .outcome-podium-thumb{width:calc(100% + 1.5rem);margin-inline:-.75rem;aspect-ratio:16/11.5}
                    .outcome-podium>button:first-of-type .outcome-podium-thumb{aspect-ratio:16/8.8}
                    .outcome-podium>button>span{font-size:2rem}
                    .outcome-podium strong{font-size:.8rem}.outcome-podium small{font-size:.61rem}
                    .outcome-ranking>div{max-height:none}.outcome-work-detail:not(.is-compact){display:none}.outcome-mobile-work{display:block}
                    .outcome-ranking button{grid-template-columns:76px 2rem minmax(0,1fr) 1rem;gap:.6rem;padding:.65rem 0}
                    .outcome-credits{grid-template-columns:1fr;gap:2.5rem;margin-top:4rem;padding-top:2.5rem}
                    .outcome-credits-lead{display:grid;grid-template-columns:auto minmax(0,1fr);gap:1rem 1.25rem;align-items:end}
                    .outcome-credits-lead>span,.outcome-credits-lead>p{grid-column:1/-1}
                    .outcome-credits-lead>strong{margin:0;font-size:5.8rem}
                    .outcome-credits-lead>div{margin:0;padding:0 0 .35rem;border-top:0}
                    .outcome-credits-lead h3{font-size:2.15rem}
                    .outcome-credits-groups>section{grid-template-columns:1fr;gap:.8rem;padding:1.2rem 0}
                    .outcome-credits-groups section>div{grid-template-columns:1fr}
                    .outcome-video-dialog{padding:0}.outcome-video-dialog article{border:0;border-radius:0}.outcome-video-dialog video{max-height:100dvh}
                    .outcome-work-detail.is-compact{border:0;padding:0;background:transparent}.outcome-work-detail.is-compact .outcome-work-detail-image{aspect-ratio:16/11}
                }
                @media(max-width:380px){.outcome-primary-actions{grid-template-columns:1fr}.outcome-section-topline>a,.outcome-section-topline>button{max-width:46%;font-size:.68rem}.outcome-stat-grid strong{font-size:1.22rem}}
                @media(prefers-reduced-motion:reduce){.hackathon-outcome *{scroll-behavior:auto!important;animation:none!important;transition-duration:.01ms!important}}
            `}</style>
        </div>
    );
};

export default HackathonOutcomeShowcase;
