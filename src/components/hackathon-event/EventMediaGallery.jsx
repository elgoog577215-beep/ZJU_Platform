import { motion } from "framer-motion";
import { ArrowRight, Maximize2, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../context/SettingsContext";
import { useReducedMotion } from "../../utils/animations";
import { getThumbnailUrl } from "../../utils/imageUtils";
import SmartImage from "../SmartImage";
import "./EventMediaGallery.css";

// Transplanted from Gallery.jsx / Videos.jsx before c33d7d0af (May 2026).
// Keep the original natural-height masonry, rounded cards, overlays and motion;
// event media uses its own IDs and viewer, without the old global favorite API.
export default function EventMediaGallery({ items, video, onOpen }) {
    const { t } = useTranslation();
    const { uiMode } = useSettings();
    const reducedMotion = useReducedMotion();
    const isDayMode = uiMode === "day";
    return (
        <div
            className={
                video
                    ? "event-original-videos grid grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto"
                    : "event-original-photos columns-2 md:columns-3 lg:columns-4 gap-6 max-w-7xl mx-auto"
            }
        >
            {items.map((item, index) => {
                const title = item.title || t(`aix.media.${video ? "videos" : "photos"}`);
                const canAnimate = !reducedMotion && index < 8;
                return (
                    <motion.div
                        key={item.id}
                        initial={canAnimate ? { opacity: 0, y: video ? 14 : 16 } : false}
                        animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
                        transition={{
                            duration: video ? 0.24 : 0.28,
                            delay: Math.min(index, 5) * 0.03,
                            ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        whileHover={
                            !reducedMotion ? { y: -4, transition: { duration: 0.18 } } : undefined
                        }
                        className={`event-original-card group relative overflow-hidden border cursor-pointer text-left transition-all duration-300 ${
                            video
                                ? `aspect-video rounded-3xl backdrop-blur-xl ${isDayMode ? "day-card-lift hover:border-pink-300/50" : "bg-[#1a1a1a]/60 border-white/10 hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] hover:border-pink-500/30"}`
                                : `break-inside-avoid rounded-2xl backdrop-blur-sm w-full inline-block touch-manipulation mb-6 ${isDayMode ? "day-card-lift" : "bg-white/5 border-white/10 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-white/20"}`
                        }`}
                    >
                        <button
                            type="button"
                            className="event-original-open absolute inset-0 z-30 border-0 bg-transparent p-0"
                            aria-label={video ? title : t("gallery.open_photo", { title })}
                            onClick={() => onOpen(item)}
                        />
                        <SmartImage
                            src={getThumbnailUrl(video ? item.cover_url : item.url)}
                            alt={title}
                            type={video ? "video" : "image"}
                            priority={index === 0}
                            className={
                                video ? "w-full h-full" : "event-original-photo w-full h-auto"
                            }
                            imageClassName={
                                video
                                    ? "w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                                    : "h-auto object-cover transform transition-transform duration-700 ease-out group-hover:scale-105"
                            }
                            blurPlaceholder={item.blurPlaceholder}
                            iconSize={48}
                        />
                        {video ? (
                            <>
                                <div
                                    className={`pointer-events-none absolute inset-0 ${isDayMode ? "bg-gradient-to-t from-slate-950/72 via-slate-950/10 to-transparent" : "bg-gradient-to-t from-black/80 via-black/20 to-transparent"} opacity-70 group-hover:opacity-50 transition-opacity duration-300`}
                                />
                                <div className="event-original-play pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
                                    <div
                                        className={`w-20 h-20 backdrop-blur-md rounded-full flex items-center justify-center border group-hover:scale-110 transition-transform duration-300 ${isDayMode ? "bg-white/80 border-white/60 shadow-[0_20px_40px_rgba(148,163,184,0.24)]" : "bg-white/20 border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.2)]"}`}
                                    >
                                        <Play
                                            size={40}
                                            fill={isDayMode ? "#0f172a" : "white"}
                                            className={`${isDayMode ? "text-slate-950" : "text-white"} ml-2`}
                                        />
                                    </div>
                                </div>
                                <div className="pointer-events-none absolute bottom-0 left-0 w-full p-4 translate-y-2 group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-300">
                                    <div className="flex justify-between items-end gap-4">
                                        <h3 className="event-original-title text-lg font-bold text-white line-clamp-2 flex-1">
                                            {title}
                                        </h3>
                                        <div className="p-2 rounded-full backdrop-blur-md border bg-white/20 border-white/10 text-white group-hover:bg-pink-500 transition-all duration-300">
                                            <ArrowRight
                                                size={18}
                                                className="-rotate-45 group-hover:rotate-0 transition-transform duration-300"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div
                                className={`event-original-caption pointer-events-none absolute inset-0 ${isDayMode ? "bg-gradient-to-t from-slate-950/76 via-slate-900/18 to-transparent" : "bg-gradient-to-t from-black/90 via-black/40 to-transparent"} opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4`}
                            >
                                <div className="flex justify-between items-end gap-2 translate-y-3 group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-300">
                                    <h3 className="event-original-title text-lg font-bold text-white line-clamp-2 flex-1">
                                        {title}
                                    </h3>
                                    <div className="p-2 rounded-full backdrop-blur-md border bg-white/20 border-white/10 text-white group-hover:bg-indigo-500 transition-all duration-300">
                                        <Maximize2 size={18} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                );
            })}
        </div>
    );
}
