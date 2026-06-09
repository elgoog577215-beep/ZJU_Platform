import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Clock3, ExternalLink, Flame, Newspaper, Pin, PlusCircle } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useCachedResource } from '../hooks/useCachedResource';
import api from '../services/api';
import CommunityDetailModal from './CommunityDetailModal';
import CommunityFeedPanel from './CommunityFeedPanel';
import UnifiedCommunityComposer from './UnifiedCommunityComposer';
import { parseContentBlocks, calculateReadingTime } from './communityUtils';

const NEWS_STATUS_TABS = [
  { key: 'approved', label: 'community.status_published' },
  { key: 'draft', label: 'community.status_draft' },
  { key: 'pending', label: 'community.status_pending' },
  { key: 'rejected', label: 'community.status_rejected' },
];

const sortLabels = {
  hot: 'community.news_hot',
  latest: 'community.news_latest',
};

const CommunityNewsBoard = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isDayMode = uiMode === 'day';
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromUserProfileRef = useRef(Boolean(location.state?.fromUserProfile));
  const [sort, setSort] = useState('hot');
  const [viewMode, setViewMode] = useState('approved');
  const [selectedNews, setSelectedNews] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingNews, setEditingNews] = useState(null);

  const queryParams = useMemo(() => {
    const params = { page: 1, limit: 12, sort, status: viewMode };
    if (user && viewMode !== 'approved' && !isAdmin) params.uploader_id = user.id;
    return params;
  }, [isAdmin, sort, user, viewMode]);

  const { data, loading, error, refresh } = useCachedResource('/news', queryParams, {
    dependencies: [sort, viewMode, user?.id, isAdmin],
    keyPrefix: 'cache:v4:',
  });
  const list = Array.isArray(data) ? data : [];
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

  const openEditor = async (item = null) => {
    if (!user) {
      toast.error(t('auth.signin_required'));
      return;
    }
    if (item?.id) {
      try {
        const { data: detail } = await api.get(`/news/${item.id}`);
        setEditingNews(detail || item);
      } catch {
        toast.error(t('community.load_failed', '加载失败'));
        return;
      }
    } else {
      setEditingNews(null);
    }
    setComposerOpen(true);
  };

  const renderCard = (item, index, { canAnimate, isDayMode: dm }) => (
    <button
      key={item.id}
      type="button"
      onClick={() => handleOpen(item)}
      className={`group w-full rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 md:p-5 ${
        dm ? 'border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.045)] hover:border-slate-300' : 'border-white/10 bg-white/[0.045] hover:bg-white/[0.07]'
      } ${canAnimate ? 'animate-in fade-in slide-in-from-bottom-2 duration-300' : ''}`}
    >
      <div className="flex gap-4">
        {item.cover ? (
          <img src={item.cover} alt="" className="h-24 w-32 rounded-md object-cover md:h-28 md:w-40" />
        ) : (
          <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-md border md:h-28 md:w-32 ${dm ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-white/10 bg-white/[0.04] text-gray-500'}`}>
            <Newspaper size={26} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className={`mb-2 flex flex-wrap items-center gap-2 text-xs ${dm ? 'text-slate-500' : 'text-gray-400'}`}>
            {item.is_pinned ? <span className="inline-flex items-center gap-1"><Pin size={12} />{t('common.pinned', '置顶')}</span> : null}
            <span>{item.source_name || t('community.news_source_internal', '站内新闻')}</span>
            <span className="inline-flex items-center gap-1"><Clock3 size={12} />{calculateReadingTime(item.content, t)}</span>
            {item.status !== 'approved' ? <span>{item.status}</span> : null}
          </div>
          <h3 className={`line-clamp-2 text-lg font-black md:text-2xl ${dm ? 'text-slate-950 group-hover:text-sky-700' : 'text-white group-hover:text-sky-300'}`}>
            {item.title}
          </h3>
          <p className={`mt-2 line-clamp-2 text-sm leading-6 ${dm ? 'text-slate-500' : 'text-gray-400'}`}>
            {item.excerpt || item.content}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className={`inline-flex items-center gap-1 text-xs ${dm ? 'text-slate-500' : 'text-gray-400'}`}>
              <Flame size={13} />
              {Number(item.hot_score || 0)}
            </span>
            {(isAdmin || item.uploader_id === user?.id) && (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => { event.stopPropagation(); openEditor(item); }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${dm ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-white/10 text-gray-300 hover:bg-white/10'}`}
              >
                {t('common.edit', '编辑')}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );

  const extraControls = (
    <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border p-1 ${isDayMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/10'}`}>
        <button type="button" onClick={() => setSort('hot')} className={`min-h-[34px] rounded-md px-3 text-xs font-semibold ${sort === 'hot' ? (isDayMode ? 'bg-white text-slate-950 shadow' : 'bg-sky-500 text-white') : (isDayMode ? 'text-slate-600' : 'text-gray-300')}`}>{t(sortLabels.hot, '热榜')}</button>
        <button type="button" onClick={() => setSort('latest')} className={`min-h-[34px] rounded-md px-3 text-xs font-semibold ${sort === 'latest' ? (isDayMode ? 'bg-white text-slate-950 shadow' : 'bg-sky-500 text-white') : (isDayMode ? 'text-slate-600' : 'text-gray-300')}`}>{t(sortLabels.latest, '最新')}</button>
      </div>
      {user ? (
        <div className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border p-1 ${isDayMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/10'}`}>
          {NEWS_STATUS_TABS.map((item) => (
            <button key={item.key} type="button" onClick={() => setViewMode(item.key)} className={`min-h-[34px] rounded-md px-3 text-xs font-semibold whitespace-nowrap ${viewMode === item.key ? (isDayMode ? 'bg-white text-slate-950 shadow' : 'bg-white/15 text-white') : (isDayMode ? 'text-slate-600' : 'text-gray-300')}`}>
              {t(item.label, item.key)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  const renderDetail = () => (
    <CommunityDetailModal
      item={selectedNews}
      onClose={handleCloseDetail}
      isDayMode={isDayMode}
      gradientFrom={isDayMode ? 'from-slate-100' : 'from-sky-900/40'}
      headerHeight="h-72 sm:h-96"
      coverImage={selectedNews?.cover}
      headerContent={selectedNews && (
        <>
          <div className={`mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] ${isDayMode ? 'text-sky-700' : 'text-sky-300'}`}>
            {selectedNews.source_name || t('community.news_source_internal', '站内新闻')}
          </div>
          <h2 className={`text-4xl font-black leading-tight md:text-6xl ${isDayMode ? 'text-slate-950' : 'text-white drop-shadow-2xl'}`}>{selectedNews.title}</h2>
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
          hasActiveFilters: viewMode !== 'approved' || sort !== 'hot',
          resetFilters: () => { setViewMode('approved'); setSort('hot'); },
          searchQuery: '',
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
        onNewPost={() => openEditor()}
        hideSortSelector
      />
      <UnifiedCommunityComposer
        isOpen={composerOpen}
        boardKey="news"
        initialData={editingNews}
        onClose={() => { setComposerOpen(false); setEditingNews(null); }}
        onSuccess={() => refresh({ clearCache: true })}
      />
    </>
  );
};

export default CommunityNewsBoard;
