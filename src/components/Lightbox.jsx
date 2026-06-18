import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Info, Camera, Aperture, Clock, Grid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import FavoriteButton from './FavoriteButton';
import { useBackClose } from '../hooks/useBackClose';
import api from '../services/api';
import { getHighResUrl, getThumbnailUrl } from '../utils/imageUtils';

const Lightbox = ({ photo, onClose, onNext, onPrev, onLikeToggle, onSelect }) => {
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'related'
  const { user } = useAuth();
  const { uiMode } = useSettings();
  const [isApp, setIsApp] = useState(false);
  const [relatedPhotos, setRelatedPhotos] = useState([]);
  const isDayMode = uiMode === 'day';

  useEffect(() => {
    if (photo?.id) {
        api.get(`/photos/${photo.id}/related?limit=6`, { silent: true })
           .then(res => setRelatedPhotos(res.data))
           .catch(() => setRelatedPhotos([]));
    }
  }, [photo?.id]);
  
  useBackClose(true, onClose);

  useEffect(() => {
    const checkApp = () => {
        if (window.NativeBridge) {
            setIsApp(true);
            return true;
        }
        return false;
    };

    if (checkApp()) return;

    const interval = setInterval(() => {
        if (checkApp()) {
            clearInterval(interval);
        }
    }, 500);

    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
        clearInterval(interval);
        clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'i') setShowInfo(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  const handleDownload = async () => {
      try {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = photo.title || t('common.download');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          toast.success(t('lightbox.download_started'));
      } catch (error) {
          console.error(error);
          toast.error(t('lightbox.download_failed'));
      }
  };

  const displayImageUrl = getHighResUrl(photo.url);

  // Mock Exif Data (since we don't have it in DB yet)
  const exif = {
      camera: 'Sony A7R IV',
      lens: 'FE 24-70mm GM',
      aperture: 'f/2.8',
      shutter: '1/250s',
      iso: '100'
  };

  const lightboxContent = (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${isDayMode ? 'bg-transparent' : 'bg-black/95 backdrop-blur-md'}`}
            onClick={onClose}
        >
            {/* Top Controls */}
            <div className="absolute top-4 right-4 flex gap-4 z-50" onClick={e => e.stopPropagation()}>
                <div className={`flex items-center gap-2 rounded-full p-1 border ${isDayMode ? 'bg-white border-slate-200/80' : 'bg-black/40 border-white/10 backdrop-blur-md'}`}>
            <FavoriteButton 
              itemId={photo.id}
              itemType="photo"
              className={isDayMode ? 'p-3 hover:bg-indigo-50 rounded-full text-slate-600 hover:text-indigo-500' : 'p-3 hover:bg-white/10 rounded-full'}
              onToggle={onLikeToggle}
              favorited={photo.favorited}
              initialFavorited={photo.favorited}
            />
            <button 
              onClick={handleDownload}
              className={`hidden md:block p-3 rounded-full transition-all ${isDayMode ? 'text-slate-500 hover:text-green-500 hover:bg-green-50' : 'text-white/70 hover:text-green-400 hover:bg-white/10'}`}
              title={t('common.download')}
            >
              <Download size={20} />
            </button>
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className={`p-3 rounded-full transition-all ${showInfo ? (isDayMode ? 'text-indigo-600 bg-indigo-50' : 'text-white bg-white/20') : (isDayMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-white/70 hover:text-white hover:bg-white/10')}`}
              title={t('lightbox.info')}
            >
              <Info size={20} />
            </button>
        </div>

        <button 
          onClick={onClose}
          className={`p-3 rounded-full transition-all border ${isDayMode ? 'bg-white hover:bg-red-50 text-slate-500 hover:text-red-500 border-slate-200/80' : 'bg-black/40 hover:bg-red-500/20 text-white/70 hover:text-red-400 border-white/10 backdrop-blur-md'}`}
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Image */}
      <div 
        className="relative max-w-7xl max-h-[90vh] w-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onPrev}
          className={`absolute left-0 md:-left-16 p-4 rounded-full transition-colors ${isDayMode ? 'text-slate-400 hover:text-slate-900 hover:bg-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
        >
          <ChevronLeft size={48} />
        </button>

        <motion.img
          key={photo.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          src={displayImageUrl}
          alt={photo.title}
          className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm"
        />

        <button 
          onClick={onNext}
          className={`absolute right-0 md:-right-16 p-4 rounded-full transition-colors ${isDayMode ? 'text-slate-400 hover:text-slate-900 hover:bg-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
        >
          <ChevronRight size={48} />
        </button>

        {/* Bottom Info Bar */}
        <div className="absolute -bottom-16 left-0 right-0 text-center">
          <h3 className={`text-2xl font-serif font-bold mb-1 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{photo.title}</h3>
          <p className={`text-sm uppercase tracking-widest ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{photo.category}</p>
        </div>
      </div>

      {/* Info Side Panel */}
      <AnimatePresence>
        {showInfo && (
            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`fixed top-0 right-0 bottom-0 w-full sm:w-80 md:w-96 border-l md:border-l flex flex-col z-[70] ${isDayMode ? 'bg-white border-slate-200/80' : 'bg-[#1a1a1a]/95 border-white/10 backdrop-blur-xl'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 pb-2">
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setActiveTab('info')}
                            className={`text-lg font-bold pb-2 border-b-2 transition-colors ${activeTab === 'info' ? (isDayMode ? 'text-slate-900 border-indigo-500' : 'text-white border-indigo-500') : (isDayMode ? 'text-slate-400 border-transparent hover:text-slate-700' : 'text-gray-500 border-transparent hover:text-gray-300')}`}
                        >
                            {t('lightbox.info')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('related')}
                            className={`text-lg font-bold pb-2 border-b-2 transition-colors ${activeTab === 'related' ? (isDayMode ? 'text-slate-900 border-indigo-500' : 'text-white border-indigo-500') : (isDayMode ? 'text-slate-400 border-transparent hover:text-slate-700' : 'text-gray-500 border-transparent hover:text-gray-300')}`}
                        >
                            {t('lightbox.related', 'Related')}
                        </button>
                    </div>
                    <button onClick={() => setShowInfo(false)} className={isDayMode ? 'text-slate-400 hover:text-slate-900' : 'text-gray-400 hover:text-white'}>
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4">
                    {activeTab === 'info' ? (
                        <div className="space-y-6">
                            <div>
                                <h4 className={`text-sm font-bold uppercase mb-2 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('common.title')}</h4>
                                <p className={`text-lg font-serif ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{photo.title}</p>
                            </div>
                            
                            <div>
                                <h4 className={`text-sm font-bold uppercase mb-2 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('common.category')}</h4>
                                <span className={`px-3 py-1 rounded-full text-sm ${isDayMode ? 'bg-slate-100 text-slate-700 border border-slate-200/80' : 'bg-white/10 text-white'}`}>{photo.category}</span>
                            </div>

                            <div className={`border-t pt-6 ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
                                <h4 className={`text-sm font-bold uppercase mb-4 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('lightbox.exif')}</h4>
                                <div className="space-y-4">
                                    <div className={`flex items-center gap-3 ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
                                        <Camera size={18} className="text-indigo-400" />
                                        <span>{exif.camera}</span>
                                    </div>
                                    <div className={`flex items-center gap-3 ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
                                        <Aperture size={18} className="text-purple-400" />
                                        <div className="flex gap-4">
                                            <span>{exif.lens}</span>
                                            <span>{exif.aperture}</span>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-3 ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
                                        <Clock size={18} className="text-pink-400" />
                                        <div className="flex gap-4">
                                            <span>{exif.shutter}</span>
                                            <span>ISO {exif.iso}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className={`border-t pt-6 ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
                                <h4 className={`text-sm font-bold uppercase mb-4 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('lightbox.stats')}</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className={`p-4 rounded-xl text-center ${isDayMode ? 'bg-slate-50 border border-slate-200/80' : 'bg-white/5'}`}>
                                        <div className={`text-2xl font-bold mb-1 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{photo.likes || 0}</div>
                                        <div className={`text-xs uppercase ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('lightbox.likes')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                            {relatedPhotos.map(p => (
                                <div 
                                    key={p.id} 
                                    onClick={() => onSelect && onSelect(p)} 
                                    className={`cursor-pointer group relative aspect-square rounded-xl overflow-hidden border transition-all ${isDayMode ? 'bg-white border-slate-200/80 hover:border-indigo-300/80' : 'bg-white/5 border-white/10 hover:border-indigo-500/50'}`}
                                >
                                    <img 
                                        src={getThumbnailUrl(p.thumbnail || p.url)}
                                        alt={p.title} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                    />
                                    <div className={`absolute inset-0 transition-colors ${isDayMode ? 'bg-white/10 group-hover:bg-transparent' : 'bg-black/20 group-hover:bg-transparent'}`} />
                                    <div className={`absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity ${isDayMode ? 'bg-white' : 'bg-gradient-to-t from-black/80 to-transparent'}`}>
                                        <p className={`text-xs truncate ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{p.title}</p>
                                    </div>
                                </div>
                            ))}
                            {relatedPhotos.length === 0 && (
                                <div className={`col-span-2 text-center py-8 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
                                    <Grid size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>{t('lightbox.no_related', 'No related photos found')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>


        )}
      </AnimatePresence>
    </motion.div>
  );

  return createPortal(lightboxContent, document.body);
};

export default Lightbox;
