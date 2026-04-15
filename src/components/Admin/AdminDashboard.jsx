import React, { useEffect, useMemo, useState } from "react";
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
  ChevronRight,
  Tag,
  X,
  MessageSquare,
  Mail,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import Overview from "./Overview";
import PendingReviewManager from "./PendingReviewManager";
import SettingsManager from "./SettingsManager";
import UserManager from "./UserManager";
import PageContentEditor from "./PageContentEditor";
import ResourceManager from "./ResourceManager";
import MessageManager from "./MessageManager";
import TagManager from "./TagManager";
import AdminCommunity from "./AdminCommunity";

const STORAGE_KEY = "admin.activeTab";

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "overview";
    return sessionStorage.getItem(STORAGE_KEY) || "overview";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
    sessionStorage.removeItem(STORAGE_KEY);
    window.location.href = "/";
  };

  const menuGroups = useMemo(
    () => [
      {
        title: t("admin.menu.overview", "总览"),
        items: [
          {
            id: "overview",
            label: t("admin.tabs.overview", "总览"),
            icon: LayoutDashboard,
            description: "查看关键数据和快捷入口",
          },
          {
            id: "pending",
            label: t("admin.tabs.pending", "审核中心"),
            icon: Inbox,
            description: "统一处理待审核内容",
          },
        ],
      },
      {
        title: t("admin.menu.content", "内容"),
        items: [
          {
            id: "photos",
            label: t("admin.tabs.photos", "图片"),
            icon: LayoutGrid,
            description: "管理图片资源",
          },
          {
            id: "videos",
            label: t("admin.tabs.videos", "视频"),
            icon: Film,
            description: "管理视频资源",
          },
          {
            id: "music",
            label: t("admin.tabs.music", "音频"),
            icon: Music,
            description: "管理音频资源",
          },
          {
            id: "articles",
            label: t("admin.tabs.articles", "文章"),
            icon: BookOpen,
            description: "管理文章内容",
          },
          {
            id: "events",
            label: t("admin.tabs.events", "活动"),
            icon: Calendar,
            description: "管理活动和报名数据",
          },
          {
            id: "pages",
            label: t("admin.tabs.pages", "页面内容"),
            icon: LayoutTemplate,
            description: "编辑站点静态内容",
          },
        ],
      },
      {
        title: t("admin.menu.community", "社区"),
        items: [
          {
            id: "community",
            label: t("admin.tabs.community", "社区运营"),
            icon: MessageSquare,
            description: "查看社区帖子和社群数据",
          },
        ],
      },
      {
        title: t("admin.menu.system", "系统"),
        items: [
          {
            id: "tags",
            label: t("admin.tabs.tags", "标签"),
            icon: Tag,
            description: "管理标签字典",
          },
          {
            id: "users",
            label: t("admin.tabs.users", "用户"),
            icon: Users,
            description: "管理用户与角色",
          },
          {
            id: "messages",
            label: t("admin.tabs.messages", "留言"),
            icon: Mail,
            description: "处理站内联系留言",
          },
          {
            id: "settings",
            label: t("admin.tabs.settings", "设置"),
            icon: Settings,
            description: "调整站点配置",
          },
        ],
      },
    ],
    [t],
  );

  const activeItem = menuGroups
    .flatMap((group) => group.items)
    .find((item) => item.id === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <Overview onChangeTab={setActiveTab} />;
      case "pending":
        return <PendingReviewManager />;
      case "messages":
        return <MessageManager />;
      case "tags":
        return <TagManager />;
      case "settings":
        return <SettingsManager />;
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
      case "community":
        return <AdminCommunity />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-[calc(env(safe-area-inset-top)+72px)] md:pt-24 px-3 md:px-8 pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-12">
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3 md:gap-4">
            <button
              className="mt-1 rounded-xl bg-white/10 p-2.5 text-white lg:hidden"
              onClick={() => setIsMobileMenuOpen((value) => !value)}
            >
              <LayoutGrid size={22} />
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-indigo-300/80">
                Operations Console
              </p>
              <h1 className="mt-2 text-2xl font-bold md:text-4xl lg:text-5xl">
                {t("admin.dashboard", "管理员后台")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400 md:text-base">
                {activeItem?.description || t("admin.subtitle", "统一管理内容、用户、社区和系统配置。")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-gray-500">
                当前模块
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {activeItem?.label || "总览"}
              </div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-gray-500">
                日期
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {new Date().toLocaleDateString("zh-CN")}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="ml-auto inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-red-300"
            >
              <LogOut size={16} /> {t("admin.logout", "退出管理")}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside
            className={`${
              isMobileMenuOpen
                ? "fixed inset-x-3 top-[calc(env(safe-area-inset-top)+76px)] bottom-[calc(env(safe-area-inset-bottom)+16px)] z-[100]"
                : "hidden"
            } lg:static lg:block lg:w-80 lg:flex-shrink-0`}
          >
            <div className="h-full overflow-y-auto rounded-3xl border border-white/10 bg-[#0d0d0d] p-4 shadow-xl lg:sticky lg:top-24 lg:h-auto lg:max-h-[calc(100vh-7.5rem)]">
              <div className="mb-4 flex items-center justify-between px-1 lg:hidden">
                <div className="text-xs uppercase tracking-[0.22em] text-gray-500">
                  导航
                </div>
                <button
                  className="rounded-lg bg-white/5 p-2 text-gray-300 hover:text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-5">
                {menuGroups.map((group) => (
                  <div key={group.title}>
                    <div className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.24em] text-gray-500">
                      {group.title}
                    </div>
                    <div className="space-y-1.5">
                      {group.items.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full rounded-2xl border p-3 text-left transition-all ${
                            activeTab === tab.id
                              ? "border-indigo-500/30 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                              : "border-transparent bg-white/[0.03] text-gray-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                  activeTab === tab.id
                                    ? "bg-white/15"
                                    : "bg-white/5"
                                }`}
                              >
                                <tab.icon size={18} />
                              </div>
                              <div>
                                <div className="font-semibold">{tab.label}</div>
                                <div
                                  className={`mt-1 text-xs ${
                                    activeTab === tab.id
                                      ? "text-indigo-100/80"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {tab.description}
                                </div>
                              </div>
                            </div>
                            {activeTab === tab.id ? <ChevronRight size={16} /> : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="my-5 border-t border-white/10" />

              <a
                href="/"
                className="flex w-full items-center justify-between rounded-2xl border border-transparent bg-white/[0.03] p-3 text-sm font-semibold text-gray-300 transition-all hover:border-white/10 hover:bg-white/5 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                    <Home size={18} />
                  </div>
                  <div>
                    <div>{t("nav.home", "首页")}</div>
                    <div className="mt-1 text-xs text-gray-500">返回站点前台</div>
                  </div>
                </div>
              </a>
            </div>
          </aside>

          <main className="min-w-0 flex-1">
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
    </div>
  );
};

export default AdminDashboard;
