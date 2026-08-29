/*
THESIS: 支持方名录首先证明合作关系与支持内容，而不是重复一面 Logo 墙。
OWN-WORLD: 继承 About 的深夜蓝/白昼白表面、青色行动和高对比文字，以索引、分隔线和真实标志组织内容。
STORY: 访客从 About 进入，按五类理解支持网络，搜索具体伙伴，再进入组织主页或官方网站。
FIRST VIEWPORT: 左侧是页面主张，右侧是说明与搜索；分类索引和真实支持方列表紧随其后。
FORM: 现有 About 的次级阅读页，采用机构索引结构，不建立新的品牌世界。
*/

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
    ArrowLeft,
    ArrowUpRight,
    Cpu,
    Factory,
    Handshake,
    Landmark,
    RefreshCw,
    Search,
    Users,
    X,
} from "lucide-react";

import { useSettings } from "../context/SettingsContext";
import {
    CORE_PARTNER_SCOPE,
    ECOSYSTEM_SUPPORT_CATEGORIES,
    getPartnerLogoSrc,
    getPartnerProfilePath,
    normalizeEcosystemPartner,
    normalizePartnerScope,
} from "../data/partnerLogos";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import { useReducedMotion } from "../utils/animations";
import SEO from "./SEO";

const categoryIcons = {
    college: Landmark,
    technology_enterprise: Cpu,
    industry_enterprise: Factory,
    capital: Handshake,
    club: Users,
};

const categoryFallbackLabels = {
    college: "学院与校内机构",
    technology_enterprise: "技术企业",
    industry_enterprise: "行业企业",
    capital: "资本与孵化",
    club: "社团与组织",
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

const EcosystemPartnerDirectory = () => {
    const { t, i18n } = useTranslation();
    const { uiMode } = useSettings();
    const { partners, loading, error, refresh } = useEcosystemPartners();
    const reduceMotion = useReducedMotion();
    const isDayMode = uiMode === "day";
    const isEnglish = (i18n.resolvedLanguage || i18n.language || "zh").startsWith("en");
    const [activeCategory, setActiveCategory] = useState("all");
    const [query, setQuery] = useState("");

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

    const normalizedQuery = query.trim().toLocaleLowerCase(isEnglish ? "en" : "zh-CN");
    const filteredSupporters = useMemo(
        () =>
            coreSupporters.filter((partner) => {
                if (activeCategory !== "all" && partner.support_category !== activeCategory) {
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
        [activeCategory, coreSupporters, isEnglish, normalizedQuery]
    );

    const categoryLabel = (category) =>
        t(
            `about.supporter_directory.categories.${category.id}`,
            isEnglish ? category.labelEn : categoryFallbackLabels[category.id] || category.label
        );

    const activeCategoryLabel =
        activeCategory === "all"
            ? t("about.supporter_directory.all", "全部支持方")
            : categoryLabel(
                  ECOSYSTEM_SUPPORT_CATEGORIES.find((category) => category.id === activeCategory) ||
                      ECOSYSTEM_SUPPORT_CATEGORIES[0]
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
            ? t("about.supporter_directory.profile_cta", "查看组织主页")
            : externalUrl
              ? t("about.supporter_directory.website_cta", "访问官方网站")
              : t("about.supporter_directory.no_link", "支持信息");
        const category = ECOSYSTEM_SUPPORT_CATEGORIES.find(
            (item) => item.id === partner.support_category
        );

        const row = (
            <div
                className={`group grid gap-4 border-t py-6 transition-colors sm:grid-cols-[54px_minmax(0,1fr)_minmax(220px,0.72fr)_auto] sm:items-center sm:gap-6 lg:py-7 ${
                    isDayMode
                        ? "border-slate-200 hover:bg-white/70"
                        : "border-white/10 hover:bg-white/[0.035]"
                }`}
            >
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

                <div className="min-w-0 sm:pl-2">
                    <p
                        className={`text-xs font-black ${isDayMode ? "text-slate-400" : "text-white/35"}`}
                    >
                        {t("about.supporter_directory.support_label", "支持方向")}
                    </p>
                    <p
                        className={`mt-1.5 text-sm font-bold leading-6 ${isDayMode ? "text-slate-800" : "text-white/82"}`}
                    >
                        {cooperationDirection ||
                            t("about.supporter_directory.support_pending", "合作信息持续更新")}
                    </p>
                </div>

                <div
                    className={`flex items-center justify-between gap-3 text-sm font-bold sm:justify-end ${
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
                    ? "bg-[#f6f8fb] text-slate-950"
                    : "bg-[radial-gradient(circle_at_82%_8%,rgba(34,211,238,0.1),transparent_28%),linear-gradient(135deg,#050809_0%,#091616_58%,#050809_100%)] text-white"
            }`}
        >
            <SEO
                title={t("about.supporter_directory.meta_title", "生态支持方｜拓浙AI生态")}
                description={t(
                    "about.supporter_directory.meta_desc",
                    "查看支持拓浙 AI 生态的学院、技术企业、行业企业、资本与校园社团。"
                )}
            />

            <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                aria-hidden="true"
            >
                <div
                    className={`absolute right-[-6vw] top-[8vh] select-none text-[20vw] font-black leading-none tracking-[-0.04em] ${
                        isDayMode ? "text-slate-900/[0.035]" : "text-white/[0.035]"
                    }`}
                >
                    ALLIES
                </div>
            </div>

            <main className="relative z-10 mx-auto w-full max-w-[1540px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
                <Link
                    to="/about#resource-support"
                    className={`inline-flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-400/80 ${
                        isDayMode
                            ? "text-slate-600 hover:bg-white hover:text-cyan-800"
                            : "text-white/64 hover:bg-white/[0.06] hover:text-white"
                    }`}
                >
                    <ArrowLeft size={18} />
                    {t("about.supporter_directory.back", "返回生态介绍")}
                </Link>

                <section className="mt-9 grid gap-10 border-b pb-12 lg:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.64fr)] lg:items-end lg:gap-16 lg:pb-16">
                    <div>
                        <p
                            className={`text-sm font-black ${isDayMode ? "text-cyan-700" : "text-cyan-200"}`}
                        >
                            {t("about.supporter_directory.eyebrow", "生态支持网络")}
                        </p>
                        <h1 className="mt-4 max-w-5xl text-5xl font-black leading-[0.94] tracking-[-0.04em] sm:text-7xl lg:text-[5.8rem]">
                            <span className="block">
                                {t("about.supporter_directory.title_1", "共同支撑，")}
                            </span>
                            <span className="block">
                                {t("about.supporter_directory.title_2", "真实实践。")}
                            </span>
                        </h1>
                    </div>

                    <div>
                        <p
                            className={`max-w-[66ch] text-base leading-7 ${isDayMode ? "text-slate-600" : "text-white/68"}`}
                        >
                            {t(
                                "about.supporter_directory.desc",
                                "从课程与科研场景，到技术、产业、资本和校园组织协作，这些支持方共同让学习、赛事与真实项目持续发生。"
                            )}
                        </p>
                        <label className="relative mt-6 block">
                            <span className="sr-only">
                                {t("about.supporter_directory.search_label", "搜索支持方")}
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
                                    "about.supporter_directory.search_placeholder",
                                    "搜索名称、合作方向或支持内容"
                                )}
                                className={`min-h-12 w-full rounded-[10px] border py-3 pl-11 pr-11 text-base outline-none transition focus:ring-2 focus:ring-cyan-400/55 ${
                                    isDayMode
                                        ? "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                                        : "border-white/12 bg-white/[0.055] text-white placeholder:text-white/36"
                                }`}
                            />
                            {query ? (
                                <button
                                    type="button"
                                    onClick={() => setQuery("")}
                                    aria-label={t(
                                        "about.supporter_directory.clear_search",
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
                                "about.supporter_directory.fallback_notice",
                                "实时数据暂时无法连接，当前显示内置支持方名录。"
                            )}
                        </span>
                        <button
                            type="button"
                            onClick={() => refresh({ clearCache: true })}
                            className="inline-flex min-h-10 items-center gap-2 self-start rounded-[9px] px-3 font-bold outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 sm:self-auto"
                        >
                            <RefreshCw size={16} />
                            {t("about.supporter_directory.retry", "重新加载")}
                        </button>
                    </div>
                ) : null}

                <section className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[290px_minmax(0,1fr)]">
                    <aside>
                        <div
                            className="scrollbar-none flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-28 lg:block lg:overflow-visible"
                            role="navigation"
                            aria-label={t("about.supporter_directory.category_nav", "支持方分类")}
                        >
                            <button
                                type="button"
                                onClick={() => setActiveCategory("all")}
                                aria-pressed={activeCategory === "all"}
                                className={`flex min-h-12 min-w-max items-center justify-between gap-5 rounded-[10px] px-4 text-left text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-400/80 lg:mb-2 lg:w-full ${
                                    activeCategory === "all"
                                        ? isDayMode
                                            ? "theme-on-dark bg-slate-950"
                                            : "bg-cyan-200 text-cyan-950"
                                        : isDayMode
                                          ? "text-slate-600 hover:bg-white"
                                          : "text-white/58 hover:bg-white/[0.055] hover:text-white"
                                }`}
                            >
                                <span>{t("about.supporter_directory.all", "全部支持方")}</span>
                                <span className="font-mono text-xs tabular-nums">
                                    {coreSupporters.length}
                                </span>
                            </button>

                            {ECOSYSTEM_SUPPORT_CATEGORIES.map((category) => {
                                const Icon = categoryIcons[category.id];
                                const active = activeCategory === category.id;
                                return (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => setActiveCategory(category.id)}
                                        aria-pressed={active}
                                        className={`flex min-h-12 min-w-max items-center gap-3 rounded-[10px] px-4 text-left text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-400/80 lg:mb-1 lg:w-full ${
                                            active
                                                ? isDayMode
                                                    ? "bg-white text-cyan-800"
                                                    : "bg-white/[0.09] text-cyan-100"
                                                : isDayMode
                                                  ? "text-slate-600 hover:bg-white/70"
                                                  : "text-white/58 hover:bg-white/[0.05] hover:text-white"
                                        }`}
                                    >
                                        <Icon size={17} className="shrink-0" />
                                        <span className="flex-1">{categoryLabel(category)}</span>
                                        <span className="font-mono text-xs tabular-nums">
                                            {categoryCounts[category.id] || 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <div className="min-w-0">
                        <div className="flex items-end justify-between gap-4 px-3 pb-3 sm:px-4">
                            <div>
                                <h2 className="text-2xl font-black tracking-[-0.025em]">
                                    {activeCategoryLabel}
                                </h2>
                                <p
                                    className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-white/45"}`}
                                >
                                    {t("about.supporter_directory.count", "{{count}} 个支持方", {
                                        count: filteredSupporters.length,
                                    })}
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
                                        "about.supporter_directory.empty_title",
                                        "没有找到匹配的支持方"
                                    )}
                                </h3>
                                <p
                                    className={`mx-auto mt-3 max-w-lg text-sm leading-6 ${
                                        isDayMode ? "text-slate-500" : "text-white/52"
                                    }`}
                                >
                                    {t(
                                        "about.supporter_directory.empty_desc",
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
                                    {t("about.supporter_directory.clear_filters", "查看全部支持方")}
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
