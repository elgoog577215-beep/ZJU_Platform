import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
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
  Zap,
  Cpu,
  Code2,
  Rocket,
   ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";
import api from "../services/api";
import SEO from "./SEO";

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
    ? "inline-flex items-center justify-center gap-2 rounded-full border border-transparent bg-[linear-gradient(135deg,#4f46e5_0%,#6366f1_100%)] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(99,102,241,0.35)] transition-all duration-300 hover:shadow-[0_12px_28px_rgba(99,102,241,0.45)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    : "inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0";

  const labelClass = isDayMode ? "text-slate-500" : "text-white/45";
  const softTextClass = isDayMode ? "text-slate-500" : "text-white/50";
  const chipClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,255,0.9))] text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.1)]"
    : "border-white/10 bg-white/[0.05] text-white/72";

  const hackathonTitle = settings.hackathon_title || "AI 全栈极速黑客松";
  const hackathonSubtitle = settings.hackathon_subtitle || "5 小时极速开发 · 纯个人参赛 · AI 原生创作";
  const hackathonDate = settings.hackathon_date || "5 月 10 日 9:00 A.M.";
  const hackathonLocation = settings.hackathon_location || "北 1-114";
  const hackathonFormat = settings.hackathon_format || "个人赛";
  const hackathonDuration = settings.hackathon_duration || "5 小时";
  const hackathonDesc = settings.hackathon_desc || "AI 全栈极速黑客松是以 AI 原生开发为核心的技术赛事，参赛者需在 5 小时内独立完成一个完整的 AI 应用项目。比赛强调快速原型开发、AI 工具运用与创新思维。";

  const partnersRaw = settings.hackathon_partners || "Minimax，阿里云，魔搭，阶跃星辰";
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
        description="AI 全栈极速黑客松 - 5 小时极速开发，纯个人参赛，AI 原生创作。立即报名！"
      />

      {/* Hero Section - Compact */}
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
              <div className="grid gap-8 lg:grid-cols-3 lg:items-center">
                <div className="lg:col-span-2">
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
                    <button onClick={scrollToForm} className={primaryButtonClass}>
                      立即报名
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* AI 生态团队介绍 */}
                <div className="lg:border-l lg:border-white/10 lg:pl-8">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className={`text-lg font-bold mb-2 ${isDayMode ? "text-slate-900" : "text-white"} flex items-center gap-2`}>
                        <div className={`h-2 w-2 rounded-full ${isDayMode ? "bg-indigo-600" : "bg-cyan-400"}`} />
                        AI 生态团队
                      </h3>
                      <p className={`text-sm leading-relaxed ${isDayMode ? "text-slate-600" : "text-white/70"}`}>
                        汇聚学校、社团与企业三方力量，共建 AI 创新生态
                      </p>
                    </div>
                    <Link
                      to="/about"
                      className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                        isDayMode
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5"
                          : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 hover:-translate-y-0.5"
                      }`}
                    >
                      了解更多
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                  
                  <div className="space-y-5">
                    {/* 学校 */}
                    <div>
                      <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDayMode ? "text-slate-800" : "text-white/90"}`}>
                        <div className={`h-2 w-2 rounded-full ${isDayMode ? "bg-indigo-600" : "bg-cyan-400"}`} />
                        学校
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {["未来学习中心", "AI 联合实验室"].map((partner) => (
                          <span key={partner} className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm ${
                            isDayMode 
                              ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-indigo-200"
                              : "bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-lg shadow-cyan-500/10 ring-1 ring-inset ring-cyan-400/30"
                          }`}>
                            {partner}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* 社团 */}
                    <div>
                      <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDayMode ? "text-slate-800" : "text-white/90"}`}>
                        <div className={`h-2 w-2 rounded-full ${isDayMode ? "bg-indigo-600" : "bg-cyan-400"}`} />
                        社团
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {["XLAB", "ZJUAI", "EAI", "AIRA", "KAB"].map((partner) => (
                          <span key={partner} className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm ${
                            isDayMode 
                              ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-purple-200"
                              : "bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-lg shadow-cyan-500/10 ring-1 ring-inset ring-cyan-400/30"
                          }`}>
                            {partner}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* 企业 */}
                    <div>
                      <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${isDayMode ? "text-slate-800" : "text-white/90"}`}>
                        <div className={`h-2 w-2 rounded-full ${isDayMode ? "bg-indigo-600" : "bg-cyan-400"}`} />
                        企业
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {["minimax", "阿里云", "魔搭", "阶跃星辰"].map((partner) => (
                          <span key={partner} className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm ${
                            isDayMode 
                              ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-blue-200"
                              : "bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-lg shadow-cyan-500/10 ring-1 ring-inset ring-cyan-400/30"
                          }`}>
                            {partner}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Info & Form Grid - Side by Side */}
      <section className="px-4 pb-12 md:px-8 md:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Info Cards */}
            <motion.div 
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {/* Stats Grid */}
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
                <p className={`mt-4 text-sm ${softTextClass}`}>{hackathonDesc}</p>
              </div>

              {/* Partners */}
              <div className={`rounded-[24px] border p-5 ${shellClass}`}>
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Trophy className={`h-5 w-5 ${isDayMode ? "text-indigo-600" : "text-cyan-400"}`} />
                  合作方
                </h2>
                <div className="flex flex-wrap gap-2">
                  {partners.map((partner, index) => (
                    <div key={index} className={`rounded-lg border px-4 py-2 text-sm font-medium ${chipClass}`}>
                      {partner}
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className={`rounded-[24px] border p-5 ${shellClass}`}>
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Cpu className={`h-5 w-5 ${isDayMode ? "text-indigo-500" : "text-cyan-400"}`} />
                  核心挑战
                </h2>
                <div className="grid gap-2">
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
                </div>
              </div>
            </motion.div>

            {/* Registration Form */}
            <motion.div 
              id="registration-form"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className={`rounded-[24px] border p-5 ${shellClass}`}
            >
              <h2 className="text-2xl font-bold mb-2">报名参赛</h2>
              <p className={`mb-5 text-sm ${softTextClass}`}>填写以下信息完成报名</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>姓名 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange("name")}
                      placeholder="请输入姓名"
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all ${inputClass} ${formErrors.name ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                    />
                    {formErrors.name && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-rose-500">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>学号 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={formData.studentId}
                      onChange={handleInputChange("studentId")}
                      placeholder="请输入学号"
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all ${inputClass} ${formErrors.studentId ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                    />
                    {formErrors.studentId && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-rose-500">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.studentId}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>专业 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={formData.major}
                      onChange={handleInputChange("major")}
                      placeholder="请输入专业"
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all ${inputClass} ${formErrors.major ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                    />
                    {formErrors.major && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-rose-500">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.major}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${labelClass}`}>年级 <span className="text-rose-500">*</span></label>
                    <select
                      value={formData.grade}
                      onChange={handleInputChange("grade")}
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all ${inputClass} ${formErrors.grade ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                      style={{
                        backgroundImage: isDayMode 
                          ? `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
                          : `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: `right 0.5rem center`,
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem',
                        appearance: 'none',
                        MozAppearance: 'none',
                        WebkitAppearance: 'none',
                        backgroundColor: isDayMode 
                          ? 'linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,247,255,0.9))'
                          : 'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',
                      }}
                    >
                      <option value="" style={{ backgroundColor: isDayMode ? '#fff' : '#0f172a', color: isDayMode ? '#0f172a' : '#fff' }}>请选择年级</option>
                      {gradeOptions.map((option) => (
                        <option key={option.value} value={option.value} style={{ backgroundColor: isDayMode ? '#fff' : '#0f172a', color: isDayMode ? '#0f172a' : '#fff' }}>{option.label}</option>
                      ))}
                    </select>
                    {formErrors.grade && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-rose-500">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.grade}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-2 ${labelClass}`}>
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
                          className={`rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                            isSelected
                              ? isDayMode
                                ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                                : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                              : chipClass
                          }`}
                        >
                          {isSelected && <CheckCircle className="mr-1 inline h-3 w-3" />}
                          {tool.label}
                        </button>
                      );
                    })}
                  </div>
                  {formErrors.aiTools && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.aiTools}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full ${primaryButtonClass} py-3 text-sm mt-2`}
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
        </div>
      </section>
    </div>
  );
};

export default HackathonRegistration;
