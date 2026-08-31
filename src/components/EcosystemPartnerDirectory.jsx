/*
THESIS: 支持方名录用真实机构阵容证明生态规模，拒绝用抽象关系图替代内容。
OWN-WORLD: 继承 About 的深夜蓝/白昼白与单一冰川蓝，以一张连续登记册、细分隔线和真实标志建立秩序。
STORY: 访客先看见 18 家支持方怎样分布，再按四组筛选、搜索并进入可信详情。
FIRST VIEWPORT: 紧凑标题与搜索位于上部，四组真实机构登记册横贯页面，正文结果在首屏内开始出现。
FORM: Operate 模式的支持方登记册，结构候选 3，使用种子 a924fa69；不建立新的品牌世界。
*/

import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
    ArrowLeft,
    ArrowUpRight,
    Building2,
    Handshake,
    Landmark,
    Network,
    RefreshCw,
    Search,
    X,
} from "lucide-react";

import { useSettings } from "../context/SettingsContext";
import {
    CORE_PARTNER_SCOPE,
    ECOSYSTEM_SUPPORT_CATEGORIES,
    ECOSYSTEM_SUPPORT_VIEW_GROUPS,
    getSupportViewGroupId,
    getPartnerLogoSrc,
    getPartnerProfilePath,
    normalizeEcosystemPartner,
    normalizePartnerScope,
} from "../data/partnerLogos";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import { useReducedMotion } from "../utils/animations";
import { startRouteViewTransition } from "../utils/routeViewTransition";
import SEO from "./SEO";

const categoryIcons = {
    college: Landmark,
    enterprise: Building2,
    capital: Handshake,
    club: Network,
};

const categoryFallbackLabels = {
    college: "学院与校内机构",
    technology_enterprise: "技术企业",
    industry_enterprise: "行业企业",
    capital: "资本与孵化",
    club: "社团与组织",
};

const formalSupportCategoryIds = new Set(
    ECOSYSTEM_SUPPORT_CATEGORIES.map((category) => category.id)
);
const viewGroupIds = new Set(ECOSYSTEM_SUPPORT_VIEW_GROUPS.map((group) => group.id));
const selectableCategoryIds = new Set([...formalSupportCategoryIds, ...viewGroupIds]);

const ledgerGroupClasses = {
    college: "border-r lg:col-span-3 lg:border-t-0",
    enterprise: "lg:col-span-5 lg:border-r lg:border-t-0",
    capital: "border-r border-t lg:col-span-2 lg:border-t-0",
    club: "border-t lg:col-span-2 lg:border-t-0",
};

const ledgerPreviewLimits = {
    college: 2,
    enterprise: 8,
    capital: 1,
    club: 4,
};

const getLocalizedValue = (partner, key, isEnglish) => {
    if (isEnglish) return partner[`${key}_en`] || partner[key] || "";
    return partner[key] || partner[`${key}_en`] || "";
};

const getPartnerInitials = (name = "") => {
    const cleanName = String(name).trim();
    if (!cleanName) return "AI";
    const words = cleanName.split(/\s+/).filter(Boolean);
    if (words.length > 1)
        return words
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase();
    return cleanName.slice(0, 2).toUpperCase();
};

const SupporterPreviewMark = ({ active, className = "", isDayMode, isEnglish, partner }) => {
    const displayName = getLocalizedValue(partner, "name", isEnglish);
    const logoSrc = getPartnerLogoSrc(partner, isDayMode !== active);

    return (
        <span
            title={displayName}
            className={`${className} min-w-0 items-center gap-2 border-t py-2.5 ${
                active
                    ? isDayMode
                        ? "border-white/14"
                        : "border-cyan-950/14"
                    : isDayMode
                      ? "border-slate-200"
                      : "border-white/10"
            }`}
        >
            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[8px] ${
                    active
                        ? isDayMode
                            ? "bg-white/10"
                            : "bg-cyan-950/[0.07]"
                        : isDayMode
                          ? "bg-slate-100"
                          : "bg-white/[0.055]"
                }`}
            >
                {logoSrc ? (
                    <img
                        src={logoSrc}
                        alt=""
                        className="max-h-6 max-w-[26px] object-contain"
                        loading="eager"
                    />
                ) : (
                    <span className="text-[10px] font-black">
                        {getPartnerInitials(displayName)}
                    </span>
                )}
            </span>
            <span className="min-w-0 truncate text-xs font-bold">{displayName}</span>
        </span>
    );
};

const SupporterLedger = ({
    activeViewGroup,
    isDayMode,
    isEnglish,
    onSelect,
    reduceMotion,
    t,
    viewGroupCounts,
    viewGroupSupporters,
}) => (
    <motion.div
        initial={reduceMotion ? false : { clipPath: "inset(0 100% 0 0)", opacity: 0.76 }}
        animate={{ clipPath: "inset(0 0 0 0)", opacity: 1 }}
        transition={{
            duration: reduceMotion ? 0 : 0.78,
            delay: reduceMotion ? 0 : 0.08,
            ease: [0.16, 1, 0.3, 1],
        }}
        className={`mt-8 overflow-hidden border ${
            isDayMode
                ? "border-slate-300 bg-white shadow-[0_22px_54px_rgba(15,23,42,0.08)]"
                : "border-cyan-100/18 bg-[#081516] shadow-[0_24px_64px_rgba(0,0,0,0.34)]"
        }`}
    >
        <div className="grid grid-cols-2 lg:grid-cols-12">
            {ECOSYSTEM_SUPPORT_VIEW_GROUPS.map((group) => {
                const Icon = categoryIcons[group.id];
                const active = activeViewGroup === group.id;
                const groupLabel = t(
                    `about.ecosystem.supporter_directory.view_groups.${group.id}`,
                    isEnglish ? group.labelEn : group.label
                );
                const groupSupporters = viewGroupSupporters[group.id] || [];
                const previewLimit = ledgerPreviewLimits[group.id];
                return (
                    <button
                        key={group.id}
                        type="button"
                        onClick={() => onSelect(group.id)}
                        aria-pressed={active}
                        aria-label={`${groupLabel} · ${viewGroupCounts[group.id] || 0}`}
                        style={{
                            viewTransitionName:
                                !reduceMotion && active
                                    ? `support-category-${group.id}`
                                    : undefined,
                        }}
                        className={`group/ledger relative flex min-h-[196px] flex-col items-stretch justify-start px-4 py-5 text-left outline-none transition duration-300 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/80 sm:min-h-[220px] sm:px-5 lg:min-h-[240px] lg:px-6 ${ledgerGroupClasses[group.id]} ${
                            active
                                ? isDayMode
                                    ? "theme-on-dark bg-slate-950 text-white"
                                    : "bg-cyan-200 text-cyan-950"
                                : isDayMode
                                  ? "border-slate-300 bg-white text-slate-950 hover:bg-cyan-50"
                                  : "border-white/12 bg-[#081516] text-white hover:bg-white/[0.055]"
                        }`}
                    >
                        <span className="flex items-start justify-between gap-3">
                            <span>
                                <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.08em] opacity-65">
                                    <Icon size={15} aria-hidden="true" />
                                    {group.code}
                                </span>
                                <span className="mt-3 block text-xl font-black tracking-[-0.025em] sm:text-2xl">
                                    {groupLabel}
                                </span>
                            </span>
                            <span className="text-4xl font-black leading-none tracking-[-0.04em] tabular-nums sm:text-5xl">
                                {String(viewGroupCounts[group.id] || 0).padStart(2, "0")}
                            </span>
                        </span>

                        <span
                            className={`mt-5 grid gap-x-4 ${
                                group.id === "enterprise"
                                    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
                                    : group.id === "capital"
                                      ? "grid-cols-1"
                                      : "grid-cols-1 xl:grid-cols-2"
                            }`}
                        >
                            {groupSupporters.slice(0, previewLimit).map((partner, index) => {
                                const responsiveVisibility =
                                    group.id === "enterprise" && index >= 4
                                        ? "hidden xl:flex"
                                        : (group.id === "enterprise" || group.id === "club") &&
                                            index >= 2
                                          ? "hidden sm:flex"
                                          : "flex";
                                return (
                                    <SupporterPreviewMark
                                        key={partner.id}
                                        active={active}
                                        className={responsiveVisibility}
                                        isDayMode={isDayMode}
                                        isEnglish={isEnglish}
                                        partner={partner}
                                    />
                                );
                            })}
                        </span>
                    </button>
                );
            })}
        </div>
    </motion.div>
);

const EcosystemPartnerDirectory = () => {
    const { t, i18n } = useTranslation();
    const { uiMode } = useSettings();
    const navigate = useNavigate();
    const { partners, loading, error, refresh } = useEcosystemPartners();
    const reduceMotion = useReducedMotion();
    const isDayMode = uiMode === "day";
    const isEnglish = (i18n.resolvedLanguage || i18n.language || "zh").startsWith("en");
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState("");
    const requestedCategory = searchParams.get("category");
    const activeCategory = selectableCategoryIds.has(requestedCategory) ? requestedCategory : "all";
    const activeViewGroup =
        activeCategory === "all"
            ? "all"
            : viewGroupIds.has(activeCategory)
              ? activeCategory
              : getSupportViewGroupId(activeCategory);
    const setActiveCategory = (category) => {
        const next = new URLSearchParams(searchParams);
        if (selectableCategoryIds.has(category)) {
            next.set("category", category);
        } else {
            next.delete("category");
        }
        setSearchParams(next, { replace: true, preventScrollReset: true });
    };

    const coreSupporters = useMemo(
        () =>
            partners
                .map(normalizeEcosystemPartner)
                .filter(
                    (partner) =>
                        partner.enabled &&
                        normalizePartnerScope(partner.partner_scope) === CORE_PARTNER_SCOPE
                ),
        [partners]
    );

    const categoryCounts = useMemo(
        () =>
            coreSupporters.reduce((counts, partner) => {
                counts[partner.support_category] = (counts[partner.support_category] || 0) + 1;
                return counts;
            }, {}),
        [coreSupporters]
    );
    const viewGroupCounts = useMemo(
        () =>
            ECOSYSTEM_SUPPORT_VIEW_GROUPS.reduce((counts, group) => {
                counts[group.id] = group.categoryIds.reduce(
                    (total, categoryId) => total + (categoryCounts[categoryId] || 0),
                    0
                );
                return counts;
            }, {}),
        [categoryCounts]
    );
    const viewGroupSupporters = useMemo(
        () =>
            ECOSYSTEM_SUPPORT_VIEW_GROUPS.reduce((groups, group) => {
                const categoryIds = new Set(group.categoryIds);
                groups[group.id] = coreSupporters.filter((partner) =>
                    categoryIds.has(partner.support_category)
                );
                return groups;
            }, {}),
        [coreSupporters]
    );
    const activeSupportCategoryIds = useMemo(() => {
        if (activeCategory === "all") return null;
        const viewGroup = ECOSYSTEM_SUPPORT_VIEW_GROUPS.find(
            (group) => group.id === activeCategory
        );
        return new Set(viewGroup?.categoryIds || [activeCategory]);
    }, [activeCategory]);

    const normalizedQuery = query.trim().toLocaleLowerCase(isEnglish ? "en" : "zh-CN");
    const filteredSupporters = useMemo(
        () =>
            coreSupporters.filter((partner) => {
                if (
                    activeSupportCategoryIds &&
                    !activeSupportCategoryIds.has(partner.support_category)
                ) {
                    return false;
                }
                if (!normalizedQuery) return true;
                return [
                    partner.name,
                    partner.name_en,
                    partner.description,
                    partner.description_en,
                    partner.cooperation_direction,
                    partner.cooperation_direction_en,
                ]
                    .map((value) =>
                        String(value || "").toLocaleLowerCase(isEnglish ? "en" : "zh-CN")
                    )
                    .some((value) => value.includes(normalizedQuery));
            }),
        [activeSupportCategoryIds, coreSupporters, isEnglish, normalizedQuery]
    );

    const categoryLabel = (category) =>
        t(
            `about.ecosystem.supporter_directory.categories.${category.id}`,
            isEnglish ? category.labelEn : categoryFallbackLabels[category.id] || category.label
        );

    const viewGroupLabel = (group) =>
        t(
            `about.ecosystem.supporter_directory.view_groups.${group.id}`,
            isEnglish ? group.labelEn : group.label
        );

    const activeCategoryLabel =
        activeCategory === "all"
            ? t("about.ecosystem.supporter_directory.all", "全部支持方")
            : viewGroupIds.has(activeCategory)
              ? viewGroupLabel(
                    ECOSYSTEM_SUPPORT_VIEW_GROUPS.find((group) => group.id === activeCategory) ||
                        ECOSYSTEM_SUPPORT_VIEW_GROUPS[0]
                )
              : categoryLabel(
                    ECOSYSTEM_SUPPORT_CATEGORIES.find(
                        (category) => category.id === activeCategory
                    ) || ECOSYSTEM_SUPPORT_CATEGORIES[0]
                );

    const clearFilters = () => {
        setActiveCategory("all");
        setQuery("");
    };

    const renderPartner = (partner, index) => {
        const displayName = getLocalizedValue(partner, "name", isEnglish);
        const description = getLocalizedValue(partner, "description", isEnglish);
        const cooperationDirection = getLocalizedValue(partner, "cooperation_direction", isEnglish);
        const logoSrc = getPartnerLogoSrc(partner, isDayMode);
        const profilePath = getPartnerProfilePath(partner);
        const externalUrl = !profilePath ? partner.link_url : "";
        const actionLabel = profilePath
            ? t("about.ecosystem.supporter_directory.profile_cta", "查看组织主页")
            : externalUrl
              ? t("about.ecosystem.supporter_directory.website_cta", "访问官方网站")
              : t("about.ecosystem.supporter_directory.no_link", "支持信息");
        const category = ECOSYSTEM_SUPPORT_CATEGORIES.find(
            (item) => item.id === partner.support_category
        );

        const row = (
            <div
                className={`group relative grid grid-cols-[54px_minmax(0,1fr)] items-start gap-x-4 gap-y-5 border-t py-6 transition-colors sm:grid-cols-[30px_54px_minmax(0,1fr)_minmax(220px,0.72fr)_auto] sm:items-center sm:gap-6 lg:py-7 ${
                    isDayMode
                        ? "border-slate-200 hover:bg-white/70"
                        : "border-white/10 hover:bg-white/[0.035]"
                }`}
            >
                <span
                    className={`hidden font-mono text-xs font-black tabular-nums sm:block ${
                        isDayMode ? "text-slate-300" : "text-white/20"
                    }`}
                    aria-hidden="true"
                >
                    {String(index + 1).padStart(2, "0")}
                </span>
                <span
                    className={`absolute bottom-5 left-0 top-5 w-px origin-center scale-y-0 transition-transform duration-300 group-hover:scale-y-100 ${
                        isDayMode ? "bg-cyan-600" : "bg-cyan-200"
                    }`}
                    aria-hidden="true"
                />
                <div
                    className={`flex h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-[12px] ${
                        isDayMode ? "bg-white" : "bg-white/[0.07]"
                    }`}
                >
                    {logoSrc ? (
                        <img
                            src={logoSrc}
                            alt=""
                            className="max-h-9 max-w-[42px] object-contain"
                            loading="lazy"
                        />
                    ) : (
                        <span
                            className={`text-sm font-black ${isDayMode ? "text-cyan-800" : "text-cyan-200"}`}
                        >
                            {getPartnerInitials(displayName)}
                        </span>
                    )}
                </div>

                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="text-lg font-black tracking-[-0.02em] sm:text-xl">
                            {displayName}
                        </h2>
                        <span
                            className={`text-xs font-bold ${isDayMode ? "text-cyan-700" : "text-cyan-200"}`}
                        >
                            {category ? categoryLabel(category) : ""}
                        </span>
                    </div>
                    {description ? (
                        <p
                            className={`mt-2 max-w-[68ch] text-sm leading-6 ${isDayMode ? "text-slate-600" : "text-white/65"}`}
                        >
                            {description}
                        </p>
                    ) : null}
                </div>

                <div className="col-span-2 min-w-0 sm:col-span-1 sm:pl-2">
                    <p
                        className={`text-xs font-black ${isDayMode ? "text-slate-400" : "text-white/35"}`}
                    >
                        {t("about.ecosystem.supporter_directory.support_label", "支持方向")}
                    </p>
                    <p
                        className={`mt-1.5 text-sm font-bold leading-6 ${isDayMode ? "text-slate-800" : "text-white/82"}`}
                    >
                        {cooperationDirection ||
                            t(
                                "about.ecosystem.supporter_directory.support_pending",
                                "合作信息持续更新"
                            )}
                    </p>
                </div>

                <div
                    className={`col-span-2 flex items-center justify-between gap-3 text-sm font-bold sm:col-span-1 sm:justify-end ${
                        profilePath || externalUrl
                            ? isDayMode
                                ? "text-cyan-700"
                                : "text-cyan-200"
                            : isDayMode
                              ? "text-slate-400"
                              : "text-white/35"
                    }`}
                >
                    <span className="sm:sr-only">{actionLabel}</span>
                    <span className="hidden xl:inline">{actionLabel}</span>
                    {profilePath || externalUrl ? (
                        <ArrowUpRight
                            size={18}
                            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                            aria-hidden="true"
                        />
                    ) : (
                        <span className="font-mono text-xs tabular-nums">
                            {String(index + 1).padStart(2, "0")}
                        </span>
                    )}
                </div>
            </div>
        );

        if (profilePath) {
            return (
                <Link
                    key={partner.id}
                    to={profilePath}
                    aria-label={`${displayName} · ${actionLabel}`}
                    className="block rounded-[12px] px-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 sm:px-4"
                >
                    {row}
                </Link>
            );
        }

        if (externalUrl) {
            return (
                <a
                    key={partner.id}
                    href={externalUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${displayName} · ${actionLabel}`}
                    className="block rounded-[12px] px-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 sm:px-4"
                >
                    {row}
                </a>
            );
        }

        return (
            <article key={partner.id} className="px-3 sm:px-4">
                {row}
            </article>
        );
    };

    return (
        <div
            className={`relative min-h-screen overflow-hidden pt-[calc(env(safe-area-inset-top)+86px)] md:pt-[calc(env(safe-area-inset-top)+112px)] ${
                isDayMode
                    ? "bg-[#eef3f3] text-slate-950"
                    : "bg-[radial-gradient(circle_at_78%_0%,rgba(34,211,238,0.11),transparent_34%),linear-gradient(145deg,#04090a_0%,#071313_58%,#030707_100%)] text-white"
            }`}
        >
            <SEO
                title={t(
                    "about.ecosystem.supporter_directory.meta_title",
                    "生态支持方｜拓浙AI生态"
                )}
                description={t(
                    "about.ecosystem.supporter_directory.meta_desc",
                    "查看支持拓浙 AI 生态的校内机构、企业、资本与校园组织。"
                )}
            />

            <main className="relative z-10 mx-auto w-full max-w-[1640px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
                <Link
                    to="/about#resource-support"
                    onClick={(event) =>
                        startRouteViewTransition({
                            event,
                            navigate,
                            to: "/about#resource-support",
                            state: { fromSupportDirectory: true, category: activeCategory },
                            reducedMotion: reduceMotion,
                        })
                    }
                    className={`inline-flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-400/80 ${
                        isDayMode
                            ? "text-slate-600 hover:bg-white hover:text-cyan-800"
                            : "text-white/64 hover:bg-white/[0.06] hover:text-white"
                    }`}
                >
                    <ArrowLeft size={18} />
                    {t("about.ecosystem.supporter_directory.back", "返回生态介绍")}
                </Link>

                <section
                    className={`mt-5 border-b pb-10 ${isDayMode ? "border-slate-300" : "border-white/16"}`}
                >
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0.76, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: reduceMotion ? 0 : 0.58,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                        className="grid items-end gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.62fr)] lg:gap-16"
                    >
                        <div>
                            <p
                                className={`text-sm font-black ${isDayMode ? "text-cyan-800" : "text-cyan-200"}`}
                            >
                                {t(
                                    "about.ecosystem.supporter_directory.registry_label",
                                    "支持方登记册"
                                )}
                            </p>
                            <h1 className="mt-3 text-5xl font-black leading-none tracking-[-0.035em] sm:text-6xl lg:text-[clamp(4.5rem,5.8vw,5.8rem)]">
                                {t("about.ecosystem.supporter_directory.title", "生态支持方")}
                            </h1>
                            <p
                                className={`mt-4 max-w-[70ch] text-sm leading-6 sm:text-base sm:leading-7 ${
                                    isDayMode ? "text-slate-600" : "text-white/66"
                                }`}
                            >
                                {t(
                                    "about.ecosystem.supporter_directory.desc",
                                    "从校内课程与科研场景，到企业技术与产业资源、资本和校园组织协作，这些支持方共同让学习、赛事与真实项目持续发生。"
                                )}
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[148px_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[148px_minmax(0,1fr)]">
                            <button
                                type="button"
                                onClick={() => setActiveCategory("all")}
                                aria-pressed={activeCategory === "all"}
                                style={{
                                    viewTransitionName:
                                        !reduceMotion && activeCategory === "all"
                                            ? "support-category-all"
                                            : undefined,
                                }}
                                className={`flex min-h-[62px] items-center justify-between border px-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-400/80 ${
                                    activeCategory === "all"
                                        ? isDayMode
                                            ? "theme-on-dark border-slate-950 bg-slate-950 text-white"
                                            : "border-cyan-200 bg-cyan-200 text-cyan-950"
                                        : isDayMode
                                          ? "border-slate-300 bg-white text-slate-950 hover:border-cyan-700"
                                          : "border-white/16 bg-[#081516] text-white hover:border-cyan-200/50"
                                }`}
                            >
                                <span className="text-3xl font-black leading-none tracking-[-0.035em] tabular-nums">
                                    {coreSupporters.length}
                                </span>
                                <span className="text-xs font-black leading-4">
                                    {t(
                                        "about.ecosystem.supporter_directory.network_total",
                                        "核心支持方"
                                    )}
                                </span>
                            </button>

                            <label className="relative block">
                                <span className="sr-only">
                                    {t(
                                        "about.ecosystem.supporter_directory.search_label",
                                        "搜索支持方"
                                    )}
                                </span>
                                <Search
                                    size={18}
                                    className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${
                                        isDayMode ? "text-slate-400" : "text-white/38"
                                    }`}
                                />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder={t(
                                        "about.ecosystem.supporter_directory.search_placeholder",
                                        "搜索名称、合作方向或支持内容"
                                    )}
                                    className={`min-h-[62px] w-full border py-3 pl-11 pr-11 text-base outline-none transition focus:ring-2 focus:ring-cyan-400/55 ${
                                        isDayMode
                                            ? "border-slate-300 bg-white text-slate-950 placeholder:text-slate-500"
                                            : "border-white/16 bg-[#081516] text-white placeholder:text-white/46"
                                    }`}
                                />
                                {query ? (
                                    <button
                                        type="button"
                                        onClick={() => setQuery("")}
                                        aria-label={t(
                                            "about.ecosystem.supporter_directory.clear_search",
                                            "清除搜索"
                                        )}
                                        className={`absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 ${
                                            isDayMode
                                                ? "text-slate-500 hover:bg-slate-100"
                                                : "text-white/55 hover:bg-white/10"
                                        }`}
                                    >
                                        <X size={17} />
                                    </button>
                                ) : null}
                            </label>
                        </div>
                    </motion.div>

                    <SupporterLedger
                        activeViewGroup={activeViewGroup}
                        isDayMode={isDayMode}
                        isEnglish={isEnglish}
                        onSelect={setActiveCategory}
                        reduceMotion={reduceMotion}
                        t={t}
                        viewGroupCounts={viewGroupCounts}
                        viewGroupSupporters={viewGroupSupporters}
                    />
                </section>

                {error ? (
                    <div
                        className={`mt-6 flex flex-col gap-3 rounded-[12px] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
                            isDayMode
                                ? "bg-amber-50 text-amber-900"
                                : "bg-amber-300/10 text-amber-100"
                        }`}
                        role="status"
                    >
                        <span>
                            {t(
                                "about.ecosystem.supporter_directory.fallback_notice",
                                "实时数据暂时无法连接，当前显示内置支持方名录。"
                            )}
                        </span>
                        <button
                            type="button"
                            onClick={() => refresh({ clearCache: true })}
                            className="inline-flex min-h-10 items-center gap-2 self-start rounded-[9px] px-3 font-bold outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 sm:self-auto"
                        >
                            <RefreshCw size={16} />
                            {t("about.ecosystem.supporter_directory.retry", "重新加载")}
                        </button>
                    </div>
                ) : null}

                <section className="mt-8">
                    <div className="min-w-0">
                        <div className="flex items-end justify-between gap-4 px-3 pb-3 sm:px-4">
                            <div>
                                <h2 className="text-2xl font-black tracking-[-0.025em]">
                                    {activeCategoryLabel}
                                </h2>
                                <p
                                    className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-white/45"}`}
                                >
                                    {t(
                                        "about.ecosystem.supporter_directory.count",
                                        "{{count}} 个支持方",
                                        {
                                            count: filteredSupporters.length,
                                        }
                                    )}
                                </p>
                            </div>
                        </div>

                        {loading && coreSupporters.length === 0 ? (
                            <div className="border-b">
                                {[0, 1, 2].map((item) => (
                                    <div
                                        key={item}
                                        className={`grid animate-pulse gap-4 border-t px-4 py-7 sm:grid-cols-[54px_1fr_0.7fr] ${
                                            isDayMode ? "border-slate-200" : "border-white/10"
                                        }`}
                                    >
                                        <div
                                            className={`h-[54px] rounded-[12px] ${isDayMode ? "bg-slate-200" : "bg-white/10"}`}
                                        />
                                        <div className="space-y-3">
                                            <div
                                                className={`h-5 w-48 ${isDayMode ? "bg-slate-200" : "bg-white/10"}`}
                                            />
                                            <div
                                                className={`h-3 w-full max-w-lg ${isDayMode ? "bg-slate-100" : "bg-white/[0.06]"}`}
                                            />
                                        </div>
                                        <div
                                            className={`h-4 w-36 ${isDayMode ? "bg-slate-100" : "bg-white/[0.06]"}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : filteredSupporters.length > 0 ? (
                            <motion.div
                                key={`${activeCategory}:${normalizedQuery}`}
                                initial={reduceMotion ? false : { opacity: 0.72, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    duration: reduceMotion ? 0 : 0.28,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                                className={`border-b ${isDayMode ? "border-slate-200" : "border-white/10"}`}
                            >
                                {filteredSupporters.map(renderPartner)}
                            </motion.div>
                        ) : (
                            <div
                                className={`border-y px-5 py-16 text-center ${
                                    isDayMode ? "border-slate-200" : "border-white/10"
                                }`}
                            >
                                <h3 className="text-xl font-black">
                                    {t(
                                        "about.ecosystem.supporter_directory.empty_title",
                                        "没有找到匹配的支持方"
                                    )}
                                </h3>
                                <p
                                    className={`mx-auto mt-3 max-w-lg text-sm leading-6 ${
                                        isDayMode ? "text-slate-500" : "text-white/52"
                                    }`}
                                >
                                    {t(
                                        "about.ecosystem.supporter_directory.empty_desc",
                                        "可以清除搜索词，或切换到其他支持方分类。"
                                    )}
                                </p>
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className={`mt-6 min-h-11 rounded-[10px] px-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 ${
                                        isDayMode
                                            ? "bg-slate-950 text-white"
                                            : "bg-cyan-200 text-cyan-950"
                                    }`}
                                >
                                    {t(
                                        "about.ecosystem.supporter_directory.clear_filters",
                                        "查看全部支持方"
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default EcosystemPartnerDirectory;
