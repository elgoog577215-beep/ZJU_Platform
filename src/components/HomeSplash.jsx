import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import SEO from "./SEO";
import Hero from "./Hero";
import { useSettings } from "../context/SettingsContext";
import { tapPress, useReducedMotion } from "../utils/animations";

const SPLASH_SEEN_KEY = "site-splash:last-seen-date";
const SPLASH_DURATION_MS = 3000;

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const HomeSplash = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const shouldAnimate = !prefersReducedMotion;
  const todayKey = useMemo(() => getTodayKey(), []);

  const enterPlatform = () => {
    if (isRedirecting) return;
    setIsRedirecting(true);

    try {
      window.localStorage.setItem(SPLASH_SEEN_KEY, todayKey);
    } catch {
      // Storage only prevents replaying today's splash; navigation should continue.
    }

    navigate("/events", { replace: true });
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    try {
      if (window.localStorage.getItem(SPLASH_SEEN_KEY) === todayKey) {
        navigate("/events", { replace: true });
        return undefined;
      }
    } catch {
      // If storage is unavailable, show the splash once for this render.
    }

    const timeoutId = window.setTimeout(enterPlatform, SPLASH_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [navigate, todayKey]);

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-slate-950 text-white">
      <SEO
        title={settings.site_title || "拓途浙享"}
        description="拓途浙享校园 AI 信息共享平台，连接活动、AI 社区、影像记录与实践项目。"
      />

      <Hero showScrollCue={false} />

      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
        animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
        transition={shouldAnimate ? { delay: 0.72, duration: 0.52, ease: [0.22, 1, 0.36, 1] } : undefined}
        className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 flex justify-center px-4"
      >
        <div className="pointer-events-auto flex w-full max-w-[640px] flex-col items-center gap-3 border border-white/15 bg-slate-950/38 px-4 py-3 text-center shadow-[0_18px_70px_rgba(2,6,23,0.36)] backdrop-blur-xl sm:flex-row sm:justify-between sm:text-left">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-100/78">
              3 秒后进入活动页
            </div>
            <div className="mt-1 text-xs font-semibold text-white/72">
              从这里进入平台主资源流，活动、社区和影像库都可以继续访问。
            </div>
          </div>
          <motion.button
            type="button"
            whileTap={shouldAnimate ? tapPress : undefined}
            onClick={enterPlatform}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 bg-cyan-300 px-4 text-xs font-black text-slate-950 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300/25"
          >
            直接进入
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
};

export default HomeSplash;
