import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, User, Calendar, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STATUS_CONFIG = {
  // help statuses
  open: { label: 'community.post_status_open', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20', dayBg: 'bg-amber-50', dayText: 'text-amber-600', dayBorder: 'border-amber-200' },
  solved: { label: 'community.post_status_solved', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20', dayBg: 'bg-emerald-50', dayText: 'text-emerald-600', dayBorder: 'border-emerald-200' },
  closed: { label: 'community.post_status_closed', bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/20', dayBg: 'bg-gray-100', dayText: 'text-gray-600', dayBorder: 'border-gray-200' },
  // team statuses
  recruiting: { label: 'community.post_status_recruiting', bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/20', dayBg: 'bg-violet-50', dayText: 'text-violet-600', dayBorder: 'border-violet-200' },
  full: { label: 'community.post_status_full', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20', dayBg: 'bg-blue-50', dayText: 'text-blue-600', dayBorder: 'border-blue-200' },
  published: { label: 'community.post_status_published', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20', dayBg: 'bg-emerald-50', dayText: 'text-emerald-600', dayBorder: 'border-emerald-200' },
  // fallback for legacy 'approved' / 'pending'
  approved: { label: 'community.post_status_open', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20', dayBg: 'bg-amber-50', dayText: 'text-amber-600', dayBorder: 'border-amber-200' },
  draft: { label: 'community.status_draft', bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/20', dayBg: 'bg-slate-100', dayText: 'text-slate-600', dayBorder: 'border-slate-200' },
  pending: { label: 'community.post_status_pending', bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/20', dayBg: 'bg-yellow-50', dayText: 'text-yellow-600', dayBorder: 'border-yellow-200' },
  rejected: { label: 'community.status_rejected', bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/20', dayBg: 'bg-rose-50', dayText: 'text-rose-600', dayBorder: 'border-rose-200' },
};

const formatRelativeTime = (dateStr, language = 'zh-CN') => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  const locale = String(language || '').startsWith('zh') ? 'zh-CN' : 'en';
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffMin < 1) return formatter.format(0, 'minute');
  if (diffMin < 60) return formatter.format(-diffMin, 'minute');
  if (diffHr < 24) return formatter.format(-diffHr, 'hour');
  if (diffDay < 30) return formatter.format(-diffDay, 'day');
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

const PostCard = memo(({ post, index, onClick, canAnimate, isDayMode }) => {
  const { t, i18n } = useTranslation();
  const isTeam = post.section === 'team';
  const visibleStatus = post.review_status && post.review_status !== 'approved' ? post.review_status : post.status;
  const statusCfg = STATUS_CONFIG[visibleStatus] || STATUS_CONFIG.open;

  const accentHover = isTeam ? 'hover:border-violet-500/30' : 'hover:border-amber-500/30';
  const accentShadow = isTeam
    ? 'hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.15)]'
    : 'hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)]';
  const titleHover = isTeam ? 'group-hover:text-violet-400' : 'group-hover:text-amber-400';

  const progress = isTeam && post.max_members ? Math.min((post.current_members || 0) / post.max_members, 1) : 0;

  return (
    <motion.div
      initial={canAnimate ? { opacity: 0, y: 14 } : false}
      animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={canAnimate ? { duration: 0.24, delay: Math.min(index, 5) * 0.03 } : undefined}
      onClick={() => onClick(post)}
      className={`group relative overflow-hidden rounded-lg border p-3.5 backdrop-blur-xl transition-all duration-300 md:p-5 ${accentHover} cursor-pointer ${accentShadow} hover:-translate-y-0.5 ${isDayMode ? 'bg-white/82 hover:bg-white border-slate-200/80 shadow-[0_12px_30px_rgba(15,23,42,0.07)]' : 'bg-white/[0.045] hover:bg-white/[0.07] border-white/10'}`}
    >
      <div className="flex-1 space-y-2 md:space-y-2.5">
        {/* Status + Time */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${isDayMode ? `${statusCfg.dayBg} ${statusCfg.dayText} ${statusCfg.dayBorder}` : `${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}`}>
            {t(statusCfg.label)}
          </span>
          <span className={`text-xs font-mono ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
            {formatRelativeTime(post.created_at, i18n.language)}
          </span>
        </div>

        {/* Title */}
        <h3 className={`text-base font-bold md:text-xl ${titleHover} transition-colors leading-snug ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className={`line-clamp-2 text-[13px] leading-5 md:text-sm ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
          {post.excerpt || post.content}
        </p>

        {/* Team: deadline + members progress */}
        {isTeam && post.max_members && (
          <div className="space-y-2 pt-1">
            <div className={`flex items-center gap-4 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {post.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {t('community.post_deadline_prefix', '截止')}: {post.deadline}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users size={12} />
                {post.current_members || 0}/{post.max_members} {t('community.post_members_unit', '人')}
              </span>
            </div>
            {/* Progress bar */}
            <div className={`w-full h-1.5 rounded-sm overflow-hidden ${isDayMode ? 'bg-slate-100' : 'bg-white/10'}`}>
              <div
                className={`h-full rounded-sm transition-all duration-500 ${progress >= 1 ? (isDayMode ? 'bg-blue-500' : 'bg-blue-400') : (isDayMode ? 'bg-violet-500' : 'bg-violet-400')}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer: author + replies */}
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
          <span className="flex min-w-0 items-center gap-1">
            <User size={12} />
            <span className="max-w-[8rem] truncate">{post.author_name || t('common.anonymous', '匿名用户')}</span>
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={12} />
            {post.comments_count || 0}{t('community.post_replies_unit', '回复')}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
PostCard.displayName = 'PostCard';

export default PostCard;
