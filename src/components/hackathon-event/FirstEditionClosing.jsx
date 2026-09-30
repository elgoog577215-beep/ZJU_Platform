import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEventOutcome } from "./useEventOutcome";
import { getEventUrl } from "../../utils/hackathonRoute";
import "./FirstEditionArchive.css";

export default function FirstEditionClosing({ template }) {
    const { t } = useTranslation();
    const { outcome } = useEventOutcome(template.results.competitionSlug);
    const photo = outcome?.media?.featured_photos?.[0];
    return (
        <section id="registration-form" className="hx-first-closing">
            <div>
                <p className="hx-overline">2026.05.10</p>
                <h2>{t("firstEdition.closingTitle")}</h2>
                <p>{t("firstEdition.closingIntro")}</p>
                <div className="hx-first-actions">
                    <Link className="hx-primary" to={getEventUrl(template.event.key, "results")}>
                        {t("eventWorkspace.viewResults")} →
                    </Link>
                    <Link className="hx-outline" to={getEventUrl(template.event.key, "media")}>
                        {t("firstEdition.viewScene")}
                    </Link>
                </div>
            </div>
            {photo && (
                <figure>
                    <img src={photo.url || photo.cover_url} alt={photo.title} loading="lazy" />
                    <figcaption>{photo.title}</figcaption>
                </figure>
            )}
        </section>
    );
}
