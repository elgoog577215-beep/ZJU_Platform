import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, X, Music } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useMediaQuery } from '../hooks/useMediaQuery';

// Simple Audio Visualizer Component - Memoized
const Visualizer = memo(({ isPlaying }) => {
  const barHeights = useMemo(
    () => Array.from({ length: 10 }, (_, index) => 10 + ((index * 5) % 14)),
    [],
  );

  return (
    <div className="flex items-end justify-center gap-1 h-8 w-full mb-2 opacity-50">
      {barHeights.map((height, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-cyan-500 to-blue-600 rounded-t-full"
          animate={{
            height: isPlaying ? [6, height, 6] : 6,
          }}
          transition={{
            duration: 0.55,
            repeat: isPlaying ? Infinity : 0,
            repeatType: 'reverse',
            delay: i * 0.05,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
});
Visualizer.displayName = 'Visualizer';

// Memoized Player Info Component
const PlayerInfo = memo(({ currentTrack, isPlaying, onClose, isDayMode }) => {
  return (
    <div className={`flex items-center gap-4 relative z-10 mb-4 backdrop-blur-md rounded-2xl p-3 border shadow-lg ${isDayMode ? 'bg-white/86 border-slate-200/80 shadow-[0_14px_32px_rgba(148,163,184,0.16)]' : 'bg-white/5 border-white/5'}`}>
        {/* Drag Handle Indicator */}
        <div className={`w-1 h-8 rounded-full cursor-grab active:cursor-grabbing transition-colors ${isDayMode ? 'bg-slate-200 hover:bg-slate-300' : 'bg-white/10 hover:bg-white/20'}`} />
        
        {/* Cover Art */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative group shadow-lg">
        <div className={`absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10`} />
        <img 
            src={currentTrack.cover} 
            alt={currentTrack.title} 
            className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} 
        />
        <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 ${isDayMode ? 'bg-slate-900/20' : 'bg-black/40'}`}>
            <Music size={16} className="text-white" />
        </div>
        </div>

        {/* Info & Close */}
        <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
            <div className="truncate pr-2">
            <h4 className={`font-bold text-sm truncate leading-tight mb-0.5 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{currentTrack.title}</h4>
            <p className={`text-[10px] truncate uppercase tracking-wider ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{currentTrack.artist}</p>
            </div>
            <button onClick={onClose} className={`p-1.5 -mr-1 rounded-full active:scale-95 transition-all ${isDayMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
            <X size={16} />
            </button>
        </div>
        </div>
    </div>
  );
});
PlayerInfo.displayName = 'PlayerInfo';

// Memoized Progress Bar Component
const ProgressBar = memo(({ progress, duration, onSeek, isDayMode }) => {
  const formatTime = (time) => {
    if (!time) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-2 mb-2 relative z-10 px-1">
        <span className={`text-[9px] font-mono w-6 text-right ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{formatTime(progress)}</span>
        <input
        type="range"
        min="0"
        max={duration || 100}
        value={progress}
        onChange={onSeek}
        className={`flex-1 h-0.5 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all ${isDayMode ? 'bg-slate-200 [&::-webkit-slider-thumb]:bg-cyan-500' : 'bg-white/20 [&::-webkit-slider-thumb]:bg-cyan-500'}`}
        />
        <span className={`text-[9px] font-mono w-6 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{formatTime(duration)}</span>
    </div>
  );
});
ProgressBar.displayName = 'ProgressBar';

// Memoized Controls Component
const PlayerControls = memo(({ isPlaying, onPlayPause, onNext, onPrev, isDayMode }) => {
  return (
    <div className="flex items-center justify-center gap-4 relative z-10 group">
        <button onClick={onPrev} className={`p-2.5 md:p-3 rounded-full transition-all hover:scale-110 active:scale-95 ${isDayMode ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}>
            <SkipBack size={20} className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <button 
            onClick={onPlayPause} 
            className="p-3 md:p-4 bg-white text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
        >
            {isPlaying ? <Pause size={24} className="w-6 h-6 md:w-7 md:h-7 fill-black" /> : <Play size={24} className="w-6 h-6 md:w-7 md:h-7 fill-black ml-1" />}
        </button>
        <button onClick={onNext} className={`p-2.5 md:p-3 rounded-full transition-all hover:scale-110 active:scale-95 ${isDayMode ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}>
            <SkipForward size={20} className="w-5 h-5 md:w-6 md:h-6" />
        </button>
    </div>
  );
});
PlayerControls.displayName = 'PlayerControls';

const GlobalPlayer = () => {
  const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, audioRef, isMiniPlayerVisible, setIsMiniPlayerVisible } = useMusic();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    if (!currentTrack || !isMiniPlayerVisible) return undefined;

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
  }, [audioRef, currentTrack, isMiniPlayerVisible]);

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
            <div className={`backdrop-blur-2xl border rounded-full p-2 pr-4 flex items-center justify-between pointer-events-auto ring-1 ${isDayMode ? 'bg-white/92 border-slate-200/80 shadow-[0_12px_32px_rgba(148,163,184,0.24)] ring-slate-200/70' : 'bg-black/60 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-white/5'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div 
                        className={`relative w-10 h-10 rounded-full border overflow-hidden shrink-0 animate-[spin_4s_linear_infinite] ${isDayMode ? 'border-slate-200/90' : 'border-white/10'}`}
                        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                    >
                        <img 
                            src={currentTrack.cover} 
                            alt={currentTrack.title} 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`w-1.5 h-1.5 rounded-full border ${isDayMode ? 'bg-white border-slate-300/90' : 'bg-black border-white/20'}`} />
                        </div>
                    </div>
                    <div className="flex flex-col overflow-hidden max-w-[120px]">
                        <span className={`font-bold text-sm truncate ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{currentTrack.title}</span>
                        <span className={`text-[10px] truncate ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{currentTrack.artist}</span>
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
                        className={`w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-all ${isDayMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                     >
                        <SkipForward size={18} />
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setIsMiniPlayerVisible(false); }}
                        className={`w-8 h-8 flex items-center justify-center rounded-full active:scale-90 transition-all ${isDayMode ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
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
      <div className={`backdrop-blur-3xl border rounded-[2rem] p-5 flex flex-col relative overflow-hidden ring-1 group transition-colors ${isDayMode ? 'bg-white/92 border-slate-200/80 shadow-[0_16px_46px_rgba(148,163,184,0.24)] ring-slate-200/70 hover:border-cyan-200/80' : 'bg-black/60 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-white/5 hover:border-white/20'}`}>
        {/* Visualizer Background */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 w-full h-32 opacity-20 pointer-events-none z-0 mask-image-gradient-to-t mix-blend-screen">
              <Visualizer isPlaying={isPlaying} />
          </div>
        )}

        <PlayerInfo 
            currentTrack={currentTrack} 
            isPlaying={isPlaying} 
            onClose={handleClose}
            isDayMode={isDayMode}
        />

        <ProgressBar 
            progress={progress} 
            duration={duration} 
            onSeek={handleSeek}
            isDayMode={isDayMode}
        />

        <PlayerControls 
            isPlaying={isPlaying} 
            onPlayPause={togglePlay} 
            onNext={nextTrack} 
            onPrev={prevTrack} 
            isDayMode={isDayMode}
        />
      </div>
    </motion.div>
  );
};

export default GlobalPlayer;
