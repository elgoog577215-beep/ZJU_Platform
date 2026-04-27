import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Clock,
  Code2,
  Cpu,
  MapPin,
  Rocket,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
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
  const hackathonDesc = settings.hackathon_desc || "AI 全栈极速黑客松是以 AI 原生开发为核心的技术赛事，参赛者需在 5 小时内独立完成一个完整的 AI 应用项目。比赛强调快速原型开发、AI 工具运用与创新思维。";

  const teamTitle = settings.about_team_title || "浙大 AI 生态团队";
  const teamSubtitle = settings.about_team_subtitle || "连接校园 AI 资源、社群、赛事与实践场景的组织化入口。";
  const teamIntro1 = settings.about_team_intro_1 || "我们不是单一社团，也不是只做一场比赛的短期项目组，而是面向浙江大学校园长期运行的 AI 生态整合团队。";
  const teamIntro2 = settings.about_team_intro_2 || "社区与赛事，是我们推动生态落地的两条主线；真正的主体，是负责把资源、组织与持续运行串联起来的团队本身。";

  const supportUnitsRaw = settings.about_support_units || "未来学习中心，ZJUAI,XLab";
  const supportUnits = supportUnitsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  const pageClass = isDayMode
    ? "bg-[radial-gradient(circle_at_14%_8%,rgba(125,211,252,0.24),transparent_24%),radial-gradient(circle_at_84%_10%,rgba(129,140,248,0.2),transparent_22%),linear-gradient(180deg,#f7f9fc_0%,#eef4ff_46%,#f7f9fc_100%)] text-slate-950"
    : "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_22%),radial-gradient(circle_at_80%_14%,rgba(129,140,248,0.14),transparent_18%),linear-gradient(180deg,#030712_0%,#020617_42%,#02040c_100%)] text-white";

  const shellClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.7))] shadow-[0_34px_90px_rgba(148,163,184,0.16)] backdrop-blur-xl"
    : "border-white/10 bg-white/[0.045] shadow-[0_40px_120px_rgba(2,6,23,0.5)]";

  const quietTextClass = isDayMode ? "text-slate-600" : "text-white/70";
  const softTextClass = isDayMode ? "text-slate-500" : "text-white/50";
  const labelClass = isDayMode ? "text-slate-500" : "text-white/45";
  const chipClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,255,0.9))] text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.1)]"
    : "border-white/10 bg-white/[0.05] text-white/72";

  const primaryButtonClass = isDayMode
    ? "inline-flex items-center justify-center gap-2 rounded-full border border-indigo-300/20 bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] px-6 py-3 text-sm font-medium text-white shadow-[0_18px_34px_rgba(99,102,241,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(99,102,241,0.32)] active:translate-y-0"
    : "inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0";

  return (
    <div className={`min-h-screen ${pageClass}`}>
      <SEO
        title="AI 全栈极速黑客松"
        description="AI 全栈极速黑客松 - 5 小时极速开发，纯个人参赛，AI 原生创作。由浙大 AI 生态团队主办。"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+48px)] pb-8 md:px-8 md:pb-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute left-[-12%] top-[4%] h-[520px] w-[520px] rounded-full blur-[140px] ${isDayMode ? "bg-sky-300/24" : "bg-cyan-500/12"}`} />
          <div className={`absolute right-[-10%] top-[18%] h-[440px] w-[440px] rounded-full blur-[150px] ${isDayMode ? "bg-indigo-300/22" : "bg-indigo-500/12"}`} />
        </div>

        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className={`relative overflow-hidden rounded-[24px] border ${shellClass}`}
          >
            <div className="relative z-10 px-4 py-8 sm:px-8 sm:py-10 md:px-12">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className={`h-4 w-4 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                <span className={`text-xs font-medium ${softTextClass}`}>2026 赛事报名</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                {hackathonTitle}
              </h1>
              <p className={`mt-3 text-base sm:text-lg ${softTextClass} max-w-2xl`}>
                {hackathonSubtitle}
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Link to="/hackathon/register" className={primaryButtonClass}>
                  立即报名
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Hackathon Info & Team Intro Grid */}
      <section className="px-4 pb-12 md:px-8 md:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Hackathon Info */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {/* Hackathon Details */}
              <div className={`rounded-[24px] border p-5 ${shellClass}`}>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Zap className={`h-5 w-5 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                  比赛信息
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl border p-3 ${chipClass}`}>
                    <Calendar className={`h-5 w-5 mb-2 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                    <p className={`text-xs ${labelClass}`}>比赛时间</p>
                    <p className="mt-0.5 font-semibold text-sm">{hackathonDate}</p>
                  </div>
                  <div className={`rounded-xl border p-3 ${chipClass}`}>
                    <MapPin className={`h-5 w-5 mb-2 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                    <p className={`text-xs ${labelClass}`}>比赛地点</p>
                    <p className="mt-0.5 font-semibold text-sm">{hackathonLocation}</p>
                  </div>
                  <div className={`rounded-xl border p-3 ${chipClass}`}>
                    <Users className={`h-5 w-5 mb-2 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                    <p className={`text-xs ${labelClass}`}>比赛形式</p>
                    <p className="mt-0.5 font-semibold text-sm">{hackathonFormat}</p>
                  </div>
                  <div className={`rounded-xl border p-3 ${chipClass}`}>
                    <Clock className={`h-5 w-5 mb-2 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                    <p className={`text-xs ${labelClass}`}>比赛时长</p>
                    <p className="mt-0.5 font-semibold text-sm">{hackathonDuration}</p>
                  </div>
                </div>
                <p className={`mt-4 text-sm ${quietTextClass}`}>{hackathonDesc}</p>
              </div>

              {/* Core Challenges */}
              <div className={`rounded-[24px] border p-5 ${shellClass}`}>
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Cpu className={`h-5 w-5 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                  核心挑战
                </h2>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <Code2 className={`h-5 w-5 mt-0.5 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                    <div>
                      <p className="font-medium text-sm">AI 原生开发</p>
                      <p className={`text-xs ${softTextClass}`}>运用 AI 工具进行全栈开发</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Rocket className={`h-5 w-5 mt-0.5 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                    <div>
                      <p className="font-medium text-sm">极速原型</p>
                      <p className={`text-xs ${softTextClass}`}>5 小时完成从 0 到 1 的突破</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Trophy className={`h-5 w-5 mt-0.5 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                    <div>
                      <p className="font-medium text-sm">纯个人参赛</p>
                      <p className={`text-xs ${softTextClass}`}>独立完成全流程开发</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - AI Ecosystem Team */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {/* Team Introduction */}
              <div className={`rounded-[24px] border p-5 ${shellClass}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.28em] ${isDayMode ? "border-indigo-200/80 bg-indigo-500/[0.08] text-indigo-700" : "border-cyan-300/18 bg-cyan-300/[0.08] text-cyan-100"}`}>
                    Organizer
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-3">
                  {teamTitle}
                </h2>
                <p className={`text-sm mb-4 ${quietTextClass}`}>
                  {teamSubtitle}
                </p>
                <div className={`relative overflow-hidden rounded-xl border p-4 ${isDayMode ? "border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(238,245,255,0.84))]" : "border-white/10 bg-white/[0.04]"}`}>
                  <div className={`absolute inset-x-0 top-0 h-px ${isDayMode ? "bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" : "bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"}`} />
                  <p className="text-sm leading-6 mb-3">{teamIntro1}</p>
                  <p className="text-sm leading-6">{teamIntro2}</p>
                </div>
              </div>

              {/* Support Units */}
              <div className={`rounded-[24px] border p-5 ${shellClass}`}>
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Trophy className={`h-5 w-5 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                  支持单位
                </h2>
                <div className="flex flex-wrap gap-2">
                  {supportUnits.map((unit, index) => (
                    <div key={index} className={`rounded-lg border px-4 py-2 text-sm font-medium ${chipClass}`}>
                      {unit}
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Card */}
              <div className={`rounded-[24px] border p-5 ${shellClass}`}>
                <h3 className="text-lg font-bold mb-2">准备好接受挑战了吗？</h3>
                <p className={`text-sm mb-4 ${softTextClass}`}>
                  立即报名参与 AI 全栈极速黑客松，展示你的 AI 开发实力！
                </p>
                <Link to="/hackathon/register" className={primaryButtonClass}>
                  开始报名
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HackathonLanding;
