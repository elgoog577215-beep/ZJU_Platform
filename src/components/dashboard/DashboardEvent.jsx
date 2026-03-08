import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import SmartImage from '../SmartImage';
import { getHighResUrl } from '../../utils/imageUtils';

const DashboardEvent = ({ event, onClick }) => {
  const { t } = useTranslation();
  return (
  <div 
    onClick={() => onClick(event)}
    className="relative w-full h-full rounded-3xl overflow-hidden cursor-pointer group border border-white/10 bg-black"
  >
    <SmartImage 
        src={getHighResUrl(event.image)} 
        alt={event.title} 
        type="event"
        className="w-full h-full"
        imageClassName="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" 
        iconSize={64}
    />
    
    {/* Gradient Overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
    
    {/* Date Badge */}
    <div className="absolute top-6 left-6 flex flex-col items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 shadow-lg group-hover:bg-white/20 transition-colors">
        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
        <span className="text-2xl font-bold text-white font-serif">{new Date(event.date).getDate()}</span>
    </div>

    {/* Info */}
    <div className="absolute bottom-0 left-0 w-full p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-1.5 bg-red-500/20 rounded-lg text-red-400 backdrop-blur-sm">
          <Calendar size={16} />
        </div>
        <span className="text-sm font-bold text-red-400 uppercase tracking-widest">{t('home.featured_event')}</span>
      </div>
      <h3 className="text-4xl font-bold text-white font-serif leading-tight mb-2">{event.title}</h3>
      <p className="text-gray-300 max-w-lg line-clamp-2">{event.location} • {t('common.view_details')}</p>
    </div>
  </div>
)};

export default DashboardEvent;
