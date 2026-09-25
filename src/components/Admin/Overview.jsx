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
  Activity,
  Users,
  UploadCloud,
  MousePointerClick,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const DEFAULT_SITE_METRICS = {
  summary: {},
  growth: {},
  trend: [],
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

const CHART_COLORS = {
  views: "#818cf8",
  visitors: "#2dd4bf",
  eventViews: "#38bdf8",
  registrations: "#34d399",
  uploads: "#fbbf24",
};

const ASSET_PIE_COLORS = ["#818cf8", "#38bdf8", "#fb7185", "#2dd4bf", "#34d399"];

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
      className={`group rect-surface-soft border p-4 text-left transition-colors ${
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
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
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
      className={`rect-surface-soft flex min-h-[92px] items-start gap-3 border p-4 text-left transition-colors ${
        isDayMode
          ? "border-slate-200/70 bg-white/[0.82] hover:border-slate-300 hover:bg-white"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-md ${
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

const CommandMetricCard = ({
  label,
  value,
  helper,
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
      className={`group rect-surface-soft flex min-h-[110px] flex-col justify-between border p-4 text-left transition-colors ${
        isDayMode
          ? "border-slate-200/70 bg-white/[0.84] hover:border-slate-300 hover:bg-white"
          : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
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
      <div>
        <div
          className={`mt-5 text-3xl font-bold tabular-nums ${
            isDayMode ? "text-slate-950" : "text-white"
          }`}
        >
          {value}
        </div>
        <div
          className={`mt-1 text-sm font-semibold ${
            isDayMode ? "text-slate-700" : "text-gray-200"
          }`}
        >
          {label}
        </div>
        <div
          className={`mt-1 text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
        >
          {helper}
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

const GrowthBadge = ({ change, isDayMode }) => {
  if (change === undefined || change === null) return null;
  const positive = change >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        positive
          ? isDayMode
            ? "bg-emerald-50 text-emerald-700"
            : "bg-emerald-500/10 text-emerald-300"
          : isDayMode
            ? "bg-rose-50 text-rose-600"
            : "bg-rose-500/10 text-rose-300"
      }`}
    >
      {positive ? "↑" : "↓"} {Math.abs(change)}%
    </span>
  );
};

const TrendPanel = ({ trend, summary, growth, isDayMode, range, onRangeChange }) => {
  const axisColor = isDayMode ? "#64748b" : "#94a3b8";
  const gridColor = isDayMode ? "rgba(100, 116, 139, 0.18)" : "rgba(255, 255, 255, 0.08)";
  const tooltipStyle = {
    backgroundColor: isDayMode ? "#ffffff" : "rgba(15, 23, 42, 0.96)",
    border: `1px solid ${isDayMode ? "rgba(100, 116, 139, 0.25)" : "rgba(255, 255, 255, 0.12)"}`,
    borderRadius: "10px",
    color: isDayMode ? "#0f172a" : "#e2e8f0",
    fontSize: "12px",
  };

  const data = range === "7d" ? trend.slice(-7) : trend;

  const series = [
    { key: "views", label: "站点访问", color: CHART_COLORS.views },
    { key: "visitors", label: "独立访客", color: CHART_COLORS.visitors },
    { key: "eventViews", label: "活动浏览", color: CHART_COLORS.eventViews },
    { key: "registrations", label: "活动报名", color: CHART_COLORS.registrations },
  ];

  const totalInRange = (key) =>
    data.reduce((sum, item) => sum + Number(item?.[key] || 0), 0);

  return (
    <AdminPanel
      title="访问与报名趋势"
      description="站点流量、活动浏览与报名的按天走势，用于判断内容节奏与活动效果。"
      action={
        <div
          className={`flex overflow-hidden rounded-lg border text-xs ${
            isDayMode ? "border-slate-200" : "border-white/15"
          }`}
        >
          {[
            { key: "7d", label: "近 7 天" },
            { key: "30d", label: "近 30 天" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onRangeChange(option.key)}
              className={`px-3 py-1.5 transition-colors ${
                range === option.key
                  ? isDayMode
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-950"
                  : isDayMode
                    ? "text-slate-500 hover:bg-slate-50"
                    : "text-gray-400 hover:bg-white/5"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: `今日访问`,
            value: summary.todayViews,
            icon: MousePointerClick,
            tone: "indigo",
          },
          {
            label: "今日独立访客",
            value: summary.todayVisitors,
            icon: Users,
            tone: "sky",
          },
          {
            label: "今日内容上传",
            value: summary.todayUploads,
            icon: UploadCloud,
            tone: "amber",
          },
          {
            label: "累计独立访客",
            value: summary.totalVisitors,
            icon: Activity,
            tone: "emerald",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-xl border p-3 ${
              isDayMode
                ? "border-slate-200/70 bg-white/[0.6]"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
              >
                {item.label}
              </span>
              <item.icon
                size={14}
                className={isDayMode ? "text-slate-400" : "text-gray-500"}
              />
            </div>
            <div
              className={`mt-1.5 text-xl font-bold tabular-nums ${
                isDayMode ? "text-slate-950" : "text-white"
              }`}
            >
              {new Intl.NumberFormat("zh-CN").format(Number(item.value || 0))}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {series.map((item) => (
          <span
            key={item.key}
            className={`flex items-center gap-1.5 ${
              isDayMode ? "text-slate-600" : "text-gray-300"
            }`}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
            <span className="tabular-nums opacity-70">
              {new Intl.NumberFormat("zh-CN").format(totalInRange(item.key))}
            </span>
          </span>
        ))}
        <span className={isDayMode ? "text-slate-400" : "text-gray-500"}>
          访问环比 <GrowthBadge change={growth?.viewsChange} isDayMode={isDayMode} />
        </span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradientViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.views} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_COLORS.views} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: axisColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
              allowDecimals={false}
            />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: axisColor }} />
            <Area
              type="monotone"
              dataKey="views"
              name="站点访问"
              stroke={CHART_COLORS.views}
              strokeWidth={2}
              fill="url(#gradientViews)"
            />
            <Area
              type="monotone"
              dataKey="visitors"
              name="独立访客"
              stroke={CHART_COLORS.visitors}
              strokeWidth={1.5}
              fill="transparent"
            />
            <Area
              type="monotone"
              dataKey="eventViews"
              name="活动浏览"
              stroke={CHART_COLORS.eventViews}
              strokeWidth={1.5}
              fill="transparent"
            />
            <Area
              type="monotone"
              dataKey="registrations"
              name="活动报名"
              stroke={CHART_COLORS.registrations}
              strokeWidth={1.5}
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AdminPanel>
  );
};

const AssetCompositionPanel = ({ stats, isDayMode, formatNumber }) => {
  const data = [
    { name: "文章", key: "articles", value: stats.counts?.articles || 0 },
    { name: "图片", key: "photos", value: stats.counts?.photos || 0 },
    { name: "视频", key: "videos", value: stats.counts?.videos || 0 },
    { name: "音频", key: "music", value: stats.counts?.music || 0 },
    { name: "活动", key: "events", value: stats.counts?.events || 0 },
  ].filter((item) => item.value > 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <AdminPanel
      title="内容构成"
      description="五类内容资产的占比分布，帮助判断内容结构是否均衡。"
    >
      {total > 0 ? (
        <>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="85%"
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.key}
                      fill={ASSET_PIE_COLORS[index % ASSET_PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${formatNumber(value)} 项（${Math.round((value / total) * 100)}%）`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: isDayMode ? "#ffffff" : "rgba(15, 23, 42, 0.96)",
                    border: `1px solid ${isDayMode ? "rgba(100, 116, 139, 0.25)" : "rgba(255, 255, 255, 0.12)"}`,
                    borderRadius: "10px",
                    color: isDayMode ? "#0f172a" : "#e2e8f0",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            {data.map((entry, index) => (
              <span
                key={entry.key}
                className={`flex items-center gap-1.5 ${
                  isDayMode ? "text-slate-600" : "text-gray-300"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: ASSET_PIE_COLORS[index % ASSET_PIE_COLORS.length],
                  }}
                />
                {entry.name} {formatNumber(entry.value)}
              </span>
            ))}
          </div>
        </>
      ) : (
        <AdminInlineNote>暂无内容数据，发布内容后会在这里看到构成分布。</AdminInlineNote>
      )}
    </AdminPanel>
  );
};

const HotEventsChart = ({ hotEvents, isDayMode, formatNumber }) => {
  const axisColor = isDayMode ? "#64748b" : "#94a3b8";
  const gridColor = isDayMode ? "rgba(100, 116, 139, 0.18)" : "rgba(255, 255, 255, 0.08)";

  const data = hotEvents.map((event) => ({
    name: event.title?.length > 12 ? `${event.title.slice(0, 12)}…` : event.title || "未命名",
    fullName: event.title || "未命名",
    访问: Number(event.views || 0),
    报名: Number(event.registrations || 0),
  }));

  if (data.length === 0) {
    return (
      <AdminInlineNote>暂无活动热度数据，可先进入活动管理检查活动信息。</AdminInlineNote>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: axisColor, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: axisColor, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: gridColor }}
            width={110}
          />
          <Tooltip
            formatter={(value, key, item) => {
              const payload = item?.payload;
              return [
                `${formatNumber(value)}${payload?.fullName ? ` — ${payload.fullName}` : ""}`,
                key,
              ];
            }}
            contentStyle={{
              backgroundColor: isDayMode ? "#ffffff" : "rgba(15, 23, 42, 0.96)",
              border: `1px solid ${isDayMode ? "rgba(100, 116, 139, 0.25)" : "rgba(255, 255, 255, 0.12)"}`,
              borderRadius: "10px",
              color: isDayMode ? "#0f172a" : "#e2e8f0",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
          <Bar dataKey="访问" fill={CHART_COLORS.eventViews} radius={[0, 4, 4, 0]} barSize={10} />
          <Bar dataKey="报名" fill={CHART_COLORS.registrations} radius={[0, 4, 4, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const Overview = ({ onChangeTab }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [siteMetrics, setSiteMetrics] = useState(DEFAULT_SITE_METRICS);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");

  const fetchStats = useCallback(async () => {
    try {
      const [statsResponse, metricsResponse] = await Promise.all([
        api.get("/stats"),
        api.get("/site-metrics?days=30").catch(() => null),
      ]);
      const data = statsResponse.data || {};
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
      if (metricsResponse?.data) {
        setSiteMetrics({
          summary: metricsResponse.data.summary || {},
          growth: metricsResponse.data.growth || {},
          trend: Array.isArray(metricsResponse.data.trend)
            ? metricsResponse.data.trend
            : [],
        });
      }
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
  const assetTotal = useMemo(
    () =>
      Object.values(stats.counts || {}).reduce(
        (sum, value) => sum + Number(value || 0),
        0,
      ),
    [stats.counts],
  );
  const hotEvents = stats.eventAnalytics?.hottestEvents || [];

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
      description="后台首页按真实运营顺序组织：先看趋势，再处理风险与待办，最后进入内容、活动和社区模块。"
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
      <AdminPanel
        title="运营总览"
        description="把后台第一屏收束成一个判断面板，避免在多个重复模块之间来回扫。"
      >
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.4fr)_minmax(280px,0.75fr)]">
          <div
            className={`rect-surface-soft border p-4 ${
              pendingTotal > 0
                ? isDayMode
                  ? "border-amber-200/80 bg-amber-50/70"
                  : "border-amber-500/20 bg-amber-500/10"
                : ""
            }`}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between 2xl:flex-col 2xl:items-start">
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
              <AdminButton tone="subtle" onClick={() => onChangeTab("events")}>
                看活动
              </AdminButton>
            </div>
          </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-2">
            <CommandMetricCard
              label="资产总量"
              value={formatNumber(assetTotal)}
              helper="内容与活动"
              icon={LayoutGrid}
              tone="indigo"
              isDayMode={isDayMode}
              onClick={() => onChangeTab("articles")}
            />
            <CommandMetricCard
              label="待开始活动"
              value={formatNumber(stats.eventAnalytics?.upcomingCount)}
              helper="活动排期"
              icon={Calendar}
              tone="emerald"
              isDayMode={isDayMode}
              onClick={() => onChangeTab("events")}
            />
            <CommandMetricCard
              label="近 7 日访问"
              value={formatNumber(stats.eventAnalytics?.views7d)}
              helper="活动热度"
              icon={TrendingUp}
              tone="sky"
              isDayMode={isDayMode}
              onClick={() => onChangeTab("events")}
            />
            <CommandMetricCard
              label="近 7 日报名"
              value={formatNumber(stats.eventAnalytics?.registrations7d)}
              helper="活动转化"
              icon={MessageSquare}
              tone="amber"
              isDayMode={isDayMode}
              onClick={() => onChangeTab("events")}
            />
          </div>

          <div>
            <div
              className={`mb-2 text-xs font-semibold uppercase tracking-[0.16em] ${
                isDayMode ? "text-slate-400" : "text-gray-500"
              }`}
            >
              快捷入口
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 2xl:grid-cols-1">
            <QuickAction
              label="活动运营"
              description="维护活动信息，跟进报名与热度。"
              icon={Calendar}
              tone="indigo"
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
          </div>
        </div>
      </AdminPanel>

      <TrendPanel
        trend={siteMetrics.trend}
        summary={siteMetrics.summary}
        growth={siteMetrics.growth}
        isDayMode={isDayMode}
        range={range}
        onRangeChange={setRange}
      />

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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.5fr)]">
        <AssetCompositionPanel
          stats={stats}
          isDayMode={isDayMode}
          formatNumber={formatNumber}
        />

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
            <div
              className={`mb-3 text-sm font-semibold ${
                isDayMode ? "text-slate-950" : "text-white"
              }`}
            >
              热门活动 Top 5
            </div>
            <HotEventsChart
              hotEvents={hotEvents}
              isDayMode={isDayMode}
              formatNumber={formatNumber}
            />
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="系统状态" description="只保留排查后台时真正需要的信息。">
        <div className="grid grid-cols-1 gap-x-8 md:grid-cols-3">
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
        </div>
      </AdminPanel>
    </AdminPageShell>
  );
};

export default Overview;
