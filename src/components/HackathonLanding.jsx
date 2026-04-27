import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Zap, Cpu, Code2, Rocket, Users, Trophy, Brain, Sparkles, Calendar, MapPin, Clock, Mail } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";
import SEO from "./SEO";

const HackathonLanding = () => {
  const { settings, uiMode } = useSettings();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion;
  const isDayMode = uiMode === "day";

  const hackathonTitle = settings.hackathon_title || "AI 全栈极速黑客松";
  const hackathonSubtitle = settings.hackathon_subtitle || "5 小时极速开发 · 纯个人参赛 · AI 原生创作";
  const hackathonDate = settings.hackathon_date || "5 月 10 号 下午两点";
  const hackathonLocation = settings.hackathon_location || "浙江大学";
  const hackathonFormat = settings.hackathon_format || "个人赛";
  const hackathonDuration = settings.hackathon_duration || "5 小时";
  const hackathonDesc = settings.hackathon_desc || "AI 全栈极速黑客松是以 AI 原生开发为核心的技术赛事，聚焦 AI 工具辅助下的快速原型构建。参赛者需独立完成从创意到产品的全过程，展现 AI 时代的个人开发极限。";

  const teamTitle = settings.about_team_title || "浙大 AI 生态团队";
  const teamSubtitle = settings.about_team_subtitle || "连接校园 AI 资源、社群、赛事与实践场景的组织化入口。";
  const teamIntro1 = settings.about_team_intro_1 || "我们不是单一社团，也不是只做一场比赛的短期项目组，而是面向浙江大学校园长期运行的 AI 生态整合团队。";
  const teamIntro2 = settings.about_team_intro_2 || "社区与赛事，是我们推动生态落地的两条主线；真正的主体，是负责把资源、组织与持续运行串联起来的团队本身。";

  const supportUnits = settings.about_support_units || ["浙江大学学生创新创业学院", "浙江大学计算机学院", "浙江大学 AI 协会"];
  const supportUnitsDisplay = Array.isArray(supportUnits) ? supportUnits.filter(Boolean) : [];

  const pageClass = isDayMode
    ? "bg-[radial-gradient(circle_at_14%_8%,rgba(125,211,252,0.24),transparent_24%),radial-gradient(circle_at_84%_10%,rgba(129,140,248,0.2),transparent_22%),linear-gradient(180deg,#f7f9fc_0%,#eef4ff_46%,#f7f9fc_100%)] text-slate-950"
    : "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_22%),radial-gradient(circle_at_80%_14%,rgba(129,140,248,0.14),transparent_18%),linear-gradient(180deg,#030712_0%,#020617_42%,#02040c_100%)] text-white";

  const shellClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.7))] shadow-[0_34px_90px_rgba(148,163,184,0.16)] backdrop-blur-xl"
    : "border-white/10 bg-white/[0.045] shadow-[0_40px_120px_rgba(2,6,23,0.5)]";

  const labelClass = isDayMode ? "text-slate-500" : "text-white/45";
  const softTextClass = isDayMode ? "text-slate-500" : "text-white/50";
  const quietTextClass = isDayMode ? "text-slate-600" : "text-white/70";
  const chipClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,255,0.9))] text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.1)]"
    : "border-white/10 bg-white/[0.05] text-white/72";

  const heroSignals = ["AI Native", "Rapid Prototyping", "Individual Challenge", "5 Hours", "Creative Coding", "Future Tech"];

  const stats = [
    { value: "5h", label: "极限开发" },
    { value: "100%", label: "AI 辅助" },
    { value: "Solo", label: "个人参赛" },
  ];

  const features = [
    {
      icon: Brain,
      title: "AI 原生开发",
      desc: "运用主流 AI 编程工具，体验人机协作的开发新模式",
      color: isDayMode ? "text-indigo-600" : "text-cyan-400",
      bg: isDayMode ? "bg-indigo-50" : "bg-cyan-400/10",
    },
    {
      icon: Zap,
      title: "极速原型",
      desc: "5 小时内从创意到产品，挑战个人开发极限",
      color: isDayMode ? "text-amber-600" : "text-amber-400",
      bg: isDayMode ? "bg-amber-50" : "bg-amber-400/10",
    },
    {
      icon: Users,
      title: "纯个人赛",
      desc: "独立完成全流程，全面展现个人能力",
      color: isDayMode ? "text-emerald-600" : "text-emerald-400",
      bg: isDayMode ? "bg-emerald-50" : "bg-emerald-400/10",
    },
    {
      icon: Trophy,
      title: "实战竞技",
      desc: "与浙大优秀开发者同场竞技，切磋技艺",
      color: isDayMode ? "text-rose-600" : "text-rose-400",
      bg: isDayMode ? "bg-rose-50" : "bg-rose-400/10",
    },
  ];

  const sectionReveal = (shouldAnimate) => ({
    initial: { opacity: 0, y: 32 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  });

  return (
    <div className={`min-h-screen ${pageClass}`}>
      <SEO
        title="AI 全栈极速黑客松"
        description="浙江大学 AI 全栈极速黑客松 - 5 小时极速开发挑战，纯个人参赛，AI 原生创作"
      />

      {/* Hero Section - AI Hackathon Introduction */}
      <section className="relative overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-12 md:px-8 md:pb-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className={`absolute left-[-12%] top-[4%] h-[520px] w-[520px] rounded-full blur-[140px] ${
              isDayMode ? "bg-sky-300/24" : "bg-cyan-500/12"
            }`}
          />
          <div
            className={`absolute right-[-10%] top-[18%] h-[440px] w-[440px] rounded-full blur-[150px] ${
              isDayMode ? "bg-indigo-300/22" : "bg-indigo-500/12"
            }`}
          />
        </div>

        <div className="mx-auto flex min-h-0 max-w-7xl flex-col justify-center gap-6 sm:min-h-[calc(100svh-128px)] sm:gap-12 lg:gap-16">
          
          {/* AI Hackathon Poster */}
          <motion.div
            {...sectionReveal(shouldAnimate)}
            className={`relative overflow-hidden rounded-[32px] border md:rounded-[40px] ${shellClass}`}
          >
            <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(148,163,184,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.28)_1px,transparent_1px)] [background-size:48px_48px]" />
            <div
              className={`absolute inset-x-0 top-0 h-px ${
                isDayMode
                  ? "bg-gradient-to-r from-transparent via-indigo-300/70 to-transparent"
                  : "bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
              }`}
            />

            <div className="relative z-10 grid gap-7 px-4 py-5 sm:gap-10 sm:px-6 sm:py-8 md:px-10 md:py-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-14 lg:py-14">
              <div className="flex flex-col justify-between">
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.34em] ${chipClass}`}
                    >
                      Zhejiang University AI Hackathon
                    </div>
                    <div
                      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.34em] ${
                        isDayMode
                          ? "border-indigo-200/80 bg-indigo-500/[0.08] text-indigo-700"
                          : "border-cyan-300/18 bg-cyan-300/[0.08] text-cyan-100"
                      }`}
                    >
                      Experimental Showcase
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-7">
                    {heroSignals.map((signal) => (
                      <span
                        key={signal}
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.28em] ${
                          isDayMode
                            ? "border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(238,245,255,0.92))] text-slate-700 shadow-[0_12px_24px_rgba(148,163,184,0.12)]"
                            : "bg-white/[0.08] text-white/84"
                        }`}
                      >
                        {signal}
                      </span>
                    ))}
                  </div>

                  <div className="mt-7 max-w-3xl sm:mt-10">
                    <p
                      className={`mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] sm:mb-4 sm:text-[11px] sm:tracking-[0.38em] ${labelClass}`}
                    >
                      AI Full-Stack Hackathon
                    </p>
                    <h1
                      className={`max-w-[10ch] text-[3.35rem] font-bold leading-[0.88] tracking-[-0.04em] sm:text-6xl md:max-w-[8.6ch] md:text-[5.2rem] xl:text-[6.3rem] ${
                        isDayMode
                          ? "bg-[linear-gradient(135deg,#020617_0%,#1e293b_36%,#4f46e5_72%,#38bdf8_100%)] bg-clip-text text-transparent"
                          : "bg-[linear-gradient(135deg,#ffffff_0%,#e2e8f0_36%,#a5f3fc_72%,#67e8f9_100%)] bg-clip-text text-transparent"
                      }`}
                      style={{ fontFamily: "var(--theme-font-display)" }}
                    >
                      {hackathonTitle}
                    </h1>
                    <p
                      className={`mt-4 max-w-2xl text-[16px] leading-7 sm:mt-7 sm:text-[1.2rem] sm:leading-8 md:text-[1.55rem] ${quietTextClass}`}
                    >
                      {hackathonSubtitle}
                    </p>
                    <div
                      className={`relative mt-6 overflow-hidden rounded-[24px] border px-4 py-4 sm:mt-8 sm:rounded-[28px] sm:px-5 sm:py-5 ${
                        isDayMode
                          ? "border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(238,245,255,0.84))] shadow-[0_22px_48px_rgba(148,163,184,0.16)]"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-px ${
                          isDayMode
                            ? "bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent"
                            : "bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
                        }`}
                      />
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.34em] sm:text-[11px] ${labelClass}`}>
                        Competition Overview
                      </p>
                      <div
                        className={`mt-4 grid gap-4 text-[14px] leading-6.5 sm:text-base sm:leading-8 ${quietTextClass}`}
                      >
                        <p>{hackathonDesc}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-7 flex flex-col gap-4 border-t pt-5 sm:mt-10 sm:gap-5 sm:pt-7 ${
                    isDayMode ? "border-slate-200/80" : "border-white/10"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                    <Link
                      to="/hackathon/register"
                      className={`inline-flex items-center justify-center gap-2 rounded-full border border-indigo-300/20 bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] px-6 py-3 text-sm font-medium text-white shadow-[0_18px_34px_rgba(99,102,241,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(99,102,241,0.32)] active:translate-y-0 w-full sm:w-auto`}
                    >
                      立即报名
                      <Rocket className="h-4 w-4" />
                    </Link>
                  </div>

                  <div
                    className={`grid gap-2.5 text-[13px] leading-6 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:text-sm ${softTextClass}`}
                  >
                    <span className="w-full text-[10px] uppercase tracking-[0.24em] sm:w-auto sm:text-inherit sm:tracking-[0.28em]">
                      Competition Info
                    </span>
                    <span
                      className={`hidden h-px w-12 ${isDayMode ? "bg-slate-300/90" : "bg-white/12"} md:block`}
                    />
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {hackathonDate}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {hackathonLocation}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {hackathonFormat}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {hackathonDuration}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side - Visual Poster */}
              <div className={`relative flex min-h-[360px] flex-col justify-between overflow-hidden rounded-[28px] border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_30px_72px_rgba(148,163,184,0.18)] sm:min-h-[520px] sm:rounded-[32px] sm:p-6 md:p-8 ${
                isDayMode
                  ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(236,244,255,0.84))]"
                  : "border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              }`}>
                {isDayMode && (
                  <>
                    <div className="absolute left-[-12%] top-[-10%] h-44 w-44 rounded-full bg-sky-200/50 blur-3xl" />
                    <div className="absolute right-[-8%] top-[18%] h-52 w-52 rounded-full bg-indigo-200/55 blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(99,102,241,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.22)_1px,transparent_1px)] [background-size:34px_34px]" />
                  </>
                )}
                <div className="flex items-start justify-between sm:items-center">
                  <div className={`text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-[11px] sm:tracking-[0.34em] ${
                    isDayMode ? "text-slate-500" : "text-white/54"
                  }`}>
                    AI Development Challenge
                  </div>
                  <div className={`hidden text-[11px] uppercase tracking-[0.28em] sm:block ${
                    isDayMode ? "text-slate-400" : "text-white/30"
                  }`}>
                    01 / Competition
                  </div>
                </div>

                <div className="relative flex flex-1 items-center justify-center py-4 sm:py-10">
                  <div className={`absolute inset-x-5 top-1/2 h-px -translate-y-1/2 sm:inset-x-10 ${
                    isDayMode
                      ? "bg-gradient-to-r from-transparent via-indigo-200/90 to-transparent"
                      : "bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  }`} />
                  <div className={`absolute inset-y-5 left-1/2 w-px -translate-x-1/2 sm:inset-y-10 ${
                    isDayMode
                      ? "bg-gradient-to-b from-transparent via-indigo-200/90 to-transparent"
                      : "bg-gradient-to-b from-transparent via-white/10 to-transparent"
                  }`} />
                  <div className={`absolute left-[10%] top-[18%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${
                    isDayMode ? "text-slate-400" : "text-white/38"
                  }`}>
                    AI Tools
                  </div>
                  <div className={`absolute right-[12%] top-[20%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${
                    isDayMode ? "text-slate-400" : "text-white/38"
                  }`}>
                    Prototyping
                  </div>
                  <div className={`absolute left-[12%] bottom-[19%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${
                    isDayMode ? "text-indigo-500/72" : "text-cyan-200/60"
                  }`}>
                    Innovation
                  </div>
                  <div className={`absolute right-[12%] bottom-[17%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${
                    isDayMode ? "text-indigo-500/72" : "text-cyan-200/60"
                  }`}>
                    Creativity
                  </div>

                  {heroSignals.map((signal, index) => {
                    const positions = [
                      "left-[8%] top-[12%]",
                      "right-[10%] top-[14%]",
                      "left-[6%] bottom-[16%]",
                      "right-[8%] bottom-[18%]",
                      "left-[4%] top-[50%]",
                      "right-[6%] top-[40%]",
                    ];
                    return (
                      <div
                        key={signal}
                        className={`absolute hidden rounded-[18px] border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:flex ${positions[index] || "left-[10%] top-[20%]"} ${
                          isDayMode
                            ? "border-slate-200/90 bg-white/92 text-slate-700"
                            : "border-white/10 bg-slate-950/70 text-white/82"
                        }`}
                      >
                        {signal}
                      </div>
                    );
                  })}

                  <div className={`relative flex h-[196px] w-[196px] items-center justify-center overflow-hidden rounded-full border backdrop-blur-2xl sm:h-[250px] sm:w-[250px] ${
                    isDayMode
                      ? "border-indigo-100/90 bg-[radial-gradient(circle,rgba(255,255,255,0.98),rgba(232,240,255,0.84)_64%,rgba(226,232,240,0.4)_100%)] shadow-[0_24px_60px_rgba(99,102,241,0.16)]"
                      : "border-white/10 bg-white/[0.05]"
                  }`}>
                    <div className={`absolute h-[214px] w-[214px] rounded-full border sm:h-[340px] sm:w-[340px] ${
                      isDayMode ? "border-indigo-100/80" : "border-white/8"
                    }`} />
                    <div className={`absolute h-[246px] w-[246px] rounded-full border sm:h-[420px] sm:w-[420px] ${
                      isDayMode ? "border-sky-200/80" : "border-cyan-200/10"
                    }`} />
                    <div className={`absolute h-[138px] w-[138px] rounded-full sm:h-[210px] sm:w-[210px] ${
                      isDayMode
                        ? "bg-[radial-gradient(circle,rgba(129,140,248,0.18),rgba(191,219,254,0.16)_50%,transparent_72%)]"
                        : "bg-[radial-gradient(circle,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_58%,transparent_74%)]"
                    }`} />
                    <div className="relative z-10 flex flex-col items-center">
                      <Sparkles className={`h-16 w-16 sm:h-24 sm:w-24 ${
                        isDayMode ? "text-indigo-500" : "text-cyan-400"
                      }`} />
                      <div
                        className={`mt-3 max-w-[7rem] px-2 text-center text-[8px] font-medium uppercase leading-3 tracking-[0.14em] [text-wrap:balance] sm:mt-5 sm:max-w-none sm:px-0 sm:text-[11px] sm:leading-normal sm:tracking-[0.34em] ${
                          isDayMode ? "text-slate-500" : "text-white/78"
                        }`}
                      >
                        AI Native Development
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`grid grid-cols-3 gap-2 border-t pt-4 sm:gap-5 sm:pt-6 ${
                  isDayMode ? "border-slate-200/80" : "border-white/10"
                }`}>
                  {stats.map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-[20px] border px-3 py-3 sm:px-4 sm:py-4 ${
                        isDayMode
                          ? "border-slate-200/80 bg-white/84 shadow-[0_16px_32px_rgba(148,163,184,0.12)]"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <div className={`text-xl font-semibold tracking-tight sm:text-3xl md:text-[2.2rem] ${
                        isDayMode ? "text-slate-900" : "text-white"
                      }`}>
                        {item.value}
                      </div>
                      <p className={`mt-1 text-[11px] leading-5 sm:mt-2 sm:text-sm sm:leading-6 ${
                        isDayMode ? "text-slate-500" : "text-white/52"
                      }`}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            {...sectionReveal(shouldAnimate)}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 ${
                  isDayMode
                    ? "border-slate-200/80 bg-white/80 hover:bg-white/90"
                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
                }`}
              >
                <div className={`inline-flex rounded-xl p-3 ${feature.bg}`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className={`mt-4 text-base font-semibold ${
                  isDayMode ? "text-slate-900" : "text-white"
                }`}>
                  {feature.title}
                </h3>
                <p className={`mt-2 text-sm leading-6 ${softTextClass}`}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Team Section - Full Reuse from About Page */}
          <motion.div
            {...sectionReveal(shouldAnimate)}
            className={`relative overflow-hidden rounded-[32px] border md:rounded-[40px] ${shellClass}`}
          >
            <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(148,163,184,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.28)_1px,transparent_1px)] [background-size:48px_48px]" />
            <div
              className={`absolute inset-x-0 top-0 h-px ${
                isDayMode
                  ? "bg-gradient-to-r from-transparent via-indigo-300/70 to-transparent"
                  : "bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
              }`}
            />

            <div className="relative z-10 grid gap-7 px-4 py-5 sm:gap-10 sm:px-6 sm:py-8 md:px-10 md:py-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-14 lg:py-14">
              <div className="flex flex-col justify-between">
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.34em] ${chipClass}`}
                    >
                      Zhejiang University AI Ecosystem
                    </div>
                    <div
                      className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.34em] ${
                        isDayMode
                          ? "border-indigo-200/80 bg-indigo-500/[0.08] text-indigo-700"
                          : "border-cyan-300/18 bg-cyan-300/[0.08] text-cyan-100"
                      }`}
                    >
                      Event Organizer
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2.5 sm:mt-7">
                    {["AI Community", "Hackathon", "Innovation", "Education", "Network", "Resources"].map((signal) => (
                      <span
                        key={signal}
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.28em] ${
                          isDayMode
                            ? "border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(238,245,255,0.92))] text-slate-700 shadow-[0_12px_24px_rgba(148,163,184,0.12)]"
                            : "bg-white/[0.08] text-white/84"
                        }`}
                      >
                        {signal}
                      </span>
                    ))}
                  </div>

                  <div className="mt-7 max-w-3xl sm:mt-10">
                    <p
                      className={`mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] sm:mb-4 sm:text-[11px] sm:tracking-[0.38em] ${labelClass}`}
                    >
                      About The Team
                    </p>
                    <h1
                      className={`max-w-[10ch] text-[3.35rem] font-bold leading-[0.88] tracking-[-0.04em] sm:text-6xl md:max-w-[8.6ch] md:text-[5.2rem] xl:text-[6.3rem] ${
                        isDayMode
                          ? "bg-[linear-gradient(135deg,#020617_0%,#1e293b_36%,#4f46e5_72%,#38bdf8_100%)] bg-clip-text text-transparent"
                          : "bg-[linear-gradient(135deg,#ffffff_0%,#e2e8f0_36%,#a5f3fc_72%,#67e8f9_100%)] bg-clip-text text-transparent"
                      }`}
                      style={{ fontFamily: "var(--theme-font-display)" }}
                    >
                      {teamTitle}
                    </h1>
                    <p
                      className={`mt-4 max-w-2xl text-[16px] leading-7 sm:mt-7 sm:text-[1.2rem] sm:leading-8 md:text-[1.55rem] ${quietTextClass}`}
                    >
                      {teamSubtitle}
                    </p>
                    <div
                      className={`relative mt-6 overflow-hidden rounded-[24px] border px-4 py-4 sm:mt-8 sm:rounded-[28px] sm:px-5 sm:py-5 ${
                        isDayMode
                          ? "border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(238,245,255,0.84))] shadow-[0_22px_48px_rgba(148,163,184,0.16)]"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-px ${
                          isDayMode
                            ? "bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent"
                            : "bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
                        }`}
                      />
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.34em] sm:text-[11px] ${labelClass}`}>
                        Brand System Narrative
                      </p>
                      <div
                        className={`mt-4 grid gap-4 text-[14px] leading-6.5 sm:text-base sm:leading-8 ${quietTextClass}`}
                      >
                        <p>{teamIntro1}</p>
                        <p>{teamIntro2}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-7 flex flex-col gap-4 border-t pt-5 sm:mt-10 sm:gap-5 sm:pt-7 ${
                    isDayMode ? "border-slate-200/80" : "border-white/10"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                    <Link
                      to="/events"
                      className={`inline-flex items-center justify-center gap-2 rounded-full border border-indigo-300/20 bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] px-6 py-3 text-sm font-medium text-white shadow-[0_18px_34px_rgba(99,102,241,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(99,102,241,0.32)] active:translate-y-0 w-full sm:w-auto`}
                    >
                      查看赛事项目
                      <Rocket className="h-4 w-4" />
                    </Link>
                    <a
                      href={`mailto:${settings.about_contact_email || "contact@zju.edu.cn"}`}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-colors duration-300 sm:w-auto ${
                        isDayMode
                          ? "border-slate-200/90 bg-white/58 text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.1)] hover:border-indigo-200/90 hover:bg-white hover:text-indigo-600 active:bg-slate-50"
                          : "border-white/12 text-white/82 hover:border-white/24 hover:bg-white/[0.06] active:bg-white/[0.08]"
                      }`}
                    >
                      联系合作
                      <Mail className="h-4 w-4" />
                    </a>
                  </div>

                  <div
                    className={`grid gap-2.5 text-[13px] leading-6 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:text-sm ${softTextClass}`}
                  >
                    <span className="w-full text-[10px] uppercase tracking-[0.24em] sm:w-auto sm:text-inherit sm:tracking-[0.28em]">
                      Supported By
                    </span>
                    <span
                      className={`hidden h-px w-12 ${isDayMode ? "bg-slate-300/90" : "bg-white/12"} md:block`}
                    />
                    {supportUnitsDisplay.map((unit, idx) => (
                      <React.Fragment key={unit}>
                        {idx > 0 && <span className="hidden sm:inline">·</span>}
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 ${
                            isDayMode
                              ? "border-slate-200/80 bg-white/72 text-slate-600 shadow-[0_8px_18px_rgba(148,163,184,0.08)]"
                              : "border-white/10 bg-white/[0.05] text-white/70"
                          } sm:border-transparent sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none`}
                        >
                          {unit}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side - Team Poster */}
              <div className={`relative flex min-h-[360px] flex-col justify-between overflow-hidden rounded-[28px] border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_30px_72px_rgba(148,163,184,0.18)] sm:min-h-[520px] sm:rounded-[32px] sm:p-6 md:p-8 ${
                isDayMode
                  ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(236,244,255,0.84))]"
                  : "border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.96))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              }`}>
                {isDayMode && (
                  <>
                    <div className="absolute left-[-12%] top-[-10%] h-44 w-44 rounded-full bg-sky-200/50 blur-3xl" />
                    <div className="absolute right-[-8%] top-[18%] h-52 w-52 rounded-full bg-indigo-200/55 blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(99,102,241,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.22)_1px,transparent_1px)] [background-size:34px_34px]" />
                  </>
                )}
                <div className="flex items-start justify-between sm:items-center">
                  <div className={`text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-[11px] sm:tracking-[0.34em] ${
                    isDayMode ? "text-slate-500" : "text-white/54"
                  }`}>
                    Campus AI Control Room
                  </div>
                  <div className={`hidden text-[11px] uppercase tracking-[0.28em] sm:block ${
                    isDayMode ? "text-slate-400" : "text-white/30"
                  }`}>
                    01 / Exhibition
                  </div>
                </div>

                <div className="relative flex flex-1 items-center justify-center py-4 sm:py-10">
                  <div className={`absolute inset-x-5 top-1/2 h-px -translate-y-1/2 sm:inset-x-10 ${
                    isDayMode
                      ? "bg-gradient-to-r from-transparent via-indigo-200/90 to-transparent"
                      : "bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  }`} />
                  <div className={`absolute inset-y-5 left-1/2 w-px -translate-x-1/2 sm:inset-y-10 ${
                    isDayMode
                      ? "bg-gradient-to-b from-transparent via-indigo-200/90 to-transparent"
                      : "bg-gradient-to-b from-transparent via-white/10 to-transparent"
                  }`} />
                  <div className={`absolute left-[10%] top-[18%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${
                    isDayMode ? "text-slate-400" : "text-white/38"
                  }`}>
                    Community
                  </div>
                  <div className={`absolute right-[12%] top-[20%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${
                    isDayMode ? "text-slate-400" : "text-white/38"
                  }`}>
                    Hackathon
                  </div>
                  <div className={`absolute left-[12%] bottom-[19%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${
                    isDayMode ? "text-indigo-500/72" : "text-cyan-200/60"
                  }`}>
                    Knowledge
                  </div>
                  <div className={`absolute right-[12%] bottom-[17%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${
                    isDayMode ? "text-indigo-500/72" : "text-cyan-200/60"
                  }`}>
                    Network
                  </div>

                  {["AI", "Community", "Hackathon", "Innovation", "Education", "Network"].map((signal, index) => {
                    const positions = [
                      "left-[8%] top-[12%]",
                      "right-[10%] top-[14%]",
                      "left-[6%] bottom-[16%]",
                      "right-[8%] bottom-[18%]",
                      "left-[4%] top-[50%]",
                      "right-[6%] top-[40%]",
                    ];
                    return (
                      <div
                        key={signal}
                        className={`absolute hidden rounded-[18px] border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:flex ${positions[index] || "left-[10%] top-[20%]"} ${
                          isDayMode
                            ? "border-slate-200/90 bg-white/92 text-slate-700"
                            : "border-white/10 bg-slate-950/70 text-white/82"
                        }`}
                      >
                        {signal}
                      </div>
                    );
                  })}

                  <div className={`relative flex h-[196px] w-[196px] items-center justify-center overflow-hidden rounded-full border backdrop-blur-2xl sm:h-[250px] sm:w-[250px] ${
                    isDayMode
                      ? "border-indigo-100/90 bg-[radial-gradient(circle,rgba(255,255,255,0.98),rgba(232,240,255,0.84)_64%,rgba(226,232,240,0.4)_100%)] shadow-[0_24px_60px_rgba(99,102,241,0.16)]"
                      : "border-white/10 bg-white/[0.05]"
                  }`}>
                    <div className={`absolute h-[214px] w-[214px] rounded-full border sm:h-[340px] sm:w-[340px] ${
                      isDayMode ? "border-indigo-100/80" : "border-white/8"
                    }`} />
                    <div className={`absolute h-[246px] w-[246px] rounded-full border sm:h-[420px] sm:w-[420px] ${
                      isDayMode ? "border-sky-200/80" : "border-cyan-200/10"
                    }`} />
                    <div className={`absolute h-[138px] w-[138px] rounded-full sm:h-[210px] sm:w-[210px] ${
                      isDayMode
                        ? "bg-[radial-gradient(circle,rgba(129,140,248,0.18),rgba(191,219,254,0.16)_50%,transparent_72%)]"
                        : "bg-[radial-gradient(circle,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_58%,transparent_74%)]"
                    }`} />
                    <div className="relative z-10 flex flex-col items-center">
                      <img
                        src="/newlogo.png"
                        alt="浙大 AI 生态团队标识"
                        className="h-20 w-auto object-contain sm:h-28 md:h-36"
                        style={
                          isDayMode
                            ? { filter: "brightness(0) saturate(100%) invert(27%) sepia(34%) saturate(1263%) hue-rotate(216deg) brightness(99%) contrast(93%)" }
                            : undefined
                        }
                      />
                      <div
                        className={`mt-3 max-w-[7rem] px-2 text-center text-[8px] font-medium uppercase leading-3 tracking-[0.14em] [text-wrap:balance] sm:mt-5 sm:max-w-none sm:px-0 sm:text-[11px] sm:leading-normal sm:tracking-[0.34em] ${
                          isDayMode ? "text-slate-500" : "text-white/78"
                        }`}
                      >
                        Organized Campus AI Network
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`grid grid-cols-3 gap-2 border-t pt-4 sm:gap-5 sm:pt-6 ${
                  isDayMode ? "border-slate-200/80" : "border-white/10"
                }`}>
                  {stats.map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-[20px] border px-3 py-3 sm:px-4 sm:py-4 ${
                        isDayMode
                          ? "border-slate-200/80 bg-white/84 shadow-[0_16px_32px_rgba(148,163,184,0.12)]"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <div className={`text-xl font-semibold tracking-tight sm:text-3xl md:text-[2.2rem] ${
                        isDayMode ? "text-slate-900" : "text-white"
                      }`}>
                        {item.value}
                      </div>
                      <p className={`mt-1 text-[11px] leading-5 sm:mt-2 sm:text-sm sm:leading-6 ${
                        isDayMode ? "text-slate-500" : "text-white/52"
                      }`}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
};

export default HackathonLanding;
