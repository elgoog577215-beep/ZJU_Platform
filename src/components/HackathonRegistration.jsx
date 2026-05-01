import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Calendar,
  ChevronDown,
  CheckCircle,
  Code2,
  Cpu,
  MapPin,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";
import api from "../services/api";
import SEO from "./SEO";

const isLikelyMojibake = (value) =>
  typeof value === "string" &&
  /[�]|鍏|爤|鏋|粦|瀹|澗|灏|忔|椂|涓|璺|紨|璇|鎶|瀛|骞|惧|洟|浼|阃|榄/.test(
    value,
  );

const readableSetting = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed && !isLikelyMojibake(trimmed) ? trimmed : fallback;
};

const splitPartners = (value, fallback) => {
  const source = readableSetting(value, fallback);
  return source
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const MotionDiv = motion.div;
const MotionSection = motion.section;
const officialWechatGroupImage = "/images/wechat-official-group.jpg";
const partnerLogos = [
  {
    src: "/images/partner-logos/modelscope.png",
    darkSrc: "/images/partner-logos/modelscope-dark.png",
    alt: "ModelScope logo",
    frame: "light",
    size: "max-w-[78px] sm:max-w-[108px] lg:max-w-[126px]",
  },
  {
    src: "/images/partner-logos/company-2.png",
    darkSrc: "/images/partner-logos/company-2-dark.png",
    alt: "Partner company logo",
    frame: "light",
    size: "max-w-[72px] sm:max-w-[96px] lg:max-w-[112px]",
  },
  {
    src: "/images/partner-logos/company-3.png",
    darkSrc: "/images/partner-logos/company-3-dark.png",
    alt: "Partner company logo",
    frame: "light",
    size: "max-w-[76px] sm:max-w-[104px] lg:max-w-[120px]",
  },
  {
    src: "/images/partner-logos/stepfun-white.png",
    alt: "StepFun logo",
    frame: "dark",
    size: "max-w-[84px] sm:max-w-[118px] lg:max-w-[138px]",
  },
];

const HackathonRegistration = () => {
  const { settings, uiMode } = useSettings();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion;
  const isDayMode = uiMode === "day";
  const pageRef = useRef(null);
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const container = pageRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      setScrollProgress(
        scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0,
      );

      const sections = ["hackathon-hero", "event-brief", "registration-form"];
      const sectionElements = sections
        .map((id) => document.getElementById(id))
        .filter(Boolean);

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const rect = sectionElements[i].getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2) {
          setActiveSection(i);
          break;
        }
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    major: "",
    grade: "",
    aiTools: [],
    experience: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const event = useMemo(
    () => ({
      title: readableSetting(settings.hackathon_title, "AI 全栈极速黑客松"),
      subtitle: "5小时、1个人、0路演",
      date: readableSetting(settings.hackathon_date, "5月10日 9:00 A.M."),
      location: readableSetting(settings.hackathon_location, "北2-112"),
      format: readableSetting(settings.hackathon_format, "个人赛"),
      duration: readableSetting(settings.hackathon_duration, "5 小时"),
      description: readableSetting(
        settings.hackathon_desc,
        "在限定时间内独立完成一个可运行的 AI 应用。允许使用 AI 工具，拒绝概念包装，只看真实作品。",
      ),
      partners: splitPartners(
        settings.hackathon_partners,
        "MiniMax, 阿里云, 魔搭, 阶跃星辰",
      ),
    }),
    [settings],
  );

  const palette = isDayMode
    ? {
        page: "bg-[#f6f8fb] text-slate-950",
        panel:
          "border-slate-200/80 bg-white/86 shadow-[0_24px_70px_rgba(15,23,42,0.10)]",
        panelStrong:
          "border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.13)]",
        textSoft: "text-slate-600",
        textMuted: "text-slate-500",
        line: "border-slate-200",
        chip: "border-slate-200 bg-slate-50 text-slate-700",
        field:
          "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-100",
        primary:
          "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-[0_18px_42px_rgba(6,182,212,0.28)] hover:from-cyan-600 hover:to-teal-600",
        secondary:
          "border-slate-300 bg-white/80 text-slate-800 hover:border-cyan-400 hover:bg-white",
        accent: "text-cyan-700",
        accentLight: "text-cyan-600",
      }
    : {
        page: "bg-[#040506] text-white",
        panel:
          "border-white/10 bg-white/[0.055] shadow-[0_28px_90px_rgba(0,0,0,0.5)]",
        panelStrong:
          "border-cyan-300/22 bg-[#081012]/86 shadow-[0_36px_120px_rgba(0,0,0,0.62)]",
        textSoft: "text-white/70",
        textMuted: "text-white/46",
        line: "border-white/10",
        chip: "border-white/10 bg-white/[0.06] text-white/78",
        field:
          "border-white/12 bg-black/24 text-white placeholder:text-white/32 focus:border-cyan-300/70 focus:ring-cyan-300/12",
        primary:
          "bg-cyan-300 text-slate-950 shadow-[0_0_32px_rgba(103,232,249,0.28)] hover:bg-white",
        secondary:
          "border-white/14 bg-white/[0.04] text-white hover:border-cyan-300/50 hover:bg-cyan-300/10",
        accent: "text-cyan-300",
        accentLight: "text-cyan-200",
      };

  const heroMotion = shouldAnimate
    ? {
        initial: { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
      }
    : {};

  const sectionMotion = shouldAnimate
    ? {
        initial: { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.22 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      }
    : {};

  const aiToolOptions = [
    { value: "codex", label: "Codex" },
    { value: "claude", label: "Claude" },
    { value: "cursor", label: "Cursor" },
    { value: "trae", label: "Trae" },
    { value: "other", label: "其他" },
  ];

  const gradeOptions = [
    { value: "freshman", label: "大一" },
    { value: "sophomore", label: "大二" },
    { value: "junior", label: "大三" },
    { value: "senior", label: "大四" },
    { value: "master", label: "硕士" },
    { value: "phd", label: "博士" },
  ];

  const eventMeta = [
    { index: "01", label: "时间", value: event.date, icon: Calendar },
    { index: "02", label: "地点", value: event.location, icon: MapPin },
    { index: "03", label: "形式", value: event.format, icon: Users },
    { index: "04", label: "奖金池", value: "16,500 ￥", icon: Trophy },
  ];

  const challenges = [
    {
      title: "AI 原生开发",
      text: "允许并鼓励使用 Codex、Claude、Cursor、Trae 等工具完成全栈开发。",
      icon: Code2,
    },
    {
      title: "5 小时从 0 到 1",
      text: "现场完成一个可运行、可体验、能说明问题的 AI 应用。",
      icon: Rocket,
    },
    {
      title: "0 路演",
      text: "不比表达包装，只看作品完成度、真实体验和创新性。",
      icon: ShieldCheck,
    },
  ];

  const ecosystemGroups = [
    { label: "学校", partners: ["未来学习中心", "AI 联合实验室"] },
    { label: "社团", partners: ["XLAB", "ZJUAI", "EAI", "AIRA", "KAB"] },
    { label: "企业", partners: event.partners },
  ];

  const heroStats = [
    { value: "5", unit: "小时", code: "HOURS" },
    { value: "1", unit: "个人", code: "SOLO" },
    { value: "0", unit: "路演", code: "PITCH" },
  ];

  const handleInputChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleToolToggle = (tool) => {
    setFormData((prev) => {
      const tools = prev.aiTools.includes(tool)
        ? prev.aiTools.filter((item) => item !== tool)
        : [...prev.aiTools, tool];
      return { ...prev, aiTools: tools };
    });
    if (formErrors.aiTools) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next.aiTools;
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "请输入姓名";
    if (!formData.studentId.trim()) errors.studentId = "请输入学号";
    if (!formData.major.trim()) errors.major = "请输入专业";
    if (!formData.grade) errors.grade = "请选择年级";
    if (formData.aiTools.length === 0)
      errors.aiTools = "请至少选择一个 AI 工具";
    if (!formData.experience.trim())
      errors.experience = "请简述你的 AI 项目经历";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("请检查并完善报名信息");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/hackathon/register", formData, { noRetry: true });
      toast.success("报名成功！请等待后续通知");
      setFormData({
        name: "",
        studentId: "",
        major: "",
        grade: "",
        aiTools: [],
        experience: "",
      });
    } catch (error) {
      const message = error?.response?.data?.error || "报名失败，请稍后重试";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const smoothScrollTo = (id) => {
    const target = document.getElementById(id);
    if (!target) return;

    const offset = window.innerWidth < 768 ? 76 : 96;
    const scroller = pageRef.current;

    if (!scroller) {
      const end = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({
        top: end,
        behavior: shouldAnimate ? "smooth" : "auto",
      });
      return;
    }

    scroller.scrollTo({
      top: Math.max(target.offsetTop - offset, 0),
      behavior: shouldAnimate ? "smooth" : "auto",
    });
  };

  const scrollToForm = () => {
    smoothScrollTo("registration-form");
  };

  return (
    <div
      ref={pageRef}
      className={`h-[100svh] snap-y snap-mandatory overflow-y-auto overflow-x-hidden scroll-smooth overscroll-y-contain ${palette.page}`}
    >
      <SEO
        title={`${event.title}报名`}
        description={`${event.title} - ${event.subtitle}。在限定时间内独立完成一个可运行的 AI 应用。`}
      />

      {/* Scroll Progress Bar */}
      <div className="fixed left-0 right-0 top-[env(safe-area-inset-top)] z-50 h-0.5">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Desktop Navigation Dots */}
      <div className="fixed right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-4 lg:flex">
        {[
          { id: "hackathon-hero", label: "主页", index: 0 },
          { id: "event-brief", label: "赛制", index: 1 },
          { id: "registration-form", label: "报名", index: 2 },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => smoothScrollTo(item.id)}
            className={`group relative flex items-center gap-3 transition-all duration-300 ${
              activeSection === item.index ? "pointer-events-none" : ""
            }`}
            aria-label={`跳转到${item.label}`}
          >
            <span
              className={`absolute right-full mr-3 whitespace-nowrap text-xs font-bold uppercase tracking-wider opacity-0 transition-all duration-300 group-hover:opacity-100 ${
                isDayMode ? "text-slate-600" : "text-white/60"
              } ${activeSection === item.index ? "opacity-100" : ""}`}
            >
              {item.label}
            </span>
            <div className="relative">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-xs font-black transition-all duration-300 ${
                  activeSection === item.index
                    ? isDayMode
                      ? "border-cyan-500 bg-cyan-500 text-white shadow-lg shadow-cyan-200"
                      : "border-cyan-400 bg-cyan-500 text-white shadow-lg shadow-cyan-200"
                    : isDayMode
                      ? "border-slate-200 bg-white/80 text-slate-400 hover:border-cyan-400 hover:text-cyan-500"
                      : "border-white/10 bg-white/5 text-white/30 hover:border-cyan-400 hover:text-cyan-300"
                }`}
              >
                {activeSection === item.index ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                ) : (
                  <span className="text-[10px]">
                    {String(item.index + 1).padStart(2, "0")}
                  </span>
                )}
              </div>
              {activeSection === item.index && (
                <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Mobile Navigation Bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-4 border-t px-4 py-3 backdrop-blur-xl lg:hidden ${isDayMode ? "border-slate-200 bg-white/90" : "border-white/10 bg-black/50"}`}>
        {[
          { id: "hackathon-hero", label: "主页", icon: Sparkles, index: 0 },
          { id: "event-brief", label: "赛制", icon: Trophy, index: 1 },
          { id: "registration-form", label: "报名", icon: Send, index: 2 },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => smoothScrollTo(item.id)}
              className={`flex flex-1 max-w-[120px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-300 ${
                activeSection === item.index
                  ? isDayMode
                    ? "bg-cyan-100 text-cyan-700"
                    : "bg-cyan-500/20 text-cyan-300"
                  : isDayMode
                    ? "text-slate-500 hover:text-slate-700"
                    : "text-white/40 hover:text-white/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <section
        id="hackathon-hero"
        className="relative min-h-[100svh] snap-start snap-always px-4 pt-[calc(env(safe-area-inset-top)+72px)] sm:px-6 lg:px-10 2xl:px-16"
      >
        <div className="pointer-events-none absolute inset-0">
          <div
            className={`absolute inset-0 ${
              isDayMode
                ? "bg-[linear-gradient(115deg,rgba(255,255,255,0.86),rgba(236,254,255,0.62)_48%,rgba(248,250,252,0.96))]"
                : "bg-[radial-gradient(circle_at_70%_22%,rgba(34,211,238,0.18),transparent_26%),radial-gradient(circle_at_16%_12%,rgba(16,185,129,0.12),transparent_24%),linear-gradient(135deg,#030303_0%,#071111_48%,#030405_100%)]"
            }`}
          />
          <div
            className={`absolute inset-0 opacity-[0.18] ${
              isDayMode
                ? "bg-[linear-gradient(rgba(15,23,42,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.12)_1px,transparent_1px)]"
                : "bg-[linear-gradient(rgba(103,232,249,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.12)_1px,transparent_1px)]"
            } bg-[size:44px_44px]`}
          />
          <div className={`absolute left-0 top-0 h-px w-full ${isDayMode ? "bg-gradient-to-r from-transparent via-cyan-600/50 to-transparent" : "bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"}`} />
          <div className={`absolute bottom-[-22%] right-[-16%] h-[520px] w-[520px] rounded-full blur-[110px] ${isDayMode ? "bg-cyan-500/8" : "bg-cyan-300/12"}`} />
        </div>

        <div
          className={`relative z-10 mx-auto mb-6 flex w-[calc(100%-2rem)] max-w-[720px] flex-wrap items-center justify-center gap-1 border px-1.5 py-1.5 backdrop-blur-2xl sm:absolute sm:right-6 sm:top-[calc(env(safe-area-inset-top)+80px)] sm:mx-0 sm:mb-0 sm:w-auto sm:justify-end sm:gap-1.5 sm:px-2 lg:right-10 lg:top-[calc(env(safe-area-inset-top)+78px)] lg:gap-2 2xl:right-16 ${
            isDayMode
              ? "border-white/80 bg-white/72 shadow-[0_20px_52px_rgba(15,23,42,0.13)] ring-1 ring-slate-900/[0.04]"
              : "border-white/12 bg-slate-950/38 shadow-[0_20px_58px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.04]"
          }`}
          aria-label="企业 logo"
        >
          <div
            className={`pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent ${
              isDayMode ? "via-cyan-500/45" : "via-cyan-200/60"
            } to-transparent`}
          />
          {partnerLogos.map((logo) => (
            <span
              key={logo.src}
              className={`group relative flex h-7 min-w-[72px] items-center justify-center overflow-hidden border px-2 transition duration-300 hover:-translate-y-0.5 sm:h-8 sm:min-w-[98px] sm:px-3 lg:h-9 lg:min-w-[112px] ${
                isDayMode
                  ? logo.frame === "dark"
                    ? "border-white/12 bg-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_24px_rgba(2,6,23,0.26)]"
                    : "border-white bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_10px_26px_rgba(15,23,42,0.10)]"
                  : "border-transparent bg-transparent shadow-none"
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 ${
                  isDayMode
                    ? logo.frame === "dark"
                      ? "bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,0.20),transparent_58%)]"
                      : "bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.10),transparent_58%)]"
                    : "bg-[radial-gradient(circle_at_50%_50%,rgba(103,232,249,0.12),transparent_62%)]"
                }`}
              />
              <img
                src={isDayMode ? logo.src : logo.darkSrc || logo.src}
                alt={logo.alt}
                className={`relative max-h-4 object-contain sm:max-h-6 lg:max-h-7 ${
                  isDayMode ? "" : "drop-shadow-[0_1px_10px_rgba(103,232,249,0.18)]"
                } ${logo.size}`}
                loading="eager"
              />
            </span>
          ))}
        </div>

        <div className="relative mx-auto grid min-h-[calc(100svh-112px)] w-full max-w-[1680px] items-center gap-8 pb-24 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(540px,0.94fr)] lg:gap-16 lg:pb-24 xl:gap-24 2xl:grid-cols-[minmax(0,820px)_minmax(680px,760px)] 2xl:justify-between">
          <MotionDiv
            {...(shouldAnimate
              ? {
                  initial: { opacity: 0, scale: 0.96, y: 24 },
                  animate: { opacity: 1, scale: 1, y: 0 },
                  transition: {
                    duration: 0.72,
                    delay: 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  },
                }
              : {})}
            className={`relative order-2 w-full justify-self-start overflow-hidden border p-4 backdrop-blur-2xl sm:p-6 lg:justify-self-end xl:p-10 ${palette.panelStrong}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_22%,rgba(103,232,249,0.14),transparent_34%),linear-gradient(135deg,rgba(103,232,249,0.08),transparent_46%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <div className={`absolute right-6 top-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] ${palette.accent} xl:right-8 xl:top-8`}>
              <span className={`h-2 w-2 rounded-full ${isDayMode ? "bg-cyan-600" : "bg-cyan-300"}`} />
              Live Brief
            </div>

            <div className="relative mt-10 grid gap-6 xl:gap-7">
              <div>
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.24em] ${palette.textMuted}`}
                >
                  Prize pool
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
                  <span className={`text-7xl font-black leading-none tracking-tighter ${palette.accent} sm:text-8xl xl:text-9xl`}>
                    16,500
                  </span>
                  <span className={`pb-4 text-4xl font-black leading-none ${palette.accent} sm:text-5xl xl:pb-6 xl:text-6xl`}>
                    ￥
                  </span>
                  <span className={`pb-3 text-2xl font-black tracking-[0.12em] ${palette.accent} sm:text-3xl xl:pb-4 xl:text-4xl`}>
                    奖金池
                  </span>
                </div>
              </div>

              <div
                className={`grid gap-px overflow-hidden border-y ${isDayMode ? "bg-cyan-100/40" : "bg-cyan-300/18"} ${palette.line} sm:grid-cols-2`}
              >
                {eventMeta.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`${isDayMode ? "bg-white/92 hover:bg-cyan-50" : "bg-[#071011]/92 hover:bg-cyan-300/10"} group min-h-[112px] p-5 transition duration-200 xl:min-h-[128px] xl:p-6`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={`font-mono text-xs font-black uppercase tracking-[0.18em] ${palette.accent}`}>
                            {item.index} / {item.label}
                          </p>
                          <p className="mt-3 text-xl font-black tracking-tight xl:text-2xl">
                            {item.value}
                          </p>
                        </div>
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center border ${isDayMode ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-600" : "border-cyan-300/40 bg-cyan-300/10 text-cyan-300"} xl:h-14 xl:w-14`}>
                          <Icon className="h-6 w-6 xl:h-7 xl:w-7" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center xl:gap-3">
                {["AI 原生", "独立完成", "作品优先"].map((item) => (
                  <div
                    key={item}
                    className={`border px-2 py-3 text-xs font-semibold xl:py-4 xl:text-sm ${palette.chip}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </MotionDiv>

          <MotionDiv {...heroMotion} className="order-1 max-w-[860px] lg:ml-0">
            <div
              className={`mb-6 inline-flex items-center gap-2 border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${palette.chip}`}
            >
              <Sparkles className={`h-3.5 w-3.5 ${isDayMode ? "text-cyan-600" : "text-cyan-400"}`} />
              AI Build Arena 2026
            </div>

            <h1 className="max-w-[900px] text-5xl font-black leading-[0.96] tracking-tight sm:text-7xl lg:text-8xl 2xl:text-[104px]">
              <span className="block">AI 全栈极速</span>
              <span className="block">黑客松</span>
            </h1>

            <MotionDiv
              {...(shouldAnimate
                ? {
                    initial: "hidden",
                    animate: "show",
                    variants: {
                      hidden: {},
                      show: {
                        transition: {
                          staggerChildren: 0.08,
                          delayChildren: 0.22,
                        },
                      },
                    },
                  }
                : {})}
              role="group"
              aria-label={event.subtitle}
              className="mt-7 grid max-w-[820px] grid-cols-3 gap-2 sm:gap-3 xl:gap-4"
            >
              {heroStats.map((stat) => (
                <motion.div
                  key={stat.code}
                  {...(shouldAnimate
                    ? {
                        variants: {
                          hidden: { opacity: 0, y: 18, scale: 0.94 },
                          show: {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: {
                              duration: 0.5,
                              ease: [0.22, 1, 0.36, 1],
                            },
                          },
                        },
                      }
                    : {})}
                  className={`group relative transform-gpu overflow-hidden border px-3 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${
                    isDayMode
                      ? "border-cyan-600/30 bg-white/76 shadow-[0_20px_42px_rgba(15,23,42,0.08)] hover:border-cyan-600/50"
                      : "border-cyan-300/24 bg-cyan-300/[0.045] shadow-[0_20px_55px_rgba(0,0,0,0.34)] hover:border-cyan-300/70"
                  } sm:px-5 sm:py-5 xl:px-6 xl:py-6`}
                >
                  <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-70 ${isDayMode ? "via-cyan-500/50" : "via-cyan-300"}`} />
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-[-20%] w-1/3 bg-gradient-to-r from-transparent via-cyan-200/12 to-transparent opacity-0 transition duration-500 group-hover:left-full group-hover:opacity-100"
                  />
                  <div className="relative flex items-baseline gap-1.5 sm:gap-2">
                    <span className={`text-5xl font-black leading-none tracking-tight ${palette.accent} sm:text-6xl xl:text-7xl`}>
                      {stat.value}
                    </span>
                    <span
                      className={`text-lg font-black sm:text-2xl xl:text-3xl ${isDayMode ? "text-slate-950" : "text-white"}`}
                    >
                      {stat.unit}
                    </span>
                  </div>
                  <div
                    className={`relative mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] xl:text-xs ${palette.textMuted}`}
                  >
                    {stat.code}
                  </div>
                </motion.div>
              ))}
            </MotionDiv>

            <p
              className={`mt-6 max-w-3xl text-base leading-8 sm:text-lg xl:text-xl xl:leading-9 ${palette.textSoft}`}
            >
              {event.description}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={scrollToForm}
                className={`group inline-flex min-h-12 items-center justify-center gap-2 px-7 text-sm font-bold transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 xl:min-h-14 xl:px-9 xl:text-base ${palette.primary}`}
              >
                立即报名
                <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <Link
                to="/about"
                className={`inline-flex min-h-12 items-center justify-center gap-2 border px-7 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/20 xl:min-h-14 xl:px-9 xl:text-base ${palette.secondary}`}
              >
                了解生态团队
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </MotionDiv>

          <button
            type="button"
            onClick={() => smoothScrollTo("event-brief")}
            className={`group absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition duration-300 hover:border-cyan-300/70 hover:text-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-300/20 md:inline-flex ${palette.chip}`}
          >
            继续了解
            <span className="inline-flex transition-transform duration-300 group-hover:translate-y-0.5">
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>
        </div>
      </section>

      <MotionSection
        id="event-brief"
        {...sectionMotion}
        className="relative flex min-h-[100svh] snap-start snap-always items-center overflow-hidden px-4 py-[72px] sm:px-6 sm:py-20 lg:px-12 lg:py-20 2xl:px-20 2xl:py-24"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(103,232,249,0.14),transparent_28%),radial-gradient(circle_at_76%_26%,rgba(99,102,241,0.14),transparent_26%)]" />
        <div className="mx-auto max-w-[1800px]">
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute right-[-4%] top-[-10%] font-black uppercase leading-none tracking-[-0.08em] text-white/[0.04] text-[20vw]">
              SHIP
            </div>

            <div className="relative grid gap-16 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-stretch xl:gap-36 2xl:gap-44">
              <div className="order-1 flex flex-col lg:min-h-[620px]">
                <p className={`text-sm font-bold uppercase tracking-[0.28em] ${palette.accent}`}>
                  Competition Board
                </p>
                <h2 className="mt-5 max-w-3xl text-5xl font-black leading-[0.98] tracking-tight sm:text-7xl xl:text-[70px] 2xl:text-[84px]">
                  5小时交付
                  <span className={`block ${palette.accent}`}>0路演</span>
                  只看作品
                </h2>
                <p
                  className={`mt-6 max-w-xl text-base leading-8 xl:text-lg xl:leading-8 ${palette.textSoft}`}
                >
                  现场把想法变成可运行的 AI 应用。规则足够直接：个人完成、AI
                  原生、作品优先。
                </p>

                <div
                  className={`mt-10 border-t pt-7 lg:mt-auto ${palette.line}`}
                >
                  <p className={`text-sm font-bold uppercase tracking-[0.24em] ${palette.accent}`}>
                    Ecosystem
                  </p>
                  <h3 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl xl:text-[44px]">
                    支持阵容
                  </h3>

                  <div className="mt-7 grid gap-3">
                    {ecosystemGroups.map((group) => (
                      <div
                        key={group.label}
                        className={`grid gap-4 border-l-2 px-6 py-3.5 sm:grid-cols-[104px_1fr] sm:items-center xl:px-6 xl:py-4 ${
                          isDayMode
                            ? "border-cyan-600 bg-white/60"
                            : "border-cyan-300 bg-cyan-300/[0.035]"
                        }`}
                      >
                        <div className={`flex items-center gap-2 text-base font-black ${palette.accent}`}>
                          <span className={`h-2.5 w-2.5 ${isDayMode ? "bg-cyan-600" : "bg-cyan-300"}`} />
                          {group.label}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {group.partners.map((partner) => (
                            <span
                              key={partner}
                              className={`border px-4 py-2.5 text-base font-black ${palette.chip}`}
                            >
                              {partner}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="order-2 flex">
                <div className="grid flex-1 content-start gap-6 xl:gap-7">
                  {challenges.map((challenge, index) => {
                    const Icon = challenge.icon;
                    return (
                      <div
                        key={challenge.title}
                        className={`group relative flex min-h-[140px] overflow-hidden border p-4 transition duration-300 sm:min-h-[176px] sm:p-8 xl:min-h-[188px] xl:p-9 ${
                          isDayMode
                            ? "border-slate-200 bg-white/84 shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
                            : "border-white/10 bg-[#101516]/88 shadow-[0_28px_80px_rgba(0,0,0,0.36)]"
                        }`}
                      >
                        <div className={`absolute inset-y-0 left-0 w-1 ${isDayMode ? "bg-cyan-500" : "bg-cyan-300"} opacity-80`} />
                        <div className={`pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(103,232,249,0.10),transparent_34%)] opacity-0 transition duration-300 group-hover:opacity-100`} />
                        <div className="relative flex flex-1 flex-col gap-4 sm:grid sm:grid-cols-[124px_1fr] sm:items-center sm:gap-7">
                          <div className="flex items-center gap-3 sm:block">
                            <div className={`flex h-[56px] w-[56px] items-center justify-center ${isDayMode ? "bg-cyan-500 shadow-[0_0_36px_rgba(6,182,212,0.25)]" : "bg-cyan-300 shadow-[0_0_36px_rgba(103,232,249,0.28)]"} text-slate-950 sm:h-[88px] sm:w-[88px]`}>
                              <Icon className="h-6 w-6 sm:h-10 sm:w-10" />
                            </div>
                            <p className={`font-mono text-xs font-black uppercase tracking-[0.24em] ${palette.accent} sm:mt-4`}>
                              Rule 0{index + 1}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-2xl font-black tracking-tight sm:text-4xl xl:text-5xl">
                              {challenge.title}
                            </h3>
                            <p
                              className={`mt-2 max-w-2xl text-xs leading-6 sm:text-sm sm:leading-7 xl:text-lg xl:leading-8 ${palette.textSoft}`}
                            >
                              {challenge.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </MotionSection>

      <section
        id="registration-form"
        className="relative flex min-h-[100svh] snap-start snap-always items-center overflow-hidden px-4 pb-20 pt-[88px] sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-0"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(103,232,249,0.12),transparent_28%),radial-gradient(circle_at_84%_70%,rgba(99,102,241,0.12),transparent_24%)]" />
        <div className="pointer-events-none absolute left-[-3%] top-[8%] font-black uppercase leading-none tracking-[-0.08em] text-white/[0.035] text-[18vw]">
          APPLY
        </div>
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div>
            <p className={`text-sm font-bold uppercase tracking-[0.24em] ${palette.accent}`}>
              Register
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              参赛登记
            </h2>
            <p
              className={`mt-5 max-w-md text-base leading-8 ${palette.textSoft}`}
            >
              填写基础信息后提交报名。赛事通知会通过后续渠道同步给入选同学。
            </p>
            <div className={`mt-7 border p-4 ${palette.panel}`}>
              <div className="flex items-start gap-3">
                <Bot className={`mt-0.5 h-5 w-5 shrink-0 ${palette.accent}`} />
                <p className={`text-sm leading-7 ${palette.textSoft}`}>
                  工具选择用于了解参赛者的 AI 开发习惯，不影响报名资格。
                </p>
              </div>
            </div>
          </div>

          <MotionDiv
            {...(shouldAnimate
              ? {
                  initial: { opacity: 0, y: 24 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, margin: "-80px" },
                  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                }
              : {})}
            className={`border p-5 backdrop-blur-2xl sm:p-7 ${palette.panelStrong}`}
          >
            <div className={`mb-6 flex items-center justify-between gap-4 border-b pb-5 ${isDayMode ? "border-cyan-200" : "border-cyan-300/14"}`}>
              <div>
                <h3 className="text-2xl font-black">报名信息</h3>
                <p className={`mt-1 text-sm ${palette.textMuted}`}>
                  所有带 * 的字段均为必填
                </p>
              </div>
              <Trophy className={`h-7 w-7 ${palette.accent}`} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="姓名"
                  required
                  error={formErrors.name}
                  palette={palette}
                >
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange("name")}
                    placeholder="请输入姓名"
                    className={`w-full border px-4 py-3 text-sm outline-none transition ${palette.field} ${
                      formErrors.name
                        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
                        : ""
                    }`}
                  />
                </Field>

                <Field
                  label="学号"
                  required
                  error={formErrors.studentId}
                  palette={palette}
                >
                  <input
                    type="text"
                    value={formData.studentId}
                    onChange={handleInputChange("studentId")}
                    placeholder="请输入学号"
                    className={`w-full border px-4 py-3 text-sm outline-none transition ${palette.field} ${
                      formErrors.studentId
                        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
                        : ""
                    }`}
                  />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="专业"
                  required
                  error={formErrors.major}
                  palette={palette}
                >
                  <input
                    type="text"
                    value={formData.major}
                    onChange={handleInputChange("major")}
                    placeholder="请输入专业"
                    className={`w-full border px-4 py-3 text-sm outline-none transition ${palette.field} ${
                      formErrors.major
                        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
                        : ""
                    }`}
                  />
                </Field>

                <Field
                  label="年级"
                  required
                  error={formErrors.grade}
                  palette={palette}
                >
                  <select
                    value={formData.grade}
                    onChange={handleInputChange("grade")}
                    className={`w-full appearance-none border px-4 py-3 text-sm outline-none transition ${palette.field} ${
                      formErrors.grade
                        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100"
                        : ""
                    }`}
                  >
                    <option
                      value=""
                      className={
                        isDayMode
                          ? "bg-white text-slate-950"
                          : "bg-slate-950 text-white"
                      }
                    >
                      请选择年级
                    </option>
                    {gradeOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        className={
                          isDayMode
                            ? "bg-white text-slate-950"
                            : "bg-slate-950 text-white"
                        }
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div>
                <label
                  className={`mb-3 block text-sm font-bold ${palette.textSoft}`}
                >
                  常用 AI 工具 <span className="text-rose-400">*</span>
                  <span className={`ml-2 font-normal ${palette.textMuted}`}>
                    可多选
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {aiToolOptions.map((tool) => {
                    const isSelected = formData.aiTools.includes(tool.value);
                    return (
                      <button
                        key={tool.value}
                        type="button"
                        onClick={() => handleToolToggle(tool.value)}
                        className={`inline-flex min-h-10 items-center gap-2 border px-4 text-sm font-bold transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/20 ${
                          isSelected
                            ? isDayMode
                              ? "border-cyan-600 bg-cyan-600 text-white"
                              : "border-cyan-300 bg-cyan-300 text-slate-950"
                            : `${palette.chip} hover:border-cyan-400 hover:text-cyan-600`
                        }`}
                      >
                        {isSelected && <CheckCircle className="h-4 w-4" />}
                        {tool.label}
                      </button>
                    );
                  })}
                </div>
                {formErrors.aiTools && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.aiTools}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={`mb-3 block text-sm font-bold ${palette.textSoft}`}
                >
                  AI 项目经历 <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={formData.experience}
                  onChange={handleInputChange("experience")}
                  placeholder="简述一下你使用 AI 开发项目的经历..."
                  rows={4}
                  className={`w-full resize-none rounded-xl border px-5 py-4 text-sm leading-7 outline-none transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/20 ${
                    isDayMode
                      ? "border-slate-200/80 bg-white/80 text-slate-900 placeholder:text-slate-400"
                      : "border-white/10 bg-white/[0.04] text-white placeholder:text-white/26"
                  }`}
                />
                {formErrors.experience && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.experience}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={`mb-3 block text-sm font-bold ${palette.textSoft}`}
                >
                  请加入官方微信群
                  <span className={`ml-2 font-normal ${palette.textMuted}`}>
                    可选
                  </span>
                </label>
                <div
                  className={`inline-flex max-w-full border p-3 ${
                    isDayMode
                      ? "border-slate-200 bg-white/80"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <img
                    src={officialWechatGroupImage}
                    alt="官方微信群二维码"
                    className="h-auto w-full max-w-[240px] object-contain"
                    loading="lazy"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`group inline-flex min-h-12 w-full items-center justify-center gap-2 px-6 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-55 ${palette.primary}`}
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    提交中...
                  </>
                ) : (
                  <>
                    提交报名
                    <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </MotionDiv>
        </div>
      </section>
    </div>
  );
};

const Field = ({ label, required, error, palette, children }) => (
  <div>
    <label className={`mb-2 block text-sm font-bold ${palette.textSoft}`}>
      {label} {required && <span className="text-rose-400">*</span>}
    </label>
    {children}
    {error && (
      <p className="mt-2 flex items-center gap-1 text-xs text-rose-400">
        <AlertCircle className="h-3.5 w-3.5" />
        {error}
      </p>
    )}
  </div>
);

export default HackathonRegistration;
