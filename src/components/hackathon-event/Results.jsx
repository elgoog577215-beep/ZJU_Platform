import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import { safeWebUrl } from "../../utils/hackathonAiX";
import { useEventOutcome } from "./useEventOutcome";
import FirstEditionResults from "./FirstEditionResults";
import EventStage from "./EventStage";
import "./ResultsPresentation.css";

export default function Results({ template, switchView }) {
    const { t } = useTranslation();
    const { outcome, status, reload } = useEventOutcome(template.results.competitionSlug);
    const [topic, setTopic] = useState("awards");
    const reports = (template.event.program?.reports || []).filter((report) => report.published);
    const photos = outcome?.media?.featured_photos || [];
    const topics = {
        awards: ["awardsPending", "awardsDescription"],
        reports: ["reportsPending", "reportsDescription"],
        highlights: ["highlightsPending", "highlightsDescription"],
    };
    if (template.navigation?.resultsVisible === false)
        return (
            <div className="hx-content">
                <h1>{t("eventWorkspace.resultsPending")}</h1>
            </div>
        );
    const reportContent = reports.length > 0 && (
        <section className="hx-stage-reports" id="event-reports">
            <h2>{t("aix.reports")}</h2>
            <div className="hx-reports">
                {reports.map((report) => (
                    <article key={report.id}>
                        <p className="hx-overline">{report.speaker || report.forum}</p>
                        <h3>{report.title}</h3>
                        <p>{report.summary}</p>
                        {safeWebUrl(report.url) && (
                            <a href={safeWebUrl(report.url)} target="_blank" rel="noreferrer">
                                {t("aix.readMore")} ↗
                            </a>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
    if (outcome?.works?.length)
        return (
            <>
                <FirstEditionResults template={template} copyNamespace="aix" />
                {reportContent && (
                    <div className="hx-content hx-results-presentation">{reportContent}</div>
                )}
            </>
        );
    return (
        <div className="hx-content hx-results-presentation">
            <EventStage
                kicker={template.event.title}
                title={t("resultStage.archiveTitle")}
                description={t("aix.resultsDescription")}
                action={
                    <button className="hx-primary" onClick={() => switchView("challenges")}>
                        {t("aix.viewChallenges")}
                        <ArrowUpRight size={18} />
                    </button>
                }
            >
                <div className="hx-stage-await">
                    <div className="hx-stage-board-label">{t("aix.resultsKicker")}</div>
                    {status === "loading" ? (
                        <p role="status">{t("aix.loading")}</p>
                    ) : status === "error" ? (
                        <div role="alert">
                            <p>{t("aix.loadFailed")}</p>
                            <button className="hx-outline" onClick={reload}>
                                {t("aix.retry")}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div aria-live="polite">
                                <h2>
                                    {t(
                                        `aix.${topic === "reports" && reports.length ? "reports" : topic === "highlights" && photos.length ? "highlights" : topics[topic][0]}`
                                    )}
                                </h2>
                                <p className="hx-stage-topic-description">
                                    {t(`aix.${topics[topic][1]}`)}
                                </p>
                            </div>
                            <div className="hx-stage-topic-tabs" aria-label={t("aix.tabs.results")}>
                                {Object.keys(topics).map((key) => (
                                    <button
                                        type="button"
                                        key={key}
                                        aria-pressed={topic === key}
                                        onClick={() => setTopic(key)}
                                    >
                                        {t(`aix.${key}`)}
                                    </button>
                                ))}
                            </div>
                            {topic === "reports" && reports.length > 0 && (
                                <a className="hx-text-button" href="#event-reports">
                                    {t("aix.readMore")} ↗
                                </a>
                            )}
                            {topic === "highlights" && (
                                <button
                                    className="hx-text-button"
                                    onClick={() => switchView("media")}
                                >
                                    {t("aix.allMedia")}
                                    <ArrowUpRight size={17} />
                                </button>
                            )}
                        </>
                    )}
                </div>
            </EventStage>
            {reportContent}
            {photos.length > 0 && (
                <section className="hx-first-scene">
                    <h2>{t("aix.highlights")}</h2>
                    <div className="hx-photo-grid">
                        {photos.map((photo) => (
                            <button key={photo.id} onClick={() => switchView("media")}>
                                <img
                                    src={photo.url || photo.cover_url}
                                    alt={photo.title || t("aix.highlights")}
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
