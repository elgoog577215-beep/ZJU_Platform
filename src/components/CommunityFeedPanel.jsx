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
  featuredSection,
  extraBottom,
  newPostLabel,
  skeletonCount = 5,
  renderSkeleton,
  sortOptions,
  hideSortSelector = false,
  hideMobileSummary = false,
  hideNewPostButton = false,
}) => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const th = communityTheme(isDayMode);
  const newPostText = newPostLabel || t('community.post_new', '发帖');
  const {
    displayItems, isLoading, error, currentPage, totalPages, hasMore,
    isPaginationEnabled, sort, setSort, statusFilter, setStatusFilter,
    handlePageChange, setCurrentPage, handleRefresh, hasActiveFilters,
    resetFilters, searchQuery, isSearchPending,
  } = feed;

  const gradientFrom = isDayMode
    ? 'from-slate-100 to-slate-50'
    : ({
        amber: 'from-amber-500/10 to-orange-500/10',
        violet: 'from-violet-500/10 to-purple-500/10',
        blue: 'from-blue-500/10 to-indigo-500/10',
        orange: 'from-orange-500/10 to-red-500/10',
        green: 'from-emerald-500/10 to-teal-500/10',
      }[accentColor] || 'from-amber-500/10 to-orange-500/10');

  const emptyBorder = {
    amber: isDayMode ? 'bg-white border-slate-200/80' : 'bg-amber-500/10 border-white/5',
    violet: isDayMode ? 'bg-white border-slate-200/80' : 'bg-violet-500/10 border-white/5',
    blue: isDayMode ? 'bg-white border-slate-200/80' : 'bg-blue-500/10 border-white/5',
    orange: isDayMode ? 'bg-white border-slate-200/80' : 'border-white/5',
    green: isDayMode ? 'bg-white border-slate-200/80' : 'bg-emerald-500/10 border-white/5',
  }[accentColor];

  const accentBtnClass = {
    amber: isDayMode ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-[0_4px_12px_rgba(245,158,11,0.10)]' : 'bg-amber-600 text-white border-amber-600',
    violet: isDayMode ? 'bg-violet-50 text-violet-700 border-violet-200 shadow-[0_4px_12px_rgba(139,92,246,0.10)]' : 'bg-violet-600 text-white border-violet-600',
    blue: isDayMode ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-[0_4px_12px_rgba(14,165,233,0.10)]' : 'bg-blue-600 text-white border-blue-600',
    orange: isDayMode ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-[0_4px_12px_rgba(249,115,22,0.10)]' : 'bg-orange-600 text-white border-orange-600',
    green: isDayMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_4px_12px_rgba(16,185,129,0.10)]' : 'bg-emerald-600 text-white border-emerald-600',
  }[accentColor];

  const emptyIconClass = {
    amber: 'text-amber-400',
    violet: 'text-violet-400',
    blue: 'text-blue-400',
    orange: 'text-orange-400',
    green: 'text-emerald-400',
  }[accentColor] || 'text-amber-400';

  const statusControl = statusTabs ? (
    <div className={`scrollbar-none flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-lg border p-1 sm:w-auto ${isDayMode ? 'border-slate-200/70 bg-slate-50' : 'border-white/10 bg-black/10'}`}>
      {statusTabs.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={statusFilter === key}
          onClick={() => setStatusFilter(key)}
          className={`min-h-[34px] min-w-fit rounded-md px-3 text-xs font-semibold transition-all whitespace-nowrap md:px-3.5 ${
            statusFilter === key
              ? accentBtnClass
              : (isDayMode ? 'text-slate-600 hover:bg-white hover:text-slate-950' : 'text-gray-400 hover:bg-white/10')
          }`}
        >
          {t(label)}
        </button>
      ))}
    </div>
  ) : null;

  const sortControl = !hideSortSelector ? (
    <div className="w-full min-w-[9.5rem] sm:w-44 md:w-48">
      <SortSelector
        sort={sort}
        onSortChange={setSort}
        options={sortOptions}
        className="w-full"
        buttonClassName={isDayMode
          ? 'border border-slate-200 bg-white text-slate-700 rounded-lg px-3 py-2 min-h-[40px] text-sm font-medium hover:bg-slate-50'
          : 'border border-white/10 bg-white/5 text-white rounded-lg px-3 py-2 min-h-[40px] text-sm font-medium hover:bg-white/10'}
      />
    </div>
  ) : null;

  const defaultSkeleton = (i) => (
    <div key={i} className={`border rounded-lg p-5 md:p-6 animate-pulse ${th.card}`}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className={`h-5 rounded-md w-14 ${th.skeleton}`} />
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
      <div className={`mb-4 flex flex-col gap-2.5 rounded-lg border p-3 md:mb-6 md:gap-3 md:p-4 max-md:border-transparent max-md:bg-transparent max-md:p-0 max-md:shadow-none ${isDayMode ? 'bg-white/82 border-slate-200/70 shadow-[0_10px_26px_rgba(15,23,42,0.04)]' : 'bg-white/[0.035] border-white/10'}`}>
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          {extraControls ? (
            <div className="min-w-0">{extraControls}</div>
          ) : null}

          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
            {statusControl}
            {sortControl}
            {onNewPost && !hideNewPostButton && (
              <button
                onClick={onNewPost}
                className={`hidden min-h-[40px] items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-all md:inline-flex ${accentBtnClass}`}
                title={newPostText}
              >
                <Upload size={18} className="md:w-5 md:h-5" />
                <span>{newPostText}</span>
              </button>
            )}
          </div>
        </div>
        {onNewPost && !hideNewPostButton ? (
          <button
            type="button"
            onClick={onNewPost}
            className={`inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-all md:hidden ${accentBtnClass}`}
            title={newPostText}
          >
            <Upload size={18} />
            <span>{newPostText}</span>
          </button>
        ) : null}
        <div className={`${hideMobileSummary ? 'hidden md:flex' : 'flex'} flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs max-md:border-transparent max-md:px-1 max-md:pt-0 ${isDayMode ? 'border-slate-200/60 text-slate-500' : 'border-white/10 text-gray-400'}`}>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={th.textSecondary}>
              {displayItems.length} {t('community.results_count', '条结果')}
            </span>
            {hasActiveFilters ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${isDayMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                {t('community.filtered_view', '已应用筛选')}
              </span>
            ) : null}
            {searchQuery?.trim() ? (
              <span className="truncate max-w-[220px]">
                {t('community.searching_for', '搜索')} &quot;{searchQuery.trim()}&quot;
              </span>
            ) : null}
            {isSearchPending ? (
              <span>{t('common.loading', '加载中')}...</span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className={`px-2.5 py-1 rounded-md transition-colors ${isDayMode ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-300 hover:bg-white/10'}`}
              >
                {t('community.clear_filters', '清除筛选')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleRefresh}
              className={`px-2.5 py-1 rounded-md transition-colors ${isDayMode ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-300 hover:bg-white/10'}`}
            >
              {t('common.refresh', '刷新')}
            </button>
          </div>
        </div>
      </div>

      {/* Item list */}
      {featuredSection}

      <div className="space-y-4">
        {isLoading && displayItems.length === 0 ? (
          [...Array(skeletonCount)].map((_, i) => renderSkeleton ? renderSkeleton(i) : defaultSkeleton(i))
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="bg-red-500/10 rounded-lg p-6 mb-6 border border-red-500/20 backdrop-blur-xl">
              <AlertCircle size={48} className="text-red-400 opacity-80" />
            </div>
            <p className={`mb-6 text-lg ${th.textContent}`}>{t('common.error_fetching_data')}</p>
            <button onClick={handleRefresh} className={`px-8 py-3 rounded-lg transition-all border font-medium hover:scale-105 active:scale-95 ${th.btnSecondary}`}>
              {t('common.retry')}
            </button>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className={`bg-gradient-to-br ${gradientFrom} rounded-lg p-8 mb-6 border ${isDayMode ? 'shadow-none' : 'backdrop-blur-xl shadow-xl'} ${emptyBorder}`}>
              {EmptyIcon && <EmptyIcon size={64} className={`${emptyIconClass} opacity-80`} />}
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${th.textPrimary}`}>
              {hasActiveFilters ? t('community.no_filtered_results', '没有符合当前条件的内容') : emptyTitle}
            </h3>
            <p className={`text-center max-w-md ${th.textSecondary}`}>
              {hasActiveFilters
                ? t('community.no_filtered_results_desc', '可以清除筛选条件，或调整搜索词后重试。')
                : emptyDesc}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className={`mt-5 px-6 py-2.5 rounded-lg border transition-colors text-sm font-semibold ${th.btnSecondary}`}
              >
                {t('community.clear_filters', '清除筛选')}
              </button>
            ) : null}
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
            className={`px-6 py-2.5 rounded-lg border transition-colors text-sm font-semibold ${th.btnLoadMore}`}
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
