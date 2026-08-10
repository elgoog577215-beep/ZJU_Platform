import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
    LayoutDashboard,
    Inbox,
    LayoutGrid,
    Music,
    Film,
    Image as ImageIcon,
    BookOpen,
    Calendar,
    LayoutTemplate,
    Settings,
    Users,
    ArrowUp,
    ChevronRight,
    Tag,
    X,
    Menu,
    Search,
    MessageSquare,
    Mail,
    ShieldCheck,
    Trees,
    Handshake,
    GitBranch,
    QrCode,
    FolderKanban,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSettings } from "../../context/SettingsContext";
import Overview from "./Overview";
import PendingReviewManager from "./PendingReviewManager";
import SettingsManager from "./SettingsManager";
import UserManager from "./UserManager";
import PageContentEditor from "./PageContentEditor";
import ResourceManager from "./ResourceManager";
import MessageManager from "./MessageManager";
import TagManager from "./TagManager";
import AdminCommunity from "./AdminCommunity";
import HackathonManager from "./HackathonManager";
import FutureLearningManager from "./FutureLearningManager";
import AiAssistantManager from "./AiAssistantManager";
import EcosystemPartnerManager from "./EcosystemPartnerManager";
import EventAttributionMigrationManager from "./EventAttributionMigrationManager";
import MediaCategoryManager from "./MediaCategoryManager";
import WeChatMpImportManager from "./WeChatMpImportManager";
import ProjectManager from "./ProjectManager";
import { AdminButton } from "./AdminUI";

const STORAGE_KEY = "admin.activeTab";
const RECENT_STORAGE_KEY = "admin.recentTabs";
const MAX_RECENT_TABS = 4;
const LEGACY_TAB_ALIASES = {
    "ai-models": "intelligence",
};
const MODULE_STATUS = {
    ready: "ready",
    maintenance: "maintenance",
    experimental: "experimental",
    tool: "tool",
};
const normalizeTabId = (tabId) => LEGACY_TAB_ALIASES[tabId] || tabId;
const KNOWN_TAB_IDS = new Set([
    "overview",
    "pending",
    "intelligence",
    "wechat-mp",
    "attribution",
    "events",
    "hackathon",
    "projects",
    "future-learning",
    "articles",
    "photos",
    "videos",
    "media-categories",
    "music",
    "pages",
    "community",
    "users",
    "messages",
    "partners",
    "tags",
    "settings",
]);

const getInitialTabId = () => {
    if (typeof window === "undefined") return "overview";
    const queryTab = normalizeTabId(new URLSearchParams(window.location.search).get("tab") || "");
    if (KNOWN_TAB_IDS.has(queryTab)) return queryTab;

    const storedTab = normalizeTabId(sessionStorage.getItem(STORAGE_KEY) || "overview");
    return KNOWN_TAB_IDS.has(storedTab) ? storedTab : "overview";
};

const readRecentTabs = () => {
    if (typeof window === "undefined") return [];
    try {
        const parsed = JSON.parse(sessionStorage.getItem(RECENT_STORAGE_KEY) || "[]");
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((tabId) => normalizeTabId(tabId))
            .filter((tabId) => KNOWN_TAB_IDS.has(tabId));
    } catch {
        return [];
    }
};

const persistRecentTabs = (tabIds) => {
    if (typeof window === "undefined") return;
    try {
        sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(tabIds));
    } catch {
        // Recent navigation is a convenience only; storage failures should not block admin work.
    }
};

const AdminDashboard = () => {
    const { t } = useTranslation();
    const { uiMode } = useSettings();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(getInitialTabId);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [navQuery, setNavQuery] = useState("");
    const [, setRecentTabIds] = useState(readRecentTabs);
    const contentTopRef = useRef(null);
    const isDayMode = uiMode === "day";

    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEY, activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (!isMobileMenuOpen) return undefined;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsMobileMenuOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isMobileMenuOpen]);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const handleScroll = () => setShowBackToTop(window.scrollY > 120);
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const menuGroups = useMemo(
        () => [
            {
                id: "overview",
                title: t("admin.domains.overview", "运营总览"),
                icon: LayoutDashboard,
                items: [
                    {
                        id: "overview",
                        label: t("admin.tabs.overview", "总览"),
                        icon: LayoutDashboard,
                        description: t("admin.descriptions.overview", "待办、运营状态和风险入口"),
                        status: MODULE_STATUS.ready,
                        keywords: ["待办", "状态", "风险"],
                    },
                ],
            },
            {
                id: "content",
                title: t("admin.domains.content", "内容与审核"),
                icon: Inbox,
                items: [
                    {
                        id: "pending",
                        label: t("admin.tabs.pending", "审核中心"),
                        icon: Inbox,
                        description: t("admin.descriptions.pending", "集中处理待审核内容"),
                        status: MODULE_STATUS.ready,
                        keywords: ["审核", "发布", "驳回"],
                    },
                    {
                        id: "events",
                        label: t("admin.tabs.events", "活动"),
                        icon: Calendar,
                        description: t("admin.descriptions.events", "活动内容、报名与基础信息"),
                        status: MODULE_STATUS.ready,
                        keywords: ["活动", "报名"],
                    },
                    {
                        id: "community",
                        label: t("admin.tabs.community", "AI 社区"),
                        icon: MessageSquare,
                        description: t("admin.descriptions.community", "统一内容与辅助社群目录"),
                        status: MODULE_STATUS.maintenance,
                        keywords: ["帖子", "问答", "社群"],
                    },
                    {
                        id: "articles",
                        label: t("admin.tabs.articles", "文章"),
                        icon: BookOpen,
                        description: t("admin.descriptions.articles", "文章、资讯和长内容"),
                        status: MODULE_STATUS.ready,
                    },
                    {
                        id: "photos",
                        label: t("admin.tabs.photos", "图片"),
                        icon: LayoutGrid,
                        description: t("admin.descriptions.photos", "图片资源与展示素材"),
                        status: MODULE_STATUS.ready,
                    },
                    {
                        id: "videos",
                        label: t("admin.tabs.videos", "视频"),
                        icon: Film,
                        description: t("admin.descriptions.videos", "视频资源与封面"),
                        status: MODULE_STATUS.ready,
                    },
                    {
                        id: "music",
                        label: t("admin.tabs.music", "音频"),
                        icon: Music,
                        description: t("admin.descriptions.music", "音频资源与封面"),
                        status: MODULE_STATUS.ready,
                    },
                    {
                        id: "wechat-mp",
                        label: t("admin.tabs.wechatMp", "内容采集"),
                        icon: QrCode,
                        description: t(
                            "admin.descriptions.wechatMp",
                            "维护学院、社团等通知来源与活动候选"
                        ),
                        status: MODULE_STATUS.maintenance,
                        keywords: ["学院", "社团", "公众号", "通知", "导入", "采集"],
                    },
                    {
                        id: "media-categories",
                        label: t("admin.tabs.mediaCategories", "影像分类"),
                        icon: ImageIcon,
                        description: t("admin.descriptions.mediaCategories", "图片与视频共享分类"),
                        status: MODULE_STATUS.tool,
                    },
                    {
                        id: "pages",
                        label: t("admin.tabs.pages", "页面内容"),
                        icon: LayoutTemplate,
                        description: t("admin.descriptions.pages", "站点静态文案与页面配置"),
                        status: MODULE_STATUS.tool,
                    },
                    {
                        id: "tags",
                        label: t("admin.tabs.tags", "标签"),
                        icon: Tag,
                        description: t("admin.descriptions.tags", "站内标签和筛选字典"),
                        status: MODULE_STATUS.tool,
                    },
                ],
            },
            {
                id: "subjects",
                title: t("admin.domains.subjects", "主体与关系"),
                icon: Users,
                items: [
                    {
                        id: "users",
                        label: t("admin.tabs.users", "账号与组织"),
                        icon: Users,
                        description: t("admin.descriptions.users", "账号、发布权限与组织成员"),
                        status: MODULE_STATUS.ready,
                        keywords: ["用户", "组织", "权限", "成员"],
                    },
                    {
                        id: "partners",
                        label: t("admin.tabs.partners", "合作主体"),
                        icon: Handshake,
                        description: t("admin.descriptions.partners", "合作方与活动提供方分层"),
                        status: MODULE_STATUS.ready,
                        keywords: ["生态伙伴", "合作方", "提供方"],
                    },
                    {
                        id: "attribution",
                        label: t("admin.tabs.attribution", "历史归属修复"),
                        icon: GitBranch,
                        description: t("admin.descriptions.attribution", "迁移历史活动发布主体"),
                        status: MODULE_STATUS.tool,
                        keywords: ["组织归属", "迁移", "历史"],
                    },
                ],
            },
            {
                id: "projects",
                title: t("admin.domains.projects", "生态项目运营"),
                icon: Trees,
                items: [
                    {
                        id: "projects",
                        label: t("admin.tabs.projects", "项目广场"),
                        icon: FolderKanban,
                        description: t(
                            "admin.descriptions.projects",
                            "项目状态、举报、下架与发起主体"
                        ),
                        status: MODULE_STATUS.maintenance,
                        keywords: ["项目", "广场", "举报", "下架", "作者", "组织"],
                    },
                    {
                        id: "hackathon",
                        label: t("admin.tabs.hackathon", "浙客松"),
                        icon: Users,
                        description: t(
                            "admin.descriptions.hackathon",
                            "报名、作品、成果与赛事模板"
                        ),
                        status: MODULE_STATUS.ready,
                    },
                    {
                        id: "future-learning",
                        label: t("admin.tabs.futureLearning", "未来学习中心"),
                        icon: Trees,
                        description: t(
                            "admin.descriptions.futureLearning",
                            "产学项目报名与问题揭榜"
                        ),
                        status: MODULE_STATUS.experimental,
                    },
                ],
            },
            {
                id: "ai",
                title: t("admin.domains.ai", "AI 能力治理"),
                icon: ShieldCheck,
                items: [
                    {
                        id: "intelligence",
                        label: t("admin.tabs.intelligence", "能力与模型"),
                        icon: ShieldCheck,
                        description: t(
                            "admin.descriptions.intelligence",
                            "活动元数据治理、模型与 Agent 状态"
                        ),
                        status: MODULE_STATUS.experimental,
                        keywords: ["AI", "模型", "Agent", "活动治理"],
                    },
                ],
            },
            {
                id: "system",
                title: t("admin.domains.system", "系统与审计"),
                icon: Settings,
                items: [
                    {
                        id: "messages",
                        label: t("admin.tabs.messages", "留言反馈"),
                        icon: Mail,
                        description: t("admin.descriptions.messages", "站内联系与反馈消息"),
                        status: MODULE_STATUS.ready,
                    },
                    {
                        id: "settings",
                        label: t("admin.tabs.settings", "站点设置"),
                        icon: Settings,
                        description: t("admin.descriptions.settings", "低频站点配置与高风险设置"),
                        status: MODULE_STATUS.tool,
                    },
                ],
            },
        ],
        [t]
    );

    const flatMenuItems = useMemo(() => menuGroups.flatMap((group) => group.items), [menuGroups]);
    const normalizedNavQuery = navQuery.trim().toLowerCase();
    const filteredMenuGroups = useMemo(() => {
        if (!normalizedNavQuery) return menuGroups;

        return menuGroups
            .map((group) => {
                const groupMatches = group.title.toLowerCase().includes(normalizedNavQuery);
                const items = group.items.filter(
                    (item) =>
                        groupMatches ||
                        item.label.toLowerCase().includes(normalizedNavQuery) ||
                        item.description.toLowerCase().includes(normalizedNavQuery) ||
                        item.keywords?.some((keyword) =>
                            keyword.toLowerCase().includes(normalizedNavQuery)
                        )
                );
                return { ...group, items };
            })
            .filter((group) => group.items.length > 0);
    }, [menuGroups, normalizedNavQuery]);
    const activeItem = flatMenuItems.find((item) => item.id === activeTab);
    const activeGroup = menuGroups.find((group) =>
        group.items.some((item) => item.id === activeTab)
    );
    const statusLabels = useMemo(
        () => ({
            [MODULE_STATUS.ready]: t("admin.status.ready", "可运营"),
            [MODULE_STATUS.maintenance]: t("admin.status.maintenance", "维护中"),
            [MODULE_STATUS.experimental]: t("admin.status.experimental", "实验性"),
            [MODULE_STATUS.tool]: t("admin.status.tool", "仅工具"),
        }),
        [t]
    );

    const scrollToContentStart = useCallback((behavior = "smooth") => {
        if (typeof window === "undefined") return;
        window.requestAnimationFrame(() => {
            contentTopRef.current?.scrollIntoView({ behavior, block: "start" });
            window.setTimeout(
                () => {
                    contentTopRef.current?.focus({ preventScroll: true });
                },
                behavior === "auto" ? 0 : 120
            );
        });
    }, []);

    const writeTabSearchParam = useCallback(
        (tabId, options = {}) => {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set("tab", tabId);
            setSearchParams(nextParams, { replace: options.replace === true });
        },
        [searchParams, setSearchParams]
    );

    useEffect(() => {
        const rawTab = searchParams.get("tab");
        const normalizedTab = normalizeTabId(rawTab || "");
        const nextTab = KNOWN_TAB_IDS.has(normalizedTab) ? normalizedTab : activeTab;

        if (rawTab !== nextTab) {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set("tab", nextTab);
            setSearchParams(nextParams, { replace: true });
            return;
        }

        if (nextTab !== activeTab) {
            setActiveTab(nextTab);
            scrollToContentStart("auto");
        }
    }, [activeTab, scrollToContentStart, searchParams, setSearchParams]);

    useEffect(() => {
        setRecentTabIds((previous) => {
            const knownIds = new Set(flatMenuItems.map((item) => item.id));
            const next = [
                activeTab,
                ...previous.filter((tabId) => tabId !== activeTab && knownIds.has(tabId)),
            ].slice(0, MAX_RECENT_TABS);
            persistRecentTabs(next);
            return next;
        });
    }, [activeTab, flatMenuItems]);

    const selectTab = useCallback(
        (tabId, options = {}) => {
            const nextTabId = normalizeTabId(tabId);
            if (!flatMenuItems.some((item) => item.id === nextTabId)) return;
            setNavQuery("");
            setActiveTab(nextTabId);
            writeTabSearchParam(nextTabId, { replace: options.replace === true });
            setIsMobileMenuOpen(false);
            if (options.scroll !== false) {
                scrollToContentStart(options.behavior);
            }
        },
        [flatMenuItems, scrollToContentStart, writeTabSearchParam]
    );

    const renderContent = () => {
        switch (activeTab) {
            case "overview":
                return <Overview onChangeTab={selectTab} />;
            case "pending":
                return <PendingReviewManager />;
            case "messages":
                return <MessageManager />;
            case "partners":
                return <EcosystemPartnerManager />;
            case "tags":
                return <TagManager />;
            case "settings":
                return <SettingsManager />;
            case "intelligence":
                return <AiAssistantManager />;
            case "wechat-mp":
                return <WeChatMpImportManager />;
            case "attribution":
                return <EventAttributionMigrationManager />;
            case "projects":
                return <ProjectManager />;
            case "users":
                return <UserManager />;
            case "pages":
                return <PageContentEditor />;
            case "photos":
                return (
                    <ResourceManager
                        key="photos"
                        title={t("admin.dashboard_ui.resource_titles.photos")}
                        apiEndpoint="photos"
                        type="image"
                        icon={LayoutGrid}
                    />
                );
            case "music":
                return (
                    <ResourceManager
                        key="music"
                        title={t("admin.dashboard_ui.resource_titles.music")}
                        apiEndpoint="music"
                        type="audio"
                        icon={Music}
                    />
                );
            case "videos":
                return (
                    <ResourceManager
                        key="videos"
                        title={t("admin.dashboard_ui.resource_titles.videos")}
                        apiEndpoint="videos"
                        type="video"
                        icon={Film}
                    />
                );
            case "media-categories":
                return <MediaCategoryManager />;
            case "articles":
                return (
                    <ResourceManager
                        key="articles"
                        title={t("admin.dashboard_ui.resource_titles.articles")}
                        apiEndpoint="articles"
                        type="article"
                        icon={BookOpen}
                    />
                );
            case "events":
                return (
                    <ResourceManager
                        key="events"
                        title={t("admin.dashboard_ui.resource_titles.events")}
                        apiEndpoint="events"
                        type="event"
                        icon={Calendar}
                    />
                );
            case "hackathon":
                return <HackathonManager />;
            case "future-learning":
                return <FutureLearningManager />;
            case "community":
                return <AdminCommunity />;
            default:
                return null;
        }
    };

    const shellClass = isDayMode ? "theme-admin-shell" : "bg-black text-white";
    const titleClass = isDayMode ? "text-slate-950" : "text-white";
    const mutedClass = isDayMode ? "text-slate-500" : "text-gray-400";
    const metaLabelClass = isDayMode ? "text-slate-400" : "text-gray-500";
    const mobileToggleClass = isDayMode
        ? "rect-icon-button border-slate-200/70 bg-white/[0.92] p-2.5 text-slate-900 lg:hidden"
        : "rect-icon-button border-white/10 bg-white/10 p-2.5 text-white lg:hidden";
    const overlayClass = isDayMode
        ? "fixed inset-0 z-[90] bg-white/70 backdrop-blur-sm lg:hidden"
        : "fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm lg:hidden";
    const sidebarClass = isDayMode ? "theme-admin-sidebar" : "border border-white/10 bg-[#0d0d0d]";
    const closeClass = isDayMode
        ? "rect-icon-button bg-slate-100 p-2 text-slate-500 hover:text-slate-950"
        : "rect-icon-button bg-white/5 p-2 text-gray-300 hover:text-white";
    const searchIconClass = isDayMode ? "text-slate-400" : "text-gray-500";
    const searchClearClass = isDayMode
        ? "absolute right-2 top-1/2 -translate-y-1/2 rounded-[5px] p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        : "absolute right-2 top-1/2 -translate-y-1/2 rounded-[5px] p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white";
    const emptySearchClass = isDayMode
        ? "rect-surface-soft border-dashed border-slate-200/80 p-4 text-sm text-slate-500"
        : "rect-surface-soft border-dashed border-white/10 p-4 text-sm text-gray-400";
    const activeItemClass = isDayMode
        ? "border-indigo-200/80 bg-indigo-50 text-slate-950"
        : "border-indigo-500/30 bg-indigo-600 text-white";
    const inactiveItemClass = isDayMode
        ? "border-transparent bg-transparent text-slate-600 hover:border-slate-200/70 hover:bg-white/80 hover:text-slate-950"
        : "border-transparent bg-white/[0.03] text-gray-300 hover:border-white/10 hover:bg-white/5 hover:text-white";
    const activeIconClass = isDayMode ? "bg-indigo-100 text-indigo-600" : "bg-white/15";
    const inactiveIconClass = isDayMode ? "bg-slate-100 text-slate-500" : "bg-white/5";
    const statusBadgeClass = {
        [MODULE_STATUS.ready]: isDayMode
            ? "bg-emerald-50 text-emerald-700"
            : "bg-emerald-500/10 text-emerald-300",
        [MODULE_STATUS.maintenance]: isDayMode
            ? "bg-amber-50 text-amber-700"
            : "bg-amber-500/10 text-amber-300",
        [MODULE_STATUS.experimental]: isDayMode
            ? "bg-violet-50 text-violet-700"
            : "bg-violet-500/10 text-violet-300",
        [MODULE_STATUS.tool]: isDayMode
            ? "bg-slate-100 text-slate-600"
            : "bg-white/[0.06] text-gray-400",
    }[activeItem?.status];
    const backToTopClass = isDayMode
        ? "rect-button fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] right-4 z-[80] inline-flex min-h-[44px] items-center gap-2 border border-slate-200/80 bg-white/[0.94] px-3 py-2 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:text-indigo-600 md:bottom-6 md:right-6"
        : "rect-button fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] right-4 z-[80] inline-flex min-h-[44px] items-center gap-2 border border-white/10 bg-black/80 px-3 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:text-indigo-200 md:bottom-6 md:right-6";

    return (
        <div
            className={`min-h-screen px-3 pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+88px)] md:px-6 md:pt-24 md:pb-10 xl:px-8 ${shellClass}`}
        >
            <div
                ref={contentTopRef}
                tabIndex={-1}
                className="mx-auto max-w-[1680px] scroll-mt-24 focus:outline-none"
            >
                <div
                    className={`rect-surface mb-3 flex items-center gap-3 border px-3 py-2.5 md:px-4 ${sidebarClass}`}
                >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <button
                            type="button"
                            aria-label={t("admin.dashboard_ui.open_navigation")}
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="admin-navigation"
                            className={mobileToggleClass}
                            onClick={() => setIsMobileMenuOpen((value) => !value)}
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex min-w-0 items-center gap-2 text-sm">
                            <h1 className={`shrink-0 font-bold ${titleClass}`}>
                                {t("admin.dashboard", "管理控制台")}
                            </h1>
                            <ChevronRight size={15} className={metaLabelClass} />
                            <span className={`hidden truncate sm:inline ${mutedClass}`}>
                                {activeGroup?.title || t("admin.domains.overview", "运营总览")}
                            </span>
                            <ChevronRight
                                size={15}
                                className={`hidden sm:block ${metaLabelClass}`}
                            />
                            <span className={`truncate font-semibold ${titleClass}`}>
                                {activeItem?.label || t("admin.tabs.overview", "总览")}
                            </span>
                            {activeItem?.status ? (
                                <span
                                    className={`hidden shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold md:inline ${statusBadgeClass}`}
                                >
                                    {statusLabels[activeItem.status]}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    <div className="hidden shrink-0 sm:block">
                        <select
                            aria-label={t("admin.dashboard_ui.quick_jump")}
                            value={activeTab}
                            onChange={(event) => selectTab(event.target.value)}
                            className="theme-admin-input rect-field min-h-[36px] w-48 px-3 py-1.5 text-sm font-semibold xl:w-56"
                        >
                            {menuGroups.map((group) => (
                                <optgroup key={group.title} label={group.title}>
                                    {group.items.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.label}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                </div>

                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={overlayClass}
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                    )}
                </AnimatePresence>

                <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
                    <aside
                        id="admin-navigation"
                        aria-label={t("admin.dashboard_ui.navigation")}
                        className={`${
                            isMobileMenuOpen
                                ? "fixed inset-x-3 top-[calc(env(safe-area-inset-top)+72px)] bottom-[calc(env(safe-area-inset-bottom)+14px)] z-[100]"
                                : "hidden"
                        } lg:static lg:block lg:w-72 lg:flex-shrink-0 xl:w-80`}
                    >
                        <div
                            className={`rect-surface h-full p-3 md:p-4 lg:sticky lg:top-24 lg:h-auto ${sidebarClass}`}
                        >
                            <div className="mb-4 flex items-center justify-between px-1 lg:hidden">
                                <div
                                    className={`text-xs font-semibold uppercase tracking-[0.18em] ${metaLabelClass}`}
                                >
                                    {t("admin.dashboard_ui.navigation_short")}
                                </div>
                                <button
                                    type="button"
                                    aria-label={t("admin.dashboard_ui.close_navigation")}
                                    className={closeClass}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="mb-3 px-1">
                                <div className="relative">
                                    <Search
                                        size={16}
                                        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${searchIconClass}`}
                                    />
                                    <input
                                        type="search"
                                        aria-label={t("admin.dashboard_ui.search")}
                                        value={navQuery}
                                        onChange={(event) => setNavQuery(event.target.value)}
                                        placeholder={t("admin.dashboard_ui.search_placeholder")}
                                        className="theme-admin-input rect-field min-h-[38px] w-full py-2 pl-9 pr-9 text-sm font-semibold"
                                    />
                                    {navQuery ? (
                                        <button
                                            type="button"
                                            aria-label={t("admin.dashboard_ui.clear_search")}
                                            className={searchClearClass}
                                            onClick={() => setNavQuery("")}
                                        >
                                            <X size={14} />
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {filteredMenuGroups.length > 0 ? (
                                    filteredMenuGroups.map((group) => (
                                        <div key={group.id}>
                                            <div
                                                className={`px-1 pb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ${metaLabelClass}`}
                                            >
                                                {group.title}
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {group.items.map((tab) => {
                                                    const isActive = activeTab === tab.id;
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={tab.id}
                                                            aria-label={t(
                                                                "admin.dashboard_ui.open_module",
                                                                { label: tab.label }
                                                            )}
                                                            aria-current={
                                                                isActive ? "page" : undefined
                                                            }
                                                            onClick={() => selectTab(tab.id)}
                                                            className={`w-full rounded-[6px] border px-2 py-2 text-left transition-all ${
                                                                isActive
                                                                    ? activeItemClass
                                                                    : inactiveItemClass
                                                            }`}
                                                        >
                                                            <div className="flex min-w-0 items-center gap-2">
                                                                <div
                                                                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                                                                        isActive
                                                                            ? activeIconClass
                                                                            : inactiveIconClass
                                                                    }`}
                                                                >
                                                                    <tab.icon size={15} />
                                                                </div>
                                                                <div className="min-w-0 truncate text-sm font-semibold">
                                                                    {tab.label}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={emptySearchClass}>
                                        <div className="font-semibold">
                                            {t("admin.dashboard_ui.no_matches")}
                                        </div>
                                        <button
                                            type="button"
                                            className={`mt-2 text-xs font-semibold ${
                                                isDayMode ? "text-indigo-600" : "text-indigo-300"
                                            }`}
                                            onClick={() => setNavQuery("")}
                                        >
                                            {t("admin.dashboard_ui.clear_search")}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    <main className="min-w-0 flex-1" aria-live="polite">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 18 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25 }}
                        >
                            {renderContent()}
                        </motion.div>
                    </main>
                </div>
            </div>

            <AnimatePresence>
                {showBackToTop ? (
                    <motion.button
                        type="button"
                        aria-label={t("admin.dashboard_ui.back_to_top")}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className={backToTopClass}
                        onClick={() => scrollToContentStart()}
                    >
                        <ArrowUp size={18} />
                        <span className="hidden sm:inline">
                            {t("admin.dashboard_ui.back_to_top_short")}
                        </span>
                    </motion.button>
                ) : null}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
