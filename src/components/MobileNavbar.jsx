import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, FileText, Home, Music, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useReducedMotion } from "../utils/animations";
import { useSettings } from "../context/SettingsContext";

const MobileNavbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const { uiMode } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === "day";

  useEffect(() => {
    document.body.style.overflow = "";
  }, [location.pathname]);

  const navItems = [
    { key: "home", path: "/", icon: Home, label: t("nav.home", "首页") },
    { key: "events", path: "/events", icon: Calendar, label: t("nav.events", "活动") },
    { key: "articles", path: "/articles", icon: FileText, label: t("nav.articles", "AI社区") },
    { key: "music", path: "/music", icon: Music, label: t("nav.music", "播客") },
    { key: "me", path: user ? `/user/${user.id}` : "/me", icon: UserCircle, label: t("nav.profile", "我的") },
  ];

  const isItemActive = (path, key) => {
    if (key === "me") {
      return location.pathname === "/me" || location.pathname.startsWith("/user/");
    }
    return location.pathname === path;
  };

  return (
    <nav
      className={`fixed left-3 right-3 bottom-[max(env(safe-area-inset-bottom),10px)] z-[100] rounded-2xl border backdrop-blur-2xl md:hidden sm:left-4 sm:right-4 ${isDayMode ? "border-slate-200/80 bg-white/92 shadow-[0_12px_28px_rgba(148,163,184,0.2)]" : "border-white/10 bg-[#111827]/88 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"}`}
      aria-label={t("nav.mobile_tabbar", "移动端底部导航")}
    >
      <div className="grid h-16 grid-cols-5 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path, item.key);

          return (
            <Link
              key={item.key}
              to={item.path}
              aria-label={item.label}
              className={`relative flex flex-col items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isActive ? (isDayMode ? "text-slate-900" : "text-white") : isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-400 hover:text-white"}`}
            >
              <motion.div
                whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`rounded-xl p-1.5 transition-all duration-300 ${isActive ? "bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.28)]" : ""}`}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span
                  className={`text-[10px] transition-all ${isActive ? "font-semibold opacity-100" : "font-medium opacity-75"}`}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavbar;
