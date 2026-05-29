import React, { forwardRef, memo, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
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

const PhotoCard = memo(forwardRef(({ photo, index, onClick, onToggleFavorite, canAnimate, isDayMode }, ref) => (
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
    className={`break-inside-avoid relative group overflow-hidden rounded-2xl cursor-pointer backdrop-blur-sm border transition-all duration-300 w-full inline-block touch-manipulation mb-4 md:mb-6 ${
      isDayMode
        ? "day-card-lift"
        : "bg-white/5 border-white/10 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-white/20"
    }`}
    onClick={() => onClick(index)}
  >
    <SmartImage
      src={getThumbnailUrl(photo.url)}
      alt={photo.title}
      type="image"
      className="w-full h-auto"
      imageClassName="h-auto object-cover transform transition-transform duration-700 ease-out group-hover:scale-105"
      blurPlaceholder={photo.blurPlaceholder}
    />

    <div
      className={`absolute inset-0 ${
        isDayMode
          ? "bg-gradient-to-t from-slate-950/76 via-slate-900/18 to-transparent"
          : "bg-gradient-to-t from-black/90 via-black/40 to-transparent"
      } opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4`}
    >
      <div className="flex flex-col gap-2 md:translate-y-3 md:group-hover:translate-y-0 transition-transform duration-300">
        <div className="flex justify-between items-end gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-[rgba(255,255,255,0.96)] drop-shadow-[0_2px_10px_rgba(15,23,42,0.45)] line-clamp-2">
              {photo.title || "未命名照片"}
            </h3>
            {photo.category_name ? (
              <p className="mt-1 text-xs font-medium text-white/72 line-clamp-1">
                {photo.category_name}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div onClick={(event) => event.stopPropagation()}>
              <FavoriteButton
                itemId={photo.id}
                itemType="photo"
                size={18}
                showCount
                count={photo.likes || 0}
                favorited={photo.favorited}
                initialFavorited={photo.favorited}
                className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 text-white border ${
                  isDayMode
                    ? "bg-white/70 hover:bg-pink-500/30 border-white/40 shadow-[0_12px_24px_rgba(15,23,42,0.18)]"
                    : "bg-white/10 border-white/10"
                } hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/20`}
                onToggle={(favorited, likes) => onToggleFavorite(photo.id, favorited, likes)}
              />
            </div>
            <div
              className={`p-2 rounded-full backdrop-blur-md border ${
                isDayMode ? "bg-white/72 border-white/40 shadow-[0_12px_24px_rgba(15,23,42,0.18)]" : "bg-white/20 border-white/10"
              } group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300`}
            >
              <Maximize2 size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>

    {typeof photo.likes === "number" && (
      <div
        className="absolute top-3 right-3 flex items-center gap-1 backdrop-blur-md rounded-full px-2 py-1 border border-white/10"
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

const VideoCard = memo(({ video, index, onClick, onToggleFavorite, canAnimate, isDayMode }) => (
  <motion.div
    initial={canAnimate ? { opacity: 0, y: 14 } : false}
    animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
    transition={canAnimate ? { duration: 0.24, delay: Math.min(index, 5) * 0.03 } : undefined}
    onClick={() => onClick(video)}
    className={`group rect-media-card relative aspect-video overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
      isDayMode
        ? "bg-white/88 border-slate-200/80 hover:border-pink-300/50"
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

    {video.date && new Date() - new Date(video.date) < 7 * 24 * 60 * 60 * 1000 && (
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

    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div
        className={`rect-icon-button flex h-14 w-14 items-center justify-center border group-hover:scale-105 transition-transform duration-300 relative ${
          isDayMode ? "bg-white/84 text-slate-950 border-white/70" : "bg-black/45 text-white border-white/20"
        }`}
      >
        <Play size={30} fill={isDayMode ? "#0f172a" : "white"} className={`${isDayMode ? "text-slate-950" : "text-white"} ml-1 relative z-10`} />
      </div>
    </div>

    <div className="absolute bottom-0 left-0 w-full p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
      <div className="flex justify-between items-end gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base md:text-lg font-bold text-[rgba(255,255,255,0.96)] drop-shadow-[0_2px_10px_rgba(15,23,42,0.5)] line-clamp-1">
            {video.title || "未命名视频"}
          </h3>
          <p className="mt-1 text-xs font-medium text-white/68 line-clamp-1">
            {video.category_name || "未分类"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div onClick={(event) => event.stopPropagation()}>
            <FavoriteButton
              itemId={video.id}
              itemType="video"
              size={18}
              showCount
              count={video.likes || 0}
              favorited={video.favorited}
              initialFavorited={video.favorited}
              className={`rect-icon-button p-2 transition-colors group/btn text-white ${
                isDayMode ? "bg-white/76 border-white/50" : "bg-black/50 border-white/10"
              }`}
              onToggle={(favorited, likes) => onToggleFavorite(video.id, favorited, likes)}
            />
          </div>
          <div
            className={`rect-icon-button p-2 border group-hover:bg-pink-500 group-hover:text-white transition-all duration-300 ${
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
      className={`rounded-3xl p-8 mb-6 border backdrop-blur-xl ${
        isDayMode ? "bg-white/88 border-slate-200/80" : "bg-white/5 border-white/10"
      }`}
    >
      <Icon size={56} className={accent === "pink" ? "text-pink-400 opacity-80" : isDayMode ? "text-slate-400" : "text-gray-500"} />
    </div>
    <h3 className={`text-2xl font-bold mb-2 ${isDayMode ? "text-slate-900" : "text-white"}`}>{title}</h3>
    <p className={`max-w-md ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>{description}</p>
  </div>
);

const MediaLibrary = () => {
  const { user } = useAuth();
  const { settings, uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const prefersReducedMotion = useReducedMotion();
  const [categoryId, setCategoryId] = useState("");
  const [uploadType, setUploadType] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isMobileUploadOpen, setIsMobileUploadOpen] = useState(false);
  const { categories } = useMediaCategories();
  const photoLimit = settings.pagination_enabled === "true" ? 18 : 48;
  const videoLimit = settings.pagination_enabled === "true" ? 12 : 24;
  const categoryParam = categoryId ? Number(categoryId) : undefined;
  const allowAmbientEffects =
    !prefersReducedMotion &&
    (typeof window === "undefined" || window.innerWidth >= 768);

  const {
    data: photos,
    loading: photosLoading,
    error: photosError,
    setData: setPhotos,
    refresh: refreshPhotos,
  } = useCachedResource(
    "/photos",
    { limit: photoLimit, sort: "newest", category_id: categoryParam },
    { dependencies: [categoryParam, settings.pagination_enabled] },
  );

  const {
    data: videos,
    loading: videosLoading,
    error: videosError,
    setData: setVideos,
    refresh: refreshVideos,
  } = useCachedResource(
    "/videos",
    { limit: videoLimit, sort: "newest", category_id: categoryParam },
    { dependencies: [categoryParam, settings.pagination_enabled] },
  );

  const activeCategoryName = useMemo(() => {
    if (!categoryId) return "全部";
    return categories.find((category) => String(category.id) === String(categoryId))?.name || "当前分类";
  }, [categories, categoryId]);

  const openUpload = useCallback((type = null) => {
    if (!user) {
      toast.error("请先登录后再上传");
      window.dispatchEvent(new Event("open-auth-modal"));
      return;
    }
    if (type) {
      setUploadType(type);
      return;
    }
    setIsMobileUploadOpen(true);
  }, [user]);

  const ignoreMobileFilter = useCallback(() => {}, []);
  const ignoreMobileSort = useCallback(() => {}, []);
  useContentPageEvents("media", () => openUpload(), ignoreMobileFilter, ignoreMobileSort);

  useBackClose(Boolean(uploadType), () => setUploadType(null));
  useBackClose(isMobileUploadOpen, () => setIsMobileUploadOpen(false));
  useBackClose(selectedVideo !== null, () => setSelectedVideo(null));

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
    setPhotos((prev) => prev.map((photo) => (
      photo.id === photoId ? { ...photo, favorited, likes: likes ?? photo.likes } : photo
    )));
  }, [setPhotos]);

  const handleToggleVideoFavorite = useCallback((videoId, favorited, likes) => {
    setVideos((prev) => prev.map((video) => (
      video.id === videoId ? { ...video, favorited, likes: likes ?? video.likes } : video
    )));
    setSelectedVideo((prev) => (
      prev?.id === videoId ? { ...prev, favorited, likes: likes ?? prev.likes } : prev
    ));
  }, [setVideos]);

  const handleNextPhoto = () => {
    if (!photos.length) return;
    setSelectedPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevPhoto = () => {
    if (!photos.length) return;
    setSelectedPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const selectedPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;
  const loading = photosLoading || videosLoading;
  const error = photosError || videosError;

  return (
    <section className="pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+96px)] md:py-20 px-4 md:px-8 relative overflow-hidden flex-grow">
      <SEO title="影像库" description="按分类浏览现场照片与视频记录。" />

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {allowAmbientEffects ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[130px]"
            />
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.12, 0.1] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px]"
            />
          </>
        ) : (
          <>
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[90px] hidden md:block" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[80px] hidden md:block" />
          </>
        )}
      </div>

      <div className="max-w-7xl w-full mx-auto relative z-10">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 md:mb-12 text-center"
        >
          <div className="md:hidden text-left mb-4">
            <h1 className={`text-2xl font-bold tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}>
              影像库
            </h1>
            <p className={`text-sm mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
              当前分类：{activeCategoryName}
            </p>
          </div>

          <motion.button
            whileHover={prefersReducedMotion ? undefined : { scale: 1.05, rotate: 90 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            onClick={() => openUpload()}
            className={`hidden md:block absolute right-0 top-0 md:top-2 p-2 md:p-3 rounded-full backdrop-blur-md border transition-all ${
              isDayMode
                ? "day-quiet-button text-slate-700 hover:text-indigo-600"
                : "bg-white/10 hover:bg-white/20 text-white border-white/10 hover:shadow-lg hover:shadow-indigo-500/20"
            }`}
            title="上传影像"
          >
            <Upload size={18} className="md:w-5 md:h-5" />
          </motion.button>

          <motion.h2
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="hidden md:block text-4xl md:text-5xl font-bold font-serif mb-4 md:mb-6"
          >
            影像库
          </motion.h2>
          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden md:block text-gray-400 max-w-xl mx-auto mb-6 md:mb-8 text-sm md:text-base"
          >
            按分类归档现场照片与视频记录。当前分类：{activeCategoryName}。
          </motion.p>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-stretch justify-center gap-3 md:flex-row md:items-center md:gap-4 relative z-50"
          >
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={`rect-field min-h-[44px] w-full px-3 py-2 text-sm md:w-[240px] ${
                isDayMode ? "bg-white/92 text-slate-900 border-slate-200/80" : "bg-black/32 text-white border-white/10"
              }`}
              aria-label="影像分类筛选"
            >
              <option value="">全部分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => openUpload()}
              className={`rect-button-secondary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-sm font-semibold md:hidden ${
                isDayMode ? "text-slate-700" : "text-white"
              }`}
            >
              <Upload size={17} />
              上传影像
            </button>
          </motion.div>
        </motion.div>

        {error ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
            className="mb-8 flex flex-col items-center justify-center py-12 text-center"
          >
            <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
            <p className="text-gray-300 mb-6">影像内容加载失败，请稍后重试。</p>
            <button
              type="button"
              onClick={() => {
                refreshPhotos({ clearCache: true });
                refreshVideos({ clearCache: true });
              }}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10 hover:border-white/30"
            >
              重试
            </button>
          </motion.div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:items-start">
          <section className="order-1 min-w-0">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className={`text-2xl font-bold font-serif ${isDayMode ? "text-slate-900" : "text-white"}`}>
                  现场照片
                </h2>
                <p className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  {photos.length} 张照片
                </p>
              </div>
              <button
                type="button"
                onClick={() => openUpload("image")}
                className={`rect-icon-button hidden p-2.5 transition-all md:inline-flex ${
                  isDayMode ? "text-slate-700 hover:text-indigo-600" : "text-white"
                }`}
                title="上传照片"
              >
                <Upload size={18} />
              </button>
            </div>

            {photosLoading && photos.length === 0 ? (
              <div className="columns-1 sm:columns-2 gap-4 md:gap-6">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className={`mb-4 break-inside-avoid rounded-2xl animate-pulse ${
                      index % 3 === 0 ? "h-72" : "h-52"
                    } ${isDayMode ? "bg-slate-100 border border-slate-200/80" : "bg-white/5 border border-white/10"}`}
                  />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <EmptyState
                icon={Box}
                title="暂无现场照片"
                description="这个分类下还没有图片，上传时选择该分类即可出现在这里。"
                isDayMode={isDayMode}
              />
            ) : (
              <motion.div
                layout={!prefersReducedMotion && typeof window !== "undefined" && window.innerWidth >= 768}
                className="columns-1 sm:columns-2 gap-4 md:gap-6 pb-4 md:pb-0"
              >
                <AnimatePresence mode="popLayout">
                  {photos.map((photo, index) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      index={index}
                      onClick={setSelectedPhotoIndex}
                      onToggleFavorite={handleTogglePhotoFavorite}
                      canAnimate={!prefersReducedMotion && index < 8}
                      isDayMode={isDayMode}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </section>

          <aside className="order-2 min-w-0">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className={`text-2xl font-bold font-serif ${isDayMode ? "text-slate-900" : "text-white"}`}>
                  视频记录
                </h2>
                <p className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  {videos.length} 条视频
                </p>
              </div>
              <button
                type="button"
                onClick={() => openUpload("video")}
                className={`rect-icon-button hidden p-2.5 transition-all md:inline-flex ${
                  isDayMode ? "text-slate-700 hover:text-pink-600" : "text-white"
                }`}
                title="上传视频"
              >
                <Upload size={18} />
              </button>
            </div>

            {videosLoading && videos.length === 0 ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className={`rect-media-card aspect-video animate-pulse relative overflow-hidden ${
                      isDayMode ? "bg-white/84 border-slate-200/80" : "bg-[#1a1a1a]/40 border-white/5"
                    }`}
                  />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <EmptyState
                icon={Film}
                title="暂无视频记录"
                description="这个分类下还没有视频，上传时选择该分类即可出现在这里。"
                accent="pink"
                isDayMode={isDayMode}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:gap-5">
                {videos.map((video, index) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    index={index}
                    onClick={setSelectedVideo}
                    onToggleFavorite={handleToggleVideoFavorite}
                    canAnimate={!prefersReducedMotion && index < 8}
                    isDayMode={isDayMode}
                  />
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {selectedPhoto ? (
          <Lightbox
            photo={selectedPhoto}
            onClose={() => setSelectedPhotoIndex(null)}
            onNext={handleNextPhoto}
            onPrev={handlePrevPhoto}
            onLikeToggle={(favorited, likes) => handleTogglePhotoFavorite(selectedPhoto.id, favorited, likes)}
            onSelect={(photo) => {
              const nextIndex = photos.findIndex((item) => item.id === photo.id);
              if (nextIndex >= 0) setSelectedPhotoIndex(nextIndex);
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
              onClick={() => setSelectedVideo(null)}
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
                      onClick={() => setSelectedVideo(null)}
                      className={`rect-icon-button absolute top-6 right-6 p-2 transition-all z-20 group ${
                        isDayMode
                          ? "bg-white/90 hover:bg-white text-slate-700 border-slate-200/80"
                          : "bg-black/40 hover:bg-black/60 text-white border-white/10"
                      }`}
                      title="关闭视频"
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
                          {selectedVideo.category_name || "未分类"}
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
                        isDayMode ? "bg-white/90 hover:bg-pink-50 text-slate-700 border-slate-200/80" : "bg-white/5 hover:bg-pink-500/20 border-white/10"
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

      {isMobileUploadOpen ? (
        <div className={`fixed inset-0 z-[110] flex items-end justify-center p-4 md:items-center ${isDayMode ? "bg-white/70" : "bg-black/70"}`}>
          <div className={`w-full max-w-sm border p-4 shadow-2xl ${isDayMode ? "bg-white border-slate-200" : "bg-[#111] border-white/10"}`}>
            <h3 className={`text-lg font-bold ${isDayMode ? "text-slate-950" : "text-white"}`}>上传影像</h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setIsMobileUploadOpen(false); setUploadType("image"); }} className="rect-button-secondary min-h-[48px]">
                上传照片
              </button>
              <button type="button" onClick={() => { setIsMobileUploadOpen(false); setUploadType("video"); }} className="rect-button-primary min-h-[48px] text-white">
                上传视频
              </button>
            </div>
            <button type="button" onClick={() => setIsMobileUploadOpen(false)} className={`mt-3 w-full py-2 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
              取消
            </button>
          </div>
        </div>
      ) : null}

      <UploadModal
        isOpen={uploadType === "image"}
        onClose={() => setUploadType(null)}
        onUpload={handlePhotoUpload}
        type="image"
        allowBatch
      />
      <UploadModal
        isOpen={uploadType === "video"}
        onClose={() => setUploadType(null)}
        onUpload={handleVideoUpload}
        type="video"
      />
    </section>
  );
};

export default MediaLibrary;
