import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lightbox from './Lightbox';
import GameOverlay from './GameOverlay';
import LivePhotoViewer from './Image3DViewer';
import Pagination from './Pagination';
import { Play, Box, Upload, AlertCircle } from 'lucide-react';
import FavoriteButton from './FavoriteButton';
import { useTranslation } from 'react-i18next';
import UploadModal from './UploadModal';
import { useSettings } from '../context/SettingsContext';
import SmartImage from './SmartImage';
import api from '../services/api';
import SortSelector from './SortSelector';
import { useSearchParams } from 'react-router-dom';
import TagInput from './TagInput';

const Gallery = () => {
  const [searchParams] = useSearchParams();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('newest');

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [activeGamePhoto, setActiveGamePhoto] = useState(null);
  const [active3DPhoto, setActive3DPhoto] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { t } = useTranslation();
  const { settings } = useSettings();

  // Deep linking: Check for ID in URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
        // Fetch specific photo
        api.get(`/photos/${id}`)
           .then(res => {
               if (res.data) {
                   // For now, we just open it in 3D viewer or Lightbox. 
                   // Since Gallery logic uses index for lightbox, it's tricky to inject into paginated list.
                   // Easier to open as 3D view or Game view if type matches, or standalone lightbox.
                   // Let's use 3D viewer for deep linked photos as a safe default or checking logic.
                   setActive3DPhoto(res.data);
               }
           })
           .catch(err => console.error("Failed to fetch deep linked photo", err));
    }
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const limit = settings.pagination_enabled === 'true' ? 12 : 1000;
    
    const params = {
      page: currentPage,
      limit,
      sort,
    };

    api.get('/photos', { params })
      .then(res => {
        setPhotos(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch photos:", err);
        setLoading(false);
      });
  }, [currentPage, sort, settings.pagination_enabled]);

  const addPhoto = (newItem) => {
    api.post('/photos', newItem)
    .then(() => {
        // Refresh current page
        const limit = 12; // Always refresh with default limit or current limit? Logic used 12 before.
        const params = {
            page: currentPage,
            limit: 12,
        };
        return api.get('/photos', { params });
    })
    .then(res => {
        setPhotos(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
    })
    .catch(err => console.error("Failed to save photo", err));
  };

  const handleNext = () => {
    setSelectedPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = () => {
    setSelectedPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleUpload = (newItem) => {
    addPhoto(newItem);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="pt-36 pb-32 md:py-20 px-4 md:px-8 min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="mb-8 md:mb-12 relative z-40 text-center"
      >
        <button
          onClick={() => setIsUploadOpen(true)}
          className="absolute right-0 top-0 md:top-2 bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full backdrop-blur-md border border-white/10 transition-all"
          title={t('common.upload_photo')}
        >
          <Upload size={18} className="md:w-5 md:h-5" />
        </button>

        <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold font-serif mb-3 md:mb-4">{t('gallery.title')}</h2>
        <p className="text-gray-400 max-w-xl mx-auto mb-6 md:mb-8 text-sm md:text-base">{t('gallery.subtitle')}</p>
        
        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center items-center gap-4 relative z-50">
          <SortSelector sort={sort} onSortChange={setSort} />
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 max-w-7xl mx-auto">
           {[1,2,3,4].map(i => (
               <div key={i} className="bg-white/5 rounded-3xl h-64 md:h-80 animate-pulse" />
           ))}
        </div>
      ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
              <p className="text-gray-300 mb-6">{t('common.error_fetching_data') || 'Failed to load photos'}</p>
              <button 
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
              >
                  {t('common.retry') || 'Retry'}
              </button>
          </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 max-w-7xl mx-auto">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="break-inside-avoid relative group overflow-hidden rounded-lg cursor-pointer border border-transparent hover:border-white/20 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300"
              onClick={() => setSelectedPhotoIndex(index)}
            >
              <SmartImage 
                src={photo.url} 
                alt={photo.title} 
                type="image"
                className="w-full h-auto"
                imageClassName="h-auto object-cover transform transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-center p-4">
                <h3 className="text-xl font-bold font-serif mb-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{photo.title}</h3>
                
                <div className="flex flex-wrap justify-center gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveGamePhoto(photo);
                    }}
                    className="flex items-center gap-2 bg-white text-black px-3 py-1.5 md:px-4 md:py-2 text-sm font-bold rounded-full hover:bg-gray-200 hover:scale-105"
                  >
                    <Play size={14} fill="currentColor" className="md:w-4 md:h-4" />
                    {t('gallery.play')}
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActive3DPhoto(photo);
                    }}
                    className="flex items-center gap-2 bg-black/50 border border-white/30 text-white px-3 py-1.5 md:px-4 md:py-2 text-sm font-bold rounded-full hover:bg-white hover:text-black hover:scale-105 backdrop-blur-sm transition-all"
                    title={t('gallery.view_3d')}
                  >
                    <Box size={14} className="md:w-4 md:h-4" />
                  </button>

                  <FavoriteButton 
                    itemId={photo.id}
                    itemType="photo"
                    size={14}
                    showCount={true}
                    count={photo.likes || 0}
                    className="flex items-center gap-2 bg-black/50 border border-white/30 px-3 py-1.5 md:px-4 md:py-2 text-sm font-bold rounded-full hover:bg-pink-500 hover:border-pink-500 hover:scale-105 backdrop-blur-sm transition-all"
                    onToggle={(favorited, likes) => {
                        setPhotos(prev => prev.map(p => 
                            p.id === photo.id ? { ...p, likes: likes !== undefined ? likes : p.likes } : p
                        ));
                    }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {settings.pagination_enabled === 'true' && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={handlePageChange} 
        />
      )}

      <AnimatePresence>
        {selectedPhotoIndex !== null && (
          <Lightbox 
            photo={photos[selectedPhotoIndex]} 
            onClose={() => setSelectedPhotoIndex(null)}
            onNext={handleNext}
            onPrev={handlePrev}
            onView3D={() => {
              setActive3DPhoto(photos[selectedPhotoIndex]);
              setSelectedPhotoIndex(null); 
            }}
            onLikeToggle={(favorited, likes) => {
                setPhotos(prev => prev.map(p => 
                    p.id === photos[selectedPhotoIndex].id ? { ...p, likes: likes !== undefined ? likes : p.likes, favorited } : p
                ));
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeGamePhoto && (
          <GameOverlay 
            photo={activeGamePhoto} 
            onClose={() => setActiveGamePhoto(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active3DPhoto && (
          <LivePhotoViewer 
            photo={active3DPhoto} 
            onClose={() => setActive3DPhoto(null)} 
          />
        )}
      </AnimatePresence>

      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        type="image"
      />
    </section>
  );
};

export default Gallery;
