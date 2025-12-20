import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, X, Filter, Upload, Clock, CheckCircle, ExternalLink, Download, Search, Share2, Globe, FileText, AlertCircle } from 'lucide-react';
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

import { useSearchParams } from 'react-router-dom';

const Events = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [sort, setSort] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [lifecycle, setLifecycle] = useState('all');
  
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

  // Registration State
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    setLoading(true);
    const limit = settings.pagination_enabled === 'true' ? 6 : 1000;
    
    const params = {
      page: currentPage,
      limit,
      sort,
      search: searchQuery,
      lifecycle: lifecycle === 'all' ? undefined : lifecycle
    };

    api.get('/events', { params })
      .then(res => {
        if (res.data && Array.isArray(res.data.data)) {
            setEvents(res.data.data);
            setTotalPages(res.data.pagination ? res.data.pagination.totalPages : 1);
        } else {
            setEvents([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch events:", err);
        setEvents([]); // Ensure events is an array on error
        setLoading(false);
      });
  }, [currentPage, sort, searchQuery, lifecycle, settings.pagination_enabled]);

  useEffect(() => {
    if (selectedEvent && user) {
        api.get(`/events/${selectedEvent.id}/registration`)
           .then(res => setIsRegistered(res.data.registered))
           .catch(err => console.error(err));
    } else {
        setIsRegistered(false);
    }
  }, [selectedEvent, user]);

  const handleRegister = async () => {
      if (!user) {
          toast.error(t('events.login_to_register'));
          return;
      }
      setRegistering(true);
      try {
          const res = await api.post(`/events/${selectedEvent.id}/register`);
          setIsRegistered(res.data.registered);
          toast.success(res.data.message);
      } catch (err) {
          toast.error("Registration failed");
      } finally {
          setRegistering(false);
      }
  };

  const handleShare = (event, e) => {
      e.stopPropagation();
      const url = `${window.location.origin}/events?id=${event.id}`;
      navigator.clipboard.writeText(url).then(() => {
          toast.success(t('common.link_copied') || 'Link copied to clipboard!');
      });
  };

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

  const addEvent = (newItem) => {
    api.post('/events', newItem)
    .then(() => {
        // Refresh current page
        const limit = 6;
        const params = {
            page: currentPage,
            limit,
        };
        return api.get('/events', { params });
    })
    .then(res => {
        setEvents(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
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
      { value: 'all', label: t('common.all') || 'All Events' },
      { value: 'upcoming', label: t('events.status.upcoming') || 'Upcoming' },
      { value: 'ongoing', label: t('events.status.ongoing') || 'Ongoing' },
      { value: 'past', label: t('events.status.past') || 'Past' }
  ];

  return (
    <section className="pt-36 pb-32 md:py-20 px-4 md:px-8 min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="mb-8 md:mb-12 relative z-40 md:pt-0"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold font-serif mb-3 md:mb-4">{t('events.title')}</h2>
            <p className="text-gray-400 max-w-xl text-sm md:text-base">{t('events.subtitle')}</p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
             <button
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 md:px-6 md:py-3 rounded-full backdrop-blur-md border border-white/10 transition-all font-bold text-sm md:text-base shrink-0"
             >
                <Upload size={18} className="md:w-5 md:h-5" /> {t('common.create_event')}
             </button>

             {/* Compact Search Bar */}
             <div className="relative flex-1 md:w-64 group">
                <div className="absolute inset-0 bg-white/5 rounded-full blur-sm group-focus-within:bg-indigo-500/20 transition-all duration-300 -z-10" />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-400 transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder={t('common.search') || "Search..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-gray-500/70 shadow-inner"
                />
             </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
          {/* Lifecycle Filter */}
          <div className="w-full md:w-48">
             <Dropdown
                value={lifecycle}
                onChange={setLifecycle}
                options={lifecycleOptions}
                icon={Filter}
                buttonClassName="bg-black/20 border-white/10 hover:bg-black/30 w-full"
             />
          </div>

          <div className="h-8 w-px bg-white/10 hidden md:block" />

          {/* Sort */}
          <div className="w-full md:w-48">
            <SortSelector sort={sort} onSortChange={setSort} />
          </div>
        </div>
      </motion.div>

      {error ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
            <p className="text-gray-300 mb-6">{t('common.error_fetching_data') || 'Failed to load events'}</p>
            <button 
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 max-w-7xl mx-auto">
           {[1,2,3].map(i => (
               <div key={i} className="bg-white/5 rounded-3xl h-64 md:h-96 animate-pulse" />
           ))}
        </div>
      ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
              <p className="text-gray-300 mb-6">{t('common.error_fetching_data') || 'Failed to load events'}</p>
              <button 
                  onClick={() => setRefreshKey(prev => prev + 1)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
              >
                  {t('common.retry') || 'Retry'}
              </button>
          </div>
      ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 max-w-7xl mx-auto">
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
                    className="group relative bg-[#111] border border-white/10 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                {/* Image Section */}
                <div className="h-64 overflow-hidden relative">
                    <SmartImage 
                      src={event.image} 
                      alt={event.title} 
                      loading="lazy"
                      className="w-full h-full"
                      imageClassName="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-80" />
                    
                    {/* Date Badge */}
                    <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex flex-col items-center justify-center min-w-[60px] shadow-lg group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-colors duration-300">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-300 group-hover:text-white/80">{month}</span>
                        <span className="text-2xl font-black text-white">{day}</span>
                    </div>

                    {/* Status Badge */}
                    <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg backdrop-blur-md flex items-center gap-1.5 ${getStatusColor(status)}`}>
                        {status === t('events.status.upcoming') && <Clock size={12} />}
                        {status === t('events.status.ongoing') && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                        {status}
                    </div>

                    {/* Share Button */}
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <FavoriteButton 
                            itemId={event.id}
                            itemType="event"
                            size={18}
                            showCount={false}
                            favorited={event.favorited}
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
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                            <div className="transform scale-75">
                                <Countdown targetDate={event.date} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className="p-6 relative">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                             <MapPin size={14} className="text-indigo-400" />
                             <span className="truncate max-w-[150px]">{event.location || 'Online'}</span>
                        </div>
                        {event.link && (
                             <div className="flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                 <Globe size={10} /> External
                             </div>
                        )}
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-3 line-clamp-2 group-hover:text-indigo-400 transition-colors leading-tight">{event.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-6 leading-relaxed">{event.description}</p>

                    <div className="flex items-center text-indigo-400 font-bold text-sm group-hover:translate-x-2 transition-transform">
                        {t('common.view_details')} <ArrowRight size={16} className="ml-2" />
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
              <p className="text-gray-500 text-lg">No events found matching your criteria.</p>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
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
                        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-2 leading-tight">{selectedEvent.title}</h2>
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
              <div className="p-8 sm:p-12">
                 <div className="flex flex-col lg:flex-row gap-12">
                     <div className="flex-1 space-y-8">
                         <div>
                             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                 <FileText size={20} className="text-indigo-400" /> 
                                 {t('common.description')}
                             </h3>
                             {/* Render HTML content safely */}
                             <div 
                                className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: selectedEvent.content || `<p>${selectedEvent.description}</p>` }} 
                             />
                         </div>

                         {/* Map Integration (Mock) */}
                         {selectedEvent.location && (
                             <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                 <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                                     <MapPin size={18} className="text-indigo-400" /> Location
                                 </h4>
                                 <p className="text-gray-400 mb-4">{selectedEvent.location}</p>
                                 <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location)}`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-indigo-400 hover:text-indigo-300 text-sm font-bold flex items-center gap-1"
                                 >
                                     View on Google Maps <ExternalLink size={12} />
                                 </a>
                             </div>
                         )}
                     </div>

                     {/* Sidebar Actions */}
                     <div className="w-full lg:w-80 space-y-6">
                         <div className="bg-white/5 rounded-2xl p-6 border border-white/5 sticky top-8">
                             <h4 className="font-bold text-white mb-6">Action Center</h4>
                             
                             <div className="space-y-4">
                                {selectedEvent.link ? (
                                    <a 
                                        href={selectedEvent.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 group"
                                    >
                                        <ExternalLink size={20} className="group-hover:rotate-45 transition-transform" /> 
                                        Visit Event Link
                                    </a>
                                ) : (
                                    (getEventLifecycle(selectedEvent.date) === t('events.status.upcoming') || getEventLifecycle(selectedEvent.date) === t('events.status.ongoing')) && (
                                        <button 
                                            onClick={handleRegister}
                                            disabled={registering}
                                            className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                                isRegistered 
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-500/20'
                                            }`}
                                        >
                                            {registering ? <Clock className="animate-spin" size={20} /> : (isRegistered ? <CheckCircle size={20} /> : <ArrowRight size={20} />)}
                                            {isRegistered ? t('events.registered') : t('events.register')}
                                        </button>
                                    )
                                )}

                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                                    <button 
                                        onClick={addToGoogleCalendar}
                                        className="flex flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors text-xs font-medium"
                                    >
                                        <Calendar size={20} />
                                        Google Cal
                                    </button>
                                    <button 
                                        onClick={downloadICS}
                                        className="flex-col items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors text-xs font-medium flex"
                                    >
                                        <Download size={20} />
                                        Save .ICS
                                    </button>
                                </div>
                                
                                <button 
                                    onClick={(e) => handleShare(selectedEvent, e)}
                                    className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors text-sm font-medium"
                                >
                                    <Share2 size={18} />
                                    Share Event
                                </button>
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