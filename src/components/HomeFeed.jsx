import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Music, Film, BookOpen, ArrowRight, X, Maximize2, Loader, Calendar } from 'lucide-react';
import LivePhotoViewer from './Image3DViewer';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { fetcher } from '../services/api';
import { Helmet } from 'react-helmet-async';

import ImageWithLoader from './ImageWithLoader';

const getHighResUrl = (url) => {
  if (!url) return url;
  if (url.includes('images.unsplash.com')) {
    return url.replace('w=800', 'w=1600');
  }
  return url;
};

import ErrorBoundary from './ErrorBoundary';

import { Link, useNavigate } from 'react-router-dom';
import FullFeaturedMusicPlayer from './FullFeaturedMusicPlayer';

// --- Compact Components for Dashboard ---

const DashboardEvent = ({ event, onClick }) => {
  const { t } = useTranslation();
  return (
  <div 
    onClick={() => onClick(event)}
    className="relative w-full h-full rounded-3xl overflow-hidden cursor-pointer group border border-white/10 bg-black"
  >
    <ImageWithLoader 
        src={getHighResUrl(event.image)} 
        alt={event.title} 
        className="w-full h-full"
        imageClassName="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" 
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

const DashboardPhotoStack = ({ photos, onSelect }) => {
  const { t } = useTranslation();
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
        className="relative flex-1 rounded-3xl overflow-hidden cursor-pointer group border border-white/10"
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
                <ImageWithLoader 
                    src={getHighResUrl(currentPhoto.url)} 
                    alt={currentPhoto.title} 
                    className="w-full h-full"
                    imageClassName="w-full h-full object-cover" 
                />
            </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60 opacity-60 group-hover:opacity-80 transition-opacity" />
        
        <div className="absolute top-3 right-3 bg-black/30 backdrop-blur-md p-2 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 z-10">
           <Maximize2 size={14} className="text-white" />
        </div>

        <div className="absolute bottom-4 left-4 z-10">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-1">{t(`gallery.categories.${currentPhoto.category}`)}</p>
          <h4 className="text-white font-bold leading-tight">{currentPhoto.title}</h4>
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

const DashboardVideo = ({ videos, onSelect }) => {
  const { t } = useTranslation();
  if (!videos || videos.length === 0) return null;
  const mainVideo = videos[0];

  return (
    <div 
      onClick={() => onSelect(mainVideo)}
      className="relative w-full h-full rounded-3xl overflow-hidden cursor-pointer group border border-white/10 bg-black"
    >
      <ImageWithLoader 
          src={getHighResUrl(mainVideo.thumbnail || mainVideo.cover)} 
          alt={mainVideo.title} 
          className="w-full h-full"
          imageClassName="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500" 
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

const DashboardArticles = ({ events, onSelect }) => {
  const { t } = useTranslation();
  return (
  <div className="h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
      {events.map((event) => (
        <div 
          key={event.id}
          onClick={() => onSelect(event)}
          className="bg-[#0a0a0a]/80 border border-white/10 rounded-3xl p-6 hover:border-red-500/30 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden min-h-[180px]"
        >
        {event.image && (
          <>
            <ImageWithLoader 
                src={getHighResUrl(event.image)} 
                alt={event.title} 
                className="absolute inset-0 w-full h-full"
                imageClassName="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
          </>
        )}
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-red-500/20 transition-colors" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">{event.date}</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-red-400 transition-colors line-clamp-2">{event.title}</h3>
          <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">{event.description}</p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs font-bold text-white mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
          {t('common.view_details')} <ArrowRight size={12} />
        </div>
      </div>
    ))}
    </div>
  </div>
)};

const HomeFeed = () => {
  const [activePhoto, setActivePhoto] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: featuredContent, error } = useSWR('/featured', fetcher);

  if (error) {
      console.error("Failed to fetch featured content:", error);
      // Optional: render error state
  }

  if (!featuredContent) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-black">
        <Loader className="animate-spin text-white" size={48} />
      </div>
    );
  }

  const feedPhotos = featuredContent.photos.slice(0, 10); // Show more photos for rotation
  const feedTracks = featuredContent.music;
  const feedMainEvent = featuredContent.events[0];
  const feedVideos = featuredContent.videos;
  const feedArticles = featuredContent.articles.slice(0, 6).map(a => ({
      ...a,
      image: a.cover,
      date: new Date(a.created_at || Date.now()).toLocaleDateString(),
      description: a.excerpt
  }));

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const item = {
    hidden: { y: 50, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50, damping: 20 } }
  };

  return (
    <section className="relative w-full min-h-screen lg:h-screen lg:overflow-hidden pt-20 pb-4 px-4 md:px-8 flex flex-col">
      <Helmet>
        <title>{t('home.meta_title')} | 777</title>
        <meta name="description" content={t('home.meta_desc')} />
      </Helmet>
      
      {/* Dashboard Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[calc(100vh-6rem)] max-w-[1920px] mx-auto w-full pb-4 lg:pb-0"
      >
        
        {/* Left Column: Music (3) */}
        <motion.div variants={item} className="lg:col-span-3 h-[500px] lg:h-full overflow-hidden">
           <div className="h-full flex flex-col gap-4">
             <div className="flex-1 min-h-0 overflow-hidden">
                <ErrorBoundary variant="inline" silent>
                    <FullFeaturedMusicPlayer tracks={feedTracks} />
                </ErrorBoundary>
             </div>
           </div>
        </motion.div>

        {/* Center Column: Events & Videos (6) */}
        <div className="lg:col-span-6 h-full flex flex-col gap-4 overflow-hidden">
          {/* Top: Main Event (50% height) */}
          <motion.div variants={item} className="flex-1 min-h-[300px] lg:min-h-0 overflow-hidden">
            <ErrorBoundary variant="inline" silent>
                {feedMainEvent && <DashboardEvent event={feedMainEvent} onClick={setActiveEvent} />}
            </ErrorBoundary>
          </motion.div>
          {/* Bottom: Videos (50% height) */}
          <motion.div variants={item} className="flex-1 min-h-[300px] lg:min-h-0 overflow-hidden">
            <ErrorBoundary variant="inline" silent>
                <DashboardVideo videos={feedVideos} onSelect={(v) => navigate('/videos')} />
            </ErrorBoundary>
          </motion.div>
        </div>

        {/* Right Column: Photos & Articles (3) */}
        <motion.div variants={item} className="lg:col-span-3 h-[600px] lg:h-full overflow-hidden">
           <div className="h-full flex flex-col gap-4">
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white uppercase tracking-wider">{t('home.selected_works')}</h3>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <ErrorBoundary variant="inline" silent>
                        <DashboardPhotoStack photos={feedPhotos} onSelect={setActivePhoto} />
                    </ErrorBoundary>
                  </div>
              </div>
              
              {/* Articles (Bottom half of right col) */}
              <div className="flex-1 min-h-0 overflow-hidden">
                 <ErrorBoundary variant="inline" silent>
                    <DashboardArticles events={feedArticles} onSelect={(a) => navigate(`/articles`)} />
                 </ErrorBoundary>
              </div>
           </div>
        </motion.div>

      </motion.div>

      {/* --- Modals --- */}

      <AnimatePresence>
        {activePhoto && (
          <LivePhotoViewer 
            photo={{ ...activePhoto, url: getHighResUrl(activePhoto.url) }} 
            onClose={() => setActivePhoto(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeEvent && (
           <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setActiveEvent(null)}
          >
             <motion.div 
               initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
               className="bg-[#0a0a0a] max-w-3xl w-full rounded-3xl border border-white/10 overflow-hidden shadow-2xl my-8" 
               onClick={e => e.stopPropagation()}
             >
                <div 
                  className="h-64 bg-gradient-to-br from-red-900/40 to-black relative p-8 flex flex-col justify-end bg-cover bg-center"
                  style={activeEvent.image ? { backgroundImage: `url(${getHighResUrl(activeEvent.image)})` } : {}}
                >
                   {activeEvent.image && <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />}
                   <button onClick={() => setActiveEvent(null)} className="absolute top-6 right-6 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 z-10"><X size={24}/></button>
                   <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-2">
                        <Calendar size={16} className="text-red-400" />
                        <span className="text-red-400 font-bold uppercase tracking-wider text-xs">{activeEvent.date}</span>
                     </div>
                     <h2 className="text-4xl font-bold font-serif text-white">{activeEvent.title}</h2>
                     <p className="text-gray-300 mt-2 flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-red-500"></span> {activeEvent.location}</p>
                   </div>
                </div>
                <div className="p-8 md:p-12">
                   <div className="prose prose-invert prose-lg max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: activeEvent.content || activeEvent.description }} />
                   
                   {activeEvent.link && (
                       <div className="mt-8 pt-8 border-t border-white/10">
                           <a 
                               href={activeEvent.link} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
                           >
                               {t('common.view_details')} <ArrowRight size={18} />
                           </a>
                       </div>
                   )}
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
};

export default HomeFeed;
