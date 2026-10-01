import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUpRight, Play } from "lucide-react";
import { getEventUrl } from "../../utils/hackathonRoute";
import MediaViewer from "./MediaViewer";
import "./EventRecap.css";

const isPublished = (item) => !item.status || ["approved", "published"].includes(item.status);
const imageUrl = (item) => item?.url || item?.cover_url;

function selectPhotos(media) {
    const source = (media?.stage_photos || []).filter(
        (item) => imageUrl(item) && isPublished(item)
    );
    const selected = [];
    const seen = new Set();
    const add = (photo) => {
        if (!photo || selected.includes(photo)) return;
        selected.push(photo);
        seen.add(photo.category_id || photo.category_name);
    };
    add(source.find((photo) => /合影|合照|group/i.test(photo.title)) || source[0]);
    source.forEach((photo) => {
        const category = photo.category_id || photo.category_name;
        if (selected.length < 5 && category && !seen.has(category)) add(photo);
    });
    source.forEach((photo) => {
        if (selected.length < 5) add(photo);
    });
    return selected;
}

export default function EventRecap({ template, outcome, status, reload }) {
    const { t, i18n } = useTranslation();
    const [videoOpen, setVideoOpen] = useState(false);
    const photos = useMemo(() => selectPhotos(outcome?.media), [outcome?.media]);
    const video = outcome?.media?.promo_videos?.find((item) => item.url && isPublished(item));
    const event = template.event;
    const first = event.key === "zhekesong-current";
    const beauty = event.key === "getui-beauty-2026";
    const aix = event.key === "zhekesong-ai-x-2026";
    const upcoming = Date.parse(event.startAt) > Date.now();
    const hasWorks = (outcome?.works?.length || 0) > 0;
    const mediaHref = getEventUrl(event.key, "media");
    const photoHref = (photo) =>
        getEventUrl(event.key, "media", {
            search: new URLSearchParams({ photo: String(photo.source_id || photo.id) }).toString(),
        });
    const heroCover = video?.cover_url || video?.thumbnail || imageUrl(photos[0]);
    const titleLines = first
        ? [t("hackathon.hero.title_line_1"), t("hackathon.hero.title_line_2")]
        : beauty
          ? t("eventRecap.beautyTitleLines", {
                returnObjects: true,
                defaultValue: ["每日互动", "美妆联谊赛"],
            })
          : aix
            ? t("eventRecap.aixTitleLines", {
                  returnObjects: true,
                  defaultValue: ["AI+X", "破界黑客松"],
              })
            : [event.title];
    const date = event.startAt?.slice(0, 10).replaceAll("-", ".");
    const endDate = event.endAt?.slice(0, 10).replaceAll("-", ".");
    const dateLine =
        endDate && endDate !== date
            ? `${date} — ${endDate}`
            : `${date}${event.startAt?.slice(11, 16) ? ` · ${event.startAt.slice(11, 16)}${event.endAt?.slice(11, 16) ? `—${event.endAt.slice(11, 16)}` : ""}` : ""}`;
    const description = first
        ? t("hackathon.hero.description")
        : beauty
          ? t("getuiBeauty.intro")
          : aix
            ? t("aix.description")
            : event.description;
    const location = beauty ? t("getuiBeauty.location") : aix ? t("aix.location") : event.location;
    const stats = [
        ["works", t("eventRecap.works", { defaultValue: "参赛作品" })],
        ["stage_photos", t("eventRecap.photos", { defaultValue: "现场照片" })],
        ["promo_videos", t("eventRecap.videos", { defaultValue: "赛事影像" })],
    ].filter(([key]) => status === "ready" && Number(outcome?.stats?.[key]) > 0);
    const pending = upcoming
        ? t("eventRecap.upcoming", {
              defaultValue: "赛事尚未开始，作品与现场记录将在赛后呈现。",
          })
        : t("eventRecap.pending", {
              defaultValue: "本场成果正在整理，已发布内容将在这里呈现。",
          });
    const filmLabel = t("eventRecap.watchFilm", { defaultValue: "播放赛事影像" });

    return (
        <>
            <section className="hx-recap-overview" aria-labelledby="event-recap-title">
                <div className="hx-recap-copy" lang={i18n.resolvedLanguage}>
                    <p className="hx-recap-eyebrow">
                        <span>01</span> {t("hackathon.outcome_archive.overview")}
                    </p>
                    <h1 id="event-recap-title">
                        {(Array.isArray(titleLines) ? titleLines : [event.title]).map(
                            (line, index) => (
                                <span key={line} className={index ? "is-accent" : undefined}>
                                    {line}
                                </span>
                            )
                        )}
                    </h1>
                    <p className="hx-recap-date">
                        {dateLine} · {location}
                    </p>
                    <p className="hx-recap-description">{description}</p>
                    {stats.length > 0 && (
                        <dl className="hx-recap-stats">
                            {stats.map(([key, label]) => (
                                <div key={key}>
                                    <dt>{label}</dt>
                                    <dd>{outcome.stats[key]}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                    <div className="hx-recap-actions">
                        {hasWorks ? (
                            <a className="hx-primary" href="#first-works-heading">
                                {t("eventRecap.allWorks", { defaultValue: "作品与荣誉" })}
                                <ArrowDown size={17} />
                            </a>
                        ) : (
                            <Link className="hx-primary" to={getEventUrl(event.key, "challenges")}>
                                {t("aix.tabs.challenges")}
                                <ArrowUpRight size={17} />
                            </Link>
                        )}
                        {(photos.length > 0 || video) && (
                            <Link to={mediaHref}>
                                {t("hackathon.outcome_archive.archive_title")}
                                <ArrowUpRight size={17} />
                            </Link>
                        )}
                    </div>
                </div>
                <div className="hx-recap-film">
                    {video || heroCover ? (
                        <>
                            {video ? (
                                <button
                                    type="button"
                                    className="hx-recap-film-frame"
                                    onClick={() => setVideoOpen(true)}
                                    aria-label={filmLabel}
                                >
                                    {heroCover && (
                                        <img
                                            src={heroCover}
                                            alt={video.title || filmLabel}
                                            fetchPriority="high"
                                        />
                                    )}
                                    <span className="hx-recap-play">
                                        <Play size={24} fill="currentColor" />
                                        <span>{filmLabel}</span>
                                    </span>
                                </button>
                            ) : (
                                <Link className="hx-recap-film-frame" to={photoHref(photos[0])}>
                                    <img
                                        src={heroCover}
                                        alt={photos[0].title}
                                        fetchPriority="high"
                                    />
                                    <span className="hx-recap-photo-open">
                                        <ArrowUpRight size={26} />
                                    </span>
                                </Link>
                            )}
                            <div className="hx-recap-film-caption">
                                <span>
                                    {video
                                        ? t("hackathon.outcome_archive.official_film")
                                        : t("hackathon.outcome_archive.archive_title")}
                                </span>
                                <strong>{video?.title || photos[0]?.title}</strong>
                            </div>
                        </>
                    ) : (
                        <div className="hx-recap-await" role="status">
                            <span aria-hidden="true">
                                {upcoming ? "COMING SOON" : "EVENT ARCHIVE"}
                            </span>
                            <p>
                                {status === "loading"
                                    ? t("hackathon.outcome_archive.loading")
                                    : status === "error"
                                      ? t("aix.loadFailed")
                                      : pending}
                            </p>
                            {status === "error" && (
                                <button type="button" className="hx-outline" onClick={reload}>
                                    {t("aix.retry")}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>
            {photos.length > 0 && (
                <section className="hx-recap-archive" aria-labelledby="event-recap-archive-title">
                    <div className="hx-recap-archive-stage">
                        <div className="hx-recap-archive-intro">
                            <div className="hx-recap-section-heading">
                                <span aria-hidden="true">02</span>
                                <div>
                                    <p>{t("hackathon.outcome_archive.archive_eyebrow")}</p>
                                    <h2 id="event-recap-archive-title">
                                        {t("hackathon.outcome_archive.archive_title")}
                                    </h2>
                                </div>
                            </div>
                            <Link to={mediaHref}>
                                {t("hackathon.outcome_archive.view_all_photos", {
                                    count: outcome?.stats?.stage_photos || photos.length,
                                })}
                                <ArrowUpRight size={18} />
                            </Link>
                        </div>
                        <figure className="hx-recap-archive-feature">
                            <Link to={photoHref(photos[0])}>
                                <img
                                    src={imageUrl(photos[0])}
                                    alt={photos[0].title}
                                    loading="lazy"
                                />
                            </Link>
                            <figcaption>
                                <span>01</span>
                                <strong>{photos[0].title}</strong>
                            </figcaption>
                        </figure>
                    </div>
                    <div className="hx-recap-photo-strip">
                        {photos.slice(1).map((photo, index) => (
                            <figure key={photo.id || photo.url}>
                                <Link to={photoHref(photo)}>
                                    <img src={imageUrl(photo)} alt={photo.title} loading="lazy" />
                                </Link>
                                <figcaption>
                                    <span>{String(index + 2).padStart(2, "0")}</span>
                                    <strong>{photo.title}</strong>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </section>
            )}
            {videoOpen && video && (
                <MediaViewer item={video} video onClose={() => setVideoOpen(false)} />
            )}
        </>
    );
}
