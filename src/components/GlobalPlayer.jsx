import React, { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, X, Music } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReducedMotion } from '../utils/animations';
import { useTranslation } from 'react-i18next';

const formatTrackTime = (time) => {
  if (!time) return '0:00';
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Simple Audio Visualizer Component - Memoized
const Visualizer = memo(({ isPlaying, reduceMotion = false }) => {
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
            height: isPlaying && !reduceMotion ? [6, height, 6] : 6,
          }}
          transition={{
            duration: 0.55,
            repeat: isPlaying && !reduceMotion ? Infinity : 0,
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
const PlayerInfo = memo(({ currentTrack, isPlaying, onClose, isDayMode, reduceMotion = false, closeLabel, coverAlt }) => {
  return (
    <div className={`flex items-center gap-4 relative z-10 mb-4 backdrop-blur-md rounded-2xl p-3 border shadow-lg ${isDayMode ? 'bg-white/86 border-slate-200/80 shadow-[0_14px_32px_rgba(148,163,184,0.16)]' : 'bg-white/5 border-white/5'}`}>
        {/* Drag Handle Indicator */}
        <div className={`w-1 h-8 rounded-full cursor-grab active:cursor-grabbing transition-colors ${isDayMode ? 'bg-slate-200 hover:bg-slate-300' : 'bg-white/10 hover:bg-white/20'}`} aria-hidden="true" />
        
        {/* Cover Art */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative group shadow-lg">
        <div className={`absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity z-10`} />
        <img 
            src={currentTrack.cover} 
            alt={coverAlt}
            className={`w-full h-full object-cover ${isPlaying && !reduceMotion ? 'animate-[spin_4s_linear_infinite]' : ''}`}
            loading="lazy"
            decoding="async"
            draggable="false"
        />
        <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 ${isDayMode ? 'bg-slate-900/20' : 'bg-black/40'}`}>
            <Music size={16} className="text-white" aria-hidden="true" focusable="false" />
        </div>
        </div>

        {/* Info & Close */}
        <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
            <div className="truncate pr-2">
            <h4 className={`font-bold text-sm truncate leading-tight mb-0.5 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{currentTrack.title}</h4>
            <p className={`text-[10px] truncate uppercase tracking-wider ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{currentTrack.artist}</p>
            </div>
            <button type="button" onClick={onClose} aria-label={closeLabel} className={`p-1.5 -mr-1 rounded-full active:scale-95 transition-all ${isDayMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
            <X size={16} aria-hidden="true" focusable="false" />
            </button>
        </div>
        </div>
    </div>
  );
});
PlayerInfo.displayName = 'PlayerInfo';

// Memoized Progress Bar Component
const ProgressBar = memo(({ progress, duration, onSeek, isDayMode, label }) => {
  const safeDuration = duration || 0;
  const progressLabel = `${formatTrackTime(progress)} / ${formatTrackTime(safeDuration)}`;

  return (
    <div className="flex items-center gap-2 mb-2 relative z-10 px-1">
        <span className={`text-[9px] font-mono w-6 text-right ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{formatTrackTime(progress)}</span>
        <input
        type="range"
        min="0"
        max={safeDuration || 100}
        value={progress}
        disabled={!safeDuration}
        aria-label={label}
        aria-valuetext={progressLabel}
        onChange={onSeek}
        className={`flex-1 h-0.5 rounded-lg appearance-none cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 motion-reduce:hover:[&::-webkit-slider-thumb]:scale-100 ${isDayMode ? 'bg-violet-100 [&::-webkit-slider-thumb]:bg-violet-600' : 'bg-white/20 [&::-webkit-slider-thumb]:bg-cyan-500'}`}
        />
        <span className={`text-[9px] font-mono w-6 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{formatTrackTime(safeDuration)}</span>
    </div>
  );
});
ProgressBar.displayName = 'ProgressBar';

// Memoized Controls Component
const PlayerControls = memo(({ isPlaying, onPlayPause, onNext, onPrev, isDayMode, labels }) => {
  return (
    <div className="flex items-center justify-center gap-4 relative z-10 group">
        <button type="button" onClick={onPrev} aria-label={labels.previous} className={`p-2.5 md:p-3 rounded-full transition-all hover:scale-110 active:scale-95 ${isDayMode ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}>
            <SkipBack size={20} className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" focusable="false" />
        </button>
        <button 
            type="button"
            onClick={onPlayPause} 
            aria-label={isPlaying ? labels.pause : labels.play}
            className="p-3 md:p-4 bg-white text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
        >
            {isPlaying ? <Pause size={24} className="w-6 h-6 md:w-7 md:h-7 fill-black" aria-hidden="true" focusable="false" /> : <Play size={24} className="w-6 h-6 md:w-7 md:h-7 fill-black ml-1" aria-hidden="true" focusable="false" />}
        </button>
        <button type="button" onClick={onNext} aria-label={labels.next} className={`p-2.5 md:p-3 rounded-full transition-all hover:scale-110 active:scale-95 ${isDayMode ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}>
            <SkipForward size={20} className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" focusable="false" />
        </button>
    </div>
  );
});
PlayerControls.displayName = 'PlayerControls';

const GlobalPlayer = () => {
  const { t } = useTranslation();
  const { currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, audioRef, isMiniPlayerVisible, setIsMiniPlayerVisible } = useMusic();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const reduceMotion = useReducedMotion();
  const lastProgressRef = useRef({ progress: 0, duration: 0 });
  const playerLabels = useMemo(() => ({
    previous: t('common.previous_track', '上一首'),
    next: t('common.next_track', '下一首'),
    play: t('common.play', '播放'),
    pause: t('common.pause', '暂停'),
    close: t('common.close', '关闭'),
    progress: t('music.progress', '播放进度'),
  }), [t]);
  const nowPlayingLabel = currentTrack
    ? t('music.now_playing_track', '正在播放：{{title}}，{{artist}}', {
        title: currentTrack.title,
        artist: currentTrack.artist,
      })
    : t('music.now_playing', '正在播放');
  const coverAlt = currentTrack
    ? t('music.cover_alt', '{{title}} 封面', { title: currentTrack.title })
    : t('common.cover', '封面');
  const progressText = `${formatTrackTime(progress)} / ${formatTrackTime(duration)}`;
  const progressPercent = duration ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  useEffect(() => {
    if (!currentTrack || !isMiniPlayerVisible) return undefined;

    const audio = audioRef.current;
    if (!audio) return;
    
    const updateProgress = () => {
      const nextProgress = audio.currentTime || 0;
      const nextDuration = audio.duration || 0;
      const last = lastProgressRef.current;
      if (Math.abs(nextProgress - last.progress) >= 0.25 || nextProgress === 0) {
        last.progress = nextProgress;
        setProgress(nextProgress);
      }
      if (nextDuration !== last.duration) {
        last.duration = nextDuration;
        setDuration(nextDuration);
      }
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
    if (Number.isNaN(newTime)) return;
    if (audioRef.current) {
        audioRef.current.currentTime = newTime;
        lastProgressRef.current.progress = newTime;
        setProgress(newTime);
    }
  }, [audioRef]);

  const handleClose = useCallback(() => {
    setIsMiniPlayerVisible(false);
  }, [setIsMiniPlayerVisible]);

  // Don't duplicate the mini player on desktop where the embedded podcast
  // player is already visible in AI Community.
  if (!currentTrack || !isMiniPlayerVisible) return null;
  if (!isMobile && (location.pathname === '/music' || location.pathname === '/articles')) return null;

  if (isMobile) {
      return (
        <motion.div
            role="region"
            aria-label={nowPlayingLabel}
            initial={reduceMotion ? false : { y: 100, opacity: 0, scale: 0.9 }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 100, opacity: 0, scale: 0.9 }}
            className="fixed bottom-[calc(var(--mobile-content-bottom-padding)+0.25rem)] left-3 right-3 z-[70] pointer-events-none"
        >
            <div className={`relative overflow-hidden backdrop-blur-2xl border rounded-full p-2 pr-3 flex items-center justify-between pointer-events-auto ring-1 ${isDayMode ? 'bg-white/92 border-slate-200/80 shadow-[0_12px_32px_rgba(148,163,184,0.24)] ring-slate-200/70' : 'bg-black/60 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-white/5'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div 
                        className={`relative w-10 h-10 rounded-full border overflow-hidden shrink-0 ${isPlaying && !reduceMotion ? 'animate-[spin_4s_linear_infinite]' : ''} ${isDayMode ? 'border-slate-200/90' : 'border-white/10'}`}
                        style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                    >
                        <img 
                            src={currentTrack.cover} 
                            alt={coverAlt}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            draggable="false"
                        />
                        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                            <div className={`w-1.5 h-1.5 rounded-full border ${isDayMode ? 'bg-white border-slate-300/90' : 'bg-black border-white/20'}`} />
                        </div>
                    </div>
                    <div className="flex flex-col overflow-hidden max-w-[min(34vw,150px)]" aria-live="polite">
                        <span className={`font-bold text-sm truncate ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{currentTrack.title}</span>
                        <span className={`text-[10px] truncate ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{currentTrack.artist}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                     <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        aria-label={isPlaying ? playerLabels.pause : playerLabels.play}
                        aria-pressed={isPlaying}
                        className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full active:scale-95 transition-transform shadow-lg"
                     >
                        {isPlaying ? <Pause size={15} fill="currentColor" aria-hidden="true" focusable="false" /> : <Play size={15} fill="currentColor" className="ml-0.5" aria-hidden="true" focusable="false" />}
                     </button>
                     <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                        aria-label={playerLabels.next}
                        className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-all ${isDayMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                     >
                        <SkipForward size={18} aria-hidden="true" focusable="false" />
                     </button>
                     <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleClose(); }}
                        aria-label={playerLabels.close}
                        className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-all ${isDayMode ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                     >
                        <X size={16} aria-hidden="true" focusable="false" />
                     </button>
                </div>
                <div
                  className={`absolute bottom-0 left-0 h-0.5 ${isDayMode ? 'bg-violet-500' : 'bg-cyan-400'}`}
                  style={{ width: `${progressPercent}%` }}
                  role="progressbar"
                  aria-label={playerLabels.progress}
                  aria-valuemin={0}
                  aria-valuemax={duration || 100}
                  aria-valuenow={Math.round(progress)}
                  aria-valuetext={progressText}
                />
            </div>
        </motion.div>
      );
  }

  return (
    <motion.div
      role="region"
      aria-label={nowPlayingLabel}
      initial={reduceMotion ? false : { y: 100, opacity: 0 }}
      animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
      drag={!reduceMotion}
      dragMomentum={false}
      whileDrag={reduceMotion ? undefined : { scale: 1.05, cursor: 'grabbing' }}
      className="fixed bottom-6 right-6 z-[80] w-auto max-w-sm cursor-grab active:cursor-grabbing"
    >
      <div className={`backdrop-blur-3xl border rounded-[2rem] p-5 flex flex-col relative overflow-hidden ring-1 group transition-colors ${isDayMode ? 'bg-white/92 border-slate-200/80 shadow-[0_16px_46px_rgba(148,163,184,0.24)] ring-slate-200/70 hover:border-cyan-200/80' : 'bg-black/60 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-white/5 hover:border-white/20'}`}>
        {/* Visualizer Background */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 w-full h-32 opacity-20 pointer-events-none z-0 mask-image-gradient-to-t mix-blend-screen" aria-hidden="true">
              <Visualizer isPlaying={isPlaying} reduceMotion={reduceMotion} />
          </div>
        )}

        <PlayerInfo 
            currentTrack={currentTrack} 
            isPlaying={isPlaying} 
            onClose={handleClose}
            isDayMode={isDayMode}
            reduceMotion={reduceMotion}
            closeLabel={playerLabels.close}
            coverAlt={coverAlt}
        />

        <ProgressBar 
            progress={progress} 
            duration={duration} 
            onSeek={handleSeek}
            isDayMode={isDayMode}
            label={playerLabels.progress}
        />

        <PlayerControls 
            isPlaying={isPlaying} 
            onPlayPause={togglePlay} 
            onNext={nextTrack} 
            onPrev={prevTrack} 
            isDayMode={isDayMode}
            labels={playerLabels}
        />
      </div>
    </motion.div>
  );
};

export default GlobalPlayer;
