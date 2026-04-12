import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";

const Hero = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const { settings, uiMode } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const shouldUseMotion = !prefersReducedMotion;
  const shouldUseParallax = shouldUseMotion && !isMobile;
  const isDayMode = uiMode === "day";

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport, { passive: true });
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden flex items-center justify-center px-4 pt-[max(env(safe-area-inset-top),0px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      {/* Background Image with Parallax */}
      <motion.div
        style={shouldUseParallax ? { y } : undefined}
        className="absolute inset-0 z-0"
      >
        <div
          className={`absolute inset-0 z-10 ${isDayMode ? "bg-white/25" : "bg-gradient-to-b from-black/5 via-black/20 to-black/38"}`}
        />
        <img
          src={settings.hero_bg_url || "/uploads/1767349451839-56405188.jpg"}
          srcSet={`${settings.hero_bg_url || "/uploads/1767349451839-56405188.jpg"} 800w, ${settings.hero_bg_url || "/uploads/1767349451839-56405188.jpg"} 1600w`}
          sizes="(max-width: 768px) 800px, 1600px"
          alt="Hero Background"
          className={`w-full h-full object-cover ${isDayMode ? "opacity-35" : "opacity-42"}`}
          loading="eager"
          decoding="async"
        />
      </motion.div>

      {/* Content */}
      <motion.div
        style={shouldUseParallax ? { opacity } : undefined}
        className="relative z-20 text-center px-4 w-full max-w-6xl"
      >
        <motion.h1
          initial={shouldUseMotion ? { y: 50, opacity: 0 } : false}
          animate={shouldUseMotion ? { y: 0, opacity: 1 } : undefined}
          transition={
            shouldUseMotion
              ? { duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }
              : undefined
          }
          className={`text-4xl sm:text-5xl md:text-7xl lg:text-9xl font-bold font-serif text-transparent bg-clip-text tracking-tighter mb-4 md:mb-6 ${isDayMode ? "bg-gradient-to-r from-white via-indigo-200 to-white/70 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] animate-text-gradient" : "bg-gradient-to-r from-white via-indigo-200 to-white/70 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] animate-text-gradient"}`}
        >
          {settings.hero_title || "浙江大学信息聚合平台"}
        </motion.h1>
        <motion.p
          initial={shouldUseMotion ? { y: 30, opacity: 0 } : false}
          animate={shouldUseMotion ? { y: 0, opacity: 1 } : undefined}
          transition={
            shouldUseMotion ? { duration: 0.6, delay: 0.2 } : undefined
          }
          className={`text-base sm:text-lg md:text-2xl font-light tracking-wide max-w-2xl mx-auto px-2 sm:px-4 ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
        >
          {settings.hero_subtitle || "打破信息差，共建信息网络"}
        </motion.p>
        <div
          className={`mt-6 inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-[11px] sm:text-xs font-medium uppercase tracking-[0.2em] text-center ${isDayMode ? "border-slate-200/80 bg-white/82 text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.14)]" : "border-white/10 bg-white/5 text-white/80 shadow-[0_0_15px_rgba(255,255,255,0.1)]"}`}
        >
          数字艺术 · 科技社群 · 轻盈日光
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        style={shouldUseParallax ? { opacity } : undefined}
        animate={shouldUseMotion ? { y: [0, 10, 0] } : undefined}
        transition={
          shouldUseMotion
            ? { repeat: Infinity, duration: 2, ease: "easeInOut" }
            : undefined
        }
        className={`absolute bottom-[max(env(safe-area-inset-bottom),88px)] md:bottom-10 left-1/2 -translate-x-1/2 z-20 transition-colors cursor-pointer ${isDayMode ? "text-slate-500 hover:text-slate-900" : "text-white/50 hover:text-white"}`}
        onClick={() =>
          window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
        }
      >
        <div
          className={`p-2 rounded-full border backdrop-blur-sm transition-all ${isDayMode ? "border-slate-200/80 bg-white/75 hover:bg-white shadow-[0_16px_34px_rgba(148,163,184,0.16)]" : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]"}`}
        >
          <ArrowDown className="w-6 h-6" />
        </div>
      </motion.div>
    </div>
  );
};

export default Hero;
