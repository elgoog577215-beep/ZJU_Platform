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

const Hero = ({ id, onScrollNext } = {}) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const { settings, uiMode } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  const shouldUseMotion = !prefersReducedMotion;
  const shouldUseParallax = shouldUseMotion && !isMobile && !onScrollNext;
  const nightHeroImage =
    settings.hero_bg_url || "/uploads/1767349451839-56405188.jpg";
  const dayHeroImage = "/images/hero-landscape-day-4k.jpg";
  const heroImage = uiMode === "day" ? dayHeroImage : nightHeroImage;
  const heroTitle = settings.hero_title || "浙江大学信息聚合平台";
  const defaultTitleSegments =
    heroTitle === "浙江大学信息聚合平台"
      ? ["浙江大学", "信息聚合平台"]
      : null;

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
    ? "bg-[linear-gradient(180deg,rgba(248,250,252,0.08)_0%,rgba(15,23,42,0.06)_38%,rgba(15,23,42,0.18)_100%)]"
    : "bg-[linear-gradient(180deg,rgba(2,6,23,0.24)_0%,rgba(2,6,23,0.12)_38%,rgba(2,6,23,0.24)_100%)]";
  const imageClass = isDayMode
    ? "opacity-100 saturate-[1.12] contrast-[1.04]"
    : "opacity-52 saturate-[1.18] contrast-[1.08]";
  const titleClass = isDayMode
    ? "home-hero-title home-hero-title-day mx-auto mb-4 max-w-[12ch] text-balance text-[2.55rem] font-black leading-[0.96] tracking-normal sm:text-[4.4rem] md:mb-6 md:max-w-none md:whitespace-nowrap md:text-[5.55rem] lg:text-[6.45rem] xl:text-[7rem]"
    : "home-hero-title home-hero-title-night mx-auto mb-4 max-w-[12ch] text-balance text-[2.45rem] font-black leading-[0.98] tracking-normal sm:text-[4.4rem] md:mb-6 md:max-w-none md:whitespace-nowrap md:text-[5.55rem] lg:text-[6.45rem] xl:text-[7rem]";
  const subtitleClass = isDayMode
    ? "hero-day-ink mx-auto max-w-2xl px-2 text-base font-semibold tracking-wide opacity-95 drop-shadow-[0_4px_20px_rgba(15,23,42,0.58)] sm:px-4 sm:text-xl md:text-[1.7rem]"
    : "mx-auto max-w-2xl px-2 text-base font-semibold tracking-wide text-white/[0.92] drop-shadow-[0_6px_24px_rgba(2,6,23,0.84)] sm:px-4 sm:text-xl md:text-[1.7rem]";
  const badgeClass = isDayMode
    ? "hero-day-badge mt-7 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-white/40 bg-white/20 px-5 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.22em] shadow-[0_18px_42px_rgba(15,23,42,0.24)] backdrop-blur-md sm:text-xs"
    : "mt-7 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-cyan-200/20 bg-slate-950/22 px-5 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.22em] text-cyan-50/92 shadow-[0_0_42px_rgba(56,189,248,0.12)] backdrop-blur-md sm:text-xs";
  const kickerClass = isDayMode
    ? "hero-day-badge mx-auto mb-5 inline-flex max-w-full items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.34em] sm:text-xs"
    : "mx-auto mb-5 inline-flex max-w-full items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.34em] text-cyan-100/78 sm:text-xs";
  const scrollButtonClass =
    "absolute bottom-10 left-1/2 z-20 hidden -translate-x-1/2 cursor-pointer text-[rgba(255,255,255,0.62)] transition-colors hover:text-white md:block";
  const scrollInnerClass =
    "motion-surface rounded-full border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.07)] p-2 backdrop-blur-sm hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.13)] shadow-[0_0_22px_rgba(103,232,249,0.18)]";
  const heroContentClass = `motion-gpu relative z-20 w-full max-w-7xl px-4 text-center ${isDayMode ? "translate-y-[10vh] md:translate-y-[5vh]" : ""}`;
  const heroCopyShellClass =
    "relative isolate mx-auto max-w-[min(100%,82rem)] px-3 py-6 sm:px-6 sm:py-7 md:px-8 md:py-9";
  const heroReadabilityPlateClass = isDayMode
    ? "pointer-events-none absolute inset-x-[-5%] -top-8 -bottom-8 -z-10 mx-auto max-w-[min(96vw,72rem)] rounded-[4rem] bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.50)_0%,rgba(15,23,42,0.24)_44%,rgba(15,23,42,0.08)_72%,transparent_100%)] blur-xl md:inset-x-[-8%] md:-top-10 md:-bottom-10 md:max-w-[78rem] md:blur-2xl"
    : "pointer-events-none absolute inset-x-[-5%] -top-8 -bottom-8 -z-10 mx-auto max-w-[min(96vw,74rem)] rounded-[4rem] bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,0.62)_0%,rgba(2,6,23,0.38)_38%,rgba(2,6,23,0.14)_70%,transparent_100%)] blur-xl md:inset-x-[-8%] md:-top-12 md:-bottom-12 md:max-w-[80rem] md:blur-2xl";
  const heroContentGlowClass = isDayMode
    ? "pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[21rem] w-[min(94vw,40rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950/30 blur-3xl md:h-[27rem] md:w-[54rem]"
    : "pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[20rem] w-[min(94vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/12 blur-3xl md:h-[29rem] md:w-[60rem]";

  const handleScrollNext = () => {
    if (onScrollNext) {
      onScrollNext();
      return;
    }

    window.scrollTo({
      top: window.innerHeight,
      behavior: shouldUseMotion ? "smooth" : "auto",
    });
  };

  return (
    <section
      id={id}
      className={`home-hero relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden px-4 pt-[max(env(safe-area-inset-top),0px)] pb-[max(env(safe-area-inset-bottom),24px)] ${id ? "snap-start snap-always" : ""}`}
    >
      <motion.div
        style={shouldUseParallax ? { y } : undefined}
        className="motion-gpu absolute inset-0 z-0"
      >
        <div className={`absolute inset-0 z-10 ${overlayClass}`} />
        <div className="home-hero-beam absolute inset-0 z-[11]" aria-hidden="true" />
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
      <div className="home-hero-network absolute inset-0 z-[12]" aria-hidden="true" />
      <div className="home-hero-constellation absolute inset-0 z-[13]" aria-hidden="true" />

      <motion.div
        style={shouldUseParallax ? { opacity } : undefined}
        variants={heroStagger}
        initial={shouldUseMotion ? "initial" : false}
        animate={shouldUseMotion ? "animate" : undefined}
        className={heroContentClass}
      >
        <div className={heroCopyShellClass}>
          <div className={heroReadabilityPlateClass} />
          <div className={heroContentGlowClass} />
          <motion.div variants={heroReveal} className={kickerClass}>
            <span className="h-px w-9 bg-current opacity-45" />
            <span>ZJU CAMPUS NETWORK</span>
            <span className="h-px w-9 bg-current opacity-45" />
          </motion.div>
          <motion.h1
            variants={heroReveal}
            className={titleClass}
            style={{ fontFamily: "var(--theme-font-display)" }}
          >
            {defaultTitleSegments ? (
              <>
                <span className="block md:inline">{defaultTitleSegments[0]}</span>
                <span className="block md:inline">{defaultTitleSegments[1]}</span>
              </>
            ) : (
              heroTitle
            )}
          </motion.h1>

          <motion.p variants={heroReveal} className={subtitleClass}>
            {settings.hero_subtitle || "打破信息差，共建信息网络"}
          </motion.p>

          <motion.div variants={heroReveal} className={badgeClass}>
            数字艺术 · 科技社群 · 校园共创
          </motion.div>
        </div>
      </motion.div>

      <motion.button
        type="button"
        style={shouldUseParallax ? { opacity } : undefined}
        whileTap={shouldUseMotion ? tapPress : undefined}
        className={scrollButtonClass}
        onClick={handleScrollNext}
        aria-label="Scroll to content"
      >
        <div
          className={`motion-gpu ${shouldUseMotion ? "motion-scroll-cue" : ""} ${scrollInnerClass}`}
        >
          <ArrowDown className="h-6 w-6" />
        </div>
      </motion.button>
    </section>
  );
};

export default Hero;
