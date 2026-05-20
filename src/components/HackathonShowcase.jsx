import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CircuitBoard,
  Download,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Play,
  Radar,
  Sparkles,
  Trophy,
  Upload,
  Users,
} from "lucide-react";

import { podiumWorks as fallbackPodiumWorks } from "../data/hackathonWorks";
import { useSettings } from "../context/SettingsContext";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import { useReducedMotion } from "../utils/animations";
import api from "../services/api";
import CompetitionOutcomeUploadModal from "./CompetitionOutcomeUploadModal";
import SEO from "./SEO";

const HERO_IMAGE = "/images/hero-campus-day-4k.jpg";
const SECONDARY_IMAGE = "/images/hero-landscape-day-4k.jpg";

const eventStats = [
  { value: "5", unit: "小时", label: "极速交付" },
  { value: "1", unit: "个人", label: "独立完成" },
  { value: "0", unit: "路演", label: "只看作品" },
  { value: "17,500", shortValue: "1.75万", unit: "¥", label: "奖金池" },
];

const mediaMoments = [
  {
    id: "opening",
    label: "开幕式",
    title: "规则发布，赛场启动",
    caption: "主办方说明赛制、时间与交付标准，所有选手进入同一条 5 小时冲刺线。",
    image: HERO_IMAGE,
  },
  {
    id: "builders",
    label: "选手特写",
    title: "从提示词到产品上线",
    caption: "AI 工具链辅助架构、代码、调试和演示素材，现场节奏进入冲刺模式。",
    image: SECONDARY_IMAGE,
  },
  {
    id: "speech",
    label: "领导讲话",
    title: "高校 AI 创新现场",
    caption: "从人才培养、工具生态和真实问题出发，见证校园 AI 应用实践。",
    image: HERO_IMAGE,
  },
  {
    id: "awards",
    label: "颁奖典礼",
    title: "作品优先，成果说话",
    caption: "获奖作品、评委点评和合影构成赛后传播的核心证明。",
    image: SECONDARY_IMAGE,
  },
  {
    id: "exchange",
    label: "交流环节",
    title: "把灵感留到赛后继续生长",
    caption: "选手、评委、社群与合作伙伴在赛后连接下一次共创。",
    image: HERO_IMAGE,
  },
];

const actionLinks = [
  { label: "完整相册", detail: "开幕式、开发现场、颁奖、交流分组", icon: ImageIcon },
  { label: "媒体包下载", detail: "新闻稿、精选照片、合作方露出", icon: Download },
  { label: "后续活动", detail: "加入社群，继续参与 AI 共创", icon: Sparkles },
];

const showcaseSections = [
  { id: "gate", no: "01", label: "SIGNAL GATE", title: "首页" },
  { id: "gallery", no: "02", label: "GALLERY", title: "赛场" },
  { id: "works", no: "03", label: "WORKS INDEX", title: "作品" },
  { id: "partners", no: "04", label: "ECOSYSTEM", title: "共创" },
];

const partnerDisplayName = (logo) => {
  if (logo.text) return logo.text;
  if (logo.name) return logo.name;
  return String(logo.alt || "").replace(/\s*logo$/i, "").trim();
};

const normalizeShowcaseRank = (rank, index) => {
  const value = String(rank || index + 1).trim();
  return /^\d+$/.test(value) ? value.padStart(2, "0") : value;
};

const MotionSection = motion.section;
const MotionDiv = motion.div;

const StageAtmosphere = ({ word, align = "right" }) => (
  <div className="showcase-stage-atmosphere" aria-hidden="true">
    <div className="showcase-stage-grid" />
    <div className={`showcase-stage-word showcase-stage-word--${align}`}>{word}</div>
    <div className="showcase-stage-glow showcase-stage-glow--a" />
    <div className="showcase-stage-glow showcase-stage-glow--b" />
    <div className="showcase-stage-line showcase-stage-line--a" />
    <div className="showcase-stage-line showcase-stage-line--b" />
  </div>
);

const HackathonShowcase = () => {
  const { uiMode } = useSettings();
  const { groups: ecosystemPartnerGroups } = useEcosystemPartners();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion;
  const isDayMode = uiMode === "day";
  const pageRef = useRef(null);
  const snapRestoreTimerRef = useRef(null);
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [uploadType, setUploadType] = useState(null);
  const [outcome, setOutcome] = useState(null);

  const fetchOutcome = async () => {
    try {
      const response = await api.get("/competitions/current/outcome");
      setOutcome(response.data || null);
    } catch {
      setOutcome(null);
    }
  };

  useEffect(() => {
    fetchOutcome();
  }, []);

  useEffect(() => {
    const container = pageRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollHeight = container.scrollHeight - container.clientHeight;
      setScrollProgress(scrollHeight > 0 ? (container.scrollTop / scrollHeight) * 100 : 0);

      const containerRect = container.getBoundingClientRect();
      const viewportCenter = containerRect.top + container.clientHeight / 2;
      let currentIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      showcaseSections.forEach((section, index) => {
        const element = document.getElementById(section.id);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const distance = Math.abs(sectionCenter - viewportCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          currentIndex = index;
        }
      });

      setActiveSection(currentIndex);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (snapRestoreTimerRef.current) {
        window.clearTimeout(snapRestoreTimerRef.current);
      }
    };
  }, []);

  const smoothScrollTo = (id) => {
    const target = document.getElementById(id);
    const scroller = pageRef.current;
    if (!target || !scroller) return;

    if (snapRestoreTimerRef.current) {
      window.clearTimeout(snapRestoreTimerRef.current);
    }

    scroller.classList.add("showcase-no-snap");
    const targetIndex = showcaseSections.findIndex((section) => section.id === id);
    if (targetIndex >= 0) {
      setActiveSection(targetIndex);
    }

    const mobileTopOffset = window.matchMedia("(max-width: 640px)").matches ? 80 : 0;

    scroller.scrollTo({
      top: Math.max(target.offsetTop - mobileTopOffset, 0),
      behavior: shouldAnimate ? "smooth" : "auto",
    });

    snapRestoreTimerRef.current = window.setTimeout(
      () => {
        scroller.classList.remove("showcase-no-snap");
        snapRestoreTimerRef.current = null;
      },
      shouldAnimate ? 700 : 120,
    );
  };

  const openOutcomeUpload = (type = "stage_photo") => {
    setUploadType(type);
  };

  const officialVideo = outcome?.media?.promo_videos?.[0] || null;
  const galleryMoments = useMemo(() => {
    const stagePhotos = Array.isArray(outcome?.media?.stage_photos)
      ? outcome.media.stage_photos
      : [];
    if (stagePhotos.length === 0) return mediaMoments;

    const dynamicMoments = stagePhotos.slice(0, 5).map((item, index) => ({
      id: `${item.source_table || "stage"}-${item.source_id || item.id || index}`,
      label: item.type_label || item.category || "赛场照片",
      title: item.title || mediaMoments[index % mediaMoments.length].title,
      caption: item.description || item.gameDescription || "来自画廊的黑客松成果照片，审核通过后自动同步到这里。",
      image: item.cover_url || item.url || mediaMoments[index % mediaMoments.length].image,
    }));

    return [
      ...dynamicMoments,
      ...mediaMoments.slice(dynamicMoments.length),
    ].slice(0, 5);
  }, [outcome]);

  const showcaseWorks = useMemo(() => {
    const works = Array.isArray(outcome?.works) ? outcome.works : [];
    if (works.length === 0) return fallbackPodiumWorks;
    return works.slice(0, 3).map((work, index) => ({
      id: work.id,
      rank: normalizeShowcaseRank(work.rank, index),
      award: work.award || work.honor_title || "优秀作品",
      title: work.title || "未命名作品",
      author: work.author || work.uploader_name || "获奖成员",
      gitUrl: work.git_url || work.gitUrl || "",
    }));
  }, [outcome]);

  const publishedWorksCount = outcome?.stats?.works || showcaseWorks.length;
  const supportLineup = useMemo(() => {
    const detailByCategory = {
      school: "场地资源、导师评审、校园传播与长期机制支持。",
      organization: "选手招募、志愿执行、现场协同与赛后社群承接。",
      enterprise: "模型、云资源、AI 工具、技术支持与合作方传播露出。",
    };

    return ecosystemPartnerGroups.map((group) => ({
      ...group,
      detail: detailByCategory[group.id] || "",
      logo: group.id === "enterprise",
    }));
  }, [ecosystemPartnerGroups]);
  const supportPartnerCount = supportLineup.reduce(
    (total, group) => total + group.partners.length,
    0,
  );

  const theme = isDayMode
    ? {
        page: "bg-[#f8fbff] text-slate-950",
        muted: "text-slate-600",
        soft: "text-slate-500",
        border: "border-slate-200",
        panel: "border-cyan-200/70 bg-white/88 shadow-[0_26px_90px_rgba(15,23,42,0.12)]",
        panelStrong: "border-cyan-200/80 bg-white shadow-[0_32px_110px_rgba(15,23,42,0.14)]",
        chip: "border-slate-200 bg-white/72 text-slate-700",
        accent: "text-cyan-700",
        accentBg: "bg-cyan-600 text-white",
        amber: "text-amber-600",
        progress: "from-cyan-500 via-indigo-500 to-fuchsia-500",
        chapterShell:
          "border-slate-200 bg-white/86 text-slate-700 shadow-[0_18px_60px_rgba(15,23,42,0.12)]",
        chapterLine: "from-transparent via-slate-300 to-transparent",
        chapterActive:
          "border-cyan-500 bg-cyan-500 text-white shadow-[0_14px_34px_rgba(6,182,212,0.24)]",
        chapterIdle: "border-slate-200 bg-white/70 text-slate-600 hover:border-cyan-300 hover:bg-cyan-50",
        chapterTip:
          "border-slate-200 bg-white/94 text-slate-700 shadow-[0_18px_44px_rgba(15,23,42,0.12)]",
        heroTitle: "text-slate-950 drop-shadow-[0_24px_70px_rgba(148,163,184,0.22)]",
        heroCopy: "text-slate-700",
        primaryButton:
          "bg-cyan-600 text-white shadow-[0_18px_42px_rgba(8,145,178,0.24)] hover:bg-slate-950 hover:text-white focus:ring-cyan-500/25",
        secondaryButton:
          "border-slate-300 bg-white/72 text-slate-800 hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 focus:ring-cyan-500/20",
        statPanel:
          "border-cyan-200/80 bg-white/82 text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.12)]",
        statDivider: "divide-cyan-200/80",
        statValue: "text-slate-950",
        statUnit: "text-slate-700",
        statLabel: "text-slate-900",
        mediaItem: "border-cyan-200/70 bg-white/72",
        cinemaBadge: "border-cyan-200 bg-white/80 text-cyan-800 shadow-[0_12px_34px_rgba(15,23,42,0.12)]",
        playButton:
          "border-white/70 bg-white/74 text-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.2)] hover:bg-cyan-600 hover:text-white focus:ring-cyan-500/25",
        partnerShell: "bg-white/62",
        ctaPrimary:
          "bg-cyan-600 text-white shadow-[0_18px_42px_rgba(8,145,178,0.2)] hover:bg-slate-950",
      }
    : {
        page: "bg-[#020405] text-white",
        muted: "text-white/70",
        soft: "text-white/46",
        border: "border-white/10",
        panel: "border-cyan-300/[0.18] bg-[#061014]/88 shadow-[0_30px_100px_rgba(0,0,0,0.52)]",
        panelStrong: "border-cyan-300/[0.22] bg-[#071012]/90 shadow-[0_36px_120px_rgba(0,0,0,0.66)]",
        chip: "border-cyan-300/[0.18] bg-cyan-300/[0.055] text-white/78",
        accent: "text-cyan-300",
        accentBg: "bg-cyan-300 text-slate-950",
        amber: "text-amber-300",
        progress: "from-cyan-300 via-indigo-400 to-fuchsia-400",
        chapterShell:
          "border-cyan-300/20 bg-[#031014]/72 text-white shadow-[0_0_50px_rgba(34,211,238,0.16)]",
        chapterLine: "from-transparent via-cyan-300/50 to-transparent",
        chapterActive:
          "border-cyan-200 bg-cyan-300 text-slate-950 shadow-[0_0_22px_rgba(103,232,249,0.42)]",
        chapterIdle: "border-cyan-300/16 bg-black/28 text-cyan-100 hover:border-cyan-200 hover:bg-cyan-300 hover:text-slate-950",
        chapterTip:
          "border-cyan-300/24 bg-[#031014]/92 text-cyan-100 shadow-[0_0_34px_rgba(34,211,238,0.14)]",
        heroTitle: "text-white drop-shadow-[0_34px_80px_rgba(0,0,0,0.48)]",
        heroCopy: "text-white/80",
        primaryButton:
          "bg-cyan-300 text-slate-950 shadow-[0_0_34px_rgba(103,232,249,0.32)] hover:bg-white focus:ring-cyan-300/30",
        secondaryButton:
          "border-white/16 bg-white/[0.08] text-white hover:border-cyan-300/60 hover:bg-cyan-300/10 focus:ring-cyan-300/20",
        statPanel:
          "border-cyan-300/22 bg-black/24 text-white shadow-[0_0_80px_rgba(34,211,238,0.10)]",
        statDivider: "divide-cyan-300/16",
        statValue: "text-cyan-100",
        statUnit: "text-white/86",
        statLabel: "text-white",
        mediaItem: "border-cyan-300/[0.14] bg-cyan-300/[0.04]",
        cinemaBadge: "border-cyan-300/30 bg-black/38 text-cyan-100",
        playButton:
          "border-white/24 bg-white/12 text-white hover:bg-cyan-300 hover:text-slate-950 focus:ring-cyan-300/30",
        partnerShell: "bg-black/[0.08]",
        ctaPrimary:
          "bg-cyan-300 text-slate-950 shadow-[0_0_30px_rgba(103,232,249,0.24)] hover:bg-white",
      };

  const reveal = useMemo(
    () =>
      shouldAnimate
        ? {
            initial: { opacity: 0, y: 30 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, amount: 0.2 },
            transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
          }
        : {},
    [shouldAnimate],
  );

  const heroReveal = shouldAnimate
    ? {
        initial: { opacity: 0, y: 34 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.76, ease: [0.22, 1, 0.36, 1] },
      }
    : {};

  const chapterNav =
    typeof document !== "undefined"
      ? createPortal(
          <nav
            aria-label="比赛成果展览章节"
            className={`fixed right-4 top-1/2 z-[120] hidden -translate-y-1/2 border p-2 backdrop-blur-2xl lg:block ${theme.chapterShell}`}
          >
            <div className={`pointer-events-none absolute bottom-3 left-1/2 top-3 w-px -translate-x-1/2 bg-gradient-to-b ${theme.chapterLine}`} />
            <div className="relative grid gap-2">
              {showcaseSections.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => smoothScrollTo(step.id)}
                  className={`group relative flex h-10 w-10 items-center justify-center border text-[11px] font-black transition duration-200 ${
                    activeSection === index ? theme.chapterActive : theme.chapterIdle
                  }`}
                  aria-label={`跳转到${step.title}章节`}
                >
                  {step.no}
                  <span className={`pointer-events-none absolute right-full mr-3 min-w-[132px] border px-3 py-2 text-left text-[11px] font-black uppercase opacity-0 backdrop-blur transition duration-200 group-hover:opacity-100 ${theme.chapterTip}`}>
                    {step.title} / {step.label}
                  </span>
                </button>
              ))}
            </div>
          </nav>,
          document.body,
        )
      : null;

  return (
    <div
      ref={pageRef}
      className={`showcase-scroll-shell ${isDayMode ? "showcase-theme-day" : "showcase-theme-dark"} h-[100svh] snap-y snap-mandatory overflow-y-auto overflow-x-hidden scroll-smooth overscroll-y-contain ${theme.page}`}
      style={{
        fontFamily:
          '"Inter", "HarmonyOS Sans SC", "MiSans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      }}
    >
      <SEO
        title="AI 全栈极速黑客松比赛成果"
        description="AI 全栈极速黑客松比赛成果页，集中呈现宣传片、赛场照片、优秀作品和活动成果。"
        image={HERO_IMAGE}
      />
      <style>
        {`
          .showcase-gallery-grid {
            display: grid;
            gap: 0.75rem;
            grid-auto-rows: 180px;
          }

          .showcase-no-snap {
            scroll-snap-type: none;
          }

          .showcase-scroll-shell {
            scroll-padding-top: 5.5rem;
            scroll-padding-bottom: 5rem;
          }

          .showcase-snap-section {
            scroll-margin-top: 5.5rem;
            scroll-margin-bottom: 5rem;
          }

          @media (min-width: 1024px) {
            .showcase-scroll-shell {
              scroll-padding-top: 0;
              scroll-padding-bottom: 0;
            }

            .showcase-snap-section {
              scroll-margin-top: 0;
              scroll-margin-bottom: 0;
            }
          }

          .showcase-gallery-card {
            min-height: 0;
          }

          @media (min-width: 768px) {
            .showcase-gallery-grid {
              grid-template-columns: repeat(12, minmax(0, 1fr));
              grid-template-rows: minmax(220px, 1fr) minmax(220px, 0.96fr);
              height: clamp(540px, 66vh, 720px);
            }

            .showcase-gallery-card:nth-child(1) {
              grid-column: 1 / 5;
              grid-row: 1 / 2;
            }

            .showcase-gallery-card:nth-child(2) {
              grid-column: 5 / 13;
              grid-row: 1 / 2;
            }

            .showcase-gallery-card:nth-child(3) {
              grid-column: 1 / 5;
              grid-row: 2 / 3;
            }

            .showcase-gallery-card:nth-child(4) {
              grid-column: 5 / 9;
              grid-row: 2 / 3;
            }

            .showcase-gallery-card:nth-child(5) {
              grid-column: 9 / 13;
              grid-row: 2 / 3;
            }
          }

          @media (min-width: 1280px) {
            .showcase-gallery-grid {
              height: clamp(560px, 68vh, 760px);
            }
          }

          @media (max-height: 820px) and (min-width: 768px) {
            .showcase-gallery-grid {
              height: 520px;
              grid-template-rows: 1fr 0.92fr;
            }
          }

          .showcase-hero-wordmark {
            font-size: clamp(3.15rem, 13vw, 4.35rem);
            line-height: 0.9;
            letter-spacing: 0;
          }

          @media (min-width: 640px) {
            .showcase-hero-wordmark {
              font-size: clamp(5.15rem, 7.6vw, 9.25rem);
              line-height: 0.89;
            }
          }

          @media (max-width: 640px) {
            .showcase-stage-word {
              font-size: clamp(5.6rem, 34vw, 9rem);
              opacity: 0.86;
            }

            .showcase-stage-word--right {
              right: -24vw;
            }

            .showcase-stage-word--left {
              left: -18vw;
            }

            .showcase-stage-grid {
              background-size: 48px 48px;
            }

            .showcase-scroll-shell {
              scroll-padding-top: 4.25rem;
              scroll-padding-bottom: 9.25rem;
            }

            .showcase-snap-section {
              scroll-margin-top: 4.25rem;
              scroll-margin-bottom: 9.25rem;
            }

            .showcase-mobile-tight {
              min-height: auto;
              padding-top: 6rem;
              padding-bottom: 10.5rem;
            }

            .showcase-mobile-tight .showcase-section-mark {
              top: 5.75rem;
              font-size: clamp(7rem, 34vw, 9.5rem);
            }

            .showcase-mobile-tight .showcase-project-surface {
              min-height: 156px;
            }

            .showcase-mobile-tight .showcase-work-rank {
              font-size: 5.4rem;
            }

            .showcase-mobile-tight .showcase-work-card {
              min-height: 0;
            }

            .showcase-mobile-tight .showcase-work-body {
              min-height: 158px;
              padding: 1.25rem;
            }

            .showcase-mobile-tight .showcase-work-title {
              font-size: 1.7rem;
              line-height: 1.08;
            }
          }

          .showcase-hero-line--result {
            margin-top: 0.08em;
          }

          @media (min-width: 640px) {
            .showcase-hero-line--result {
              margin-top: 0.03em;
            }
          }

          .showcase-tech-bg {
            background:
              radial-gradient(ellipse at 72% 22%, rgba(34, 211, 238, 0.22), transparent 36%),
              radial-gradient(ellipse at 20% 78%, rgba(168, 85, 247, 0.18), transparent 34%),
              radial-gradient(ellipse at 82% 82%, rgba(245, 158, 11, 0.1), transparent 32%),
              linear-gradient(118deg, #02040a 0%, #07111f 42%, #020408 100%);
          }

          .showcase-tech-bg > * {
            position: absolute;
            pointer-events: none;
          }

          .showcase-tech-grid {
            inset: 0;
            background:
              linear-gradient(rgba(103, 232, 249, 0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(103, 232, 249, 0.1) 1px, transparent 1px),
              linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px);
            background-size: 72px 72px, 72px 72px, 18px 18px;
            mask-image: radial-gradient(ellipse at 42% 56%, black 0%, black 48%, transparent 82%);
            opacity: 0.52;
          }

          .showcase-tech-depth {
            left: 10%;
            right: 5%;
            bottom: -28%;
            height: 54%;
            transform: perspective(1100px) rotateX(66deg);
            transform-origin: bottom center;
            background:
              repeating-linear-gradient(90deg, rgba(103, 232, 249, 0.24) 0 1px, transparent 1px 8.5vw),
              repeating-linear-gradient(0deg, rgba(103, 232, 249, 0.2) 0 1px, transparent 1px 5.2vh);
            border-top: 1px solid rgba(103, 232, 249, 0.32);
            box-shadow: 0 -24px 80px rgba(34, 211, 238, 0.16);
            opacity: 0.56;
          }

          .showcase-tech-facet {
            border: 1px solid rgba(103, 232, 249, 0.2);
            background: linear-gradient(135deg, rgba(103, 232, 249, 0.12), rgba(99, 102, 241, 0.08));
            box-shadow: inset 0 0 60px rgba(34, 211, 238, 0.08);
          }

          .showcase-tech-facet-a {
            right: -4%;
            top: 10%;
            width: 40vw;
            height: 48vh;
            clip-path: polygon(18% 0, 100% 0, 88% 100%, 0 76%);
            opacity: 0.5;
          }

          .showcase-tech-facet-b {
            left: -10%;
            bottom: 6%;
            width: 34vw;
            height: 34vh;
            clip-path: polygon(0 18%, 78% 0, 100% 76%, 10% 100%);
            opacity: 0.34;
          }

          .showcase-tech-beam {
            left: -10%;
            width: 120%;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(103, 232, 249, 0.8), rgba(255, 255, 255, 0.28), transparent);
            transform: rotate(-10deg);
            box-shadow: 0 0 28px rgba(34, 211, 238, 0.46);
          }

          .showcase-tech-beam-a {
            top: 32%;
            opacity: 0.52;
          }

          .showcase-tech-beam-b {
            top: 68%;
            opacity: 0.24;
          }

          .showcase-tech-scanline {
            inset: 0;
            background: linear-gradient(180deg, transparent 0%, rgba(103, 232, 249, 0.12) 48%, transparent 56%);
            transform: translateY(-55%);
            animation: showcaseScan 7s ease-in-out infinite;
            opacity: 0.7;
          }

          .showcase-tech-ruler {
            right: clamp(5rem, 10vw, 12rem);
            top: 22%;
            bottom: 18%;
            width: 1px;
            background: linear-gradient(180deg, transparent, rgba(103, 232, 249, 0.45), transparent);
          }

          .showcase-tech-ruler::before,
          .showcase-tech-ruler::after {
            content: "";
            position: absolute;
            left: -78px;
            width: 156px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(103, 232, 249, 0.55), transparent);
          }

          .showcase-tech-ruler::before {
            top: 18%;
          }

          .showcase-tech-ruler::after {
            bottom: 22%;
          }

          @keyframes showcaseScan {
            0%, 100% {
              transform: translateY(-58%);
            }
            50% {
              transform: translateY(58%);
            }
          }

          .showcase-hero-vault {
            transform: perspective(1100px) rotateX(64deg);
            transform-origin: bottom center;
          }

          .showcase-hero-vault::before,
          .showcase-hero-vault::after {
            content: "";
            position: absolute;
            inset: 0;
            border-left: 1px solid rgba(103, 232, 249, 0.22);
            border-right: 1px solid rgba(103, 232, 249, 0.22);
          }

          .showcase-hero-vault::after {
            inset-inline: 18%;
            opacity: 0.72;
          }

          .showcase-stat-rail {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .showcase-hero-stat-dock {
            left: max(4rem, calc((100vw - 82rem) / 2));
            right: max(4rem, calc((100vw - 82rem) / 2));
            width: min(82rem, calc(100vw - 8rem));
          }

          .showcase-hero-stat-dock::before {
            content: "";
            position: absolute;
            inset: -1px;
            pointer-events: none;
            border: 1px solid rgba(103, 232, 249, 0.12);
            mask-image: linear-gradient(90deg, black 0 12%, transparent 12% 88%, black 88% 100%);
          }

          @media (max-width: 640px) {
            .showcase-stat-rail {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .showcase-hero-stat-dock {
              left: 0;
              right: 0;
              width: 100%;
            }
          }

          .showcase-hero-composition {
            display: grid;
            gap: clamp(1.25rem, 3vw, 2.75rem);
            align-items: center;
          }

          .showcase-hero-copy {
            min-width: 0;
          }

          .showcase-hero-film {
            min-height: clamp(18rem, 38vh, 32rem);
          }

          .showcase-hero-film .showcase-cinema-frame::before {
            inset: 0.75rem;
          }

          @media (min-width: 1024px) {
            .showcase-hero-composition {
              grid-template-columns: minmax(30rem, 0.96fr) minmax(26rem, 1.04fr);
            }
          }

          @media (min-width: 1536px) {
            .showcase-hero-composition {
              grid-template-columns: minmax(38rem, 0.92fr) minmax(34rem, 1.08fr);
            }

            .showcase-hero-film {
              min-height: clamp(24rem, 52vh, 43rem);
            }
          }

          @media (max-width: 640px) {
            .showcase-hero-film {
              min-height: 15.5rem;
            }
          }

          .showcase-film-layout,
          .showcase-partner-layout {
            display: grid;
            gap: 1.5rem;
          }

          .showcase-support-board {
            display: grid;
            gap: 0.75rem;
          }

          .showcase-support-partners {
            display: grid;
            gap: 0.5rem;
          }

          .showcase-support-partners--school {
            grid-template-columns: repeat(1, minmax(0, 1fr));
          }

          .showcase-support-partners--campus {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .showcase-support-partners--enterprise {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .showcase-support-tile {
            min-width: 0;
            min-height: 4.5rem;
          }

          .showcase-action-tool-grid {
            display: grid;
            gap: 0.5rem;
          }

          @media (min-width: 640px) {
            .showcase-support-partners--school {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .showcase-support-partners--campus {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .showcase-support-partners--enterprise {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          @media (min-width: 1024px) {
            .showcase-film-layout {
              grid-template-columns: minmax(20rem, 0.62fr) minmax(0, 1.38fr);
              align-items: stretch;
            }

            .showcase-partner-layout {
              grid-template-columns: minmax(19rem, 0.58fr) minmax(0, 1.42fr);
              align-items: stretch;
            }

            .showcase-support-board {
              grid-template-columns: minmax(13rem, 0.48fr) minmax(0, 1fr);
              align-items: stretch;
            }

            .showcase-action-tool-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          @media (min-width: 1280px) {
            .showcase-film-layout {
              gap: 1.75rem;
            }

            .showcase-support-partners--campus {
              grid-template-columns: repeat(5, minmax(0, 1fr));
            }
          }

          .showcase-stage-atmosphere {
            position: absolute;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
          }

          .showcase-stage-grid {
            position: absolute;
            inset: 0;
            background:
              linear-gradient(rgba(103, 232, 249, 0.075) 1px, transparent 1px),
              linear-gradient(90deg, rgba(103, 232, 249, 0.055) 1px, transparent 1px);
            background-size: 72px 72px;
            mask-image: radial-gradient(ellipse at 50% 50%, black 0%, black 42%, transparent 76%);
            opacity: 0.55;
          }

          .showcase-stage-word {
            position: absolute;
            top: 50%;
            translate: 0 -50%;
            font-size: clamp(8rem, 23vw, 27rem);
            font-weight: 950;
            line-height: 0.74;
            letter-spacing: 0;
            color: rgba(255, 255, 255, 0.035);
            -webkit-text-stroke: 1px rgba(103, 232, 249, 0.1);
            text-transform: uppercase;
            white-space: nowrap;
          }

          .showcase-stage-word--right {
            right: -5vw;
          }

          .showcase-stage-word--left {
            left: -4vw;
          }

          .showcase-stage-glow {
            position: absolute;
            width: 34vw;
            height: 34vw;
            border-radius: 9999px;
            filter: blur(110px);
          }

          .showcase-stage-glow--a {
            right: -10vw;
            top: 10vh;
            background: rgba(34, 211, 238, 0.12);
          }

          .showcase-stage-glow--b {
            left: -12vw;
            bottom: 4vh;
            background: rgba(99, 102, 241, 0.11);
          }

          .showcase-stage-line {
            position: absolute;
            left: -12%;
            width: 124%;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(103, 232, 249, 0.44), transparent);
          }

          .showcase-stage-line--a {
            top: 28%;
            transform: rotate(-7deg);
          }

          .showcase-stage-line--b {
            bottom: 20%;
            transform: rotate(-7deg);
            opacity: 0.46;
          }

          .showcase-cinema-frame::before {
            content: "";
            position: absolute;
            inset: 1rem;
            z-index: 1;
            pointer-events: none;
            border: 1px solid rgba(255, 255, 255, 0.18);
            opacity: 0.72;
          }

          .showcase-cinema-frame::after {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              linear-gradient(90deg, rgba(2, 4, 5, 0.84) 0%, transparent 34%, transparent 64%, rgba(2, 4, 5, 0.62) 100%),
              radial-gradient(circle at 50% 38%, transparent 0%, rgba(0, 0, 0, 0.52) 76%);
          }

          .showcase-section-mark {
            position: absolute;
            right: clamp(1rem, 5vw, 5rem);
            top: clamp(5rem, 11vh, 8rem);
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
            font-size: clamp(8rem, 20vw, 20rem);
            font-weight: 900;
            line-height: 0.76;
            color: rgba(255, 255, 255, 0.045);
            pointer-events: none;
          }

          .showcase-project-surface {
            background:
              radial-gradient(circle at 18% 0%, rgba(103, 232, 249, 0.22), transparent 34%),
              linear-gradient(135deg, rgba(103, 232, 249, 0.22), rgba(99, 102, 241, 0.16) 48%, rgba(244, 63, 94, 0.12)),
              #061113;
          }

          .showcase-project-surface::after {
            content: "";
            position: absolute;
            inset: 0;
            background:
              linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px);
            background-size: 34px 34px;
            opacity: 0.28;
          }

          .showcase-theme-day .showcase-tech-bg {
            background:
              linear-gradient(115deg, rgba(255, 255, 255, 0.88), rgba(236, 254, 255, 0.66) 48%, rgba(248, 250, 252, 0.96)),
              radial-gradient(ellipse at 72% 18%, rgba(14, 165, 233, 0.14), transparent 34%),
              radial-gradient(ellipse at 18% 76%, rgba(99, 102, 241, 0.1), transparent 32%),
              #f6f8fb;
          }

          .showcase-theme-day .showcase-tech-grid {
            background:
              linear-gradient(rgba(14, 165, 233, 0.11) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14, 165, 233, 0.08) 1px, transparent 1px),
              linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px);
            opacity: 0.64;
          }

          .showcase-theme-day .showcase-tech-depth {
            background:
              repeating-linear-gradient(90deg, rgba(14, 165, 233, 0.13) 0 1px, transparent 1px 8.5vw),
              repeating-linear-gradient(0deg, rgba(14, 165, 233, 0.11) 0 1px, transparent 1px 5.2vh);
            border-top-color: rgba(14, 165, 233, 0.22);
            box-shadow: 0 -24px 80px rgba(14, 165, 233, 0.1);
            opacity: 0.62;
          }

          .showcase-theme-day .showcase-tech-facet {
            border-color: rgba(14, 165, 233, 0.14);
            background: linear-gradient(135deg, rgba(14, 165, 233, 0.11), rgba(99, 102, 241, 0.07));
            box-shadow: inset 0 0 70px rgba(14, 165, 233, 0.08);
          }

          .showcase-theme-day .showcase-tech-beam {
            background: linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.42), rgba(99, 102, 241, 0.18), transparent);
            box-shadow: 0 0 26px rgba(14, 165, 233, 0.18);
          }

          .showcase-theme-day .showcase-tech-scanline {
            background: linear-gradient(180deg, transparent 0%, rgba(14, 165, 233, 0.11) 48%, transparent 56%);
            opacity: 0.46;
          }

          .showcase-theme-day .showcase-tech-ruler,
          .showcase-theme-day .showcase-tech-ruler::before,
          .showcase-theme-day .showcase-tech-ruler::after {
            background: linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.28), transparent);
          }

          .showcase-theme-day .showcase-stage-grid {
            background:
              linear-gradient(rgba(14, 165, 233, 0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14, 165, 233, 0.055) 1px, transparent 1px);
            opacity: 0.72;
          }

          .showcase-theme-day .showcase-stage-word,
          .showcase-theme-day .showcase-section-mark {
            color: rgba(15, 23, 42, 0.045);
            -webkit-text-stroke-color: rgba(14, 165, 233, 0.1);
          }

          .showcase-theme-day .showcase-stage-line {
            background: linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.24), transparent);
          }

          .showcase-theme-day .showcase-stage-glow--a {
            background: rgba(14, 165, 233, 0.16);
          }

          .showcase-theme-day .showcase-stage-glow--b {
            background: rgba(99, 102, 241, 0.12);
          }

          .showcase-theme-day .showcase-cinema-frame::before {
            border-color: rgba(255, 255, 255, 0.58);
          }

          .showcase-theme-day .showcase-cinema-frame::after {
            background:
              linear-gradient(90deg, rgba(15, 23, 42, 0.56) 0%, transparent 34%, transparent 64%, rgba(15, 23, 42, 0.42) 100%),
              radial-gradient(circle at 50% 38%, transparent 0%, rgba(15, 23, 42, 0.36) 76%);
          }

          .showcase-theme-day .showcase-project-surface {
            background:
              radial-gradient(circle at 18% 0%, rgba(14, 165, 233, 0.18), transparent 34%),
              linear-gradient(135deg, rgba(224, 242, 254, 0.95), rgba(238, 242, 255, 0.92) 48%, rgba(253, 244, 255, 0.82)),
              #f8fbff;
          }

          .showcase-theme-day .showcase-project-surface::after {
            background:
              linear-gradient(rgba(14,165,233,0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14,165,233,0.1) 1px, transparent 1px);
            opacity: 0.32;
          }

          .showcase-theme-day #gate .showcase-hero-line--result {
            color: #0e7490;
            filter: drop-shadow(0 0 22px rgba(14, 165, 233, 0.18));
          }

          .showcase-theme-day #gate p {
            color: #334155;
          }

          .showcase-theme-day .showcase-gallery-card,
          .showcase-theme-day .showcase-cinema-frame {
            box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
          }

          .showcase-theme-day .showcase-gallery-card img,
          .showcase-theme-day .showcase-cinema-frame img {
            filter: brightness(0.9) saturate(1.08) contrast(1.02) !important;
          }

          .showcase-theme-day .showcase-gallery-overlay {
            background:
              linear-gradient(180deg, rgba(15, 23, 42, 0.06) 0%, rgba(15, 23, 42, 0.26) 42%, rgba(2, 6, 23, 0.86) 100%),
              linear-gradient(90deg, rgba(2, 6, 23, 0.18), transparent 52%);
          }

          .showcase-theme-dark .showcase-gallery-overlay {
            background: linear-gradient(180deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.84));
          }

          .showcase-gallery-copy,
          .showcase-gallery-copy h3,
          .showcase-gallery-copy p {
            color: #fff !important;
          }

          .showcase-gallery-copy h3 {
            text-shadow: 0 16px 40px rgba(0, 0, 0, 0.62);
          }

          .showcase-gallery-copy p {
            text-shadow: 0 10px 28px rgba(0, 0, 0, 0.72);
          }
        `}
      </style>
      <div className="fixed left-0 right-0 top-[env(safe-area-inset-top)] z-[130] h-0.5">
        <div
          className={`h-full bg-gradient-to-r transition-all duration-150 ${theme.progress}`}
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      {chapterNav}
      <div
        className={`fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 z-[120] border-t px-3 py-2 backdrop-blur-2xl lg:hidden ${
          isDayMode ? "border-slate-200 bg-white/90" : "border-white/10 bg-black/62"
        }`}
      >
        <div className="mx-auto flex max-w-xl gap-2 overflow-x-auto">
          {showcaseSections.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => smoothScrollTo(step.id)}
              className={`min-w-[64px] flex-1 border px-2 py-2 text-[11px] font-black transition duration-200 ${
                activeSection === index ? theme.chapterActive : theme.chapterIdle
              }`}
              aria-label={`跳转到${step.title}章节`}
            >
              <span className="block font-mono">{step.no}</span>
              <span className="mt-0.5 block whitespace-nowrap">{step.title}</span>
            </button>
          ))}
        </div>
      </div>

      <section
        id="gate"
        className="showcase-snap-section relative isolate flex min-h-[100svh] snap-start snap-always items-start overflow-hidden px-4 pb-28 pt-20 sm:px-6 sm:pb-32 md:pt-28 lg:items-center lg:px-10 lg:pb-28 2xl:px-16"
      >
        <div className="showcase-tech-bg absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="showcase-tech-grid" />
          <div className="showcase-tech-depth" />
          <div className="showcase-tech-facet showcase-tech-facet-a" />
          <div className="showcase-tech-facet showcase-tech-facet-b" />
          <div className="showcase-tech-beam showcase-tech-beam-a" />
          <div className="showcase-tech-beam showcase-tech-beam-b" />
          <div className="showcase-tech-ruler hidden lg:block" />
          <div className="showcase-tech-scanline" />
          <div className={`absolute inset-x-0 top-0 h-36 bg-gradient-to-b ${isDayMode ? "from-white/70 to-transparent" : "from-black/44 to-transparent"}`} />
          <div className={`absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t ${isDayMode ? "from-[#f8fbff] via-white/70 to-transparent" : "from-[#020405] via-[#020405]/72 to-transparent"}`} />
        </div>
        <div className="pointer-events-none absolute inset-x-[7vw] bottom-[-10vh] hidden h-[58vh] opacity-60 lg:block">
          <div className="showcase-hero-vault absolute inset-0 border-t border-cyan-300/24 bg-[repeating-linear-gradient(90deg,rgba(103,232,249,0.18)_0_1px,transparent_1px_8.5vw),repeating-linear-gradient(0deg,rgba(103,232,249,0.18)_0_1px,transparent_1px_4.8vh)]" />
        </div>
        <div className="pointer-events-none absolute right-[6vw] top-[13vh] hidden font-mono text-[10rem] font-black leading-none text-white/[0.032] lg:block 2xl:text-[12rem]">
          2026
        </div>

        <div className="showcase-hero-composition relative z-10 mx-auto w-full max-w-[1680px]">
          <MotionDiv {...heroReveal} className="showcase-hero-copy lg:-translate-y-[2vh]">
            <p className={`mb-4 inline-flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase ${theme.chip}`}>
              <Film className="h-4 w-4" />
              Official Film Inside
            </p>
            <h1 className={`showcase-hero-wordmark max-w-[1020px] font-black ${theme.heroTitle}`}>
              <span className="hidden whitespace-nowrap sm:block">AI 全栈极速</span>
              <span className="block sm:hidden">AI 全栈</span>
              <span className="block sm:hidden">极速</span>
              <span className="showcase-hero-line--result block text-cyan-200 drop-shadow-[0_0_34px_rgba(103,232,249,0.62)]">比赛成果</span>
            </h1>
            <p className={`mt-5 max-w-[46rem] text-base font-semibold leading-7 sm:mt-6 sm:text-lg sm:leading-8 lg:text-xl lg:leading-9 ${theme.heroCopy}`}>
              5 小时 AI 原生开发冲刺的赛后成果展。宣传片、现场影像、获奖作品与传播素材在这里完成一次集中发布。
            </p>
            <div className="mt-7 flex flex-wrap gap-3 sm:mt-8">
              <button
                type="button"
                onClick={() => openOutcomeUpload("stage_photo")}
                className={`inline-flex min-h-12 items-center justify-center gap-2 px-6 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 ${theme.primaryButton}`}
              >
                <Upload className="h-4 w-4" />
                提交成果
              </button>
              <a
                href="#showcase-official-film"
                className={`group inline-flex min-h-12 items-center justify-center gap-2 border px-6 text-sm font-bold transition duration-200 focus:outline-none focus:ring-4 ${theme.secondaryButton}`}
              >
                <Play className="h-4 w-4 fill-current" />
                观看宣传片
              </a>
              <button
                type="button"
                onClick={() => smoothScrollTo("works")}
                className={`inline-flex min-h-12 items-center justify-center gap-2 border px-6 text-sm font-bold transition duration-200 focus:outline-none focus:ring-4 ${theme.secondaryButton}`}
              >
                查看优秀作品
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </MotionDiv>

          <MotionDiv
            {...heroReveal}
            transition={{ duration: 0.76, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className={`showcase-hero-film showcase-cinema-frame group relative overflow-hidden border ${theme.border} shadow-[0_0_90px_rgba(34,211,238,0.13)]`}
            id="showcase-official-film"
          >
            {officialVideo?.url ? (
              <video
                className="h-full w-full object-cover"
                controls
                preload="metadata"
                poster={officialVideo.cover_url || SECONDARY_IMAGE}
              >
                <source src={officialVideo.url} />
              </video>
            ) : (
              <img
                src={SECONDARY_IMAGE}
                alt="黑客松宣传片封面"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
                style={{ filter: "brightness(0.72) saturate(1.18) contrast(1.08)" }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(103,232,249,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.08)_1px,transparent_1px)] bg-[size:38px_38px] opacity-25" />
            <div className={`absolute left-4 top-4 z-10 border px-3 py-2 text-xs font-black uppercase backdrop-blur sm:left-6 sm:top-6 ${theme.cinemaBadge}`}>
              {officialVideo?.title || "Trailer slot"}
            </div>
            {!officialVideo?.url ? (
              <button
                type="button"
                className={`absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur-xl transition duration-300 hover:scale-105 focus:outline-none focus:ring-4 sm:h-24 sm:w-24 lg:h-28 lg:w-28 ${theme.playButton}`}
                aria-label="播放宣传片"
              >
                <Play className="ml-1 h-8 w-8 fill-current sm:h-9 sm:w-9 lg:h-10 lg:w-10" />
              </button>
            ) : null}
            {!officialVideo?.url ? (
              <div className="absolute bottom-0 left-0 right-0 z-10 p-5 sm:p-7 lg:p-9">
                <p className="text-xs font-black uppercase text-cyan-200 sm:text-sm">
                  5 HOURS / 1 BUILDER / REAL PRODUCT
                </p>
                <h2 className="mt-2 max-w-3xl text-2xl font-black leading-none text-white sm:text-4xl lg:text-5xl 2xl:text-6xl">
                  从赛场声浪到作品上线
                </h2>
              </div>
            ) : null}
          </MotionDiv>
        </div>
        <MotionDiv
          {...heroReveal}
          transition={{ duration: 0.76, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className={`showcase-hero-stat-dock absolute bottom-11 z-10 hidden overflow-hidden border-y backdrop-blur-xl sm:block ${theme.statPanel}`}
        >
          <div className={`showcase-stat-rail divide-x ${theme.statDivider}`}>
            {eventStats.map((stat) => (
              <div key={stat.label} className="px-5 py-4 lg:px-7 lg:py-4">
                <div className="flex items-end gap-2">
                  <span className={`font-mono text-4xl font-black leading-none lg:text-5xl 2xl:text-6xl ${theme.statValue}`}>
                    {stat.value}
                  </span>
                  <span className={`pb-1 text-sm font-black lg:text-lg ${theme.statUnit}`}>{stat.unit}</span>
                </div>
                <p className={`mt-2 text-sm font-black ${theme.statLabel}`}>{stat.label}</p>
              </div>
            ))}
          </div>
        </MotionDiv>
      </section>

      <MotionSection
        id="gallery"
        {...reveal}
        className="showcase-snap-section relative flex min-h-[100svh] snap-start snap-always items-start overflow-hidden px-4 pb-28 pt-28 sm:px-6 sm:py-20 lg:items-center lg:px-10 lg:py-20 2xl:px-16"
      >
        <StageAtmosphere word="FIELD" align="left" />
        <div className="showcase-section-mark">02</div>
        <div className="pointer-events-none absolute left-0 top-1/4 h-80 w-80 bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-cyan-300/22 to-transparent" />
        <div className="relative mx-auto w-full max-w-[1740px]">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-black uppercase ${theme.chip}`}>
                <Radar className="h-4 w-4" />
                Chapter 02 / Gallery
              </p>
              <h2 className="mt-5 text-5xl font-black leading-none sm:text-7xl">
                赛场照片集锦
              </h2>
            </div>
            <div className="flex flex-col gap-4 md:items-end">
              <p className={`max-w-xl text-base leading-8 ${theme.muted}`}>
                用精选大图讲清楚事件规模、人物状态、组织质量和颁奖成果。
              </p>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  to="/gallery"
                  className={`inline-flex min-h-12 w-full items-center justify-center gap-2 border px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 sm:w-auto ${theme.secondaryButton}`}
                >
                  <ImageIcon className="h-4 w-4" />
                  查看所有照片
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => openOutcomeUpload("stage_photo")}
                  className={`inline-flex min-h-12 w-full items-center justify-center gap-2 px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 sm:w-auto ${theme.primaryButton}`}
                >
                  <Upload className="h-4 w-4" />
                  上传赛场照片
                </button>
              </div>
            </div>
          </div>

          <div className="showcase-gallery-grid mt-10">
            {galleryMoments.map((moment, index) => (
              <article
                key={moment.id}
                className={`showcase-gallery-card group relative overflow-hidden border ${isDayMode ? "border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]" : "border-cyan-300/[0.18] bg-black/20 shadow-[0_0_42px_rgba(34,211,238,0.08)]"}`}
              >
                <img
                  src={moment.image}
                  alt={moment.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                  style={{ filter: "brightness(0.76) saturate(1.2) contrast(1.06)" }}
                />
                <div className="showcase-gallery-overlay absolute inset-0" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
                <div className="showcase-gallery-copy absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <div className="mb-2 inline-flex items-center gap-2 border border-cyan-200/40 bg-cyan-300 px-2.5 py-1.5 text-[11px] font-black uppercase text-slate-950">
                    <Camera className="h-3.5 w-3.5" />
                    {moment.label}
                  </div>
                  <h3 className="text-xl font-black text-white sm:text-2xl xl:text-3xl">
                    {moment.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-xs leading-5 text-white/82 sm:text-sm sm:leading-6">{moment.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection
        id="works"
        {...reveal}
        className="showcase-snap-section showcase-mobile-tight relative flex min-h-[100svh] snap-start snap-always items-start overflow-hidden px-4 pb-28 pt-28 sm:px-6 sm:py-20 lg:items-center lg:px-10 lg:py-20 2xl:px-16"
      >
        <StageAtmosphere word="WORKS" align="right" />
        <div className="showcase-section-mark">03</div>
        <div className="pointer-events-none absolute right-0 top-20 h-96 w-96 bg-cyan-300/10 blur-3xl" />
        <div className="relative mx-auto w-full max-w-[1740px]">
          <div>
            <div>
              <p className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-black uppercase ${theme.chip}`}>
                <CircuitBoard className="h-4 w-4" />
                Chapter 03 / Winning Works
              </p>
              <h2 className="mt-5 text-5xl font-black leading-none sm:text-7xl">
                优秀作品展示
              </h2>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/hackathon/works"
                className={`inline-flex min-h-12 items-center justify-center gap-2 border px-5 text-sm font-black transition duration-200 ${theme.chip} hover:border-cyan-300/60 hover:text-cyan-300`}
              >
                查看全部 {publishedWorksCount} 个获奖作品
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => openOutcomeUpload("work")}
                className={`inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 ${theme.primaryButton}`}
              >
                <Upload className="h-4 w-4" />
                提交作品/经验
              </button>
            </div>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {showcaseWorks.map((work, index) => (
              <article
                key={work.id}
                className={`showcase-work-card group flex min-h-[520px] flex-col overflow-hidden border ${theme.panelStrong} transition duration-300 hover:-translate-y-1 hover:border-cyan-300/50 hover:shadow-[0_34px_120px_rgba(34,211,238,0.14)]`}
              >
                <div className="showcase-project-surface relative min-h-[250px] overflow-hidden">
                  <span className={`showcase-work-rank absolute right-4 top-2 z-10 font-mono text-[112px] font-black leading-none ${isDayMode ? "text-slate-900/[0.075]" : "text-white/[0.055]"}`}>
                    {work.rank}
                  </span>
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />
                  <div className={`absolute left-5 top-5 z-10 border px-3 py-2 text-xs font-black uppercase backdrop-blur ${theme.cinemaBadge}`}>
                    Project {work.rank}
                  </div>
                  <div className="absolute bottom-5 left-5 right-5 z-10">
                    <div className={`flex items-center gap-2 ${theme.accent}`}>
                      <Trophy className="h-5 w-5" />
                      <span className="text-sm font-black uppercase">{work.award}</span>
                    </div>
                    <div className={`mt-4 h-1 w-full ${isDayMode ? "bg-slate-200" : "bg-white/12"}`}>
                      <div className={`h-full shadow-[0_0_18px_currentColor] ${index === 0 ? "w-full bg-amber-300 text-amber-300" : "w-3/4 bg-cyan-300 text-cyan-300"}`} />
                    </div>
                  </div>
                </div>

                <div className="showcase-work-body flex flex-1 flex-col p-6">
                  <h3 className="showcase-work-title text-3xl font-black">{work.title}</h3>
                  <p className={`mt-3 flex-1 text-sm font-bold ${theme.accent}`}>{work.author}</p>
                  {work.gitUrl ? (
                    <a
                      href={work.gitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-7 inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-sm font-black transition duration-200 ${theme.chip} hover:border-cyan-300/60 hover:text-cyan-300`}
                    >
                      Git 链接
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      to="/hackathon/works"
                      className={`mt-7 inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-sm font-black transition duration-200 ${theme.chip} hover:border-cyan-300/60 hover:text-cyan-300`}
                    >
                      查看详情
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection
        id="partners"
        {...reveal}
        className="showcase-snap-section showcase-mobile-tight relative flex min-h-[100svh] snap-start snap-always items-start overflow-hidden px-4 pb-40 pt-28 sm:px-6 sm:py-16 lg:items-center lg:px-10 lg:py-14 2xl:px-16"
      >
        <StageAtmosphere word="WITNESS" align="left" />
        <div className="showcase-section-mark">04</div>
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,rgba(103,232,249,0.12),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(129,140,248,0.10),transparent_34%)]" />
        <div className={`relative mx-auto w-full max-w-[1740px] border-y ${theme.border} ${theme.partnerShell} backdrop-blur-sm`}>
          <div className={`showcase-partner-layout border-b p-5 ${theme.border} lg:p-8`}>
            <aside className={`flex flex-col border-b pb-6 ${theme.border} lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8`}>
              <h2 className="text-4xl font-black leading-none sm:text-7xl">
                共同见证
              </h2>
              <p className={`mt-6 max-w-lg text-base leading-8 ${theme.muted}`}>
                学校支持、社团协作与企业生态共同在场，让赛后传播有清晰背书。
              </p>
              <div className={`mt-8 border-t pt-6 ${theme.border} lg:mt-auto`}>
                <p className={`text-xs font-black uppercase tracking-[0.22em] ${theme.accent}`}>
                  支持阵容
                </p>
                <p className="mt-2 text-3xl font-black tracking-tight">
                  {supportLineup.length} 类 / {supportPartnerCount} 个支持方
                </p>
                <p className={`mt-2 text-sm font-semibold leading-7 ${theme.muted}`}>
                  学校、社团与企业伙伴共同构成完整赛事背书。
                </p>
              </div>
            </aside>

            <div className="grid gap-3 lg:gap-4">
              {supportLineup.map((group, index) => (
                <section
                  key={group.label}
                  className={`showcase-support-board border p-4 sm:p-5 ${theme.chip}`}
                >
                  <div className={`flex flex-col justify-between border-b pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-5 ${theme.border}`}>
                    <div>
                      <p className={`font-mono text-xs font-black uppercase tracking-[0.18em] ${theme.accent}`}>
                        0{index + 1}
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                        {group.label}
                      </h3>
                    </div>
                    <p className={`mt-3 text-xs font-semibold leading-6 ${theme.muted}`}>
                      {group.detail}
                    </p>
                  </div>

                  <div
                    className={`showcase-support-partners min-w-0 ${
                      group.logo
                        ? "showcase-support-partners--enterprise"
                        : index === 0
                          ? "showcase-support-partners--school"
                          : "showcase-support-partners--campus"
                    }`}
                  >
                    {group.partners.map((partner) => (
                      group.logo ? (
                        <div
                          key={partner.id || partner.logo_url || partner.name}
                          className={`showcase-support-tile group flex flex-col items-center justify-center gap-2 border px-3 py-3 text-center transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-cyan-300/[0.08] sm:min-h-[5.25rem] lg:min-h-[5.7rem] ${theme.chip}`}
                        >
                          {partner.logo_url || partner.dark_logo_url ? (
                            <img
                              src={isDayMode ? partner.logo_url || partner.dark_logo_url : partner.dark_logo_url || partner.logo_url}
                              alt={`${partner.name} logo`}
                              className={`max-h-8 w-auto max-w-full object-contain opacity-95 transition duration-300 group-hover:scale-[1.04] ${partner.size || ""} ${!isDayMode ? partner.darkClassName || "" : ""}`}
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-base font-black">{partner.name}</span>
                          )}
                          <span className={`text-[10px] font-black uppercase leading-tight ${theme.soft}`}>
                            {partnerDisplayName(partner)}
                          </span>
                        </div>
                      ) : (
                        <div
                          key={partner.id || partner.name}
                          className={`showcase-support-tile flex items-center justify-center border px-3 py-3 text-center text-base font-black tracking-tight transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/50 hover:bg-cyan-300/[0.08] sm:min-h-[5.25rem] sm:text-lg ${theme.chip}`}
                        >
                          {partner.name}
                        </div>
                      )
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className={`flex flex-col gap-5 p-5 ${theme.border} lg:flex-row lg:items-center lg:justify-between lg:p-6`}>
            <div className="showcase-action-tool-grid flex-1">
              {actionLinks.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    className={`group flex min-h-14 items-center gap-3 border px-4 text-left transition duration-300 ${theme.chip} hover:-translate-y-0.5 hover:border-cyan-300/60`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${theme.accent}`} />
                    <span>
                      <span className="block text-sm font-black">{action.label}</span>
                      <span className={`mt-0.5 block text-xs leading-5 ${theme.soft}`}>{action.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                to="/articles"
                className={`inline-flex min-h-12 items-center justify-center gap-2 px-6 text-sm font-black transition ${theme.ctaPrimary}`}
              >
                加入 AI 社区
                <Users className="h-4 w-4" />
              </Link>
              <Link
                to="/hackathon"
                className={`inline-flex min-h-12 items-center justify-center gap-2 border px-6 text-sm font-bold transition ${theme.chip} hover:border-cyan-300/60`}
              >
                返回赛事页
                <CalendarDays className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </MotionSection>
      <CompetitionOutcomeUploadModal
        open={Boolean(uploadType)}
        initialType={uploadType || "stage_photo"}
        onClose={() => setUploadType(null)}
        onSubmitted={fetchOutcome}
      />
    </div>
  );
};

export default HackathonShowcase;
