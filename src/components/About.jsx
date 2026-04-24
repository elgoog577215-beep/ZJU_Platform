import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Mail,
  MapPin,
  Network,
  Trophy,
  Waypoints,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";
import api from "../services/api";
import SEO from "./SEO";

const sectionReveal = (enabled, delay = 0) => {
  if (!enabled) return {};

  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] },
    viewport: { once: true, margin: "-100px" },
  };
};

const About = () => {
  const { settings, uiMode } = useSettings();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion;
  const isDayMode = uiMode === "day";

  const [messageForm, setMessageForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const contactEmail = settings.contact_email || "service@tuotuzju.com";
  const contactAddress =
    settings.contact_address || "浙江大学未来学习中心 / 浙大 AI 生态团队";

  const teamTitle = settings.about_team_title || "浙大 AI 生态团队";
  const teamSubtitle = settings.about_team_subtitle || "连接校园 AI 资源、社群、赛事与实践场景的组织化入口。";
  const teamIntro1 = settings.about_team_intro_1 || "我们不是单一社团，也不是只做一场比赛的短期项目组，而是面向浙江大学校园长期运行的 AI 生态整合团队。";
  const teamIntro2 = settings.about_team_intro_2 || "社区与赛事，是我们推动生态落地的两条主线；真正的主体，是负责把资源、组织与持续运行串联起来的团队本身。";

  const supportUnitsRaw = settings.about_support_units || "未来学习中心,ZJUAI,XLab";
  const supportUnitsDisplay = supportUnitsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  const stats = [
    { value: settings.about_stat_1_value || "1000+", label: settings.about_stat_1_label || "活动平台现有用户基础" },
    { value: settings.about_stat_2_value || "3 层", label: settings.about_stat_2_label || "社区递进式连接结构" },
    { value: settings.about_stat_3_value || "5 小时", label: settings.about_stat_3_label || "黑客松核心标识" },
  ];

  const parseBullets = (raw, defaults) => {
    if (raw && raw.trim()) {
      return raw.split("\n").map((s) => s.trim()).filter(Boolean);
    }
    return defaults;
  };

  const initiativeItems = [
    {
      index: "01",
      icon: Waypoints,
      title: settings.about_community_title || "AI 社区",
      tagline: settings.about_community_tagline || "日常运行层",
      description: settings.about_community_desc || "持续搭建公开学习入口、私域社群连接与线下 Meetup，让校园内的 AI 学习、交流与协作形成稳定的日常机制。",
      bullets: parseBullets(settings.about_community_bullets, [
        "公开内容与知识入口",
        "社群连接与私域沉淀",
        "线下 Meetup 与人群链接",
      ]),
    },
    {
      index: "02",
      icon: Trophy,
      title: settings.about_hackathon_title || "AI 全栈极速黑客松",
      tagline: settings.about_hackathon_tagline || "标杆项目层",
      description: settings.about_hackathon_desc || "以 5 小时、纯个人、零路演、AI 原生开发为识别点，作为生态团队对外最具辨识度的技术品牌项目。",
      bullets: parseBullets(settings.about_hackathon_bullets, ["5 小时极速开发", "纯个人参赛机制", "零路演与 AI 原生开发"]),
    },
  ];

  const flagshipTitle = settings.about_flagship_title || "社区与比赛，是我们推动生态落地的两条主线";
  const flagshipNote = settings.about_flagship_note || "这两部分不是与团队并列的身份，而是生态团队对内持续运营、对外形成影响力的代表性产品与活动。";

  const supportTitle = settings.about_support_title || "让生态持续运行的支持网络";
  const supportDesc = settings.about_support_desc || "我们以组织协同而不是单点活动的方式推进校园 AI 生态，把支持单位、学生组织、技术社群与项目实践连接成一张稳定运转的网络。";
  const supportPositioning = settings.about_support_positioning || "统一校园 AI 资源、信息与协作入口";
  const supportMethod = settings.about_support_method || "以社区、赛事与连接机制带动生态落地";
  const supportResult = settings.about_support_result || "形成可被持续运营与持续扩展的校园网络";

  const finalTitle = settings.about_final_title || "我们在建设的，是一张校园 AI 的连接网络";
  const finalDesc = settings.about_final_desc || "如果你关注 AI 学习、校园社群、技术赛事、项目合作或跨组织联动，这里就是浙大 AI 生态团队的官方介绍入口。";
  const finalNote = settings.about_final_note || "以组织协同、社区运营与标杆赛事，持续推动校园 AI 生态扩展。";

  const handleMessageFieldChange = (field) => (event) => {
    const value = event.target.value;
    setMessageForm((prev) => ({ ...prev, [field]: value }));
    
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!messageForm.name.trim()) {
      errors.name = "请输入你的名字";
    } else if (messageForm.name.trim().length > 100) {
      errors.name = "名字不能超过 100 个字符";
    }

    if (!messageForm.email.trim()) {
      errors.email = "请输入你的邮箱";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(messageForm.email.trim())) {
      errors.email = "请输入有效的邮箱地址";
    } else if (messageForm.email.trim().length > 255) {
      errors.email = "邮箱地址不能超过 255 个字符";
    }

    if (!messageForm.message.trim()) {
      errors.message = "请输入留言内容";
    } else if (messageForm.message.trim().length > 5000) {
      errors.message = "留言内容不能超过 5000 个字符";
    }

    return errors;
  };

  const handleSubmitMessage = async (event) => {
    event.preventDefault();
    setFormErrors({});

    const payload = {
      name: messageForm.name.trim(),
      email: messageForm.email.trim(),
      message: messageForm.message.trim(),
    };

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("请检查并完善表单信息");
      return;
    }

    setIsSubmittingMessage(true);
    try {
      await api.post("/contact", payload, { noRetry: true });
      toast.success("留言已发送，我们会尽快查看");
      setMessageForm({ name: "", email: "", message: "" });
    } catch (error) {
      const message =
        error?.response?.data?.error || "留言发送失败，请稍后重试";
      toast.error(message);
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  const pageClass = isDayMode
    ? "bg-[radial-gradient(circle_at_14%_8%,rgba(125,211,252,0.24),transparent_24%),radial-gradient(circle_at_84%_10%,rgba(129,140,248,0.2),transparent_22%),linear-gradient(180deg,#f7f9fc_0%,#eef4ff_46%,#f7f9fc_100%)] text-slate-950"
    : "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_22%),radial-gradient(circle_at_80%_14%,rgba(129,140,248,0.14),transparent_18%),linear-gradient(180deg,#030712_0%,#020617_42%,#02040c_100%)] text-white";
  const shellClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.7))] shadow-[0_34px_90px_rgba(148,163,184,0.16)] backdrop-blur-xl"
    : "border-white/10 bg-white/[0.045] shadow-[0_40px_120px_rgba(2,6,23,0.5)]";
  const quietTextClass = isDayMode ? "text-slate-600" : "text-white/70";
  const softTextClass = isDayMode ? "text-slate-500" : "text-white/50";
  const labelClass = isDayMode ? "text-slate-500" : "text-white/45";
  const dividerClass = isDayMode ? "border-slate-200/80" : "border-white/10";
  const chipClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,255,0.9))] text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.1)]"
    : "border-white/10 bg-white/[0.05] text-white/72";
  const primaryButtonClass = isDayMode
    ? "inline-flex items-center justify-center gap-2 rounded-full border border-indigo-300/20 bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] px-6 py-3 text-sm font-medium text-white shadow-[0_18px_34px_rgba(99,102,241,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(99,102,241,0.32)] active:translate-y-0"
    : "inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0";
  const outlineButtonClass = isDayMode
    ? "border-slate-200/90 bg-white/58 text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.1)] hover:border-indigo-200/90 hover:bg-white hover:text-indigo-600 active:bg-slate-50"
    : "border-white/12 text-white/82 hover:border-white/24 hover:bg-white/[0.06] active:bg-white/[0.08]";
  const inputClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,247,255,0.9))] text-slate-900 placeholder:text-slate-400 shadow-[0_10px_24px_rgba(148,163,184,0.08)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
    : "border-white/10 bg-white/[0.04] text-white placeholder:text-white/26 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10";
  const heroPosterClass = isDayMode
    ? "relative flex min-h-[360px] flex-col justify-between overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(236,244,255,0.84))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_30px_72px_rgba(148,163,184,0.18)] sm:min-h-[520px] sm:rounded-[32px] sm:p-6 md:p-8"
    : "relative flex min-h-[360px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(2,6,23,0.96))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:min-h-[520px] sm:rounded-[32px] sm:p-6 md:p-8";
  const posterLabelClass = isDayMode ? "text-slate-500" : "text-white/54";
  const posterMetaClass = isDayMode ? "text-slate-400" : "text-white/30";
  const posterAxisClass = isDayMode
    ? "bg-gradient-to-r from-transparent via-indigo-200/90 to-transparent"
    : "bg-gradient-to-r from-transparent via-white/10 to-transparent";
  const posterAxisVerticalClass = isDayMode
    ? "bg-gradient-to-b from-transparent via-indigo-200/90 to-transparent"
    : "bg-gradient-to-b from-transparent via-white/10 to-transparent";
  const posterNodeClass = isDayMode ? "text-slate-400" : "text-white/38";
  const posterAccentNodeClass = isDayMode ? "text-indigo-500/72" : "text-cyan-200/60";
  const posterOrbClass = isDayMode
    ? "relative flex h-[196px] w-[196px] items-center justify-center overflow-hidden rounded-full border border-indigo-100/90 bg-[radial-gradient(circle,rgba(255,255,255,0.98),rgba(232,240,255,0.84)_64%,rgba(226,232,240,0.4)_100%)] backdrop-blur-2xl shadow-[0_24px_60px_rgba(99,102,241,0.16)] sm:h-[250px] sm:w-[250px]"
    : "relative flex h-[196px] w-[196px] items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-2xl sm:h-[250px] sm:w-[250px]";
  const posterRingOneClass = isDayMode ? "border-indigo-100/80" : "border-white/8";
  const posterRingTwoClass = isDayMode ? "border-sky-200/80" : "border-cyan-200/10";
  const posterCoreClass = isDayMode
    ? "bg-[radial-gradient(circle,rgba(129,140,248,0.18),rgba(191,219,254,0.16)_50%,transparent_72%)]"
    : "bg-[radial-gradient(circle,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_58%,transparent_74%)]";
  const posterLogoFilter = isDayMode
    ? "brightness(0) saturate(100%) invert(27%) sepia(34%) saturate(1263%) hue-rotate(216deg) brightness(99%) contrast(93%)"
    : undefined;
  const posterFooterClass = isDayMode ? "border-slate-200/80" : "border-white/10";
  const statValueClass = isDayMode ? "text-slate-900" : "text-white";
  const statLabelClass = isDayMode ? "text-slate-500" : "text-white/52";

  return (
    <div className={`min-h-screen ${pageClass}`}>
      <SEO
        title="关于我们"
        description="了解浙大 AI 生态团队的定位、支持网络，以及 AI 社区与 AI 全栈极速黑客松等代表性项目。"
      />

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
                <div>
                  <div
                    className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.34em] ${chipClass}`}
                  >
                    Zhejiang University AI Ecosystem
                  </div>

                  <div className="mt-6 max-w-3xl sm:mt-10">
                    <p
                      className={`mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] sm:mb-4 sm:text-[11px] sm:tracking-[0.38em] ${labelClass}`}
                    >
                      About The Team
                    </p>
                    <h1
                      className={`max-w-[9ch] text-[2.85rem] font-bold leading-[0.94] tracking-tight sm:text-5xl md:max-w-[8.5ch] md:text-7xl xl:text-[5.7rem] ${
                        isDayMode
                          ? "bg-gradient-to-r from-slate-950 via-slate-800 to-indigo-600 bg-clip-text text-transparent"
                          : "bg-gradient-to-r from-white via-slate-100 to-cyan-100 bg-clip-text text-transparent"
                      }`}
                      style={{ fontFamily: "var(--theme-font-display)" }}
                    >
                      {teamTitle}
                    </h1>
                    <p
                      className={`mt-4 max-w-none text-[15px] leading-6.5 sm:mt-7 sm:max-w-2xl sm:text-lg sm:leading-8 md:text-[22px] ${quietTextClass}`}
                    >
                      {teamSubtitle}
                    </p>
                    <div
                      className={`mt-5 max-w-none space-y-3 text-[14px] leading-6.5 sm:mt-8 sm:max-w-2xl sm:space-y-4 sm:text-base sm:leading-8 md:text-lg ${quietTextClass}`}
                    >
                      <p>
                        {teamIntro1}
                      </p>
                      <p>
                        {teamIntro2}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-7 flex flex-col gap-4 border-t pt-5 sm:mt-10 sm:gap-5 sm:pt-7 ${dividerClass}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                    <Link
                      to="/events"
                      className={`${primaryButtonClass} w-full sm:w-auto`}
                    >
                      查看赛事项目
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                      href={`mailto:${contactEmail}`}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-colors duration-300 sm:w-auto ${outlineButtonClass}`}
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

              <div className={heroPosterClass}>
                {isDayMode && (
                  <>
                    <div className="absolute left-[-12%] top-[-10%] h-44 w-44 rounded-full bg-sky-200/50 blur-3xl" />
                    <div className="absolute right-[-8%] top-[18%] h-52 w-52 rounded-full bg-indigo-200/55 blur-3xl" />
                    <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(99,102,241,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.22)_1px,transparent_1px)] [background-size:34px_34px]" />
                  </>
                )}
                <div className="flex items-start justify-between sm:items-center">
                  <div className={`text-[10px] font-semibold uppercase tracking-[0.28em] sm:text-[11px] sm:tracking-[0.34em] ${posterLabelClass}`}>
                    Organized Campus AI Network
                  </div>
                  <div className={`hidden text-[11px] uppercase tracking-[0.28em] sm:block ${posterMetaClass}`}>
                    01 / Poster
                  </div>
                </div>

                <div className="relative flex flex-1 items-center justify-center py-4 sm:py-10">
                  <div className={`absolute inset-x-5 top-1/2 h-px -translate-y-1/2 sm:inset-x-10 ${posterAxisClass}`} />
                  <div className={`absolute inset-y-5 left-1/2 w-px -translate-x-1/2 sm:inset-y-10 ${posterAxisVerticalClass}`} />
                  <div className={`absolute left-[10%] top-[18%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${posterNodeClass}`}>
                    Community
                  </div>
                  <div className={`absolute right-[12%] top-[20%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${posterNodeClass}`}>
                    Hackathon
                  </div>
                  <div className={`absolute left-[12%] bottom-[19%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${posterAccentNodeClass}`}>
                    Knowledge
                  </div>
                  <div className={`absolute right-[12%] bottom-[17%] hidden text-[11px] uppercase tracking-[0.32em] sm:block ${posterAccentNodeClass}`}>
                    Network
                  </div>

                  <div className={posterOrbClass}>
                    <div className={`absolute h-[214px] w-[214px] rounded-full border sm:h-[340px] sm:w-[340px] ${posterRingOneClass}`} />
                    <div className={`absolute h-[246px] w-[246px] rounded-full border sm:h-[420px] sm:w-[420px] ${posterRingTwoClass}`} />
                    <div className={`absolute h-[138px] w-[138px] rounded-full sm:h-[210px] sm:w-[210px] ${posterCoreClass}`} />
                    <div className="relative z-10 flex flex-col items-center">
                      <img
                        src="/newlogo.png"
                        alt="浙大 AI 生态团队标识"
                        className="h-20 w-auto object-contain sm:h-28 md:h-36"
                        style={
                          posterLogoFilter
                            ? { filter: posterLogoFilter }
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

                <div className={`grid grid-cols-3 gap-2 border-t pt-4 sm:gap-5 sm:pt-6 ${posterFooterClass}`}>
                  {stats.map((item) => (
                    <div key={item.label}>
                      <div className={`text-xl font-semibold tracking-tight sm:text-3xl md:text-[2.2rem] ${statValueClass}`}>
                        {item.value}
                      </div>
                      <p className={`mt-1 text-[11px] leading-5 sm:mt-2 sm:text-sm sm:leading-6 ${statLabelClass}`}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.section
            {...sectionReveal(shouldAnimate, 0.04)}
            className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16"
          >
            <div className="pt-0 sm:pt-3">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.36em] ${labelClass}`}>
                Support Network
              </p>
              <h2
                className={`mt-4 max-w-[8ch] text-[2rem] font-bold leading-[0.98] tracking-tight sm:text-4xl md:text-6xl ${
                  isDayMode
                    ? "text-slate-950"
                    : "bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent"
                }`}
                style={{ fontFamily: "var(--theme-font-display)" }}
              >
                {supportTitle}
              </h2>
              <p className={`mt-4 max-w-lg text-[15px] leading-7 sm:mt-6 sm:text-base sm:leading-8 md:text-lg ${quietTextClass}`}>
                {supportDesc}
              </p>
            </div>

            <div className={`relative overflow-hidden rounded-[24px] border sm:rounded-[34px] ${shellClass}`}>
              <div
                className={`absolute inset-x-0 top-0 h-px ${
                  isDayMode
                    ? "bg-gradient-to-r from-transparent via-indigo-300/70 to-transparent"
                    : "bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
                }`}
              />
              <div className="relative z-10 grid gap-5 px-4 py-4 sm:gap-10 sm:px-6 sm:py-7 md:px-8 md:py-8">
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  {supportUnitsDisplay.map((item, index) => (
                    <div
                      key={item}
                      className={`flex items-start gap-3 border-b pb-4 sm:gap-4 ${dividerClass} last:border-b-0 md:last:border-b`}
                    >
                      <div className={`pt-0.5 text-xs font-semibold tracking-[0.3em] ${labelClass}`}>
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <div
                          className={`text-[15px] font-medium leading-7 sm:text-base md:text-lg ${
                            isDayMode ? "text-slate-900" : "text-white"
                          }`}
                        >
                          {item}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`grid gap-4 border-t pt-5 sm:gap-5 sm:pt-6 md:grid-cols-3 ${dividerClass}`}>
                  <div>
                    <div className={`text-[11px] uppercase tracking-[0.34em] ${labelClass}`}>
                      Positioning
                    </div>
                    <p className={`mt-3 text-[15px] leading-7 sm:text-sm ${quietTextClass}`}>
                      {supportPositioning}
                    </p>
                  </div>
                  <div>
                    <div className={`text-[11px] uppercase tracking-[0.34em] ${labelClass}`}>
                      Method
                    </div>
                    <p className={`mt-3 text-[15px] leading-7 sm:text-sm ${quietTextClass}`}>
                      {supportMethod}
                    </p>
                  </div>
                  <div>
                    <div className={`text-[11px] uppercase tracking-[0.34em] ${labelClass}`}>
                      Result
                    </div>
                    <p className={`mt-3 text-[15px] leading-7 sm:text-sm ${quietTextClass}`}>
                      {supportResult}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            {...sectionReveal(shouldAnimate, 0.08)}
            className={`overflow-hidden rounded-[26px] border sm:rounded-[38px] ${shellClass}`}
          >
            <div className="grid gap-6 px-4 py-5 sm:gap-8 sm:px-6 sm:py-8 md:px-10 md:py-10">
              <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-10">
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.36em] ${labelClass}`}>
                    Flagship Work
                  </p>
                  <h2
                    className={`mt-4 max-w-[10ch] text-[2rem] font-bold leading-[0.98] tracking-tight sm:text-4xl md:text-6xl ${
                      isDayMode
                        ? "text-slate-950"
                        : "bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent"
                    }`}
                    style={{ fontFamily: "var(--theme-font-display)" }}
                  >
                    {flagshipTitle}
                  </h2>
                </div>
                <p
                  className={`max-w-xl text-[15px] leading-7 sm:text-sm md:justify-self-end md:text-base ${quietTextClass}`}
                >
                  {flagshipNote}
                </p>
              </div>

              <div className={`border-t ${dividerClass}`}>
                {initiativeItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className={`grid gap-5 border-b py-6 sm:gap-6 sm:py-8 md:grid-cols-[84px_1.1fr_0.9fr_auto] md:gap-8 ${dividerClass} last:border-b-0`}
                    >
                      <div
                        className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.24em] ${
                          isDayMode
                            ? "border-slate-200/80 bg-white/72"
                            : "border-white/10 bg-white/[0.05]"
                        } md:block md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:text-xs md:tracking-[0.32em] ${labelClass}`}
                      >
                        {item.index}
                      </div>

                      <div className="flex items-start gap-3 sm:gap-4">
                        <span
                          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border sm:h-12 sm:w-12 ${
                            isDayMode
                              ? "border-slate-200/80 bg-white/84 text-slate-700"
                              : "border-white/10 bg-white/[0.05] text-white/82"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <h3
                            className={`text-xl font-semibold tracking-tight sm:text-2xl ${
                              isDayMode ? "text-slate-950" : "text-white"
                            }`}
                          >
                            {item.title}
                          </h3>
                          <p className={`mt-2 text-[11px] uppercase tracking-[0.32em] ${labelClass}`}>
                            {item.tagline}
                          </p>
                        </div>
                      </div>

                      <p className={`max-w-xl text-[15px] leading-7 md:text-base ${quietTextClass}`}>
                        {item.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-start sm:justify-start sm:gap-3 md:max-w-xs md:justify-end">
                        {item.bullets.map((bullet) => (
                          <span
                            key={bullet}
                            className={`inline-flex min-h-[34px] items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] tracking-[0.08em] sm:min-h-0 sm:px-3 sm:text-xs sm:tracking-[0.16em] ${chipClass}`}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                            <span>{bullet}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>

          <motion.section
            {...sectionReveal(shouldAnimate, 0.12)}
            className={`overflow-hidden rounded-[26px] border sm:rounded-[38px] ${shellClass}`}
          >
            <div className="grid gap-5 px-4 py-4 sm:gap-8 sm:px-6 sm:py-8 md:px-10 md:py-10 lg:grid-cols-[0.86fr_1.14fr] lg:gap-12">
              <div>
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.36em] ${labelClass}`}
                >
                  Leave A Message
                </p>
                <h2
                  className={`mt-4 max-w-[8ch] text-[2rem] font-bold leading-[0.98] tracking-tight sm:text-4xl md:text-6xl ${
                    isDayMode
                      ? "text-slate-950"
                      : "bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent"
                  }`}
                  style={{ fontFamily: "var(--theme-font-display)" }}
                >
                  把你的想法，直接留给我们
                </h2>
                <p
                  className={`mt-5 max-w-lg text-[15px] leading-7 sm:mt-6 sm:text-base sm:leading-8 md:text-lg ${quietTextClass}`}
                >
                  如果你想加入社区、发起合作、参与赛事，或者对浙大 AI
                  生态团队有任何建议，都可以从这里直接留言。消息会进入后台留言中心统一处理。
                </p>

                <div className={`mt-5 grid gap-2.5 sm:mt-8 sm:gap-4 ${softTextClass}`}>
                  <div className="flex items-start gap-3 text-[14px] leading-6.5 sm:text-sm">
                    <Mail className="mt-1 h-4 w-4 shrink-0" />
                    <span>适合合作咨询、活动联动、资源支持、社群建议</span>
                  </div>
                  <div className="flex items-start gap-3 text-[14px] leading-6.5 sm:text-sm">
                    <MapPin className="mt-1 h-4 w-4 shrink-0" />
                    <span>也可以直接邮件联系，我们会优先处理完整留言</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitMessage} className="grid gap-3 sm:gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${labelClass}`}
                    >
                      Name
                    </span>
                    <input
                      type="text"
                      value={messageForm.name}
                      onChange={handleMessageFieldChange("name")}
                      maxLength={100}
                      className={`rounded-[16px] border px-4 py-3 text-sm outline-none transition-all sm:rounded-[18px] ${inputClass} ${
                        formErrors.name
                          ? isDayMode
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : "border-red-400/60 focus:border-red-400 focus:ring-red-400/10"
                          : ""
                      }`}
                      placeholder="你的名字"
                    />
                    {formErrors.name && (
                      <span className="text-xs text-red-500">{formErrors.name}</span>
                    )}
                  </label>
                  <label className="grid gap-2">
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${labelClass}`}
                    >
                      Email
                    </span>
                    <input
                      type="email"
                      value={messageForm.email}
                      onChange={handleMessageFieldChange("email")}
                      maxLength={255}
                      className={`rounded-[16px] border px-4 py-3 text-sm outline-none transition-all sm:rounded-[18px] ${inputClass} ${
                        formErrors.email
                          ? isDayMode
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : "border-red-400/60 focus:border-red-400 focus:ring-red-400/10"
                          : ""
                      }`}
                      placeholder="你的邮箱"
                    />
                    {formErrors.email && (
                      <span className="text-xs text-red-500">{formErrors.email}</span>
                    )}
                  </label>
                </div>

                <label className="grid gap-2">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${labelClass}`}
                  >
                    Message
                  </span>
                  <textarea
                    value={messageForm.message}
                    onChange={handleMessageFieldChange("message")}
                    maxLength={5000}
                    rows={7}
                    className={`min-h-[160px] rounded-[18px] border px-4 py-3.5 text-sm leading-6 outline-none transition-all sm:min-h-[180px] sm:rounded-[22px] sm:py-4 sm:leading-7 ${inputClass} ${
                      formErrors.message
                        ? isDayMode
                          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                          : "border-red-400/60 focus:border-red-400 focus:ring-red-400/10"
                        : ""
                    }`}
                    placeholder="告诉我们你想交流的内容"
                  />
                  {formErrors.message && (
                    <span className="text-xs text-red-500">{formErrors.message}</span>
                  )}
                  <span className={`text-xs ${softTextClass}`}>
                    {messageForm.message.length}/5000
                  </span>
                </label>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className={`text-sm ${softTextClass}`}>
                    留言提交后会进入后台留言中心，不会公开展示。
                  </p>
                  <button
                    type="submit"
                    disabled={isSubmittingMessage}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
                      isDayMode
                        ? "border border-indigo-300/20 bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] text-white shadow-[0_18px_34px_rgba(99,102,241,0.28)] hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(99,102,241,0.32)] active:translate-y-0"
                        : "bg-white text-slate-950 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                    }`}
                  >
                    {isSubmittingMessage ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        发送中...
                      </>
                    ) : (
                      <>
                        发送留言
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.section>

          <motion.section
            {...sectionReveal(shouldAnimate, 0.16)}
            className={`relative overflow-hidden rounded-[24px] border px-4 py-4 sm:rounded-[36px] sm:px-6 sm:py-8 md:px-10 md:py-10 ${shellClass}`}
          >
            <div
              className={`absolute inset-y-0 right-0 hidden w-[36%] sm:block ${
                isDayMode
                  ? "bg-[radial-gradient(circle_at_center,rgba(165,180,252,0.16),transparent_62%)]"
                  : "bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_62%)]"
              }`}
            />
            <div className="relative z-10 grid gap-6 sm:gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.36em] ${labelClass}`}>
                  Final Note
                </p>
                <h2
                  className={`mt-4 max-w-[10ch] text-[1.95rem] font-bold leading-[0.98] tracking-tight sm:text-4xl md:text-6xl ${
                    isDayMode
                      ? "text-slate-950"
                      : "bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent"
                  }`}
                  style={{ fontFamily: "var(--theme-font-display)" }}
                >
                  {finalTitle}
                </h2>
                <p className={`mt-5 max-w-2xl text-[15px] leading-7 sm:mt-6 sm:text-base sm:leading-8 md:text-lg ${quietTextClass}`}>
                  {finalDesc}
                </p>
              </div>

              <div className={`grid gap-3 border-t pt-5 sm:gap-4 sm:border-t-0 sm:pt-0 ${dividerClass}`}>
                <div className={`flex items-start gap-3 text-[15px] leading-7 sm:text-sm ${quietTextClass}`}>
                  <Mail className="mt-1 h-4 w-4 shrink-0" />
                  <a href={`mailto:${contactEmail}`} className="transition-colors hover:text-current">
                    {contactEmail}
                  </a>
                </div>
                <div className={`flex items-start gap-3 text-[15px] leading-7 sm:text-sm ${quietTextClass}`}>
                  <MapPin className="mt-1 h-4 w-4 shrink-0" />
                  <span>{contactAddress}</span>
                </div>
                <div className={`flex items-start gap-3 text-[15px] leading-7 sm:text-sm ${quietTextClass}`}>
                  <Network className="mt-1 h-4 w-4 shrink-0" />
                  <span>{finalNote}</span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </section>
    </div>
  );
};

export default About;
