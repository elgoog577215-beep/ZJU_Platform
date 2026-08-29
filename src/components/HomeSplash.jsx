import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import SEO from "./SEO";
import Hero from "./Hero";
import { useSettings } from "../context/SettingsContext";
import { tapPress, useReducedMotion } from "../utils/animations";

const SPLASH_DURATION_MS = 3000;

const HomeSplash = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { settings, uiMode } = useSettings();
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = !prefersReducedMotion;
    const isDayMode = uiMode === "day";
    const timeoutRef = useRef(null);
    const hasEnteredRef = useRef(false);

    const enterPlatform = useCallback(() => {
        if (hasEnteredRef.current) return;
        hasEnteredRef.current = true;

        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        navigate("/events", { replace: true });
    }, [navigate]);

    useEffect(() => {
        const timeoutId = window.setTimeout(enterPlatform, SPLASH_DURATION_MS);
        timeoutRef.current = timeoutId;

        return () => {
            window.clearTimeout(timeoutId);
            if (timeoutRef.current === timeoutId) {
                timeoutRef.current = null;
            }
        };
    }, [enterPlatform]);

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
    const enterButtonClass = isDayMode
        ? "theme-on-dark inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-violet-700 px-5 text-sm font-bold shadow-[0_12px_32px_rgba(76,29,149,0.32)] transition-colors hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300/50"
        : "theme-on-dark inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-indigo-500 px-5 text-sm font-bold shadow-[0_14px_36px_rgba(79,70,229,0.34)] transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/50";

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

            <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] z-30 flex justify-center px-4">
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
        </section>
    );
};

export default HomeSplash;
