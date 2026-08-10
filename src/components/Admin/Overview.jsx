import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Calendar, Film, Inbox, LayoutGrid, Music, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import api from "../../services/api";
import {
    AdminButton,
    AdminLoadingState,
    AdminPageShell,
    AdminPanel,
    useAdminTheme,
} from "./AdminUI";

const DEFAULT_STATS = {
    counts: { photos: 0, music: 0, videos: 0, articles: 0, events: 0 },
    breakdown: {},
    eventAnalytics: {
        totalViews: 0,
        totalRegistrations: 0,
        upcomingCount: 0,
        views7d: 0,
        registrations7d: 0,
        hottestEvents: [],
    },
    system: { uptime: 0, nodeVersion: "", platform: "" },
};

const Overview = ({ onChangeTab }) => {
    const { t, i18n } = useTranslation();
    const { isDayMode, headingTextClass, mutedTextClass } = useAdminTheme();
    const [stats, setStats] = useState(DEFAULT_STATS);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const response = await api.get("/stats");
            const data = response.data || {};
            setStats({
                ...DEFAULT_STATS,
                ...data,
                counts: { ...DEFAULT_STATS.counts, ...(data.counts || {}) },
                breakdown: data.breakdown || {},
                eventAnalytics: {
                    ...DEFAULT_STATS.eventAnalytics,
                    ...(data.eventAnalytics || {}),
                },
                system: { ...DEFAULT_STATS.system, ...(data.system || {}) },
            });
        } catch (error) {
            const errorMessage =
                error.response?.status === 403
                    ? t("admin.overview_ui.no_permission", "没有权限访问")
                    : error.response?.status === 401
                      ? t("admin.overview_ui.not_logged_in", "请先登录")
                      : t("admin.overview_ui.load_fail", "获取统计数据失败");
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const numberFormatter = useMemo(
        () => new Intl.NumberFormat(i18n.resolvedLanguage || i18n.language || "zh-CN"),
        [i18n.language, i18n.resolvedLanguage]
    );
    const formatNumber = (value) => numberFormatter.format(Number(value || 0));
    const pendingTotal = useMemo(
        () =>
            Object.values(stats.breakdown || {}).reduce(
                (sum, value) => sum + Number(value?.pending || 0),
                0
            ),
        [stats.breakdown]
    );
    const assetTotal = useMemo(
        () => Object.values(stats.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0),
        [stats.counts]
    );
    const hotEvents = stats.eventAnalytics?.hottestEvents || [];

    const resources = useMemo(
        () => [
            { id: "articles", label: t("admin.tabs.articles", "文章"), icon: BookOpen },
            { id: "photos", label: t("admin.tabs.photos", "图片"), icon: LayoutGrid },
            { id: "videos", label: t("admin.tabs.videos", "视频"), icon: Film },
            { id: "music", label: t("admin.tabs.music", "音频"), icon: Music },
            { id: "events", label: t("admin.tabs.events", "活动"), icon: Calendar },
        ],
        [t]
    );

    if (loading) {
        return (
            <AdminLoadingState text={t("admin.overview_ui.loading_stats", "正在加载统计数据...")} />
        );
    }

    const statusItems = [
        [t("admin.overview_ui.pending", "待审核"), formatNumber(pendingTotal), "pending"],
        [
            t("admin.overview_ui.upcoming", "待开始活动"),
            formatNumber(stats.eventAnalytics?.upcomingCount),
            "events",
        ],
        [
            t("admin.overview_ui.views_7d", "近 7 日访问"),
            formatNumber(stats.eventAnalytics?.views7d),
            "events",
        ],
        [
            t("admin.overview_ui.registrations_7d", "近 7 日报名"),
            formatNumber(stats.eventAnalytics?.registrations7d),
            "events",
        ],
        [t("admin.overview_ui.assets", "内容总量"), formatNumber(assetTotal), "articles"],
    ];

    const priorityRows = [
        {
            title: t("admin.domains.content", "内容与审核"),
            signal:
                pendingTotal > 0
                    ? t("admin.overview_ui.pending_count", {
                          count: pendingTotal,
                          defaultValue: `${pendingTotal} 条待审核`,
                      })
                    : t("admin.overview_ui.queue_clear", "审核队列已清空"),
            tab: pendingTotal > 0 ? "pending" : "wechat-mp",
            action:
                pendingTotal > 0
                    ? t("admin.overview_ui.review_now", "去审核")
                    : t("admin.overview_ui.manage_sources", "管理采集源"),
        },
        {
            title: t("admin.overview_ui.collection", "内容采集"),
            signal: t("admin.overview_ui.collection_signal", "学院、社团等公众号通知入口"),
            tab: "wechat-mp",
            action: t("admin.overview_ui.open_collection", "进入采集"),
        },
        {
            title: t("admin.domains.subjects", "主体与关系"),
            signal: t("admin.overview_ui.subjects_signal", "账号、组织、合作方与历史归属"),
            tab: "users",
            action: t("admin.overview_ui.open_subjects", "查看主体"),
        },
        {
            title: t("admin.domains.projects", "生态项目运营"),
            signal: t("admin.overview_ui.projects_signal", "浙客松与产学项目"),
            tab: "projects",
            action: t("admin.overview_ui.open_projects", "进入项目"),
        },
        {
            title: t("admin.domains.ai", "AI 能力治理"),
            signal: t("admin.overview_ui.ai_signal", "活动元数据治理与模型状态"),
            tab: "intelligence",
            action: t("admin.overview_ui.open_ai", "查看能力"),
        },
    ];

    return (
        <AdminPageShell
            title={t("admin.domains.overview", "运营总览")}
            actions={
                <>
                    <AdminButton tone="subtle" onClick={fetchStats}>
                        <RefreshCw size={16} />
                        {t("admin.overview_ui.refresh", "刷新")}
                    </AdminButton>
                    <AdminButton tone="primary" onClick={() => onChangeTab("wechat-mp")}>
                        {t("admin.overview_ui.content_collection", "内容采集")}
                    </AdminButton>
                </>
            }
        >
            <AdminPanel>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    {statusItems.map(([label, value, tab]) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => onChangeTab(tab)}
                            className="flex items-baseline gap-2 text-left"
                        >
                            <span className={mutedTextClass}>{label}</span>
                            <span className={`text-lg font-bold tabular-nums ${headingTextClass}`}>
                                {value}
                            </span>
                        </button>
                    ))}
                </div>
            </AdminPanel>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
                <AdminPanel title={t("admin.overview_ui.priority", "当前工作")}>
                    <div className="divide-y divide-[rgba(128,146,167,0.14)]">
                        {priorityRows.map((row) => (
                            <button
                                key={row.title}
                                type="button"
                                onClick={() => onChangeTab(row.tab)}
                                className="flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0"
                            >
                                <span
                                    className={`min-w-0 flex-1 text-sm font-bold ${headingTextClass}`}
                                >
                                    {row.title}
                                </span>
                                <span
                                    className={`hidden min-w-0 flex-[1.4] truncate text-xs sm:block ${mutedTextClass}`}
                                >
                                    {row.signal}
                                </span>
                                <span className="shrink-0 text-xs font-semibold text-indigo-500">
                                    {row.action}
                                </span>
                            </button>
                        ))}
                    </div>
                </AdminPanel>

                <AdminPanel title={t("admin.overview_ui.inventory", "内容状态")}>
                    <div className="grid grid-cols-[minmax(0,1fr)_64px_64px_64px] gap-2 border-b border-[rgba(128,146,167,0.14)] pb-2 text-xs">
                        <span className={mutedTextClass}>
                            {t("admin.overview_ui.type", "类型")}
                        </span>
                        <span className={`text-right ${mutedTextClass}`}>
                            {t("admin.overview_ui.total", "总量")}
                        </span>
                        <span className={`text-right ${mutedTextClass}`}>
                            {t("admin.overview_ui.pending_short", "待审")}
                        </span>
                        <span className={`text-right ${mutedTextClass}`}>
                            {t("admin.overview_ui.deleted", "回收")}
                        </span>
                    </div>
                    <div className="divide-y divide-[rgba(128,146,167,0.14)]">
                        {resources.map((resource) => {
                            const Icon = resource.icon;
                            const breakdown = stats.breakdown?.[resource.id] || {};
                            return (
                                <button
                                    key={resource.id}
                                    type="button"
                                    onClick={() => onChangeTab(resource.id)}
                                    className="grid w-full grid-cols-[minmax(0,1fr)_64px_64px_64px] items-center gap-2 py-2.5 text-sm"
                                >
                                    <span
                                        className={`flex min-w-0 items-center gap-2 font-semibold ${headingTextClass}`}
                                    >
                                        <Icon size={15} />
                                        <span className="truncate">{resource.label}</span>
                                    </span>
                                    <span className={`text-right tabular-nums ${headingTextClass}`}>
                                        {formatNumber(stats.counts?.[resource.id])}
                                    </span>
                                    <span className="text-right tabular-nums text-amber-500">
                                        {formatNumber(breakdown.pending)}
                                    </span>
                                    <span className={`text-right tabular-nums ${mutedTextClass}`}>
                                        {formatNumber(breakdown.deleted)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </AdminPanel>
            </div>

            <AdminPanel
                title={t("admin.overview_ui.activity_status", "活动运营")}
                action={
                    <AdminButton tone="subtle" onClick={() => onChangeTab("events")}>
                        {t("admin.overview_ui.open_events", "进入活动")}
                    </AdminButton>
                }
            >
                {hotEvents.length > 0 ? (
                    <div className="divide-y divide-[rgba(128,146,167,0.14)]">
                        {hotEvents.slice(0, 3).map((event) => (
                            <button
                                key={event.id}
                                type="button"
                                onClick={() => onChangeTab("events")}
                                className="grid w-full gap-1 py-2.5 text-left sm:grid-cols-[minmax(0,1fr)_160px_100px_100px] sm:items-center"
                            >
                                <span
                                    className={`truncate text-sm font-semibold ${headingTextClass}`}
                                >
                                    {event.title}
                                </span>
                                <span className={`text-xs ${mutedTextClass}`}>
                                    {event.date || t("admin.overview_ui.no_date", "未设置时间")}
                                </span>
                                <span className={`text-xs tabular-nums ${mutedTextClass}`}>
                                    {formatNumber(event.views)}{" "}
                                    {t("admin.overview_ui.views", "访问")}
                                </span>
                                <span className={`text-xs tabular-nums ${mutedTextClass}`}>
                                    {formatNumber(event.registrations)}{" "}
                                    {t("admin.overview_ui.registrations", "报名")}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className={`text-sm ${mutedTextClass}`}>
                        {t("admin.overview_ui.no_activity_data", "暂无活动热度数据")}
                    </div>
                )}
            </AdminPanel>

            <details
                className={`rect-surface border px-4 py-3 text-sm ${
                    isDayMode ? "theme-admin-panel" : "border-white/10 bg-white/[0.035]"
                }`}
            >
                <summary className={`cursor-pointer font-semibold ${headingTextClass}`}>
                    {t("admin.overview_ui.runtime_details", "系统运行信息")}
                </summary>
                <div className={`mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs ${mutedTextClass}`}>
                    <span>Node {stats.system.nodeVersion || "-"}</span>
                    <span>{stats.system.platform || "-"}</span>
                    <span>
                        {t("admin.overview_ui.uptime_seconds", {
                            count: Number(stats.system.uptime || 0),
                            defaultValue: `${Number(stats.system.uptime || 0)} 秒`,
                        })}
                    </span>
                </div>
            </details>
        </AdminPageShell>
    );
};

export default Overview;
