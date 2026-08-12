import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Film, Image as ImageIcon, Play, Upload, X } from "lucide-react";

import CompetitionOutcomeUploadModal from "./CompetitionOutcomeUploadModal";
import Lightbox from "./Lightbox";
import SEO from "./SEO";
import SmartImage from "./SmartImage";
import { useSettings } from "../context/SettingsContext";
import { useBackClose, useBodyScrollLock } from "../hooks/useBackClose";
import { useHackathonSchedule } from "../hooks/useHackathonSchedule";
import api from "../services/api";
import { getThumbnailUrl, normalizeExternalImageUrl } from "../utils/imageUtils";

const dateLabel = (value) => {
    const match = String(value || "").match(/(?:\d{4}[.-])?(\d{2})[.-](\d{2})/);
    return match ? `${match[1]}.${match[2]}` : "—";
};

const normalizePhoto = (item, index) => ({
    ...item,
    id: item.source_table === "photos" ? item.source_id : item.id,
    archiveId: item.id || `${item.source_table || "photo"}-${item.source_id || index}`,
    url: item.url || item.cover_url,
    title: item.title || `Photo ${String(index + 1).padStart(2, "0")}`,
});

const normalizeVideo = (item, index) => ({
    ...item,
    id: item.source_table === "videos" ? item.source_id : item.id,
    archiveId: item.id || `${item.source_table || "video"}-${item.source_id || index}`,
    video: item.url || item.video,
    thumbnail: item.cover_url || item.thumbnail,
    title: item.title || `Film ${String(index + 1).padStart(2, "0")}`,
});

const ArchiveRail = ({ archives, selectedSlug, onSelect, isDayMode, t }) => (
    <div className="media-event-rail" aria-label={t("media_archive.event_switcher_aria")}>
        <div className="media-event-rail-label">
            {t("media_archive.rail_label")}
            <span>{t("media_archive.rail_label_en")}</span>
        </div>
        <div className="media-event-rail-scroll">
            {archives.map((archive) => {
                const selected = archive.slug === selectedSlug;
                return (
                    <button
                        key={archive.slug}
                        type="button"
                        aria-current={selected ? "page" : undefined}
                        onClick={() => onSelect(archive.slug)}
                        className={`media-event-tab ${selected ? "is-selected" : ""} ${isDayMode ? "is-day" : ""}`}
                    >
                        <span className="media-event-date">{dateLabel(archive.event_date)}</span>
                        <span className="media-event-name">{archive.title}</span>
                        <span className="media-event-count">
                            {t("media_archive.count_short", { count: archive.media_count || 0 })}
                        </span>
                    </button>
                );
            })}
        </div>
    </div>
);

const PhotoArchiveCard = ({ photo, index, onOpen, t }) => (
    <motion.article
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.18 }}
        transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.035 }}
        className={`media-archive-photo ${index === 0 ? "is-lead" : ""}`}
    >
        <button
            type="button"
            className="media-archive-photo-button"
            onClick={() => onOpen(index)}
            aria-label={t("media_archive.open_photo", { title: photo.title })}
        >
            <SmartImage
                src={normalizeExternalImageUrl(photo.url, index === 0 ? 1400 : 900)}
                alt={photo.title}
                type="image"
                priority={index < 2}
                className="h-full w-full"
                imageClassName="h-full w-full object-cover"
            />
        </button>
        <div className="media-archive-caption">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
                <h3>{photo.title}</h3>
                <p>{photo.category_name || t("media_archive.field_photo")}</p>
            </div>
        </div>
    </motion.article>
);

const VideoArchiveCard = ({ video, index, onOpen, t }) => (
    <article className="media-archive-video">
        <button
            type="button"
            className="media-archive-video-button"
            onClick={() => onOpen(video)}
            aria-label={t("media_archive.open_video", { title: video.title })}
        >
            <SmartImage
                src={getThumbnailUrl(video.thumbnail)}
                alt={video.title}
                type="video"
                priority={index === 0}
                className="h-full w-full"
                imageClassName="h-full w-full object-cover"
            />
            <span className="media-archive-play" aria-hidden="true">
                <Play className="h-5 w-5" fill="currentColor" />
            </span>
        </button>
        <div className="media-archive-video-meta">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
                <h3>{video.title}</h3>
                <p>
                    {video.role === "official_film"
                        ? t("media_archive.official_film")
                        : t("media_archive.event_video")}
                </p>
            </div>
        </div>
    </article>
);

const EventVideoDialog = ({ video, onClose, t }) => {
    useBackClose(Boolean(video), onClose);
    useBodyScrollLock(Boolean(video));
    if (!video || typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="media-event-video-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={t("media_archive.video_dialog", { title: video.title })}
                onMouseDown={onClose}
            >
                <motion.article
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className="media-event-video-panel"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <div className="media-event-video-frame">
                        <video src={video.video} poster={video.thumbnail} controls autoPlay />
                        <button type="button" onClick={onClose} aria-label={t("common.close")}>
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="media-event-video-copy">
                        <p>
                            {video.role === "official_film"
                                ? t("media_archive.official_film")
                                : t("media_archive.event_video")}
                        </p>
                        <h2>{video.title}</h2>
                    </div>
                </motion.article>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

const MediaEventArchive = () => {
    const { t } = useTranslation();
    const { settings, uiMode } = useSettings();
    const { schedule } = useHackathonSchedule(settings);
    const isDayMode = uiMode === "day";
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedSlug = String(searchParams.get("event") || "").trim();
    const [archives, setArchives] = useState([]);
    const [outcome, setOutcome] = useState(null);
    const [loadingArchives, setLoadingArchives] = useState(true);
    const [loadingOutcome, setLoadingOutcome] = useState(false);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [uploadType, setUploadType] = useState(null);
    const requestedPhoto = String(searchParams.get("photo") || "").trim();
    const syncedPhotoRef = useRef("");

    const displayedArchives = useMemo(
        () =>
            archives.map((archive) => {
                const scheduled = schedule.events.find(
                    (item) => item.results.competitionSlug === archive.slug
                );
                return scheduled
                    ? {
                          ...archive,
                          title: scheduled.event.title || archive.title,
                          description: scheduled.event.description || archive.description,
                          event_date: scheduled.event.startAt || archive.event_date,
                      }
                    : archive;
            }),
        [archives, schedule.events]
    );

    const selectedArchive = useMemo(
        () =>
            displayedArchives.find((archive) => archive.slug === requestedSlug) ||
            displayedArchives.find((archive) => archive.is_featured) ||
            displayedArchives[0] ||
            null,
        [displayedArchives, requestedSlug]
    );

    const loadArchives = useCallback(async () => {
        setLoadingArchives(true);
        try {
            const response = await api.get("/competitions");
            setArchives(Array.isArray(response.data) ? response.data : []);
        } catch {
            setArchives([]);
        } finally {
            setLoadingArchives(false);
        }
    }, []);

    const loadOutcome = useCallback(async (slug) => {
        if (!slug) {
            setOutcome(null);
            return;
        }
        setLoadingOutcome(true);
        try {
            const response = await api.get(`/competitions/${encodeURIComponent(slug)}/outcome`, {
                params: { stagePhotoLimit: 120, promoVideoLimit: 24, workLimit: 100 },
            });
            setOutcome(response.data || null);
        } catch {
            setOutcome(null);
        } finally {
            setLoadingOutcome(false);
        }
    }, []);

    useEffect(() => {
        loadArchives();
    }, [loadArchives]);

    useEffect(() => {
        if (!selectedArchive) return;
        if (requestedSlug !== selectedArchive.slug) {
            const next = new URLSearchParams(searchParams);
            next.set("event", selectedArchive.slug);
            setSearchParams(next, { replace: true });
            return;
        }
        loadOutcome(selectedArchive.slug);
    }, [loadOutcome, requestedSlug, searchParams, selectedArchive, setSearchParams]);

    useEffect(() => {
        setSelectedPhotoIndex(null);
        setSelectedVideo(null);
    }, [selectedArchive?.slug]);

    const photos = useMemo(
        () =>
            (Array.isArray(outcome?.media?.stage_photos) ? outcome.media.stage_photos : []).map(
                normalizePhoto
            ),
        [outcome]
    );
    const videos = useMemo(
        () =>
            (Array.isArray(outcome?.media?.promo_videos) ? outcome.media.promo_videos : []).map(
                normalizeVideo
            ),
        [outcome]
    );
    const selectedPhoto = selectedPhotoIndex === null ? null : photos[selectedPhotoIndex];

    useEffect(() => {
        if (!requestedPhoto) {
            syncedPhotoRef.current = "";
            return;
        }
        if (photos.length === 0 || syncedPhotoRef.current === requestedPhoto) return;
        const index = photos.findIndex(
            (photo) =>
                String(photo.source_id || photo.id) === requestedPhoto ||
                String(photo.archiveId) === requestedPhoto
        );
        syncedPhotoRef.current = requestedPhoto;
        if (index >= 0) setSelectedPhotoIndex(index);
    }, [photos, requestedPhoto]);

    const selectArchive = (slug) => {
        const next = new URLSearchParams(searchParams);
        next.set("event", slug);
        next.delete("photo");
        setSearchParams(next);
    };

    const openPhoto = (index) => {
        setSelectedPhotoIndex(index);
        const next = new URLSearchParams(searchParams);
        const photo = photos[index];
        if (photo) {
            const photoId = String(photo.source_id || photo.id || photo.archiveId);
            syncedPhotoRef.current = photoId;
            next.set("photo", photoId);
        }
        setSearchParams(next);
    };

    const closePhoto = () => {
        syncedPhotoRef.current = requestedPhoto;
        setSelectedPhotoIndex(null);
        const next = new URLSearchParams(searchParams);
        next.delete("photo");
        setSearchParams(next, { replace: true });
    };

    const movePhoto = (delta) => {
        setSelectedPhotoIndex((current) => {
            if (current === null || photos.length === 0) return null;
            const nextIndex = (current + delta + photos.length) % photos.length;
            const next = new URLSearchParams(searchParams);
            const nextPhoto = photos[nextIndex];
            const photoId = String(nextPhoto.source_id || nextPhoto.id || nextPhoto.archiveId);
            syncedPhotoRef.current = photoId;
            next.set("photo", photoId);
            setSearchParams(next, { replace: true });
            return nextIndex;
        });
    };

    const refreshSelected = () => {
        loadArchives();
        if (selectedArchive?.slug) loadOutcome(selectedArchive.slug);
    };

    const empty = !loadingOutcome && photos.length === 0 && videos.length === 0;

    return (
        <section className={`media-event-archive ${isDayMode ? "is-day" : "is-dark"}`}>
            <SEO
                title={t("media_archive.meta_title")}
                description={t("media_archive.meta_desc")}
                image={selectedArchive?.archive_cover || undefined}
            />

            <picture className="media-x-field" aria-hidden="true">
                <source media="(max-width: 767px)" srcSet="/images/hackathon/x-field-mobile.webp" />
                <img src="/images/hackathon/x-field-desktop.webp" alt="" />
            </picture>

            <div className="media-event-inner">
                <ArchiveRail
                    archives={displayedArchives}
                    selectedSlug={selectedArchive?.slug}
                    onSelect={selectArchive}
                    isDayMode={isDayMode}
                    t={t}
                />

                <header className="media-event-header">
                    <div>
                        <p className="media-event-kicker">01 / {t("media_archive.event_record")}</p>
                        <h1>{selectedArchive?.title || t("media_archive.title")}</h1>
                        <p className="media-event-description">
                            {selectedArchive?.description || t("media_archive.description")}
                        </p>
                    </div>
                    <div className="media-event-summary">
                        <div>
                            <strong>{outcome?.stats?.stage_photos || 0}</strong>
                            <span>{t("media_archive.photos")}</span>
                        </div>
                        <div>
                            <strong>{outcome?.stats?.promo_videos || 0}</strong>
                            <span>{t("media_archive.videos")}</span>
                        </div>
                        <div>
                            <strong>{outcome?.stats?.works || 0}</strong>
                            <span>{t("media_archive.works")}</span>
                        </div>
                    </div>
                    <div className="media-event-actions">
                        <button type="button" onClick={() => setUploadType("stage_photo")}>
                            <Upload className="h-4 w-4" />
                            {t("media_archive.upload")}
                        </button>
                        {selectedArchive ? (
                            <>
                                <a
                                    href={`/projects?competition=${encodeURIComponent(selectedArchive.slug)}`}
                                >
                                    {t("media_archive.view_projects", "进入本场项目广场")}
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                                <a
                                    href={`/hackathon?view=showcase&competition=${encodeURIComponent(selectedArchive.slug)}#showcase-works`}
                                >
                                    {t("media_archive.view_works")}
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            </>
                        ) : null}
                    </div>
                </header>

                {loadingArchives || loadingOutcome ? (
                    <div className="media-event-loading">{t("media_archive.loading")}</div>
                ) : empty ? (
                    <div className="media-event-empty">
                        <ImageIcon className="h-8 w-8" />
                        <h2>{t("media_archive.empty_title")}</h2>
                        <p>{t("media_archive.empty_desc")}</p>
                    </div>
                ) : (
                    <>
                        <section
                            className="media-event-section"
                            aria-labelledby="event-photo-heading"
                        >
                            <div className="media-event-section-heading">
                                <div>
                                    <span>02</span>
                                    <div>
                                        <p>{t("media_archive.photo_eyebrow")}</p>
                                        <h2 id="event-photo-heading">
                                            {t("media_archive.photo_title")}
                                        </h2>
                                    </div>
                                </div>
                                <strong>
                                    {t("media_archive.photo_count", { count: photos.length })}
                                </strong>
                            </div>
                            <div className="media-archive-photo-grid">
                                {photos.map((photo, index) => (
                                    <PhotoArchiveCard
                                        key={photo.archiveId}
                                        photo={photo}
                                        index={index}
                                        onOpen={openPhoto}
                                        t={t}
                                    />
                                ))}
                            </div>
                        </section>

                        {videos.length > 0 ? (
                            <section
                                className="media-event-section"
                                aria-labelledby="event-video-heading"
                            >
                                <div className="media-event-section-heading">
                                    <div>
                                        <span>03</span>
                                        <div>
                                            <p>{t("media_archive.video_eyebrow")}</p>
                                            <h2 id="event-video-heading">
                                                {t("media_archive.video_title")}
                                            </h2>
                                        </div>
                                    </div>
                                    <Film className="h-5 w-5" />
                                </div>
                                <div className="media-archive-video-grid">
                                    {videos.map((video, index) => (
                                        <VideoArchiveCard
                                            key={video.archiveId}
                                            video={video}
                                            index={index}
                                            onOpen={setSelectedVideo}
                                            t={t}
                                        />
                                    ))}
                                </div>
                            </section>
                        ) : null}
                    </>
                )}
            </div>

            {selectedPhoto ? (
                <Lightbox
                    photo={selectedPhoto}
                    onClose={closePhoto}
                    onNext={photos.length > 1 ? () => movePhoto(1) : undefined}
                    onPrev={photos.length > 1 ? () => movePhoto(-1) : undefined}
                />
            ) : null}
            <EventVideoDialog video={selectedVideo} onClose={() => setSelectedVideo(null)} t={t} />
            <CompetitionOutcomeUploadModal
                open={Boolean(uploadType)}
                onClose={() => setUploadType(null)}
                onSubmitted={refreshSelected}
                initialType={uploadType || "stage_photo"}
                competitionSlug={selectedArchive?.slug}
                competitionTitle={selectedArchive?.title}
            />

            <style>{`
                .media-event-archive{
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
                    padding:clamp(5.2rem,8vw,7rem) 0 calc(var(--mobile-content-bottom-padding,0px) + 4rem);
                    font-family:"HarmonyOS Sans SC","MiSans","PingFang SC",system-ui,sans-serif;
                    color:var(--x-text);
                    background:var(--x-ink);
                }
                .media-x-field{position:absolute;z-index:-1;inset:0 0 auto;height:880px;overflow:hidden;pointer-events:none;opacity:.72}
                .media-x-field img{width:100%;height:100%;object-fit:cover;object-position:center top;filter:saturate(1.05) contrast(1.08)}
                .media-event-inner{width:min(1480px,calc(100% - 4rem));margin:0 auto}
                .media-event-rail{overflow:hidden;border:1px solid rgba(185,255,24,.27);border-radius:13px;background:rgba(2,8,6,.62);backdrop-filter:blur(14px)}
                .media-event-rail-label{padding:.72rem 1rem;border-bottom:1px solid rgba(247,248,242,.1);font-size:.68rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--x-lime)}
                .media-event-rail-label span{margin-left:.55rem;color:rgba(247,248,242,.38)}
                .media-event-rail-scroll{display:flex;overflow-x:auto;overscroll-behavior-inline:contain;scrollbar-width:none}.media-event-rail-scroll::-webkit-scrollbar{display:none}
                .media-event-tab,.media-event-tab.is-day{min-width:290px;min-height:66px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:1rem;padding:.85rem 1rem;border:0;border-right:1px solid rgba(247,248,242,.1);background:transparent;color:rgba(247,248,242,.56);text-align:left;transition:background-color .2s ease,color .2s ease,box-shadow .2s ease}
                .media-event-tab:hover{color:#fff;background:rgba(185,255,24,.07)}
                .media-event-tab.is-selected,.media-event-tab.is-day.is-selected{color:#fff;box-shadow:inset 0 -2px var(--x-lime);background:rgba(185,255,24,.08)}
                .media-event-date{font:900 1.35rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--x-lime)}
                .media-event-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:1rem;font-weight:900}
                .media-event-count{font-size:.68rem;font-weight:800;letter-spacing:.04em;opacity:.58}
                .media-event-header{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(310px,.65fr);gap:2.5rem;padding:clamp(3rem,6vw,6rem) 0 3.5rem}
                .media-event-kicker{color:var(--x-lime);font:900 .72rem/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase}
                .media-event-header h1{max-width:900px;margin:1rem 0 0;font-size:clamp(3rem,6.7vw,7rem);font-weight:950;line-height:.9;letter-spacing:-.065em;text-wrap:balance;text-shadow:0 10px 40px rgba(0,0,0,.38)}
                .media-event-description{max-width:700px;margin:1.35rem 0 0;color:rgba(247,248,242,.7);font-size:.95rem;line-height:1.9}
                .media-event-summary{align-self:end;display:grid;grid-template-columns:repeat(3,1fr);border-block:1px solid rgba(247,248,242,.15);background:rgba(2,8,6,.2)}
                .media-event-summary div{position:relative;padding:1rem}
                .media-event-summary div+div::before{content:"";position:absolute;left:0;top:24%;height:52%;width:1px;background:rgba(185,255,24,.36)}
                .media-event-summary strong{display:block;color:var(--x-lime);font:900 1.75rem/1 ui-monospace,SFMono-Regular,Menlo,monospace}
                .media-event-summary span{display:block;margin-top:.55rem;font-size:.72rem;font-weight:800;color:var(--x-muted)}
                .media-event-actions{grid-column:1/-1;display:flex;gap:.75rem}
                .media-event-actions button,.media-event-actions a{display:inline-flex;min-height:46px;align-items:center;justify-content:center;gap:.55rem;padding:.68rem 1.05rem;border:1px solid rgba(185,255,24,.5);border-radius:11px;background:rgba(2,8,6,.36);color:inherit;font-size:.78rem;font-weight:900;transition:transform .2s ease,background-color .2s ease}
                .media-event-actions button{border-color:var(--x-lime);background:var(--x-lime);color:#071006}
                .media-event-actions button:hover,.media-event-actions a:hover{transform:translateY(-2px);background:rgba(185,255,24,.13)}
                .media-event-actions button:hover{background:var(--x-lime-soft)}
                .media-event-section{padding:3.5rem 0 1rem}
                .media-event-section-heading{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin-bottom:1.6rem;padding-bottom:1rem;border-bottom:1px solid rgba(185,255,24,.28)}
                .media-event-section-heading>div{display:flex;align-items:end;gap:1rem}.media-event-section-heading>div>span{color:var(--x-lime);font:300 clamp(3rem,7vw,6rem)/.7 ui-monospace,SFMono-Regular,Menlo,monospace}
                .media-event-section-heading p{margin:0 0 .35rem;color:var(--x-lime);font-size:.65rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
                .media-event-section-heading h2{margin:0;font-size:clamp(1.45rem,2.5vw,2.35rem);font-weight:950;letter-spacing:-.035em}
                .media-event-section-heading>strong{font-size:.72rem;letter-spacing:.08em;color:var(--x-muted)}
                .media-archive-photo-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:1.15rem}
                .media-archive-photo{grid-column:span 4;min-width:0}.media-archive-photo.is-lead{grid-column:span 8}
                .media-archive-photo-button{display:block;width:100%;aspect-ratio:16/10;overflow:hidden;border:0;border-radius:14px;background:var(--x-surface);padding:0;box-shadow:0 16px 38px rgba(0,0,0,.26)}
                .media-archive-photo.is-lead .media-archive-photo-button{aspect-ratio:16/8.7;border-radius:24px 12px 24px 12px}
                .media-archive-photo-button img{transition:transform .55s ease}.media-archive-photo-button:hover img{transform:scale(1.018)}
                .media-archive-caption,.media-archive-video-meta{display:grid;grid-template-columns:2.25rem minmax(0,1fr);gap:.65rem;padding:.8rem 0 1.1rem;border-bottom:1px solid rgba(247,248,242,.12)}
                .media-archive-caption>span,.media-archive-video-meta>span{color:var(--x-lime);font:800 .7rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
                .media-archive-caption h3,.media-archive-video-meta h3{margin:0;font-size:.86rem;font-weight:900}.media-archive-caption p,.media-archive-video-meta p{margin:.28rem 0 0;font-size:.68rem;font-weight:700;color:var(--x-muted)}
                .media-archive-video-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.15rem}
                .media-archive-video-button{position:relative;display:block;width:100%;aspect-ratio:16/9;overflow:hidden;border:0;border-radius:14px;background:var(--x-surface);padding:0}
                .media-archive-play{position:absolute;left:50%;top:50%;display:grid;width:48px;height:48px;place-items:center;transform:translate(-50%,-50%);border:1px solid rgba(255,255,255,.7);border-radius:50%;background:rgba(0,0,0,.42);color:#fff}
                .media-archive-video-button:hover .media-archive-play{background:var(--x-lime);color:#061006;border-color:var(--x-lime)}
                .media-event-loading,.media-event-empty{min-height:42vh;display:grid;place-items:center;text-align:center;border-top:1px solid rgba(247,248,242,.12);font-weight:800;opacity:.62}.media-event-empty{align-content:center;gap:.75rem}.media-event-empty h2,.media-event-empty p{margin:0}
                .media-event-video-dialog{position:fixed;inset:0;z-index:170;display:grid;place-items:center;padding:1rem;background:rgba(0,0,0,.86);backdrop-filter:blur(12px)}
                .media-event-video-panel{width:min(1120px,100%);max-height:calc(100dvh - 2rem);overflow:auto;border:1px solid rgba(185,255,24,.3);border-radius:16px;background:#030806;color:#fff}
                .media-event-video-frame{position:relative;aspect-ratio:16/9;background:#000}.media-event-video-frame video{width:100%;height:100%;display:block}
                .media-event-video-frame button{position:absolute;right:1rem;top:1rem;display:grid;width:42px;height:42px;place-items:center;border:1px solid rgba(255,255,255,.3);border-radius:50%;background:rgba(0,0,0,.65);color:#fff}
                .media-event-video-copy{padding:1.25rem}.media-event-video-copy p{margin:0;color:var(--x-lime);font-size:.66rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.media-event-video-copy h2{margin:.45rem 0 0;font-size:clamp(1.4rem,3vw,2.4rem)}
                @media(max-width:900px){.media-event-inner{width:min(100% - 1.5rem,1480px)}.media-event-header{grid-template-columns:1fr;gap:1.5rem}.media-event-summary{width:min(100%,520px)}.media-archive-photo{grid-column:span 6}.media-archive-photo.is-lead{grid-column:span 12}.media-archive-video-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
                @media(max-width:640px){
                    .media-event-archive{padding-top:4.5rem}.media-x-field{height:720px;opacity:.82}.media-x-field img{object-position:58% top}.media-event-inner{width:100%}
                    .media-event-rail{margin-inline:.75rem;border-radius:11px}.media-event-rail-label{padding:.7rem 1rem}.media-event-tab,.media-event-tab.is-day{min-width:78vw;min-height:58px;padding:.7rem 1rem}.media-event-date{font-size:1.1rem}.media-event-name{font-size:.86rem}
                    .media-event-header{padding:2.4rem 1rem 1.8rem}.media-event-header h1{font-size:clamp(2.65rem,12vw,4rem);line-height:.9}.media-event-description{display:-webkit-box;overflow:hidden;-webkit-line-clamp:3;-webkit-box-orient:vertical}
                    .media-event-summary{grid-template-columns:repeat(3,1fr)}.media-event-summary div{padding:.75rem}.media-event-summary strong{font-size:1.25rem}.media-event-actions{display:grid;grid-template-columns:1fr 1fr}.media-event-actions button{grid-column:1/-1}
                    .media-event-section{padding:2.3rem 1rem .5rem}.media-event-section-heading{align-items:flex-end}.media-event-section-heading>div{gap:.6rem}.media-event-section-heading>div>span{font-size:3rem}.media-event-section-heading>strong{display:none}
                    .media-archive-photo-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.media-archive-photo,.media-archive-photo.is-lead{grid-column:span 1}.media-archive-photo.is-lead{grid-column:span 2}
                    .media-archive-photo-button,.media-archive-photo.is-lead .media-archive-photo-button{aspect-ratio:4/3;border-radius:12px}.media-archive-caption{grid-template-columns:1.55rem minmax(0,1fr);padding:.65rem 0 .9rem}.media-archive-caption h3{font-size:.76rem}
                    .media-archive-video-grid{grid-template-columns:1fr}.media-event-video-dialog{padding:0;place-items:end center}.media-event-video-panel{max-height:100dvh;height:100dvh;border:0;border-radius:0;display:flex;flex-direction:column;justify-content:center}.media-event-video-copy{padding:1rem}.media-event-count{display:none}
                }
                @media(prefers-reduced-motion:reduce){.media-event-archive *{scroll-behavior:auto!important;animation:none!important;transition-duration:.01ms!important}}
            `}</style>
        </section>
    );
};

export default MediaEventArchive;
