import React, { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown } from "lucide-react";

import { useSettings } from "../context/SettingsContext";
import {
  heroReveal,
  heroStagger,
  tapPress,
  useReducedMotion,
} from "../utils/animations";

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
  const nightHeroImage =
    settings.hero_bg_url || "/uploads/1767349451839-56405188.jpg";
  const dayHeroImage = "/images/hero-landscape-day-4k.jpg";
  const heroImage = uiMode === "day" ? dayHeroImage : nightHeroImage;

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

  const isDayMode = uiMode === "day";
  const overlayClass = isDayMode
    ? "bg-[linear-gradient(180deg,rgba(248,250,252,0.18)_0%,rgba(15,23,42,0.08)_38%,rgba(15,23,42,0.54)_100%)]"
    : "bg-gradient-to-b from-black/10 via-black/24 to-black/48";
  const imageClass = isDayMode
    ? "opacity-100 saturate-[1.08] contrast-[1.03]"
    : "opacity-46";
  const titleClass = isDayMode
    ? "hero-day-ink mx-auto mb-4 max-w-[12ch] text-balance text-[2.35rem] font-bold leading-[0.98] tracking-tight drop-shadow-[0_8px_34px_rgba(15,23,42,0.78)] sm:text-5xl md:mb-6 md:max-w-none md:text-7xl lg:text-8xl"
    : "mx-auto mb-4 text-balance bg-gradient-to-r from-white via-indigo-200 to-white/80 bg-clip-text text-[1.85rem] font-bold leading-[1.1] tracking-tight text-transparent drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] min-[360px]:whitespace-nowrap sm:text-5xl md:mb-6 md:text-7xl lg:text-8xl";
  const subtitleClass = isDayMode
    ? "hero-day-ink mx-auto max-w-2xl px-2 text-base font-normal tracking-wide opacity-95 drop-shadow-[0_4px_20px_rgba(15,23,42,0.58)] sm:px-4 sm:text-lg md:text-2xl"
    : "mx-auto max-w-2xl px-2 text-base font-normal tracking-wide text-white/90 drop-shadow-[0_3px_18px_rgba(2,6,23,0.72)] sm:px-4 sm:text-lg md:text-2xl";
  const badgeClass = isDayMode
    ? "hero-day-badge mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-white/34 bg-white/18 px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] shadow-[0_16px_38px_rgba(15,23,42,0.22)] backdrop-blur-md sm:text-xs"
    : "mt-6 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/88 shadow-[0_14px_32px_rgba(2,6,23,0.28)] backdrop-blur-md sm:text-xs";
  const scrollButtonClass =
    "absolute bottom-10 left-1/2 z-20 hidden -translate-x-1/2 cursor-pointer text-[rgba(255,255,255,0.5)] transition-colors hover:text-white md:block";
  const scrollInnerClass =
    "motion-surface rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] p-2 backdrop-blur-sm hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.1)] shadow-[0_0_15px_rgba(255,255,255,0.1)]";
  const bottomFadeClass =
    "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-b from-transparent via-slate-950/35 to-[#020617]";
  const heroContentClass = `motion-gpu relative z-20 w-full max-w-6xl px-4 text-center ${isDayMode ? "translate-y-[12vh] md:translate-y-[6vh]" : ""}`;
  const heroCopyShellClass =
    "relative isolate mx-auto max-w-[min(100%,64rem)] px-3 py-5 sm:px-6 sm:py-6 md:px-8 md:py-7";
  const heroReadabilityPlateClass = isDayMode
    ? "pointer-events-none absolute inset-x-[-3%] -top-5 -bottom-5 -z-10 mx-auto max-w-[min(94vw,60rem)] rounded-[3rem] bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.44)_0%,rgba(15,23,42,0.24)_48%,rgba(15,23,42,0.07)_76%,transparent_100%)] blur-xl md:inset-x-[-6%] md:-top-8 md:-bottom-8 md:max-w-[62rem] md:bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.38)_0%,rgba(15,23,42,0.22)_46%,rgba(15,23,42,0.06)_76%,transparent_100%)] md:blur-2xl"
    : "pointer-events-none absolute inset-x-[-3%] -top-5 -bottom-5 -z-10 mx-auto max-w-[min(94vw,60rem)] rounded-[3rem] bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,0.52)_0%,rgba(2,6,23,0.32)_44%,rgba(2,6,23,0.11)_74%,transparent_100%)] blur-xl md:inset-x-[-6%] md:-top-8 md:-bottom-8 md:max-w-[62rem] md:bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,0.42)_0%,rgba(2,6,23,0.24)_46%,rgba(2,6,23,0.08)_76%,transparent_100%)] md:blur-2xl";
  const heroContentGlowClass = isDayMode
    ? "pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[19rem] w-[min(94vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950/28 blur-3xl md:h-[24rem] md:w-[46rem]"
    : "";

  return (
    <section className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-4 pt-[max(env(safe-area-inset-top),0px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <motion.div
        style={shouldUseParallax ? { y } : undefined}
        className="motion-gpu absolute inset-0 z-0"
      >
        <div className={`absolute inset-0 z-10 ${overlayClass}`} />
        <img
          src={heroImage}
          srcSet={`${heroImage} 800w, ${heroImage} 1600w`}
          sizes="(max-width: 768px) 800px, 1600px"
          alt="Hero background"
          className={`motion-gpu h-full w-full object-cover ${imageClass}`}
          loading="eager"
          decoding="async"
        />
      </motion.div>

      <motion.div
        style={shouldUseParallax ? { opacity } : undefined}
        variants={heroStagger}
        initial={shouldUseMotion ? "initial" : false}
        animate={shouldUseMotion ? "animate" : undefined}
        className={heroContentClass}
      >
        <div className={heroCopyShellClass}>
          <div className={heroReadabilityPlateClass} />
          {isDayMode ? <div className={heroContentGlowClass} /> : null}
          <motion.h1
            variants={heroReveal}
            className={titleClass}
            style={{ fontFamily: "var(--theme-font-display)" }}
          >
            {settings.hero_title || "浙江大学信息聚合平台"}
          </motion.h1>

          <motion.p variants={heroReveal} className={subtitleClass}>
            {settings.hero_subtitle || "打破信息差，共建信息网络"}
          </motion.p>

          <motion.div variants={heroReveal} className={badgeClass}>
            数字艺术 / 科技社群 / 校园共创
          </motion.div>
        </div>
      </motion.div>

      <motion.button
        type="button"
        style={shouldUseParallax ? { opacity } : undefined}
        whileTap={shouldUseMotion ? tapPress : undefined}
        className={scrollButtonClass}
        onClick={() =>
          window.scrollTo({
            top: window.innerHeight,
            behavior: shouldUseMotion ? "smooth" : "auto",
          })
        }
        aria-label="Scroll to content"
      >
        <div
          className={`motion-gpu ${shouldUseMotion ? "motion-scroll-cue" : ""} ${scrollInnerClass}`}
        >
          <ArrowDown className="h-6 w-6" />
        </div>
      </motion.button>

      <div className={bottomFadeClass} />
    </section>
  );
};

export default Hero;
