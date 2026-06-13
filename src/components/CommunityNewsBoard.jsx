import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Clock3, ExternalLink, Flame, Newspaper, Pin } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useCachedResource } from '../hooks/useCachedResource';
import api from '../services/api';
import CommunityDetailModal from './CommunityDetailModal';
import CommunityFeedPanel from './CommunityFeedPanel';
import CommunitySearchInput from './CommunitySearchInput';
import UnifiedCommunityComposer from './UnifiedCommunityComposer';
import { parseContentBlocks, calculateReadingTime } from './communityUtils';

const sortLabels = {
  hot: 'community.news_hot',
  latest: 'community.news_latest',
};

const CommunityNewsBoard = ({ onNewPost, hideNewPostButton = false }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isDayMode = uiMode === 'day';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromUserProfileRef = useRef(Boolean(location.state?.fromUserProfile));
  const [sort, setSort] = useState('hot');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNews, setSelectedNews] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const queryParams = useMemo(() => {
    return { page: 1, limit: 12, sort, status: 'approved' };
  }, [sort]);

  const { data, loading, error, refresh } = useCachedResource('/news', queryParams, {
    dependencies: [sort],
    keyPrefix: 'cache:v4:',
  });
  const rawList = Array.isArray(data) ? data : [];
  const list = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return rawList;
    return rawList.filter((item) => [item.title, item.excerpt, item.content, item.source_name].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [rawList, searchQuery]);
  const contentBlocks = useMemo(() => parseContentBlocks(selectedNews?.content_blocks), [selectedNews?.content_blocks]);

  const updateParams = useCallback((next) => {
    const params = new URLSearchParams(searchParams);
    ['id', 'post', 'news', 'group'].forEach((key) => params.delete(key));
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    if (!params.get('postTab')) params.set('postTab', 'news');
    setSearchParams(params, { replace: false });
  }, [searchParams, setSearchParams]);

  React.useEffect(() => {
    const newsId = searchParams.get('news');
    if (!newsId) return;
    let cancelled = false;
    api.get(`/news/${newsId}`)
      .then(({ data: item }) => {
        if (!cancelled) setSelectedNews(item);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [searchParams]);

  const handleOpen = useCallback((item) => {
    setSelectedNews(item);
    updateParams({ postTab: 'news', news: item.id });
  }, [updateParams]);

  const handleCloseDetail = useCallback(() => {
    if (fromUserProfileRef.current) {
      fromUserProfileRef.current = false;
      navigate(-2);
      return;
    }
    setSelectedNews(null);
    updateParams({ postTab: 'news' });
  }, [navigate, updateParams]);

  const openEditor = useCallback(() => {
    if (!user) {
      toast.error(t('auth.signin_required'));
      return;
    }
    setComposerOpen(true);
  }, [t, user]);

  React.useEffect(() => {
    const onOpenComposer = (event) => {
      if (event.detail?.boardKey !== 'news') return;
      openEditor();
    };
    window.addEventListener('open-community-composer', onOpenComposer);
    return () => window.removeEventListener('open-community-composer', onOpenComposer);
  }, [openEditor]);

  React.useEffect(() => {
    const onRefresh = (event) => {
      if (event.detail?.boardKey === 'news') refresh({ clearCache: true });
    };
    window.addEventListener('community-feed-refresh', onRefresh);
    return () => window.removeEventListener('community-feed-refresh', onRefresh);
  }, [refresh]);

  const renderCard = (item, index, { canAnimate, isDayMode: dm }) => (
    <button
      key={item.id}
      type="button"
      onClick={() => handleOpen(item)}
      className={`group w-full rounded-lg border p-3.5 text-left transition-all hover:-translate-y-0.5 md:p-5 ${
        dm ? 'border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.045)] hover:border-slate-300' : 'border-white/10 bg-white/[0.045] hover:bg-white/[0.07]'
      } ${canAnimate ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : ''}`}
    >
      <div className="flex gap-3 md:gap-4">
        {item.cover ? (
          <img src={item.cover} alt="" className="h-24 w-28 shrink-0 rounded-md object-cover sm:w-32 md:h-28 md:w-40" />
        ) : (
          <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-md border md:h-28 md:w-32 ${dm ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-white/10 bg-white/[0.04] text-gray-500'}`}>
            <Newspaper size={26} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className={`mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] md:mb-2 md:text-xs ${dm ? 'text-slate-500' : 'text-gray-400'}`}>
            {item.is_pinned ? <span className="inline-flex items-center gap-1"><Pin size={12} />{t('common.pinned', '置顶')}</span> : null}
            <span>{item.source_name || t('community.news_source_internal', '站内新闻')}</span>
            <span className="inline-flex items-center gap-1"><Clock3 size={12} />{calculateReadingTime(item.content, t)}</span>
          </div>
          <h3 className={`line-clamp-2 text-base font-black leading-snug md:text-2xl ${dm ? 'text-slate-950 group-hover:text-sky-700' : 'text-white group-hover:text-sky-300'}`}>
            {item.title}
          </h3>
          <p className={`mt-1.5 line-clamp-2 text-[13px] leading-5 md:mt-2 md:text-sm md:leading-6 ${dm ? 'text-slate-500' : 'text-gray-400'}`}>
            {item.excerpt || item.content}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 md:mt-3">
            <span className={`inline-flex items-center gap-1 text-xs ${dm ? 'text-slate-500' : 'text-gray-400'}`}>
              <Flame size={13} />
              {Number(item.hot_score || 0)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );

  const extraControls = (
    <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <CommunitySearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery('')}
        placeholder={t('community.news_search_placeholder', '搜索新闻热点')}
        isDayMode={isDayMode}
        className="md:flex-1"
      />
      <div className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border p-1 ${isDayMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/10'}`}>
        <button type="button" onClick={() => setSort('hot')} className={`min-h-[34px] rounded-md px-3 text-xs font-semibold ${sort === 'hot' ? (isDayMode ? 'bg-white text-slate-950 shadow' : 'bg-sky-500 text-white') : (isDayMode ? 'text-slate-600' : 'text-gray-300')}`}>{t(sortLabels.hot, '热榜')}</button>
        <button type="button" onClick={() => setSort('latest')} className={`min-h-[34px] rounded-md px-3 text-xs font-semibold ${sort === 'latest' ? (isDayMode ? 'bg-white text-slate-950 shadow' : 'bg-sky-500 text-white') : (isDayMode ? 'text-slate-600' : 'text-gray-300')}`}>{t(sortLabels.latest, '最新')}</button>
      </div>
    </div>
  );

  const renderDetail = () => (
    <CommunityDetailModal
      item={selectedNews}
      onClose={handleCloseDetail}
      isDayMode={isDayMode}
      gradientFrom={isDayMode ? 'from-slate-100' : 'from-sky-900/40'}
      headerHeight="h-56 sm:h-72 md:h-96"
      coverImage={selectedNews?.cover}
      headerContent={selectedNews && (
        <>
          <div className={`mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] ${isDayMode ? 'text-sky-700' : 'text-sky-300'}`}>
            {selectedNews.source_name || t('community.news_source_internal', '站内新闻')}
          </div>
          <h2 className={`text-2xl font-black leading-tight md:text-6xl ${isDayMode ? 'text-slate-950' : 'text-white drop-shadow-2xl'}`}>{selectedNews.title}</h2>
        </>
      )}
      contentBlocks={contentBlocks}
      htmlContent={selectedNews?.content}
      afterContent={selectedNews?.source_url ? (
        <a href={selectedNews.source_url} target="_blank" rel="noopener noreferrer" className={`mt-6 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${isDayMode ? 'border-sky-200 text-sky-700 hover:bg-sky-50' : 'border-sky-400/30 text-sky-200 hover:bg-sky-500/10'}`}>
          {t('community.open_original', '查看原文')}
          <ExternalLink size={15} />
        </a>
      ) : null}
    />
  );

  return (
    <>
      <CommunityFeedPanel
        feed={{
          displayItems: list,
          isLoading: loading,
          error,
          currentPage: 1,
          totalPages: 1,
          hasMore: false,
          isPaginationEnabled: false,
          sort,
          setSort,
          statusFilter: 'all',
          setStatusFilter: () => {},
          handlePageChange: () => {},
          setCurrentPage: () => {},
          handleRefresh: () => refresh({ clearCache: true }),
          hasActiveFilters: sort !== 'hot' || Boolean(searchQuery.trim()),
          resetFilters: () => { setSort('hot'); setSearchQuery(''); },
          searchQuery,
          isSearchPending: false,
        }}
        isDayMode={isDayMode}
        renderCard={renderCard}
        renderDetail={renderDetail}
        emptyIcon={Newspaper}
        emptyTitle={t('community.news_empty', '暂无新闻')}
        emptyDesc={t('community.news_empty_desc', '新闻内容正在建设中，敬请期待。')}
        accentColor="blue"
        extraControls={extraControls}
        onNewPost={onNewPost || (() => openEditor())}
        hideNewPostButton={hideNewPostButton}
        hideSortSelector
      />
      <UnifiedCommunityComposer
        isOpen={composerOpen}
        boardKey="news"
        onClose={() => setComposerOpen(false)}
        onSuccess={() => refresh({ clearCache: true })}
      />
    </>
  );
};

export default CommunityNewsBoard;
