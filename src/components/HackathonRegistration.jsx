import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  AlertCircle,
  Send,
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
    ? "inline-flex items-center justify-center gap-2 rounded-full border border-indigo-300/20 bg-[linear-gradient(135deg,#6366f1_0%,#4f46e5_100%)] px-6 py-3 text-sm font-medium text-white shadow-[0_18px_34px_rgba(99,102,241,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(99,102,241,0.32)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    : "inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-slate-950 transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0";

  const labelClass = isDayMode ? "text-slate-500" : "text-white/45";
  const softTextClass = isDayMode ? "text-slate-500" : "text-white/50";
  const chipClass = isDayMode
    ? "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,255,0.9))] text-slate-600 shadow-[0_12px_28px_rgba(148,163,184,0.1)]"
    : "border-white/10 bg-white/[0.05] text-white/72";

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

  return (
    <div className={`min-h-screen ${pageClass}`}>
      <SEO
        title="黑客松报名"
        description="填写报名信息，参与 AI 全栈极速黑客松"
      />

      {/* Registration Form Section */}
      <section className="px-4 py-12 md:px-8 md:py-24">
        <div className="mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className={`rounded-[24px] border p-5 sm:p-8 ${shellClass}`}
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">报名参赛</h1>
              <p className={`text-sm ${softTextClass}`}>填写以下信息完成 AI 全栈极速黑客松报名</p>
            </div>

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
      </section>
    </div>
  );
};

export default HackathonRegistration;
