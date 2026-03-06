import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Info, Camera, Aperture, Clock, Grid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import FavoriteButton from './FavoriteButton';
import { useBackClose } from '../hooks/useBackClose';
import api from '../services/api';

const Lightbox = ({ photo, onClose, onNext, onPrev, onLikeToggle, onSelect }) => {
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'related'
  const { user } = useAuth();
  const [isApp, setIsApp] = useState(false);
  const [relatedPhotos, setRelatedPhotos] = useState([]);

  useEffect(() => {
    if (photo?.id) {
        api.get(`/photos/${photo.id}/related?limit=6`)
           .then(res => setRelatedPhotos(res.data))
           .catch(err => console.error("Failed to fetch related photos", err));
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
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
            onClick={onClose}
        >
            {/* Top Controls */}
            <div className="absolute top-4 right-4 flex gap-4 z-50" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
            <FavoriteButton 
              itemId={photo.id}
              itemType="photo"
              className="p-3 hover:bg-white/10 rounded-full"
              onToggle={onLikeToggle}
              favorited={photo.favorited}
              initialFavorited={photo.favorited}
            />
            <button 
              onClick={handleDownload}
              className="hidden md:block p-3 text-white/70 hover:text-green-400 hover:bg-white/10 rounded-full transition-all"
              title={t('common.download')}
            >
              <Download size={20} />
            </button>
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className={`p-3 rounded-full transition-all ${showInfo ? 'text-white bg-white/20' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              title={t('lightbox.info')}
            >
              <Info size={20} />
            </button>
        </div>

        <button 
          onClick={onClose}
          className="p-3 bg-black/40 hover:bg-red-500/20 text-white/70 hover:text-red-400 border border-white/10 rounded-full backdrop-blur-md transition-all"
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
          className="absolute left-0 md:-left-16 p-4 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-full"
        >
          <ChevronLeft size={48} />
        </button>

        <motion.img
          key={photo.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          src={photo.url} 
          alt={photo.title}
          className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm"
        />

        <button 
          onClick={onNext}
          className="absolute right-0 md:-right-16 p-4 text-white/50 hover:text-white transition-colors hover:bg-white/5 rounded-full"
        >
          <ChevronRight size={48} />
        </button>

        {/* Bottom Info Bar */}
        <div className="absolute -bottom-16 left-0 right-0 text-center">
          <h3 className="text-2xl font-serif font-bold text-white mb-1">{photo.title}</h3>
          <p className="text-sm text-gray-400 uppercase tracking-widest">{photo.category}</p>
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
                className="fixed top-0 right-0 bottom-0 w-full sm:w-80 md:w-96 bg-[#1a1a1a]/95 backdrop-blur-xl border-l border-white/10 md:border-l flex flex-col z-[70]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 pb-2">
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setActiveTab('info')}
                            className={`text-lg font-bold pb-2 border-b-2 transition-colors ${activeTab === 'info' ? 'text-white border-indigo-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                        >
                            {t('lightbox.info')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('related')}
                            className={`text-lg font-bold pb-2 border-b-2 transition-colors ${activeTab === 'related' ? 'text-white border-indigo-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                        >
                            {t('lightbox.related', 'Related')}
                        </button>
                    </div>
                    <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4">
                    {activeTab === 'info' ? (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">{t('common.title')}</h4>
                                <p className="text-white text-lg font-serif">{photo.title}</p>
                            </div>
                            
                            <div>
                                <h4 className="text-sm font-bold text-gray-500 uppercase mb-2">{t('common.category')}</h4>
                                <span className="px-3 py-1 bg-white/10 rounded-full text-sm text-white">{photo.category}</span>
                            </div>

                            <div className="border-t border-white/10 pt-6">
                                <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">{t('lightbox.exif')}</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Camera size={18} className="text-indigo-400" />
                                        <span>{exif.camera}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Aperture size={18} className="text-purple-400" />
                                        <div className="flex gap-4">
                                            <span>{exif.lens}</span>
                                            <span>{exif.aperture}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <Clock size={18} className="text-pink-400" />
                                        <div className="flex gap-4">
                                            <span>{exif.shutter}</span>
                                            <span>ISO {exif.iso}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t border-white/10 pt-6">
                                <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">{t('lightbox.stats')}</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-white/5 p-4 rounded-xl text-center">
                                        <div className="text-2xl font-bold text-white mb-1">{photo.likes || 0}</div>
                                        <div className="text-xs text-gray-500 uppercase">{t('lightbox.likes')}</div>
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
                                    className="cursor-pointer group relative aspect-square bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-indigo-500/50 transition-all"
                                >
                                    <img 
                                        src={p.thumbnail || p.url} 
                                        alt={p.title} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-xs text-white truncate">{p.title}</p>
                                    </div>
                                </div>
                            ))}
                            {relatedPhotos.length === 0 && (
                                <div className="col-span-2 text-center py-8 text-gray-500">
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
