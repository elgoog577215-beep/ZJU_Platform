import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check, Clock3, Layers, ArrowUpRight } from "lucide-react";
import { currentStage, safeWebUrl, stageState, eventTimestamp } from "../../utils/hackathonAiX";
export default function Challenges({ template, now, projectsUrl }) {
    const { t, i18n } = useTranslation();
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
    return (
        <div className="hx-content">
            <div className="hx-page-heading">
                <p className="hx-overline">{t("aix.challengeKicker")}</p>
                <h1>{t("aix.tabs.challenges")}</h1>
                <p>{t("aix.challengeDescription")}</p>
            </div>
            <div className="hx-stage-line" aria-label={t("aix.stagesLabel")}>
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
                <>
                    <div className="hx-stage-details">
                        <div>
                            <h2>{t(`aix.stages.${stage.id}.title`)}</h2>
                            <p>{t(`aix.stages.${stage.id}.description`)}</p>
                        </div>
                        <div className="hx-deadline">
                            <span>{t("aix.deadline")}</span>
                            <strong>{dateFormat(stage.closesAt)}</strong>
                        </div>
                    </div>
                    <div className="hx-challenge-tracks">
                        {["campus", "industry"].map((track) => {
                            const challenges = (program.challenges || []).filter(
                                (item) =>
                                    item.track === track &&
                                    item.stage === stage.id &&
                                    item.published
                            );
                            return (
                                <section key={track}>
                                    <h3>{t(`aix.tracks.${track}.title`)}</h3>
                                    <p>{t(`aix.tracks.${track}.topics`)}</p>
                                    {challenges.length ? (
                                        challenges.map((item) => (
                                            <article className="hx-challenge" key={item.id}>
                                                <h4>{item.title}</h4>
                                                <p>{item.description}</p>
                                                {safeWebUrl(item.briefUrl) && (
                                                    <a
                                                        href={safeWebUrl(item.briefUrl)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        {t("aix.readBrief")} ↗
                                                    </a>
                                                )}
                                                {stageState(stage, now) === "live" &&
                                                safeWebUrl(item.submissionUrl) ? (
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
                                                        {t(
                                                            stageState(stage, now) === "ended"
                                                                ? "aix.submissionClosed"
                                                                : "aix.submissionPending"
                                                        )}
                                                    </span>
                                                )}
                                            </article>
                                        ))
                                    ) : (
                                        <div className="hx-pending">
                                            <Clock3 size={19} />
                                            <strong>{t("aix.challengePending")}</strong>
                                            <span>
                                                {stageState(stage, now) === "upcoming"
                                                    ? `${t("aix.scheduledRelease")} ${dateFormat(stage.opensAt)}`
                                                    : t("aix.nextStageNotice")}
                                            </span>
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                    <div className="hx-requirements">
                        <h3>{t("aix.requirements")}</h3>
                        <p>{t(`aix.stages.${stage.id}.materials`)}</p>
                    </div>
                </>
            )}
            <Link className="hx-project-link" to={projectsUrl}>
                <Layers size={19} />
                <span>{t("aix.allProjects")}</span>
                <ArrowUpRight size={18} />
            </Link>
        </div>
    );
}
