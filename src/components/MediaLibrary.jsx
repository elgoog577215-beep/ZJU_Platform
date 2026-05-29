import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Film,
  Image as ImageIcon,
  Play,
  Upload,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
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

const PhotoTile = memo(({ photo, index, onClick, onToggleFavorite, isDayMode }) => (
  <motion.article
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.24, delay: Math.min(index, 8) * 0.025 }}
    className={`group relative aspect-[4/3] overflow-hidden border ${isDayMode ? "border-slate-200/80 bg-white" : "border-white/10 bg-white/[0.04]"}`}
  >
    <button type="button" onClick={() => onClick(index)} className="block h-full w-full text-left">
      <SmartImage
        src={getThumbnailUrl(photo.url)}
        alt={photo.title}
        type="image"
        className="h-full w-full"
        imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/76 via-black/20 to-transparent p-3">
        <h3 className="line-clamp-1 text-sm font-bold text-white">{photo.title || "未命名照片"}</h3>
        {photo.category_name ? (
          <p className="mt-1 text-xs text-white/70">{photo.category_name}</p>
        ) : null}
      </div>
    </button>
    <div className="absolute right-2 top-2" onClick={(event) => event.stopPropagation()}>
      <FavoriteButton
        itemId={photo.id}
        itemType="photo"
        size={16}
        showCount
        count={photo.likes || 0}
        favorited={photo.favorited}
        initialFavorited={photo.favorited}
        className="rect-icon-button bg-black/38 p-2 text-white"
        onToggle={(favorited, likes) => onToggleFavorite(photo.id, favorited, likes)}
      />
    </div>
  </motion.article>
));

PhotoTile.displayName = "PhotoTile";

const VideoListItem = memo(({ video, index, onClick, onToggleFavorite, isDayMode }) => (
  <motion.article
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.22, delay: Math.min(index, 8) * 0.025 }}
    className={`group overflow-hidden border ${isDayMode ? "border-slate-200/80 bg-white" : "border-white/10 bg-white/[0.04]"}`}
  >
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(video)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick(video);
        }
      }}
      className="block w-full cursor-pointer text-left"
    >
      <div className="relative aspect-video overflow-hidden">
        <SmartImage
          src={getThumbnailUrl(video.thumbnail)}
          alt={video.title}
          type="video"
          className="h-full w-full"
          imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          iconSize={34}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/18 opacity-90 transition-opacity group-hover:opacity-100">
          <span className="rect-icon-button flex h-12 w-12 items-center justify-center bg-black/48 text-white">
            <Play size={24} fill="white" className="ml-1" />
          </span>
        </div>
      </div>
      <div className="p-3">
        <h3 className={`line-clamp-2 text-sm font-bold ${isDayMode ? "text-slate-950" : "text-white"}`}>
          {video.title || "未命名视频"}
        </h3>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={`truncate text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
            {video.category_name || "未分类"}
          </span>
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <FavoriteButton
              itemId={video.id}
              itemType="video"
              size={15}
              showCount
              count={video.likes || 0}
              favorited={video.favorited}
              initialFavorited={video.favorited}
              className={`rect-icon-button p-1.5 ${isDayMode ? "bg-slate-50 text-slate-700" : "bg-white/5 text-white"}`}
              onToggle={(favorited, likes) => onToggleFavorite(video.id, favorited, likes)}
            />
          </div>
        </div>
      </div>
    </div>
  </motion.article>
));

VideoListItem.displayName = "VideoListItem";

const MediaEmptyState = ({ icon: Icon, title, description, isDayMode }) => (
  <div
    className={`flex min-h-[220px] flex-col items-center justify-center border border-dashed p-8 text-center ${isDayMode ? "border-slate-200 bg-white/70" : "border-white/10 bg-white/[0.03]"}`}
  >
    <Icon size={36} className={isDayMode ? "text-slate-400" : "text-gray-500"} />
    <h3 className={`mt-4 text-base font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}>{title}</h3>
    <p className={`mt-2 max-w-xs text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>{description}</p>
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
  const pageSize = settings.pagination_enabled === "true" ? 24 : 100;
  const categoryParam = categoryId ? Number(categoryId) : undefined;

  const {
    data: photos,
    loading: photosLoading,
    error: photosError,
    setData: setPhotos,
    refresh: refreshPhotos,
  } = useCachedResource(
    "/photos",
    { limit: pageSize, sort: "newest", category_id: categoryParam },
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
    { limit: pageSize, sort: "newest", category_id: categoryParam },
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

  const handlePhotoUpload = async (newItem) => {
    if (Array.isArray(newItem)) {
      for (const item of newItem) {
        const payload = { ...item, category_id: item.category_id || categoryParam || null };
        await api.post("/photos", payload);
      }
      refreshPhotos({ clearCache: true });
      return;
    }
    const payload = { ...newItem, category_id: newItem.category_id || categoryParam || null };
    await api.post("/photos", payload);
    refreshPhotos({ clearCache: true });
  };

  const handleVideoUpload = async (newItem) => {
    const payload = { ...newItem, category_id: newItem.category_id || categoryParam || null };
    await api.post("/videos", payload);
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
    <section className="relative z-10 min-h-screen overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-[calc(env(safe-area-inset-top)+76px)] md:px-8 md:py-24">
      <SEO title="影像库" description="按分类浏览现场照片与视频记录。" />

      <div className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden md:block">
        <div className={`absolute inset-x-0 top-24 h-px ${isDayMode ? "bg-slate-200/80" : "bg-white/10"}`} />
        <div className={`absolute inset-x-0 top-52 h-px ${isDayMode ? "bg-slate-200/50" : "bg-white/10"}`} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="mb-5 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.28em] ${isDayMode ? "text-indigo-600" : "text-indigo-300"}`}>
              Media Library
            </p>
            <h1 className={`mt-2 text-3xl font-black tracking-tight md:text-5xl ${isDayMode ? "text-slate-950" : "text-white"}`}>
              影像库
            </h1>
            <p className={`mt-3 max-w-2xl text-sm leading-6 md:text-base ${isDayMode ? "text-slate-600" : "text-gray-400"}`}>
              按分类归档现场照片与视频记录。当前分类：{activeCategoryName}。
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={`rect-field min-h-[44px] min-w-[220px] px-3 py-2 text-sm ${isDayMode ? "bg-white text-slate-900" : "bg-black/40 text-white"}`}
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
              className="rect-button-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white"
            >
              <Upload size={17} />
              上传影像
            </button>
          </div>
        </div>

        {error ? (
          <div className="rect-panel flex items-center gap-3 border-red-500/25 bg-red-500/10 p-4 text-red-300">
            <AlertCircle size={20} />
            影像内容加载失败，请稍后重试。
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:items-start">
          <section className="order-1">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-black ${isDayMode ? "text-slate-950" : "text-white"}`}>现场照片</h2>
                <p className={`mt-1 text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  {photos.length} 张照片
                </p>
              </div>
              <button
                type="button"
                onClick={() => openUpload("image")}
                className={`rect-button-secondary hidden items-center gap-2 px-3 py-2 text-sm font-semibold md:inline-flex ${isDayMode ? "text-slate-700" : "text-white"}`}
              >
                <ImageIcon size={16} />
                上传照片
              </button>
            </div>

            {loading && photos.length === 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[...Array(9)].map((_, index) => (
                  <div key={index} className={`aspect-[4/3] animate-pulse border ${isDayMode ? "border-slate-200 bg-slate-100" : "border-white/10 bg-white/5"}`} />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <MediaEmptyState
                icon={ImageIcon}
                title="暂无现场照片"
                description="这个分类下还没有图片，上传时选择该分类即可出现在这里。"
                isDayMode={isDayMode}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {photos.map((photo, index) => (
                  <PhotoTile
                    key={photo.id}
                    photo={photo}
                    index={prefersReducedMotion ? 0 : index}
                    onClick={setSelectedPhotoIndex}
                    onToggleFavorite={handleTogglePhotoFavorite}
                    isDayMode={isDayMode}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="order-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-black ${isDayMode ? "text-slate-950" : "text-white"}`}>视频记录</h2>
                <p className={`mt-1 text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  {videos.length} 条视频
                </p>
              </div>
              <button
                type="button"
                onClick={() => openUpload("video")}
                className={`rect-button-secondary hidden items-center gap-2 px-3 py-2 text-sm font-semibold md:inline-flex ${isDayMode ? "text-slate-700" : "text-white"}`}
              >
                <Film size={16} />
                上传视频
              </button>
            </div>

            {loading && videos.length === 0 ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className={`aspect-video animate-pulse border ${isDayMode ? "border-slate-200 bg-slate-100" : "border-white/10 bg-white/5"}`} />
                ))}
              </div>
            ) : videos.length === 0 ? (
              <MediaEmptyState
                icon={Film}
                title="暂无视频记录"
                description="这个分类下还没有视频，上传时选择该分类即可出现在这里。"
                isDayMode={isDayMode}
              />
            ) : (
              <div className="space-y-3">
                {videos.map((video, index) => (
                  <VideoListItem
                    key={video.id}
                    video={video}
                    index={prefersReducedMotion ? 0 : index}
                    onClick={setSelectedVideo}
                    onToggleFavorite={handleToggleVideoFavorite}
                    isDayMode={isDayMode}
                  />
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>

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

      {createPortal(
        <AnimatePresence>
          {selectedVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md ${isDayMode ? "bg-white/72" : "bg-black/90"}`}
              onClick={() => setSelectedVideo(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className={`relative w-full max-w-5xl overflow-hidden border ${isDayMode ? "bg-white border-slate-200" : "bg-[#0a0a0a] border-white/10"}`}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setSelectedVideo(null)}
                  className={`rect-icon-button absolute right-4 top-4 z-20 p-2 ${isDayMode ? "bg-white/90 text-slate-700" : "bg-black/50 text-white"}`}
                  aria-label="关闭视频"
                >
                  <X size={22} />
                </button>
                <div className="aspect-video bg-black">
                  <video src={selectedVideo.video} controls autoPlay className="h-full w-full" />
                </div>
                <div className="flex items-start justify-between gap-4 p-5">
                  <div>
                    <h3 className={`text-2xl font-black ${isDayMode ? "text-slate-950" : "text-white"}`}>
                      {selectedVideo.title}
                    </h3>
                    <p className={`mt-2 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                      {selectedVideo.category_name || "未分类"}
                    </p>
                  </div>
                  <FavoriteButton
                    itemId={selectedVideo.id}
                    itemType="video"
                    size={22}
                    showCount
                    count={selectedVideo.likes || 0}
                    favorited={selectedVideo.favorited}
                    initialFavorited={selectedVideo.favorited}
                    className={`rect-icon-button p-3 ${isDayMode ? "bg-white text-slate-700" : "bg-white/5 text-white"}`}
                    onToggle={(favorited, likes) => handleToggleVideoFavorite(selectedVideo.id, favorited, likes)}
                  />
                </div>
              </motion.div>
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
