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
        <div className={`relative flex min-h-screen items-start px-5 pb-24 pt-[calc(env(safe-area-inset-top)+76px)] md:items-center md:pb-16 md:pt-28 ${palette.hero}`}>
          <div className="mx-auto grid w-full max-w-6xl items-center gap-6 md:gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
            <motion.div {...reveal(shouldAnimate)}>
              <p className={`text-xs font-black uppercase tracking-[0.28em] ${palette.label}`}>
                {t("download.kicker")}
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black leading-[1.04] tracking-tight md:mt-5 md:text-6xl">
                {t("download.title")}
              </h1>
              <p className={`mt-3 max-w-xl text-sm leading-6 md:mt-5 md:text-lg md:leading-7 ${palette.textSoft}`}>
                {t("download.subtitle")}
              </p>
              <div className="mt-5 grid grid-cols-[1.12fr_0.88fr] gap-2.5 md:mt-8 md:flex md:gap-3">
                <a
                  href={downloadUrl}
                  download
                  className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-black transition-colors md:min-h-[50px] md:gap-2 md:px-6 md:text-sm ${palette.primary}`}
                >
                  <Download size={16} className="md:h-[18px] md:w-[18px]" />
                  {t("download.primary_action")}
                </a>
                <Link
                  to="/"
                  className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-colors md:min-h-[50px] md:gap-2 md:px-6 md:text-sm ${palette.secondary}`}
                >
                  {t("download.browse_web")}
                  <ArrowRight size={15} className="md:h-[17px] md:w-[17px]" />
                </Link>
              </div>
              <p className={`mt-3 text-xs leading-5 md:mt-4 md:leading-6 ${palette.textMuted}`}>
                {t("download.file_note", {
                  version: APK_VERSION,
                  date: APK_UPDATED_AT,
                })}
              </p>
            </motion.div>

            <motion.div
              {...reveal(shouldAnimate, 0.08)}
              className={`relative mx-auto w-full max-w-[300px] rounded-lg border p-3 md:max-w-[340px] md:p-4 ${palette.phone}`}
            >
              <div className="mb-3 flex items-center justify-between md:mb-4">
                <div>
                  <p className="text-xs font-semibold opacity-60">
                    {t("download.preview_label")}
                  </p>
                  <p className="mt-1 text-base font-black md:text-lg">
                    {t("download.app_name")}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-slate-950 md:h-11 md:w-11">
                  <Smartphone size={18} className="md:h-[22px] md:w-[22px]" />
                </div>
              </div>
              <div className="rounded-md bg-white p-2.5 text-slate-950 md:p-3">
                <img
                  src="/newlogo.png"
                  alt={t("nav.logo_alt")}
                  className="h-9 w-auto md:h-12"
                />
                <p className="mt-5 text-xl font-black leading-tight md:mt-8 md:text-2xl">
                  {t("download.card_title")}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-1.5 md:mt-6 md:gap-2">
                  {[
                    t("download.preview_events"),
                    t("download.preview_ai"),
                    t("download.preview_media"),
                  ].map((label) => (
                    <div
                      key={label}
                      className="rounded-md bg-slate-100 px-1.5 py-2 text-center text-[10px] font-bold text-slate-600 md:px-2 md:py-3 md:text-[11px]"
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
