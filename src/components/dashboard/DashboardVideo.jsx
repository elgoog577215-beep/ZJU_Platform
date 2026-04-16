import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Film } from 'lucide-react';
import SmartImage from '../SmartImage';
import { useSettings } from '../../context/SettingsContext';

const DashboardVideo = ({ videos, onSelect }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  if (!videos || videos.length === 0) return null;
  const mainVideo = videos[0];

  return (
    <div 
      onClick={() => onSelect(mainVideo)}
      className={`relative w-full h-full rounded-3xl overflow-hidden cursor-pointer group border ${isDayMode ? 'border-slate-200/80 bg-white/88 shadow-[0_18px_40px_rgba(148,163,184,0.18)]' : 'border-white/10 bg-black'}`}
    >
      <SmartImage 
          src={mainVideo.thumbnail || mainVideo.cover} 
          alt={mainVideo.title} 
          type="video"
          className="w-full h-full"
          imageClassName={`w-full h-full object-cover transition-opacity duration-500 ${isDayMode ? 'opacity-72 group-hover:opacity-90' : 'opacity-60 group-hover:opacity-80'}`} 
          iconSize={48}
      />
      
      <div className={`absolute inset-0 ${isDayMode ? 'bg-gradient-to-t from-white via-white/12 to-transparent' : 'bg-gradient-to-t from-black/90 via-transparent to-transparent'}`} />
      
      <div className="absolute inset-0 flex items-center justify-center">
         <div className={`w-16 h-16 backdrop-blur-sm rounded-full flex items-center justify-center border group-hover:scale-110 transition-transform duration-300 ${isDayMode ? 'bg-white/88 border-slate-200/80 text-indigo-600' : 'bg-white/10 border-white/20'}`}>
            <Play size={24} fill="currentColor" className={`${isDayMode ? 'text-indigo-600' : 'text-white'} ml-1`} />
         </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400 backdrop-blur-sm">
            <Film size={16} />
          </div>
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{t('nav.videos')}</span>
        </div>
        <h3 className={`text-xl font-bold font-serif leading-tight line-clamp-2 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{mainVideo.title}</h3>
      </div>
    </div>
  );
};

export default DashboardVideo;
