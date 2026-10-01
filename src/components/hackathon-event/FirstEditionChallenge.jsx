import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getEventUrl } from "../../utils/hackathonRoute";
import "./FirstEditionArchive.css";
import "./ChallengePresentation.css";

export default function FirstEditionChallenge({ template }) {
    const { t } = useTranslation();
    return (
        <div className="hx-content hx-first-challenge hx-challenge-page">
            <header className="hx-page-heading">
                <p className="hx-overline">2026.05.10 · {template.event.title}</p>
                <h1>{t("firstEdition.challengeTitle")}</h1>
                <p>{t("firstEdition.challengeIntro")}</p>
            </header>
            <div className="hx-challenge-layout">
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
