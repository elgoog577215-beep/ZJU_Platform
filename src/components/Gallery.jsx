import React, { useState, useMemo, useEffect, useCallback, memo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lightbox from './Lightbox';
import Pagination from './Pagination';
import { Play, Box, Upload, AlertCircle, Maximize2, Tag } from 'lucide-react';
import FavoriteButton from './FavoriteButton';
import { useTranslation } from 'react-i18next';
import UploadModal from './UploadModal';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import SmartImage from './SmartImage';
import api from '../services/api';
import SortSelector from './SortSelector';
import { useSearchParams } from 'react-router-dom';
import TagInput from './TagInput';
import TagFilter from './TagFilter';
import { GallerySkeleton } from './SkeletonLoader';
import toast from 'react-hot-toast';

import { useBackClose } from '../hooks/useBackClose';
import { useCachedResource } from '../hooks/useCachedResource';
import { getThumbnailUrl } from '../utils/imageUtils';

// Enhanced Photo Card with better micro-interactions
const PhotoCard = memo(forwardRef(({ photo, index, onClick, onToggleFavorite }, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2 }
      }}
      className="break-inside-avoid relative group overflow-hidden rounded-2xl cursor-pointer 
                 bg-white/5 backdrop-blur-sm border border-white/10
                 hover:shadow-2xl hover:shadow-indigo-500/10 
                 hover:border-white/20
                 transition-all duration-300 w-full inline-block touch-manipulation mb-4 md:mb-6"
      onClick={() => onClick(index)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SmartImage 
        src={getThumbnailUrl(photo.url)} 
        alt={photo.title} 
        type="image"
        className="w-full h-auto"
        imageClassName="h-auto object-cover transform transition-transform duration-700 ease-out group-hover:scale-105"
        blurPlaceholder={photo.blurPlaceholder}
      />
      
      {/* Gradient Overlay - Always visible on mobile, hover on desktop */}
      <motion.div 
        initial={false}
        animate={{ 
          opacity: isHovered ? 1 : 0 
        }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent 
                   md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300
                   flex flex-col justify-end p-4"
      >
        <motion.div 
          initial={false}
          animate={{ 
            y: isHovered ? 0 : 10,
            opacity: isHovered ? 1 : 0
          }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="flex flex-col gap-2"
        >
            <div className="flex justify-between items-end gap-2">
                <h3 className="text-lg font-bold text-white drop-shadow-md line-clamp-2 flex-1 
                               transform transition-transform duration-300">
                  {photo.title}
                </h3>
                
                <div className="flex items-center gap-2">
                     <motion.div 
                       whileHover={{ scale: 1.1 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={(e) => e.stopPropagation()}
                     >
                        <FavoriteButton 
                            itemId={photo.id}
                            itemType="photo"
                            size={18}
                            showCount={false}
                            favorited={photo.favorited}
                            initialFavorited={photo.favorited}
                            className="p-2 bg-white/10 hover:bg-pink-500/30 rounded-full backdrop-blur-md 
                                       transition-all duration-200 text-white border border-white/10
                                       hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/20"
                            onToggle={(favorited, likes) => onToggleFavorite(photo.id, favorited, likes)}
                        />
                     </motion.div>
                     <motion.div 
                       whileHover={{ scale: 1.1, rotate: 90 }}
                       whileTap={{ scale: 0.95 }}
                       className="p-2 rounded-full bg-white/20 backdrop-blur-md border border-white/10 
                                  group-hover:bg-indigo-500 group-hover:text-white 
                                  transition-all duration-300"
                     >
                        <Maximize2 size={18} />
                    </motion.div>
                </div>
            </div>

            {photo.tags && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 5 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex flex-wrap gap-1.5"
              >
                {photo.tags.split(',').slice(0, 3).map((tag, i) => (
                  <motion.span 
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-white/20 text-white/90 
                               backdrop-blur-sm border border-white/10 flex items-center gap-1
                               hover:bg-white/30 transition-colors cursor-pointer"
                  >
                    <Tag size={10} /> {tag.trim()}
                  </motion.span>
                ))}
              </motion.div>
            )}
        </motion.div>
      </motion.div>

      {/* Likes Badge */}
      {photo.likes > 0 && (
        <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-3 right-3 flex items-center gap-1 
                   bg-black/40 backdrop-blur-md rounded-full px-2 py-1
                   border border-white/10"
      >
        <span className="text-pink-400 text-xs">♥</span>
        <span className="text-white text-xs font-medium">{photo.likes}</span>
      </motion.div>
    )}
  </motion.div>
);
}));

const Gallery = () => {
  const [searchParams] = useSearchParams();
  const [sort, setSort] = useState('newest');
  const [selectedTags, setSelectedTags] = useState([]);
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Use cached resource hook
  const limit = settings.pagination_enabled === 'true' ? 12 : 1000;
  const { 
    data: photos, 
    pagination, 
    loading, 
    error, 
    setData: setPhotos, 
    refresh 
  } = useCachedResource('/photos', {
    page: currentPage,
    limit,
    sort,
    tags: selectedTags.join(',')
  }, {
    dependencies: [settings.pagination_enabled, selectedTags.join(',')]
  });

  const totalPages = pagination?.totalPages || 1;
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [tempPhoto, setTempPhoto] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useBackClose(selectedPhotoIndex !== null || tempPhoto !== null, () => {
      setSelectedPhotoIndex(null);
      setTempPhoto(null);
  });
  useBackClose(isUploadOpen, () => setIsUploadOpen(false));

  // Deep linking: Check for ID in URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
        api.get(`/photos/${id}`)
           .then(res => {
               if (res.data) {
                   const foundIndex = photos.findIndex(p => String(p.id) === String(res.data.id));
                   if (foundIndex !== -1) {
                       setSelectedPhotoIndex(foundIndex);
                   } else {
                       setTempPhoto(res.data);
                   }
               }
           })
           .catch(err => console.error("Failed to fetch deep linked photo", err));
    }
  }, [searchParams, photos]);

  const addPhoto = (newItem) => {
    api.post('/photos', newItem)
      .then(() => {
        refresh({ clearCache: true });
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

  const handleToggleFavorite = useCallback((photoId, favorited, likes) => {
    setPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, likes: likes !== undefined ? likes : p.likes, favorited } : p
    ));
    
    setTempPhoto(prev => {
        if (prev && prev.id === photoId) {
             return { ...prev, likes: likes !== undefined ? likes : prev.likes, favorited };
        }
        return prev;
    });
  }, [setPhotos]);

  return (
    <section className="pt-24 pb-28 md:py-20 px-4 md:px-8 relative overflow-hidden flex-grow">
      {/* Enhanced Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[130px]" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.12, 0.1]
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px]" 
          />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8 md:mb-12 relative z-40 text-center"
      >
        <motion.button
          whileHover={{ scale: 1.05, rotate: 90 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (!user) {
              toast.error(t('auth.signin_required'));
              return;
            }
            setIsUploadOpen(true);
          }}
          className="absolute right-0 top-0 md:top-2 bg-white/10 hover:bg-white/20 text-white 
                     p-2 md:p-3 rounded-full backdrop-blur-md border border-white/10 
                     transition-all hover:shadow-lg hover:shadow-indigo-500/20"
          title={t('common.upload_photo')}
        >
          <Upload size={18} className="md:w-5 md:h-5" />
        </motion.button>

        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-5xl font-bold font-serif mb-4 md:mb-6"
        >
          {t('gallery.title')}
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-gray-400 max-w-xl mx-auto mb-6 md:mb-8 text-sm md:text-base"
        >
          {t('gallery.subtitle')}
        </motion.p>
        
        {/* Filter Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col items-center gap-6 relative z-50"
        >
          <div className="w-full max-w-4xl mx-auto px-4">
             <TagFilter selectedTags={selectedTags} onChange={setSelectedTags} type="photos" />
          </div>
          <SortSelector sort={sort} onSortChange={setSort} />
        </motion.div>
      </motion.div>

        {loading && photos.length === 0 ? (
          <GallerySkeleton count={12} />
        ) : error ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
                </motion.div>
                <p className="text-gray-300 mb-6">{t('common.error_fetching_data')}</p>
                <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={refresh}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full 
                               transition-all border border-white/10 hover:border-white/30"
                >
                    {t('common.retry')}
                </motion.button>
            </motion.div>
        ) : (
          <motion.div 
            layout
            className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6 max-w-7xl mx-auto pb-8 md:pb-0"
          >
              <AnimatePresence mode="popLayout">
                {photos.map((photo, index) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    index={index}
                    onClick={setSelectedPhotoIndex}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </AnimatePresence>
          </motion.div>
        )}
        
        {!loading && !error && photos.length > 0 && settings.pagination_enabled !== 'true' && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.5 }}
               className="text-center py-10"
             >
                 <motion.div 
                   initial={{ scaleX: 0 }}
                   animate={{ scaleX: 1 }}
                   transition={{ duration: 0.8 }}
                   className="inline-block h-1 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4" 
                 />
                 <p className="text-gray-500 text-sm font-medium tracking-widest uppercase">
                   {t('gallery.end_of_list', 'End of Gallery')}
                 </p>
             </motion.div>
        )}

      {settings.pagination_enabled === 'true' && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={handlePageChange} 
        />
      )}

      <AnimatePresence>
        {(selectedPhotoIndex !== null || tempPhoto) && (
          <Lightbox 
            photo={selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : tempPhoto} 
            onClose={() => { setSelectedPhotoIndex(null); setTempPhoto(null); }}
            onNext={selectedPhotoIndex !== null ? handleNext : undefined}
            onPrev={selectedPhotoIndex !== null ? handlePrev : undefined}
            onSelect={(photo) => {
                const idx = photos.findIndex(p => p.id === photo.id);
                if (idx !== -1) {
                    setSelectedPhotoIndex(idx);
                    setTempPhoto(null);
                } else {
                    setSelectedPhotoIndex(null);
                    setTempPhoto(photo);
                }
            }}
            onLikeToggle={handleToggleFavorite}
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
