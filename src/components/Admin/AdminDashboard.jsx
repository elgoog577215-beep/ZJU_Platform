import React, { useEffect, useState } from "react";
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
  Lock,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

// Imported Components
import Overview from "./Overview";
import PendingReviewManager from "./PendingReviewManager";
import SettingsManager from "./SettingsManager";
import UserManager from "./UserManager";
import PageContentEditor from "./PageContentEditor";
import ResourceManager from "./ResourceManager";
import MessageManager from "./MessageManager";
import TagManager from "./TagManager";

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Secondary Password Lock State
  const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [lockError, setLockError] = useState("");

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileMenuOpen]);

  const handleLogout = () => {
    window.location.href = "/";
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (passwordInput === "12345") {
      setIsLocked(false);
      setLockError("");
    } else {
      setLockError("Incorrect password");
      setPasswordInput("");
    }
  };

  if (isLocked) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-4 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-wide">
              Admin Access
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              Please enter secondary password
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className={`w-full bg-black/40 border ${lockError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-indigo-500"} rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:bg-white/5 transition-all text-center tracking-widest text-lg`}
                autoFocus
              />
              <AnimatePresence>
                {lockError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-red-400 text-sm text-center mt-2"
                  >
                    {lockError}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/25"
            >
              Unlock
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const menuGroups = [
    {
      title: t("admin.menu.overview"),
      items: [
        {
          id: "overview",
          label: t("admin.tabs.overview"),
          icon: LayoutDashboard,
        },
        { id: "pending", label: t("admin.tabs.pending"), icon: Inbox },
      ],
    },
    {
      title: t("admin.menu.content"),
      items: [
        { id: "photos", label: t("admin.tabs.photos"), icon: LayoutGrid },
        { id: "videos", label: t("admin.tabs.videos"), icon: Film },
        { id: "music", label: t("admin.tabs.music"), icon: Music },
        { id: "articles", label: t("admin.tabs.articles"), icon: BookOpen },
        { id: "events", label: t("admin.tabs.events"), icon: Calendar },
        { id: "pages", label: t("admin.tabs.pages"), icon: LayoutTemplate },
      ],
    },
    {
      title: t("admin.menu.system"),
      items: [
        { id: "tags", label: t("admin.tabs.tags"), icon: Tag },
        { id: "users", label: t("admin.tabs.users"), icon: Users },
        { id: "messages", label: t("admin.tabs.messages"), icon: Inbox },
        { id: "settings", label: t("admin.tabs.settings"), icon: Settings },
      ],
    },
  ];

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
            title={t("admin.tabs.photos")}
            apiEndpoint="photos"
            type="image"
            icon={LayoutGrid}
          />
        );
      case "music":
        return (
          <ResourceManager
            key="music"
            title={t("admin.tabs.music")}
            apiEndpoint="music"
            type="audio"
            icon={Music}
          />
        );
      case "videos":
        return (
          <ResourceManager
            key="videos"
            title={t("admin.tabs.videos")}
            apiEndpoint="videos"
            type="video"
            icon={Film}
          />
        );
      case "articles":
        return (
          <ResourceManager
            key="articles"
            title={t("admin.tabs.articles")}
            apiEndpoint="articles"
            type="article"
            icon={BookOpen}
          />
        );
      case "events":
        return (
          <ResourceManager
            key="events"
            title={t("admin.tabs.events")}
            apiEndpoint="events"
            type="event"
            icon={Calendar}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-[calc(env(safe-area-inset-top)+72px)] md:pt-24 px-3 md:px-8 pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-12">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-start gap-3 md:gap-4">
            <button
              className="lg:hidden p-2.5 bg-white/10 rounded-xl text-white mt-1"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <LayoutGrid size={24} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold font-serif mb-1 md:mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                {t("admin.dashboard")}
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm md:text-base max-w-[26rem]">
                {t("admin.subtitle")}
              </p>
            </div>
          </div>
          <div className="md:hidden flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[11px] text-gray-400 font-mono">
              {new Date().toLocaleDateString("zh-CN")}
            </p>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-red-300 transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg"
            >
              <LogOut size={13} /> {t("admin.logout")}
            </button>
          </div>
          <div className="text-right hidden md:block">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg ml-auto"
            >
              <LogOut size={14} /> {t("admin.logout")}
            </button>
            <p className="text-xs text-gray-600 font-mono mt-2">
              {new Date().toLocaleDateString("zh-CN")}
            </p>
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

        <div className="flex flex-col lg:flex-row gap-8">
          <div
            className={`${isMobileMenuOpen ? "fixed inset-x-3 top-[calc(env(safe-area-inset-top)+76px)] bottom-[calc(env(safe-area-inset-bottom)+16px)] z-[100]" : "hidden"} lg:static lg:inset-auto lg:z-auto w-auto lg:w-72 flex-shrink-0 lg:block`}
          >
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-3 md:p-4 space-y-4 md:space-y-6 shadow-xl overflow-y-auto h-full lg:h-auto lg:max-h-[80vh] lg:sticky lg:top-24">
              <div className="flex items-center justify-between px-2 lg:hidden">
                <div className="text-xs text-gray-400 uppercase tracking-[0.18em]">
                  {t("admin.dashboard")}
                </div>
                <button
                  className="p-2 rounded-lg bg-white/5 text-gray-300 hover:text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              {menuGroups.map((group, index) => (
                <div key={index}>
                  <div className="px-4 py-2 mb-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {group.title}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all group
                          ${
                            activeTab === tab.id
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                              : "text-gray-400 hover:bg-white/5 hover:text-white"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <tab.icon
                            size={18}
                            className={
                              activeTab === tab.id
                                ? "text-white"
                                : "text-gray-500 group-hover:text-white"
                            }
                          />
                          {tab.label}
                        </div>
                        {activeTab === tab.id && <ChevronRight size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="my-2 border-t border-white/10"></div>

              <a
                href="/"
                className="w-full flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-all group text-gray-400 hover:bg-white/5 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <Home
                    size={18}
                    className="text-gray-500 group-hover:text-white"
                  />
                  {t("nav.home")}
                </div>
              </a>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
