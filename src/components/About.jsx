import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Trophy,
  Users,
} from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";
import SEO from "./SEO";

const sectionReveal = (enabled, delay = 0) => {
  if (!enabled) return {};

  return {
    initial: { opacity: 0, y: 26 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.58, delay, ease: [0.22, 1, 0.36, 1] },
    viewport: { once: true, margin: "-12%" },
  };
};

const heroReveal = (enabled, delay = 0) => {
  if (!enabled) return {};

  return {
    initial: { opacity: 0, y: 28, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] },
  };
};

const parseUnits = (raw) =>
  String(raw || "")
    .split(/[,，、/]/)
    .map((item) => item.trim())
    .filter(Boolean);

const About = () => {
  const { settings, uiMode } = useSettings();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion;
  const isDayMode = uiMode === "day";

  const schoolSupport = parseUnits(
    settings.about_school_support_units || "未来学习中心,AI 联合实验室",
  );
  const studentOrganizations = parseUnits(
    settings.about_student_organizations || "XLAB,ZJUAI,EAI,AIRA,KAB",
  );
  const enterprisePartners = parseUnits(
    settings.hackathon_partners || "MiniMax,阿里云,魔搭,阶跃星辰",
  );

  const operatingHandles = [
    {
      index: "01",
      code: "ENTRY",
      title: "活动聚合",
      short: "统一入口",
      loop: "发现机会",
      icon: CalendarDays,
      description:
        "汇聚活动与机会，建立校内 AI 资源的统一入口。",
      route: "/events",
    },
    {
      index: "02",
      code: "LINK",
      title: "AI 社区",
      short: "持续关系",
      loop: "连接人群",
      icon: Users,
      description:
        "连接学习者与建设者，让交流沉淀为持续关系。",
      route: "/community",
    },
    {
      index: "03",
      code: "BUILD",
      title: "极速黑客松",
      short: "创造爆发",
      loop: "激发项目",
      icon: Trophy,
      description:
        "以高密度创造验证 AI 原生开发的校园势能。",
      route: "/hackathon",
    },
  ];

  const loopItems = [
    { index: "01", title: "发现", detail: "活动与机会进入统一入口" },
    { index: "02", title: "连接", detail: "社区承接人群关系" },
    { index: "03", title: "创造", detail: "赛事激发真实项目" },
    { index: "04", title: "沉淀", detail: "成果反哺校园生态" },
  ];

  const supportLogos = [
    {
      src: "/images/partner-logos/minimax.png",
      darkSrc: "/images/partner-logos/minimax-dark.png",
      alt: "MiniMax logo",
    },
    {
      src: "/images/partner-logos/modelscope.png",
      darkSrc: "/images/partner-logos/modelscope-dark.png",
      alt: "ModelScope 魔搭社区 logo",
    },
    {
      src: "/images/partner-logos/company-2.png",
      darkSrc: "/images/partner-logos/company-2-dark.png",
      alt: "云江开物 logo",
      size: "h-4 sm:h-5 lg:h-6",
    },
    {
      src: "/images/partner-logos/stepfun.png",
      darkSrc: "/images/partner-logos/stepfun-white.png",
      alt: "阶跃星辰 logo",
    },
  ];

  const proofStats = [
    {
      value: settings.about_stat_1_value || "1000+",
      label: settings.about_stat_1_label || "平台用户基础",
    },
    { value: "3", label: "核心运营抓手" },
    {
      value: settings.about_stat_3_value || "5 小时",
      label: settings.about_stat_3_label || "AI 原生赛事标识",
    },
  ];

  const palette = isDayMode
    ? {
        page: "bg-[#f6f8fb] text-slate-950",
        hero:
          "bg-[radial-gradient(circle_at_72%_18%,rgba(6,182,212,0.18),transparent_28%),radial-gradient(circle_at_20%_78%,rgba(79,70,229,0.1),transparent_24%),linear-gradient(135deg,#ffffff_0%,#eef8fb_54%,#f8fafc_100%)]",
        textSoft: "text-slate-600",
        textMuted: "text-slate-500",
        label: "text-cyan-700",
        border: "border-slate-200/80",
        panel:
          "border-slate-200 bg-white/88 shadow-[0_28px_90px_rgba(15,23,42,0.12)]",
        panelStrong:
          "border-cyan-500/20 bg-white/92 shadow-[0_36px_110px_rgba(15,23,42,0.14)]",
        card:
          "border-slate-200 bg-white/88 shadow-[0_24px_70px_rgba(15,23,42,0.1)]",
        accent: "text-cyan-700",
        accentBg: "bg-cyan-500",
        primary:
          "bg-cyan-500 text-white shadow-[0_18px_42px_rgba(6,182,212,0.28)] hover:bg-cyan-600",
        secondary:
          "border-slate-300 bg-white/70 text-slate-800 hover:border-cyan-400 hover:text-cyan-700",
        divider: "border-slate-200",
        watermark: "text-slate-900/[0.045]",
      }
    : {
        page: "bg-[#030405] text-white",
        hero:
          "bg-[radial-gradient(circle_at_72%_18%,rgba(34,211,238,0.26),transparent_26%),radial-gradient(circle_at_20%_78%,rgba(99,102,241,0.12),transparent_25%),linear-gradient(135deg,#020303_0%,#071111_54%,#020303_100%)]",
        textSoft: "text-white/72",
        textMuted: "text-white/48",
        label: "text-cyan-300",
        border: "border-white/10",
        panel:
          "border-white/10 bg-[#101516]/88 shadow-[0_28px_90px_rgba(0,0,0,0.46)]",
        panelStrong:
          "border-cyan-300/24 bg-[#081012]/86 shadow-[0_36px_120px_rgba(0,0,0,0.62)]",
        card:
          "border-white/10 bg-[linear-gradient(180deg,rgba(16,21,22,0.92),rgba(16,21,22,0.64))]",
        accent: "text-cyan-300",
        accentBg: "bg-cyan-300",
        primary:
          "bg-cyan-300 text-slate-950 shadow-[0_0_42px_rgba(103,232,249,0.28)] hover:bg-white",
        secondary:
          "border-white/16 bg-white/[0.045] text-white hover:border-cyan-300/70 hover:bg-cyan-300/10",
        divider: "border-white/10",
        watermark: "text-white/[0.04]",
      };

  return (
    <div className={`h-screen overflow-x-hidden overflow-y-auto scroll-smooth snap-y snap-mandatory ${palette.page}`}>
      <SEO
        title="关于我们"
        description="了解浙大 AI 生态团队如何以活动聚合、AI 社区与极速黑客松构建校园 AI 协同生态。"
      />

      <nav
        aria-label="关于页面分页"
        className="fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex"
      >
        {[
          ["01", "#about-hero"],
          ["02", "#ecosystem-handles"],
          ["03", "#support-galaxy"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className={`group flex h-12 w-12 items-center justify-center border text-[11px] font-black transition duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 ${
              isDayMode
                ? "border-slate-200 bg-white/74 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-700"
                : "border-white/10 bg-white/[0.045] text-white/42 hover:border-cyan-300/50 hover:text-cyan-200"
            }`}
          >
            <span className="transition group-hover:scale-110">{label}</span>
          </a>
        ))}
      </nav>

      <section
        id="about-hero"
        className={`relative isolate min-h-[100svh] snap-start snap-always overflow-hidden px-4 pb-14 pt-[calc(env(safe-area-inset-top)+118px)] sm:px-6 md:pt-[calc(env(safe-area-inset-top)+132px)] lg:h-[100svh] lg:px-10 lg:pb-8 lg:pt-[calc(env(safe-area-inset-top)+84px)] 2xl:px-16 ${palette.hero}`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(103,232,249,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.12)_1px,transparent_1px)] [background-size:46px_46px]" />
        <div className={`pointer-events-none absolute -right-[8vw] bottom-0 select-none text-[18vw] font-black uppercase leading-[0.8] tracking-[-0.1em] ${palette.watermark}`}>
          AI ECOSYSTEM
        </div>

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-164px)] w-full max-w-[2140px] items-center gap-10 lg:min-h-[calc(100svh-118px)] xl:grid-cols-[minmax(0,0.96fr)_minmax(560px,700px)] xl:gap-12 2xl:grid-cols-[minmax(0,0.9fr)_minmax(660px,780px)] 2xl:gap-14">
          <motion.div {...heroReveal(shouldAnimate)} className="max-w-[960px]">
            <div
              className={`inline-flex items-center gap-2 border px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] sm:text-xs ${palette.label} ${
                isDayMode
                  ? "border-cyan-500/30 bg-cyan-500/8"
                  : "border-cyan-300/30 bg-cyan-300/[0.07]"
              }`}
            >
              <span className={`h-2 w-2 ${palette.accentBg} shadow-[0_0_22px_rgba(103,232,249,0.72)]`} />
              ZJU AI Ecosystem
            </div>

            <h1 className="mt-7 max-w-[1080px] text-[3.2rem] font-black leading-[0.92] tracking-[-0.075em] sm:text-7xl md:text-[5rem] lg:mt-6 lg:text-[5.25rem] xl:text-[5.8rem] 2xl:text-[6.35rem]">
              <span className="block">三大抓手，</span>
              <span className="block">点亮一张</span>
              <span className={`block ${palette.accent}`}>校园 AI 网络。</span>
            </h1>

            <p className={`mt-7 max-w-4xl text-lg font-medium leading-8 sm:text-xl sm:leading-9 lg:mt-6 ${palette.textSoft}`}>
              <strong className={isDayMode ? "text-slate-950" : "text-white"}>
                活动聚合、AI 社区、极速黑客松。
              </strong>
              {" "}让机会涌现，让人群相连，让创造落地。
            </p>

            <div className="mt-9 lg:mt-8">
              <a
                href="#ecosystem-handles"
                className={`inline-flex min-h-12 items-center justify-center gap-2 px-7 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 sm:min-h-14 sm:px-9 ${palette.primary}`}
              >
                进入核心引擎
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div
              className={`mt-10 grid max-w-4xl gap-px overflow-hidden border lg:mt-9 ${
                isDayMode
                  ? "border-cyan-500/18 bg-cyan-500/18"
                  : "border-cyan-300/18 bg-cyan-300/18"
              } sm:grid-cols-3`}
            >
              {proofStats.map((item) => (
                <div
                  key={item.label}
                  className={`p-5 sm:p-6 lg:p-5 2xl:p-6 ${
                    isDayMode ? "bg-white/80" : "bg-[#071113]/78"
                  }`}
                >
                  <div className={`text-3xl font-black leading-none tracking-tight sm:text-4xl lg:text-[2.55rem] 2xl:text-5xl ${palette.accent}`}>
                    {item.value}
                  </div>
                  <p className={`mt-3 text-xs font-bold leading-5 lg:mt-3 ${palette.textMuted}`}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

          </motion.div>

          <motion.aside
            {...heroReveal(shouldAnimate, 0.12)}
            className={`relative hidden min-h-[620px] overflow-hidden border p-7 backdrop-blur-2xl xl:block 2xl:min-h-[700px] 2xl:p-8 ${palette.panelStrong}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(103,232,249,0.18),transparent_36%),linear-gradient(135deg,rgba(103,232,249,0.08),transparent_46%)]" />
            <div className={`pointer-events-none absolute -right-12 -top-10 text-[8rem] font-black uppercase leading-none tracking-[-0.08em] ${palette.watermark}`}>
              LIVE
            </div>
            <div className="relative z-10 flex min-h-[564px] flex-col justify-between 2xl:min-h-[636px]">
              <div className={`flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] ${palette.label}`}>
                <span>Ecosystem Brief</span>
                <span>Live</span>
              </div>
              <div>
                <div className={`text-[8.8rem] font-black leading-[0.78] tracking-[-0.08em] 2xl:text-[10.5rem] ${palette.accent}`}>
                  3
                </div>
                <p className="mt-4 text-5xl font-black leading-[1.02] tracking-[-0.05em] 2xl:text-[3.35rem]">
                  抓手联动
                  <br />
                  生态成网
                </p>
                <p className={`mt-4 max-w-lg text-base font-bold leading-7 2xl:text-lg 2xl:leading-8 ${palette.textSoft}`}>
                  活动入口、社区关系、赛事创造同时在线，形成一套持续运转的校园 AI 协作系统。
                </p>
              </div>
              <div className={`grid gap-px overflow-hidden border ${isDayMode ? "border-cyan-500/18 bg-cyan-500/18" : "border-cyan-300/18 bg-cyan-300/18"}`}>
                {operatingHandles.map((item) => (
                  <Link
                    key={item.code}
                    to={item.route}
                    className={`group flex items-center justify-between gap-4 px-6 py-5 transition 2xl:px-7 2xl:py-5 ${
                      isDayMode
                        ? "bg-white/92 hover:bg-cyan-50"
                        : "bg-[#030a0c]/94 hover:bg-cyan-300/10"
                    }`}
                  >
                    <div>
                      <div className={`font-mono text-[11px] font-black uppercase tracking-[0.18em] ${palette.accent}`}>
                        {item.index} / {item.code}
                      </div>
                      <div className="mt-2 text-2xl font-black 2xl:text-3xl">{item.title}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 opacity-50 transition group-hover:translate-x-1 group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </div>
          </motion.aside>
        </div>
      </section>

      <main>
        <motion.section
          id="ecosystem-handles"
          {...sectionReveal(shouldAnimate)}
          className="relative min-h-[100svh] snap-start snap-always scroll-mt-0 overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:flex lg:h-[100svh] lg:flex-col lg:px-10 lg:pb-[clamp(1rem,3vh,2.5rem)] lg:pt-[calc(env(safe-area-inset-top)+clamp(4.5rem,8.2vh,5.125rem))] 2xl:px-16"
        >
          <div className={`pointer-events-none absolute -right-[4vw] top-8 select-none text-[18vw] font-black uppercase leading-[0.8] tracking-[-0.08em] ${palette.watermark}`}>
            RUN
          </div>
          <div className="relative z-10 mx-auto flex w-full max-w-[2140px] flex-1 flex-col lg:min-h-0">
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
              Core Engine
            </p>
            <h2 className="mt-3 max-w-5xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[clamp(3.45rem,7vh,5.65rem)]">
              三个引擎位，驱动生态持续运转。
            </h2>
            <p className={`mt-4 max-w-3xl text-base leading-8 sm:text-lg lg:text-[clamp(0.95rem,1.45vh,1.125rem)] lg:leading-7 ${palette.textSoft}`}>
              入口负责发现，社区负责连接，黑客松负责爆发。三者联动，才让校园 AI 生态从热度变成机制。
            </p>

            <div className="mt-8 grid gap-5 lg:mt-[clamp(1.25rem,2.8vh,2.5rem)] lg:min-h-0 lg:flex-1 lg:auto-rows-fr lg:grid-cols-3 lg:gap-5 2xl:gap-7">
              {operatingHandles.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.code}
                    to={item.route}
                    className={`group relative min-h-[260px] overflow-hidden border border-l-4 p-7 transition duration-300 hover:-translate-y-1 lg:flex lg:h-full lg:min-h-0 lg:p-[clamp(1rem,2.4vh,2rem)] ${palette.card} ${
                      isDayMode ? "border-l-cyan-500" : "border-l-cyan-300"
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(103,232,249,0.10),transparent_34%)] opacity-0 transition duration-300 group-hover:opacity-100" />
                    <div className={`pointer-events-none absolute -bottom-8 -right-5 text-[8rem] font-black uppercase leading-none tracking-[-0.08em] transition duration-300 group-hover:translate-x-1 ${
                      isDayMode ? "text-slate-900/[0.035]" : "text-white/[0.045]"
                    }`}>
                      {item.code}
                    </div>
                    <div className="relative z-10 lg:flex lg:h-full lg:flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                          {item.index} / {item.code}
                        </div>
                        <div className={`flex h-12 w-12 items-center justify-center lg:h-[clamp(2.5rem,5vh,4rem)] lg:w-[clamp(2.5rem,5vh,4rem)] ${palette.accentBg} text-slate-950 shadow-[0_0_34px_rgba(103,232,249,0.24)]`}>
                          <Icon className="h-6 w-6 lg:h-[clamp(1.25rem,2.6vh,2rem)] lg:w-[clamp(1.25rem,2.6vh,2rem)]" />
                        </div>
                      </div>
                      <h3 className="mt-8 text-3xl font-black leading-none tracking-[-0.04em] sm:text-4xl lg:mt-[clamp(1.5rem,4vh,3rem)] lg:text-[clamp(2rem,4.3vh,3.2rem)]">
                        {item.title}
                      </h3>
                      <p className={`mt-5 text-sm leading-7 lg:mt-[clamp(0.85rem,2.2vh,1.75rem)] lg:text-[clamp(0.9rem,1.45vh,1.125rem)] lg:leading-7 ${palette.textSoft}`}>
                        {item.description}
                      </p>
                      <div className={`mt-6 flex items-center justify-between border-t pt-5 lg:mt-auto lg:pt-[clamp(0.9rem,2.2vh,1.75rem)] ${palette.divider}`}>
                        <div>
                          <div className={`text-[11px] font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                            Loop Role
                          </div>
                          <div className={`mt-2 text-lg font-black lg:mt-2 lg:text-[clamp(1.25rem,2.6vh,1.9rem)] ${palette.accent}`}>
                            {item.loop}
                          </div>
                        </div>
                        <div className={`inline-flex items-center gap-2 text-sm font-black ${palette.accent}`}>
                          {item.short}
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 border-t pt-4 sm:mt-10 sm:pt-7 lg:mt-[clamp(1rem,2.2vh,2rem)] lg:pt-[clamp(0.8rem,1.8vh,2rem)]">
              <div className={`hidden gap-px overflow-hidden border ${isDayMode ? "border-cyan-500/18 bg-cyan-500/18" : "border-cyan-300/18 bg-cyan-300/18"} lg:grid lg:grid-cols-[0.92fr_repeat(4,1fr)]`}>
                <div className={`px-6 py-[clamp(0.8rem,1.8vh,1.5rem)] 2xl:px-7 ${isDayMode ? "bg-white/70" : "bg-white/[0.035]"}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${palette.label}`}>Operating Loop</p>
                  <h3 className="mt-2 text-[clamp(1.2rem,2.4vh,1.9rem)] font-black leading-none tracking-[-0.04em]">
                    从热度到沉淀
                  </h3>
                </div>
              {loopItems.map((item) => (
                <div
                  key={item.index}
                  className={`px-6 py-[clamp(0.8rem,1.8vh,1.5rem)] 2xl:px-7 ${
                    isDayMode ? "bg-white/88" : "bg-[#071113]/94"
                  }`}
                >
                  <div className={`font-mono text-xs font-black ${palette.accent}`}>
                    {item.index}
                  </div>
                  <h3 className="mt-2 text-[clamp(1.2rem,2.4vh,1.9rem)] font-black">{item.title}</h3>
                  <p className={`mt-1.5 text-xs leading-5 2xl:text-sm ${palette.textMuted}`}>
                    {item.detail}
                  </p>
                </div>
              ))}
              </div>

              <div className={`mt-7 grid gap-px overflow-hidden border lg:hidden ${isDayMode ? "border-cyan-500/18 bg-cyan-500/18" : "border-cyan-300/18 bg-cyan-300/18"}`}>
                {loopItems.map((item) => (
                  <div
                    key={item.index}
                    className={`min-h-[136px] p-6 ${
                      isDayMode ? "bg-white/88" : "bg-[#071113]/94"
                    }`}
                  >
                    <div className={`font-mono text-xs font-black ${palette.accent}`}>
                      {item.index}
                    </div>
                    <h3 className="mt-5 text-2xl font-black">{item.title}</h3>
                    <p className={`mt-3 text-sm leading-6 ${palette.textMuted}`}>
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="support-galaxy"
          {...sectionReveal(shouldAnimate, 0.08)}
          className={`relative min-h-[100svh] snap-start snap-always overflow-hidden px-4 py-20 sm:px-6 sm:py-24 lg:flex lg:h-[100svh] lg:flex-col lg:px-10 lg:pb-[clamp(1rem,3vh,2.5rem)] lg:pt-[calc(env(safe-area-inset-top)+clamp(4.5rem,8.2vh,5.125rem))] 2xl:px-16 ${
            isDayMode
              ? "bg-[radial-gradient(circle_at_75%_22%,rgba(6,182,212,0.14),transparent_30%)]"
              : "bg-[radial-gradient(circle_at_74%_18%,rgba(34,211,238,0.14),transparent_30%)]"
          }`}
        >
          <div className={`pointer-events-none absolute -right-[8vw] top-4 select-none text-[17vw] font-black uppercase leading-[0.8] tracking-[-0.08em] ${palette.watermark}`}>
            BACKED
          </div>
          <div className={`pointer-events-none absolute left-0 top-0 h-px w-full ${
            isDayMode
              ? "bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"
              : "bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent"
          }`} />
          <div className={`pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(103,232,249,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.12)_1px,transparent_1px)] [background-size:56px_56px]`} />
          <div className={`pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px] ${
            isDayMode ? "bg-cyan-200/26" : "bg-cyan-300/10"
          }`} />
          <div className={`pointer-events-none absolute left-1/2 top-[58%] h-[1px] w-[72vw] -translate-x-1/2 ${
            isDayMode
              ? "bg-gradient-to-r from-transparent via-cyan-500/45 to-transparent"
              : "bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent"
          }`} />
          <div className={`pointer-events-none absolute left-1/2 top-1/2 h-[72vw] max-h-[760px] w-[1px] -translate-x-1/2 -translate-y-1/2 ${
            isDayMode
              ? "bg-gradient-to-b from-transparent via-cyan-500/28 to-transparent"
              : "bg-gradient-to-b from-transparent via-cyan-300/28 to-transparent"
          }`} />

          <div className="relative z-10 mx-auto flex w-full max-w-[2140px] flex-1 flex-col lg:min-h-0">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-10 2xl:gap-14">
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
                  Support Galaxy
                </p>
                <h2 className="mt-3 max-w-5xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[clamp(3.25rem,6.4vh,5.2rem)]">
                  <span className="block">豪华阵容在场，</span>
                  <span className="block">生态才有底气。</span>
                </h2>
              </div>
              <p className={`max-w-3xl text-base leading-8 sm:text-lg lg:justify-self-end lg:text-[clamp(0.95rem,1.45vh,1.125rem)] lg:leading-7 ${palette.textSoft}`}>
                学校提供土壤，学生组织连接人群，企业伙伴带来技术与资源。拓途浙享把它们组织成一张持续运转的校园 AI 网络。
              </p>
            </div>

            <div className="mt-7 grid gap-6 lg:mt-[clamp(1.25rem,2.8vh,2.5rem)] lg:min-h-0 lg:flex-1 lg:grid-cols-[0.86fr_1.14fr] lg:gap-6 2xl:gap-8">
              <div className={`relative min-h-[500px] overflow-hidden border p-7 sm:p-9 lg:min-h-0 lg:p-[clamp(1.25rem,3vh,2.5rem)] ${palette.panelStrong}`}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(103,232,249,0.18),transparent_38%)]" />
                <div className={`pointer-events-none absolute -right-16 bottom-8 text-[11rem] font-black uppercase leading-none tracking-[-0.08em] ${palette.watermark}`}>
                  BASE
                </div>
                <div className={`pointer-events-none absolute left-0 top-0 h-full w-1 ${
                  isDayMode ? "bg-cyan-500" : "bg-cyan-300"
                }`} />
                <div className={`pointer-events-none absolute left-10 right-10 top-1/2 h-px ${
                  isDayMode
                    ? "bg-gradient-to-r from-cyan-500/45 to-transparent"
                    : "bg-gradient-to-r from-cyan-300/45 to-transparent"
                }`} />
                <div className={`pointer-events-none absolute bottom-10 left-10 h-24 w-24 border-l border-t ${
                  isDayMode ? "border-cyan-500/30" : "border-cyan-300/28"
                }`} />
                <div className={`pointer-events-none absolute right-10 top-10 h-24 w-24 border-r border-t ${
                  isDayMode ? "border-cyan-500/30" : "border-cyan-300/28"
                }`} />
                <div className={`relative z-10 flex min-h-[456px] flex-col justify-between lg:h-full lg:min-h-0`}>
                  <div>
                    <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                      01 / Foundation
                    </div>
                  <h3 className="mt-7 max-w-lg text-5xl font-black leading-[0.9] tracking-[-0.055em] sm:text-6xl lg:mt-[clamp(1.25rem,4vh,2.5rem)] lg:text-[clamp(3rem,7vh,5.6rem)]">
                      学校
                      <br />
                      支持
                    </h3>
                    <p className={`mt-6 max-w-lg text-sm leading-7 lg:mt-[clamp(1rem,3vh,2.5rem)] lg:text-[clamp(0.9rem,1.45vh,1.125rem)] lg:leading-7 ${palette.textSoft}`}>
                      场景、空间、组织协同与长期机制，构成校园 AI 生态最稳定的底座。
                    </p>
                  </div>

                  <div className="grid gap-3 lg:gap-2 2xl:gap-3">
                    {schoolSupport.map((item) => (
                      <div
                        key={item}
                        className={`grid gap-2 border-l-4 px-5 py-3 lg:gap-2 lg:px-6 lg:py-[clamp(0.9rem,2.1vh,1.5rem)] 2xl:px-7 ${
                          isDayMode
                            ? "border-l-cyan-500 bg-white/76"
                            : "border-l-cyan-300 bg-cyan-300/[0.05]"
                        }`}
                      >
                        <div className={`text-[11px] font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                          School Support
                        </div>
                        <div className="text-2xl font-black lg:text-[clamp(1.4rem,3vh,2.5rem)]">{item}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:min-h-0 lg:grid-rows-2 lg:gap-6 2xl:gap-8">
                <div className={`relative overflow-hidden border p-7 sm:p-8 lg:p-[clamp(1rem,2.4vh,2rem)] ${palette.card}`}>
                  <div className={`pointer-events-none absolute -right-10 -top-10 text-[8rem] font-black uppercase leading-none tracking-[-0.08em] ${palette.watermark}`}>
                    FORCE
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                        02 / Campus Force
                      </div>
                  <h3 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl lg:mt-[clamp(0.5rem,1.8vh,1rem)] lg:text-[clamp(2rem,4.8vh,3.75rem)]">
                        学生组织
                      </h3>
                    </div>
                    <div className={`text-sm font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                      Campus Force
                    </div>
                  </div>
                  <p className={`mt-3 max-w-2xl text-sm font-bold leading-6 lg:mt-[clamp(0.6rem,1.8vh,1.5rem)] lg:text-[clamp(0.85rem,1.35vh,1.05rem)] lg:leading-6 ${palette.textMuted}`}>
                    社群、活动、实践人群从这里被组织起来，形成持续流动的校园动能。
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:mt-[clamp(0.8rem,2.2vh,2rem)] lg:gap-4 2xl:gap-5">
                    {studentOrganizations.map((item) => (
                      <span
                        key={item}
                        className={`flex min-h-[62px] items-center justify-center border px-4 py-3 text-xl font-black transition duration-300 hover:-translate-y-0.5 lg:min-h-[clamp(3rem,6.6vh,6rem)] lg:px-5 lg:py-4 lg:text-[clamp(1.15rem,2.3vh,1.875rem)] ${
                          isDayMode
                            ? "border-slate-200 bg-white/78"
                            : "border-white/10 bg-white/[0.045] shadow-[0_0_28px_rgba(103,232,249,0.03)] hover:border-cyan-300/24"
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`relative overflow-hidden border p-7 sm:p-8 lg:p-[clamp(1rem,2.4vh,2rem)] ${palette.panelStrong}`}>
                  <div className={`pointer-events-none absolute -right-14 -bottom-10 text-[8rem] font-black uppercase leading-none tracking-[-0.08em] ${palette.watermark}`}>
                    TECH
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                        03 / Technical Backing
                      </div>
                      <h3 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl lg:mt-[clamp(0.5rem,1.8vh,1rem)] lg:text-[clamp(2rem,4.8vh,3.75rem)]">
                        企业伙伴
                      </h3>
                    </div>
                    <div className={`text-sm font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                      Resource Layer
                    </div>
                  </div>

                  <p className={`mt-3 max-w-2xl text-sm font-bold leading-6 lg:mt-[clamp(0.6rem,1.8vh,1.5rem)] lg:text-[clamp(0.85rem,1.35vh,1.05rem)] lg:leading-6 ${palette.textMuted}`}>
                    模型、云、工具与技术生态进入同一张网络，支撑真实项目从想法走向可运行。
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:mt-[clamp(0.8rem,2.2vh,2rem)] lg:gap-4 2xl:gap-5">
                    {supportLogos.map((logo) => (
                      <div
                        key={logo.alt}
                        className={`group flex min-h-[82px] items-center justify-center border px-5 py-4 transition duration-300 hover:-translate-y-0.5 lg:min-h-[clamp(3.35rem,7vh,7rem)] lg:px-6 lg:py-5 ${
                          isDayMode
                            ? "border-slate-200 bg-white/86 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                            : "border-white/10 bg-white/[0.045] shadow-[0_0_0_1px_rgba(103,232,249,0.02)] hover:border-cyan-300/30 hover:bg-cyan-300/[0.065]"
                        }`}
                      >
                        <img
                          src={isDayMode ? logo.src : logo.darkSrc || logo.src}
                          alt={logo.alt}
                          className={`w-auto max-w-full object-contain transition duration-300 group-hover:scale-[1.04] ${
                            logo.size || "h-6 sm:h-8"
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 lg:hidden">
                    {enterprisePartners.map((item) => (
                      <span
                        key={item}
                        className={`border px-3.5 py-2 text-sm font-black ${
                          isDayMode
                            ? "border-cyan-500/20 bg-cyan-50 text-cyan-800"
                            : "border-cyan-300/18 bg-cyan-300/[0.06] text-cyan-100"
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default About;
