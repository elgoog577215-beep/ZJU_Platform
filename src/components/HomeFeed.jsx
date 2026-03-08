import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Music, Film, BookOpen, ArrowRight, X, Maximize2, Loader, Calendar } from 'lucide-react';
import Lightbox from './Lightbox';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import SmartImage from './SmartImage';
import { useSettings } from '../context/SettingsContext';
import { useBackClose } from '../hooks/useBackClose';
import { useCachedResource } from '../hooks/useCachedResource';
import { getHighResUrl } from '../utils/imageUtils';
import ErrorBoundary from './ErrorBoundary';
import { Link, useNavigate } from 'react-router-dom';
import FullFeaturedMusicPlayer from './FullFeaturedMusicPlayer';
import DOMPurify from 'dompurify';

import DashboardEvent from './dashboard/DashboardEvent';
import DashboardPhotoStack from './dashboard/DashboardPhotoStack';
import DashboardVideo from './dashboard/DashboardVideo';
import DashboardArticles from './dashboard/DashboardArticles';

const HomeFeed = () => {
  const [activePhoto, setActivePhoto] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings } = useSettings();

  useBackClose(activePhoto !== null, () => setActivePhoto(null));
  useBackClose(activeEvent !== null, () => setActiveEvent(null));

  // Use cached resource hook
  const { data: featuredContent, loading, error } = useCachedResource('/featured');

  if (error) {
      console.error("Failed to fetch featured content:", error);
      // Optional: render error state
  }

  // Check if content is loaded (and not just empty array from initial state)
  const isLoaded = featuredContent && featuredContent.photos && Array.isArray(featuredContent.photos);

  if (!isLoaded) {
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
                    <DashboardArticles articles={feedArticles} onSelect={(a) => navigate(`/articles`)} />
                 </ErrorBoundary>
              </div>
           </div>
        </motion.div>

      </motion.div>

      {/* --- Modals --- */}

      <AnimatePresence>
        {activePhoto && (
          <ErrorBoundary fallback={
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl" onClick={() => setActivePhoto(null)}>
                <div className="text-center p-8 bg-[#111] border border-white/10 rounded-2xl">
                    <p className="text-red-400 mb-4">{t('common.error_loading_viewer') || 'Failed to load viewer'}</p>
                    <button 
                        onClick={() => setActivePhoto(null)}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                    >
                        {t('common.close') || 'Close'}
                    </button>
                </div>
             </div>
          }>
            <Lightbox 
                photo={{ ...activePhoto, url: getHighResUrl(activePhoto.url) }} 
                onClose={() => setActivePhoto(null)} 
            />
          </ErrorBoundary>
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
                   <div className="prose prose-invert prose-lg max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeEvent.content || activeEvent.description) }} />
                   
                   <div className="mt-8 pt-8 border-t border-white/10 flex flex-wrap gap-4">
                     <Link to={`/events?id=${activeEvent.id}`} className="px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-2">
                        {t('common.view_details')} <ArrowRight size={18}/>
                     </Link>
                   </div>
                </div>
             </motion.div>
           </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default HomeFeed;
