import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, ChevronRight, Sparkles } from "lucide-react";
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
      className={`group mb-4 flex min-h-[118px] w-full flex-wrap items-center gap-3 overflow-hidden rounded-[12px] border px-3.5 py-3 text-left transition-[background-color,border-color,box-shadow] min-[390px]:min-h-[104px] min-[390px]:flex-nowrap md:hidden ${
        isDayMode
          ? "border-blue-100/90 bg-[linear-gradient(105deg,#ffffff,#f7fbff_48%,#edf5ff)] text-slate-950 shadow-[0_16px_36px_rgba(37,99,235,0.09)] hover:border-blue-200"
          : "border-indigo-400/45 bg-[radial-gradient(circle_at_12%_50%,rgba(80,120,255,0.38),transparent_28%),linear-gradient(100deg,rgba(32,44,104,0.98),rgba(9,16,42,0.96))] text-white shadow-[0_18px_46px_rgba(20,40,120,0.28)] hover:border-indigo-300/70"
      }`}
    >
      <span className="flex min-w-0 basis-full items-center gap-3 min-[390px]:basis-auto min-[390px]:flex-1">
        <span
          className={`relative inline-flex h-[72px] w-[88px] shrink-0 items-end justify-center overflow-hidden rounded-[10px] transition-transform group-hover:scale-[1.02] group-active:scale-95 ${
            isDayMode
              ? "bg-blue-50/90 text-blue-600 ring-1 ring-blue-100"
              : "bg-indigo-500/18 text-indigo-100 ring-1 ring-indigo-300/25"
          }`}
        >
          <span className={`absolute left-3 top-2 h-1.5 w-1.5 rounded-full ${isDayMode ? "bg-cyan-500 shadow-[0_0_16px_rgba(6,182,212,0.65)]" : "bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]"}`} />
          <span className={isDayMode ? "absolute right-3 top-5 text-blue-300" : "absolute right-3 top-5 text-indigo-200"}>
            <Sparkles size={13} />
          </span>
          <span className={`mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_0_28px_rgba(99,102,241,0.34)] ${isDayMode ? "border-blue-100 bg-white" : "border-indigo-300/30 bg-[#111b46]"}`}>
            <Bot size={28} />
          </span>
          <span className={`absolute bottom-2 right-2 rounded-[5px] border px-1.5 py-0.5 text-[10px] font-black ${isDayMode ? "border-blue-200 bg-blue-50 text-blue-700" : "border-indigo-300/30 bg-indigo-600/80 text-white"}`}>
            AI
          </span>
        </span>
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1 text-[20px] font-black leading-6 tracking-tight">
            {t("events.assistant.mobile_title", "AI 活动助手")}
            <Sparkles size={15} className={`shrink-0 ${isDayMode ? "text-blue-400" : "text-indigo-200"}`} />
          </span>
          <span className={`mt-1 block text-[14px] leading-5 ${isDayMode ? "text-slate-600" : "text-slate-300"}`}>
            为你发现合适的活动
          </span>
          <span className="mt-2 flex max-w-full gap-1 overflow-hidden">
            {["兴趣推荐", "智能匹配", "活动答疑"].map((label) => (
              <span
                key={label}
                className={`inline-flex h-5 shrink-0 items-center rounded-[4px] border px-1.5 text-[10px] font-semibold ${isDayMode ? "border-blue-100 bg-white/80 text-blue-600" : "border-indigo-300/25 bg-indigo-500/15 text-indigo-100"}`}
              >
                {label}
              </span>
            ))}
          </span>
        </span>
      </span>
      <span
        className={`ml-[100px] inline-flex h-11 basis-[calc(100%-100px)] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[9px] border px-4 text-[15px] font-bold leading-none shadow-[0_10px_24px_rgba(37,99,235,0.12)] min-[390px]:ml-2 min-[390px]:h-12 min-[390px]:basis-auto ${
          isDayMode ? "border-blue-200 bg-white text-blue-700" : "border-indigo-300/20 bg-indigo-500 text-white"
        }`}
      >
        <span>去探索</span>
        <ChevronRight size={17} className="shrink-0" />
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
