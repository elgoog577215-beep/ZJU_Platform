import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Film, X, Upload, AlertCircle, ArrowRight, Tag } from 'lucide-react';
import UploadModal from './UploadModal';
import FavoriteButton from './FavoriteButton';
import SmartImage from './SmartImage';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import SortSelector from './SortSelector';
import { useSearchParams } from 'react-router-dom';
import { useBackClose } from '../hooks/useBackClose';
import { useCachedResource } from '../hooks/useCachedResource';
import TagFilter from './TagFilter';
import toast from 'react-hot-toast';
import { getThumbnailUrl } from '../utils/imageUtils';

const VideoCard = memo(({ video, index, onClick, onToggleFavorite }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
      onClick={() => onClick(video)}
      className="group relative aspect-video rounded-3xl overflow-hidden bg-[#1a1a1a]/60 backdrop-blur-xl border border-white/10 cursor-pointer hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] hover:border-pink-500/30 transition-all duration-300 hover:-translate-y-1"
    >
      <SmartImage 
        src={getThumbnailUrl(video.thumbnail)} 
        alt={video.title} 
        type="video"
        className="w-full h-full"
        imageClassName="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
        iconSize={48}
      />
      
      {/* New Badge */}
      {video.date && (new Date() - new Date(video.date)) < 7 * 24 * 60 * 60 * 1000 && (
          <div className="absolute top-4 left-4 px-2 py-0.5 rounded-md bg-pink-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg z-20">
              New
          </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />
      
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform duration-300 relative">
          <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <Play size={40} fill="white" className="text-white ml-2 relative z-10" />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
             <h3 className="text-lg md:text-xl font-bold text-white line-clamp-1 flex-1 mr-4">{video.title}</h3>
             
             <div className="flex items-center gap-2">
                <FavoriteButton 
                  itemId={video.id}
                  itemType="video"
                  size={18}
                  showCount={false}
                  favorited={video.favorited}
                  initialFavorited={video.favorited}
                  className="p-2 bg-black/50 hover:bg-pink-500/20 rounded-full backdrop-blur-md transition-colors group/btn border border-white/10 text-white"
                  onToggle={(favorited, likes) => onToggleFavorite(video.id, favorited, likes)}
                />
                <div className="p-2 rounded-full bg-white/20 backdrop-blur-md border border-white/10 group-hover:bg-pink-500 group-hover:text-white transition-all duration-300">
                    <ArrowRight size={18} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                </div>
             </div>
          </div>
          
          {video.tags && (
            <div className="flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                {video.tags.split(',').slice(0, 3).map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-black/40 text-white/80 text-[10px] backdrop-blur-sm border border-white/10 flex items-center gap-1">
                        <Tag size={10} /> #{tag.trim()}
                    </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

VideoCard.displayName = 'VideoCard';

const Videos = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
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
        if (e.detail.type === 'video') setIsUploadOpen(true);
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

  useBackClose(selectedVideo !== null, () => setSelectedVideo(null));
  useBackClose(isUploadOpen, () => setIsUploadOpen(false));

  const limit = settings.pagination_enabled === 'true' ? 12 : 1000;

  const { 
    data: videos, 
    pagination, 
    loading, 
    error, 
    setData: setVideos, 
    refresh 
  } = useCachedResource('/videos', {
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
        api.get(`/videos/${id}`)
           .then(res => {
               if (res.data) setSelectedVideo(res.data);
           })
           .catch(err => console.error("Failed to fetch deep linked video", err));
    }
  }, [searchParams]);

  const addVideo = (newItem) => {
      api.post('/videos', newItem)
    .then(() => {
        refresh({ clearCache: true });
    })
    .catch(err => console.error("Failed to save video", err));
  };

  const handleUpload = (newItem) => {
      addVideo(newItem);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFavorite = useCallback((videoId, favorited, likes) => {
    setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, likes: likes !== undefined ? likes : v.likes, favorited } : v
    ));
    
    setSelectedVideo(prev => {
        if (prev && prev.id === videoId) {
           return { ...prev, likes: likes !== undefined ? likes : prev.likes, favorited };
        }
        return prev;
    });
  }, [setVideos, setSelectedVideo]);

  return (
    <section className="pt-24 pb-28 md:py-24 px-4 md:px-8 min-h-screen flex items-center justify-center relative z-10 overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-pink-500/10 blur-[130px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-500/10 blur-[120px]" />
      </div>

      <div className="max-w-7xl w-full mx-auto relative z-10">
        <div className="hidden md:flex absolute right-0 top-0 items-center gap-4 z-20">
             <button
              onClick={() => {
                if (!user) {
                  toast.error(t('auth.signin_required'));
                  return;
                }
                setIsUploadOpen(true);
              }}
              className="bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full backdrop-blur-md border border-white/10 transition-all"
              title={t('common.upload_video')}
            >
              <Upload size={18} className="md:w-5 md:h-5" />
            </button>
        </div>

        <motion.div  
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-6 md:mb-12 text-center"
        >
          <h2 className="hidden md:block text-4xl md:text-5xl font-bold font-serif mb-4 md:mb-6">{t('videos.title')}</h2>
          <p className="hidden md:block text-gray-400 max-w-xl mx-auto">{t('videos.subtitle')}</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col items-center gap-6 mb-12">
          <div className="hidden md:block w-full max-w-4xl mx-auto px-4">
            <TagFilter selectedTags={selectedTags} onChange={setSelectedTags} type="videos" />
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className="fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl z-[101] md:hidden flex flex-col max-h-[80vh] max-w-md mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                    >
                        <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 z-10 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-t-3xl">
                            <div>
                                <h3 className="text-lg font-bold text-white">{t('common.filters', '筛选')}</h3>
                                <p className="text-xs text-gray-400 mt-1">{t('common.tags') || '标签筛选'}</p>
                            </div>
                            <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('common.tags') || 'Tags'}</h4>
                                    {selectedTags.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTags([])}
                                            className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full"
                                        >
                                            {t('common.clear_all') || 'Clear All'}
                                        </button>
                                    )}
                                </div>
                                <TagFilter selectedTags={selectedTags} onChange={setSelectedTags} type="videos" variant="sheet" />
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-b-3xl flex items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedTags([])}
                                disabled={!hasActiveMobileFilters}
                                className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className="fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl z-[101] md:hidden flex flex-col max-w-sm mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                    >
                        <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 z-10 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-t-3xl">
                            <div>
                                <h3 className="text-lg font-bold text-white">{t('common.sort', '排序')}</h3>
                                <p className="text-xs text-gray-400 mt-1">{t('sort_filter.title') || '选择排序方式'}</p>
                            </div>
                            <button onClick={() => setIsMobileSortOpen(false)} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors">
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

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {loading && videos.length === 0 ? (
            // Loading Skeletons
            [...Array(6)].map((_, i) => (
                <div key={i} className="aspect-video rounded-3xl bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 animate-pulse relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6 space-y-3">
                        <div className="h-4 bg-white/10 rounded w-1/4" />
                        <div className="h-6 bg-white/10 rounded w-3/4" />
                    </div>
                </div>
            ))
          ) : error ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 px-4">
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
          ) : videos.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 px-4">
              <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-3xl p-8 mb-6 border border-white/5 backdrop-blur-xl shadow-xl">
                <Film size={64} className="text-pink-400 opacity-80" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t('videos.no_videos')}</h3>
              <p className="text-gray-400 text-center max-w-md">
                  {t('videos.subtitle')}
              </p>
            </div>
          ) : (
            videos.map((video, index) => (
              <VideoCard
                key={video.id}
                video={video}
                index={index}
                onClick={setSelectedVideo}
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
          {selectedVideo && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md overflow-y-auto"
              onClick={() => setSelectedVideo(null)}
            >
              <div className="flex min-h-full items-center justify-center p-4 md:p-8">
                <div 
                  className="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative aspect-video bg-black">
                      <button 
                        onClick={() => setSelectedVideo(null)}
                        className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10 transition-all z-20 group"
                        title={t('common.close_video')}
                      >
                        <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                      </button>
                      <video 
                        src={selectedVideo.video} 
                        controls 
                        autoPlay 
                        className="w-full h-full"
                        ref={(el) => {
                            if(el) {
                                el.playbackRate = 1.0; // Default speed
                            }
                        }}
                      />
                  </div>
                  
                  <div className="p-8 md:p-10 pt-6 border-t border-white/5 flex justify-between items-start gap-6 bg-[#0a0a0a]">
                      <div className="flex-1">
                          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 font-serif">{selectedVideo.title}</h3>
                          <div className="flex items-center gap-4 text-gray-400 text-sm mb-4">
                              {selectedVideo.created_at && (
                              <p className="px-3 py-1 bg-white/5 rounded-full border border-white/5">{new Date(selectedVideo.created_at).toLocaleDateString()}</p>
                              )}
                          </div>
                      </div>
                      <FavoriteButton 
                        itemId={selectedVideo.id}
                        itemType="video"
                        size={24}
                        showCount={true}
                        count={selectedVideo.likes || 0}
                        favorited={selectedVideo.favorited}
                        className="p-3 bg-white/5 hover:bg-pink-500/20 rounded-full transition-colors border border-white/10 shrink-0"
                        onToggle={(favorited, likes) => handleToggleFavorite(selectedVideo.id, favorited, likes)}
                      />
                  </div>
                </div>
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
        type="video"
      />
    </section>
  );
};

export default Videos;
