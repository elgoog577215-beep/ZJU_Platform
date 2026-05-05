import { createPortal } from "react-dom";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
  forwardRef,
} from "react";
import { useContentPageEvents, useMobileSortLabel, useMobileToolbarSync } from "../hooks/useContentPage";
import { motion, AnimatePresence } from "framer-motion";
import Lightbox from "./Lightbox";
import Pagination from "./Pagination";
import {
  Box,
  Upload,
  AlertCircle,
  Maximize2,
  X,
} from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import { useTranslation } from "react-i18next";
import UploadModal from "./UploadModal";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import SmartImage from "./SmartImage";
import api from "../services/api";
import SortSelector from "./SortSelector";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import MobileContentToolbar from "./MobileContentToolbar";
import { GallerySkeleton } from "./SkeletonLoader";
import toast from "react-hot-toast";
import SEO from "./SEO";

import { useBackClose } from "../hooks/useBackClose";
import { useCachedResource } from "../hooks/useCachedResource";
import { getThumbnailUrl } from "../utils/imageUtils";
import { useReducedMotion } from "../utils/animations";

// Enhanced Photo Card with better micro-interactions
const PhotoCard = memo(
  forwardRef(
    (
      { photo, index, onClick, onToggleFavorite, canAnimate, isDayMode },
      ref,
    ) => {
      return (
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
          whileHover={
            canAnimate ? { y: -4, transition: { duration: 0.18 } } : undefined
          }
          className={`break-inside-avoid relative group overflow-hidden rounded-2xl cursor-pointer 
                 backdrop-blur-sm border transition-all duration-300 w-full inline-block touch-manipulation mb-4 md:mb-6
                 ${isDayMode ? "day-card-lift" : "bg-white/5 border-white/10 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-white/20"}`}
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
            className={`absolute inset-0 ${isDayMode ? "bg-gradient-to-t from-slate-950/76 via-slate-900/18 to-transparent" : "bg-gradient-to-t from-black/90 via-black/40 to-transparent"}
                   opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300
                   flex flex-col justify-end p-4`}
          >
            <div className="flex flex-col gap-2 md:translate-y-3 md:group-hover:translate-y-0 transition-transform duration-300">
              <div className="flex justify-between items-end gap-2">
                <h3
                  className="text-lg font-bold text-[rgba(255,255,255,0.96)] drop-shadow-[0_2px_10px_rgba(15,23,42,0.45)] line-clamp-2 flex-1
                               transform transition-transform duration-300"
                >
                  {photo.title}
                </h3>

                <div className="flex items-center gap-2">
                  <div onClick={(e) => e.stopPropagation()}>
                    <FavoriteButton
                      itemId={photo.id}
                      itemType="photo"
                      size={18}
                      showCount={true}
                      count={photo.likes || 0}
                      favorited={photo.favorited}
                      initialFavorited={photo.favorited}
                      className={`p-2 rounded-full backdrop-blur-md 
                                       transition-all duration-200 text-white border
                                       ${isDayMode ? "bg-white/70 hover:bg-pink-500/30 border-white/40 shadow-[0_12px_24px_rgba(15,23,42,0.18)]" : "bg-white/10 border-white/10"}
                                       hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/20`}
                      onToggle={(favorited, likes) =>
                        onToggleFavorite(photo.id, favorited, likes)
                      }
                    />
                  </div>
                  <div
                    className={`p-2 rounded-full backdrop-blur-md border 
                                  ${isDayMode ? "bg-white/72 border-white/40 shadow-[0_12px_24px_rgba(15,23,42,0.18)]" : "bg-white/20 border-white/10"} 
                                  group-hover:bg-indigo-500 group-hover:text-white 
                                  transition-all duration-300`}
                  >
                    <Maximize2 size={18} />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {typeof photo.likes === "number" && (
            <div
              className="absolute top-3 right-3 flex items-center gap-1 
                   backdrop-blur-md rounded-full px-2 py-1
                   border border-white/10"
              style={{
                backgroundColor: isDayMode
                  ? "rgba(255,255,255,0.82)"
                  : "rgba(0,0,0,0.4)",
              }}
            >
              <span className="text-pink-400 text-xs">♥</span>
              <span
                className={`text-xs font-medium ${isDayMode ? "text-slate-900" : "text-white"}`}
              >
                {photo.likes}
              </span>
            </div>
          )}
        </motion.div>
      );
    },
  ),
);

const Gallery = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sort, setSort] = useState("newest");
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const prefersReducedMotion = useReducedMotion();
  const isPaginationEnabled = settings.pagination_enabled === "true";
  const pageSize = isPaginationEnabled ? 12 : 24;
  const [displayPhotos, setDisplayPhotos] = useState([]);
  const isDayMode = uiMode === "day";

  // Use cached resource hook
  const {
    data: photos,
    pagination,
    loading,
    error,
    setData: setPhotos,
    refresh,
  } = useCachedResource(
    "/photos",
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

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [tempPhoto, setTempPhoto] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const mobileSortLabel = useMobileSortLabel(sort, t);
  const ignoreMobileFilter = useCallback(() => {}, []);
  const allowAmbientEffects =
    !prefersReducedMotion &&
    (typeof window === "undefined" || window.innerWidth >= 768);

  useContentPageEvents("image", setIsUploadOpen, ignoreMobileFilter, setIsMobileSortOpen);

  useEffect(() => {
    setCurrentPage(1);
  }, [sort, settings.pagination_enabled]);

  useEffect(() => {
    if (isPaginationEnabled) {
      setDisplayPhotos(photos);
      return;
    }
    setDisplayPhotos((prev) => {
      if (currentPage === 1) return photos;
      const seen = new Set(prev.map((item) => item.id));
      const next = photos.filter((item) => !seen.has(item.id));
      return next.length === 0 ? prev : [...prev, ...next];
    });
  }, [photos, currentPage, isPaginationEnabled]);

  useMobileToolbarSync(0, mobileSortLabel);

  // Capture on mount — Lightbox internally calls useBackClose which pushes a hash entry
  // whose state overwrites location.state, so we can't read it lazily at click time.
  // NOTE: Do NOT also call useBackClose here for the photo modal — Lightbox already does.
  // Double-stacking two hash entries would break the back-nav math.
  const fromFavoritesRef = useRef(location.state?.fromFavorites === true);
  const fromUserProfileRef = useRef(Boolean(location.state?.fromUserProfile));
  const closePhoto = useCallback(() => {
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
    setSelectedPhotoIndex(null);
    setTempPhoto(null);
  }, [navigate]);

  useBackClose(isUploadOpen, () => setIsUploadOpen(false));

  // FIX: BUG-16 — Use ref to track if deep link was processed; remove displayPhotos dependency
  const deepLinkProcessedRef = useRef(false);
  useEffect(() => {
    deepLinkProcessedRef.current = false;
  }, [searchParams]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (!id || deepLinkProcessedRef.current) return;
    deepLinkProcessedRef.current = true;

    const abortController = new AbortController();
    api
      .get(`/photos/${id}`, { signal: abortController.signal })
      .then((res) => {
        if (abortController.signal.aborted) return;
        if (res.data) {
          const foundIndex = displayPhotos.findIndex(
            (p) => String(p.id) === String(res.data.id),
          );
          if (foundIndex !== -1) {
            setSelectedPhotoIndex(foundIndex);
          } else {
            setTempPhoto(res.data);
          }
        }
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch deep linked photo", err);
        }
      });
    return () => abortController.abort();
  }, [searchParams]);

  const addPhoto = (newItem) => {
    api
      .post("/photos", newItem)
      .then(() => {
        refresh({ clearCache: true });
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to save photo", err);
        }
      });
  };

  // FIX: BUG-29 — Guard against empty displayPhotos to prevent division by zero
  const handleNext = () => {
    if (displayPhotos.length === 0) return;
    setSelectedPhotoIndex((prev) => (prev + 1) % displayPhotos.length);
  };

  const handlePrev = () => {
    if (displayPhotos.length === 0) return;
    setSelectedPhotoIndex(
      (prev) => (prev - 1 + displayPhotos.length) % displayPhotos.length,
    );
  };

  const handleUpload = (newItem) => {
    addPhoto(newItem);
  };

  const handleToggleFavorite = useCallback(
    (photoId, favorited, likes) => {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, likes: likes !== undefined ? likes : p.likes, favorited }
            : p,
        ),
      );

      setDisplayPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, likes: likes !== undefined ? likes : p.likes, favorited }
            : p,
        ),
      );

      setTempPhoto((prev) => {
        if (prev && prev.id === photoId) {
          return {
            ...prev,
            likes: likes !== undefined ? likes : prev.likes,
            favorited,
          };
        }
        return prev;
      });
    },
    [setPhotos, setDisplayPhotos],
  );

  return (
    <section className="pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+96px)] md:py-20 px-4 md:px-8 relative overflow-hidden flex-grow">
      <SEO
        title="画廊"
        description="浏览校园摄影、创作影像与精选画廊内容。"
      />
      {/* Enhanced Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {allowAmbientEffects ? (
          <>
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.1, 0.15, 0.1],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[130px]"
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.12, 0.1],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 md:mb-12 relative z-40 text-center"
      >
        <div className="md:hidden mb-4 text-left">
          <h1
            className={`text-2xl font-bold tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}
          >
            {t("gallery.title")}
          </h1>
          <p
            className={`text-sm mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
          >
            {t("gallery.subtitle")}
          </p>
        </div>
        <MobileContentToolbar
          isDayMode={isDayMode}
          resultCount={displayPhotos.length}
          sortLabel={mobileSortLabel}
          onOpenSort={() => setIsMobileSortOpen(true)}
        />

        <motion.button
          whileHover={{ scale: 1.05, rotate: 90 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (!user) {
              toast.error(t("auth.signin_required"));
              return;
            }
            setIsUploadOpen(true);
          }}
          className={`hidden md:block absolute right-0 top-0 md:top-2 p-2 md:p-3 rounded-full backdrop-blur-md border transition-all ${
            isDayMode
              ? "day-quiet-button text-slate-700 hover:text-indigo-600"
              : "bg-white/10 hover:bg-white/20 text-white border-white/10 hover:shadow-lg hover:shadow-indigo-500/20"
          }`}
          title={t("common.upload_photo")}
        >
          <Upload size={18} className="md:w-5 md:h-5" />
        </motion.button>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="hidden md:block text-4xl md:text-5xl font-bold font-serif mb-4 md:mb-6"
        >
          {t("gallery.title")}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden md:block text-gray-400 max-w-xl mx-auto mb-6 md:mb-8 text-sm md:text-base"
        >
          {t("gallery.subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="hidden md:flex flex-col items-center gap-6 relative z-50"
        >
          <SortSelector sort={sort} onSortChange={setSort} />
        </motion.div>
      </motion.div>

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
                className={`fixed inset-0 backdrop-blur-sm z-[100] md:hidden ${isDayMode ? "bg-white/62" : "bg-black/60"}`}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className={`fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit backdrop-blur-xl border rounded-3xl z-[101] md:hidden flex flex-col max-w-sm mx-auto ${
                  isDayMode
                    ? "day-fine-surface"
                    : "bg-[#1a1a1a]/95 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                }`}
              >
                <div className={`p-4 border-b flex justify-between items-center sticky top-0 z-10 backdrop-blur-xl rounded-t-3xl ${isDayMode ? "border-slate-200/70 bg-white/72" : "border-white/10 bg-[#1a1a1a]/95"}`}>
                  <div>
                    <h3 className={`text-lg font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}>
                      {t("common.sort", "排序")}
                    </h3>
                    <p className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                      {t("sort_filter.title", "选择排序方式")}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsMobileSortOpen(false)}
                    className={`p-2 rounded-full transition-colors ${isDayMode ? "day-quiet-button border text-slate-500 hover:text-slate-900" : "text-gray-400 hover:text-white bg-white/5"}`}
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

      {loading && displayPhotos.length === 0 ? (
        <GallerySkeleton count={12} />
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <AlertCircle
              size={48}
              className="text-red-400 mb-4 opacity-50 mx-auto"
            />
          </motion.div>
          <p className="text-gray-300 mb-6">
            {t("common.error_fetching_data")}
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={refresh}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full 
                               transition-all border border-white/10 hover:border-white/30"
          >
            {t("common.retry")}
          </motion.button>
        </motion.div>
      ) : displayPhotos.length === 0 ? (
        <div className="flex min-h-[52vh] flex-col items-center justify-center px-4 py-16 text-center md:min-h-[48vh] md:py-20">
          <div
            className={`rounded-3xl p-8 mb-6 border backdrop-blur-xl ${isDayMode ? "bg-white/88 border-slate-200/80" : "bg-white/5 border-white/10"}`}
          >
            <Box
              size={56}
              className={isDayMode ? "text-slate-400" : "text-gray-500"}
            />
          </div>
          <h3
            className={`text-2xl font-bold mb-2 ${isDayMode ? "text-slate-900" : "text-white"}`}
          >
            {t("gallery.title")}
          </h3>
          <p
            className={`max-w-md ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
          >
            {t("gallery.subtitle")}
          </p>
        </div>
      ) : (
        <motion.div
          layout={
            !prefersReducedMotion &&
            typeof window !== "undefined" &&
            window.innerWidth >= 768
          }
          className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6 max-w-7xl mx-auto pb-8 md:pb-0"
        >
          <AnimatePresence mode="popLayout">
            {displayPhotos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                index={index}
                onClick={setSelectedPhotoIndex}
                onToggleFavorite={handleToggleFavorite}
                canAnimate={!prefersReducedMotion && index < 8}
                isDayMode={isDayMode}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading &&
        !error &&
        displayPhotos.length > 0 &&
        settings.pagination_enabled !== "true" &&
        hasMore && (
          <div className="flex items-center justify-center py-10">
            <motion.button
              whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              className={`px-6 py-2.5 rounded-full border transition-colors text-sm font-semibold ${isDayMode ? "day-quiet-button hover:text-indigo-600" : "bg-white/10 hover:bg-white/15 text-white border-white/10 hover:border-white/20"}`}
            >
              {t("common.load_more", "加载更多")}
            </motion.button>
          </div>
        )}

      {!loading &&
        !error &&
        displayPhotos.length > 0 &&
        settings.pagination_enabled !== "true" &&
        !hasMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-10"
            /* FIX: BUG-31 — Removed invalid onPageChange prop from motion.div */
          />
        )}

      <AnimatePresence>
        {(selectedPhotoIndex !== null || tempPhoto) && (
          <Lightbox
            photo={
              selectedPhotoIndex !== null
                ? displayPhotos[selectedPhotoIndex]
                : tempPhoto
            }
            onClose={closePhoto}
            onNext={selectedPhotoIndex !== null ? handleNext : undefined}
            onPrev={selectedPhotoIndex !== null ? handlePrev : undefined}
            onSelect={(photo) => {
              const idx = displayPhotos.findIndex((p) => p.id === photo.id);
              if (idx !== -1) {
                setSelectedPhotoIndex(idx);
                setTempPhoto(null);
              } else {
                setSelectedPhotoIndex(null);
                setTempPhoto(photo);
              }
            }}
            onLikeToggle={handleToggleFavorite}
          />
        )}
      </AnimatePresence>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        type="image"
      />
    </section>
  );
};

export default Gallery;
