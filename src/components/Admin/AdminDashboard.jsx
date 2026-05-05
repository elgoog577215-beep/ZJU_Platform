import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Inbox,
  LayoutGrid,
  Music,
  Film,
  BookOpen,
  Calendar,
  LayoutTemplate,
  Settings,
  Users,
  Home,
  LogOut,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Tag,
  X,
  Menu,
  MessageSquare,
  Mail,
  Bot,
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
import AiAssistantManager from "./AiAssistantManager";
import { AdminButton } from "./AdminUI";

const STORAGE_KEY = "admin.activeTab";

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "overview";
    return sessionStorage.getItem(STORAGE_KEY) || "overview";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
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

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.href = "/";
  };

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
            description: t(
              "admin.descriptions.pending",
              "集中处理待审核内容",
            ),
          },
        ],
      },
      {
        title: t("admin.menu.eventOps", "活动运营"),
        items: [
          {
            id: "ai-models",
            label: t("admin.tabs.aiAssistant", "AI 助手"),
            icon: Bot,
            description: t(
              "admin.descriptions.aiAssistant",
              "推荐、治理、解析和模型 Key",
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
              "黑客松报名与参赛信息",
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
            description: t(
              "admin.descriptions.articles",
              "文章、资讯和长内容",
            ),
          },
          {
            id: "photos",
            label: t("admin.tabs.photos", "图片"),
            icon: LayoutGrid,
            description: t(
              "admin.descriptions.photos",
              "图片资源与展示素材",
            ),
          },
          {
            id: "videos",
            label: t("admin.tabs.videos", "视频"),
            icon: Film,
            description: t(
              "admin.descriptions.videos",
              "视频资源与封面",
            ),
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
            description: t(
              "admin.descriptions.messages",
              "站内联系与反馈消息",
            ),
          },
        ],
      },
      {
        title: t("admin.menu.systemConfig", "系统配置"),
        items: [
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
            description: t(
              "admin.descriptions.settings",
              "站点开关和基础配置",
            ),
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
  const activeItem = flatMenuItems.find((item) => item.id === activeTab);
  const activeGroup = menuGroups.find((group) =>
    group.items.some((item) => item.id === activeTab),
  );
  const activeIndex = flatMenuItems.findIndex((item) => item.id === activeTab);

  const scrollToContentStart = useCallback((behavior = "smooth") => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      contentTopRef.current?.scrollIntoView({ behavior, block: "start" });
      window.setTimeout(() => {
        contentTopRef.current?.focus({ preventScroll: true });
      }, behavior === "auto" ? 0 : 120);
    });
  }, []);

  const selectTab = useCallback(
    (tabId, options = {}) => {
      if (!flatMenuItems.some((item) => item.id === tabId)) return;
      setActiveTab(tabId);
      setIsMobileMenuOpen(false);
      if (options.scroll !== false) {
        scrollToContentStart(options.behavior);
      }
    },
    [flatMenuItems, scrollToContentStart],
  );

  const selectAdjacentModule = useCallback(
    (direction) => {
      if (flatMenuItems.length === 0) return;
      const currentIndex = activeIndex >= 0 ? activeIndex : 0;
      const nextIndex =
        (currentIndex + direction + flatMenuItems.length) %
        flatMenuItems.length;
      selectTab(flatMenuItems[nextIndex].id);
    },
    [activeIndex, flatMenuItems, selectTab],
  );

  const modulePosition = `${activeIndex >= 0 ? activeIndex + 1 : 1}/${flatMenuItems.length}`;

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <Overview onChangeTab={selectTab} />;
      case "pending":
        return <PendingReviewManager />;
      case "messages":
        return <MessageManager />;
      case "tags":
        return <TagManager />;
      case "settings":
        return <SettingsManager />;
      case "ai-models":
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
      case "community":
        return <AdminCommunity />;
      default:
        return null;
    }
  };

  const shellClass = isDayMode ? "theme-admin-shell" : "bg-black text-white";
  const titleClass = isDayMode ? "text-slate-950" : "text-white";
  const mutedClass = isDayMode ? "text-slate-500" : "text-gray-400";
  const labelClass = isDayMode ? "text-indigo-500/80" : "text-indigo-300/80";
  const metaLabelClass = isDayMode ? "text-slate-400" : "text-gray-500";
  const topPanelClass = isDayMode
    ? "theme-admin-panel-soft"
    : "rounded-2xl border border-white/10 bg-white/5";
  const mobileToggleClass = isDayMode
    ? "mt-1 rounded-xl border border-slate-200/70 bg-white/[0.92] p-2.5 text-slate-900 lg:hidden"
    : "mt-1 rounded-xl border border-white/10 bg-white/10 p-2.5 text-white lg:hidden";
  const logoutClass = isDayMode
    ? "inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-white hover:text-rose-600"
    : "inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-red-300";
  const overlayClass = isDayMode
    ? "fixed inset-0 z-[90] bg-white/70 backdrop-blur-sm lg:hidden"
    : "fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm lg:hidden";
  const sidebarClass = isDayMode
    ? "theme-admin-sidebar"
    : "rounded-2xl border border-white/10 bg-[#0d0d0d]";
  const closeClass = isDayMode
    ? "rounded-lg bg-slate-100 p-2 text-slate-500 hover:text-slate-950"
    : "rounded-lg bg-white/5 p-2 text-gray-300 hover:text-white";
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
  const activeDescClass = isDayMode ? "text-slate-500" : "text-indigo-100/80";
  const inactiveDescClass = isDayMode ? "text-slate-400" : "text-gray-500";
  const dividerClass = isDayMode
    ? "my-5 border-t border-[rgba(128,146,167,0.14)]"
    : "my-5 border-t border-white/10";
  const homeLinkClass = isDayMode
    ? "flex w-full items-center justify-between rounded-2xl border border-transparent bg-transparent p-3 text-sm font-semibold text-slate-600 transition-all hover:border-slate-200/70 hover:bg-white/80 hover:text-slate-950"
    : "flex w-full items-center justify-between rounded-2xl border border-transparent bg-white/[0.03] p-3 text-sm font-semibold text-gray-300 transition-all hover:border-white/10 hover:bg-white/5 hover:text-white";
  const homeIconClass = isDayMode
    ? "flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500"
    : "flex h-10 w-10 items-center justify-center rounded-xl bg-white/5";
  const quickJumpDividerClass = isDayMode
    ? "border-t border-slate-200/70"
    : "border-t border-white/10";
  const backToTopClass = isDayMode
    ? "fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] right-4 z-[80] inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200/80 bg-white/[0.94] px-3 py-2 text-sm font-semibold text-slate-700 backdrop-blur transition-colors hover:text-indigo-600 md:bottom-6 md:right-6"
    : "fixed bottom-[calc(env(safe-area-inset-bottom)+96px)] right-4 z-[80] inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-sm font-semibold text-white backdrop-blur transition-colors hover:text-indigo-200 md:bottom-6 md:right-6";

  return (
    <div
      className={`min-h-screen px-3 pt-[calc(env(safe-area-inset-top)+68px)] pb-[calc(env(safe-area-inset-bottom)+88px)] md:px-6 md:pt-24 md:pb-10 xl:px-8 ${shellClass}`}
    >
      <div
        ref={contentTopRef}
        tabIndex={-1}
        className="mx-auto max-w-[1680px] scroll-mt-24 focus:outline-none"
      >
        <div className="mb-5 grid gap-4 md:mb-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,520px)] xl:items-center">
          <div className="flex items-start gap-3 md:gap-4">
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
              <p
                className={`text-xs font-semibold uppercase tracking-[0.24em] ${labelClass}`}
              >
                Operations Console
              </p>
              <h1
                className={`mt-2 text-2xl font-bold tracking-normal md:text-4xl ${titleClass}`}
                style={
                  isDayMode
                    ? { fontFamily: "var(--theme-font-display)" }
                    : undefined
                }
              >
                {t("admin.dashboard", "管理员后台")}
              </h1>
              <p
                className={`mt-2 max-w-2xl text-sm md:text-base ${mutedClass}`}
              >
                {activeItem?.description ||
                  t("admin.subtitle", "统一管理内容、用户、社区和系统配置。")}
              </p>
            </div>
          </div>

          <div className={`rounded-2xl px-4 py-3 ${topPanelClass}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className={`text-xs font-semibold uppercase tracking-[0.16em] ${metaLabelClass}`}>
                  模块导航
                </div>
                <div className={`mt-1 truncate text-sm font-semibold ${titleClass}`}>
                  {activeGroup?.title || "总览"} / {activeItem?.label || "总览"}
                </div>
                <div className={`mt-1 text-xs ${mutedClass}`}>
                  第 {modulePosition} 个模块 · {new Date().toLocaleDateString("zh-CN")}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className={logoutClass}
              >
                <LogOut size={16} /> {t("admin.logout", "退出管理")}
              </button>
            </div>
            <div className={`mt-3 flex flex-col gap-2 pt-3 sm:flex-row sm:items-center sm:justify-between ${quickJumpDividerClass}`}>
              <select
                aria-label="快速跳转到管理模块"
                value={activeTab}
                onChange={(event) => selectTab(event.target.value)}
                className="theme-admin-input min-h-[40px] min-w-0 flex-1 rounded-xl px-3 py-2 text-sm font-semibold sm:max-w-xs"
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
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <AdminButton
                  tone="subtle"
                  className="px-3"
                  aria-label="跳转到上一个管理模块"
                  onClick={() => selectAdjacentModule(-1)}
                >
                  <ChevronLeft size={16} />
                  <span>上一个</span>
                </AdminButton>
                <AdminButton
                  tone="subtle"
                  className="px-3"
                  aria-label="跳转到下一个管理模块"
                  onClick={() => selectAdjacentModule(1)}
                >
                  <span>下一个</span>
                  <ChevronRight size={16} />
                </AdminButton>
              </div>
            </div>
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

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
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
              className={`h-full overflow-y-auto p-3 md:p-4 lg:sticky lg:top-24 lg:h-auto lg:max-h-[calc(100vh-7.5rem)] ${sidebarClass}`}
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

              <div className="space-y-4">
                {menuGroups.map((group) => (
                  <div key={group.title}>
                    <div
                      className={`px-2 pb-2 text-xs font-bold uppercase tracking-[0.18em] ${metaLabelClass}`}
                    >
                      {group.title}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            type="button"
                            key={tab.id}
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => selectTab(tab.id)}
                            className={`w-full rounded-xl border p-2.5 text-left transition-all ${
                              isActive ? activeItemClass : inactiveItemClass
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                    isActive
                                      ? activeIconClass
                                      : inactiveIconClass
                                  }`}
                                >
                                  <tab.icon size={18} />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold">
                                    {tab.label}
                                  </div>
                                  {isActive ? (
                                    <div
                                      className={`mt-1 line-clamp-2 text-xs ${
                                        isActive
                                          ? activeDescClass
                                          : inactiveDescClass
                                      }`}
                                    >
                                      {tab.description}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              {isActive ? <ChevronRight size={16} /> : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className={dividerClass} />

              <a href="/" className={homeLinkClass}>
                <div className="flex items-center gap-3">
                  <div className={homeIconClass}>
                    <Home size={18} />
                  </div>
                  <div>
                    <div>{t("nav.home", "首页")}</div>
                    <div className={`mt-1 text-xs ${metaLabelClass}`}>
                      返回站点前台
                    </div>
                  </div>
                </div>
              </a>
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
