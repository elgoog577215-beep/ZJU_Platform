import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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

const Articles = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [sort, setSort] = useState('newest');
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
    sort
  }, {
    dependencies: [settings.pagination_enabled]
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

  const calculateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} ${t('common.min_read')}`;
  };

  const addArticle = (newItem) => {
    api.post('/articles', newItem)
    .then(() => {
        mutate(`/articles?page=${currentPage}&limit=${limit}&sort=${sort}`);
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
    <section className="pt-24 pb-40 md:py-24 px-4 md:px-8 min-h-screen flex items-center justify-center relative z-10">
      <div className="max-w-5xl w-full mx-auto relative">
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
        <div className="flex flex-wrap justify-center items-center gap-4 mb-12">
          <SortSelector sort={sort} onSortChange={setSort} />
        </div>

        <div className="space-y-6">
          {error && (
            <div className="text-center py-20 text-gray-500">
                <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
                <p className="text-gray-300 mb-6">{t('common.error_fetching_data') || 'Failed to load articles'}</p>
                <button 
                  onClick={() => mutate(`/articles?page=${currentPage}&limit=${limit}&sort=${sort}`)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
                >
                  {t('common.retry') || 'Retry'}
                </button>
            </div>
          )}
          {articles.length === 0 && !isLoading && !error && (
            <div className="text-center py-20 text-gray-500">
              <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('articles.no_articles')}</p>
            </div>
          )}
          {articles.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              onClick={() => setSelectedArticle(article)}
              className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 transition-all hover:border-white/20 cursor-pointer overflow-hidden hover:shadow-2xl hover:shadow-orange-500/10"
            >
              {/* Shine Effect */}
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-2xl">
                  <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full shine-effect" />
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

                <div className="absolute top-4 right-4 flex gap-2 md:hidden">
                  <FavoriteButton 
                    itemId={article.id}
                    itemType="article"
                    size={16}
                    showCount={true}
                    count={article.likes || 0}
                    className="p-2 bg-black/50 hover:bg-orange-500 rounded-full backdrop-blur-md transition-all group/btn border border-white/10"
                    onToggle={(favorited, likes) => {
                        // Optimistically update the SWR cache
                        mutate(
                            `/articles?page=${currentPage}&limit=${limit}&sort=${sort}`,
                            (data) => {
                                if (!data) return data;
                                return {
                                    ...data,
                                    data: data.data.map(a => 
                                        a.id === article.id ? { ...a, likes: likes !== undefined ? likes : a.likes } : a
                                    )
                                };
                            },
                            false // Don't revalidate immediately
                        );
                    }}
                  />
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-3">
                  <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {article.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {calculateReadingTime(article.content)}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-orange-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 line-clamp-2">
                    {article.excerpt}
                  </p>
                </div>

                <div className="hidden md:flex flex-col items-center justify-between pl-4 border-l border-white/5 py-2">
                   <div className="flex flex-col gap-3 items-center">
                       <FavoriteButton 
                        itemId={article.id}
                        itemType="article"
                        size={16}
                        showCount={true}
                        count={article.likes || 0}
                        className="p-2 bg-white/5 hover:bg-orange-500 rounded-full backdrop-blur-md transition-all border border-white/10"
                        onToggle={(favorited, likes) => {
                            setArticles(prev => prev.map(a => 
                                a.id === article.id ? { ...a, likes: likes !== undefined ? likes : a.likes } : a
                            ));
                        }}
                      />
                   </div>
                   <div className="p-3 rounded-full bg-white/5 group-hover:bg-orange-500 group-hover:text-black transition-all duration-300">
                      <ArrowRight size={20} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {settings.pagination_enabled === 'true' && (
            <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={handlePageChange} 
            />
        )}
      </div>

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
                  className="h-48 bg-gradient-to-br from-orange-900/40 to-black relative bg-cover bg-center"
                  style={selectedArticle.cover ? { backgroundImage: `url(${selectedArticle.cover})` } : {}}
                >
                  {!selectedArticle.cover && <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 to-black" />}
                  <button 
                    onClick={() => setSelectedArticle(null)}
                    className="absolute top-6 right-6 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors z-10"
                  >
                    <X size={24} />
                  </button>
                  <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0a0a0a] to-transparent">
                    <div className="flex items-center gap-3 text-xs font-mono text-orange-300 mb-2">
                       <span>{selectedArticle.date}</span>
                       <span>•</span>
                       <span>{calculateReadingTime(selectedArticle.content)}</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold font-serif text-white leading-tight">
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
                      className="p-3 bg-white/5 hover:bg-red-500/20 text-white rounded-full transition-all border border-white/10"
                      onToggle={(favorited, likes) => {
                          setSelectedArticle(prev => ({ ...prev, likes: likes !== undefined ? likes : prev.likes }));
                          mutate(
                              `/articles?page=${currentPage}&limit=${limit}&sort=${sort}`,
                              (data) => {
                                  if (!data) return data;
                                  return {
                                      ...data,
                                      data: data.data.map(a => 
                                          a.id === selectedArticle.id ? { ...a, likes: likes !== undefined ? likes : a.likes } : a
                                      )
                                  };
                              },
                              false
                          );
                      }}
                    />
                  </div>
                  
                  <div 
                    className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                  />


                </div>

              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
