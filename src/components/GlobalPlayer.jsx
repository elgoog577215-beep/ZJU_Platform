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

  // Don't show mini player on the Music page itself, to avoid redundancy
  if (!currentTrack || !isMiniPlayerVisible || location.pathname === '/music') return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      drag
      dragMomentum={false}
      whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-4 right-0 md:right-4 z-[80] w-full md:w-auto max-w-md cursor-grab active:cursor-grabbing px-4 md:px-0"
    >
      <div className="bg-[#0a0a0a] border border-white/20 rounded-2xl p-4 shadow-2xl flex flex-col relative overflow-hidden">
        {/* Visualizer Background */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none z-0">
            <Visualizer isPlaying={isPlaying} />
        </div>

        <div className="flex items-center gap-4 relative z-10">
            {/* Drag Handle Indicator (Optional, visual cue) */}
            <div className="w-1 h-8 bg-white/10 rounded-full" />
            
            {/* Cover Art */}
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative group">
            <img 
                src={currentTrack.cover} 
                alt={currentTrack.title} 
                className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} 
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Music size={16} className="text-white" />
            </div>
            </div>

            {/* Info & Controls */}
            <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
                <div className="truncate pr-2">
                <h4 className="font-bold text-white text-sm truncate">{currentTrack.title}</h4>
                <p className="text-xs text-gray-400 truncate">{currentTrack.artist}</p>
                </div>
                <button onClick={() => setIsMiniPlayerVisible(false)} className="p-2 -mr-2 text-gray-400 hover:text-white active:scale-95 transition-transform">
                <X size={20} />
                </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-gray-500 font-mono w-8 text-right">{formatTime(progress)}</span>
                <input
                type="range"
                min="0"
                max={duration || 100}
                value={progress}
                onChange={handleSeek}
                className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
                />
                <span className="text-[10px] text-gray-500 font-mono w-8">{formatTime(duration)}</span>
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
