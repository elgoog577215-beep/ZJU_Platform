import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import SEO from "./SEO";
import { useSettings } from "../context/SettingsContext";
import { tapPress, useReducedMotion } from "../utils/animations";

const SPLASH_SEEN_KEY = "site-splash:last-seen-date";
const SPLASH_DURATION_MS = 1500;

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const HomeSplash = () => {
  const navigate = useNavigate();
  const { settings, uiMode } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isDayMode = uiMode === "day";
  const shouldAnimate = !prefersReducedMotion;
  const todayKey = useMemo(() => getTodayKey(), []);

  const enterPlatform = () => {
    if (isRedirecting) return;
    setIsRedirecting(true);

    try {
      window.localStorage.setItem(SPLASH_SEEN_KEY, todayKey);
    } catch {
      // Storage is only used to avoid repeating the splash; navigation should continue.
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

    const timeoutId = window.setTimeout(
      enterPlatform,
      prefersReducedMotion ? 450 : SPLASH_DURATION_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [navigate, prefersReducedMotion, todayKey]);

  const pageClass = isDayMode
    ? "bg-[#f7fbff] text-slate-950"
    : "bg-[#020407] text-white";
  const panelClass = isDayMode
    ? "border-slate-200/80 bg-white/72 shadow-[0_30px_120px_rgba(15,23,42,0.12)]"
    : "border-cyan-300/16 bg-white/[0.045] shadow-[0_0_120px_rgba(34,211,238,0.13)]";
  const mutedClass = isDayMode ? "text-slate-500" : "text-white/58";
  const softClass = isDayMode ? "text-slate-700" : "text-white/72";

  return (
    <section
      className={`relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-4 py-[calc(2rem+env(safe-area-inset-top))] ${pageClass}`}
    >
      <SEO
        title={settings.site_title || "拓途浙享"}
        description="拓途浙享校园 AI 信息共享平台，连接活动、AI 社区、影像记录与实践项目。"
      />

      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute inset-0 ${
            isDayMode
              ? "bg-[linear-gradient(120deg,rgba(255,255,255,0.72),rgba(235,249,255,0.74)_48%,rgba(248,250,252,0.96)),url('/images/hero-landscape-day-4k.jpg')] bg-cover bg-center"
              : "bg-[linear-gradient(120deg,rgba(2,6,23,0.66),rgba(3,18,24,0.74)_48%,rgba(2,4,7,0.94)),url('/images/hero-landscape-day-4k.jpg')] bg-cover bg-center"
          }`}
        />
        <div
          className={`absolute inset-0 opacity-[0.2] ${
            isDayMode
              ? "bg-[linear-gradient(rgba(15,23,42,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)]"
              : "bg-[linear-gradient(rgba(103,232,249,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.1)_1px,transparent_1px)]"
          } bg-[size:48px_48px]`}
        />
        <motion.div
          animate={shouldAnimate ? { x: ["-18%", "18%", "-18%"] } : undefined}
          transition={shouldAnimate ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : undefined}
          className={`absolute inset-y-0 left-1/2 w-px ${isDayMode ? "bg-cyan-500/26" : "bg-cyan-200/28"}`}
        />
        <div className={`absolute inset-x-0 top-0 h-px ${isDayMode ? "bg-cyan-500/30" : "bg-cyan-200/36"}`} />
      </div>

      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 18, scale: 0.985 } : false}
        animate={shouldAnimate ? { opacity: 1, y: 0, scale: 1 } : undefined}
        transition={shouldAnimate ? { duration: 0.62, ease: [0.22, 1, 0.36, 1] } : undefined}
        className={`relative z-10 w-full max-w-[980px] overflow-hidden border px-5 py-7 text-center backdrop-blur-2xl sm:px-8 sm:py-9 md:px-12 md:py-11 ${panelClass}`}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center border border-cyan-300/28 bg-cyan-300/12 text-cyan-300 shadow-[0_0_34px_rgba(103,232,249,0.22)]">
          <Zap className="h-7 w-7" />
        </div>

        <p className={`mt-6 text-[11px] font-black uppercase tracking-[0.34em] ${isDayMode ? "text-cyan-700" : "text-cyan-200"}`}>
          ZJU AI Ecosystem
        </p>
        <h1 className="mx-auto mt-3 max-w-4xl text-[2.45rem] font-black leading-[0.92] tracking-normal min-[380px]:text-[3rem] sm:text-6xl md:text-[5rem]">
          拓途浙享
          <span className={isDayMode ? "block text-cyan-700" : "block text-cyan-200"}>
            信息共享平台
          </span>
        </h1>
        <p className={`mx-auto mt-5 max-w-2xl text-sm font-semibold leading-7 sm:text-lg sm:leading-8 ${softClass}`}>
          连接活动、AI 社区、影像记录与实践项目，让校园资源更快抵达真正需要的人。
        </p>

        <div className="mx-auto mt-7 grid max-w-2xl grid-cols-3 gap-px overflow-hidden border border-cyan-300/18 bg-cyan-300/18 text-left">
          {[
            ["活动", "找机会", CalendarDays],
            ["社区", "找同伴", Sparkles],
            ["实践", "找项目", ArrowRight],
          ].map(([label, value, Icon]) => (
            <div key={label} className={isDayMode ? "bg-white/82 p-3 sm:p-4" : "bg-[#061115]/86 p-3 sm:p-4"}>
              <Icon className={`h-4 w-4 ${isDayMode ? "text-cyan-700" : "text-cyan-200"}`} />
              <div className="mt-3 text-lg font-black leading-none">{label}</div>
              <div className={`mt-1 text-xs font-bold ${mutedClass}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <motion.button
            type="button"
            whileTap={shouldAnimate ? tapPress : undefined}
            onClick={enterPlatform}
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-cyan-300 px-7 text-sm font-black text-slate-950 transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300/25"
          >
            进入活动页
            <ArrowRight className="h-4 w-4" />
          </motion.button>
          <button
            type="button"
            onClick={enterPlatform}
            className={`min-h-12 px-5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-cyan-300/20 ${mutedClass} hover:text-cyan-300`}
          >
            跳过启动动画
          </button>
        </div>
      </motion.div>
    </section>
  );
};

export default HomeSplash;
