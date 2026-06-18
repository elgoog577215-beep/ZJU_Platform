import React, { useEffect, useMemo, useCallback, useState, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight, Calendar, User, Clock, Sparkles } from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import SmartImage from './SmartImage';
import FavoriteButton from './FavoriteButton';
import CommunityDetailModal from './CommunityDetailModal';
import CommunityFeedPanel from './CommunityFeedPanel';
import CommunitySearchInput from './CommunitySearchInput';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { parseContentBlocks, calculateReadingTime } from './communityUtils';
import { useCommunityFeed } from '../hooks/useCommunityFeed';
import UnifiedCommunityComposer from './UnifiedCommunityComposer';

const ArticleCard = memo(({
  article,
  index,
  onClick,
  onToggleFavorite,
  canAnimate,
  isDayMode,
  actionBar = null,
}) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={canAnimate ? { opacity: 0, y: 14 } : false}
      animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={canAnimate ? { duration: 0.24, delay: Math.min(index, 5) * 0.03 } : undefined}
      onClick={() => onClick(article)}
      className={`group relative overflow-hidden rounded-lg border p-3 transition-all duration-300 hover:-translate-y-0.5 md:p-5 ${isDayMode ? 'bg-white border-slate-200/80 shadow-[0_8px_22px_rgba(15,23,42,0.045)] hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.065)]' : 'bg-white/[0.045] hover:bg-white/[0.07] border-white/10 hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.15)]'}`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${isDayMode ? 'bg-slate-200/80' : 'bg-gradient-to-r from-transparent via-orange-500/20 to-transparent'}`} />
      {isDayMode ? (
        null
      ) : null}
      <div className="flex gap-3 items-start md:gap-6">
        {article.cover && (
          <div className="h-[104px] w-[104px] flex-shrink-0 overflow-hidden rounded-md sm:h-[122px] sm:w-[122px] md:h-32 md:w-48">
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
        <div className="flex min-w-0 flex-1 flex-col justify-center space-y-1.5 md:space-y-3">
          <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono md:text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {article.author_name ? (
              <>
                <span className="flex items-center gap-1 min-w-0 max-w-full truncate"><User size={12} className="shrink-0" />{article.author_name}</span>
                <span>•</span>
              </>
            ) : null}
            <span className="flex items-center gap-1"><Calendar size={12} />{article.date}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock size={12} />{calculateReadingTime(article.content, t)}</span>
          </div>
          <h3 className={`line-clamp-2 text-base font-bold leading-snug transition-colors md:text-2xl md:leading-tight ${isDayMode ? 'text-slate-900 group-hover:text-blue-700' : 'text-white group-hover:text-orange-400'}`}>
            {article.title}
          </h3>
          <p className={`hidden md:block line-clamp-2 text-[15px] leading-7 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{article.excerpt}</p>
          <div className="mt-auto flex items-center justify-end gap-1.5 pt-1 md:gap-3 md:pt-2">
            {actionBar}
            <FavoriteButton
              itemId={article.id}
              itemType="article"
              size={16}
              showCount
              count={article.likes || 0}
              initialFavorited={article.favorited}
              className={`min-h-[40px] min-w-[40px] rounded-md p-1.5 transition-colors md:min-h-0 md:min-w-0 md:p-2 ${isDayMode ? 'hover:bg-slate-100 hover:text-blue-700 text-slate-500' : 'hover:bg-white/10 hover:text-orange-500 text-gray-400'}`}
              onToggle={(favorited, likes) => onToggleFavorite(article.id, favorited, likes)}
            />
            <div className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md p-1.5 transition-all duration-300 md:min-h-0 md:min-w-0 md:p-2 ${isDayMode ? 'bg-slate-100 text-slate-500 group-hover:bg-slate-950 group-hover:text-white' : 'bg-white/5 group-hover:bg-orange-500 group-hover:text-black'}`}>
              <ArrowRight size={16} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ArticleCard.displayName = 'ArticleCard';

const CommunityTech = ({ onNewPost, hideNewPostButton = false }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isDayMode = uiMode === 'day';
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const feed = useCommunityFeed({
    endpoint: '/articles',
    category: 'tech',
    deepLinkParam: 'id',
    defaultPageSize: 6,
  });

  const featuredArticle = useMemo(() => {
    if (feed.searchQuery.trim()) return null;
    return (feed.displayItems || []).find((item) => item.featured) || null;
  }, [feed.displayItems, feed.searchQuery]);

  const panelItems = useMemo(
    () => (featuredArticle ? (feed.displayItems || []).filter((item) => item.id !== featuredArticle.id) : (feed.displayItems || [])),
    [feed.displayItems, featuredArticle]
  );
  const panelFeed = useMemo(() => ({ ...feed, displayItems: panelItems }), [feed, panelItems]);

  const contentBlocks = useMemo(() => parseContentBlocks(feed.selectedItem?.content_blocks), [feed.selectedItem?.content_blocks]);

  const openUpload = useCallback(() => {
    if (!user) {
      toast.error(t('auth.signin_required'));
      return;
    }
    setIsUploadOpen(true);
  }, [t, user]);

  useEffect(() => {
    const onUpload = (event) => {
      if (event.detail.type === 'article') openUpload();
    };
    window.addEventListener('open-upload-modal', onUpload);
    return () => {
      window.removeEventListener('open-upload-modal', onUpload);
    };
  }, [openUpload]);

  useEffect(() => {
    const onRefresh = (event) => {
      if (event.detail?.boardKey === 'tech') feed.handleRefresh();
    };
    window.addEventListener('community-feed-refresh', onRefresh);
    return () => window.removeEventListener('community-feed-refresh', onRefresh);
  }, [feed]);

  const updateParams = useCallback((next) => {
    const params = new URLSearchParams(searchParams);
    ['id', 'post', 'news', 'group'].forEach((key) => params.delete(key));
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    if (!params.get('postTab')) params.set('postTab', 'tech');
    setSearchParams(params, { replace: false });
  }, [searchParams, setSearchParams]);

  const handleOpenArticle = useCallback((article) => {
    feed.handleItemClick(article);
    updateParams({ postTab: 'tech', id: article.id });
    api.post('/community/metrics/track', {
      metric_type: 'article_view',
      source_type: 'article',
      source_id: article.id,
    }).catch(() => {});
  }, [feed, updateParams]);

  // Capture on mount — useCommunityFeed internally calls useBackClose which pushes a
  // hash entry on selectedItem change; that entry's state overwrites location.state.
  // History stack when arriving from /profile favorite OR a user's public profile:
  //   /profile → /articles?postTab=tech&id=X (navigate) → #modal-feed-xxx (useBackClose)
  // So -2 pops both back to the origin.
  const fromFavoritesRef = useRef(location.state?.fromFavorites === true);
  const fromUserProfileRef = useRef(Boolean(location.state?.fromUserProfile));
  const handleCloseDetail = useCallback(() => {
    if (fromFavoritesRef.current) {
      fromFavoritesRef.current = false;
      navigate(-2);
      return;
    }
    if (fromUserProfileRef.current) {
      fromUserProfileRef.current = false;
      navigate(-2);
      return;
    }
    feed.setSelectedItem(null);
    updateParams({ postTab: 'tech' });
  }, [feed, updateParams, navigate]);

  const handleToggleFeatured = useCallback(async (article) => {
    try {
      await api.put(`/articles/${article.id}`, {
        ...article,
        category: 'tech',
        featured: !article.featured,
      });
      toast.success(article.featured ? t('community.featured_disabled', '已取消精选') : t('community.featured_enabled', '已设为精选'));
      feed.handleRefresh();
    } catch (error) {
      toast.error(error?.response?.data?.error || t('community.featured_update_failed', '更新精选状态失败'));
    }
  }, [feed, t]);

  const handleRelatedSelect = (resource) => {
    if (!resource?.id) return;
    if (resource.type === 'article') {
      updateParams({ postTab: 'tech', id: resource.id });
      return;
    }
    if (resource.type === 'post') {
      updateParams({ postTab: resource.section || 'help', post: resource.id });
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
      updateParams({ group: resource.id });
      return;
    }
    if (resource.type === 'news') {
      updateParams({ postTab: searchParams.get('postTab') || 'tech', news: resource.id });
    }
  };

  const renderCard = (article, index, { canAnimate, isDayMode: currentDayMode }) => {
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
        {article.featured ? t('community.unfeature_article', '取消精选') : t('community.feature_article', '设为精选')}
      </button>
    ) : null;

    const actionBar = adminActionBar ? (
      <div className="flex items-center gap-2 flex-wrap justify-end">
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
      />
    );
  };

  const handleUpload = async () => {
    feed.handleRefresh();
  };

  const featuredSection = featuredArticle ? (
    <div className={`mb-5 rounded-none border border-transparent bg-transparent p-0 shadow-none ring-0 backdrop-blur-0 md:rounded-lg md:border md:p-5 ${isDayMode ? 'md:bg-white md:border-slate-200/80 md:shadow-[0_8px_22px_rgba(15,23,42,0.045)]' : 'md:bg-gradient-to-br md:from-orange-500/10 md:via-white/[0.03] md:to-amber-500/10 md:border-orange-500/20'}`}>
      <div className="mb-3 flex items-center justify-between gap-3 px-1 md:mb-4 md:px-0">
        <div className="flex items-center gap-2">
        <Sparkles size={16} className={isDayMode ? 'text-blue-700' : 'text-orange-300'} />
        <span className={`text-xs uppercase tracking-[0.22em] ${isDayMode ? 'text-blue-700' : 'text-orange-300'}`}>{t('community.featured_article', '精选文章')}</span>
        </div>
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

  const extraControls = (
    <CommunitySearchInput
      value={feed.searchQuery}
      onChange={feed.setSearchQuery}
      onClear={() => feed.setSearchQuery('')}
      placeholder={t('community.tech_search_placeholder', '搜索文章标题、摘要或正文')}
      isDayMode={isDayMode}
    />
  );

  const renderDetail = () => (
    <CommunityDetailModal
      item={feed.selectedItem}
      onClose={handleCloseDetail}
      isDayMode={isDayMode}
      gradientFrom={isDayMode ? "from-slate-100" : "from-orange-900/40"}
      headerHeight="h-56 sm:h-72 md:h-96"
      coverImage={feed.selectedItem?.cover}
      shareParam="id"
      onRelatedSelect={handleRelatedSelect}
      headerContent={feed.selectedItem ? (
        <>
          <div className={`flex items-center gap-3 font-bold text-lg md:text-xl uppercase tracking-[0.2em] mb-4 ${isDayMode ? 'text-blue-700' : 'text-orange-300 drop-shadow-lg'}`}>
            <span>{feed.selectedItem.date}</span>
          </div>
          <h2 className={`text-2xl font-black leading-tight tracking-tight md:text-6xl md:leading-[0.95] font-serif ${isDayMode ? 'text-slate-900' : 'text-white drop-shadow-2xl'}`}>
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
          className={`p-3 rounded-md transition-all border ${isDayMode ? 'bg-white/85 hover:bg-red-50 text-slate-700 border-slate-200/80' : 'bg-white/5 hover:bg-red-500/20 text-white border-white/10'}`}
          onToggle={(favorited, likes) => feed.handleToggleFavorite(feed.selectedItem.id, favorited, likes)}
        />
      ) : null}
      contentBlocks={contentBlocks}
      htmlContent={feed.selectedItem?.content}
    />
  );

  return (
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
      onNewPost={onNewPost || openUpload}
      hideNewPostButton={hideNewPostButton}
      renderSkeleton={(index) => (
        <div key={index} className={`backdrop-blur-xl border rounded-lg p-5 animate-pulse flex flex-col md:flex-row gap-6 ${isDayMode ? 'bg-white/60 border-white/75' : 'bg-white/[0.04] border-white/5'}`}>
          <div className={`w-full md:w-48 h-48 md:h-32 rounded-md shrink-0 ${isDayMode ? 'bg-white/70' : 'bg-white/5'}`} />
          <div className="flex-1 space-y-4 py-2">
            <div className={`h-8 rounded w-3/4 ${isDayMode ? 'bg-white/70' : 'bg-white/10'}`} />
            <div className={`h-4 rounded w-full ${isDayMode ? 'bg-white/58' : 'bg-white/5'}`} />
          </div>
        </div>
      )}
      extraBottom={(
        <UnifiedCommunityComposer
          isOpen={isUploadOpen}
          boardKey="tech"
          onClose={() => {
            setIsUploadOpen(false);
          }}
          onSuccess={handleUpload}
        />
      )}
    />
  );
};

export default CommunityTech;
