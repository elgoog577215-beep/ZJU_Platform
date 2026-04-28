import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle,
  Code2,
  Cpu,
  MapPin,
  Rocket,
  Send,
  Sparkles,
  Trophy,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";
import api from "../services/api";
import SEO from "./SEO";

const isLikelyMojibake = (value) =>
  typeof value === "string" && /[]|鍏||鏋|粦||澗|灏|忔|椂|涓|璺|紨|璇|鎶|瀛|骞|惧|洟||阃|榄/.test(value);

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

const HackathonRegistration = () => {
  const { settings, uiMode } = useSettings();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion;
  const isDayMode = uiMode === "day";
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const totalPages = 3;

  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    major: "",
    grade: "",
    aiTools: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const event = {
    title: readableSetting(settings.hackathon_title, "AI 全栈极速黑客松"),
    subtitle: "5小时、1个人、0路演",
    date: readableSetting(settings.hackathon_date, "5月10日 9:00 A.M."),
    location: readableSetting(settings.hackathon_location, "北 1-114"),
    format: readableSetting(settings.hackathon_format, "个人赛"),
    duration: readableSetting(settings.hackathon_duration, "5 小时"),
    description: readableSetting(
      settings.hackathon_desc,
      "在限定时间内独立完成一个可运行的 AI 应用。允许使用 AI 工具，拒绝概念包装，只看真实作品。",
    ),
    partners: splitPartners(settings.hackathon_partners, "MiniMax, 阿里云, 魔搭, 阶跃星辰"),
  };

  const aiToolOptions = [
    { value: "claude", label: "Claude" },
    { value: "codex", label: "Codex" },
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

  const gradeLabels = {
    freshman: "大一",
    sophomore: "大二",
    junior: "大三",
    senior: "大四",
    master: "硕士",
    phd: "博士",
  };

  const navigateToPage = useCallback(
    (newPage) => {
      if (newPage < 0 || newPage >= totalPages || isTransitioning) return;
      setDirection(newPage > currentPage ? 1 : -1);
      setCurrentPage(newPage);
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), shouldAnimate ? 500 : 0);
    },
    [currentPage, totalPages, isTransitioning, shouldAnimate],
  );

  const goToNext = useCallback(() => navigateToPage(currentPage + 1), [currentPage, navigateToPage]);
  const goToPrev = useCallback(() => navigateToPage(currentPage - 1), [currentPage, navigateToPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        navigateToPage(0);
      } else if (e.key === "End") {
        e.preventDefault();
        navigateToPage(totalPages - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev, navigateToPage, totalPages]);

  // Mouse wheel navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let wheelTimeout = null;
    const handleWheel = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (isTransitioning) return;

      e.preventDefault();
      clearTimeout(wheelTimeout);

      wheelTimeout = setTimeout(() => {
        if (e.deltaY > 20) {
          goToNext();
        } else if (e.deltaY < -20) {
          goToPrev();
        }
      }, 50);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
      clearTimeout(wheelTimeout);
    };
  }, [goToNext, goToPrev, isTransitioning]);

  // Touch navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if (isTransitioning) return;

      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      const deltaX = touchStartX.current - e.changedTouches[0].clientX;

      // Prefer vertical swipe over horizontal
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
        if (deltaY > 0) {
          goToNext();
        } else {
          goToPrev();
        }
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [goToNext, goToPrev, isTransitioning]);

  const pageVariants = {
    enter: (direction) => ({
      y: direction > 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      y: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction) => ({
      y: direction < 0 ? "100%" : "-100%",
      opacity: 0,
      scale: 0.96,
    }),
  };

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
        ? prev.aiTools.filter((t) => t !== tool)
        : [...prev.aiTools, tool];
      return { ...prev, aiTools: tools };
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "请输入姓名";
    if (!formData.studentId.trim()) errors.studentId = "请输入学号";
    if (!formData.major.trim()) errors.major = "请输入专业";
    if (!formData.grade) errors.grade = "请选择年级";
    if (formData.aiTools.length === 0) errors.aiTools = "请至少选择一个 AI 工具";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("请检查并完善表单信息");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/hackathon/register", formData, { noRetry: true });
      toast.success("报名成功！请等待后续通知");
      setFormData({ name: "", studentId: "", major: "", grade: "", aiTools: [] });
    } catch (error) {
      const message = error?.response?.data?.error || "报名失败，请稍后重试";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Page indicator component
  const PageIndicator = () => (
    <div className="fixed right-6 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-3">
      {Array.from({ length: totalPages }).map((_, idx) => (
        <button
          key={idx}
          onClick={() => navigateToPage(idx)}
          className={`group relative flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 ${
            currentPage === idx
              ? isDayMode
                ? "border-cyan-500 bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30"
                : "border-cyan-400 bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-400/40"
              : isDayMode
              ? "border-slate-300 bg-white/80 text-slate-600 hover:border-cyan-400 hover:text-cyan-600"
              : "border-white/20 bg-white/5 text-white/50 hover:border-cyan-400 hover:text-cyan-300"
          }`}
        >
          <span className="text-sm font-bold">{String(idx + 1).padStart(2, "0")}</span>
          {currentPage === idx && (
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
          )}
        </button>
      ))}
    </div>
  );

  // Navigation arrows
  const NavArrows = () => (
    <>
      <button
        onClick={goToPrev}
        disabled={currentPage === 0 || isTransitioning}
        className={`fixed left-6 top-1/2 z-30 -translate-y-1/2 rounded-full p-3 transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed ${
          isDayMode
            ? "bg-white/80 text-slate-700 hover:bg-white hover:shadow-lg"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={goToNext}
        disabled={currentPage === totalPages - 1 || isTransitioning}
        className={`fixed right-6 top-1/2 z-30 -translate-y-1/2 rounded-full p-3 transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed ${
          isDayMode
            ? "bg-white/80 text-slate-700 hover:bg-white hover:shadow-lg"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </>
  );

  // Page 1: Hero
  const renderHeroPage = () => (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="relative mx-auto max-w-[1400px] text-center">
        <MotionDiv
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest mb-8 ${
            isDayMode ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
          }`}>
            <Sparkles className="h-3.5 w-3.5" />
            AI Build Arena 2026
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none mb-6">
            <span className="block">AI 全栈极速</span>
            <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              黑客松
            </span>
          </h1>

          <p className={`text-xl sm:text-2xl md:text-3xl font-medium mb-8 ${isDayMode ? "text-slate-600" : "text-white/70"}`}>
            {event.subtitle}
          </p>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-12">
            <div className={`flex items-center gap-2 px-5 py-3 rounded-full ${
              isDayMode ? "bg-white shadow-md" : "bg-white/10"
            }`}>
              <Calendar className={`h-5 w-5 ${isDayMode ? "text-cyan-600" : "text-cyan-400"}`} />
              <span className="text-sm sm:text-base font-medium">{event.date}</span>
            </div>
            <div className={`flex items-center gap-2 px-5 py-3 rounded-full ${
              isDayMode ? "bg-white shadow-md" : "bg-white/10"
            }`}>
              <MapPin className={`h-5 w-5 ${isDayMode ? "text-cyan-600" : "text-cyan-400"}`} />
              <span className="text-sm sm:text-base font-medium">{event.location}</span>
            </div>
          </div>

          <button
            onClick={goToNext}
            className={`group inline-flex items-center gap-3 px-8 py-4 rounded-full text-lg font-bold transition-all duration-300 ${
              isDayMode
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/40 hover:-translate-y-1"
                : "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-xl shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/40 hover:-translate-y-1"
            }`}
          >
            立即报名
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <ArrowDown className={`h-8 w-8 animate-bounce ${isDayMode ? "text-slate-400" : "text-white/40"}`} />
        </MotionDiv>
      </div>
    </div>
  );

  // Page 2: Info
  const renderInfoPage = () => (
    <div className="flex h-full w-full items-center justify-center p-6 overflow-y-auto">
      <div className="relative mx-auto max-w-[1400px] w-full py-12">
        <MotionDiv
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid gap-8 lg:grid-cols-2"
        >
          {/* Left: Event Info */}
          <div className="space-y-6">
            <h2 className="text-4xl sm:text-5xl font-black">
              比赛<span className="text-cyan-400">信息</span>
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Calendar, label: "比赛时间", value: event.date },
                { icon: MapPin, label: "比赛地点", value: event.location },
                { icon: Users, label: "比赛形式", value: event.format },
                { icon: Clock, label: "比赛时长", value: event.duration },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-2xl border p-5 ${
                    isDayMode
                      ? "border-slate-200 bg-white shadow-md"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <item.icon className={`h-6 w-6 mb-3 ${isDayMode ? "text-cyan-600" : "text-cyan-400"}`} />
                  <p className={`text-xs mb-1 ${isDayMode ? "text-slate-500" : "text-white/50"}`}>{item.label}</p>
                  <p className="text-lg font-bold">{item.value}</p>
                </div>
              ))}
            </div>

            <p className={`text-base leading-relaxed ${isDayMode ? "text-slate-600" : "text-white/70"}`}>
              {event.description}
            </p>

            {/* Partners */}
            <div>
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Trophy className={`h-5 w-5 ${isDayMode ? "text-cyan-600" : "text-cyan-400"}`} />
                合作方
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.partners.map((partner, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold ${
                      isDayMode
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                        : "bg-gradient-to-r from-cyan-400 to-blue-500 text-white"
                    }`}
                  >
                    {partner}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: AI Ecosystem */}
          <div className={`rounded-3xl border p-8 ${
            isDayMode
              ? "border-slate-200 bg-white shadow-lg"
              : "border-white/10 bg-white/5"
          }`}>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  AI 生态团队
                </h3>
                <p className={`text-sm ${isDayMode ? "text-slate-600" : "text-white/70"}`}>
                  汇聚学校、社团与企业三方力量，共建 AI 创新生态
                </p>
              </div>
              <Link
                to="/about"
                className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                了解更多
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="space-y-5">
              {[
                { title: "学校", items: ["未来学习中心", "AI 联合实验室"], color: "from-indigo-500 to-purple-500" },
                { title: "社团", items: ["XLAB", "ZJUAI", "EAI", "AIRA", "KAB"], color: "from-purple-500 to-pink-500" },
                { title: "企业", items: ["Minimax", "阿里云", "魔搭", "阶跃星辰"], color: "from-cyan-500 to-blue-500" },
              ].map((group, idx) => (
                <div key={idx}>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full bg-gradient-to-r ${group.color}`} />
                    {group.title}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {group.items.map((item, itemIdx) => (
                      <span
                        key={itemIdx}
                        className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold bg-gradient-to-r ${group.color} text-white shadow-md`}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MotionDiv>
      </div>
    </div>
  );

  // Page 3: Registration Form
  const renderFormPage = () => (
    <div className="flex h-full w-full items-center justify-center p-6 overflow-y-auto">
      <div className="relative mx-auto max-w-[800px] w-full py-12">
        <MotionDiv
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`rounded-3xl border p-8 sm:p-10 ${
            isDayMode
              ? "border-slate-200 bg-white shadow-xl"
              : "border-white/10 bg-white/5"
          }`}
        >
          <div className="text-center mb-8">
            <h2 className="text-4xl sm:text-5xl font-black mb-3">
              报名<span className="text-cyan-400">参赛</span>
            </h2>
            <p className={`text-base ${isDayMode ? "text-slate-600" : "text-white/70"}`}>
              填写以下信息完成报名
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDayMode ? "text-slate-700" : "text-white/90"}`}>
                  姓名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange("name")}
                  placeholder="请输入姓名"
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                    isDayMode
                      ? "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      : "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  } ${formErrors.name ? "border-rose-500" : ""}`}
                />
                {formErrors.name && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDayMode ? "text-slate-700" : "text-white/90"}`}>
                  学号 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={handleInputChange("studentId")}
                  placeholder="请输入学号"
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                    isDayMode
                      ? "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      : "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  } ${formErrors.studentId ? "border-rose-500" : ""}`}
                />
                {formErrors.studentId && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.studentId}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDayMode ? "text-slate-700" : "text-white/90"}`}>
                  专业 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.major}
                  onChange={handleInputChange("major")}
                  placeholder="请输入专业"
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                    isDayMode
                      ? "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      : "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  } ${formErrors.major ? "border-rose-500" : ""}`}
                />
                {formErrors.major && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.major}
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${isDayMode ? "text-slate-700" : "text-white/90"}`}>
                  年级 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.grade}
                  onChange={handleInputChange("grade")}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                    isDayMode
                      ? "border-slate-200 bg-slate-50 text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                      : "border-white/10 bg-white/5 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  } ${formErrors.grade ? "border-rose-500" : ""}`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='${encodeURIComponent(isDayMode ? "#6b7280" : "#94a3b8")}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 0.75rem center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "1.25em 1.25em",
                    paddingRight: "2.5rem",
                    appearance: "none",
                  }}
                >
                  <option value="" style={{ backgroundColor: isDayMode ? "#fff" : "#0f172a", color: isDayMode ? "#0f172a" : "#fff" }}>请选择年级</option>
                  {gradeOptions.map((option) => (
                    <option key={option.value} value={option.value} style={{ backgroundColor: isDayMode ? "#fff" : "#0f172a", color: isDayMode ? "#0f172a" : "#fff" }}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {formErrors.grade && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {formErrors.grade}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-3 ${isDayMode ? "text-slate-700" : "text-white/90"}`}>
                常用 AI 工具 <span className="text-rose-500">*</span>（可多选）
              </label>
              <div className="flex flex-wrap gap-2">
                {aiToolOptions.map((tool) => {
                  const isSelected = formData.aiTools.includes(tool.value);
                  return (
                    <button
                      key={tool.value}
                      type="button"
                      onClick={() => handleToolToggle(tool.value)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md"
                          : isDayMode
                          ? "border border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-300"
                          : "border border-white/10 bg-white/5 text-white/70 hover:border-cyan-400"
                      }`}
                    >
                      {isSelected && <CheckCircle className="mr-1.5 inline h-4 w-4" />}
                      {tool.label}
                    </button>
                  );
                })}
              </div>
              {formErrors.aiTools && (
                <p className="mt-2 flex items-center gap-1 text-xs text-rose-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {formErrors.aiTools}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-4 rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-4"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  提交中...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  提交报名
                  <Send className="h-5 w-5" />
                </span>
              )}
            </button>
          </form>
        </MotionDiv>
      </div>
    </div>
  );

  const pages = [renderHeroPage, renderInfoPage, renderFormPage];

  return (
    <div
      ref={containerRef}
      className={`relative h-[100svh] overflow-hidden ${
        isDayMode
          ? "bg-[linear-gradient(135deg,#f6f8fb_0%,#e8f4f8_50%,#f6f8fb_100%)]"
          : "bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.12),transparent_50%),#030304]"
      }`}
    >
      <SEO
        title={`${event.title}报名`}
        description={`${event.title} - ${event.subtitle}。在限定时间内独立完成一个可运行的 AI 应用。`}
      />

      <PageIndicator />
      <NavArrows />

      <AnimatePresence mode="wait" custom={direction}>
        <MotionDiv
          key={currentPage}
          custom={direction}
          variants={shouldAnimate ? pageVariants : undefined}
          initial={shouldAnimate ? "enter" : false}
          animate="center"
          exit={shouldAnimate ? "exit" : false}
          transition={{
            duration: shouldAnimate ? 0.4 : 0,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute inset-0"
        >
          {pages[currentPage]()}
        </MotionDiv>
      </AnimatePresence>
    </div>
  );
};

export default HackathonRegistration;
