// Restored from c33d7d0af^:src/components/Videos.jsx.
// Only event data, controls, and callbacks are adapted; the original page UI is retained.
import { memo } from "react";
import { motion } from "framer-motion";
import { Play, Film, Upload, AlertCircle, ArrowRight } from "lucide-react";
import SmartImage from "../../SmartImage";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../../context/SettingsContext";
import { getThumbnailUrl } from "../../../utils/imageUtils";
import { useReducedMotion } from "../../../utils/animations";

const VideoCard = memo(({ video, index, onClick, canAnimate, isDayMode, openLabel }) => {
    return (
        <motion.button
            type="button"
            aria-label={`${openLabel}: ${video.title}`}
            initial={canAnimate ? { opacity: 0, y: 14 } : false}
            animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
            transition={
                canAnimate ? { duration: 0.24, delay: Math.min(index, 5) * 0.03 } : undefined
            }
            onClick={() => onClick(video)}
            className={`text-left group relative aspect-video rounded-3xl overflow-hidden backdrop-blur-xl border cursor-pointer transition-all duration-300 hover:-translate-y-1 ${isDayMode ? "day-card-lift hover:border-pink-300/50" : "bg-[#1a1a1a]/60 border-white/10 hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] hover:border-pink-500/30"}`}
        >
            <SmartImage
                src={getThumbnailUrl(video.thumbnail)}
                alt={video.title}
                type="video"
                className="w-full h-full"
                imageClassName="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                iconSize={48}
            />

            {/* New Badge */}
            {video.date && new Date() - new Date(video.date) < 7 * 24 * 60 * 60 * 1000 && (
                <div className="absolute top-4 left-4 px-2 py-0.5 rounded-md bg-pink-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg z-20">
                    New
                </div>
            )}

            <div
                className={`absolute inset-0 ${isDayMode ? "bg-gradient-to-t from-slate-950/72 via-slate-950/10 to-transparent" : "bg-gradient-to-t from-black/80 via-black/20 to-transparent"} opacity-70 group-hover:opacity-48 transition-opacity duration-300`}
            />

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div
                    className={`w-20 h-20 backdrop-blur-md rounded-full flex items-center justify-center border group-hover:scale-110 transition-transform duration-300 relative ${isDayMode ? "bg-white/80 border-white/60 shadow-[0_20px_40px_rgba(148,163,184,0.24)]" : "bg-white/20 border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.2)]"}`}
                >
                    <Play size={40} fill="white" className="text-white ml-2 relative z-10" />
                </div>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-end">
                        <h3 className="text-lg md:text-xl font-bold text-[rgba(255,255,255,0.96)] drop-shadow-[0_2px_10px_rgba(15,23,42,0.5)] line-clamp-1 flex-1 mr-4">
                            {video.title}
                        </h3>

                        <div className="flex items-center gap-2">
                            <div
                                className={`p-2 rounded-full backdrop-blur-md border group-hover:bg-pink-500 group-hover:text-white transition-all duration-300 ${isDayMode ? "bg-white/76 border-white/50 shadow-[0_10px_24px_rgba(15,23,42,0.18)]" : "bg-white/20 border-white/10"}`}
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
        </motion.button>
    );
});

VideoCard.displayName = "VideoCard";

const Videos = ({
    items = [],
    status = "ready",
    hasMore = false,
    onMore,
    onOpen,
    onUpload,
    onRetry,
    controls,
}) => {
    const { t } = useTranslation();
    const { uiMode } = useSettings();
    const prefersReducedMotion = useReducedMotion();
    const isDayMode = uiMode === "day";
    const loading = status === "loading";
    const error = status === "error";
    const displayVideos = items.map((item) => ({
        ...item,
        thumbnail: item.cover_url,
        video: item.url,
    }));
    const allowAmbientEffects =
        !prefersReducedMotion && (typeof window === "undefined" || window.innerWidth >= 768);

    return (
        <section className="pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+96px)] md:py-24 px-4 md:px-8 min-h-screen relative z-10 overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                {allowAmbientEffects ? (
                    <>
                        <div
                            className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[130px] ${isDayMode ? "bg-pink-200/24" : "bg-pink-500/10"}`}
                        />
                        <div
                            className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] ${isDayMode ? "bg-rose-200/20" : "bg-rose-500/10"}`}
                        />
                    </>
                ) : (
                    <>
                        <div
                            className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[90px] hidden md:block ${isDayMode ? "bg-pink-200/22" : "bg-pink-500/10"}`}
                        />
                        <div
                            className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[80px] hidden md:block ${isDayMode ? "bg-rose-200/18" : "bg-rose-500/10"}`}
                        />
                    </>
                )}
            </div>

            <div className="max-w-7xl w-full mx-auto relative z-10">
                <div className="hidden md:flex absolute right-0 top-0 items-center gap-4 z-20">
                    <button
                        type="button"
                        onClick={onUpload}
                        aria-label={t("common.upload_video")}
                        className={`p-2 md:p-3 rounded-full backdrop-blur-md border transition-all ${isDayMode ? "day-quiet-button text-slate-700 hover:text-pink-600" : "bg-white/10 hover:bg-white/20 text-white border-white/10"}`}
                        title={t("common.upload_video")}
                    >
                        <Upload size={18} className="md:w-5 md:h-5" />
                    </button>
                </div>

                <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="mb-6 md:mb-12 text-center"
                >
                    <div className="md:hidden text-left mb-4">
                        <h1
                            className={`text-2xl font-bold tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}
                        >
                            {t("videos.title")}
                        </h1>
                        <p
                            className={`text-sm mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                        >
                            {t("videos.subtitle")}
                        </p>
                    </div>
                    <h2 className="hidden md:block text-4xl md:text-5xl font-bold font-serif mb-4 md:mb-6">
                        {t("videos.title")}
                    </h2>
                    <p className="hidden md:block text-gray-400 max-w-xl mx-auto">
                        {t("videos.subtitle")}
                    </p>
                    <div className="mt-8 relative z-50">{controls}</div>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                    {loading && displayVideos.length === 0 ? (
                        // Loading Skeletons
                        [...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className={`aspect-video rounded-3xl backdrop-blur-xl border animate-pulse relative overflow-hidden ${isDayMode ? "day-card-lift" : "bg-[#1a1a1a]/40 border-white/5"}`}
                            >
                                <div
                                    className={`absolute inset-0 ${isDayMode ? "bg-gradient-to-t from-slate-200/70 to-transparent" : "bg-gradient-to-t from-black/50 to-transparent"}`}
                                />
                                <div className="absolute bottom-6 left-6 right-6 space-y-3">
                                    <div className="h-4 bg-white/10 rounded w-1/4" />
                                    <div className="h-6 bg-white/10 rounded w-3/4" />
                                </div>
                            </div>
                        ))
                    ) : error ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 px-4">
                            <div className="bg-red-500/10 rounded-full p-6 mb-6 border border-red-500/20 backdrop-blur-xl">
                                <AlertCircle size={48} className="text-red-400 opacity-80" />
                            </div>
                            <p className="text-gray-300 mb-6 text-lg">
                                {t("common.error_fetching_data")}
                            </p>
                            <button
                                onClick={onRetry}
                                className={`px-8 py-3 rounded-full transition-all border font-medium hover:scale-105 active:scale-95 ${isDayMode ? "day-quiet-button hover:text-pink-600" : "bg-white/10 hover:bg-white/20 text-white border-white/10"}`}
                            >
                                {t("common.retry")}
                            </button>
                        </div>
                    ) : displayVideos.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 px-4">
                            <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-3xl p-8 mb-6 border border-white/5 backdrop-blur-xl shadow-xl">
                                <Film size={64} className="text-pink-400 opacity-80" />
                            </div>
                            <h3
                                className={`text-2xl font-bold mb-2 ${isDayMode ? "text-slate-900" : "text-white"}`}
                            >
                                {t("videos.no_videos")}
                            </h3>
                            <p className="text-gray-400 text-center max-w-md">
                                {t("videos.subtitle")}
                            </p>
                        </div>
                    ) : (
                        displayVideos.map((video, index) => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                index={index}
                                onClick={onOpen}
                                openLabel={t("common.play", "播放视频")}
                                canAnimate={!prefersReducedMotion && index < 8}
                                isDayMode={isDayMode}
                            />
                        ))
                    )}
                </div>

                {!loading && !error && displayVideos.length > 0 && hasMore && (
                    <div className="flex items-center justify-center pt-10">
                        <motion.button
                            whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                            onClick={onMore}
                            className={`px-6 py-2.5 rounded-full border transition-colors text-sm font-semibold ${isDayMode ? "day-quiet-button hover:text-pink-600" : "bg-white/10 hover:bg-white/15 text-white border-white/10 hover:border-white/20"}`}
                        >
                            {t("common.load_more", "加载更多")}
                        </motion.button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default Videos;
