import AiXPartnerLogos, { AiXBrand } from "./AiXPartnerLogos";
import { useRef, useState } from "react";
import {
    ArrowDown,
    ArrowRight,
    ArrowUpRight,
    CalendarDays,
    Clock3,
    Mail,
    Phone,
    X,
    FileText,
    Gift,
    Infinity as InfinityIcon,
    MapPin,
    Plus,
    Pause,
    Play,
    UserRound,
    UsersRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getEventUrl } from "../../utils/hackathonRoute";
import "./AiXOverview.css";

// The latest October 9 event brief supplies editorial content. Registration and submissions
// continue to use the event template and existing authenticated workflows.
export default function AiXOverview({
    state,
    now,
    onAgenda,
    switchView,
    onRegister,
    registrationLabel,
    registrationDisabled,
}) {
    const { t } = useTranslation();
    const [motionPaused, setMotionPaused] = useState(false);
    const qrDialog = useRef(null);
    const qrValid = now < Date.parse("2026-10-17T00:00:00+08:00");
    const agenda = t("aix.landing.agenda", { returnObjects: true });
    return (
        <div className="aix-landing">
            <section className="aix-hero aix-wrap">
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
                    <p className="aix-hero-intro">{t("aix.landing.heroDescription")}</p>
                    <dl className="aix-event-facts">
                        <div>
                            <dt>{t("aix.landing.eventDates")}</dt>
                            <dd className="aix-date">2026.10.09—10.25</dd>
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
            </section>
            <section className="aix-tracks aix-wrap" aria-label={t("aix.tracksKicker")}>
                <div className="aix-track-pair">
                    {["campus", "industry"].map((track, index) => (
                        <article className={`aix-track-card aix-track-${track}`} key={track}>
                            <AiXBrand id={track === "campus" ? "qwen" : "huawei"} />
                            <span className="aix-track-index">[ 0{index + 1} ]</span>
                            <h2>{t(`aix.landing.tracks.${track}.shortTitle`)}</h2>
                            <p>{t(`aix.landing.tracks.${track}.shortDescription`)}</p>
                            <div className="aix-track-tags">
                                <span>
                                    {track === "campus" ? (
                                        <UserRound size={17} />
                                    ) : (
                                        <UsersRound size={17} />
                                    )}
                                    {t(`aix.landing.tracks.${track}.team`)}
                                </span>
                                <span>
                                    <Clock3 size={17} />
                                    {t(`aix.landing.tracks.${track}.deadline`)}
                                </span>
                            </div>
                            <div className="aix-track-support">
                                <FileText size={17} />
                                {t(`aix.landing.tracks.${track}.support`)}
                            </div>
                            <button
                                className="aix-track-arrow"
                                onClick={() => switchView("challenges", track)}
                                aria-label={`${t("aix.viewChallenges")} · ${t(`aix.tracks.${track}.title`)}`}
                            >
                                <ArrowRight size={31} strokeWidth={1.2} />
                            </button>
                        </article>
                    ))}
                </div>
                <div className="aix-track-footnote">
                    <span>
                        <InfinityIcon size={23} />
                        {t("aix.landing.bothTracks")}
                    </span>
                    <Link to={getEventUrl("zhekesong-ai-x-2026", "lottery")}>
                        <Gift size={19} />
                        {t("lottery.event_entry")}
                        <ArrowRight size={17} />
                    </Link>
                </div>
            </section>
            <div className="aix-section-nav aix-wrap">
                <span>{t("aix.landing.audience")}</span>
                <a
                    className="aix-agenda-link"
                    href="#hx-program"
                    onClick={(event) => {
                        event.preventDefault();
                        onAgenda();
                    }}
                >
                    {t("aix.landing.viewAgenda")}
                    <ArrowDown size={17} />
                </a>
            </div>
            <section
                className="aix-section aix-wrap"
                id="hx-program"
                aria-labelledby="aix-agenda-title"
            >
                <div className="aix-section-heading">
                    <div>
                        <h2 id="aix-agenda-title">{t("aix.landing.agendaTitle")}</h2>
                    </div>
                    <p>{t("aix.planned")}</p>
                </div>
                <ol className="aix-agenda-grid">
                    {agenda.map((item) => (
                        <li key={item.date}>
                            <time>{item.date}</time>
                            <h3>{item.title}</h3>
                            <p>{item.description}</p>
                        </li>
                    ))}
                </ol>
                <details className="aix-agenda-details">
                    <summary>
                        {t("aix.landing.fullAgenda")}
                        <Plus size={18} />
                    </summary>
                    <div className="aix-day-grid">
                        {t("aix.landing.days", { returnObjects: true }).map((day) => (
                            <div key={day.title}>
                                <h3>{day.title}</h3>
                                <dl>
                                    {day.items.map((item) => (
                                        <div key={item.time}>
                                            <dt>{item.time}</dt>
                                            <dd>{item.text}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        ))}
                    </div>
                </details>
            </section>
            <section className="aix-section aix-wrap" aria-labelledby="aix-forums-title">
                <div className="aix-section-heading">
                    <div>
                        <h2 id="aix-forums-title">{t("aix.forumsTitle")}</h2>
                    </div>
                    <p>{t("aix.forumsDescription")}</p>
                </div>
                <div className="aix-opening-guests">
                    <span>{t("aix.landing.openingLabel")}</span>
                    {t("aix.landing.openingGuests", { returnObjects: true }).map((guest) => (
                        <div key={guest.name}>
                            <strong>{guest.name}</strong>
                            <span>{guest.role}</span>
                            <small>{guest.occasion}</small>
                        </div>
                    ))}
                </div>
                <div className="aix-forum-pair">
                    {["technology", "entrepreneurship"].map((forum) => (
                        <article key={forum}>
                            <div className="aix-forum-date">
                                <strong>{t(`aix.forums.${forum}.date`)}</strong>
                                <span>{t(`aix.landing.forums.${forum}.time`)}</span>
                            </div>
                            <h3>{t(`aix.forums.${forum}.title`)}</h3>
                            <p>{t(`aix.forums.${forum}.description`)}</p>
                            {t(`aix.landing.forums.${forum}.location`) && (
                                <span className="aix-forum-location">
                                    <MapPin size={16} />
                                    {t(`aix.landing.forums.${forum}.location`)}
                                </span>
                            )}
                            <div className="aix-speakers">
                                {t(`aix.landing.forums.${forum}.speakers`, {
                                    returnObjects: true,
                                }).map((speaker) => (
                                    <div key={speaker.name}>
                                        <strong>
                                            {speaker.name}
                                            {speaker.pending && (
                                                <small>{t("aix.landing.invited")}</small>
                                            )}
                                        </strong>
                                        <span>{speaker.role}</span>
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            </section>
            <section className="aix-section aix-wrap" aria-labelledby="aix-rewards-title">
                <div className="aix-section-heading">
                    <h2 id="aix-rewards-title">{t("aix.landing.rewardsTitle")}</h2>
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
                <p className="aix-judges">{t("aix.landing.judges")}</p>
            </section>
            <section className="aix-community aix-wrap">
                <img
                    src="/images/hackathon/ai-x/first-edition-discussion.webp"
                    alt={t("aix.discussionAlt")}
                    width="960"
                    height="640"
                    loading="lazy"
                />
                <div>
                    <p className="aix-eyebrow">{t("aix.landing.beyondLabel")}</p>
                    <h2>{t("aix.landing.beyondTitle")}</h2>
                    <p>{t("aix.landing.beyondDescription")}</p>
                    <Link to={getEventUrl("zhekesong-current", "results")}>
                        {t("aix.landing.pastProjects")}
                        <ArrowUpRight size={19} />
                    </Link>
                    <span className="aix-history-credit">{t("aix.previousEditionTitle")}</span>
                </div>
            </section>
            <section
                className="aix-section aix-wrap aix-partners"
                aria-labelledby="aix-partners-title"
            >
                <div className="aix-section-heading">
                    <div>
                        <h2 id="aix-partners-title">{t("aix.landing.partnersTitle")}</h2>
                    </div>
                </div>
                <AiXPartnerLogos />
                <details className="aix-agenda-details">
                    <summary>
                        {t("aix.landing.allPartners")}
                        <Plus size={18} />
                    </summary>
                    <dl>
                        {t("aix.landing.morePartners", { returnObjects: true }).map((partner) => (
                            <div key={partner.label}>
                                <dt>{partner.label}</dt>
                                <dd>{partner.names}</dd>
                            </div>
                        ))}
                    </dl>
                </details>
            </section>
            <section className="aix-contact aix-wrap" aria-labelledby="aix-contact-title">
                <div className="aix-contact-group">
                    <h2 id="aix-contact-title">{t("aix.landing.contactTitle")}</h2>
                    <p>{t("aix.landing.contactHint")}</p>
                    {qrValid ? (
                        <>
                            <button
                                className="aix-secondary"
                                type="button"
                                aria-haspopup="dialog"
                                onClick={() => qrDialog.current?.showModal()}
                            >
                                {t("aix.landing.groupQr")}
                                <ArrowUpRight size={18} />
                            </button>
                            <small>{t("aix.landing.qrExpiry")}</small>
                        </>
                    ) : (
                        <p>{t("aix.landing.qrExpired")}</p>
                    )}
                </div>
                <div className="aix-contact-person">
                    <h3>{t("aix.landing.contactLabel")}</h3>
                    <p>{t("aix.landing.contactName")}</p>
                    <a href="tel:18668079838">
                        <Phone size={16} />
                        18668079838
                    </a>
                    <a href="mailto:yq20070130@outlook.com">
                        <Mail size={16} />
                        yq20070130@outlook.com
                    </a>
                </div>
            </section>
            {qrValid && (
                <dialog
                    ref={qrDialog}
                    className="aix-qr-dialog"
                    aria-label={t("aix.landing.groupQr")}
                >
                    <form method="dialog">
                        <button autoFocus aria-label={t("aix.landing.closeQr")}>
                            <X size={22} />
                        </button>
                    </form>
                    <img
                        src="/images/hackathon/ai-x/wechat-group-20261009.jpg"
                        alt={t("aix.landing.qrAlt")}
                        width="1280"
                        height="1835"
                    />
                </dialog>
            )}
        </div>
    );
}
