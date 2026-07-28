import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import EventAssistantPanel from "./EventAssistantPanel";

const MobileEventAssistantFullscreen = ({ isOpen, isDayMode, onClose, onOpenEvent }) => (
    <AnimatePresence>
        {isOpen ? (
            <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.99 }}
                transition={{ type: "spring", damping: 32, stiffness: 360 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-event-assistant-title"
                className={`fixed inset-0 z-[125] flex h-[100svh] flex-col md:hidden ${
                    isDayMode ? "bg-white text-slate-900" : "bg-[#030817] text-white"
                }`}
            >
                <div
                    className={`shrink-0 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.8rem)] ${isDayMode ? "bg-white" : "bg-[#030817]"}`}
                >
                    <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-start gap-2">
                        <button
                            type="button"
                            aria-label="返回活动列表"
                            onClick={onClose}
                            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] ${
                                isDayMode
                                    ? "text-slate-600 hover:text-slate-900"
                                    : "text-gray-300 hover:text-white"
                            }`}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="min-w-0 text-center">
                            <h2
                                id="mobile-event-assistant-title"
                                className="truncate text-lg font-black tracking-tight"
                            >
                                社区活动
                            </h2>
                            <p
                                className={`mt-1 truncate text-[8px] font-black uppercase tracking-[0.42em] ${isDayMode ? "text-cyan-700" : "text-cyan-300"}`}
                            >
                                Discover · Join · 社区活动
                            </p>
                        </div>
                        <span />
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
                    <EventAssistantPanel
                        isDayMode={isDayMode}
                        className="pb-[calc(env(safe-area-inset-bottom)+1rem)]"
                        variant="fullscreen"
                        onOpenEvent={onOpenEvent}
                    />
                </div>
            </motion.div>
        ) : null}
    </AnimatePresence>
);

export default MobileEventAssistantFullscreen;
