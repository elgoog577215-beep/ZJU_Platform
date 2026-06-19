import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Download,
  Smartphone,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";
import SEO from "./SEO";

const APK_DOWNLOAD_URL = "/downloads/tuotuzju-android.apk";
const APK_VERSION = "9";
const APK_UPDATED_AT = "2026-06-17";

const reveal = (enabled, delay = 0) => {
  if (!enabled) return {};

  return {
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
  };
};

const AppDownload = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const reduceMotion = useReducedMotion();
  const isDayMode = uiMode === "day";
  const shouldAnimate = !reduceMotion;

  const downloadUrl = useMemo(() => {
    if (typeof window === "undefined") return APK_DOWNLOAD_URL;
    return new URL(APK_DOWNLOAD_URL, window.location.origin).toString();
  }, []);

  const palette = isDayMode
    ? {
        page: "bg-[#fbfcff] text-slate-950",
        hero:
          "bg-[radial-gradient(circle_at_82%_10%,rgba(236,72,153,0.13),transparent_26%),radial-gradient(circle_at_16%_78%,rgba(99,102,241,0.1),transparent_28%),linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#fff7fb_100%)]",
        textSoft: "text-slate-600",
        textMuted: "text-slate-500",
        label: "text-violet-700",
        primary:
          "bg-violet-600 text-white shadow-[0_18px_42px_rgba(124,58,237,0.25)] hover:bg-violet-500",
        secondary:
          "border-slate-300 bg-white/74 text-slate-800 hover:border-violet-300 hover:text-violet-700",
        phone: "border-slate-200 bg-slate-950 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]",
      }
    : {
        page: "bg-[#05070b] text-white",
        hero:
          "bg-[radial-gradient(circle_at_82%_10%,rgba(168,85,247,0.24),transparent_25%),radial-gradient(circle_at_16%_78%,rgba(34,211,238,0.14),transparent_28%),linear-gradient(135deg,#05070b_0%,#0a1020_58%,#080710_100%)]",
        textSoft: "text-white/72",
        textMuted: "text-white/48",
        label: "text-cyan-200",
        primary:
          "bg-cyan-300 text-slate-950 shadow-[0_18px_42px_rgba(34,211,238,0.2)] hover:bg-cyan-200",
        secondary:
          "border-white/14 bg-white/[0.05] text-white hover:border-cyan-200/40 hover:text-cyan-100",
        phone: "border-white/10 bg-[#0e1626] text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)]",
      };

  return (
    <>
      <SEO
        title={t("download.meta_title")}
        description={t("download.meta_desc")}
      />
      <section className={`min-h-screen overflow-hidden ${palette.page}`}>
        <div className={`relative flex min-h-screen items-center px-5 pt-24 pb-16 md:pt-28 ${palette.hero}`}>
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
            <motion.div {...reveal(shouldAnimate)}>
              <p className={`text-xs font-black uppercase tracking-[0.28em] ${palette.label}`}>
                {t("download.kicker")}
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight md:text-6xl">
                {t("download.title")}
              </h1>
              <p className={`mt-5 max-w-xl text-base leading-7 md:text-lg ${palette.textSoft}`}>
                {t("download.subtitle")}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={downloadUrl}
                  download
                  className={`inline-flex min-h-[50px] items-center justify-center gap-2 rounded-md px-6 text-sm font-black transition-colors ${palette.primary}`}
                >
                  <Download size={18} />
                  {t("download.primary_action")}
                </a>
                <Link
                  to="/"
                  className={`inline-flex min-h-[50px] items-center justify-center gap-2 rounded-md border px-6 text-sm font-bold transition-colors ${palette.secondary}`}
                >
                  {t("download.browse_web")}
                  <ArrowRight size={17} />
                </Link>
              </div>
              <p className={`mt-4 text-xs leading-6 ${palette.textMuted}`}>
                {t("download.file_note", {
                  version: APK_VERSION,
                  date: APK_UPDATED_AT,
                })}
              </p>
            </motion.div>

            <motion.div
              {...reveal(shouldAnimate, 0.08)}
              className={`relative mx-auto w-full max-w-[340px] rounded-lg border p-4 ${palette.phone}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold opacity-60">
                    {t("download.preview_label")}
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {t("download.app_name")}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white text-slate-950">
                  <Smartphone size={22} />
                </div>
              </div>
              <div className="rounded-md bg-white p-3 text-slate-950">
                <img
                  src="/newlogo.png"
                  alt={t("nav.logo_alt")}
                  className="h-12 w-auto"
                />
                <p className="mt-8 text-2xl font-black leading-tight">
                  {t("download.card_title")}
                </p>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {[
                    t("download.preview_events"),
                    t("download.preview_ai"),
                    t("download.preview_media"),
                  ].map((label) => (
                    <div
                      key={label}
                      className="rounded-md bg-slate-100 px-2 py-3 text-center text-[11px] font-bold text-slate-600"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AppDownload;
