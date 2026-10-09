import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { ArrowDown, ArrowUpRight, Clock3, FileText, LockKeyhole } from "lucide-react";
import {
    currentStage,
    safeWebUrl,
    stageState,
    eventTimestamp,
    registrationOpen,
} from "../../utils/hackathonAiX";
import { getEventUrl } from "../../utils/hackathonRoute";
import RepositorySubmission from "./RepositorySubmission";
import { AiXBrand } from "./AiXPartnerLogos";
import "./AiXChallenges.css";

export default function Challenges({ template, now, registrationState = {} }) {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const submissionRef = useRef(null);
    const [track, setTrack] = useState(() =>
        new URLSearchParams(location.search).get("track") === "industry" ? "industry" : "campus"
    );
    useEffect(() => {
        if (location.hash !== "#submission") return;
        const frame = requestAnimationFrame(() =>
            submissionRef.current?.scrollIntoView({ block: "start" })
        );
        return () => cancelAnimationFrame(frame);
    }, [location.hash]);
    const [stageId, setStageId] = useState(null);
    const program = template.event.program || {};
    const stages = program.stages || [];
    const stage = stages.find((item) => item.id === stageId) || currentStage(stages, now);
    const { user, loading, error, registration, onRetry, onLogin, onRegistered } =
        registrationState;
    const ended = now >= eventTimestamp(template.event.endAt);
    const signupOpen = !ended && registrationOpen(template, now);
    const challenges = (program.challenges || []).filter(
        (item) =>
            item.published &&
            item.track === track &&
            (track === "campus" || item.stage === stage?.id)
    );
    const stageStatus = stage ? stageState(stage, now) : "upcoming";
    const status = ended
        ? "closed"
        : track === "campus"
          ? "selfDefined"
          : stageStatus === "ended"
            ? "stageClosed"
            : challenges.length
              ? "published"
              : "pending";
    const date = (value) =>
        new Intl.DateTimeFormat(i18n.resolvedLanguage?.startsWith("en") ? "en-GB" : "zh-CN", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Shanghai",
        }).format(eventTimestamp(value));
    const goRegistration = getEventUrl(template.event.key, "intro", { hash: "#registration-form" });
    return (
        <div className="aix-challenges">
            <header className="aix-challenges-heading">
                <div>
                    <p className="aix-challenge-eyebrow">AI + X · 2026</p>
                    <h1>{t("aix.refined.challengeTitle")}</h1>
                    <p>{t("aix.refined.challengeIntro")}</p>
                </div>
                <a className="aix-secondary" href="#submission">
                    {t("aix.refined.mySubmission")}
                    <ArrowDown size={18} />
                </a>
            </header>
            <div className="aix-track-tabs" aria-label={t("aix.tracksKicker")}>
                {["campus", "industry"].map((value) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={value === track}
                        onClick={() => setTrack(value)}
                    >
                        {t(`aix.tracks.${value}.title`)}
                    </button>
                ))}
            </div>
            <section className="aix-brief" aria-label={t(`aix.tracks.${track}.title`)}>
                <div className="aix-brief-main">
                    <div className="aix-brief-heading">
                        <AiXBrand id={track === "campus" ? "qwen" : "huawei"} />
                        <span className={`aix-status is-${status}`}>
                            {t(`aix.refined.status.${status}`)}
                        </span>
                    </div>
                    <h2>{t(`aix.tracks.${track}.title`)}</h2>
                    <p className="aix-brief-lead">{t(`aix.tracks.${track}.description`)}</p>
                    {track === "industry" && (
                        <div className="aix-round-tabs" aria-label={t("aix.industryStages")}>
                            {stages.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    aria-pressed={stage?.id === item.id}
                                    onClick={() => setStageId(item.id)}
                                >
                                    {t(`aix.stages.${item.id}.title`)}
                                    <span>{t(`aix.state.${stageState(item, now)}`)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    {track === "campus" && (
                        <div className="aix-brief-copy">
                            <h3>{t("aix.refined.problemTitle")}</h3>
                            <p>{t("aix.refined.problemDescription")}</p>
                            <h3>{t("aix.refined.directions")}</h3>
                            <p>{t("aix.tracks.campus.topics")}</p>
                        </div>
                    )}
                    {challenges.map((item) => (
                        <article key={item.id} className="aix-published-brief">
                            <h3>{item.title}</h3>
                            <p>{item.description}</p>
                            {safeWebUrl(item.briefUrl) && (
                                <a
                                    href={safeWebUrl(item.briefUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <FileText size={17} />
                                    {t("aix.readBrief")}
                                    <ArrowUpRight size={16} />
                                </a>
                            )}
                            {safeWebUrl(item.submissionUrl) && stageStatus === "live" && !ended && (
                                <a
                                    href={safeWebUrl(item.submissionUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {t("aix.refined.specificSubmission")}
                                    <ArrowUpRight size={16} />
                                </a>
                            )}
                        </article>
                    ))}
                    {track === "industry" && !challenges.length && (
                        <div className="aix-brief-pending" role="status">
                            <Clock3 size={24} />
                            <div>
                                <h3>
                                    {t(
                                        stageStatus === "ended"
                                            ? "aix.refined.status.stageClosed"
                                            : "aix.challengePending"
                                    )}
                                </h3>
                                <p>
                                    {stage && stageStatus === "upcoming"
                                        ? t("aix.refined.releaseAt", { date: date(stage.opensAt) })
                                        : t(
                                              stageStatus === "ended"
                                                  ? "aix.refined.closedBrief"
                                                  : "aix.refined.awaitPublication"
                                          )}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                <aside className="aix-brief-meta">
                    <section>
                        <h3>{t("aix.refined.participation")}</h3>
                        <p>
                            {t(track === "campus" ? "aix.refined.individual" : "aix.refined.team")}
                        </p>
                    </section>
                    <section>
                        <h3>{t("aix.refined.schedule")}</h3>
                        <p>
                            {t(
                                track === "campus"
                                    ? "aix.campusSchedule"
                                    : `aix.stages.${stage?.id || "initial"}.description`
                            )}
                        </p>
                        {track === "industry" && stage && (
                            <p className="aix-brief-date">
                                {date(stage.opensAt)} —<br />
                                {date(stage.closesAt)}
                            </p>
                        )}
                    </section>
                    <section>
                        <h3>{t("aix.requirements")}</h3>
                        <p>
                            {t(
                                track === "campus"
                                    ? "aix.refined.campusMaterials"
                                    : `aix.stages.${stage?.id || "initial"}.materials`
                            )}
                        </p>
                    </section>
                    <a className="aix-primary" href="#submission">
                        {t("aix.refined.toSubmission")}
                        <ArrowDown size={17} />
                    </a>
                </aside>
            </section>
            <section
                className="aix-submission-section"
                id="submission"
                ref={submissionRef}
                aria-labelledby="aix-submission-title"
            >
                <header>
                    <h2 id="aix-submission-title">{t("aix.refined.mySubmission")}</h2>
                    <p>{t("aix.refined.submissionIntro")}</p>
                </header>
                {loading ? (
                    <div className="aix-submission-gate" role="status">
                        {t("aix.loading")}
                    </div>
                ) : error ? (
                    <div className="aix-submission-gate" role="alert">
                        <h3>{t("aix.refined.loadFailed")}</h3>
                        <button className="aix-secondary" onClick={onRetry}>
                            {t("aix.retry")}
                        </button>
                    </div>
                ) : !user ? (
                    <div className="aix-submission-gate">
                        <LockKeyhole size={26} />
                        <h3>{t("aix.refined.loginTitle")}</h3>
                        <p>{t("aix.refined.loginHint")}</p>
                        <button className="aix-primary" onClick={onLogin}>
                            {t("accountProfile.loginOrRegister")}
                        </button>
                    </div>
                ) : !registration ? (
                    <div className="aix-submission-gate">
                        <h3>
                            {t(
                                !signupOpen
                                    ? "aix.refined.noRegistrationClosed"
                                    : "aix.refined.registerFirst"
                            )}
                        </h3>
                        <p>
                            {t(signupOpen ? "aix.refined.registerHint" : "aix.refined.closedHint")}
                        </p>
                        {signupOpen && (
                            <Link className="aix-primary" to={goRegistration}>
                                {t("aix.register.title")}
                                <ArrowUpRight size={17} />
                            </Link>
                        )}
                    </div>
                ) : (
                    <RepositorySubmission
                        key={`${user.id}:${registration.id}`}
                        registration={registration}
                        endAt={template.event.endAt}
                        onSaved={onRegistered}
                    />
                )}
            </section>
        </div>
    );
}
