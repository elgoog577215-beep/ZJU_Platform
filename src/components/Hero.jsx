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
  const heroImage =
    settings.hero_bg_url || "/uploads/1767349451839-56405188.jpg";

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport, { passive: true });
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return (
    <section className="relative min-h-[100dvh] w-full overflow-hidden flex items-center justify-center px-4 pt-[max(env(safe-area-inset-top),0px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <motion.div
        style={shouldUseParallax ? { y } : undefined}
        className="absolute inset-0 z-0"
      >
        <div
          className={`absolute inset-0 z-10 ${isDayMode ? "bg-white/20" : "bg-gradient-to-b from-black/10 via-black/24 to-black/48"}`}
        />
        <img
          src={heroImage}
          srcSet={`${heroImage} 800w, ${heroImage} 1600w`}
          sizes="(max-width: 768px) 800px, 1600px"
          alt="首页主视觉背景"
          className={`h-full w-full object-cover ${isDayMode ? "opacity-38" : "opacity-46"}`}
          loading="eager"
          decoding="async"
        />
      </motion.div>

      <motion.div
        style={shouldUseParallax ? { opacity } : undefined}
        className="relative z-20 w-full max-w-6xl px-4 text-center"
      >
        <motion.h1
          initial={shouldUseMotion ? { y: 50, opacity: 0 } : false}
          animate={shouldUseMotion ? { y: 0, opacity: 1 } : undefined}
          transition={
            shouldUseMotion
              ? { duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }
              : undefined
          }
          className="mb-4 text-4xl font-bold font-serif tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-white/80 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] sm:text-5xl md:mb-6 md:text-7xl lg:text-8xl"
        >
          {settings.hero_title || "浙江大学信息聚合平台"}
        </motion.h1>

        <motion.p
          initial={shouldUseMotion ? { y: 30, opacity: 0 } : false}
          animate={shouldUseMotion ? { y: 0, opacity: 1 } : undefined}
          transition={
            shouldUseMotion ? { duration: 0.6, delay: 0.2 } : undefined
          }
          className={`mx-auto max-w-2xl px-2 text-base font-light tracking-wide sm:px-4 sm:text-lg md:text-2xl ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
        >
          {settings.hero_subtitle || "打破信息差，共建信息网络"}
        </motion.p>

        <div
          className={`mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border px-4 py-2 text-center text-[11px] font-medium uppercase tracking-[0.2em] sm:text-xs ${isDayMode ? "border-slate-200/80 bg-white/82 text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.14)]" : "border-white/10 bg-white/5 text-white/80 shadow-[0_0_15px_rgba(255,255,255,0.1)]"}`}
        >
          数字艺术 路 科技社群 路 校园共创
        </div>
      </motion.div>

      <motion.button
        type="button"
        style={shouldUseParallax ? { opacity } : undefined}
        animate={shouldUseMotion ? { y: [0, 10, 0] } : undefined}
        transition={
          shouldUseMotion
            ? { repeat: Infinity, duration: 2, ease: "easeInOut" }
            : undefined
        }
        className={`absolute bottom-[max(env(safe-area-inset-bottom),88px)] left-1/2 z-20 -translate-x-1/2 cursor-pointer transition-colors md:bottom-10 ${isDayMode ? "text-slate-500 hover:text-slate-900" : "text-white/50 hover:text-white"}`}
        onClick={() =>
          window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
        }
        aria-label="滚动到下方内容"
      >
        <div
          className={`rounded-full border p-2 backdrop-blur-sm transition-all ${isDayMode ? "border-slate-200/80 bg-white/75 hover:bg-white shadow-[0_16px_34px_rgba(148,163,184,0.16)]" : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]"}`}
        >
          <ArrowDown className="h-6 w-6" />
        </div>
      </motion.button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-b from-transparent via-slate-950/35 to-[#020617]" />
    </section>
  );
};

export default Hero;
