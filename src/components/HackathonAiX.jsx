import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { AIX_VIEWS, registrationOpen, eventTimestamp } from "../utils/hackathonAiX";
import { getEventUrl, getEventView } from "../utils/hackathonRoute";
import HackathonAiXRegistration from "./HackathonAiXRegistration";
import SEO from "./SEO";
import Overview from "./hackathon-aix/Overview";
import Challenges from "./hackathon-aix/Challenges";
import Results from "./hackathon-aix/Results";
import Media from "./hackathon-aix/Media";
import "./HackathonAiX.css";
/* Second edition has an independent visual system; the historical edition keeps its UI. */
export default function HackathonAiX({ template, schedule }) {
    const { t, i18n } = useTranslation();
    const { user, loading: authLoading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const view = getEventView(location);
    const [now, setNow] = useState(Date.now);
    const [modal, setModal] = useState(false);
    const resumeRegistration = useRef(false);
    const [registration, setRegistration] = useState(null);
    const [registrationLoading, setRegistrationLoading] = useState(false);
    const [registrationError, setRegistrationError] = useState(false);
    const [retry, setRetry] = useState(0);
    const event = template.event;
    const projectsUrl = getEventUrl(event.key, "results");
    const switchView = (nextView) => navigate(getEventUrl(event.key, nextView));
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        let active = true;
        setRegistration(null);
        setRegistrationError(false);
        if (!user) {
            setRegistrationLoading(false);
            return;
        }
        setRegistrationLoading(true);
        api.get("/hackathon/registration", { params: { event: event.key } })
            .then(({ data }) => {
                if (active) setRegistration(data.registration);
            })
            .catch(() => {
                if (active) setRegistrationError(true);
            })
            .finally(() => {
                if (active) setRegistrationLoading(false);
            });
        return () => {
            active = false;
        };
    }, [user?.id, event.key, retry]);
    useEffect(() => {
        if (user && !authLoading && !registrationLoading && resumeRegistration.current) {
            // Let the authentication dialog finish restoring its history entry first.
            const timer = window.setTimeout(() => {
                resumeRegistration.current = false;
                setModal(true);
            }, 200);
            return () => window.clearTimeout(timer);
        }
    }, [user, authLoading, registrationLoading]);
    const closeModal = useCallback(() => setModal(false), []);
    const state =
        now >= eventTimestamp(event.endAt)
            ? "ended"
            : now >= eventTimestamp(event.startAt)
              ? "live"
              : "upcoming";
    const open = registrationOpen(template, now);
    const label = registration
        ? "aix.register.registered"
        : registrationError
          ? "aix.register.retry"
          : authLoading || registrationLoading
            ? "aix.loading"
            : open
              ? "aix.register.title"
              : "aix.register.closed";
    return (
        <section className="hx-event">
            <SEO title={`${event.title} | 浙客松`} description={event.description} />
            <header className="hx-eventbar">
                <div className="hx-event-picker">
                    <Link className="hx-brand" to="/" aria-label={t("aix.backToSite")}>
                        {t("aix.brand")}
                    </Link>
                    <span className="hx-picker-divider" aria-hidden="true">
                        /
                    </span>
                    <label className="sr-only" htmlFor="hx-event-select">
                        {t("aix.series")}
                    </label>
                    <select
                        id="hx-event-select"
                        value={event.key}
                        onChange={(e) => navigate(getEventUrl(e.target.value, view))}
                    >
                        {[...schedule.events].reverse().map((item) => (
                            <option key={item.event.key} value={item.event.key}>
                                {item.event.title}
                                {eventTimestamp(item.event.endAt) < now
                                    ? ` · ${t("aix.history")}`
                                    : ""}
                            </option>
                        ))}
                    </select>
                </div>
                <nav className="hx-nav" aria-label={t("aix.navigation")}>
                    {AIX_VIEWS.map((item) => (
                        <Link
                            key={item}
                            to={getEventUrl(event.key, item)}
                            aria-current={view === item ? "page" : undefined}
                        >
                            {t(`aix.tabs.${item}`)}
                        </Link>
                    ))}
                </nav>
                <button
                    className="hx-primary"
                    disabled={
                        authLoading ||
                        registrationLoading ||
                        (!registration && !open && !registrationError)
                    }
                    onClick={() =>
                        registrationError ? setRetry((value) => value + 1) : setModal(true)
                    }
                >
                    {registration ? <Check size={17} /> : null}
                    {t(label)}
                    {open && !registration ? <ArrowUpRight size={17} /> : null}
                </button>
            </header>
            <div className="hx-page" key={view}>
                {view === "intro" && (
                    <Overview template={template} state={state} now={now} switchView={switchView} />
                )}
                {view === "challenges" && (
                    <Challenges template={template} now={now} projectsUrl={projectsUrl} />
                )}
                {view === "media" && <Media template={template} live={state === "live"} />}
                {view === "results" && (
                    <Results
                        template={template}
                        projectsUrl={projectsUrl}
                        switchView={switchView}
                    />
                )}
            </div>
            <footer className="hx-footer">
                <div>
                    <Link className="hx-brand" to="/">
                        {t("aix.brand")}
                    </Link>
                    <p>{t("aix.eventFullTitle")}</p>
                </div>
                <div>
                    <Link to="/">
                        {t("aix.backToSite")}
                        <ArrowUpRight size={15} />
                    </Link>
                    <button
                        onClick={() =>
                            i18n.changeLanguage(
                                i18n.resolvedLanguage?.startsWith("en") ? "zh" : "en"
                            )
                        }
                    >
                        {i18n.resolvedLanguage?.startsWith("en") ? "中文" : "EN"}
                    </button>
                </div>
            </footer>
            {modal && (
                <HackathonAiXRegistration
                    template={template}
                    user={user}
                    isDay={false}
                    registration={registration}
                    onClose={closeModal}
                    onLogin={() => {
                        resumeRegistration.current = true;
                        closeModal();
                        window.setTimeout(
                            () => window.dispatchEvent(new Event("open-auth-modal")),
                            100
                        );
                    }}
                    onRegistered={(value) => {
                        setRegistration(value);
                        setRegistrationError(false);
                    }}
                />
            )}
        </section>
    );
}
