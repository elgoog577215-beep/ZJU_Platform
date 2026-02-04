import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lightbox from './Lightbox';
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
import TagFilter from './TagFilter';

import { useBackClose } from '../hooks/useBackClose';
import { useCachedResource } from '../hooks/useCachedResource';
import { getThumbnailUrl } from '../utils/imageUtils';

const PhotoCard = memo(({ photo, index, onClick }) => {
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
        <h3 className="text-lg font-bold text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75 drop-shadow-md line-clamp-2">{photo.title}</h3>
        {photo.tags && (
          <div className="flex flex-wrap gap-1.5 mt-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-100">
            {photo.tags.split(',').slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white/90 backdrop-blur-sm border border-white/10">
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});

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
    <section className="pt-24 pb-40 md:py-20 px-4 md:px-8 min-h-screen">
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
                <motion.div
                  key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="break-inside-avoid relative group overflow-hidden rounded-2xl cursor-pointer card-standard hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-500 w-full inline-block touch-manipulation mb-4 md:mb-6"
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                  <h3 className="text-lg font-bold text-white translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75 drop-shadow-md line-clamp-2">{photo.title}</h3>
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
