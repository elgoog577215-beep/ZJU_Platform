import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Upload, Activity, TrendingUp, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCachedResource } from '../hooks/useCachedResource';
import { useReducedMotion } from '../utils/animations';
import { useSettings } from '../context/SettingsContext';

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
  const prefersReducedMotion = useReducedMotion();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const { data, loading } = useCachedResource('/site-metrics', {}, { keyPrefix: 'site-metrics', ttl: 1000 * 60 * 3, silent: true });

  const summary = data?.summary || {};
  const growth = data?.growth || {};
  const trend = data?.trend || [];

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
      </div>
    </section>
  );
};

export default PlatformStats;
