import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, X, Filter, Upload, Clock, CheckCircle, ExternalLink, Download, Globe, FileText, AlertCircle, Share2, Copy, Award, Users, Building2, Tag, Search } from 'lucide-react';
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

import { useSearchParams } from 'react-router-dom';

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
      const dateStr = selectedEvent.date.replace(/-/g, '');
      const dates = `${dateStr}/${dateStr}`; 
      
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
      window.open(url, '_blank');
  };

  const downloadICS = () => {
      if (!selectedEvent) return;
      const title = selectedEvent.title;
      const desc = selectedEvent.description;
      const location = selectedEvent.location;
      const dateStr = selectedEvent.date.replace(/-/g, '');
      
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//777//Events//EN
BEGIN:VEVENT
UID:${selectedEvent.id}@777.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART;VALUE=DATE:${dateStr}
DTEND;VALUE=DATE:${dateStr}
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

  const getEventLifecycle = (date) => {
    if (!date) return t('events.status.unknown');
    try {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        
        if (date > today) return t('events.status.upcoming');
        if (date === today) return t('events.status.ongoing');
        return t('events.status.past');
    } catch (e) {
        return t('events.status.unknown');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case t('events.status.upcoming'): return 'bg-emerald-500 text-white';
      case t('events.status.ongoing'): return 'bg-blue-500 text-white animate-pulse';
      case t('events.status.past'): return 'bg-gray-500 text-gray-200';
      default: return 'bg-gray-500 text-white';
    }
  };

  const lifecycleOptions = [
      { value: 'all', label: t('common.all') },
      { value: 'upcoming', label: t('events.status.upcoming') },
      { value: 'ongoing', label: t('events.status.ongoing') },
      { value: 'past', label: t('events.status.past') }
  ];

  return (
    <section className="pt-24 pb-40 md:py-20 px-4 md:px-8 min-h-screen">
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
                buttonClassName="bg-white/5 border border-white/10 hover:bg-white/10 w-full py-3 rounded-xl text-white backdrop-blur-sm transition-all shadow-lg"
              />
            </div>

            {/* Sort */}
            <div className="w-full">
              <SortSelector 
                sort={sort} 
                onSortChange={setSort} 
                className="w-full" 
                buttonClassName="bg-white/5 border border-white/10 hover:bg-white/10 w-full py-3 rounded-xl text-white backdrop-blur-sm transition-all shadow-lg" 
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
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 max-w-7xl mx-auto">
           {[1,2,3].map(i => (
               <div key={i} className="bg-white/5 rounded-3xl h-64 md:h-96 animate-pulse" />
           ))}
        </div>
      ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 max-w-7xl mx-auto">
                {events.map((event, index) => {
                  const status = getEventLifecycle(event.date);
                  const isUpcoming = status === t('events.status.upcoming');
                  const dateObj = new Date(event.date);
                  const day = dateObj.getDate();
                  const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();

                  return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group relative bg-[#111] border border-white/10 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 hover:-translate-y-2 cursor-pointer flex flex-row md:flex-col md:h-auto"
                    onClick={() => setSelectedEvent(event)}
                  >
                {/* Image Section */}
                <div className="w-1/3 aspect-square md:w-full md:aspect-auto md:h-64 overflow-hidden relative shrink-0">
                    <SmartImage 
                      src={event.image} 
                      alt={event.title} 
                      loading="lazy"
                      className="absolute inset-0 w-full h-full"
                      imageClassName="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-80" />
                    
                    {/* Date Badge & Score Badge Container */}
                    <div className="absolute top-4 left-4 flex gap-3 z-40">
                        {/* Date Badge */}
                        <div className="hidden md:flex bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex-col items-center justify-center min-w-[64px] shadow-lg group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-colors duration-300">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-200 group-hover:text-white/90">{month}</span>
                            <span className="text-2xl font-black text-white">{day}</span>
                        </div>

                        {/* Score Badge */}
                        {event.score && (
                            <div className="hidden md:flex bg-indigo-600/90 backdrop-blur-md border border-indigo-500/50 rounded-2xl p-3 flex-col items-center justify-center min-w-[64px] shadow-lg">
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-100">Score</span>
                                <span className="text-xl font-black text-white">{event.score}</span>
                            </div>
                        )}
                    </div>

                    {/* Status Badge - Adjusted for mobile */}
                    <div className={`absolute top-2 right-2 md:top-4 md:right-4 px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-sm font-bold uppercase tracking-wider shadow-lg backdrop-blur-md flex items-center gap-1.5 z-40 ${getStatusColor(status)}`}>
                        {status === t('events.status.upcoming') && <Clock size={12} className="md:w-4 md:h-4" />}
                        {status === t('events.status.ongoing') && <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white animate-pulse" />}
                        {status}
                    </div>

                    {/* Share Button - Hidden on mobile list */}
                    <div className="hidden md:flex absolute bottom-4 right-4 gap-2 z-30">
                        <FavoriteButton 
                                                itemId={event.id}
                                                itemType="event"
                                                size={18}
                                                showCount={false}
                                                favorited={event.favorited}
                                                initialFavorited={event.favorited}
                                                className="p-2 bg-black/40 hover:bg-indigo-600 rounded-full text-white backdrop-blur-md transition-all"
                                                onToggle={(favorited, likes) => {
                                                    setEvents(prev => prev.map(e => 
                                                        e.id === event.id ? { ...e, likes: likes !== undefined ? likes : e.likes, favorited } : e
                                                    ));
                                                    if (selectedEvent && selectedEvent.id === event.id) {
                                                        setSelectedEvent(prev => ({ ...prev, likes: likes !== undefined ? likes : prev.likes, favorited }));
                                                    }
                                                }}
                                            />
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
                    <div className="p-4 md:p-6 relative flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-2 md:mb-4">
                            <div className="flex items-center gap-1 md:gap-2 text-sm md:text-base text-gray-400">
                                 <MapPin size={14} className="md:w-4 md:h-4 text-indigo-400" />
                                 <span className="truncate max-w-[100px] md:max-w-[150px]">{event.location || 'Online'}</span>
                            </div>
                        </div>

                        <h3 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-3 line-clamp-2 group-hover:text-indigo-400 transition-colors leading-tight">{event.title}</h3>
                        <p className="text-gray-400 text-sm md:text-base line-clamp-2 mb-3 md:mb-4 leading-relaxed hidden md:block">{event.description}</p>
                        
                        {/* Phase 1: Key Info on Card */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {event.tags && event.tags.split(',').slice(0, 2).map((tag, i) => (
                                <span key={i} className="px-2 py-1 rounded-md bg-purple-500/10 text-purple-300 text-sm font-bold uppercase tracking-wider border border-purple-500/20 flex items-center gap-1 group-hover:bg-purple-500/20 transition-colors">
                                    <Tag size={14} /> {tag.trim()}
                                </span>
                            ))}
                            {event.target_audience && (
                                 <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-300 text-sm font-bold uppercase tracking-wider border border-blue-500/20 flex items-center gap-1 max-w-[120px] truncate group-hover:bg-blue-500/20 transition-colors">
                                    <Users size={14} /> {event.target_audience}
                                </span>
                            )}
                        </div>

                        {/* Mobile Date Display - Keeping it as backup but badges are now visible */}
                        <p className="text-gray-300 font-medium text-sm md:hidden mb-2 mt-2 flex items-center gap-1.5">
                            <Calendar size={16} className="text-indigo-400" /> {event.date}
                        </p>

                        <div className="flex items-center text-indigo-400 font-bold text-base md:text-lg group-hover:translate-x-2 transition-transform mt-auto md:mt-0">
                            {t('common.view_details')} <ArrowRight size={18} className="ml-1 md:ml-2 md:w-5 md:h-5" />
                        </div>
                    </div>
              </motion.div>
            )})}
        </div>
      )}
      
      {!loading && events.length === 0 && (
          <div className="text-center py-20">
              <div className="bg-white/5 rounded-full p-6 inline-block mb-4">
                  <Calendar size={48} className="text-gray-600" />
              </div>
              <p className="text-gray-500 text-lg">{t('events.no_events')}</p>
          </div>
      )}

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 50, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-[#111] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl custom-scrollbar relative"
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
                 <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
                 
                 <button 
                    onClick={() => setSelectedEvent(null)}
                    className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10 transition-all z-20"
                 >
                    <X size={24} />
                 </button>

                 <div className="absolute bottom-0 left-0 p-8 w-full">
                     <div className="flex flex-wrap gap-3 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(getEventLifecycle(selectedEvent.date))}`}>
                            {getEventLifecycle(selectedEvent.date)}
                        </span>
                        {selectedEvent.tags && selectedEvent.tags.split(',').map((tag, i) => (
                             <span key={i} className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-gray-300 border border-white/5">
                                 {tag.trim()}
                             </span>
                        ))}
                     </div>
                     <div className="flex justify-between items-start gap-4">
                        <h2 className="text-2xl sm:text-4xl font-bold text-white mb-2 leading-tight">{selectedEvent.title}</h2>
                        <FavoriteButton 
                            itemId={selectedEvent.id}
                            itemType="event"
                            size={24}
                            showCount={true}
                            count={selectedEvent.likes || 0}
                            favorited={selectedEvent.favorited}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors mt-1"
                            onToggle={(favorited, likes) => {
                                setSelectedEvent(prev => ({ ...prev, likes: likes !== undefined ? likes : prev.likes, favorited }));
                                setEvents(prev => prev.map(e => 
                                    e.id === selectedEvent.id ? { ...e, likes: likes !== undefined ? likes : e.likes, favorited } : e
                                ));
                            }}
                        />
                     </div>
                     <div className="flex flex-wrap items-center gap-6 text-gray-300 text-sm sm:text-base font-medium">
                         <div className="flex items-center gap-2">
                             <Calendar size={18} className="text-indigo-400" />
                             {selectedEvent.date}
                         </div>
                         <div className="flex items-center gap-2">
                             <MapPin size={18} className="text-indigo-400" />
                             {selectedEvent.location || 'Online'}
                         </div>
                     </div>
                 </div>
              </div>

              {/* Modal Content */}
              <div className="p-5 sm:p-8">
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
                                dangerouslySetInnerHTML={{ __html: selectedEvent.content || `<p>${selectedEvent.description}</p>` }} 
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
                                        className="w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                                    >
                                        {t('events.visit_link')}
                                        <ExternalLink size={18} />
                                    </a>
                                ) : (
                                    <div className="p-3 bg-white/5 rounded-xl text-gray-500 text-sm text-center border border-white/5">
                                        {t('events.no_link_available')}
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-white/5" />

                            {/* Key Attributes Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {selectedEvent.score && (
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div className="flex items-center gap-2 text-indigo-400 mb-1">
                                            <Award size={18} />
                                            <span className="text-sm font-bold uppercase">加分</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">{selectedEvent.score}</p>
                                    </div>
                                )}

                                {selectedEvent.volunteer_time && (
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                                            <Clock size={18} />
                                            <span className="text-sm font-bold uppercase">志愿时长</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">{selectedEvent.volunteer_time}</p>
                                    </div>
                                )}

                                {selectedEvent.tags && (
                                    <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                            <Tag size={18} />
                                            <span className="text-sm font-bold uppercase">{t('upload.tags')}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedEvent.tags.split(',').map((tag, i) => (
                                                <span key={i} className="px-2 py-1 rounded-md bg-white/10 text-gray-200 text-xs font-medium border border-white/5">
                                                    {tag.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="h-px bg-white/5" />

                            {/* Detailed Info List */}
                            <div className="space-y-4">
                                {selectedEvent.target_audience && (
                                    <div className="flex gap-3 items-center">
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 shrink-0">
                                            <Users size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-0.5">面向对象</h4>
                                            <p className="text-gray-200 text-sm leading-snug">{selectedEvent.target_audience}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.organizer && (
                                    <div className="flex gap-3 items-center">
                                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400 shrink-0">
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-0.5">主办方</h4>
                                            <p className="text-gray-200 text-sm leading-snug">{selectedEvent.organizer}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 items-center">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                                        <MapPin size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-0.5">{t('events.location_label')}</h4>
                                        <p className="text-gray-200 text-sm leading-snug">{selectedEvent.location || '线上'}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 items-center">
                                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 shrink-0">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-0.5">{t('events.date_label')}</h4>
                                        <p className="text-gray-200 text-sm leading-snug">{selectedEvent.date}</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                     </div>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
