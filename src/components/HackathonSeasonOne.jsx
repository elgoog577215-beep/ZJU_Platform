import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Film, LockKeyhole, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useSettings } from "../context/SettingsContext";
import {
    getFirstAvailableHackathonView,
    getHackathonScheduleEvent,
} from "../data/hackathonTemplate";
import { useHackathonSchedule } from "../hooks/useHackathonSchedule";
import { getHackathonViewFromLocation } from "../utils/hackathonRoute";
import HackathonRegistration from "./HackathonRegistration";
import HackathonShowcase from "./HackathonOutcomeShowcase";

const formatTimelineDate = (value, fallback = "待定") => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[2]}.${match[3]}` : fallback;
};

const hasCjkText = (value) => typeof value === "string" && /[\u3400-\u9fff]/.test(value);

const HackathonSeasonOne = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { settings, uiMode } = useSettings();
    const { schedule, loading: scheduleLoading } = useHackathonSchedule(settings);
    const isDayMode = uiMode === "day";
    const isEnglish = String(i18n.resolvedLanguage || i18n.language || "zh").startsWith("en");
    const shellRef = useRef(null);
    const timelineScrollRef = useRef(null);
    const activeNodeRef = useRef(null);
    const [pageTabsVisible, setPageTabsVisible] = useState(true);
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const requestedEventKey = params.get("event");
    const requestedCompetitionSlug = params.get("competition");
    const requestedView = getHackathonViewFromLocation(location);
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
    const activeView = getFirstAvailableHackathonView(template, requestedView);
    const showcaseMode = activeView === "showcase";

    useEffect(() => {
        if (scheduleLoading) return;
        const eventNeedsSync = requestedEventKey !== activeEventKey;
        const viewNeedsSync = Boolean(activeView && requestedView !== activeView);
        if (!eventNeedsSync && !viewNeedsSync) return;

        const nextParams = new URLSearchParams(location.search);
        nextParams.set("event", activeEventKey);
        if (activeView) nextParams.set("view", activeView);
        navigate(`/hackathon?${nextParams.toString()}${location.hash || ""}`, { replace: true });
    }, [
        activeEventKey,
        activeView,
        location.hash,
        location.search,
        navigate,
        requestedEventKey,
        requestedView,
        scheduleLoading,
    ]);

    useEffect(() => {
        if (!location.hash.startsWith("#showcase-")) return undefined;
        const animationFrame = window.requestAnimationFrame(() => {
            if (location.hash === "#showcase-overview") {
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }
            document
                .querySelector(location.hash)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return () => window.cancelAnimationFrame(animationFrame);
    }, [activeEventKey, activeView, location.hash]);

    useEffect(() => {
        const container = timelineScrollRef.current;
        const node = activeNodeRef.current;
        if (!container || !node) return;
        const targetLeft = node.offsetLeft - (container.clientWidth - node.offsetWidth) / 2;
        container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    }, [activeEventKey]);

    useEffect(() => {
        const shell = shellRef.current;
        if (!shell) return undefined;

        const pageScroller = shell.querySelector("[data-registration-page], [data-showcase-page]");
        if (!pageScroller) return undefined;

        const usesWindowScroll = pageScroller.classList.contains("showcase-compact-flow");
        const scrollTarget = usesWindowScroll ? window : pageScroller;
        let animationFrame = 0;

        const updatePageTabs = () => {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = window.requestAnimationFrame(() => {
                const scrollOffset = usesWindowScroll
                    ? Math.max(0, -shell.getBoundingClientRect().top)
                    : pageScroller.scrollTop;
                setPageTabsVisible(scrollOffset < 96);
            });
        };

        updatePageTabs();
        scrollTarget.addEventListener("scroll", updatePageTabs, { passive: true });
        window.addEventListener("resize", updatePageTabs, { passive: true });

        return () => {
            window.cancelAnimationFrame(animationFrame);
            scrollTarget.removeEventListener("scroll", updatePageTabs);
            window.removeEventListener("resize", updatePageTabs);
        };
    }, [activeEventKey, activeView]);

    const views = useMemo(
        () => [
            {
                id: "register",
                label: t("hackathon.tabs.register", "赛事报名"),
                shortLabel: t("hackathon.tabs.register_short", "报名"),
                icon: CalendarDays,
                available: template.navigation.registrationVisible,
            },
            {
                id: "showcase",
                label: t("hackathon.tabs.showcase", "比赛成果"),
                shortLabel: t("hackathon.tabs.showcase_short", "成果"),
                icon: Film,
                available: template.navigation.resultsVisible,
            },
        ],
        [t, template.navigation.registrationVisible, template.navigation.resultsVisible]
    );

    const navigateTo = (eventKey, view) => {
        const nextParams = new URLSearchParams(location.search);
        nextParams.set("event", eventKey);
        if (view) nextParams.set("view", view);
        else nextParams.delete("view");
        navigate(`/hackathon?${nextParams.toString()}`);
    };

    const switchEvent = (nextTemplate) => {
        if (nextTemplate.event.key === activeEventKey) return;
        const nextView = getFirstAvailableHackathonView(nextTemplate, activeView || requestedView);
        navigateTo(nextTemplate.event.key, nextView);
    };

    const switchView = (view) => {
        if (!view.available || view.id === activeView) return;
        navigateTo(activeEventKey, view.id);
    };

    const shellClass = showcaseMode
        ? "border-[#b9ff18]/30 bg-[#020806]/80 text-white shadow-[0_18px_55px_rgba(0,0,0,0.42)]"
        : isDayMode
          ? "border-emerald-200/80 bg-white/78 text-slate-900 shadow-[0_14px_34px_rgba(15,118,110,0.13)]"
          : "border-cyan-300/16 bg-[#061014]/72 text-white shadow-[0_0_30px_rgba(34,211,238,0.12)]";
    const titleClass = showcaseMode || !isDayMode ? "text-white" : "text-slate-950";
    const mutedClass = showcaseMode
        ? "text-[#d8e0d4]/58"
        : isDayMode
          ? "text-slate-500"
          : "text-cyan-100/62";
    const activeTabClass = showcaseMode
        ? "bg-[#b9ff18] text-[#071006] shadow-[0_0_24px_rgba(185,255,24,0.22)]"
        : isDayMode
          ? "border border-emerald-200/80 bg-emerald-50 text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.15)]"
          : "bg-cyan-300 text-cyan-950 shadow-[0_0_20px_rgba(103,232,249,0.3)]";
    const idleTabClass = showcaseMode
        ? "text-[#e8eee4]/72 hover:bg-[#b9ff18]/10 hover:text-white"
        : isDayMode
          ? "text-emerald-900/75 hover:bg-emerald-50 hover:text-emerald-950"
          : "text-cyan-100/76 hover:bg-white/8 hover:text-white";
    const disabledTabClass =
        isDayMode && !showcaseMode
            ? "cursor-not-allowed text-slate-400 opacity-55"
            : "cursor-not-allowed text-white/30 opacity-60";

    return (
        <div
            ref={shellRef}
            className="hackathon-schedule-shell day-page-theme day-page-theme-tech relative min-h-[100svh] max-w-full overflow-x-hidden"
        >
            <style>
                {`
                    .hackathon-schedule-shell {
                        --hackathon-schedule-clearance: calc(env(safe-area-inset-top) + 11.5rem);
                    }
                    .hackathon-schedule-shell [data-registration-page] #hackathon-hero {
                        padding-top: var(--hackathon-schedule-clearance) !important;
                    }
                    .hackathon-schedule-shell [data-showcase-page] .showcase-gate-frame {
                        padding-top: var(--hackathon-schedule-clearance) !important;
                    }
                    @media (min-width: 640px) {
                        .hackathon-schedule-shell {
                            --hackathon-schedule-clearance: calc(env(safe-area-inset-top) + 12rem);
                        }
                    }
                    @media (min-width: 1024px) {
                        .hackathon-schedule-shell {
                            --hackathon-schedule-clearance: calc(env(safe-area-inset-top) + 9.75rem);
                        }
                        .hackathon-schedule-shell [data-registration-logo-panel] {
                            top: var(--hackathon-schedule-clearance) !important;
                        }
                    }
                `}
            </style>

            <div className="pointer-events-none fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+66px)] z-[45] flex flex-col gap-1.5 sm:left-5 sm:right-5 sm:top-[calc(env(safe-area-inset-top)+72px)] lg:flex-row lg:items-start lg:justify-between min-[1720px]:left-7 min-[1720px]:right-7">
                {!showcaseMode ? (
                    <div
                        data-hackathon-schedule-panel
                        className={`pointer-events-auto mx-auto w-full max-w-[1480px] overflow-hidden rounded-[14px] border p-0 backdrop-blur-2xl transition-[opacity,transform] duration-300 ease-out lg:mx-0 lg:w-[520px] lg:min-w-0 lg:flex-none ${
                            pageTabsVisible
                                ? "max-lg:translate-y-0 max-lg:opacity-100"
                                : "max-lg:pointer-events-none max-lg:-translate-y-[150%] max-lg:opacity-0"
                        } ${shellClass}`}
                        aria-label={t("hackathon.timeline_aria", "比赛日程时间轴")}
                    >
                        <div
                            ref={timelineScrollRef}
                            className="hackathon-timeline-scroll overflow-x-auto"
                        >
                            <div className="flex min-w-full w-max items-stretch">
                                {schedule.events.map((item) => {
                                    const selected = item.event.key === activeEventKey;
                                    const eventEnd = item.event.endAt || item.event.startAt;
                                    const isArchived = eventEnd
                                        ? Date.parse(eventEnd) < Date.now()
                                        : !item.event.registrationOpen;
                                    return (
                                        <button
                                            key={item.event.key}
                                            ref={selected ? activeNodeRef : null}
                                            type="button"
                                            onClick={() => switchEvent(item)}
                                            aria-current={selected ? "step" : undefined}
                                            className={`group grid min-h-[58px] min-w-[280px] flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-r px-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${showcaseMode ? "focus-visible:ring-[#b9ff18]/70" : "focus-visible:ring-cyan-400/60"} ${
                                                selected
                                                    ? showcaseMode
                                                        ? "border-[#b9ff18]/35 bg-[#b9ff18]/[0.08] text-white shadow-[inset_0_-2px_#b9ff18]"
                                                        : isDayMode
                                                          ? "border-cyan-600 bg-cyan-50 text-cyan-950 shadow-[inset_0_-2px_#0891b2]"
                                                          : "border-cyan-300/30 bg-cyan-300/[0.06] text-white shadow-[inset_0_-2px_#67e8f9]"
                                                    : showcaseMode
                                                      ? "border-white/10 text-white/50 hover:bg-[#b9ff18]/[0.05] hover:text-white"
                                                      : isDayMode
                                                        ? "border-slate-200 text-cyan-950/60 hover:bg-cyan-50 hover:text-cyan-950"
                                                        : "border-white/10 text-cyan-100/48 hover:bg-white/[0.04] hover:text-white"
                                            }`}
                                        >
                                            <span
                                                className={`font-mono text-lg font-black tabular-nums ${selected ? (showcaseMode ? "text-[#b9ff18]" : isDayMode ? "text-cyan-700" : "text-cyan-300") : "opacity-60"}`}
                                            >
                                                {formatTimelineDate(
                                                    item.event.startAt,
                                                    t("common.tba", "待定")
                                                )}
                                            </span>
                                            <span className="truncate text-sm font-black">
                                                {isEnglish && hasCjkText(item.event.title)
                                                    ? t("hackathon.hero.full_title")
                                                    : item.event.title}
                                            </span>
                                            <span className="border border-current/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] opacity-60">
                                                {isArchived
                                                    ? t("hackathon.outcome_archive.archived")
                                                    : t(
                                                          "hackathon.outcome_archive.open_for_registration"
                                                      )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <span className="hidden lg:block" aria-hidden="true" />
                )}

                {pageTabsVisible ? (
                    <div
                        className={`pointer-events-auto flex w-full items-center gap-1 self-start rounded-[12px] border px-1.5 py-1 backdrop-blur-2xl sm:w-[min(420px,calc(100vw-2.5rem))] lg:w-[420px] lg:shrink-0 ${shellClass}`}
                        role="tablist"
                        aria-label={t("hackathon.tabs.aria")}
                    >
                        <div className="hidden min-w-[104px] items-center gap-2 border-r border-current/10 px-2.5 sm:flex">
                            <Trophy
                                className={`h-3.5 w-3.5 shrink-0 ${showcaseMode ? "text-[#b9ff18]" : isDayMode ? "text-emerald-500" : "text-cyan-400"}`}
                            />
                            <div className="min-w-0">
                                <p
                                    className={`truncate text-xs font-black leading-none ${titleClass}`}
                                >
                                    {t("hackathon.brand", "浙客松")}
                                </p>
                                <p
                                    className={`text-[10px] font-bold uppercase tracking-[0.16em] ${mutedClass}`}
                                >
                                    ZHEKESONG
                                </p>
                            </div>
                        </div>
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">
                            {views.map((view) => {
                                const Icon = view.icon;
                                const selected = activeView === view.id;
                                return (
                                    <button
                                        key={view.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={selected}
                                        aria-disabled={!view.available}
                                        disabled={!view.available}
                                        onClick={() => switchView(view)}
                                        className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[9px] px-3 text-xs font-black transition duration-200 focus:outline-none focus:ring-4 ${showcaseMode ? "focus:ring-[#b9ff18]/20" : "focus:ring-cyan-300/20"} ${
                                            !view.available
                                                ? disabledTabClass
                                                : selected
                                                  ? activeTabClass
                                                  : idleTabClass
                                        }`}
                                        title={view.available ? view.label : `${view.label}已隐藏`}
                                    >
                                        {view.available ? (
                                            <Icon className="h-4 w-4" />
                                        ) : (
                                            <LockKeyhole className="h-4 w-4" />
                                        )}
                                        <span className="hidden sm:inline">{view.label}</span>
                                        <span className="sm:hidden">{view.shortLabel}</span>
                                        {!view.available ? (
                                            <span className="text-[9px] font-bold">未开放</span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>

            {activeView === "showcase" ? (
                <HackathonShowcase key={activeEventKey} template={template} />
            ) : activeView === "register" ? (
                <HackathonRegistration key={activeEventKey} template={template} />
            ) : (
                <div
                    className={`flex min-h-[100svh] items-center justify-center px-6 pt-64 text-center ${
                        isDayMode ? "bg-slate-50 text-slate-900" : "bg-[#040506] text-white"
                    }`}
                >
                    <div>
                        <LockKeyhole className="mx-auto h-8 w-8 opacity-40" />
                        <h1 className="mt-4 text-xl font-black">该赛事页面暂未开放</h1>
                        <p className={`mt-2 text-sm font-semibold ${mutedClass}`}>
                            可以继续通过上方时间轴查看其他比赛日程。
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HackathonSeasonOne;
