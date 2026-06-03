import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Film,
  Github,
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
import { useSectionPager } from "../hooks/useSectionPager";
import { useReducedMotion } from "../utils/animations";
import api from "../services/api";
import CompetitionOutcomeUploadModal from "./CompetitionOutcomeUploadModal";
import SEO from "./SEO";

const HERO_IMAGE = "/images/hero-campus-day-4k.jpg";
const SECONDARY_IMAGE = "/images/hero-landscape-day-4k.jpg";

const eventStats = [
  { id: "hours", value: "5", unit: "小时", label: "极速交付", detail: "限定时间内完成真实可运行 AI 应用" },
  { id: "solo", value: "1", unit: "个人", label: "独立参赛", detail: "强调独立构思、构建、调试和交付" },
  { id: "pitch", value: "0", unit: "路演", label: "只看作品", detail: "减少包装，把判断交给可运行成果" },
  { id: "prize", value: "17,500", shortValue: "1.75万", unit: "¥", label: "奖金池", detail: "以作品质量和落地潜力完成激励" },
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

const showcaseSectionIds = showcaseSections.map((section) => section.id);

const normalizeShowcaseRank = (rank, index) => {
  const value = String(rank || index + 1).trim();
  return /^\d+$/.test(value) ? value.padStart(2, "0") : value;
};

const MotionSection = motion.section;
const MotionDiv = motion.div;

const partnerEnglishNameMap = {
  "未来学习中心": "Future Learning Center",
  "AI 联合实验室": "AI Joint Lab",
  "ModelScope 魔搭社区": "ModelScope",
  "阿里云": "Alibaba Cloud",
  "阶跃 StepFun": "StepFun",
};

const getLocalizedPartnerName = (partner = {}, language = "zh") => {
  if (language?.startsWith("en")) {
    if (partner.name_en) return partner.name_en;
    if (partnerEnglishNameMap[partner.name]) return partnerEnglishNameMap[partner.name];
  }
  return getPartnerDisplayName(partner);
};

const PartnerLogoMark = ({ partner, isDayMode, language }) => {
  const src = getPartnerLogoSrc(partner, isDayMode);
  const name = getLocalizedPartnerName(partner, language);
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
      <h2 className="showcase-poster-heading mt-5 max-w-4xl text-[clamp(2.5rem,8vw,4.8rem)] font-black sm:text-6xl xl:text-7xl">
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

const ShowcaseSectionFrame = ({
  id,
  children,
  className = "",
  backgroundWord,
  contentClassName = "items-center",
}) => (
  <MotionSection
    id={id}
    className={`relative grid min-h-[100svh] max-w-full snap-start overflow-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12 xl:px-14 2xl:px-20 ${className}`}
  >
    <div className="showcase-stage-bg pointer-events-none absolute inset-0 opacity-80" aria-hidden="true" />
    <div
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(103,232,249,0.14),transparent_28%),radial-gradient(circle_at_82%_28%,rgba(99,102,241,0.10),transparent_26%)]"
      aria-hidden="true"
    />
    {backgroundWord ? (
      <div
        className="pointer-events-none absolute left-[-2vw] top-[8%] max-w-full overflow-hidden font-black uppercase leading-none tracking-normal text-white/[0.035] text-[18vw]"
        aria-hidden="true"
      >
        {backgroundWord}
      </div>
    ) : null}
    <div className={`showcase-section-grid relative z-10 mx-auto grid min-h-[calc(100svh-4rem)] min-w-0 w-full max-w-[2200px] gap-7 sm:min-h-[calc(100svh-5rem)] lg:min-h-[calc(100svh-6rem)] xl:grid-cols-[minmax(0,0.9fr)_minmax(620px,1.1fr)] xl:gap-12 min-[1536px]:gap-16 2xl:gap-20 ${contentClassName}`}>
      {children}
    </div>
  </MotionSection>
);

const ShowcaseMetricTile = ({ stat, theme, isDayMode }) => (
  <div className={`group relative overflow-hidden border px-4 py-4 transition duration-300 hover:-translate-y-0.5 ${theme.surface}`}>
    <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${isDayMode ? "via-cyan-500/50" : "via-cyan-300/70"}`} />
    <div className="relative flex items-end gap-2">
      <span className={`font-mono text-4xl font-black leading-none tracking-normal sm:text-5xl ${theme.accent}`}>
        {stat.shortValue || stat.value}
      </span>
      <span className={`pb-1 text-sm font-black ${theme.muted}`}>{stat.unit}</span>
    </div>
    <p className="relative mt-3 text-base font-black tracking-normal">{stat.label}</p>
    <p className={`relative mt-1 text-xs font-semibold leading-5 ${theme.soft}`}>{stat.detail}</p>
  </div>
);

const ShowcaseImageCard = ({
  moment,
  index,
  theme,
  isDayMode,
  featured = false,
  compact = false,
}) => (
  <article
    className={`group relative min-h-[15rem] max-w-full overflow-hidden border ${theme.surfaceStrong} ${
      featured
        ? "min-h-[18rem] sm:min-h-[24rem] xl:h-full xl:min-h-0"
        : compact
          ? "min-h-[9rem] w-[18rem] shrink-0 sm:min-h-[9.5rem] sm:w-[22rem] xl:h-full xl:min-h-0 xl:w-auto"
          : "sm:min-h-[11.5rem] xl:min-h-[12rem] min-[1720px]:min-h-[13rem]"
    }`}
  >
    <img
      src={moment.image}
      alt={moment.title}
      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
      style={{ filter: isDayMode ? "brightness(1.04) saturate(1.08) contrast(1.01)" : "brightness(0.9) saturate(1.1) contrast(1.02)" }}
      loading={index === 0 ? "eager" : "lazy"}
    />
    <div className="showcase-media-overlay absolute inset-0" />
    <div className={`absolute inset-x-0 bottom-0 ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"} ${isDayMode ? "bg-gradient-to-t from-slate-950/70 via-slate-950/32 to-transparent" : ""}`}>
      <div className={`${compact ? "mb-2" : "mb-3"} inline-flex items-center gap-2 border border-cyan-200/40 bg-cyan-300 px-2.5 py-1.5 text-[11px] font-black uppercase text-slate-950`}>
        <Camera className="h-3.5 w-3.5" />
        {moment.label}
      </div>
      <h3 className={`showcase-image-title ${featured ? "max-w-[min(42rem,calc(100%-1rem))] text-3xl sm:text-5xl" : compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"} break-words font-black leading-[0.95] tracking-normal text-white`}>
        {moment.title}
      </h3>
      <p className={`showcase-image-copy ${compact ? "line-clamp-2" : "line-clamp-2"} mt-2 max-w-[min(42rem,calc(100%-1rem))] break-words text-xs font-semibold leading-5 text-white/78 sm:text-sm sm:leading-6`}>
        {moment.caption}
      </p>
    </div>
  </article>
);

const ShowcaseWorkCard = ({ work, index, theme, isDayMode, t, featured = false, compact = false, className = "" }) => {
  const hasGitUrl = Boolean(work.gitUrl);
  const badgeLabel = work.award || work.honorTitle || t("hackathon.showcase.works.fallback_award");

  return (
    <article
      className={`group grid overflow-hidden border transition duration-300 hover:-translate-y-0.5 ${theme.surface} ${
        featured
          ? "min-h-[25.5rem] grid-rows-[minmax(16rem,1fr)_auto] xl:min-h-full"
          : compact
            ? "min-h-[13.75rem] grid-rows-[minmax(10rem,1fr)_auto] xl:min-h-0"
            : "grid-cols-[minmax(118px,0.34fr)_minmax(0,0.66fr)]"
      } ${className}`}
    >
      <Link
        to="/hackathon/works"
        className={`showcase-work-cover relative block overflow-hidden ${
          featured ? "min-h-[14.25rem] xl:min-h-0" : compact ? "min-h-0" : "min-h-[128px]"
        }`}
        aria-label={t("hackathon.showcase.works.project_aria", { title: work.title })}
      >
        <img
          src={work.cover || (index % 2 === 0 ? HERO_IMAGE : SECONDARY_IMAGE)}
          alt={t("hackathon.showcase.works.cover_alt", { title: work.title })}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
          style={{ filter: isDayMode ? "brightness(1.03) saturate(1.08) contrast(1.01)" : "brightness(0.82) saturate(1.14) contrast(1.04)" }}
          loading={index === 0 ? "eager" : "lazy"}
        />
        <div className={`absolute inset-0 ${isDayMode ? "bg-gradient-to-t from-slate-950/12 via-transparent to-white/8" : "bg-gradient-to-t from-black/66 via-black/12 to-transparent"}`} />
        <div className={`showcase-award-badge absolute right-4 top-4 z-10 inline-flex items-center gap-2.5 overflow-hidden border px-3.5 py-2.5 text-sm font-black backdrop-blur ${isDayMode ? "showcase-award-badge-day border-cyan-200 bg-gradient-to-r from-white via-cyan-50 to-amber-50 text-slate-950 shadow-[0_18px_42px_rgba(8,145,178,0.22)] ring-1 ring-white/80" : "border-cyan-200/40 bg-slate-950/58 text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)]"} ${featured ? "showcase-award-badge-featured sm:px-5 sm:py-3.5 sm:text-lg" : ""}`}>
          <span className={`pointer-events-none absolute inset-x-2 top-0 h-px ${isDayMode ? "bg-gradient-to-r from-transparent via-cyan-300 to-transparent" : "bg-gradient-to-r from-transparent via-white/38 to-transparent"}`} />
          <span className={`grid shrink-0 place-items-center border ${featured ? "h-8 w-8" : "h-7 w-7"} ${isDayMode ? "border-cyan-200 bg-cyan-100 text-cyan-800 shadow-inner shadow-white/70" : "border-cyan-200/35 bg-cyan-300/14 text-cyan-100"}`}>
            <Trophy className={`${featured ? "h-5 w-5" : "h-4.5 w-4.5"} shrink-0`} />
          </span>
          {badgeLabel}
        </div>
        {featured ? (
          <div className="absolute bottom-4 left-5 right-5 z-10 sm:bottom-5 sm:left-6 sm:right-6">
            <p className="showcase-image-kicker text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Winner Focus</p>
            <p className="showcase-image-title mt-2 line-clamp-2 text-3xl font-black leading-tight text-white sm:text-[2.2rem]">{work.title}</p>
          </div>
        ) : compact ? (
          <div className="absolute bottom-3 left-3 right-3 z-10 sm:bottom-4 sm:left-4 sm:right-4">
            <p className="showcase-image-title line-clamp-2 text-xl font-black leading-tight text-white sm:text-2xl">{work.title}</p>
          </div>
        ) : null}
      </Link>
      <div className={`flex min-w-0 flex-col ${featured ? "p-3.5 sm:p-4" : compact ? "p-3" : "p-3 sm:p-3.5"}`}>
        <div className="flex flex-wrap gap-2">
          <span className={`border px-2.5 py-1 text-xs font-black ${theme.chip}`}>
            {work.author}{work.boundIdentityName ? ` / ${work.boundIdentityName}` : ""}
          </span>
        </div>
        {hasGitUrl ? (
          <a
            href={work.gitUrl}
            target="_blank"
            rel="noreferrer"
            title={work.gitUrl}
            className={`mt-auto inline-flex min-h-9 min-w-0 items-center gap-2 border px-3 text-xs font-black transition duration-200 hover:-translate-y-0.5 ${theme.secondaryButton}`}
            aria-label={t("hackathon.showcase.works.git_link")}
          >
            <Github className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{t("hackathon.showcase.works.git_link")}</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0" />
          </a>
        ) : null}
      </div>
    </article>
  );
};

const HackathonShowcase = () => {
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "zh";
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

  useSectionPager({
    containerRef: pageRef,
    sectionIds: showcaseSectionIds,
    activeIndex: activeSection,
    setActiveIndex: setActiveSection,
    reduceMotion,
    minWidth: 0,
    lockMs: 860,
  });

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
  const officialVideoUrl = officialVideo?.url || officialVideo?.video || officialVideo?.video_url || officialVideo?.videoUrl || officialVideo?.media_url || officialVideo?.mediaUrl || "";
  const officialVideoCover = officialVideo?.cover_url || officialVideo?.coverUrl || officialVideo?.thumbnail || officialVideo?.poster || SECONDARY_IMAGE;
  const translatedSections = useMemo(
    () =>
      showcaseSections.map((section) => ({
        ...section,
        title: t(`hackathon.showcase.sections.${section.id}`, section.title),
      })),
    [t],
  );
  const translatedEventStats = useMemo(
    () =>
      eventStats.map((stat) => ({
        ...stat,
        shortValue: t(`hackathon.showcase.stats.${stat.id}.short_value`, stat.shortValue || stat.value),
        unit: t(`hackathon.showcase.stats.${stat.id}.unit`, stat.unit),
        label: t(`hackathon.showcase.stats.${stat.id}.label`, stat.label),
        detail: t(`hackathon.showcase.stats.${stat.id}.detail`, stat.detail),
      })),
    [t],
  );
  const translatedMediaMoments = useMemo(
    () =>
      mediaMoments.map((moment) => ({
        ...moment,
        label: t(`hackathon.showcase.media.${moment.id}.label`, moment.label),
        title: t(`hackathon.showcase.media.${moment.id}.title`, moment.title),
        caption: t(`hackathon.showcase.media.${moment.id}.caption`, moment.caption),
      })),
    [t],
  );
  const translatedActionLinks = useMemo(
    () =>
      actionLinks.map((action, index) => ({
        ...action,
        label: t(`hackathon.showcase.actions.${index}.label`, action.label),
        detail: t(`hackathon.showcase.actions.${index}.detail`, action.detail),
      })),
    [t],
  );
  const translatedFallbackWorks = useMemo(
    () =>
      fallbackPodiumWorks.map((work, index) => ({
        ...work,
        award: t(`hackathon.showcase.fallback_works.${index}.award`, work.award),
        title: t(`hackathon.showcase.fallback_works.${index}.title`, work.title),
        author: t(`hackathon.showcase.fallback_works.${index}.author`, work.author),
        honorTitle: t(`hackathon.showcase.fallback_works.${index}.award`, work.award),
      })),
    [t],
  );

  useEffect(() => {
    setIsVideoPlaying(false);
  }, [officialVideoUrl]);

  const galleryMoments = useMemo(() => {
    const stagePhotos = Array.isArray(outcome?.media?.stage_photos)
      ? outcome.media.stage_photos
      : [];
    if (stagePhotos.length === 0) return translatedMediaMoments;

    const dynamicMoments = stagePhotos.slice(0, 5).map((item, index) => ({
      id: `${item.source_table || "stage"}-${item.source_id || item.id || index}`,
      label: item.type_label || item.category || t("hackathon.showcase.gallery.stage_photo", "赛场照片"),
      title: item.title || translatedMediaMoments[index % translatedMediaMoments.length].title,
      caption: item.description || item.gameDescription || t("hackathon.showcase.gallery.dynamic_caption", "来自画廊的黑客松成果照片，审核通过后自动同步到这里。"),
      image: item.cover_url || item.url || translatedMediaMoments[index % translatedMediaMoments.length].image,
    }));

    return [...dynamicMoments, ...translatedMediaMoments.slice(dynamicMoments.length)].slice(0, 5);
  }, [outcome, t, translatedMediaMoments]);

  const showcaseWorks = useMemo(() => {
    const works = Array.isArray(outcome?.works) ? outcome.works : [];
    if (works.length === 0) return translatedFallbackWorks;
    return works.slice(0, 3).map((work, index) => ({
      id: work.id,
      rank: normalizeShowcaseRank(work.rank, index),
      award: work.award || work.honor_title || t("hackathon.showcase.works.fallback_award", "优秀作品"),
      title: work.title || t("hackathon.showcase.works.fallback_title", "未命名作品"),
      author: work.author || work.uploader_name || t("hackathon.showcase.works.fallback_author", "获奖成员"),
      boundIdentityName: work.bound_identity_name || work.boundIdentityName || "",
      gitUrl: work.git_url || work.gitUrl || "",
      cover: work.cover_url || work.cover || (index % 2 === 0 ? HERO_IMAGE : SECONDARY_IMAGE),
      honorTitle: work.honor_title || work.honorTitle || work.award || t("hackathon.showcase.works.fallback_honor", "Top 20 获奖成员"),
    }));
  }, [outcome, t, translatedFallbackWorks]);

  const publishedWorksCount = outcome?.stats?.works || showcaseWorks.length;
  const supportLineup = useMemo(() => {
    const detailByCategory = {
      school: t("hackathon.showcase.partners.detail.school", "场地资源、导师评审、校园传播与长期机制支持。"),
      organization: t("hackathon.showcase.partners.detail.organization", "选手招募、志愿执行、现场协同与赛后社群承接。"),
      enterprise: t("hackathon.showcase.partners.detail.enterprise", "模型、云资源、AI 工具、技术支持与合作方传播露出。"),
    };

    return ecosystemPartnerGroups.map((group) => ({
      ...group,
      label: t(`hackathon.showcase.partners.groups.${group.id}`, group.label),
      detail: detailByCategory[group.id] || "",
      logo: group.id === "enterprise",
    }));
  }, [ecosystemPartnerGroups, t]);
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
          "border border-cyan-300 bg-cyan-100 text-cyan-950 shadow-[0_18px_42px_rgba(8,145,178,0.16)] hover:border-cyan-500 hover:bg-cyan-200 focus:ring-cyan-500/24",
        secondaryButton:
          "border-slate-300 bg-white/78 text-slate-800 hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 focus:ring-cyan-500/20",
        navShell: "border-slate-200 bg-white/86 text-slate-700 shadow-[0_18px_60px_rgba(15,23,42,0.12)]",
        navActive: "border-cyan-500 bg-cyan-100 text-cyan-950 shadow-[0_10px_28px_rgba(8,145,178,0.18)]",
        navIdle: "border-slate-200 bg-white/82 text-slate-600 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800",
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
            aria-label={t("hackathon.showcase.nav_aria", "比赛成果展览章节")}
            className={`fixed right-4 top-1/2 z-[120] hidden -translate-y-1/2 border p-2 backdrop-blur-2xl min-[1536px]:block ${theme.navShell}`}
          >
            <div className="grid gap-2">
              {translatedSections.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => smoothScrollTo(step.id)}
                  className={`group relative flex h-10 w-10 items-center justify-center border text-[11px] font-black transition duration-200 ${
                    activeSection === index ? theme.navActive : theme.navIdle
                  }`}
                  aria-label={t("hackathon.showcase.jump_to_section", "跳转到{{title}}章节", { title: step.title })}
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
      className={`showcase-page ${isDayMode ? "showcase-theme-day" : "showcase-theme-dark"} h-[100svh] snap-y snap-proximity overflow-y-auto overflow-x-hidden scroll-smooth overscroll-y-contain ${theme.page}`}
      style={{
        fontFamily:
          '"HarmonyOS Sans SC", "MiSans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      }}
    >
      <SEO
        title={t("hackathon.showcase.meta_title", "AI 全栈极速黑客松比赛成果")}
        description={t("hackathon.showcase.meta_desc", "AI 全栈极速黑客松比赛成果页，集中呈现宣传片、赛场照片、优秀作品和活动成果。")}
        image={HERO_IMAGE}
      />
      <style>
        {`
          .showcase-page {
            scroll-padding-top: 1.25rem;
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

          .showcase-section-grid > * {
            min-width: 0;
            max-width: 100%;
            width: 100%;
          }

          .showcase-title {
            font-family:
              "YouSheBiaoTiHei",
              "PangMenZhengDao",
              "Impact",
              "Alibaba PuHuiTi 3.0 115 Black",
              "Source Han Sans SC Heavy",
              "Source Han Sans CN Heavy",
              "Noto Sans CJK SC Black",
              "Microsoft YaHei UI",
              sans-serif;
            font-size: clamp(3.25rem, 15vw, 5.15rem);
            line-height: 0.98;
            letter-spacing: 0;
            font-stretch: condensed;
            font-synthesis-weight: none;
            text-wrap: balance;
            overflow-wrap: break-word;
            word-break: keep-all;
            text-shadow:
              0 0.03em 0 rgba(103, 232, 249, 0.24),
              0 0.105em 0 rgba(15, 23, 42, 0.58),
              0 0.22em 1.65rem rgba(103, 232, 249, 0.16);
            -webkit-text-stroke: 0.014em rgba(255, 255, 255, 0.18);
          }

          .showcase-title-line {
            display: block;
            max-width: 100%;
          }

          .showcase-poster-heading {
            font-family:
              "YouSheBiaoTiHei",
              "PangMenZhengDao",
              "Impact",
              "Alibaba PuHuiTi 3.0 115 Black",
              "Source Han Sans SC Heavy",
              "Source Han Sans CN Heavy",
              "Noto Sans CJK SC Black",
              "Microsoft YaHei UI",
              sans-serif;
            display: block;
            max-width: 100%;
            width: 100%;
            line-height: 0.98;
            letter-spacing: 0;
            font-stretch: condensed;
            font-synthesis-weight: none;
            text-wrap: balance;
            overflow-wrap: break-word;
            word-break: keep-all;
            text-shadow:
              0 0.032em 0 rgba(103, 232, 249, 0.22),
              0 0.105em 0 rgba(15, 23, 42, 0.48),
              0 0.22em 1.35rem rgba(103, 232, 249, 0.14);
            -webkit-text-stroke: 0.012em rgba(255, 255, 255, 0.15);
          }

          .showcase-theme-day .showcase-title,
          .showcase-theme-day .showcase-poster-heading {
            text-shadow:
              0 0.035em 0 rgba(8, 145, 178, 0.16),
              0 0.12em 0 rgba(226, 232, 240, 0.95),
              0 0.22em 1.2rem rgba(8, 145, 178, 0.10);
            -webkit-text-stroke: 0.01em rgba(15, 23, 42, 0.08);
          }

          .showcase-image-title,
          .showcase-image-copy,
          .showcase-image-kicker {
            color: rgba(255, 255, 255, 0.96) !important;
            text-shadow:
              0 2px 4px rgba(15, 23, 42, 0.86),
              0 8px 22px rgba(15, 23, 42, 0.62) !important;
            -webkit-text-stroke: 0 transparent !important;
          }

          .showcase-image-copy {
            color: rgba(255, 255, 255, 0.88) !important;
          }

          .showcase-image-kicker {
            color: rgba(207, 250, 254, 0.98) !important;
          }

          .showcase-award-badge {
            min-height: 2.625rem;
            letter-spacing: 0;
            text-shadow: 0 1px 0 rgba(255, 255, 255, 0.28);
          }

          .showcase-award-badge-day {
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(236, 254, 255, 0.95) 48%, rgba(255, 251, 235, 0.98) 100%) !important;
            border-color: rgba(14, 165, 233, 0.42) !important;
            color: rgb(15, 23, 42) !important;
            box-shadow:
              0 16px 38px rgba(8, 145, 178, 0.24),
              0 3px 0 rgba(8, 145, 178, 0.18),
              inset 0 1px 0 rgba(255, 255, 255, 0.96) !important;
          }

          .showcase-award-badge-featured {
            min-height: 3.25rem;
          }

          @media (min-width: 641px) {
            .showcase-title {
              font-size: clamp(5rem, 8.4vw, 7.4rem);
              line-height: 0.95;
            }

            .showcase-title-line {
              white-space: nowrap;
            }

            .showcase-poster-heading {
              line-height: 0.96;
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

          @media (max-width: 640px) {
            .showcase-title {
              font-size: clamp(3rem, 13.5vw, 4.6rem);
              line-height: 1.02;
            }

            .showcase-title-line,
            .showcase-poster-heading {
              white-space: normal;
            }

            .showcase-poster-heading {
              line-height: 1.04;
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
              linear-gradient(180deg, rgba(0, 0, 0, 0.015) 0%, rgba(0, 0, 0, 0.06) 36%, rgba(0, 0, 0, 0.66) 100%),
              linear-gradient(90deg, rgba(0, 0, 0, 0.28), transparent 58%);
          }

          .showcase-theme-day .showcase-media-overlay,
          .showcase-media-overlay-day {
            background:
              linear-gradient(180deg, transparent 0%, transparent 52%, rgba(15, 23, 42, 0.2) 100%),
              linear-gradient(90deg, rgba(15, 23, 42, 0.06), transparent 62%);
          }

          .showcase-work-cover::after {
            content: "";
            position: absolute;
            inset: 0;
            background:
              linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.54) 100%),
              linear-gradient(90deg, rgba(0, 0, 0, 0.2), transparent 64%);
            pointer-events: none;
          }

          .showcase-theme-day .showcase-work-cover::after {
            background:
              linear-gradient(180deg, rgba(15, 23, 42, 0.01) 0%, rgba(15, 23, 42, 0.24) 100%),
              linear-gradient(90deg, rgba(15, 23, 42, 0.06), transparent 64%);
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

      <ShowcaseSectionFrame
        id="gate"
        className="snap-always pt-[calc(env(safe-area-inset-top)+7.2rem)] sm:pt-[calc(env(safe-area-inset-top)+8rem)] min-[1536px]:pt-[calc(env(safe-area-inset-top)+7.4rem)]"
        backgroundWord="2026"
      >
        <MotionDiv {...heroReveal} className="min-w-0">
          <p className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase ${theme.chip}`}>
            <Film className="h-4 w-4" />
            AI Build Arena 2026
          </p>
          <h1 data-showcase-title className={`showcase-title mt-5 max-w-[1120px] font-black ${isDayMode ? "text-slate-950" : "text-white"}`}>
            <span className="showcase-title-line">{t("hackathon.showcase.hero.title_desktop")}</span>
            <span className={`showcase-title-line ${isDayMode ? "text-cyan-700" : "text-cyan-200"}`}>{t("hackathon.showcase.hero.result")}</span>
          </h1>
          <p className={`mt-5 max-w-4xl text-base font-semibold leading-7 sm:text-lg sm:leading-8 lg:text-xl lg:leading-9 ${theme.muted}`}>
            {t("hackathon.showcase.hero.desc")}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => openOutcomeUpload("stage_photo")}
              className={`inline-flex min-h-12 items-center justify-center gap-2 px-6 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 ${theme.primaryButton}`}
            >
              <Upload className="h-4 w-4" />
              {t("hackathon.showcase.hero.submit")}
            </button>
            <button
              type="button"
              onClick={() => smoothScrollTo("works")}
              className={`inline-flex min-h-12 items-center justify-center gap-2 border px-6 text-sm font-bold transition duration-200 focus:outline-none focus:ring-4 ${theme.secondaryButton}`}
            >
              {t("hackathon.showcase.hero.view_works")}
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
              {t("hackathon.showcase.hero.watch_film")}
            </a>
          </div>

          <MotionDiv
            {...heroReveal}
            transition={{ duration: 0.7, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 grid gap-3 sm:grid-cols-2"
          >
            {translatedEventStats.map((stat) => (
              <ShowcaseMetricTile
                key={stat.id}
                stat={stat}
                theme={theme}
                isDayMode={isDayMode}
              />
            ))}
          </MotionDiv>
        </MotionDiv>

        <MotionDiv
          {...heroReveal}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          id="showcase-official-film"
          className={`relative min-h-[24rem] overflow-hidden border p-3 sm:min-h-[30rem] xl:min-h-[38rem] ${theme.surfaceStrong}`}
        >
          <div className={`absolute right-6 top-6 z-20 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] ${theme.accent}`}>
            <span className={`h-2 w-2 rounded-full ${isDayMode ? "bg-cyan-600" : "bg-cyan-300"}`} />
            Live Brief
          </div>
          <div className={`absolute left-5 top-5 z-20 border px-3 py-2 text-xs font-black uppercase ${theme.chip}`}>
            {officialVideo?.title || "Official Film"}
          </div>
          <div className="relative h-full min-h-[22rem] overflow-hidden border border-white/10 sm:min-h-[28rem] xl:min-h-[36rem]">
            <img
              src={officialVideoCover}
              alt={t("hackathon.showcase.hero.poster_alt")}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: isDayMode ? "brightness(1.03) saturate(1.08) contrast(1.01)" : "brightness(0.86) saturate(1.12) contrast(1.03)" }}
              onError={(event) => {
                event.currentTarget.src = SECONDARY_IMAGE;
              }}
            />
            {officialVideoUrl && isVideoPlaying ? (
              <video
                className="absolute inset-0 z-20 h-full w-full bg-black object-contain"
                controls
                autoPlay
                preload="metadata"
                poster={officialVideoCover}
              >
                <source src={officialVideoUrl} />
              </video>
            ) : null}
            <div className={`showcase-media-overlay absolute inset-0 transition-opacity duration-300 ${isVideoPlaying ? "opacity-0" : "opacity-100"} ${isDayMode ? "showcase-media-overlay-day" : ""}`} />
            {!isVideoPlaying && officialVideoUrl ? (
              <button
                type="button"
                onClick={() => {
                  setIsVideoPlaying(true);
                }}
                className={`absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur-xl transition duration-300 hover:scale-105 focus:outline-none focus:ring-4 sm:h-20 sm:w-20 ${isDayMode ? "border border-white/70 bg-white/78 text-slate-950 shadow-[0_18px_54px_rgba(15,23,42,0.24)] hover:bg-cyan-100 focus:ring-cyan-500/20" : "border border-white/24 bg-white/16 text-white hover:bg-cyan-300 hover:text-slate-950 focus:ring-cyan-300/24"}`}
                aria-label={officialVideoUrl ? t("hackathon.showcase.hero.play_film") : t("hackathon.showcase.hero.upload_film")}
              >
                <Play className="ml-1 h-7 w-7 fill-current" />
              </button>
            ) : null}
            {!isVideoPlaying ? (
              <div className={`absolute bottom-0 left-0 right-0 z-20 p-5 sm:p-7 ${isDayMode ? "bg-gradient-to-t from-slate-950/70 via-slate-950/32 to-transparent" : ""}`}>
                <p className="showcase-image-kicker text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  Trailer / Gallery / Works
                </p>
                <h2 className="showcase-image-title mt-2 max-w-2xl text-3xl font-black leading-tight text-white sm:text-5xl">
                  {t("hackathon.showcase.hero.fallback_title")}
                </h2>
                {!officialVideoUrl ? (
                  <button
                    type="button"
                    onClick={() => openOutcomeUpload("promo_video")}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 border border-cyan-200/50 bg-cyan-300 px-4 text-sm font-black text-slate-950 transition duration-200 hover:-translate-y-0.5"
                  >
                    <Upload className="h-4 w-4" />
                    {t("hackathon.showcase.hero.upload_film")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </MotionDiv>
      </ShowcaseSectionFrame>

      <ShowcaseSectionFrame
        id="gallery"
        className="pt-20 pb-8 sm:pt-24 lg:py-10"
        backgroundWord="MEDIA"
        contentClassName="self-center items-center xl:min-h-0 xl:grid-cols-[minmax(360px,0.58fr)_minmax(760px,1.42fr)] xl:grid-rows-[minmax(0,clamp(27rem,52svh,46rem))_clamp(11.5rem,19svh,18rem)] xl:items-stretch xl:gap-x-8 xl:gap-y-4 min-[1536px]:grid-cols-[minmax(420px,0.55fr)_minmax(940px,1.45fr)] min-[1536px]:gap-x-10 2xl:grid-cols-[minmax(480px,0.52fr)_minmax(1120px,1.48fr)] 2xl:gap-x-12"
      >
          <MotionDiv {...reveal} className="min-w-0">
            <p className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase ${theme.chip}`}>
              <Camera className="h-4 w-4" />
              Chapter 02 / Gallery
            </p>
            <h2 className="showcase-poster-heading mt-2 max-w-4xl text-[clamp(3.2rem,6vw,7.4rem)] font-black tracking-normal">
              {t("hackathon.showcase.gallery.title")}
            </h2>
            <p className={`mt-4 max-w-2xl text-base font-semibold leading-7 sm:text-lg sm:leading-8 2xl:text-xl 2xl:leading-9 ${theme.muted}`}>
              {t("hackathon.showcase.gallery.desc")}
            </p>
            <div className={`mt-4 grid gap-px overflow-hidden border ${theme.border} ${isDayMode ? "bg-slate-200/80" : "bg-cyan-300/16"} sm:grid-cols-2`}>
              <div className={`${isDayMode ? "bg-white/86" : "bg-[#071011]/88"} p-3.5`}>
                <p className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${theme.accent}`}>01 / Stage Proof</p>
                <p className="mt-2 text-4xl font-black 2xl:text-5xl">{galleryMoments.length}</p>
                <p className={`mt-1 text-sm font-semibold 2xl:text-base ${theme.soft}`}>Media Moments</p>
              </div>
              <div className={`${isDayMode ? "bg-white/86" : "bg-[#071011]/88"} p-3.5`}>
                <p className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${theme.accent}`}>02 / Archive</p>
                <p className="mt-2 text-4xl font-black 2xl:text-5xl">Live</p>
                <p className={`mt-1 text-sm font-semibold 2xl:text-base ${theme.soft}`}>Outcome Gallery</p>
              </div>
            </div>
          </MotionDiv>

        <MotionDiv {...reveal} className={`mt-6 grid h-full min-h-0 gap-2 border p-2 xl:mt-0 ${theme.surfaceStrong}`}>
            {galleryMoments[0] ? (
              <ShowcaseImageCard moment={galleryMoments[0]} index={0} theme={theme} isDayMode={isDayMode} featured />
            ) : null}
          </MotionDiv>

          <MotionDiv {...reveal} className="min-h-0 xl:col-span-2 xl:h-full">
            <div className="showcase-gallery-strip -mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-2 xl:mx-0 xl:mt-0 xl:grid xl:h-full xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(11rem,0.62fr)] xl:overflow-hidden">
              <div className="contents xl:contents">
                {galleryMoments.slice(1).map((moment, index) => (
                  <ShowcaseImageCard
                    key={moment.id}
                    moment={moment}
                    index={index + 1}
                    theme={theme}
                    isDayMode={isDayMode}
                    compact
                  />
                ))}
              </div>
              <div className={`flex min-h-[9rem] w-[11rem] shrink-0 flex-col gap-2 border p-2 sm:w-[12rem] xl:h-full xl:w-auto ${theme.surfaceStrong}`}>
                <Link
                  to="/gallery"
                  className={`inline-flex min-h-0 flex-1 items-center justify-center gap-2 border px-3 text-center text-xs font-black transition duration-200 ${theme.secondaryButton}`}
                >
                  <ImageIcon className="h-4 w-4 shrink-0" />
                  <span>{t("hackathon.showcase.gallery.view_all")}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
                <button
                  type="button"
                  onClick={() => openOutcomeUpload("stage_photo")}
                  className={`inline-flex min-h-0 flex-1 items-center justify-center gap-2 px-3 text-center text-xs font-black transition duration-200 focus:outline-none focus:ring-4 ${theme.primaryButton}`}
                >
                  <Upload className="h-4 w-4 shrink-0" />
                  <span>{t("hackathon.showcase.gallery.upload")}</span>
                </button>
              </div>
            </div>
          </MotionDiv>
      </ShowcaseSectionFrame>

      <ShowcaseSectionFrame
        id="works"
        className="pt-20 pb-8 sm:pt-[5.25rem] lg:py-10 min-[1536px]:py-10"
        backgroundWord="WORKS"
        contentClassName="self-center items-center xl:min-h-0 xl:grid-cols-[minmax(360px,0.48fr)_minmax(800px,1.52fr)] xl:gap-7 min-[1536px]:grid-cols-[minmax(430px,0.45fr)_minmax(980px,1.55fr)] min-[1536px]:gap-9 2xl:grid-cols-[minmax(500px,0.42fr)_minmax(1180px,1.58fr)] 2xl:gap-12"
      >
        <MotionDiv {...reveal} className="min-w-0">
          <p className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase ${theme.chip}`}>
            <Trophy className="h-4 w-4" />
            Chapter 03 / Winning Works
          </p>
          <h2 className="showcase-poster-heading mt-4 max-w-4xl text-[clamp(3rem,5.4vw,7.1rem)] font-black tracking-normal">
            {t("hackathon.showcase.works.title")}
          </h2>
          <p className={`mt-4 max-w-2xl text-base font-semibold leading-7 sm:text-lg sm:leading-8 2xl:text-xl 2xl:leading-9 ${theme.muted}`}>
            {t("hackathon.showcase.works.desc")}
          </p>
          <div className={`mt-6 grid gap-px overflow-hidden border ${theme.border} ${isDayMode ? "bg-slate-200/80" : "bg-cyan-300/16"} sm:grid-cols-3`}>
            {showcaseWorks.slice(0, 3).map((work, index) => (
              <Link
                key={work.id}
                to="/hackathon/works"
                className={`${isDayMode ? "bg-white/86 hover:bg-cyan-50" : "bg-[#071011]/88 hover:bg-cyan-300/10"} block min-h-[8.5rem] p-4 transition duration-200`}
                aria-label={t("hackathon.showcase.works.project_aria", { title: work.title })}
              >
                <p className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${theme.accent}`}>
                  {String(index + 1).padStart(2, "0")} / {work.award || t("hackathon.showcase.works.fallback_award")}
                </p>
                <p className="mt-3 line-clamp-2 text-2xl font-black leading-tight">{work.title}</p>
                <p className={`mt-2 line-clamp-1 text-sm font-semibold ${theme.soft}`}>
                  {work.author}{work.boundIdentityName ? ` / ${work.boundIdentityName}` : ""}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/hackathon/works"
              className={`inline-flex min-h-12 items-center justify-center gap-2 border px-5 text-sm font-black transition duration-200 ${theme.secondaryButton}`}
            >
              {t("hackathon.showcase.works.view_all", { count: publishedWorksCount })}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => openOutcomeUpload("work")}
              className={`inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 ${theme.primaryButton}`}
            >
              <Upload className="h-4 w-4" />
              {t("hackathon.showcase.works.submit")}
            </button>
          </div>
        </MotionDiv>

        <MotionDiv {...reveal} className={`grid gap-4 border p-3 sm:p-4 xl:min-h-[clamp(27rem,68svh,48rem)] xl:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)] min-[1536px]:gap-5 min-[1536px]:p-5 ${theme.surfaceStrong}`}>
          {showcaseWorks[0] ? (
            <ShowcaseWorkCard
              work={showcaseWorks[0]}
              index={0}
              theme={theme}
              isDayMode={isDayMode}
              t={t}
              featured
            />
          ) : null}
          <div className="grid gap-4 xl:grid-rows-2">
            {showcaseWorks.slice(1).map((work, index) => (
              <ShowcaseWorkCard
                key={work.id}
                work={work}
                index={index + 1}
                theme={theme}
                isDayMode={isDayMode}
                t={t}
                compact
              />
            ))}
          </div>
        </MotionDiv>
      </ShowcaseSectionFrame>

      <MotionSection id="partners" {...reveal} className="relative snap-start px-4 pb-40 pt-14 sm:px-6 sm:py-16 lg:px-10 lg:py-20 xl:px-14 2xl:px-20">
        <div className="mx-auto w-full max-w-[1880px]">
          <SectionHeader
            eyebrow="Chapter 04 / Ecosystem"
            title={t("hackathon.showcase.partners.title", "共同见证")}
            copy={t("hackathon.showcase.partners.desc", "合作方不再只是漂在首屏的装饰，而是形成赛事背书：学校、社团、企业分别承担资源、组织和技术生态。")}
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
                          language={language}
                        />
                      ) : (
                        <div
                          key={partner.id || partner.name}
                          className={`flex min-h-[3.3rem] items-center justify-center border px-3 py-2 text-center text-sm font-black transition duration-300 hover:border-cyan-300/50 ${theme.chip}`}
                        >
                          {getLocalizedPartnerName(partner, language)}
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
              {translatedActionLinks.map((action) => {
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
                {t("hackathon.showcase.partners.join", "加入 AI 社区")}
                <Users className="h-4 w-4" />
              </Link>
              <Link
                to="/hackathon?view=register"
                className={`inline-flex min-h-12 items-center justify-center gap-2 border px-6 text-sm font-bold transition ${theme.secondaryButton}`}
              >
                {t("hackathon.showcase.partners.back", "赛事报名页")}
                <CalendarDays className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <p className={`mt-6 text-sm font-semibold leading-7 ${theme.soft}`}>
            {t("hackathon.showcase.partners.counts", "当前收录 {{groups}} 类 / {{partners}} 个支持方。后台更新合作方后，首屏品牌带和共创区会一起同步。", {
              groups: supportLineup.length,
              partners: supportPartnerCount,
            })}
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
