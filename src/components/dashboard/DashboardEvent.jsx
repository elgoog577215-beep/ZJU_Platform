import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import SmartImage from '../SmartImage';
import { getHighResUrl } from '../../utils/imageUtils';
import { useSettings } from '../../context/SettingsContext';

const DashboardEvent = ({ event, onClick }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  return (
  <div 
    onClick={() => onClick(event)}
    className={`relative w-full h-full rounded-3xl overflow-hidden cursor-pointer group border ${isDayMode ? 'border-slate-200/80 bg-white/88 shadow-[0_18px_40px_rgba(148,163,184,0.18)]' : 'border-white/10 bg-black'}`}
  >
    <SmartImage 
        src={getHighResUrl(event.image)} 
        alt={event.title} 
        type="event"
        className="w-full h-full"
        imageClassName={`w-full h-full object-cover transition-opacity duration-500 ${isDayMode ? 'opacity-72 group-hover:opacity-90' : 'opacity-60 group-hover:opacity-80'}`} 
        iconSize={64}
    />
    
    {/* Gradient Overlay */}
    <div className={`absolute inset-0 ${isDayMode ? 'bg-gradient-to-t from-white via-white/12 to-transparent' : 'bg-gradient-to-t from-black/90 via-transparent to-transparent'}`} />
    
    {/* Date Badge */}
    <div className={`absolute top-6 left-6 flex flex-col items-center backdrop-blur-md border rounded-xl p-3 shadow-lg transition-colors ${isDayMode ? 'bg-white/88 border-slate-200/80 group-hover:bg-white' : 'bg-white/10 border-white/20 group-hover:bg-white/20'}`}>
        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
        <span className={`text-2xl font-bold font-serif ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{new Date(event.date).getDate()}</span>
    </div>

    {/* Info */}
    <div className="absolute bottom-0 left-0 w-full p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-1.5 bg-red-500/20 rounded-lg text-red-400 backdrop-blur-sm">
          <Calendar size={16} />
        </div>
        <span className="text-sm font-bold text-red-400 uppercase tracking-widest">{t('home.featured_event')}</span>
      </div>
      <h3 className={`text-4xl font-bold font-serif leading-tight mb-2 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{event.title}</h3>
      <p className={`max-w-lg line-clamp-2 ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>{event.location} • {t('common.view_details')}</p>
    </div>
  </div>
)};

export default DashboardEvent;
