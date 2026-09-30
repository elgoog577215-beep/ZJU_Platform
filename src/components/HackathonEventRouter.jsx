import { lazy, Suspense, useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { useHackathonSchedule } from "../hooks/useHackathonSchedule";
import "./HackathonShared.css";
import { AIX_EVENT_KEY } from "../utils/hackathonAiX";
import { getEventKey, resolveEventLocation } from "../utils/hackathonRoute";
const EventWorkspace = lazy(() => import("./HackathonWorkspace"));
export default function HackathonEventRouter() {
    const { settings } = useSettings();
    const { schedule, loading, error, reload } = useHackathonSchedule(settings);
    const location = useLocation();
    const { t } = useTranslation();
    const currentKey = getEventKey(location);
    const resolved = resolveEventLocation(location, schedule);
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
    if (error)
        return (
            <div className="hx-status-page p-12" role="alert">
                <p>{t("aix.loadFailed")}</p>
                <button className="hx-outline mt-6" onClick={reload}>
                    {t("aix.retry")}
                </button>
            </div>
        );
    if (!resolved)
        return (
            <div className="hx-status-page p-12" role="alert">
                <h1>{t("not_found.title")}</h1>
                <p>{t("not_found.description")}</p>
                <Link className="hx-outline mt-6" to="/hackathon">
                    {t("nav.hackathon")}
                </Link>
            </div>
        );
    const { template, url } = resolved;
    if (`${location.pathname}${location.search}${location.hash}` !== url) {
        return <Navigate replace to={url} state={location.state} />;
    }
    return (
        <Suspense
            fallback={
                <div className="p-12" role="status">
                    {t("aix.loading")}
                </div>
            }
        >
            <EventWorkspace key={template.event.key} template={template} schedule={schedule} />
        </Suspense>
    );
}
