import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { registrationOpen, eventTimestamp } from "../utils/hackathonAiX";
import HackathonAiXRegistration from "./HackathonAiXRegistration";
import SEO from "./SEO";
import HackathonEventPicker from "./HackathonEventPicker";
import HackathonSeasonOne from "./HackathonSeasonOne";
import { EVENT_VIEWS, getEventView, getEventUrl } from "../utils/hackathonRoute";
import "./HackathonAiX.css";
import "./HackathonWorkspace.css";
// Event identity, navigation and signup belong to one shell. Edition bodies own their content.
export default function HackathonWorkspace({ template, schedule }) {
    const { t } = useTranslation();
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
    const workspaceRef = useRef(null);
    useLayoutEffect(() => {
        const navbar = document.querySelector("[data-site-navbar]");
        if (!navbar) return;
        const measure = () =>
            workspaceRef.current?.style.setProperty(
                "--site-nav-height",
                `${navbar.getBoundingClientRect().height}px`
            );
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(navbar);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        let active = true;
        setRegistration(null);
        setRegistrationError(false);
        if (!user || Date.now() >= eventTimestamp(event.endAt)) {
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
    const open = state !== "ended" && registrationOpen(template, now);
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
        <section ref={workspaceRef} className="hx-workspace hx-edition-one" data-event={event.key}>
            <SEO title={`${event.title} | 浙客松`} description={event.description} />
            <a className="hx-skip" href="#hx-event-content">
                {t("eventWorkspace.skip")}
            </a>
            <header className="hx-eventbar">
                <HackathonEventPicker
                    events={schedule.events}
                    value={event.key}
                    now={now}
                    onChange={(key) => navigate(getEventUrl(key, view))}
                />
                <nav className="hx-nav" aria-label={t("aix.navigation")}>
                    {EVENT_VIEWS.map((item) => (
                        <Link
                            key={item}
                            to={getEventUrl(event.key, item)}
                            aria-current={
                                (view === "register" ? "intro" : view) === item ? "page" : undefined
                            }
                        >
                            {t(`eventWorkspace.tabs.${item}`)}
                        </Link>
                    ))}
                </nav>
                <div className="hx-event-actions">
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
                </div>
                <span className="hx-event-status">{t(`aix.state.${state}`)}</span>
            </header>
            <div id="hx-event-content" className="hx-page" key={`${event.key}:${view}`}>
                <HackathonSeasonOne template={template} view={view} registrationOpen={open} />
            </div>
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
