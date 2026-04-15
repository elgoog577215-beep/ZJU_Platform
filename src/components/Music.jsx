import { createPortal } from "react-dom";
import React, { useState, useEffect, useCallback, memo } from "react";
import { useContentPageEvents, useMobileSortLabel, useMobileToolbarSync } from "../hooks/useContentPage";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music as MusicIcon,
  Volume2,
  VolumeX,
  Upload,
  AlertCircle,
  Tag,
  X,
} from "lucide-react";
import UploadModal from "./UploadModal";
import FavoriteButton from "./FavoriteButton";
import { useTranslation } from "react-i18next";
import Pagination from "./Pagination";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useMusic } from "../context/MusicContext";
import api from "../services/api";
import SortSelector from "./SortSelector";
import { useSearchParams } from "react-router-dom";
import SmartImage from "./SmartImage";
import TagFilter from "./TagFilter";
import toast from "react-hot-toast";
import { getThumbnailUrl } from "../utils/imageUtils";
import { useReducedMotion } from "../utils/animations";
import SEO from "./SEO";

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const TrackItem = memo(
  ({
    track,
    activeTrackId,
    isPlaying,
    onClick,
    onToggleFavorite,
    canAnimate,
    isDayMode,
  }) => {
    const { t } = useTranslation();
    const isActive = track.id === activeTrackId;

    return (
      <motion.div
        initial={canAnimate ? { opacity: 0, y: 10 } : false}
        animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
        transition={canAnimate ? { duration: 0.2, delay: 0.02 } : undefined}
        className={`group flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer border backdrop-blur-md ${
          isActive
            ? isDayMode
              ? "bg-cyan-50 border-cyan-200/80 shadow-[0_12px_28px_rgba(34,211,238,0.12)]"
              : "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
            : isDayMode
              ? "bg-white/82 border-slate-200/80 hover:bg-white hover:border-cyan-200/80 hover:shadow-[0_16px_36px_rgba(148,163,184,0.14)]"
              : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 hover:shadow-lg hover:shadow-black/20"
        }`}
        onClick={() => onClick(track)}
      >
        <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden shrink-0 shadow-lg">
          <SmartImage
            src={getThumbnailUrl(track.cover)}
            alt={track.title}
            type="music"
            className="w-full h-full"
            imageClassName={`w-full h-full object-cover transition-transform duration-700 ${isActive && isPlaying ? "scale-110" : "group-hover:scale-110"}`}
            iconSize={24}
          />
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isDayMode ? "bg-slate-900/20" : "bg-black/40"} ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            {isActive && isPlaying ? (
              <div className="flex gap-0.5 items-end h-4">
                <span
                  className="w-1 bg-cyan-400 animate-[music-bar_1s_ease-in-out_infinite]"
                  style={{ animationDelay: "0s" }}
                />
                <span
                  className="w-1 bg-cyan-400 animate-[music-bar_1s_ease-in-out_infinite]"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="w-1 bg-cyan-400 animate-[music-bar_1s_ease-in-out_infinite]"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            ) : (
              <Play
                size={24}
                className="text-white fill-white drop-shadow-lg"
              />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <div className="flex items-center gap-2">
            <h4
              className={`font-bold truncate text-base md:text-lg ${isActive ? "text-cyan-500" : isDayMode ? "text-slate-900 group-hover:text-cyan-500" : "text-white group-hover:text-cyan-400"} transition-colors`}
            >
              {track.title}
            </h4>
          </div>

          <div
            className={`flex items-center gap-2 text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
          >
            <span className="truncate max-w-[150px]">{track.artist}</span>

            {track.tags && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-600 hidden md:block" />
                <div className="hidden md:flex flex-wrap gap-1.5">
                  {track.tags
                    .split(",")
                    .slice(0, 3)
                    .map((tag, i) => (
                      <span
                        key={i}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] flex items-center gap-1 ${isDayMode ? "bg-slate-100 border border-slate-200/80 text-slate-500" : "bg-white/5 border border-white/5 text-gray-400"}`}
                      >
                        <Tag size={8} /> {tag.trim()}
                      </span>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-3 md:gap-5 mr-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={`text-xs font-mono hidden sm:block px-2 py-1 rounded-md border ${isDayMode ? "text-slate-500 bg-slate-100/90 border-slate-200/80" : "text-gray-500 bg-black/20 border-white/5"}`}
          >
            {formatTime(track.duration)}
          </span>
          <FavoriteButton
            itemId={track.id}
            itemType="music"
            size={18}
            showCount={false}
            favorited={track.favorited}
            initialFavorited={track.favorited}
            className={`p-2.5 rounded-full transition-all border ${
              isActive
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                : isDayMode
                  ? "bg-white/85 text-slate-500 border-slate-200/80 hover:text-cyan-500 hover:bg-cyan-50 hover:border-cyan-200/80"
                  : "bg-white/5 text-gray-400 border-white/5 hover:text-white hover:bg-white/20 hover:border-white/10"
            }`}
            onToggle={(favorited, likes) =>
              onToggleFavorite(track.id, favorited, likes)
            }
          />
        </div>
      </motion.div>
    );
  },
);
TrackItem.displayName = "TrackItem";

const Music = () => {
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    audioRef,
  } = useMusic();
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === "day";
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState("newest");
  const [selectedTags, setSelectedTags] = useState([]); // Added selectedTags state
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const isPaginationEnabled = settings.pagination_enabled === "true";
  const pageSize = isPaginationEnabled ? 12 : 20;
  const hasMore = !isPaginationEnabled && currentPage < totalPages;

  // Deep linking
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      api
        .get(`/music/${id}`)
        .then((res) => {
          if (res.data) {
            // If deep linked, play immediately
            playTrack(res.data);
          }
        })
        .catch((err) => {
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to fetch deep linked music", err);
          }
        });
    }
  }, [searchParams]);

  // Local state for volume/progress UI in this specific view
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const hasActiveMobileFilters = selectedTags.length > 0;
  const mobileSortLabel = useMobileSortLabel(sort, t);
  useContentPageEvents("audio", setIsUploadOpen, setIsMobileFilterOpen, setIsMobileSortOpen);
  useMobileToolbarSync(selectedTags.length, mobileSortLabel);

  useEffect(() => {
    setCurrentPage(1);
  }, [sort, selectedTags, settings.pagination_enabled]);

  // FIX: BUG-15 — Add AbortController to cancel stale requests on rapid sort/filter changes
  useEffect(() => {
    const abortController = new AbortController();
    setLoading(true);
    const params = {
      page: currentPage,
      limit: pageSize,
      sort,
      tags: selectedTags.join(","),
    };

    api
      .get("/music", { params, signal: abortController.signal })
      .then((res) => {
        if (abortController.signal.aborted) return;
        const nextTracks = res.data.data || [];
        const nextTotalPages = res.data.pagination?.totalPages || 1;

        setTracks((prev) => {
          if (isPaginationEnabled || currentPage === 1) return nextTracks;
          const seen = new Set(prev.map((item) => item.id));
          const appended = nextTracks.filter((item) => !seen.has(item.id));
          return appended.length === 0 ? prev : [...prev, ...appended];
        });
        setTotalPages(nextTotalPages);
        setLoading(false);
        setError(false);
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch music:", err);
        }
        setLoading(false);
        setError(true);
      });

    return () => abortController.abort();
  }, [
    currentPage,
    sort,
    selectedTags,
    settings.pagination_enabled,
    refreshKey,
    pageSize,
    isPaginationEnabled,
  ]);

  const refresh = () => {
    setLoading(true);
    setError(false);
    setRefreshKey((k) => k + 1);
  };

  const addTrack = (newItem) => {
    api
      .post("/music", newItem)
      .then(() => {
        refresh({ clearCache: true });
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to save music", err);
        }
      });
  };

  useEffect(() => {
    const audio = audioRef.current;

    const updateProgress = () => setProgress(audio.currentTime);
    // Ended event is handled in context

    audio.addEventListener("timeupdate", updateProgress);

    // Sync local state with audioRef on mount and when track changes
    setProgress(audio.currentTime);
    setVolume(audio.volume);
    setIsMuted(audio.muted);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
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
    if (audioRef.current) audioRef.current.playbackRate = 1.0;
  }, [currentTrack]);

  // Local state for player track (likes/favorited) when not in current list
  const [playerTrackState, setPlayerTrackState] = useState({});

  // Reset player track state when track changes
  useEffect(() => {
    setPlayerTrackState({});
  }, [currentTrack?.id]);

  const defaultTrack = {
    title: t("music.select_track"),
    artist: t("music.to_start"),
    duration: 0,
    cover: "",
    audio: "",
  };
  const activeTrackObj = currentTrack || defaultTrack;
  const activeTrackInList = tracks.find((t) => t.id === activeTrackObj.id);

  // Merge sources: List > Local State > Context/Default
  const activeTrack = {
    ...activeTrackObj,
    ...playerTrackState,
    ...(activeTrackInList || {}),
  };

  const handleTrackClick = (track) => {
    playTrack(track);
  };

  const handleTrackToggleFavorite = useCallback(
    (trackId, favorited, likes) => {
      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId
            ? { ...t, likes: likes !== undefined ? likes : t.likes, favorited }
            : t,
        ),
      );

      // Also update current player track state if it matches
      if (currentTrack && currentTrack.id === trackId) {
        setPlayerTrackState((prev) => ({
          ...prev,
          likes: likes !== undefined ? likes : prev.likes,
          favorited,
        }));
      }
    },
    [setTracks, currentTrack],
  );

  return (
    <section className="pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+96px)] md:py-20 px-4 md:px-8 min-h-screen relative overflow-hidden">
      <SEO
        title="播客"
        description="收听校园播客、原创音乐与精选音频内容。"
      />
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0 hidden md:block">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute top-[40%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="mb-6 md:mb-12 relative z-40 text-center"
      >
        <div className="md:hidden mb-4 text-left">
          <h1
            className={`text-2xl font-bold tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}
          >
            {t("music.title")}
          </h1>
          <p
            className={`text-sm mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
          >
            {t("music.subtitle")}
          </p>
        </div>
        <div className="hidden md:block">
          <h2
            className={`text-4xl md:text-5xl font-bold font-serif mb-4 md:mb-6 ${isDayMode ? "text-slate-900" : "text-white"}`}
          >
            {t("music.title")}
          </h2>
          <p
            className={`max-w-xl mx-auto text-sm md:text-base ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
          >
            {t("music.subtitle")}
          </p>
        </div>

        <div className="hidden md:block w-full max-w-4xl mx-auto px-4 mb-8">
          <TagFilter
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            type="music"
          />
        </div>

        <div className="hidden md:flex items-center gap-4 w-full md:w-auto justify-center md:absolute md:right-0 md:top-0">
          <div className="w-40 md:w-48">
            <SortSelector sort={sort} onSortChange={setSort} />
          </div>
          <button
            onClick={() => {
              if (!user) {
                toast.error(t("auth.signin_required"));
                return;
              }
              setIsUploadOpen(true);
            }}
            className={`p-2 md:p-3 rounded-full backdrop-blur-md border transition-all ${isDayMode ? "bg-white/85 hover:bg-white text-slate-700 border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]" : "bg-white/10 hover:bg-white/20 text-white border border-white/10"}`}
            title={t("common.upload_music")}
          >
            <Upload size={18} className="md:w-5 md:h-5" />
          </button>
        </div>
      </motion.div>

      {/* Mobile Filter Drawer (Bottom Sheet) */}
      {createPortal(
        <AnimatePresence>
          {isMobileFilterOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileFilterOpen(false)}
                className={`fixed inset-0 backdrop-blur-sm z-[100] md:hidden ${isDayMode ? "bg-white/55" : "bg-black/60"}`}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className={`fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit backdrop-blur-xl border rounded-3xl z-[101] md:hidden flex flex-col max-h-[80vh] max-w-md mx-auto ${isDayMode ? "bg-white/95 border-slate-200/80 shadow-[0_24px_60px_rgba(148,163,184,0.22)]" : "bg-[#1a1a1a]/95 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"}`}
              >
                <div
                  className={`p-4 border-b flex justify-between items-center sticky top-0 z-10 backdrop-blur-xl rounded-t-3xl ${isDayMode ? "border-slate-200/80 bg-white/92" : "border-white/10 bg-[#1a1a1a]/95"}`}
                >
                  <div>
                    <h3
                      className={`text-lg font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}
                    >
                      {t("common.filters", "筛选")}
                    </h3>
                    <p
                      className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                    >
                      {t("common.filter_by_tags", "标签筛选")}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className={`p-2 rounded-full transition-colors ${isDayMode ? "text-slate-500 hover:text-slate-900 bg-slate-100" : "text-gray-400 hover:text-white bg-white/5"}`}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4
                        className={`text-sm font-semibold uppercase tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                      >
                        {t("common.tags", "标签")}
                      </h4>
                      {selectedTags.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTags([])}
                          className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full"
                        >
                          {t("common.clear_all", "清除全部")}
                        </button>
                      )}
                    </div>
                    <TagFilter
                      selectedTags={selectedTags}
                      onChange={setSelectedTags}
                      type="music"
                      variant="sheet"
                    />
                  </div>
                </div>
                <div
                  className={`p-4 border-t backdrop-blur-xl rounded-b-3xl flex items-center gap-3 shrink-0 ${isDayMode ? "border-slate-200/80 bg-white/92" : "border-white/10 bg-[#1a1a1a]/95"}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    disabled={!hasActiveMobileFilters}
                    className={`flex-1 py-3 rounded-2xl border disabled:opacity-40 disabled:cursor-not-allowed ${isDayMode ? "border-slate-200/80 bg-slate-100/90 text-slate-600" : "border-white/10 bg-white/5 text-gray-200"}`}
                  >
                    {t("common.clear_all", "重置")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="flex-1 py-3 rounded-2xl bg-white text-black font-semibold"
                  >
                    {t("common.done", "完成")}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Mobile Sort Drawer (Bottom Sheet) */}
      {createPortal(
        <AnimatePresence>
          {isMobileSortOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSortOpen(false)}
                className={`fixed inset-0 backdrop-blur-sm z-[100] md:hidden ${isDayMode ? "bg-white/55" : "bg-black/60"}`}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className={`fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit backdrop-blur-xl border rounded-3xl z-[101] md:hidden flex flex-col max-w-sm mx-auto ${isDayMode ? "bg-white/95 border-slate-200/80 shadow-[0_24px_60px_rgba(148,163,184,0.22)]" : "bg-[#1a1a1a]/95 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"}`}
              >
                <div
                  className={`p-4 border-b flex justify-between items-center sticky top-0 z-10 backdrop-blur-xl rounded-t-3xl ${isDayMode ? "border-slate-200/80 bg-white/92" : "border-white/10 bg-[#1a1a1a]/95"}`}
                >
                  <div>
                    <h3
                      className={`text-lg font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}
                    >
                      {t("common.sort", "排序")}
                    </h3>
                    <p
                      className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                    >
                      {t("sort_filter.title", "选择排序方式")}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsMobileSortOpen(false)}
                    className={`p-2 rounded-full transition-colors ${isDayMode ? "text-slate-500 hover:text-slate-900 bg-slate-100" : "text-gray-400 hover:text-white bg-white/5"}`}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4">
                  <SortSelector
                    sort={sort}
                    onSortChange={(val) => {
                      setSort(val);
                      setTimeout(() => setIsMobileSortOpen(false), 300);
                    }}
                    className="w-full"
                    renderMode="list"
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* Mobile Mini Player - Removed (Moved to GlobalPlayer) */}

      <div className="max-w-6xl w-full mx-auto grid lg:grid-cols-2 gap-6 md:gap-16 items-start relative">
        {/* Player View - Hidden on Mobile */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className={`hidden md:block backdrop-blur-2xl border rounded-3xl p-6 md:p-12 shadow-2xl relative overflow-hidden ${isDayMode ? "bg-white/72 border-slate-200/80 shadow-[0_28px_80px_rgba(148,163,184,0.18)]" : "bg-[#0a0a0a]/50 border-white/20"}`}
        >
          <div
            className={`absolute inset-0 backdrop-blur-3xl z-0 rounded-3xl ${isDayMode ? "bg-slate-100/35" : "bg-white/5"}`}
            style={{
              backgroundImage: `url(${activeTrack.cover})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div
            className={`absolute inset-0 z-0 ${isDayMode ? "bg-white/45" : "bg-black/40"}`}
          />

          {/* Content Wrapper to ensure z-index above background */}
          <div className="relative z-10">
            {/* Header */}
            <div
              className={`flex items-center gap-4 mb-6 sticky top-0 backdrop-blur-2xl border p-4 rounded-xl z-10 shadow-lg ${isDayMode ? "bg-white/78 border-slate-200/80 text-slate-900" : "bg-white/5 border-white/20"}`}
            >
              <div className="p-3 bg-cyan-500/20 rounded-full text-cyan-400">
                <MusicIcon size={24} />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold font-serif">
                  {t("music.title")}
                </h2>
              </div>
            </div>

            {/* Vinyl / Cover */}
            <div className="flex justify-center mb-6 md:mb-8">
              <div
                className={`relative w-48 h-48 md:w-56 md:h-56 rounded-full border-4 overflow-hidden animate-[spin_4s_linear_infinite] ${isDayMode ? "border-slate-200/90 shadow-[0_20px_50px_rgba(148,163,184,0.24)]" : "border-white/10 shadow-2xl"}`}
                style={{ animationPlayState: isPlaying ? "running" : "paused" }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-tr pointer-events-none z-10 rounded-full ${isDayMode ? "from-white/40 to-transparent" : "from-white/20 to-transparent"}`}
                />
                <SmartImage
                  src={activeTrack.cover}
                  alt={activeTrack.title}
                  type="music"
                  className="w-full h-full"
                  imageClassName="w-full h-full object-cover"
                  iconSize={64}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`w-8 h-8 rounded-full border-2 ${isDayMode ? "bg-white border-slate-200/90" : "bg-black border-white/20"}`}
                  />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="text-center mb-8 relative">
              <h2
                className={`text-3xl font-bold mb-2 px-8 ${isDayMode ? "text-slate-900" : "text-white"}`}
              >
                {activeTrack.title}
              </h2>
              <p className="text-cyan-400 font-medium mb-4">
                {activeTrack.artist}
              </p>

              <div className="flex items-center justify-center gap-4 mb-4"></div>

              {activeTrack.id && (
                <div className="flex justify-center">
                  <FavoriteButton
                    itemId={activeTrack.id}
                    itemType="music"
                    size={20}
                    showCount={true}
                    count={activeTrack.likes}
                    favorited={activeTrack.favorited}
                    initialFavorited={activeTrack.favorited}
                    className={`p-2 rounded-full transition-colors border ${isDayMode ? "bg-white/85 hover:bg-cyan-50 border-slate-200/80 text-slate-700" : "bg-white/5 hover:bg-cyan-500/20 border-white/10"}`}
                    onToggle={handleTrackToggleFavorite}
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
                className={`w-full h-1 rounded-full appearance-none cursor-pointer transition-colors ${isDayMode ? "bg-slate-200/90 accent-cyan-500 hover:accent-cyan-600" : "bg-white/10 accent-cyan-400 hover:accent-cyan-300"}`}
              />
              <div
                className={`flex justify-between text-xs font-mono mt-2 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
              >
                <span>{formatTime(progress)}</span>
                <span>{formatTime(activeTrack.duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-6 mb-6">
              <div className="flex items-center justify-center gap-8">
                <button
                  onClick={handlePrev}
                  className={`p-3 rounded-full transition-all active:scale-95 ${isDayMode ? "text-slate-500 hover:text-slate-900 hover:bg-white/80" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                  title={t("common.previous_track")}
                >
                  <SkipBack size={28} />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:scale-105 active:scale-95 transition-all"
                  title={isPlaying ? t("common.pause") : t("common.play")}
                >
                  {isPlaying ? (
                    <Pause size={32} fill="currentColor" />
                  ) : (
                    <Play size={32} fill="currentColor" className="ml-1" />
                  )}
                </button>
                <button
                  onClick={handleNext}
                  className={`p-3 rounded-full transition-all active:scale-95 ${isDayMode ? "text-slate-500 hover:text-slate-900 hover:bg-white/80" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
                  title={t("common.next_track")}
                >
                  <SkipForward size={28} />
                </button>
              </div>

              {/* Speed Control */}
              <button
                onClick={handleSpeedChange}
                className="text-xs font-bold text-cyan-400 border border-cyan-500/30 bg-cyan-500/5 px-4 py-1.5 rounded-full hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all active:scale-95 uppercase tracking-wider"
                title={t("common.playback_speed")}
              >
                {playbackSpeed}x {t("common.speed")}
              </button>
            </div>

            {/* Volume */}
            <div
              className={`flex items-center gap-3 justify-center ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
            >
              <button
                onClick={toggleMute}
                className={`p-2 rounded-full transition-colors ${isDayMode ? "hover:bg-white/80 hover:text-slate-900" : "hover:bg-white/10 hover:text-white"}`}
                title={isMuted ? t("common.unmute") : t("common.mute")}
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
                className={`w-24 h-1 rounded-full appearance-none cursor-pointer transition-all ${isDayMode ? "bg-slate-200/90 accent-slate-500 hover:accent-slate-700" : "bg-white/10 accent-gray-400 hover:accent-white"}`}
              />
            </div>
          </div>
        </motion.div>

        {/* Playlist View */}
        <div className="flex flex-col min-h-0 md:h-[600px]">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="overflow-visible md:flex-1 md:overflow-y-auto custom-scrollbar pr-0 md:pr-2"
          >
            <div
              className={`flex items-center gap-4 mb-4 sticky top-0 backdrop-blur-2xl border p-4 rounded-xl z-10 shadow-lg ${isDayMode ? "bg-white/78 border-slate-200/80 text-slate-900" : "bg-white/5 border-white/20"}`}
            >
              <div className="p-3 bg-cyan-500/20 rounded-full text-cyan-400">
                <MusicIcon size={24} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold">
                {t("music.title")} ({tracks.length})
              </h3>
            </div>

            <div className="space-y-2">
              {loading && tracks.length === 0 ? (
                // Loading Skeleton
                [...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl flex items-center gap-4 animate-pulse ${isDayMode ? "bg-white/82 border border-slate-200/80" : "bg-white/5"}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-lg flex-shrink-0 ${isDayMode ? "bg-slate-100" : "bg-white/10"}`}
                    />
                    <div className="flex-1 space-y-2">
                      <div
                        className={`h-4 rounded w-1/3 ${isDayMode ? "bg-slate-100" : "bg-white/10"}`}
                      />
                      <div
                        className={`h-3 rounded w-1/4 ${isDayMode ? "bg-slate-100" : "bg-white/10"}`}
                      />
                    </div>
                  </div>
                ))
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle
                    size={48}
                    className="text-red-400 mb-4 opacity-50 mx-auto"
                  />
                  <p
                    className={`mb-6 ${isDayMode ? "text-slate-600" : "text-gray-300"}`}
                  >
                    {t("common.error_fetching_data", "获取数据失败")}
                  </p>
                  <button
                    onClick={refresh}
                    className={`px-6 py-2 rounded-full transition-all border ${isDayMode ? "bg-white/85 hover:bg-white text-slate-700 border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]" : "bg-white/10 hover:bg-white/20 text-white border border-white/10"}`}
                  >
                    {t("common.retry", "重试")}
                  </button>
                </div>
              ) : (
                <>
                  {tracks.length === 0 && (
                    <div
                      className={`text-center py-12 ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                    >
                      <MusicIcon
                        size={48}
                        className="mx-auto mb-4 opacity-20"
                      />
                      <p>{t("music.no_tracks")}</p>
                      {selectedTags.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTags([])}
                          className={`mt-5 px-5 py-2 rounded-full border text-sm font-medium ${isDayMode ? "bg-white/90 border-slate-200/80 text-slate-700 hover:bg-white" : "bg-white/10 border-white/15 text-white hover:bg-white/15"}`}
                        >
                          {t("common.clear_all", "清除全部")}
                        </button>
                      )}
                    </div>
                  )}
                  {tracks.map((track, index) => (
                    <TrackItem
                      key={track.id}
                      track={track}
                      activeTrackId={activeTrack.id}
                      isPlaying={isPlaying}
                      onClick={handleTrackClick}
                      onToggleFavorite={handleTrackToggleFavorite}
                      canAnimate={!prefersReducedMotion && index < 10}
                      isDayMode={isDayMode}
                    />
                  ))}
                </>
              )}
            </div>
          </motion.div>
          {!loading &&
            !error &&
            tracks.length > 0 &&
            !isPaginationEnabled &&
            hasMore && (
              <div className="mt-6 flex items-center justify-center">
                <motion.button
                  whileHover={
                    prefersReducedMotion ? undefined : { scale: 1.02 }
                  }
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className={`px-6 py-2.5 rounded-full border transition-colors text-sm font-semibold ${isDayMode ? "bg-white/88 hover:bg-white text-slate-700 border-slate-200/80 hover:border-cyan-200/80 shadow-[0_14px_32px_rgba(148,163,184,0.14)]" : "bg-white/10 hover:bg-white/15 text-white border-white/10 hover:border-white/20"}`}
                >
                  {t("common.load_more", "加载更多")}
                </motion.button>
              </div>
            )}
          {settings.pagination_enabled === "true" && (
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
