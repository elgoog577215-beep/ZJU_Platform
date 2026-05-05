import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  Upload,
  Activity,
  TrendingUp,
  Sparkles,
  Users,
  ArrowRight,
  Camera,
  Film,
  Music2,
  BookOpen,
  CalendarDays,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCachedResource } from "../hooks/useCachedResource";
import {
  listContainer,
  listItem,
  motionTokens,
  sectionReveal,
  tapPress,
  useReducedMotion,
} from "../utils/animations";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

const formatCompactNumber = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: number >= 10000 ? 1 : 0,
  }).format(number);
};

const AnimatedNumber = memo(({ value, shouldAnimate = true }) => {
  const numericValue = Number(value || 0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayValue(numericValue);
      return undefined;
    }

    let animationFrameId;
    const duration = 800;
    const startTime = performance.now();

    const step = (currentTime) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(numericValue * easedProgress));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [numericValue, shouldAnimate]);

  return formatCompactNumber(displayValue);
});

AnimatedNumber.displayName = "AnimatedNumber";

const StatCard = memo(
  ({ icon: Icon, label, value, accentColor, isDayMode, delay = 0, prefersReducedMotion = false }) => {
    return (
      <motion.div
        variants={listItem}
        initial={prefersReducedMotion ? false : "initial"}
        whileInView={prefersReducedMotion ? undefined : "animate"}
        viewport={motionTokens.viewport}
        transition={prefersReducedMotion ? undefined : { ...motionTokens.spring.snappy, delay }}
        whileHover={prefersReducedMotion ? undefined : { y: -3 }}
        whileTap={prefersReducedMotion ? undefined : tapPress}
        className={`motion-gpu motion-lift relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl ${
          isDayMode
            ? "day-card-lift"
            : "border-white/10 bg-white/[0.04] shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
        }`}
      >
        <div
          className={`absolute -right-3 -top-3 h-16 w-16 rounded-full blur-2xl opacity-40 ${accentColor}`}
        />
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
              isDayMode ? "bg-slate-50" : "bg-white/[0.06]"
            }`}
          >
            <Icon
              size={16}
              className={isDayMode ? "text-slate-500" : "text-white/60"}
            />
          </div>
          <span
            className={`text-[11px] font-medium uppercase tracking-[0.2em] ${
              isDayMode ? "text-slate-400" : "text-white/40"
            }`}
          >
            {label}
          </span>
        </div>
        <div
          className={`text-3xl sm:text-4xl font-bold tracking-tight ${
            isDayMode ? "text-slate-900" : "text-white"
          }`}
        >
          <AnimatedNumber value={value} shouldAnimate={!prefersReducedMotion} />
        </div>
      </motion.div>
    );
  },
);

StatCard.displayName = "StatCard";

const TrendBadge = memo(({ value, isDayMode }) => {
  const numericValue = Number(value || 0);
  const isPositive = numericValue >= 0;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
        isPositive
          ? isDayMode
            ? "bg-emerald-50 text-emerald-600"
            : "bg-emerald-400/10 text-emerald-300"
          : isDayMode
            ? "bg-red-50 text-red-600"
            : "bg-red-400/10 text-red-300"
      }`}
    >
      <TrendingUp size={12} className={isPositive ? "" : "rotate-180"} />
      {Math.abs(numericValue)}%
    </div>
  );
});

TrendBadge.displayName = "TrendBadge";

// 简约曲线图组件
const MiniTrendChart = memo(({ data, color, isDayMode, height = 60 }) => {
  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value || 0), 1);
  const minValue = Math.min(...data.map((d) => d.value || 0), 0);
  const range = maxValue - minValue || 1;

  // 生成曲线路径
  const points = data
    .map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((item.value - minValue) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  // 生成渐变区域
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient
            id={`gradient-${color}`}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop
              offset="0%"
              stopColor={color}
              stopOpacity={isDayMode ? 0.3 : 0.4}
            />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#gradient-${color})`} />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

MiniTrendChart.displayName = "MiniTrendChart";

const PlatformStats = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const { user } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { loading } = useCachedResource(
    "/site-metrics",
    {},
    { keyPrefix: "site-metrics", ttl: 1000 * 60 * 3, silent: true },
  );
  const { data: featuredData, loading: featuredLoading } = useCachedResource(
    "/featured",
    {},
    { keyPrefix: "home-featured-mix", ttl: 1000 * 60 * 3, silent: true },
  );
  const [followingFeed, setFollowingFeed] = useState([]);
  const [followRecommendations, setFollowRecommendations] = useState([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState([]);

  const featuredItems = [
    ...(featuredData?.photos || []).slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title || "精选图片",
      subtitle: "摄影",
      image: item.url,
      targetPath: `/gallery?id=${item.id}`,
      icon: Camera,
    })),
    ...(featuredData?.articles || []).slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title || "精选文章",
      subtitle: "文章",
      image: item.cover,
      targetPath: `/articles?id=${item.id}`,
      icon: BookOpen,
    })),
    ...(featuredData?.videos || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || "精选视频",
      subtitle: "视频",
      image: item.thumbnail,
      targetPath: `/videos?id=${item.id}`,
      icon: Film,
    })),
    ...(featuredData?.music || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || "精选音频",
      subtitle: "音频",
      image: item.cover,
      targetPath: `/music?id=${item.id}`,
      icon: Music2,
    })),
    ...(featuredData?.events || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || "精选活动",
      subtitle: "活动",
      image: item.image,
      targetPath: `/events?id=${item.id}`,
      icon: CalendarDays,
    })),
  ]
    .filter((item) => item?.id)
    .slice(0, 7);

  useEffect(() => {
    if (!user) {
      setFollowingFeed([]);
      setFollowRecommendations([]);
      setFollowingIds([]);
      return;
    }
    let cancelled = false;
    setFollowLoading(true);
    Promise.all([
      api.get("/users/following/feed", { params: { limit: 5 } }),
      api.get("/users/recommendations/follow", { params: { limit: 4 } }),
      api.get("/users/following/ids"),
    ])
      .then(([feedRes, recRes, idsRes]) => {
        if (cancelled) return;
        setFollowingFeed(
          Array.isArray(feedRes.data?.data) ? feedRes.data.data : [],
        );
        setFollowRecommendations(Array.isArray(recRes.data) ? recRes.data : []);
        setFollowingIds(Array.isArray(idsRes.data?.ids) ? idsRes.data.ids : []);
      })
      .catch(() => {
        if (cancelled) return;
        setFollowingFeed([]);
        setFollowRecommendations([]);
        setFollowingIds([]);
      })
      .finally(() => {
        if (!cancelled) setFollowLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFollow = async (targetUserId, event) => {
    event?.stopPropagation();
    if (!user || !targetUserId || Number(targetUserId) === Number(user.id))
      return;
    const isFollowing = followingIds.includes(Number(targetUserId));
    try {
      await api[isFollowing ? "delete" : "post"](
        `/users/${targetUserId}/follow`,
      );
      setFollowingIds((prev) =>
        isFollowing
          ? prev.filter((id) => id !== Number(targetUserId))
          : [...prev, Number(targetUserId)],
      );
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div
            className={`h-24 rounded-2xl animate-pulse ${isDayMode ? "bg-slate-100" : "bg-white/[0.04]"}`}
          />
        </div>
      </section>
    );
  }

  return (
      <section className="relative px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {isDayMode && (
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-80 overflow-hidden">
          <div className="absolute left-[10%] top-8 h-36 w-56 rounded-full bg-sky-200/22 blur-[80px]" />
          <div className="absolute right-[14%] top-16 h-32 w-52 rounded-full bg-amber-200/18 blur-[76px]" />
        </div>
      )}
      <div className="relative z-20 mx-auto -mt-8 max-w-5xl sm:-mt-10">
        <motion.div
          variants={sectionReveal}
          initial={prefersReducedMotion ? false : "initial"}
          whileInView={prefersReducedMotion ? undefined : "animate"}
          viewport={motionTokens.viewport}
          className={`motion-gpu motion-surface mt-2 rounded-[24px] border p-4 sm:mt-4 sm:rounded-[28px] sm:p-5 ${
            isDayMode
              ? "day-fine-surface"
              : "border-white/10 bg-white/[0.03] shadow-[0_16px_48px_rgba(0,0,0,0.16)]"
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${isDayMode ? "bg-amber-50 text-amber-500" : "bg-amber-400/10 text-amber-300"}`}
              >
                <Sparkles size={14} />
              </div>
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.18em] ${isDayMode ? "text-slate-600" : "text-white/70"}`}
              >
                精选作品
              </span>
            </div>
            <button
              type="button"
              aria-label="进入发现"
              onClick={() => navigate("/articles")}
              className={`motion-press inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[11px] font-semibold shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 sm:min-h-[36px] sm:px-3 sm:text-xs ${isDayMode ? "border-amber-200/80 bg-amber-50/90 text-amber-700 hover:bg-amber-100" : "border-amber-400/20 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15"}`}
            >
              进入发现
              <ArrowRight size={12} />
            </button>
          </div>

          {featuredLoading ? (
            <div
              className={`text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
            >
              {t("common.loading")}
            </div>
          ) : featuredItems.length === 0 ? (
            <div
              className={`text-sm rounded-xl border px-3 py-4 ${isDayMode ? "border-slate-200/80 bg-slate-50/80 text-slate-500" : "border-white/10 bg-black/20 text-gray-400"}`}
            >
              暂无精选内容
            </div>
          ) : (
            <motion.div
              variants={listContainer}
              initial={prefersReducedMotion ? false : "initial"}
              whileInView={prefersReducedMotion ? undefined : "animate"}
              viewport={motionTokens.viewport}
              className="flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pb-0 lg:grid-cols-3"
            >
              {featuredItems.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    variants={listItem}
                    whileTap={prefersReducedMotion ? undefined : tapPress}
                    key={`${item.subtitle}-${item.id}`}
                    type="button"
                    aria-label={`${item.subtitle} ${item.title}`}
                    onClick={() => navigate(item.targetPath)}
                    className={`motion-gpu motion-lift group w-[282px] shrink-0 snap-start overflow-hidden rounded-2xl border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 sm:w-auto sm:rounded-xl ${
                      isDayMode
                        ? "day-card-lift"
                        : "border-white/10 bg-black/25 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div
                      className={`h-28 sm:h-28 ${isDayMode ? "bg-slate-100" : "bg-black/40"}`}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon
                            size={18}
                            className={
                              isDayMode ? "text-slate-400" : "text-gray-500"
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-3.5 sm:p-3.5">
                      <div
                        className={`mb-1 inline-flex items-center gap-1 text-[11px] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                      >
                        <Icon size={12} />
                        {item.subtitle}
                      </div>
                      <div
                        className={`line-clamp-2 text-[15px] font-semibold leading-6 sm:line-clamp-1 sm:text-sm ${isDayMode ? "text-slate-900" : "text-white"}`}
                      >
                        {item.title}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {user && (
          <motion.div
            variants={sectionReveal}
            initial={prefersReducedMotion ? false : "initial"}
            whileInView={prefersReducedMotion ? undefined : "animate"}
            viewport={motionTokens.viewport}
            className={`motion-gpu motion-surface mt-4 rounded-[24px] border p-4 sm:rounded-[28px] sm:p-5 ${
              isDayMode
                ? "day-fine-surface"
                : "border-white/10 bg-white/[0.03] shadow-[0_16px_48px_rgba(0,0,0,0.16)]"
            }`}
          >
            <div className="mb-3 flex items-center justify-between sm:mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg ${isDayMode ? "bg-indigo-50 text-indigo-500" : "bg-indigo-400/10 text-indigo-300"}`}
                >
                  <Users size={14} />
                </div>
                <span
                  className={`text-[11px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.18em] ${isDayMode ? "text-slate-600" : "text-white/70"}`}
                >
                  关注动态
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate("/articles")}
                className={`motion-press inline-flex min-h-[38px] items-center gap-1 rounded-lg px-3 text-[11px] font-semibold sm:min-h-0 sm:px-0 sm:text-xs ${isDayMode ? "text-indigo-600 hover:bg-indigo-50 sm:hover:bg-transparent" : "text-indigo-300 hover:bg-white/5 sm:hover:bg-transparent"}`}
              >
                查看内容
                <ArrowRight size={12} />
              </button>
            </div>

            {followLoading ? (
              <div
                className={`text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
              >
                {t("common.loading")}
              </div>
            ) : (
                <motion.div
                  variants={listContainer}
                  initial={prefersReducedMotion ? false : "initial"}
                  whileInView={prefersReducedMotion ? undefined : "animate"}
                  viewport={motionTokens.viewport}
                  className="grid grid-cols-1 gap-3.5 lg:grid-cols-[minmax(0,1fr)_280px]"
                >
                  <div className="space-y-2.5">
                  {followingFeed.length === 0 ? (
                    <div
                      className={`text-sm rounded-xl border px-3 py-4 ${isDayMode ? "border-slate-200/80 bg-slate-50/80 text-slate-500" : "border-white/10 bg-black/20 text-gray-400"}`}
                    >
                      你关注的作者还没有发布新内容
                    </div>
                  ) : (
                    followingFeed.map((item) => (
                      <motion.button
                        variants={listItem}
                        whileTap={prefersReducedMotion ? undefined : tapPress}
                        key={`${item.resource_type}-${item.id}`}
                        type="button"
                        onClick={() =>
                          navigate(item.target_path || "/articles")
                        }
                          className={`motion-gpu motion-lift w-full rounded-2xl border px-3.5 py-3.5 text-left sm:rounded-xl ${isDayMode ? "day-card-lift" : "border-white/10 bg-black/20 hover:bg-white/5"}`}
                      >
                        <div
                          className={`truncate text-[15px] font-semibold leading-6 sm:text-sm ${isDayMode ? "text-slate-900" : "text-white"}`}
                        >
                          {item.title}
                        </div>
                        <div
                          className={`mt-1 text-[11px] leading-5 sm:text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                        >
                          {[item.author_name, item.resource_type]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>

                  <div
                    className={`motion-surface rounded-2xl border p-3.5 sm:rounded-xl sm:p-3 ${isDayMode ? "day-card-lift" : "border-white/10 bg-black/20"}`}
                  >
                    <div
                      className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.18em] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                    >
                      推荐关注
                    </div>
                    <div className="space-y-2 sm:space-y-2">
                      {followRecommendations.slice(0, 4).map((item) => {
                        const followed = followingIds.includes(Number(item.id));
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 rounded-xl sm:rounded-none"
                          >
                            <button
                              type="button"
                              className={`motion-link truncate text-[15px] leading-6 sm:text-sm ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                              onClick={() => navigate(`/user/${item.id}`)}
                            >
                              {item.nickname || item.username}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => toggleFollow(item.id, e)}
                              className={`motion-press min-h-[34px] rounded-full border px-3 py-1.5 text-[11px] font-medium ${followed ? (isDayMode ? "border-indigo-600 bg-indigo-600 text-white shadow-[0_10px_22px_rgba(99,102,241,0.2)]" : "border-white bg-white text-black") : isDayMode ? "border-slate-200/80 bg-white text-slate-700" : "border-white/10 bg-white/5 text-gray-200"}`}
                            >
                              {followed ? "已关注" : "关注"}
                          </button>
                        </div>
                      );
                    })}
                    {followRecommendations.length === 0 && (
                      <div
                        className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                      >
                        暂无推荐
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PlatformStats;
