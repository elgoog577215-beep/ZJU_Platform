import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { CalendarDays, Film, LockKeyhole, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useSettings } from "../context/SettingsContext";
import {
    getFirstAvailableHackathonView,
    getHackathonScheduleEvent,
} from "../data/hackathonTemplate";
import { useHackathonSchedule } from "../hooks/useHackathonSchedule";
import HackathonRegistration from "./HackathonRegistration";
import HackathonShowcase from "./HackathonShowcase";

const viewFromLocation = (location) => {
    const params = new URLSearchParams(location.search);
    const requestedView = params.get("view");

    if (requestedView === "register") return "register";
    if (location.pathname.includes("/showcase") || requestedView === "showcase") {
        return "showcase";
    }
    return "showcase";
};

const formatTimelineDate = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[2]}.${match[3]}` : "待定";
};

const HackathonSeasonOne = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const { settings, uiMode } = useSettings();
    const { schedule, loading: scheduleLoading } = useHackathonSchedule(settings);
    const isDayMode = uiMode === "day";
    const shellRef = useRef(null);
    const schedulePanelRef = useRef(null);
    const timelineScrollRef = useRef(null);
    const activeNodeRef = useRef(null);
    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const requestedEventKey = params.get("event");
    const requestedView = viewFromLocation(location);
    const template = useMemo(
        () => getHackathonScheduleEvent(schedule, requestedEventKey),
        [requestedEventKey, schedule]
    );
    const activeEventKey = template.event.key;
    const activeView = getFirstAvailableHackathonView(template, requestedView);

    useEffect(() => {
        if (scheduleLoading) return;
        const eventNeedsSync = requestedEventKey !== activeEventKey;
        const viewNeedsSync = Boolean(activeView && requestedView !== activeView);
        if (!eventNeedsSync && !viewNeedsSync) return;

        const nextParams = new URLSearchParams(location.search);
        nextParams.set("event", activeEventKey);
        if (activeView) nextParams.set("view", activeView);
        navigate(`/hackathon?${nextParams.toString()}`, { replace: true });
    }, [
        activeEventKey,
        activeView,
        location.search,
        navigate,
        requestedEventKey,
        requestedView,
        scheduleLoading,
    ]);

    useEffect(() => {
        const container = timelineScrollRef.current;
        const node = activeNodeRef.current;
        if (!container || !node) return;
        const targetLeft = node.offsetLeft - (container.clientWidth - node.offsetWidth) / 2;
        container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
    }, [activeEventKey]);

    useLayoutEffect(() => {
        const shell = shellRef.current;
        const panel = schedulePanelRef.current;
        if (!shell || !panel) return undefined;

        let animationFrame = 0;
        const measureScheduleClearance = () => {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = window.requestAnimationFrame(() => {
                const panelBottom = panel.getBoundingClientRect().bottom;
                shell.style.setProperty(
                    "--hackathon-schedule-clearance",
                    `${Math.ceil(panelBottom + 16)}px`
                );
            });
        };

        const resizeObserver =
            typeof ResizeObserver === "function"
                ? new ResizeObserver(measureScheduleClearance)
                : null;
        resizeObserver?.observe(panel);
        window.addEventListener("resize", measureScheduleClearance);
        window.visualViewport?.addEventListener?.("resize", measureScheduleClearance);
        measureScheduleClearance();

        return () => {
            window.cancelAnimationFrame(animationFrame);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", measureScheduleClearance);
            window.visualViewport?.removeEventListener?.("resize", measureScheduleClearance);
        };
    }, []);

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
                label: t("hackathon.tabs.results", "比赛结果"),
                shortLabel: t("hackathon.tabs.results_short", "结果"),
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

    const shellClass = isDayMode
        ? "border-emerald-200/80 bg-white/88 text-slate-900 shadow-[0_16px_42px_rgba(15,118,110,0.15)]"
        : "border-cyan-300/16 bg-[#061014]/88 text-white shadow-[0_0_36px_rgba(34,211,238,0.14)]";
    const mutedClass = isDayMode ? "text-slate-500" : "text-cyan-100/62";
    const selectedNodeClass = isDayMode
        ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-[0_8px_22px_rgba(16,185,129,0.16)]"
        : "border-cyan-300/70 bg-cyan-300/12 text-white shadow-[0_0_24px_rgba(103,232,249,0.15)]";
    const idleNodeClass = isDayMode
        ? "border-slate-200/80 bg-white/60 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/70"
        : "border-white/10 bg-white/[0.035] text-white/72 hover:border-cyan-300/45 hover:bg-cyan-300/8";
    const activeTabClass = isDayMode
        ? "border border-emerald-200/80 bg-emerald-50 text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.15)]"
        : "bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(103,232,249,0.3)]";
    const idleTabClass = isDayMode
        ? "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
        : "text-cyan-100/76 hover:bg-white/8 hover:text-white";
    const disabledTabClass = isDayMode
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
                        --hackathon-schedule-clearance: calc(env(safe-area-inset-top) + 16rem);
                    }
                    .hackathon-schedule-shell [data-registration-page] #hackathon-hero {
                        padding-top: var(--hackathon-schedule-clearance) !important;
                    }
                    .hackathon-schedule-shell [data-showcase-page] .showcase-gate-frame {
                        padding-top: var(--hackathon-schedule-clearance) !important;
                    }
                    @media (min-width: 640px) {
                        .hackathon-schedule-shell {
                            --hackathon-schedule-clearance: calc(env(safe-area-inset-top) + 16.5rem);
                        }
                    }
                    @media (min-width: 1024px) {
                        .hackathon-schedule-shell [data-registration-logo-panel] {
                            top: var(--hackathon-schedule-clearance) !important;
                        }
                    }
                `}
            </style>

            <div className="pointer-events-none fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+66px)] z-[45] sm:left-5 sm:right-5 sm:top-[calc(env(safe-area-inset-top)+72px)] min-[1720px]:left-7 min-[1720px]:right-7">
                <div
                    ref={schedulePanelRef}
                    data-hackathon-schedule-panel
                    className={`pointer-events-auto mx-auto max-w-[1480px] overflow-hidden rounded-[10px] border px-2 py-2 backdrop-blur-2xl sm:px-3 ${shellClass}`}
                    aria-label="比赛日程时间轴"
                >
                    <div className="flex items-center gap-2 px-1 pb-1.5">
                        <Trophy
                            className={`h-3.5 w-3.5 shrink-0 ${isDayMode ? "text-emerald-500" : "text-cyan-300"}`}
                        />
                        <span className="text-[11px] font-black uppercase tracking-[0.15em]">
                            比赛日程
                        </span>
                        <span className={`truncate text-[10px] font-semibold ${mutedClass}`}>
                            按时间选择赛事节点
                        </span>
                    </div>

                    <div
                        ref={timelineScrollRef}
                        className="hackathon-timeline-scroll overflow-x-auto pb-1"
                    >
                        <div className="relative flex min-w-full w-max items-stretch pt-1">
                            <div
                                className={`pointer-events-none absolute left-6 right-6 top-[11px] h-px ${
                                    isDayMode ? "bg-emerald-200" : "bg-cyan-300/30"
                                }`}
                            />
                            {schedule.events.map((item, index) => {
                                const selected = item.event.key === activeEventKey;
                                const summary = item.event.subtitle || item.event.description;
                                return (
                                    <button
                                        key={item.event.key}
                                        ref={selected ? activeNodeRef : null}
                                        type="button"
                                        onClick={() => switchEvent(item)}
                                        aria-current={selected ? "step" : undefined}
                                        className="group relative flex min-w-[184px] flex-1 flex-col items-stretch px-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 sm:min-w-[210px]"
                                    >
                                        <span
                                            className={`relative z-10 ml-3 h-[15px] w-[15px] rounded-full border-[3px] transition duration-200 ${
                                                selected
                                                    ? isDayMode
                                                        ? "border-emerald-500 bg-white shadow-[0_0_0_4px_rgba(16,185,129,0.16)]"
                                                        : "border-cyan-300 bg-[#061014] shadow-[0_0_0_4px_rgba(103,232,249,0.16)]"
                                                    : isDayMode
                                                      ? "border-emerald-200 bg-white group-hover:border-emerald-400"
                                                      : "border-cyan-300/35 bg-[#061014] group-hover:border-cyan-300/70"
                                            }`}
                                        />
                                        <span
                                            className={`mt-1.5 min-h-[51px] rounded-[7px] border px-2.5 py-1.5 transition duration-200 ${selected ? selectedNodeClass : idleNodeClass}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className="text-[10px] font-black tabular-nums opacity-65">
                                                    {String(index + 1).padStart(2, "0")} ·{" "}
                                                    {formatTimelineDate(item.event.startAt)}
                                                </span>
                                                {selected ? (
                                                    <span className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">
                                                        当前
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="mt-0.5 block truncate text-xs font-black">
                                                {item.event.title}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[10px] font-semibold opacity-60">
                                                {summary || "赛事详情待更新"}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div
                        className={`mt-1 flex items-center gap-1 border-t pt-1.5 ${
                            isDayMode ? "border-slate-200/70" : "border-white/8"
                        }`}
                        role="tablist"
                        aria-label={`${template.event.title}页面切换`}
                    >
                        <span
                            className={`hidden min-w-0 flex-1 truncate px-2 text-xs font-black sm:block ${mutedClass}`}
                        >
                            {template.event.title}
                        </span>
                        <div className="grid w-full grid-cols-2 gap-1 sm:w-[330px]">
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
                                        className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-[6px] px-3 text-xs font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/20 ${
                                            !view.available
                                                ? disabledTabClass
                                                : selected
                                                  ? activeTabClass
                                                  : idleTabClass
                                        }`}
                                        title={view.available ? view.label : `${view.label}已隐藏`}
                                    >
                                        {view.available ? (
                                            <Icon className="h-3.5 w-3.5" />
                                        ) : (
                                            <LockKeyhole className="h-3.5 w-3.5" />
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
                </div>
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
