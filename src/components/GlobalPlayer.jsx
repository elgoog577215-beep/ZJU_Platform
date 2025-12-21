import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, X, Music, Volume2, Maximize2, VolumeX, Minimize2 } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useLocation } from 'react-router-dom';

// Simple Audio Visualizer Component
const Visualizer = ({ isPlaying }) => {
  return (
    <div className="flex items-end justify-center gap-1 h-8 w-full mb-2 opacity-50">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-cyan-500 to-blue-600 rounded-t-full"
          animate={{
            height: isPlaying ? [4, Math.random() * 24 + 4, 4] : 4,
          }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            repeatType: "reverse",
            delay: i * 0.05,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

const GlobalPlayer = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, audioRef, isMiniPlayerVisible, setIsMiniPlayerVisible } = useMusic();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const audio = audioRef.current;
    
    const updateProgress = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
    };
  }, [audioRef]);

  const formatTime = (time) => {
    if (!time) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't show mini player on Desktop Music page (because full player exists), but show on Mobile Music page (as mini player)
  if (!currentTrack || !isMiniPlayerVisible) return null;
  if (!isMobile && location.pathname === '/music') return null;

  if (isMobile) {
      return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[90] pointer-events-none"
        >
            <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex items-center justify-between shadow-2xl pointer-events-auto">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div 
                        className="relative w-10 h-10 rounded-full border border-white/10 overflow-hidden shrink-0 animate-[spin_4s_linear_infinite]"
                        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                    >
                        <img 
                            src={currentTrack.cover} 
                            alt={currentTrack.title} 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-black rounded-full border border-white/20" />
                        </div>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-white font-bold text-sm truncate">{currentTrack.title}</span>
                        <span className="text-cyan-400 text-xs truncate">{currentTrack.artist}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 shrink-0 pl-2">
                     <button 
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="p-2 bg-white text-black rounded-full hover:scale-105 transition-transform"
                     >
                        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                        className="p-2 text-white/70 hover:text-white transition-colors"
                     >
                        <SkipForward size={20} />
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setIsMiniPlayerVisible(false); }}
                        className="p-2 text-white/70 hover:text-white transition-colors"
                     >
                        <X size={20} />
                     </button>
                </div>
            </div>
        </motion.div>
      );
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      drag
      dragMomentum={false}
      whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
      className="fixed bottom-4 right-4 z-[80] w-auto max-w-md cursor-grab active:cursor-grabbing"
    >
      <div className="bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-3xl p-4 shadow-2xl flex flex-col relative overflow-hidden ring-1 ring-white/5">
        {/* Visualizer Background */}
        <div className="absolute bottom-0 left-0 w-full h-32 opacity-10 pointer-events-none z-0 mask-image-gradient-to-t">
            <Visualizer isPlaying={isPlaying} />
        </div>

        <div className="flex items-center gap-4 relative z-10">
            {/* Drag Handle Indicator */}
            <div className="w-1 h-8 bg-white/10 rounded-full cursor-grab active:cursor-grabbing hover:bg-white/20 transition-colors" />
            
            {/* Cover Art */}
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative group shadow-lg">
            <img 
                src={currentTrack.cover} 
                alt={currentTrack.title} 
                className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} 
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Music size={16} className="text-white" />
            </div>
            </div>

            {/* Info & Controls */}
            <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
                <div className="truncate pr-2">
                <h4 className="font-bold text-white text-sm truncate leading-tight">{currentTrack.title}</h4>
                <p className="text-[10px] text-gray-400 truncate uppercase tracking-wider">{currentTrack.artist}</p>
                </div>
                <button onClick={() => setIsMiniPlayerVisible(false)} className="p-1.5 -mr-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full active:scale-95 transition-all">
                <X size={16} />
                </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] text-gray-500 font-mono w-6 text-right">{formatTime(progress)}</span>
                <input
                type="range"
                min="0"
                max={duration || 100}
                value={progress}
                onChange={handleSeek}
                className="flex-1 h-0.5 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                />
                <span className="text-[9px] text-gray-500 font-mono w-6">{formatTime(duration)}</span>
            </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
            <button onClick={prevTrack} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
                <SkipBack size={18} />
            </button>
            <button 
                onClick={togglePlay} 
                className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-full transition-all hover:scale-105 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
                <SkipForward size={18} />
            </button>
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GlobalPlayer;
