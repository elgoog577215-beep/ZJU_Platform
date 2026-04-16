import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SmartImage from '../SmartImage';
import { getHighResUrl } from '../../utils/imageUtils';
import { useSettings } from '../../context/SettingsContext';

const DashboardPhotoStack = ({ photos, onSelect }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 4000); // Rotate every 4 seconds
    return () => clearInterval(interval);
  }, [photos.length]);

  const currentPhoto = photos[currentIndex];

  if (!currentPhoto) return null;

  return (
    <div className="h-full flex flex-col">
      <div 
        key={currentPhoto.id} 
        onClick={() => onSelect(currentPhoto)}
        className={`relative flex-1 rounded-3xl overflow-hidden cursor-pointer group border ${isDayMode ? 'border-slate-200/80 bg-white/88 shadow-[0_18px_40px_rgba(148,163,184,0.16)]' : 'border-white/10'}`}
      >
        <AnimatePresence mode='wait'>
            <motion.div 
                key={currentPhoto.id}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 w-full h-full"
            >
                <SmartImage 
                    src={currentPhoto.url} 
                    alt={currentPhoto.title} 
                    type="image"
                    className="w-full h-full"
                    imageClassName="w-full h-full object-cover" 
                    iconSize={48}
                />
            </motion.div>
        </AnimatePresence>

        <div className={`absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity ${isDayMode ? 'bg-gradient-to-b from-transparent to-white/88' : 'bg-gradient-to-b from-transparent to-black/60'}`} />
        
        <div className={`absolute top-3 right-3 backdrop-blur-md p-2 rounded-full border opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 z-10 ${isDayMode ? 'bg-white/88 border-slate-200/80' : 'bg-black/30 border-white/20'}`}>
           <Maximize2 size={14} className={isDayMode ? 'text-slate-700' : 'text-white'} />
        </div>

        <div className="absolute bottom-4 left-4 z-10">
          <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isDayMode ? 'text-slate-500' : 'text-white/60'}`}>{t(`gallery.categories.${currentPhoto.category}`)}</p>
          <h4 className={`font-bold leading-tight ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{currentPhoto.title}</h4>
        </div>
        
        {/* Progress Indicators */}
        <div className="absolute bottom-4 right-4 flex gap-1 z-10">
            {photos.map((_, idx) => (
                <div 
                    key={idx} 
                    className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-3' : 'bg-white/30'}`} 
                />
            ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPhotoStack;
