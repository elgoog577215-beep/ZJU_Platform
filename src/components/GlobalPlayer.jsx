import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, X, Music, Volume2, Maximize2, VolumeX, Minimize2 } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useLocation } from 'react-router-dom';

// Simple Audio Visualizer Component - Memoized
const Visualizer = memo(({ isPlaying }) => {
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
});

// Memoized Player Info Component
const PlayerInfo = memo(({ currentTrack, isPlaying, onClose }) => {
  return (
    <div className="flex items-center gap-4 relative z-10 mb-4 bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/5 shadow-lg">
        {/* Drag Handle Indicator */}
        <div className="w-1 h-8 bg-white/10 rounded-full cursor-grab active:cursor-grabbing hover:bg-white/20 transition-colors" />
        
        {/* Cover Art */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative group shadow-lg">
        <div className={`absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10`} />
        <img 
            src={currentTrack.cover} 
            alt={currentTrack.title} 
            className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} 
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <Music size={16} className="text-white" />
        </div>
        </div>

        {/* Info & Close */}
        <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
            <div className="truncate pr-2">
            <h4 className="font-bold text-white text-sm truncate leading-tight mb-0.5">{currentTrack.title}</h4>
            <p className="text-[10px] text-gray-400 truncate uppercase tracking-wider">{currentTrack.artist}</p>
            </div>
            <button onClick={onClose} className="p-1.5 -mr-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-full active:scale-95 transition-all">
            <X size={16} />
            </button>
        </div>
        </div>
    </div>
  );
});

// Memoized Progress Bar Component
const ProgressBar = memo(({ progress, duration, onSeek }) => {
  const formatTime = (time) => {
    if (!time) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-2 mb-2 relative z-10 px-1">
        <span className="text-[9px] text-gray-500 font-mono w-6 text-right">{formatTime(progress)}</span>
        <input
        type="range"
        min="0"
        max={duration || 100}
        value={progress}
        onChange={onSeek}
        className="flex-1 h-0.5 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
        />
        <span className="text-[9px] text-gray-500 font-mono w-6">{formatTime(duration)}</span>
    </div>
  );
});

// Memoized Controls Component
const PlayerControls = memo(({ isPlaying, onPlayPause, onNext, onPrev }) => {
  return (
    <div className="flex items-center justify-center gap-4 relative z-10 group">
        <button onClick={onPrev} className="p-2.5 md:p-3 hover:bg-white/10 rounded-full text-white transition-all hover:scale-110 active:scale-95">
            <SkipBack size={20} className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <button 
            onClick={onPlayPause} 
            className="p-3 md:p-4 bg-white text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
        >
            {isPlaying ? <Pause size={24} className="w-6 h-6 md:w-7 md:h-7 fill-black" /> : <Play size={24} className="w-6 h-6 md:w-7 md:h-7 fill-black ml-1" />}
        </button>
        <button onClick={onNext} className="p-2.5 md:p-3 hover:bg-white/10 rounded-full text-white transition-all hover:scale-110 active:scale-95">
            <SkipForward size={20} className="w-5 h-5 md:w-6 md:h-6" />
        </button>
    </div>
  );
});

const GlobalPlayer = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, audioRef, isMiniPlayerVisible, setIsMiniPlayerVisible } = useMusic();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
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

  const handleSeek = useCallback((e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
        audioRef.current.currentTime = newTime;
        setProgress(newTime);
    }
  }, [audioRef]);

  const handleClose = useCallback(() => {
    setIsMiniPlayerVisible(false);
  }, [setIsMiniPlayerVisible]);

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
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 right-4 z-[90] pointer-events-none"
        >
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full p-2 pr-4 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto ring-1 ring-white/5">
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
                    <div className="flex flex-col overflow-hidden max-w-[120px]">
                        <span className="text-white font-bold text-sm truncate">{currentTrack.title}</span>
                        <span className="text-gray-400 text-[10px] truncate">{currentTrack.artist}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 pl-2">
                     <button 
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full active:scale-90 transition-transform shadow-lg"
                     >
                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                        className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full active:scale-90 transition-all"
                     >
                        <SkipForward size={18} />
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setIsMiniPlayerVisible(false); }}
                        className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full active:scale-90 transition-all"
                     >
                        <X size={16} />
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
      className="fixed bottom-6 right-6 z-[80] w-auto max-w-sm cursor-grab active:cursor-grabbing"
    >
      <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden ring-1 ring-white/5 group hover:border-white/20 transition-colors">
        {/* Visualizer Background */}
        <div className="absolute bottom-0 left-0 w-full h-32 opacity-20 pointer-events-none z-0 mask-image-gradient-to-t mix-blend-screen">
            <Visualizer isPlaying={isPlaying} />
        </div>

        <PlayerInfo 
            currentTrack={currentTrack} 
            isPlaying={isPlaying} 
            onClose={handleClose} 
        />

        <ProgressBar 
            progress={progress} 
            duration={duration} 
            onSeek={handleSeek} 
        />

        <PlayerControls 
            isPlaying={isPlaying} 
            onPlayPause={togglePlay} 
            onNext={nextTrack} 
            onPrev={prevTrack} 
        />
      </div>
    </motion.div>
  );
};

export default GlobalPlayer;
