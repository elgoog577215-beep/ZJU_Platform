import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Dna,
  GraduationCap,
  HeartPulse,
  Mail,
  Phone,
  Send,
  Sparkles,
  Trees,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";

import { useReducedMotion } from "../utils/animations";
import api from "../services/api";
import SEO from "./SEO";

const initialForm = {
  topic: "",
  name: "",
  age: "",
  gender: "",
  organization: "",
  email: "",
  phone: "",
  message: "",
};

const genderOptions = ["男", "女"];

const validateForm = (formData) => {
  const errors = {};
  const age = Number(formData.age);

  if (!formData.topic.trim()) errors.topic = "请填写揭榜问题。";
  if (!formData.name.trim()) errors.name = "请填写姓名。";
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    errors.age = "请填写有效年龄。";
  }
  if (!formData.gender) errors.gender = "请选择性别。";
  if (!formData.organization.trim()) errors.organization = "请填写学校或组织。";
  if (!formData.email.trim() && !formData.phone.trim()) {
    errors.contact = "请至少填写邮箱或电话号码中的一项。";
  }
  if (
    formData.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
  ) {
    errors.email = "邮箱格式不正确。";
  }

  return errors;
};

const Field = ({ label, required, error, children }) => (
  <div>
    <label className="mb-2 block text-sm font-bold text-white/72">
      {label} {required ? <span className="text-rose-300">*</span> : null}
    </label>
    {children}
    {error ? (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-300">
        <AlertCircle className="h-3.5 w-3.5" />
        {error}
      </p>
    ) : null}
  </div>
);

const FutureLearningCenter = () => {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const inputClass =
    "w-full min-h-12 border border-white/12 bg-black/24 px-4 py-3 text-[16px] leading-6 text-white outline-none transition duration-200 placeholder:text-white/32 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/12 sm:text-sm";
  const inputErrorClass =
    "border-rose-500 focus:border-rose-500 focus:ring-rose-500/12";

  const reveal = useMemo(
    () =>
      shouldAnimate
        ? {
            initial: { opacity: 0, y: 24 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, amount: 0.22 },
            transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          }
        : {},
    [shouldAnimate],
  );

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (formErrors[field] || formErrors.contact) {
      setFormErrors((previous) => {
        const next = { ...previous };
        delete next[field];
        if (field === "email" || field === "phone") delete next.contact;
        return next;
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("请检查并完善报名信息");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post("/future-learning/register", formData, { noRetry: true });
      setSubmitted(true);
      setFormData(initialForm);
      setFormErrors({});
      toast.success("提交成功，项目组将与您联络");
    } catch (error) {
      toast.error(error?.response?.data?.error || "提交失败，请稍后再试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[#030812] text-white"
      style={{
        fontFamily:
          '"Inter", "HarmonyOS Sans SC", "MiSans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      }}
    >
      <SEO
        title="未来学习中心"
        description="浙江大学未来学习中心 · 「智能生命健康」项目 · 问题揭榜报名"
      />

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(46,230,214,0.18),transparent_55%),radial-gradient(ellipse_90%_60%_at_100%_50%,rgba(124,58,237,0.12),transparent_50%),radial-gradient(ellipse_70%_50%_at_0%_100%,rgba(46,230,214,0.08),transparent_45%),#030812]" />
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(46,230,214,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(46,230,214,0.045)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_90%_70%_at_50%_30%,black_20%,transparent_70%)]" />
        <motion.div
          aria-hidden="true"
          animate={shouldAnimate ? { y: [0, -18, 0], scale: [1, 1.04, 1] } : undefined}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-0 top-[14%] h-64 w-64 rounded-full bg-cyan-300/28 blur-[92px] sm:-left-24 sm:h-80 sm:w-80"
        />
        <motion.div
          aria-hidden="true"
          animate={shouldAnimate ? { y: [0, 20, 0], x: [0, -14, 0] } : undefined}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[12%] right-0 h-72 w-72 rounded-full bg-violet-500/20 blur-[105px] sm:-right-28 sm:h-96 sm:w-96"
        />
      </div>

      <div className="pointer-events-none fixed inset-y-0 left-0 hidden w-[220px] opacity-35 lg:block">
        <DnaRibbon />
      </div>
      <div className="pointer-events-none fixed inset-y-0 right-0 hidden w-[220px] scale-x-[-1] opacity-35 lg:block">
        <DnaRibbon />
      </div>

      <main
        id="main-content"
        className="relative z-10 px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-[calc(env(safe-area-inset-top)+84px)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top)+104px)] lg:px-10 lg:pb-24"
      >
        <section className="mx-auto grid max-w-7xl items-start gap-8 lg:min-h-[calc(100svh-132px)] lg:grid-cols-[minmax(0,0.98fr)_minmax(420px,0.82fr)] lg:items-center xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.82fr)]">
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 28 } : false}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-200/30 bg-cyan-200/10 px-3 py-2 text-[11px] font-extrabold leading-none text-cyan-100 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-cyan-200 sm:h-4 sm:w-4" />
              Future Learning · Med Tech
            </div>
            <h1 className="mt-6 max-w-5xl text-[2.35rem] font-extrabold leading-[1.06] text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.2rem]">
              浙江大学未来学习中心
              <span className="mt-2 block bg-gradient-to-r from-cyan-200 via-white to-violet-200 bg-clip-text text-transparent sm:mt-3">
                「智能生命健康」项目
              </span>
              <span className="mt-2 block text-cyan-200 sm:mt-3">问题揭榜报名</span>
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-slate-300 sm:mt-7 sm:text-lg sm:leading-8">
              面向未来的学习场景与医学交叉探索。提交你希望揭榜或深入探讨的问题方向，项目组将根据内容进一步联络确认。
            </p>
            <div className="mt-7 grid grid-cols-3 gap-2 sm:mt-9 sm:gap-3">
              {[
                { label: "问题驱动", value: "揭榜", icon: Trees },
                { label: "学习场景", value: "未来", icon: GraduationCap },
                { label: "医学交叉", value: "共创", icon: HeartPulse },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-lg border border-cyan-200/18 bg-white/[0.055] p-3 backdrop-blur-xl sm:p-4"
                  >
                    <Icon className="h-4 w-4 text-cyan-200 sm:h-5 sm:w-5" />
                    <div className="mt-3 text-2xl font-extrabold leading-none text-white sm:mt-4 sm:text-3xl">
                      {item.value}
                    </div>
                    <div className="mt-2 text-[11px] font-semibold leading-4 text-slate-400 sm:text-xs">
                      {item.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.aside
            initial={shouldAnimate ? { opacity: 0, scale: 0.96, y: 24 } : false}
            animate={shouldAnimate ? { opacity: 1, scale: 1, y: 0 } : undefined}
            transition={{ duration: 0.72, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-lg border border-cyan-200/24 bg-slate-950/72 p-4 shadow-[0_32px_120px_rgba(0,0,0,0.38)] backdrop-blur-2xl sm:p-6 lg:p-7"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(46,230,214,0.16),transparent_36%),linear-gradient(135deg,rgba(124,58,237,0.16),transparent_42%)]" />
            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold text-cyan-200">
                    Challenge Brief
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">揭榜说明</h2>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-200/30 bg-cyan-200/10 text-cyan-100 sm:h-14 sm:w-14">
                  <HeartPulse className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>
              </div>
              <p className="mt-4 text-[15px] leading-7 text-slate-300 sm:mt-6 sm:text-base sm:leading-8">
                提交您希望探讨或揭榜的问题方向，填写联系方式便于未来学习中心项目组与您确认细节。信息仅用于本项目联络。
              </p>
              <div className="mt-6 grid gap-2 sm:mt-8 sm:gap-px sm:overflow-hidden sm:rounded-lg sm:border sm:border-cyan-200/18 sm:bg-cyan-200/18">
                {[
                  ["01", "提出问题", "描述具体场景、痛点或研究方向"],
                  ["02", "项目组联络", "根据联系方式确认细节与参与方式"],
                  ["03", "进入共创", "形成可讨论、可推进、可沉淀的问题清单"],
                ].map(([index, title, text]) => (
                  <div key={index} className="rounded-lg border border-cyan-200/12 bg-slate-950/76 p-3 sm:rounded-none sm:border-0 sm:p-4">
                    <div className="font-mono text-xs font-extrabold text-cyan-200">
                      {index}
                    </div>
                    <div className="mt-1 text-base font-extrabold sm:mt-2 sm:text-lg">{title}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.aside>
        </section>

        <motion.section
          {...reveal}
          id="registration-form"
          className="relative mx-auto mt-14 max-w-7xl lg:mt-20"
        >
          <div className="pointer-events-none absolute -left-4 top-8 hidden font-black uppercase leading-none tracking-[-0.08em] text-white/[0.035] text-[17vw] lg:block">
            APPLY
          </div>
          <div className="relative grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div className="lg:sticky lg:top-28">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-200">
                Register
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                报名信息
              </h2>
              <p className="mt-5 max-w-md text-base leading-8 text-white/70">
                填写问题方向与基础联系方式后提交报名。项目组会根据内容进一步联络确认。
              </p>
            </div>

            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: 24 } : false}
              whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden border border-cyan-300/22 bg-[#081012]/86 p-5 shadow-[0_36px_120px_rgba(0,0,0,0.62)] backdrop-blur-2xl sm:p-7"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(103,232,249,0.12),transparent_32%),radial-gradient(circle_at_12%_88%,rgba(99,102,241,0.10),transparent_28%)]" />
              <div className="relative mb-6 flex items-center justify-between gap-4 border-b border-cyan-300/14 pb-5">
                <div>
                  <h3 className="text-2xl font-black">报名信息</h3>
                  <p className="mt-1 text-sm text-white/46">
                    所有带 * 的字段均为必填
                  </p>
                </div>
                <HeartPulse className="h-7 w-7 text-cyan-300" />
              </div>

              <form onSubmit={handleSubmit} className="relative space-y-5">
                <Field label="揭榜问题" required error={formErrors.topic}>
                  <textarea
                    value={formData.topic}
                    onChange={updateField("topic")}
                    maxLength={2000}
                    rows={4}
                    placeholder="简要描述您希望揭榜或深入探讨的问题方向..."
                    className={`${inputClass} resize-none rounded-xl px-5 py-4 leading-7 ${
                      formErrors.topic ? inputErrorClass : ""
                    }`}
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="姓名" required error={formErrors.name}>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-200/70" />
                      <input
                        value={formData.name}
                        onChange={updateField("name")}
                        maxLength={64}
                        autoComplete="name"
                        placeholder="真实姓名或常用称呼"
                        className={`${inputClass} pl-11 ${
                          formErrors.name ? inputErrorClass : ""
                        }`}
                      />
                    </div>
                  </Field>
                  <Field label="年龄" required error={formErrors.age}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="120"
                      value={formData.age}
                      onChange={updateField("age")}
                      placeholder="周岁"
                      className={`${inputClass} ${
                        formErrors.age ? inputErrorClass : ""
                      }`}
                    />
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="性别" required error={formErrors.gender}>
                    <select
                      value={formData.gender}
                      onChange={updateField("gender")}
                      className={`${inputClass} appearance-none ${
                        formErrors.gender ? inputErrorClass : ""
                      }`}
                    >
                      <option value="" className="bg-slate-950 text-white">
                        请选择
                      </option>
                      {genderOptions.map((option) => (
                        <option
                          key={option}
                          value={option}
                          className="bg-slate-950 text-white"
                        >
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="学校或组织"
                    required
                    error={formErrors.organization}
                  >
                    <input
                      value={formData.organization}
                      onChange={updateField("organization")}
                      maxLength={128}
                      placeholder="所在院校、院系或单位名称"
                      className={`${inputClass} ${
                        formErrors.organization ? inputErrorClass : ""
                      }`}
                    />
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="邮箱" error={formErrors.email || formErrors.contact}>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-200/70" />
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={updateField("email")}
                        maxLength={128}
                        placeholder="name@example.com"
                        className={`${inputClass} pl-11 ${
                          formErrors.email || formErrors.contact
                            ? inputErrorClass
                            : ""
                        }`}
                      />
                    </div>
                  </Field>
                  <Field label="电话号码" error={formErrors.contact}>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-200/70" />
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={updateField("phone")}
                        maxLength={20}
                        placeholder="11 位手机号或其他可接通号码"
                        className={`${inputClass} pl-11 ${
                          formErrors.contact ? inputErrorClass : ""
                        }`}
                      />
                    </div>
                  </Field>
                </div>

                <Field label="留言">
                  <textarea
                    value={formData.message}
                    onChange={updateField("message")}
                    maxLength={2000}
                    rows={3}
                    placeholder="补充说明、可参与时段、合作意向等（选填）"
                    className={`${inputClass} resize-none rounded-xl px-5 py-4 leading-7`}
                  />
                </Field>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group inline-flex min-h-12 w-full items-center justify-center gap-2 bg-cyan-300 px-6 text-sm font-black text-slate-950 shadow-[0_0_32px_rgba(103,232,249,0.28)] transition duration-200 hover:bg-white focus:outline-none focus:ring-4 focus:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-55"
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
            </motion.div>
          </div>
        </motion.section>

        <section className="mx-auto mt-12 max-w-7xl border-t border-cyan-200/16 py-8 text-sm leading-7 text-slate-400 lg:mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              浙江大学未来学习中心 · 「智能生命健康」项目
              <br />
              本页面仅供项目联络使用，请勿转发至公开渠道。
            </div>
            <a
              href="#main-content"
              className="inline-flex items-center gap-2 text-cyan-200 transition hover:text-white"
            >
              返回顶部
              <ArrowRight className="h-4 w-4 -rotate-90" />
            </a>
          </div>
        </section>
      </main>

      {submitted ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/78 p-4 backdrop-blur-md">
          <motion.div
            initial={shouldAnimate ? { opacity: 0, scale: 0.95, y: 12 } : false}
            animate={shouldAnimate ? { opacity: 1, scale: 1, y: 0 } : undefined}
            className="w-full max-w-sm border border-cyan-200/30 bg-slate-950/92 p-7 text-center shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="future-learning-success-title"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-200/10 text-cyan-200">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3
              id="future-learning-success-title"
              className="mt-4 text-xl font-black"
            >
              提交成功
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              我们已收到您的揭榜报名信息。项目组将通过您预留的联系方式与您联络，请保持畅通。
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-200/30 px-8 text-sm font-bold text-cyan-100 transition hover:bg-cyan-200/10"
            >
              关闭
            </button>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
};

const DnaRibbon = () => (
  <svg viewBox="0 0 100 880" preserveAspectRatio="xMidYMin slice" className="h-full w-full">
    <defs>
      <linearGradient id="future-dna-a" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5eead4" stopOpacity="0.95" />
        <stop offset="1" stopColor="#2ee6d6" stopOpacity="0.35" />
      </linearGradient>
      <linearGradient id="future-dna-b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c4b5fd" stopOpacity="0.85" />
        <stop offset="1" stopColor="#22d3ee" stopOpacity="0.4" />
      </linearGradient>
    </defs>
    <g>
      <path
        fill="none"
        stroke="url(#future-dna-a)"
        strokeWidth="2"
        strokeLinecap="round"
        d="M50 0 C82 70 18 130 50 200 C82 270 18 330 50 400 C82 470 18 530 50 600 C82 670 18 730 50 880"
      />
      <path
        fill="none"
        stroke="url(#future-dna-b)"
        strokeWidth="2"
        strokeLinecap="round"
        d="M50 0 C18 70 82 130 50 200 C18 270 82 330 50 400 C18 470 82 530 50 600 C18 670 82 730 50 880"
      />
      {Array.from({ length: 18 }).map((_, index) => {
        const y = index * 50;
        const flip = index % 2 === 0;
        return (
          <line
            key={y}
            x1={flip ? 30 : 70}
            y1={y}
            x2={flip ? 70 : 30}
            y2={y}
            stroke="rgba(200,230,255,0.28)"
            strokeWidth="0.8"
          />
        );
      })}
    </g>
  </svg>
);

export default FutureLearningCenter;
