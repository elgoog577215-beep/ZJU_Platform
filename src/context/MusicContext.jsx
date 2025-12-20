import React, { createContext, useState, useContext, useRef, useEffect } from 'react';

const MusicContext = createContext();

export const useMusic = () => useContext(MusicContext);

export const MusicProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState([]);
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false);
  const audioRef = useRef(new Audio());

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error("Playback failed", err));
    }
    setIsPlaying(!isPlaying);
  };

  const playTrack = (track, newPlaylist = []) => {
    if (newPlaylist.length > 0) {
      setPlaylist(newPlaylist);
    }
    
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      setIsMiniPlayerVisible(true);
      audioRef.current.src = track.audio;
      audioRef.current.play().catch(err => console.error("Playback failed", err));
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    
    const handleEnded = () => {
      if (playlist.length > 0 && currentTrack) {
        const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
        const nextIndex = (currentIndex + 1) % playlist.length;
        playTrack(playlist[nextIndex], playlist);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [currentTrack, playlist]);

  const nextTrack = () => {
    if (playlist.length === 0 || !currentTrack) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    playTrack(playlist[nextIndex]);
  };

  const prevTrack = () => {
    if (playlist.length === 0 || !currentTrack) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playTrack(playlist[prevIndex]);
  };

  return (
    <MusicContext.Provider value={{
      currentTrack,
      isPlaying,
      playlist,
      playTrack,
      togglePlay,
      nextTrack,
      prevTrack,
      audioRef,
      isMiniPlayerVisible,
      setIsMiniPlayerVisible
    }}>
      {children}
    </MusicContext.Provider>
  );
};
