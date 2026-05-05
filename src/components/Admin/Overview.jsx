import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Bot,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../services/api";
import { useSettings } from "../../context/SettingsContext";
import {
  AdminButton,
  AdminInlineNote,
  AdminPageShell,
  AdminPanel,
  AdminLoadingState,
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

const toneMeta = {
  indigo: {
    icon: {
      day: "bg-indigo-50 text-indigo-600",
      dark: "bg-indigo-500/10 text-indigo-300",
    },
    text: { day: "text-indigo-600", dark: "text-indigo-300" },
  },
  rose: {
    icon: {
      day: "bg-rose-50 text-rose-600",
      dark: "bg-rose-500/10 text-rose-300",
    },
    text: { day: "text-rose-600", dark: "text-rose-300" },
  },
  amber: {
    icon: {
      day: "bg-amber-50 text-amber-700",
      dark: "bg-amber-500/10 text-amber-300",
    },
    text: { day: "text-amber-700", dark: "text-amber-300" },
  },
  emerald: {
    icon: {
      day: "bg-emerald-50 text-emerald-700",
      dark: "bg-emerald-500/10 text-emerald-300",
    },
    text: { day: "text-emerald-700", dark: "text-emerald-300" },
  },
  sky: {
    icon: {
      day: "bg-sky-50 text-sky-700",
      dark: "bg-sky-500/10 text-sky-300",
    },
    text: { day: "text-sky-700", dark: "text-sky-300" },
  },
};

const getTone = (tone = "indigo") => toneMeta[tone] || toneMeta.indigo;

const StatCard = ({
  title,
  value,
  icon: Icon,
  tone,
  onClick,
  breakdown,
  isDayMode,
  formatNumber,
}) => {
  const meta = getTone(tone);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border p-4 text-left transition-colors ${
        isDayMode
          ? "border-slate-200/70 bg-white/[0.84] hover:border-slate-300 hover:bg-white"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isDayMode ? meta.icon.day : meta.icon.dark
          }`}
        >
          <Icon size={18} />
        </div>
        <ArrowRight
          size={16}
          className={`mt-2 transition-transform group-hover:translate-x-0.5 ${
            isDayMode ? "text-slate-300" : "text-gray-600"
          }`}
        />
      </div>
      <div
        className={`mt-4 text-2xl font-bold tabular-nums ${
          isDayMode ? "text-slate-950" : "text-white"
        }`}
      >
        {formatNumber(value)}
      </div>
      <div
        className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
      >
        {title}
      </div>
      {breakdown ? (
        <div
          className={`mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs ${
            isDayMode ? "border-slate-200/70" : "border-white/10"
          }`}
        >
          <span className={isDayMode ? "text-slate-500" : "text-gray-500"}>
            在库 {formatNumber(breakdown.active)}
          </span>
          <span className={isDayMode ? meta.text.day : meta.text.dark}>
            待审 {formatNumber(breakdown.pending)}
          </span>
          <span className={isDayMode ? "text-slate-400" : "text-gray-500"}>
            回收 {formatNumber(breakdown.deleted)}
          </span>
        </div>
      ) : null}
    </button>
  );
};

const MetricItem = ({ label, value, icon: Icon, tone, isDayMode }) => {
  const meta = getTone(tone);

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isDayMode ? meta.icon.day : meta.icon.dark
        }`}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div
          className={`text-lg font-bold tabular-nums ${
            isDayMode ? "text-slate-950" : "text-white"
          }`}
        >
          {value}
        </div>
        <div
          className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
        >
          {label}
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({
  label,
  description,
  icon: Icon,
  tone,
  isDayMode,
  onClick,
}) => {
  const meta = getTone(tone);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[92px] items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
        isDayMode
          ? "border-slate-200/70 bg-white/[0.82] hover:border-slate-300 hover:bg-white"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isDayMode ? meta.icon.day : meta.icon.dark
        }`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div
          className={`font-semibold ${isDayMode ? "text-slate-950" : "text-white"}`}
        >
          {label}
        </div>
        <div
          className={`mt-1 line-clamp-2 text-sm ${
            isDayMode ? "text-slate-500" : "text-gray-400"
          }`}
        >
          {description}
        </div>
      </div>
    </button>
  );
};

const SystemRow = ({ label, value, isDayMode, icon: Icon }) => (
  <div
    className={`flex items-center justify-between gap-3 border-b py-3 last:border-b-0 ${
      isDayMode ? "border-slate-200/70" : "border-white/10"
    }`}
  >
    <span className={isDayMode ? "text-slate-500" : "text-gray-400"}>
      {label}
    </span>
    <span
      className={`flex items-center gap-2 text-right font-mono text-sm ${
        isDayMode ? "text-slate-950" : "text-white"
      }`}
    >
      {Icon ? <Icon size={14} /> : null}
      {value || "-"}
    </span>
  </div>
);

const Overview = ({ onChangeTab }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
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

  const formatUptime = (seconds) => {
    const totalSeconds = Number(seconds || 0);
    if (totalSeconds <= 0) return "刚刚启动";
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  };

  const formatNumber = (value) =>
    new Intl.NumberFormat("zh-CN").format(Number(value || 0));

  const resourceCards = useMemo(
    () => [
      {
        title: t("admin.tabs.articles", "文章"),
        value: stats.counts.articles,
        breakdown: stats.breakdown?.articles,
        icon: BookOpen,
        tone: "amber",
        tab: "articles",
      },
      {
        title: t("admin.tabs.photos", "图片"),
        value: stats.counts.photos,
        breakdown: stats.breakdown?.photos,
        icon: LayoutGrid,
        tone: "indigo",
        tab: "photos",
      },
      {
        title: t("admin.tabs.videos", "视频"),
        value: stats.counts.videos,
        breakdown: stats.breakdown?.videos,
        icon: Film,
        tone: "rose",
        tab: "videos",
      },
      {
        title: t("admin.tabs.music", "音频"),
        value: stats.counts.music,
        breakdown: stats.breakdown?.music,
        icon: Music,
        tone: "sky",
        tab: "music",
      },
      {
        title: t("admin.tabs.events", "活动"),
        value: stats.counts.events,
        breakdown: stats.breakdown?.events,
        icon: Calendar,
        tone: "emerald",
        tab: "events",
      },
    ],
    [stats, t],
  );

  const pendingTotal = useMemo(
    () =>
      Object.values(stats.breakdown || {}).reduce(
        (sum, value) => sum + Number(value?.pending || 0),
        0,
      ),
    [stats.breakdown],
  );
  const hotEvents = stats.eventAnalytics?.hottestEvents || [];
  const topEvent = hotEvents[0];

  if (loading) {
    return (
      <AdminLoadingState
        text={t("admin.overview_ui.loading_stats", "正在加载统计数据...")}
      />
    );
  }

  return (
    <AdminPageShell
      title={t("admin.tabs.overview", "总览")}
      description="后台首页只保留最关键的运营判断：先处理待办，再看活动和内容状态。"
      actions={
        <>
          <AdminButton tone="subtle" onClick={fetchStats}>
            刷新数据
          </AdminButton>
          <AdminButton tone="primary" onClick={() => onChangeTab("pending")}>
            <Inbox size={16} />
            审核中心
          </AdminButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <AdminPanel title="今日待办" description="管理员进入后台后，先看这里。">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div
                className={`text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
              >
                当前待审核内容
              </div>
              <div
                className={`mt-2 text-4xl font-bold tabular-nums ${
                  isDayMode ? "text-slate-950" : "text-white"
                }`}
              >
                {formatNumber(pendingTotal)}
              </div>
              <p
                className={`mt-2 max-w-xl text-sm ${
                  isDayMode ? "text-slate-500" : "text-gray-400"
                }`}
              >
                {pendingTotal > 0
                  ? "建议优先处理审核队列，避免前台内容更新被卡住。"
                  : "审核队列已清空，可以转向活动运营和内容维护。"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminButton tone="primary" onClick={() => onChangeTab("pending")}>
                去审核
              </AdminButton>
              <AdminButton tone="subtle" onClick={() => onChangeTab("ai-models")}>
                AI 助手
              </AdminButton>
            </div>
          </div>

          <div
            className={`mt-5 grid gap-4 border-t pt-5 md:grid-cols-3 ${
              isDayMode ? "border-slate-200/70" : "border-white/10"
            }`}
          >
            <MetricItem
              label="近 7 日活动访问"
              value={formatNumber(stats.eventAnalytics?.views7d)}
              icon={TrendingUp}
              tone="indigo"
              isDayMode={isDayMode}
            />
            <MetricItem
              label="近 7 日报名"
              value={formatNumber(stats.eventAnalytics?.registrations7d)}
              icon={MessageSquare}
              tone="emerald"
              isDayMode={isDayMode}
            />
            <MetricItem
              label="待开始活动"
              value={formatNumber(stats.eventAnalytics?.upcomingCount)}
              icon={Calendar}
              tone="amber"
              isDayMode={isDayMode}
            />
          </div>
        </AdminPanel>

        <AdminPanel title="快捷入口" description="按运营场景进入，不按技术模块找。">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <QuickAction
              label="AI 助手"
              description="归类、推荐、解析和模型 Key 管理。"
              icon={Bot}
              tone="indigo"
              isDayMode={isDayMode}
              onClick={() => onChangeTab("ai-models")}
            />
            <QuickAction
              label="活动运营"
              description="维护活动信息，跟进报名与热度。"
              icon={Calendar}
              tone="emerald"
              isDayMode={isDayMode}
              onClick={() => onChangeTab("events")}
            />
            <QuickAction
              label="内容审核"
              description="集中处理内容发布前的审核状态。"
              icon={Inbox}
              tone="amber"
              isDayMode={isDayMode}
              onClick={() => onChangeTab("pending")}
            />
            <QuickAction
              label="社区反馈"
              description="查看社区动态和站内留言。"
              icon={MessageSquare}
              tone="sky"
              isDayMode={isDayMode}
              onClick={() => onChangeTab("community")}
            />
          </div>
        </AdminPanel>
      </div>

      <AdminPanel
        title="内容资产"
        description="文章、图片、视频、音频和活动都放在这里看总量与待审状态。"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-5">
          {resourceCards.map((card) => (
            <StatCard
              key={card.tab}
              title={card.title}
              value={card.value}
              breakdown={card.breakdown}
              icon={card.icon}
              tone={card.tone}
              onClick={() => onChangeTab(card.tab)}
              isDayMode={isDayMode}
              formatNumber={formatNumber}
            />
          ))}
        </div>
      </AdminPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <AdminPanel
          title="活动运营"
          description="用访问、报名和热门活动判断接下来要推什么。"
          action={
            <AdminButton tone="subtle" onClick={() => onChangeTab("events")}>
              进入活动管理
            </AdminButton>
          }
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricItem
              label="累计访问"
              value={formatNumber(stats.eventAnalytics?.totalViews)}
              icon={Eye}
              tone="indigo"
              isDayMode={isDayMode}
            />
            <MetricItem
              label="累计报名"
              value={formatNumber(stats.eventAnalytics?.totalRegistrations)}
              icon={MessageSquare}
              tone="emerald"
              isDayMode={isDayMode}
            />
            <MetricItem
              label="近 7 日访问"
              value={formatNumber(stats.eventAnalytics?.views7d)}
              icon={TrendingUp}
              tone="sky"
              isDayMode={isDayMode}
            />
            <MetricItem
              label="待开始"
              value={formatNumber(stats.eventAnalytics?.upcomingCount)}
              icon={Calendar}
              tone="amber"
              isDayMode={isDayMode}
            />
          </div>

          <div
            className={`mt-5 border-t pt-4 ${
              isDayMode ? "border-slate-200/70" : "border-white/10"
            }`}
          >
            {topEvent ? (
              <div className="space-y-3">
                <div
                  className={`text-sm font-semibold ${
                    isDayMode ? "text-slate-950" : "text-white"
                  }`}
                >
                  当前最热活动
                </div>
                {hotEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onChangeTab("events")}
                    className={`flex w-full flex-col gap-2 rounded-xl px-3 py-3 text-left transition-colors md:flex-row md:items-center md:justify-between ${
                      isDayMode
                        ? "bg-slate-50 hover:bg-white"
                        : "bg-white/[0.04] hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div
                        className={`truncate text-sm font-semibold ${
                          isDayMode ? "text-slate-950" : "text-white"
                        }`}
                      >
                        {event.title}
                      </div>
                      <div
                        className={`mt-1 text-xs ${
                          isDayMode ? "text-slate-500" : "text-gray-500"
                        }`}
                      >
                        {event.date || "未设置活动时间"}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-4 text-xs">
                      <span className={isDayMode ? "text-indigo-600" : "text-indigo-300"}>
                        {formatNumber(event.views)} 访问
                      </span>
                      <span className={isDayMode ? "text-emerald-700" : "text-emerald-300"}>
                        {formatNumber(event.registrations)} 报名
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <AdminInlineNote>暂无活动热度数据，可先进入活动管理检查活动信息。</AdminInlineNote>
            )}
          </div>
        </AdminPanel>

        <AdminPanel title="系统状态" description="只保留排查后台时真正需要的信息。">
          <SystemRow
            label="Node 版本"
            value={stats.system.nodeVersion}
            isDayMode={isDayMode}
          />
          <SystemRow
            label="运行平台"
            value={stats.system.platform}
            isDayMode={isDayMode}
          />
          <SystemRow
            label="运行时长"
            value={formatUptime(stats.system.uptime)}
            icon={Clock}
            isDayMode={isDayMode}
          />
        </AdminPanel>
      </div>
    </AdminPageShell>
  );
};

export default Overview;
