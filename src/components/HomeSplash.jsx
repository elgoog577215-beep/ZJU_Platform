import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import SEO from "./SEO";
import Hero from "./Hero";
import { useSettings } from "../context/SettingsContext";
import { tapPress, useReducedMotion } from "../utils/animations";
import { isStandaloneDisplay } from "../utils/displayMode";

const SPLASH_SEEN_KEY = "site-splash:last-seen-date";
const SPLASH_DURATION_MS = 3000;

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const HomeSplash = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const shouldAnimate = !prefersReducedMotion;
  const isDayMode = uiMode === "day";
  const todayKey = useMemo(() => getTodayKey(), []);
  const splashSeconds = Math.round(SPLASH_DURATION_MS / 1000);

  const enterPlatform = useCallback(() => {
    if (isRedirecting) return;
    setIsRedirecting(true);

    try {
      window.localStorage.setItem(SPLASH_SEEN_KEY, todayKey);
    } catch {
      // Storage only prevents replaying today's splash; navigation should continue.
    }

    navigate("/events", { replace: true });
  }, [isRedirecting, navigate, todayKey]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    try {
      if (
        isStandaloneDisplay() ||
        window.localStorage.getItem(SPLASH_SEEN_KEY) === todayKey
      ) {
        navigate("/events", { replace: true });
        return undefined;
      }
    } catch {
      // If storage is unavailable, show the splash once for this render.
    }

    const timeoutId = window.setTimeout(enterPlatform, SPLASH_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [enterPlatform, navigate, todayKey]);

  const pageClass = isDayMode
    ? "relative min-h-[100svh] overflow-hidden bg-white text-slate-950"
    : "relative min-h-[100svh] overflow-hidden bg-slate-950 text-white";
  const revealClass = isDayMode
    ? "pointer-events-none absolute inset-0 z-[28] bg-[linear-gradient(112deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.96)_34%,rgba(253,242,248,0.92)_50%,rgba(245,243,255,0.84)_64%,rgba(255,255,255,0)_100%)]"
    : "pointer-events-none absolute inset-0 z-[28] bg-[linear-gradient(112deg,rgba(2,6,23,0)_0%,rgba(2,6,23,0.96)_34%,rgba(8,47,73,0.76)_50%,rgba(15,23,42,0.92)_64%,rgba(2,6,23,0)_100%)]";
  const revealMotion = isDayMode
    ? {
        initial: { x: "-82%", opacity: 1 },
        animate: { x: "92%", opacity: 0 },
        transition: { duration: 1.18, ease: [0.22, 1, 0.36, 1] },
      }
    : {
        initial: { x: "-74%", opacity: 0.92 },
        animate: { x: "86%", opacity: 0 },
        transition: { duration: 1.02, ease: [0.16, 1, 0.3, 1] },
      };
  const panelClass = isDayMode
    ? "pointer-events-auto flex w-full max-w-[640px] flex-col items-center gap-3 border border-slate-200/80 bg-white/88 px-4 py-3 text-center shadow-[0_18px_46px_rgba(67,56,80,0.1)] backdrop-blur-xl sm:flex-row sm:justify-between sm:text-left"
    : "pointer-events-auto flex w-full max-w-[640px] flex-col items-center gap-3 border border-white/15 bg-slate-950/42 px-4 py-3 text-center shadow-[0_18px_70px_rgba(2,6,23,0.36)] backdrop-blur-xl sm:flex-row sm:justify-between sm:text-left";
  const labelClass = isDayMode
    ? "text-[10px] font-black uppercase tracking-[0.26em] text-violet-700"
    : "text-[10px] font-black uppercase tracking-[0.26em] text-cyan-100/78";
  const copyClass = isDayMode
    ? "mt-1 text-xs font-semibold text-slate-600"
    : "mt-1 text-xs font-semibold text-white/72";
  const enterButtonClass = isDayMode
    ? "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 bg-violet-700 px-4 text-xs font-black text-white transition hover:bg-violet-800 focus:outline-none focus:ring-4 focus:ring-violet-300/35"
    : "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 bg-cyan-300 px-4 text-xs font-black text-slate-950 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300/25";

  return (
    <section className={pageClass}>
      <SEO
        title={settings.site_title || t("home.splash.meta_title")}
        description={t("home.splash.meta_desc")}
      />

      <Hero showScrollCue={false} />

      {shouldAnimate && (
        <motion.div
          aria-hidden="true"
          className={revealClass}
          initial={revealMotion.initial}
          animate={revealMotion.animate}
          transition={revealMotion.transition}
        />
      )}

      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
        animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
        transition={
          shouldAnimate
            ? { delay: 0.72, duration: 0.52, ease: [0.22, 1, 0.36, 1] }
            : undefined
        }
        className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 flex justify-center px-4"
      >
        <div className={panelClass}>
          <div className="min-w-0">
            <div className={labelClass}>
              {t("home.splash.auto_enter", { seconds: splashSeconds })}
            </div>
            <div className={copyClass}>
              {t("home.splash.route_hint")}
            </div>
          </div>
          <motion.button
            type="button"
            whileTap={shouldAnimate ? tapPress : undefined}
            onClick={enterPlatform}
            className={enterButtonClass}
          >
            {t("home.splash.enter_now")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
};

export default HomeSplash;
