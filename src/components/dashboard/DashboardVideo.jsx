import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Film } from 'lucide-react';
import SmartImage from '../SmartImage';

const DashboardVideo = ({ videos, onSelect }) => {
  const { t } = useTranslation();
  if (!videos || videos.length === 0) return null;
  const mainVideo = videos[0];

  return (
    <div 
      onClick={() => onSelect(mainVideo)}
      className="relative w-full h-full rounded-3xl overflow-hidden cursor-pointer group border border-white/10 bg-black"
    >
      <SmartImage 
          src={mainVideo.thumbnail || mainVideo.cover} 
          alt={mainVideo.title} 
          type="video"
          className="w-full h-full"
          imageClassName="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" 
          iconSize={48}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
      
      <div className="absolute inset-0 flex items-center justify-center">
         <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-300">
            <Play size={24} fill="currentColor" className="text-white ml-1" />
         </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400 backdrop-blur-sm">
            <Film size={16} />
          </div>
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">{t('nav.videos')}</span>
        </div>
        <h3 className="text-xl font-bold text-white font-serif leading-tight line-clamp-2">{mainVideo.title}</h3>
      </div>
    </div>
  );
};

export default DashboardVideo;
