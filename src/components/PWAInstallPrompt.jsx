import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { isStandaloneDisplay } from "../utils/displayMode";

const PWAInstallPrompt = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    const updateViewportState = () => {
      setIsMobile(window.innerWidth < 768);
      setIsStandalone(isStandaloneDisplay());
    };

    updateViewportState();
    window.addEventListener("resize", updateViewportState);
    return () => window.removeEventListener("resize", updateViewportState);
  }, []);

  useEffect(() => {
    const handleRequestInstall = async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowPrompt(false);
    };

    window.addEventListener("request-pwa-install", handleRequestInstall);
    return () => window.removeEventListener("request-pwa-install", handleRequestInstall);
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && !isStandalone && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className={`fixed z-[120] flex items-center gap-3 border p-3 backdrop-blur-xl md:bottom-6 md:right-6 md:max-w-sm md:gap-4 md:p-4 ${
            isMobile
              ? "inset-x-3 bottom-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom)+0.75rem)]"
              : ""
          } ${isDayMode ? "bg-white/94 border-slate-200/80 shadow-[0_24px_60px_rgba(148,163,184,0.22)]" : "bg-[#111] border-white/10 shadow-2xl"}`}
          role="status"
        >
          <div className="shrink-0 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 p-2.5 md:p-3">
            <Download size={isMobile ? 20 : 24} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className={`text-sm font-bold leading-tight ${isDayMode ? "text-slate-900" : "text-white"}`}>
              {t("pwa.install_title")}
            </h4>
            <p className={`mt-0.5 text-xs leading-snug ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
              {t("pwa.install_desc")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            <button
              type="button"
              onClick={() => setShowPrompt(false)}
              aria-label={t("common.close", "关闭")}
              className={`inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md p-2 transition-colors ${isDayMode ? "text-slate-400 hover:text-slate-900 hover:bg-slate-100" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
            >
              <X size={18} />
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className={`inline-flex min-h-[40px] items-center justify-center rounded-md px-3 text-xs font-bold transition-colors md:px-4 ${isDayMode ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_12px_28px_rgba(99,102,241,0.24)]" : "bg-indigo-500 text-white hover:bg-indigo-400"}`}
            >
              {t("pwa.install_action")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
