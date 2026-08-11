import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
    ArrowRight,
    BookOpen,
    Building2,
    CalendarDays,
    Download,
    GraduationCap,
    Handshake,
    Landmark,
    Mail,
    Network,
    Rocket,
    Smartphone,
    Trophy,
    Users,
} from "lucide-react";
import { getPartnerLogoSrc } from "../data/partnerLogos";
import { useSettings } from "../context/SettingsContext";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import { useReducedMotion } from "../utils/animations";
import SEO from "./SEO";

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

const About = () => {
    const { t, i18n } = useTranslation();
    const { uiMode } = useSettings();
    const { enterpriseLogos } = useEcosystemPartners();
    const reduceMotion = useReducedMotion();
    const shouldAnimate = !reduceMotion;
    const isDayMode = uiMode === "day";
    const isEnglish = i18n.resolvedLanguage?.startsWith("en") || i18n.language?.startsWith("en");
    const enterpriseLogoWall = enterpriseLogos.filter((logo) => getPartnerLogoSrc(logo, isDayMode));
    const [heroStageRef, heroStageFrame] = useAboutHeroScale();

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
              panel: "border-slate-200 bg-white/88 shadow-[0_28px_90px_rgba(15,23,42,0.1)]",
              panelStrong:
                  "border-cyan-500/20 bg-white/92 shadow-[0_36px_110px_rgba(15,23,42,0.14)]",
              card: "border-slate-200 bg-white/88 shadow-[0_24px_70px_rgba(15,23,42,0.09)]",
              accent: "text-cyan-700",
              accentBg: "bg-cyan-500",
              altAccent: "text-amber-700",
              altAccentBg: "bg-amber-400",
              primary:
                  "bg-cyan-600 text-white shadow-[0_18px_42px_rgba(6,182,212,0.28)] hover:bg-cyan-700",
              secondary:
                  "border-slate-300 bg-white/78 text-slate-800 hover:border-cyan-400 hover:text-cyan-700",
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
              textSoft: "text-white/76",
              textMuted: "text-white/54",
              label: "text-cyan-300",
              border: "border-white/12",
              panel: "border-white/12 bg-[#121c1d]/90 shadow-[0_28px_90px_rgba(0,0,0,0.38),0_0_60px_rgba(34,211,238,0.08)]",
              panelStrong:
                  "border-cyan-200/30 bg-[#0b1718]/88 shadow-[0_36px_120px_rgba(0,0,0,0.52),0_0_86px_rgba(34,211,238,0.09)]",
              card: "border-white/12 bg-[linear-gradient(180deg,rgba(19,29,30,0.92),rgba(11,21,21,0.72))]",
              accent: "text-cyan-300",
              accentBg: "bg-cyan-300",
              altAccent: "text-amber-200",
              altAccentBg: "bg-amber-300",
              primary:
                  "bg-cyan-300 text-slate-950 shadow-[0_0_42px_rgba(103,232,249,0.28)] hover:bg-white",
              secondary:
                  "border-white/18 bg-white/[0.06] text-white hover:border-cyan-300/70 hover:bg-cyan-300/12",
              divider: "border-white/12",
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
            value: "2300+",
            label: t("about.ecosystem.stats.users", "注册用户"),
        },
        {
            value: "900+",
            label: t("about.ecosystem.stats.daily_views", "日均浏览"),
        },
        {
            value: "700+",
            label: t("about.ecosystem.stats.events", "校园活动收录"),
        },
        {
            value: "500",
            label: t("about.ecosystem.stats.community", "AI 社区参与者"),
        },
        {
            value: "300",
            label: t("about.ecosystem.stats.hackathon", "首届浙客松报名"),
        },
    ];

    const supportGroups = [
        {
            index: "01",
            code: "Campus",
            title: t("about.ecosystem.support.school_title", "校内支持"),
            headline: t("about.ecosystem.support.school_headline", "场景、空间与机制"),
            description: t(
                "about.ecosystem.support.school_desc",
                "未来学习中心与校内创新平台提供产学融合场景，让真实课题能够稳定进入校园实践。"
            ),
            icon: Landmark,
            items: [
                t("about.ecosystem.support.school_items.future_learning", "未来学习中心"),
                t("about.ecosystem.support.school_items.innovation", "创新创业学院"),
                t("about.ecosystem.support.school_items.ai_school", "人工智能学院"),
                t("about.ecosystem.support.school_items.medical", "基础医学院"),
            ],
        },
        {
            index: "02",
            code: "Enterprise",
            title: t("about.ecosystem.support.enterprise_title", "企业合作"),
            headline: t("about.ecosystem.support.enterprise_headline", "真实命题与技术资源"),
            description: t(
                "about.ecosystem.support.enterprise_desc",
                "AI 企业、开发工具与行业伙伴把真实问题、模型能力、云资源和人才通道带入校园。"
            ),
            icon: Building2,
        },
        {
            index: "03",
            code: "Capital",
            title: t("about.ecosystem.support.capital_title", "资本合作"),
            headline: t("about.ecosystem.support.capital_headline", "孵化与成长连接"),
            description: t(
                "about.ecosystem.support.capital_desc",
                "资本与产业资源为优秀项目提供更长期的成长视野，让校园成果有机会继续孵化。"
            ),
            icon: Handshake,
            items: [t("about.ecosystem.support.capital_items.five_source", "五源资本")],
        },
        {
            index: "04",
            code: "Force",
            title: t("about.ecosystem.support.organization_title", "组织合作"),
            headline: t("about.ecosystem.support.organization_headline", "社群、活动与执行力量"),
            description: t(
                "about.ecosystem.support.organization_desc",
                "学生组织、科创社团与核心负责人共同承接社群运营、活动执行和项目协作。"
            ),
            icon: Network,
            items: [
                t("about.ecosystem.support.organization_items.qiangying", "强鹰俱乐部"),
                t("about.ecosystem.support.organization_items.xlab", "XLAB"),
                t("about.ecosystem.support.organization_items.ai_association", "人工智能协会"),
                t("about.ecosystem.support.organization_items.ai_research", "AI 创研会"),
                t("about.ecosystem.support.organization_items.embedded_ai", "嵌入式人工智能协会"),
                t("about.ecosystem.support.organization_items.kab", "KAB 创业俱乐部"),
            ],
        },
    ];

    const businessLines = [
        {
            index: "01",
            code: "PLATFORM",
            title: t("about.ecosystem.business.info_title", "数字底座与机会入口"),
            short: t("about.ecosystem.business.info_short", "发现机会 / 连接主体 / 沉淀记录"),
            description: t(
                "about.ecosystem.business.info_desc",
                "把校园机会、AI 社区、项目、赛事、个人与组织身份放进同一套可发现、可参与、可沉淀的公共入口。"
            ),
            metric: t("about.ecosystem.business.info_metric", "触达 · 连接 · 记录"),
            route: "/events",
            cta: t("about.ecosystem.business.info_cta", "查看活动"),
            icon: CalendarDays,
            tone: "cyan",
        },
        {
            index: "02",
            code: "COMMUNITY",
            title: t("about.ecosystem.business.grow_title", "AI 社区与项目协作"),
            short: t("about.ecosystem.business.grow_short", "学习共建 / 组队实践 / 项目交付"),
            description: t(
                "about.ecosystem.business.grow_desc",
                "AI 社区沉淀知识与问题，智能体协会组织学习和执行，真实项目让参与者从交流走向协作与交付。"
            ),
            metric: t("about.ecosystem.business.grow_metric", "学习 → 组队 → 交付"),
            route: "/articles",
            cta: t("about.ecosystem.business.grow_cta", "进入 AI 社区"),
            icon: GraduationCap,
            tone: "emerald",
        },
        {
            index: "03",
            code: "HACKATHON",
            title: t("about.ecosystem.business.hackathon_title", "浙客松系列黑客松"),
            short: t("about.ecosystem.business.hackathon_short", "交叉赛事 / 人才选拔 / 成果认证"),
            description: t(
                "about.ecosystem.business.hackathon_desc",
                "围绕学院与企业真实命题开展跨学科实战，让学习转化为作品、交付和可验证的人才信号。"
            ),
            metric: t("about.ecosystem.business.hackathon_metric", "实战 → 作品 → 人才信号"),
            route: "/hackathon",
            cta: t("about.ecosystem.business.hackathon_cta", "查看浙客松"),
            icon: Trophy,
            tone: "amber",
        },
    ];

    const joinCards = [
        {
            title: t("about.ecosystem.join.student_title", "学生"),
            description: t(
                "about.ecosystem.join.student_desc",
                "发现校园机会，加入 AI 社区，参与项目与黑客松，把学习转化成作品。"
            ),
            action: t("about.ecosystem.join.student_cta", "发现校园机会"),
            route: "/events",
            icon: Users,
        },
        {
            title: t("about.ecosystem.join.org_title", "组织与社团"),
            description: t(
                "about.ecosystem.join.org_desc",
                "入驻组织主页，发布活动与项目招募，一起建设校园 AI 资源网络。"
            ),
            action: t("about.ecosystem.join.org_cta", "查看组织目录"),
            route: "/profiles",
            icon: Network,
        },
        {
            title: t("about.ecosystem.join.enterprise_title", "企业与课题方"),
            description: t(
                "about.ecosystem.join.enterprise_desc",
                "提交真实需求、合办主题赛事，连接学生团队与可验证的 AI 实践成果。"
            ),
            action: t("about.ecosystem.join.enterprise_cta", "联系合作"),
            route: "/future-learning",
            icon: BriefcaseIcon,
        },
    ];

    const sectionBaseClass =
        "relative flex scroll-mt-0 flex-col overflow-hidden px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-12 sm:px-6 sm:py-20 lg:h-[100svh] lg:min-h-[100svh] lg:snap-start lg:snap-always lg:pb-[clamp(1rem,3vh,2.5rem)] lg:pl-10 lg:pr-28 lg:pt-[calc(env(safe-area-inset-top)+clamp(4.5rem,8.2vh,5.125rem))] 2xl:pl-16 2xl:pr-36";
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
                    "了解拓浙AI生态如何连接学生、学院、企业与真实 AI 需求，让学习、项目、赛事和产业协作持续形成成果。"
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
                                ? "border-slate-200 bg-white/74 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-700"
                                : "border-white/10 bg-white/[0.045] text-white/42 hover:border-cyan-300/50 hover:text-cyan-200"
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
                                        ? "border-cyan-500/30 bg-cyan-500/8"
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
                                    {t("about.ecosystem.hero.title_1", "拓浙")}
                                </span>
                                <span className="block">
                                    {t("about.ecosystem.hero.title_2", "AI 生态")}
                                </span>
                                <span className={`block ${palette.accent}`}>
                                    {t("about.ecosystem.hero.title_3", "TUOZHE AI ECOSYSTEM")}
                                </span>
                            </h1>

                            <p
                                className={`mt-4 max-w-4xl text-[15px] font-bold leading-7 sm:mt-6 sm:text-xl sm:leading-9 lg:text-lg lg:leading-8 xl:text-xl xl:leading-9 2xl:text-2xl 2xl:leading-10 ${palette.textSoft}`}
                            >
                                <strong className={isDayMode ? "text-slate-950" : "text-white"}>
                                    {t("about.ecosystem.hero.strong", "海纳百川，永不设限。")}
                                </strong>{" "}
                                {t(
                                    "about.ecosystem.hero.desc",
                                    "从浙大出发，连接学生、学院、企业与真实 AI 需求，让学习、赛事、项目实践和产业协作持续形成成果。"
                                )}
                            </p>

                            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap sm:gap-3.5 lg:mt-8">
                                <Link
                                    to="/events"
                                    className={`inline-flex min-h-12 items-center justify-center gap-2.5 px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 sm:min-h-14 sm:px-8 sm:text-base 2xl:min-h-16 2xl:px-9 2xl:text-lg ${palette.primary}`}
                                >
                                    <Rocket className="h-5 w-5" />
                                    {t("about.ecosystem.hero.primary_cta", "发现生态机会")}
                                </Link>
                                <a
                                    href="#business-lines"
                                    className={`inline-flex min-h-12 items-center justify-center gap-2.5 border px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 sm:min-h-14 sm:px-8 sm:text-base 2xl:min-h-16 2xl:px-9 2xl:text-lg ${palette.secondary}`}
                                >
                                    <BookOpen className="h-5 w-5" />
                                    {t("about.ecosystem.hero.secondary_cta", "了解运行方式")}
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
                                {t("about.ecosystem.brief.watermark", "BRAND")}
                            </div>
                            <div className="relative z-10 flex min-h-[506px] flex-col justify-between 2xl:min-h-[586px]">
                                <div
                                    className={`flex items-center justify-between text-xs font-black uppercase 2xl:text-sm ${palette.label}`}
                                >
                                    <span>{t("about.ecosystem.brief.eyebrow", "Brand Motto")}</span>
                                    <span>{t("about.ecosystem.brief.status", "ZJU Origin")}</span>
                                </div>
                                <div className="py-8">
                                    <p className="max-w-3xl text-5xl font-black leading-[0.98] 2xl:text-7xl">
                                        <span className={`block ${palette.accent}`}>
                                            {t("about.ecosystem.brief.title_1", "海纳百川，")}
                                        </span>
                                        <span className="block">
                                            {t("about.ecosystem.brief.title_2", "永不设限。")}
                                        </span>
                                    </p>
                                    <p
                                        className={`mt-8 max-w-2xl text-xl font-bold leading-9 2xl:text-2xl 2xl:leading-10 ${palette.textSoft}`}
                                    >
                                        {t(
                                            "about.ecosystem.brief.desc",
                                            "从浙大出发，连接学生、学院、企业与真实 AI 需求，让每次参与都能留下可复用的成果与关系。"
                                        )}
                                    </p>
                                </div>
                                <div
                                    className={`border-l-4 py-5 pl-5 text-sm font-black uppercase tracking-normal 2xl:text-base ${
                                        isDayMode
                                            ? "border-cyan-500 text-slate-500"
                                            : "border-cyan-300 text-white/52"
                                    }`}
                                >
                                    {t(
                                        "about.ecosystem.brief.signature",
                                        "Resource aggregation / Talent network / AI-centered education"
                                    )}
                                </div>
                            </div>
                        </motion.aside>

                        <motion.div
                            {...heroReveal(shouldAnimate, 0.18)}
                            className={`grid w-full grid-cols-3 gap-px overflow-hidden border sm:grid-cols-5 xl:col-span-2 ${
                                isDayMode
                                    ? "border-cyan-500/18 bg-cyan-500/18"
                                    : "border-cyan-300/18 bg-cyan-300/18"
                            }`}
                        >
                            {proofStats.map((item) => (
                                <div
                                    key={item.label}
                                    className={`flex min-h-[64px] flex-col justify-center p-2 sm:min-h-[82px] sm:p-4 lg:min-h-[118px] lg:p-4 2xl:min-h-[144px] 2xl:p-6 ${
                                        isDayMode ? "bg-white/82" : "bg-[#0b1718]/86"
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

            <main>
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
                                    Resource Support
                                </p>
                                <h2 className="mt-3 max-w-5xl text-3xl font-black leading-tight tracking-normal sm:text-6xl lg:text-6xl 2xl:text-7xl">
                                    <span className="block">
                                        {t("about.ecosystem.support.title_1", "资源不是附属，")}
                                    </span>
                                    <span className="block">
                                        {t(
                                            "about.ecosystem.support.title_2",
                                            "而是生态成立的基础。"
                                        )}
                                    </span>
                                </h2>
                            </div>
                            <p
                                className={`max-w-3xl text-sm leading-6 sm:text-lg sm:leading-8 lg:justify-self-end lg:pb-2 ${palette.textSoft}`}
                            >
                                {t(
                                    "about.ecosystem.support.desc",
                                    "学校提供场景与机制，企业带来真实课题与技术资源，资本连接项目孵化，学生组织承接社群、活动和执行力量。"
                                )}
                            </p>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:mt-8 lg:h-[clamp(28rem,56vh,42rem)] lg:min-h-0 lg:grid-cols-4 lg:gap-5 2xl:gap-7">
                            {supportGroups.map((group) => {
                                const Icon = group.icon;
                                const textItemCount = group.items?.length || 0;
                                const isSingleSupportItem = textItemCount === 1;
                                const supportItemGridClass =
                                    textItemCount <= 1 ? "grid-cols-1" : "grid-cols-2";
                                const supportItemTextClass =
                                    isEnglish && textItemCount > 1
                                        ? textItemCount <= 4
                                            ? "text-xs sm:text-[13px] 2xl:text-sm"
                                            : "text-[11px] sm:text-xs 2xl:text-sm"
                                        : textItemCount <= 1
                                          ? "text-xl sm:text-2xl lg:text-xl 2xl:text-2xl"
                                          : textItemCount <= 4
                                            ? "text-base sm:text-lg 2xl:text-xl"
                                            : "text-sm sm:text-base 2xl:text-lg";
                                return (
                                    <article
                                        key={group.code}
                                        className={`relative flex min-h-[300px] flex-col overflow-hidden border p-5 sm:min-h-[360px] sm:p-6 lg:h-full lg:min-h-0 lg:p-6 2xl:p-7 ${palette.card}`}
                                    >
                                        <div
                                            className={`pointer-events-none absolute -bottom-8 -right-6 text-[7rem] font-black uppercase leading-none ${palette.watermark}`}
                                        >
                                            {group.code}
                                        </div>
                                        <div className="relative z-10 flex h-full flex-col">
                                            <div className="flex items-start justify-between gap-4">
                                                <div
                                                    className={`font-mono text-sm font-black uppercase 2xl:text-base ${palette.accent}`}
                                                >
                                                    {group.index} / {group.code}
                                                </div>
                                                <div
                                                    className={`flex h-11 w-11 items-center justify-center ${group.index === "03" ? palette.altAccentBg : palette.accentBg} text-slate-950`}
                                                >
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                            </div>
                                            <h3 className="mt-5 text-3xl font-black leading-tight sm:text-4xl lg:text-3xl 2xl:text-4xl">
                                                {group.title}
                                            </h3>
                                            <p
                                                className={`mt-2 text-sm font-black ${group.index === "03" ? palette.altAccent : palette.accent}`}
                                            >
                                                {group.headline}
                                            </p>
                                            <p
                                                className={`mt-4 text-sm leading-6 ${palette.textSoft}`}
                                            >
                                                {group.description}
                                            </p>
                                            {group.index === "02" ? (
                                                enterpriseLogoWall.length > 0 ? (
                                                    <div
                                                        className={`mt-auto grid grid-cols-3 gap-2 border-t pt-5 ${palette.divider}`}
                                                    >
                                                        {enterpriseLogoWall.map((logo) => {
                                                            const logoSrc = getPartnerLogoSrc(
                                                                logo,
                                                                isDayMode
                                                            );
                                                            const logoKey =
                                                                `${logo.id || ""} ${logo.name || ""} ${logo.alt || ""}`.toLowerCase();
                                                            const tileSpan = logoKey.includes(
                                                                "getui"
                                                            )
                                                                ? "col-span-3"
                                                                : "";
                                                            return (
                                                                <div
                                                                    key={
                                                                        logo.id ||
                                                                        logo.src ||
                                                                        logo.name
                                                                    }
                                                                    className={`flex min-h-[52px] items-center justify-center px-2.5 py-2 ${tileSpan} ${
                                                                        isDayMode
                                                                            ? "bg-white/72"
                                                                            : "bg-white/[0.04]"
                                                                    }`}
                                                                >
                                                                    <img
                                                                        src={logoSrc}
                                                                        alt={
                                                                            logo.alt ||
                                                                            `${logo.name || "合作方"} logo`
                                                                        }
                                                                        className={`max-h-6 w-auto max-w-full object-contain sm:max-h-7 ${
                                                                            !isDayMode
                                                                                ? logo.darkClassName ||
                                                                                  ""
                                                                                : ""
                                                                        }`}
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : null
                                            ) : (
                                                <div
                                                    className={`border-t ${
                                                        isSingleSupportItem
                                                            ? "mt-auto pt-5"
                                                            : `flex min-h-0 flex-1 flex-col ${isEnglish ? "mt-4 pt-4" : "mt-6 pt-5"}`
                                                    } ${palette.divider}`}
                                                >
                                                    <div
                                                        className={`grid ${supportItemGridClass} ${
                                                            isSingleSupportItem
                                                                ? "min-h-[92px] sm:min-h-[104px] lg:min-h-[108px]"
                                                                : isEnglish
                                                                  ? "min-h-0 flex-1 content-start gap-1.5"
                                                                  : "min-h-[144px] flex-1 gap-2.5 sm:min-h-[156px] lg:min-h-0"
                                                        }`}
                                                    >
                                                        {group.items.map((item) => (
                                                            <span
                                                                key={item}
                                                                className={`flex min-w-0 items-center justify-center break-words border text-center font-black leading-tight ${isEnglish ? "px-1.5 py-1.5" : "px-1.5 py-3"} ${supportItemTextClass} ${
                                                                    isDayMode
                                                                        ? "border-slate-200 bg-white/80 text-slate-800"
                                                                        : "border-white/10 bg-white/[0.055] text-white/82"
                                                                }`}
                                                            >
                                                                {item}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </article>
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
                                {t("about.ecosystem.business.eyebrow", "Ecosystem Engine")}
                            </p>
                            <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal sm:text-6xl lg:text-6xl 2xl:text-7xl">
                                <span className="block">
                                    {t("about.ecosystem.business.title_1", "三项生态机制，")}
                                </span>
                                <span className="block">
                                    {t(
                                        "about.ecosystem.business.title_2",
                                        "让人才、真实需求与成果持续流动。"
                                    )}
                                </span>
                            </h2>
                            <p
                                className={`mt-4 max-w-4xl text-sm leading-6 sm:text-lg sm:leading-8 ${palette.textSoft}`}
                            >
                                {t(
                                    "about.ecosystem.business.desc",
                                    "数字底座负责触达与记录，AI 社区负责学习与协作，浙客松负责实战验证和人才识别；三者共同把资源送入真实项目与产业连接。"
                                )}
                            </p>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-1 lg:mt-8 lg:h-[clamp(25rem,50vh,38rem)] lg:min-h-0 lg:grid-cols-3 lg:gap-5 2xl:gap-7">
                            {businessLines.map((item) => {
                                const Icon = item.icon;
                                const isAmber = item.tone === "amber";
                                const isEmerald = item.tone === "emerald";
                                const accentClass = isAmber
                                    ? palette.altAccent
                                    : isEmerald
                                      ? isDayMode
                                          ? "text-emerald-700"
                                          : "text-emerald-200"
                                      : palette.accent;
                                const iconBgClass = isAmber
                                    ? palette.altAccentBg
                                    : isEmerald
                                      ? "bg-emerald-400"
                                      : palette.accentBg;

                                return (
                                    <Link
                                        key={item.code}
                                        to={item.route}
                                        className={`group relative flex min-h-[280px] flex-col overflow-hidden border border-l-4 p-5 transition duration-300 hover:-translate-y-1 sm:min-h-[300px] sm:p-7 lg:h-full lg:min-h-0 lg:p-7 2xl:p-8 ${
                                            isAmber
                                                ? isDayMode
                                                    ? "border-l-amber-400"
                                                    : "border-l-amber-300"
                                                : isEmerald
                                                  ? "border-l-emerald-400"
                                                  : isDayMode
                                                    ? "border-l-cyan-500"
                                                    : "border-l-cyan-300"
                                        } ${palette.card}`}
                                    >
                                        <div
                                            className={`pointer-events-none absolute -bottom-7 -right-5 text-[7rem] font-black uppercase leading-none transition duration-300 group-hover:translate-x-1 ${palette.watermark}`}
                                        >
                                            {item.code}
                                        </div>
                                        <div className="relative z-10 flex h-full flex-col">
                                            <div className="flex items-start justify-between gap-4">
                                                <div
                                                    className={`font-mono text-sm font-black uppercase 2xl:text-base ${accentClass}`}
                                                >
                                                    {item.index} / {item.code}
                                                </div>
                                                <div
                                                    className={`flex h-12 w-12 items-center justify-center ${iconBgClass} text-slate-950`}
                                                >
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                            </div>
                                            <h3 className="mt-6 text-3xl font-black leading-tight sm:text-4xl lg:text-4xl">
                                                {item.title}
                                            </h3>
                                            <p className={`mt-2 text-sm font-black ${accentClass}`}>
                                                {item.short}
                                            </p>
                                            <p
                                                className={`mt-5 text-sm leading-7 lg:text-base ${palette.textSoft}`}
                                            >
                                                {item.description}
                                            </p>
                                            <div
                                                className={`mt-auto flex items-end justify-between gap-4 border-t pt-5 ${palette.divider}`}
                                            >
                                                <div>
                                                    <div
                                                        className={`text-[11px] font-black uppercase ${palette.textMuted}`}
                                                    >
                                                        Focus
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
                                                    {item.cta}
                                                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </motion.section>

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
                                Join the Ecosystem
                            </p>
                            <h2 className="mt-3 max-w-4xl text-4xl font-black leading-tight tracking-normal sm:text-6xl lg:text-7xl">
                                <span className="block">
                                    {t("about.ecosystem.join.title_1", "加入拓浙")}
                                </span>
                                <span className={`block ${palette.accent}`}>
                                    {t("about.ecosystem.join.title_2", "AI 生态")}
                                </span>
                            </h2>
                            <p
                                className={`mt-5 max-w-3xl text-sm leading-6 sm:text-lg sm:leading-8 ${palette.textSoft}`}
                            >
                                {t(
                                    "about.ecosystem.join.desc",
                                    "无论你是学生、组织负责人、企业课题方还是学校合作伙伴，都可以从具体机会、社区、项目、赛事或合作入口开始行动。"
                                )}
                            </p>

                            <div className="mt-7 flex flex-wrap gap-3">
                                <Link
                                    to="/download"
                                    className={`inline-flex min-h-12 items-center justify-center gap-2 px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/30 sm:px-7 ${palette.primary}`}
                                >
                                    <Download className="h-4 w-4" />
                                    {t("about.ecosystem.join.download_cta", "下载 App")}
                                </Link>
                                <Link
                                    to="/events"
                                    className={`inline-flex min-h-12 items-center justify-center gap-2 border px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 sm:px-7 ${palette.secondary}`}
                                >
                                    <Smartphone className="h-4 w-4" />
                                    {t("about.ecosystem.join.platform_cta", "发现校园机会")}
                                </Link>
                                <Link
                                    to="/future-learning"
                                    className={`inline-flex min-h-12 items-center justify-center gap-2 border px-5 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 sm:px-7 ${palette.secondary}`}
                                >
                                    <Mail className="h-4 w-4" />
                                    {t("about.ecosystem.join.contact_cta", "联系合作")}
                                </Link>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                            {joinCards.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.title}
                                        to={item.route}
                                        className={`group relative min-h-[200px] overflow-hidden border p-5 transition duration-300 hover:-translate-y-1 sm:min-h-[260px] lg:min-h-[190px] xl:min-h-[280px] ${palette.card}`}
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
                                            className={`mt-5 inline-flex items-center gap-2 text-sm font-black ${palette.accent}`}
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
            </main>
        </div>
    );
};

const BriefcaseIcon = Building2;

export default About;
