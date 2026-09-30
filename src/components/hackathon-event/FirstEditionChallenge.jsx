import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getEventUrl } from "../../utils/hackathonRoute";
import "./FirstEditionArchive.css";

export default function FirstEditionChallenge({ template }) {
    const { t } = useTranslation();
    return (
        <div className="hx-content hx-first-challenge">
            <header className="hx-page-heading">
                <p className="hx-overline">2026.05.10 · {template.event.title}</p>
                <h1>{t("firstEdition.challengeTitle")}</h1>
            </header>
            <p className="hx-first-challenge-lead">{t("firstEdition.challengeIntro")}</p>
            <h2>{t("firstEdition.challengeGoal")}</h2>
            <ol className="hx-first-challenge-list">
                {["load", "graph", "merge", "compress", "feedback"].map((key) => (
                    <li key={key}>{t(`firstEdition.requirements.${key}`)}</li>
                ))}
            </ol>
            <h2>{t("firstEdition.deliverablesTitle")}</h2>
            <p className="hx-first-challenge-lead">{t("firstEdition.deliverables")}</p>
            <p className="hx-first-challenge-source">{t("firstEdition.challengeSource")}</p>
            <div className="hx-first-actions">
                <Link className="hx-outline" to={getEventUrl(template.event.key, "results")}>
                    {t("eventWorkspace.viewResults")} →
                </Link>
                <Link className="hx-outline" to={getEventUrl(template.event.key, "media")}>
                    {t("firstEdition.viewScene")}
                </Link>
            </div>
        </div>
    );
}
