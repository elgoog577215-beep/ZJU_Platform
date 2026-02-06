import React, { useState, useEffect, useCallback, memo } from 'react';
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
// import useSWR, { mutate } from 'swr'; // Replaced by useCachedResource
import api from '../services/api';
import SortSelector from './SortSelector';
import { useBackClose } from '../hooks/useBackClose';
import { useCachedResource } from '../hooks/useCachedResource';
import TagFilter from './TagFilter';
import DOMPurify from 'dompurify';

const calculateReadingTime = (text, t) => {
    const wordsPerMinute = 200;
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} ${t('common.min_read')}`;
};

const ArticleCard = memo(({ article, index, onClick, onToggleFavorite }) => {
  const { t } = useTranslation();
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
      onClick={() => onClick(article)}
      className="group relative bg-[#1a1a1a]/60 backdrop-blur-xl hover:bg-[#1a1a1a]/80 border border-white/10 rounded-3xl p-6 transition-all duration-300 hover:border-orange-500/30 cursor-pointer overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.15)] hover:-translate-y-1"
    >
      {/* Shine Effect */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-3xl">
          <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full shine-effect" />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Cover Image */}
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
          <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
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
          <h3 className="text-2xl font-bold text-white group-hover:text-orange-400 transition-colors">
            {article.title}
          </h3>
          <p className="text-gray-400 line-clamp-2">
            {article.excerpt}
          </p>
          
          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between mt-auto">
             <div className="flex gap-2">
                {/* Optional: Add tags here if available in future */}
             </div>
             <div className="flex items-center gap-3 ml-auto">
                 <FavoriteButton 
                    itemId={article.id}
                    itemType="article"
                    size={18}
                    showCount={true}
                    count={article.likes || 0}
                    initialFavorited={article.favorited}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-orange-500"
                    onToggle={(favorited, likes) => onToggleFavorite(article.id, favorited, likes)}
                  />
                  <div className="p-2 rounded-full bg-white/5 group-hover:bg-orange-500 group-hover:text-black transition-all duration-300">
                      <ArrowRight size={18} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                  </div>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const Articles = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [sort, setSort] = useState('newest');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useBackClose(selectedArticle !== null, () => setSelectedArticle(null));

  const limit = settings.pagination_enabled === 'true' ? 6 : 1000;
  
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
    limit,
    sort,
    tags: selectedTags.join(',')
  }, {
    dependencies: [settings.pagination_enabled, selectedTags.join(',')]
  });

  const totalPages = pagination?.totalPages || 1;

  // Deep linking
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
        api.get(`/articles/${id}`)
           .then(res => {
               if (res.data) setSelectedArticle(res.data);
           })
           .catch(err => console.error("Failed to fetch deep linked article", err));
    }
  }, [searchParams]);

  const handleToggleFavorite = useCallback((articleId, favorited, likes) => {
      setArticles(prev => prev.map(a => 
          a.id === articleId ? { ...a, likes: likes !== undefined ? likes : a.likes, favorited } : a
      ));
      
      setSelectedArticle(prev => {
          if (prev && prev.id === articleId) {
             return { ...prev, likes: likes !== undefined ? likes : prev.likes, favorited };
          }
          return prev;
      });
  }, [setArticles, setSelectedArticle]);

  const addArticle = (newItem) => {
    api.post('/articles', newItem)
    .then(() => {
        refresh({ clearCache: true });
    })
    .catch(err => console.error("Failed to save article", err));
  };

  const handleUpload = (newItem) => {
    addArticle(newItem);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <section className="pt-24 pb-40 md:py-24 px-4 md:px-8 min-h-screen flex items-center justify-center relative z-10 overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-orange-500/10 blur-[130px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/10 blur-[120px]" />
      </div>

      <div className="max-w-5xl w-full mx-auto relative z-10">
        <div className="absolute right-0 top-0 flex items-center gap-4 z-20">
             <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full backdrop-blur-md border border-white/10 transition-all"
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
          className="mb-8 md:mb-12 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-serif mb-4 md:mb-6">{t('articles.title')}</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">{t('articles.subtitle')}</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col items-center gap-6 mb-12">
          <div className="w-full max-w-4xl mx-auto px-4">
             <TagFilter selectedTags={selectedTags} onChange={setSelectedTags} type="articles" />
          </div>
          <SortSelector sort={sort} onSortChange={setSort} />
        </div>

        <div className="space-y-6">
          {isLoading && articles.length === 0 ? (
            // Loading Skeletons
            [...Array(5)].map((_, i) => (
              <div key={i} className="bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 animate-pulse flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-48 h-48 md:h-32 bg-white/5 rounded-xl shrink-0" />
                <div className="flex-1 space-y-4 py-2">
                  <div className="flex gap-3">
                    <div className="h-4 bg-white/5 rounded w-24" />
                    <div className="h-4 bg-white/5 rounded w-20" />
                  </div>
                  <div className="h-8 bg-white/10 rounded w-3/4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-white/5 rounded w-full" />
                    <div className="h-4 bg-white/5 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="bg-red-500/10 rounded-full p-6 mb-6 border border-red-500/20 backdrop-blur-xl">
                    <AlertCircle size={48} className="text-red-400 opacity-80" />
                </div>
                <p className="text-gray-300 mb-6 text-lg">{t('common.error_fetching_data')}</p>
                <button 
                  onClick={refresh}
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10 font-medium hover:scale-105 active:scale-95"
                >
                  {t('common.retry')}
                </button>
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-3xl p-8 mb-6 border border-white/5 backdrop-blur-xl shadow-xl">
                <BookOpen size={64} className="text-orange-400 opacity-80" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t('articles.no_articles')}</h3>
              <p className="text-gray-400 text-center max-w-md">
                  {t('articles.subtitle')}
              </p>
            </div>
          ) : (
            articles.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                index={index}
                onClick={setSelectedArticle}
                onToggleFavorite={handleToggleFavorite}
              />
            ))
          )}
        </div>

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
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md overflow-y-auto"
              onClick={() => setSelectedArticle(null)}
            >
              <div className="flex min-h-full items-center justify-center p-4 md:p-8">
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-3xl bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                >
                  {/* Header Image / Gradient */}
                  <div 
                    className="h-72 sm:h-96 bg-gradient-to-br from-orange-900/40 to-black relative bg-cover bg-center"
                    style={selectedArticle.cover ? { backgroundImage: `url(${selectedArticle.cover})` } : {}}
                  >
                    {!selectedArticle.cover && <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 to-black" />}
                    <button 
                      onClick={() => setSelectedArticle(null)}
                      className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10 transition-all z-20 group"
                    >
                      <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                    <div className="absolute bottom-0 left-0 px-6 pt-6 pb-6 md:px-10 md:pt-10 md:pb-8 w-full z-20 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent pt-48 -mb-1 backdrop-blur-[2px]">
                      <div className="flex items-center gap-3 text-orange-300 font-bold text-lg md:text-xl uppercase tracking-[0.2em] mb-4 opacity-100 drop-shadow-lg">
                         <span>{selectedArticle.date}</span>
                      </div>
                      <h2 className="text-4xl md:text-6xl font-black text-white leading-[0.95] tracking-tight font-serif drop-shadow-2xl decoration-clone">
                        {selectedArticle.title}
                      </h2>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8 md:p-12 pt-4">
                    <div className="flex items-center justify-between gap-3 mb-8 pb-8 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                          <User size={20} className="text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{t('common.admin_name')}</div>
                          <div className="text-xs text-gray-500">{t('common.author')}</div>
                        </div>
                      </div>
                      
                      <FavoriteButton 
                        itemId={selectedArticle.id}
                        itemType="article"
                        size={24}
                        showCount={true}
                        count={selectedArticle.likes || 0}
                        initialFavorited={selectedArticle.favorited}
                        className="p-3 bg-white/5 hover:bg-red-500/20 text-white rounded-full transition-all border border-white/10"
                        onToggle={(favorited, likes) => handleToggleFavorite(selectedArticle.id, favorited, likes)}
                      />
                    </div>
                    
                    <div 
                      className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed"
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
