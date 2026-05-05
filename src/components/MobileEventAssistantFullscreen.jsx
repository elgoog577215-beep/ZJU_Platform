import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
import EventAssistantPanel from "./EventAssistantPanel";

const MobileEventAssistantLauncher = ({ isDayMode, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className={`group mb-4 flex w-full items-center justify-between rounded-[1.5rem] border px-4 py-3.5 text-left transition-all active:scale-[0.99] md:hidden ${
      isDayMode
        ? "border-slate-200 bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        : "border-white/10 bg-white/[0.06] text-white shadow-none"
    }`}
  >
    <span className="flex min-w-0 items-center gap-3">
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-active:scale-95 ${
          isDayMode
            ? "bg-blue-50 text-blue-600"
            : "bg-white/10 text-blue-200"
        }`}
      >
        <Sparkles size={20} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-black tracking-tight">AI 活动助手</span>
        <span className={`mt-1 block text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
          一句话找活动
        </span>
      </span>
    </span>
    <span
      className={`ml-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-transform group-active:translate-x-0.5 ${
        isDayMode ? "border-slate-200 bg-white/80 text-slate-500" : "border-white/10 bg-white/5 text-gray-300"
      }`}
    >
      <ChevronRight size={18} />
    </span>
  </button>
);

const MobileEventAssistantFullscreen = ({
  isOpen,
  isDayMode,
  onClose,
  onOpenEvent,
}) => (
  <AnimatePresence>
    {isOpen ? (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 18 }}
        transition={{ type: "spring", damping: 30, stiffness: 340 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-event-assistant-title"
        className={`fixed inset-0 z-[125] flex h-[100svh] flex-col md:hidden ${
          isDayMode
            ? "bg-[#f6f7f9] text-slate-900"
            : "bg-[#0f1117] text-white"
        }`}
      >
        <div
          className={`shrink-0 border-b px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.9rem)] ${
            isDayMode ? "border-slate-200 bg-white/94 backdrop-blur-xl" : "border-white/10 bg-[#111318]/92 backdrop-blur-xl"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="返回活动列表"
              onClick={onClose}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
                isDayMode
                  ? "border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                  : "border-white/10 bg-white/5 text-gray-300 hover:text-white"
              }`}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0 flex-1 text-left">
              <h2 id="mobile-event-assistant-title" className="truncate text-lg font-black tracking-tight">
                AI 活动助手
              </h2>
            </div>
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                isDayMode ? "bg-blue-50 text-blue-600" : "bg-white/10 text-blue-200"
              }`}
            >
              <Sparkles size={18} />
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 custom-scrollbar">
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

export { MobileEventAssistantLauncher };
export default MobileEventAssistantFullscreen;
