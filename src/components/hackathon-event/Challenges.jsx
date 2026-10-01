import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check, Clock3, Layers, ArrowUpRight } from "lucide-react";
import { currentStage, safeWebUrl, stageState, eventTimestamp } from "../../utils/hackathonAiX";
import EventStage from "./EventStage";
import "./ChallengePresentation.css";
export default function Challenges({ template, now, projectsUrl }) {
    const { t, i18n } = useTranslation();
    const [selectedTrack, setSelectedTrack] = useState("campus");
    const [selectedStage, setSelectedStage] = useState(null);
    const program = template.event.program || {};
    const stages = program.stages || [];
    const stage = stages.find((item) => item.id === selectedStage) || currentStage(stages, now);
    const dateFormat = (value) =>
        new Intl.DateTimeFormat(i18n.resolvedLanguage?.startsWith("en") ? "en" : "zh-CN", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: template.event.timezone,
        }).format(new Date(eventTimestamp(value)));
    const renderChallenges = (challenges, challengeStage) => {
        const state = challengeStage ? stageState(challengeStage, now) : "upcoming";
        if (!challenges.length)
            return (
                <div className="hx-pending">
                    <Clock3 size={19} />
                    <strong>{t("aix.challengePending")}</strong>
                    <span>
                        {challengeStage && state === "upcoming"
                            ? `${t("aix.scheduledRelease")} ${dateFormat(challengeStage.opensAt)}`
                            : t("aix.nextStageNotice")}
                    </span>
                </div>
            );
        return challenges.map((item) => (
            <article className="hx-challenge" key={item.id}>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                {safeWebUrl(item.briefUrl) && (
                    <a href={safeWebUrl(item.briefUrl)} target="_blank" rel="noreferrer">
                        {t("aix.readBrief")} ↗
                    </a>
                )}
                {state === "live" && safeWebUrl(item.submissionUrl) ? (
                    <a
                        className="hx-primary"
                        href={safeWebUrl(item.submissionUrl)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {t("aix.submitWork")} ↗
                    </a>
                ) : (
                    <span className="hx-muted">
                        {t(state === "ended" ? "aix.submissionClosed" : "aix.submissionPending")}
                    </span>
                )}
            </article>
        ));
    };
    return (
        <div className="hx-content hx-challenge-page hx-aix-challenge-page">
            <EventStage
                kicker={t("aix.challengeKicker")}
                title={t("aix.tracksTitle")}
                description={t("aix.challengeDescription")}
                action={
                    <a className="hx-primary" href="#aix-track-details">
                        {t("challengeStage.trackDetails")} ↓
                    </a>
                }
            >
                <section
                    className="hx-challenge-console hx-track-console"
                    aria-label={t("aix.tracksKicker")}
                >
                    <div className="hx-challenge-console-top">
                        <span>{t("aix.tracksKicker")}</span>
                        <span>AI + X</span>
                    </div>
                    <div className="hx-challenge-track-switch">
                        {["campus", "industry"].map((track) => (
                            <button
                                type="button"
                                key={track}
                                aria-pressed={selectedTrack === track}
                                onClick={() => setSelectedTrack(track)}
                            >
                                {t(`aix.tracks.${track}.title`)}
                            </button>
                        ))}
                    </div>
                    <div className="hx-challenge-console-body" aria-live="polite">
                        <span className="hx-challenge-step-number" aria-hidden="true">
                            {selectedTrack === "campus" ? "01" : "02"}
                        </span>
                        <h2>{t(`aix.tracks.${selectedTrack}.title`)}</h2>
                        <p>{t(`aix.tracks.${selectedTrack}.description`)}</p>
                        <p className="hx-challenge-topics">
                            {t(`aix.tracks.${selectedTrack}.topics`)}
                        </p>
                    </div>
                    <div className="hx-challenge-console-footer">
                        {t(
                            selectedTrack === "campus"
                                ? "aix.campusSchedule"
                                : "challengeStage.industrySchedule"
                        )}
                    </div>
                </section>
            </EventStage>
            <section
                className="hx-challenge-layout hx-campus-challenge hx-challenge-detail-section"
                id="aix-track-details"
            >
                <div className="hx-challenge-main">
                    <h2>{t("aix.tracks.campus.title")}</h2>
                    <p>{t("aix.tracks.campus.topics")}</p>
                    {renderChallenges(
                        (program.challenges || []).filter(
                            (item) => item.track === "campus" && item.published
                        ),
                        null
                    )}
                </div>
                <aside className="hx-challenge-aside">
                    <p>{t("aix.campusSchedule")}</p>
                </aside>
            </section>
            <h2 className="hx-industry-stage-heading">{t("aix.industryStages")}</h2>
            <div className="hx-stage-line" aria-label={t("aix.industryStages")}>
                {stages.map((item, index) => (
                    <button
                        key={item.id}
                        aria-pressed={stage?.id === item.id}
                        className={stage?.id === item.id ? "is-selected" : ""}
                        onClick={() => setSelectedStage(item.id)}
                    >
                        <span className={`hx-stage-dot is-${stageState(item, now)}`}>
                            {stageState(item, now) === "ended" ? <Check size={13} /> : index + 1}
                        </span>
                        <strong>{t(`aix.stages.${item.id}.title`)}</strong>
                        <small>{dateFormat(item.opensAt)}</small>
                        <span className="hx-stage-state">
                            {t(`aix.state.${stageState(item, now)}`)}
                        </span>
                    </button>
                ))}
            </div>
            {stage && (
                <div className="hx-challenge-layout">
                    <div className="hx-challenge-main">
                        <div className="hx-stage-details">
                            <div>
                                <h2>{t(`aix.stages.${stage.id}.title`)}</h2>
                                <p>{t(`aix.stages.${stage.id}.description`)}</p>
                            </div>
                        </div>
                        <div className="hx-challenge-tracks">
                            <section>
                                <h3>{t("aix.tracks.industry.title")}</h3>
                                <p>{t("aix.tracks.industry.topics")}</p>
                                {renderChallenges(
                                    (program.challenges || []).filter(
                                        (item) =>
                                            item.track === "industry" &&
                                            item.stage === stage.id &&
                                            item.published
                                    ),
                                    stage
                                )}
                            </section>
                        </div>
                    </div>
                    <aside className="hx-challenge-aside">
                        <div className="hx-deadline">
                            <span>{t("aix.deadline")}</span>
                            <strong>{dateFormat(stage.closesAt)}</strong>
                        </div>
                        <section className="hx-requirements">
                            <h3>{t("aix.requirements")}</h3>
                            <p>{t(`aix.stages.${stage.id}.materials`)}</p>
                        </section>
                        <Link className="hx-project-link" to={projectsUrl}>
                            <Layers size={19} />
                            <span>{t("aix.allProjects")}</span>
                            <ArrowUpRight size={18} />
                        </Link>
                    </aside>
                </div>
            )}
            {!stage && (
                <Link className="hx-project-link" to={projectsUrl}>
                    <Layers size={19} />
                    <span>{t("aix.allProjects")}</span>
                    <ArrowUpRight size={18} />
                </Link>
            )}
        </div>
    );
}
