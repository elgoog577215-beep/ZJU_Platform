import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, X, Filter, Upload, Clock, CheckCircle, ExternalLink, Download, Globe, FileText, AlertCircle, Share2, Copy, Award, Users, Building2, Tag, Search, Plus } from 'lucide-react';
import UploadModal from './UploadModal';
import FavoriteButton from './FavoriteButton';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
import { useSettings } from '../context/SettingsContext';
import api from '../services/api';
import SortSelector from './SortSelector';
import Dropdown from './Dropdown';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Countdown from './Countdown';
import SmartImage from './SmartImage';
import { useBackClose } from '../hooks/useBackClose';
import { useCachedResource } from '../hooks/useCachedResource';
import TagFilter from './TagFilter';
import AdvancedFilter from './AdvancedFilter';
import DOMPurify from 'dompurify';

import { useSearchParams } from 'react-router-dom';
import { getThumbnailUrl } from '../utils/imageUtils';

const getEventLifecycle = (date, endDate, t) => {
  if (!date) return t('events.status.unknown');
  try {
      const now = new Date();
      const startDate = new Date(date);
      
      // If valid end date exists, use range comparison
      if (endDate) {
          const end = new Date(endDate);
          // Adjust end date to include the full day
          end.setHours(23, 59, 59, 999);
          
          if (now < startDate) return t('events.status.upcoming');
          if (now >= startDate && now <= end) return t('events.status.ongoing');
          return t('events.status.past');
      }

      // Fallback: If only start date
      if (now < startDate) return t('events.status.upcoming');
      
      // If start date is today, consider it ongoing for the day
      const isSameDay = now.toDateString() === startDate.toDateString();
      if (isSameDay) return t('events.status.ongoing');
      
      return t('events.status.past');
  } catch (e) {
      return t('events.status.unknown');
  }
};

const getStatusColor = (status, t) => {
  switch(status) {
    case t('events.status.upcoming'): return 'bg-emerald-500 text-white';
    case t('events.status.ongoing'): return 'bg-blue-500 text-white animate-pulse';
    case t('events.status.past'): return 'bg-gray-500 text-gray-200';
    default: return 'bg-gray-500 text-white';
  }
};

const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    // Handle simplified dates (YYYY-MM-DD) and ISO strings
    const date1 = new Date(d1.includes('T') ? d1 : d1.replace(/-/g, '/'));
    const date2 = new Date(d2.includes('T') ? d2 : d2.replace(/-/g, '/'));
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return '';
    
    // Check if dateStr contains time info
    if (dateStr.includes('T') || (dateStr.includes(':') && dateStr.length > 10)) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const month = d.getMonth() + 1;
            const day = d.getDate();
            return `${month}.${day}`; 
        }
    }
    
    // Fallback for legacy date only (YYYY-MM-DD)
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    
    const month = d.getMonth() + 1;
    const day = d.getDate();
    
    // Legacy time argument support (deprecated but kept for safety)
    if (timeStr && timeStr.trim()) {
         return `${month}.${day} ${timeStr}`;
    }
    
    return `${month}.${day}`;
};

const EventCard = memo(({ event, index, onClick, onToggleFavorite }) => {
  const { t } = useTranslation();

  const status = getEventLifecycle(event.date, event.end_date, t);
  const isUpcoming = status === t('events.status.upcoming');
  const dateObj = new Date(event.date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();

  return (
    <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -8, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 300, damping: 20, delay: index * 0.05 }}
    className="group relative bg-[#1a1a1a]/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-lg hover:shadow-[0_20px_50px_-12px_rgba(79,70,229,0.3)] hover:border-indigo-500/30 cursor-pointer flex flex-row md:flex-col h-full ring-1 ring-white/5 hover:ring-indigo-500/50"
    onClick={() => onClick(event)}
  >
    {/* Glass Shine Effect */}
    <div className="absolute inset-0 z-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

{/* Image Section */}
<div className="w-1/3 md:w-full aspect-square md:aspect-auto md:h-64 overflow-hidden relative shrink-0 z-10">
    <SmartImage 
      src={getThumbnailUrl(event.image)} 
      alt={event.title} 
      loading="lazy"
      className="absolute inset-0 w-full h-full"
      imageClassName="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:brightness-110 will-change-transform" 
    />
    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90 group-hover:opacity-60 transition-opacity duration-500" />
    
    {/* Status Badge - Adjusted for mobile */}
    <div className={`absolute top-2 right-2 md:top-4 md:right-4 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-lg backdrop-blur-xl flex items-center gap-1.5 z-40 border border-white/10 ${getStatusColor(status, t)} bg-opacity-80`}>
        {status === t('events.status.upcoming') && <Clock size={12} className="md:w-3.5 md:h-3.5" />}
        {status === t('events.status.ongoing') && <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white animate-pulse" />}
        {status}
    </div>

    {/* Countdown Overlay (Upcoming only) */}
    {isUpcoming && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm z-40">
            <div className="transform scale-75 hidden md:block">
                <Countdown targetDate={event.date} />
            </div>
        </div>
    )}
</div>

{/* Content Section */}
    <div className="p-4 md:p-6 relative flex-1 flex flex-col min-w-0 h-full">
        {/* Title */}
        <h3 className="text-xl md:text-2xl font-bold text-white mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors leading-tight tracking-tight">
            {event.title}
        </h3>

        {/* Date & Location - Clean Text Row */}
        <div className="flex items-center gap-3 text-base text-gray-400 mb-4">
            <div className="flex items-center gap-1.5 shrink-0">
                <Calendar size={16} className="text-indigo-400" />
                <span className="text-gray-200 font-medium whitespace-nowrap">
                    {formatDateTime(event.date)}
                    {event.end_date && !isSameDay(event.date, event.end_date) && `-${formatDateTime(event.end_date)}`}
                </span>
            </div>
            
            <span className="text-white/20">•</span>
            
            <div className="flex items-center gap-1.5 min-w-0">
                <MapPin size={16} className="text-indigo-400 shrink-0" />
                <span className="truncate">{event.location || 'Online'}</span>
            </div>
        </div>

        {/* Description - Max 3 lines */}
        {event.description && (
            <p className="text-base text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                {event.description}
            </p>
        )}

        {/* Footer: Tags & Actions */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
            <div className="flex flex-wrap gap-2 overflow-hidden h-[32px]">
                {event.tags && event.tags.split(',').slice(0, 3).map((tag, i) => (
                    <span key={i} className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 text-xs md:text-sm font-medium border border-indigo-500/20 flex items-center gap-1 group-hover:bg-indigo-500/20 transition-colors shrink-0 max-w-[120px]">
                        <Tag size={14} className="hidden md:block shrink-0" /> 
                        <span className="truncate">{tag.trim()}</span>
                    </span>
                ))}
            </div>
            
            <div className="flex items-center gap-3 ml-auto">
                <FavoriteButton 
                    itemId={event.id}
                    itemType="event"
                    size={18}
                    showCount={false}
                    favorited={event.favorited}
                    initialFavorited={event.favorited}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    onToggle={(favorited, likes) => onToggleFavorite(event.id, favorited, likes)}
                />
                <div className="p-2 rounded-full bg-white/5 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                    <ArrowRight size={18} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                </div>
            </div>
        </div>
    </div>
  </motion.div>
  );
});

const Events = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [sort, setSort] = useState('newest');
  const [lifecycle, setLifecycle] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterVersion, setFilterVersion] = useState(0);
  const [filters, setFilters] = useState({
      location: null,
      organizer: null,
      target_audience: null
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
        setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useBackClose(selectedEvent !== null, () => setSelectedEvent(null));
  useBackClose(isUploadOpen, () => setIsUploadOpen(false));

  const limit = settings.pagination_enabled === 'true' ? 6 : 1000;

  const { 
    data: events, 
    pagination, 
    loading, 
    error, 
    setData: setEvents, 
    refresh 
  } = useCachedResource('/events', {
    page: currentPage,
    limit,
    sort,
    status: 'all',
    lifecycle: lifecycle === 'all' ? undefined : lifecycle,
    tags: selectedTags.join(','),
    search: debouncedSearch,
    ...filters
  }, {
    dependencies: [settings.pagination_enabled, lifecycle, selectedTags.join(','), debouncedSearch, JSON.stringify(filters)]
  });

  const totalPages = pagination?.totalPages || 1;
  
  // Deep linking
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
        api.get(`/events/${id}`)
           .then(res => {
               if (res.data) setSelectedEvent(res.data);
           })
           .catch(err => console.error("Failed to fetch deep linked event", err));
    }
  }, [searchParams]);

  const addToGoogleCalendar = () => {
      if (!selectedEvent) return;
      const title = encodeURIComponent(selectedEvent.title);
      const details = encodeURIComponent(selectedEvent.description + "\n\n" + selectedEvent.content); 
      const location = encodeURIComponent(selectedEvent.location);
      
      const startDateStr = selectedEvent.date.replace(/-/g, '');
      let endDateStr = startDateStr; // Default to start date if no end date
      
      if (selectedEvent.end_date) {
          // Google Calendar end date is exclusive for all-day events, so we might want to add 1 day
          // But since we store simple YYYY-MM-DD, let's just use the end date + 1 day for all-day logic
          // Or just use the end date. Let's try to be precise.
          // If input is YYYY-MM-DD, Google treats it as all day.
          // For multi-day all-day events, end date should be the day AFTER the last day.
          const d = new Date(selectedEvent.end_date);
          d.setDate(d.getDate() + 1);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          endDateStr = `${year}${month}${day}`;
      } else {
          // Single day all-day event: end date should be next day too?
          // Google Calendar template dates=YYYYMMDD/YYYYMMDD usually means start/end.
          // If same day, it works as single day.
      }

      const dates = `${startDateStr}/${endDateStr}`; 
      
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
      window.open(url, '_blank');
  };

  const downloadICS = () => {
      if (!selectedEvent) return;
      const title = selectedEvent.title;
      const desc = selectedEvent.description;
      const location = selectedEvent.location;
      const startDateStr = selectedEvent.date.replace(/-/g, '');
      let endDateStr = startDateStr;

      if (selectedEvent.end_date) {
           const d = new Date(selectedEvent.end_date);
           d.setDate(d.getDate() + 1); // ICS also uses exclusive end date for all-day events
           const year = d.getFullYear();
           const month = String(d.getMonth() + 1).padStart(2, '0');
           const day = String(d.getDate()).padStart(2, '0');
           endDateStr = `${year}${month}${day}`;
      }

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//777//Events//EN
BEGIN:VEVENT
UID:${selectedEvent.id}@777.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART;VALUE=DATE:${startDateStr}
DTEND;VALUE=DATE:${endDateStr}
SUMMARY:${title}
DESCRIPTION:${desc}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${title}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleCopyLocation = () => {
    if (selectedEvent && selectedEvent.location) {
        navigator.clipboard.writeText(selectedEvent.location)
            .then(() => toast.success(t('common.copied_to_clipboard')))
            .catch(() => toast.error(t('common.copy_failed')));
    }
  };

  const handleShare = async () => {
    if (!selectedEvent) return;
    const shareData = {
        title: selectedEvent.title,
        text: `${selectedEvent.title}\n${selectedEvent.date}\n${selectedEvent.location}\n\n${selectedEvent.description}`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.error('Error sharing:', err);
        }
    } else {
        // Fallback to copy
        handleCopyInfo();
    }
  };

  const handleCopyInfo = () => {
      if (!selectedEvent) return;
      const info = `${selectedEvent.title}\n${selectedEvent.date}\n${selectedEvent.location}\n\n${selectedEvent.description}`;
      navigator.clipboard.writeText(info)
        .then(() => toast.success(t('common.copied_to_clipboard')))
        .catch(() => toast.error(t('common.copy_failed')));
  };

  const addEvent = (newItem) => {
    api.post('/events', newItem)
    .then(() => {
        refresh({ clearCache: true });
        setFilterVersion(prev => prev + 1);
    })
    .catch(err => console.error("Failed to save event", err));
  };

  const handleUpload = (newItem) => {
    addEvent(newItem);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleFavorite = useCallback((eventId, favorited, likes) => {
    setEvents(prev => prev.map(e => 
        e.id === eventId ? { ...e, likes: likes !== undefined ? likes : e.likes, favorited } : e
    ));
    
    setSelectedEvent(prev => {
        if (prev && prev.id === eventId) {
           return { ...prev, likes: likes !== undefined ? likes : prev.likes, favorited };
        }
        return prev;
    });
  }, [setEvents, setSelectedEvent]);

  const lifecycleOptions = [
      { value: 'all', label: t('common.all') },
      { value: 'upcoming', label: t('events.status.upcoming') },
      { value: 'ongoing', label: t('events.status.ongoing') },
      { value: 'past', label: t('events.status.past') }
  ];

  return (
    <section className="pt-24 pb-40 md:py-20 px-4 md:px-8 min-h-screen relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-8 md:mb-12 relative z-40 md:pt-0 text-center"
        >
          <div className="mb-8">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold font-serif mb-3 md:mb-8">{t('events.title')}</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">{t('events.subtitle')}</p>
          </div>
          
        <div className="flex items-center gap-2 w-full md:w-auto justify-center md:absolute md:right-0 md:top-0 mb-4 md:mb-0">
             <button
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 md:px-6 md:py-3 rounded-full backdrop-blur-md border border-white/10 transition-all font-bold text-sm md:text-base shrink-0"
             >
                <Upload size={18} className="md:w-5 md:h-5" /> {t('common.create_event')}
             </button>
        </div>

        {/* Filter Section */}
        <div className="w-full max-w-4xl mx-auto mb-8 flex flex-col gap-4">
          {/* Search Bar Removed */}

          <AdvancedFilter filters={filters} onChange={setFilters} refreshTrigger={filterVersion} />

          <TagFilter selectedTags={selectedTags} onChange={setSelectedTags} type="events" />
          
          <div className="grid grid-cols-2 gap-4">
            {/* Lifecycle Filter */}
            <div className="w-full">
              <Dropdown
                value={lifecycle}
                onChange={setLifecycle}
                options={lifecycleOptions}
                icon={Filter}
                buttonClassName="bg-[#0a0a0a]/60 border border-white/10 hover:bg-[#0a0a0a]/80 w-full py-3 rounded-xl text-white backdrop-blur-3xl transition-all shadow-lg"
              />
            </div>

            {/* Sort */}
            <div className="w-full">
              <SortSelector 
                sort={sort} 
                onSortChange={setSort} 
                className="w-full" 
                buttonClassName="bg-[#0a0a0a]/60 border border-white/10 hover:bg-[#0a0a0a]/80 w-full py-3 rounded-xl text-white backdrop-blur-3xl transition-all shadow-lg" 
                extraOptions={[
                    { value: 'date_asc', label: t('sort_filter.date_asc') || 'Date (Earliest)' },
                    { value: 'date_desc', label: t('sort_filter.date_desc') || 'Date (Latest)' }
                ]}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {error ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
            <p className="text-gray-300 mb-6">{t('common.error_fetching_data') || 'Failed to load events'}</p>
            <button 
              onClick={refresh}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
            >
              Retry
            </button>
          </div>
        ) : loading && events.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-14 lg:gap-16 max-w-7xl mx-auto">
           {[1,2,3,4,5,6].map(i => (
               <div key={i} className="bg-[#1a1a1a]/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden h-full flex flex-row md:flex-col relative group">
                   {/* Shimmer Effect */}
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-skeleton" />
                   
                   {/* Image Skeleton */}
                   <div className="w-1/3 md:w-full aspect-square md:h-64 bg-white/5" />
                   {/* Content Skeleton */}
                   <div className="p-4 md:p-6 flex-1 flex flex-col w-2/3 md:w-full">
                       <div className="h-6 bg-white/10 rounded-lg w-3/4 mb-4" />
                       <div className="flex gap-2 mb-4">
                           <div className="h-6 bg-white/5 rounded-lg w-20" />
                           <div className="h-6 bg-white/5 rounded-lg w-24" />
                       </div>
                       <div className="h-4 bg-white/5 rounded-lg w-full mb-2" />
                       <div className="h-4 bg-white/5 rounded-lg w-2/3" />
                   </div>
               </div>
           ))}
        </div>
      ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-14 lg:gap-16 max-w-7xl mx-auto">
                {events.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    onClick={setSelectedEvent}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
            </div>
      )}
      
      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
            <div className="bg-white/5 rounded-full p-8 mb-6 border border-white/5 backdrop-blur-xl shadow-2xl relative group">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Calendar size={64} className="text-white/40 relative z-10" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">{t('events.no_events')}</h3>
            <p className="text-gray-400 mb-8 max-w-md text-lg">
                {(selectedTags.length > 0 || debouncedSearch || Object.values(filters).some(v => v))
                  ? (t('advanced_filter.clear') || "Clear filters") + " " + (t('common.or') || "or") + " " + (t('common.search') || "search")
                  : "暂时没有即将开始的活动，稍后再来看看吧"}
            </p>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsUploadOpen(true)}
                className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-3 border border-indigo-400/20"
            >
                <Plus size={20} />
                {t('common.create_event')}
            </motion.button>
        </div>
      )}

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Event Details Modal */}
      {createPortal(
        <AnimatePresence>
          {selectedEvent && (
            <motion.div 
              initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-3xl"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#0a0a0a] w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl custom-scrollbar relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header Image */}
              <div className="h-72 sm:h-96 relative">
                 <SmartImage 
                    src={selectedEvent.image} 
                    alt={selectedEvent.title} 
                    type="event"
                    className="w-full h-full"
                    imageClassName="w-full h-full object-cover"
                    iconSize={64}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
                 
                 <button 
                    onClick={() => setSelectedEvent(null)}
                    className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10 transition-all z-20 group"
                 >
                    <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                 </button>

                 <div className="absolute bottom-0 left-0 px-6 pt-6 pb-6 md:px-10 md:pt-10 md:pb-8 w-full z-20 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent pt-48 -mb-1 backdrop-blur-[2px]">
                             {/* Editorial Eyebrow: Date & Location & Status */}
                        <div className="flex justify-between items-end w-full mb-4">
                            <div className="flex items-center gap-3 text-indigo-300 font-bold text-lg md:text-xl uppercase tracking-[0.2em] ml-1 opacity-100 drop-shadow-lg">
                                    <span className="flex items-center gap-2">
                                        {selectedEvent.end_date ? (
                                            isSameDay(selectedEvent.date, selectedEvent.end_date) ? (
                                                <span className="text-indigo-300 font-bold">
                                                    {formatDateTime(selectedEvent.date)}
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="text-indigo-300 font-bold">{formatDateTime(selectedEvent.date)}</span>
                                                    <span className="text-white/40 text-base mx-1">-</span>
                                                    <span className="text-rose-300 font-bold">{formatDateTime(selectedEvent.end_date)}</span>
                                                </>
                                            )
                                        ) : (
                                            <span className="text-indigo-300 font-bold">{formatDateTime(selectedEvent.date)}</span>
                                        )}
                                    </span>
                                    <span className="text-white/40">|</span>
                                    <span className="flex items-center gap-2">
                                        {selectedEvent.location || t('common.online')}
                                    </span>
                            </div>
                        </div>

                    <div className="flex justify-between items-end gap-6">
                       <div className="max-w-[85%]">
                           <h2 className="text-4xl md:text-6xl font-black text-white leading-[0.95] tracking-tight font-serif drop-shadow-2xl inline decoration-clone">
                               {selectedEvent.title}
                               <span className={`inline-flex items-center justify-center align-middle ml-4 px-3 py-1.5 rounded-lg text-sm font-bold uppercase tracking-wider border backdrop-blur-md font-sans shadow-lg translate-y-[-0.2em] ${getStatusColor(getEventLifecycle(selectedEvent.date, selectedEvent.end_date, t), t).replace('rounded-full', 'rounded-lg').replace('px-4', 'px-3').replace('py-1.5', 'py-1.5')}`}>
                                   {getEventLifecycle(selectedEvent.date, selectedEvent.end_date, t)}
                               </span>
                           </h2>
                       </div>
                        
                        <div className="flex flex-col items-end gap-3 shrink-0 mb-1">
                            <FavoriteButton 
                                itemId={selectedEvent.id}
                                itemType="event"
                                size={24}
                                showCount={true}
                                count={selectedEvent.likes || 0}
                                favorited={selectedEvent.favorited}
                                className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors shrink-0 border border-white/10"
                                onToggle={(favorited, likes) => {
                                    setSelectedEvent(prev => ({ ...prev, likes: likes !== undefined ? likes : prev.likes, favorited }));
                                    setEvents(prev => prev.map(e => 
                                        e.id === selectedEvent.id ? { ...e, likes: likes !== undefined ? likes : e.likes, favorited } : e
                                    ));
                                }}
                            />
                        </div>
                     </div>
                 </div>
              </div>

              {/* Modal Content */}
              <div className="p-5 sm:p-8 pt-2 sm:pt-4">
                 <div className="flex flex-col lg:flex-row gap-5">
                     <div className="flex-1 space-y-4">
                         <div className="bg-white/5 rounded-2xl p-5 border border-white/5 h-full">
                             <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                                 <FileText size={20} className="text-indigo-400" /> 
                                 {t('common.description')}
                             </h3>
                             {/* Render HTML content safely */}
                             <div 
                                className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedEvent.content || `<p>${selectedEvent.description}</p>`) }} 
                             />
                         </div>
                     </div>

                     {/* Sidebar - Details & Link */}
                     <div className="lg:w-1/2 space-y-4">
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/5 sticky top-8 space-y-5">
                            
                            {/* Call to Action - Link */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Globe size={16} className="text-indigo-400" />
                                    {t('events.event_link')}
                                </h3>
                                {selectedEvent.link ? (
                                    <a
                                        href={selectedEvent.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-indigo-500/80 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 backdrop-blur-md border border-white/10 group"
                                    >
                                        {t('events.visit_link')}
                                        <ExternalLink size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                    </a>
                                ) : (
                                    <div className="p-3 bg-white/5 rounded-xl text-gray-500 text-sm text-center border border-white/5 backdrop-blur-sm">
                                        {t('events.no_link_available')}
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            {/* Key Attributes Grid - Now just Tags */}
                            {selectedEvent.tags && (
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 text-indigo-400 mb-3">
                                        <Tag size={18} />
                                        <span className="text-sm font-bold uppercase tracking-wider">{t('upload.tags')}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedEvent.tags.split(',').map((tag, i) => (
                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 text-sm font-medium border border-white/5 hover:bg-white/10 transition-colors">
                                                {tag.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            {/* Detailed Info List */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="flex gap-3 items-center group">
                                    <div className="p-2.5 bg-orange-500/5 border border-orange-500/10 rounded-xl text-orange-400 shrink-0 group-hover:bg-orange-500/10 transition-colors">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-400 text-sm uppercase tracking-wider mb-1">{t('events.date_label')}</h4>
                                        <span className="text-gray-200 text-base leading-snug whitespace-nowrap">
                                            {formatDateTime(selectedEvent.date)}
                                            {selectedEvent.end_date && !isSameDay(selectedEvent.date, selectedEvent.end_date) && `-${formatDateTime(selectedEvent.end_date)}`}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-3 items-center group">
                                    <div className="p-2.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-indigo-400 shrink-0 group-hover:bg-indigo-500/10 transition-colors">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-400 text-sm uppercase tracking-wider mb-1">{t('events.location_label')}</h4>
                                        <p className="text-gray-200 text-base leading-snug">{selectedEvent.location || t('common.online')}</p>
                                    </div>
                                </div>

                                {selectedEvent.organizer && (
                                    <div className="flex gap-3 items-center group">
                                        <div className="p-2.5 bg-green-500/5 border border-green-500/10 rounded-xl text-green-400 shrink-0 group-hover:bg-green-500/10 transition-colors">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-400 text-sm uppercase tracking-wider mb-1">{t('event_fields.organizer')}</h4>
                                            <p className="text-gray-200 text-base leading-snug">{selectedEvent.organizer}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.target_audience && (
                                    <div className="flex gap-3 items-center group">
                                        <div className="p-2.5 bg-blue-500/5 border border-blue-500/10 rounded-xl text-blue-400 shrink-0 group-hover:bg-blue-500/10 transition-colors">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-400 text-sm uppercase tracking-wider mb-1">{t('event_fields.target_audience')}</h4>
                                            <p className="text-gray-200 text-base leading-snug">{selectedEvent.target_audience}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.volunteer_time && (
                                    <div className="flex gap-3 items-center group">
                                        <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-emerald-400 shrink-0 group-hover:bg-emerald-500/10 transition-colors">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-400 text-sm uppercase tracking-wider mb-1">{t('event_fields.volunteer_duration')}</h4>
                                            <p className="text-gray-200 text-base leading-snug">{selectedEvent.volunteer_time}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.score && (
                                    <div className="flex gap-3 items-center group">
                                        <div className="p-2.5 bg-purple-500/5 border border-purple-500/10 rounded-xl text-purple-400 shrink-0 group-hover:bg-purple-500/10 transition-colors">
                                            <Award size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-400 text-sm uppercase tracking-wider mb-1">{t('event_fields.score_label')}</h4>
                                            <p className="text-gray-200 text-base leading-snug">{selectedEvent.score}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                     </div>
                 </div>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        type="event"
      />
    </section>
  );
};

export default Events;
