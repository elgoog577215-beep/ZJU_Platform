import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ArrowRight, Calendar, Upload, Clock, AlertCircle } from 'lucide-react';
import SmartImage from './SmartImage';
import UploadModal from './UploadModal';
import FavoriteButton from './FavoriteButton';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import SortSelector from './SortSelector';
import { useCachedResource } from '../hooks/useCachedResource';
import { useReducedMotion } from '../utils/animations';
import { useBackClose } from '../hooks/useBackClose';
import CommunityDetailModal from './CommunityDetailModal';
import { parseContentBlocks, calculateReadingTime } from './communityUtils';

const NewsCard = memo(({ article, index, onClick, onToggleFavorite, canAnimate, isDayMode }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={canAnimate ? { opacity: 0, y: 14 } : false}
      animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={canAnimate ? { duration: 0.24, delay: Math.min(index, 5) * 0.03 } : undefined}
      onClick={() => onClick(article)}
      className={`group relative backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300 hover:border-blue-500/30 cursor-pointer overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.15)] hover:-translate-y-1 ${isDayMode ? 'bg-white/82 hover:bg-white border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)]' : 'bg-[#1a1a1a]/60 hover:bg-[#1a1a1a]/80 border-white/10'}`}
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
          <div className={`flex items-center gap-3 text-xs font-mono ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {article.date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {calculateReadingTime(article.content, t)}
            </span>
          </div>
          <h3 className={`text-2xl font-bold group-hover:text-blue-400 transition-colors ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
            {article.title}
          </h3>
          <p className={`line-clamp-2 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {article.excerpt}
          </p>

          <div className="pt-2 flex items-center justify-between mt-auto">
            <div className="flex gap-2" />
            <div className="flex items-center gap-3 ml-auto">
              <FavoriteButton
                itemId={article.id}
                itemType="article"
                size={18}
                showCount={true}
                count={article.likes || 0}
                initialFavorited={article.favorited}
                className={`p-2 rounded-full transition-colors hover:text-blue-500 ${isDayMode ? 'hover:bg-blue-50 text-slate-500' : 'hover:bg-white/10 text-gray-400'}`}
                onToggle={(favorited, likes) => onToggleFavorite(article.id, favorited, likes)}
              />
              <div className={`p-2 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 ${isDayMode ? 'bg-blue-50 text-blue-500' : 'bg-white/5'}`}>
                <ArrowRight size={18} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
NewsCard.displayName = 'NewsCard';

const CommunityNews = () => {
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === 'day';
  const isAdmin = user?.role === 'admin';
  const isPaginationEnabled = settings.pagination_enabled === 'true';
  const pageSize = isPaginationEnabled ? 6 : 10;
  const [displayArticles, setDisplayArticles] = useState([]);

  useBackClose(selectedArticle !== null, () => setSelectedArticle(null));

  const {
    data: articles,
    pagination,
    loading: isLoading,
    error,
    setData: setArticles,
    refresh
  } = useCachedResource('/articles', {
    page: currentPage,
    limit: pageSize,
    sort,
    category: 'news'
  }, {
    dependencies: [settings.pagination_enabled]
  });

  const totalPages = pagination?.totalPages || 1;
  const hasMore = !isPaginationEnabled && currentPage < totalPages;

  useEffect(() => {
    setCurrentPage(1);
  }, [sort, settings.pagination_enabled]);

  // FIX: B1 — Guard against null articles to prevent TypeError on .filter()
  const effectiveArticles = articles || [];
  useEffect(() => {
    if (isPaginationEnabled) {
      setDisplayArticles(effectiveArticles);
      return;
    }
    setDisplayArticles((prev) => {
      if (currentPage === 1) return effectiveArticles;
      const seen = new Set(prev.map((item) => item.id));
      const next = effectiveArticles.filter((item) => !seen.has(item.id));
      return next.length === 0 ? prev : [...prev, ...next];
    });
  }, [effectiveArticles, currentPage, isPaginationEnabled]);

  const handleToggleFavorite = useCallback((articleId, favorited, likes) => {
    setArticles(prev => {
      if (!prev) return prev;
      return prev.map(a => a.id === articleId ? { ...a, likes: likes !== undefined ? likes : a.likes, favorited } : a);
    });
    setDisplayArticles(prev => {
      if (!prev) return prev;
      return prev.map(a => a.id === articleId ? { ...a, likes: likes !== undefined ? likes : a.likes, favorited } : a);
    });
    setSelectedArticle(prev => {
      if (prev && prev.id === articleId) {
        return { ...prev, likes: likes !== undefined ? likes : prev.likes, favorited };
      }
      return prev;
    });
  }, [setArticles]);

  const handleUpload = async (newItem) => {
    await api.post('/articles', { ...newItem, category: 'news' });
    await refresh({ clearCache: true });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedContentBlocks = useMemo(
    () => parseContentBlocks(selectedArticle?.content_blocks),
    [selectedArticle?.content_blocks]
  );

  return (
    <div role="tabpanel" aria-labelledby="tab-news">
      {/* Controls */}
      <div className="flex items-center justify-end gap-3 mb-8">
        <div className="w-40 md:w-48">
          <SortSelector sort={sort} onSortChange={setSort} />
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className={`p-2 md:p-3 rounded-full backdrop-blur-md border transition-all ${isDayMode ? 'bg-white/85 hover:bg-white text-slate-700 border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}`}
            title={t('common.upload_article')}
          >
            <Upload size={18} className="md:w-5 md:h-5" />
          </button>
        )}
      </div>

      {/* News List */}
      <div className="space-y-6">
        {isLoading && displayArticles.length === 0 ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className={`backdrop-blur-xl border rounded-3xl p-6 animate-pulse flex flex-col md:flex-row gap-6 ${isDayMode ? 'bg-white/82 border-slate-200/80' : 'bg-[#1a1a1a]/40 border-white/5'}`}>
              <div className={`w-full md:w-48 h-48 md:h-32 rounded-xl shrink-0 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
              <div className="flex-1 space-y-4 py-2">
                <div className={`h-8 rounded w-3/4 ${isDayMode ? 'bg-slate-100' : 'bg-white/10'}`} />
                <div className={`h-4 rounded w-full ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="bg-red-500/10 rounded-full p-6 mb-6 border border-red-500/20 backdrop-blur-xl">
              <AlertCircle size={48} className="text-red-400 opacity-80" />
            </div>
            <p className={`mb-6 text-lg ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>{t('common.error_fetching_data')}</p>
            <button onClick={refresh} className={`px-8 py-3 rounded-full transition-all border font-medium hover:scale-105 active:scale-95 ${isDayMode ? 'bg-white/88 hover:bg-white text-slate-700 border-slate-200/80' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}`}>
              {t('common.retry')}
            </button>
          </div>
        ) : displayArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className={`bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-3xl p-8 mb-6 border backdrop-blur-xl shadow-xl ${isDayMode ? 'border-blue-100/80 bg-white/72' : 'border-white/5'}`}>
              <Newspaper size={64} className="text-blue-400 opacity-80" />
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('community.news_empty', '暂无新闻')}</h3>
            <p className={`text-center max-w-md ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {t('community.news_empty_desc', '新闻内容正在建设中，敬请期待。')}
            </p>
          </div>
        ) : (
          displayArticles.map((article, index) => (
            <NewsCard
              key={article.id}
              article={article}
              index={index}
              onClick={setSelectedArticle}
              onToggleFavorite={handleToggleFavorite}
              canAnimate={!prefersReducedMotion && index < 8}
              isDayMode={isDayMode}
            />
          ))
        )}
      </div>

      {/* Load more */}
      {!isLoading && !error && displayArticles.length > 0 && !isPaginationEnabled && hasMore && (
        <div className="flex items-center justify-center pt-10">
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            className={`px-6 py-2.5 rounded-full border transition-colors text-sm font-semibold ${isDayMode ? 'bg-white/88 hover:bg-white text-slate-700 border-slate-200/80' : 'bg-white/10 hover:bg-white/15 text-white border-white/10'}`}
          >
            {t('common.load_more', '加载更多')}
          </button>
        </div>
      )}

      {isPaginationEnabled && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}

      {/* Article Detail Modal — uses shared CommunityDetailModal */}
      <CommunityDetailModal
        item={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        isDayMode={isDayMode}
        gradientFrom="from-blue-900/40"
        headerHeight="h-72 sm:h-96"
        coverImage={selectedArticle?.cover}
        headerContent={selectedArticle && (
          <>
            <div className={`flex items-center gap-3 font-bold text-lg md:text-xl uppercase tracking-[0.2em] mb-4 ${isDayMode ? 'text-blue-500' : 'text-blue-300 drop-shadow-lg'}`}>
              <span>{selectedArticle.date}</span>
            </div>
            <h2 className={`text-4xl md:text-6xl font-black leading-[0.95] tracking-tight font-serif ${isDayMode ? 'text-slate-900' : 'text-white drop-shadow-2xl'}`}>
              {selectedArticle.title}
            </h2>
          </>
        )}
        authorBar={selectedArticle && (
          <FavoriteButton
            itemId={selectedArticle.id}
            itemType="article"
            size={24}
            showCount={true}
            count={selectedArticle.likes || 0}
            initialFavorited={selectedArticle.favorited}
            className={`p-3 rounded-full transition-all border ${isDayMode ? 'bg-white/85 hover:bg-red-50 text-slate-700 border-slate-200/80' : 'bg-white/5 hover:bg-red-500/20 text-white border border-white/10'}`}
            onToggle={(favorited, likes) => handleToggleFavorite(selectedArticle.id, favorited, likes)}
          />
        )}
        contentBlocks={selectedContentBlocks}
        htmlContent={selectedArticle?.content}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        type="article"
      />
    </div>
  );
};

export default CommunityNews;
