import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import EventAssistantPanel from "./EventAssistantPanel";

const MobileEventAssistantLauncher = ({ isDayMode, onOpen }) => {
  const { t } = useTranslation();

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.975 }}
      transition={{ type: "spring", stiffness: 520, damping: 34 }}
      type="button"
      onClick={onOpen}
      className={`group fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-[58] flex h-[56px] items-center justify-between rounded-[10px] border px-3 text-left shadow-[0_14px_34px_rgba(0,0,0,0.34)] transition-[background-color,border-color] md:hidden ${
        isDayMode
          ? "border-slate-200/80 bg-white text-slate-900 hover:border-slate-300"
          : "border-white/10 bg-[#151b2c]/96 text-white hover:border-indigo-300/20"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-[1.03] group-active:scale-95 ${
            isDayMode
              ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
              : "bg-indigo-500/28 text-indigo-100 ring-1 ring-indigo-300/20"
          }`}
        >
          <Sparkles size={16} />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-black tracking-tight">
            {t("events.assistant.mobile_title", "AI 活动助手")}
          </span>
          <span className={`mt-0.5 block text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
            为你发现合适的活动
          </span>
        </span>
      </span>
      <span
        className={`ml-3 inline-flex h-9 shrink-0 items-center justify-center rounded-[6px] border px-4 text-sm font-bold ${
          isDayMode ? "border-slate-900/[0.08] bg-indigo-600 text-white" : "border-indigo-400/20 bg-indigo-500 text-white"
        }`}
      >
        去询问
      </span>
    </motion.button>
  );
};

const MobileEventAssistantFullscreen = ({
  isOpen,
  isDayMode,
  onClose,
  onOpenEvent,
}) => (
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
        <div className={`shrink-0 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.8rem)] ${isDayMode ? "bg-white" : "bg-[#030817]"}`}>
          <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-start gap-2">
            <button
              type="button"
              aria-label="返回活动列表"
              onClick={onClose}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] ${
                isDayMode ? "text-slate-600 hover:text-slate-900" : "text-gray-300 hover:text-white"
              }`}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0 text-center">
              <h2 id="mobile-event-assistant-title" className="truncate text-lg font-black tracking-tight">
                社区活动
              </h2>
              <p className={`mt-1 truncate text-[8px] font-black uppercase tracking-[0.42em] ${isDayMode ? "text-cyan-700" : "text-cyan-300"}`}>
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

export { MobileEventAssistantLauncher };
export default MobileEventAssistantFullscreen;
