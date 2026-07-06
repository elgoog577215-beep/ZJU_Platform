import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Github,
  RefreshCw,
  Trophy,
  Upload,
  X,
} from "lucide-react";

import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import { useSectionPager } from "../hooks/useSectionPager";
import { useReducedMotion } from "../utils/animations";
import CompetitionOutcomeUploadModal from "./CompetitionOutcomeUploadModal";
import SEO from "./SEO";
import { useTranslation } from "react-i18next";
import { isMiniProgramWebView } from "../utils/miniProgramEnv";

const fallbackCover = "/images/hero-landscape-day-4k.jpg";

const rankTone = {
  "01": "from-amber-300 via-cyan-200 to-white",
  "02": "from-cyan-200 via-sky-300 to-white",
  "03": "from-fuchsia-200 via-cyan-200 to-white",
};

const worksSectionIds = ["works-hero", "works-featured", "works-more"];

const normalizeRank = (rank, index) => {
  const value = String(rank || index + 1).trim();
  return /^\d+$/.test(value) ? value.padStart(2, "0") : value;
};

const normalizeWork = (work, index, t) => ({
  ...work,
  rank: normalizeRank(work.rank, index),
  award: work.award || t("hackathon.works_page.fallback_award"),
  honorTitle: work.honor_title || work.honorTitle || work.award || t("hackathon.works_page.fallback_honor"),
  gitUrl: work.git_url || work.gitUrl || "",
  cover: work.cover_url || work.cover || fallbackCover,
  author: work.author || work.uploader_name || t("hackathon.works_page.fallback_author"),
  boundIdentityName: work.bound_identity_name || work.boundIdentityName || "",
  boundIdentityType: work.bound_identity_type || work.boundIdentityType || "",
  summary: work.summary || work.description || work.gameDescription || "",
  grade: work.grade || "",
  major: work.major || "",
  highlight: work.highlight || "",
  experience: work.experience || "",
  storyFileUrl: work.story_file_url || work.storyFileUrl || "",
});

const WorkCover = ({ work, featured = false, isDayMode = false, onOpen, t }) => (
  <button
    type="button"
    onClick={() => onOpen?.(work)}
    className={`relative block w-full overflow-hidden bg-[#061113] text-left ${featured ? "aspect-[16/10]" : "aspect-[16/11]"}`}
    aria-label={t("hackathon.works_page.view_work_aria", { title: work.title })}
  >
    <img
      src={work.cover}
      alt={t("hackathon.works_page.cover_alt", { title: work.title })}
      className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-[1.035]"
      style={{ filter: isDayMode ? "brightness(0.88) saturate(1.08) contrast(1.02)" : "brightness(0.66) saturate(1.16) contrast(1.08)" }}
      loading={featured ? "eager" : "lazy"}
    />
    <div
      className={`absolute inset-0 ${
        isDayMode
          ? "bg-[linear-gradient(180deg,rgba(248,251,255,0.02),rgba(15,23,42,0.50)),radial-gradient(circle_at_18%_0%,rgba(8,145,178,0.20),transparent_34%)]"
          : "bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.76)),radial-gradient(circle_at_18%_0%,rgba(103,232,249,0.28),transparent_34%)]"
      }`}
    />
    <span className="absolute right-4 top-2 font-mono text-[clamp(4rem,8vw,7.25rem)] font-black leading-none text-white/[0.10]">
      {work.rank}
    </span>
    <div className="absolute left-4 top-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-2 border border-cyan-200/32 bg-black/42 px-3 py-2 text-xs font-black uppercase text-cyan-100 backdrop-blur">
      <Trophy className="h-4 w-4" />
      <span className="truncate">{work.award}</span>
    </div>
    <div className="absolute bottom-4 left-4 right-4">
      <p className="line-clamp-2 max-w-[85%] text-xl font-black leading-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]">
        {work.title}
      </p>
      <span className="mt-3 inline-flex min-h-9 items-center border border-white/18 bg-white/12 px-3 text-xs font-black text-white opacity-0 backdrop-blur transition duration-300 group-hover:opacity-100">
        {t("hackathon.works_page.view_details")}
      </span>
    </div>
  </button>
);

const WorkCard = ({ work, featured = false, isDayMode = false, onOpen, t }) => {
  const panelClass = isDayMode
    ? "border-cyan-200/70 bg-white/88 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
    : "border-cyan-300/[0.18] bg-[#061014]/88 text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)]";
  const mutedClass = isDayMode ? "text-slate-600" : "text-white/64";
  const actionClass = isDayMode
    ? "border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-600 hover:bg-cyan-600 hover:text-white"
    : "border-cyan-300/24 bg-cyan-300/[0.08] text-cyan-100 hover:border-cyan-200 hover:bg-cyan-300 hover:text-slate-950";
  const rankClass = rankTone[work.rank] || "from-cyan-200 to-white";
  const honorClass = isDayMode
    ? "border-cyan-200 bg-cyan-50 text-cyan-800"
    : "border-cyan-300/24 bg-cyan-300/[0.10] text-cyan-100";

  return (
    <article className={`group flex h-full flex-col overflow-hidden border ${panelClass} transition duration-300 hover:-translate-y-1 hover:border-cyan-300/60`}>
      <WorkCover work={work} featured={featured} isDayMode={isDayMode} onOpen={onOpen} t={t} />
      <div className={`flex flex-1 flex-col ${featured ? "p-6 lg:p-7" : "p-5"}`}>
        <div className={`mb-4 h-1 w-full bg-gradient-to-r ${rankClass}`} />
        <h2 className={featured ? "text-3xl font-black leading-tight lg:text-4xl" : "line-clamp-2 min-h-[4rem] text-2xl font-black leading-tight"}>
          {work.title}
        </h2>
        <p className={`mt-3 text-sm font-bold ${mutedClass}`}>
          {work.author}
          {work.boundIdentityName ? ` · ${work.boundIdentityName}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`border px-2.5 py-1 text-xs font-black ${honorClass}`}>
            {work.honorTitle}
          </span>
          {[work.grade, work.major].filter(Boolean).map((item) => (
            <span
              key={item}
              className={`border px-2.5 py-1 text-xs font-bold ${isDayMode ? "border-slate-200 text-slate-600" : "border-white/10 text-white/58"}`}
            >
              {item}
            </span>
          ))}
        </div>
        {work.highlight ? (
          <p className={`mt-3 border-l-2 border-cyan-300 pl-3 text-sm font-semibold leading-6 ${isDayMode ? "text-slate-700" : "text-cyan-100/84"}`}>
            {work.highlight}
          </p>
        ) : null}
        {work.summary ? (
          <p className={`mt-3 line-clamp-3 text-sm leading-6 ${mutedClass}`}>{work.summary}</p>
        ) : null}
        <div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onOpen?.(work)}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 border px-4 text-sm font-black transition ${actionClass}`}
          >
            <BookOpen className="h-4 w-4" />
            {t("hackathon.works_page.view_story")}
          </button>
          {work.gitUrl ? (
            <a
              href={work.gitUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex min-h-11 w-full items-center justify-center gap-2 border px-4 text-sm font-black transition ${actionClass}`}
            >
              <Github className="h-4 w-4" />
              {t("hackathon.works_page.project_link")}
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
};

const WorkDetailModal = ({ work, isDayMode, onClose, t }) => {
  useEffect(() => {
    if (!work || typeof document === "undefined") return undefined;
    if (isMiniProgramWebView()) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [work, onClose]);

  if (!work) return null;

  const shellClass = isDayMode
    ? "border-cyan-200 bg-white text-slate-950 shadow-[0_30px_100px_rgba(15,23,42,0.24)]"
    : "border-cyan-300/18 bg-[#061014] text-white shadow-[0_30px_100px_rgba(0,0,0,0.64)]";
  const mutedClass = isDayMode ? "text-slate-600" : "text-white/64";
  const paragraphClass = isDayMode ? "text-slate-700" : "text-white/76";
  const detailStats = [
    [t("hackathon.works_page.rank"), work.rank ? `#${work.rank}` : t("hackathon.works_page.not_marked")],
    [t("hackathon.works_page.honor"), work.honorTitle || work.award || t("hackathon.works_page.fallback_award")],
    [t("hackathon.works_page.builder"), work.author || t("hackathon.works_page.fallback_author")],
    [t("hackathon.works_page.major"), [work.grade, work.major].filter(Boolean).join(" / ") || t("hackathon.works_page.not_filled")],
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[170] flex items-end justify-center bg-black/72 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("hackathon.works_page.work_detail", { title: work.title })}
      onMouseDown={onClose}
    >
      <article
        className={`grid h-[100svh] w-full overflow-hidden border ${shellClass} sm:h-[88svh] sm:max-h-[820px] sm:max-w-6xl sm:rounded-2xl lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative min-h-[34svh] overflow-hidden bg-[#061113] sm:min-h-[420px] lg:min-h-0">
          <img
            src={work.cover}
            alt={t("hackathon.works_page.preview_alt", { title: work.title })}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: isDayMode ? "brightness(0.9) saturate(1.06)" : "brightness(0.72) saturate(1.14) contrast(1.04)" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.72)),radial-gradient(circle_at_18%_0%,rgba(103,232,249,0.24),transparent_34%)]" />
          <span className="absolute right-5 top-4 font-mono text-[clamp(5rem,12vw,10rem)] font-black leading-none text-white/[0.10]">
            {work.rank}
          </span>
          <div className="absolute bottom-5 left-5 right-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="border border-cyan-300/24 bg-cyan-300 px-3 py-1.5 text-xs font-black text-slate-950">
                {work.honorTitle}
              </span>
              {work.award ? <span className="border border-cyan-300/24 bg-black/36 px-3 py-1.5 text-xs font-bold text-cyan-100 backdrop-blur">{work.award}</span> : null}
            </div>
            <h2 className="max-w-3xl text-3xl font-black leading-tight text-white drop-shadow-[0_5px_24px_rgba(0,0,0,0.5)] sm:text-5xl">
              {work.title}
            </h2>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-cyan-300/16 px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Winner Story</p>
              <p className={`mt-2 text-sm font-bold ${mutedClass}`}>
                {[work.author, work.grade, work.major].filter(Boolean).join(" / ")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center border transition ${
                isDayMode ? "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
              aria-label={t("common.close")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid grid-cols-2 gap-2">
              {detailStats.map(([label, value]) => (
                <div
                  key={label}
                  className={`border px-3 py-3 ${isDayMode ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-white/[0.045]"}`}
                >
                  <p className={`text-[11px] font-black uppercase ${isDayMode ? "text-slate-500" : "text-white/42"}`}>{label}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-black leading-5">{value}</p>
                </div>
              ))}
            </div>
            {work.highlight ? (
              <blockquote className="mt-6 border-l-4 border-cyan-300 pl-4 text-lg font-black leading-8">
                {work.highlight}
              </blockquote>
            ) : null}
            <section className="mt-6 grid gap-3">
              <h3 className="text-lg font-black">{t("hackathon.works_page.work_intro")}</h3>
              <p className={`whitespace-pre-line text-sm leading-7 ${paragraphClass}`}>{work.summary || t("hackathon.works_page.empty_intro")}</p>
            </section>
            <section className="mt-6 grid gap-3">
              <h3 className="text-lg font-black">{t("hackathon.works_page.story")}</h3>
              <p className={`whitespace-pre-line text-sm leading-7 ${paragraphClass}`}>
                {work.experience || t("hackathon.works_page.empty_story")}
              </p>
            </section>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-cyan-300/16 px-5 py-4 sm:px-6">
            {work.gitUrl ? (
              <a href={work.gitUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-white sm:w-auto">
                <Github className="h-4 w-4" />
                {t("hackathon.works_page.project_link")}
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
            {work.storyFileUrl ? (
              <a href={work.storyFileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-cyan-300/24 px-4 text-sm font-black transition hover:border-cyan-300 sm:w-auto">
                <BookOpen className="h-4 w-4" />
                {t("hackathon.works_page.story_file")}
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </div>,
    document.body,
  );
};

const HackathonWorks = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const reduceMotion = useReducedMotion();
  const isDayMode = uiMode === "day";
  const pageRef = useRef(null);
  const [works, setWorks] = useState([]);
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const setActiveWorkSection = useCallback((index) => {
    setActiveSection((previous) => (previous === index ? previous : index));
  }, []);

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/competitions/current/outcome");
      const nextWorks = Array.isArray(response.data?.works)
        ? response.data.works.map((work, index) => normalizeWork(work, index, t))
        : [];
      setWorks(nextWorks);
      setCompetition(response.data?.competition || null);
    } catch {
      setWorks([]);
      setCompetition(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  useEffect(() => {
    const container = pageRef.current;
    if (!container) return undefined;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      const nextProgress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setScrollProgress((previous) =>
        Math.abs(previous - nextProgress) < 0.35 ? previous : nextProgress,
      );

      const sectionElements = worksSectionIds
        .map((id) => document.getElementById(id))
        .filter(Boolean);

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const rect = sectionElements[i].getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2) {
          setActiveWorkSection(i);
          break;
        }
      }
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [setActiveWorkSection]);

  useSectionPager({
    containerRef: pageRef,
    sectionIds: worksSectionIds,
    setActiveIndex: setActiveWorkSection,
    reduceMotion,
    minWidth: 0,
    lockMs: 860,
  });

  const podiumWorks = useMemo(() => works.slice(0, 3), [works]);
  const otherWorks = useMemo(() => works.slice(3), [works]);
  const chromeClass = isDayMode
    ? "border-emerald-200 bg-white/72 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-600 hover:text-white"
    : "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-100 hover:border-cyan-300/60 hover:bg-cyan-300 hover:text-slate-950";
  const chipClass = isDayMode
    ? "border-emerald-200 bg-white/72 text-emerald-700"
    : "border-cyan-300/24 bg-cyan-300/[0.06] text-cyan-100";
  const statLabelClass = isDayMode ? "text-slate-600" : "text-white/58";
  const sectionNavItems = loading || works.length === 0
    ? [{ id: "works-hero", label: t("hackathon.works_page.title"), no: "01" }]
    : [
        { id: "works-hero", label: t("hackathon.works_page.title"), no: "01" },
        { id: "works-featured", label: t("hackathon.works_page.featured_title"), no: "02" },
        { id: "works-more", label: t("hackathon.works_page.more_title"), no: "03" },
      ];

  const smoothScrollTo = (id) => {
    const target = document.getElementById(id);
    const scroller = pageRef.current;
    if (!target || !scroller) return;

    const targetIndex = worksSectionIds.indexOf(id);
    if (targetIndex >= 0) setActiveWorkSection(targetIndex);

    scroller.scrollTo({
      top: Math.max(target.offsetTop, 0),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <div
      className={`day-page-theme day-page-theme-tech relative h-[100svh] min-h-[100svh] overflow-hidden ${
        isDayMode ? "bg-[#f4fbf7] text-slate-950" : "bg-[#020405] text-white"
      }`}
      style={{
        fontFamily:
          '"Inter", "HarmonyOS Sans SC", "MiSans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      }}
    >
      <SEO
        title={t("hackathon.works_page.meta_title")}
        description={t("hackathon.works_page.meta_desc")}
        image="/images/hero-landscape-day-4k.jpg"
      />
      <div className="pointer-events-none fixed inset-0">
        <div className={`absolute inset-0 bg-[size:72px_72px] opacity-50 ${
          isDayMode
            ? "bg-[linear-gradient(rgba(16,185,129,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.06)_1px,transparent_1px)]"
            : "bg-[linear-gradient(rgba(103,232,249,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.055)_1px,transparent_1px)]"
        }`} />
        <div className="absolute right-[4vw] top-28 font-mono text-[18vw] font-black leading-none text-white/[0.035]">
          {String(works.length || 0).padStart(2, "0")}
        </div>
      </div>

      <div className="fixed left-0 right-0 top-[env(safe-area-inset-top)] z-50 h-0.5">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {sectionNavItems.length > 1 ? (
        <nav
          data-works-section-nav
          className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 xl:flex min-[1720px]:right-6 min-[1720px]:gap-4"
          aria-label={t("hackathon.works_page.meta_title")}
        >
          {sectionNavItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => smoothScrollTo(item.id)}
              className={`group relative flex items-center gap-3 transition-all duration-300 ${
                activeSection === index ? "pointer-events-none" : ""
              }`}
              aria-label={item.label}
            >
              <span
                className={`absolute right-full mr-3 whitespace-nowrap text-xs font-bold uppercase tracking-wider opacity-0 transition-all duration-300 group-hover:opacity-100 ${
                  activeSection === index ? "opacity-100" : ""
                } ${isDayMode ? "text-slate-600" : "text-white/60"}`}
              >
                {item.label}
              </span>
              <div className="relative overflow-hidden rounded-full">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black transition-all duration-300 min-[1720px]:h-10 min-[1720px]:w-10 ${
                    activeSection === index
                      ? isDayMode
                        ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                        : "border-cyan-400 bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-200/20"
                      : isDayMode
                        ? "border-slate-200 bg-white/80 text-slate-400 hover:border-emerald-400 hover:text-emerald-600"
                        : "border-white/10 bg-white/5 text-white/30 hover:border-cyan-400 hover:text-cyan-300"
                  }`}
                >
                  {activeSection === index ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-current" />
                  ) : (
                    <span className="text-[10px]">{item.no}</span>
                  )}
                </div>
                {activeSection === index ? (
                  <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
                ) : null}
              </div>
            </button>
          ))}
        </nav>
      ) : null}

      <main
        ref={pageRef}
        className={`hackathon-registration-scroll relative h-[100svh] min-w-0 max-w-full snap-y snap-proximity overflow-y-auto overflow-x-hidden scroll-smooth overscroll-y-contain ${
          isDayMode ? "bg-[#f4fbf7]/70" : "bg-[#020405]/70"
        }`}
      >
        <section
          id="works-hero"
          className="relative flex min-h-[100svh] min-w-0 max-w-full snap-start snap-always items-center overflow-x-clip px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-[calc(env(safe-area-inset-top)+6.5rem)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top)+7rem)] lg:px-10 lg:pt-[calc(env(safe-area-inset-top)+7.5rem)] 2xl:px-16"
        >
          <div className="relative mx-auto grid w-full max-w-[1760px] gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)] xl:items-end">
            <div>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/hackathon/showcase"
                  className={`inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-black transition ${chromeClass}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("hackathon.works_page.back_to_showcase")}
                </Link>
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className={`inline-flex min-h-11 items-center gap-2 px-4 text-sm font-black transition ${
                    isDayMode
                      ? "bg-emerald-600 text-white hover:bg-slate-950"
                      : "bg-cyan-300 text-slate-950 hover:bg-white"
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  {t("hackathon.works_page.submit")}
                </button>
              </div>
              <p className={`mt-8 inline-flex border px-3 py-2 text-xs font-black uppercase ${chipClass}`}>
                Winner Stories / {works.length} Selected
              </p>
              <h1 className="mt-5 max-w-5xl text-[clamp(3rem,12vw,5rem)] font-black leading-none sm:text-[clamp(4.25rem,8vw,7rem)] lg:text-8xl">
                {t("hackathon.works_page.title")}
              </h1>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:gap-3 xl:min-w-[420px]">
              {[
                [String(works.length), t("hackathon.works_page.stats_published")],
                [String(podiumWorks.length), t("hackathon.works_page.stats_featured")],
                [competition ? "1" : "0", t("hackathon.works_page.stats_competition")],
              ].map(([value, label]) => (
                <div key={label} className="border border-cyan-300/16 bg-cyan-300/[0.045] px-3 py-3 sm:px-4 sm:py-4">
                  <p className="font-mono text-2xl font-black text-cyan-200 sm:text-3xl">{value}</p>
                  <p className={`mt-1 text-xs font-bold ${statLabelClass}`}>{label}</p>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="xl:col-span-2 border-t border-cyan-300/18 py-12 text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                <p className={`mt-4 text-sm font-bold ${statLabelClass}`}>{t("hackathon.works_page.loading")}</p>
              </div>
            ) : works.length === 0 ? (
              <div className="xl:col-span-2 border-t border-cyan-300/18 py-12 text-center">
                <Trophy className="mx-auto h-12 w-12 text-cyan-200" />
                <h2 className="mt-5 text-3xl font-black">{t("hackathon.works_page.empty_title")}</h2>
                <p className={`mx-auto mt-3 max-w-xl text-sm leading-6 ${statLabelClass}`}>
                  {t("hackathon.works_page.empty_desc")}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {!loading && works.length > 0 ? (
          <>
            <section
              id="works-featured"
              className="relative flex min-h-[100svh] min-w-0 max-w-full snap-start snap-always items-center overflow-x-clip px-4 py-12 sm:px-6 sm:py-14 lg:px-10 xl:py-16 2xl:px-16"
            >
              <div className="relative mx-auto w-full max-w-[1760px]">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-black sm:text-3xl">{t("hackathon.works_page.featured_title")}</h2>
                  <span className="text-xs font-black uppercase text-cyan-200/72">Top 3</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 min-[900px]:grid-cols-3">
                  {podiumWorks.map((work) => (
                    <WorkCard key={work.id} work={work} featured isDayMode={isDayMode} onOpen={setSelectedWork} t={t} />
                  ))}
                </div>
              </div>
            </section>

            <section
              id="works-more"
              className="relative min-h-[100svh] min-w-0 max-w-full snap-start snap-always overflow-x-clip border-t border-cyan-300/18 px-4 pb-[calc(env(safe-area-inset-bottom)+9rem)] pt-12 sm:px-6 sm:pt-14 md:pb-24 lg:px-10 xl:pt-16 2xl:px-16"
            >
              <div className="relative mx-auto w-full max-w-[1760px]">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-black sm:text-3xl">{t("hackathon.works_page.more_title")}</h2>
                  <span className="text-xs font-black uppercase text-cyan-200/72">{otherWorks.length} Works</span>
                </div>
                {otherWorks.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {otherWorks.map((work) => (
                      <WorkCard key={work.id} work={work} isDayMode={isDayMode} onOpen={setSelectedWork} t={t} />
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm font-bold ${statLabelClass}`}>{t("hackathon.works_page.no_more")}</p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </main>

      <WorkDetailModal work={selectedWork} isDayMode={isDayMode} onClose={() => setSelectedWork(null)} t={t} />
      <CompetitionOutcomeUploadModal
        open={uploadOpen}
        initialType="work"
        onClose={() => setUploadOpen(false)}
        onSubmitted={fetchWorks}
      />
    </div>
  );
};

export default HackathonWorks;
