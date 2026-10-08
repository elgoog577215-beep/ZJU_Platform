import { ArrowRight, ArrowUpRight, CalendarDays, MapPin, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getEventUrl } from "../../utils/hackathonRoute";
import "./AiXOverview.css";

// The October 8 event brief supplies editorial content. Registration and submissions
// continue to use the event template and existing authenticated workflows.
export default function AiXOverview({
    state,
    onAgenda,
    switchView,
    onRegister,
    registrationLabel,
    registrationDisabled,
}) {
    const { t } = useTranslation();
    const agenda = t("aix.landing.agenda", { returnObjects: true });
    const partners = t("aix.landing.partners", { returnObjects: true });
    return (
        <div className="aix-landing">
            <section className="aix-hero aix-wrap">
                <div className="aix-hero-copy">
                    <div className="aix-eyebrow">
                        <span>{t("aix.editionLabel")}</span>
                        <span className="aix-state">{t(`aix.state.${state}`)}</span>
                    </div>
                    <p className="aix-hero-kicker">{t("aix.forumKicker")}</p>
                    <h1>
                        <span className="aix-display">
                            AI<span className="aix-plus">+</span>X
                        </span>
                        <span className="aix-title">{t("aix.heroTitle")}</span>
                    </h1>
                    <p className="aix-hero-intro">{t("aix.description")}</p>
                    <div className="aix-hero-actions">
                        <button
                            className="aix-primary"
                            onClick={onRegister}
                            disabled={registrationDisabled}
                        >
                            {t(registrationLabel)}
                            <ArrowUpRight size={19} />
                        </button>
                        <a
                            className="aix-agenda-link"
                            href="#hx-program"
                            onClick={(event) => {
                                event.preventDefault();
                                onAgenda();
                            }}
                        >
                            {t("aix.landing.viewAgenda")}
                            <ArrowRight size={18} />
                        </a>
                    </div>
                    <p className="aix-audience">{t("aix.landing.audience")}</p>
                </div>
                <div className="aix-hero-visual">
                    <div className="aix-visual-heading">
                        <span>{t("aix.motto")}</span>
                        <Plus size={22} strokeWidth={1.4} />
                    </div>
                    <Link
                        className="aix-hero-photo"
                        to={getEventUrl("zhekesong-current", "results")}
                    >
                        <img
                            src="/images/hackathon/ai-x/first-edition-building.webp"
                            alt={t("aix.buildingAlt")}
                            width="1920"
                            height="1440"
                            fetchPriority="high"
                        />
                        <span className="aix-photo-credit">
                            {t("aix.previousEdition")} · 2026.05 <ArrowUpRight size={17} />
                        </span>
                    </Link>
                    <div className="aix-event-ticket">
                        <div>
                            <span className="aix-ticket-label">{t("aix.landing.eventDates")}</span>
                            <strong>
                                10.09 <span>→</span> 10.25
                            </strong>
                        </div>
                        <span className="aix-ticket-year">2026</span>
                    </div>
                </div>
            </section>
            <div className="aix-factbar aix-wrap">
                <span>
                    <MapPin size={18} />
                    {t("aix.location")}
                </span>
                <span>
                    <CalendarDays size={18} />
                    {t("aix.landing.onsite")}
                </span>
                <span>{t("aix.landing.organizer")}</span>
            </div>
            <section className="aix-section aix-wrap" aria-labelledby="aix-tracks-title">
                <div className="aix-section-heading">
                    <div>
                        <p className="aix-eyebrow">{t("aix.tracksKicker")}</p>
                        <h2 id="aix-tracks-title">{t("aix.tracksTitle")}</h2>
                    </div>
                    <p>{t("aix.landing.tracksIntro")}</p>
                </div>
                <div className="aix-track-pair">
                    {["campus", "industry"].map((track) => (
                        <article className={`aix-track-card aix-track-${track}`} key={track}>
                            <div className="aix-track-brand">
                                <span>{t(`aix.landing.tracks.${track}.partner`)}</span>
                                <span>{t(`aix.landing.tracks.${track}.type`)}</span>
                            </div>
                            <h3>{t(`aix.tracks.${track}.title`)}</h3>
                            <p>{t(`aix.tracks.${track}.description`)}</p>
                            <div className="aix-topic-list">
                                {t(`aix.landing.tracks.${track}.topics`, {
                                    returnObjects: true,
                                }).map((topic) => (
                                    <span key={topic}>{topic}</span>
                                ))}
                            </div>
                            <div className="aix-track-bottom">
                                <span>{t(`aix.landing.tracks.${track}.format`)}</span>
                                <button
                                    onClick={() => switchView("challenges")}
                                    aria-label={`${t("aix.viewChallenges")} · ${t(`aix.tracks.${track}.title`)}`}
                                >
                                    <ArrowUpRight size={23} />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
            <section
                className="aix-section aix-wrap"
                id="hx-program"
                aria-labelledby="aix-agenda-title"
            >
                <div className="aix-section-heading">
                    <div>
                        <p className="aix-eyebrow">{t("aix.agendaTitle")}</p>
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
                        <p className="aix-eyebrow">{t("aix.forumsKicker")}</p>
                        <h2 id="aix-forums-title">{t("aix.forumsTitle")}</h2>
                    </div>
                    <p>{t("aix.forumsDescription")}</p>
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
                            <span className="aix-forum-location">
                                <MapPin size={16} />
                                {t(`aix.landing.forums.${forum}.location`)}
                            </span>
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
                        <p className="aix-eyebrow">{t("aix.landing.partnersLabel")}</p>
                        <h2 id="aix-partners-title">{t("aix.landing.partnersTitle")}</h2>
                    </div>
                </div>
                <dl>
                    {partners.map((partner) => (
                        <div key={partner.label}>
                            <dt>{partner.label}</dt>
                            <dd>{partner.names}</dd>
                        </div>
                    ))}
                </dl>
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
            <section className="aix-closing aix-wrap">
                <div>
                    <p className="aix-eyebrow">{t("aix.motto")}</p>
                    <h2>{t("aix.landing.closing")}</h2>
                </div>
                <button
                    className="aix-primary"
                    onClick={onRegister}
                    disabled={registrationDisabled}
                >
                    {t(registrationLabel)}
                    <ArrowUpRight size={20} />
                </button>
            </section>
        </div>
    );
}
