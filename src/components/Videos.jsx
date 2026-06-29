import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { useContentPageEvents, useMobileSortLabel, useMobileToolbarSync } from "../hooks/useContentPage";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Film,
  X,
  Upload,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import UploadModal from "./UploadModal";
import FavoriteButton from "./FavoriteButton";
import SmartImage from "./SmartImage";
import { useTranslation } from "react-i18next";
import Pagination from "./Pagination";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import SortSelector from "./SortSelector";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useBackClose, useBodyScrollLock } from "../hooks/useBackClose";
import { useCachedResource } from "../hooks/useCachedResource";
import MobileContentToolbar from "./MobileContentToolbar";
import toast from "react-hot-toast";
import { getThumbnailUrl } from "../utils/imageUtils";
import { useReducedMotion } from "../utils/animations";
import SEO from "./SEO";

const VideoCard = memo(
  ({ video, index, onClick, onToggleFavorite, canAnimate, isDayMode }) => {
    const { t } = useTranslation();
    const openVideo = () => onClick(video);

    return (
      <motion.div
        initial={canAnimate ? { opacity: 0, y: 14 } : false}
        animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
        transition={
          canAnimate
            ? { duration: 0.24, delay: Math.min(index, 5) * 0.03 }
            : undefined
        }
        className={`group rect-media-card relative aspect-video overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 ${isDayMode ? "bg-white/88 border-slate-200/80 hover:border-pink-300/50" : "bg-[#111111]/84 border-white/10 hover:border-pink-500/30"}`}
      >
        <button
          type="button"
          aria-label={`${video.title} ${t("common.video", "视频")}`}
          onClick={openVideo}
          className={`absolute inset-0 z-30 rounded-lg border-0 bg-transparent p-0 text-left outline-none transition-shadow
            focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black
            ${isDayMode ? "focus-visible:ring-offset-white" : ""}`}
        />

        <SmartImage
          src={getThumbnailUrl(video.thumbnail)}
          alt={video.title}
          type="video"
          priority={index === 0}
          className="w-full h-full"
          imageClassName="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
          iconSize={48}
        />

        {/* New Badge */}
        {video.date &&
          new Date() - new Date(video.date) < 7 * 24 * 60 * 60 * 1000 && (
            <div className="absolute left-2 top-2 rounded-[4px] bg-pink-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-none z-20 md:left-4 md:top-4 md:px-2 md:text-[10px]">
              New
            </div>
          )}

        <div
          className={`pointer-events-none absolute inset-0 z-20 ${isDayMode ? "bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent" : "bg-gradient-to-t from-black/70 via-black/15 to-transparent"} opacity-60 group-hover:opacity-50 transition-opacity duration-300`}
        />

        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
          <div
            className={`rect-icon-button flex h-10 w-10 items-center justify-center border group-hover:scale-105 transition-transform duration-300 relative md:h-16 md:w-16 ${isDayMode ? "bg-white/84 text-slate-950 border-white/70" : "bg-black/45 text-white border-white/20"}`}
          >
            <Play
              size={22}
              fill={isDayMode ? "#0f172a" : "white"}
              className={`${isDayMode ? "text-slate-950" : "text-white"} ml-0.5 relative z-10 md:ml-2 md:h-[34px] md:w-[34px]`}
            />
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 z-20 w-full translate-y-0 p-2.5 transition-transform duration-300 md:translate-y-2 md:p-4 md:group-hover:translate-y-0">
          <div className="flex flex-col gap-1.5 md:gap-2">
            <div className="flex justify-between items-end">
              <h3 className="mr-2 flex-1 line-clamp-1 text-xs font-bold text-[rgba(255,255,255,0.96)] drop-shadow-[0_2px_10px_rgba(15,23,42,0.5)] md:mr-4 md:text-xl">
                {video.title}
              </h3>

              <div className="pointer-events-auto relative z-40 flex items-center gap-1.5 md:gap-2">
                <FavoriteButton
                  itemId={video.id}
                  itemType="video"
                  size={16}
                  showCount={true}
                  count={video.likes || 0}
                  favorited={video.favorited}
                  initialFavorited={video.favorited}
                  className={`rect-icon-button p-1.5 transition-colors group/btn text-white md:p-2 ${isDayMode ? "bg-white/76 border-white/50" : "bg-black/50 border-white/10"}`}
                  onToggle={(favorited, likes) =>
                    onToggleFavorite(video.id, favorited, likes)
                  }
                />
                <div
                  className={`rect-icon-button hidden p-2 border group-hover:bg-pink-500 group-hover:text-white transition-all duration-300 md:block ${isDayMode ? "bg-white/76 border-white/50" : "bg-white/20 border-white/10"}`}
                >
                  <ArrowRight
                    size={18}
                    className="-rotate-45 group-hover:rotate-0 transition-transform duration-300"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    );
  },
);

VideoCard.displayName = "VideoCard";

const Videos = () => {
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState("newest");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const isPaginationEnabled = settings.pagination_enabled === "true";
  const pageSize = isPaginationEnabled ? 12 : 18;
  const [displayVideos, setDisplayVideos] = useState([]);
  const isDayMode = uiMode === "day";
  const mobileSortLabel = useMobileSortLabel(sort, t);
  const ignoreMobileFilter = useCallback(() => {}, []);
  useContentPageEvents("video", setIsUploadOpen, ignoreMobileFilter, setIsMobileSortOpen);
  useMobileToolbarSync(0, mobileSortLabel);

  // Favorites deep-link: close (X) returns to /profile instead of stranding user on /videos.
  // Capture on mount — useBackClose pushes a hash entry whose state overwrites location.state.
  const fromFavoritesRef = useRef(location.state?.fromFavorites === true);
  const fromUserProfileRef = useRef(Boolean(location.state?.fromUserProfile));
  const closeVideo = useCallback(() => {
    if (fromFavoritesRef.current) {
      fromFavoritesRef.current = false; // guard against popstate re-entry
      navigate(-2);
      return;
    }
    if (fromUserProfileRef.current) {
      fromUserProfileRef.current = false;
      navigate(-2);
      return;
    }
    setSelectedVideo(null);
  }, [navigate]);

  useBackClose(selectedVideo !== null, closeVideo);
  useBackClose(isUploadOpen, () => setIsUploadOpen(false));
  useBackClose(isMobileSortOpen, () => setIsMobileSortOpen(false));
  useBodyScrollLock(isMobileSortOpen);

  const {
    data: videos,
    pagination,
    loading,
    error,
    setData: setVideos,
    refresh,
  } = useCachedResource(
    "/videos",
    {
      page: currentPage,
      limit: pageSize,
      sort,
    },
    {
      dependencies: [settings.pagination_enabled],
    },
  );

  const totalPages = pagination?.totalPages || 1;
  const hasMore = !isPaginationEnabled && currentPage < totalPages;

  useEffect(() => {
    setCurrentPage(1);
  }, [sort, settings.pagination_enabled]);

  useEffect(() => {
    if (isPaginationEnabled) {
      setDisplayVideos(videos);
      return;
    }

    setDisplayVideos((prev) => {
      if (currentPage === 1) return videos;
      const seen = new Set(prev.map((item) => item.id));
      const next = videos.filter((item) => !seen.has(item.id));
      return next.length === 0 ? prev : [...prev, ...next];
    });
  }, [videos, currentPage, isPaginationEnabled]);

  // Deep linking
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      api
        .get(`/videos/${id}`)
        .then((res) => {
          if (res.data) setSelectedVideo(res.data);
        })
        .catch((err) => {
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to fetch deep linked video", err);
          }
        });
    }
  }, [searchParams]);

  const addVideo = (newItem) => {
    api
      .post("/videos", newItem)
      .then(() => {
        refresh({ clearCache: true });
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to save video", err);
        }
      });
  };

  const handleUpload = (newItem) => {
    addVideo(newItem);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleFavorite = useCallback(
    (videoId, favorited, likes) => {
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? { ...v, likes: likes !== undefined ? likes : v.likes, favorited }
            : v,
        ),
      );

      setDisplayVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? { ...v, likes: likes !== undefined ? likes : v.likes, favorited }
            : v,
        ),
      );

      setSelectedVideo((prev) => {
        if (prev && prev.id === videoId) {
          return {
            ...prev,
            likes: likes !== undefined ? likes : prev.likes,
            favorited,
          };
        }
        return prev;
      });
    },
    [setVideos, setSelectedVideo, setDisplayVideos],
  );

  return (
    <section data-section="videos" className="section-theme section-page day-page-theme day-page-theme-tech pt-[calc(env(safe-area-inset-top)+76px)] pb-6 md:py-24 px-4 md:px-8 min-h-screen relative z-10 overflow-hidden">
      <SEO
        title={t("videos.title")}
        description={t("videos.subtitle")}
      />
      <div className="max-w-7xl w-full mx-auto relative z-10">
        <div className="hidden md:mb-4 md:flex md:justify-center xl:absolute xl:right-0 xl:top-0 xl:mb-0 items-center gap-4 z-20">
          <button
            onClick={() => {
              if (!user) {
                toast.error(t("auth.signin_required"));
                return;
              }
              setIsUploadOpen(true);
            }}
            className={`rect-icon-button p-2 md:p-3 transition-all ${isDayMode ? "text-slate-700 hover:text-pink-600" : "text-white"}`}
            title={t("common.upload_video")}
          >
            <Upload size={18} className="md:w-5 md:h-5" />
          </button>
        </div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.32 }}
          className="mb-4 md:mb-12 text-center"
        >
          <div className="md:hidden text-left mb-3">
            <h1
              className={`text-xl font-bold tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}
            >
              {t("videos.title")}
            </h1>
            <p
              className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
            >
              {t("videos.subtitle")}
            </p>
          </div>
          <MobileContentToolbar
            isDayMode={isDayMode}
            resultCount={displayVideos.length}
            sortLabel={mobileSortLabel}
            onOpenSort={() => setIsMobileSortOpen(true)}
          />
          <h2 className="section-title hidden md:block mb-4 md:mb-6">
            {t("videos.title")}
          </h2>
          <p className="section-subtitle hidden md:block max-w-xl mx-auto">
            {t("videos.subtitle")}
          </p>
        </motion.div>

        {/* Mobile Sort Drawer (Bottom Sheet) */}
        {createPortal(
          isMobileSortOpen ? (
            <>
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1 }}
                onClick={() => setIsMobileSortOpen(false)}
                className={`fixed inset-0 z-[100] md:hidden ${isDayMode ? "bg-white/62" : "bg-black/60"}`}
              />
              <motion.div
                initial={prefersReducedMotion ? false : { y: 28 }}
                animate={prefersReducedMotion ? undefined : { y: 0 }}
                transition={prefersReducedMotion ? undefined : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="videos-mobile-sort-title"
                className={`fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[78dvh] w-full max-w-md flex-col overflow-y-auto border-t md:hidden ${isDayMode ? "bg-white border-slate-200/80 shadow-[0_-16px_40px_rgba(148,163,184,0.18)]" : "bg-[#1a1a1a] border-white/10 shadow-[0_-18px_48px_rgba(0,0,0,0.42)]"}`}
              >
                <div className={`p-4 border-b flex justify-between items-center sticky top-0 z-10 ${isDayMode ? "bg-white/96 border-slate-200/80" : "bg-[#1a1a1a]/95 border-white/10"}`}>
                  <div>
                    <h3
                      id="videos-mobile-sort-title"
                      className={`text-lg font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}
                    >
                      {t("common.sort", "排序")}
                    </h3>
                    <p className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                      {t("sort_filter.title", "选择排序方式")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobileSortOpen(false)}
                    aria-label={t("common.close", "关闭")}
                    className={`rect-icon-button p-2 transition-colors ${isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-400 hover:text-white"}`}
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
          ) : null,
          document.body,
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 md:gap-8">
          {loading && displayVideos.length === 0 ? (
            // Loading Skeletons
            [...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`rect-media-card relative h-24 animate-pulse overflow-hidden md:aspect-video md:h-auto ${isDayMode ? "bg-white/84 border-slate-200/80" : "bg-[#1a1a1a]/40 border-white/5"}`}
              >
                <div className={`absolute inset-0 ${isDayMode ? "bg-gradient-to-t from-slate-200/70 to-transparent" : "bg-gradient-to-t from-black/50 to-transparent"}`} />
                <div className="absolute bottom-3 left-3 right-3 space-y-2 md:bottom-6 md:left-6 md:right-6 md:space-y-3">
                  <div className="h-3 bg-white/10 rounded w-1/4 md:h-4" />
                  <div className="h-4 bg-white/10 rounded w-3/4 md:h-6" />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="col-span-full flex flex-col items-center justify-center px-4 py-12 md:py-20">
              <div className="rect-panel mb-4 border border-red-500/20 bg-red-500/10 p-5 md:mb-6 md:p-6">
                <AlertCircle size={40} className="text-red-400 opacity-80 md:h-12 md:w-12" />
              </div>
              <p className="mb-4 text-center text-sm text-gray-300 md:mb-6 md:text-lg">
                {t("common.error_fetching_data")}
              </p>
              <button
                onClick={refresh}
                className={`rect-button-secondary px-8 py-3 transition-all font-medium ${isDayMode ? "hover:text-pink-600" : "text-white"}`}
              >
                {t("common.retry")}
              </button>
            </div>
          ) : displayVideos.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center px-4 py-12 md:py-20">
              <div className="rect-panel mb-4 border border-white/5 bg-pink-500/10 p-5 md:mb-6 md:p-8">
                <Film size={44} className="text-pink-400 opacity-80 md:h-16 md:w-16" />
              </div>
              <h3 className={`mb-2 text-xl font-bold md:text-2xl ${isDayMode ? "text-slate-900" : "text-white"}`}>
                {t("videos.no_videos")}
              </h3>
              <p className="max-w-md text-center text-sm text-gray-400 md:text-base">
                {t("videos.subtitle")}
              </p>
            </div>
          ) : (
            displayVideos.map((video, index) => (
              <VideoCard
                key={video.id}
                video={video}
                index={index}
                onClick={setSelectedVideo}
                onToggleFavorite={handleToggleFavorite}
                canAnimate={!prefersReducedMotion && index < 8}
                isDayMode={isDayMode}
              />
            ))
          )}
        </div>

        {!loading &&
          !error &&
          displayVideos.length > 0 &&
          !isPaginationEnabled &&
          hasMore && (
            <div className="flex items-center justify-center pt-6 md:pt-10">
              <motion.button
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className={`rect-button-secondary px-6 py-2.5 transition-colors text-sm font-semibold ${isDayMode ? "hover:text-[var(--section-accent)]" : "text-white hover:border-white/20"}`}
              >
                {t("common.load_more", "加载更多")}
              </motion.button>
            </div>
          )}

        {settings.pagination_enabled === "true" && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {createPortal(
        <AnimatePresence>
          {selectedVideo && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
              }
              className={`fixed inset-0 z-[100] backdrop-blur-md overflow-y-auto ${isDayMode ? "bg-white/72" : "bg-black/90"}`}
              role="dialog"
              aria-modal="true"
              aria-label={selectedVideo.title || t("videos.title")}
              onClick={closeVideo}
            >
              <div className="flex min-h-full items-center justify-center p-4 md:p-8">
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                  animate={
                    prefersReducedMotion ? undefined : { opacity: 1, y: 0 }
                  }
                  exit={
                    prefersReducedMotion ? undefined : { opacity: 0, y: 16 }
                  }
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
                  }
                  className={`relative w-full max-w-5xl border shadow-2xl overflow-hidden flex flex-col ${isDayMode ? "day-fine-surface" : "bg-[#0a0a0a] border-white/10"}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className={`relative aspect-video ${isDayMode ? "bg-slate-100" : "bg-black"}`}
                  >
                    <button
                      type="button"
                      onClick={closeVideo}
                      aria-label={t("common.close_video")}
                      className={`rect-icon-button absolute top-6 right-6 p-2 transition-all z-20 group ${isDayMode ? "bg-white/90 hover:bg-white text-slate-700 border-slate-200/80" : "bg-black/40 hover:bg-black/60 text-white border-white/10"}`}
                      title={t("common.close_video")}
                    >
                      <X
                        size={24}
                        className="group-hover:rotate-90 transition-transform duration-300"
                      />
                    </button>
                    <video
                      src={selectedVideo.video}
                      controls
                      autoPlay
                      className="w-full h-full"
                      ref={(el) => {
                        if (el) {
                          el.playbackRate = 1.0; // Default speed
                        }
                      }}
                    />
                  </div>

                  <div
                    className={`p-8 md:p-10 pt-6 border-t flex justify-between items-start gap-6 ${isDayMode ? "border-slate-200/80 bg-white/94" : "border-white/5 bg-[#0a0a0a]"}`}
                  >
                    <div className="flex-1">
                      <h3
                        className={`text-2xl md:text-3xl font-bold mb-2 font-serif ${isDayMode ? "text-slate-900" : "text-white"}`}
                      >
                        {selectedVideo.title}
                      </h3>
                      <div
                        className={`flex items-center gap-4 text-sm mb-4 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                      >
                        {selectedVideo.created_at && (
                          <p
                             className={`rect-chip px-3 py-1 ${isDayMode ? "bg-slate-100 border-slate-200/80 text-slate-600" : "bg-white/5 border-white/5"}`}
                          >
                            {new Date(
                              selectedVideo.created_at,
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <FavoriteButton
                      itemId={selectedVideo.id}
                      itemType="video"
                      size={24}
                      showCount={true}
                      count={selectedVideo.likes || 0}
                      favorited={selectedVideo.favorited}
                       className={`rect-icon-button p-3 transition-colors shrink-0 ${isDayMode ? "bg-white/90 hover:bg-pink-50 text-slate-700 border-slate-200/80" : "bg-white/5 hover:bg-pink-500/20 border-white/10"}`}
                      onToggle={(favorited, likes) =>
                        handleToggleFavorite(selectedVideo.id, favorited, likes)
                      }
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        type="video"
      />
    </section>
  );
};

export default Videos;
