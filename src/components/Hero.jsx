import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown } from "lucide-react";

import { useSettings } from "../context/SettingsContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useReducedMotion } from "../utils/animations";

const Hero = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const { settings } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const isDesktopViewport = useMediaQuery("(min-width: 768px)", true);

  const shouldUseMotion = !prefersReducedMotion;
  const shouldUseParallax = shouldUseMotion && isDesktopViewport;
  const shouldAnimateArrow = shouldUseMotion && isDesktopViewport;
  const heroImage =
    settings.hero_bg_url || "/uploads/1767349451839-56405188.jpg";

  const overlayClass = "bg-gradient-to-b from-black/18 via-black/28 to-black/56";
  const imageClass = "opacity-46";
  const titleClass =
    "mx-auto mb-3 max-w-[11ch] text-balance text-[2.15rem] font-bold leading-[0.94] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-white/80 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] sm:mb-4 sm:max-w-none sm:text-5xl md:mb-6 md:text-7xl lg:text-8xl";
  const subtitleClass =
    "mx-auto max-w-[20rem] px-1 text-[15px] font-normal leading-6.5 tracking-[0.01em] text-gray-100/92 sm:max-w-2xl sm:px-4 sm:text-lg sm:leading-8 md:text-2xl";
  const badgeClass =
    "mt-5 inline-flex max-w-[19rem] flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/12 bg-black/18 px-3.5 py-2 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-white/84 shadow-[0_0_18px_rgba(255,255,255,0.08)] backdrop-blur-md sm:mt-6 sm:max-w-full sm:gap-2 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.2em]";
  const scrollButtonClass =
    "absolute bottom-10 left-1/2 z-20 hidden -translate-x-1/2 cursor-pointer text-white/50 transition-colors hover:text-white md:block";
  const scrollInnerClass =
    "rounded-full border border-white/10 bg-white/5 p-2 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]";
  const bottomFadeClass =
    "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-b from-transparent via-slate-950/35 to-[#020617] sm:h-40";

  return (
    <section className="relative flex min-h-[calc(100svh-4.5rem)] w-full items-start justify-center overflow-hidden px-4 pt-[calc(max(env(safe-area-inset-top),0px)+4.75rem)] pb-[max(env(safe-area-inset-bottom),88px)] sm:min-h-[100dvh] sm:items-center sm:pt-[max(env(safe-area-inset-top),0px)] sm:pb-[max(env(safe-area-inset-bottom),24px)]">
      <motion.div
        style={shouldUseParallax ? { y } : undefined}
        className={`absolute inset-0 z-0 ${shouldUseParallax ? "will-change-transform" : ""}`}
      >
        <div className={`absolute inset-0 z-10 ${overlayClass}`} />
        <img
          src={heroImage}
          srcSet={`${heroImage} 800w, ${heroImage} 1600w`}
          sizes="(max-width: 768px) 800px, 1600px"
          alt="Hero background"
          className={`h-full w-full object-cover ${imageClass}`}
          loading="eager"
          decoding="async"
        />
      </motion.div>

      <motion.div
        style={shouldUseParallax ? { opacity } : undefined}
        className={`relative z-20 w-full max-w-3xl px-4 pt-12 text-center sm:max-w-6xl sm:pt-0 ${shouldUseParallax ? "will-change-transform" : ""}`}
      >
        <motion.h1
          initial={shouldUseMotion ? { y: 50, opacity: 0 } : false}
          animate={shouldUseMotion ? { y: 0, opacity: 1 } : undefined}
          transition={
            shouldUseMotion
              ? { duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }
              : undefined
          }
          className={titleClass}
          style={{ fontFamily: "var(--theme-font-display)" }}
        >
          {settings.hero_title || "浙江大学信息聚合平台"}
        </motion.h1>

        <motion.p
          initial={shouldUseMotion ? { y: 30, opacity: 0 } : false}
          animate={shouldUseMotion ? { y: 0, opacity: 1 } : undefined}
          transition={
            shouldUseMotion ? { duration: 0.6, delay: 0.2 } : undefined
          }
          className={subtitleClass}
        >
          {settings.hero_subtitle || "打破信息差，共建信息网络"}
        </motion.p>

        <div className={badgeClass}>
          数字艺术 / 科技社群 / 校园共创
        </div>
      </motion.div>

      <motion.button
        type="button"
        style={shouldUseParallax ? { opacity } : undefined}
        animate={shouldAnimateArrow ? { y: [0, 10, 0] } : undefined}
        transition={
          shouldAnimateArrow
            ? { repeat: Infinity, duration: 2, ease: "easeInOut" }
            : undefined
        }
        className={scrollButtonClass}
        onClick={() =>
          window.scrollTo({ top: window.innerHeight, behavior: "smooth" })
        }
        aria-label="Scroll to content"
      >
        <div className={scrollInnerClass}>
          <ArrowDown className="h-6 w-6" />
        </div>
      </motion.button>

      <div className={bottomFadeClass} />
    </section>
  );
};

export default Hero;
