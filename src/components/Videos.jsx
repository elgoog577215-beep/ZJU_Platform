import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Film, X, Upload, Heart } from 'lucide-react';
import UploadModal from './UploadModal';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
import { useSettings } from '../context/SettingsContext';
import api from '../services/api';
import SortSelector from './SortSelector';
import { useSearchParams } from 'react-router-dom';

const Videos = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('newest');
  const [selectedVideo, setSelectedVideo] = useState(null);

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

  useEffect(() => {
    const limit = settings.pagination_enabled === 'true' ? 12 : 1000;

    const params = {
      page: currentPage,
      limit,
      sort,
    };

    api.get('/videos', { params })
      .then(res => {
        setVideos(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch videos:", err);
        setLoading(false);
      });
  }, [currentPage, sort, settings.pagination_enabled]);

  const addVideo = (newItem) => {
      api.post('/videos', newItem)
    .then(() => {
        // Refresh current page
        return api.get(`/videos?page=${currentPage}&limit=12`);
    })
    .then(res => {
        setVideos(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
    })
    .catch(err => console.error("Failed to save video", err));
  };

  const handleLike = (id) => {
      api.post(`/videos/${id}/like`)
        .then(res => {
            setVideos(prev => prev.map(v => 
                v.id === id ? { ...v, likes: res.data.likes } : v
            ));
        })
        .catch(err => console.error("Failed to like video", err));
  };

  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleUpload = (newItem) => {
      addVideo(newItem);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <section className="py-12 md:py-24 px-4 md:px-8 min-h-screen flex items-center justify-center relative z-10">
      <div className="max-w-7xl w-full mx-auto relative">
        <div className="absolute right-0 top-0 flex items-center gap-4 z-20">
             <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full backdrop-blur-md border border-white/10 transition-all"
              title="Upload Video"
            >
              <Upload size={18} className="md:w-5 md:h-5" />
            </button>
        </div>

        <motion.div  
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="text-4xl md:text-6xl font-bold font-serif mb-4">{t('videos.title')}</h2>
          <p className="text-gray-400 max-w-xl mx-auto">{t('videos.subtitle')}</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center items-center gap-4 mb-8">
          <SortSelector sort={sort} onSortChange={setSort} />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading && videos.length === 0 ? (
            // Loading Skeletons
            [...Array(6)].map((_, i) => (
                <div key={i} className="aspect-video rounded-2xl bg-gray-900 animate-pulse relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6 space-y-3">
                        <div className="h-4 bg-white/10 rounded w-1/4" />
                        <div className="h-6 bg-white/10 rounded w-3/4" />
                    </div>
                </div>
            ))
          ) : (
          <>
          {videos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              onClick={() => setSelectedVideo(video)}
              className="group relative aspect-video rounded-2xl overflow-hidden bg-gray-900 cursor-pointer"
            >
              <img 
                src={video.thumbnail} 
                alt={video.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 transition-opacity" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform duration-300">
                  <Play size={40} fill="white" className="text-white ml-2" />
                </div>
              </div>

              <div className="absolute bottom-0 left-0 w-full p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-bold text-white">{video.title}</h3>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(video.id);
                    }}
                    className="p-2 bg-black/50 hover:bg-pink-500/20 rounded-full backdrop-blur-md transition-colors group/btn border border-white/10"
                    title="Like"
                  >
                    <div className="flex items-center gap-1">
                      <Heart 
                        size={18} 
                        className={`transition-colors ${video.likes > 0 ? 'fill-pink-500 text-pink-500' : 'text-white group-hover/btn:text-pink-500'}`} 
                      />
                      {video.likes > 0 && <span className="text-xs font-bold text-white">{video.likes}</span>}
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          </>
          )}
        </div>
        
        {videos.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-500">
            <Film size={48} className="mx-auto mb-4 opacity-20" />
            <p>No videos found. Upload your first video!</p>
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

      <AnimatePresence>
        {selectedVideo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-12"
            onClick={() => setSelectedVideo(null)}
          >
            <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video border border-white/10" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 right-4 z-10 p-3 bg-black/50 hover:bg-red-500/80 text-white rounded-full backdrop-blur-md border border-white/10 transition-all hover:rotate-90 shadow-lg"
                title="Close Video"
              >
                <X size={24} />
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
              
              {/* Video Speed Control Overlay (Optional: Browser native controls usually have this, but we can add custom if needed) */}
              {/* For now, rely on browser native controls as they include speed in most modern browsers */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
