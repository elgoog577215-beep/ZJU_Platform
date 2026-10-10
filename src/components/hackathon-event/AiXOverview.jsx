import AiXPartnerLogos, { AiXBrand } from "./AiXPartnerLogos";
import { useState } from "react";
import {
    ArrowDown,
    ArrowRight,
    ArrowUpRight,
    CalendarDays,
    Gift,
    MapPin,
    Pause,
    Play,
    UsersRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getEventUrl } from "../../utils/hackathonRoute";
import "./AiXOverview.css";

const asset = (name) => `/images/hackathon/ai-x/official/${name}.webp`;
// Public editorial copy follows the organizer's official release PDF.
// The cover's October 11 launch takes precedence over the older date on its track slide.
export default function AiXOverview({
    state,
    switchView,
    onRegister,
    registrationLabel,
    registrationDisabled,
}) {
    const { t } = useTranslation();
    const [motionPaused, setMotionPaused] = useState(false);
    return (
        <div className="aix-landing">
            <section className="aix-hero aix-wrap" id="aix-overview" data-aix-chapter>
                <div className="aix-hero-copy">
                    <div className="aix-eyebrow">
                        <span>[ 2026 · {t("aix.brand")} ]</span>
                        <span className="aix-state">{t(`aix.state.${state}`)}</span>
                    </div>
                    <h1>
                        <span className="aix-brand-title">{t("aix.brand")}</span>
                        <span className="aix-title-line">
                            <span className="aix-display">AI+X</span>
                            <span className="aix-title">{t("aix.heroTitle")}</span>
                        </span>
                    </h1>
                    <p className="aix-hero-motto">{t("aix.motto")}</p>
                    <div className="aix-prize-total">
                        <span>{t("aix.official.totalPrize")}</span>
                        <strong>¥20,000</strong>
                    </div>
                    <p className="aix-hero-intro">{t("aix.landing.heroDescription")}</p>
                    <dl className="aix-event-facts">
                        <div>
                            <dt>{t("aix.landing.eventDates")}</dt>
                            <dd className="aix-date">2026.10.11–10.25</dd>
                        </div>
                        <div>
                            <dt>{t("common.location")}</dt>
                            <dd className="aix-event-venues">
                                {t("aix.landing.venues", { returnObjects: true }).map((venue) => (
                                    <span key={venue}>{venue}</span>
                                ))}
                            </dd>
                        </div>
                    </dl>
                    <p className="aix-onsite">
                        <CalendarDays size={18} />
                        {t("aix.landing.onsite")}
                    </p>
                    <div className="aix-hero-actions">
                        <button
                            className="aix-primary"
                            onClick={onRegister}
                            disabled={registrationDisabled}
                        >
                            {t(registrationLabel)}
                            <ArrowDown size={22} />
                        </button>
                        <button className="aix-secondary" onClick={() => switchView("challenges")}>
                            {t("aix.viewChallenges")}
                            <ArrowUpRight size={21} />
                        </button>
                        <button
                            type="button"
                            className="aix-mobile-motion"
                            onClick={() => setMotionPaused(!motionPaused)}
                            aria-label={t(
                                motionPaused
                                    ? "aix.landing.resumeMotion"
                                    : "aix.landing.pauseMotion"
                            )}
                        >
                            {motionPaused ? <Play size={16} /> : <Pause size={16} />}
                        </button>
                    </div>
                    <Link
                        className="aix-lottery-entry"
                        to={getEventUrl("zhekesong-ai-x-2026", "lottery")}
                    >
                        <Gift className="aix-lottery-icon" size={26} aria-hidden="true" />
                        <span>
                            <strong>{t("lottery.event_entry")}</strong>
                            <small>{t("lottery.event_entry_hint")}</small>
                        </span>
                        <ArrowUpRight size={24} aria-hidden="true" />
                    </Link>
                </div>
                <div className="aix-pixel-field" data-motion-paused={motionPaused}>
                    <img
                        src="/images/hackathon/ai-x/pixel-x.svg?v=clean-20261009"
                        alt=""
                        width="640"
                        height="640"
                        fetchPriority="high"
                    />
                    <span className="aix-pixel-caption" aria-hidden="true">
                        Agent /<br />
                        Skill /<br />
                        {t("aix.landing.application")}
                        <i />
                    </span>
                    <button
                        type="button"
                        className="aix-motion-toggle"
                        onClick={() => setMotionPaused(!motionPaused)}
                        aria-label={t(
                            motionPaused ? "aix.landing.resumeMotion" : "aix.landing.pauseMotion"
                        )}
                        title={t(
                            motionPaused ? "aix.landing.resumeMotion" : "aix.landing.pauseMotion"
                        )}
                    >
                        {motionPaused ? <Play size={15} /> : <Pause size={15} />}
                    </button>
                </div>
                <ol className="aix-cover-timeline" id="hx-program">
                    {t("aix.landing.agenda", { returnObjects: true }).map((item) => (
                        <li key={item.date}>
                            <time>{item.date}</time>
                            <strong>{item.title}</strong>
                            <p>{item.description}</p>
                        </li>
                    ))}
                </ol>
            </section>

            <section id="aix-tracks" data-aix-chapter className="aix-section aix-wrap">
                <div className="aix-section-heading">
                    <h2>{t("aix.official.tracksTitle")}</h2>
                    <p>{t("aix.landing.tracksIntro")}</p>
                </div>
                <div className="aix-track-pair">
                    {["campus", "industry"].map((track) => (
                        <article className={`aix-track-card aix-track-${track}`} key={track}>
                            <AiXBrand id={track === "campus" ? "qwen" : "huawei"} />
                            <h3>{t(`aix.landing.tracks.${track}.shortTitle`)}</h3>
                            <p className="aix-track-summary">
                                {t(`aix.tracks.${track}.description`)}
                            </p>
                            <div className="aix-track-tags">
                                <span>
                                    <UsersRound size={17} />
                                    {t(`aix.landing.tracks.${track}.team`)}
                                </span>
                                <span>{t(`aix.landing.tracks.${track}.deadline`)}</span>
                            </div>
                            <div className="aix-direction-list">
                                {t(`aix.refined.directionItems.${track}`, {
                                    returnObjects: true,
                                }).map((item) => (
                                    <div key={item.title}>
                                        <strong>{item.title}</strong>
                                        <span>{item.description}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="aix-text-action"
                                onClick={() => switchView("challenges", track)}
                            >
                                {t("aix.viewChallenges")}
                                <ArrowRight size={20} />
                            </button>
                        </article>
                    ))}
                </div>
                <p className="aix-track-footnote">{t("aix.landing.bothTracks")}</p>
            </section>
            <section id="aix-forums" data-aix-chapter className="aix-section aix-wrap">
                <div className="aix-section-heading">
                    <h2>{t("aix.forumsTitle")}</h2>
                    <p>{t("aix.forumsDescription")}</p>
                </div>
                <div className="aix-forum-pair">
                    {["technology", "entrepreneurship"].map((forum) => (
                        <article key={forum}>
                            <div className="aix-forum-date">
                                <strong>{t(`aix.forums.${forum}.date`)}</strong>
                            </div>
                            <h3>{t(`aix.forums.${forum}.title`)}</h3>
                            <p>{t(`aix.forums.${forum}.description`)}</p>
                            <span className="aix-forum-location">
                                <MapPin size={16} />
                                {t(`aix.landing.forums.${forum}.location`)}
                            </span>
                            <div className="aix-speaker-grid">
                                {t(`aix.landing.forums.${forum}.speakers`, {
                                    returnObjects: true,
                                }).map((speaker) => (
                                    <div key={speaker.name}>
                                        <img
                                            src={asset(speaker.image)}
                                            alt={speaker.name}
                                            width="300"
                                            height="180"
                                            loading="lazy"
                                        />
                                        <strong>{speaker.name}</strong>
                                        <span>{speaker.role}</span>
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            </section>
            <section id="aix-rewards" data-aix-chapter className="aix-section aix-wrap">
                <div className="aix-section-heading">
                    <h2>{t("aix.landing.rewardsTitle")}</h2>
                    <p>{t("aix.landing.rewardsIntro")}</p>
                </div>
                <div className="aix-rewards-grid">
                    {t("aix.landing.rewards", { returnObjects: true }).map((reward) => (
                        <article key={reward.label}>
                            <h3>{reward.label}</h3>
                            <strong className="aix-reward-value">{reward.value}</strong>
                            <span>{reward.note}</span>
                            <ul>
                                {reward.items.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                            <p>{reward.detail}</p>
                        </article>
                    ))}
                </div>
                <Link
                    className="aix-text-action"
                    to={getEventUrl("zhekesong-ai-x-2026", "lottery")}
                >
                    <Gift size={20} />
                    {t("lottery.event_entry_hint")}
                    <ArrowUpRight size={20} />
                </Link>
            </section>
            <section
                id="aix-partners-title"
                data-aix-chapter
                className="aix-section aix-wrap aix-partners"
            >
                <div className="aix-section-heading">
                    <h2>{t("aix.landing.partnersTitle")}</h2>
                </div>
                <AiXPartnerLogos />
                <div className="aix-clubs">
                    <h3>{t("aix.official.clubsTitle")}</h3>
                    <ul>
                        {[
                            "zjuai",
                            "kab",
                            "aira",
                            "xlab",
                            "delta-x",
                            "cross-innovation",
                            "embedded-ai",
                        ].map((name, index) => (
                            <li key={name}>
                                <img
                                    src={asset(name)}
                                    alt=""
                                    loading="lazy"
                                    width="180"
                                    height="100"
                                />
                                <span>
                                    {t("aix.official.clubNames", { returnObjects: true })[index]}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
                <dl className="aix-other-partners">
                    {t("aix.landing.morePartners", { returnObjects: true }).map((group) => (
                        <div key={group.label}>
                            <dt>{group.label}</dt>
                            <dd>{group.names}</dd>
                        </div>
                    ))}
                </dl>
            </section>
            <section id="aix-recap" data-aix-chapter className="aix-section aix-wrap">
                <div className="aix-section-heading">
                    <h2>{t("aix.official.recapTitle")}</h2>
                    <p>{t("aix.official.recapHint")}</p>
                </div>
                <div className="aix-recap-grid">
                    {["first-edition", "beauty-event", "ai-new-voices"].map((name, index) => (
                        <article key={name}>
                            {index < 2 ? (
                                <Link
                                    to={getEventUrl(
                                        index === 0 ? "zhekesong-current" : "getui-beauty-2026",
                                        "intro"
                                    )}
                                >
                                    <img
                                        src={asset(name)}
                                        width="960"
                                        height="420"
                                        alt={
                                            t("aix.official.recapNames", { returnObjects: true })[
                                                index
                                            ]
                                        }
                                        loading="lazy"
                                    />
                                    <h3>
                                        {
                                            t("aix.official.recapNames", { returnObjects: true })[
                                                index
                                            ]
                                        }
                                    </h3>
                                    <ArrowUpRight size={19} />
                                </Link>
                            ) : (
                                <a href={asset(name)} target="_blank" rel="noreferrer">
                                    <img
                                        src={asset(name)}
                                        width="960"
                                        height="420"
                                        alt={
                                            t("aix.official.recapNames", { returnObjects: true })[
                                                index
                                            ]
                                        }
                                        loading="lazy"
                                    />
                                    <h3>
                                        {
                                            t("aix.official.recapNames", { returnObjects: true })[
                                                index
                                            ]
                                        }
                                    </h3>
                                    <span>
                                        {t("aix.official.posterLink")}
                                        <ArrowUpRight size={19} />
                                    </span>
                                </a>
                            )}
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}
