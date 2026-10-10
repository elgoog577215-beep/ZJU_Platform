import { useTranslation } from "react-i18next";
import { eventTimestamp, safeWebUrl } from "../../utils/hackathonAiX";
import FirstEditionResults from "./FirstEditionResults";
import "./ResultsPresentation.css";

export default function Results({ template, now = Date.now() }) {
    const { t } = useTranslation();
    const reports = (template.event.program?.reports || []).filter((report) => report.published);
    if (
        template.navigation?.resultsVisible === false ||
        (template.event.key === "zhekesong-ai-x-2026" && now < eventTimestamp(template.event.endAt))
    )
        return (
            <div className="hx-content aix-pending-page" role="status">
                <p>{template.event.title}</p>
                <h1>
                    {t(
                        now < eventTimestamp(template.event.endAt)
                            ? "aix.official.resultsBefore"
                            : "aix.official.resultsAfter"
                    )}
                </h1>
                <p>{t("aix.official.resultsHint")}</p>
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
    return (
        <>
            <FirstEditionResults template={template} copyNamespace="aix" />
            {reportContent && (
                <div className="hx-content hx-results-presentation">{reportContent}</div>
            )}
        </>
    );
}
