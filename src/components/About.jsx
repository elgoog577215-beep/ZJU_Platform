import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
    ArrowRight,
    BookOpen,
    Building2,
    Download,
    GraduationCap,
    Handshake,
    Landmark,
    Network,
    Rocket,
    Smartphone,
    Trophy,
    Users,
    X,
} from "lucide-react";
import { ECOSYSTEM_SUPPORT_VIEW_GROUPS, getPartnerLogoSrc } from "../data/partnerLogos";
import { useSettings } from "../context/SettingsContext";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import { useReducedMotion } from "../utils/animations";
import { startRouteViewTransition } from "../utils/routeViewTransition";
import SEO from "./SEO";

const preloadSupporterDirectory = () => import("./EcosystemPartnerDirectory");

const sectionReveal = (enabled, delay = 0) => {
    if (!enabled) return {};

    return {
        initial: { opacity: 0, y: 26 },
        whileInView: { opacity: 1, y: 0 },
        transition: { duration: 0.58, delay, ease: [0.22, 1, 0.36, 1] },
        viewport: { once: true, margin: "-12%" },
    };
};

const heroReveal = (enabled, delay = 0) => {
    if (!enabled) return {};

    return {
        initial: { opacity: 0, y: 28, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] },
    };
};

const useAboutHeroScale = () => {
    const stageRef = useRef(null);
    const [frame, setFrame] = useState({ scale: 1, height: null });

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const stage = stageRef.current;
        if (!stage) return undefined;

        let frameId = 0;
        let timeoutId = 0;

        const measure = () => {
            const viewportWidth = window.visualViewport?.width || window.innerWidth || 0;
            const shouldScale = viewportWidth >= 1024;

            if (!shouldScale) {
                setFrame((current) =>
                    current.scale === 1 && current.height === null
                        ? current
                        : { scale: 1, height: null }
                );
                return;
            }

            const section = stage.closest("#about-hero");
            const sectionRect = section?.getBoundingClientRect();
            const stageRect = stage.getBoundingClientRect();
            const stageTop = sectionRect ? Math.max(stageRect.top - sectionRect.top, 0) : 0;
            const stageHeight = stage.offsetHeight;
            const sectionHeight = section?.clientHeight || window.innerHeight || 0;
            const bottomBreathingRoom = viewportWidth >= 1280 ? 32 : 24;
            const availableHeight = Math.max(360, sectionHeight - stageTop - bottomBreathingRoom);
            const nextScale = Math.min(1, availableHeight / Math.max(stageHeight, 1));
            const normalizedScale = Number(nextScale.toFixed(4));
            const nextHeight =
                normalizedScale < 0.999 ? Math.ceil(stageHeight * normalizedScale) : null;

            setFrame((current) => {
                const sameScale = Math.abs(current.scale - normalizedScale) < 0.002;
                const sameHeight = current.height === nextHeight;
                return sameScale && sameHeight
                    ? current
                    : { scale: normalizedScale, height: nextHeight };
            });
        };

        const scheduleMeasure = () => {
            window.cancelAnimationFrame(frameId);
            frameId = window.requestAnimationFrame(measure);
        };

        const observer = new ResizeObserver(scheduleMeasure);
        observer.observe(stage);
        scheduleMeasure();
        timeoutId = window.setTimeout(scheduleMeasure, 420);

        window.addEventListener("resize", scheduleMeasure);
        window.visualViewport?.addEventListener?.("resize", scheduleMeasure);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.clearTimeout(timeoutId);
            observer.disconnect();
            window.removeEventListener("resize", scheduleMeasure);
            window.visualViewport?.removeEventListener?.("resize", scheduleMeasure);
        };
    }, []);

    return [stageRef, frame];
};

const About = ({ showAppDownload = true }) => {
    const { t, i18n } = useTranslation();
    const { uiMode } = useSettings();
    const navigate = useNavigate();
    const { supporterViewGroups: supporterDataGroups } = useEcosystemPartners();
    const reduceMotion = useReducedMotion();
    const shouldAnimate = !reduceMotion;
    const isDayMode = uiMode === "day";
    const isEnglish = i18n.resolvedLanguage?.startsWith("en") || i18n.language?.startsWith("en");
    const [activeBusinessCode, setActiveBusinessCode] = useState(null);
    const detailCloseButtonRef = useRef(null);
    const detailPanelRef = useRef(null);
    const businessTriggerRefs = useRef({});
    const [heroStageRef, heroStageFrame] = useAboutHeroScale();

    const openBusinessDetails = (code) => setActiveBusinessCode(code);
    const closeBusinessDetails = () => {
        const code = activeBusinessCode;
        setActiveBusinessCode(null);
        window.requestAnimationFrame(() => businessTriggerRefs.current[code]?.focus());
    };

    useEffect(() => {
        if (!activeBusinessCode || typeof document === "undefined") return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (event) => {
            if (event.key === "Escape") closeBusinessDetails();
            if (event.key === "Tab") {
                const controls = detailPanelRef.current?.querySelectorAll("button, a[href]");
                if (!controls?.length) return;
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [activeBusinessCode]);

    useEffect(() => {
        if (!activeBusinessCode) return undefined;

        const frameId = window.requestAnimationFrame(() => detailCloseButtonRef.current?.focus());
        return () => window.cancelAnimationFrame(frameId);
    }, [activeBusinessCode]);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        let frameId = 0;
        let timeoutId = 0;

        const scrollToHashTarget = () => {
            const hash = window.location.hash;
            if (!hash) return;

            let targetId = hash.slice(1);
            try {
                targetId = decodeURIComponent(targetId);
            } catch {
                return;
            }

            const target = document.getElementById(targetId);
            if (!target) return;

            const root = target.closest("[data-about-scroll-root]");
            const behavior = reduceMotion ? "auto" : "smooth";
            const shouldUseDesktopScroller = window.matchMedia("(min-width: 1024px)").matches;

            if (shouldUseDesktopScroller && root instanceof HTMLElement) {
                root.scrollTo({ top: target.offsetTop, behavior });
                return;
            }

            target.scrollIntoView({ block: "start", behavior });
        };

        const scheduleHashScroll = () => {
            window.cancelAnimationFrame(frameId);
            window.clearTimeout(timeoutId);
            frameId = window.requestAnimationFrame(scrollToHashTarget);
            timeoutId = window.setTimeout(scrollToHashTarget, 160);
        };

        scheduleHashScroll();
        window.addEventListener("hashchange", scheduleHashScroll);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.clearTimeout(timeoutId);
            window.removeEventListener("hashchange", scheduleHashScroll);
        };
    }, [reduceMotion]);

    const palette = isDayMode
        ? {
              page: "bg-[#f6f8fb] text-slate-950",
              hero: "bg-[linear-gradient(135deg,#ffffff_0%,#eef8fb_52%,#f8fafc_100%)]",
              section:
                  "bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(240,249,252,0.76)_100%)]",
              final: "bg-[linear-gradient(135deg,#f8fafc_0%,#eef8fb_48%,#ffffff_100%)]",
              textSoft: "text-slate-600",
              textMuted: "text-slate-500",
              label: "text-cyan-700",
              border: "border-slate-200/80",
              panel: "border-slate-200 bg-white/[0.88] shadow-[0_28px_90px_rgba(15,23,42,0.1)]",
              panelStrong:
                  "border-cyan-500/20 bg-white/[0.92] shadow-[0_36px_110px_rgba(15,23,42,0.14)]",
              detailPanel: "border-slate-200 bg-white shadow-[0_36px_120px_rgba(15,23,42,0.28)]",
              card: "border-slate-200 bg-white/[0.88] shadow-[0_12px_32px_rgba(15,23,42,0.045)]",
              accent: "text-cyan-700",
              accentBg: "bg-cyan-500",
              altAccent: "text-amber-700",
              altAccentBg: "bg-amber-400",
              primary:
                  "bg-cyan-600 text-white shadow-[0_18px_42px_rgba(6,182,212,0.28)] hover:bg-cyan-700",
              secondary:
                  "border-slate-300 bg-white/[0.78] text-slate-800 hover:border-cyan-400 hover:text-cyan-700",
              divider: "border-slate-200",
              watermark: "text-slate-900/[0.045]",
              grid: "opacity-[0.16] [background-image:linear-gradient(rgba(6,182,212,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)]",
          }
        : {
              page: "bg-[linear-gradient(135deg,#061011_0%,#091615_52%,#050909_100%)] text-white",
              hero: "bg-[linear-gradient(115deg,rgba(34,211,238,0.12)_0%,transparent_36%),linear-gradient(290deg,rgba(45,212,191,0.08)_0%,transparent_38%),linear-gradient(135deg,#050809_0%,#0a1919_54%,#040707_100%)]",
              section:
                  "bg-[linear-gradient(118deg,rgba(34,211,238,0.08)_0%,transparent_38%),linear-gradient(180deg,rgba(5,9,10,0.98)_0%,rgba(9,24,23,0.92)_100%)]",
              final: "bg-[linear-gradient(120deg,rgba(34,211,238,0.1)_0%,transparent_38%),linear-gradient(135deg,#050809_0%,#0b1a1a_52%,#060b0c_100%)]",
              textSoft: "text-white/[0.76]",
              textMuted: "text-white/[0.54]",
              label: "text-cyan-300",
              border: "border-white/[0.12]",
              panel: "border-white/[0.12] bg-[#121c1d]/90 shadow-[0_28px_90px_rgba(0,0,0,0.38),0_0_60px_rgba(34,211,238,0.08)]",
              panelStrong:
                  "border-cyan-200/30 bg-[#0b1718]/[0.88] shadow-[0_36px_120px_rgba(0,0,0,0.52),0_0_86px_rgba(34,211,238,0.09)]",
              detailPanel:
                  "border-white/[0.18] bg-[#081213] shadow-[0_36px_120px_rgba(0,0,0,0.68),0_0_86px_rgba(34,211,238,0.1)]",
              card: "border-white/[0.12] bg-[linear-gradient(180deg,rgba(19,29,30,0.92),rgba(11,21,21,0.72))]",
              accent: "text-cyan-300",
              accentBg: "bg-cyan-300",
              altAccent: "text-amber-200",
              altAccentBg: "bg-amber-300",
              primary:
                  "bg-cyan-300 text-slate-950 shadow-[0_0_42px_rgba(103,232,249,0.28)] hover:bg-white",
              secondary:
                  "border-white/[0.18] bg-white/[0.06] text-white hover:border-cyan-300/70 hover:bg-cyan-300/[0.12]",
              divider: "border-white/[0.12]",
              watermark: "text-white/[0.072]",
              grid: "opacity-[0.2] [background-image:linear-gradient(rgba(103,232,249,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.14)_1px,transparent_1px)]",
          };

    const pageSections = [
        ["01", "#about-hero"],
        ["02", "#resource-support"],
        ["03", "#business-lines"],
        ["04", "#join-ecosystem"],
    ];

    const proofStats = [
        {
            value: "4000+",
            label: t("about.ecosystem.stats.users", "注册用户"),
        },
        {
            value: "1500+",
            label: t("about.ecosystem.stats.daily_views", "日均浏览"),
        },
        {
            value: "1000+",
            label: t("about.ecosystem.stats.events", "累计活动"),
        },
        {
            value: "300",
            label: t("about.ecosystem.stats.hackathon", "首届浙客松报名人数"),
        },
    ];

    const supporterGroupMap = new Map(
        supporterDataGroups.map((group) => [group.id, group.partners || []])
    );
    const supportGroupConfig = {
        college: {
            code: "CAMPUS",
            headline: t("about.ecosystem.support.school_headline", "课程、科研与场景"),
            description: t(
                "about.ecosystem.support.school_desc",
                "未来学习中心与相关学院提供课程共建、科研问题和重点场景，使真实课题进入校园实践。"
            ),
            icon: Landmark,
        },
        enterprise: {
            code: "ENTERPRISE",
            headline: t("about.ecosystem.support.enterprise_headline", "赛题、技术与人才机会"),
            description: t(
                "about.ecosystem.support.enterprise_desc",
                "合作企业提供真实题目、行业场景、模型、云资源、工具、评审与人才机会。"
            ),
            icon: Building2,
        },
        capital: {
            code: "CAPITAL",
            headline: t("about.ecosystem.support.capital_headline", "创业辅导与资源对接"),
            description: t(
                "about.ecosystem.support.capital_desc",
                "五源资本及浙大系资本为优秀项目提供路演、创业辅导和资源对接。"
            ),
            icon: Handshake,
        },
        club: {
            code: "COMMUNITY",
            headline: t("about.ecosystem.support.organization_headline", "招募、培训与执行"),
            description: t(
                "about.ecosystem.support.organization_desc",
                "学生组织和社团负责成员招募、学习培训、活动执行与赛后复盘。"
            ),
            icon: Network,
        },
    };
    const supportGroups = ECOSYSTEM_SUPPORT_VIEW_GROUPS.map((category) => ({
        ...category,
        ...supportGroupConfig[category.id],
        title: t(
            `about.ecosystem.supporter_directory.view_groups.${category.id}`,
            isEnglish ? category.labelEn : category.label
        ),
        partners: supporterGroupMap.get(category.id) || [],
    }));

    const businessLines = [
        { key: "community", code: "COMMUNITY", route: "/events", icon: Users, tone: "cyan" },
        { key: "hackathon", code: "HACKATHON", route: "/hackathon", icon: Trophy, tone: "amber" },
        { key: "grow", code: "LEARNING", route: "/articles", icon: GraduationCap, tone: "emerald" },
        { key: "project", code: "PROJECTS", route: "/projects", icon: Building2, tone: "violet" },
    ].map((item, index) => ({
        ...item,
        index: String(index + 1).padStart(2, "0"),
        title: t(`about.ecosystem.business.${item.key}_title`),
        short: t(`about.ecosystem.business.${item.key}_short`),
        description: t(`about.ecosystem.business.${item.key}_desc`),
        metric: t(`about.ecosystem.business.${item.key}_metric`),
        cta: t(`about.ecosystem.business.${item.key}_cta`),
        detailEyebrow: t(`about.ecosystem.business.${item.key}_detail_eyebrow`),
        detailDesc: t(`about.ecosystem.business.${item.key}_detail_desc`),
        detailItems: [1, 2, 3].map((number) =>
            t(`about.ecosystem.business.${item.key}_detail_item_${number}`)
        ),
        detailResult: t(`about.ecosystem.business.${item.key}_detail_result`),
    }));

    const activeBusiness = businessLines.find((item) => item.code === activeBusinessCode);

    const joinCards = [
        {
            title: t("about.ecosystem.join.student_title", "交流与学习"),
            description: t(
                "about.ecosystem.join.student_desc",
                "通过社群、沙龙与赛事寻找同频伙伴，结合学习资料与项目实践提升能力。"
            ),
            action: t("about.ecosystem.join.student_cta", "查看活动机会"),
            route: "/events",
            icon: Users,
        },
        {
            title: t("about.ecosystem.join.org_title", "参与或发起项目"),
            description: t(
                "about.ecosystem.join.org_desc",
                "参与产业联培，也可以自主立项。先了解项目需求，再寻找适合自己的合作方式。"
            ),
            action: t("about.ecosystem.join.org_cta", "进入项目广场"),
            route: "/projects",
            icon: Network,
        },
    ];

    const sectionBaseClass =
        "relative flex scroll-mt-14 flex-col overflow-hidden px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-12 sm:scroll-mt-16 sm:px-6 sm:py-20 lg:h-[100svh] lg:min-h-[100svh] lg:scroll-mt-0 lg:snap-start lg:snap-always lg:pb-[clamp(1rem,3vh,2.5rem)] lg:pl-10 lg:pr-28 lg:pt-[calc(env(safe-area-inset-top)+clamp(4.5rem,8.2vh,5.125rem))] 2xl:pl-16 2xl:pr-36";
    const heroStageShellStyle = heroStageFrame.height
        ? { height: `${heroStageFrame.height}px` }
        : undefined;
    const heroStageStyle =
        heroStageFrame.scale < 0.999
            ? {
                  width: `${100 / heroStageFrame.scale}%`,
                  transform: `scale(${heroStageFrame.scale})`,
                  transformOrigin: "top left",
              }
            : undefined;

    return (
        <div
            data-about-scroll-root
            className={`min-h-screen overflow-x-hidden scroll-smooth pb-0 lg:h-screen lg:overflow-y-auto lg:snap-y lg:snap-mandatory ${palette.page}`}
        >
            <SEO
                title={t("about.ecosystem.meta_title", "拓浙AI生态")}
                description={t(
                    "about.ecosystem.meta_desc",
                    "拓浙 AI 生态以浙江大学为起点，连接信息共享、AI+X 人才培养、浙客松实战与产业实践。"
                )}
            />

            <nav
                aria-label={t("about.ecosystem.pagination_aria", "关于页面分页")}
                className="fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex"
            >
                {pageSections.map(([label, href]) => (
                    <a
                        key={href}
                        href={href}
                        className={`group flex h-14 w-14 items-center justify-center border text-sm font-black transition duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 ${
                            isDayMode
                                ? "border-slate-200 bg-white/[0.74] text-slate-500 hover:border-cyan-500/40 hover:text-cyan-700"
                                : "border-white/10 bg-white/[0.045] text-white/60 hover:border-cyan-300/50 hover:text-cyan-200"
                        }`}
                    >
                        <span className="transition group-hover:scale-110">{label}</span>
                    </a>
                ))}
            </nav>

            <section
                id="about-hero"
                className={`relative isolate overflow-hidden px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+76px)] sm:px-6 md:pt-[calc(env(safe-area-inset-top)+112px)] lg:h-[100svh] lg:min-h-[100svh] lg:snap-start lg:snap-always lg:pb-8 lg:pl-10 lg:pr-28 lg:pt-[calc(env(safe-area-inset-top)+84px)] 2xl:pl-16 2xl:pr-36 ${palette.hero}`}
            >
                <div
                    className={`pointer-events-none absolute inset-0 [background-size:46px_46px] ${palette.grid}`}
                />
                <div
                    className={`pointer-events-none absolute -right-[8vw] bottom-0 select-none text-[18vw] font-black uppercase leading-[0.8] ${palette.watermark}`}
                >
                    ECOSYSTEM
                </div>

                <div
                    className="relative z-10 mx-auto w-full max-w-[2140px] overflow-hidden"
                    data-about-hero-stage-shell
                    style={heroStageShellStyle}
                >
                    <div
                        ref={heroStageRef}
                        data-about-hero-stage
                        style={heroStageStyle}
                        className="grid w-full content-start gap-5 pt-2 will-change-transform sm:gap-7 sm:pt-8 lg:min-h-[calc(100svh-118px)] lg:content-center lg:items-center lg:gap-10 lg:pt-0 xl:grid-cols-[minmax(0,1fr)_minmax(540px,680px)] xl:gap-12 2xl:grid-cols-[minmax(0,1fr)_minmax(700px,860px)] 2xl:gap-16"
                    >
                        <motion.div {...heroReveal(shouldAnimate)} className="max-w-[1040px]">
                            <div
                                className={`inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-black uppercase sm:px-3.5 sm:py-2 sm:text-sm ${palette.label} ${
                                    isDayMode
                                        ? "border-cyan-500/30 bg-cyan-500/[0.08]"
                                        : "border-cyan-300/30 bg-cyan-300/[0.07]"
                                }`}
                            >
                                <span
                                    className={`h-2 w-2 ${palette.accentBg} shadow-[0_0_22px_rgba(103,232,249,0.72)]`}
                                />
                                {t("about.ecosystem.hero.brand", "拓浙AI生态")}
                            </div>

                            <h1
                                className={`mt-4 max-w-5xl font-black leading-[0.94] tracking-normal sm:mt-7 lg:mt-6 ${
                                    isEnglish
                                        ? "text-[clamp(2.55rem,12vw,4.1rem)] sm:text-5xl md:text-6xl lg:text-5xl xl:text-[3.55rem] 2xl:text-[4.6rem]"
                                        : "text-[clamp(2.75rem,13vw,4.35rem)] sm:text-6xl md:text-7xl lg:text-6xl xl:text-[4.35rem] 2xl:text-[5.35rem]"
                                }`}
                            >
                                <span className="block">
                                    {t("about.ecosystem.hero.title_1", "海纳百川，")}
                                </span>
                                <span className="block">
                                    {t("about.ecosystem.hero.title_2", "永不设限。")}
                                </span>
                                <span className={`block ${palette.accent}`}>
                                    {t("about.ecosystem.hero.title_3", "TUOZHE AI ECOSYSTEM")}
                                </span>
                            </h1>

                            <p
                                className={`mt-4 max-w-4xl text-[15px] font-bold leading-7 sm:mt-6 sm:text-xl sm:leading-9 lg:text-lg lg:leading-8 xl:text-xl xl:leading-9 2xl:text-2xl 2xl:leading-10 ${palette.textSoft}`}
                            >
                                <strong className={isDayMode ? "text-slate-950" : "text-white"}>
                                    {t("about.ecosystem.hero.strong", "连接学习、实践与产业。")}
                                </strong>{" "}
                                {t(
                                    "about.ecosystem.hero.desc",
                                    "拓浙 AI 生态以浙江大学为起点，面向零基础新生与 AI 极客，通过信息共享、AI+X 学习、浙客松实战和产业项目，连接学生、学校与企业。"
                                )}
                            </p>

                            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap sm:gap-3.5 lg:mt-8">
                                <a
                                    href="#business-lines"
                                    className={`inline-flex min-h-12 items-center justify-center gap-2.5 px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 sm:min-h-14 sm:px-8 sm:text-base 2xl:min-h-16 2xl:px-9 2xl:text-lg ${palette.primary}`}
                                >
                                    <Rocket className="h-5 w-5" />
                                    {t("about.ecosystem.hero.primary_cta", "了解生态")}
                                </a>
                                <a
                                    href="#join-ecosystem"
                                    className={`inline-flex min-h-12 items-center justify-center gap-2.5 border px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 sm:min-h-14 sm:px-8 sm:text-base 2xl:min-h-16 2xl:px-9 2xl:text-lg ${palette.secondary}`}
                                >
                                    <BookOpen className="h-5 w-5" />
                                    {t("about.ecosystem.hero.secondary_cta", "参与共建")}
                                </a>
                            </div>
                        </motion.div>

                        <motion.aside
                            {...heroReveal(shouldAnimate, 0.12)}
                            className={`relative hidden min-h-[560px] overflow-hidden border p-7 backdrop-blur-2xl xl:block 2xl:min-h-[650px] 2xl:p-8 ${palette.panelStrong}`}
                        >
                            <div
                                className={`pointer-events-none absolute -right-12 -top-10 text-[8rem] font-black uppercase leading-none ${palette.watermark}`}
                            >
                                {t("about.ecosystem.brief.watermark", "ORIGIN")}
                            </div>
                            <div className="relative z-10 flex min-h-[506px] flex-col justify-between 2xl:min-h-[586px]">
                                <div
                                    className={`flex items-center justify-between text-xs font-black uppercase 2xl:text-sm ${palette.label}`}
                                >
                                    <span>{t("about.ecosystem.brief.eyebrow", "生态起点")}</span>
                                    <span>{t("about.ecosystem.brief.status", "ZJU Origin")}</span>
                                </div>
                                <div className="py-8">
                                    <p className="max-w-3xl text-5xl font-black leading-[0.98] 2xl:text-7xl">
                                        <span className={`block ${palette.accent}`}>
                                            {t("about.ecosystem.brief.title_1", "从浙大出发，")}
                                        </span>
                                        <span className="block">
                                            {t("about.ecosystem.brief.title_2", "走向真实世界。")}
                                        </span>
                                    </p>
                                    <p
                                        className={`mt-8 max-w-2xl text-xl font-bold leading-9 2xl:text-2xl 2xl:leading-10 ${palette.textSoft}`}
                                    >
                                        {t(
                                            "about.ecosystem.brief.desc",
                                            "平台打破信息差，AI 社区组织学习与项目实践，浙客松用真实赛题检验能力，产业项目把人才与技术带进真实场景。"
                                        )}
                                    </p>
                                </div>
                                <div
                                    className={`border-l-2 py-5 pl-5 text-sm font-black uppercase tracking-normal 2xl:text-base ${
                                        isDayMode
                                            ? "border-cyan-500 text-slate-500"
                                            : "border-cyan-300 text-white/[0.52]"
                                    }`}
                                >
                                    {t("about.ecosystem.brief.signature", "破界 / 共创 / 涌现")}
                                </div>
                            </div>
                        </motion.aside>

                        <motion.div
                            {...heroReveal(shouldAnimate, 0.18)}
                            className={`grid w-full grid-cols-2 gap-px overflow-hidden border sm:grid-cols-4 xl:col-span-2 ${
                                isDayMode
                                    ? "border-cyan-500/[0.18] bg-cyan-500/[0.18]"
                                    : "border-cyan-300/[0.18] bg-cyan-300/[0.18]"
                            }`}
                        >
                            {proofStats.map((item) => (
                                <div
                                    key={item.label}
                                    className={`flex min-h-[64px] flex-col justify-center p-2 sm:min-h-[82px] sm:p-4 lg:min-h-[118px] lg:p-4 2xl:min-h-[144px] 2xl:p-6 ${
                                        isDayMode ? "bg-white/[0.82]" : "bg-[#0b1718]/[0.86]"
                                    }`}
                                >
                                    <div
                                        className={`text-[1.35rem] font-black leading-none sm:text-3xl lg:text-[2.55rem] xl:text-[2.9rem] 2xl:text-[3.75rem] ${palette.accent}`}
                                    >
                                        {item.value}
                                    </div>
                                    <p
                                        className={`mt-1.5 break-words text-[9px] font-bold leading-3 sm:mt-2 sm:text-xs lg:text-xs lg:leading-4 2xl:text-sm 2xl:leading-5 ${palette.textMuted}`}
                                    >
                                        {item.label}
                                    </p>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            <div>
                <motion.section
                    id="resource-support"
                    {...sectionReveal(shouldAnimate)}
                    className={`${sectionBaseClass} ${palette.section}`}
                >
                    <div
                        className={`pointer-events-none absolute -right-[7vw] top-4 select-none text-[17vw] font-black uppercase leading-[0.8] ${palette.watermark}`}
                    >
                        BACKED
                    </div>
                    <div
                        className={`pointer-events-none absolute inset-0 [background-size:56px_56px] ${palette.grid}`}
                    />
                    <div className="relative z-10 mx-auto flex w-full max-w-[2140px] flex-col lg:min-h-0 lg:flex-1 lg:justify-center">
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(360px,0.7fr)] lg:items-end lg:gap-10 2xl:gap-14">
                            <div className="max-w-[960px]">
                                <p className={`text-sm font-black uppercase ${palette.label}`}>
                                    资源与合作
                                </p>
                                <h2 className="mt-3 max-w-5xl text-3xl font-black leading-tight tracking-normal sm:text-6xl lg:text-6xl 2xl:text-7xl">
                                    <span className="block">
                                        {t("about.ecosystem.support.title_1", "汇聚多方资源，")}
                                    </span>
                                    <span className="block">
                                        {t("about.ecosystem.support.title_2", "支撑真实实践。")}
                                    </span>
                                </h2>
                            </div>
                            <div className="max-w-3xl lg:justify-self-end lg:pb-2">
                                <p
                                    className={`text-sm leading-6 sm:text-lg sm:leading-8 ${palette.textSoft}`}
                                >
                                    {t(
                                        "about.ecosystem.support.desc",
                                        "学校提供场景与空间，企业提供真实课题和技术资源，学生组织负责招募与执行，产业和资本伙伴承接后续项目。"
                                    )}
                                </p>
                                <Link
                                    to="/about/partners"
                                    onClick={(event) =>
                                        startRouteViewTransition({
                                            event,
                                            navigate,
                                            to: "/about/partners",
                                            state: { fromSupportOverview: true, category: "all" },
                                            reducedMotion: reduceMotion,
                                        })
                                    }
                                    onPointerEnter={preloadSupporterDirectory}
                                    onFocus={preloadSupporterDirectory}
                                    style={{
                                        viewTransitionName: reduceMotion
                                            ? undefined
                                            : "support-category-all",
                                    }}
                                    className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-[10px] border px-4 text-sm font-black outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-400/80 ${palette.secondary}`}
                                >
                                    {t("about.ecosystem.support.view_all", "查看全部支持方")}
                                    <ArrowRight size={17} aria-hidden="true" />
                                </Link>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:mt-8 lg:h-[clamp(28rem,56vh,42rem)] lg:min-h-0 lg:grid-cols-4 lg:gap-5 2xl:gap-7">
                            {supportGroups.map((group) => {
                                const Icon = group.icon;
                                const isEnterprise = group.id === "enterprise";
                                const categoryPath = `/about/partners?category=${group.id}`;
                                const previewPartners = group.partners.slice(
                                    0,
                                    isEnterprise ? 9 : 6
                                );
                                return (
                                    <Link
                                        key={group.id}
                                        to={categoryPath}
                                        state={{ fromSupportOverview: true, category: group.id }}
                                        onClick={(event) =>
                                            startRouteViewTransition({
                                                event,
                                                navigate,
                                                to: categoryPath,
                                                state: {
                                                    fromSupportOverview: true,
                                                    category: group.id,
                                                },
                                                reducedMotion: reduceMotion,
                                            })
                                        }
                                        onPointerEnter={preloadSupporterDirectory}
                                        onFocus={preloadSupporterDirectory}
                                        style={{
                                            viewTransitionName: reduceMotion
                                                ? undefined
                                                : `support-category-${group.id}`,
                                        }}
                                        aria-label={t(
                                            "about.ecosystem.support.open_category",
                                            "查看{{category}}支持方",
                                            { category: group.title }
                                        )}
                                        className={`group relative flex min-h-[238px] flex-col overflow-hidden border p-4 outline-none transition duration-300 ease-out motion-safe:hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cyan-400/80 active:scale-[0.995] sm:min-h-[300px] sm:p-6 lg:h-full lg:min-h-0 lg:p-6 2xl:p-7 ${palette.card}`}
                                    >
                                        <div
                                            className={`pointer-events-none absolute -bottom-5 -right-3 text-[clamp(4.2rem,7vw,8.5rem)] font-black uppercase leading-none opacity-50 ${palette.watermark}`}
                                        >
                                            {group.code}
                                        </div>
                                        <div className="relative z-10 flex h-full flex-col">
                                            <div className="flex items-start justify-between gap-4">
                                                <div
                                                    className={`flex items-center gap-2 font-mono text-xs font-black uppercase 2xl:text-sm ${palette.accent}`}
                                                >
                                                    <span className="hidden sm:inline">
                                                        {group.code}
                                                    </span>
                                                    <span
                                                        className="hidden sm:inline"
                                                        aria-hidden="true"
                                                    >
                                                        ·
                                                    </span>
                                                    <span>
                                                        {t(
                                                            "about.ecosystem.support.category_count",
                                                            "{{count}} 家",
                                                            { count: group.partners.length }
                                                        )}
                                                    </span>
                                                </div>
                                                <div
                                                    className={`flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10 ${group.id === "capital" ? palette.altAccentBg : palette.accentBg} shrink-0 text-slate-950`}
                                                >
                                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                                </div>
                                            </div>
                                            <h3 className="mt-4 text-xl font-black leading-tight tracking-[-0.025em] sm:text-3xl lg:text-3xl 2xl:text-4xl">
                                                {group.title}
                                            </h3>
                                            <p
                                                className={`mt-2 text-sm font-black ${group.id === "capital" ? palette.altAccent : palette.accent}`}
                                            >
                                                {group.headline}
                                            </p>
                                            <p
                                                className={`mt-3 hidden text-sm leading-6 sm:line-clamp-2 ${palette.textSoft}`}
                                            >
                                                {group.description}
                                            </p>
                                            {isEnterprise ? (
                                                previewPartners.length > 0 ? (
                                                    <>
                                                        <div
                                                            className={`mt-auto grid grid-cols-2 gap-1 border-t pt-3 sm:hidden ${palette.divider}`}
                                                        >
                                                            {previewPartners
                                                                .slice(0, 4)
                                                                .map((partner) => (
                                                                    <span
                                                                        key={partner.id}
                                                                        className={`flex min-h-8 items-center justify-center px-1.5 text-center text-[10px] font-black leading-tight ${isDayMode ? "bg-white/[0.72] text-slate-800" : "bg-white/[0.045] text-white/[0.82]"}`}
                                                                    >
                                                                        {isEnglish
                                                                            ? partner.name_en ||
                                                                              partner.name
                                                                            : partner.name ||
                                                                              partner.name_en}
                                                                    </span>
                                                                ))}
                                                        </div>
                                                        <div
                                                            className={`mt-auto hidden grid-cols-3 gap-1.5 border-t pt-4 sm:grid ${palette.divider}`}
                                                        >
                                                            {previewPartners.map((partner) => {
                                                                const logoSrc = getPartnerLogoSrc(
                                                                    partner,
                                                                    isDayMode
                                                                );
                                                                const logoKey =
                                                                    `${partner.name || ""} ${partner.name_en || ""}`.toLowerCase();
                                                                return (
                                                                    <div
                                                                        key={partner.id}
                                                                        className={`flex min-h-[38px] items-center justify-center px-2 py-1.5 ${
                                                                            isDayMode
                                                                                ? "bg-white/[0.72]"
                                                                                : "bg-white/[0.04]"
                                                                        }`}
                                                                    >
                                                                        {logoSrc ? (
                                                                            <img
                                                                                src={logoSrc}
                                                                                alt=""
                                                                                className={`max-h-5 w-auto max-w-full object-contain sm:max-h-6 ${!isDayMode && logoKey.includes("huawei") ? "brightness-0 invert" : ""}`}
                                                                            />
                                                                        ) : (
                                                                            <span className="line-clamp-1 text-center text-[11px] font-black">
                                                                                {isEnglish
                                                                                    ? partner.name_en ||
                                                                                      partner.name
                                                                                    : partner.name ||
                                                                                      partner.name_en}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                ) : null
                                            ) : (
                                                <div
                                                    className={`mt-auto border-t pt-3 ${palette.divider}`}
                                                >
                                                    <div className="grid grid-cols-2 gap-1.5">
                                                        {previewPartners.map((partner) => (
                                                            <span
                                                                key={partner.id}
                                                                className={`flex min-h-9 min-w-0 items-center justify-center break-words px-2 py-1.5 text-center text-xs font-black leading-tight ${
                                                                    isDayMode
                                                                        ? "bg-white/[0.72] text-slate-800"
                                                                        : "bg-white/[0.045] text-white/[0.82]"
                                                                }`}
                                                            >
                                                                {isEnglish
                                                                    ? partner.name_en ||
                                                                      partner.name
                                                                    : partner.name ||
                                                                      partner.name_en}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div
                                                className={`mt-3 flex items-center justify-between gap-3 border-t pt-3 text-xs font-black ${palette.divider} ${palette.accent}`}
                                            >
                                                <span>
                                                    <span className="sm:hidden">
                                                        {t(
                                                            "about.ecosystem.support.enter_category",
                                                            "进入分类"
                                                        )}
                                                    </span>
                                                    <span className="hidden sm:inline">
                                                        {t(
                                                            "about.ecosystem.support.open_category",
                                                            "查看{{category}}支持方",
                                                            { category: group.title }
                                                        )}
                                                    </span>
                                                </span>
                                                <ArrowRight
                                                    size={17}
                                                    aria-hidden="true"
                                                    className="shrink-0 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
                                                />
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </motion.section>

                <motion.section
                    id="business-lines"
                    {...sectionReveal(shouldAnimate, 0.08)}
                    className={`${sectionBaseClass} ${palette.page}`}
                >
                    <div
                        className={`pointer-events-none absolute -right-[6vw] top-8 select-none text-[18vw] font-black uppercase leading-[0.8] ${palette.watermark}`}
                    >
                        ENGINE
                    </div>
                    <div className="relative z-10 mx-auto flex w-full max-w-[2140px] flex-col lg:min-h-0 lg:flex-1 lg:justify-center">
                        <div className="max-w-5xl">
                            <p className={`text-sm font-black uppercase ${palette.label}`}>
                                {t("about.ecosystem.business.eyebrow", "四项业务")}
                            </p>
                            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal sm:text-6xl lg:text-6xl 2xl:text-7xl">
                                <span className="block">
                                    {t("about.ecosystem.business.title_1", "从信息共享，")}
                                </span>
                                <span className="block">
                                    {t("about.ecosystem.business.title_2", "到产业转化。")}
                                </span>
                            </h2>
                            <p
                                className={`mt-4 max-w-4xl text-sm leading-6 sm:text-lg sm:leading-8 ${palette.textSoft}`}
                            >
                                {t(
                                    "about.ecosystem.business.desc",
                                    "拓途浙享打破信息差，智能体协会与 AI 社区负责学习培养，浙客松以赛事检验能力，奇鹰科技承接产业实践与技术转化。"
                                )}
                            </p>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-8 lg:h-[clamp(22rem,50vh,38rem)] lg:min-h-0 lg:grid-cols-4 lg:gap-4 2xl:gap-6">
                            {businessLines.map((item) => {
                                const Icon = item.icon;
                                const isAmber = item.tone === "amber";
                                const isEmerald = item.tone === "emerald";
                                const isViolet = item.tone === "violet";
                                const accentClass = isAmber
                                    ? palette.altAccent
                                    : isEmerald
                                      ? isDayMode
                                          ? "text-emerald-700"
                                          : "text-emerald-200"
                                      : isViolet
                                        ? isDayMode
                                            ? "text-violet-700"
                                            : "text-violet-200"
                                        : palette.accent;
                                const iconBgClass = isAmber
                                    ? palette.altAccentBg
                                    : isEmerald
                                      ? "bg-emerald-400"
                                      : isViolet
                                        ? "bg-violet-300"
                                        : palette.accentBg;
                                const borderClass = isAmber
                                    ? isDayMode
                                        ? "border-amber-400/70"
                                        : "border-amber-300/70"
                                    : isEmerald
                                      ? "border-emerald-400/65"
                                      : isViolet
                                        ? isDayMode
                                            ? "border-violet-500/70"
                                            : "border-violet-300/70"
                                        : isDayMode
                                          ? "border-cyan-500/70"
                                          : "border-cyan-300/70";

                                if (activeBusinessCode === item.code) {
                                    return (
                                        <div
                                            key={item.code}
                                            aria-hidden="true"
                                            className="min-h-[280px] border border-transparent sm:min-h-[300px] lg:min-h-0"
                                        />
                                    );
                                }

                                return (
                                    <motion.button
                                        key={item.code}
                                        type="button"
                                        layoutId={`business-card-${item.code}`}
                                        ref={(node) => {
                                            businessTriggerRefs.current[item.code] = node;
                                        }}
                                        onClick={() => openBusinessDetails(item.code)}
                                        transition={
                                            shouldAnimate
                                                ? { duration: 0.48, ease: [0.16, 1, 0.3, 1] }
                                                : { duration: 0 }
                                        }
                                        className={`group relative flex min-h-[280px] w-full flex-col overflow-hidden rounded-sm border p-5 text-left transition duration-300 motion-safe:hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 sm:min-h-[300px] sm:p-7 lg:h-full lg:min-h-0 lg:p-5 2xl:p-7 ${borderClass} ${palette.card}`}
                                    >
                                        <div
                                            className={`pointer-events-none absolute -bottom-7 -right-5 text-[7rem] font-black uppercase leading-none opacity-50 ${palette.watermark}`}
                                        >
                                            {item.code}
                                        </div>
                                        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                                            <div className="flex items-start justify-between gap-4">
                                                <div
                                                    className={`font-mono text-sm font-black uppercase 2xl:text-base ${accentClass}`}
                                                >
                                                    {item.index} / {item.code}
                                                </div>
                                                <div
                                                    className={`flex h-12 w-12 shrink-0 items-center justify-center ${iconBgClass} text-slate-950`}
                                                >
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                            </div>
                                            <h3 className="mt-5 text-2xl font-black leading-tight sm:text-3xl lg:text-2xl 2xl:text-4xl">
                                                {item.title}
                                            </h3>
                                            <p className={`mt-2 text-sm font-black ${accentClass}`}>
                                                {item.short}
                                            </p>
                                            <p
                                                className={`mt-4 line-clamp-2 text-sm leading-6 ${palette.textSoft}`}
                                            >
                                                {item.description}
                                            </p>
                                            <div
                                                className={`mt-auto flex items-end justify-between gap-4 border-t pt-4 ${palette.divider}`}
                                            >
                                                <div>
                                                    <div
                                                        className={`text-[11px] font-black uppercase ${palette.textMuted}`}
                                                    >
                                                        {t(
                                                            "about.ecosystem.business.detail_trigger",
                                                            "展开了解"
                                                        )}
                                                    </div>
                                                    <div
                                                        className={`mt-2 text-lg font-black ${accentClass}`}
                                                    >
                                                        {item.metric}
                                                    </div>
                                                </div>
                                                <div
                                                    className={`inline-flex items-center gap-2 text-sm font-black ${accentClass}`}
                                                >
                                                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </motion.section>

                {createPortal(
                    <AnimatePresence>
                        {activeBusiness ? (
                            <motion.div
                                className={`fixed inset-0 z-[90] flex items-end justify-center p-0 backdrop-blur-sm sm:items-center sm:p-6 lg:p-10 ${
                                    isDayMode ? "bg-slate-950/[0.64]" : "bg-black/[0.84]"
                                }`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={shouldAnimate ? { duration: 0.28 } : { duration: 0 }}
                                onClick={closeBusinessDetails}
                            >
                                <motion.div
                                    layoutId={`business-card-${activeBusiness.code}`}
                                    ref={detailPanelRef}
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby={`business-detail-title-${activeBusiness.code}`}
                                    onClick={(event) => event.stopPropagation()}
                                    transition={
                                        shouldAnimate
                                            ? { duration: 0.48, ease: [0.16, 1, 0.3, 1] }
                                            : { duration: 0 }
                                    }
                                    className={`relative flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl min-h-0 flex-col overscroll-contain overflow-y-auto rounded-sm border p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:max-h-[min(820px,calc(100dvh-5rem))] sm:p-9 sm:pb-9 lg:p-12 ${palette.detailPanel} ${
                                        activeBusiness.tone === "amber"
                                            ? isDayMode
                                                ? "border-amber-400/70"
                                                : "border-amber-300/70"
                                            : activeBusiness.tone === "emerald"
                                              ? "border-emerald-400/65"
                                              : activeBusiness.tone === "violet"
                                                ? isDayMode
                                                    ? "border-violet-500/70"
                                                    : "border-violet-300/70"
                                                : isDayMode
                                                  ? "border-cyan-500/70"
                                                  : "border-cyan-300/70"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-5">
                                        <div>
                                            <div
                                                className={`font-mono text-sm font-black uppercase ${
                                                    activeBusiness.tone === "amber"
                                                        ? palette.altAccent
                                                        : activeBusiness.tone === "emerald"
                                                          ? isDayMode
                                                              ? "text-emerald-700"
                                                              : "text-emerald-200"
                                                          : activeBusiness.tone === "violet"
                                                            ? isDayMode
                                                                ? "text-violet-700"
                                                                : "text-violet-200"
                                                            : palette.accent
                                                }`}
                                            >
                                                {activeBusiness.index} / {activeBusiness.code}
                                            </div>
                                            <p
                                                className={`mt-4 text-sm font-black uppercase ${palette.label}`}
                                            >
                                                {activeBusiness.detailEyebrow}
                                            </p>
                                            <h2
                                                id={`business-detail-title-${activeBusiness.code}`}
                                                className="mt-2 max-w-3xl text-3xl font-black leading-tight sm:text-5xl lg:text-6xl"
                                            >
                                                {activeBusiness.title}
                                            </h2>
                                        </div>
                                        <button
                                            ref={detailCloseButtonRef}
                                            type="button"
                                            onClick={closeBusinessDetails}
                                            aria-label={t(
                                                "about.ecosystem.business.close_detail",
                                                "关闭详情"
                                            )}
                                            className={`flex h-11 w-11 shrink-0 items-center justify-center border transition focus:outline-none focus:ring-4 focus:ring-cyan-300/30 ${palette.secondary}`}
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.68fr)] lg:gap-12">
                                        <div>
                                            <p
                                                className={`max-w-3xl text-base leading-8 sm:text-lg sm:leading-9 ${palette.textSoft}`}
                                            >
                                                {activeBusiness.detailDesc}
                                            </p>
                                            <div
                                                className={`mt-8 border-t pt-6 ${palette.divider}`}
                                            >
                                                <p
                                                    className={`text-xs font-black uppercase ${palette.textMuted}`}
                                                >
                                                    {t(
                                                        "about.ecosystem.business.detail_structure",
                                                        "具体做什么"
                                                    )}
                                                </p>
                                                <div className="mt-4 grid gap-3">
                                                    {activeBusiness.detailItems.map(
                                                        (detailItem, index) => (
                                                            <div
                                                                key={detailItem}
                                                                className={`flex gap-4 border p-4 sm:p-5 ${
                                                                    isDayMode
                                                                        ? "border-slate-200 bg-white/70"
                                                                        : "border-white/10 bg-white/[0.04]"
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`font-mono text-sm font-black ${palette.accent}`}
                                                                >
                                                                    0{index + 1}
                                                                </span>
                                                                <span className="text-sm font-bold leading-6 sm:text-base sm:leading-7">
                                                                    {detailItem}
                                                                </span>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div
                                            className={`border-t pt-6 lg:border-l lg:border-t-0 lg:pl-8 ${palette.divider}`}
                                        >
                                            <p
                                                className={`text-xs font-black uppercase ${palette.textMuted}`}
                                            >
                                                {t(
                                                    "about.ecosystem.business.detail_result_label",
                                                    "接下来去哪里"
                                                )}
                                            </p>
                                            <p
                                                className={`mt-4 text-xl font-black leading-8 ${palette.accent}`}
                                            >
                                                {activeBusiness.detailResult}
                                            </p>
                                            <Link
                                                to={activeBusiness.route}
                                                onClick={closeBusinessDetails}
                                                className={`mt-8 inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-cyan-300/30 ${palette.primary}`}
                                            >
                                                {activeBusiness.cta}
                                                <ArrowRight className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>,
                    document.body
                )}

                <motion.section
                    id="join-ecosystem"
                    {...sectionReveal(shouldAnimate, 0.08)}
                    className={`${sectionBaseClass} ${palette.final}`}
                >
                    <div
                        className={`pointer-events-none absolute -right-[8vw] bottom-0 select-none text-[18vw] font-black uppercase leading-[0.8] ${palette.watermark}`}
                    >
                        JOIN
                    </div>
                    <div
                        className={`pointer-events-none absolute inset-0 [background-size:46px_46px] ${palette.grid}`}
                    />
                    <div className="relative z-10 mx-auto grid w-full max-w-[2140px] gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,0.78fr)_minmax(520px,0.92fr)] lg:items-center lg:gap-10 2xl:gap-14">
                        <div>
                            <p className={`text-sm font-black uppercase ${palette.label}`}>
                                {t("about.ecosystem.join.eyebrow", "参与方式")}
                            </p>
                            <h2 className="mt-3 max-w-4xl text-balance text-4xl font-black leading-tight tracking-normal sm:text-6xl lg:text-5xl xl:text-6xl 2xl:text-7xl">
                                <span className="block">
                                    {t("about.ecosystem.join.title_1", "找到参与入口，")}
                                </span>
                                <span className={`block ${palette.accent}`}>
                                    {t("about.ecosystem.join.title_2", "开始共建生态。")}
                                </span>
                            </h2>
                            <p
                                className={`mt-5 max-w-3xl text-sm leading-6 sm:text-lg sm:leading-8 ${palette.textSoft}`}
                            >
                                {t(
                                    "about.ecosystem.join.desc",
                                    "学生可以找机会、学 AI、做项目；组织可以发布活动和招募；企业与学院可以提交真实问题、共建课程或赛事。"
                                )}
                            </p>

                            <div className="mt-7 flex flex-wrap gap-3">
                                {showAppDownload ? (
                                    <Link
                                        to="/download"
                                        className={`inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 sm:px-7 ${palette.primary}`}
                                    >
                                        <Download className="h-4 w-4" />
                                        {t("about.ecosystem.join.download_cta", "下载 App")}
                                    </Link>
                                ) : null}
                                <Link
                                    to="/events"
                                    className={`inline-flex min-h-12 items-center justify-center gap-2 border px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 sm:px-7 ${palette.secondary}`}
                                >
                                    <Smartphone className="h-4 w-4" />
                                    {t("about.ecosystem.join.platform_cta", "浏览活动集合")}
                                </Link>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                            {joinCards.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.title}
                                        to={item.route}
                                        className={`group relative flex min-h-[200px] flex-col overflow-hidden border p-5 transition duration-300 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 sm:min-h-[260px] lg:min-h-[190px] xl:min-h-[280px] ${palette.card}`}
                                    >
                                        <div
                                            className={`flex h-11 w-11 items-center justify-center ${palette.accentBg} text-slate-950`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <h3 className="mt-5 text-2xl font-black leading-tight">
                                            {item.title}
                                        </h3>
                                        <p className={`mt-3 text-sm leading-6 ${palette.textSoft}`}>
                                            {item.description}
                                        </p>
                                        <div
                                            className={`mt-auto inline-flex items-center gap-2 pt-5 text-sm font-black ${palette.accent}`}
                                        >
                                            {item.action}
                                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </motion.section>
            </div>
        </div>
    );
};

export default About;
