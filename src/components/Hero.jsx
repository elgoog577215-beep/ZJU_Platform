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

  const overlayClass = isDayMode
    ? ""
    : "bg-gradient-to-b from-black/10 via-black/24 to-black/48";
  const imageClass = isDayMode ? "opacity-60 saturate-[0.92]" : "opacity-46";
  const titleClass = isDayMode
    ? "mx-auto mb-4 max-w-[11.5ch] text-4xl font-bold leading-[0.94] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-slate-800 to-indigo-600 drop-shadow-[0_16px_30px_rgba(248,250,252,0.55)] sm:text-5xl md:mb-6 md:text-7xl lg:text-[5.4rem]"
    : "mb-4 text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-white/80 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] sm:text-5xl md:mb-6 md:text-7xl lg:text-8xl";
  const subtitleClass = isDayMode
    ? "mx-auto max-w-2xl px-2 text-base font-light tracking-[0.08em] text-slate-700 sm:px-4 sm:text-lg md:text-[22px]"
    : "mx-auto max-w-2xl px-2 text-base font-light tracking-wide text-gray-200 sm:px-4 sm:text-lg md:text-2xl";
  const badgeClass = isDayMode
    ? "mt-8 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-[11px] font-medium uppercase tracking-[0.28em] theme-surface-strong text-slate-700 sm:text-xs"
    : "mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/80 shadow-[0_0_15px_rgba(255,255,255,0.1)] sm:text-xs";
  const scrollButtonClass = isDayMode
    ? "absolute bottom-[max(env(safe-area-inset-bottom),88px)] left-1/2 z-20 -translate-x-1/2 cursor-pointer text-slate-500 transition-colors hover:text-slate-950 md:bottom-10"
    : "absolute bottom-[max(env(safe-area-inset-bottom),88px)] left-1/2 z-20 -translate-x-1/2 cursor-pointer text-white/50 transition-colors hover:text-white md:bottom-10";
  const scrollInnerClass = isDayMode
    ? "rounded-full border p-2 backdrop-blur-sm transition-all theme-surface-strong shadow-[0_18px_38px_rgba(148,163,184,0.12)] hover:bg-white"
    : "rounded-full border border-white/10 bg-white/5 p-2 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]";
  const bottomFadeClass = isDayMode
    ? "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-b from-transparent via-[rgba(248,250,252,0.42)] to-[var(--theme-bg)]"
    : "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-b from-transparent via-slate-950/35 to-[#020617]";

  return (
    <section className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4 pt-[max(env(safe-area-inset-top),0px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <motion.div
        style={shouldUseParallax ? { y } : undefined}
        className="absolute inset-0 z-0"
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

      {isDayMode ? (
        <>
          <div className="pointer-events-none absolute left-[8%] top-[18%] z-10 h-40 w-40 rounded-full bg-indigo-300/16 blur-3xl" />
          <div className="pointer-events-none absolute right-[10%] top-[32%] z-10 h-32 w-32 rounded-full bg-sky-200/18 blur-3xl" />
        </>
      ) : null}

      <motion.div
        style={shouldUseParallax ? { opacity } : undefined}
        className="relative z-20 w-full max-w-6xl px-4 text-center"
      >
        {isDayMode ? (
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200/65 bg-white/68 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-600 shadow-[0_16px_36px_rgba(148,163,184,0.1)]">
            Zhejiang University Creative Network
          </div>
        ) : null}

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
        animate={shouldUseMotion ? { y: [0, 10, 0] } : undefined}
        transition={
          shouldUseMotion
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
