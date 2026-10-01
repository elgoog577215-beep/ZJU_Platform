import { useTranslation } from "react-i18next";
import { ArrowRight, Trophy, MessageSquare, Image as ImageIcon } from "lucide-react";
import { safeWebUrl } from "../../utils/hackathonAiX";
import { useEventOutcome } from "./useEventOutcome";
import Empty from "./Empty";
import FirstEditionResults from "./FirstEditionResults";
import "./ResultsPresentation.css";
export default function Results({ template, switchView }) {
    const { t } = useTranslation();
    const {
        outcome,
        status: outcomeStatus,
        reload,
    } = useEventOutcome(template.results.competitionSlug);
    const program = template.event.program || {};
    if (template.navigation?.resultsVisible === false)
        return (
            <div className="hx-content hx-results-presentation">
                <h1>{t("eventWorkspace.resultsPending")}</h1>
            </div>
        );
    const prizeWorks = (outcome?.works || []).filter((work) => work.award || work.honor_title);
    const reportSection = (
        <section className="hx-result-section">
            <h2>{t("aix.reports")}</h2>
            {(program.reports || []).filter((report) => report.published).length ? (
                <div className="hx-reports">
                    {program.reports
                        .filter((report) => report.published)
                        .map((report) => (
                            <article key={report.id}>
                                <p className="hx-overline">{report.speaker || report.forum}</p>
                                <h3>{report.title}</h3>
                                <p>{report.summary}</p>
                                {safeWebUrl(report.url) && (
                                    <a
                                        href={safeWebUrl(report.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {t("aix.readMore")} ↗
                                    </a>
                                )}
                            </article>
                        ))}
                </div>
            ) : (
                <Empty
                    icon={MessageSquare}
                    title={t("aix.reportsPending")}
                    description={t("aix.reportsDescription")}
                />
            )}
        </section>
    );
    if (outcome?.works?.length)
        return (
            <>
                <FirstEditionResults template={template} copyNamespace="aix" />
                <div className="hx-content hx-results-presentation">{reportSection}</div>
            </>
        );
    const setRetry = reload;
    return (
        <div className="hx-content hx-results-presentation">
            <div className="hx-page-heading hx-results-heading">
                <div>
                    <p className="hx-overline">{t("aix.resultsKicker")}</p>
                    <h1>{t("aix.tabs.results")}</h1>
                    <p>{t("aix.resultsDescription")}</p>
                </div>
            </div>
            {outcomeStatus === "loading" ? (
                <p role="status">{t("aix.loading")}</p>
            ) : outcomeStatus === "error" ? (
                <div className="hx-empty" role="alert">
                    <p>{t("aix.loadFailed")}</p>
                    <button className="hx-outline" onClick={setRetry}>
                        {t("aix.retry")}
                    </button>
                </div>
            ) : (
                <div className="hx-result-grid">
                    <section className="hx-result-section">
                        <div className="hx-section-head">
                            <h2>{t("aix.awards")}</h2>
                            <Trophy size={20} />
                        </div>
                        {prizeWorks.length ? (
                            <div className="hx-awards">
                                {prizeWorks.map((work) => (
                                    <article key={work.id}>
                                        <span>{work.award || work.honor_title}</span>
                                        <h3>{work.title}</h3>
                                        <p>{work.author}</p>
                                        <p className="hx-muted">{work.summary}</p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <Empty
                                icon={Trophy}
                                title={t("aix.awardsPending")}
                                description={t("aix.awardsDescription")}
                            />
                        )}
                    </section>
                    {reportSection}
                    <section className="hx-result-section">
                        <div className="hx-section-head">
                            <h2>{t("aix.highlights")}</h2>
                            <button className="hx-text-button" onClick={() => switchView("media")}>
                                {t("aix.allMedia")}
                                <ArrowRight size={17} />
                            </button>
                        </div>
                        {outcome?.media?.featured_photos?.length ? (
                            <div className="hx-photo-grid">
                                {outcome.media.featured_photos.map((photo) => (
                                    <button key={photo.id} onClick={() => switchView("media")}>
                                        <img
                                            src={photo.url || photo.cover_url}
                                            alt={photo.title || t("aix.highlights")}
                                            loading="lazy"
                                        />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <Empty
                                icon={ImageIcon}
                                title={t("aix.highlightsPending")}
                                description={t("aix.highlightsDescription")}
                            />
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}
