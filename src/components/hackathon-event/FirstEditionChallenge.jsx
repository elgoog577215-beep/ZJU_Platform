import { useState } from "react";
import EventStage from "./EventStage";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getEventUrl } from "../../utils/hackathonRoute";
import "./FirstEditionArchive.css";
import "./ChallengePresentation.css";

export default function FirstEditionChallenge({ template }) {
    const { t } = useTranslation();
    const [selectedTask, setSelectedTask] = useState(0);
    const tasks = ["load", "graph", "merge", "compress", "feedback"];
    return (
        <div className="hx-content hx-first-challenge hx-challenge-page">
            <EventStage
                kicker={`2026.05.10 · ${template.event.title}`}
                title={t("firstEdition.challengeTitle")}
                description={t("firstEdition.challengeIntro")}
                action={
                    <a className="hx-primary" href="#challenge-requirements">
                        {t("challengeStage.fullRequirements")} ↓
                    </a>
                }
            >
                <section
                    className="hx-challenge-console"
                    aria-label={t("firstEdition.challengeGoal")}
                >
                    <div className="hx-challenge-console-top">
                        <span>{t("firstEdition.challengeGoal")}</span>
                        <span>0{selectedTask + 1} / 05</span>
                    </div>
                    <div className="hx-challenge-console-body" aria-live="polite">
                        <span className="hx-challenge-step-number" aria-hidden="true">
                            0{selectedTask + 1}
                        </span>
                        <h2>{t(`challengeStage.firstTasks.${tasks[selectedTask]}`)}</h2>
                        <p>{t(`firstEdition.requirements.${tasks[selectedTask]}`)}</p>
                    </div>
                    <div
                        className="hx-challenge-selectors"
                        aria-label={t("firstEdition.challengeGoal")}
                    >
                        {tasks.map((key, index) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={selectedTask === index}
                                onClick={() => setSelectedTask(index)}
                            >
                                <span>0{index + 1}</span>
                                <strong>{t(`challengeStage.firstTasks.${key}`)}</strong>
                            </button>
                        ))}
                    </div>
                </section>
            </EventStage>
            <div
                className="hx-challenge-layout hx-challenge-detail-section"
                id="challenge-requirements"
            >
                <section className="hx-challenge-main">
                    <h2>{t("firstEdition.challengeGoal")}</h2>
                    <ol className="hx-challenge-steps">
                        {["load", "graph", "merge", "compress", "feedback"].map((key) => (
                            <li key={key}>
                                <p>{t(`firstEdition.requirements.${key}`)}</p>
                            </li>
                        ))}
                    </ol>
                </section>
                <aside className="hx-challenge-aside">
                    <section>
                        <h2>{t("firstEdition.deliverablesTitle")}</h2>
                        <p>{t("firstEdition.deliverables")}</p>
                        <div className="hx-first-actions">
                            <Link
                                className="hx-primary"
                                to={getEventUrl(template.event.key, "results")}
                            >
                                {t("eventWorkspace.viewResults")} →
                            </Link>
                            <Link
                                className="hx-outline"
                                to={getEventUrl(template.event.key, "media")}
                            >
                                {t("firstEdition.viewScene")}
                            </Link>
                        </div>
                    </section>
                    <p className="hx-first-challenge-source">{t("firstEdition.challengeSource")}</p>
                </aside>
            </div>
        </div>
    );
}
