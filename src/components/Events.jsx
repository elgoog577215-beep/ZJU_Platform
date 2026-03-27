import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, X, Upload, Clock, CheckCircle, ExternalLink, Download, Globe, FileText, AlertCircle, Share2, Copy, Award, Users, Building2, Tag, Search, Plus } from 'lucide-react';
import UploadModal from './UploadModal';
import FavoriteButton from './FavoriteButton';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
import { useSettings } from '../context/SettingsContext';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Countdown from './Countdown';
import SmartImage from './SmartImage';
import { useBackClose } from '../hooks/useBackClose';
import { useCachedResource } from '../hooks/useCachedResource';
import EventFilterPanel from './EventFilterPanel';
import SortSelector from './SortSelector';
import DOMPurify from 'dompurify';

import { useSearchParams } from 'react-router-dom';
import { getThumbnailUrl } from '../utils/imageUtils';

const getEventLifecycle = (date, endDate, t) => {
  if (!date) return t('events.status.unknown');
  try {
      const now = new Date();
      // For YYYY-MM-DD (no time), treat as local midnight by replacing - with /
      const startDate = new Date(date.includes('T') ? date : date.replace(/-/g, '/'));

      if (endDate) {
          // For YYYY-MM-DD (no time), treat as end of that day (23:59:59)
          let end;
          if (endDate.includes('T')) {
              end = new Date(endDate);
          } else {
              end = new Date(endDate.replace(/-/g, '/'));
              end.setHours(23, 59, 59, 999);
          }

          if (now < startDate) return t('events.status.upcoming');
          if (now >= startDate && now <= end) return t('events.status.ongoing');
          return t('events.status.past');
      }

      // Fallback: only start date — treat as ongoing for the full start day
      if (now < startDate) return t('events.status.upcoming');
      const startDayEnd = new Date(startDate);
      startDayEnd.setHours(23, 59, 59, 999);
      if (now <= startDayEnd) return t('events.status.ongoing');
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
    // Compare only the date portion (first 10 chars: YYYY-MM-DD) to avoid timezone issues
    return d1.substring(0, 10) === d2.substring(0, 10);
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    // Extract date parts from string directly to avoid timezone issues
    // Supports: YYYY-MM-DD, YYYY-MM-DDTHH:MM, YYYY-MM-DDTHH:MM:SS
    const datePart = dateStr.substring(0, 10); // YYYY-MM-DD
    const parts = datePart.split('-');
    if (parts.length < 3) return dateStr;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(month) || isNaN(day)) return dateStr;

    // Check if time part exists (format: YYYY-MM-DDTHH:MM)
    if (dateStr.length > 10 && dateStr[10] === 'T') {
        const timePart = dateStr.substring(11, 16); // HH:MM
        if (timePart && timePart !== '00:00') {
            return `${month}.${day} ${timePart}`;
        }
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
<div className="w-[120px] sm:w-1/3 md:w-full aspect-square md:h-64 overflow-hidden relative shrink-0 z-10 m-3 md:m-0 rounded-2xl md:rounded-none">
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
    <div className="p-3 md:p-6 relative flex-1 flex flex-col min-w-0 h-full justify-center md:justify-start">
        {/* Title */}
        <h3 className="text-base sm:text-lg md:text-2xl font-bold text-white mb-1.5 md:mb-2 line-clamp-2 group-hover:text-indigo-400 transition-colors leading-tight tracking-tight">
            {event.title}
        </h3>

        {/* Date & Location - Clean Text Row */}
        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-xs sm:text-sm md:text-base text-gray-400 mb-2 md:mb-4">
            <div className="flex items-center gap-1.5 shrink-0">
                <Calendar size={14} className="text-indigo-400 md:w-4 md:h-4" />
                <span className="text-gray-200 font-medium whitespace-nowrap">
                    {formatDateTime(event.date)}
                    {event.end_date && !isSameDay(event.date, event.end_date) && `-${formatDateTime(event.end_date)}`}
                </span>
            </div>
            
            <span className="hidden md:inline text-white/20">•</span>
            
            <div className="flex items-center gap-1.5 min-w-0">
                <MapPin size={14} className="text-indigo-400 shrink-0 md:w-4 md:h-4" />
                <span className="truncate">{event.location || 'Online'}</span>
            </div>
        </div>

        {/* Description - Max 3 lines (Hidden on Mobile) */}
        {event.description && (
            <p className="hidden md:block text-base text-gray-400 mb-4 line-clamp-3 leading-relaxed">
                {event.description}
            </p>
        )}

        {/* Benefits Badges */}
        {(event.score || event.volunteer_time) && (
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-4">
                {event.score && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold uppercase tracking-wider">
                        <Award size={12} />
                        {event.score}
                    </span>
                )}
                {event.volunteer_time && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
                        <Clock size={12} />
                        {event.volunteer_time}
                    </span>
                )}
            </div>
        )}

        {/* Footer: Tags & Actions */}
        <div className="flex items-center justify-between mt-auto pt-2 md:pt-3 border-t border-white/5">
            <div className="flex flex-wrap gap-1.5 md:gap-2 overflow-hidden min-h-[24px] md:min-h-[32px]">
                {event.tags && event.tags.split(',').slice(0, 2).map((tag, i) => (
                    <span key={i} className="px-1.5 py-0.5 md:px-2.5 md:py-1.5 rounded-md md:rounded-lg bg-indigo-500/10 text-indigo-300 text-[10px] md:text-xs font-medium border border-indigo-500/20 flex items-center gap-1 group-hover:bg-indigo-500/20 transition-colors shrink-0 max-w-[80px] md:max-w-[120px]">
                        <Tag size={10} className="md:w-3 md:h-3" />
                        <span className="truncate">{tag.trim()}</span>
                    </span>
                ))}
            </div>
            
            <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto">
                <FavoriteButton 
                    itemId={event.id}
                    itemType="event"
                    size={16}
                    showCount={false}
                    favorited={event.favorited}
                    initialFavorited={event.favorited}
                    className="p-1.5 md:p-2 rounded-full hover:bg-white/10 transition-colors"
                    onToggle={(favorited, likes) => onToggleFavorite(event.id, favorited, likes)}
                />
                <div className="p-1.5 md:p-2 rounded-full bg-white/5 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                    <ArrowRight size={16} className="md:w-[18px] md:h-[18px] -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
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
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);

  // Listen for global events from Navbar
  useEffect(() => {
    const handleOpenUpload = (e) => {
        if (e.detail.type === 'event') setIsUploadOpen(true);
    };
    const handleToggleFilter = () => {
        setIsMobileSortOpen(false);
        setIsMobileFilterOpen(prev => !prev);
    };
    const handleToggleSort = () => {
        setIsMobileFilterOpen(false);
        setIsMobileSortOpen(prev => !prev);
    };

    window.addEventListener('open-upload-modal', handleOpenUpload);
    window.addEventListener('toggle-mobile-filter', handleToggleFilter);
    window.addEventListener('toggle-mobile-sort', handleToggleSort);
    return () => {
        window.removeEventListener('open-upload-modal', handleOpenUpload);
        window.removeEventListener('toggle-mobile-filter', handleToggleFilter);
        window.removeEventListener('toggle-mobile-sort', handleToggleSort);
    };
  }, []);

  const [sort, setSort] = useState('date_desc');
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
  const hasActiveMobileFilters = Object.values(filters).some(v => v) || selectedTags.length > 0 || lifecycle !== 'all';
  const mobileSortLabel = useMemo(() => {
    switch (sort) {
      case 'date_asc':
        return t('sort_filter.date_asc', '最早');
      case 'date_desc':
        return t('sort_filter.date_desc', '最晚');
      case 'likes':
        return t('sort_filter.likes', '最热');
      case 'title':
        return t('sort_filter.title', '标题');
      default:
        return t('sort_filter.newest', '最新');
    }
  }, [sort, t]);

  const resetMobileFilters = () => {
    setFilters({ location: null, organizer: null, target_audience: null });
    setSelectedTags([]);
    setLifecycle('all');
  };

  useEffect(() => {
    const count = Object.values(filters).filter(Boolean).length + selectedTags.length + (lifecycle !== 'all' ? 1 : 0);
    window.dispatchEvent(new CustomEvent('set-mobile-toolbar-state', {
      detail: {
        filterCount: count,
        sortLabel: mobileSortLabel
      }
    }));
  }, [filters, selectedTags, lifecycle, mobileSortLabel]);

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
      const hasTime = (str) => str && str.length > 10 && str[10] === 'T';

      let dates;
      if (hasTime(selectedEvent.date)) {
          // datetime event: format YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS
          const toGCalDateTime = (str) => str.substring(0, 16).replace(/[-:T]/g, '') + '00';
          const startStr = toGCalDateTime(selectedEvent.date);
          const endStr = selectedEvent.end_date
              ? toGCalDateTime(selectedEvent.end_date)
              : toGCalDateTime(selectedEvent.date); // same time if no end
          dates = `${startStr}/${endStr}`;
      } else {
          // all-day event: format YYYYMMDD/YYYYMMDD (end is exclusive, add 1 day)
          const startStr = selectedEvent.date.replace(/-/g, '');
          let endStr = startStr;
          if (selectedEvent.end_date) {
              const d = new Date(selectedEvent.end_date.replace(/-/g, '/'));
              d.setDate(d.getDate() + 1);
              endStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
          }
          dates = `${startStr}/${endStr}`;
      }

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
      window.open(url, '_blank');
  };

  const downloadICS = () => {
      if (!selectedEvent) return;
      const title = selectedEvent.title;
      const desc = selectedEvent.description;
      const location = selectedEvent.location;
      const hasTime = (str) => str && str.length > 10 && str[10] === 'T';

      let dtStart, dtEnd;
      if (hasTime(selectedEvent.date)) {
          // datetime event: DTSTART:YYYYMMDDTHHMMSS
          const toICSDateTime = (str) => str.substring(0, 16).replace(/[-:T]/g, '') + '00';
          dtStart = `DTSTART:${toICSDateTime(selectedEvent.date)}`;
          dtEnd = `DTEND:${selectedEvent.end_date ? toICSDateTime(selectedEvent.end_date) : toICSDateTime(selectedEvent.date)}`;
      } else {
          // all-day event: DTSTART;VALUE=DATE:YYYYMMDD (end is exclusive)
          const startStr = selectedEvent.date.replace(/-/g, '');
          let endStr = startStr;
          if (selectedEvent.end_date) {
              const d = new Date(selectedEvent.end_date.replace(/-/g, '/'));
              d.setDate(d.getDate() + 1);
              endStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
          }
          dtStart = `DTSTART;VALUE=DATE:${startStr}`;
          dtEnd = `DTEND;VALUE=DATE:${endStr}`;
      }

      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//777//Events//EN
BEGIN:VEVENT
UID:${selectedEvent.id}@777.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
${dtStart}
${dtEnd}
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


  return (
    <section className="pt-24 pb-28 md:py-20 px-4 md:px-8 relative overflow-hidden flex-grow">
      {/* Ambient Background - Hidden on mobile for performance */}
      <div className="fixed inset-0 pointer-events-none z-0 hidden md:block">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-6 md:mb-12 relative z-40 md:pt-0 text-center"
        >
          <div className="hidden md:block mb-8">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold font-serif mb-3 md:mb-8">{t('events.title')}</h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">{t('events.subtitle')}</p>
          </div>
          
        <div className="hidden md:flex items-center gap-2 w-full md:w-auto justify-center md:absolute md:right-0 md:top-0 mb-4 md:mb-0">
             <button
                onClick={() => {
                  if (!user) {
                    toast.error(t('auth.signin_required'));
                    return;
                  }
                  setIsUploadOpen(true);
                }}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 md:px-6 md:py-3 rounded-full backdrop-blur-md border border-white/10 transition-all font-bold text-sm md:text-base shrink-0"
             >
                <Upload size={18} className="md:w-5 md:h-5" /> {t('common.create_event')}
             </button>
        </div>

        {/* Desktop Filter Section */}
        <div className="hidden md:block w-full max-w-4xl mx-auto mb-8">
          <EventFilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            lifecycle={lifecycle}
            onLifecycleChange={setLifecycle}
            sort={sort}
            onSortChange={setSort}
            refreshTrigger={filterVersion}
          />
        </div>

        {/* Mobile Filter Drawer (Bottom Sheet) */}
        {createPortal(
          <AnimatePresence>
              {isMobileFilterOpen && (
                  <>
                      <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setIsMobileFilterOpen(false)}
                          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
                      />
                      <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: 16 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: 16 }}
                          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                          className="fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl z-[101] md:hidden flex flex-col max-h-[80vh] max-w-md mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                      >
                          <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 z-10 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-t-3xl">
                              <div>
                                  <h3 className="text-lg font-bold text-white">{t('common.filters', '筛选')}</h3>
                                  <p className="text-xs text-gray-400 mt-1">{t('advanced_filter.title') || '筛选活动内容'}</p>
                              </div>
                              <button onClick={() => setIsMobileFilterOpen(false)} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors">
                                  <X size={20} />
                              </button>
                          </div>
                          <div className="p-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                              <EventFilterPanel
                                  filters={filters}
                                  onFiltersChange={setFilters}
                                  selectedTags={selectedTags}
                                  onTagsChange={setSelectedTags}
                                  lifecycle={lifecycle}
                                  onLifecycleChange={setLifecycle}
                                  sort={sort}
                                  onSortChange={setSort}
                                  refreshTrigger={filterVersion}
                                  hideSort={true}
                                  mode="sheet"
                              />
                          </div>
                          <div className="p-4 border-t border-white/10 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-b-3xl flex items-center gap-3 shrink-0">
                              <button
                                  type="button"
                                  onClick={resetMobileFilters}
                                  disabled={!hasActiveMobileFilters}
                                  className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                  {t('common.clear_all', '重置')}
                              </button>
                              <button
                                  type="button"
                                  onClick={() => setIsMobileFilterOpen(false)}
                                  className="flex-1 py-3 rounded-2xl bg-white text-black font-semibold"
                              >
                                  {t('common.done', '完成')}
                              </button>
                          </div>
                      </motion.div>
                  </>
              )}
          </AnimatePresence>,
          document.body
        )}

        {/* Mobile Sort Drawer (Bottom Sheet) */}
        {createPortal(
          <AnimatePresence>
              {isMobileSortOpen && (
                  <>
                      <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setIsMobileSortOpen(false)}
                          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
                      />
                      <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: 16 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: 16 }}
                          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                          className="fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl z-[101] md:hidden flex flex-col max-w-sm mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                      >
                          <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 z-10 bg-[#1a1a1a]/95 backdrop-blur-xl rounded-t-3xl">
                              <div>
                                  <h3 className="text-lg font-bold text-white">{t('common.sort', '排序')}</h3>
                                  <p className="text-xs text-gray-400 mt-1">{t('sort_filter.title') || '选择活动排序方式'}</p>
                              </div>
                              <button onClick={() => setIsMobileSortOpen(false)} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-full transition-colors">
                                  <X size={20} />
                              </button>
                          </div>
                          <div className="p-4">
                              <SortSelector 
                                  sort={sort} 
                                  onSortChange={(val) => {
                                      setSort(val);
                                      setTimeout(() => setIsMobileSortOpen(false), 300);
                                  }} 
                                  className="w-full" 
                                  extraOptions={[
                                      { value: 'date_asc', label: t('sort_filter.date_asc') || 'Date (Earliest)' },
                                      { value: 'date_desc', label: t('sort_filter.date_desc') || 'Date (Latest)' }
                                  ]}
                                  renderMode="list"
                              />
                          </div>
                      </motion.div>
                  </>
              )}
          </AnimatePresence>,
          document.body
        )}
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
                onClick={() => {
                  if (!user) {
                    toast.error(t('auth.signin_required'));
                    return;
                  }
                  setIsUploadOpen(true);
                }}
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#0f0f0f] w-full max-w-5xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-[2rem] border-0 sm:border border-white/10 shadow-2xl custom-scrollbar relative flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header Image */}
              <div className="h-72 sm:h-96 relative shrink-0">
                 <SmartImage 
                    src={selectedEvent.image} 
                    alt={selectedEvent.title} 
                    type="event"
                    className="w-full h-full"
                    imageClassName="w-full h-full object-cover"
                    iconSize={64}
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/40 to-transparent" />
                 
                 <button 
                    onClick={() => setSelectedEvent(null)}
                    className="absolute top-[max(env(safe-area-inset-top),16px)] right-4 sm:top-6 sm:right-6 p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10 transition-all z-20 group"
                 >
                    <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                 </button>

                 <div className="absolute bottom-0 left-0 px-5 pt-8 pb-5 sm:px-10 sm:pt-12 sm:pb-8 w-full z-20 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/90 to-transparent backdrop-blur-[2px]">
                             {/* Editorial Eyebrow: Date & Location & Status */}
                         <div className="flex justify-between items-end w-full mb-3 sm:mb-4">
                             <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                                 <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-inner flex items-center gap-2">
                                     <Calendar size={14} className="text-white sm:w-4 sm:h-4" />
                                     <span className="text-white font-bold text-xs sm:text-sm tracking-wide">
                                         {formatDateTime(selectedEvent.date)}
                                     </span>
                                 </div>
                             </div>
                        </div>

                    <div className="flex justify-between items-end gap-4 sm:gap-6">
                       <div className="max-w-[85%]">
                           <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-[1.2] sm:leading-[1.1] tracking-tight">
                               {selectedEvent.title}
                               <span className={`inline-flex items-center justify-center align-middle ml-3 sm:ml-4 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider border backdrop-blur-md font-sans shadow-lg translate-y-[-0.1em] sm:translate-y-[-0.2em] ${getStatusColor(getEventLifecycle(selectedEvent.date, selectedEvent.end_date, t), t)}`}>
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
              <div className="p-4 sm:p-8 pt-4 flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),20px)] sm:pb-8">
                 <div className="flex flex-col-reverse lg:flex-row gap-5">
                     <div className="flex-1 space-y-4">
                         <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/5 h-full">
                             <h3 className="text-lg sm:text-xl font-bold text-white mb-3 flex items-center gap-2">
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
