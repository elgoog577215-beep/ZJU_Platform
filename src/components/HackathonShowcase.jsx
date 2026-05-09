import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Camera,
  Download,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Play,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { hackathonPartnerLogos } from "../data/partnerLogos";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";
import SEO from "./SEO";

const HERO_IMAGE = "/images/hero-campus-day-4k.jpg";
const SECONDARY_IMAGE = "/images/hero-landscape-day-4k.jpg";

// Replace these paths with official event media after the hackathon.
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
    title: "从提示词到可运行产品",
    caption: "选手在 AI 工具链辅助下完成架构、代码、调试和演示素材。",
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
    title: "把灵感留在赛后继续生长",
    caption: "选手、评委、社群与合作伙伴在赛后连接下一次共创。",
    image: HERO_IMAGE,
  },
];

const eventStats = [
  { value: "5", unit: "小时", label: "极速交付", code: "HOURS" },
  { value: "1", unit: "个人", label: "独立完成", code: "SOLO" },
  { value: "0", unit: "路演", label: "只看作品", code: "PITCH" },
  { value: "17,500", unit: "¥", label: "奖金池", code: "PRIZE" },
];

const timeline = [
  {
    time: "09:00",
    title: "开幕与规则确认",
    text: "确认命题边界、交付口径和 AI 工具使用规则。",
  },
  {
    time: "09:30",
    title: "开发冲刺开始",
    text: "选手进入独立开发，围绕真实问题完成产品雏形。",
  },
  {
    time: "13:30",
    title: "作品提交",
    text: "提交可运行链接、核心截图、代码仓库或演示录屏。",
  },
  {
    time: "14:00",
    title: "评审与交流",
    text: "评委从完成度、创新性、可用性和 AI 原生程度进行评审。",
  },
  {
    time: "15:30",
    title: "颁奖与合影",
    text: "公布获奖作品，沉淀赛后影像、作品链接和传播素材。",
  },
];

const featuredWorks = [
  {
    award: "冠军作品",
    title: "作品名称待揭晓",
    team: "获奖选手 / 团队信息",
    summary: "赛后录入真实作品简介：解决了什么问题、AI 如何参与、现场可运行到什么程度。",
    tags: ["AI Agent", "全栈应用", "现场交付"],
    link: "#",
    visual: "01",
  },
  {
    award: "最佳工程实现",
    title: "作品名称待揭晓",
    team: "获奖选手 / 团队信息",
    summary: "突出工程完整度、稳定性、交互体验和部署可访问性。",
    tags: ["工程实现", "产品体验", "部署"],
    link: "#",
    visual: "02",
  },
  {
    award: "最佳创意应用",
    title: "作品名称待揭晓",
    team: "获奖选手 / 团队信息",
    summary: "突出问题选择、场景洞察和 AI 能力带来的新体验。",
    tags: ["创新场景", "校园服务", "生成式 AI"],
    link: "#",
    visual: "03",
  },
];

const actionLinks = [
  { label: "完整相册", detail: "按开幕式、开发现场、颁奖、交流分组", icon: ImageIcon },
  { label: "媒体包下载", detail: "新闻稿、精选照片、合作方露出", icon: Download },
  { label: "后续活动", detail: "加入社群，继续参与 AI 共创", icon: Sparkles },
];

const partnerDisplayName = (logo) => {
  if (logo.text) return logo.text;
  return logo.alt.replace(/\s*logo$/i, "").trim();
};

const MotionSection = motion.section;
const MotionDiv = motion.div;

const HackathonShowcase = () => {
  const { uiMode } = useSettings();
  const reduceMotion = useReducedMotion();
  const isDayMode = uiMode === "day";
  const shouldAnimate = !reduceMotion;

  const theme = isDayMode
    ? {
        page: "bg-[#f6f9fb] text-slate-950",
        muted: "text-slate-600",
        soft: "text-slate-500",
        border: "border-slate-200",
        panel: "border-slate-200 bg-white/82 shadow-[0_24px_70px_rgba(15,23,42,0.10)]",
        panelDark: "border-slate-200 bg-white/90 shadow-[0_26px_80px_rgba(15,23,42,0.12)]",
        chip: "border-slate-200 bg-white/70 text-slate-700",
        accent: "text-cyan-700",
        accentBg: "bg-cyan-600 text-white",
        amber: "text-amber-600",
      }
    : {
        page: "bg-[#030506] text-white",
        muted: "text-white/70",
        soft: "text-white/48",
        border: "border-white/10",
        panel: "border-white/10 bg-white/[0.055] shadow-[0_28px_90px_rgba(0,0,0,0.42)]",
        panelDark: "border-cyan-300/18 bg-[#071012]/88 shadow-[0_36px_110px_rgba(0,0,0,0.58)]",
        chip: "border-white/12 bg-white/[0.06] text-white/78",
        accent: "text-cyan-300",
        accentBg: "bg-cyan-300 text-slate-950",
        amber: "text-amber-300",
      };

  const reveal = shouldAnimate
    ? {
        initial: { opacity: 0, y: 28 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.18 },
        transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
      }
    : {};

  const heroReveal = shouldAnimate
    ? {
        initial: { opacity: 0, y: 32 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
      }
    : {};

  return (
    <div className={`min-h-screen overflow-hidden ${theme.page}`}>
      <SEO
        title="AI 全栈极速黑客松比赛成果"
        description="AI 全栈极速黑客松赛后展示页，集中呈现宣传片、赛场照片、优秀作品和活动成果。"
        image={HERO_IMAGE}
      />

      <section className="relative flex min-h-[100svh] items-end overflow-hidden px-4 pb-28 pt-28 sm:px-6 sm:pb-12 md:pt-32 lg:px-10 lg:pb-16 2xl:px-16">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="浙江大学校园与黑客松比赛成果主视觉"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.58)_42%,rgba(0,0,0,0.18)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#030506] via-[#030506]/70 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(103,232,249,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.08)_1px,transparent_1px)] bg-[size:56px_56px] opacity-20" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-[1760px] gap-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-end xl:grid-cols-[minmax(0,1fr)_520px]">
          <MotionDiv {...heroReveal} className="max-w-5xl">
            <div className="mb-5 inline-flex items-center gap-2 border border-cyan-300/30 bg-cyan-300/10 px-3.5 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-100 backdrop-blur">
              <Film className="h-4 w-4 text-cyan-200" />
              Aftermovie / Gallery / Works
            </div>
            <h1 className="max-w-5xl text-5xl font-black leading-[0.92] tracking-tight text-white sm:text-7xl lg:text-8xl 2xl:text-[112px]">
              AI 全栈极速
              <span className="block text-cyan-200">比赛成果</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base font-medium leading-8 text-white/76 sm:text-lg lg:text-xl lg:leading-9">
              一场 5 小时的 AI 原生开发冲刺。这里集中呈现宣传片、赛场影像、获奖作品与赛后传播素材。
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#film"
                className="group inline-flex min-h-12 items-center justify-center gap-2 bg-cyan-300 px-6 text-sm font-black text-slate-950 transition duration-200 hover:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300/30"
              >
                <Play className="h-4 w-4 fill-current" />
                观看宣传片
              </a>
              <a
                href="#works"
                className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/16 bg-white/8 px-6 text-sm font-bold text-white transition duration-200 hover:border-cyan-300/60 hover:bg-cyan-300/10 focus:outline-none focus:ring-4 focus:ring-cyan-300/20"
              >
                查看优秀作品
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </MotionDiv>

          <MotionDiv
            {...heroReveal}
            transition={{ duration: 0.72, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 gap-2 border border-white/12 bg-black/30 p-3 backdrop-blur-xl sm:gap-3 sm:p-4 lg:grid-cols-1 xl:grid-cols-2"
          >
            {eventStats.map((stat) => (
              <div
                key={stat.code}
                className="min-h-[104px] border border-white/12 bg-white/[0.045] p-3 sm:min-h-[120px] sm:p-4"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200/80 sm:text-xs sm:tracking-[0.22em]">
                  {stat.code}
                </div>
                <div className="mt-3 flex items-end gap-2 sm:mt-4">
                  <span className="text-4xl font-black leading-none text-cyan-200 sm:text-6xl">
                    {stat.value}
                  </span>
                  <span className="pb-1 text-sm font-black text-white sm:text-lg">{stat.unit}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-white/62 sm:mt-3 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </MotionDiv>
        </div>
      </section>

      <MotionSection
        id="film"
        {...reveal}
        className="relative px-4 py-20 sm:px-6 lg:px-10 lg:py-28 2xl:px-16"
      >
        <div className="mx-auto grid max-w-[1680px] gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-stretch">
          <div className="flex flex-col justify-between">
            <div>
              <p className={`text-sm font-black uppercase tracking-[0.28em] ${theme.accent}`}>
                Official Film
              </p>
              <h2 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-6xl xl:text-7xl">
                让宣传片成为第一传播入口
              </h2>
              <p className={`mt-6 max-w-xl text-base leading-8 ${theme.muted}`}>
                第一支视频承载整场活动的气势：赛制、冲刺、作品、颁奖和合影在 90 秒内完成记忆点。
              </p>
            </div>

            <div className={`mt-10 grid gap-3 border-t pt-6 ${theme.border}`}>
              {["主视频：90 秒官方宣传片", "短视频：15 秒社媒切条", "封面：获奖合影或开发现场大景"].map(
                (item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 ${theme.accentBg}`} />
                    <span className={`text-sm font-bold ${theme.muted}`}>{item}</span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className={`group relative min-h-[420px] overflow-hidden border ${theme.border} lg:min-h-[620px]`}>
            <img
              src={SECONDARY_IMAGE}
              alt="黑客松宣传片封面"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.76))]" />
            <div className="absolute left-6 top-6 border border-white/16 bg-black/28 px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
              Trailer slot
            </div>
            <button
              type="button"
              className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/22 bg-white/12 text-white backdrop-blur-xl transition duration-300 hover:scale-105 hover:bg-cyan-300 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-300/30"
              aria-label="播放宣传片"
            >
              <Play className="ml-1 h-9 w-9 fill-current" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-200">
                5 HOURS / 1 BUILDER / REAL PRODUCT
              </p>
              <h3 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-5xl">
                从赛场声浪到作品上线
              </h3>
            </div>
          </div>
        </div>
      </MotionSection>

      <MotionSection
        id="gallery"
        {...reveal}
        className="px-4 py-16 sm:px-6 lg:px-10 lg:py-24 2xl:px-16"
      >
        <div className="mx-auto max-w-[1680px]">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`text-sm font-black uppercase tracking-[0.28em] ${theme.accent}`}>
                Field Gallery
              </p>
              <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
                赛场照片集锦
              </h2>
            </div>
            <p className={`max-w-xl text-base leading-8 ${theme.muted}`}>
              用精选大图讲清楚事件规模、人物状态、组织质量和颁奖成果。
            </p>
          </div>

          <div className="mt-10 grid auto-rows-[220px] gap-3 md:grid-cols-6 md:auto-rows-[180px] xl:auto-rows-[220px]">
            {mediaMoments.map((moment, index) => (
              <article
                key={moment.id}
                className={`group relative overflow-hidden border ${theme.border} ${
                  index === 0
                    ? "md:col-span-3 md:row-span-2"
                    : index === 1
                      ? "md:col-span-3"
                      : "md:col-span-2"
                }`}
              >
                <img
                  src={moment.image}
                  alt={moment.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.03),rgba(0,0,0,0.82))]" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="mb-3 inline-flex items-center gap-2 bg-cyan-300 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950">
                    <Camera className="h-3.5 w-3.5" />
                    {moment.label}
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {moment.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-white/70">{moment.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection
        {...reveal}
        className="px-4 py-16 sm:px-6 lg:px-10 lg:py-24 2xl:px-16"
      >
        <div className="mx-auto grid max-w-[1680px] gap-10 lg:grid-cols-[420px_1fr] xl:grid-cols-[520px_1fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className={`text-sm font-black uppercase tracking-[0.28em] ${theme.accent}`}>
              Event Timeline
            </p>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              一天的节奏，要像比赛成果一样清楚
            </h2>
            <p className={`mt-6 max-w-md text-base leading-8 ${theme.muted}`}>
              时间线把照片、短视频、作品提交和颁奖串成完整叙事，方便媒体和合作方快速转述。
            </p>
          </div>

          <div className={`border-l ${theme.border}`}>
            {timeline.map((item, index) => (
              <div
                key={item.time}
                className="relative grid gap-5 border-b border-inherit py-7 pl-8 md:grid-cols-[140px_1fr] md:gap-8 md:py-9"
              >
                <span className={`absolute -left-[5px] top-9 h-2.5 w-2.5 ${theme.accentBg}`} />
                <div>
                  <p className={`font-mono text-4xl font-black leading-none ${index === 0 ? theme.amber : theme.accent}`}>
                    {item.time}
                  </p>
                  <p className={`mt-2 text-xs font-black uppercase tracking-[0.22em] ${theme.soft}`}>
                    Stage {String(index + 1).padStart(2, "0")}
                  </p>
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight sm:text-4xl">{item.title}</h3>
                  <p className={`mt-3 max-w-2xl text-base leading-8 ${theme.muted}`}>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection
        id="works"
        {...reveal}
        className="px-4 py-16 sm:px-6 lg:px-10 lg:py-24 2xl:px-16"
      >
        <div className="mx-auto max-w-[1680px]">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className={`text-sm font-black uppercase tracking-[0.28em] ${theme.accent}`}>
                Winning Works
              </p>
              <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
                优秀作品展示
              </h2>
            </div>
            <p className={`max-w-2xl text-base leading-8 lg:justify-self-end ${theme.muted}`}>
              作品展示要给外部观众一个明确答案：这场比赛不仅热闹，而且真的产出了可运行的 AI 应用。
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {featuredWorks.map((work, index) => (
              <article
                key={work.award}
                className={`group flex min-h-[520px] flex-col overflow-hidden border ${theme.panelDark}`}
              >
                <div className="relative min-h-[220px] overflow-hidden bg-[#061113]">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(103,232,249,0.28),rgba(251,191,36,0.12)_48%,rgba(244,63,94,0.14))]" />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:34px_34px] opacity-28" />
                  <div className="absolute left-5 top-5 border border-white/14 bg-black/26 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/76 backdrop-blur">
                    Project {work.visual}
                  </div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <div className="flex items-center gap-2 text-cyan-200">
                      {index === 0 ? <Trophy className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                      <span className="text-sm font-black uppercase tracking-[0.18em]">{work.award}</span>
                    </div>
                    <div className="mt-4 h-1 w-full bg-white/12">
                      <div className={`h-full ${index === 0 ? "w-full bg-amber-300" : "w-3/4 bg-cyan-300"}`} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-3xl font-black tracking-tight">{work.title}</h3>
                  <p className={`mt-2 text-sm font-bold ${theme.accent}`}>{work.team}</p>
                  <p className={`mt-5 flex-1 text-base leading-8 ${theme.muted}`}>{work.summary}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {work.tags.map((tag) => (
                      <span key={tag} className={`border px-3 py-1.5 text-xs font-bold ${theme.chip}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <a
                    href={work.link}
                    className={`mt-7 inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-sm font-black transition duration-200 ${theme.chip} hover:border-cyan-300/60 hover:text-cyan-300`}
                  >
                    打开作品链接
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection
        {...reveal}
        className="px-4 py-16 sm:px-6 lg:px-10 lg:py-24 2xl:px-16"
      >
        <div className={`mx-auto max-w-[1680px] border ${theme.panel}`}>
          <div className={`grid gap-8 border-b p-6 ${theme.border} lg:grid-cols-[0.82fr_1.18fr] lg:p-10`}>
            <div>
              <p className={`text-sm font-black uppercase tracking-[0.28em] ${theme.accent}`}>
                Witnessed By
              </p>
              <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
                共同见证
              </h2>
              <p className={`mt-6 max-w-lg text-base leading-8 ${theme.muted}`}>
                保留主办、支持、企业生态和评委阵容露出，让赛后传播有完整背书。
              </p>
            </div>
            <div className="grid content-center gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {hackathonPartnerLogos.map((logo) => (
                <div
                  key={`${logo.src}-${logo.alt}`}
                  className={`flex min-h-[92px] flex-col items-center justify-center gap-2 border px-5 text-center ${theme.chip}`}
                >
                  <img
                    src={isDayMode ? logo.src : logo.darkSrc || logo.src}
                    alt={logo.alt}
                    className={`max-h-9 max-w-[180px] object-contain opacity-95 ${!isDayMode ? logo.darkClassName || "" : ""}`}
                    loading="lazy"
                  />
                  <span className={`text-xs font-black uppercase tracking-[0.16em] ${theme.soft}`}>
                    {partnerDisplayName(logo)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-3 lg:p-10">
            {actionLinks.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  className={`group min-h-[150px] border p-5 text-left transition duration-300 ${theme.chip} hover:-translate-y-0.5 hover:border-cyan-300/60`}
                >
                  <Icon className={`h-7 w-7 ${theme.accent}`} />
                  <h3 className="mt-5 text-2xl font-black tracking-tight">{action.label}</h3>
                  <p className={`mt-2 text-sm leading-6 ${theme.muted}`}>{action.detail}</p>
                </button>
              );
            })}
          </div>
        </div>
      </MotionSection>

      <section className="relative overflow-hidden px-4 pb-24 pt-10 sm:px-6 lg:px-10 lg:pb-32 2xl:px-16">
        <div className="mx-auto grid max-w-[1680px] gap-8 border-t border-cyan-300/24 pt-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className={`text-sm font-black uppercase tracking-[0.28em] ${theme.accent}`}>
              Keep Building
            </p>
            <h2 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
              把一次比赛，沉淀成下一轮 AI 共创的入口
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              to="/articles"
              className={`inline-flex min-h-12 items-center justify-center gap-2 px-6 text-sm font-black ${theme.accentBg}`}
            >
              加入 AI 社区
              <Users className="h-4 w-4" />
            </Link>
            <Link
              to="/hackathon"
              className={`inline-flex min-h-12 items-center justify-center gap-2 border px-6 text-sm font-bold ${theme.chip}`}
            >
              返回赛事页
              <CalendarDays className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HackathonShowcase;
