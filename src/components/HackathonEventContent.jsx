import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getEventUrl } from "../utils/hackathonRoute";
import HackathonRegistration from "./HackathonRegistration";
import HackathonOutcomeShowcase from "./HackathonOutcomeShowcase";
import FirstEditionChallenge from "./hackathon-event/FirstEditionChallenge";
import BeautyEventContent from "./hackathon-event/BeautyEventContent";

import Challenges from "./hackathon-event/Challenges";
import Media from "./hackathon-event/Media";
import Results from "./hackathon-event/Results";
import LotteryPage from "../features/lottery/LotteryPage";
import Program from "./hackathon-event/Program";

// Preserve the original registration body; historical records remain in their original competition.
export default function HackathonEventContent({
    template,
    view,
    registrationOpen,
    now,
    live,
    registrationRef,
    registrationState,
}) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const switchView = (next) => navigate(getEventUrl(template.event.key, next));
    if (view === "lottery")
        return <LotteryPage eventKey={template.event.key} eventTitle={template.event.title} />;
    const hasProgram = Boolean(template.event.program);
    if (template.event.key === "getui-beauty-2026")
        return <BeautyEventContent template={template} view={view} live={live} />;
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
    if (view === "media") return <Media template={template} live={live} />;
    if (view === "results")
        return template.navigation?.resultsVisible === false ? (
            <div className="hx-content">
                <h1>{t("eventWorkspace.resultsPending")}</h1>
            </div>
        ) : (
            <HackathonOutcomeShowcase template={template} />
        );
    if (view === "challenges") return <FirstEditionChallenge template={template} />;
    return (
        <HackathonRegistration
            template={{ ...template, event: { ...template.event, registrationOpen } }}
            registrationRef={registrationRef}
            registrationState={hasProgram ? registrationState : undefined}
            programContent={
                hasProgram ? (
                    <Program template={template} now={now} switchView={switchView} />
                ) : undefined
            }
        />
    );
}
