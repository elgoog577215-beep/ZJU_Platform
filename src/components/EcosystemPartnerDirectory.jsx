/*
THESIS: 支持方不是一张赞助商名单，而是让学习、实践与产业机会真实发生的四股协作力量。
OWN-WORLD: 继承学习社区的星空景深、冰川蓝线性图形与非对称入口，把真实支持方组织成可推进的生态协作舱。
STORY: 访客先从四域空间舞台选择支持力量；选中区域向前展开，其余区域收拢，真实机构与合作方向接管详情工作区。
FIRST VIEWPORT: 未选择时显示字标与四域舞台；从 About 深链进入时直接显示紧凑四栏导航和被选分组的协作网络。
FORM: 用户固定的学习社区式四域协作舱；拒绝已否定的登记册、企业官网、Logo 墙与种子 2a1e9985 的矩阵构图。
*/

import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowDown,
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
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useSettings } from "../context/SettingsContext";
import {
    CORE_PARTNER_SCOPE,
    ECOSYSTEM_SUPPORT_CATEGORIES,
    ECOSYSTEM_SUPPORT_VIEW_GROUPS,
    getPartnerLogoSrc,
    getPartnerProfilePath,
    getSupportViewGroupId,
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

const stageMeta = {
    college: {
        code: "CAMPUS LINK",
        description: "课程、科研与校园场景",
        descriptionEn: "Courses, research and campus contexts",
        layoutClass: "support-stage-card--college xl:col-span-4",
        previewLimit: 2,
    },
    capital: {
        code: "CAPITAL BRIDGE",
        description: "创业辅导与资源连接",
        descriptionEn: "Venture guidance and resource access",
        layoutClass: "support-stage-card--capital xl:col-span-3",
        previewLimit: 1,
    },
    enterprise: {
        code: "INDUSTRY ENGINE",
        description: "模型、工具与真实产业问题",
        descriptionEn: "Models, tools and real industry problems",
        layoutClass: "support-stage-card--enterprise xl:col-span-5 xl:row-span-2",
        previewLimit: 6,
    },
    club: {
        code: "COMMUNITY FLOW",
        description: "招募、协作与长期执行",
        descriptionEn: "Recruiting, collaboration and delivery",
        layoutClass: "support-stage-card--club xl:col-span-7",
        previewLimit: 4,
    },
};

const formalSupportCategoryIds = new Set(
    ECOSYSTEM_SUPPORT_CATEGORIES.map((category) => category.id)
);
const viewGroupIds = new Set(ECOSYSTEM_SUPPORT_VIEW_GROUPS.map((group) => group.id));
const selectableCategoryIds = new Set([...formalSupportCategoryIds, ...viewGroupIds]);

const getLocalizedValue = (partner, key, isEnglish) => {
    if (isEnglish) return partner[`${key}_en`] || partner[key] || "";
    return partner[key] || partner[`${key}_en`] || "";
};

const getPartnerInitials = (name = "") => {
    const cleanName = String(name).trim();
    if (!cleanName) return "AI";
    const words = cleanName.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
        return words
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase();
    }
    return cleanName.slice(0, 2).toUpperCase();
};

const SupporterLogo = ({ className = "", isDayMode, isEnglish, partner }) => {
    const displayName = getLocalizedValue(partner, "name", isEnglish);
    const logoSrc = getPartnerLogoSrc(partner, isDayMode);

    return (
        <span className={`supporter-logo ${className}`} aria-hidden="true">
            {logoSrc ? (
                <img src={logoSrc} alt="" loading="lazy" />
            ) : (
                <span>{getPartnerInitials(displayName)}</span>
            )}
        </span>
    );
};

const SupportWordmark = ({ compact = false, isEnglish }) => (
    <div className={`support-wordmark ${compact ? "support-wordmark--compact" : ""}`}>
        <div className="support-wordmark__emblem" aria-hidden="true">
            <svg viewBox="0 0 150 116" role="presentation">
                <path
                    className="support-wordmark__route"
                    d="M34 23H65L75 35M116 23H86L75 35M34 93H65L75 81M116 93H86L75 81"
                />
                <path
                    className="support-wordmark__route support-wordmark__route--soft"
                    d="M75 35V15M75 81v20M50 58H21M100 58h29"
                />
                <path className="support-wordmark__core" d="M75 34 99 58 75 82 51 58Z" />
                <path className="support-wordmark__mark" d="M65 52h20M65 59h20M69 66h12" />
                <circle className="support-wordmark__node" cx="30" cy="23" r="4" />
                <circle className="support-wordmark__node" cx="120" cy="23" r="4" />
                <circle className="support-wordmark__node" cx="30" cy="93" r="4" />
                <circle className="support-wordmark__node" cx="120" cy="93" r="4" />
            </svg>
        </div>
        <div className="min-w-0">
            <p className="support-wordmark__kicker">ECOSYSTEM SUPPORT NETWORK</p>
            <h1 className="support-wordmark__title">
                {isEnglish ? (
                    <>
                        ECOSYSTEM <span>SUPPORT</span>
                    </>
                ) : (
                    <>
                        生态<span>支持方</span>
                    </>
                )}
            </h1>
            {!compact ? (
                <div className="support-wordmark__rail" aria-hidden="true">
                    <span />
                    <i />
                    <span />
                </div>
            ) : null}
        </div>
    </div>
);

const SupportStageArtwork = ({ groupId }) => {
    if (groupId === "college") {
        return (
            <svg viewBox="0 0 420 190" role="presentation">
                <path className="support-art-line" d="M42 142H118L154 106H230L270 68H374" />
                <path
                    className="support-art-line support-art-line--soft"
                    d="M118 142V72H198M230 106v48h92"
                />
                <circle className="support-art-node" cx="42" cy="142" r="8" />
                <circle
                    className="support-art-node support-art-node--soft"
                    cx="118"
                    cy="72"
                    r="6"
                />
                <circle className="support-art-node" cx="230" cy="106" r="13" />
                <path className="support-art-frame" d="M270 42h92v52h-92z" />
                <path className="support-art-mark" d="M290 61h51M290 76h34" />
            </svg>
        );
    }

    if (groupId === "enterprise") {
        return (
            <svg viewBox="0 0 460 390" role="presentation">
                <ellipse
                    className="support-art-orbit support-art-orbit--outer"
                    cx="230"
                    cy="174"
                    rx="150"
                    ry="112"
                />
                <ellipse className="support-art-orbit" cx="230" cy="174" rx="104" ry="78" />
                <path
                    className="support-art-line"
                    d="m151 112 79 62 98-52M151 112l38 139M328 122l-61 129M189 251h78"
                />
                <circle className="support-art-node" cx="151" cy="112" r="17" />
                <circle
                    className="support-art-node support-art-node--soft"
                    cx="328"
                    cy="122"
                    r="14"
                />
                <circle className="support-art-node" cx="189" cy="251" r="10" />
                <circle
                    className="support-art-node support-art-node--soft"
                    cx="267"
                    cy="251"
                    r="12"
                />
                <circle className="support-art-core" cx="230" cy="174" r="47" />
                <path className="support-art-mark" d="M212 192v-34l18 17 18-17v34" />
                <path className="support-art-signal" d="M88 318h284M126 335h208" />
            </svg>
        );
    }

    if (groupId === "capital") {
        return (
            <svg viewBox="0 0 360 190" role="presentation">
                <path className="support-art-line" d="M34 146h88l54-98 58 98h92" />
                <path
                    className="support-art-line support-art-line--soft"
                    d="M91 146 176 92l92 54M176 48v44"
                />
                <circle
                    className="support-art-node support-art-node--soft"
                    cx="34"
                    cy="146"
                    r="7"
                />
                <circle className="support-art-node" cx="176" cy="48" r="10" />
                <circle className="support-art-node" cx="326" cy="146" r="7" />
                <path className="support-art-frame" d="m176 76 28 44-28 24-28-24z" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 540 190" role="presentation">
            <path className="support-art-line" d="M38 56c90 0 110 78 204 78h92c72 0 80-62 166-62" />
            <path
                className="support-art-line support-art-line--soft"
                d="M38 132c82 0 112-56 204-56h92c76 0 90 58 166 58"
            />
            <circle className="support-art-node support-art-node--soft" cx="38" cy="56" r="7" />
            <circle className="support-art-node" cx="38" cy="132" r="9" />
            <circle className="support-art-node" cx="500" cy="72" r="9" />
            <circle className="support-art-node support-art-node--soft" cx="500" cy="134" r="7" />
            <rect className="support-art-frame" x="242" y="48" width="92" height="76" rx="24" />
            <path className="support-art-mark" d="M265 75h46M265 91h32" />
        </svg>
    );
};

const StagePartnerPreview = ({ isDayMode, isEnglish, partner }) => {
    const displayName = getLocalizedValue(partner, "name", isEnglish);
    return (
        <span className="support-stage-preview" title={displayName}>
            <SupporterLogo partner={partner} isDayMode={isDayMode} isEnglish={isEnglish} />
            <span>{displayName}</span>
        </span>
    );
};

const SupportStageCard = ({
    count,
    group,
    isDayMode,
    isEnglish,
    onSelect,
    reduceMotion,
    supporters,
    t,
}) => {
    const meta = stageMeta[group.id];
    const Icon = categoryIcons[group.id];
    const label = t(
        `about.ecosystem.supporter_directory.view_groups.${group.id}`,
        isEnglish ? group.labelEn : group.label
    );

    return (
        <motion.button
            layout={!reduceMotion}
            layoutId={reduceMotion ? undefined : `support-stage-${group.id}`}
            type="button"
            onClick={() => onSelect(group.id)}
            style={{
                viewTransitionName: reduceMotion ? undefined : `support-category-${group.id}`,
            }}
            className={`support-stage-card ${meta.layoutClass}`}
            transition={{ layout: { duration: 0.46, ease: [0.16, 1, 0.3, 1] } }}
        >
            <span className="support-stage-card__meta">
                <span>{meta.code}</span>
                <span>{String(count).padStart(2, "0")}</span>
            </span>
            <span className="support-stage-card__art" aria-hidden="true">
                <SupportStageArtwork groupId={group.id} />
            </span>
            <span className="support-stage-card__copy">
                <span className="support-stage-card__title-row">
                    <span className="support-stage-card__icon">
                        <Icon size={18} />
                    </span>
                    <strong>{label}</strong>
                    <ArrowUpRight size={20} />
                </span>
                <span className="support-stage-card__description">
                    {isEnglish ? meta.descriptionEn : meta.description}
                </span>
                <span className="support-stage-card__previews">
                    {supporters.slice(0, meta.previewLimit).map((partner) => (
                        <StagePartnerPreview
                            key={partner.id}
                            isDayMode={isDayMode}
                            isEnglish={isEnglish}
                            partner={partner}
                        />
                    ))}
                </span>
            </span>
        </motion.button>
    );
};

const CompactDock = ({ activeViewGroup, counts, isEnglish, onSelect, reduceMotion, t }) => (
    <motion.nav
        initial={reduceMotion ? false : { opacity: 0.72, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.44, ease: [0.16, 1, 0.3, 1] }}
        className="support-compact-dock"
        aria-label={isEnglish ? "Supporter categories" : "支持方分类"}
    >
        <button type="button" onClick={() => onSelect("all")} className="support-compact-dock__all">
            <ArrowLeft size={16} />
            <span>{isEnglish ? "FOUR DOMAINS" : "返回四域"}</span>
        </button>
        <div className="support-compact-dock__groups">
            {ECOSYSTEM_SUPPORT_VIEW_GROUPS.map((group) => {
                const Icon = categoryIcons[group.id];
                const active = activeViewGroup === group.id;
                const label = t(
                    `about.ecosystem.supporter_directory.view_groups.${group.id}`,
                    isEnglish ? group.labelEn : group.label
                );
                return (
                    <motion.button
                        layout={!reduceMotion}
                        layoutId={reduceMotion ? undefined : `support-stage-${group.id}`}
                        transition={{
                            layout: { duration: 0.46, ease: [0.16, 1, 0.3, 1] },
                        }}
                        key={group.id}
                        type="button"
                        onClick={() => onSelect(group.id)}
                        aria-pressed={active}
                        style={{
                            viewTransitionName:
                                !reduceMotion && active
                                    ? `support-category-${group.id}`
                                    : undefined,
                        }}
                        className={`support-compact-dock__item ${active ? "is-active" : ""}`}
                    >
                        <Icon size={17} />
                        <span>{label}</span>
                        <small>{String(counts[group.id] || 0).padStart(2, "0")}</small>
                    </motion.button>
                );
            })}
        </div>
    </motion.nav>
);

const constellationPositions = [
    [12, 24],
    [46, 11],
    [78, 22],
    [27, 52],
    [61, 46],
    [88, 61],
    [16, 78],
    [50, 80],
];

const SupportConstellation = ({ isDayMode, isEnglish, partners }) => (
    <div className="support-constellation">
        <svg
            className="support-constellation__routes"
            viewBox="0 0 1000 520"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            <path d="M120 125C260 110 300 55 460 58S650 115 780 115" />
            <path d="M120 125c50 140 120 160 150 145s170-55 340-30 200 80 270 78" />
            <path d="M160 405c145-18 240-165 450-165 105 0 180 60 270 78" />
            <path d="M270 270c70 115 115 150 230 150 160 0 230-80 380-102" />
        </svg>
        <span className="support-constellation__core" aria-hidden="true">
            <i />
            <b>AI</b>
        </span>
        {partners.slice(0, constellationPositions.length).map((partner, index) => {
            const displayName = getLocalizedValue(partner, "name", isEnglish);
            const [x, y] = constellationPositions[index];
            return (
                <span
                    key={partner.id}
                    className="support-constellation__node"
                    style={{ "--node-x": `${x}%`, "--node-y": `${y}%` }}
                >
                    <SupporterLogo partner={partner} isDayMode={isDayMode} isEnglish={isEnglish} />
                    <strong>{displayName}</strong>
                </span>
            );
        })}
    </div>
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
    const isExpanded = activeCategory === "all";

    const setActiveCategory = (category) => {
        const next = new URLSearchParams(searchParams);
        if (selectableCategoryIds.has(category)) next.set("category", category);
        else next.delete("category");
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
                )
                    return false;
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
    const activeGroup = ECOSYSTEM_SUPPORT_VIEW_GROUPS.find((group) => group.id === activeViewGroup);
    const activeCategoryLabel =
        activeCategory === "all"
            ? t("about.ecosystem.supporter_directory.all", "全部支持方")
            : viewGroupIds.has(activeCategory)
              ? viewGroupLabel(activeGroup || ECOSYSTEM_SUPPORT_VIEW_GROUPS[0])
              : categoryLabel(
                    ECOSYSTEM_SUPPORT_CATEGORIES.find(
                        (category) => category.id === activeCategory
                    ) || ECOSYSTEM_SUPPORT_CATEGORIES[0]
                );

    const clearFilters = () => {
        setActiveCategory("all");
        setQuery("");
    };

    const searchField = (
        <label className="support-search">
            <span className="sr-only">
                {t("about.ecosystem.supporter_directory.search_label", "搜索支持方")}
            </span>
            <Search size={18} aria-hidden="true" />
            <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t(
                    "about.ecosystem.supporter_directory.search_placeholder",
                    "搜索名称、合作方向或支持内容"
                )}
            />
            {query ? (
                <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label={t("about.ecosystem.supporter_directory.clear_search", "清除搜索")}
                >
                    <X size={17} />
                </button>
            ) : null}
        </label>
    );

    const renderPartner = (partner, index) => {
        const displayName = getLocalizedValue(partner, "name", isEnglish);
        const description = getLocalizedValue(partner, "description", isEnglish);
        const cooperationDirection = getLocalizedValue(partner, "cooperation_direction", isEnglish);
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

        const content = (
            <motion.article
                initial={reduceMotion ? false : { opacity: 0.65, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                    duration: reduceMotion ? 0 : 0.42,
                    delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.18),
                    ease: [0.16, 1, 0.3, 1],
                }}
                className="supporter-detail-card"
            >
                <div className="supporter-detail-card__top">
                    <SupporterLogo
                        className="supporter-logo--detail"
                        partner={partner}
                        isDayMode={isDayMode}
                        isEnglish={isEnglish}
                    />
                    <div className="min-w-0">
                        <span>{category ? categoryLabel(category) : ""}</span>
                        <h3>{displayName}</h3>
                    </div>
                    {profilePath || externalUrl ? (
                        <ArrowUpRight size={20} aria-hidden="true" />
                    ) : null}
                </div>
                {description ? (
                    <p className="supporter-detail-card__description">{description}</p>
                ) : null}
                <div className="supporter-detail-card__direction">
                    <span>
                        {t("about.ecosystem.supporter_directory.support_label", "支持方向")}
                    </span>
                    <strong>
                        {cooperationDirection ||
                            t(
                                "about.ecosystem.supporter_directory.support_pending",
                                "合作信息持续更新"
                            )}
                    </strong>
                </div>
                <span className="supporter-detail-card__action">{actionLabel}</span>
            </motion.article>
        );

        if (profilePath)
            return (
                <Link
                    key={partner.id}
                    to={profilePath}
                    aria-label={`${displayName} · ${actionLabel}`}
                >
                    {content}
                </Link>
            );
        if (externalUrl) {
            return (
                <a
                    key={partner.id}
                    href={externalUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`${displayName} · ${actionLabel}`}
                >
                    {content}
                </a>
            );
        }
        return <div key={partner.id}>{content}</div>;
    };

    return (
        <div className="ecosystem-landscape-shell supporter-stage-page relative min-h-screen overflow-hidden text-white">
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

            <main className="relative z-10 mx-auto w-full max-w-[1560px] px-4 pb-24 pt-[calc(env(safe-area-inset-top)+82px)] sm:px-6 md:pt-[calc(env(safe-area-inset-top)+104px)] lg:px-8 lg:pb-32">
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
                    className="support-back-link"
                >
                    <ArrowLeft size={18} />
                    {t("about.ecosystem.supporter_directory.back", "返回生态介绍")}
                </Link>

                <AnimatePresence initial={false} mode="sync">
                    {isExpanded ? (
                        <motion.section
                            key="support-stage-expanded"
                            initial={
                                reduceMotion
                                    ? false
                                    : { opacity: 0.74, clipPath: "inset(0 0 10% 0)" }
                            }
                            animate={{ opacity: 1, clipPath: "inset(0 0 0 0)" }}
                            exit={
                                reduceMotion
                                    ? undefined
                                    : {
                                          opacity: 0.3,
                                          clipPath: "inset(0 0 12% 0)",
                                          transition: { duration: 0.1 },
                                      }
                            }
                            transition={{
                                duration: reduceMotion ? 0 : 0.58,
                                ease: [0.16, 1, 0.3, 1],
                            }}
                            className="support-stage-expanded"
                        >
                            <SupportWordmark isEnglish={isEnglish} />
                            <div className="support-stage-grid">
                                {ECOSYSTEM_SUPPORT_VIEW_GROUPS.map((group) => (
                                    <SupportStageCard
                                        key={group.id}
                                        count={viewGroupCounts[group.id] || 0}
                                        group={group}
                                        isDayMode={isDayMode}
                                        isEnglish={isEnglish}
                                        onSelect={setActiveCategory}
                                        reduceMotion={reduceMotion}
                                        supporters={viewGroupSupporters[group.id] || []}
                                        t={t}
                                    />
                                ))}
                            </div>
                            <a href="#supporter-results" className="support-stage-scroll-cue">
                                <span>
                                    {isEnglish ? "EXPLORE ALL SUPPORTERS" : "浏览全部支持方"}
                                </span>
                                <ArrowDown size={18} />
                            </a>
                        </motion.section>
                    ) : (
                        <motion.section
                            key={`support-stage-detail-${activeViewGroup}`}
                            initial={reduceMotion ? false : { opacity: 0.68, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={
                                reduceMotion
                                    ? undefined
                                    : {
                                          opacity: 0.35,
                                          y: -8,
                                          transition: { duration: 0.1 },
                                      }
                            }
                            transition={{
                                duration: reduceMotion ? 0 : 0.5,
                                ease: [0.16, 1, 0.3, 1],
                            }}
                            className="support-stage-detail"
                        >
                            <div className="support-stage-detail__heading">
                                <SupportWordmark compact isEnglish={isEnglish} />
                                <CompactDock
                                    activeViewGroup={activeViewGroup}
                                    counts={viewGroupCounts}
                                    isEnglish={isEnglish}
                                    onSelect={setActiveCategory}
                                    reduceMotion={reduceMotion}
                                    t={t}
                                />
                            </div>
                            <div className="support-network-hero">
                                <div className="support-network-hero__copy">
                                    <p>{stageMeta[activeViewGroup]?.code}</p>
                                    <h2>{activeCategoryLabel}</h2>
                                    <span>
                                        {isEnglish
                                            ? stageMeta[activeViewGroup]?.descriptionEn
                                            : stageMeta[activeViewGroup]?.description}
                                    </span>
                                    <div className="support-network-hero__count">
                                        <strong>{filteredSupporters.length}</strong>
                                        <small>
                                            {t(
                                                "about.ecosystem.supporter_directory.count",
                                                "{{count}} 个支持方",
                                                { count: filteredSupporters.length }
                                            )}
                                        </small>
                                    </div>
                                    {searchField}
                                </div>
                                <SupportConstellation
                                    isDayMode={isDayMode}
                                    isEnglish={isEnglish}
                                    partners={filteredSupporters}
                                />
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

                {error ? (
                    <div className="support-status support-status--warning" role="status">
                        <span>
                            {t(
                                "about.ecosystem.supporter_directory.fallback_notice",
                                "实时数据暂时无法连接，当前显示内置支持方名录。"
                            )}
                        </span>
                        <button type="button" onClick={() => refresh({ clearCache: true })}>
                            <RefreshCw size={16} />
                            {t("about.ecosystem.supporter_directory.retry", "重新加载")}
                        </button>
                    </div>
                ) : null}

                <section id="supporter-results" className="supporter-results">
                    <div className="supporter-results__heading">
                        <div>
                            <p>{isEnglish ? "COLLABORATION FIELD" : "协作现场"}</p>
                            <h2>{activeCategoryLabel}</h2>
                            <span>
                                {t(
                                    "about.ecosystem.supporter_directory.count",
                                    "{{count}} 个支持方",
                                    { count: filteredSupporters.length }
                                )}
                            </span>
                        </div>
                        {isExpanded ? searchField : null}
                    </div>

                    {loading && coreSupporters.length === 0 ? (
                        <div
                            className="supporter-results__grid"
                            aria-label={isEnglish ? "Loading supporters" : "正在加载支持方"}
                        >
                            {[0, 1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className="supporter-detail-card supporter-detail-card--loading"
                                />
                            ))}
                        </div>
                    ) : filteredSupporters.length > 0 ? (
                        <motion.div
                            key={`${activeCategory}:${normalizedQuery}`}
                            initial={reduceMotion ? false : { opacity: 0.76 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: reduceMotion ? 0 : 0.28 }}
                            className="supporter-results__grid"
                        >
                            {filteredSupporters.map(renderPartner)}
                        </motion.div>
                    ) : (
                        <div className="support-status support-status--empty">
                            <h3>
                                {t(
                                    "about.ecosystem.supporter_directory.empty_title",
                                    "没有找到匹配的支持方"
                                )}
                            </h3>
                            <p>
                                {t(
                                    "about.ecosystem.supporter_directory.empty_desc",
                                    "可以清除搜索词，或切换到其他支持方分类。"
                                )}
                            </p>
                            <button type="button" onClick={clearFilters}>
                                {t(
                                    "about.ecosystem.supporter_directory.clear_filters",
                                    "查看全部支持方"
                                )}
                            </button>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default EcosystemPartnerDirectory;
