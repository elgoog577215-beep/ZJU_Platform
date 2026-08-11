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
    title: work.title || t("hackathon.outcome_archive.fallback_title"),
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
    const { t } = useTranslation();
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
        return source.map((work, index) => normalizeWork(work, index, t));
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

    return (
        <div className={`hackathon-outcome ${isDayMode ? "is-day" : "is-dark"}`} data-showcase-page>
            <SEO
                title={t("hackathon.outcome_archive.meta_title", { title: event.title })}
                description={t("hackathon.outcome_archive.meta_desc", { title: event.title })}
                image={heroCover}
            />

            <main className="hackathon-outcome-inner">
                <section id="showcase-overview" className="outcome-overview" aria-labelledby="outcome-title">
                    <SectionNumber
                        number="01"
                        eyebrow={t("hackathon.outcome_archive.overview_eyebrow")}
                        title={t("hackathon.outcome_archive.overview")}
                        id="overview-heading"
                    />
                    <div className="outcome-overview-grid">
                        <div className="outcome-hero-copy">
                            <p className="outcome-date-line">
                                {formatDate(event.startAt)} · {event.location}
                            </p>
                            <h1 id="outcome-title">
                                {titleParts.map((part) => <span key={part}>{part}</span>)}
                            </h1>
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
                                {officialVideo ? <span><Play className="h-7 w-7" fill="currentColor" /></span> : null}
                            </button>
                            <div><span>{t("hackathon.outcome_archive.official_film")}</span><strong>{officialVideo?.title || t("hackathon.outcome_archive.film_pending")}</strong></div>
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
                        <div className="outcome-ranking">
                            <h3>{t("hackathon.outcome_archive.complete_ranking", { count: works.length })}</h3>
                            <div>
                                {(remainingWorks.length > 0 ? remainingWorks : podium).map((work) => (
                                    <button key={work.id} type="button" onClick={() => selectWork(work)} className={selectedWork?.id === work.id ? "is-selected" : ""}>
                                        <span>{work.rank}</span><strong>{work.title}</strong><small>{work.author}</small><ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <WorkDetail work={selectedWork} t={t} />
                    </div>
                    <footer className="outcome-credits">
                        <div><span>{t("hackathon.outcome_archive.support_eyebrow")}</span><strong>{t("hackathon.outcome_archive.support_title")}</strong></div>
                        <p>{t("hackathon.outcome_archive.support_count", { count: partnerCount })}</p>
                        {(partnerGroups || []).flatMap((group) => group.partners || []).slice(0, 12).map((partner) => (
                            <span key={partner.id || partner.name}>{partner.name}</span>
                        ))}
                    </footer>
                </section>
            </main>

            <CompetitionOutcomeUploadModal open={Boolean(uploadType)} onClose={() => setUploadType(null)} onSubmitted={loadOutcome} initialType={uploadType || "stage_photo"} competitionSlug={competitionSlug} competitionTitle={event.title} />
            <VideoDialog video={officialVideo} open={videoOpen} onClose={() => setVideoOpen(false)} t={t} />
            <MobileWorkDetail work={selectedWork} open={mobileWorkOpen} onClose={closeMobileWork} t={t} />

            <style>{`
                .hackathon-outcome{min-height:100svh;padding:clamp(8.25rem,12vw,10.5rem) 0 calc(var(--mobile-content-bottom-padding,0px) + 4rem);color:#f8fbfc;background:rgba(0,5,6,.24);font-family:"HarmonyOS Sans SC","MiSans","PingFang SC",system-ui,sans-serif}.hackathon-outcome.is-day{color:#071114;background:rgba(247,250,250,.8)}
                .hackathon-outcome-inner{width:min(1400px,calc(100% - 3rem));margin:0 auto;border-left:1px solid rgba(103,232,249,.2)}
                .outcome-overview,.outcome-archive,.outcome-works{padding:0 1rem clamp(4rem,7vw,7rem)}
                .outcome-section-heading{display:flex;align-items:flex-end;gap:1.1rem;padding:1rem 0 2rem}.outcome-section-heading>span{color:#67e8f9;font:300 clamp(3.6rem,8vw,7.4rem)/.72 ui-monospace,SFMono-Regular,Menlo,monospace;opacity:.45}.outcome-section-heading p{margin:0 0 .38rem;color:#67e8f9;font-size:.65rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.outcome-section-heading h2{margin:0;font-size:clamp(1.15rem,2vw,1.75rem);font-weight:950;letter-spacing:-.035em}
                .outcome-overview-grid{display:grid;grid-template-columns:minmax(0,.92fr) minmax(520px,1.08fr);gap:clamp(2rem,5vw,5rem);align-items:center}.outcome-date-line{margin:0;color:rgba(255,255,255,.58);font-size:.74rem;font-weight:800;letter-spacing:.04em}.is-day .outcome-date-line{color:rgba(7,17,20,.56)}.outcome-hero-copy h1{display:grid;margin:1rem 0 0;font-size:clamp(4.2rem,8vw,8.1rem);font-weight:950;line-height:.77;letter-spacing:-.075em}.outcome-description{max-width:660px;margin:1.5rem 0 0;color:rgba(255,255,255,.72);font-size:.95rem;font-weight:650;line-height:1.85}.is-day .outcome-description{color:rgba(7,17,20,.7)}
                .outcome-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);margin-top:1.45rem;border-top:1px solid rgba(255,255,255,.14);border-left:1px solid rgba(255,255,255,.14)}.outcome-stat-grid>div{padding:.85rem;border-right:1px solid rgba(255,255,255,.14);border-bottom:1px solid rgba(255,255,255,.14)}.outcome-stat-grid strong{display:block;color:#67e8f9;font:900 1.4rem/1 ui-monospace,SFMono-Regular,Menlo,monospace}.outcome-stat-grid small{margin-left:.28rem;font-size:.7rem;color:inherit}.outcome-stat-grid span{display:block;margin-top:.5rem;font-size:.66rem;font-weight:800;opacity:.68}
                .outcome-primary-actions{display:flex;gap:.75rem;margin-top:1.4rem}.outcome-primary-actions button,.outcome-section-topline>a,.outcome-section-topline>button{display:inline-flex;min-height:44px;align-items:center;justify-content:center;gap:.6rem;padding:.65rem 1rem;border:1px solid rgba(103,232,249,.42);background:transparent;color:inherit;font-size:.76rem;font-weight:900}.outcome-primary-actions button:first-child{background:#67e8f9;color:#051013}.outcome-primary-actions button:hover,.outcome-section-topline>a:hover,.outcome-section-topline>button:hover{border-color:#67e8f9;background:rgba(103,232,249,.1)}
                .outcome-film button{position:relative;display:block;width:100%;aspect-ratio:16/10;border:1px solid rgba(255,255,255,.28);background:#061014;padding:.65rem}.outcome-film button>span{position:absolute;left:50%;top:50%;display:grid;width:76px;height:76px;place-items:center;transform:translate(-50%,-50%);border:1px solid rgba(255,255,255,.82);background:rgba(0,0,0,.46);color:#fff}.outcome-film>div{display:flex;justify-content:space-between;gap:1rem;padding:.8rem .1rem 0;font-size:.69rem}.outcome-film>div span{color:#67e8f9;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.outcome-film>div strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.62}
                .outcome-section-topline{display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;border-top:1px solid rgba(103,232,249,.28)}.outcome-section-topline .outcome-section-heading{padding-bottom:1.3rem}.outcome-section-topline>a,.outcome-section-topline>button{margin-bottom:1.3rem}
                .outcome-photo-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.45rem}.outcome-photo-strip figure{min-width:0;margin:0}.outcome-photo-strip figure>a{display:block;aspect-ratio:1.45/1;overflow:hidden;background:#061014}.outcome-photo-strip img{transition:transform .5s ease}.outcome-photo-strip a:hover img{transform:scale(1.02)}.outcome-photo-strip figcaption{display:grid;grid-template-columns:2rem minmax(0,1fr);gap:.4rem;padding:.75rem 0;border-bottom:1px solid rgba(255,255,255,.12)}.outcome-photo-strip figcaption span{color:#67e8f9;font:800 .68rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}.outcome-photo-strip figcaption strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}.outcome-empty-line{min-height:210px;display:grid;place-items:center;border-block:1px solid rgba(255,255,255,.12);font-weight:800;opacity:.48}
                .outcome-works-layout{display:grid;grid-template-columns:minmax(280px,.8fr) minmax(260px,.64fr) minmax(420px,1.05fr);gap:1.8rem}.outcome-works-layout h3{margin:0 0 1rem;font-size:.76rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.outcome-podium>button{width:100%;display:grid;grid-template-columns:92px 2.2rem minmax(0,1fr);align-items:center;gap:.75rem;padding:.65rem 0;border:0;border-bottom:1px solid rgba(255,255,255,.13);background:transparent;color:inherit;text-align:left}.outcome-podium>button.is-selected,.outcome-podium>button:hover{border-bottom-color:#67e8f9}.outcome-podium-thumb{aspect-ratio:16/10;overflow:hidden;background:#061014}.outcome-podium>button>span{color:#67e8f9;font:900 .76rem/1 ui-monospace,SFMono-Regular,Menlo,monospace}.outcome-podium strong,.outcome-podium small{display:block}.outcome-podium strong{font-size:.84rem;line-height:1.3}.outcome-podium small{margin-top:.32rem;font-size:.65rem;opacity:.5}
                .outcome-ranking>div{max-height:360px;overflow-y:auto;border-top:1px solid rgba(255,255,255,.14)}.outcome-ranking button{width:100%;display:grid;grid-template-columns:2rem minmax(0,1fr) auto 1rem;align-items:center;gap:.55rem;padding:.75rem .25rem;border:0;border-bottom:1px solid rgba(255,255,255,.12);background:transparent;color:inherit;text-align:left}.outcome-ranking button:hover,.outcome-ranking button.is-selected{background:rgba(103,232,249,.06);color:#9af0fb}.outcome-ranking button>span{color:#67e8f9;font:850 .72rem/1 ui-monospace,SFMono-Regular,Menlo,monospace}.outcome-ranking strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}.outcome-ranking small{max-width:7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.62rem;opacity:.5}
                .outcome-work-detail{border:1px solid rgba(255,255,255,.16);padding:1rem}.outcome-work-detail:not(.is-compact){position:sticky;top:5rem;max-height:720px;overflow-y:auto}.outcome-work-detail-head{display:grid;grid-template-columns:2.4rem minmax(0,1fr);gap:.65rem;align-items:start}.outcome-work-detail-head>span{color:#67e8f9;font:900 .78rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}.outcome-work-detail-head p{margin:0;color:#67e8f9;font-size:.62rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.outcome-work-detail-head h3{margin:.32rem 0 0;font-size:1.05rem;letter-spacing:0;text-transform:none}.outcome-work-detail-image{margin-top:1rem;aspect-ratio:16/8.7;overflow:hidden;background:#061014}.outcome-work-detail-meta{display:grid;grid-template-columns:1fr 1fr;margin:0;border-left:1px solid rgba(255,255,255,.12)}.outcome-work-detail-meta>div{padding:.75rem;border-right:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.12)}.outcome-work-detail-meta dt{font-size:.58rem;font-weight:900;opacity:.45;text-transform:uppercase}.outcome-work-detail-meta dd{margin:.3rem 0 0;font-size:.7rem;font-weight:800}.outcome-work-detail section{margin-top:1rem}.outcome-work-detail h4{margin:0;font-size:.68rem;font-weight:950}.outcome-work-detail section p,.outcome-work-detail blockquote{margin:.45rem 0 0;color:rgba(255,255,255,.64);font-size:.72rem;line-height:1.75}.outcome-work-detail blockquote{padding-left:.75rem;border-left:2px solid #67e8f9}.outcome-work-detail-actions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1rem}.outcome-work-detail-actions a{display:inline-flex;min-height:38px;align-items:center;gap:.45rem;padding:.5rem .75rem;border:1px solid rgba(103,232,249,.34);color:inherit;font-size:.68rem;font-weight:900}
                .outcome-credits{display:flex;flex-wrap:wrap;align-items:center;gap:.65rem 1rem;margin-top:3.5rem;padding:1.25rem 0;border-block:1px solid rgba(255,255,255,.12)}.outcome-credits>div{margin-right:auto}.outcome-credits>div span,.outcome-credits>div strong{display:block}.outcome-credits>div span{color:#67e8f9;font-size:.6rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.outcome-credits>div strong{margin-top:.25rem;font-size:.85rem}.outcome-credits p{margin:0;font-size:.66rem;opacity:.48}.outcome-credits>span{font-size:.66rem;font-weight:800;opacity:.62}
                .outcome-video-dialog{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:1rem;background:rgba(0,0,0,.88);backdrop-filter:blur(12px)}.outcome-video-dialog article{position:relative;width:min(1120px,100%);border:1px solid rgba(103,232,249,.34);background:#000}.outcome-video-dialog video{display:block;width:100%;max-height:calc(100dvh - 2rem)}.outcome-video-dialog button{position:absolute;right:1rem;top:1rem;display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.68);color:#fff}
                .outcome-mobile-work{position:fixed;inset:0;z-index:190;display:none;height:100dvh;background:#030708;color:#fff}.outcome-mobile-work-bar{display:flex;min-height:58px;align-items:center;justify-content:space-between;gap:1rem;padding:.6rem 1rem;border-bottom:1px solid rgba(103,232,249,.26)}.outcome-mobile-work-bar>div{display:flex;min-width:0;align-items:center;gap:.7rem}.outcome-mobile-work-bar span{color:#67e8f9;font:900 .72rem/1 ui-monospace,SFMono-Regular,Menlo,monospace}.outcome-mobile-work-bar strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.82rem}.outcome-mobile-work-bar button{display:grid;width:40px;height:40px;place-items:center;border:1px solid rgba(255,255,255,.18);background:transparent;color:#fff}.outcome-mobile-work-scroll{height:calc(100dvh - 58px);overflow-y:auto;padding:1rem 1rem calc(env(safe-area-inset-bottom) + 2rem)}
                .is-day .outcome-stat-grid,.is-day .outcome-stat-grid>div,.is-day .outcome-photo-strip figcaption,.is-day .outcome-podium>button,.is-day .outcome-ranking>div,.is-day .outcome-ranking button,.is-day .outcome-work-detail,.is-day .outcome-work-detail-meta,.is-day .outcome-work-detail-meta>div,.is-day .outcome-credits{border-color:rgba(7,17,20,.15)}.is-day .outcome-work-detail section p,.is-day .outcome-work-detail blockquote{color:rgba(7,17,20,.65)}
                @media(max-width:1050px){.hackathon-outcome{padding-top:11.5rem}.outcome-overview-grid{grid-template-columns:1fr}.outcome-film{width:min(100%,820px)}.outcome-works-layout{grid-template-columns:1fr 1fr}.outcome-work-detail{grid-column:1/-1}.outcome-work-detail:not(.is-compact){position:relative;top:auto}}
                @media(max-width:767px){.hackathon-outcome{padding-top:10.8rem}.hackathon-outcome-inner{width:100%;border-left:0}.outcome-overview,.outcome-archive,.outcome-works{padding-inline:1rem;padding-bottom:3.5rem}.outcome-section-heading{gap:.6rem;padding-bottom:1.35rem}.outcome-section-heading>span{font-size:3.6rem}.outcome-overview-grid{gap:1.75rem}.outcome-hero-copy h1{font-size:clamp(3.3rem,18vw,5.4rem);line-height:.79}.outcome-description{display:-webkit-box;overflow:hidden;-webkit-line-clamp:4;-webkit-box-orient:vertical;font-size:.84rem}.outcome-stat-grid{grid-template-columns:repeat(2,1fr)}.outcome-primary-actions{display:grid;grid-template-columns:1fr 1fr}.outcome-film button{aspect-ratio:4/3;padding:.45rem}.outcome-film button>span{width:58px;height:58px}.outcome-section-topline{align-items:flex-end}.outcome-section-topline>a,.outcome-section-topline>button{margin-bottom:1rem;padding:.55rem .7rem}.outcome-photo-strip{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:.7rem;margin-inline:-1rem;padding-inline:1rem;scrollbar-width:none}.outcome-photo-strip figure{min-width:76vw;scroll-snap-align:start}.outcome-photo-strip figure>a{aspect-ratio:4/3}.outcome-works-layout{grid-template-columns:1fr;gap:2rem}.outcome-podium>button{grid-template-columns:86px 1.8rem minmax(0,1fr)}.outcome-ranking>div{max-height:none}.outcome-work-detail:not(.is-compact){display:none}.outcome-mobile-work{display:block}.outcome-credits{align-items:flex-start}.outcome-credits>div{width:100%}.outcome-video-dialog{padding:0}.outcome-video-dialog article{border:0}.outcome-video-dialog video{max-height:100dvh}.outcome-work-detail.is-compact{border:0;padding:0}.outcome-work-detail.is-compact .outcome-work-detail-image{aspect-ratio:16/11}}
                @media(prefers-reduced-motion:reduce){.hackathon-outcome *{scroll-behavior:auto!important;animation:none!important;transition-duration:.01ms!important}}
            `}</style>
        </div>
    );
};

export default HackathonOutcomeShowcase;
