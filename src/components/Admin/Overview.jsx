import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutGrid,
  Music,
  Film,
  BookOpen,
  Calendar,
  Activity,
  Clock,
  Eye,
  TrendingUp,
  Inbox,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import {
  AdminButton,
  AdminPageShell,
  AdminPanel,
  AdminLoadingState,
} from "./AdminUI";

const CARD_META = {
  indigo: {
    iconWrap: "bg-indigo-500/15 text-indigo-300",
    accent: "from-indigo-500/20 to-indigo-500/0",
  },
  pink: {
    iconWrap: "bg-pink-500/15 text-pink-300",
    accent: "from-pink-500/20 to-pink-500/0",
  },
  red: {
    iconWrap: "bg-red-500/15 text-red-300",
    accent: "from-red-500/20 to-red-500/0",
  },
  yellow: {
    iconWrap: "bg-amber-500/15 text-amber-300",
    accent: "from-amber-500/20 to-amber-500/0",
  },
  green: {
    iconWrap: "bg-emerald-500/15 text-emerald-300",
    accent: "from-emerald-500/20 to-emerald-500/0",
  },
};

const StatCard = ({ title, value, icon: Icon, color, onClick, breakdown }) => {
  const meta = CARD_META[color] || CARD_META.indigo;

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#111] p-5 text-left transition-all hover:border-white/20 hover:bg-[#161616]"
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${meta.accent}`}
      />
      <div
        className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${meta.iconWrap}`}
      >
        <Icon size={20} />
      </div>
      <div className="relative mt-5 flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-bold text-white">{value}</div>
          <div className="mt-1 text-sm text-gray-400">{title}</div>
        </div>
        <ArrowRight
          size={16}
          className="text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-white"
        />
      </div>
      {breakdown ? (
        <div className="relative mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300">
            在库 {breakdown.active || 0}
          </span>
          <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-300">
            待审 {breakdown.pending || 0}
          </span>
          <span className="rounded-full bg-slate-500/10 px-2 py-1 text-slate-300">
            回收站 {breakdown.deleted || 0}
          </span>
        </div>
      ) : null}
    </button>
  );
};

const CompactMetric = ({ label, value, icon: Icon, accent = "indigo" }) => {
  const accentMap = {
    indigo: "bg-indigo-500/15 text-indigo-300",
    emerald: "bg-emerald-500/15 text-emerald-300",
    violet: "bg-violet-500/15 text-violet-300",
    amber: "bg-amber-500/15 text-amber-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.22em] text-gray-500">{label}</p>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            accentMap[accent] || accentMap.indigo
          }`}
        >
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
    </div>
  );
};

const Overview = ({ onChangeTab }) => {
  const { t } = useTranslation();
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
    return <AdminLoadingState text={t("admin.overview_ui.loading_stats", "正在加载统计数据...")} />;
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
            />
            <CompactMetric
              label="活动近 7 日访问"
              value={formatNumber(stats.eventAnalytics?.views7d)}
              icon={TrendingUp}
              accent="violet"
            />
            <CompactMetric
              label="活动总报名"
              value={formatNumber(stats.eventAnalytics?.totalRegistrations)}
              icon={MessageSquare}
              accent="emerald"
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              onClick={() => onChangeTab("pending")}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
            >
              <div className="text-sm font-semibold text-white">处理待审核内容</div>
              <div className="mt-1 text-sm text-gray-400">
                批量处理图片、视频、音频、文章和活动的审核状态。
              </div>
            </button>
            <button
              onClick={() => onChangeTab("community")}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
            >
              <div className="text-sm font-semibold text-white">查看社区运营</div>
              <div className="mt-1 text-sm text-gray-400">
                查看帖子总量、社区社群入口和已发布内容运营情况。
              </div>
            </button>
          </div>
        </AdminPanel>

        <AdminPanel title="系统状态" description="确认后台服务和核心环境是否正常。">
          <div className="space-y-3">
            <div className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-gray-400">Node 版本</span>
              <span className="font-mono text-white">{stats.system.nodeVersion}</span>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-gray-400">运行平台</span>
              <span className="font-mono capitalize text-white">{stats.system.platform}</span>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-gray-400">运行时长</span>
              <div className="flex items-center gap-2 font-mono text-emerald-300">
                <Clock size={14} />
                {formatUptime(stats.system.uptime)}
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-gray-400">活动总访问</span>
              <div className="flex items-center gap-2 font-mono text-indigo-300">
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
          />
          <CompactMetric
            label="累计报名"
            value={formatNumber(stats.eventAnalytics?.totalRegistrations)}
            icon={MessageSquare}
            accent="emerald"
          />
          <CompactMetric
            label="近 7 日访问"
            value={formatNumber(stats.eventAnalytics?.views7d)}
            icon={TrendingUp}
            accent="violet"
          />
          <CompactMetric
            label="待开始活动"
            value={formatNumber(stats.eventAnalytics?.upcomingCount)}
            icon={Calendar}
            accent="amber"
          />
        </div>

        <div className="mt-6 space-y-3">
          {(stats.eventAnalytics?.hottestEvents || []).length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
              暂无活动统计数据。
            </div>
          ) : (
            stats.eventAnalytics.hottestEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">{event.title}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {event.date || "未设置活动时间"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-indigo-300">
                    {formatNumber(event.views)} 访问
                  </span>
                  <span className="text-emerald-300">
                    {formatNumber(event.registrations)} 报名
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </AdminPanel>

      <AdminPanel className="bg-gradient-to-br from-indigo-900/20 via-[#111] to-violet-900/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">今天先做什么</h3>
            <p className="mt-2 max-w-2xl text-sm text-gray-400">
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
