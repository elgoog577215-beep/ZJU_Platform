import React from 'react';
import { motion } from 'framer-motion';
import { Upload, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from '../utils/animations';
import Pagination from './Pagination';
import SortSelector from './SortSelector';
import { communityTheme } from './communityUtils';

/**
 * Shared feed-list panel used by all four community sections.
 *
 * Props:
 *   feed              – return value of useCommunityFeed()
 *   isDayMode         – day/night toggle
 *   renderCard        – (item, index, { canAnimate, isDayMode }) => JSX
 *   renderDetail      – () => JSX — the detail modal / post-detail element
 *   emptyIcon         – Lucide icon component for empty state
 *   emptyTitle        – string
 *   emptyDesc         – string
 *   accentColor       – 'amber'|'violet'|'blue'|'orange' (for empty state gradient)
 *   statusTabs        – optional [{ key, label }] array
 *   onNewPost         – optional callback; shows the "+" button when provided
 *   extraControls     – optional JSX above the list (e.g. tag filters)
 *   extraBottom       – optional JSX below the list (e.g. upload modal, post composer)
 *   skeletonCount     – number of skeleton cards (default 5)
 *   renderSkeleton    – optional custom skeleton renderer
 */
const CommunityFeedPanel = ({
  feed,
  isDayMode,
  renderCard,
  renderDetail,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDesc,
  accentColor = 'amber',
  statusTabs,
  onNewPost,
  extraControls,
  extraBottom,
  skeletonCount = 5,
  renderSkeleton,
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const th = communityTheme(isDayMode);
  const {
    displayItems, isLoading, error, currentPage, totalPages, hasMore,
    isPaginationEnabled, sort, setSort, statusFilter, setStatusFilter,
    handlePageChange, setCurrentPage, handleRefresh,
  } = feed;

  const gradientFrom = {
    amber: 'from-amber-500/10 to-orange-500/10',
    violet: 'from-violet-500/10 to-purple-500/10',
    blue: 'from-blue-500/10 to-indigo-500/10',
    orange: 'from-orange-500/10 to-red-500/10',
  }[accentColor] || 'from-amber-500/10 to-orange-500/10';

  const emptyBorder = {
    amber: isDayMode ? 'bg-amber-50/80 border-amber-100/80' : 'bg-amber-500/10 border-white/5',
    violet: isDayMode ? 'bg-violet-50/80 border-violet-100/80' : 'bg-violet-500/10 border-white/5',
    blue: isDayMode ? 'bg-blue-50/80 border-blue-100/80' : 'bg-blue-500/10 border-white/5',
    orange: isDayMode ? 'bg-white/72 border-orange-100/80' : 'border-white/5',
  }[accentColor];

  const accentBtnClass = {
    amber: isDayMode ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-amber-600 text-white border-amber-600',
    violet: isDayMode ? 'bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-500/20' : 'bg-violet-600 text-white border-violet-600',
    blue: isDayMode ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-blue-600 text-white border-blue-600',
    orange: isDayMode ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-orange-600 text-white border-orange-600',
  }[accentColor];

  const defaultSkeleton = (i) => (
    <div key={i} className={`backdrop-blur-xl border rounded-3xl p-5 md:p-6 animate-pulse ${th.card}`}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className={`h-5 rounded-full w-14 ${th.skeleton}`} />
          <div className={`h-5 rounded w-20 ${th.skeleton}`} />
        </div>
        <div className={`h-6 rounded w-3/4 ${th.skeletonStrong}`} />
        <div className={`h-4 rounded w-full ${th.skeleton}`} />
      </div>
    </div>
  );

  return (
    <div role="tabpanel">
      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-3">
          {/* Status tabs */}
          {statusTabs && (
            <div className="flex items-center gap-2 overflow-x-auto">
              {statusTabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                    statusFilter === key
                      ? accentBtnClass
                      : (isDayMode ? 'bg-white/80 text-slate-600 border-slate-200/80 hover:bg-slate-50' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10')
                  }`}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          )}

          {!statusTabs && extraControls}

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className={`${statusTabs ? 'hidden md:block' : ''} w-40 md:w-48`}>
              <SortSelector sort={sort} onSortChange={setSort} />
            </div>
            {onNewPost && (
              <button
                onClick={onNewPost}
                className={`p-2 md:p-3 rounded-full backdrop-blur-md border transition-all ${th.btnSecondary}`}
                title={t('community.post_new', '发帖')}
              >
                <Upload size={18} className="md:w-5 md:h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Item list */}
      <div className="space-y-4">
        {isLoading && displayItems.length === 0 ? (
          [...Array(skeletonCount)].map((_, i) => renderSkeleton ? renderSkeleton(i) : defaultSkeleton(i))
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="bg-red-500/10 rounded-full p-6 mb-6 border border-red-500/20 backdrop-blur-xl">
              <AlertCircle size={48} className="text-red-400 opacity-80" />
            </div>
            <p className={`mb-6 text-lg ${th.textContent}`}>{t('common.error_fetching_data')}</p>
            <button onClick={handleRefresh} className={`px-8 py-3 rounded-full transition-all border font-medium hover:scale-105 active:scale-95 ${th.btnSecondary}`}>
              {t('common.retry')}
            </button>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className={`bg-gradient-to-br ${gradientFrom} rounded-3xl p-8 mb-6 border backdrop-blur-xl shadow-xl ${emptyBorder}`}>
              {EmptyIcon && <EmptyIcon size={64} className={`text-${accentColor}-400 opacity-80`} />}
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${th.textPrimary}`}>{emptyTitle}</h3>
            <p className={`text-center max-w-md ${th.textSecondary}`}>{emptyDesc}</p>
          </div>
        ) : (
          displayItems.map((item, index) =>
            renderCard(item, index, { canAnimate: !prefersReducedMotion && index < 8, isDayMode }),
          )
        )}
      </div>

      {/* Load more */}
      {!isLoading && !error && displayItems.length > 0 && !isPaginationEnabled && hasMore && (
        <div className="flex items-center justify-center pt-10">
          <motion.button
            whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            className={`px-6 py-2.5 rounded-full border transition-colors text-sm font-semibold ${th.btnLoadMore}`}
          >
            {t('common.load_more', '加载更多')}
          </motion.button>
        </div>
      )}

      {isPaginationEnabled && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}

      {/* Detail modal + extras (composer, upload modal) */}
      {renderDetail && renderDetail()}
      {extraBottom}
    </div>
  );
};

export default CommunityFeedPanel;
