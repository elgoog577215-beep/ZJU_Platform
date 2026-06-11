import React, { forwardRef, memo, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  ArrowRight,
  Box,
  Film,
  Image as ImageIcon,
  Maximize2,
  Play,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import FavoriteButton from "./FavoriteButton";
import Lightbox from "./Lightbox";
import SEO from "./SEO";
import SmartImage from "./SmartImage";
import UploadModal from "./UploadModal";
import useMediaCategories from "../hooks/useMediaCategories";
import { useAuth } from "../context/AuthContext";
import { useCachedResource } from "../hooks/useCachedResource";
import { useSettings } from "../context/SettingsContext";
import { useBackClose } from "../hooks/useBackClose";
import { useContentPageEvents } from "../hooks/useContentPage";
import api from "../services/api";
import { getThumbnailUrl } from "../utils/imageUtils";
import { useReducedMotion } from "../utils/animations";

const PhotoCard = memo(forwardRef(({ photo, index, onClick, onToggleFavorite, canAnimate, isDayMode, untitledLabel }, ref) => (
  <motion.div
    ref={ref}
    initial={canAnimate ? { opacity: 0, y: 16 } : false}
    animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
    exit={canAnimate ? { opacity: 0, scale: 0.98 } : undefined}
    transition={{
      duration: 0.28,
      delay: Math.min(index, 5) * 0.03,
      ease: [0.25, 0.46, 0.45, 0.94],
    }}
    whileHover={canAnimate ? { y: -4, transition: { duration: 0.18 } } : undefined}
    className={`break-inside-avoid relative group aspect-[4/5] overflow-hidden rounded-2xl cursor-pointer backdrop-blur-sm border transition-all duration-300 w-full inline-block touch-manipulation mb-0 sm:aspect-auto sm:mb-4 md:mb-6 ${
      isDayMode
        ? "day-card-lift rounded-xl"
        : "bg-white/5 border-white/10 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-white/20"
    }`}
    onClick={() => onClick(index)}
  >
    <SmartImage
      src={getThumbnailUrl(photo.url)}
      alt={photo.title}
      type="image"
      className="h-full w-full sm:min-h-[240px]"
      imageClassName="h-full w-full object-cover transform transition-transform duration-700 ease-out group-hover:scale-105 sm:h-auto sm:min-h-[240px]"
      blurPlaceholder={photo.blurPlaceholder}
    />

    <div
      className={`absolute inset-0 ${
        isDayMode
          ? "bg-gradient-to-t from-slate-950/76 via-slate-900/18 to-transparent"
          : "bg-gradient-to-t from-black/90 via-black/40 to-transparent"
      } opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5 sm:p-4`}
    >
      <div className="flex flex-col gap-2 md:translate-y-3 md:group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex justify-between items-end gap-1.5 sm:gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold text-[rgba(255,255,255,0.96)] drop-shadow-[0_2px_10px_rgba(15,23,42,0.45)] line-clamp-2 sm:text-lg">
              {photo.title || untitledLabel}
            </h3>
            {photo.category_name ? (
              <p className="mt-0.5 text-[10px] font-medium text-white/72 line-clamp-1 sm:mt-1 sm:text-xs">
                {photo.category_name}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div onClick={(event) => event.stopPropagation()}>
              <FavoriteButton
                itemId={photo.id}
                itemType="photo"
                size={16}
                showCount
                count={photo.likes || 0}
                favorited={photo.favorited}
                initialFavorited={photo.favorited}
                className={`p-1.5 rounded-full backdrop-blur-md transition-all duration-200 text-white border sm:p-2 ${
                  isDayMode
                    ? "bg-white/82 hover:bg-white border-white/60 shadow-[0_10px_20px_rgba(15,23,42,0.16)]"
                    : "bg-white/10 border-white/10"
                } hover:border-white/70 hover:shadow-lg`}
                onToggle={(favorited, likes) => onToggleFavorite(photo.id, favorited, likes)}
              />
            </div>
            <div
              className={`hidden p-2 rounded-full backdrop-blur-md border sm:block ${
                isDayMode ? "bg-white/72 border-white/40 shadow-[0_12px_24px_rgba(15,23,42,0.18)]" : "bg-white/20 border-white/10"
              } ${isDayMode ? "group-hover:bg-slate-950" : "group-hover:bg-indigo-500"} group-hover:text-white transition-all duration-300`}
            >
              <Maximize2 size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>

    {typeof photo.likes === "number" && (
      <div
        className="absolute top-3 right-3 hidden items-center gap-1 backdrop-blur-md rounded-full px-2 py-1 border border-white/10 sm:flex"
        style={{ backgroundColor: isDayMode ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.4)" }}
      >
        <span className="text-pink-400 text-xs">♥</span>
        <span className={`text-xs font-medium ${isDayMode ? "text-slate-900" : "text-white"}`}>
          {photo.likes}
        </span>
      </div>
    )}
  </motion.div>
)));

PhotoCard.displayName = "PhotoCard";

const VideoCard = memo(({ video, index, onClick, onToggleFavorite, canAnimate, isDayMode, untitledLabel, uncategorizedLabel }) => (
  <motion.div
    initial={canAnimate ? { opacity: 0, y: 14 } : false}
    animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
    transition={canAnimate ? { duration: 0.24, delay: Math.min(index, 5) * 0.03 } : undefined}
    onClick={() => onClick(video)}
    className={`group rect-media-card relative aspect-video overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
      isDayMode
        ? "bg-white border-slate-200/80 hover:border-slate-300"
        : "bg-[#111111]/84 border-white/10 hover:border-pink-500/30"
    }`}
  >
    <SmartImage
      src={getThumbnailUrl(video.thumbnail)}
      alt={video.title}
      type="video"
      priority={index < 3}
      className="w-full h-full"
      imageClassName="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
      iconSize={44}
    />

    {(video.created_at || video.date) && new Date() - new Date(video.created_at || video.date) < 7 * 24 * 60 * 60 * 1000 && (
      <div className="absolute top-4 left-4 px-2 py-0.5 rounded-[4px] bg-pink-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-none z-20">
        New
      </div>
    )}

    <div
      className={`absolute inset-0 ${
        isDayMode
          ? "bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent"
          : "bg-gradient-to-t from-black/70 via-black/15 to-transparent"
      } opacity-60 group-hover:opacity-50 transition-opacity duration-300`}
    />

    <div className="absolute inset-0 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
      <div
        className={`rect-icon-button flex h-10 w-10 items-center justify-center border group-hover:scale-105 transition-transform duration-300 relative sm:h-14 sm:w-14 ${
          isDayMode ? "bg-white/84 text-slate-950 border-white/70" : "bg-black/45 text-white border-white/20"
        }`}
      >
        <Play size={22} fill={isDayMode ? "#0f172a" : "white"} className={`${isDayMode ? "text-slate-950" : "text-white"} ml-0.5 relative z-10 sm:ml-1 sm:h-[30px] sm:w-[30px]`} />
      </div>
    </div>

    <div className="absolute bottom-0 left-0 w-full p-2.5 translate-y-0 transition-transform duration-300 sm:p-4 sm:translate-y-2 sm:group-hover:translate-y-0">
      <div className="flex justify-between items-end gap-1.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-bold text-[rgba(255,255,255,0.96)] drop-shadow-[0_2px_10px_rgba(15,23,42,0.5)] line-clamp-1 sm:text-base md:text-lg">
            {video.title || untitledLabel}
          </h3>
          <p className="mt-0.5 text-[10px] font-medium text-white/68 line-clamp-1 sm:mt-1 sm:text-xs">
            {video.category_name || uncategorizedLabel}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div onClick={(event) => event.stopPropagation()}>
            <FavoriteButton
              itemId={video.id}
              itemType="video"
              size={16}
              showCount
              count={video.likes || 0}
              favorited={video.favorited}
              initialFavorited={video.favorited}
              className={`rect-icon-button p-1.5 transition-colors group/btn text-white sm:p-2 ${
                isDayMode ? "bg-white/76 border-white/50" : "bg-black/50 border-white/10"
              }`}
              onToggle={(favorited, likes) => onToggleFavorite(video.id, favorited, likes)}
            />
          </div>
          <div
            className={`rect-icon-button hidden p-2 border group-hover:bg-pink-500 group-hover:text-white transition-all duration-300 sm:block ${
              isDayMode ? "bg-white/76 border-white/50" : "bg-white/20 border-white/10"
            }`}
          >
            <ArrowRight size={18} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
          </div>
        </div>
      </div>
    </div>
  </motion.div>
));

VideoCard.displayName = "VideoCard";

const EmptyState = ({ icon: Icon, title, description, accent = "indigo", isDayMode }) => (
  <div className="flex min-h-[260px] flex-col items-center justify-center px-4 py-16 text-center">
    <div
      className={`rounded-xl p-8 mb-6 border ${
        isDayMode ? "bg-white border-slate-200/80" : "bg-white/5 border-white/10"
      }`}
    >
      <Icon size={56} className={isDayMode ? "text-slate-400" : accent === "pink" ? "text-pink-400 opacity-80" : "text-gray-500"} />
    </div>
    <h3 className={`text-2xl font-bold mb-2 ${isDayMode ? "text-slate-900" : "text-white"}`}>{title}</h3>
    <p className={`max-w-md ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>{description}</p>
  </div>
);

const LoadMoreButton = ({ onClick, loading, disabled, isDayMode, loadingLabel, children }) => (
  <div className="flex items-center justify-center py-8">
    <motion.button
      type="button"
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`rect-button-secondary min-h-[44px] px-6 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        isDayMode
          ? "hover:text-blue-700"
          : "text-white hover:border-white/20"
      }`}
    >
      {loading ? loadingLabel : children}
    </motion.button>
  </div>
);

const MediaCategoryRail = memo(({ categories, activeCategoryId, onChange, isDayMode, allLabel }) => {
  const nightFocusClass = isDayMode
    ? "focus-visible:ring-blue-400/55"
    : "focus-visible:border-white/[0.22] focus-visible:ring-slate-300/35 focus-visible:shadow-[0_0_0_4px_rgba(148,163,184,0.12)]";
  const channelButtonClass = (active) =>
    `rect-button relative h-10 shrink-0 px-4 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 ${nightFocusClass} ${
      active
        ? isDayMode
          ? "text-slate-950"
          : "text-indigo-100"
        : isDayMode
          ? "text-slate-500 hover:bg-white/70 hover:text-slate-900"
          : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
    }`;

  const renderActivePill = () => (
    <motion.span
      layoutId="media-category-active"
    className={`absolute inset-0 ${
        isDayMode
          ? "border border-slate-300 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
          : "border border-indigo-400/35 bg-indigo-500/20 shadow-none"
      }`}
      transition={{ type: "spring", bounce: 0.12, duration: 0.42 }}
    />
  );

  return (
    <div className="relative z-10 mx-auto w-full max-w-[760px]">
      <div
        className={`relative overflow-visible border p-1 ${
          isDayMode
            ? "border-slate-200/80 bg-white shadow-none"
            : "border-white/[0.12] bg-[#070a14]/92 shadow-none"
        }`}
      >
        <div
          className={`relative min-w-0 overflow-hidden border ${
            isDayMode
              ? "border-slate-200/80 bg-slate-50"
              : "border-white/[0.09] bg-[#050712]/88"
          }`}
        >
          <div className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto p-0.5 pr-10 md:pr-0.5">
            <button
              type="button"
              aria-pressed={!activeCategoryId}
              onClick={() => onChange("")}
              className={channelButtonClass(!activeCategoryId)}
            >
              {!activeCategoryId && renderActivePill()}
              <span className="relative z-10 whitespace-nowrap">{allLabel}</span>
            </button>

            {categories.map((category) => {
              const active = String(activeCategoryId) === String(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(String(category.id))}
                  className={channelButtonClass(active)}
                >
                  {active && renderActivePill()}
                  <span className="relative z-10 whitespace-nowrap">{category.name}</span>
                </button>
              );
            })}
          </div>
          <div
            className={`pointer-events-none absolute inset-y-1 right-1 w-10 ${
              isDayMode
                ? "bg-gradient-to-l from-slate-50 via-slate-50/88 to-transparent"
                : "bg-gradient-to-l from-[#0a0d14] via-[#0a0d14]/88 to-transparent"
            }`}
          />
        </div>
      </div>
    </div>
  );
});

MediaCategoryRail.displayName = "MediaCategoryRail";

const MediaLibrary = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { settings, uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const prefersReducedMotion = useReducedMotion();
  const isPaginationEnabled = settings.pagination_enabled === "true";
  const [categoryId, setCategoryId] = useState("");
  const [uploadType, setUploadType] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [externalPhoto, setExternalPhoto] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isMobileUploadOpen, setIsMobileUploadOpen] = useState(false);
  const [photoPage, setPhotoPage] = useState(1);
  const [videoPage, setVideoPage] = useState(1);
  const photoDeepLinkId = searchParams.get("photo");
  const videoDeepLinkId = searchParams.get("video");
  const [displayPhotos, setDisplayPhotos] = useState([]);
  const [displayVideos, setDisplayVideos] = useState([]);
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    refresh: refreshCategories,
  } = useMediaCategories();
  const photoLimit = isPaginationEnabled ? 18 : 48;
  const videoLimit = isPaginationEnabled ? 12 : 24;
  const categoryParam = categoryId ? Number(categoryId) : undefined;
  const allowAmbientEffects =
    !prefersReducedMotion &&
    (typeof window === "undefined" || window.innerWidth >= 768);

  const {
    data: photos,
    pagination: photoPagination,
    loading: photosLoading,
    error: photosError,
    setData: setPhotos,
    refresh: refreshPhotos,
  } = useCachedResource(
    "/photos",
    { page: photoPage, limit: photoLimit, sort: "newest", category_id: categoryParam },
    { dependencies: [categoryParam, settings.pagination_enabled] },
  );

  const {
    data: videos,
    pagination: videoPagination,
    loading: videosLoading,
    error: videosError,
    setData: setVideos,
    refresh: refreshVideos,
  } = useCachedResource(
    "/videos",
    { page: videoPage, limit: videoLimit, sort: "newest", category_id: categoryParam },
    { dependencies: [categoryParam, settings.pagination_enabled] },
  );

  const photoTotalPages = photoPagination?.totalPages || 1;
  const videoTotalPages = videoPagination?.totalPages || 1;
  const canLoadMorePhotos = photoPage < photoTotalPages;
  const canLoadMoreVideos = videoPage < videoTotalPages;

  useEffect(() => {
    setPhotoPage(1);
    setVideoPage(1);
    setDisplayPhotos([]);
    setDisplayVideos([]);
    setSelectedPhotoIndex(null);
    setSelectedVideo(null);
  }, [categoryParam, settings.pagination_enabled]);

  useEffect(() => {
    setDisplayPhotos((prev) => {
      if (photoPage === 1) return Array.isArray(photos) ? photos : [];
      const safePhotos = Array.isArray(photos) ? photos : [];
      const seen = new Set(prev.map((item) => item.id));
      const next = safePhotos.filter((item) => !seen.has(item.id));
      return next.length === 0 ? prev : [...prev, ...next];
    });
  }, [photos, photoPage]);

  useEffect(() => {
    setDisplayVideos((prev) => {
      if (videoPage === 1) return Array.isArray(videos) ? videos : [];
      const safeVideos = Array.isArray(videos) ? videos : [];
      const seen = new Set(prev.map((item) => item.id));
      const next = safeVideos.filter((item) => !seen.has(item.id));
      return next.length === 0 ? prev : [...prev, ...next];
    });
  }, [videos, videoPage]);

  const activeCategoryName = useMemo(() => {
    if (!categoryId) return t("common.all", "全部");
    return categories.find((category) => String(category.id) === String(categoryId))?.name || t("media_library.current_category", "当前分类");
  }, [categories, categoryId, t]);

  const openUpload = useCallback((type = null) => {
    if (!user) {
      toast.error(t("media_library.login_required", "请先登录后再上传"));
      window.dispatchEvent(new Event("open-auth-modal"));
      return;
    }
    if (type) {
      setUploadType(type);
      return;
    }
    setIsMobileUploadOpen(true);
  }, [t, user]);

  const ignoreMobileFilter = useCallback((next) => {
    if (typeof next === "function") next(false);
  }, []);
  const ignoreMobileSort = useCallback((next) => {
    if (typeof next === "function") next(false);
  }, []);
  useContentPageEvents("media", () => openUpload(), ignoreMobileFilter, ignoreMobileSort);

  const closeUpload = useCallback(() => setUploadType(null), []);
  const closeUploadPicker = useCallback(() => setIsMobileUploadOpen(false), []);
  const closeSelectedVideo = useCallback(() => setSelectedVideo(null), []);

  useBackClose(Boolean(uploadType), closeUpload);
  useBackClose(isMobileUploadOpen, closeUploadPicker);
  useBackClose(selectedVideo !== null, closeSelectedVideo);

  const handlePhotoUpload = async (newItem) => {
    if (Array.isArray(newItem)) {
      for (const item of newItem) {
        await api.post("/photos", { ...item, category_id: item.category_id || categoryParam || null });
      }
      refreshPhotos({ clearCache: true });
      return;
    }
    await api.post("/photos", { ...newItem, category_id: newItem.category_id || categoryParam || null });
    refreshPhotos({ clearCache: true });
  };

  const handleVideoUpload = async (newItem) => {
    await api.post("/videos", { ...newItem, category_id: newItem.category_id || categoryParam || null });
    refreshVideos({ clearCache: true });
  };

  const handleTogglePhotoFavorite = useCallback((photoId, favorited, likes) => {
    setPhotos((prev) => (Array.isArray(prev) ? prev.map((photo) => (
      photo.id === photoId ? { ...photo, favorited, likes: likes ?? photo.likes } : photo
    )) : prev));
    setDisplayPhotos((prev) => (Array.isArray(prev) ? prev.map((photo) => (
      photo.id === photoId ? { ...photo, favorited, likes: likes ?? photo.likes } : photo
    )) : prev));
  }, [setPhotos]);

  const handleToggleVideoFavorite = useCallback((videoId, favorited, likes) => {
    setVideos((prev) => (Array.isArray(prev) ? prev.map((video) => (
      video.id === videoId ? { ...video, favorited, likes: likes ?? video.likes } : video
    )) : prev));
    setDisplayVideos((prev) => (Array.isArray(prev) ? prev.map((video) => (
      video.id === videoId ? { ...video, favorited, likes: likes ?? video.likes } : video
    )) : prev));
    setSelectedVideo((prev) => (
      prev?.id === videoId ? { ...prev, favorited, likes: likes ?? prev.likes } : prev
    ));
  }, [setVideos]);

  const handleNextPhoto = () => {
    if (!displayPhotos.length) return;
    setSelectedPhotoIndex((prev) => (prev + 1) % displayPhotos.length);
  };

  const handlePrevPhoto = () => {
    if (!displayPhotos.length) return;
    setSelectedPhotoIndex((prev) => (prev - 1 + displayPhotos.length) % displayPhotos.length);
  };

  const deepLinkedPhotoIndex = useMemo(() => {
    if (!photoDeepLinkId) return -1;
    return displayPhotos.findIndex((photo) => String(photo.id) === String(photoDeepLinkId));
  }, [displayPhotos, photoDeepLinkId]);

  useEffect(() => {
    if (!photoDeepLinkId) return undefined;
    if (deepLinkedPhotoIndex >= 0) {
      setExternalPhoto(null);
      setSelectedPhotoIndex(deepLinkedPhotoIndex);
      return undefined;
    }
    const abortController = new AbortController();
    api
      .get(`/photos/${photoDeepLinkId}`, { signal: abortController.signal })
      .then((res) => {
        if (abortController.signal.aborted || !res.data) return;
        setSelectedPhotoIndex(null);
        setExternalPhoto(res.data);
      })
      .catch((err) => {
        if (!abortController.signal.aborted && process.env.NODE_ENV === "development") {
          console.error("Failed to fetch deep linked media photo", err);
        }
      });
    return () => abortController.abort();
  }, [photoDeepLinkId, deepLinkedPhotoIndex]);

  useEffect(() => {
    if (!videoDeepLinkId) return undefined;
    const abortController = new AbortController();
    api
      .get(`/videos/${videoDeepLinkId}`, { signal: abortController.signal })
      .then((res) => {
        if (!abortController.signal.aborted && res.data) {
          setSelectedVideo(res.data);
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted && process.env.NODE_ENV === "development") {
          console.error("Failed to fetch deep linked media video", err);
        }
      });
    return () => abortController.abort();
  }, [videoDeepLinkId]);

  const selectedPhoto = selectedPhotoIndex !== null ? displayPhotos[selectedPhotoIndex] : externalPhoto;
  const error = photosError || videosError;
  const visiblePhotoCount = displayPhotos.length;
  const totalPhotoCount = Number(photoPagination?.total || visiblePhotoCount);
  const visibleVideoCount = displayVideos.length;
  const totalVideoCount = Number(videoPagination?.total || visibleVideoCount);

  return (
    <section className="day-page-theme day-page-theme-tech pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+96px)] md:py-16 px-4 md:px-6 relative overflow-hidden flex-grow">
      <SEO title={t("media_library.title", "影像库")} description={t("media_library.meta_desc", "按分类浏览现场照片与视频记录。")} />

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {!isDayMode && allowAmbientEffects ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[130px] bg-blue-500/10"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.12, 0.1] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] bg-cyan-500/10"
            />
          </>
        ) : !isDayMode ? (
          <>
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[90px] hidden md:block bg-blue-500/10" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[80px] hidden md:block bg-cyan-500/10" />
          </>
        ) : null}
      </div>

      <div className="max-w-[1180px] 2xl:max-w-[1440px] w-full mx-auto relative z-10">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 md:mb-9 text-center"
        >
          <div className="md:hidden text-left mb-4">
            <h1 className={`text-2xl font-bold tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}>
              {t("media_library.title", "影像库")}
            </h1>
            <p className={`text-sm mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
              {t("media_library.current_category_label", "当前分类：{{category}}", { category: activeCategoryName })}
            </p>
          </div>

          <motion.button
            whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            onClick={() => openUpload()}
            className={`hidden md:mx-auto md:mb-4 md:inline-flex xl:absolute xl:right-0 xl:top-1 xl:mb-0 p-2.5 rounded-lg border transition-all ${
              isDayMode
                ? "day-quiet-button text-slate-700 hover:text-emerald-700"
                : "bg-white/10 hover:bg-white/20 text-white border-white/10 hover:shadow-lg hover:shadow-indigo-500/20"
            }`}
            title={t("media_library.upload_media", "上传影像")}
          >
            <Upload size={18} className="md:w-5 md:h-5" />
          </motion.button>

          <motion.h2
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`hidden md:block text-3xl md:text-4xl font-semibold tracking-tight mb-3 ${
              isDayMode ? "text-slate-950" : "text-white"
            }`}
          >
            {t("media_library.title", "影像库")}
          </motion.h2>
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`hidden md:block max-w-xl mx-auto mb-5 md:mb-6 text-sm ${
              isDayMode ? "text-slate-500" : "text-gray-400"
            }`}
          >
            {t("media_library.description", "按分类归档现场照片与视频记录。当前分类：{{category}}。", { category: activeCategoryName })}
          </motion.p>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-stretch justify-center gap-3 md:flex-row md:items-center md:gap-4 relative z-50"
          >
            <MediaCategoryRail
              categories={categories}
              activeCategoryId={categoryId}
              onChange={setCategoryId}
              isDayMode={isDayMode}
              allLabel={t("common.all", "全部")}
            />
            <button
              type="button"
              onClick={() => openUpload()}
              className={`rect-button-secondary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-sm font-semibold md:hidden ${
                isDayMode ? "text-slate-700" : "text-white"
              }`}
            >
              <Upload size={17} />
              {t("media_library.upload_media", "上传影像")}
            </button>
          </motion.div>

          {categoriesError ? (
            <div
              className={`mx-auto mt-3 flex max-w-[760px] items-center justify-between gap-3 border px-3 py-2 text-left text-xs ${
                isDayMode
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-red-400/25 bg-red-500/10 text-red-200"
              }`}
            >
              <span>{t("media_library.category_error", "影像分类加载失败，当前仅展示全部内容。")}</span>
              <button
                type="button"
                onClick={() => refreshCategories({ clearCache: true })}
                className={`shrink-0 font-bold ${isDayMode ? "text-red-700 hover:text-red-900" : "text-red-100 hover:text-white"}`}
              >
                {t("common.retry", "重试")}
              </button>
            </div>
          ) : categoriesLoading ? (
            <p className={`mt-3 text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
              {t("media_library.category_loading", "正在加载影像分类...")}
            </p>
          ) : categories.length === 0 ? (
            <p className={`mt-3 text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
              {t("media_library.no_categories", "暂无影像分类，内容会显示在全部与未分类中。")}
            </p>
          ) : null}
        </motion.div>

        {error ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
            className="mb-8 flex flex-col items-center justify-center py-12 text-center"
          >
            <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
            <p className={`mb-6 ${isDayMode ? "text-slate-600" : "text-gray-300"}`}>{t("media_library.content_error", "影像内容加载失败，请稍后重试。")}</p>
            <button
              type="button"
              onClick={() => {
                refreshPhotos({ clearCache: true });
                refreshVideos({ clearCache: true });
              }}
              className={`px-6 py-2 rounded-full transition-all border ${
                isDayMode
                  ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80"
                  : "bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/30"
              }`}
            >
              {t("common.retry", "重试")}
            </button>
          </motion.div>
        ) : null}

        <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)] 2xl:items-start">
          <aside className="order-1 min-w-0 2xl:order-2">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className={`text-xl md:text-2xl font-semibold tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}>
                  {t("media_library.videos_title", "视频记录")}
                </h2>
                <p className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  {t("media_library.videos_count", "{{visible}} / {{total}} 条视频", { visible: visibleVideoCount, total: totalVideoCount })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openUpload("video")}
                className={`rect-icon-button hidden p-2.5 transition-all md:inline-flex ${
                  isDayMode ? "text-slate-700 hover:text-emerald-700" : "text-white"
                }`}
                title={t("media_library.upload_videos", "上传视频")}
              >
                <Upload size={18} />
              </button>
            </div>

            {videosLoading && displayVideos.length === 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-5 2xl:grid-cols-1">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className={`rect-media-card aspect-video animate-pulse relative overflow-hidden ${
                      isDayMode ? "bg-white/84 border-slate-200/80" : "bg-[#1a1a1a]/40 border-white/5"
                    }`}
                  />
                ))}
              </div>
            ) : displayVideos.length === 0 ? (
              <EmptyState
                icon={Film}
                title={t("media_library.empty_videos_title", "暂无视频记录")}
                description={t("media_library.empty_videos_desc", "这个分类下还没有视频，上传时选择该分类即可出现在这里。")}
                accent="pink"
                isDayMode={isDayMode}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-5 2xl:grid-cols-1">
                {displayVideos.map((video, index) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    index={index}
                    onClick={setSelectedVideo}
                    onToggleFavorite={handleToggleVideoFavorite}
                    canAnimate={!prefersReducedMotion && index < 8}
                    isDayMode={isDayMode}
                    untitledLabel={t("media_library.untitled_video", "未命名视频")}
                    uncategorizedLabel={t("media_library.uncategorized", "未分类")}
                  />
                ))}
              </div>
            )}
            {!error && displayVideos.length > 0 && canLoadMoreVideos ? (
              <LoadMoreButton
                onClick={() => setVideoPage((prev) => Math.min(prev + 1, videoTotalPages))}
                loading={videosLoading}
                disabled={videosLoading}
                tone="pink"
                isDayMode={isDayMode}
                loadingLabel={t("common.loading", "正在加载...")}
              >
                {t("media_library.load_more_videos", "加载更多视频")}
              </LoadMoreButton>
            ) : null}
          </aside>

          <section className="order-2 min-w-0 2xl:order-1">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className={`text-xl md:text-2xl font-semibold tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}>
                  {t("media_library.photos_title", "现场照片")}
                </h2>
                <p className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  {t("media_library.photos_count", "{{visible}} / {{total}} 张照片", { visible: visiblePhotoCount, total: totalPhotoCount })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openUpload("image")}
                className={`rect-icon-button hidden p-2.5 transition-all md:inline-flex ${
                  isDayMode ? "text-slate-700 hover:text-emerald-700" : "text-white"
                }`}
                title={t("media_library.upload_photos", "上传照片")}
              >
                <Upload size={18} />
              </button>
            </div>

            {photosLoading && displayPhotos.length === 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:columns-2 sm:block sm:gap-4 md:gap-6">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className={`aspect-[4/5] rounded-2xl animate-pulse sm:mb-4 sm:break-inside-avoid sm:aspect-auto ${
                      index % 3 === 0 ? "sm:h-72" : "sm:h-52"
                    } ${isDayMode ? "bg-slate-100 border border-slate-200/80" : "bg-white/5 border border-white/10"}`}
                  />
                ))}
              </div>
            ) : displayPhotos.length === 0 ? (
              <EmptyState
                icon={Box}
                title={t("media_library.empty_photos_title", "暂无现场照片")}
                description={t("media_library.empty_photos_desc", "这个分类下还没有图片，上传时选择该分类即可出现在这里。")}
                isDayMode={isDayMode}
              />
            ) : (
              <motion.div
                layout={!prefersReducedMotion && typeof window !== "undefined" && window.innerWidth >= 768}
                className="grid grid-cols-2 gap-3 pb-4 sm:block sm:columns-2 sm:gap-4 md:gap-6 md:pb-0"
              >
                <AnimatePresence mode="popLayout">
                  {displayPhotos.map((photo, index) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      index={index}
                      onClick={setSelectedPhotoIndex}
                      onToggleFavorite={handleTogglePhotoFavorite}
                      canAnimate={!prefersReducedMotion && index < 8}
                      isDayMode={isDayMode}
                      untitledLabel={t("media_library.untitled_photo", "未命名照片")}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
            {!error && displayPhotos.length > 0 && canLoadMorePhotos ? (
              <LoadMoreButton
                onClick={() => setPhotoPage((prev) => Math.min(prev + 1, photoTotalPages))}
                loading={photosLoading}
                disabled={photosLoading}
                isDayMode={isDayMode}
                loadingLabel={t("common.loading", "正在加载...")}
              >
                {t("media_library.load_more_photos", "加载更多照片")}
              </LoadMoreButton>
            ) : null}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {selectedPhoto ? (
          <Lightbox
            photo={selectedPhoto}
            onClose={() => {
              setSelectedPhotoIndex(null);
              setExternalPhoto(null);
            }}
            onNext={selectedPhotoIndex !== null ? handleNextPhoto : undefined}
            onPrev={selectedPhotoIndex !== null ? handlePrevPhoto : undefined}
            onLikeToggle={(favorited, likes) => handleTogglePhotoFavorite(selectedPhoto.id, favorited, likes)}
            onSelect={(photo) => {
              const nextIndex = displayPhotos.findIndex((item) => item.id === photo.id);
              if (nextIndex >= 0) {
                setExternalPhoto(null);
                setSelectedPhotoIndex(nextIndex);
              } else {
                setSelectedPhotoIndex(null);
                setExternalPhoto(photo);
              }
            }}
          />
        ) : null}
      </AnimatePresence>

      {createPortal(
        <AnimatePresence>
          {selectedVideo && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className={`fixed inset-0 z-[100] backdrop-blur-md overflow-y-auto ${isDayMode ? "bg-white/72" : "bg-black/90"}`}
              onClick={closeSelectedVideo}
            >
              <div className="flex min-h-full items-center justify-center p-4 md:p-8">
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
                  transition={prefersReducedMotion ? undefined : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className={`relative w-full max-w-5xl border shadow-2xl overflow-hidden flex flex-col ${
                    isDayMode ? "day-fine-surface" : "bg-[#0a0a0a] border-white/10"
                  }`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className={`relative aspect-video ${isDayMode ? "bg-slate-100" : "bg-black"}`}>
                    <button
                      type="button"
                      onClick={closeSelectedVideo}
                      className={`rect-icon-button absolute top-6 right-6 p-2 transition-all z-20 group ${
                        isDayMode
                          ? "bg-white/90 hover:bg-white text-slate-700 border-slate-200/80"
                          : "bg-black/40 hover:bg-black/60 text-white border-white/10"
                      }`}
                      title={t("media_library.close_video", "关闭视频")}
                    >
                      <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                    <video src={selectedVideo.video} controls autoPlay className="w-full h-full" />
                  </div>

                  <div
                    className={`p-8 md:p-10 pt-6 border-t flex justify-between items-start gap-6 ${
                      isDayMode ? "border-slate-200/80 bg-white/94" : "border-white/5 bg-[#0a0a0a]"
                    }`}
                  >
                    <div className="flex-1">
                      <h3 className={`text-2xl md:text-3xl font-bold mb-2 font-serif ${isDayMode ? "text-slate-900" : "text-white"}`}>
                        {selectedVideo.title}
                      </h3>
                      <div className={`flex flex-wrap items-center gap-3 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                        <p className={`rect-chip px-3 py-1 ${isDayMode ? "bg-slate-100 border-slate-200/80 text-slate-600" : "bg-white/5 border-white/5"}`}>
                          {selectedVideo.category_name || t("media_library.uncategorized", "未分类")}
                        </p>
                        {selectedVideo.created_at ? (
                          <p className={`rect-chip px-3 py-1 ${isDayMode ? "bg-slate-100 border-slate-200/80 text-slate-600" : "bg-white/5 border-white/5"}`}>
                            {new Date(selectedVideo.created_at).toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <FavoriteButton
                      itemId={selectedVideo.id}
                      itemType="video"
                      size={24}
                      showCount
                      count={selectedVideo.likes || 0}
                      favorited={selectedVideo.favorited}
                      initialFavorited={selectedVideo.favorited}
                      className={`rect-icon-button p-3 transition-colors shrink-0 ${
                        isDayMode ? "bg-white/90 hover:bg-slate-50 text-slate-700 border-slate-200/80" : "bg-white/5 hover:bg-pink-500/20 border-white/10"
                      }`}
                      onToggle={(favorited, likes) => handleToggleVideoFavorite(selectedVideo.id, favorited, likes)}
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {isMobileUploadOpen ? createPortal(
        <div
          className={`fixed inset-0 z-[110] flex items-end justify-center p-4 md:items-center ${isDayMode ? "bg-white/70" : "bg-black/70"}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-upload-picker-title"
          onClick={closeUploadPicker}
        >
          <div
            className={`w-full max-w-sm border p-4 shadow-2xl ${isDayMode ? "bg-white border-slate-200" : "bg-[#111] border-white/10"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className={`text-lg font-bold ${isDayMode ? "text-slate-950" : "text-white"}`}>{t("media_library.upload_media", "上传影像")}</h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setIsMobileUploadOpen(false); setUploadType("image"); }} className="rect-button-secondary min-h-[48px]">
                {t("media_library.upload_photos", "上传照片")}
              </button>
              <button type="button" onClick={() => { setIsMobileUploadOpen(false); setUploadType("video"); }} className="rect-button-primary min-h-[48px] text-white">
                {t("media_library.upload_videos", "上传视频")}
              </button>
            </div>
            <button type="button" onClick={() => setIsMobileUploadOpen(false)} className={`mt-3 w-full py-2 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
              {t("common.cancel", "取消")}
            </button>
          </div>
        </div>,
        document.body,
      ) : null}

      <UploadModal
        isOpen={uploadType === "image"}
        onClose={closeUpload}
        onUpload={handlePhotoUpload}
        type="image"
        allowBatch
      />
      <UploadModal
        isOpen={uploadType === "video"}
        onClose={closeUpload}
        onUpload={handleVideoUpload}
        type="video"
      />
    </section>
  );
};

export default MediaLibrary;
