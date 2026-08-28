import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import SEO from "./SEO";
import Hero from "./Hero";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";

const SPLASH_DURATION_MS = 3000;

const HomeSplash = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { settings, uiMode } = useSettings();
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = !prefersReducedMotion;
    const isDayMode = uiMode === "day";

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            navigate("/events", { replace: true });
        }, SPLASH_DURATION_MS);

        return () => window.clearTimeout(timeoutId);
    }, [navigate]);

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
        </section>
    );
};

export default HomeSplash;
