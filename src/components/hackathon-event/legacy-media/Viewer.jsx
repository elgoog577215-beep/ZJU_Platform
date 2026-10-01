import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import BodyPortal from "../../../shared/ui/BodyPortal";
import { useSettings } from "../../../context/SettingsContext";
import { useBackClose, useBodyScrollLock } from "../../../hooks/useBackClose";
import { useReducedMotion } from "../../../utils/animations";

// Preserve the original Lightbox and Videos overlay presentation. Only the
// event-owned item replaces their global media, favorites, and related APIs.
export default function Viewer({ item, video, onClose, onNext, onPrev }) {
    const { t } = useTranslation();
    const { uiMode } = useSettings();
    const isDayMode = uiMode === "day";
    const prefersReducedMotion = useReducedMotion();
    const dialog = useRef(null);
    const titleId = useId();
    const [showInfo, setShowInfo] = useState(false);

    useBackClose(true, onClose);
    useBodyScrollLock(true);
    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => element.close();
    }, []);

    const originalLink = (
        <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 p-3 rounded-full transition-all ${isDayMode ? "text-slate-500 hover:text-green-600 hover:bg-green-50" : "text-white/70 hover:text-green-400 hover:bg-white/10"}`}
        >
            {t("aix.media.original")}
            <ArrowUpRight size={20} />
        </a>
    );

    return (
        <BodyPortal>
            <dialog
                ref={dialog}
                className={`legacy-media-viewer ${video ? "legacy-media-video-viewer" : "legacy-media-photo-viewer"}`}
                aria-labelledby={titleId}
                style={{
                    position: "fixed",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    maxWidth: "none",
                    maxHeight: "none",
                    margin: 0,
                    padding: 0,
                    border: 0,
                    background: "transparent",
                }}
                onCancel={(event) => {
                    event.preventDefault();
                    onClose();
                }}
                onKeyDown={(event) => {
                    if (video || event.target.closest("input, textarea, select")) return;
                    if (event.key === "ArrowRight" && onNext) {
                        event.preventDefault();
                        onNext();
                    }
                    if (event.key === "ArrowLeft" && onPrev) {
                        event.preventDefault();
                        onPrev();
                    }
                    if (event.key === "i") setShowInfo((previous) => !previous);
                }}
            >
                {video ? (
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0 }}
                        animate={prefersReducedMotion ? undefined : { opacity: 1 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className={`fixed inset-0 z-[100] backdrop-blur-md overflow-y-auto ${isDayMode ? "bg-white/72" : "bg-black/90"}`}
                        onClick={onClose}
                    >
                        <div className="flex min-h-full items-center justify-center p-4 md:p-8">
                            <motion.div
                                initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                className={`relative w-full max-w-5xl border rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isDayMode ? "day-fine-surface" : "bg-[#0a0a0a] border-white/10"}`}
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div
                                    className={`relative aspect-video ${isDayMode ? "bg-slate-100" : "bg-black"}`}
                                >
                                    <button
                                        onClick={onClose}
                                        aria-label={t("aix.close")}
                                        className={`absolute top-6 right-6 p-2 rounded-full backdrop-blur-md border transition-all z-20 group ${isDayMode ? "bg-white/90 hover:bg-white text-slate-700 border-slate-200/80 shadow-[0_14px_32px_rgba(148,163,184,0.18)]" : "bg-black/40 hover:bg-black/60 text-white border-white/10"}`}
                                    >
                                        <X
                                            size={24}
                                            className="group-hover:rotate-90 transition-transform duration-300"
                                        />
                                    </button>
                                    <video
                                        key={item.id}
                                        src={item.url}
                                        poster={item.cover_url || item.thumbnail || undefined}
                                        controls
                                        autoPlay
                                        playsInline
                                        className="w-full h-full"
                                    />
                                </div>
                                <div
                                    className={`p-8 md:p-10 pt-6 border-t flex justify-between items-start gap-6 ${isDayMode ? "border-slate-200/80 bg-white/94" : "border-white/5 bg-[#0a0a0a]"}`}
                                >
                                    <div className="flex-1">
                                        <h3
                                            id={titleId}
                                            className={`text-2xl md:text-3xl font-bold mb-2 font-serif ${isDayMode ? "text-slate-900" : "text-white"}`}
                                        >
                                            {item.title || t("aix.media.videos")}
                                        </h3>
                                        {item.category && (
                                            <p
                                                className={`text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                            >
                                                {item.category}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0 }}
                        animate={prefersReducedMotion ? undefined : { opacity: 1 }}
                        className={`fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-md p-4 ${isDayMode ? "bg-white/78" : "bg-black/95"}`}
                        onClick={onClose}
                    >
                        <div
                            className="absolute top-4 right-4 flex gap-4 z-50"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div
                                className={`flex items-center gap-2 backdrop-blur-md rounded-full p-1 border ${isDayMode ? "bg-white/88 border-slate-200/80 shadow-[0_14px_32px_rgba(148,163,184,0.16)]" : "bg-black/40 border-white/10"}`}
                            >
                                {originalLink}
                                <button
                                    onClick={() => setShowInfo((previous) => !previous)}
                                    aria-label={t("lightbox.info")}
                                    aria-expanded={showInfo}
                                    className={`p-3 rounded-full transition-all ${showInfo ? (isDayMode ? "text-indigo-600 bg-indigo-50" : "text-white bg-white/20") : isDayMode ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                                >
                                    <Info size={20} />
                                </button>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label={t("aix.close")}
                                className={`p-3 rounded-full backdrop-blur-md transition-all border ${isDayMode ? "bg-white/88 hover:bg-red-50 text-slate-500 hover:text-red-500 border-slate-200/80 shadow-[0_14px_32px_rgba(148,163,184,0.16)]" : "bg-black/40 hover:bg-red-500/20 text-white/70 hover:text-red-400 border-white/10"}`}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div
                            className="legacy-media-photo-stage relative max-w-7xl max-h-[90vh] w-full flex items-center justify-center"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <button
                                onClick={onPrev}
                                disabled={!onPrev}
                                aria-label={t("aix.media.previous")}
                                className={`absolute left-0 md:-left-16 p-4 rounded-full transition-colors disabled:opacity-20 ${isDayMode ? "text-slate-400 hover:text-slate-900 hover:bg-white/88" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                            >
                                <ChevronLeft size={48} />
                            </button>
                            <motion.img
                                key={item.id}
                                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                                animate={
                                    prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }
                                }
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                src={item.url}
                                alt={item.title || t("aix.media.photos")}
                                className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm"
                            />
                            <button
                                onClick={onNext}
                                disabled={!onNext}
                                aria-label={t("aix.media.next")}
                                className={`absolute right-0 md:-right-16 p-4 rounded-full transition-colors disabled:opacity-20 ${isDayMode ? "text-slate-400 hover:text-slate-900 hover:bg-white/88" : "text-white/50 hover:text-white hover:bg-white/5"}`}
                            >
                                <ChevronRight size={48} />
                            </button>
                            <div className="absolute -bottom-16 left-0 right-0 text-center">
                                <h3
                                    id={titleId}
                                    className={`text-2xl font-serif font-bold mb-1 ${isDayMode ? "text-slate-900" : "text-white"}`}
                                >
                                    {item.title || t("aix.media.photos")}
                                </h3>
                                <p
                                    className={`text-sm uppercase tracking-widest ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                >
                                    {item.category}
                                </p>
                            </div>
                        </div>
                        <AnimatePresence>
                            {showInfo && (
                                <motion.div
                                    initial={prefersReducedMotion ? false : { x: "100%" }}
                                    animate={prefersReducedMotion ? undefined : { x: 0 }}
                                    exit={prefersReducedMotion ? undefined : { x: "100%" }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className={`fixed top-0 right-0 bottom-0 w-full sm:w-80 md:w-96 backdrop-blur-xl border-l flex flex-col z-[70] ${isDayMode ? "bg-white/96 border-slate-200/80 shadow-[-18px_0_44px_rgba(148,163,184,0.18)]" : "bg-[#1a1a1a]/95 border-white/10"}`}
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <div className="flex justify-between items-center p-6 pb-2">
                                        <h4
                                            className={`text-lg font-bold pb-2 border-b-2 border-indigo-500 ${isDayMode ? "text-slate-900" : "text-white"}`}
                                        >
                                            {t("lightbox.info")}
                                        </h4>
                                        <button
                                            onClick={() => setShowInfo(false)}
                                            aria-label={t("aix.close")}
                                            className={
                                                isDayMode
                                                    ? "text-slate-400 hover:text-slate-900"
                                                    : "text-gray-400 hover:text-white"
                                            }
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4 space-y-6">
                                        <div>
                                            <h4
                                                className={`text-sm font-bold uppercase mb-2 ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                                            >
                                                {t("common.title")}
                                            </h4>
                                            <p
                                                className={`text-lg font-serif ${isDayMode ? "text-slate-900" : "text-white"}`}
                                            >
                                                {item.title}
                                            </p>
                                        </div>
                                        {item.category && (
                                            <div>
                                                <h4
                                                    className={`text-sm font-bold uppercase mb-2 ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                                                >
                                                    {t("common.category")}
                                                </h4>
                                                <span
                                                    className={`px-3 py-1 rounded-full text-sm ${isDayMode ? "bg-slate-100 text-slate-700 border border-slate-200/80" : "bg-white/10 text-white"}`}
                                                >
                                                    {item.category}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </dialog>
        </BodyPortal>
    );
}
