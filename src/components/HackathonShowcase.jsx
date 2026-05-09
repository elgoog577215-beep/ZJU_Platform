import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Award,
  CalendarDays,
  Camera,
  CircuitBoard,
  Cpu,
  Download,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Play,
  Radar,
  RadioTower,
  ScanLine,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { hackathonPartnerLogos } from "../data/partnerLogos";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";
import SEO from "./SEO";

const HERO_IMAGE = "/images/hero-campus-day-4k.jpg";
const SECONDARY_IMAGE = "/images/hero-landscape-day-4k.jpg";

const eventStats = [
  { value: "5", unit: "小时", label: "极速交付", code: "HOURS", caption: "从命题到可运行作品" },
  { value: "1", unit: "个人", label: "独立完成", code: "SOLO", caption: "个人赛制，作品说话" },
  { value: "0", unit: "路演", label: "只看作品", code: "PITCH", caption: "不靠包装，直接验收" },
  { value: "17,500", shortValue: "1.75万", unit: "¥", label: "奖金池", code: "PRIZE", caption: "激励真实交付" },
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

const timeline = [
  { time: "09:00", title: "开幕与规则确认", text: "确认命题边界、交付口径和 AI 工具使用规则。" },
  { time: "09:30", title: "开发冲刺开始", text: "选手进入独立开发，围绕真实问题完成产品雏形。" },
  { time: "13:30", title: "作品提交", text: "提交可运行链接、核心截图、代码仓库或演示录屏。" },
  { time: "14:00", title: "评审与交流", text: "评委从完成度、创新性、可用性和 AI 原生程度进行评审。" },
  { time: "15:30", title: "颁奖与合影", text: "公布获奖作品，沉淀赛后影像、作品链接和传播素材。" },
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
  { label: "完整相册", detail: "开幕式、开发现场、颁奖、交流分组", icon: ImageIcon },
  { label: "媒体包下载", detail: "新闻稿、精选照片、合作方露出", icon: Download },
  { label: "后续活动", detail: "加入社群，继续参与 AI 共创", icon: Sparkles },
];

const systemSignals = [
  { label: "Media Pipeline", value: "宣传片 / 图库 / 短视频", icon: RadioTower },
  { label: "Works Index", value: "优秀作品链接归档", icon: CircuitBoard },
  { label: "Live Archive", value: "赛后传播素材同步", icon: Activity },
];

const releaseModules = [
  "AFTERMOVIE READY",
  "GALLERY SYNCED",
  "WORKS INDEXED",
  "PRESS KIT ONLINE",
];

const exhibitionRoute = [
  {
    id: "gate",
    no: "01",
    label: "SIGNAL GATE",
    title: "入场",
    text: "先进入成果发布主视觉，建立赛事规模、交付强度和赛后传播基调。",
  },
  {
    id: "film",
    no: "02",
    label: "AFTERMOVIE",
    title: "观影",
    text: "用宣传片压缩赛事气势，让观众在最短时间理解这场比赛为什么值得记住。",
  },
  {
    id: "gallery",
    no: "03",
    label: "FIELD GALLERY",
    title: "赛场",
    text: "进入现场照片矩阵，开幕、开发、讲话、颁奖和交流形成连续影像证据。",
  },
  {
    id: "timeline",
    no: "04",
    label: "MISSION LOG",
    title: "进程",
    text: "沿时间线复盘从命题到提交的关键节点，让成果不是散点，而是完整叙事。",
  },
  {
    id: "works",
    no: "05",
    label: "WORKS INDEX",
    title: "作品",
    text: "把优秀作品作为展览核心，链接可运行成果、获奖信息和后续传播材料。",
  },
  {
    id: "partners",
    no: "06",
    label: "ECOSYSTEM",
    title: "共创",
    text: "收束到主办方、合作方和后续社群，承接下一轮 AI 共创行动。",
  },
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
  const shouldAnimate = !reduceMotion;
  const isDayMode = uiMode === "day";

  const theme = isDayMode
    ? {
        page: "bg-[#f5f8fb] text-slate-950",
        muted: "text-slate-600",
        soft: "text-slate-500",
        border: "border-slate-200",
        panel: "border-cyan-200/70 bg-white/88 shadow-[0_26px_90px_rgba(15,23,42,0.12)]",
        panelStrong: "border-cyan-200/80 bg-white shadow-[0_32px_110px_rgba(15,23,42,0.14)]",
        chip: "border-slate-200 bg-white/72 text-slate-700",
        accent: "text-cyan-700",
        accentBg: "bg-cyan-600 text-white",
        amber: "text-amber-600",
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
            className="fixed right-4 top-1/2 z-[120] hidden -translate-y-1/2 border border-cyan-300/20 bg-[#031014]/72 p-2 text-white shadow-[0_0_50px_rgba(34,211,238,0.16)] backdrop-blur-2xl lg:block"
          >
            <div className="pointer-events-none absolute bottom-3 left-1/2 top-3 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-300/50 to-transparent" />
            <div className="relative grid gap-2">
              {exhibitionRoute.map((step) => (
                <a
                  key={step.id}
                  href={`#${step.id}`}
                  className="group relative flex h-10 w-10 items-center justify-center border border-cyan-300/16 bg-black/28 text-[11px] font-black text-cyan-100 transition duration-200 hover:border-cyan-200 hover:bg-cyan-300 hover:text-slate-950"
                  aria-label={`跳转到${step.title}章节`}
                >
                  {step.no}
                  <span className="pointer-events-none absolute right-full mr-3 min-w-[132px] border border-cyan-300/24 bg-[#031014]/92 px-3 py-2 text-left text-[11px] font-black uppercase text-cyan-100 opacity-0 shadow-[0_0_34px_rgba(34,211,238,0.14)] backdrop-blur transition duration-200 group-hover:opacity-100">
                    {step.title} / {step.label}
                  </span>
                </a>
              ))}
            </div>
          </nav>,
          document.body,
        )
      : null;

  return (
    <div
      className={`min-h-screen overflow-hidden ${theme.page}`}
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
          .hackathon-route-shell {
            display: grid;
            gap: 2rem;
          }

          .hackathon-route-progress {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 0.25rem;
          }

          .hackathon-route-card {
            display: grid;
            gap: 1rem;
          }

          .hackathon-route-section {
            background:
              linear-gradient(180deg, rgba(2, 4, 5, 0.98), rgba(2, 10, 18, 0.92) 46%, rgba(2, 4, 5, 0.98)),
              repeating-linear-gradient(90deg, rgba(103, 232, 249, 0.08) 0 1px, transparent 1px 96px);
          }

          .hackathon-depth-rails {
            position: absolute;
            inset: 4rem 2.5rem 3rem;
            pointer-events: none;
            opacity: 0.5;
            transform: perspective(960px) rotateX(62deg);
            transform-origin: top center;
            border-left: 1px solid rgba(103, 232, 249, 0.25);
            border-right: 1px solid rgba(103, 232, 249, 0.25);
            background:
              linear-gradient(90deg, transparent 0%, rgba(103, 232, 249, 0.16) 50%, transparent 100%),
              repeating-linear-gradient(90deg, transparent 0 8%, rgba(103, 232, 249, 0.18) 8.1% 8.25%, transparent 8.35% 16%);
          }

          .hackathon-depth-rails::before,
          .hackathon-depth-rails::after {
            content: "";
            position: absolute;
            inset: 12% 10%;
            border-left: 1px solid rgba(103, 232, 249, 0.22);
            border-right: 1px solid rgba(103, 232, 249, 0.22);
          }

          .hackathon-depth-rails::after {
            inset: 28% 23%;
            opacity: 0.72;
          }

          .hackathon-scan-beam {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: min(48rem, 48vw);
            pointer-events: none;
            transform: translateX(-50%) skewX(-17deg);
            background: linear-gradient(90deg, transparent, rgba(103, 232, 249, 0.18), transparent);
            mix-blend-mode: screen;
            opacity: 0.55;
          }

          @media (prefers-reduced-motion: no-preference) {
            .hackathon-scan-beam {
              animation: hackathonScan 5.6s ease-in-out infinite;
            }
          }

          @keyframes hackathonScan {
            0%, 100% {
              transform: translateX(-72%) skewX(-17deg);
              opacity: 0.18;
            }
            48% {
              transform: translateX(-18%) skewX(-17deg);
              opacity: 0.62;
            }
          }

          @media (min-width: 768px) {
            .hackathon-route-card {
              grid-template-columns: 96px minmax(0, 1fr) auto;
              gap: 1.25rem;
            }
          }

          @media (min-width: 1024px) {
            .hackathon-route-shell {
              grid-template-columns: 390px minmax(0, 1fr);
            }
          }

          @media (min-width: 1280px) {
            .hackathon-route-shell {
              grid-template-columns: 460px minmax(0, 1fr);
            }
          }

          @media (max-width: 420px) {
            .hackathon-route-progress {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
        `}
      </style>
      {chapterNav}

      <section
        id="gate"
        className="relative flex min-h-[100svh] scroll-mt-28 items-end overflow-hidden px-4 pb-28 pt-24 sm:px-6 sm:pb-12 md:pt-28 lg:items-center lg:px-10 lg:pb-10 2xl:px-16"
      >
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="浙江大学校园与黑客松比赛成果主视觉"
            className="h-full w-full object-cover"
            style={{ filter: "brightness(0.42) saturate(1.25) contrast(1.12)" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_22%,rgba(34,211,238,0.36),transparent_32%),radial-gradient(circle_at_16%_70%,rgba(129,140,248,0.28),transparent_30%),linear-gradient(90deg,rgba(0,0,0,0.96)_0%,rgba(2,6,23,0.75)_45%,rgba(0,0,0,0.48)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#020405] via-[#020405]/78 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(103,232,249,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.09)_1px,transparent_1px)] bg-[size:52px_52px] opacity-[0.24]" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,transparent_42%,rgba(103,232,249,0.16)_49%,transparent_56%,transparent_100%)] opacity-60" />
          <div className="absolute inset-x-0 top-[18%] h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-[22%] h-px bg-gradient-to-r from-transparent via-indigo-300/45 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/38 to-transparent" />
        </div>
        <div className="pointer-events-none absolute left-4 top-28 hidden h-[44vh] w-px bg-gradient-to-b from-transparent via-cyan-200/80 to-transparent lg:block" />
        <div className="pointer-events-none absolute right-8 top-24 hidden h-64 w-64 border border-cyan-300/20 lg:block">
          <div className="absolute -left-2 -top-2 h-4 w-4 border-l-2 border-t-2 border-cyan-200" />
          <div className="absolute -right-2 -top-2 h-4 w-4 border-r-2 border-t-2 border-cyan-200" />
          <div className="absolute -bottom-2 -left-2 h-4 w-4 border-b-2 border-l-2 border-cyan-200" />
          <div className="absolute -bottom-2 -right-2 h-4 w-4 border-b-2 border-r-2 border-cyan-200" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1760px] flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <MotionDiv {...heroReveal} className="max-w-6xl lg:flex-1">
            <div className="mb-5 inline-flex items-center gap-2 border border-cyan-300/30 bg-cyan-300/10 px-3.5 py-2 text-xs font-black uppercase text-cyan-100 backdrop-blur">
              <ScanLine className="h-4 w-4 text-cyan-200" />
              AI Result Command Center
            </div>
            <h1 className="max-w-6xl text-5xl font-black leading-[0.88] text-white sm:text-7xl lg:text-8xl 2xl:text-[116px]">
              AI 全栈极速
              <span className="block text-cyan-200 drop-shadow-[0_0_28px_rgba(103,232,249,0.55)]">比赛成果</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base font-medium leading-8 text-white/78 sm:text-lg lg:text-xl lg:leading-9">
              一场 5 小时的 AI 原生开发冲刺。这里集中呈现宣传片、赛场影像、获奖作品与赛后传播素材。
            </p>
            <div className="mt-6 grid max-w-3xl gap-2 sm:grid-cols-3">
              {systemSignals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div
                    key={signal.label}
                    className="border border-cyan-300/18 bg-black/24 p-2.5 backdrop-blur-md sm:p-3"
                  >
                    <div className="flex items-center gap-2 text-cyan-200">
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px] font-black uppercase">{signal.label}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-white/62">{signal.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#film"
                className="group inline-flex min-h-12 items-center justify-center gap-2 bg-cyan-300 px-6 text-sm font-black text-slate-950 shadow-[0_0_34px_rgba(103,232,249,0.32)] transition duration-200 hover:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300/30"
              >
                <Play className="h-4 w-4 fill-current" />
                观看宣传片
              </a>
              <a
                href="#works"
                className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/16 bg-white/[0.08] px-6 text-sm font-bold text-white transition duration-200 hover:border-cyan-300/60 hover:bg-cyan-300/10 focus:outline-none focus:ring-4 focus:ring-cyan-300/20"
              >
                查看优秀作品
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-8 hidden max-w-2xl items-center gap-2 text-[11px] font-black uppercase text-white/62 lg:flex">
              {exhibitionRoute.slice(0, 4).map((step, index) => (
                <React.Fragment key={step.id}>
                  <a
                    href={`#${step.id}`}
                    className="group inline-flex items-center gap-2 border border-cyan-300/20 bg-cyan-300/[0.055] px-2.5 py-2 backdrop-blur transition duration-200 hover:border-cyan-200 hover:bg-cyan-300/14 hover:text-cyan-100"
                  >
                    <span className="text-cyan-200">{step.no}</span>
                    <span>{step.title}</span>
                  </a>
                  {index < 3 && <span className="h-px w-7 bg-cyan-300/30" />}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-8 border border-cyan-300/30 bg-[#031014]/72 p-4 shadow-[0_0_48px_rgba(34,211,238,0.12)] backdrop-blur-xl sm:hidden">
              <div className="mb-3 flex items-center justify-between border-b border-white/12 pb-3">
                <span className="text-[11px] font-black uppercase text-cyan-200/82">
                  Neural Result Release
                </span>
                <Cpu className="h-4 w-4 text-cyan-200" />
              </div>
              <div className="grid grid-cols-4 gap-px bg-white/12">
                {eventStats.map((stat) => (
                  <div key={stat.code} className="bg-[#071012]/92 p-2.5">
                    <p className="text-[9px] font-black uppercase text-cyan-200/80">{stat.code}</p>
                    <div className="mt-2 flex items-end gap-1">
                      <span className="text-2xl font-black leading-none text-cyan-200">
                        {stat.shortValue || stat.value}
                      </span>
                      <span className="pb-0.5 text-[11px] font-black text-white">{stat.unit}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-black text-white">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </MotionDiv>

          <MotionDiv
            {...heroReveal}
            transition={{ duration: 0.76, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="relative hidden max-w-[720px] overflow-hidden border border-cyan-300/[0.34] bg-[#031014]/78 p-5 text-white shadow-[0_0_0_1px_rgba(103,232,249,0.08),0_34px_120px_rgba(0,0,0,0.68),0_0_70px_rgba(34,211,238,0.16)] backdrop-blur-2xl sm:block sm:p-6 lg:w-[520px] lg:flex-none xl:w-[560px]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(103,232,249,0.22),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-200/70 to-transparent" />
            <div className="relative mb-4 flex items-start justify-between border-b border-white/12 pb-4 sm:mb-5 sm:pb-5">
              <div>
                <span className="text-xs font-black uppercase text-cyan-200/80">
                  Neural Result Release
                </span>
                <p className="mt-2 text-xl font-black leading-none sm:text-3xl">赛事成果发布</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-cyan-300/30 bg-cyan-300/10">
                <Cpu className="h-5 w-5 text-cyan-200" />
              </div>
            </div>
            <div className="relative grid grid-cols-4 gap-px overflow-hidden bg-white/12 sm:grid-cols-2">
              {eventStats.map((stat) => (
                <div
                  key={stat.code}
                  className="min-h-[84px] bg-[#071012]/92 p-2.5 sm:min-h-[152px] sm:p-5"
                >
                  <div className="text-[9px] font-black uppercase text-cyan-200/80 sm:text-[11px]">
                    {stat.code}
                  </div>
                  <div className="mt-2 flex items-end gap-1 sm:mt-4 sm:gap-2">
                    <span className="text-2xl font-black leading-none text-cyan-200 sm:text-5xl">
                      <span className="sm:hidden">{stat.shortValue || stat.value}</span>
                      <span className="hidden sm:inline">{stat.value}</span>
                    </span>
                    <span className="pb-0.5 text-[11px] font-black text-white sm:pb-1 sm:text-lg">{stat.unit}</span>
                  </div>
                  <p className="mt-1 text-[11px] font-black text-white sm:mt-3 sm:text-sm">{stat.label}</p>
                  <p className="mt-1 hidden text-xs leading-5 text-white/52 sm:block">{stat.caption}</p>
                </div>
              ))}
            </div>
            <p className="relative mt-5 hidden text-sm leading-7 text-white/68 sm:block">
              宣传片、照片、优秀作品与媒体素材集中沉淀，便于赛后传播、合作露出和下一轮招募。
            </p>
            <div className="relative mt-5 hidden grid-cols-2 gap-2 sm:grid">
              {releaseModules.map((item) => (
                <div key={item} className="flex items-center gap-2 border border-cyan-300/12 bg-cyan-300/[0.045] px-3 py-2">
                  <Zap className="h-3.5 w-3.5 text-cyan-200" />
                  <span className="text-[11px] font-black uppercase text-white/68">{item}</span>
                </div>
              ))}
            </div>
          </MotionDiv>
        </div>
        <div className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] font-black uppercase text-cyan-100/72 lg:flex">
          <span>Enter Exhibition</span>
          <motion.span
            className="h-12 w-px bg-gradient-to-b from-cyan-200 via-cyan-200/55 to-transparent"
            animate={shouldAnimate ? { scaleY: [0.45, 1, 0.45], opacity: [0.45, 1, 0.45] } : undefined}
            transition={shouldAnimate ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : undefined}
          />
        </div>
      </section>

      <MotionSection
        id="route"
        {...reveal}
        className="hackathon-route-section relative scroll-mt-28 overflow-hidden px-4 py-16 sm:px-6 lg:px-10 lg:py-24 2xl:px-16"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-cyan-300/18 to-transparent lg:block" />
        <div className="hackathon-depth-rails hidden lg:block" />
        <div className="hackathon-scan-beam hidden lg:block" />
        <div className="hackathon-route-shell relative mx-auto max-w-[1680px]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-black uppercase ${theme.chip}`}>
              <Radar className="h-4 w-4" />
              Exhibition Route
            </p>
            <h2 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">
              沿着展线往前走
            </h2>
            <p className={`mt-6 max-w-md text-base leading-8 ${theme.muted}`}>
              把赛后成果页做成一个有入口、有章节、有高潮、有收束的数字展馆。观众不是随便翻页面，而是从入场到作品，一步一步被推进。
            </p>
            <div className={`mt-8 border ${theme.panel} p-4`}>
              <div className="flex items-center justify-between border-b border-cyan-300/16 pb-3">
                <span className={`text-xs font-black uppercase ${theme.accent}`}>Route Progress</span>
                <Activity className={`h-4 w-4 ${theme.accent}`} />
              </div>
              <div className="hackathon-route-progress mt-4">
                {exhibitionRoute.map((step) => (
                  <a
                    key={step.id}
                    href={`#${step.id}`}
                    className={`flex h-14 items-center justify-center border text-xs font-black transition duration-200 ${theme.chip} hover:border-cyan-300/70 hover:text-cyan-300`}
                    aria-label={`进入${step.title}章节`}
                  >
                    {step.no}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute bottom-8 left-6 top-8 hidden w-px bg-gradient-to-b from-cyan-300/10 via-cyan-300/60 to-cyan-300/10 md:block" />
            <div className="grid gap-3">
              {exhibitionRoute.map((step, index) => (
                <a
                  key={step.id}
                  href={`#${step.id}`}
                  className={`hackathon-route-card group relative overflow-hidden border ${theme.panelStrong} p-5 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/70 hover:shadow-[0_0_70px_rgba(34,211,238,0.16)] md:p-6 ${index % 2 === 1 ? "md:ml-8" : "md:mr-8"}`}
                >
                  <div className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />
                    <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(103,232,249,0.10)_48%,transparent_60%)]" />
                  </div>
                  <div className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-transparent via-cyan-200 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                  <div className="relative flex items-center gap-3 md:block">
                    <span className={`font-mono text-4xl font-black leading-none ${index === 0 ? theme.amber : theme.accent}`}>
                      {step.no}
                    </span>
                    <span className="text-xl font-black md:mt-5 md:block">{step.title}</span>
                  </div>
                  <div className="relative mt-4 md:mt-0">
                    <p className={`text-xs font-black uppercase ${theme.accent}`}>{step.label}</p>
                    <p className={`mt-3 max-w-3xl text-base leading-8 ${theme.muted}`}>{step.text}</p>
                  </div>
                  <div className="relative mt-4 flex items-center md:mt-0">
                    <span className={`inline-flex h-11 w-11 items-center justify-center border ${theme.chip} transition duration-200 group-hover:border-cyan-300/70 group-hover:bg-cyan-300 group-hover:text-slate-950`}>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </MotionSection>

      <MotionSection
        id="film"
        {...reveal}
        className="relative scroll-mt-28 px-4 py-20 sm:px-6 lg:px-10 lg:py-28 2xl:px-16"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 bg-cyan-300/10 blur-3xl" />
        <div className="mx-auto grid max-w-[1680px] gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
          <div className="flex flex-col justify-between">
            <div>
              <p className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-black uppercase ${theme.chip}`}>
                <Film className="h-4 w-4" />
                Chapter 02 / Official Film
              </p>
              <h2 className="mt-5 max-w-2xl text-4xl font-black leading-tight sm:text-6xl xl:text-7xl">
                让宣传片成为第一传播入口
              </h2>
              <p className={`mt-6 max-w-xl text-base leading-8 ${theme.muted}`}>
                第一支视频承载整场活动的气势：赛制、冲刺、作品、颁奖和合影在 90 秒内完成记忆点。
              </p>
            </div>

            <div className={`mt-10 grid gap-3 border-t pt-6 ${theme.border}`}>
              {["主视频：90 秒官方宣传片", "短视频：15 秒社媒切条", "封面：获奖合影或开发现场大景"].map((item) => (
                <div key={item} className="flex items-center gap-3 border border-cyan-300/[0.14] bg-cyan-300/[0.04] px-3 py-2">
                  <span className={`h-2.5 w-2.5 ${theme.accentBg} shadow-[0_0_18px_rgba(103,232,249,0.5)]`} />
                  <span className={`text-sm font-bold ${theme.muted}`}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`group relative min-h-[420px] overflow-hidden border ${theme.border} shadow-[0_0_60px_rgba(34,211,238,0.10)] lg:min-h-[620px]`}>
            <img
              src={SECONDARY_IMAGE}
              alt="黑客松宣传片封面"
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
              style={{ filter: "brightness(0.72) saturate(1.18) contrast(1.08)" }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.78))]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(103,232,249,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.08)_1px,transparent_1px)] bg-[size:38px_38px] opacity-25" />
            <div className="absolute left-6 top-6 border border-cyan-300/30 bg-black/38 px-3 py-2 text-xs font-black uppercase text-cyan-100 backdrop-blur">
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
              <p className="text-sm font-black uppercase text-cyan-200">
                5 HOURS / 1 BUILDER / REAL PRODUCT
              </p>
              <h3 className="mt-3 max-w-2xl text-3xl font-black text-white sm:text-5xl">
                从赛场声浪到作品上线
              </h3>
            </div>
          </div>
        </div>
      </MotionSection>

      <MotionSection
        id="gallery"
        {...reveal}
        className="relative scroll-mt-28 px-4 py-16 sm:px-6 lg:px-10 lg:py-24 2xl:px-16"
      >
        <div className="pointer-events-none absolute left-0 top-1/4 h-80 w-80 bg-indigo-500/10 blur-3xl" />
        <div className="mx-auto max-w-[1680px]">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-black uppercase ${theme.chip}`}>
                <Radar className="h-4 w-4" />
                Chapter 03 / Field Gallery
              </p>
              <h2 className="mt-5 text-4xl font-black sm:text-6xl">
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
                className={`group relative overflow-hidden border border-cyan-300/[0.18] bg-black/20 shadow-[0_0_42px_rgba(34,211,238,0.08)] ${
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
                  style={{ filter: "brightness(0.76) saturate(1.2) contrast(1.06)" }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.03),rgba(0,0,0,0.84))]" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="mb-3 inline-flex items-center gap-2 border border-cyan-200/40 bg-cyan-300 px-2.5 py-1.5 text-[11px] font-black uppercase text-slate-950">
                    <Camera className="h-3.5 w-3.5" />
                    {moment.label}
                  </div>
                  <h3 className="text-2xl font-black text-white sm:text-3xl">
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
        id="timeline"
        {...reveal}
        className="relative scroll-mt-28 px-4 py-16 sm:px-6 lg:px-10 lg:py-24 2xl:px-16"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
        <div className="mx-auto grid max-w-[1680px] gap-10 lg:grid-cols-[420px_1fr] xl:grid-cols-[520px_1fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-black uppercase ${theme.chip}`}>
              <Activity className="h-4 w-4" />
              Chapter 04 / Event Timeline
            </p>
            <h2 className="mt-5 text-4xl font-black leading-tight sm:text-6xl">
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
                className="relative grid gap-5 border-b border-inherit py-7 pl-8 transition duration-300 hover:bg-cyan-300/[0.04] md:grid-cols-[140px_1fr] md:gap-8 md:py-9"
              >
                <span className={`absolute -left-[5px] top-9 h-2.5 w-2.5 ${theme.accentBg} shadow-[0_0_20px_rgba(103,232,249,0.7)]`} />
                <div>
                  <p className={`font-mono text-4xl font-black leading-none ${index === 0 ? theme.amber : theme.accent}`}>
                    {item.time}
                  </p>
                  <p className={`mt-2 text-xs font-black uppercase ${theme.soft}`}>
                    Stage {String(index + 1).padStart(2, "0")}
                  </p>
                </div>
                <div>
                  <h3 className="text-2xl font-black sm:text-4xl">{item.title}</h3>
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
        className="relative scroll-mt-28 px-4 py-16 sm:px-6 lg:px-10 lg:py-24 2xl:px-16"
      >
        <div className="pointer-events-none absolute right-0 top-20 h-96 w-96 bg-cyan-300/10 blur-3xl" />
        <div className="mx-auto max-w-[1680px]">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-black uppercase ${theme.chip}`}>
                <CircuitBoard className="h-4 w-4" />
                Chapter 05 / Winning Works
              </p>
              <h2 className="mt-5 text-4xl font-black sm:text-6xl">
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
                className={`group flex min-h-[520px] flex-col overflow-hidden border ${theme.panelStrong} transition duration-300 hover:-translate-y-1 hover:border-cyan-300/50 hover:shadow-[0_34px_120px_rgba(34,211,238,0.14)]`}
              >
                <div className="relative min-h-[220px] overflow-hidden bg-[#061113]">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(103,232,249,0.32),rgba(99,102,241,0.18)_48%,rgba(244,63,94,0.12))]" />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:34px_34px] opacity-28" />
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent" />
                  <div className="absolute left-5 top-5 border border-cyan-200/30 bg-black/36 px-3 py-2 text-xs font-black uppercase text-cyan-100 backdrop-blur">
                    Project {work.visual}
                  </div>
                  <div className="absolute bottom-5 left-5 right-5">
                    <div className="flex items-center gap-2 text-cyan-200">
                      {index === 0 ? <Trophy className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                      <span className="text-sm font-black uppercase">{work.award}</span>
                    </div>
                    <div className="mt-4 h-1 w-full bg-white/12">
                      <div className={`h-full shadow-[0_0_18px_currentColor] ${index === 0 ? "w-full bg-amber-300 text-amber-300" : "w-3/4 bg-cyan-300 text-cyan-300"}`} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-3xl font-black">{work.title}</h3>
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
        id="partners"
        {...reveal}
        className="relative scroll-mt-28 px-4 py-16 sm:px-6 lg:px-10 lg:py-24 2xl:px-16"
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
        <div className={`mx-auto max-w-[1680px] border ${theme.panel}`}>
          <div className={`grid gap-8 border-b p-6 ${theme.border} lg:grid-cols-[0.82fr_1.18fr] lg:p-10`}>
            <div>
              <p className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-black uppercase ${theme.chip}`}>
                <RadioTower className="h-4 w-4" />
                Chapter 06 / Witnessed By
              </p>
              <h2 className="mt-5 text-4xl font-black sm:text-6xl">
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
                  className={`flex min-h-[92px] flex-col items-center justify-center gap-2 border px-5 text-center transition duration-300 hover:border-cyan-300/50 hover:bg-cyan-300/[0.08] ${theme.chip}`}
                >
                  <img
                    src={isDayMode ? logo.src : logo.darkSrc || logo.src}
                    alt={logo.alt}
                    className={`max-h-9 max-w-[180px] object-contain opacity-95 ${!isDayMode ? logo.darkClassName || "" : ""}`}
                    loading="lazy"
                  />
                  <span className={`text-xs font-black uppercase ${theme.soft}`}>
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
                  className={`group min-h-[150px] border p-5 text-left transition duration-300 ${theme.chip} hover:-translate-y-0.5 hover:border-cyan-300/60 hover:shadow-[0_20px_70px_rgba(34,211,238,0.12)]`}
                >
                  <Icon className={`h-7 w-7 ${theme.accent}`} />
                  <h3 className="mt-5 text-2xl font-black">{action.label}</h3>
                  <p className={`mt-2 text-sm leading-6 ${theme.muted}`}>{action.detail}</p>
                </button>
              );
            })}
          </div>
        </div>
      </MotionSection>

      <section className="relative overflow-hidden px-4 pb-24 pt-10 sm:px-6 lg:px-10 lg:pb-32 2xl:px-16">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-cyan-300/10 to-transparent" />
        <div className="mx-auto grid max-w-[1680px] gap-8 border-t border-cyan-300/24 pt-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-black uppercase ${theme.chip}`}>
              <Zap className="h-4 w-4" />
              Keep Building
            </p>
            <h2 className="mt-4 max-w-4xl text-4xl font-black sm:text-6xl">
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
