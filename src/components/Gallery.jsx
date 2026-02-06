import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lightbox from './Lightbox';
import Pagination from './Pagination';
import { Play, Box, Upload, AlertCircle, Maximize2, Tag } from 'lucide-react';
import FavoriteButton from './FavoriteButton';
import { useTranslation } from 'react-i18next';
import UploadModal from './UploadModal';
import { useSettings } from '../context/SettingsContext';
import SmartImage from './SmartImage';
import api from '../services/api';
import SortSelector from './SortSelector';
import { useSearchParams } from 'react-router-dom';
import TagInput from './TagInput';
import TagFilter from './TagFilter';

import { useBackClose } from '../hooks/useBackClose';
import { useCachedResource } from '../hooks/useCachedResource';
import { getThumbnailUrl } from '../utils/imageUtils';

const PhotoCard = memo(({ photo, index, onClick, onToggleFavorite }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="break-inside-avoid relative group overflow-hidden rounded-2xl cursor-pointer card-standard hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-500 w-full inline-block touch-manipulation mb-4 md:mb-6"
      onClick={() => onClick(index)}
    >
      <SmartImage 
        src={getThumbnailUrl(photo.url)} 
        alt={photo.title} 
        type="image"
        className="w-full h-auto"
        imageClassName="h-auto object-cover transform transition-transform duration-700 group-hover:scale-110"
      />
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4">
        <div className="flex flex-col gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
            <div className="flex justify-between items-end gap-2">
                <h3 className="text-lg font-bold text-white drop-shadow-md line-clamp-2 flex-1">{photo.title}</h3>
                
                <div className="flex items-center gap-2">
                     <div onClick={(e) => e.stopPropagation()}>
                        <FavoriteButton 
                            itemId={photo.id}
                            itemType="photo"
                            size={18}
                            showCount={false}
                            favorited={photo.favorited}
                            initialFavorited={photo.favorited}
                            className="p-2 bg-white/10 hover:bg-pink-500/20 rounded-full backdrop-blur-md transition-colors text-white border border-white/10"
                            onToggle={(favorited, likes) => onToggleFavorite(photo.id, favorited, likes)}
                        />
                     </div>
                     <div className="p-2 rounded-full bg-white/20 backdrop-blur-md border border-white/10 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                        <Maximize2 size={18} />
                    </div>
                </div>
            </div>

            {photo.tags && (
            <div className="flex flex-wrap gap-1.5 delay-100">
                {photo.tags.split(',').slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-lg bg-white/20 text-white/90 backdrop-blur-sm border border-white/10 flex items-center gap-1">
                    <Tag size={10} /> {tag.trim()}
                </span>
                ))}
            </div>
            )}
        </div>
      </div>
    </motion.div>
  );
});

PhotoCard.displayName = 'PhotoCard';

const Gallery = () => {
  const [searchParams] = useSearchParams();
  const [sort, setSort] = useState('newest');
  const [selectedTags, setSelectedTags] = useState([]);
  const { t } = useTranslation();
  const { settings } = useSettings();
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
  const [refreshKey, setRefreshKey] = useState(0); // Kept for manual retry UI compatibility

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
        // Fetch specific photo
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
    <section className="pt-24 pb-24 md:py-20 px-4 md:px-8 relative overflow-hidden flex-grow">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[130px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

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

        <h2 className="text-4xl md:text-5xl font-bold font-serif mb-4 md:mb-6">{t('gallery.title')}</h2>
        <p className="text-gray-400 max-w-xl mx-auto mb-6 md:mb-8 text-sm md:text-base">{t('gallery.subtitle')}</p>
        
        {/* Filter Buttons */}
        <div className="flex flex-col items-center gap-6 relative z-50">
            <div className="w-full max-w-4xl mx-auto px-4">
               <TagFilter selectedTags={selectedTags} onChange={setSelectedTags} type="photos" />
            </div>
            <SortSelector sort={sort} onSortChange={setSort} />
          </div>
        </motion.div>

        {loading && photos.length === 0 ? (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6 max-w-7xl mx-auto">
             {[1,2,3,4,5,6,7,8].map(i => (
                 <div key={i} className="bg-white/5 rounded-2xl h-48 md:h-80 animate-pulse break-inside-avoid w-full inline-block mb-4 md:mb-6" />
             ))}
          </div>
        ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
                <p className="text-gray-300 mb-6">{t('common.error_fetching_data')}</p>
                <button 
                    onClick={refresh}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
                >
                    {t('common.retry')}
                </button>
            </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6 max-w-7xl mx-auto pb-20 md:pb-0">
              {photos.map((photo, index) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  index={index}
                  onClick={setSelectedPhotoIndex}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
          </div>
        )}
        
        {!loading && !error && photos.length > 0 && settings.pagination_enabled !== 'true' && (
             <div className="text-center py-10">
                 <div className="inline-block h-1 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4" />
                 <p className="text-gray-500 text-sm font-medium tracking-widest uppercase">{t('gallery.end_of_list', 'End of Gallery')}</p>
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
