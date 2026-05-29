import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import MediaCategoryManager from "./MediaCategoryManager";
import { AdminButton } from "./AdminUI";

const STORAGE_KEY = "admin.activeTab";
const RECENT_STORAGE_KEY = "admin.recentTabs";
const MAX_RECENT_TABS = 4;
const LEGACY_TAB_ALIASES = {
  "ai-models": "intelligence",
};
const normalizeTabId = (tabId) => LEGACY_TAB_ALIASES[tabId] || tabId;
const KNOWN_TAB_IDS = new Set([
  "overview",
  "pending",
  "intelligence",
  "events",
  "hackathon",
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
  const queryTab = normalizeTabId(
    new URLSearchParams(window.location.search).get("tab") || "",
  );
  if (KNOWN_TAB_IDS.has(queryTab)) return queryTab;

  const storedTab = normalizeTabId(
    sessionStorage.getItem(STORAGE_KEY) || "overview",
  );
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
  const [recentTabIds, setRecentTabIds] = useState(readRecentTabs);
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
        title: t("admin.menu.workspace", "工作台"),
        items: [
          {
            id: "overview",
            label: t("admin.tabs.overview", "总览"),
            icon: LayoutDashboard,
            description: t(
              "admin.descriptions.overview",
              "关键数据、待办和常用入口",
            ),
          },
          {
            id: "pending",
            label: t("admin.tabs.pending", "审核中心"),
            icon: Inbox,
            description: t("admin.descriptions.pending", "集中处理待审核内容"),
          },
        ],
      },
      {
        title: t("admin.menu.eventOps", "活动运营"),
        items: [
          {
            id: "intelligence",
            label: t("admin.tabs.intelligence", "智能治理"),
            icon: ShieldCheck,
            description: t(
              "admin.descriptions.intelligence",
              "活动治理和模型接口",
            ),
          },
          {
            id: "events",
            label: t("admin.tabs.events", "活动"),
            icon: Calendar,
            description: t(
              "admin.descriptions.events",
              "活动内容、报名与基础信息",
            ),
          },
          {
            id: "hackathon",
            label: t("admin.tabs.hackathon", "黑客松"),
            icon: Users,
            description: t(
              "admin.descriptions.hackathon",
              "黑客松报名、作品与经验审核",
            ),
          },
          {
            id: "future-learning",
            label: t("admin.tabs.futureLearning", "未来学习中心"),
            icon: Trees,
            description: t(
              "admin.descriptions.futureLearning",
              "「智能生命健康」项目报名与问题揭榜",
            ),
          },
        ],
      },
      {
        title: t("admin.menu.contentAssets", "内容资产"),
        items: [
          {
            id: "articles",
            label: t("admin.tabs.articles", "文章"),
            icon: BookOpen,
            description: t("admin.descriptions.articles", "文章、资讯和长内容"),
          },
          {
            id: "photos",
            label: t("admin.tabs.photos", "图片"),
            icon: LayoutGrid,
            description: t("admin.descriptions.photos", "图片资源与展示素材"),
          },
          {
            id: "videos",
            label: t("admin.tabs.videos", "视频"),
            icon: Film,
            description: t("admin.descriptions.videos", "视频资源与封面"),
          },
          {
            id: "media-categories",
            label: t("admin.tabs.mediaCategories", "影像分类"),
            icon: ImageIcon,
            description: t("admin.descriptions.mediaCategories", "图片与视频共享分类"),
          },
          {
            id: "music",
            label: t("admin.tabs.music", "音频"),
            icon: Music,
            description: t("admin.descriptions.music", "音频资源与封面"),
          },
          {
            id: "pages",
            label: t("admin.tabs.pages", "页面内容"),
            icon: LayoutTemplate,
            description: t(
              "admin.descriptions.pages",
              "站点静态文案与页面配置",
            ),
          },
        ],
      },
      {
        title: t("admin.menu.communityUsers", "社区与用户"),
        items: [
          {
            id: "community",
            label: t("admin.tabs.community", "社区运营"),
            icon: MessageSquare,
            description: t(
              "admin.descriptions.community",
              "帖子、社群和社区数据",
            ),
          },
          {
            id: "users",
            label: t("admin.tabs.users", "用户"),
            icon: Users,
            description: t("admin.descriptions.users", "账号、角色与用户状态"),
          },
          {
            id: "messages",
            label: t("admin.tabs.messages", "留言"),
            icon: Mail,
            description: t("admin.descriptions.messages", "站内联系与反馈消息"),
          },
        ],
      },
      {
        title: t("admin.menu.systemConfig", "系统配置"),
        items: [
          {
            id: "partners",
            label: t("admin.tabs.partners", "生态伙伴"),
            icon: Handshake,
            description: t(
              "admin.descriptions.partners",
              "学校、社团与企业合作方统一维护",
            ),
          },
          {
            id: "tags",
            label: t("admin.tabs.tags", "标签"),
            icon: Tag,
            description: t("admin.descriptions.tags", "站内标签和筛选字典"),
          },
          {
            id: "settings",
            label: t("admin.tabs.settings", "设置"),
            icon: Settings,
            description: t("admin.descriptions.settings", "站点开关和基础配置"),
          },
        ],
      },
    ],
    [t],
  );

  const flatMenuItems = useMemo(
    () => menuGroups.flatMap((group) => group.items),
    [menuGroups],
  );
  const moduleById = useMemo(
    () => new Map(flatMenuItems.map((item) => [item.id, item])),
    [flatMenuItems],
  );
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
            item.description.toLowerCase().includes(normalizedNavQuery),
        );
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [menuGroups, normalizedNavQuery]);
  const activeItem = flatMenuItems.find((item) => item.id === activeTab);
  const activeGroup = menuGroups.find((group) =>
    group.items.some((item) => item.id === activeTab),
  );

  const scrollToContentStart = useCallback((behavior = "smooth") => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      contentTopRef.current?.scrollIntoView({ behavior, block: "start" });
      window.setTimeout(
        () => {
          contentTopRef.current?.focus({ preventScroll: true });
        },
        behavior === "auto" ? 0 : 120,
      );
    });
  }, []);

  const writeTabSearchParam = useCallback(
    (tabId, options = {}) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", tabId);
      setSearchParams(nextParams, { replace: options.replace === true });
    },
    [searchParams, setSearchParams],
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
    [flatMenuItems, scrollToContentStart, writeTabSearchParam],
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
      case "users":
        return <UserManager />;
      case "pages":
        return <PageContentEditor />;
      case "photos":
        return (
          <ResourceManager
            key="photos"
            title="图片资源"
            apiEndpoint="photos"
            type="image"
            icon={LayoutGrid}
          />
        );
      case "music":
        return (
          <ResourceManager
            key="music"
            title="音频资源"
            apiEndpoint="music"
            type="audio"
            icon={Music}
          />
        );
      case "videos":
        return (
          <ResourceManager
            key="videos"
            title="视频资源"
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
            title="文章内容"
            apiEndpoint="articles"
            type="article"
            icon={BookOpen}
          />
        );
      case "events":
        return (
          <ResourceManager
            key="events"
            title="活动管理"
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
  const sidebarClass = isDayMode
    ? "theme-admin-sidebar"
    : "border border-white/10 bg-[#0d0d0d]";
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
  const activeIconClass = isDayMode
    ? "bg-indigo-100 text-indigo-600"
    : "bg-white/15";
  const inactiveIconClass = isDayMode
    ? "bg-slate-100 text-slate-500"
    : "bg-white/5";
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
        <div className="mb-4 flex flex-col gap-3 md:mb-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              type="button"
              aria-label="打开管理导航"
              aria-expanded={isMobileMenuOpen}
              aria-controls="admin-navigation"
              className={mobileToggleClass}
              onClick={() => setIsMobileMenuOpen((value) => !value)}
            >
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <h1
                className={`text-xl font-bold tracking-normal md:text-3xl ${titleClass}`}
                style={
                  isDayMode
                    ? { fontFamily: "var(--theme-font-display)" }
                    : undefined
                }
              >
                {t("admin.dashboard", "管理员后台")}
              </h1>
              <p
                className={`mt-1 max-w-2xl text-sm ${mutedClass}`}
              >
                {activeItem?.description ||
                  t("admin.subtitle", "统一管理内容、用户、社区和系统配置。")}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${metaLabelClass}`}>
              {activeGroup?.title || "总览"}
            </div>
            <select
              aria-label="快速跳转到管理模块"
              value={activeTab}
              onChange={(event) => selectTab(event.target.value)}
              className="theme-admin-input rect-field min-h-[40px] min-w-0 px-3 py-2 text-sm font-semibold sm:w-56"
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
            aria-label="管理员导航"
            className={`${
              isMobileMenuOpen
                ? "fixed inset-x-3 top-[calc(env(safe-area-inset-top)+72px)] bottom-[calc(env(safe-area-inset-bottom)+14px)] z-[100]"
                : "hidden"
            } lg:static lg:block lg:w-72 lg:flex-shrink-0 xl:w-80`}
          >
            <div
              className={`rect-surface h-full p-3 md:p-4 lg:sticky lg:top-24 lg:h-auto lg:max-h-none ${sidebarClass}`}
            >
              <div className="mb-4 flex items-center justify-between px-1 lg:hidden">
                <div
                  className={`text-xs font-semibold uppercase tracking-[0.18em] ${metaLabelClass}`}
                >
                  导航
                </div>
                <button
                  type="button"
                  aria-label="关闭管理导航"
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
                    aria-label="搜索管理模块"
                    value={navQuery}
                    onChange={(event) => setNavQuery(event.target.value)}
                    placeholder="搜索模块或任务"
                    className="theme-admin-input rect-field min-h-[38px] w-full py-2 pl-9 pr-9 text-sm font-semibold"
                  />
                  {navQuery ? (
                    <button
                      type="button"
                      aria-label="清空模块搜索"
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
                    <div key={group.title}>
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
                              aria-label={`打开${tab.label}模块`}
                              aria-current={isActive ? "page" : undefined}
                              onClick={() => selectTab(tab.id)}
                              className={`w-full rounded-[6px] border px-2 py-2 text-left transition-all ${
                                isActive ? activeItemClass : inactiveItemClass
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <div
                                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                                    isActive ? activeIconClass : inactiveIconClass
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
                    <div className="font-semibold">没有匹配的模块</div>
                    <button
                      type="button"
                      className={`mt-2 text-xs font-semibold ${
                        isDayMode ? "text-indigo-600" : "text-indigo-300"
                      }`}
                      onClick={() => setNavQuery("")}
                    >
                      清空搜索
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
            aria-label="回到管理员顶部"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={backToTopClass}
            onClick={() => scrollToContentStart()}
          >
            <ArrowUp size={18} />
            <span className="hidden sm:inline">回到顶部</span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
