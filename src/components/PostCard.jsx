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
  // fallback for legacy 'approved' / 'pending'
  approved: { label: 'community.post_status_open', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20', dayBg: 'bg-amber-50', dayText: 'text-amber-600', dayBorder: 'border-amber-200' },
  pending: { label: 'community.post_status_pending', bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/20', dayBg: 'bg-yellow-50', dayText: 'text-yellow-600', dayBorder: 'border-yellow-200' },
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHr < 24) return `${diffHr}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const PostCard = memo(({ post, index, onClick, canAnimate, isDayMode }) => {
  const { t } = useTranslation();
  const isTeam = post.section === 'team';
  const statusCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.open;

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
      className={`group relative backdrop-blur-xl border rounded-3xl p-5 md:p-6 transition-all duration-300 ${accentHover} cursor-pointer overflow-hidden ${accentShadow} hover:-translate-y-1 ${isDayMode ? 'bg-white/82 hover:bg-white border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)]' : 'bg-[#1a1a1a]/60 hover:bg-[#1a1a1a]/80 border-white/10'}`}
    >
      <div className="flex-1 space-y-2.5">
        {/* Status + Time */}
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${isDayMode ? `${statusCfg.dayBg} ${statusCfg.dayText} ${statusCfg.dayBorder}` : `${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}`}>
            {t(statusCfg.label)}
          </span>
          <span className={`text-xs font-mono ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
            {formatRelativeTime(post.created_at)}
          </span>
        </div>

        {/* Title */}
        <h3 className={`text-lg md:text-xl font-bold ${titleHover} transition-colors leading-snug ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className={`text-sm line-clamp-2 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
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
            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDayMode ? 'bg-slate-100' : 'bg-white/10'}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress >= 1 ? (isDayMode ? 'bg-blue-500' : 'bg-blue-400') : (isDayMode ? 'bg-violet-500' : 'bg-violet-400')}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer: author + replies */}
        <div className={`flex items-center gap-3 pt-1 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
          <span className="flex items-center gap-1">
            <User size={12} />
            {post.author_name || t('common.anonymous', '匿名用户')}
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
