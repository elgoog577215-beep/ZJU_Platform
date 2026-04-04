import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ArrowRight, Calendar, X, User, Tag, Upload, Clock, Check, AlertCircle } from 'lucide-react';
import SmartImage from './SmartImage';
import UploadModal from './UploadModal';
import FavoriteButton from './FavoriteButton';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import SortSelector from './SortSelector';
import { useBackClose } from '../hooks/useBackClose';
import { useCachedResource } from '../hooks/useCachedResource';
import TagFilter from './TagFilter';
import DOMPurify from 'dompurify';
import { useReducedMotion } from '../utils/animations';

const calculateReadingTime = (text, t) => {
    const wordsPerMinute = 200;
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} ${t('common.min_read')}`;
};

const ArticleCard = memo(({ article, index, onClick, onToggleFavorite, canAnimate, isDayMode }) => {
  const { t } = useTranslation();
  
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
          <h3 className={`text-2xl font-bold group-hover:text-orange-400 transition-colors ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
            {article.title}
          </h3>
          <p className={`line-clamp-2 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {article.excerpt}
          </p>
          
          <div className="pt-2 flex items-center justify-between mt-auto">
             <div className="flex gap-2">
             </div>
             <div className="flex items-center gap-3 ml-auto">
                 <FavoriteButton 
                    itemId={article.id}
                    itemType="article"
                    size={18}
                    showCount={true}
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
      </div>
    </motion.div>
  );
});
ArticleCard.displayName = 'ArticleCard';

const Articles = () => {
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [sort, setSort] = useState('newest');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === 'day';
  const isPaginationEnabled = settings.pagination_enabled === 'true';
  const pageSize = isPaginationEnabled ? 6 : 10;
  const [displayArticles, setDisplayArticles] = useState([]);
  const hasActiveMobileFilters = selectedTags.length > 0;
  const mobileSortLabel = useMemo(() => {
    switch (sort) {
      case 'oldest':
        return t('sort_filter.oldest', '最旧');
      case 'likes':
        return t('sort_filter.likes', '最热');
      case 'title':
        return t('sort_filter.title', '标题');
      default:
        return t('sort_filter.newest', '最新');
    }
  }, [sort, t]);

  // Listen for global events from Navbar
  useEffect(() => {
    const handleOpenUpload = (e) => {
        if (e.detail.type === 'article') setIsUploadOpen(true);
    };
    const handleToggleFilter = () => {
        setIsMobileSortOpen(false);
        setIsMobileFilterOpen(prev => !prev);
    };
    const handleToggleSort = () => {
        setIsMobileFilterOpen(false);
        setIsMobileSortOpen(prev => !prev);
    };

    window.addEventListener('open-upload-modal', handleOpenUpload);
    window.addEventListener('toggle-mobile-filter', handleToggleFilter);
    window.addEventListener('toggle-mobile-sort', handleToggleSort);
    return () => {
        window.removeEventListener('open-upload-modal', handleOpenUpload);
        window.removeEventListener('toggle-mobile-filter', handleToggleFilter);
        window.removeEventListener('toggle-mobile-sort', handleToggleSort);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('set-mobile-toolbar-state', {
      detail: {
        filterCount: selectedTags.length,
        sortLabel: mobileSortLabel
      }
    }));
  }, [selectedTags.length, mobileSortLabel]);

  useBackClose(selectedArticle !== null, () => setSelectedArticle(null));

  // Use cached resource hook instead of SWR
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
    tags: selectedTags.join(',')
  }, {
    dependencies: [settings.pagination_enabled, selectedTags.join(',')]
  });

  const totalPages = pagination?.totalPages || 1;
  const hasMore = !isPaginationEnabled && currentPage < totalPages;

  useEffect(() => {
    setCurrentPage(1);
  }, [sort, selectedTags.join(','), settings.pagination_enabled]);

  useEffect(() => {
    if (isPaginationEnabled) {
      setDisplayArticles(articles);
      return;
    }

    setDisplayArticles((prev) => {
      if (currentPage === 1) return articles;
      const seen = new Set(prev.map((item) => item.id));
      const next = articles.filter((item) => !seen.has(item.id));
      return next.length === 0 ? prev : [...prev, ...next];
    });
  }, [articles, currentPage, isPaginationEnabled]);

  // Deep linking
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
        api.get(`/articles/${id}`)
           .then(res => {
               if (res.data) setSelectedArticle(res.data);
           })
           .catch(err => {
               if (process.env.NODE_ENV === 'development') {
                   console.error("Failed to fetch deep linked article", err);
               }
           });
    }
  }, [searchParams]);

  const handleToggleFavorite = useCallback((articleId, favorited, likes) => {
      setArticles(prev => prev.map(a => 
          a.id === articleId ? { ...a, likes: likes !== undefined ? likes : a.likes, favorited } : a
      ));

      setDisplayArticles(prev => prev.map(a =>
        a.id === articleId ? { ...a, likes: likes !== undefined ? likes : a.likes, favorited } : a
      ));
      
      setSelectedArticle(prev => {
          if (prev && prev.id === articleId) {
             return { ...prev, likes: likes !== undefined ? likes : prev.likes, favorited };
          }
          return prev;
      });
  }, [setArticles, setSelectedArticle, setDisplayArticles]);

  const addArticle = (newItem) => {
    api.post('/articles', newItem)
    .then(() => {
        refresh({ clearCache: true });
    })
    .catch(err => {
        if (process.env.NODE_ENV === 'development') {
            console.error("Failed to save article", err);
        }
    });
  };

  const handleUpload = (newItem) => {
    addArticle(newItem);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <section className="pt-24 pb-28 md:py-24 px-4 md:px-8 min-h-screen flex items-center justify-center relative z-10 overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-orange-500/10 blur-[130px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/10 blur-[120px]" />
      </div>

      <div className="max-w-5xl w-full mx-auto relative z-10">
        <div className="absolute right-0 top-0 flex items-center gap-4 z-20">
             <button
              onClick={() => {
                if (!user) {
                  toast.error(t('auth.signin_required'));
                  return;
                }
                setIsUploadOpen(true);
              }}
              className={`p-2 md:p-3 rounded-full backdrop-blur-md border transition-all ${isDayMode ? 'bg-white/85 hover:bg-white text-slate-700 border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}`}
              title={t('common.upload_article')}
            >
              <Upload size={18} className="md:w-5 md:h-5" />
            </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-6 md:mb-12 text-center relative z-40"
        >
          <div className="hidden md:block">
            <h2 className={`text-4xl md:text-5xl font-bold font-serif mb-4 md:mb-6 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('articles.title')}</h2>
            <p className={`max-w-xl mx-auto text-sm md:text-base ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('articles.subtitle')}</p>
          </div>
          
          <div className="hidden md:flex items-center gap-4 w-full md:w-auto justify-center md:absolute md:right-0 md:top-0">
             <div className="w-40 md:w-48">
               <SortSelector sort={sort} onSortChange={setSort} />
             </div>
             <button
                onClick={() => {
                  if (!user) {
                    toast.error(t('auth.signin_required'));
                    return;
                  }
                  setIsUploadOpen(true);
                }}
                className={`p-2 md:p-3 rounded-full backdrop-blur-md border transition-all ${isDayMode ? 'bg-white/85 hover:bg-white text-slate-700 border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}`}
                title={t('common.upload_article')}
             >
                <Upload size={18} className="md:w-5 md:h-5" />
             </button>
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col items-center gap-6 mb-12">
          <div className="hidden md:block w-full max-w-4xl mx-auto px-4">
             <TagFilter selectedTags={selectedTags} onChange={setSelectedTags} type="articles" />
          </div>
        </div>

        {/* Mobile Filter Drawer (Bottom Sheet) */}
        {createPortal(
          <AnimatePresence>
              {isMobileFilterOpen && (
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
                        className={`fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit backdrop-blur-xl border rounded-3xl z-[101] md:hidden flex flex-col max-h-[80vh] max-w-md mx-auto ${isDayMode ? 'bg-white/95 border-slate-200/80 shadow-[0_24px_60px_rgba(148,163,184,0.22)]' : 'bg-[#1a1a1a]/95 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)]'}`}
                    >
                        <div className={`p-4 border-b flex justify-between items-center sticky top-0 z-10 backdrop-blur-xl rounded-t-3xl ${isDayMode ? 'border-slate-200/80 bg-white/92' : 'border-white/10 bg-[#1a1a1a]/95'}`}>
                            <div>
                                <h3 className={`text-lg font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('common.filters', '筛选')}</h3>
                                <p className={`text-xs mt-1 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('common.filter_by_tags', '标签筛选')}</p>
                            </div>
                            <button onClick={() => setIsMobileFilterOpen(false)} className={`p-2 rounded-full transition-colors ${isDayMode ? 'text-slate-500 hover:text-slate-900 bg-slate-100' : 'text-gray-400 hover:text-white bg-white/5'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <h4 className={`text-sm font-semibold uppercase tracking-wider ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('common.tags', '标签')}</h4>
                                    {selectedTags.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTags([])}
                                            className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full"
                                        >
                                            {t('common.clear_all', '清除全部')}
                                        </button>
                                    )}
                                </div>
                                <TagFilter selectedTags={selectedTags} onChange={setSelectedTags} type="articles" variant="sheet" />
                            </div>
                        </div>
                        <div className={`p-4 border-t backdrop-blur-xl rounded-b-3xl flex items-center gap-3 shrink-0 ${isDayMode ? 'border-slate-200/80 bg-white/92' : 'border-white/10 bg-[#1a1a1a]/95'}`}>
                            <button
                                type="button"
                                onClick={() => setSelectedTags([])}
                                disabled={!hasActiveMobileFilters}
                                className={`flex-1 py-3 rounded-2xl border disabled:opacity-40 disabled:cursor-not-allowed ${isDayMode ? 'border-slate-200/80 bg-slate-100/90 text-slate-600' : 'border-white/10 bg-white/5 text-gray-200'}`}
                            >
                                {t('common.clear_all', '重置')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsMobileFilterOpen(false)}
                                className="flex-1 py-3 rounded-2xl bg-white text-black font-semibold"
                            >
                                {t('common.done', '完成')}
                            </button>
                        </div>
                    </motion.div>
                  </>
              )}
          </AnimatePresence>,
          document.body
        )}

        {/* Mobile Sort Drawer (Bottom Sheet) */}
        {createPortal(
          <AnimatePresence>
              {isMobileSortOpen && (
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
                        className={`fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit backdrop-blur-xl border rounded-3xl z-[101] md:hidden flex flex-col max-w-sm mx-auto ${isDayMode ? 'bg-white/95 border-slate-200/80 shadow-[0_24px_60px_rgba(148,163,184,0.22)]' : 'bg-[#1a1a1a]/95 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)]'}`}
                    >
                        <div className={`p-4 border-b flex justify-between items-center sticky top-0 z-10 backdrop-blur-xl rounded-t-3xl ${isDayMode ? 'border-slate-200/80 bg-white/92' : 'border-white/10 bg-[#1a1a1a]/95'}`}>
                            <div>
                                <h3 className={`text-lg font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('common.sort', '排序')}</h3>
                                <p className={`text-xs mt-1 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('sort_filter.title', '选择排序方式')}</p>
                            </div>
                            <button onClick={() => setIsMobileSortOpen(false)} className={`p-2 rounded-full transition-colors ${isDayMode ? 'text-slate-500 hover:text-slate-900 bg-slate-100' : 'text-gray-400 hover:text-white bg-white/5'}`}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4">
                            <SortSelector 
                                sort={sort} 
                                onSortChange={(val) => {
                                    setSort(val);
                                    setTimeout(() => setIsMobileSortOpen(false), 300);
                                }} 
                                className="w-full"
                                renderMode="list"
                            />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
        )}

        <div className="space-y-6">
          {isLoading && displayArticles.length === 0 ? (
            // Loading Skeletons
            [...Array(5)].map((_, i) => (
              <div key={i} className={`backdrop-blur-xl border rounded-3xl p-6 animate-pulse flex flex-col md:flex-row gap-6 ${isDayMode ? 'bg-white/82 border-slate-200/80' : 'bg-[#1a1a1a]/40 border-white/5'}`}>
                <div className={`w-full md:w-48 h-48 md:h-32 rounded-xl shrink-0 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
                <div className="flex-1 space-y-4 py-2">
                  <div className="flex gap-3">
                    <div className={`h-4 rounded w-24 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
                    <div className={`h-4 rounded w-20 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
                  </div>
                  <div className={`h-8 rounded w-3/4 ${isDayMode ? 'bg-slate-100' : 'bg-white/10'}`} />
                  <div className="space-y-2">
                    <div className={`h-4 rounded w-full ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
                    <div className={`h-4 rounded w-2/3 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
                  </div>
                </div>
              </div>
            ))
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="bg-red-500/10 rounded-full p-6 mb-6 border border-red-500/20 backdrop-blur-xl">
                    <AlertCircle size={48} className="text-red-400 opacity-80" />
                </div>
                <p className={`mb-6 text-lg ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>{t('common.error_fetching_data')}</p>
                <button 
                  onClick={refresh}
                  className={`px-8 py-3 rounded-full transition-all border font-medium hover:scale-105 active:scale-95 ${isDayMode ? 'bg-white/88 hover:bg-white text-slate-700 border-slate-200/80 shadow-[0_14px_32px_rgba(148,163,184,0.14)]' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}`}
                >
                  {t('common.retry')}
                </button>
            </div>
          ) : displayArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className={`bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-3xl p-8 mb-6 border backdrop-blur-xl shadow-xl ${isDayMode ? 'border-orange-100/80 bg-white/72' : 'border-white/5'}`}>
                <BookOpen size={64} className="text-orange-400 opacity-80" />
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('articles.no_articles')}</h3>
              <p className={`text-center max-w-md ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  {t('articles.subtitle')}
              </p>
            </div>
          ) : (
            displayArticles.map((article, index) => (
              <ArticleCard
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

        {!isLoading && !error && displayArticles.length > 0 && !isPaginationEnabled && hasMore && (
          <div className="flex items-center justify-center pt-10">
            <motion.button
              whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className={`px-6 py-2.5 rounded-full border transition-colors text-sm font-semibold ${isDayMode ? 'bg-white/88 hover:bg-white text-slate-700 border-slate-200/80 hover:border-orange-200/80 shadow-[0_14px_32px_rgba(148,163,184,0.14)]' : 'bg-white/10 hover:bg-white/15 text-white border-white/10 hover:border-white/20'}`}
            >
              {t('common.load_more', '加载更多')}
            </motion.button>
          </div>
        )}

        {settings.pagination_enabled === 'true' && (
            <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={handlePageChange} 
            />
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {selectedArticle && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-[100] backdrop-blur-md overflow-y-auto ${isDayMode ? 'bg-white/70' : 'bg-black/90'}`}
              onClick={() => setSelectedArticle(null)}
            >
              <div className="flex min-h-full items-center justify-center p-4 md:p-8">
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className={`relative w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border ${isDayMode ? 'bg-white/96 border-slate-200/80 shadow-[0_28px_80px_rgba(148,163,184,0.24)]' : 'bg-[#0a0a0a] border-white/10'}`}
                >
                  {/* Header Image / Gradient */}
                  <div 
                    className="h-72 sm:h-96 bg-gradient-to-br from-orange-900/40 to-black relative bg-cover bg-center"
                    style={selectedArticle.cover ? { backgroundImage: `url(${selectedArticle.cover})` } : {}}
                  >
                    {!selectedArticle.cover && <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 to-black" />}
                    <button 
                      onClick={() => setSelectedArticle(null)}
                      className={`absolute top-6 right-6 p-2 rounded-full backdrop-blur-md border transition-all z-20 group ${isDayMode ? 'bg-white/82 hover:bg-white text-slate-700 border-slate-200/80' : 'bg-black/40 hover:bg-black/60 text-white border-white/10'}`}
                    >
                      <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                    <div className={`absolute bottom-0 left-0 px-6 pt-6 pb-6 md:px-10 md:pt-10 md:pb-8 w-full z-20 pt-48 -mb-1 backdrop-blur-[2px] ${isDayMode ? 'bg-gradient-to-t from-white via-white/92 to-transparent' : 'bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent'}`}>
                      <div className={`flex items-center gap-3 font-bold text-lg md:text-xl uppercase tracking-[0.2em] mb-4 opacity-100 ${isDayMode ? 'text-orange-500' : 'text-orange-300 drop-shadow-lg'}`}>
                         <span>{selectedArticle.date}</span>
                      </div>
                      <h2 className={`text-4xl md:text-6xl font-black leading-[0.95] tracking-tight font-serif decoration-clone ${isDayMode ? 'text-slate-900' : 'text-white drop-shadow-2xl'}`}>
                        {selectedArticle.title}
                      </h2>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8 md:p-12 pt-4">
                    <div className={`flex items-center justify-between gap-3 mb-8 pb-8 border-b ${isDayMode ? 'border-slate-200/80' : 'border-white/5'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${isDayMode ? 'bg-slate-100' : 'bg-gray-700'}`}>
                          <User size={20} className={isDayMode ? 'text-slate-500' : 'text-gray-400'} />
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('common.admin_name')}</div>
                          <div className={`text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('common.author')}</div>
                        </div>
                      </div>
                      
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
                    </div>
                    
                    <div 
                      className={`prose prose-lg max-w-none leading-relaxed ${isDayMode ? 'prose-slate text-slate-700' : 'prose-invert text-gray-300'}`}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedArticle.content) }}
                    />


                  </div>

                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        type="article"
      />
    </section>
  );
};

export default Articles;
