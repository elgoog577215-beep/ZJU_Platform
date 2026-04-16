import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "../context/SettingsContext";

const PWAInstallPrompt = () => {
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768);
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
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
      {showPrompt && !isMobile && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className={`fixed bottom-6 right-6 z-[100] flex items-center gap-4 p-4 rounded-2xl max-w-sm border backdrop-blur-xl ${isDayMode ? "bg-white/94 border-slate-200/80 shadow-[0_24px_60px_rgba(148,163,184,0.22)]" : "bg-[#111] border-white/10 shadow-2xl"}`}
        >
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-3 rounded-xl">
            <Download size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h4 className={`font-bold text-sm ${isDayMode ? "text-slate-900" : "text-white"}`}>Install App</h4>
            <p className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>Install our app for a better experience</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrompt(false)}
              className={`p-2 transition-colors rounded-full ${isDayMode ? "text-slate-400 hover:text-slate-900 hover:bg-slate-100" : "text-gray-400 hover:text-white"}`}
            >
              <X size={18} />
            </button>
            <button
              onClick={handleInstallClick}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${isDayMode ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_12px_28px_rgba(99,102,241,0.24)]" : "bg-white text-black hover:bg-gray-200"}`}
            >
              Install
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
