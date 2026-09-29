import { ArrowDown, ArrowUpRight, MapPin, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { eventTimestamp, stageState } from "../../utils/hackathonAiX";
import { getEventUrl } from "../../utils/hackathonRoute";

/*
THESIS: A hackathon is people building together. Real, attributed photography carries that proof.
OWN-WORLD: Black, warm white, restrained acid yellow; clear type, open layouts, photographic crops.
STORY: Understand the event, locate its dates, choose a track, register; explore past work separately.
FIRST VIEWPORT: Complete readable title and facts on the left; two historical photographs on the right.
FORM: Photography-gallery direction requested by the user. Fresh composition replaces the rejected poster.
*/
export default function Overview({ template, state, now, switchView }) {
    const { t, i18n } = useTranslation();
    const event = template.event;
    const date = (value) =>
        new Intl.DateTimeFormat(i18n.resolvedLanguage?.startsWith("en") ? "en-GB" : "zh-CN", {
            month: "2-digit",
            day: "2-digit",
            timeZone: event.timezone,
        }).format(eventTimestamp(value));
    const stages = event.program?.stages || [];
    return (
        <>
            <section className="hx-cover">
                <div className="hx-cover-copy">
                    <div className="hx-cover-label">
                        <span>{t("aix.editionLabel")}</span>
                        <span className="hx-state">{t(`aix.state.${state}`)}</span>
                    </div>
                    <p className="hx-cover-kicker">{t("aix.forumKicker")}</p>
                    <h1>
                        <span>AI+X</span>
                        <strong>
                            {t("aix.heroTitleLine1")}
                            {t("aix.heroTitleLine2")}
                        </strong>
                    </h1>
                    <p className="hx-cover-description">{event.description}</p>
                    <p className="hx-cover-team">{t("aix.team")}</p>
                    <div className="hx-cover-facts">
                        <p>
                            <CalendarDays size={18} />
                            <strong>
                                {date(event.startAt)} — {date(event.endAt)}
                            </strong>
                            <span>2026</span>
                        </p>
                        <p>
                            <MapPin size={18} />
                            <span>{event.location}</span>
                        </p>
                        <small>{t("aix.planned")}</small>
                    </div>
                    <a className="hx-cover-explore" href="#hx-program">
                        {t("aix.explore")}
                        <ArrowDown size={18} />
                    </a>
                </div>
                <div className="hx-contact-sheet">
                    <div className="hx-photo-heading">
                        <span>{t("aix.previousEdition")}</span>
                        <span>ZHEKESONG</span>
                    </div>
                    <Link
                        className="hx-photo-main"
                        to={getEventUrl("zhekesong-current", "results")}
                        aria-label={t("aix.previousEdition")}
                    >
                        <img
                            src="/images/hackathon/ai-x/first-edition-building.webp"
                            alt={t("aix.buildingAlt")}
                            fetchPriority="high"
                        />
                        <span className="hx-photo-link">
                            <ArrowUpRight size={22} />
                        </span>
                    </Link>
                    <div className="hx-photo-bottom">
                        <div className="hx-photo-caption">
                            <p>{t("aix.previousEdition")}</p>
                            <span>{t("aix.previousEditionTitle")}</span>
                        </div>
                        <Link
                            to={getEventUrl("zhekesong-current", "results")}
                            className="hx-photo-detail"
                            aria-label={t("aix.previousEdition")}
                        >
                            <img
                                src="/images/hackathon/ai-x/first-edition-discussion.webp"
                                alt={t("aix.discussionAlt")}
                            />
                        </Link>
                    </div>
                </div>
            </section>
            <section className="hx-program" id="hx-program">
                <div className="hx-program-heading">
                    <h2>{t("aix.agendaTitle")}</h2>
                    <p>{t("aix.planned")}</p>
                </div>
                <ol className="hx-program-steps">
                    {stages.map((stage) => (
                        <li key={stage.id} className={`is-${stageState(stage, now)}`}>
                            <div className="hx-program-date">
                                <time>{date(stage.opensAt)}</time>
                                <span>{t(`aix.state.${stageState(stage, now)}`)}</span>
                            </div>
                            <h3>{t(`aix.stages.${stage.id}.title`)}</h3>
                            <p>{t(`aix.stages.${stage.id}.description`)}</p>
                        </li>
                    ))}
                </ol>
            </section>
            <section className="hx-tracks">
                <div className="hx-section-top">
                    <h2>{t("aix.tracksKicker")}</h2>
                    <button className="hx-text-button" onClick={() => switchView("challenges")}>
                        {t("aix.viewChallenges")}
                        <ArrowUpRight size={18} />
                    </button>
                </div>
                <div className="hx-track-grid">
                    {["campus", "industry"].map((track) => (
                        <button
                            className="hx-track"
                            key={track}
                            onClick={() => switchView("challenges")}
                        >
                            <div className="hx-track-heading">
                                <h3>{t(`aix.tracks.${track}.title`)}</h3>
                                <ArrowUpRight size={24} />
                            </div>
                            <p>{t(`aix.tracks.${track}.description`)}</p>
                            <span>{t(`aix.tracks.${track}.topics`)}</span>
                        </button>
                    ))}
                </div>
            </section>
            <section className="hx-forums">
                <div className="hx-section-top">
                    <h2>{t("aix.forumsKicker")}</h2>
                    <p>{t("aix.forumsDescription")}</p>
                </div>
                <div className="hx-forum-list">
                    {["technology", "entrepreneurship"].map((forum, index) => (
                        <article key={forum}>
                            <time>{date(index ? event.endAt : event.startAt)}</time>
                            <h3>{t(`aix.forums.${forum}.title`)}</h3>
                            <p>{t(`aix.forums.${forum}.description`)}</p>
                        </article>
                    ))}
                </div>
            </section>
        </>
    );
}
