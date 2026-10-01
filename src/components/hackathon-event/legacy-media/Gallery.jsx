// Original full Gallery page from c33d7d0af^ (before the May 2026 UI change).
// Only its data, upload and viewer adapters are supplied by the event workspace.
import { memo, forwardRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Upload, AlertCircle, Maximize2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../../context/SettingsContext";
import SmartImage from "../../SmartImage";
import { GallerySkeleton } from "../../SkeletonLoader";
import { getThumbnailUrl } from "../../../utils/imageUtils";
import { useReducedMotion } from "../../../utils/animations";

const PhotoCard = memo(
    forwardRef(({ photo, index, onClick, canAnimate, isDayMode, t }, ref) => {
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
                whileHover={canAnimate ? { y: -4, transition: { duration: 0.18 } } : undefined}
                className={`break-inside-avoid relative group overflow-hidden rounded-2xl cursor-pointer
                 backdrop-blur-sm border transition-all duration-300 w-full inline-block touch-manipulation mb-4 md:mb-6
                 ${isDayMode ? "day-card-lift" : "bg-white/5 border-white/10 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-white/20"}`}
            >
                <button
                    type="button"
                    className="absolute inset-0 z-30 rounded-2xl bg-transparent border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                    aria-label={t("gallery.open_photo", { title: photo.title })}
                    onClick={() => onClick(index)}
                />
                <SmartImage
                    src={getThumbnailUrl(photo.url)}
                    alt={photo.title}
                    type="image"
                    priority={index === 0}
                    className="w-full h-auto"
                    imageClassName="h-auto object-cover transform transition-transform duration-700 ease-out group-hover:scale-105"
                    blurPlaceholder={photo.blurPlaceholder}
                />

                <div
                    className={`absolute inset-0 ${isDayMode ? "bg-gradient-to-t from-slate-950/76 via-slate-900/18 to-transparent" : "bg-gradient-to-t from-black/90 via-black/40 to-transparent"}
                   opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-300
                   flex flex-col justify-end p-4`}
                >
                    <div className="flex flex-col gap-2 md:translate-y-3 md:group-hover:translate-y-0 md:group-focus-within:translate-y-0 transition-transform duration-300">
                        <div className="flex justify-between items-end gap-2">
                            <h3
                                className="text-lg font-bold text-[rgba(255,255,255,0.96)] drop-shadow-[0_2px_10px_rgba(15,23,42,0.45)] line-clamp-2 flex-1
                               transform transition-transform duration-300"
                            >
                                {photo.title}
                            </h3>

                            <div className="flex items-center gap-2">
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
            </motion.div>
        );
    })
);

PhotoCard.displayName = "LegacyPhotoCard";

const Gallery = ({
    items,
    status,
    hasMore,
    onMore,
    onOpen,
    onUpload,
    onRetry,
    controls,
    title,
    emptyTitle,
    emptyDescription,
}) => {
    const { t } = useTranslation();
    const { uiMode } = useSettings();
    const prefersReducedMotion = useReducedMotion();
    const isDayMode = uiMode === "day";
    const allowAmbientEffects = !prefersReducedMotion;
    const displayPhotos = items;
    const [maxColumns, setMaxColumns] = useState(3);
    useEffect(() => {
        const queries = [640, 768, 1024].map((width) =>
            window.matchMedia(`(min-width: ${width}px)`)
        );
        const update = () => setMaxColumns(1 + queries.filter((query) => query.matches).length);
        update();
        queries.forEach((query) => query.addEventListener("change", update));
        return () => queries.forEach((query) => query.removeEventListener("change", update));
    }, []);
    const sceneGroups = Array.from(
        items.reduce((groups, photo, index) => {
            const name = photo.category_name || t("aix.media.otherScene");
            if (!groups.has(name)) groups.set(name, []);
            groups.get(name).push({ photo, index });
            return groups;
        }, new Map()),
        ([name, photos]) => ({ name, photos })
    );
    const loading = status === "loading";
    const error = status === "error";
    const refresh = onRetry;
    const setSelectedPhotoIndex = (index) => onOpen(items[index]);
    return (
        <section className="pt-6 pb-16 md:pt-8 md:pb-20 px-4 md:px-8 relative flex-grow">
            {/* Enhanced Ambient Background */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
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

            <h1 className="sr-only">{title}</h1>
            <div className="legacy-media-toolbar max-w-7xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 max-w-full">{controls}</div>
                <button
                    type="button"
                    onClick={onUpload}
                    className={`inline-flex shrink-0 items-center justify-center gap-2 px-5 py-2.5 rounded-full border text-sm font-semibold transition-colors ${
                        isDayMode
                            ? "day-quiet-button text-slate-700 hover:text-indigo-600"
                            : "bg-white/10 hover:bg-white/15 text-white border-white/10"
                    }`}
                >
                    <Upload size={18} />
                    {t("aix.media.batchUpload")}
                </button>
            </div>

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
                        <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
                    </motion.div>
                    <p className="text-gray-300 mb-6">{t("common.error_fetching_data")}</p>
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
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                    <div
                        className={`rounded-2xl p-6 mb-6 border backdrop-blur-xl ${isDayMode ? "bg-white/88 border-slate-200/80" : "bg-white/5 border-white/10"}`}
                    >
                        <ImageIcon
                            size={40}
                            className={isDayMode ? "text-slate-400" : "text-gray-500"}
                        />
                    </div>
                    <h3
                        className={`text-2xl font-bold mb-2 ${isDayMode ? "text-slate-900" : "text-white"}`}
                    >
                        {emptyTitle}
                    </h3>
                    <p className={`max-w-md ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                        {emptyDescription}
                    </p>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto space-y-12 md:space-y-16">
                    {sceneGroups.map(({ name, photos }, groupIndex) => {
                        const count = Math.min(
                            photos.length === 4 && maxColumns === 3 ? 2 : maxColumns,
                            photos.length,
                            photos.length === 5 || photos.length === 6 ? 3 : 4
                        );
                        const columns = Array.from({ length: count }, () => []);
                        photos.forEach((entry, index) => columns[index % count].push(entry));
                        return (
                            <section key={name} aria-labelledby={`photo-scene-${groupIndex}`}>
                                <div className="legacy-media-scene-heading">
                                    <h2 id={`photo-scene-${groupIndex}`}>{name}</h2>
                                    <span aria-hidden="true" />
                                    <small>
                                        {t(
                                            hasMore
                                                ? "aix.media.loadedCount"
                                                : "aix.media.photoCount",
                                            { count: photos.length }
                                        )}
                                    </small>
                                </div>
                                <div
                                    className="legacy-media-masonry"
                                    style={{
                                        gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
                                    }}
                                >
                                    {columns.map((column, columnIndex) => (
                                        <div key={columnIndex} className="min-w-0">
                                            <AnimatePresence mode="popLayout">
                                                {column.map(({ photo, index }) => (
                                                    <PhotoCard
                                                        key={photo.id}
                                                        photo={photo}
                                                        index={index}
                                                        onClick={setSelectedPhotoIndex}
                                                        canAnimate={
                                                            !prefersReducedMotion && index < 8
                                                        }
                                                        isDayMode={isDayMode}
                                                        t={t}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            {!loading && !error && displayPhotos.length > 0 && hasMore && (
                <div className="flex items-center justify-center py-10">
                    <motion.button
                        whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                        onClick={onMore}
                        className={`px-6 py-2.5 rounded-full border transition-colors text-sm font-semibold ${isDayMode ? "day-quiet-button hover:text-indigo-600" : "bg-white/10 hover:bg-white/15 text-white border-white/10 hover:border-white/20"}`}
                    >
                        {t("common.load_more", "加载更多")}
                    </motion.button>
                </div>
            )}

            {!loading && !error && displayPhotos.length > 0 && !hasMore && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center py-10"
                    /* FIX: BUG-31 — Removed invalid onPageChange prop from motion.div */
                />
            )}

            {loading && displayPhotos.length > 0 && (
                <p role="status" className="text-center py-10 text-gray-400">
                    {t("aix.loading")}
                </p>
            )}
        </section>
    );
};

export default Gallery;
