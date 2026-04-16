import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutGrid,
  Music,
  Film,
  BookOpen,
  Calendar,
  Clock,
  Eye,
  TrendingUp,
  Inbox,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../services/api";
import { useSettings } from "../../context/SettingsContext";
import {
  AdminButton,
  AdminPageShell,
  AdminPanel,
  AdminLoadingState,
} from "./AdminUI";

const CARD_META = {
  indigo: {
    dayIcon: "bg-indigo-100 text-indigo-600",
    darkIcon: "bg-indigo-500/15 text-indigo-300",
    dayAccent: "from-indigo-500/20 to-transparent",
    darkAccent: "from-indigo-500/20 to-indigo-500/0",
  },
  pink: {
    dayIcon: "bg-[rgba(190,24,93,0.1)] text-rose-600",
    darkIcon: "bg-pink-500/15 text-pink-300",
    dayAccent: "from-[rgba(190,24,93,0.14)] to-transparent",
    darkAccent: "from-pink-500/20 to-pink-500/0",
  },
  red: {
    dayIcon: "bg-[rgba(225,29,72,0.1)] text-rose-600",
    darkIcon: "bg-red-500/15 text-red-300",
    dayAccent: "from-[rgba(225,29,72,0.14)] to-transparent",
    darkAccent: "from-red-500/20 to-red-500/0",
  },
  yellow: {
    dayIcon: "bg-[rgba(217,119,6,0.12)] text-amber-700",
    darkIcon: "bg-amber-500/15 text-amber-300",
    dayAccent: "from-[rgba(217,119,6,0.12)] to-transparent",
    darkAccent: "from-amber-500/20 to-amber-500/0",
  },
  green: {
    dayIcon: "bg-[rgba(5,150,105,0.1)] text-emerald-700",
    darkIcon: "bg-emerald-500/15 text-emerald-300",
    dayAccent: "from-[rgba(5,150,105,0.14)] to-transparent",
    darkAccent: "from-emerald-500/20 to-emerald-500/0",
  },
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  onClick,
  breakdown,
  isDayMode,
}) => {
  const meta = CARD_META[color] || CARD_META.indigo;

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[28px] border p-5 text-left transition-all ${
        isDayMode
          ? "border-slate-200/70 bg-white/88 shadow-[0_18px_38px_rgba(148,163,184,0.12)] hover:border-indigo-200/80 hover:shadow-[0_24px_48px_rgba(148,163,184,0.16)]"
          : "border-white/10 bg-[#111] hover:border-white/20 hover:bg-[#161616]"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${
          isDayMode ? meta.dayAccent : meta.darkAccent
        }`}
      />
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${
          isDayMode ? meta.dayIcon : meta.darkIcon
        }`}
      >
        <Icon size={20} />
      </div>
      <div className="relative mt-5 flex items-end justify-between gap-3">
        <div>
          <div
            className={`text-3xl font-bold ${
              isDayMode ? "text-slate-950" : "text-white"
            }`}
          >
            {value}
          </div>
          <div className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
            {title}
          </div>
        </div>
        <ArrowRight
          size={16}
          className={`transition-transform group-hover:translate-x-1 ${
            isDayMode ? "text-slate-400 group-hover:text-slate-950" : "text-gray-600 group-hover:text-white"
          }`}
        />
      </div>
      {breakdown ? (
        <div className="relative mt-4 flex flex-wrap gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-1 ${
              isDayMode
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-emerald-500/10 text-emerald-300"
            }`}
          >
            在库 {breakdown.active || 0}
          </span>
          <span
            className={`rounded-full px-2 py-1 ${
              isDayMode
                ? "bg-amber-500/10 text-amber-700"
                : "bg-amber-500/10 text-amber-300"
            }`}
          >
            待审 {breakdown.pending || 0}
          </span>
          <span
            className={`rounded-full px-2 py-1 ${
              isDayMode
                ? "bg-slate-500/8 text-slate-600"
                : "bg-slate-500/10 text-slate-300"
            }`}
          >
            回收站 {breakdown.deleted || 0}
          </span>
        </div>
      ) : null}
    </button>
  );
};

const CompactMetric = ({ label, value, icon: Icon, accent = "indigo", isDayMode }) => {
  const accentMap = {
    indigo: isDayMode
      ? "bg-indigo-100 text-indigo-600"
      : "bg-indigo-500/15 text-indigo-300",
    emerald: isDayMode
      ? "bg-emerald-500/10 text-emerald-700"
      : "bg-emerald-500/15 text-emerald-300",
    violet: isDayMode
      ? "bg-violet-500/10 text-violet-700"
      : "bg-violet-500/15 text-violet-300",
    amber: isDayMode
      ? "bg-amber-500/12 text-amber-700"
      : "bg-amber-500/15 text-amber-300",
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDayMode
          ? "border-slate-200/70 bg-white/72"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs uppercase tracking-[0.22em] ${isDayMode ? "text-slate-400" : "text-gray-500"}`}>
          {label}
        </p>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            accentMap[accent] || accentMap.indigo
          }`}
        >
          <Icon size={16} />
        </div>
      </div>
      <p
        className={`mt-3 text-2xl font-bold ${
          isDayMode ? "text-slate-950" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
};

const Overview = ({ onChangeTab }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const [stats, setStats] = useState({
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
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await api.get("/stats");
      setStats(response.data || stats);
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
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  const formatNumber = (value) =>
    new Intl.NumberFormat("zh-CN").format(Number(value || 0));

  const resourceCards = useMemo(
    () => [
      {
        title: t("admin.tabs.photos", "图片"),
        value: stats.counts.photos,
        breakdown: stats.breakdown?.photos,
        icon: LayoutGrid,
        color: "indigo",
        tab: "photos",
      },
      {
        title: t("admin.tabs.music", "音频"),
        value: stats.counts.music,
        breakdown: stats.breakdown?.music,
        icon: Music,
        color: "pink",
        tab: "music",
      },
      {
        title: t("admin.tabs.videos", "视频"),
        value: stats.counts.videos,
        breakdown: stats.breakdown?.videos,
        icon: Film,
        color: "red",
        tab: "videos",
      },
      {
        title: t("admin.tabs.articles", "文章"),
        value: stats.counts.articles,
        breakdown: stats.breakdown?.articles,
        icon: BookOpen,
        color: "yellow",
        tab: "articles",
      },
      {
        title: t("admin.tabs.events", "活动"),
        value: stats.counts.events,
        breakdown: stats.breakdown?.events,
        icon: Calendar,
        color: "green",
        tab: "events",
      },
    ],
    [stats, t],
  );

  const pendingTotal = Object.values(stats.breakdown || {}).reduce(
    (sum, value) => sum + Number(value?.pending || 0),
    0,
  );

  if (loading) {
    return (
      <AdminLoadingState
        text={t("admin.overview_ui.loading_stats", "正在加载统计数据...")}
      />
    );
  }

  return (
    <AdminPageShell
      title="总览"
      description="这里汇总后台最核心的数据和待办入口。优先处理审核任务，再进入各模块做内容维护。"
      actions={
        <>
          <AdminButton tone="subtle" onClick={fetchStats}>
            刷新数据
          </AdminButton>
          <AdminButton tone="primary" onClick={() => onChangeTab("pending")}>
            <Inbox size={16} />
            进入审核中心
          </AdminButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-5">
        {resourceCards.map((card) => (
          <StatCard
            key={card.tab}
            title={card.title}
            value={card.value}
            breakdown={card.breakdown}
            icon={card.icon}
            color={card.color}
            onClick={() => onChangeTab(card.tab)}
            isDayMode={isDayMode}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_1fr]">
        <AdminPanel
          title="运营快照"
          description="把今天最值得处理的工作集中在一个区域里。"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <CompactMetric
              label="待审核内容"
              value={formatNumber(pendingTotal)}
              icon={Inbox}
              accent="amber"
              isDayMode={isDayMode}
            />
            <CompactMetric
              label="活动近 7 日访问"
              value={formatNumber(stats.eventAnalytics?.views7d)}
              icon={TrendingUp}
              accent="violet"
              isDayMode={isDayMode}
            />
            <CompactMetric
              label="活动总报名"
              value={formatNumber(stats.eventAnalytics?.totalRegistrations)}
              icon={MessageSquare}
              accent="emerald"
              isDayMode={isDayMode}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              onClick={() => onChangeTab("pending")}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                isDayMode
                  ? "border-slate-200/70 bg-white/78 hover:bg-white"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div
                className={`text-sm font-semibold ${
                  isDayMode ? "text-slate-950" : "text-white"
                }`}
              >
                处理待审核内容
              </div>
              <div className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                批量处理图片、视频、音频、文章和活动的审核状态。
              </div>
            </button>
            <button
              onClick={() => onChangeTab("community")}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                isDayMode
                  ? "border-slate-200/70 bg-white/78 hover:bg-white"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div
                className={`text-sm font-semibold ${
                  isDayMode ? "text-slate-950" : "text-white"
                }`}
              >
                查看社区运营
              </div>
              <div className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                查看帖子总量、社群入口和已发布内容的运营情况。
              </div>
            </button>
          </div>
        </AdminPanel>

        <AdminPanel title="系统状态" description="确认后台服务和核心环境是否正常。">
          <div className="space-y-3">
            {[
              {
                label: "Node 版本",
                value: stats.system.nodeVersion,
              },
              {
                label: "运行平台",
                value: stats.system.platform,
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between ${
                  isDayMode ? "bg-white/78" : "bg-white/5"
                }`}
              >
                <span className={isDayMode ? "text-slate-500" : "text-gray-400"}>
                  {item.label}
                </span>
                <span
                  className={`font-mono ${
                    isDayMode ? "text-slate-950 capitalize" : "text-white capitalize"
                  }`}
                >
                  {item.value}
                </span>
              </div>
            ))}

            <div
              className={`flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between ${
                  isDayMode ? "bg-white/78" : "bg-white/5"
              }`}
            >
              <span className={isDayMode ? "text-slate-500" : "text-gray-400"}>
                运行时长
              </span>
              <div className={`flex items-center gap-2 font-mono ${isDayMode ? "text-emerald-700" : "text-emerald-300"}`}>
                <Clock size={14} />
                {formatUptime(stats.system.uptime)}
              </div>
            </div>

            <div
              className={`flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between ${
                isDayMode ? "bg-white/78" : "bg-white/5"
              }`}
            >
              <span className={isDayMode ? "text-slate-500" : "text-gray-400"}>
                活动总访问
              </span>
              <div className={`flex items-center gap-2 font-mono ${isDayMode ? "text-indigo-600" : "text-indigo-300"}`}>
                <Eye size={14} />
                {formatNumber(stats.eventAnalytics?.totalViews)}
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel
        title="活动数据概览"
        description="保留活动模块最常用的运营数据，便于从总览页直接判断近期活动热度。"
        action={
          <AdminButton tone="subtle" onClick={() => onChangeTab("events")}>
            进入活动管理
          </AdminButton>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CompactMetric
            label="累计访问"
            value={formatNumber(stats.eventAnalytics?.totalViews)}
            icon={Eye}
            accent="indigo"
            isDayMode={isDayMode}
          />
          <CompactMetric
            label="累计报名"
            value={formatNumber(stats.eventAnalytics?.totalRegistrations)}
            icon={MessageSquare}
            accent="emerald"
            isDayMode={isDayMode}
          />
          <CompactMetric
            label="近 7 日访问"
            value={formatNumber(stats.eventAnalytics?.views7d)}
            icon={TrendingUp}
            accent="violet"
            isDayMode={isDayMode}
          />
          <CompactMetric
            label="待开始活动"
            value={formatNumber(stats.eventAnalytics?.upcomingCount)}
            icon={Calendar}
            accent="amber"
            isDayMode={isDayMode}
          />
        </div>

        <div className="mt-6 space-y-3">
          {(stats.eventAnalytics?.hottestEvents || []).length === 0 ? (
            <div
              className={`rounded-2xl border p-4 text-sm ${
                isDayMode
                  ? "border-slate-200/70 bg-white/78 text-slate-500"
                  : "border-white/10 bg-white/5 text-gray-400"
              }`}
            >
              暂无活动统计数据。
            </div>
          ) : (
            stats.eventAnalytics.hottestEvents.map((event) => (
              <div
                key={event.id}
                className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 md:flex-row md:items-center md:justify-between ${
                  isDayMode
                    ? "border-slate-200/70 bg-white/78"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="min-w-0">
                  <p className={`truncate font-semibold ${isDayMode ? "text-slate-950" : "text-white"}`}>
                    {event.title}
                  </p>
                  <p className={`mt-1 text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>
                    {event.date || "未设置活动时间"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className={isDayMode ? "text-indigo-600" : "text-indigo-300"}>
                    {formatNumber(event.views)} 访问
                  </span>
                  <span className={isDayMode ? "text-emerald-700" : "text-emerald-300"}>
                    {formatNumber(event.registrations)} 报名
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </AdminPanel>

      <AdminPanel
        className={
          isDayMode
            ? "bg-[linear-gradient(135deg,rgba(99,102,241,0.08),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))]"
            : "bg-gradient-to-br from-indigo-900/20 via-[#111] to-violet-900/20"
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3
              className={`text-2xl font-bold ${
                isDayMode ? "text-slate-950" : "text-white"
              }`}
              style={isDayMode ? { fontFamily: "var(--theme-font-display)" } : undefined}
            >
              今天先做什么
            </h3>
            <p className={`mt-2 max-w-2xl text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
              建议先处理审核中心，再检查活动数据，最后看用户与留言。这样能最快把对外可见的问题压下去。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminButton tone="primary" onClick={() => onChangeTab("pending")}>
              审核中心
            </AdminButton>
            <AdminButton tone="subtle" onClick={() => onChangeTab("messages")}>
              查看留言
            </AdminButton>
            <AdminButton tone="subtle" onClick={() => onChangeTab("users")}>
              管理用户
            </AdminButton>
          </div>
        </div>
      </AdminPanel>
    </AdminPageShell>
  );
};

export default Overview;
