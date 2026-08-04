import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
import {
    buildHackathonInitialAnswers,
    formatHackathonSchedule,
    getActiveHackathonFields,
    normalizeHackathonTemplate,
    splitHackathonTitle,
} from "../data/hackathonTemplate";
import { getPartnerDisplayName, getPartnerLogoSrc } from "../data/partnerLogos";
import { useSettings } from "../context/SettingsContext";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import { useSectionPager } from "../hooks/useSectionPager";
import { useReducedMotion } from "../utils/animations";
import api from "../services/api";
import SEO from "./SEO";

const hasCjkText = (value) => typeof value === "string" && /[\u3400-\u9fff]/.test(value);

const partnerEnglishNameMap = {
    未来学习中心: "Future Learning Center",
    "AI 联合实验室": "AI Joint Lab",
    "ModelScope 魔搭社区": "ModelScope",
    阿里云: "Alibaba Cloud",
    "阶跃 StepFun": "StepFun",
};

const getLocalizedPartnerDisplayName = (partner = {}, language = "zh") => {
    const displayName = getPartnerDisplayName(partner);
    if (!String(language).startsWith("en")) return displayName;
    return (
        partner.name_en ||
        partner.nameEn ||
        partnerEnglishNameMap[partner.name] ||
        partnerEnglishNameMap[displayName] ||
        (hasCjkText(displayName) ? "Partner" : displayName)
    );
};

const MotionDiv = motion.div;
const MotionSection = motion.section;
const officialWechatGroupImage = "/images/wechat-official-group.jpg";
const registrationSectionIds = ["hackathon-hero", "event-brief", "registration-form"];

const HackathonRegistration = ({ template }) => {
    const { i18n, t } = useTranslation();
    const { uiMode } = useSettings();
    const reduceMotion = useReducedMotion();
    const shouldAnimate = !reduceMotion;
    const isDayMode = uiMode === "day";
    const language = i18n.resolvedLanguage || i18n.language || "zh";
    const resolvedTemplate = useMemo(() => normalizeHackathonTemplate(template), [template]);
    const activeFormFields = useMemo(
        () => getActiveHackathonFields(resolvedTemplate),
        [resolvedTemplate]
    );
    const formConfig = resolvedTemplate.form;
    const { groups: ecosystemPartnerGroups, enterpriseLogoRows } = useEcosystemPartners();
    const enterpriseLogos = useMemo(() => enterpriseLogoRows.flat(), [enterpriseLogoRows]);
    const pageRef = useRef(null);
    const [activeSection, setActiveSection] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        const container = pageRef.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight - container.clientHeight;
            setScrollProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);

            const sectionElements = registrationSectionIds
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

    useSectionPager({
        containerRef: pageRef,
        sectionIds: registrationSectionIds,
        activeIndex: activeSection,
        setActiveIndex: setActiveSection,
        reduceMotion,
        minWidth: 0,
        lockMs: 860,
    });

    const [formData, setFormData] = useState(() => buildHackathonInitialAnswers(resolvedTemplate));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [coachQuery, setCoachQuery] = useState(
        t("hackathon.coach.default_query", "我不会前端但会用 Codex，适合参加吗？")
    );
    const [coachResult, setCoachResult] = useState(null);
    const [isCoachLoading, setIsCoachLoading] = useState(false);

    useEffect(() => {
        setCoachQuery(t("hackathon.coach.default_query", "我不会前端但会用 Codex，适合参加吗？"));
    }, [language, t]);

    useEffect(() => {
        const emptyAnswers = buildHackathonInitialAnswers(resolvedTemplate);
        setFormData((current) =>
            Object.fromEntries(
                activeFormFields.map((field) => [
                    field.id,
                    current[field.id] ?? emptyAnswers[field.id],
                ])
            )
        );
    }, [activeFormFields, resolvedTemplate]);

    const event = useMemo(
        () => ({
            ...resolvedTemplate.event,
            date: formatHackathonSchedule(resolvedTemplate.event),
            prize: `${resolvedTemplate.event.prizeValue} ${resolvedTemplate.event.prizeUnit}`.trim(),
        }),
        [resolvedTemplate]
    );

    const palette = isDayMode
        ? {
              page: "bg-[#f6f8fb] text-slate-950",
              panel: "border-slate-200/80 bg-white/86 shadow-[0_24px_70px_rgba(15,23,42,0.10)]",
              panelStrong: "border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.13)]",
              textSoft: "text-slate-600",
              textMuted: "text-slate-500",
              line: "border-slate-200",
              chip: "border-slate-200 bg-slate-50 text-slate-700",
              field: "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-100",
              primary:
                  "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-[0_18px_42px_rgba(6,182,212,0.28)] hover:from-cyan-600 hover:to-teal-600",
              secondary:
                  "border-slate-300 bg-white/80 text-slate-800 hover:border-cyan-400 hover:bg-white",
              accent: "text-cyan-700",
              accentLight: "text-cyan-600",
          }
        : {
              page: "bg-[#040506] text-white",
              panel: "border-white/10 bg-white/[0.055] shadow-[0_28px_90px_rgba(0,0,0,0.5)]",
              panelStrong:
                  "border-cyan-300/22 bg-[#081012]/86 shadow-[0_36px_120px_rgba(0,0,0,0.62)]",
              textSoft: "text-white/70",
              textMuted: "text-white/46",
              line: "border-white/10",
              chip: "border-white/10 bg-white/[0.06] text-white/78",
              field: "border-white/12 bg-black/24 text-white placeholder:text-white/32 focus:border-cyan-300/70 focus:ring-cyan-300/12",
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

    const eventMeta = [
        { index: "01", label: t("common.time", "时间"), value: event.date, icon: Calendar },
        { index: "02", label: t("common.location", "地点"), value: event.location, icon: MapPin },
        {
            index: "03",
            label: t("hackathon.event.format_label", "形式"),
            value: event.format,
            icon: Users,
        },
        {
            index: "04",
            label: t("hackathon.event.prize_pool", "奖金池"),
            value: event.prize,
            icon: Trophy,
        },
    ];

    const ruleIcons = [Code2, Rocket, ShieldCheck, Cpu, Sparkles];
    const challenges = resolvedTemplate.rules
        .filter((rule) => rule.enabled)
        .map((rule, index) => ({
            ...rule,
            text: rule.description,
            icon: ruleIcons[index % ruleIcons.length],
        }));

    const ecosystemGroups = ecosystemPartnerGroups.map((group) => ({
        label: t(`hackathon.partners.group_${group.id}`, group.shortLabel),
        partners: group.partners.map((partner) =>
            getLocalizedPartnerDisplayName(partner, language)
        ),
    }));

    const heroStats = event.highlights.slice(0, 3);
    const titleLines = splitHackathonTitle(event.title);
    const boardLines = event.subtitle
        .split(/[、|]/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 3);

    const sectionAnchors = [
        { id: "hackathon-hero", label: t("hackathon.nav.home", "主页"), icon: Sparkles, index: 0 },
        { id: "event-brief", label: t("hackathon.nav.rules", "赛制"), icon: Trophy, index: 1 },
        {
            id: "registration-form",
            label: t("hackathon.nav.register", "报名"),
            icon: Send,
            index: 2,
        },
    ];

    const updateAnswer = (fieldId, value) => {
        setFormData((prev) => ({ ...prev, [fieldId]: value }));
        if (formErrors[fieldId]) {
            setFormErrors((prev) => {
                const next = { ...prev };
                delete next[fieldId];
                return next;
            });
        }
    };

    const handleMultiSelectToggle = (fieldId, option) => {
        setFormData((prev) => {
            const current = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
            const values = current.includes(option)
                ? current.filter((item) => item !== option)
                : [...current, option];
            return { ...prev, [fieldId]: values };
        });
        if (formErrors[fieldId]) {
            setFormErrors((prev) => {
                const next = { ...prev };
                delete next[fieldId];
                return next;
            });
        }
    };

    const validateForm = () => {
        const errors = {};
        activeFormFields.forEach((field) => {
            const value = formData[field.id];
            const missing =
                value === undefined ||
                value === null ||
                value === "" ||
                value === false ||
                (Array.isArray(value) && value.length === 0);
            if (field.required && missing) errors[field.id] = `请填写${field.label}`;
            if (
                field.type === "email" &&
                value &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
            ) {
                errors[field.id] = `${field.label}格式不正确`;
            }
        });
        return errors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            toast.error(t("hackathon.toast.check_form", "请检查并完善报名信息"));
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(
                "/hackathon/register",
                {
                    eventKey: resolvedTemplate.event.key,
                    answers: formData,
                    templateRevision: resolvedTemplate.revision,
                    name: formData.name,
                    studentId: formData.studentId,
                    major: formData.major,
                    grade: formData.grade,
                    aiTools: formData.aiTools,
                    experience: formData.experience,
                },
                { noRetry: true }
            );
            toast.success(formConfig.successMessage);
            setFormData(buildHackathonInitialAnswers(resolvedTemplate));
        } catch (error) {
            const message =
                error?.response?.data?.error || t("hackathon.toast.failed", "报名失败，请稍后重试");
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const askHackathonCoach = async (prompt = coachQuery) => {
        const query = prompt.trim();
        if (!query) {
            toast.error(t("hackathon.coach.empty_query", "先告诉 AI 你想判断什么"));
            return;
        }

        setCoachQuery(query);
        setCoachResult(null);
        setIsCoachLoading(true);
        try {
            const response = await api.post(
                "/hackathon/assistant",
                {
                    query,
                    eventKey: resolvedTemplate.event.key,
                    major: formData.major,
                    grade: formData.grade,
                    aiTools: formData.aiTools,
                    experience: formData.experience,
                },
                { noRetry: true }
            );
            setCoachResult(response.data);
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                t("hackathon.coach.failed", "AI 教练暂时没有回应，请稍后再试");
            toast.error(message);
        } finally {
            setIsCoachLoading(false);
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
            data-registration-page
            className={`hackathon-registration-scroll h-[100svh] min-w-0 max-w-full snap-y snap-proximity overflow-y-auto overflow-x-hidden scroll-smooth overscroll-y-contain ${palette.page}`}
        >
            <SEO
                title={t("hackathon.meta_title", { title: event.title })}
                description={t("hackathon.meta_desc", {
                    title: event.title,
                    subtitle: event.subtitle,
                })}
            />

            {/* Scroll Progress Bar */}
            <div className="fixed left-0 right-0 top-[env(safe-area-inset-top)] z-50 h-0.5">
                <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-150"
                    style={{ width: `${scrollProgress}%` }}
                />
            </div>

            {/* Desktop Navigation Dots */}
            <div className="fixed right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-3 xl:flex min-[1720px]:right-6 min-[1720px]:gap-4">
                {sectionAnchors.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => smoothScrollTo(item.id)}
                        className={`group relative flex items-center gap-3 transition-all duration-300 ${
                            activeSection === item.index ? "pointer-events-none" : ""
                        }`}
                        aria-label={t("hackathon.nav.jump_to", { label: item.label })}
                    >
                        <span
                            className={`absolute right-full mr-3 whitespace-nowrap text-xs font-bold uppercase tracking-wider opacity-0 transition-all duration-300 group-hover:opacity-100 ${
                                isDayMode ? "text-slate-600" : "text-white/60"
                            } ${activeSection === item.index ? "opacity-100" : ""}`}
                        >
                            {item.label}
                        </span>
                        <div className="relative overflow-hidden rounded-full">
                            <div
                                className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black transition-all duration-300 min-[1720px]:h-10 min-[1720px]:w-10 ${
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

            {/* Tablet in-page anchor bar. Phones use the global bottom tab bar. */}
            <div
                className={`sticky top-[calc(env(safe-area-inset-top)+128px)] z-30 mx-auto mt-4 hidden w-[calc(100%_-_2rem)] max-w-[520px] items-center justify-center gap-2 border px-2 py-2 backdrop-blur-xl md:flex lg:hidden ${isDayMode ? "border-slate-200 bg-white/90" : "border-white/10 bg-black/50"}`}
            >
                {sectionAnchors.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            aria-label={t("hackathon.nav.jump_to", { label: item.label })}
                            onClick={() => smoothScrollTo(item.id)}
                            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[6px] px-3 py-2 text-xs font-bold transition-all duration-300 ${
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
                className="relative min-h-[100svh] min-w-0 max-w-full snap-start snap-always overflow-x-clip px-4 pt-[calc(env(safe-area-inset-top)+132px)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top)+136px)] lg:pt-[calc(env(safe-area-inset-top)+124px)] xl:px-10 min-[1720px]:pt-[calc(env(safe-area-inset-top)+72px)] 2xl:px-16"
            >
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
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
                    <div
                        className={`absolute left-0 top-0 h-px w-full ${isDayMode ? "bg-gradient-to-r from-transparent via-cyan-600/50 to-transparent" : "bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"}`}
                    />
                    <div
                        className={`absolute bottom-[-22%] right-[-10%] h-[420px] w-[420px] rounded-full blur-[110px] sm:h-[520px] sm:w-[520px] ${isDayMode ? "bg-cyan-500/8" : "bg-cyan-300/12"}`}
                    />
                </div>

                {enterpriseLogos.length > 0 ? (
                    <div
                        data-registration-logo-panel
                        className={`relative z-20 mx-auto mb-6 w-full max-w-[calc(100vw-2rem)] border p-2 backdrop-blur-2xl sm:mb-8 sm:max-w-[720px] lg:absolute lg:right-8 lg:top-[calc(env(safe-area-inset-top)+82px)] lg:mb-0 lg:w-[min(38vw,560px)] lg:max-w-none xl:right-10 xl:top-[calc(env(safe-area-inset-top)+78px)] 2xl:right-16 2xl:w-[min(34vw,640px)] ${
                            isDayMode
                                ? "border-slate-200/80 bg-white/76 shadow-[0_18px_58px_rgba(15,23,42,0.10)]"
                                : "border-cyan-300/16 bg-black/18 shadow-[0_0_44px_rgba(34,211,238,0.10)]"
                        }`}
                        aria-label={t("hackathon.partners.enterprise_logos", "企业 logo")}
                    >
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 lg:gap-1.5">
                            {enterpriseLogos.map((logo) => {
                                const logoSrc = getPartnerLogoSrc(logo, isDayMode);
                                const logoLabel = getLocalizedPartnerDisplayName(logo, language);
                                const showLogoImage = logoSrc && !String(language).startsWith("en");
                                return (
                                    <span
                                        key={logo.id || logo.src || logo.name}
                                        className={`group flex min-h-12 min-w-0 items-center justify-center gap-1.5 border px-2 py-2 transition duration-300 hover:-translate-y-0.5 sm:min-h-14 sm:px-3 lg:min-h-10 lg:px-2 lg:py-1.5 ${
                                            isDayMode
                                                ? "border-slate-200/80 bg-white/70"
                                                : "border-white/10 bg-white/[0.045]"
                                        }`}
                                    >
                                        {showLogoImage ? (
                                            <img
                                                src={logoSrc}
                                                alt={logo.alt || logoLabel}
                                                className={`max-h-7 max-w-full object-contain transition duration-300 group-hover:scale-[1.035] sm:max-h-8 lg:max-h-7 ${
                                                    logo.size || ""
                                                } ${
                                                    isDayMode
                                                        ? ""
                                                        : `${logo.darkClassName || ""} drop-shadow-[0_1px_10px_rgba(103,232,249,0.18)]`
                                                }`}
                                                loading="eager"
                                            />
                                        ) : (
                                            <span
                                                className={`truncate text-center text-xs font-black leading-tight sm:text-sm ${
                                                    isDayMode ? "text-slate-950" : "text-white"
                                                }`}
                                            >
                                                {logoLabel}
                                            </span>
                                        )}
                                        {logo.text && showLogoImage ? (
                                            <span
                                                className={`truncate text-xs font-black leading-none tracking-normal sm:text-sm ${
                                                    isDayMode ? "text-slate-950" : "text-white"
                                                }`}
                                            >
                                                {logo.text}
                                            </span>
                                        ) : null}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                <div className="relative mx-auto grid min-h-[calc(100svh-132px)] min-w-0 w-full max-w-[1880px] items-center gap-8 pb-20 pt-4 sm:gap-10 sm:pb-24 sm:pt-8 lg:pb-24 xl:grid-cols-[minmax(0,1.06fr)_minmax(0,0.78fr)] xl:gap-10 xl:pb-16 min-[1536px]:grid-cols-[minmax(0,0.98fr)_minmax(0,0.82fr)] min-[1536px]:gap-14 min-[1720px]:min-h-[calc(100svh-104px)] min-[1720px]:grid-cols-[minmax(0,860px)_minmax(0,780px)] min-[1720px]:gap-24 min-[1720px]:justify-between min-[1920px]:grid-cols-[minmax(0,920px)_minmax(0,860px)] min-[1920px]:gap-28">
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
                        className={`relative order-2 w-full justify-self-start overflow-hidden border p-4 backdrop-blur-2xl sm:p-6 xl:justify-self-end xl:p-5 min-[1536px]:p-7 min-[1720px]:p-9 min-[1920px]:p-10 ${palette.panelStrong}`}
                    >
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_22%,rgba(103,232,249,0.14),transparent_34%),linear-gradient(135deg,rgba(103,232,249,0.08),transparent_46%)]" />
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                        <div
                            className={`absolute right-6 top-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] ${palette.accent} min-[1720px]:right-8 min-[1720px]:top-8`}
                        >
                            <span
                                className={`h-2 w-2 rounded-full ${isDayMode ? "bg-cyan-600" : "bg-cyan-300"}`}
                            />
                            {t("hackathon.board.live_brief", "Live Brief")}
                        </div>

                        <div className="relative mt-9 grid gap-5 xl:gap-4 min-[1536px]:gap-6 min-[1720px]:gap-7">
                            <div>
                                <p
                                    className={`text-xs font-semibold uppercase tracking-[0.24em] ${palette.textMuted}`}
                                >
                                    {t("hackathon.event.prize_pool", "奖金池")}
                                </p>
                                <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
                                    <span
                                        className={`text-6xl font-black leading-none tracking-tight ${palette.accent} min-[390px]:text-7xl sm:text-8xl xl:text-[5.1rem] min-[1536px]:text-[6rem] min-[1720px]:text-9xl`}
                                    >
                                        {event.prizeValue}
                                    </span>
                                    <span
                                        className={`pb-4 text-4xl font-black leading-none ${palette.accent} sm:text-5xl xl:pb-5 xl:text-5xl min-[1720px]:pb-6 min-[1720px]:text-6xl`}
                                    >
                                        {event.prizeUnit}
                                    </span>
                                    <span
                                        className={`pb-3 text-2xl font-black tracking-[0.12em] ${palette.accent} sm:text-3xl xl:pb-3 xl:text-3xl min-[1720px]:pb-4 min-[1720px]:text-4xl`}
                                    >
                                        {t("hackathon.event.prize_pool", "奖金池")}
                                    </span>
                                </div>
                            </div>

                            <div
                                className={`grid gap-px overflow-hidden border-y ${isDayMode ? "bg-cyan-100/40" : "bg-cyan-300/18"} ${palette.line} min-[520px]:grid-cols-2`}
                            >
                                {eventMeta.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div
                                            key={item.label}
                                            className={`${isDayMode ? "bg-white/92 hover:bg-cyan-50" : "bg-[#071011]/92 hover:bg-cyan-300/10"} group min-h-[92px] p-4 transition duration-200 sm:min-h-[108px] sm:p-5 xl:min-h-[96px] xl:p-4 min-[1536px]:min-h-[112px] min-[1536px]:p-5 min-[1720px]:min-h-[126px] min-[1720px]:p-6`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p
                                                        className={`font-mono text-xs font-black uppercase tracking-[0.18em] ${palette.accent}`}
                                                    >
                                                        {item.index} / {item.label}
                                                    </p>
                                                    <p className="mt-3 text-xl font-black tracking-tight xl:text-lg min-[1720px]:text-2xl">
                                                        {item.value}
                                                    </p>
                                                </div>
                                                <div
                                                    className={`flex h-12 w-12 shrink-0 items-center justify-center border ${isDayMode ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-600" : "border-cyan-300/40 bg-cyan-300/10 text-cyan-300"} xl:h-11 xl:w-11 min-[1720px]:h-14 min-[1720px]:w-14`}
                                                >
                                                    <Icon className="h-6 w-6 xl:h-5 xl:w-5 min-[1720px]:h-7 min-[1720px]:w-7" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center min-[1720px]:gap-3">
                                {challenges.slice(0, 3).map((item) => (
                                    <div
                                        key={item.id}
                                        className={`border px-2 py-2.5 text-xs font-semibold sm:py-3 min-[1536px]:py-3.5 min-[1720px]:py-4 min-[1720px]:text-sm ${palette.chip}`}
                                    >
                                        {item.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </MotionDiv>

                    <MotionDiv
                        {...heroMotion}
                        className="order-1 min-w-0 max-w-[920px] lg:ml-0 xl:max-w-[980px]"
                    >
                        <div
                            className={`mb-6 inline-flex items-center gap-2 border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${palette.chip}`}
                        >
                            <Sparkles
                                className={`h-3.5 w-3.5 ${isDayMode ? "text-cyan-600" : "text-cyan-400"}`}
                            />
                            {event.brand}
                        </div>

                        <h1 className="max-w-[980px] text-[3.2rem] font-black leading-[0.96] tracking-normal min-[390px]:text-6xl sm:text-7xl lg:text-[5.5rem] xl:text-[5.4rem] min-[1536px]:text-[6.4rem] min-[1720px]:text-[7rem] 2xl:text-[8rem]">
                            {titleLines.map((line) => (
                                <span key={line} className="block">
                                    {line}
                                </span>
                            ))}
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
                            className="mt-6 grid max-w-[860px] grid-cols-3 gap-2 sm:mt-7 sm:gap-3 min-[1720px]:gap-4"
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
                                    className={`group relative transform-gpu overflow-hidden border px-2.5 py-3 text-left transition duration-300 hover:-translate-y-0.5 ${
                                        isDayMode
                                            ? "border-cyan-600/30 bg-white/76 shadow-[0_20px_42px_rgba(15,23,42,0.08)] hover:border-cyan-600/50"
                                            : "border-cyan-300/24 bg-cyan-300/[0.045] shadow-[0_20px_55px_rgba(0,0,0,0.34)] hover:border-cyan-300/70"
                                    } sm:px-5 sm:py-5 xl:px-4 xl:py-4 min-[1536px]:px-5 min-[1536px]:py-5 min-[1720px]:px-6 min-[1720px]:py-6`}
                                >
                                    <div
                                        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-70 ${isDayMode ? "via-cyan-500/50" : "via-cyan-300"}`}
                                    />
                                    <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-full bg-gradient-to-r from-transparent via-cyan-200/12 to-transparent opacity-0 transition duration-500 group-hover:translate-x-[320%] group-hover:opacity-100"
                                    />
                                    <div className="relative flex items-baseline gap-1.5 sm:gap-2">
                                        <span
                                            className={`text-4xl font-black leading-none tracking-normal ${palette.accent} min-[390px]:text-5xl sm:text-6xl xl:text-5xl min-[1536px]:text-6xl min-[1720px]:text-7xl`}
                                        >
                                            {stat.value}
                                        </span>
                                        <span
                                            className={`text-lg font-black sm:text-2xl xl:text-xl min-[1720px]:text-3xl ${isDayMode ? "text-slate-950" : "text-white"}`}
                                        >
                                            {stat.unit}
                                        </span>
                                    </div>
                                    <div
                                        className={`relative mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] min-[1720px]:text-xs ${palette.textMuted}`}
                                    >
                                        <span className="break-words">{stat.code}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </MotionDiv>

                        <p
                            className={`mt-6 max-w-3xl text-base leading-8 sm:text-lg min-[1720px]:text-xl min-[1720px]:leading-9 ${palette.textSoft}`}
                        >
                            {event.description}
                        </p>

                        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={scrollToForm}
                                className={`group inline-flex min-h-12 items-center justify-center gap-2 px-7 text-sm font-bold transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 min-[1720px]:min-h-14 min-[1720px]:px-9 min-[1720px]:text-base ${palette.primary}`}
                            >
                                {t("hackathon.cta.register_now", "立即报名")}
                                <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </button>
                            <Link
                                to="/about"
                                className={`inline-flex min-h-12 items-center justify-center gap-2 border px-7 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/20 min-[1720px]:min-h-14 min-[1720px]:px-9 min-[1720px]:text-base ${palette.secondary}`}
                            >
                                {t("hackathon.cta.learn_ecosystem", "了解生态团队")}
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </MotionDiv>

                    <button
                        type="button"
                        onClick={() => smoothScrollTo("event-brief")}
                        className={`group absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition duration-300 hover:border-cyan-300/70 hover:text-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-300/20 xl:inline-flex ${palette.chip}`}
                    >
                        {t("hackathon.cta.keep_reading", "继续了解")}
                        <span className="inline-flex transition-transform duration-300 group-hover:translate-y-0.5">
                            <ChevronDown className="h-4 w-4" />
                        </span>
                    </button>
                </div>
            </section>

            <MotionSection
                id="event-brief"
                {...sectionMotion}
                className="relative flex min-h-[100svh] min-w-0 max-w-full snap-start snap-always items-center overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-20 min-[1536px]:px-14 2xl:px-20 2xl:py-24"
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(103,232,249,0.14),transparent_28%),radial-gradient(circle_at_76%_26%,rgba(99,102,241,0.14),transparent_26%)]" />
                <div className="mx-auto min-w-0 w-full max-w-[1900px]">
                    <div className="relative overflow-hidden">
                        <div className="pointer-events-none absolute right-0 top-[-10%] max-w-full overflow-hidden font-black uppercase leading-none tracking-normal text-white/[0.04] text-[20vw]">
                            SHIP
                        </div>

                        <div className="relative grid min-w-0 gap-10 sm:gap-14 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] xl:items-stretch xl:gap-14 min-[1536px]:gap-24 2xl:gap-36">
                            <div className="order-1 flex flex-col xl:min-h-[620px]">
                                <p
                                    className={`text-sm font-bold uppercase tracking-[0.28em] ${palette.accent}`}
                                >
                                    Competition Board
                                </p>
                                <h2 className="mt-5 max-w-4xl text-5xl font-black leading-[0.98] tracking-normal sm:text-7xl xl:text-[72px] min-[1536px]:text-[82px] 2xl:text-[96px]">
                                    {boardLines[0] || event.duration}
                                    <span className={`block ${palette.accent}`}>
                                        {boardLines[1] || event.format}
                                    </span>
                                    {boardLines[2] || challenges[0]?.title}
                                </h2>
                                <p
                                    className={`mt-6 max-w-xl text-base leading-8 xl:text-lg xl:leading-8 ${palette.textSoft}`}
                                >
                                    {event.description}
                                </p>

                                <div className={`mt-10 border-t pt-7 xl:mt-auto ${palette.line}`}>
                                    <p
                                        className={`text-sm font-bold uppercase tracking-[0.24em] ${palette.accent}`}
                                    >
                                        Ecosystem
                                    </p>
                                    <h3 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl xl:text-[44px]">
                                        {t("hackathon.board.support_lineup", "支持阵容")}
                                    </h3>

                                    <div className="mt-7 grid gap-3 min-[1536px]:grid-cols-3 min-[1536px]:items-stretch">
                                        {ecosystemGroups.map((group) => (
                                            <div
                                                key={group.label}
                                                className={`grid gap-4 border-l-2 px-5 py-3.5 sm:grid-cols-[104px_1fr] sm:items-center xl:px-5 xl:py-4 min-[1536px]:grid-cols-1 min-[1536px]:content-start ${
                                                    isDayMode
                                                        ? "border-cyan-600 bg-white/60"
                                                        : "border-cyan-300 bg-cyan-300/[0.035]"
                                                }`}
                                            >
                                                <div
                                                    className={`flex items-center gap-2 text-base font-black ${palette.accent}`}
                                                >
                                                    <span
                                                        className={`h-2.5 w-2.5 ${isDayMode ? "bg-cyan-600" : "bg-cyan-300"}`}
                                                    />
                                                    {group.label}
                                                </div>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {group.partners.map((partner) => (
                                                        <span
                                                            key={partner}
                                                            className={`border px-3 py-2 text-sm font-black min-[1720px]:text-base ${palette.chip}`}
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
                                <div className="grid flex-1 content-start gap-4 sm:gap-5 xl:gap-5 min-[1536px]:gap-7">
                                    {challenges.map((challenge, index) => {
                                        const Icon = challenge.icon;
                                        return (
                                            <div
                                                key={challenge.title}
                                                className={`group relative flex min-h-[136px] overflow-hidden border p-4 transition duration-300 sm:min-h-[160px] sm:p-6 xl:min-h-[166px] xl:p-7 min-[1536px]:min-h-[194px] min-[1536px]:p-9 ${
                                                    isDayMode
                                                        ? "border-slate-200 bg-white/84 shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
                                                        : "border-white/10 bg-[#101516]/88 shadow-[0_28px_80px_rgba(0,0,0,0.36)]"
                                                }`}
                                            >
                                                <div
                                                    className={`absolute inset-y-0 left-0 w-1 ${isDayMode ? "bg-cyan-500" : "bg-cyan-300"} opacity-80`}
                                                />
                                                <div
                                                    className={`pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(103,232,249,0.10),transparent_34%)] opacity-0 transition duration-300 group-hover:opacity-100`}
                                                />
                                                <div className="relative flex flex-1 flex-col gap-4 sm:grid sm:grid-cols-[124px_1fr] sm:items-center sm:gap-7">
                                                    <div className="flex items-center gap-3 sm:block">
                                                        <div
                                                            className={`flex h-[56px] w-[56px] items-center justify-center ${isDayMode ? "bg-cyan-500 shadow-[0_0_36px_rgba(6,182,212,0.25)]" : "bg-cyan-300 shadow-[0_0_36px_rgba(103,232,249,0.28)]"} text-slate-950 sm:h-[88px] sm:w-[88px]`}
                                                        >
                                                            <Icon className="h-6 w-6 sm:h-10 sm:w-10" />
                                                        </div>
                                                        <p
                                                            className={`font-mono text-xs font-black uppercase tracking-[0.24em] ${palette.accent} sm:mt-4`}
                                                        >
                                                            Rule 0{index + 1}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-2xl font-black tracking-normal sm:text-4xl xl:text-[2.65rem] min-[1536px]:text-5xl">
                                                            {challenge.title}
                                                        </h3>
                                                        <p
                                                            className={`mt-2 max-w-2xl text-xs leading-6 sm:text-sm sm:leading-7 xl:text-base xl:leading-7 min-[1536px]:text-lg min-[1536px]:leading-8 ${palette.textSoft}`}
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
                className="relative flex min-h-[100svh] min-w-0 max-w-full snap-start snap-always items-start overflow-hidden px-4 pb-28 pt-20 sm:px-6 sm:pb-28 sm:pt-24 lg:px-10 lg:pb-12 lg:pt-[96px] xl:items-center min-[1536px]:px-14 2xl:px-16"
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_17%_18%,rgba(103,232,249,0.14),transparent_30%),radial-gradient(circle_at_86%_72%,rgba(99,102,241,0.14),transparent_28%)]" />
                <div className="pointer-events-none absolute left-0 top-[7%] max-w-full overflow-hidden font-black uppercase leading-none tracking-normal text-white/[0.04] text-[18vw]">
                    APPLY
                </div>
                <div className="mx-auto grid min-w-0 w-full max-w-[1880px] gap-7 xl:grid-cols-[minmax(0,0.68fr)_minmax(0,1.32fr)] xl:items-center xl:gap-8 min-[1536px]:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] min-[1536px]:gap-14 2xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] 2xl:gap-20">
                    <div className="relative z-10 min-w-0">
                        <div className="max-w-[760px]">
                            <p
                                className={`text-sm font-black uppercase tracking-[0.28em] ${palette.accent}`}
                            >
                                Register
                            </p>
                            <h2 className="mt-4 text-5xl font-black leading-[0.96] tracking-normal sm:text-6xl xl:text-7xl min-[1536px]:text-[5.25rem]">
                                {formConfig.title}
                            </h2>
                            <p
                                className={`mt-5 max-w-xl text-lg leading-9 xl:text-xl xl:leading-9 ${palette.textSoft}`}
                            >
                                {formConfig.description}
                            </p>

                            <div
                                className={`mt-7 grid gap-px overflow-hidden border ${palette.line} ${isDayMode ? "bg-slate-200/80" : "bg-cyan-300/16"} min-[1536px]:grid-cols-3`}
                            >
                                {[
                                    [t("hackathon.event.format_label", "形式"), event.format],
                                    [t("hackathon.event.duration_label", "时长"), event.duration],
                                    [t("common.location", "地点"), event.location],
                                ].map(([label, value]) => (
                                    <div
                                        key={label}
                                        className={`flex items-center justify-between gap-4 px-5 py-4 min-[1536px]:flex-col min-[1536px]:items-start min-[1536px]:justify-start ${
                                            isDayMode ? "bg-white/82" : "bg-white/[0.055]"
                                        }`}
                                    >
                                        <span
                                            className={`text-sm font-black uppercase tracking-[0.18em] ${palette.accent}`}
                                        >
                                            {label}
                                        </span>
                                        <span className="text-lg font-black tracking-tight">
                                            {value}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className={`mt-5 border p-5 ${palette.panel}`}>
                                <div className="flex items-start gap-3">
                                    <Bot className={`mt-1 h-5 w-5 shrink-0 ${palette.accent}`} />
                                    <p className={`text-base leading-8 ${palette.textSoft}`}>
                                        {t(
                                            "hackathon.form.tool_hint",
                                            "工具选择用于了解参赛者的 AI 开发习惯，不影响报名资格。"
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 hidden max-w-[680px] lg:block">
                            <HackathonAiCoachPanel
                                isDayMode={isDayMode}
                                palette={palette}
                                t={t}
                                query={coachQuery}
                                setQuery={setCoachQuery}
                                result={coachResult}
                                isLoading={isCoachLoading}
                                onAsk={askHackathonCoach}
                            />
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
                        className={`relative z-10 min-w-0 max-w-full border p-5 backdrop-blur-2xl sm:p-7 lg:p-7 2xl:p-10 ${palette.panelStrong}`}
                    >
                        <div
                            className={`mb-6 flex items-center justify-between gap-5 border-b pb-5 ${isDayMode ? "border-cyan-200" : "border-cyan-300/14"}`}
                        >
                            <div>
                                <h3 className="text-3xl font-black tracking-tight xl:text-4xl">
                                    {formConfig.title}
                                </h3>
                                <p className={`mt-2 text-base ${palette.textMuted}`}>
                                    {formConfig.requiredHint}
                                </p>
                            </div>
                            <div
                                className={`flex h-14 w-14 shrink-0 items-center justify-center border ${isDayMode ? "border-cyan-200 bg-cyan-50" : "border-cyan-300/20 bg-cyan-300/10"}`}
                            >
                                <Trophy className={`h-7 w-7 ${palette.accent}`} />
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid gap-5 md:grid-cols-2 xl:gap-6">
                                {activeFormFields.map((field) => (
                                    <div
                                        key={field.id}
                                        className={
                                            field.width === "half"
                                                ? "min-w-0"
                                                : "min-w-0 md:col-span-2"
                                        }
                                    >
                                        <DynamicRegistrationField
                                            field={field}
                                            value={formData[field.id]}
                                            error={formErrors[field.id]}
                                            palette={palette}
                                            isDayMode={isDayMode}
                                            onChange={(value) => updateAnswer(field.id, value)}
                                            onToggle={(option) =>
                                                handleMultiSelectToggle(field.id, option)
                                            }
                                        />
                                    </div>
                                ))}
                            </div>

                            <div
                                className={
                                    "grid gap-5 border-t pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.42fr)] xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.44fr)] " +
                                    palette.line
                                }
                            >
                                <div className={"border px-5 py-4 " + palette.chip}>
                                    <p className="text-base font-black">
                                        {t("hackathon.form.before_submit", "提交前确认")}
                                    </p>
                                    <p className={"mt-2 text-sm leading-6 " + palette.textMuted}>
                                        {formConfig.privacyNotice}
                                    </p>
                                    {!event.registrationOpen ? (
                                        <p className="mt-4 font-semibold text-amber-400">
                                            当前赛事报名尚未开放，表单仅供预览。
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !event.registrationOpen}
                                        className={
                                            "group inline-flex min-h-14 w-full items-center justify-center gap-2 px-7 text-base font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-55 2xl:min-h-16 2xl:text-lg " +
                                            palette.primary
                                        }
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                {t("common.submitting", "提交中...")}
                                            </>
                                        ) : (
                                            <>
                                                {event.registrationOpen
                                                    ? formConfig.submitLabel
                                                    : "报名未开放"}
                                                <Send className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                                            </>
                                        )}
                                    </button>

                                    <div>
                                        <label
                                            className={
                                                "mb-3 block text-base font-black " +
                                                palette.textSoft
                                            }
                                        >
                                            {t("hackathon.form.official_group", "官方微信群")}
                                            <span
                                                className={"ml-2 font-normal " + palette.textMuted}
                                            >
                                                {t("hackathon.form.optional", "可选")}
                                            </span>
                                        </label>
                                        <div
                                            className={
                                                "flex items-center gap-4 border p-3 " +
                                                (isDayMode
                                                    ? "border-slate-200 bg-white/80"
                                                    : "border-white/10 bg-white/[0.04]")
                                            }
                                        >
                                            <img
                                                src={officialWechatGroupImage}
                                                alt={t(
                                                    "hackathon.form.official_group_qr",
                                                    "官方微信群二维码"
                                                )}
                                                className="h-auto w-full max-w-[112px] object-contain xl:max-w-[128px] 2xl:max-w-[154px]"
                                                loading="lazy"
                                            />
                                            <p
                                                className={
                                                    "hidden text-sm font-semibold leading-6 xl:block " +
                                                    palette.textMuted
                                                }
                                            >
                                                {t(
                                                    "hackathon.form.official_group_desc",
                                                    "扫码加入群聊，后续通知和现场信息会在群内同步。"
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </MotionDiv>

                    <div className="relative z-10 lg:hidden">
                        <HackathonAiCoachPanel
                            isDayMode={isDayMode}
                            palette={palette}
                            t={t}
                            query={coachQuery}
                            setQuery={setCoachQuery}
                            result={coachResult}
                            isLoading={isCoachLoading}
                            onAsk={askHackathonCoach}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

const DynamicRegistrationField = ({
    field,
    value,
    error,
    palette,
    isDayMode,
    onChange,
    onToggle,
}) => {
    const controlClass = `w-full border px-5 py-4 text-base font-semibold outline-none transition focus:ring-4 ${palette.field} ${
        error ? "border-rose-500 focus:border-rose-500 focus:ring-rose-100" : ""
    }`;

    if (field.type === "multi_select") {
        const selectedValues = Array.isArray(value) ? value : [];
        return (
            <Field label={field.label} required={field.required} error={error} palette={palette}>
                {field.placeholder ? (
                    <p className={`mb-3 text-sm ${palette.textMuted}`}>{field.placeholder}</p>
                ) : null}
                <div className="flex flex-wrap gap-2.5">
                    {field.options.map((option) => {
                        const selected = selectedValues.includes(option.value);
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => onToggle(option.value)}
                                className={`inline-flex min-h-12 items-center gap-2 border px-5 text-base font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/20 ${
                                    selected
                                        ? isDayMode
                                            ? "border-cyan-600 bg-cyan-600 text-white"
                                            : "border-cyan-300 bg-cyan-300 text-slate-950"
                                        : `${palette.chip} hover:border-cyan-400 hover:text-cyan-600`
                                }`}
                            >
                                {selected ? <CheckCircle className="h-4 w-4" /> : null}
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </Field>
        );
    }

    if (field.type === "select") {
        return (
            <Field label={field.label} required={field.required} error={error} palette={palette}>
                <select
                    value={value || ""}
                    onChange={(event) => onChange(event.target.value)}
                    className={`${controlClass} appearance-none`}
                >
                    <option value="">{field.placeholder || `请选择${field.label}`}</option>
                    {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </Field>
        );
    }

    if (field.type === "checkbox") {
        return (
            <Field label={field.label} required={field.required} error={error} palette={palette}>
                <label className={`flex min-h-14 items-center gap-3 border px-5 ${palette.chip}`}>
                    <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(event) => onChange(event.target.checked)}
                        className="h-5 w-5"
                    />
                    <span className="text-sm font-semibold">
                        {field.placeholder || `我已确认${field.label}`}
                    </span>
                </label>
            </Field>
        );
    }

    if (field.type === "textarea") {
        return (
            <Field label={field.label} required={field.required} error={error} palette={palette}>
                <textarea
                    value={value || ""}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={field.placeholder}
                    rows={5}
                    className={`${controlClass} min-h-[160px] resize-y leading-8`}
                />
            </Field>
        );
    }

    return (
        <Field label={field.label} required={field.required} error={error} palette={palette}>
            <input
                type={["email", "tel", "number"].includes(field.type) ? field.type : "text"}
                value={value || ""}
                onChange={(event) => onChange(event.target.value)}
                placeholder={field.placeholder}
                className={controlClass}
            />
        </Field>
    );
};

const Field = ({ label, required, error, palette, children }) => (
    <div>
        <label className={`mb-2.5 block text-base font-black ${palette.textSoft}`}>
            {label} {required && <span className="text-rose-400">*</span>}
        </label>
        {children}
        {error && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {error}
            </p>
        )}
    </div>
);

const HackathonAiCoachPanel = ({
    isDayMode,
    palette,
    t,
    query,
    setQuery,
    result,
    isLoading,
    onAsk,
}) => {
    const quickPrompts = [
        t("hackathon.coach.prompt_1", "我不会前端但会用 Codex，适合参加吗？"),
        t("hackathon.coach.prompt_2", "我会一点 Python，5 小时做什么最稳？"),
        t("hackathon.coach.prompt_3", "现场当天时间应该怎么分配？"),
    ];

    const statusLabel = result?.modelStatus?.fallbackUsed
        ? t("hackathon.coach.status_fallback", "备用策略")
        : result?.modelStatus?.used
          ? t("hackathon.coach.status_model", "大模型分析")
          : t("hackathon.coach.status_idle", "AI 教练");
    const statusDetail = isLoading
        ? t("hackathon.coach.status_loading", "正在调度大模型，若输出不稳定会自动切到备用策略")
        : result?.modelStatus?.fallbackUsed
          ? t("hackathon.coach.status_fallback_detail", "已启用备用策略，建议可作为参赛方向初稿")
          : result?.modelStatus?.used
            ? t("hackathon.coach.status_model_detail", "已结合赛制画像与大模型完成分析")
            : t("hackathon.coach.status_idle_detail", "输入你的基础和顾虑，先得到一个可执行方案");
    const sources = Array.isArray(result?.sources) ? result.sources.slice(0, 5) : [];
    const warnings = Array.isArray(result?.warnings)
        ? result.warnings.filter(Boolean).slice(0, 2)
        : [];

    return (
        <div
            aria-busy={isLoading}
            className={`relative overflow-hidden border p-5 sm:p-6 ${
                isDayMode
                    ? "border-cyan-200 bg-white/88 shadow-[0_24px_60px_rgba(15,23,42,0.09)]"
                    : "border-cyan-300/18 bg-[#081214]/90 shadow-[0_28px_80px_rgba(0,0,0,0.42)]"
            }`}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div
                        className={`inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] ${palette.chip}`}
                    >
                        <Bot className="h-3.5 w-3.5" />
                        AI Coach
                    </div>
                    <h3 className="mt-4 text-3xl font-black tracking-tight">
                        {t("hackathon.coach.title", "黑客松 AI 教练")}
                    </h3>
                    <p className={`mt-2 text-base leading-8 ${palette.textSoft}`}>
                        {t(
                            "hackathon.coach.desc",
                            "告诉它你的基础、工具和顾虑，它会结合赛制给你选方向、拆计划和提醒风险。"
                        )}
                    </p>
                </div>
                <span
                    className={`inline-flex shrink-0 items-center gap-2 border px-3 py-1.5 text-sm font-bold ${palette.chip}`}
                >
                    <Sparkles className="h-3.5 w-3.5" />
                    {statusLabel}
                </span>
            </div>
            <div
                className={`mt-4 flex items-start gap-2 border px-3 py-2 text-sm leading-6 ${palette.chip}`}
            >
                <Cpu className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${palette.accent}`} />
                <span>{statusDetail}</span>
            </div>

            <div className="mt-5 grid gap-3">
                <textarea
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    rows={3}
                    className={`w-full resize-none border px-4 py-3 text-base font-semibold leading-7 outline-none transition focus:outline-none focus:ring-4 focus:ring-cyan-300/20 ${palette.field}`}
                    placeholder={t(
                        "hackathon.coach.placeholder",
                        "比如：我不会前端但会用 Codex，适合参加吗？"
                    )}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {quickPrompts.map((prompt) => (
                            <button
                                key={prompt}
                                type="button"
                                onClick={() => onAsk(prompt)}
                                disabled={isLoading}
                                className={`border px-3 py-2 text-sm font-bold transition hover:border-cyan-400 ${palette.chip}`}
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => onAsk()}
                        disabled={isLoading}
                        className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 px-5 text-base font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${palette.primary}`}
                    >
                        {isLoading ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                {t("hackathon.coach.loading_button", "调度大模型")}
                            </>
                        ) : (
                            <>
                                {t("hackathon.coach.submit", "开始分析")}
                                <Send className="h-4 w-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {result && (
                <div className={`mt-5 border-t pt-5 ${palette.line}`}>
                    <p className="text-base font-black leading-7">{result.summary}</p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
                        <div className={`border p-4 ${palette.chip}`}>
                            <p
                                className={`text-xs font-black uppercase tracking-[0.18em] ${palette.accent}`}
                            >
                                {t("hackathon.coach.recommendation", "推荐方向")}
                            </p>
                            <h4 className="mt-2 text-lg font-black">
                                {result.recommendation?.track ||
                                    t("hackathon.coach.default_track", "小而完整的 AI 应用")}
                            </h4>
                            <p className={`mt-2 text-sm leading-6 ${palette.textSoft}`}>
                                {result.recommendation?.focus}
                            </p>
                            <div className="mt-3 flex items-center gap-2 text-xs font-bold">
                                <span className={palette.accent}>
                                    {t("hackathon.coach.fit", "匹配")}{" "}
                                    {Math.round(result.recommendation?.fitScore || 0)}
                                </span>
                                <span className={palette.textMuted}>
                                    {t("hackathon.coach.confidence", "置信")}{" "}
                                    {Math.round((result.confidence || 0) * 100)}%
                                </span>
                            </div>
                        </div>

                        <div className={`border p-4 ${palette.chip}`}>
                            <p
                                className={`text-xs font-black uppercase tracking-[0.18em] ${palette.accent}`}
                            >
                                {t("hackathon.coach.next_step", "下一步")}
                            </p>
                            <p className="mt-2 text-sm font-bold leading-6">
                                {result.recommendation?.nextAction}
                            </p>
                            <p className={`mt-2 text-xs leading-6 ${palette.textMuted}`}>
                                {result.recommendation?.rationale}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-2">
                        {(result.prepPlan || []).slice(0, 4).map((item) => (
                            <div
                                key={`${item.step}-${item.title}`}
                                className={`grid gap-3 border px-3 py-3 sm:grid-cols-[42px_1fr] ${palette.chip}`}
                            >
                                <span className={`font-mono text-xs font-black ${palette.accent}`}>
                                    {String(item.step).padStart(2, "0")}
                                </span>
                                <div>
                                    <p className="text-sm font-black">{item.title}</p>
                                    <p className={`mt-1 text-xs leading-6 ${palette.textSoft}`}>
                                        {item.detail}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {result.risks?.[0] && (
                        <div
                            className={`mt-4 border px-4 py-3 text-sm leading-6 ${isDayMode ? "border-amber-200 bg-amber-50 text-amber-900" : "border-amber-300/20 bg-amber-300/8 text-amber-100"}`}
                        >
                            <span className="font-black">
                                {t("hackathon.coach.risk", "风险：")}
                            </span>
                            {result.risks[0].risk}
                            {result.risks[0].mitigation ? `，${result.risks[0].mitigation}` : ""}
                        </div>
                    )}

                    {(sources.length > 0 || warnings.length > 0) && (
                        <div className={`mt-4 grid gap-3 border-t pt-4 ${palette.line}`}>
                            {sources.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`text-xs font-black uppercase tracking-[0.18em] ${palette.accent}`}
                                    >
                                        {t("hackathon.coach.sources", "依据")}
                                    </span>
                                    {sources.map((source) => (
                                        <span
                                            key={source.id || source.title}
                                            className={`border px-2.5 py-1.5 text-xs font-bold ${palette.chip}`}
                                        >
                                            {source.title || source.id}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {warnings.map((warning) => (
                                <p
                                    key={warning}
                                    className={`text-xs leading-6 ${isDayMode ? "text-slate-500" : "text-white/48"}`}
                                >
                                    {warning}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HackathonRegistration;
