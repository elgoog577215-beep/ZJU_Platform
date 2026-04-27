import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Trophy,
  Sparkles,
  Send,
  CheckCircle,
  AlertCircle,
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

const HackathonRegistration = () => {
  const { settings, uiMode } = useSettings();
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion;
  const isDayMode = uiMode === "day";

  const [formData, setFormData] = useState({
    name: "",
    studentId: "",
    major: "",
    grade: "",
    aiTools: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const pageClass = isDayMode
    ? "bg-[radial-gradient(circle_at_14%_8%,rgba(125,211,252,0.24),transparent_24%),radial-gradient(circle_at_84%_10%,rgba(129,140,248,0.2),transparent_22%),linear-gradient(180deg,#f7f9fc_0%,#eef4ff_46%,#f7f9fc_100%)] text-slate-950"
    : "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_22%),radial-gradient(circle_at_80%_14%,rgba(129,140,248,0.14),transparent_18%),linear-gradient(180deg,#030712_0%,#020617_42%,#02040c_100%)] text-white";

  const shellClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.7))] shadow-[0_34px_90px_rgba(148,163,184,0.16)] backdrop-blur-xl"
    : "border-white/10 bg-white/[0.045] shadow-[0_40px_120px_rgba(2,6,23,0.5)]";

  const inputClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,247,255,0.9))] text-slate-900 placeholder:text-slate-400 shadow-[0_10px_24px_rgba(148,163,184,0.08)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
    : "border-white/10 bg-white/[0.04] text-white placeholder:text-white/26 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10";

  const primaryButtonClass = isDayMode
    ? "inline-flex items-center justify-center gap-2 rounded-full border border-indigo-300/20 bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] px-6 py-3 text-sm font-medium text-white shadow-[0_18px_34px_rgba(99,102,241,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(99,102,241,0.32)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    : "inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0";

  const labelClass = isDayMode ? "text-slate-500" : "text-white/45";
  const softTextClass = isDayMode ? "text-slate-500" : "text-white/50";
  const chipClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,255,0.9))] text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.1)]"
    : "border-white/10 bg-white/[0.05] text-white/72";

  const hackathonTitle = settings.hackathon_title || "AI 全栈极速黑客松";
  const hackathonSubtitle = settings.hackathon_subtitle || "5小时极速开发 · 纯个人参赛 · AI 原生创作";
  const hackathonDate = settings.hackathon_date || "待定";
  const hackathonLocation = settings.hackathon_location || "浙江大学";
  const hackathonFormat = settings.hackathon_format || "个人赛";
  const hackathonDuration = settings.hackathon_duration || "5小时";
  const hackathonDesc = settings.hackathon_desc || "AI 全栈极速黑客松是以 AI 原生开发为核心的技术赛事，参赛者需在 5 小时内独立完成一个完整的 AI 应用项目。比赛强调快速原型开发、AI 工具运用与创新思维。";

  const partnersRaw = settings.hackathon_partners || "未来学习中心,ZJUAI,XLab";
  const partners = partnersRaw.split(",").map((s) => s.trim()).filter(Boolean);

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

  const scrollToForm = () => {
    document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={`min-h-screen ${pageClass}`}>
      <SEO
        title="AI 全栈极速黑客松报名"
        description="AI 全栈极速黑客松 - 5小时极速开发，纯个人参赛，AI 原生创作。立即报名参加！"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+64px)] pb-12 md:px-8 md:pb-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={`absolute left-[-12%] top-[4%] h-[520px] w-[520px] rounded-full blur-[140px] ${isDayMode ? "bg-sky-300/24" : "bg-cyan-500/12"}`} />
          <div className={`absolute right-[-10%] top-[18%] h-[440px] w-[440px] rounded-full blur-[150px] ${isDayMode ? "bg-indigo-300/22" : "bg-indigo-500/12"}`} />
        </div>

        <div className="mx-auto flex min-h-0 max-w-7xl flex-col justify-center gap-6 sm:min-h-[calc(100svh-128px)] sm:gap-12 lg:gap-16">
          <motion.div {...sectionReveal(shouldAnimate)} className={`relative overflow-hidden rounded-[32px] border md:rounded-[40px] ${shellClass}`}>
            <div className="relative z-10 px-6 py-12 sm:px-10 sm:py-16 md:px-16 md:py-20">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className={`h-5 w-5 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                <span className={`text-sm font-medium ${softTextClass}`}>2026 赛事报名</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                {hackathonTitle}
              </h1>
              <p className={`mt-4 text-lg sm:text-xl ${softTextClass} max-w-2xl`}>
                {hackathonSubtitle}
              </p>
              <button onClick={scrollToForm} className={`mt-8 ${primaryButtonClass}`}>
                立即报名
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Info Section */}
      <section className="px-4 pb-12 md:px-8 md:pb-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...sectionReveal(shouldAnimate, 0.1)} className={`rounded-[32px] border p-6 sm:p-10 md:rounded-[40px] ${shellClass}`}>
            <h2 className="text-2xl font-bold sm:text-3xl mb-8">比赛信息</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className={`rounded-2xl border p-5 ${chipClass}`}>
                <Calendar className={`h-6 w-6 mb-3 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                <p className={`text-sm ${labelClass}`}>比赛时间</p>
                <p className="mt-1 font-semibold">{hackathonDate}</p>
              </div>
              <div className={`rounded-2xl border p-5 ${chipClass}`}>
                <MapPin className={`h-6 w-6 mb-3 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                <p className={`text-sm ${labelClass}`}>比赛地点</p>
                <p className="mt-1 font-semibold">{hackathonLocation}</p>
              </div>
              <div className={`rounded-2xl border p-5 ${chipClass}`}>
                <Users className={`h-6 w-6 mb-3 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                <p className={`text-sm ${labelClass}`}>比赛形式</p>
                <p className="mt-1 font-semibold">{hackathonFormat}</p>
              </div>
              <div className={`rounded-2xl border p-5 ${chipClass}`}>
                <Clock className={`h-6 w-6 mb-3 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                <p className={`text-sm ${labelClass}`}>比赛时长</p>
                <p className="mt-1 font-semibold">{hackathonDuration}</p>
              </div>
            </div>
            <p className={`mt-8 text-base sm:text-lg ${softTextClass}`}>{hackathonDesc}</p>
          </motion.div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="px-4 pb-12 md:px-8 md:pb-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...sectionReveal(shouldAnimate, 0.2)} className={`rounded-[32px] border p-6 sm:p-10 md:rounded-[40px] ${shellClass}`}>
            <h2 className="text-2xl font-bold sm:text-3xl mb-8 flex items-center gap-2">
              <Trophy className={`h-6 w-6 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
              合作方与支持单位
            </h2>
            <div className="flex flex-wrap gap-4">
              {partners.map((partner, index) => (
                <div key={index} className={`rounded-xl border px-6 py-4 text-lg font-medium ${chipClass}`}>
                  {partner}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Registration Form Section */}
      <section id="registration-form" className="px-4 pb-12 md:px-8 md:pb-24">
        <div className="mx-auto max-w-3xl">
          <motion.div {...sectionReveal(shouldAnimate, 0.3)} className={`rounded-[32px] border p-6 sm:p-10 md:rounded-[40px] ${shellClass}`}>
            <h2 className="text-2xl font-bold sm:text-3xl mb-2">报名参赛</h2>
            <p className={`mb-8 ${softTextClass}`}>填写以下信息完成报名，我们将在比赛前通过邮件通知你具体安排。</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>姓名 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange("name")}
                  placeholder="请输入你的姓名"
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${inputClass} ${formErrors.name ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                />
                {formErrors.name && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-rose-500">
                    <AlertCircle className="h-4 w-4" />
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* Student ID */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>学号 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={handleInputChange("studentId")}
                  placeholder="请输入你的学号"
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${inputClass} ${formErrors.studentId ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                />
                {formErrors.studentId && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-rose-500">
                    <AlertCircle className="h-4 w-4" />
                    {formErrors.studentId}
                  </p>
                )}
              </div>

              {/* Major */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>专业 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.major}
                  onChange={handleInputChange("major")}
                  placeholder="请输入你的专业"
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${inputClass} ${formErrors.major ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                />
                {formErrors.major && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-rose-500">
                    <AlertCircle className="h-4 w-4" />
                    {formErrors.major}
                  </p>
                )}
              </div>

              {/* Grade */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>年级 <span className="text-rose-500">*</span></label>
                <select
                  value={formData.grade}
                  onChange={handleInputChange("grade")}
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${inputClass} ${formErrors.grade ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                >
                  <option value="">请选择年级</option>
                  {gradeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {formErrors.grade && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-rose-500">
                    <AlertCircle className="h-4 w-4" />
                    {formErrors.grade}
                  </p>
                )}
              </div>

              {/* AI Tools */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${labelClass}`}>
                  常用 AI 工具 <span className="text-rose-500">*</span>（可多选）
                </label>
                <div className="flex flex-wrap gap-3">
                  {aiToolOptions.map((tool) => {
                    const isSelected = formData.aiTools.includes(tool.value);
                    return (
                      <button
                        key={tool.value}
                        type="button"
                        onClick={() => handleToolToggle(tool.value)}
                        className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition-all ${
                          isSelected
                            ? isDayMode
                              ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                              : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                            : chipClass
                        }`}
                      >
                        {isSelected && <CheckCircle className="mr-1.5 inline h-4 w-4" />}
                        {tool.label}
                      </button>
                    );
                  })}
                </div>
                {formErrors.aiTools && (
                  <p className="mt-2 flex items-center gap-1 text-sm text-rose-500">
                    <AlertCircle className="h-4 w-4" />
                    {formErrors.aiTools}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full ${primaryButtonClass} py-4 text-base`}
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    提交中...
                  </>
                ) : (
                  <>
                    提交报名
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HackathonRegistration;
