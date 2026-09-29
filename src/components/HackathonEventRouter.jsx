import { lazy, Suspense, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { useHackathonSchedule } from "../hooks/useHackathonSchedule";
import { getHackathonScheduleEvent } from "../data/hackathonTemplate";
import "./HackathonAiX.css";
import { AIX_EVENT_KEY } from "../utils/hackathonAiX";
import { getLegacyProjectsUrl, getEventView } from "../utils/hackathonRoute";
const AiXEvent = import.meta.env.DEV ? lazy(() => import("./HackathonAiX")) : null;
const EventWorkspace = lazy(() => import("./HackathonWorkspace"));
export default function HackathonEventRouter() {
    const { settings } = useSettings();
    const { schedule, loading, error, reload } = useHackathonSchedule(settings);
    const location = useLocation();
    const { t } = useTranslation();
    const params = new URLSearchParams(location.search);
    const currentKey = new URLSearchParams(location.search).get("event");
    useEffect(() => {
        if (currentKey !== AIX_EVENT_KEY) return;
        const timer = window.setInterval(() => {
            if (!document.hidden) reload();
        }, 60000);
        return () => window.clearInterval(timer);
    }, [currentKey, reload]);

    if (loading)
        return (
            <div className="p-12" role="status">
                {t("aix.loading")}
            </div>
        );
    if (
        error ||
        (params.has("event") &&
            !schedule.events.some((item) => item.event.key === params.get("event")))
    )
        return (
            <div className="hx-event p-12" role="alert">
                <p>{t("aix.loadFailed")}</p>
                <button className="hx-outline mt-6" onClick={reload}>
                    {t("aix.retry")}
                </button>
            </div>
        );
    // Preserve existing first-event deep links even when the active event changes.
    if (
        /\/(showcase|works)$/.test(location.pathname) &&
        !params.has("event") &&
        !params.has("competition")
    ) {
        params.set("event", "zhekesong-current");
        return <Navigate replace to={`${location.pathname}?${params}${location.hash}`} />;
    }
    const byCompetition = schedule.events.find(
        (item) => item.results.competitionSlug === params.get("competition")
    );
    const template = getHackathonScheduleEvent(
        schedule,
        params.get("event") || byCompetition?.event.key
    );
    if (params.get("view") === "projects") {
        return <Navigate replace to={getLegacyProjectsUrl(location)} />;
    }
    const view = getEventView(location);
    if (
        params.get("event") !== template.event.key ||
        params.get("view") !== view ||
        location.pathname !== "/hackathon"
    ) {
        params.set("event", template.event.key);
        params.set("view", view);
        params.delete("competition");
        return <Navigate replace to={`/hackathon?${params}${location.hash}`} />;
    }
    return (
        <Suspense
            fallback={
                <div className="p-12" role="status">
                    {t("aix.loading")}
                </div>
            }
        >
            {template.event.key === AIX_EVENT_KEY ? (
                AiXEvent ? (
                    <AiXEvent key={template.event.key} template={template} schedule={schedule} />
                ) : (
                    <div className="px-6 py-32">
                        <h1>{t("eventWorkspace.preparing")}</h1>
                    </div>
                )
            ) : (
                <EventWorkspace key={template.event.key} template={template} schedule={schedule} />
            )}
        </Suspense>
    );
}
