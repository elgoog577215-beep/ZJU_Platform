import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Trophy,
  Users,
} from "lucide-react";
import { hackathonPartnerLogos } from "../data/partnerLogos";
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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let frameId = 0;
    let timeoutId = 0;

    const scrollToHashTarget = () => {
      const hash = window.location.hash;
      if (!hash) return;

      let targetId = hash.slice(1);
      try {
        targetId = decodeURIComponent(targetId);
      } catch {
        return;
      }

      const target = document.getElementById(targetId);
      if (!target) return;

      const root = target.closest("[data-about-scroll-root]");
      const behavior = reduceMotion ? "auto" : "smooth";
      const shouldUseDesktopScroller = window.matchMedia("(min-width: 1024px)").matches;

      if (shouldUseDesktopScroller && root instanceof HTMLElement) {
        root.scrollTo({ top: target.offsetTop, behavior });
        return;
      }

      target.scrollIntoView({ block: "start", behavior });
    };

    const scheduleHashScroll = () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      frameId = window.requestAnimationFrame(scrollToHashTarget);
      timeoutId = window.setTimeout(scrollToHashTarget, 160);
    };

    scheduleHashScroll();
    window.addEventListener("hashchange", scheduleHashScroll);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.removeEventListener("hashchange", scheduleHashScroll);
    };
  }, [reduceMotion]);

  const schoolSupport = parseUnits(
    settings.about_school_support_units || "未来学习中心,AI 联合实验室",
  );
  const studentOrganizations = parseUnits(
    settings.about_student_organizations || "XLAB,ZJUAI,EAI,AIRA,KAB",
  );
  const operatingHandles = [
    {
      index: "01",
      code: "ENTRY",
      title: "活动聚合",
      short: "统一入口",
      loop: "汇聚资源",
      icon: CalendarDays,
      description:
        "聚合活动、项目、企业课题与学习资源，让全域 AI 机会进入同一入口。",
      route: "/events",
    },
    {
      index: "02",
      code: "LINK",
      title: "AI 社区",
      short: "持续共建",
      loop: "组织人群",
      icon: Users,
      description:
        "连接学习者、开发者与社团负责人，把交流转化为长期共建。",
      route: "/community",
    },
    {
      index: "03",
      code: "BUILD",
      title: "极速黑客松",
      short: "成果认定",
      loop: "验证能力",
      icon: Trophy,
      description:
        "企业真实命题、限时技术攻坚、零路演评审，让硬核能力被直接验证。",
      route: "/hackathon",
    },
  ];

  const loopItems = [
    { index: "01", title: "汇聚", detail: "活动、项目与企业课题进入同一入口" },
    { index: "02", title: "实战", detail: "学生在赛事与项目中做中学" },
    { index: "03", title: "认定", detail: "校企共同背书成果能力" },
    { index: "04", title: "通道", detail: "优秀人才通向实习与内推" },
  ];

  const foundationPillars = [
    { index: "A", title: "场景开放" },
    { index: "B", title: "组织协同" },
    { index: "C", title: "长期机制" },
  ];

  const proofStats = [
    {
      value: settings.about_stat_1_value || "1000+",
      label: settings.about_stat_1_label || "平台用户基础",
    },
    { value: "3", label: "三位一体业务" },
    {
      value: settings.about_stat_3_value || "5 小时",
      label: settings.about_stat_3_label || "限时实战攻坚",
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
    <div
      data-about-scroll-root
      className={`min-h-screen overflow-x-hidden scroll-smooth pb-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:h-screen lg:overflow-y-auto lg:snap-y lg:snap-mandatory lg:pb-0 ${palette.page}`}
    >
      <SEO
        title="关于我们"
        description="了解拓途浙享如何以企业真实课题、校园 AI 社区与技术黑客松连接学校、企业和学生，构建产学融合生态。"
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
        className={`relative isolate min-h-[100svh] overflow-hidden px-4 pb-8 pt-[calc(env(safe-area-inset-top)+92px)] sm:px-6 md:pt-[calc(env(safe-area-inset-top)+132px)] lg:h-[100svh] lg:snap-start lg:snap-always lg:pb-8 lg:pl-10 lg:pr-28 lg:pt-[calc(env(safe-area-inset-top)+84px)] 2xl:pl-16 2xl:pr-36 ${palette.hero}`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(103,232,249,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.12)_1px,transparent_1px)] [background-size:46px_46px]" />
        <div className={`pointer-events-none absolute -right-[8vw] bottom-0 select-none text-[18vw] font-black uppercase leading-[0.8] tracking-[-0.1em] ${palette.watermark}`}>
          AI ECOSYSTEM
        </div>

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-112px)] w-full max-w-[2140px] content-center gap-8 lg:min-h-[calc(100svh-118px)] lg:items-center xl:grid-cols-[minmax(0,0.96fr)_minmax(560px,700px)] xl:gap-12 2xl:grid-cols-[minmax(0,0.9fr)_minmax(660px,780px)] 2xl:gap-14">
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

            <h1 className="mt-5 max-w-[1080px] text-[2.85rem] font-black leading-[0.92] tracking-[-0.075em] sm:mt-6 sm:text-7xl md:text-[5rem] lg:mt-6 lg:text-[clamp(4.35rem,9.2vh,5.25rem)] xl:text-[clamp(4rem,7.8vh,5.8rem)] 2xl:text-[6.35rem] [@media_(max-height:820px)]:lg:mt-4">
              <span className="block">把企业真题，</span>
              <span className="block">接入一张</span>
              <span className={`block ${palette.accent}`}>校园 AI 网络。</span>
            </h1>

            <p className={`mt-5 max-w-4xl text-base font-medium leading-7 sm:mt-6 sm:text-xl sm:leading-9 lg:mt-5 lg:text-[clamp(0.95rem,1.9vh,1.18rem)] lg:leading-8 [@media_(max-height:820px)]:lg:mt-4 ${palette.textSoft}`}>
              <strong className={isDayMode ? "text-slate-950" : "text-white"}>
                真实课题、实战项目、校企认定。
              </strong>
              {" "}让学生在做中学，让企业提前看见人才，让校园创新通向产业现场。
            </p>

            <div className="mt-6 lg:mt-7 [@media_(max-height:820px)]:lg:mt-5">
              <a
                href="#ecosystem-handles"
                className={`inline-flex min-h-12 items-center justify-center gap-2 px-7 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 sm:min-h-14 sm:px-9 [@media_(max-height:820px)]:lg:min-h-12 [@media_(max-height:820px)]:lg:px-7 ${palette.primary}`}
              >
                查看生态闭环
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div
              className={`mt-6 grid max-w-4xl grid-cols-3 gap-px overflow-hidden border lg:mt-7 [@media_(max-height:820px)]:lg:mt-5 ${
                isDayMode
                  ? "border-cyan-500/18 bg-cyan-500/18"
                  : "border-cyan-300/18 bg-cyan-300/18"
              }`}
            >
              {proofStats.map((item) => (
                <div
                  key={item.label}
                  className={`p-3.5 sm:p-6 lg:p-5 2xl:p-6 [@media_(max-height:820px)]:lg:p-3.5 ${
                    isDayMode ? "bg-white/80" : "bg-[#071113]/78"
                  }`}
                >
                  <div className={`text-[clamp(1.15rem,7vw,1.5rem)] font-black leading-none tracking-tight sm:text-4xl lg:text-[clamp(2rem,4.6vh,2.55rem)] 2xl:text-5xl ${palette.accent}`}>
                    {item.value}
                  </div>
                  <p className={`mt-2 text-[10px] font-bold leading-4 sm:mt-3 sm:text-xs sm:leading-5 lg:mt-2.5 [@media_(max-height:820px)]:lg:mt-2 ${palette.textMuted}`}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

          </motion.div>

          <motion.aside
            {...heroReveal(shouldAnimate, 0.12)}
            className={`relative hidden min-h-[620px] overflow-hidden border p-7 backdrop-blur-2xl xl:block xl:min-h-[clamp(33rem,70vh,38.75rem)] xl:p-[clamp(1.25rem,2.4vh,1.75rem)] 2xl:min-h-[700px] 2xl:p-8 ${palette.panelStrong}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(103,232,249,0.18),transparent_36%),linear-gradient(135deg,rgba(103,232,249,0.08),transparent_46%)]" />
            <div className={`pointer-events-none absolute -right-12 -top-10 text-[8rem] font-black uppercase leading-none tracking-[-0.08em] ${palette.watermark}`}>
              LIVE
            </div>
            <div className="relative z-10 flex min-h-[564px] flex-col justify-between xl:min-h-[clamp(29rem,63vh,35.25rem)] 2xl:min-h-[636px]">
              <div className={`flex items-center justify-between text-[11px] font-black uppercase tracking-[0.2em] ${palette.label}`}>
                <span>Ecosystem Brief</span>
                <span>Live</span>
              </div>
              <div>
                <div className={`text-[clamp(6rem,13vh,8.8rem)] font-black leading-[0.78] tracking-[-0.08em] 2xl:text-[10.5rem] ${palette.accent}`}>
                  3
                </div>
                <p className="mt-4 text-[clamp(2.35rem,5.4vh,3rem)] font-black leading-[1.02] tracking-[-0.05em] 2xl:text-[3.35rem]">
                  三方协同
                  <br />
                  闭环运转
                </p>
                <p className={`mt-3 max-w-lg text-base font-bold leading-7 2xl:mt-4 2xl:text-lg 2xl:leading-8 ${palette.textSoft}`}>
                  企业发布真实课题，学生在实战中产出成果，校企共同完成认定与推荐。
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
          className="relative min-h-[100svh] scroll-mt-[calc(env(safe-area-inset-top)+4.5rem)] overflow-hidden px-4 py-12 sm:px-6 sm:py-20 lg:flex lg:h-[100svh] lg:snap-start lg:snap-always lg:scroll-mt-0 lg:flex-col lg:pb-[clamp(1rem,3vh,2.5rem)] lg:pl-10 lg:pr-28 lg:pt-[calc(env(safe-area-inset-top)+clamp(4.5rem,8.2vh,5.125rem))] 2xl:pl-16 2xl:pr-36"
        >
          <div className={`pointer-events-none absolute -right-[4vw] top-8 select-none text-[18vw] font-black uppercase leading-[0.8] tracking-[-0.08em] ${palette.watermark}`}>
            RUN
          </div>
          <div className="relative z-10 mx-auto flex w-full max-w-[2140px] flex-1 flex-col lg:min-h-0 lg:justify-center">
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
              Core Engine
            </p>
            <h2 className="mt-3 max-w-5xl text-[2.25rem] font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[clamp(3.45rem,7vh,5.65rem)]">
              <span className="block sm:inline">三位一体，</span>
              <span className="block sm:inline">打通产学闭环。</span>
            </h2>
            <p className={`mt-3 max-w-3xl text-sm leading-7 sm:mt-4 sm:text-lg sm:leading-8 lg:text-[clamp(0.95rem,1.45vh,1.125rem)] lg:leading-7 ${palette.textSoft}`}>
              资源入口聚合机会，AI 社区承接共建，技术黑客松完成高密度验证。三者联动，才让 AI 热度变成可运营、可复制的人才培养机制。
            </p>

            <div className="mt-5 grid gap-3 lg:mt-[clamp(1rem,2.1vh,1.75rem)] lg:h-[clamp(17rem,32vh,24rem)] lg:min-h-0 lg:auto-rows-fr lg:grid-cols-3 lg:gap-5 2xl:gap-7">
              {operatingHandles.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.code}
                    to={item.route}
                    className={`group relative min-h-[168px] overflow-hidden border border-l-4 p-4 transition duration-300 hover:-translate-y-1 sm:min-h-[250px] sm:p-7 lg:flex lg:h-full lg:min-h-0 lg:p-[clamp(1rem,2.4vh,2rem)] ${palette.card} ${
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
                        <div className={`flex h-10 w-10 items-center justify-center lg:h-[clamp(2.5rem,5vh,4rem)] lg:w-[clamp(2.5rem,5vh,4rem)] ${palette.accentBg} text-slate-950 shadow-[0_0_34px_rgba(103,232,249,0.24)]`}>
                          <Icon className="h-5 w-5 lg:h-[clamp(1.25rem,2.6vh,2rem)] lg:w-[clamp(1.25rem,2.6vh,2rem)]" />
                        </div>
                      </div>
                      <h3 className="mt-3 text-[1.55rem] font-black leading-none tracking-[-0.04em] sm:mt-8 sm:text-4xl lg:mt-[clamp(1rem,2.6vh,1.85rem)] lg:text-[clamp(1.9rem,3.8vh,2.85rem)]">
                        {item.title}
                      </h3>
                      <p className={`mt-2.5 text-sm leading-6 sm:mt-5 sm:leading-7 lg:mt-[clamp(0.75rem,1.8vh,1.35rem)] lg:text-[clamp(0.88rem,1.3vh,1.02rem)] lg:leading-6 ${palette.textSoft}`}>
                        {item.description}
                      </p>
                      <div className={`mt-2.5 flex items-center justify-between border-t pt-2.5 sm:mt-6 sm:pt-5 lg:mt-auto lg:pt-[clamp(0.8rem,1.8vh,1.35rem)] ${palette.divider}`}>
                        <div>
                          <div className={`text-[11px] font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                            Loop Role
                          </div>
                          <div className={`mt-1.5 text-lg font-black lg:mt-2 lg:text-[clamp(1.25rem,2.6vh,1.9rem)] ${palette.accent}`}>
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

            <div className="mt-6 border-t pt-4 sm:mt-10 sm:pt-7 lg:mt-[clamp(0.85rem,1.8vh,1.5rem)] lg:pt-[clamp(0.75rem,1.5vh,1.35rem)]">
              <div className={`hidden gap-px overflow-hidden border ${isDayMode ? "border-cyan-500/18 bg-cyan-500/18" : "border-cyan-300/18 bg-cyan-300/18"} lg:grid lg:grid-cols-[0.92fr_repeat(4,1fr)]`}>
                <div className={`px-6 py-[clamp(0.8rem,1.8vh,1.5rem)] 2xl:px-7 ${isDayMode ? "bg-white/70" : "bg-white/[0.035]"}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${palette.label}`}>Operating Loop</p>
                  <h3 className="mt-2 text-[clamp(1.2rem,2.4vh,1.9rem)] font-black leading-none tracking-[-0.04em]">
                    从真题到通道
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

              <div className={`mt-5 grid gap-px overflow-hidden border lg:hidden ${isDayMode ? "border-cyan-500/18 bg-cyan-500/18" : "border-cyan-300/18 bg-cyan-300/18"}`}>
                {loopItems.map((item) => (
                  <div
                    key={item.index}
                    className={`grid min-h-[92px] grid-cols-[3rem_1fr] items-center gap-x-3 p-4 ${
                      isDayMode ? "bg-white/88" : "bg-[#071113]/94"
                    }`}
                  >
                    <div className={`font-mono text-xs font-black ${palette.accent}`}>
                      {item.index}
                    </div>
                    <div>
                      <h3 className="text-xl font-black">{item.title}</h3>
                      <p className={`mt-1 text-xs leading-5 ${palette.textMuted}`}>
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="support-galaxy"
          {...sectionReveal(shouldAnimate, 0.08)}
          className={`relative min-h-[100svh] scroll-mt-[calc(env(safe-area-inset-top)+4.5rem)] overflow-hidden px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-12 sm:px-6 sm:pb-20 sm:pt-20 lg:flex lg:h-[100svh] lg:snap-start lg:snap-always lg:scroll-mt-0 lg:flex-col lg:pb-[clamp(1rem,3vh,2.5rem)] lg:pl-10 lg:pr-28 lg:pt-[calc(env(safe-area-inset-top)+clamp(4.5rem,8.2vh,5.125rem))] 2xl:pl-16 2xl:pr-36 ${
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
            isDayMode ? "bg-cyan-200/[0.26]" : "bg-cyan-300/10"
          }`} />
          <div className="relative z-10 mx-auto flex w-full max-w-[2140px] flex-1 flex-col lg:min-h-0 lg:justify-center">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(360px,0.78fr)] lg:items-end lg:gap-10 2xl:gap-14">
              <div className="max-w-[820px]">
                <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
                  Support Galaxy
                </p>
                <h2 className="mt-3 max-w-[820px] text-[2.15rem] font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[clamp(3rem,5.6vh,4.55rem)]">
                  <span className="block">三方资源在场，</span>
                  <span className="block">产学融合有底气。</span>
                </h2>
              </div>
              <p className={`max-w-3xl text-sm leading-7 sm:text-lg sm:leading-8 lg:justify-self-end lg:pb-[clamp(0.25rem,1vh,0.9rem)] lg:text-[clamp(0.95rem,1.45vh,1.125rem)] lg:leading-7 ${palette.textSoft}`}>
                学校提供场景与机制，学生组织承接人群与执行，企业伙伴带来真实课题、技术资源和人才通道。
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:mt-[clamp(1rem,2.2vh,2rem)] lg:h-[clamp(29rem,62vh,48rem)] lg:min-h-0 lg:grid-cols-[0.78fr_1.22fr] lg:gap-5 2xl:gap-7">
              <div className={`relative overflow-hidden border p-4 sm:min-h-[460px] sm:p-9 lg:h-full lg:min-h-0 lg:p-[clamp(1rem,2.4vh,2rem)] ${palette.panelStrong}`}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(103,232,249,0.18),transparent_38%)]" />
                <div className={`pointer-events-none absolute -right-16 bottom-2 text-[11rem] font-black uppercase leading-none tracking-[-0.08em] ${palette.watermark}`}>
                  BASE
                </div>
                <div className={`pointer-events-none absolute left-0 top-0 h-full w-1 ${
                  isDayMode ? "bg-cyan-500" : "bg-cyan-300"
                }`} />
                <div className={`pointer-events-none absolute right-10 top-10 h-20 w-20 border-r border-t ${
                  isDayMode ? "border-cyan-500/30" : "border-cyan-300/[0.28]"
                }`} />
                <div className="relative z-10 flex flex-col sm:min-h-[416px] lg:h-full lg:min-h-0 lg:justify-center">
                  <div>
                    <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                      01 / Foundation
                    </div>
                    <h3 className="mt-4 max-w-lg text-[2.15rem] font-black leading-[0.9] tracking-[-0.055em] sm:mt-7 sm:text-6xl lg:mt-[clamp(1rem,2.4vh,1.75rem)] lg:text-[clamp(2.35rem,5vh,4rem)]">
                      学校
                      <br />
                      支持
                    </h3>
                    <p className={`mt-4 max-w-lg text-sm leading-6 sm:mt-6 sm:leading-7 lg:mt-[clamp(0.8rem,2vh,1.5rem)] lg:text-[clamp(0.9rem,1.35vh,1.05rem)] lg:leading-6 ${palette.textSoft}`}>
                      未来学习中心与校内创新平台提供场景、空间、组织协同与长期机制，让产学融合有稳定底座。
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-9 sm:gap-3 lg:mt-[clamp(1.35rem,4vh,3.25rem)]">
                    {foundationPillars.map((pillar) => (
                      <div
                        key={pillar.index}
                        className={`relative flex min-h-[2.85rem] items-center gap-2 overflow-hidden border px-2.5 py-2.5 sm:min-h-[4rem] sm:px-3.5 sm:py-4 lg:min-h-[clamp(2.75rem,5.2vh,4.2rem)] ${
                          isDayMode
                            ? "border-cyan-500/20 bg-cyan-50/70"
                            : "border-cyan-300/[0.12] bg-white/[0.035]"
                        }`}
                      >
                        <div className={`shrink-0 font-mono text-[10px] font-black uppercase tracking-[0.18em] ${palette.accent}`}>
                          {pillar.index}
                        </div>
                        <div className="text-sm font-black leading-tight sm:text-base lg:text-[clamp(0.8rem,1.45vh,1.1rem)] 2xl:text-[clamp(0.9rem,1.55vh,1.15rem)]">
                          {pillar.title}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-1 sm:gap-3 lg:mt-[clamp(1rem,3.2vh,2.75rem)] lg:grid-cols-1 lg:gap-3 2xl:grid-cols-2">
                    {schoolSupport.map((item) => (
                      <div
                        key={item}
                        className={`grid content-center gap-1.5 border-l-4 px-3 py-3 sm:gap-2 sm:px-5 lg:min-h-[clamp(3.45rem,6.8vh,5.45rem)] lg:gap-1.5 lg:px-5 lg:py-[clamp(0.65rem,1.45vh,1.1rem)] 2xl:px-6 ${
                          isDayMode
                            ? "border-l-cyan-500 bg-white/[0.76]"
                            : "border-l-cyan-300 bg-cyan-300/[0.05]"
                        }`}
                      >
                        <div className={`text-[9px] font-black uppercase tracking-[0.15em] sm:text-[11px] sm:tracking-[0.18em] ${palette.textMuted}`}>
                          School Support
                        </div>
                        <div className="text-base font-black leading-tight sm:text-2xl lg:whitespace-nowrap lg:text-[clamp(1.2rem,2.1vh,1.85rem)] 2xl:text-[clamp(1.35rem,2.45vh,2.1rem)]">{item}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:h-full lg:min-h-0 lg:grid-rows-[0.95fr_1.05fr] lg:gap-5 2xl:gap-7">
                <div className={`relative overflow-hidden border p-5 sm:p-8 lg:flex lg:flex-col lg:justify-center lg:p-[clamp(1rem,2.3vh,1.95rem)] ${palette.card}`}>
                  <div className={`pointer-events-none absolute -right-10 -top-10 text-[8rem] font-black uppercase leading-none tracking-[-0.08em] ${palette.watermark}`}>
                    FORCE
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                        02 / Campus Force
                      </div>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.045em] sm:mt-3 sm:text-4xl lg:mt-[clamp(0.5rem,1.5vh,0.9rem)] lg:text-[clamp(1.9rem,4.2vh,3.2rem)]">
                        学生组织
                      </h3>
                    </div>
                    <div className={`text-sm font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                      Campus Force
                    </div>
                  </div>
                  <p className={`mt-3 max-w-2xl text-sm font-bold leading-6 lg:mt-[clamp(0.6rem,1.8vh,1.5rem)] lg:text-[clamp(0.85rem,1.35vh,1.05rem)] lg:leading-6 ${palette.textMuted}`}>
                    头部科创社团与核心负责人共同承接活动、项目和实践人群，让校园动能持续流动。
                  </p>
                  <div className="relative mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 lg:mt-[clamp(0.85rem,1.7vh,1.35rem)] lg:gap-3 2xl:gap-4">
                    <div className={`pointer-events-none absolute left-3 right-3 top-1/2 hidden h-px -translate-y-1/2 sm:block ${
                      isDayMode
                        ? "bg-gradient-to-r from-cyan-500/0 via-cyan-500/[0.28] to-cyan-500/0"
                        : "bg-gradient-to-r from-cyan-300/0 via-cyan-300/[0.28] to-cyan-300/0"
                    }`} />
                    {studentOrganizations.map((item) => (
                      <span
                        key={item}
                        className={`relative flex min-h-[48px] items-center justify-center border px-3 py-2 text-base font-black transition duration-300 hover:-translate-y-0.5 sm:min-h-[62px] sm:px-4 sm:py-3 sm:text-xl lg:min-h-[clamp(2.35rem,4.4vh,4.05rem)] lg:px-4 lg:py-3 lg:text-[clamp(1.05rem,2.1vh,1.75rem)] 2xl:px-5 2xl:py-4 2xl:text-[clamp(1.15rem,2.3vh,1.875rem)] ${
                          isDayMode
                            ? "border-cyan-500/[0.18] bg-white/[0.72] shadow-[0_14px_36px_rgba(15,23,42,0.08)]"
                            : "border-cyan-300/[0.14] bg-[#071112]/[0.88] shadow-[0_0_28px_rgba(103,232,249,0.035)] hover:border-cyan-300/30 hover:bg-cyan-300/[0.055]"
                        }`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={`relative overflow-hidden border p-5 sm:p-8 lg:flex lg:flex-col lg:justify-center lg:p-[clamp(1rem,2.3vh,1.95rem)] ${palette.panelStrong}`}>
                  <div className={`pointer-events-none absolute -right-14 -bottom-10 text-[8rem] font-black uppercase leading-none tracking-[-0.08em] ${palette.watermark}`}>
                    TECH
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                        03 / Technical Backing
                      </div>
                      <h3 className="mt-2 text-2xl font-black tracking-[-0.045em] sm:mt-3 sm:text-4xl lg:mt-[clamp(0.5rem,1.5vh,0.9rem)] lg:text-[clamp(1.9rem,4.2vh,3.2rem)]">
                        企业伙伴
                      </h3>
                    </div>
                    <div className={`text-sm font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                      Resource Layer
                    </div>
                  </div>

                  <p className={`mt-3 max-w-2xl text-sm font-bold leading-6 lg:mt-[clamp(0.6rem,1.8vh,1.5rem)] lg:text-[clamp(0.85rem,1.35vh,1.05rem)] lg:leading-6 ${palette.textMuted}`}>
                    头部 AI 企业把真实课题、模型、云和工具带入校园，支撑项目从想法走向可运行成果。
                  </p>

                  <div className={`mt-5 grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-3 sm:gap-3 lg:mt-[clamp(0.85rem,1.8vh,1.5rem)] lg:grid-cols-6 lg:gap-2 lg:pt-[clamp(0.75rem,1.6vh,1.25rem)] xl:gap-3 ${
                    isDayMode ? "border-cyan-500/[0.14]" : "border-cyan-300/[0.12]"
                  }`}>
                    {hackathonPartnerLogos.map((logo) => (
                      <div
                        key={logo.src}
                        className={`group flex min-h-[58px] items-center justify-center px-3 py-3 transition duration-300 hover:-translate-y-0.5 sm:min-h-[72px] sm:px-5 sm:py-4 lg:min-h-[clamp(3rem,5.3vh,4.35rem)] lg:px-2 lg:py-3 xl:px-3 ${
                          isDayMode
                            ? "bg-white/[0.72] shadow-[inset_0_0_0_1px_rgba(6,182,212,0.12),0_16px_36px_rgba(15,23,42,0.07)]"
                            : "bg-white/[0.035] shadow-[inset_0_0_0_1px_rgba(103,232,249,0.09),0_0_0_1px_rgba(103,232,249,0.015)] hover:bg-cyan-300/[0.055]"
                        }`}
                      >
                        <img
                          src={isDayMode ? logo.src : logo.darkSrc || logo.src}
                          alt={logo.alt}
                          className={`w-auto max-w-full object-contain transition duration-300 group-hover:scale-[1.04] ${
                            logo.size || "h-5 sm:h-7 lg:h-[clamp(1.35rem,2.7vh,1.9rem)]"
                          } ${!isDayMode ? logo.darkClassName || "" : ""}`}
                        />
                        {logo.text ? (
                          <span
                            className={`ml-2 whitespace-nowrap text-sm font-black leading-none tracking-tight sm:text-base lg:text-[clamp(0.8rem,1.15vw,1rem)] ${
                              isDayMode ? "text-slate-950" : "text-white"
                            }`}
                          >
                            {logo.text}
                          </span>
                        ) : null}
                      </div>
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
