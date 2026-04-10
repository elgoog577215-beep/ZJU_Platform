import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Upload, Activity, TrendingUp, Sparkles, Users, ArrowRight, Camera, Film, Music2, BookOpen, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCachedResource } from '../hooks/useCachedResource';
import { useReducedMotion } from '../utils/animations';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const formatCompactNumber = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: number >= 10000 ? 1 : 0
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

AnimatedNumber.displayName = 'AnimatedNumber';

const StatCard = memo(({ icon: Icon, label, value, accentColor, isDayMode, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className={`relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl ${
        isDayMode 
          ? 'border-slate-200/80 bg-white/88 shadow-[0_12px_32px_rgba(148,163,184,0.12)]' 
          : 'border-white/10 bg-white/[0.04] shadow-[0_12px_32px_rgba(0,0,0,0.14)]'
      }`}
    >
      <div className={`absolute -right-3 -top-3 h-16 w-16 rounded-full blur-2xl opacity-40 ${accentColor}`} />
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
          isDayMode ? 'bg-slate-50' : 'bg-white/[0.06]'
        }`}>
          <Icon size={16} className={isDayMode ? 'text-slate-500' : 'text-white/60'} />
        </div>
        <span className={`text-[11px] font-medium uppercase tracking-[0.2em] ${
          isDayMode ? 'text-slate-400' : 'text-white/40'
        }`}>{label}</span>
      </div>
      <div className={`text-3xl sm:text-4xl font-bold tracking-tight ${
        isDayMode ? 'text-slate-900' : 'text-white'
      }`}>
        <AnimatedNumber value={value} shouldAnimate={!useReducedMotion()} />
      </div>
    </motion.div>
  );
});

StatCard.displayName = 'StatCard';

const TrendBadge = memo(({ value, isDayMode }) => {
  const numericValue = Number(value || 0);
  const isPositive = numericValue >= 0;
  
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold ${
      isPositive
        ? isDayMode ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-400/10 text-emerald-300'
        : isDayMode ? 'bg-red-50 text-red-600' : 'bg-red-400/10 text-red-300'
    }`}>
      <TrendingUp size={12} className={isPositive ? '' : 'rotate-180'} />
      {Math.abs(numericValue)}%
    </div>
  );
});

TrendBadge.displayName = 'TrendBadge';

// 简约曲线图组件
const MiniTrendChart = memo(({ data, color, isDayMode, height = 60 }) => {
  if (!data || data.length === 0) return null;
  
  const maxValue = Math.max(...data.map(d => d.value || 0), 1);
  const minValue = Math.min(...data.map(d => d.value || 0), 0);
  const range = maxValue - minValue || 1;
  
  // 生成曲线路径
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item.value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  // 生成渐变区域
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="relative w-full overflow-hidden" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={isDayMode ? 0.3 : 0.4} />
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

MiniTrendChart.displayName = 'MiniTrendChart';

const PlatformStats = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading } = useCachedResource('/site-metrics', {}, { keyPrefix: 'site-metrics', ttl: 1000 * 60 * 3, silent: true });
  const { data: featuredData, loading: featuredLoading } = useCachedResource('/featured', {}, { keyPrefix: 'home-featured-mix', ttl: 1000 * 60 * 3, silent: true });
  const [followingFeed, setFollowingFeed] = useState([]);
  const [followRecommendations, setFollowRecommendations] = useState([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState([]);

  const summary = data?.summary || {};
  const growth = data?.growth || {};
  const trend = data?.trend || [];
  const featuredItems = [
    ...(featuredData?.photos || []).slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title || '精选图片',
      subtitle: '摄影',
      image: item.url,
      targetPath: `/gallery?id=${item.id}`,
      icon: Camera
    })),
    ...(featuredData?.articles || []).slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title || '精选文章',
      subtitle: '文章',
      image: item.cover,
      targetPath: `/articles?id=${item.id}`,
      icon: BookOpen
    })),
    ...(featuredData?.videos || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || '精选视频',
      subtitle: '视频',
      image: item.thumbnail,
      targetPath: `/videos?id=${item.id}`,
      icon: Film
    })),
    ...(featuredData?.music || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || '精选音频',
      subtitle: '音频',
      image: item.cover,
      targetPath: `/music?id=${item.id}`,
      icon: Music2
    })),
    ...(featuredData?.events || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || '精选活动',
      subtitle: '活动',
      image: item.image,
      targetPath: `/events?id=${item.id}`,
      icon: CalendarDays
    }))
  ].filter((item) => item?.id).slice(0, 7);

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
      api.get('/users/following/feed', { params: { limit: 5 } }),
      api.get('/users/recommendations/follow', { params: { limit: 4 } }),
      api.get('/users/following/ids')
    ]).then(([feedRes, recRes, idsRes]) => {
      if (cancelled) return;
      setFollowingFeed(Array.isArray(feedRes.data?.data) ? feedRes.data.data : []);
      setFollowRecommendations(Array.isArray(recRes.data) ? recRes.data : []);
      setFollowingIds(Array.isArray(idsRes.data?.ids) ? idsRes.data.ids : []);
    }).catch(() => {
      if (cancelled) return;
      setFollowingFeed([]);
      setFollowRecommendations([]);
      setFollowingIds([]);
    }).finally(() => {
      if (!cancelled) setFollowLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFollow = async (targetUserId, event) => {
    event?.stopPropagation();
    if (!user || !targetUserId || Number(targetUserId) === Number(user.id)) return;
    const isFollowing = followingIds.includes(Number(targetUserId));
    try {
      await api[isFollowing ? 'delete' : 'post'](`/users/${targetUserId}/follow`);
      setFollowingIds((prev) => (
        isFollowing
          ? prev.filter((id) => id !== Number(targetUserId))
          : [...prev, Number(targetUserId)]
      ));
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <section className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className={`h-24 rounded-2xl animate-pulse ${isDayMode ? 'bg-slate-100' : 'bg-white/[0.04]'}`} />
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 backdrop-blur-2xl ${
            isDayMode 
              ? 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.78))] shadow-[0_16px_48px_rgba(148,163,184,0.14)]' 
              : 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-[0_16px_48px_rgba(0,0,0,0.16)]'
          }`}
        >
          {/* 顶部标题栏 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                isDayMode ? 'bg-indigo-50 text-indigo-500' : 'bg-indigo-400/10 text-indigo-300'
              }`}>
                <Activity size={14} />
              </div>
              <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                isDayMode ? 'text-slate-600' : 'text-white/70'
              }`}>
                {t('home.stats.eyebrow', '平台热度')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles size={12} className={isDayMode ? 'text-amber-400' : 'text-amber-300'} />
              <TrendBadge value={growth.viewsChange} isDayMode={isDayMode} />
            </div>
          </div>

          {/* 数据网格 - Bento Grid 风格 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={Eye}
              label={t('home.stats.today_views', '今日浏览')}
              value={summary.todayViews}
              accentColor={isDayMode ? 'bg-violet-200' : 'bg-violet-400/20'}
              isDayMode={isDayMode}
              delay={0.05}
            />
            <StatCard
              icon={Upload}
              label={t('home.stats.today_uploads', '今日上传')}
              value={summary.todayUploads}
              accentColor={isDayMode ? 'bg-emerald-200' : 'bg-emerald-400/20'}
              isDayMode={isDayMode}
              delay={0.1}
            />
            <StatCard
              icon={Activity}
              label={t('home.stats.total_views', '累计访问')}
              value={summary.totalViews}
              accentColor={isDayMode ? 'bg-blue-200' : 'bg-blue-400/20'}
              isDayMode={isDayMode}
              delay={0.15}
            />
            <StatCard
              icon={Upload}
              label={t('home.stats.total_uploads', '累计作品')}
              value={summary.totalUploads}
              accentColor={isDayMode ? 'bg-amber-200' : 'bg-amber-400/20'}
              isDayMode={isDayMode}
              delay={0.2}
            />
          </div>

          {/* 7 天趋势曲线图 */}
          {trend.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className={`mt-4 rounded-xl border p-4 backdrop-blur-xl ${
                isDayMode 
                  ? 'border-slate-200/80 bg-slate-50/80' 
                  : 'border-white/8 bg-black/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-medium uppercase tracking-[0.2em] ${
                  isDayMode ? 'text-slate-400' : 'text-white/40'
                }`}>
                  {t('home.stats.trend_title', '近 7 日访问趋势')}
                </span>
                <span className={`text-xs font-semibold ${
                  isDayMode ? 'text-slate-600' : 'text-white/60'
                }`}>
                  {t('home.stats.total_short', '总计')} {formatCompactNumber(growth.views7d)}
                </span>
              </div>
              <MiniTrendChart
                data={trend}
                color={isDayMode ? '#6366f1' : '#818cf8'}
                isDayMode={isDayMode}
                height={50}
              />
              <div className="flex justify-between mt-2">
                {trend.map((item, index) => (
                  <span
                    key={index}
                    className={`text-[10px] ${
                      index === trend.length - 1
                        ? isDayMode ? 'text-slate-700 font-semibold' : 'text-white/70 font-semibold'
                        : isDayMode ? 'text-slate-400' : 'text-white/30'
                    }`}
                  >
                    {t(`home.stats.weekday_short.${item.label.toLowerCase()}`, item.label)}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className={`mt-4 rounded-2xl border p-4 sm:p-5 ${
            isDayMode
              ? 'border-slate-200/80 bg-white/88 shadow-[0_16px_48px_rgba(148,163,184,0.14)]'
              : 'border-white/10 bg-white/[0.03] shadow-[0_16px_48px_rgba(0,0,0,0.16)]'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isDayMode ? 'bg-amber-50 text-amber-500' : 'bg-amber-400/10 text-amber-300'}`}>
                <Sparkles size={14} />
              </div>
              <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDayMode ? 'text-slate-600' : 'text-white/70'}`}>
                精选作品
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/articles')}
              className={`inline-flex items-center gap-1 text-xs font-semibold ${isDayMode ? 'text-amber-600' : 'text-amber-300'}`}
            >
              进入发现
              <ArrowRight size={12} />
            </button>
          </div>

          {featuredLoading ? (
            <div className={`text-sm ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('common.loading')}</div>
          ) : featuredItems.length === 0 ? (
            <div className={`text-sm rounded-xl border px-3 py-4 ${isDayMode ? 'border-slate-200/80 bg-slate-50/80 text-slate-500' : 'border-white/10 bg-black/20 text-gray-400'}`}>
              暂无精选内容
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {featuredItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.subtitle}-${item.id}`}
                    type="button"
                    onClick={() => navigate(item.targetPath)}
                    className={`group text-left rounded-xl overflow-hidden border transition-all ${
                      isDayMode
                        ? 'border-slate-200/80 bg-white hover:shadow-[0_12px_28px_rgba(148,163,184,0.18)]'
                        : 'border-white/10 bg-black/25 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className={`h-28 ${isDayMode ? 'bg-slate-100' : 'bg-black/40'}`}>
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon size={18} className={isDayMode ? 'text-slate-400' : 'text-gray-500'} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className={`text-xs mb-1 inline-flex items-center gap-1 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        <Icon size={12} />
                        {item.subtitle}
                      </div>
                      <div className={`text-sm font-semibold line-clamp-1 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                        {item.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        {user && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className={`mt-4 rounded-2xl border p-4 sm:p-5 ${
              isDayMode
                ? 'border-slate-200/80 bg-white/88 shadow-[0_16px_48px_rgba(148,163,184,0.14)]'
                : 'border-white/10 bg-white/[0.03] shadow-[0_16px_48px_rgba(0,0,0,0.16)]'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isDayMode ? 'bg-indigo-50 text-indigo-500' : 'bg-indigo-400/10 text-indigo-300'}`}>
                  <Users size={14} />
                </div>
                <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDayMode ? 'text-slate-600' : 'text-white/70'}`}>
                  关注动态
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/articles')}
                className={`inline-flex items-center gap-1 text-xs font-semibold ${isDayMode ? 'text-indigo-600' : 'text-indigo-300'}`}
              >
                查看内容
                <ArrowRight size={12} />
              </button>
            </div>

            {followLoading ? (
              <div className={`text-sm ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('common.loading')}</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4">
                <div className="space-y-2">
                  {followingFeed.length === 0 ? (
                    <div className={`text-sm rounded-xl border px-3 py-4 ${isDayMode ? 'border-slate-200/80 bg-slate-50/80 text-slate-500' : 'border-white/10 bg-black/20 text-gray-400'}`}>
                      你关注的作者还没有发布新内容
                    </div>
                  ) : (
                    followingFeed.map((item) => (
                      <button
                        key={`${item.resource_type}-${item.id}`}
                        type="button"
                        onClick={() => navigate(item.target_path || '/articles')}
                        className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${isDayMode ? 'border-slate-200/80 bg-slate-50/80 hover:bg-white' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}
                      >
                        <div className={`text-sm font-semibold truncate ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{item.title}</div>
                        <div className={`text-xs mt-1 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                          {[item.author_name, item.resource_type].filter(Boolean).join(' · ')}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className={`rounded-xl border p-3 ${isDayMode ? 'border-slate-200/80 bg-slate-50/80' : 'border-white/10 bg-black/20'}`}>
                  <div className={`text-xs font-semibold uppercase tracking-[0.18em] mb-2 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>推荐关注</div>
                  <div className="space-y-2">
                    {followRecommendations.slice(0, 4).map((item) => {
                      const followed = followingIds.includes(Number(item.id));
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-2">
                          <button type="button" className={`text-sm truncate ${isDayMode ? 'text-slate-700' : 'text-gray-200'}`} onClick={() => navigate(`/user/${item.id}`)}>
                            {item.nickname || item.username}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => toggleFollow(item.id, e)}
                            className={`text-xs px-2.5 py-1 rounded-full border ${followed ? (isDayMode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-black border-white') : (isDayMode ? 'bg-white text-slate-700 border-slate-200/80' : 'bg-white/5 text-gray-200 border-white/10')}`}
                          >
                            {followed ? '已关注' : '关注'}
                          </button>
                        </div>
                      );
                    })}
                    {followRecommendations.length === 0 && (
                      <div className={`text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>暂无推荐</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PlatformStats;
