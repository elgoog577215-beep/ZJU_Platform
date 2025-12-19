import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Music as MusicIcon, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMusic } from '../context/MusicContext';
import api from '../services/api';
import SmartImage from './SmartImage';
import FavoriteButton from './FavoriteButton';

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const FullFeaturedMusicPlayer = ({ tracks = [] }) => {
  const { t } = useTranslation();
  const { currentTrack, isPlaying, playTrack, togglePlay, nextTrack, prevTrack, audioRef } = useMusic();
  
  // Local state for volume/progress UI
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  useEffect(() => {
    const audio = audioRef.current;
    
    const updateProgress = () => setProgress(audio.currentTime);
    
    audio.addEventListener('timeupdate', updateProgress);
    
    // Sync local state
    setProgress(audio.currentTime);
    setVolume(audio.volume);
    setIsMuted(audio.muted);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
    };
  }, [audioRef, currentTrack]);

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = () => {
    const currentIndex = speedOptions.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    const newSpeed = speedOptions[nextIndex];
    setPlaybackSpeed(newSpeed);
    audioRef.current.playbackRate = newSpeed;
  };

  // Reset speed when track changes
  useEffect(() => {
    setPlaybackSpeed(1.0);
    if(audioRef.current) audioRef.current.playbackRate = 1.0;
  }, [currentTrack]);

  // If no track is playing globally, and we have local tracks, use the first one as "display" (not playing)
  const displayTrack = currentTrack || (tracks.length > 0 ? tracks[0] : { title: t('music.select_track_title', 'Select a track'), artist: t('music.select_track_artist', 'to start listening'), duration: 0, cover: "https://via.placeholder.com/300" });

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
      
      {/* Player Section - Fixed Height or Flex */}
      <div className="p-6 relative overflow-hidden flex-shrink-0">
         {/* Background Blur */}
         <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl z-0" 
            style={{ backgroundImage: `url(${displayTrack.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
         <div className="absolute inset-0 bg-black/60 z-0" />

         <div className="relative z-10 flex flex-col items-center">
            {/* Header */}
            <div className="w-full flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-cyan-500/20 rounded-lg text-cyan-400">
                        <MusicIcon size={16} />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('home.now_playing')}</h3>
                </div>
                {displayTrack && displayTrack.id && (
                    <FavoriteButton 
                        itemId={displayTrack.id}
                        itemType="music"
                        size={16}
                        showCount={false}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    />
                )}
            </div>

            {/* Vinyl */}
            <motion.div 
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear", paused: !isPlaying }}
                className="relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white/10 shadow-2xl overflow-hidden mb-6"
            >
                <SmartImage src={displayTrack.cover} alt={displayTrack.title} type="music" className="w-full h-full" iconSize={32} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-4 h-4 bg-black rounded-full border-2 border-white/20" />
                </div>
            </motion.div>

            {/* Info */}
            <div className="text-center mb-4 w-full">
                <h2 className="text-xl font-bold text-white mb-1 truncate">{displayTrack.title}</h2>
                <p className="text-cyan-400 text-sm truncate">{displayTrack.artist}</p>
            </div>

            {/* Progress */}
            <div className="w-full mb-4">
                <input 
                    type="range" 
                    min="0" 
                    max={displayTrack.duration || 100} 
                    value={progress} 
                    onChange={handleSeek}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-1">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(displayTrack.duration)}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mb-4">
                <button onClick={prevTrack} className="text-gray-400 hover:text-white transition-colors"><SkipBack size={24} /></button>
                <button 
                    onClick={() => {
                        if (currentTrack) togglePlay();
                        else if (tracks.length > 0) playTrack(tracks[0], tracks);
                    }}
                    className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/30"
                >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>
                <button onClick={nextTrack} className="text-gray-400 hover:text-white transition-colors"><SkipForward size={24} /></button>
            </div>

            {/* Volume & Speed Row */}
            <div className="flex items-center justify-between w-full px-2">
                 <button onClick={handleSpeedChange} className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 hover:bg-cyan-500/20">
                    {playbackSpeed}x
                 </button>

                 <div className="flex items-center gap-2">
                    <button onClick={toggleMute} className="text-gray-400 hover:text-white">
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <input 
                        type="range" min="0" max="1" step="0.01" 
                        value={volume} onChange={handleVolumeChange}
                        className="w-16 h-1 bg-white/10 rounded-full accent-gray-400"
                    />
                 </div>
            </div>
         </div>
      </div>

      {/* Playlist Section - Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 border-t border-white/10">
         <div className="p-2 space-y-1">
            {tracks.map((track, idx) => (
                <div 
                    key={track.id}
                    onClick={() => playTrack(track, tracks)}
                    className={`p-2 rounded-lg flex items-center gap-3 cursor-pointer transition-all border border-transparent
                        ${currentTrack?.id === track.id ? 'bg-white/10 border-white/10' : 'hover:bg-white/5'}`}
                >
                    <span className="text-[10px] font-mono text-gray-500 w-4">{idx + 1}</span>
                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                        <SmartImage src={track.cover} alt="cover" type="music" className="w-full h-full" iconSize={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className={`text-xs font-bold truncate ${currentTrack?.id === track.id ? 'text-cyan-400' : 'text-white'}`}>{track.title}</div>
                        <div className="text-[10px] text-gray-500 truncate">{track.artist}</div>
                    </div>
                    {currentTrack?.id === track.id && isPlaying && (
                         <div className="flex gap-0.5 items-end h-3">
                            <div className="w-0.5 bg-cyan-400 animate-[music-bar_0.5s_infinite] h-full" />
                            <div className="w-0.5 bg-cyan-400 animate-[music-bar_0.7s_infinite] h-2/3" />
                            <div className="w-0.5 bg-cyan-400 animate-[music-bar_0.4s_infinite] h-1/2" />
                         </div>
                    )}
                </div>
            ))}
         </div>
      </div>

    </div>
  );
};

export default FullFeaturedMusicPlayer;
