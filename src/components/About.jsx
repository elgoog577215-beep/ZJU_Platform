import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CalendarDays,
  Trophy,
  Users,
} from "lucide-react";
import { getPartnerDisplayName, getPartnerLogoSrc } from "../data/partnerLogos";
import { useSettings } from "../context/SettingsContext";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
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

const partnerNameTranslations = {
  1: "Future Learning Center",
  2: "AI Joint Lab",
  9: "ModelScope Community",
  11: "Alibaba Cloud",
  13: "StepFun",
  "未来学习中心": "Future Learning Center",
  "AI 联合实验室": "AI Joint Lab",
  "ModelScope 魔搭社区": "ModelScope Community",
  "阿里云": "Alibaba Cloud",
  "阶跃 StepFun": "StepFun",
};

const About = () => {
  const { t, i18n } = useTranslation();
  const { settings, uiMode } = useSettings();
  const { schoolPartners, organizationPartners, enterpriseLogos } = useEcosystemPartners();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion;
  const isDayMode = uiMode === "day";
  const language = i18n.resolvedLanguage || i18n.language || "zh";
  const isEnglish = String(language).startsWith("en");

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

  const getPartnerName = (partner) =>
    isEnglish
      ? partnerNameTranslations[partner.id] || partnerNameTranslations[partner.name] || partner.name
      : partner.name;
  const schoolSupport = schoolPartners.map(getPartnerName);
  const studentOrganizations = organizationPartners.map(getPartnerName);
  const operatingHandles = [
    {
      index: "01",
      code: "ENTRY",
      title: t("about.ecosystem.handles.events_title", "活动聚合"),
      short: t("about.ecosystem.handles.events_short", "统一入口"),
      loop: t("about.ecosystem.handles.events_loop", "汇聚资源"),
      icon: CalendarDays,
      description: t("about.ecosystem.handles.events_desc", "聚合活动、项目、企业课题与学习资源，让全域 AI 机会进入同一入口。"),
      route: "/events",
    },
    {
      index: "02",
      code: "LINK",
      title: t("about.ecosystem.handles.community_title", "AI 社区"),
      short: t("about.ecosystem.handles.community_short", "持续共建"),
      loop: t("about.ecosystem.handles.community_loop", "组织人群"),
      icon: Users,
      description: t("about.ecosystem.handles.community_desc", "连接学习者、开发者与社团负责人，把交流转化为长期共建。"),
      route: "/community",
    },
    {
      index: "03",
      code: "BUILD",
      title: t("about.ecosystem.handles.hackathon_title", "极速黑客松"),
      short: t("about.ecosystem.handles.hackathon_short", "成果认定"),
      loop: t("about.ecosystem.handles.hackathon_loop", "验证能力"),
      icon: Trophy,
      description: t("about.ecosystem.handles.hackathon_desc", "企业真实命题、限时技术攻坚、零路演评审，让硬核能力被直接验证。"),
      route: "/hackathon",
    },
  ];

  const loopItems = [
    { index: "01", title: t("about.ecosystem.loop.gather", "汇聚"), detail: t("about.ecosystem.loop.gather_desc", "活动、项目与企业课题进入同一入口") },
    { index: "02", title: t("about.ecosystem.loop.practice", "实战"), detail: t("about.ecosystem.loop.practice_desc", "学生在赛事与项目中做中学") },
    { index: "03", title: t("about.ecosystem.loop.recognize", "认定"), detail: t("about.ecosystem.loop.recognize_desc", "校企共同背书成果能力") },
    { index: "04", title: t("about.ecosystem.loop.channel", "通道"), detail: t("about.ecosystem.loop.channel_desc", "优秀人才通向实习与内推") },
  ];

  const foundationPillars = [
    { index: "A", title: t("about.ecosystem.foundation.scenario", "场景开放"), detail: t("about.ecosystem.foundation.scenario_desc", "真实任务进入校园现场") },
    { index: "B", title: t("about.ecosystem.foundation.coordination", "组织协同"), detail: t("about.ecosystem.foundation.coordination_desc", "空间、人群与执行联动") },
    { index: "C", title: t("about.ecosystem.foundation.mechanism", "长期机制"), detail: t("about.ecosystem.foundation.mechanism_desc", "活动沉淀为持续通道") },
  ];

  const proofStats = [
    {
      value: settings.about_stat_1_value || "1000+",
      label: !isEnglish && settings.about_stat_1_label
        ? settings.about_stat_1_label
        : t("about.ecosystem.stats.user_base", "平台用户基础"),
    },
    { value: "3", label: t("about.ecosystem.stats.core_chain", "三位一体业务") },
    {
      value: !isEnglish && settings.about_stat_3_value
        ? settings.about_stat_3_value
        : t("about.ecosystem.stats.sprint_value", "5 小时"),
      label: !isEnglish && settings.about_stat_3_label
        ? settings.about_stat_3_label
        : t("about.ecosystem.stats.sprint_label", "限时实战攻坚"),
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
          "bg-cyan-500 theme-on-dark shadow-[0_18px_42px_rgba(6,182,212,0.28)] hover:bg-cyan-600",
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
      className={`min-h-screen overflow-x-hidden scroll-smooth pb-0 lg:h-screen lg:overflow-y-auto lg:snap-y lg:snap-mandatory ${palette.page}`}
    >
      <SEO
        title={t("about.ecosystem.meta_title", "关于我们")}
        description={t("about.ecosystem.meta_desc", "了解拓途浙享如何以企业真实课题、校园 AI 社区与技术黑客松连接学校、企业和学生，构建产学融合生态。")}
      />

      <nav
        aria-label={t("about.ecosystem.pagination_aria", "关于页面分页")}
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
        className={`relative isolate min-h-[100svh] overflow-hidden px-4 pb-8 pt-[calc(env(safe-area-inset-top)+78px)] sm:px-6 md:pt-[calc(env(safe-area-inset-top)+112px)] lg:h-[100svh] lg:snap-start lg:snap-always lg:pb-8 lg:pl-10 lg:pr-28 lg:pt-[calc(env(safe-area-inset-top)+84px)] 2xl:pl-16 2xl:pr-36 ${palette.hero}`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(103,232,249,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.12)_1px,transparent_1px)] [background-size:46px_46px]" />
        <div className={`pointer-events-none absolute -right-[8vw] bottom-0 select-none text-[18vw] font-black uppercase leading-[0.8] tracking-[-0.1em] ${palette.watermark}`}>
          AI ECOSYSTEM
        </div>

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-88px)] w-full max-w-[2140px] content-start gap-6 pt-7 sm:pt-9 lg:min-h-[calc(100svh-118px)] lg:content-center lg:items-center lg:gap-8 lg:pt-0 xl:grid-cols-[minmax(0,0.96fr)_minmax(560px,700px)] xl:gap-12 2xl:grid-cols-[minmax(0,0.9fr)_minmax(660px,780px)] 2xl:gap-14">
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

            <h1 className="mt-4 max-w-[1080px] text-[2.28rem] font-black leading-[0.98] tracking-[-0.045em] min-[380px]:text-[2.45rem] sm:mt-6 sm:text-6xl md:text-[5rem] lg:mt-6 lg:text-[clamp(4.35rem,9.2vh,5.25rem)] lg:leading-[0.92] lg:tracking-[-0.075em] xl:text-[clamp(4rem,7.8vh,5.8rem)] 2xl:text-[6.35rem] [@media_(max-height:820px)]:lg:mt-4">
              <span className="block">{t("about.ecosystem.hero.title_1", "把企业真题，")}</span>
              <span className="block">{t("about.ecosystem.hero.title_2", "接入一张")}</span>
              <span className={`block ${palette.accent}`}>
                {t("about.ecosystem.hero.title_3", "校园 AI 网络。")}
              </span>
            </h1>

            <p className={`mt-4 max-w-4xl text-sm font-medium leading-6 sm:mt-6 sm:text-xl sm:leading-9 lg:mt-5 lg:text-[clamp(0.95rem,1.9vh,1.18rem)] lg:leading-8 [@media_(max-height:820px)]:lg:mt-4 ${palette.textSoft}`}>
              <strong className={isDayMode ? "text-slate-950" : "text-white"}>
                {t("about.ecosystem.hero.strong", "真实课题、实战项目、校企认定。")}
              </strong>
              {" "}{t("about.ecosystem.hero.desc", "让学生在做中学，让企业提前看见人才，让校园创新通向产业现场。")}
            </p>

            <div className="mt-5 lg:mt-7 [@media_(max-height:820px)]:lg:mt-5">
              <a
                href="#ecosystem-handles"
                className={`inline-flex min-h-12 items-center justify-center gap-2 px-7 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 sm:min-h-14 sm:px-9 [@media_(max-height:820px)]:lg:min-h-12 [@media_(max-height:820px)]:lg:px-7 ${palette.primary}`}
              >
                {t("about.ecosystem.hero.cta", "查看生态闭环")}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div
              className={`mt-5 grid max-w-4xl grid-cols-3 gap-px overflow-hidden border sm:mt-6 lg:mt-7 [@media_(max-height:820px)]:lg:mt-5 ${
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

            <div className={`mt-4 grid gap-px overflow-hidden border xl:hidden ${
              isDayMode
                ? "border-slate-200/80 bg-slate-200/80 shadow-[0_16px_46px_rgba(15,23,42,0.05)]"
                : "border-white/10 bg-white/10"
            }`}>
              {operatingHandles.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.code}
                    to={item.route}
                    className={`group grid grid-cols-[2.4rem_1fr_auto] items-center gap-3 px-4 py-3 transition ${
                      isDayMode
                        ? "bg-white/78 hover:bg-cyan-50"
                        : "bg-[#071113]/86 hover:bg-cyan-300/10"
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center ${palette.accentBg} text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.18)]`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-mono text-[10px] font-black uppercase tracking-[0.18em] ${palette.accent}`}>
                        {item.code}
                      </span>
                      <span className="mt-0.5 block text-[0.95rem] font-black leading-tight">
                        {item.title}
                      </span>
                    </span>
                    <ArrowRight className={`h-4 w-4 transition group-hover:translate-x-0.5 ${palette.textMuted}`} />
                  </Link>
                );
              })}
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
                  {t("about.ecosystem.brief.title_1", "三方协同")}
                  <br />
                  {t("about.ecosystem.brief.title_2", "闭环运转")}
                </p>
                <p className={`mt-3 max-w-lg text-base font-bold leading-7 2xl:mt-4 2xl:text-lg 2xl:leading-8 ${palette.textSoft}`}>
                  {t("about.ecosystem.brief.desc", "企业发布真实课题，学生在实战中产出成果，校企共同完成认定与推荐。")}
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
          className="relative flex h-[100svh] scroll-mt-0 flex-col overflow-hidden px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+5.25rem)] sm:px-6 sm:py-20 lg:h-[100svh] lg:snap-start lg:snap-always lg:pb-[clamp(1rem,3vh,2.5rem)] lg:pl-10 lg:pr-28 lg:pt-[calc(env(safe-area-inset-top)+clamp(4.5rem,8.2vh,5.125rem))] 2xl:pl-16 2xl:pr-36"
        >
          <div className={`pointer-events-none absolute -right-[4vw] top-8 select-none text-[18vw] font-black uppercase leading-[0.8] tracking-[-0.08em] ${palette.watermark}`}>
            RUN
          </div>
          <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[2140px] flex-1 flex-col justify-center">
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
              Core Engine
            </p>
            <h2 className="mt-3 max-w-5xl text-[1.9rem] font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[clamp(3.45rem,7vh,5.65rem)]">
              <span className="block sm:inline">{t("about.ecosystem.engine.title_1", "三位一体，")}</span>
              <span className="block sm:inline">{t("about.ecosystem.engine.title_2", "打通产学闭环。")}</span>
            </h2>
            <p className={`mt-3 max-w-3xl text-sm leading-6 sm:mt-4 sm:text-lg sm:leading-8 lg:text-[clamp(0.95rem,1.45vh,1.125rem)] lg:leading-7 ${palette.textSoft}`}>
              {t("about.ecosystem.engine.desc", "资源入口聚合机会，AI 社区承接共建，技术黑客松完成高密度验证。三者联动，才让 AI 热度变成可运营、可复制的人才培养机制。")}
            </p>

            <div className="-mx-4 mt-4 grid auto-cols-[86%] grid-flow-col gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:mt-5 sm:grid-flow-row sm:grid-cols-1 sm:overflow-visible sm:px-0 sm:pb-0 sm:[scrollbar-width:auto] lg:mt-[clamp(1rem,2.1vh,1.75rem)] lg:h-[clamp(17rem,32vh,24rem)] lg:min-h-0 lg:auto-cols-auto lg:auto-rows-fr lg:grid-cols-3 lg:gap-5 2xl:gap-7 [&::-webkit-scrollbar]:hidden sm:[&::-webkit-scrollbar]:block">
              {operatingHandles.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.code}
                    to={item.route}
                    className={`group relative h-[238px] snap-start overflow-hidden border border-l-4 p-4 transition duration-300 hover:-translate-y-1 sm:h-auto sm:min-h-[250px] sm:p-7 lg:flex lg:h-full lg:min-h-0 lg:p-[clamp(1rem,2.4vh,2rem)] ${palette.card} ${
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
                        <div className={`flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10 lg:h-[clamp(2.5rem,5vh,4rem)] lg:w-[clamp(2.5rem,5vh,4rem)] ${palette.accentBg} text-slate-950 shadow-[0_0_34px_rgba(103,232,249,0.24)]`}>
                          <Icon className="h-[1.125rem] w-[1.125rem] sm:h-5 sm:w-5 lg:h-[clamp(1.25rem,2.6vh,2rem)] lg:w-[clamp(1.25rem,2.6vh,2rem)]" />
                        </div>
                      </div>
                      <h3 className="mt-2 text-[1.35rem] font-black leading-none tracking-[-0.04em] sm:mt-8 sm:text-4xl lg:mt-[clamp(1rem,2.6vh,1.85rem)] lg:text-[clamp(1.9rem,3.8vh,2.85rem)]">
                        {item.title}
                      </h3>
                      <p className={`mt-3 line-clamp-3 text-xs leading-5 sm:mt-5 sm:text-sm sm:leading-7 lg:mt-[clamp(0.75rem,1.8vh,1.35rem)] lg:text-[clamp(0.88rem,1.3vh,1.02rem)] lg:leading-6 ${palette.textSoft}`}>
                        {item.description}
                      </p>
                      <div className={`mt-2 flex items-end justify-between border-t pt-2 sm:mt-6 sm:items-center sm:pt-5 lg:mt-auto lg:pt-[clamp(0.8rem,1.8vh,1.35rem)] ${palette.divider}`}>
                        <div>
                          <div className={`text-[9px] font-black uppercase tracking-[0.16em] sm:text-[11px] sm:tracking-[0.18em] ${palette.textMuted}`}>
                            Loop Role
                          </div>
                          <div className={`mt-1 text-base font-black sm:mt-1.5 sm:text-lg lg:mt-2 lg:text-[clamp(1.25rem,2.6vh,1.9rem)] ${palette.accent}`}>
                            {item.loop}
                          </div>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 text-xs font-black sm:gap-2 sm:text-sm ${palette.accent}`}>
                          {item.short}
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 border-t pt-3 sm:mt-10 sm:pt-7 lg:mt-[clamp(0.85rem,1.8vh,1.5rem)] lg:pt-[clamp(0.75rem,1.5vh,1.35rem)]">
              <div className={`hidden gap-px overflow-hidden border ${isDayMode ? "border-cyan-500/18 bg-cyan-500/18" : "border-cyan-300/18 bg-cyan-300/18"} lg:grid lg:grid-cols-[0.92fr_repeat(4,1fr)]`}>
                <div className={`px-6 py-[clamp(0.8rem,1.8vh,1.5rem)] 2xl:px-7 ${isDayMode ? "bg-white/70" : "bg-white/[0.035]"}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${palette.label}`}>Operating Loop</p>
                  <h3 className="mt-2 text-[clamp(1.2rem,2.4vh,1.9rem)] font-black leading-none tracking-[-0.04em]">
                    {t("about.ecosystem.engine.loop_title", "从真题到通道")}
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

              <div className={`mt-4 grid grid-cols-2 gap-px overflow-hidden border lg:hidden ${isDayMode ? "border-cyan-500/18 bg-cyan-500/18" : "border-cyan-300/18 bg-cyan-300/18"}`}>
                {loopItems.map((item) => (
                  <div
                    key={item.index}
                    className={`grid min-h-[78px] grid-cols-[2.3rem_1fr] items-center gap-x-2.5 p-3 ${
                      isDayMode ? "bg-white/88" : "bg-[#071113]/94"
                    }`}
                  >
                    <div className={`font-mono text-xs font-black ${palette.accent}`}>
                      {item.index}
                    </div>
                    <div>
                      <h3 className="text-base font-black">{item.title}</h3>
                      <p className={`mt-1 text-[11px] leading-4 ${palette.textMuted}`}>
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
          className={`relative flex h-[100svh] scroll-mt-0 flex-col overflow-hidden px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+5.25rem)] sm:px-6 sm:pb-20 sm:pt-20 lg:h-[100svh] lg:snap-start lg:snap-always lg:pb-[clamp(1rem,3vh,2.5rem)] lg:pl-10 lg:pr-28 lg:pt-[calc(env(safe-area-inset-top)+clamp(4.5rem,8.2vh,5.125rem))] 2xl:pl-16 2xl:pr-36 ${
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
          <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[2140px] flex-1 flex-col justify-center">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(360px,0.78fr)] lg:items-end lg:gap-10 2xl:gap-14">
              <div className="max-w-[820px]">
                <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
                  Support Galaxy
                </p>
                <h2 className="mt-3 max-w-[820px] text-[1.85rem] font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[clamp(3rem,5.6vh,4.55rem)]">
                  <span className="block">{t("about.ecosystem.support.title_1", "三方资源在场，")}</span>
                  <span className="block">{t("about.ecosystem.support.title_2", "产学融合有底气。")}</span>
                </h2>
              </div>
              <p className={`max-w-3xl text-xs leading-5 sm:text-lg sm:leading-8 lg:justify-self-end lg:pb-[clamp(0.25rem,1vh,0.9rem)] lg:text-[clamp(0.95rem,1.45vh,1.125rem)] lg:leading-7 ${palette.textSoft}`}>
                {t("about.ecosystem.support.desc", "学校提供场景与机制，学生组织承接人群与执行，企业伙伴带来真实课题、技术资源和人才通道。")}
              </p>
            </div>

            <div className="-mx-4 mt-4 grid auto-cols-[86%] grid-flow-col gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:grid-flow-row sm:grid-cols-1 sm:overflow-visible sm:px-0 sm:pb-0 sm:[scrollbar-width:auto] lg:mt-[clamp(1rem,2.2vh,2rem)] lg:h-[clamp(29rem,62vh,48rem)] lg:min-h-0 lg:auto-cols-auto lg:grid-cols-[0.78fr_1.22fr] lg:gap-5 2xl:gap-7 [&::-webkit-scrollbar]:hidden sm:[&::-webkit-scrollbar]:block">
              <div className={`relative h-[480px] snap-start overflow-hidden border p-4 sm:h-auto sm:min-h-[460px] sm:p-8 lg:h-full lg:min-h-0 lg:p-[clamp(1rem,2.35vh,1.9rem)] ${palette.panelStrong}`}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(103,232,249,0.18),transparent_34%),linear-gradient(135deg,rgba(103,232,249,0.08),transparent_42%)]" />
                <div className={`pointer-events-none absolute -right-16 bottom-4 text-[9rem] font-black uppercase leading-none tracking-[-0.08em] sm:text-[12rem] lg:text-[clamp(8rem,15vh,11rem)] ${palette.watermark}`}>
                  BASE
                </div>
                <div className={`pointer-events-none absolute left-0 top-0 h-full w-1 ${
                  isDayMode ? "bg-cyan-500" : "bg-cyan-300"
                }`} />
                <div className={`pointer-events-none absolute left-8 right-8 top-[45%] hidden h-px lg:block ${
                  isDayMode
                    ? "bg-gradient-to-r from-cyan-500/0 via-cyan-500/[0.2] to-cyan-500/0"
                    : "bg-gradient-to-r from-cyan-300/0 via-cyan-300/[0.2] to-cyan-300/0"
                }`} />
                <div className={`pointer-events-none absolute right-8 top-8 h-16 w-16 border-r border-t sm:right-10 sm:top-10 sm:h-20 sm:w-20 ${
                  isDayMode ? "border-cyan-500/20" : "border-cyan-300/[0.2]"
                }`} />
                <div className="relative z-10 flex h-full min-h-0 flex-col justify-between gap-4 sm:min-h-[396px] sm:gap-6 lg:min-h-0">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                        01 / Foundation
                      </div>
                      <div className={`hidden text-[10px] font-black uppercase tracking-[0.2em] sm:block ${palette.textMuted}`}>
                        Stable Base
                      </div>
                    </div>
                    <h3 className="mt-3 max-w-lg text-[2.15rem] font-black leading-[0.88] tracking-[-0.055em] sm:mt-6 sm:text-6xl lg:mt-[clamp(0.9rem,2vh,1.45rem)] lg:text-[clamp(2.8rem,5.2vh,4.15rem)]">
                      {t("about.ecosystem.support.school_title", "学校支持")}
                    </h3>
                    <p className={`mt-3 max-w-lg text-xs leading-5 sm:mt-5 sm:text-sm sm:leading-7 lg:mt-[clamp(0.75rem,1.75vh,1.25rem)] lg:text-[clamp(0.86rem,1.28vh,1rem)] lg:leading-6 ${palette.textSoft}`}>
                      {t("about.ecosystem.support.school_desc", "未来学习中心与校内创新平台把场景、空间和组织机制先搭好，让企业课题能稳定进入校园实践。")}
                    </p>
                  </div>

                  <div className={`relative overflow-hidden border ${
                    isDayMode
                      ? "border-cyan-500/[0.16] bg-white/[0.62]"
                      : "border-cyan-300/[0.12] bg-white/[0.035]"
                  }`}>
                    <div className={`flex items-center justify-between border-b px-3.5 py-2.5 sm:px-5 ${
                      isDayMode ? "border-cyan-500/[0.14]" : "border-cyan-300/[0.12]"
                    }`}>
                      <div className={`text-[9px] font-black uppercase tracking-[0.18em] sm:text-[10px] ${palette.textMuted}`}>
                        Mechanism Layer
                      </div>
                      <div className={`font-mono text-[10px] font-black ${palette.accent}`}>
                        A-C
                      </div>
                    </div>
                    <div className={`grid gap-px ${
                      isDayMode ? "bg-cyan-500/[0.14]" : "bg-cyan-300/[0.12]"
                    }`}>
                      {foundationPillars.map((pillar, pillarIndex) => (
                        <div
                          key={pillar.index}
                          className={`group grid min-h-[52px] grid-cols-[2.25rem_1fr] items-center gap-3 px-3.5 py-2.5 transition duration-300 sm:min-h-[68px] sm:grid-cols-[2.75rem_1fr] sm:px-5 lg:min-h-[clamp(3.05rem,6.4vh,4.7rem)] lg:px-5 lg:py-[clamp(0.55rem,1.2vh,0.95rem)] ${
                            isDayMode
                              ? "bg-white/[0.86] hover:bg-cyan-50/90"
                              : "bg-[#071113]/[0.9] hover:bg-cyan-300/[0.055]"
                          }`}
                        >
                          <div className={`relative flex h-8 w-8 items-center justify-center border font-mono text-[10px] font-black sm:h-10 sm:w-10 sm:text-xs ${
                            isDayMode
                              ? "border-cyan-500/25 bg-cyan-50 text-cyan-700"
                              : "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-200"
                          }`}>
                            {pillar.index}
                            {pillarIndex < foundationPillars.length - 1 ? (
                              <span className={`absolute left-1/2 top-full hidden h-6 w-px -translate-x-1/2 sm:block ${
                                isDayMode ? "bg-cyan-500/25" : "bg-cyan-300/22"
                              }`} />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-black leading-tight tracking-[-0.02em] sm:text-lg lg:text-[clamp(1rem,1.75vh,1.28rem)]">
                              {pillar.title}
                            </div>
                            <p className={`mt-1 text-[11px] font-bold leading-4 sm:text-xs lg:text-[clamp(0.72rem,1.05vh,0.86rem)] ${palette.textMuted}`}>
                              {pillar.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:gap-3 2xl:gap-4">
                    {schoolSupport.map((item, index) => (
                      <div
                        key={item}
                        className={`group relative min-h-[72px] overflow-hidden border px-3 py-3 transition duration-300 hover:-translate-y-0.5 sm:min-h-[92px] sm:px-5 sm:py-4 lg:min-h-[clamp(4.25rem,9vh,6.1rem)] lg:px-5 lg:py-[clamp(0.75rem,1.8vh,1.2rem)] ${
                          isDayMode
                            ? "border-slate-200/80 bg-white/[0.82] shadow-[0_14px_36px_rgba(15,23,42,0.07)] hover:border-cyan-500/28"
                            : "border-white/10 bg-white/[0.045] hover:border-cyan-300/28 hover:bg-cyan-300/[0.05]"
                        }`}
                      >
                        <div className={`pointer-events-none absolute inset-x-0 top-0 h-0.5 ${
                          isDayMode ? "bg-cyan-500/70" : "bg-cyan-300/70"
                        }`} />
                        <div className={`text-[8px] font-black uppercase tracking-[0.16em] sm:text-[10px] sm:tracking-[0.18em] ${palette.textMuted}`}>
                          {index === 0 ? "Anchor Unit" : "Research Unit"}
                        </div>
                        <div className="mt-2 min-w-0 break-words text-[0.95rem] font-black leading-tight tracking-[-0.035em] sm:text-2xl lg:mt-2.5 lg:text-[clamp(1.15rem,2.15vh,1.7rem)] 2xl:text-[clamp(1.28rem,2.3vh,1.95rem)]">
                          {item}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid h-[480px] snap-start gap-3 lg:h-full lg:min-h-0 lg:grid-rows-[0.95fr_1.05fr] lg:gap-5 2xl:gap-7">
                <div className={`relative min-h-0 overflow-hidden border p-4 sm:p-8 lg:flex lg:flex-col lg:justify-center lg:p-[clamp(1rem,2.3vh,1.95rem)] ${palette.card}`}>
                  <div className={`pointer-events-none absolute -right-10 -top-10 text-[8rem] font-black uppercase leading-none tracking-[-0.08em] ${palette.watermark}`}>
                    FORCE
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                        02 / Campus Force
                      </div>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.045em] sm:mt-3 sm:text-4xl lg:mt-[clamp(0.5rem,1.5vh,0.9rem)] lg:text-[clamp(1.9rem,4.2vh,3.2rem)]">
                        {t("about.ecosystem.support.student_title", "学生组织")}
                      </h3>
                    </div>
                    <div className={`text-sm font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                      Campus Force
                    </div>
                  </div>
                  <p className={`mt-2 max-w-2xl text-xs font-bold leading-5 sm:mt-3 sm:text-sm sm:leading-6 lg:mt-[clamp(0.6rem,1.8vh,1.5rem)] lg:text-[clamp(0.85rem,1.35vh,1.05rem)] lg:leading-6 ${palette.textMuted}`}>
                    {t("about.ecosystem.support.student_desc", "头部科创社团与核心负责人共同承接活动、项目和实践人群，让校园动能持续流动。")}
                  </p>
                  <div className="relative mt-3 grid grid-cols-5 gap-1.5 sm:mt-5 sm:gap-3 lg:mt-[clamp(0.85rem,1.7vh,1.35rem)] lg:gap-3 2xl:gap-4">
                    <div className={`pointer-events-none absolute left-3 right-3 top-1/2 hidden h-px -translate-y-1/2 sm:block ${
                      isDayMode
                        ? "bg-gradient-to-r from-cyan-500/0 via-cyan-500/[0.28] to-cyan-500/0"
                        : "bg-gradient-to-r from-cyan-300/0 via-cyan-300/[0.28] to-cyan-300/0"
                    }`} />
                    {studentOrganizations.map((item) => (
                      <span
                        key={item}
                        className={`relative flex min-h-[38px] items-center justify-center border px-2 py-2 text-sm font-black transition duration-300 hover:-translate-y-0.5 sm:min-h-[62px] sm:px-4 sm:py-3 sm:text-xl lg:min-h-[clamp(2.35rem,4.4vh,4.05rem)] lg:px-4 lg:py-3 lg:text-[clamp(1.05rem,2.1vh,1.75rem)] 2xl:px-5 2xl:py-4 2xl:text-[clamp(1.15rem,2.3vh,1.875rem)] ${
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

                <div className={`relative min-h-0 overflow-hidden border p-4 sm:p-8 lg:flex lg:flex-col lg:justify-center lg:p-[clamp(1rem,2.3vh,1.95rem)] ${palette.panelStrong}`}>
                  <div className={`pointer-events-none absolute -right-14 -bottom-10 text-[8rem] font-black uppercase leading-none tracking-[-0.08em] ${palette.watermark}`}>
                    TECH
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                        03 / Technical Backing
                      </div>
                      <h3 className="mt-2 text-2xl font-black tracking-[-0.045em] sm:mt-3 sm:text-4xl lg:mt-[clamp(0.5rem,1.5vh,0.9rem)] lg:text-[clamp(1.9rem,4.2vh,3.2rem)]">
                        {t("about.ecosystem.support.enterprise_title", "企业伙伴")}
                      </h3>
                    </div>
                    <div className={`text-sm font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                      Resource Layer
                    </div>
                  </div>

                  <p className={`mt-2 max-w-2xl text-xs font-bold leading-5 sm:mt-3 sm:text-sm sm:leading-6 lg:mt-[clamp(0.6rem,1.8vh,1.5rem)] lg:text-[clamp(0.85rem,1.35vh,1.05rem)] lg:leading-6 ${palette.textMuted}`}>
                    {t("about.ecosystem.support.enterprise_desc", "头部 AI 企业把真实课题、模型、云和工具带入校园，支撑项目从想法走向可运行成果。")}
                  </p>

                  <div className={`mt-3 grid grid-cols-3 gap-1.5 border-t pt-3 sm:mt-5 sm:gap-3 sm:pt-4 lg:mt-[clamp(0.85rem,1.8vh,1.5rem)] lg:grid-cols-6 lg:gap-2 lg:pt-[clamp(0.75rem,1.6vh,1.25rem)] xl:gap-3 ${
                    isDayMode ? "border-cyan-500/[0.14]" : "border-cyan-300/[0.12]"
                  }`}>
                    {enterpriseLogos.map((logo) => (
                      <div
                        key={logo.id || logo.src || logo.name}
                        className={`group flex min-h-[46px] items-center justify-center px-2 py-2 transition duration-300 hover:-translate-y-0.5 sm:min-h-[72px] sm:px-5 sm:py-4 lg:min-h-[clamp(3rem,5.3vh,4.35rem)] lg:px-2 lg:py-3 xl:px-3 ${
                          isDayMode
                            ? "bg-white/[0.72] shadow-[inset_0_0_0_1px_rgba(6,182,212,0.12),0_16px_36px_rgba(15,23,42,0.07)]"
                            : "bg-white/[0.035] shadow-[inset_0_0_0_1px_rgba(103,232,249,0.09),0_0_0_1px_rgba(103,232,249,0.015)] hover:bg-cyan-300/[0.055]"
                        }`}
                      >
                        {getPartnerLogoSrc(logo, isDayMode) ? (
                          <img
                            src={getPartnerLogoSrc(logo, isDayMode)}
                            alt={logo.alt}
                            className={`w-auto max-w-full object-contain transition duration-300 group-hover:scale-[1.04] ${
                              logo.size || "h-4 sm:h-7 lg:h-[clamp(1.35rem,2.7vh,1.9rem)]"
                            } ${!isDayMode ? logo.darkClassName || "" : ""}`}
                          />
                        ) : (
                          <span
                            className={`text-center text-xs font-black leading-tight sm:text-sm ${
                              isDayMode ? "text-slate-950" : "text-white"
                            }`}
                          >
                            {getPartnerDisplayName(logo)}
                          </span>
                        )}
                        {logo.text ? (
                          <span
                            className={`ml-1.5 whitespace-nowrap text-xs font-black leading-none tracking-tight sm:ml-2 sm:text-base lg:text-[clamp(0.8rem,1.15vw,1rem)] ${
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
