import { lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getEventUrl } from "../utils/hackathonRoute";
import HackathonRegistration from "./HackathonRegistration";
import HackathonShowcase from "./HackathonOutcomeShowcase";

import Challenges from "./hackathon-event/Challenges";
import Media from "./hackathon-event/Media";
import Results from "./hackathon-event/Results";
import Program from "./hackathon-event/Program";

const MediaEventArchive = lazy(() => import("./MediaEventArchive"));

// Preserve the original registration body; historical records remain in their original competition.
export default function HackathonEventContent({
    template,
    view,
    registrationOpen,
    now,
    live,
    onRegister,
}) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const switchView = (next) => navigate(getEventUrl(template.event.key, next));
    const hasProgram = Boolean(template.event.program);
    if (hasProgram && view === "challenges")
        return (
            <Challenges
                template={template}
                now={now}
                projectsUrl={getEventUrl(template.event.key, "results")}
            />
        );
    if (hasProgram && view === "media") return <Media template={template} live={live} />;
    if (hasProgram && view === "results")
        return <Results template={template} switchView={switchView} />;
    if (view === "media")
        return (
            <Suspense
                fallback={
                    <p className="hx-content" role="status">
                        {t("aix.loading")}
                    </p>
                }
            >
                <MediaEventArchive
                    embedded
                    eventKey={template.event.key}
                    eventSlug={template.results.competitionSlug}
                />
            </Suspense>
        );
    if (view === "results")
        return template.navigation?.resultsVisible === false ? (
            <div className="hx-content">
                <h1>{t("eventWorkspace.resultsPending")}</h1>
            </div>
        ) : (
            <HackathonShowcase template={template} compact />
        );
    if (view === "challenges")
        return (
            <div className="hx-content hx-legacy-rules">
                <div className="hx-page-heading">
                    <p className="hx-overline">{template.event.title}</p>
                    <h1>{t("eventWorkspace.rulesTitle")}</h1>
                    <p>{t("eventWorkspace.rulesArchive")}</p>
                </div>
                <div className="hx-rule-list">
                    {template.rules
                        .filter((rule) => rule.enabled)
                        .map((rule, index) => (
                            <article key={rule.id}>
                                <span>{String(index + 1).padStart(2, "0")}</span>
                                <div>
                                    <h2>{rule.title}</h2>
                                    <p>{rule.description}</p>
                                </div>
                            </article>
                        ))}
                </div>
                <Link className="hx-outline" to={getEventUrl(template.event.key, "results")}>
                    {t("eventWorkspace.viewResults")}
                </Link>
            </div>
        );
    return (
        <HackathonRegistration
            template={{ ...template, event: { ...template.event, registrationOpen } }}
            onRegister={hasProgram ? onRegister : undefined}
            programContent={
                hasProgram ? (
                    <Program template={template} now={now} switchView={switchView} />
                ) : undefined
            }
        />
    );
}
