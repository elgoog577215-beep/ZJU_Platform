import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
    CalendarDays,
    ChevronDown,
    FolderKanban,
    Image as ImageIcon,
    LockKeyhole,
    Trophy,
    X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useSettings } from "../context/SettingsContext";
import { getHackathonScheduleEvent } from "../data/hackathonTemplate";
import { useBackClose, useBodyScrollLock } from "../hooks/useBackClose";
import { useHackathonSchedule } from "../hooks/useHackathonSchedule";
import BodyPortal from "../shared/ui/BodyPortal";
import { getCompetitionPhase } from "../utils/competitionPhase";
import {
    getDefaultHackathonView,
    getHackathonProjectUrl,
    getHackathonViewFromLocation,
    isHackathonWorkspaceView,
} from "../utils/hackathonRoute";
import HackathonRegistration from "./HackathonRegistration";
import HackathonShowcase from "./HackathonOutcomeShowcase";

const MediaEventArchive = lazy(() => import("./MediaEventArchive"));

/*
THESIS: 浙客松是一座跨届赛事工作台，拒绝把赛事和阶段挤进会消失的双层横向导航。
OWN-WORLD: 延续生态介绍页的深色玻璃、青蓝网格和克制高光；单届赛事视觉只进入正文。
STORY: 用户先确认哪一届，再在报名、作品、影像和成果之间连续工作。
FIRST VIEWPORT: 左侧是紧凑历届卡，右侧只保留四阶段导航，正文从其下展开。
FORM: 垂直档案架加水平阶段轴；赛事选择和阶段选择在空间上正交，移动端收为抽屉。
*/

const formatEventDate = (value, locale, fallback) => {
    const timestamp = Date.parse(value || "");
    if (!Number.isFinite(timestamp)) return fallback;
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(timestamp));
};

const getEventPhase = (template) => getCompetitionPhase(template?.event);
const phaseRank = { live: 0, upcoming: 1, ended: 2, archive: 2 };

const HackathonSeasonOne = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { settings, uiMode } = useSettings();
    const { schedule, loading: scheduleLoading } = useHackathonSchedule(settings);
    const isDayMode = uiMode === "day";
    const isEnglish = String(i18n.resolvedLanguage || i18n.language || "zh").startsWith("en");
    const locale = isEnglish ? "en" : "zh-CN";
    const stageHeadingRef = useRef(null);
    const [eventPickerOpen, setEventPickerOpen] = useState(false);

    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const requestedEventKey = params.get("event");
    const requestedCompetitionSlug = params.get("competition");
    const explicitView = params.get("view");
    const template = useMemo(() => {
        const competitionEvent = requestedCompetitionSlug
            ? schedule.events.find(
                  (item) => item.results.competitionSlug === requestedCompetitionSlug
              )
            : null;
        return getHackathonScheduleEvent(
            schedule,
            requestedEventKey || competitionEvent?.event.key
        );
    }, [requestedCompetitionSlug, requestedEventKey, schedule]);
    const activeEventKey = template.event.key;
    const competitionSlug = template.results.competitionSlug;
    const defaultView = getDefaultHackathonView(template);
    const activeView = getHackathonViewFromLocation(location, defaultView);
    const orderedEvents = useMemo(
        () =>
            schedule.events
                .map((item, originalIndex) => ({ item, originalIndex, phase: getEventPhase(item) }))
                .sort((left, right) => {
                    const rank = phaseRank[left.phase] - phaseRank[right.phase];
                    if (rank !== 0) return rank;
                    return (
                        Date.parse(right.item.event.startAt || "") -
                        Date.parse(left.item.event.startAt || "")
                    );
                }),
        [schedule.events]
    );

    const views = useMemo(
        () => [
            {
                id: "register",
                label: t("hackathon.workspace.register", "赛事报名"),
                description: t("hackathon.workspace.register_desc", "介绍、赛制与报名"),
                icon: CalendarDays,
            },
            {
                id: "projects",
                label: t("hackathon.workspace.projects", "项目作品"),
                description: t("hackathon.workspace.projects_desc", "提交与浏览参赛作品"),
                icon: FolderKanban,
            },
            {
                id: "media",
                label: t("hackathon.workspace.media", "赛事影像"),
                description: t("hackathon.workspace.media_desc", "图片直播与精选"),
                icon: ImageIcon,
            },
            {
                id: "showcase",
                label: t("hackathon.workspace.showcase", "成果展示"),
                description: t("hackathon.workspace.showcase_desc", "获奖作品与赛事总结"),
                icon: Trophy,
            },
        ],
        [t]
    );

    const phaseLabel = (phase) => {
        if (phase === "live") return t("hackathon.workspace.phase_live", "进行中");
        if (phase === "upcoming") return t("hackathon.workspace.phase_upcoming", "即将开始");
        return t("hackathon.workspace.phase_archive", "往届");
    };

    useBackClose(eventPickerOpen, () => setEventPickerOpen(false));
    useBodyScrollLock(eventPickerOpen);

    useEffect(() => {
        if (scheduleLoading) return;
        if (activeView === "projects") {
            navigate(getHackathonProjectUrl(competitionSlug, location), {
                replace: true,
                state: location.state,
            });
            return;
        }
        const pathNeedsSync = location.pathname !== "/hackathon";
        const eventNeedsSync = requestedEventKey !== activeEventKey;
        const viewNeedsSync =
            !isHackathonWorkspaceView(explicitView) || explicitView !== activeView;
        if (!pathNeedsSync && !eventNeedsSync && !viewNeedsSync) return;

        const nextParams = new URLSearchParams(location.search);
        nextParams.set("event", activeEventKey);
        nextParams.set("view", activeView);
        nextParams.delete("competition");
        navigate(`/hackathon?${nextParams.toString()}${location.hash || ""}`, { replace: true });
    }, [
        activeEventKey,
        activeView,
        competitionSlug,
        explicitView,
        location,
        navigate,
        requestedEventKey,
        scheduleLoading,
    ]);

    useEffect(() => {
        if (!location.hash.startsWith("#showcase-")) return undefined;
        const animationFrame = window.requestAnimationFrame(() => {
            document
                .querySelector(location.hash)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return () => window.cancelAnimationFrame(animationFrame);
    }, [activeEventKey, activeView, location.hash]);

    useEffect(() => {
        let secondFrame = 0;
        const firstFrame = window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            secondFrame = window.requestAnimationFrame(() => {
                window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            });
        });
        return () => {
            window.cancelAnimationFrame(firstFrame);
            window.cancelAnimationFrame(secondFrame);
        };
    }, [activeEventKey, activeView]);

    const buildWorkspaceUrl = (eventKey, view) => {
        const nextParams = new URLSearchParams(location.search);
        nextParams.set("event", eventKey);
        nextParams.set("view", view);
        nextParams.delete("competition");
        ["mediaView", "photo", "work", "id", "create", "submit"].forEach((key) =>
            nextParams.delete(key)
        );
        return `/hackathon?${nextParams.toString()}`;
    };

    const resetStagePosition = () => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        window.requestAnimationFrame(() => stageHeadingRef.current?.focus({ preventScroll: true }));
    };

    const switchEvent = (nextTemplate) => {
        if (nextTemplate.event.key !== activeEventKey) {
            navigate(buildWorkspaceUrl(nextTemplate.event.key, activeView));
            resetStagePosition();
        }
        setEventPickerOpen(false);
    };

    const renderStage = () => {
        if (activeView === "register") {
            return <HackathonRegistration key={activeEventKey} template={template} />;
        }
        if (activeView === "media") {
            return (
                <Suspense fallback={<WorkspaceLoading t={t} />}>
                    <MediaEventArchive
                        key={`${activeEventKey}-media`}
                        embedded
                        eventKey={activeEventKey}
                        eventSlug={competitionSlug}
                    />
                </Suspense>
            );
        }
        if (activeView === "showcase" && template.navigation.resultsVisible) {
            return <HackathonShowcase key={activeEventKey} template={template} />;
        }
        return (
            <div className="hws-unavailable">
                <LockKeyhole aria-hidden="true" />
                <h2>{t("hackathon.workspace.results_pending", "本场成果尚未发布")}</h2>
                <p>
                    {t(
                        "hackathon.workspace.results_pending_desc",
                        "赛事环节保持在这里，正式成果发布后会直接出现在同一位置。"
                    )}
                </p>
            </div>
        );
    };

    if (activeView === "projects") {
        return (
            <div className={`hackathon-workspace ${isDayMode ? "is-day" : "is-dark"}`}>
                <style>{WORKSPACE_CSS}</style>
                <WorkspaceLoading t={t} />
            </div>
        );
    }

    return (
        <div
            className={`hackathon-workspace ${isDayMode ? "is-day" : "is-dark"}`}
            data-view={activeView}
        >
            <style>{WORKSPACE_CSS}</style>
            <div className="hws-grid">
                <aside
                    className="hws-event-rail"
                    aria-label={t("hackathon.workspace.events_aria", "历届赛事")}
                >
                    <div className="hws-event-rail-head">
                        <strong>{t("hackathon.workspace.archive_title", "历届浙客松")}</strong>
                        <small>
                            {t("hackathon.workspace.archive_count", "{{count}} 场赛事", {
                                count: schedule.events.length,
                            })}
                        </small>
                    </div>
                    <div className="hws-event-list">
                        {orderedEvents.map(({ item, originalIndex, phase }) => (
                            <EventCard
                                key={item.event.key}
                                variant="rail"
                                template={item}
                                edition={originalIndex + 1}
                                selected={item.event.key === activeEventKey}
                                phase={phase}
                                phaseLabel={phaseLabel(phase)}
                                locale={locale}
                                t={t}
                                onSelect={() => switchEvent(item)}
                            />
                        ))}
                    </div>
                </aside>

                <div className="hws-main">
                    <header className="hws-context-bar">
                        <button
                            type="button"
                            className="hws-mobile-event-button"
                            aria-haspopup="dialog"
                            aria-expanded={eventPickerOpen}
                            onClick={() => setEventPickerOpen(true)}
                        >
                            <span>
                                {t("hackathon.workspace.current_event", "当前赛事")}
                                <strong>{template.event.title}</strong>
                            </span>
                            <ChevronDown aria-hidden="true" />
                        </button>

                        <nav
                            className="hws-stage-tabs"
                            aria-label={t("hackathon.workspace.stages_aria", "赛事环节")}
                        >
                            {views.map((view) => {
                                const Icon = view.icon;
                                const selected = activeView === view.id;
                                return (
                                    <Link
                                        key={view.id}
                                        to={
                                            view.id === "projects"
                                                ? getHackathonProjectUrl(competitionSlug)
                                                : buildWorkspaceUrl(activeEventKey, view.id)
                                        }
                                        aria-current={selected ? "page" : undefined}
                                        aria-disabled={scheduleLoading || undefined}
                                        className={selected ? "is-current" : ""}
                                        onClick={(event) => {
                                            if (scheduleLoading) event.preventDefault();
                                            else resetStagePosition();
                                        }}
                                    >
                                        <span className="hws-stage-symbol" aria-hidden="true">
                                            <Icon />
                                        </span>
                                        <strong>{view.label}</strong>
                                    </Link>
                                );
                            })}
                        </nav>
                    </header>

                    <section
                        id="hackathon-workspace-stage"
                        className={`hws-stage is-${activeView}`}
                        aria-label={views.find((view) => view.id === activeView)?.label}
                    >
                        <span
                            ref={stageHeadingRef}
                            className="hws-stage-focus-target"
                            tabIndex={-1}
                        >
                            {views.find((view) => view.id === activeView)?.label}
                        </span>
                        {renderStage()}
                    </section>
                </div>
            </div>

            {eventPickerOpen ? (
                <BodyPortal>
                    <div
                        className={`hws-drawer-scrim ${isDayMode ? "is-day" : "is-dark"}`}
                        onMouseDown={() => setEventPickerOpen(false)}
                    >
                        <section
                            className={`hws-event-drawer ${isDayMode ? "is-day" : "is-dark"}`}
                            role="dialog"
                            aria-modal="true"
                            aria-label={t("hackathon.workspace.choose_event", "选择赛事")}
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <header>
                                <div>
                                    <span>{t("hackathon.workspace.archive", "赛事档案")}</span>
                                    <h2>{t("hackathon.workspace.choose_event", "选择赛事")}</h2>
                                </div>
                                <button
                                    type="button"
                                    aria-label={t("common.close", "关闭")}
                                    onClick={() => setEventPickerOpen(false)}
                                >
                                    <X aria-hidden="true" />
                                </button>
                            </header>
                            <div className="hws-drawer-list">
                                {orderedEvents.map(({ item, originalIndex, phase }) => (
                                    <EventCard
                                        key={item.event.key}
                                        variant="drawer"
                                        template={item}
                                        edition={originalIndex + 1}
                                        selected={item.event.key === activeEventKey}
                                        phase={phase}
                                        phaseLabel={phaseLabel(phase)}
                                        locale={locale}
                                        t={t}
                                        onSelect={() => switchEvent(item)}
                                    />
                                ))}
                            </div>
                        </section>
                    </div>
                </BodyPortal>
            ) : null}
        </div>
    );
};

const EventCard = ({
    template,
    edition,
    selected,
    phase,
    phaseLabel,
    locale,
    t,
    onSelect,
    variant = "rail",
}) => (
    <button
        type="button"
        className={`hws-event-card is-${variant} ${selected ? "is-current" : ""}`}
        aria-current={selected ? "page" : undefined}
        onClick={onSelect}
    >
        <span className="hws-event-edition">
            {t("hackathon.workspace.edition", "第 {{count}} 届", { count: edition })}
            <i className={`is-${phase}`}>{phaseLabel}</i>
        </span>
        <strong>{template.event.title}</strong>
        <small>
            {formatEventDate(template.event.startAt, locale, t("common.tba", "待定"))}
            {template.event.location ? ` · ${template.event.location}` : ""}
        </small>
    </button>
);

const WorkspaceLoading = ({ t }) => (
    <div className="hws-loading" role="status">
        <span aria-hidden="true" />
        {t("common.loading", "加载中…")}
    </div>
);

const WORKSPACE_CSS = `
.hackathon-workspace{--hws-bg:#050809;--hws-panel:#0b1718;--hws-panel-2:#121c1d;--hws-text:#fff;--hws-muted:rgba(255,255,255,.56);--hws-line:rgba(255,255,255,.12);--hws-line-strong:rgba(103,232,249,.42);--hws-lime:#67e8f9;--hws-lime-ink:#082024;position:relative;min-height:100svh;overflow-x:clip;background:linear-gradient(135deg,#050809 0%,#0a1919 54%,#040707 100%);color:var(--hws-text);font-family:"HarmonyOS Sans SC","MiSans","PingFang SC",system-ui,sans-serif;isolation:isolate;}
.hackathon-workspace.is-day{--hws-bg:#f6f8fb;--hws-panel:#fff;--hws-panel-2:#eef8fb;--hws-text:#0f172a;--hws-muted:#64748b;--hws-line:rgba(15,23,42,.12);--hws-line-strong:rgba(6,182,212,.38);--hws-lime:#0891b2;--hws-lime-ink:#fff;background:linear-gradient(135deg,#fff 0%,#eef8fb 52%,#f8fafc 100%);}
.hackathon-workspace::before{content:"";position:fixed;z-index:-1;inset:64px 0 0 232px;pointer-events:none;background:radial-gradient(circle at 74% 0%,rgba(34,211,238,.1),transparent 26%),linear-gradient(rgba(103,232,249,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(103,232,249,.035) 1px,transparent 1px);background-size:auto,52px 52px,52px 52px;mask-image:linear-gradient(to bottom,#000,transparent 62%);}
.hws-grid{display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100svh;padding-top:calc(env(safe-area-inset-top) + 64px);}
.hws-event-rail{position:sticky;top:calc(env(safe-area-inset-top) + 64px);z-index:31;align-self:start;height:calc(100svh - env(safe-area-inset-top) - 64px);overflow:hidden;border-right:1px solid var(--hws-line);background:rgba(7,15,16,.96);}
.hackathon-workspace.is-day .hws-event-rail{background:rgba(255,255,255,.96);}
.hws-event-rail-head{display:grid;gap:5px;padding:24px 20px 18px;border-bottom:1px solid var(--hws-line);}
.hws-event-rail-head strong{font-size:18px;line-height:1.2;font-weight:900;letter-spacing:-.025em;}
.hws-event-rail-head small{color:var(--hws-muted);font-size:10.5px;font-weight:750;}
.hws-event-list{display:block;max-height:calc(100% - 84px);overflow-y:auto;padding:8px 20px 16px;overscroll-behavior:contain;scrollbar-width:thin;}
.hws-event-card{position:relative;display:grid;gap:8px;width:100%;min-height:0;padding:16px 0 15px 14px;border:0;border-bottom:1px solid var(--hws-line);border-radius:0;background:transparent;color:var(--hws-muted);font:inherit;text-align:left;cursor:pointer;transition:color .18s ease;}
.hws-event-card::before{content:"";position:absolute;left:0;top:21px;width:6px;height:6px;border-radius:50%;background:transparent;}
.hws-event-card:hover{color:var(--hws-text);}
.hws-event-card.is-current{color:var(--hws-text);}
.hws-event-card.is-current::before{background:var(--hws-lime);}
.hws-event-card:focus-visible,.hws-stage-tabs a:focus-visible,.hws-mobile-event-button:focus-visible,.hws-event-drawer header button:focus-visible{outline:3px solid color-mix(in srgb,var(--hws-lime) 42%,transparent);outline-offset:2px;}
.hws-event-edition{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--hws-muted);font-size:10px;font-weight:900;line-height:1.2;}
.hws-event-card.is-current .hws-event-edition{color:var(--hws-lime);}
.hws-event-edition i{font-style:normal;color:var(--hws-muted);font-size:10px;font-weight:850;}
.hws-event-edition i.is-live{color:var(--hws-lime);}
.hws-event-card strong{font-size:14px;line-height:1.4;font-weight:900;letter-spacing:-.01em;}
.hws-event-card small{color:var(--hws-muted);font-size:10.5px;line-height:1.5;font-weight:700;}
.hws-event-card.is-drawer{gap:12px;min-height:124px;padding:16px 16px 15px 20px;border:1px solid var(--hws-line);border-radius:2px;background:linear-gradient(180deg,rgba(19,29,30,.82),rgba(11,21,21,.68));}
.hws-event-card.is-drawer::before{display:none;}
.hws-event-card.is-drawer.is-current{border-color:var(--hws-lime);background:linear-gradient(180deg,color-mix(in srgb,var(--hws-lime) 11%,#121c1d),rgba(11,23,24,.92));box-shadow:0 20px 52px rgba(0,0,0,.3);}
.hws-event-card.is-drawer .hws-event-edition{color:var(--hws-lime);}
.hws-event-card.is-drawer strong{font-size:15px;}
.hws-event-card.is-drawer small{font-size:11px;}
.hws-main{min-width:0;}
.hws-context-bar{position:sticky;top:calc(env(safe-area-inset-top) + 64px);z-index:30;overflow:hidden;border-bottom:1px solid var(--hws-line);background:rgba(8,19,20,.94);box-shadow:0 12px 36px rgba(0,0,0,.18);backdrop-filter:blur(18px);}
.hackathon-workspace.is-day .hws-context-bar{background:rgba(255,255,255,.92);box-shadow:0 8px 28px rgba(15,23,42,.06);}
.hws-stage-tabs{position:relative;display:flex;min-height:48px;align-items:stretch;gap:clamp(24px,3vw,44px);padding:0 clamp(28px,4vw,64px);}
.hws-stage-tabs a{position:relative;display:flex;min-width:0;min-height:48px;align-items:center;gap:8px;padding:0;border:0;border-radius:0;background:transparent;color:var(--hws-muted);font:inherit;text-align:left;text-decoration:none;cursor:pointer;transition:color .18s ease;}
.hws-stage-tabs a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:transparent;transition:background .18s ease;}
.hws-stage-tabs a:hover{color:var(--hws-text);}
.hws-stage-tabs a[aria-disabled="true"]{opacity:.6;cursor:wait;}
.hws-stage-tabs a.is-current{color:var(--hws-text);}
.hws-stage-tabs a.is-current::after{background:var(--hws-lime);}
.hws-stage-symbol{display:grid;width:18px;height:18px;flex:none;place-items:center;}
.hws-stage-symbol svg{width:16px;height:16px;color:currentColor;}
.hws-stage-tabs a.is-current .hws-stage-symbol{color:var(--hws-lime);}
.hws-stage-tabs strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:950;}
.hws-stage{position:relative;min-width:0;min-height:calc(100svh - 112px);background:var(--hws-bg);}
.hws-stage.is-projects,.hws-stage.is-media{background:#020806;color:#fff;}
.hws-stage-focus-target{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;}
.hws-stage.is-register [data-registration-page]{height:calc(100svh - env(safe-area-inset-top) - 112px)!important;min-height:560px;}
.hws-stage.is-register [data-registration-page] #hackathon-hero{padding-top:48px!important;}
.hws-stage.is-register [data-registration-page] #partner-network{min-height:100%!important;}
.hws-stage.is-showcase .showcase-gate-frame{padding-top:42px!important;}
.hws-unavailable,.hws-loading{display:grid;min-height:58vh;place-items:center;align-content:center;gap:12px;padding:48px 20px;text-align:center;color:var(--hws-muted);}
.hws-unavailable svg{width:34px;height:34px;color:var(--hws-lime);}
.hws-unavailable h2{margin:4px 0 0;color:var(--hws-text);font-size:24px;font-weight:950;}
.hws-unavailable p{max-width:52ch;margin:0;line-height:1.7;}
.hws-loading{grid-template-columns:auto auto;min-height:50vh;font-size:13px;font-weight:800;}
.hws-loading span{width:9px;height:9px;border-radius:50%;background:var(--hws-lime);animation:hws-pulse 1.2s ease-out infinite;}
@keyframes hws-pulse{50%{opacity:.3;transform:scale(.72)}}
.hws-mobile-event-button{display:none;}
.hws-drawer-scrim{position:fixed;inset:0;z-index:180;display:flex;align-items:flex-end;background:rgba(0,0,0,.72);backdrop-filter:blur(10px);}
.hws-drawer-scrim.is-day{background:rgba(15,23,42,.38);backdrop-filter:blur(8px);}
.hws-event-drawer{--hws-panel:#0b1718;--hws-text:#fff;--hws-muted:rgba(255,255,255,.56);--hws-line:rgba(255,255,255,.12);--hws-line-strong:rgba(103,232,249,.36);--hws-lime:#67e8f9;width:100%;max-height:min(78dvh,720px);overflow:hidden;border-top:1px solid rgba(103,232,249,.38);border-radius:16px 16px 0 0;background:linear-gradient(180deg,#0b1718,#071011);color:#fff;box-shadow:0 -22px 80px rgba(0,0,0,.56),0 0 70px rgba(34,211,238,.08);}
.hws-event-drawer header{display:flex;align-items:center;justify-content:space-between;padding:18px 16px 14px;border-bottom:1px solid rgba(247,248,242,.12);}
.hws-event-drawer header span{color:#b9ff18;font-size:10px;font-weight:900;}
.hws-event-drawer header h2{margin:4px 0 0;font-size:20px;font-weight:950;}
.hws-event-drawer header button{display:grid;width:44px;height:44px;place-items:center;border:1px solid rgba(247,248,242,.14);border-radius:10px;background:transparent;color:#f7f8f2;}
.hws-event-drawer.is-day{--hws-panel:#fff;--hws-text:#0f172a;--hws-muted:#64748b;--hws-line:rgba(15,23,42,.12);--hws-line-strong:rgba(8,145,178,.3);--hws-lime:#0891b2;border-top-color:rgba(8,145,178,.28);background:#fff;color:#0f172a;box-shadow:0 -22px 70px rgba(15,23,42,.18);}
.hws-event-drawer.is-day header{border-bottom-color:rgba(15,23,42,.1);}
.hws-event-drawer.is-day header span{color:var(--hws-lime);}
.hws-event-drawer.is-day header button{border-color:rgba(15,23,42,.14);background:#f8fafc;color:var(--hws-text);}
.hws-event-drawer.is-day .hws-event-card.is-drawer{background:#fff;}
.hws-event-drawer.is-day .hws-event-card.is-drawer.is-current{border-color:rgba(8,145,178,.38);background:rgba(8,145,178,.07);box-shadow:none;}
.hws-drawer-list{display:grid;gap:9px;max-height:calc(min(78dvh,720px) - 78px);overflow-y:auto;padding:14px 14px calc(env(safe-area-inset-bottom) + 18px);}
@media(max-width:1180px){
  .hws-grid{display:block;padding-top:calc(env(safe-area-inset-top) + 64px)}
  .hackathon-workspace::before{inset:64px 0 0}
  .hws-event-rail{display:none}
  .hws-context-bar{top:calc(env(safe-area-inset-top) + 64px)}
  .hws-mobile-event-button{position:relative;display:flex;width:100%;min-height:60px;align-items:center;justify-content:space-between;gap:14px;overflow:hidden;padding:10px 16px 10px 20px;border:0;border-bottom:1px solid var(--hws-line);background:linear-gradient(100deg,color-mix(in srgb,var(--hws-lime) 8%,var(--hws-panel)),var(--hws-panel) 58%);color:var(--hws-text);font:inherit;text-align:left}
  .hws-mobile-event-button::before{content:"";position:absolute;left:0;top:11px;bottom:11px;width:3px;background:var(--hws-lime);box-shadow:0 0 14px var(--hws-lime)}
  .hackathon-workspace.is-day .hws-mobile-event-button::before{box-shadow:none}
  .hws-mobile-event-button span{display:grid;gap:3px;min-width:0;color:var(--hws-lime);font:900 9px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}
  .hws-mobile-event-button strong{max-width:70vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--hws-text);font-size:13px;font-weight:950}
  .hws-mobile-event-button svg{width:18px;height:18px;color:var(--hws-lime)}
  .hws-stage-tabs{display:flex;max-width:100%;min-height:52px;gap:4px;overflow-x:auto;padding:0 8px;scrollbar-width:none;scroll-snap-type:x proximity}
  .hws-stage-tabs::-webkit-scrollbar{display:none}
  .hws-stage-tabs a{flex:0 0 auto;min-width:104px;min-height:52px;padding:0 12px;scroll-snap-align:start}
  .hws-stage-tabs a::after{left:10px;right:10px}
  .hws-stage-symbol{width:18px;height:18px}
  .hws-stage-symbol svg{width:15px;height:15px}
  .hws-stage{min-height:calc(100svh - 176px)}
  .hws-stage.is-register [data-registration-page]{height:calc(100svh - env(safe-area-inset-top) - 176px)!important;min-height:520px}
  .hws-stage.is-register [data-registration-page] #hackathon-hero{padding-top:36px!important}
}
@media(max-width:560px){.hws-stage-tabs a{min-width:100px}.hws-stage-tabs strong{font-size:12px}}
@media(prefers-reduced-motion:reduce){.hws-event-card,.hws-stage-tabs a{transition:none}.hws-event-card:hover{transform:none}.hws-loading span{animation:none}}
`;

export default HackathonSeasonOne;
