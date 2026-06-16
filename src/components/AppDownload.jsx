import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Home,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { isAppRuntime } from "../utils/displayMode";
import { useReducedMotion } from "../utils/animations";
import SEO from "./SEO";

const APK_DOWNLOAD_URL = "/downloads/tuotuzju-android.apk";
const APK_VERSION = "8";
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
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [inAppRuntime, setInAppRuntime] = useState(false);
  const isDayMode = uiMode === "day";
  const shouldAnimate = !reduceMotion;

  useEffect(() => {
    setInAppRuntime(isAppRuntime());
  }, []);

  useEffect(() => {
    if (!inAppRuntime) return undefined;
    const timeoutId = window.setTimeout(() => navigate("/", { replace: true }), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [inAppRuntime, navigate]);

  const downloadUrl = useMemo(() => {
    if (typeof window === "undefined") return APK_DOWNLOAD_URL;
    return new URL(APK_DOWNLOAD_URL, window.location.origin).toString();
  }, []);

  const steps = [
    t("download.steps.open"),
    t("download.steps.allow"),
    t("download.steps.launch"),
  ];

  const trustItems = [
    t("download.trust.official"),
    t("download.trust.twa"),
    t("download.trust.webview_guard"),
  ];

  const palette = isDayMode
    ? {
        page: "bg-[#fbfcff] text-slate-950",
        hero:
          "bg-[radial-gradient(circle_at_82%_10%,rgba(236,72,153,0.13),transparent_26%),radial-gradient(circle_at_16%_78%,rgba(99,102,241,0.1),transparent_28%),linear-gradient(135deg,#ffffff_0%,#f8fbff_58%,#fff7fb_100%)]",
        panel: "border-slate-200/80 bg-white/88 shadow-[0_28px_90px_rgba(15,23,42,0.1)]",
        softPanel: "border-slate-200/80 bg-white/70",
        textSoft: "text-slate-600",
        textMuted: "text-slate-500",
        label: "text-violet-700",
        primary:
          "bg-violet-600 text-white shadow-[0_18px_42px_rgba(124,58,237,0.25)] hover:bg-violet-500",
        secondary:
          "border-slate-300 bg-white/74 text-slate-800 hover:border-violet-300 hover:text-violet-700",
        iconBox: "border-violet-100 bg-violet-50 text-violet-700",
        phone: "border-slate-200 bg-slate-950 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]",
        qr: "border-slate-200 bg-white text-slate-400",
      }
    : {
        page: "bg-[#05070b] text-white",
        hero:
          "bg-[radial-gradient(circle_at_82%_10%,rgba(168,85,247,0.24),transparent_25%),radial-gradient(circle_at_16%_78%,rgba(34,211,238,0.14),transparent_28%),linear-gradient(135deg,#05070b_0%,#0a1020_58%,#080710_100%)]",
        panel: "border-white/10 bg-white/[0.055] shadow-[0_28px_90px_rgba(0,0,0,0.42)]",
        softPanel: "border-white/10 bg-white/[0.04]",
        textSoft: "text-white/72",
        textMuted: "text-white/48",
        label: "text-cyan-200",
        primary:
          "bg-cyan-300 text-slate-950 shadow-[0_18px_42px_rgba(34,211,238,0.2)] hover:bg-cyan-200",
        secondary:
          "border-white/14 bg-white/[0.05] text-white hover:border-cyan-200/40 hover:text-cyan-100",
        iconBox: "border-cyan-200/14 bg-cyan-200/10 text-cyan-100",
        phone: "border-white/10 bg-[#0e1626] text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)]",
        qr: "border-white/10 bg-white/[0.06] text-white/36",
      };

  if (inAppRuntime) {
    return (
      <>
        <SEO
          title={t("download.in_app_meta_title")}
          description={t("download.in_app_meta_desc")}
        />
        <section className={`min-h-screen px-5 pt-28 pb-24 ${palette.page}`}>
          <div className="mx-auto flex min-h-[62vh] max-w-xl flex-col items-center justify-center text-center">
            <div className={`mb-6 inline-flex h-16 w-16 items-center justify-center rounded-lg border ${palette.iconBox}`}>
              <CheckCircle2 size={30} />
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              {t("download.in_app_title")}
            </h1>
            <p className={`mt-4 text-base leading-7 ${palette.textSoft}`}>
              {t("download.in_app_desc")}
            </p>
            <Link
              to="/"
              replace
              className={`mt-8 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-md px-5 text-sm font-bold transition-colors ${palette.primary}`}
            >
              <Home size={18} />
              {t("download.back_home")}
            </Link>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO
        title={t("download.meta_title")}
        description={t("download.meta_desc")}
      />
      <section className={`min-h-screen overflow-hidden ${palette.page}`}>
        <div className={`relative px-5 pt-28 pb-14 md:pt-32 md:pb-20 ${palette.hero}`}>
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
            <motion.div {...reveal(shouldAnimate)}>
              <p className={`text-xs font-black uppercase tracking-[0.28em] ${palette.label}`}>
                {t("download.kicker")}
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight md:text-6xl">
                {t("download.title")}
              </h1>
              <p className={`mt-6 max-w-2xl text-base leading-8 md:text-lg ${palette.textSoft}`}>
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
              className={`relative mx-auto w-full max-w-[360px] rounded-lg border p-4 ${palette.phone}`}
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
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t("download.card_desc")}
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

        <div className="mx-auto grid max-w-6xl gap-5 px-5 py-10 md:grid-cols-[1fr_1fr_320px] md:py-14">
          <motion.div
            {...reveal(shouldAnimate, 0.05)}
            className={`rounded-lg border p-6 ${palette.panel}`}
          >
            <div className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md border ${palette.iconBox}`}>
              <ShieldCheck size={22} />
            </div>
            <h2 className="text-xl font-black">{t("download.safe_title")}</h2>
            <ul className="mt-5 space-y-3">
              {trustItems.map((item) => (
                <li key={item} className={`flex gap-3 text-sm leading-6 ${palette.textSoft}`}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            {...reveal(shouldAnimate, 0.1)}
            className={`rounded-lg border p-6 ${palette.panel}`}
          >
            <div className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md border ${palette.iconBox}`}>
              <Download size={22} />
            </div>
            <h2 className="text-xl font-black">{t("download.install_title")}</h2>
            <ol className="mt-5 space-y-3">
              {steps.map((step, index) => (
                <li key={step} className={`flex gap-3 text-sm leading-6 ${palette.textSoft}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-black ${isDayMode ? "bg-violet-100 text-violet-700" : "bg-white/10 text-cyan-100"}`}>
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </motion.div>

          <motion.aside
            {...reveal(shouldAnimate, 0.15)}
            className={`rounded-lg border p-6 ${palette.softPanel}`}
          >
            <div className={`flex aspect-square items-center justify-center rounded-lg border ${palette.qr}`}>
              <QrCode size={74} strokeWidth={1.5} />
            </div>
            <h2 className="mt-5 text-lg font-black">{t("download.qr_title")}</h2>
            <p className={`mt-3 text-sm leading-6 ${palette.textSoft}`}>
              {t("download.qr_desc")}
            </p>
          </motion.aside>
        </div>
      </section>
    </>
  );
};

export default AppDownload;
