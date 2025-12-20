import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Music as MusicIcon, Volume2, VolumeX, Upload, AlertCircle } from 'lucide-react';
import UploadModal from './UploadModal';
import FavoriteButton from './FavoriteButton';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
import { useSettings } from '../context/SettingsContext';
import { useMusic } from '../context/MusicContext';
import api from '../services/api';
import SortSelector from './SortSelector';
import { useSearchParams } from 'react-router-dom';
import SmartImage from './SmartImage';

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const Music = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const { currentTrack, isPlaying, playTrack, togglePlay, nextTrack, prevTrack, audioRef } = useMusic();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('newest');
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Deep linking
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
        api.get(`/music/${id}`)
           .then(res => {
               if (res.data) {
                   // If deep linked, play immediately
                   playTrack(res.data);
               }
           })
           .catch(err => console.error("Failed to fetch deep linked music", err));
    }
  }, [searchParams]);

  // Local state for volume/progress UI in this specific view
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const limit = settings.pagination_enabled === 'true' ? 12 : 1000;
    
    const params = {
      page: currentPage,
      limit,
      sort,
    };

    api.get('/music', { params })
      .then(res => {
        setTracks(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setLoading(false);
        setError(false);
      })
      .catch(err => {
        console.error("Failed to fetch music:", err);
        setLoading(false);
        setError(true);
      });
  }, [currentPage, sort, settings.pagination_enabled, refreshKey]);

  const addTrack = (newItem) => {
    api.post('/music', newItem)
    .then(() => {
        const limit = settings.pagination_enabled === 'true' ? 10 : 1000;
        return api.get(`/music?page=${currentPage}&limit=${limit}`);
    })
    .then(res => {
        setTracks(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
    })
    .catch(err => console.error("Failed to save music", err));
  };

  useEffect(() => {
    const audio = audioRef.current;
    
    const updateProgress = () => setProgress(audio.currentTime);
    // Ended event is handled in context
    
    audio.addEventListener('timeupdate', updateProgress);
    
    // Sync local state with audioRef on mount and when track changes
    setProgress(audio.currentTime);
    setVolume(audio.volume);
    setIsMuted(audio.muted);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
    };
  }, [audioRef, currentTrack]); // Re-bind when currentTrack changes to ensure UI sync

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

  const handleNext = () => nextTrack();
  const handlePrev = () => prevTrack();
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleUpload = (newItem) => {
    addTrack(newItem);
  };

  // Playback Speed State
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

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

  // Local state for player track (likes/favorited) when not in current list
  const [playerTrackState, setPlayerTrackState] = useState({});
  
  // Reset player track state when track changes
  useEffect(() => {
    setPlayerTrackState({});
  }, [currentTrack?.id]);

  const defaultTrack = { title: t('music.select_track'), artist: t('music.to_start'), duration: 0, cover: "https://via.placeholder.com/300", audio: "" };
  const activeTrackObj = currentTrack || defaultTrack;
  const activeTrackInList = tracks.find(t => t.id === activeTrackObj.id);
  
  // Merge sources: List > Local State > Context/Default
  const activeTrack = { 
      ...activeTrackObj, 
      ...playerTrackState, 
      ...(activeTrackInList || {}) 
  };

  return (
    <section className="pt-36 pb-32 md:py-20 px-4 md:px-8 min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="mb-8 md:mb-12 relative z-40 text-center"
      >
        
        <div className="mb-8">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold font-serif mb-3 md:mb-4">{t('music.title')}</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">{t('music.subtitle')}</p>
        </div>
          
        <div className="flex items-center gap-4 w-full md:w-auto justify-center md:absolute md:right-0 md:top-0">
          <div className="w-40 md:w-48">
            <SortSelector sort={sort} onSortChange={setSort} />
          </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full backdrop-blur-md border border-white/10 transition-all"
              title={t('common.upload_music')}
            >
              <Upload size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-8 md:gap-16 items-center relative">

        {/* Player View */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-[#0a0a0a]/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-12 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl z-0 rounded-3xl" 
            style={{ backgroundImage: `url(${activeTrack.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <div className="absolute inset-0 bg-black/40 z-0" />
          
          {/* Content Wrapper to ensure z-index above background */}
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                <MusicIcon size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-serif">{t('music.title')}</h2>
                <p className="text-gray-400 text-sm">{t('music.subtitle')}</p>
              </div>
            </div>

            {/* Vinyl / Cover */}
            <div className="flex justify-center mb-8">
              <motion.div 
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
                className="relative w-64 h-64 rounded-full border-4 border-white/10 shadow-2xl overflow-hidden"
              >
                <SmartImage 
                  src={activeTrack.cover} 
                  alt={activeTrack.title} 
                  type="music"
                  className="w-full h-full" 
                  imageClassName="w-full h-full object-cover"
                  iconSize={64} 
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-black rounded-full border-2 border-white/20" />
                </div>
              </motion.div>
            </div>

            {/* Info */}
            <div className="text-center mb-8 relative">
              <h2 className="text-3xl font-bold text-white mb-2 px-8">{activeTrack.title}</h2>
              <p className="text-cyan-400 font-medium mb-4">{activeTrack.artist}</p>
              
              {activeTrack.id && (
                  <div className="flex justify-center">
                      <FavoriteButton 
                        itemId={activeTrack.id}
                        itemType="music"
                        size={20}
                        showCount={true}
                        count={activeTrack.likes}
                        favorited={activeTrack.favorited}
                        className="p-2 bg-white/5 hover:bg-cyan-500/20 rounded-full transition-colors border border-white/10"
                        onToggle={(favorited, likes) => {
                            setPlayerTrackState({ likes, favorited });
                            setTracks(prev => prev.map(t => 
                                t.id === activeTrack.id ? { ...t, likes: likes !== undefined ? likes : t.likes, favorited } : t
                            ));
                        }}
                      />
                  </div>
              )}
            </div>

            {/* Progress */}
            <div className="mb-8">
              <input 
                type="range" 
                min="0" 
                max={activeTrack.duration || 100} 
                value={progress} 
                onChange={handleSeek}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
              />
              <div className="flex justify-between text-xs text-gray-400 font-mono mt-2">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(activeTrack.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-6 mb-6">
              <div className="flex items-center justify-center gap-8">
                <button 
                  onClick={handlePrev} 
                  className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95"
                  title={t('common.previous_track')}
                >
                  <SkipBack size={28} />
                </button>
                <button 
                  onClick={togglePlay}
                  className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:scale-105 active:scale-95 transition-all"
                  title={isPlaying ? t('common.pause') : t('common.play')}
                >
                  {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>
                <button 
                  onClick={handleNext} 
                  className="p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95"
                  title={t('common.next_track')}
                >
                  <SkipForward size={28} />
                </button>
              </div>
              
              {/* Speed Control */}
              <button 
                onClick={handleSpeedChange}
                className="text-xs font-bold text-cyan-400 border border-cyan-500/30 bg-cyan-500/5 px-4 py-1.5 rounded-full hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all active:scale-95 uppercase tracking-wider"
                title={t('common.playback_speed')}
              >
                {playbackSpeed}x {t('common.speed')}
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 justify-center text-gray-400">
              <button 
                onClick={toggleMute}
                className="p-2 hover:bg-white/10 rounded-full transition-colors hover:text-white"
                title={isMuted ? t('common.unmute') : t('common.mute')}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume} 
                onChange={handleVolumeChange}
                className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-gray-400 hover:accent-white transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* Playlist View */}
        <div className="flex flex-col h-[600px]">
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex-1 overflow-y-auto custom-scrollbar pr-2"
          >
            <div className="flex items-center gap-4 mb-4 sticky top-0 bg-black/50 backdrop-blur-md p-4 rounded-xl z-10">
              <div className="p-3 bg-cyan-500/20 rounded-full text-cyan-400">
                <MusicIcon size={24} />
              </div>
              <h3 className="text-2xl font-bold">{t('music.subtitle')} ({tracks.length})</h3>
            </div>

            <div className="space-y-2">
              {loading && tracks.length === 0 ? (
                // Loading Skeleton
                [...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 rounded-xl flex items-center gap-4 bg-white/5 animate-pulse">
                        <div className="w-12 h-12 rounded-lg bg-white/10 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-white/10 rounded w-1/3" />
                            <div className="h-3 bg-white/10 rounded w-1/4" />
                        </div>
                    </div>
                ))
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
                  <p className="text-gray-300 mb-6">{t('common.error_fetching_data') || 'Failed to load music'}</p>
                  <button 
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
                  >
                    {t('common.retry') || 'Retry'}
                  </button>
                </div>
              ) : (
                <>
                {tracks.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                    <MusicIcon size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{t('music.no_tracks')}</p>
                    </div>
                )}
                {tracks.map((track) => (
                <div 
                  key={track.id}
                  onClick={() => playTrack(track, tracks)}
                  className={`p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all border border-transparent
                    ${activeTrack.id === track.id ? 'bg-white/10 border-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <SmartImage 
                      src={track.cover} 
                      alt={track.title} 
                      type="music" 
                      className="w-full h-full" 
                      imageClassName="w-full h-full object-cover"
                      iconSize={20} 
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold ${activeTrack.id === track.id ? 'text-cyan-400' : 'text-white'}`}>
                      {track.title}
                    </h4>
                    <p className="text-sm text-gray-400">{track.artist}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-mono">{formatTime(track.duration)}</span>
                    <FavoriteButton
                        itemId={track.id}
                        itemType="music"
                        size={16}
                        showCount={true}
                        count={track.likes}
                        favorited={track.favorited}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors group"
                        onToggle={(favorited, likes) => {
                            setTracks(prev => prev.map(t => 
                                t.id === track.id ? { ...t, likes: likes !== undefined ? likes : t.likes, favorited } : t
                            ));
                            // Also update player state if it matches
                            if (activeTrack.id === track.id) {
                                setPlayerTrackState(prev => ({ ...prev, likes, favorited }));
                            }
                        }}
                    />
                  </div>
                  {activeTrack.id === track.id && isPlaying && (
                    <div className="flex gap-0.5 items-end h-4">
                      <div className="w-1 bg-cyan-400 animate-[music-bar_1s_ease-in-out_infinite] h-full" />
                      <div className="w-1 bg-cyan-400 animate-[music-bar_1.2s_ease-in-out_infinite] h-2/3" />
                      <div className="w-1 bg-cyan-400 animate-[music-bar_0.8s_ease-in-out_infinite] h-1/2" />
                    </div>
                  )}
                </div>
              ))}
              </>
              )}
            </div>
          </motion.div>
          {settings.pagination_enabled === 'true' && (
            <div className="mt-4">
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={handlePageChange} 
              />
            </div>
          )}
        </div>
      </div>
      
      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        type="audio"
      />
    </section>
  );
};

export default Music;
