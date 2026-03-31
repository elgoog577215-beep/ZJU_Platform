import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Eye, Heart, Sparkles, TrendingUp, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCachedResource } from '../hooks/useCachedResource';
import { useReducedMotion } from '../utils/animations';

const formatCompactNumber = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: number >= 10000 ? 1 : 0
  }).format(number);
};

const formatPercentage = (value) => {
  const numericValue = Number(value || 0);
  return `${numericValue > 0 ? '+' : ''}${numericValue}%`;
};

const formatFullNumber = (value) => new Intl.NumberFormat('zh-CN').format(Number(value || 0));

const formatRelativeTime = (dateString) => {
  if (!dateString) return '刚刚更新';

  const diffInMinutes = Math.max((Date.now() - new Date(dateString).getTime()) / 60000, 0);

  if (diffInMinutes < 1) return '刚刚更新';
  if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)} 分钟前更新`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} 小时前更新`;
  return `${Math.floor(diffInMinutes / 1440)} 天前更新`;
};

const AnimatedNumber = memo(({ value, compact = true, shouldAnimate = true }) => {
  const numericValue = Number(value || 0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayValue(numericValue);
      return undefined;
    }

    let animationFrameId;
    const duration = 900;
    const startValue = 0;
    const startTime = performance.now();

    const step = (currentTime) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + (numericValue - startValue) * easedProgress);
      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [numericValue, shouldAnimate]);

  return compact ? formatCompactNumber(displayValue) : formatFullNumber(displayValue);
});

AnimatedNumber.displayName = 'AnimatedNumber';

const SectionTitle = memo(({ eyebrow, title, meta }) => (
  <div className="flex items-end justify-between gap-4">
    <div>
      <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.38em] text-white/40 mb-2">{eyebrow}</p>
      <h3 className="text-[1.65rem] sm:text-[2.1rem] font-bold tracking-[-0.045em] text-white leading-[1.02]">{title}</h3>
    </div>
    {meta ? <div className="text-sm sm:text-[15px] text-white/42">{meta}</div> : null}
  </div>
));

SectionTitle.displayName = 'SectionTitle';

const TodayCard = memo(({ icon: Icon, label, value, meta, accentClass, featured = false, reduceMotion = false }) => (
  <motion.div
    whileHover={reduceMotion ? undefined : { y: -3, scale: 1.01 }}
    transition={reduceMotion ? undefined : { type: 'spring', stiffness: 240, damping: 22 }}
    className={`relative overflow-hidden rounded-[1.75rem] border p-6 sm:p-7 backdrop-blur-2xl ${featured ? 'border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.035))] shadow-[0_28px_90px_rgba(0,0,0,0.22)]' : 'border-white/10 bg-white/[0.035] shadow-[0_20px_60px_rgba(0,0,0,0.18)]'}`}
  >
    {featured ? <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-white/10 blur-3xl opacity-80" /> : null}
    <div className="flex items-start justify-between gap-5">
      <div>
        <p className={`text-[11px] sm:text-xs font-medium uppercase tracking-[0.28em] mb-3 ${featured ? 'text-white/60' : 'text-white/40'}`}>{label}</p>
        <p className={`${featured ? 'text-6xl sm:text-7xl lg:text-[6.1rem]' : 'text-5xl sm:text-[4.35rem] lg:text-[5rem]'} font-black tracking-[-0.055em] text-white leading-[0.92]`}>
          <AnimatedNumber value={value} shouldAnimate={!reduceMotion} />
        </p>
        <p className={`text-[15px] sm:text-base leading-7 mt-4 ${featured ? 'text-white/62' : 'text-white/48'}`}>{meta}</p>
      </div>
      <div className={`flex ${featured ? 'h-14 w-14' : 'h-12 w-12'} items-center justify-center rounded-2xl border border-white/10 bg-black/20 ${accentClass}`}>
        <Icon size={featured ? 22 : 20} />
      </div>
    </div>
  </motion.div>
));

TodayCard.displayName = 'TodayCard';

const TotalCard = memo(({ icon: Icon, label, value, meta, reduceMotion = false }) => (
  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl shadow-[0_18px_48px_rgba(0,0,0,0.12)]">
    <div className="flex items-center justify-between gap-4 mb-4">
      <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.24em] text-white/40">{label}</p>
      <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-gray-300">
        <Icon size={16} />
      </div>
    </div>
    <p className="text-[2rem] sm:text-[2.65rem] font-black tracking-[-0.045em] text-white leading-[0.95]">
      <AnimatedNumber value={value} shouldAnimate={!reduceMotion} />
    </p>
    <p className="text-[15px] leading-7 text-white/48 mt-3">{meta}</p>
  </div>
));

TotalCard.displayName = 'TotalCard';

const TrendBars = memo(({ title, colorClass, values, labels, totalLabel, totalValue }) => {
  const maxValue = Math.max(...values, 1);
  const [activeIndex, setActiveIndex] = useState(Math.max(values.length - 1, 0));
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6 backdrop-blur-2xl shadow-[0_22px_64px_rgba(0,0,0,0.16)]">
      <div className="pointer-events-none absolute -top-14 left-1/2 h-28 w-40 -translate-x-1/2 rounded-full bg-white/10 blur-3xl opacity-60" />
      <SectionTitle eyebrow="TREND" title={title} meta={`${totalLabel} ${formatCompactNumber(totalValue)}`} />
      <div className="mt-4 flex items-center justify-between gap-4 rounded-[1.1rem] border border-white/8 bg-black/20 px-4 py-3 backdrop-blur-xl">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400 mb-1">{labels[safeIndex]}</p>
          <p className="text-xl sm:text-[1.35rem] font-bold text-white">{formatFullNumber(values[safeIndex] || 0)}</p>
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      </div>
      <div className="mt-6">
        <div className="flex items-end gap-3 h-44">
          {values.map((value, index) => {
            const height = `${Math.max((value / maxValue) * 100, value > 0 ? 10 : 4)}%`;

            return (
              <button
                key={`${labels[index]}-${index}`}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
            className="flex-1 flex flex-col items-center gap-2 focus:outline-none"
              >
                <div className={`text-xs sm:text-[13px] ${index === safeIndex ? 'text-white' : 'text-gray-400'}`}>{formatCompactNumber(value)}</div>
                <div className="w-full h-full flex items-end">
                  <div
                    className={`w-full rounded-t-2xl transition-all duration-200 ${colorClass} ${index === safeIndex ? 'opacity-100' : 'opacity-60'}`}
                    style={{ height }}
                  />
                </div>
                <div className={`text-xs uppercase tracking-[0.12em] ${index === safeIndex ? 'text-gray-300' : 'text-gray-500'}`}>{labels[index]}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

TrendBars.displayName = 'TrendBars';

const PlatformStats = () => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const { data, loading } = useCachedResource('/site-metrics', {}, { keyPrefix: 'site-metrics', ttl: 1000 * 60 * 3 });

  const summary = data?.summary || {};
  const growth = data?.growth || {};
  const trend = data?.trend || [];
  const breakdown = data?.breakdown || {};
  const meta = data?.meta || {};

  const todayMetrics = [
    {
      icon: Eye,
      label: t('home.stats.today_views', '今日访问量'),
      value: summary.todayViews,
      meta: `${t('home.stats.today_visitors', '今日独立访客')} ${formatCompactNumber(summary.todayVisitors)}`,
      accentClass: 'text-violet-300',
      featured: true
    },
    {
      icon: Upload,
      label: t('home.stats.today_uploads', '今日作品上传'),
      value: summary.todayUploads,
      meta: `${t('home.stats.week_upload_growth', '近 7 日上传增幅')} ${formatPercentage(growth.uploadsChange)}`,
      accentClass: 'text-emerald-300'
    }
  ];

  const totalMetrics = [
    {
      icon: Activity,
      label: t('home.stats.total_views', '累计访问量'),
      value: summary.totalViews,
      meta: `${t('home.stats.seven_day_visits', '近 7 日访问')} ${formatCompactNumber(growth.views7d)}`
    },
    {
      icon: Upload,
      label: t('home.stats.total_uploads', '累计作品量'),
      value: summary.totalUploads,
      meta: `${t('home.stats.seven_day_uploads', '近 7 日上传')} ${formatCompactNumber(growth.uploads7d)}`
    },
    {
      icon: Heart,
      label: t('home.stats.total_engagement', '累计互动量'),
      value: summary.totalEngagement,
      meta: `${t('home.stats.active_creators', '活跃创作者')} ${formatCompactNumber(summary.activeCreators)}`
    },
    {
      icon: TrendingUp,
      label: t('home.stats.total_visitors', '累计独立访客'),
      value: summary.totalVisitors,
      meta: `${t('home.stats.registered_users', '注册用户')} ${formatCompactNumber(summary.totalUsers)}`
    }
  ];

  const contentSummary = [
    { label: '活动', value: breakdown.events || 0 },
    { label: '文章', value: breakdown.articles || 0 },
    { label: '照片', value: breakdown.photos || 0 },
    { label: '视频', value: breakdown.videos || 0 },
    { label: '音乐', value: breakdown.music || 0 }
  ];

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="max-w-[1440px] mx-auto">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-[11px] sm:text-xs font-medium uppercase tracking-[0.32em] text-white/50 backdrop-blur-xl">
            <Sparkles size={13} />
            {t('home.stats.eyebrow', '平台热度')}
          </div>
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[5.35rem] font-black tracking-[-0.065em] text-white leading-[0.88]">
                <span className="block text-white/92">{t('home.stats.title', '平台最近的使用情况')}</span>
                <span className="block bg-gradient-to-r from-white via-white to-white/65 bg-clip-text text-transparent">在这里一眼看清</span>
              </h2>
              <p className="mt-5 text-base sm:text-lg text-white/45 leading-8 max-w-3xl">
                {t('home.stats.subtitle', '这里展示最近访问、作品上传和内容规模，帮助用户快速了解平台近况。')}
              </p>
            </div>
            <div className="inline-flex items-center gap-3 rounded-[1.35rem] border border-emerald-400/15 bg-emerald-400/[0.07] px-5 py-4 backdrop-blur-xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <TrendingUp size={19} />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-white/42">{t('home.stats.weekly_growth', '周增长')}</p>
                <p className="text-[2.15rem] sm:text-[2.8rem] font-black tracking-[-0.055em] text-white leading-none">{formatPercentage(growth.viewsChange)}</p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[15px] text-white/34">{formatRelativeTime(meta.updatedAt || meta.generatedAt)}</p>
        </motion.div>

        {loading ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-2xl">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {[...Array(2)].map((_, index) => (
                  <div key={index} className="h-40 rounded-[1.75rem] bg-white/[0.04] animate-pulse" />
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-32 rounded-[1.5rem] bg-white/[0.04] animate-pulse" />
                ))}
              </div>
              <div className="grid gap-6 xl:grid-cols-2">
                {[...Array(2)].map((_, index) => (
                  <div key={index} className="h-80 rounded-[1.75rem] bg-white/[0.04] animate-pulse" />
                ))}
              </div>
              <div className="h-24 rounded-[1.5rem] bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        ) : (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.55 }}
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.025))] p-6 sm:p-8 backdrop-blur-3xl shadow-[0_28px_80px_rgba(0,0,0,0.18)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_62%)] blur-3xl opacity-70" />
            <div className="space-y-6">
              <div>
                <SectionTitle eyebrow="TODAY" title="今日平台动态" meta={null} />
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  {todayMetrics.map((metric) => (
                    <TodayCard key={metric.label} {...metric} reduceMotion={prefersReducedMotion} />
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle eyebrow="TOTAL" title="累计数据概览" meta={null} />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mt-4">
                  {totalMetrics.map((metric) => (
                    <TotalCard key={metric.label} {...metric} reduceMotion={prefersReducedMotion} />
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle eyebrow="TREND" title="最近 7 天数据趋势" meta="最近 7 天" />
                <div className="grid gap-6 xl:grid-cols-2 mt-4">
                  <TrendBars
                    title="访问趋势"
                    colorClass="bg-violet-400/90"
                    values={trend.map(item => item.views || 0)}
                    labels={trend.map(item => item.label)}
                    totalLabel="近 7 日访问"
                    totalValue={growth.views7d}
                  />
                  <TrendBars
                    title="上传趋势"
                    colorClass="bg-emerald-400/90"
                    values={trend.map(item => item.uploads || 0)}
                    labels={trend.map(item => item.label)}
                    totalLabel="近 7 日上传"
                    totalValue={growth.uploads7d}
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6 backdrop-blur-2xl shadow-[0_18px_48px_rgba(0,0,0,0.12)]">
                <SectionTitle
                  eyebrow="CONTENT"
                  title="当前内容分布"
                  meta={`${t('home.stats.total_engagement', '累计互动量')} ${formatCompactNumber(summary.totalEngagement)}`}
                />
                <div className="flex flex-wrap gap-2.5 mt-4">
                  {contentSummary.map(item => (
                    <div key={item.label} className="rounded-full border border-white/10 bg-black/20 px-4 py-2.5 text-[15px] text-gray-300">
                      <span>{item.label}</span>
                      <span className="ml-2 font-bold text-white">{formatCompactNumber(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PlatformStats;
