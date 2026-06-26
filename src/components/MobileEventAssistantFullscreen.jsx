import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import EventAssistantPanel from "./EventAssistantPanel";

const MobileEventAssistantLauncher = ({ isDayMode, onOpen }) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group mb-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-px active:translate-y-0 active:scale-[0.99] md:hidden ${
        isDayMode
          ? "border-slate-200/80 bg-white text-slate-900 shadow-none hover:border-slate-300 hover:bg-white"
          : "border-white/10 bg-white/[0.06] text-white shadow-none hover:border-blue-300/20 hover:bg-white/[0.085]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-[1.03] group-active:scale-95 ${
            isDayMode
              ? "bg-white text-blue-700 ring-1 ring-slate-200/80"
              : "bg-white/10 text-blue-200"
          }`}
        >
          <Sparkles size={16} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black tracking-tight">
            {t("events.assistant.mobile_title", "AI 活动助手")}
          </span>
          <span className={`mt-0.5 block text-[11px] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
            {t("events.assistant.mobile_subtitle", "一句话找活动")}
          </span>
        </span>
      </span>
      <span
        className={`ml-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-transform group-hover:translate-x-0.5 group-active:translate-x-1 ${
          isDayMode ? "border-slate-900/[0.08] bg-white text-slate-500" : "border-white/10 bg-white/5 text-gray-300"
        }`}
      >
        <ChevronRight size={16} />
      </span>
    </button>
  );
};

const MobileEventAssistantFullscreen = ({
  isOpen,
  isDayMode,
  onClose,
  onOpenEvent,
}) => {
  const { t } = useTranslation();

  return (
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
            isDayMode
              ? "bg-white text-slate-900"
              : "bg-[#0f1117] text-white"
          }`}
        >
          <div
            className={`shrink-0 border-b px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.8rem)] ${
              isDayMode ? "border-slate-200/80 bg-white" : "border-white/10 bg-[#111318]/92 backdrop-blur-xl"
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={t("events.assistant.back_to_events", "返回活动列表")}
                onClick={onClose}
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  isDayMode
                    ? "border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                    : "border-white/10 bg-white/5 text-gray-300 hover:text-white"
                }`}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="min-w-0 flex-1 text-left">
                <h2 id="mobile-event-assistant-title" className="truncate text-lg font-black tracking-tight">
                  {t("events.assistant.mobile_title", "AI 活动助手")}
                </h2>
              </div>
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                  isDayMode ? "bg-white text-blue-700 ring-1 ring-slate-200/80" : "bg-white/10 text-blue-200"
                }`}
              >
                <Sparkles size={18} />
              </span>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
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
};

export { MobileEventAssistantLauncher };
export default MobileEventAssistantFullscreen;
