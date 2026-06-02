import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Play,
  Sparkles,
  Trophy,
  Upload,
  Users,
} from "lucide-react";

import { podiumWorks as fallbackPodiumWorks } from "../data/hackathonWorks";
import { getPartnerDisplayName, getPartnerLogoSrc } from "../data/partnerLogos";
import { useSettings } from "../context/SettingsContext";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import { useReducedMotion } from "../utils/animations";
import api from "../services/api";
import CompetitionOutcomeUploadModal from "./CompetitionOutcomeUploadModal";
import SEO from "./SEO";

const HERO_IMAGE = "/images/hero-campus-day-4k.jpg";
const SECONDARY_IMAGE = "/images/hero-landscape-day-4k.jpg";

const eventStats = [
  { value: "5", unit: "小时", label: "极速交付", detail: "限定时间内完成真实可运行 AI 应用" },
  { value: "1", unit: "个人", label: "独立参赛", detail: "强调独立构思、构建、调试和交付" },
  { value: "0", unit: "路演", label: "只看作品", detail: "减少包装，把判断交给可运行成果" },
  { value: "17,500", shortValue: "1.75万", unit: "¥", label: "奖金池", detail: "以作品质量和落地潜力完成激励" },
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
    label: "开发现场",
    title: "从提示词到产品上线",
    caption: "AI 工具链辅助架构、代码、调试和演示素材，现场节奏进入冲刺模式。",
    image: SECONDARY_IMAGE,
  },
  {
    id: "speech",
    label: "现场发言",
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
  { label: "完整相册", detail: "开幕式、开发现场、颁奖、交流分组", icon: ImageIcon, to: "/gallery" },
  { label: "作品索引", detail: "获奖作品、Git 链接、经验分享", icon: Trophy, to: "/hackathon/works" },
  { label: "后续共创", detail: "加入社群，继续参与 AI 实践", icon: Sparkles, to: "/articles" },
];

const showcaseSections = [
  { id: "gate", no: "01", title: "首页" },
  { id: "gallery", no: "02", title: "赛场" },
  { id: "works", no: "03", title: "作品" },
  { id: "partners", no: "04", title: "共创" },
];

const normalizeShowcaseRank = (rank, index) => {
  const value = String(rank || index + 1).trim();
  return /^\d+$/.test(value) ? value.padStart(2, "0") : value;
};

const MotionSection = motion.section;
const MotionDiv = motion.div;

const PartnerLogoMark = ({ partner, isDayMode }) => {
  const src = getPartnerLogoSrc(partner, isDayMode);
  const name = getPartnerDisplayName(partner);
  const shouldShowName = !src || partner.text || /qoder/i.test(name);

  return (
    <div
      className="showcase-logo-tile group flex min-h-[3rem] min-w-0 items-center justify-center gap-2 border px-2 transition duration-300"
      title={name}
    >
      {src ? (
        <img
          src={src}
          alt={`${name} logo`}
          className={`showcase-logo-image max-w-full object-contain opacity-95 transition duration-300 group-hover:scale-[1.03] ${
            partner.size || ""
          } ${!isDayMode ? partner.darkClassName || "" : ""}`}
          loading="eager"
        />
      ) : null}
      {shouldShowName ? (
        <span className="showcase-logo-text min-w-0 truncate text-xs font-black leading-none tracking-normal">
          {name}
        </span>
      ) : null}
    </div>
  );
};

const SectionHeader = ({ eyebrow, title, copy, icon: Icon, theme, align = "left" }) => (
  <div
    className={`flex flex-col gap-5 ${
      align === "split" ? "xl:flex-row xl:items-end xl:justify-between" : ""
    }`}
  >
    <div>
      <p className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase ${theme.chip}`}>
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {eyebrow}
      </p>
      <h2 className="mt-5 max-w-4xl text-[clamp(2.5rem,8vw,4.8rem)] font-black leading-[0.96] sm:text-6xl xl:text-7xl">
        {title}
      </h2>
    </div>
    {copy ? (
      <p className={`max-w-2xl text-sm font-semibold leading-7 sm:text-base sm:leading-8 ${theme.muted}`}>
        {copy}
      </p>
    ) : null}
  </div>
);

const HackathonShowcase = () => {
  const { uiMode } = useSettings();
  const { groups: ecosystemPartnerGroups } = useEcosystemPartners();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion;
  const isDayMode = uiMode === "day";
  const pageRef = useRef(null);
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [uploadType, setUploadType] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

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
    if (!container) return undefined;

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
    };
  }, []);

  const smoothScrollTo = (id) => {
    const target = document.getElementById(id);
    const scroller = pageRef.current;
    if (!target || !scroller) return;

    const topOffset = window.matchMedia("(max-width: 640px)").matches ? 76 : 24;
    const targetIndex = showcaseSections.findIndex((section) => section.id === id);
    if (targetIndex >= 0) setActiveSection(targetIndex);

    scroller.scrollTo({
      top: Math.max(target.offsetTop - topOffset, 0),
      behavior: shouldAnimate ? "smooth" : "auto",
    });
  };

  const openOutcomeUpload = (type = "stage_photo") => {
    setUploadType(type);
  };

  const officialVideo = outcome?.media?.promo_videos?.[0] || null;
  const officialVideoCover = officialVideo?.cover_url || SECONDARY_IMAGE;

  useEffect(() => {
    setIsVideoPlaying(false);
  }, [officialVideo?.url]);

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

    return [...dynamicMoments, ...mediaMoments.slice(dynamicMoments.length)].slice(0, 5);
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
      boundIdentityName: work.bound_identity_name || work.boundIdentityName || "",
      gitUrl: work.git_url || work.gitUrl || "",
      cover: work.cover_url || work.cover || (index % 2 === 0 ? HERO_IMAGE : SECONDARY_IMAGE),
      summary: work.summary || work.description || "",
      honorTitle: work.honor_title || work.honorTitle || work.award || "Top 20 获奖成员",
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
        page: "bg-[#f6f8fb] text-slate-950",
        surface: "border-slate-200 bg-white/86 shadow-[0_24px_80px_rgba(15,23,42,0.10)]",
        surfaceStrong: "border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.13)]",
        muted: "text-slate-600",
        soft: "text-slate-500",
        border: "border-slate-200",
        chip: "border-slate-200 bg-white/78 text-slate-700",
        accent: "text-cyan-700",
        progress: "from-cyan-500 via-amber-400 to-lime-500",
        primaryButton:
          "bg-slate-950 text-white shadow-[0_18px_42px_rgba(15,23,42,0.20)] hover:bg-cyan-700 focus:ring-cyan-500/24",
        secondaryButton:
          "border-slate-300 bg-white/78 text-slate-800 hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 focus:ring-cyan-500/20",
        navShell: "border-slate-200 bg-white/86 text-slate-700 shadow-[0_18px_60px_rgba(15,23,42,0.12)]",
        navActive: "border-slate-950 bg-slate-950 text-white",
        navIdle: "border-slate-200 bg-white/72 text-slate-600 hover:border-cyan-300 hover:text-cyan-700",
        overlay: "from-slate-950/78 via-slate-950/22 to-transparent",
      }
    : {
        page: "bg-[#050706] text-white",
        surface: "border-white/10 bg-[#0a1110]/82 shadow-[0_28px_90px_rgba(0,0,0,0.48)]",
        surfaceStrong: "border-white/12 bg-[#0b1210]/92 shadow-[0_34px_120px_rgba(0,0,0,0.58)]",
        muted: "text-white/68",
        soft: "text-white/46",
        border: "border-white/10",
        chip: "border-white/12 bg-white/[0.055] text-white/78",
        accent: "text-cyan-300",
        progress: "from-cyan-300 via-amber-300 to-lime-300",
        primaryButton:
          "bg-cyan-300 text-slate-950 shadow-[0_0_34px_rgba(103,232,249,0.26)] hover:bg-white focus:ring-cyan-300/28",
        secondaryButton:
          "border-white/14 bg-white/[0.07] text-white hover:border-cyan-300/60 hover:bg-cyan-300/10 focus:ring-cyan-300/20",
        navShell: "border-white/12 bg-[#07100f]/72 text-white shadow-[0_0_44px_rgba(103,232,249,0.10)]",
        navActive: "border-cyan-200 bg-cyan-300 text-slate-950",
        navIdle: "border-white/12 bg-black/22 text-white/64 hover:border-cyan-300/60 hover:text-white",
        overlay: "from-black/86 via-black/24 to-transparent",
      };

  const reveal = useMemo(
    () =>
      shouldAnimate
        ? {
            initial: { opacity: 0, y: 24 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, amount: 0.18 },
            transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
          }
        : {},
    [shouldAnimate],
  );

  const heroReveal = shouldAnimate
    ? {
        initial: { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
      }
    : {};

  const chapterNav =
    typeof document !== "undefined"
      ? createPortal(
          <nav
            aria-label="比赛成果展览章节"
            className={`fixed right-4 top-1/2 z-[120] hidden -translate-y-1/2 border p-2 backdrop-blur-2xl min-[1536px]:block ${theme.navShell}`}
          >
            <div className="grid gap-2">
              {showcaseSections.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => smoothScrollTo(step.id)}
                  className={`group relative flex h-10 w-10 items-center justify-center border text-[11px] font-black transition duration-200 ${
                    activeSection === index ? theme.navActive : theme.navIdle
                  }`}
                  aria-label={`跳转到${step.title}章节`}
                >
                  {step.no}
                  <span className={`pointer-events-none absolute right-full mr-3 min-w-[96px] border px-3 py-2 text-left text-[11px] font-black opacity-0 backdrop-blur transition duration-200 group-hover:opacity-100 ${theme.navShell}`}>
                    {step.title}
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
      data-showcase-page
      className={`showcase-page ${isDayMode ? "showcase-theme-day" : "showcase-theme-dark"} min-h-[100svh] overflow-y-auto overflow-x-hidden scroll-smooth overscroll-y-contain min-[1536px]:h-[100svh] ${theme.page}`}
      style={{
        fontFamily:
          '"HarmonyOS Sans SC", "MiSans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      }}
    >
      <SEO
        title="AI 全栈极速黑客松比赛成果"
        description="AI 全栈极速黑客松比赛成果页，集中呈现宣传片、赛场照片、优秀作品和活动成果。"
        image={HERO_IMAGE}
      />
      <style>
        {`
          .showcase-page {
            scroll-padding-top: 5rem;
          }

          .showcase-page::selection {
            background: rgba(103, 232, 249, 0.32);
          }

          .showcase-stage-bg {
            background:
              linear-gradient(rgba(103, 232, 249, 0.065) 1px, transparent 1px),
              linear-gradient(90deg, rgba(103, 232, 249, 0.05) 1px, transparent 1px);
            background-size: 64px 64px;
            mask-image: linear-gradient(180deg, black 0%, black 76%, transparent 100%);
          }

          .showcase-theme-day .showcase-stage-bg {
            background:
              linear-gradient(rgba(8, 145, 178, 0.075) 1px, transparent 1px),
              linear-gradient(90deg, rgba(8, 145, 178, 0.052) 1px, transparent 1px);
          }

          .showcase-logo-tile {
            border-color: rgba(148, 163, 184, 0.28);
            background: rgba(255, 255, 255, 0.06);
          }

          .showcase-theme-day .showcase-logo-tile {
            background: rgba(255, 255, 255, 0.62);
          }

          .showcase-logo-image {
            max-height: 1.65rem;
          }

          @media (min-width: 640px) {
            .showcase-logo-image {
              max-height: 1.9rem;
            }
          }

          .showcase-logo-text {
            max-width: 4.6rem;
          }

          .showcase-title {
            font-size: clamp(3.25rem, 15vw, 5.15rem);
            line-height: 0.92;
            letter-spacing: 0;
          }

          @media (min-width: 641px) {
            .showcase-title {
              font-size: clamp(5rem, 8.4vw, 7.4rem);
              line-height: 0.91;
            }
          }

          @media (min-width: 1280px) {
            .showcase-title {
              font-size: clamp(6.4rem, 7.4vw, 8.4rem);
            }
          }

          @media (min-width: 1720px) {
            .showcase-title {
              font-size: clamp(7.5rem, 7vw, 9.2rem);
            }
          }

          .showcase-gallery-grid {
            display: grid;
            gap: 0.75rem;
            grid-auto-rows: minmax(13rem, 32vh);
          }

          @media (min-width: 768px) {
            .showcase-gallery-grid {
              grid-template-columns: repeat(12, minmax(0, 1fr));
              grid-auto-rows: minmax(15rem, 28vh);
            }

            .showcase-gallery-card:nth-child(1) {
              grid-column: 1 / 7;
              grid-row: span 2;
            }

            .showcase-gallery-card:nth-child(2) {
              grid-column: 7 / 13;
            }

            .showcase-gallery-card:nth-child(3) {
              grid-column: 7 / 10;
            }

            .showcase-gallery-card:nth-child(4) {
              grid-column: 10 / 13;
            }

            .showcase-gallery-card:nth-child(5) {
              grid-column: 1 / 13;
              grid-row: span 1;
            }
          }

          @media (min-width: 1180px) {
            .showcase-gallery-grid {
              grid-auto-rows: minmax(16rem, 30vh);
            }

            .showcase-gallery-card:nth-child(5) {
              grid-column: 1 / 7;
            }
          }

          @media (min-width: 1536px) {
            .showcase-gallery-grid {
              grid-auto-rows: minmax(17rem, 31vh);
            }
          }

          .showcase-media-overlay {
            background:
              linear-gradient(180deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.1) 34%, rgba(0, 0, 0, 0.82) 100%),
              linear-gradient(90deg, rgba(0, 0, 0, 0.42), transparent 58%);
          }

          .showcase-work-cover::after {
            content: "";
            position: absolute;
            inset: 0;
            background:
              linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.68) 100%),
              linear-gradient(90deg, rgba(0, 0, 0, 0.28), transparent 64%);
            pointer-events: none;
          }

          .showcase-theme-day .showcase-work-cover::after {
            background:
              linear-gradient(180deg, rgba(15, 23, 42, 0.02) 0%, rgba(15, 23, 42, 0.58) 100%),
              linear-gradient(90deg, rgba(15, 23, 42, 0.22), transparent 64%);
          }

          @media (max-width: 520px) {
            .showcase-logo-tile {
              min-height: 3rem;
              padding-left: 0.35rem;
              padding-right: 0.35rem;
            }
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

      <section
        id="gate"
        className="relative isolate min-h-[100svh] overflow-hidden px-4 pb-16 pt-[calc(env(safe-area-inset-top)+7.2rem)] sm:px-6 sm:pb-20 sm:pt-[calc(env(safe-area-inset-top)+8rem)] lg:px-10 lg:pb-20 xl:px-14 min-[1536px]:pt-[calc(env(safe-area-inset-top)+7.4rem)] 2xl:px-20"
      >
        <div className="showcase-stage-bg absolute inset-0 opacity-80" aria-hidden="true" />
        <div
          className={`absolute inset-x-0 top-0 h-44 bg-gradient-to-b ${
            isDayMode ? "from-white/92 to-transparent" : "from-black/78 to-transparent"
          }`}
          aria-hidden="true"
        />
        <div
          className={`absolute bottom-0 left-0 right-0 h-[42%] bg-gradient-to-t ${
            isDayMode ? "from-[#f6f8fb] via-[#f6f8fb]/86 to-transparent" : "from-[#050706] via-[#050706]/80 to-transparent"
          }`}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-[-8vw] top-[18vh] hidden font-mono text-[12rem] font-black leading-none text-white/[0.035] min-[1536px]:block"
          aria-hidden="true"
        >
          2026
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-[1880px] gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(460px,0.74fr)] xl:items-end xl:gap-10 xl:pt-16 min-[1536px]:grid-cols-[minmax(0,1.02fr)_minmax(560px,0.82fr)] min-[1536px]:gap-14 min-[1536px]:pt-20 2xl:grid-cols-[minmax(0,1fr)_minmax(720px,0.86fr)] 2xl:gap-20 2xl:pt-24">
          <MotionDiv {...heroReveal} className="min-w-0">
            <p className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase ${theme.chip}`}>
              <Film className="h-4 w-4" />
              AI Build Arena 2026
            </p>
            <h1 data-showcase-title className={`showcase-title mt-5 max-w-[1120px] font-black ${isDayMode ? "text-slate-950" : "text-white"}`}>
              <span className="block whitespace-nowrap">AI 全栈极速</span>
              <span className={`block ${isDayMode ? "text-cyan-700" : "text-cyan-200"}`}>比赛成果</span>
            </h1>
            <p className={`mt-5 max-w-4xl text-base font-semibold leading-7 sm:text-lg sm:leading-8 lg:text-xl lg:leading-9 min-[1536px]:text-[1.35rem] min-[1536px]:leading-10 ${theme.muted}`}>
              这不是报名页的延长线，而是一份赛后作品档案：宣传片、现场照片、获奖项目和支持阵容在同一个清晰界面里完成展示。
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => openOutcomeUpload("stage_photo")}
                className={`inline-flex min-h-12 items-center justify-center gap-2 px-6 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 ${theme.primaryButton}`}
              >
                <Upload className="h-4 w-4" />
                提交成果
              </button>
              <button
                type="button"
                onClick={() => smoothScrollTo("works")}
                className={`inline-flex min-h-12 items-center justify-center gap-2 border px-6 text-sm font-bold transition duration-200 focus:outline-none focus:ring-4 ${theme.secondaryButton}`}
              >
                查看优秀作品
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#showcase-official-film"
                onClick={(event) => {
                  event.preventDefault();
                  smoothScrollTo("showcase-official-film");
                }}
                className={`inline-flex min-h-12 items-center justify-center gap-2 border px-6 text-sm font-bold transition duration-200 focus:outline-none focus:ring-4 ${theme.secondaryButton}`}
              >
                <Play className="h-4 w-4 fill-current" />
                观看宣传片
              </a>
            </div>
          </MotionDiv>

          <MotionDiv
            {...heroReveal}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            id="showcase-official-film"
            className={`relative min-h-[17rem] overflow-hidden border sm:min-h-[23rem] lg:min-h-[29rem] xl:min-h-[28rem] min-[1536px]:min-h-[34rem] 2xl:min-h-[39rem] ${theme.surfaceStrong}`}
          >
            <img
              src={officialVideoCover}
              alt="黑客松宣传片封面"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: "brightness(0.74) saturate(1.14) contrast(1.04)" }}
              onError={(event) => {
                event.currentTarget.src = SECONDARY_IMAGE;
              }}
            />
            {officialVideo?.url && isVideoPlaying ? (
              <video
                className="absolute inset-0 z-20 h-full w-full bg-black object-contain"
                controls
                autoPlay
                preload="metadata"
                poster={officialVideoCover}
              >
                <source src={officialVideo.url} />
              </video>
            ) : null}
            <div className={`showcase-media-overlay absolute inset-0 transition-opacity duration-300 ${isVideoPlaying ? "opacity-0" : "opacity-100"}`} />
            <div className="absolute left-4 top-4 z-10 border border-white/18 bg-black/28 px-3 py-2 text-xs font-black uppercase text-white backdrop-blur">
              {officialVideo?.title || "Official Film"}
            </div>
            {!isVideoPlaying ? (
              <button
                type="button"
                onClick={() => (officialVideo?.url ? setIsVideoPlaying(true) : openOutcomeUpload("promo_video"))}
                className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/24 bg-white/16 text-white backdrop-blur-xl transition duration-300 hover:scale-105 hover:bg-cyan-300 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-300/24 sm:h-20 sm:w-20"
                aria-label={officialVideo?.url ? "播放赛事宣传片" : "上传赛事宣传片"}
              >
                <Play className="ml-1 h-7 w-7 fill-current" />
              </button>
            ) : null}
            {!isVideoPlaying ? (
            <div className="absolute bottom-0 left-0 right-0 z-10 p-5 sm:p-7">
              <p className="text-xs font-black uppercase text-cyan-200">Trailer / Gallery / Works</p>
              <h2 className="mt-2 max-w-2xl text-3xl font-black leading-tight text-white sm:text-5xl">
                从赛场声浪到作品上线
              </h2>
            </div>
            ) : null}
          </MotionDiv>
        </div>

        <MotionDiv
          {...heroReveal}
          transition={{ duration: 0.7, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto mt-6 grid w-full max-w-[1880px] gap-3 sm:grid-cols-2 lg:mt-8 lg:grid-cols-4 min-[1536px]:gap-4"
        >
          {eventStats.map((stat) => (
            <div key={stat.label} className={`border p-4 backdrop-blur-xl min-[1536px]:p-5 2xl:p-6 ${theme.surface}`}>
              <div className="flex items-end gap-2">
                <span className={`font-mono text-4xl font-black leading-none sm:text-5xl ${isDayMode ? "text-slate-950" : "text-cyan-100"}`}>
                  {stat.shortValue || stat.value}
                </span>
                <span className={`pb-1 text-sm font-black ${theme.muted}`}>{stat.unit}</span>
              </div>
              <p className="mt-3 text-base font-black">{stat.label}</p>
              <p className={`mt-1 text-xs font-semibold leading-5 ${theme.soft}`}>{stat.detail}</p>
            </div>
          ))}
        </MotionDiv>
      </section>

      <MotionSection id="gallery" {...reveal} className="relative px-4 py-14 sm:px-6 sm:py-16 lg:px-10 lg:py-20 xl:px-14 2xl:px-20">
        <div className="mx-auto w-full max-w-[1880px]">
          <SectionHeader
            eyebrow="Chapter 02 / Gallery"
            title="赛场照片集锦"
            copy="成果页不应该只靠大标题撑场面。这里用真实影像建立事件可信度：人、现场、颁奖和交流都要看得见。"
            icon={Camera}
            theme={theme}
            align="split"
          />
          <div className="showcase-gallery-grid mt-8 sm:mt-10">
            {galleryMoments.map((moment, index) => (
              <article
                key={moment.id}
                className={`showcase-gallery-card group relative overflow-hidden border ${theme.surfaceStrong}`}
              >
                <img
                  src={moment.image}
                  alt={moment.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                  style={{ filter: "brightness(0.78) saturate(1.12) contrast(1.03)" }}
                  loading={index === 0 ? "eager" : "lazy"}
                />
                <div className="showcase-media-overlay absolute inset-0" />
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 lg:p-6">
                  <div className="mb-3 inline-flex items-center gap-2 border border-cyan-200/40 bg-cyan-300 px-2.5 py-1.5 text-[11px] font-black uppercase text-slate-950">
                    <Camera className="h-3.5 w-3.5" />
                    {moment.label}
                  </div>
                  <h3 className="max-w-2xl text-2xl font-black leading-tight text-white sm:text-3xl">
                    {moment.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-xs font-semibold leading-5 text-white/78 sm:text-sm sm:leading-6">
                    {moment.caption}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/gallery"
              className={`inline-flex min-h-12 items-center justify-center gap-2 border px-5 text-sm font-black transition duration-200 ${theme.secondaryButton}`}
            >
              <ImageIcon className="h-4 w-4" />
              查看所有照片
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => openOutcomeUpload("stage_photo")}
              className={`inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 ${theme.primaryButton}`}
            >
              <Upload className="h-4 w-4" />
              上传赛场照片
            </button>
          </div>
        </div>
      </MotionSection>

      <MotionSection id="works" {...reveal} className="relative px-4 py-14 sm:px-6 sm:py-16 lg:px-10 lg:py-20 xl:px-14 2xl:px-20">
        <div className="mx-auto w-full max-w-[1880px]">
          <SectionHeader
            eyebrow="Chapter 03 / Winning Works"
            title="优秀作品展示"
            copy="作品卡片从原来的装饰型展示改成结果型展示：名次、荣誉、作者、简介和 Git 入口都在同一张卡内完成判断。"
            icon={Trophy}
            theme={theme}
            align="split"
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:mt-10 xl:grid-cols-3 min-[1720px]:gap-5">
            {showcaseWorks.map((work, index) => (
              <article
                key={work.id}
                className={`group flex min-h-[420px] flex-col overflow-hidden border transition duration-300 hover:-translate-y-1 sm:min-h-[470px] xl:min-h-[500px] min-[1720px]:min-h-[540px] ${theme.surfaceStrong}`}
              >
                <Link
                  to="/hackathon/works"
                  className="showcase-work-cover relative block min-h-[210px] overflow-hidden sm:min-h-[235px] xl:min-h-[250px] min-[1720px]:min-h-[290px]"
                  aria-label={`查看${work.title}详情`}
                >
                  <img
                    src={work.cover || (index % 2 === 0 ? HERO_IMAGE : SECONDARY_IMAGE)}
                    alt={`${work.title} 作品封面`}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                    style={{ filter: isDayMode ? "brightness(0.88) saturate(1.08) contrast(1.02)" : "brightness(0.7) saturate(1.16) contrast(1.06)" }}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                  <span className="absolute right-4 top-2 z-10 font-mono text-[6rem] font-black leading-none text-white/[0.11]">
                    {work.rank}
                  </span>
                  <div className="absolute left-5 top-5 z-10 border border-white/18 bg-black/30 px-3 py-2 text-xs font-black uppercase text-white backdrop-blur">
                    Project {work.rank}
                  </div>
                  <div className="absolute bottom-5 left-5 right-5 z-10">
                    <div className="flex items-center gap-2 text-cyan-200">
                      <Trophy className="h-5 w-5" />
                      <span className="line-clamp-1 text-sm font-black uppercase">{work.honorTitle || work.award}</span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 max-w-[88%] text-3xl font-black leading-tight text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                      {work.title}
                    </h3>
                  </div>
                </Link>
                <div className="flex flex-1 flex-col p-4 sm:p-5 min-[1536px]:p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className={`border px-2.5 py-1 text-xs font-black ${theme.chip}`}>{work.award}</span>
                    <span className={`border px-2.5 py-1 text-xs font-black ${theme.chip}`}>
                      {work.author}{work.boundIdentityName ? ` · ${work.boundIdentityName}` : ""}
                    </span>
                  </div>
                  {work.summary ? (
                    <p className={`mt-4 line-clamp-4 text-sm font-semibold leading-6 ${theme.muted}`}>{work.summary}</p>
                  ) : null}
                  {work.gitUrl ? (
                    <a
                      href={work.gitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-auto inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-sm font-black transition duration-200 ${theme.secondaryButton}`}
                    >
                      Git 链接
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      to="/hackathon/works"
                      className={`mt-auto inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-sm font-black transition duration-200 ${theme.secondaryButton}`}
                    >
                      查看详情
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/hackathon/works"
              className={`inline-flex min-h-12 items-center justify-center gap-2 border px-5 text-sm font-black transition duration-200 ${theme.secondaryButton}`}
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
      </MotionSection>

      <MotionSection id="partners" {...reveal} className="relative px-4 pb-40 pt-14 sm:px-6 sm:py-16 lg:px-10 lg:py-20 xl:px-14 2xl:px-20">
        <div className="mx-auto w-full max-w-[1880px]">
          <SectionHeader
            eyebrow="Chapter 04 / Ecosystem"
            title="共同见证"
            copy="合作方不再只是漂在首屏的装饰，而是形成赛事背书：学校、社团、企业分别承担资源、组织和技术生态。"
            icon={Users}
            theme={theme}
            align="split"
          />
          <div className={`mt-10 border ${theme.surface}`}>
            <div className={`grid gap-0 divide-y ${isDayMode ? "divide-slate-200" : "divide-white/10"}`}>
              {supportLineup.map((group, index) => (
                <section key={group.label} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:p-6 min-[1536px]:grid-cols-[22rem_minmax(0,1fr)]">
                  <div>
                    <p className={`font-mono text-xs font-black uppercase tracking-[0.18em] ${theme.accent}`}>
                      0{index + 1}
                    </p>
                    <h3 className="mt-2 text-2xl font-black tracking-normal sm:text-3xl">{group.label}</h3>
                    <p className={`mt-3 text-sm font-semibold leading-6 ${theme.muted}`}>{group.detail}</p>
                  </div>
                  <div className={`grid gap-2 ${group.logo ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 min-[1720px]:grid-cols-8" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 min-[1720px]:grid-cols-6"}`}>
                    {group.partners.map((partner) => (
                      group.logo ? (
                        <PartnerLogoMark
                          key={partner.id || partner.logo_url || partner.name}
                          partner={partner}
                          isDayMode={isDayMode}
                        />
                      ) : (
                        <div
                          key={partner.id || partner.name}
                          className={`flex min-h-[3.3rem] items-center justify-center border px-3 py-2 text-center text-sm font-black transition duration-300 hover:border-cyan-300/50 ${theme.chip}`}
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

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-stretch">
            <div className="grid gap-3 sm:grid-cols-3">
              {actionLinks.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    to={action.to}
                    className={`group flex min-h-20 items-center gap-3 border px-4 text-left transition duration-300 hover:-translate-y-0.5 ${theme.chip}`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${theme.accent}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{action.label}</span>
                      <span className={`mt-0.5 block text-xs font-semibold leading-5 ${theme.soft}`}>{action.detail}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                to="/articles"
                className={`inline-flex min-h-12 items-center justify-center gap-2 px-6 text-sm font-black transition ${theme.primaryButton}`}
              >
                加入 AI 社区
                <Users className="h-4 w-4" />
              </Link>
              <Link
                to="/hackathon?view=register"
                className={`inline-flex min-h-12 items-center justify-center gap-2 border px-6 text-sm font-bold transition ${theme.secondaryButton}`}
              >
                赛事报名页
                <CalendarDays className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <p className={`mt-6 text-sm font-semibold leading-7 ${theme.soft}`}>
            当前收录 {supportLineup.length} 类 / {supportPartnerCount} 个支持方。后台更新合作方后，首屏品牌带和共创区会一起同步。
          </p>
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
