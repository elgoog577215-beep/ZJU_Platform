import React, { useEffect, useMemo, useCallback, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ArrowRight, Calendar, X, User, Clock, Edit2, RotateCcw, Trash2, AlertCircle, Clock3, Search, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import SmartImage from './SmartImage';
import UploadModal from './UploadModal';
import FavoriteButton from './FavoriteButton';
import SortSelector from './SortSelector';
import TagFilter from './TagFilter';
import CommunityDetailModal from './CommunityDetailModal';
import CommunityFeedPanel from './CommunityFeedPanel';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { parseContentBlocks, calculateReadingTime } from './communityUtils';
import { useCommunityFeed } from '../hooks/useCommunityFeed';

const VIEW_MODES = [
  { key: 'public', label: '全部' },
  { key: 'mine', label: '我的投稿' },
  { key: 'draft', label: '草稿箱' },
  { key: 'pending', label: '待审核' },
  { key: 'rejected', label: '已驳回' },
  { key: 'trash', label: '回收站' },
];

const STATUS_META = {
  draft: {
    label: '草稿',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeDark: 'bg-white/10 text-gray-300 border-white/20',
  },
  pending: {
    label: '待审核',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeDark: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  rejected: {
    label: '已驳回',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeDark: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  },
  approved: {
    label: '已发布',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeDark: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
};

const ArticleCard = memo(({
  article,
  index,
  onClick,
  onToggleFavorite,
  canAnimate,
  isDayMode,
  actionBar = null,
  workflowView = false,
}) => {
  const { t } = useTranslation();
  const statusMeta = STATUS_META[article.status] || STATUS_META.approved;

  return (
    <motion.div
      initial={canAnimate ? { opacity: 0, y: 14 } : false}
      animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={canAnimate ? { duration: 0.24, delay: Math.min(index, 5) * 0.03 } : undefined}
      onClick={() => onClick(article)}
      className={`group relative backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300 hover:border-orange-500/30 cursor-pointer overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.15)] hover:-translate-y-1 ${isDayMode ? 'bg-white/82 hover:bg-white border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)]' : 'bg-[#1a1a1a]/60 hover:bg-[#1a1a1a]/80 border-white/10'}`}
    >
      <div className="flex flex-col md:flex-row gap-6">
        {article.cover && (
          <div className="w-full md:w-48 h-48 md:h-32 rounded-xl overflow-hidden flex-shrink-0">
            <SmartImage
              src={article.cover}
              alt={article.title}
              type="article"
              className="w-full h-full"
              imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              iconSize={32}
            />
          </div>
        )}
        <div className="flex-1 flex flex-col justify-center space-y-3">
          {workflowView && (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[11px] border ${isDayMode ? statusMeta.badge : statusMeta.badgeDark}`}>
                {statusMeta.label}
              </span>
              {article.status === 'rejected' && article.rejection_reason ? (
                <span className={`text-xs ${isDayMode ? 'text-rose-700' : 'text-rose-300'}`}>
                  驳回原因：{article.rejection_reason}
                </span>
              ) : null}
            </div>
          )}
          <div className={`flex items-center gap-3 text-xs font-mono ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {article.author_name ? (
              <>
                <span className="flex items-center gap-1"><User size={12} />{article.author_name}</span>
                <span>•</span>
              </>
            ) : null}
            <span className="flex items-center gap-1"><Calendar size={12} />{article.date}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock size={12} />{calculateReadingTime(article.content, t)}</span>
          </div>
          <h3 className={`text-2xl font-bold group-hover:text-orange-400 transition-colors ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
            {article.title}
          </h3>
          <p className={`line-clamp-2 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{article.excerpt}</p>
          <div className="pt-2 flex items-center justify-end gap-3 mt-auto">
            {actionBar}
            <FavoriteButton
              itemId={article.id}
              itemType="article"
              size={18}
              showCount
              count={article.likes || 0}
              initialFavorited={article.favorited}
              className={`p-2 rounded-full transition-colors hover:text-orange-500 ${isDayMode ? 'hover:bg-orange-50 text-slate-500' : 'hover:bg-white/10 text-gray-400'}`}
              onToggle={(favorited, likes) => onToggleFavorite(article.id, favorited, likes)}
            />
            <div className={`p-2 rounded-full group-hover:bg-orange-500 group-hover:text-black transition-all duration-300 ${isDayMode ? 'bg-orange-50 text-orange-500' : 'bg-white/5'}`}>
              <ArrowRight size={18} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ArticleCard.displayName = 'ArticleCard';

const CommunityTech = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const isDayMode = uiMode === 'day';
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const [viewMode, setViewMode] = useState('public');
  const [editingArticle, setEditingArticle] = useState(null);

  const techQueryParams = useMemo(() => {
    if (!user) return {};
    if (viewMode === 'mine') return { status: 'all', uploader_id: user.id };
    if (viewMode === 'draft') return { status: 'draft', uploader_id: user.id };
    if (viewMode === 'pending') return { status: 'pending', uploader_id: user.id };
    if (viewMode === 'rejected') return { status: 'rejected', uploader_id: user.id };
    if (viewMode === 'trash') return { status: 'all', uploader_id: user.id, trashed: true };
    return {};
  }, [user, viewMode]);

  const feed = useCommunityFeed({
    endpoint: '/articles',
    category: 'tech',
    deepLinkParam: 'id',
    defaultPageSize: 6,
    extraQueryParams: techQueryParams,
    extraDependencies: [viewMode, user?.id],
  });

  const mobileSortLabel = useMemo(() => {
    const labels = {
      newest: t('sort_filter.newest', '最新'),
      oldest: t('sort_filter.oldest', '最早'),
      likes: t('sort_filter.likes', '最热'),
      title: t('sort_filter.title', '标题'),
    };
    return labels[feed.sort] || labels.newest;
  }, [feed.sort, t]);

  const featuredArticle = useMemo(() => {
    if (viewMode !== 'public' || feed.searchQuery.trim()) return null;
    return (feed.displayItems || []).find((item) => item.featured) || null;
  }, [feed.displayItems, feed.searchQuery, viewMode]);

  const panelItems = useMemo(
    () => (featuredArticle ? (feed.displayItems || []).filter((item) => item.id !== featuredArticle.id) : (feed.displayItems || [])),
    [feed.displayItems, featuredArticle]
  );
  const panelFeed = useMemo(() => ({ ...feed, displayItems: panelItems }), [feed, panelItems]);

  const contentBlocks = useMemo(() => parseContentBlocks(feed.selectedItem?.content_blocks), [feed.selectedItem?.content_blocks]);

  useEffect(() => {
    const onUpload = (event) => {
      if (event.detail.type === 'article') setIsUploadOpen(true);
    };
    const onFilter = () => {
      setIsMobileSortOpen(false);
      setIsMobileFilterOpen((prev) => !prev);
    };
    const onSort = () => {
      setIsMobileFilterOpen(false);
      setIsMobileSortOpen((prev) => !prev);
    };
    window.addEventListener('open-upload-modal', onUpload);
    window.addEventListener('toggle-mobile-filter', onFilter);
    window.addEventListener('toggle-mobile-sort', onSort);
    return () => {
      window.removeEventListener('open-upload-modal', onUpload);
      window.removeEventListener('toggle-mobile-filter', onFilter);
      window.removeEventListener('toggle-mobile-sort', onSort);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('set-mobile-toolbar-state', {
      detail: {
        filterCount: feed.selectedTags.length,
        sortLabel: mobileSortLabel,
      },
    }));
  }, [feed.selectedTags.length, mobileSortLabel]);

  const updateParams = useCallback((next) => {
    const params = new URLSearchParams(searchParams);
    ['id', 'post', 'news', 'group'].forEach((key) => params.delete(key));
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    if (!params.get('tab')) params.set('tab', 'tech');
    setSearchParams(params, { replace: false });
  }, [searchParams, setSearchParams]);

  const handleOpenArticle = useCallback((article) => {
    feed.handleItemClick(article);
    updateParams({ tab: 'tech', id: article.id });
    api.post('/community/metrics/track', {
      metric_type: 'article_view',
      source_type: 'article',
      source_id: article.id,
    }).catch(() => {});
  }, [feed, updateParams]);

  const handleCloseDetail = useCallback(() => {
    feed.setSelectedItem(null);
    updateParams({ tab: 'tech' });
  }, [feed, updateParams]);

  const handleOpenEditor = useCallback(async (article) => {
    try {
      const { data } = await api.get(`/articles/${article.id}`);
      setEditingArticle(data || article);
      setIsUploadOpen(true);
    } catch {
      toast.error('加载投稿详情失败');
    }
  }, []);

  const handleSoftDelete = useCallback(async (article) => {
    if (!window.confirm('确认将该投稿移入回收站吗？')) return;
    try {
      await api.delete(`/articles/${article.id}`);
      toast.success('已移入回收站');
      feed.handleRefresh();
      if (feed.selectedItem?.id === article.id) {
        handleCloseDetail();
      }
    } catch (error) {
      toast.error(error?.response?.data?.error || '删除失败');
    }
  }, [feed, handleCloseDetail]);

  const handleRecover = useCallback(async (article) => {
    try {
      await api.post(`/articles/${article.id}/recover`);
      toast.success('已从回收站恢复');
      feed.handleRefresh();
    } catch (error) {
      toast.error(error?.response?.data?.error || '恢复失败');
    }
  }, [feed]);

  const handleToggleFeatured = useCallback(async (article) => {
    try {
      await api.put(`/articles/${article.id}`, {
        ...article,
        category: 'tech',
        featured: !article.featured,
      });
      toast.success(article.featured ? '已取消精选' : '已设为精选');
      feed.handleRefresh();
    } catch (error) {
      toast.error(error?.response?.data?.error || '更新精选状态失败');
    }
  }, [feed]);

  const handleRelatedSelect = useCallback((resource) => {
    if (!resource?.id) return;
    if (resource.type === 'article') {
      updateParams({ tab: 'tech', id: resource.id });
      return;
    }
    if (resource.type === 'post') {
      updateParams({ tab: 'help', post: resource.id });
      return;
    }
    if (resource.type === 'group') {
      if (feed.selectedItem?.id) {
        api.post('/community/metrics/track', {
          metric_type: 'article_to_group_click',
          source_type: 'article',
          source_id: feed.selectedItem.id,
          target_type: 'group',
          target_id: resource.id,
        }).catch(() => {});
      }
      updateParams({ tab: 'groups', group: resource.id });
      return;
    }
    if (resource.type === 'news') {
      updateParams({ tab: searchParams.get('tab') || 'tech', news: resource.id });
    }
  }, [feed.selectedItem?.id, searchParams, updateParams]);

  const renderCard = (article, index, { canAnimate, isDayMode: currentDayMode }) => {
    const workflowView = ['mine', 'draft', 'pending', 'rejected', 'trash'].includes(viewMode);
    const workflowActionBar = workflowView ? (
      <div className="flex items-center gap-2">
        {viewMode !== 'trash' ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenEditor(article);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${currentDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10'}`}
          >
            <Edit2 size={12} />
            {article.status === 'rejected' ? '编辑并重提' : '编辑'}
          </button>
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleRecover(article);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${currentDayMode ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' : 'text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10'}`}
          >
            <RotateCcw size={12} />
            恢复
          </button>
        )}
        {viewMode !== 'trash' ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleSoftDelete(article);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${currentDayMode ? 'text-rose-700 border-rose-200 hover:bg-rose-50' : 'text-rose-300 border-rose-500/30 hover:bg-rose-500/10'}`}
          >
            <Trash2 size={12} />
            删除
          </button>
        ) : null}
      </div>
    ) : null;

    const adminActionBar = isAdmin ? (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          handleToggleFeatured(article);
        }}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${article.featured ? (currentDayMode ? 'text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100' : 'text-amber-300 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20') : (currentDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10')}`}
      >
        <Sparkles size={12} />
        {article.featured ? '取消精选' : '设为精选'}
      </button>
    ) : null;

    const actionBar = (workflowActionBar || adminActionBar) ? (
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {workflowActionBar}
        {adminActionBar}
      </div>
    ) : null;

    return (
      <ArticleCard
        key={article.id}
        article={article}
        index={index}
        onClick={handleOpenArticle}
        onToggleFavorite={feed.handleToggleFavorite}
        canAnimate={canAnimate}
        isDayMode={currentDayMode}
        actionBar={actionBar}
        workflowView={workflowView}
      />
    );
  };

  const handleUpload = async (item) => {
    if (item.id) {
      await api.put(`/articles/${item.id}`, { ...item, category: 'tech' });
    } else {
      await api.post('/articles', { ...item, category: 'tech' });
    }
    feed.handleRefresh();
    setEditingArticle(null);
  };

  const featuredSection = featuredArticle ? (
    <div className={`mb-5 rounded-[30px] border p-5 md:p-6 ${isDayMode ? 'bg-gradient-to-br from-orange-50 via-white to-amber-50 border-orange-200/80' : 'bg-gradient-to-br from-orange-500/10 via-white/[0.03] to-amber-500/10 border-orange-500/20'}`}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className={isDayMode ? 'text-orange-600' : 'text-orange-300'} />
        <span className={`text-xs uppercase tracking-[0.22em] ${isDayMode ? 'text-orange-700' : 'text-orange-300'}`}>精选文章</span>
      </div>
      <ArticleCard
        article={featuredArticle}
        index={0}
        onClick={handleOpenArticle}
        onToggleFavorite={feed.handleToggleFavorite}
        canAnimate={false}
        isDayMode={isDayMode}
      />
    </div>
  ) : null;

  const viewModeSwitch = user ? (
    <div className={`rounded-xl border p-1 inline-flex gap-1 flex-wrap ${isDayMode ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
      {VIEW_MODES.map((mode) => (
        <button
          key={mode.key}
          type="button"
          onClick={() => setViewMode(mode.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${viewMode === mode.key ? (isDayMode ? 'bg-orange-500 text-white' : 'bg-orange-500 text-black') : (isDayMode ? 'text-slate-600' : 'text-gray-300')}`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  ) : null;

  const extraControls = (
    <div className="flex-1">
      {user ? <div className="md:hidden mb-3">{viewModeSwitch}</div> : null}
      <div className="space-y-3">
        <div className={`flex items-center gap-2 rounded-2xl border px-3 py-2 ${isDayMode ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
          <Search size={16} className={isDayMode ? 'text-slate-400' : 'text-gray-500'} />
          <input
            value={feed.searchQuery}
            onChange={(event) => feed.setSearchQuery(event.target.value)}
            placeholder="搜索文章标题、标签、摘要或正文"
            className={`w-full bg-transparent text-sm outline-none ${isDayMode ? 'text-slate-700 placeholder:text-slate-400' : 'text-gray-200 placeholder:text-gray-500'}`}
          />
          {feed.searchQuery ? (
            <button
              type="button"
              onClick={() => feed.setSearchQuery('')}
              className={`text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}
            >
              清空
            </button>
          ) : null}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <TagFilter selectedTags={feed.selectedTags} onChange={feed.setSelectedTags} type="articles" />
          {viewModeSwitch ? <div className="ml-auto">{viewModeSwitch}</div> : null}
        </div>
      </div>
    </div>
  );

  const renderDetail = () => (
    <CommunityDetailModal
      item={feed.selectedItem}
      onClose={handleCloseDetail}
      isDayMode={isDayMode}
      gradientFrom="from-orange-900/40"
      headerHeight="h-72 sm:h-96"
      coverImage={feed.selectedItem?.cover}
      shareParam="id"
      onRelatedSelect={handleRelatedSelect}
      headerContent={feed.selectedItem ? (
        <>
          <div className={`flex items-center gap-3 font-bold text-lg md:text-xl uppercase tracking-[0.2em] mb-4 ${isDayMode ? 'text-orange-500' : 'text-orange-300 drop-shadow-lg'}`}>
            <span>{feed.selectedItem.date}</span>
          </div>
          <h2 className={`text-4xl md:text-6xl font-black leading-[0.95] tracking-tight font-serif ${isDayMode ? 'text-slate-900' : 'text-white drop-shadow-2xl'}`}>
            {feed.selectedItem.title}
          </h2>
        </>
      ) : null}
      authorBar={feed.selectedItem ? (
        <FavoriteButton
          itemId={feed.selectedItem.id}
          itemType="article"
          size={24}
          showCount
          count={feed.selectedItem.likes || 0}
          initialFavorited={feed.selectedItem.favorited}
          className={`p-3 rounded-full transition-all border ${isDayMode ? 'bg-white/85 hover:bg-red-50 text-slate-700 border-slate-200/80' : 'bg-white/5 hover:bg-red-500/20 text-white border-white/10'}`}
          onToggle={(favorited, likes) => feed.handleToggleFavorite(feed.selectedItem.id, favorited, likes)}
        />
      ) : null}
      contentBlocks={contentBlocks}
      htmlContent={feed.selectedItem?.content}
    />
  );

  const mobileDrawers = (
    <>
      {createPortal(
        <AnimatePresence>
          {isMobileFilterOpen ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileFilterOpen(false)}
                className={`fixed inset-0 backdrop-blur-sm z-[100] md:hidden ${isDayMode ? 'bg-white/55' : 'bg-black/60'}`}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className={`fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit backdrop-blur-xl border rounded-3xl z-[101] md:hidden flex flex-col max-h-[80vh] max-w-md mx-auto ${isDayMode ? 'bg-white/95 border-slate-200/80' : 'bg-[#1a1a1a]/95 border-white/10'}`}
              >
                <div className={`p-4 border-b flex justify-between items-center ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
                  <h3 className={`text-lg font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('common.filters', '筛选')}</h3>
                  <button onClick={() => setIsMobileFilterOpen(false)} className={`p-2 rounded-full ${isDayMode ? 'text-slate-500 bg-slate-100' : 'text-gray-400 bg-white/5'}`}>
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 min-h-0">
                  <TagFilter selectedTags={feed.selectedTags} onChange={feed.setSelectedTags} type="articles" variant="sheet" />
                </div>
                <div className={`p-4 border-t flex gap-3 ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
                  <button
                    onClick={() => feed.setSelectedTags([])}
                    disabled={!feed.selectedTags.length}
                    className={`flex-1 py-3 rounded-2xl border disabled:opacity-40 ${isDayMode ? 'border-slate-200/80 bg-slate-100/90 text-slate-600' : 'border-white/10 bg-white/5 text-gray-200'}`}
                  >
                    {t('common.clear_all', '重置')}
                  </button>
                  <button onClick={() => setIsMobileFilterOpen(false)} className="flex-1 py-3 rounded-2xl bg-white text-black font-semibold">
                    {t('common.done', '完成')}
                  </button>
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
      {createPortal(
        <AnimatePresence>
          {isMobileSortOpen ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSortOpen(false)}
                className={`fixed inset-0 backdrop-blur-sm z-[100] md:hidden ${isDayMode ? 'bg-white/55' : 'bg-black/60'}`}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className={`fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit backdrop-blur-xl border rounded-3xl z-[101] md:hidden flex flex-col max-w-sm mx-auto ${isDayMode ? 'bg-white/95 border-slate-200/80' : 'bg-[#1a1a1a]/95 border-white/10'}`}
              >
                <div className={`p-4 border-b flex justify-between items-center ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
                  <h3 className={`text-lg font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('common.sort', '排序')}</h3>
                  <button onClick={() => setIsMobileSortOpen(false)} className={`p-2 rounded-full ${isDayMode ? 'text-slate-500 bg-slate-100' : 'text-gray-400 bg-white/5'}`}>
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4">
                  <SortSelector
                    sort={feed.sort}
                    onSortChange={(value) => {
                      feed.setSort(value);
                      setTimeout(() => setIsMobileSortOpen(false), 300);
                    }}
                    className="w-full"
                    renderMode="list"
                  />
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </>
  );

  return (
    <>
      <CommunityFeedPanel
        feed={panelFeed}
        isDayMode={isDayMode}
        renderCard={renderCard}
        renderDetail={renderDetail}
        emptyIcon={BookOpen}
        emptyTitle={t('articles.no_articles')}
        emptyDesc={t('articles.subtitle')}
        accentColor="orange"
        extraControls={extraControls}
        featuredSection={featuredSection}
        onNewPost={() => {
          if (!user) {
            toast.error(t('auth.signin_required'));
            return;
          }
          setIsUploadOpen(true);
        }}
        renderSkeleton={(index) => (
          <div key={index} className={`backdrop-blur-xl border rounded-3xl p-6 animate-pulse flex flex-col md:flex-row gap-6 ${isDayMode ? 'bg-white/82 border-slate-200/80' : 'bg-[#1a1a1a]/40 border-white/5'}`}>
            <div className={`w-full md:w-48 h-48 md:h-32 rounded-xl shrink-0 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
            <div className="flex-1 space-y-4 py-2">
              <div className={`h-8 rounded w-3/4 ${isDayMode ? 'bg-slate-100' : 'bg-white/10'}`} />
              <div className={`h-4 rounded w-full ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
            </div>
          </div>
        )}
        extraBottom={(
          <UploadModal
            isOpen={isUploadOpen}
            onClose={() => {
              setIsUploadOpen(false);
              setEditingArticle(null);
            }}
            onUpload={handleUpload}
            type="article"
            initialData={editingArticle}
          />
        )}
      />
      {mobileDrawers}
    </>
  );
};

export default CommunityTech;
