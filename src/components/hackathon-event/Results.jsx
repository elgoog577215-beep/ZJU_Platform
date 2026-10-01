import { useTranslation } from "react-i18next";
import { safeWebUrl } from "../../utils/hackathonAiX";
import FirstEditionResults from "./FirstEditionResults";
import "./ResultsPresentation.css";

export default function Results({ template }) {
    const { t } = useTranslation();
    const reports = (template.event.program?.reports || []).filter((report) => report.published);
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
    return (
        <>
            <FirstEditionResults template={template} copyNamespace="aix" />
            {reportContent && (
                <div className="hx-content hx-results-presentation">{reportContent}</div>
            )}
        </>
    );
}
