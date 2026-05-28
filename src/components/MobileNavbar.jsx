import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, Home, Trees, Trophy, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LayoutGroup, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import {
  motionTokens,
  tabbarEntrance,
  tapPress,
  useReducedMotion,
} from "../utils/animations";
import { useSettings } from "../context/SettingsContext";
import api from "../services/api";

const MobileNavbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const { uiMode } = useSettings();
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === "day";
  const isMobileViewport = useMediaQuery("(max-width: 767px)");

  // Unread notification count for the "我的" tab badge. Mobile clients don't
  // render NotificationCenter (it's desktop-only inside Navbar's hidden
  // md:flex container), so we poll here directly and also listen for the
  // 'notifications:updated' event that NotificationCenter emits — if a
  // desktop-sized viewport also has NotificationCenter mounted, either
  // source keeps this state fresh.
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !isMobileViewport) {
      setUnreadCount(0);
      return undefined;
    }

    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await api.get("/notifications?limit=1");
        if (cancelled) return;
        setUnreadCount(Number(res.data?.unreadCount) || 0);
      } catch {
        /* ignore — transient auth/network errors */
      }
    };
    fetchUnread();
    const pollId = setInterval(fetchUnread, 60_000);

    const onNotificationsUpdated = (event) => {
      const n = Number(event?.detail?.unreadCount);
      if (Number.isFinite(n)) setUnreadCount(n);
    };
    window.addEventListener("notifications:updated", onNotificationsUpdated);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      window.removeEventListener(
        "notifications:updated",
        onNotificationsUpdated,
      );
    };
  }, [isMobileViewport, user?.id]);

  useEffect(() => {
    document.body.style.overflow = "";
  }, [location.pathname]);

  const navItems = [
    { key: "home", path: "/", icon: Home, label: t("nav.home", "首页") },
    { key: "events", path: "/events", icon: Calendar, label: t("nav.events", "活动") },
    { key: "hackathon", path: "/hackathon", icon: Trophy, label: "浙客松" },
    { key: "me", path: user ? `/user/${user.id}` : null, icon: UserCircle, label: t("nav.profile", "我的") },
  ];

  const isItemActive = (path, key) => {
    if (key === "me") {
      return location.pathname.startsWith("/user/");
    }
    if (key === "hackathon") {
      return location.pathname.startsWith("/hackathon");
    }
    return location.pathname === path;
  };

  return (
    <motion.nav
      variants={tabbarEntrance}
      initial={prefersReducedMotion ? false : "initial"}
      animate={prefersReducedMotion ? undefined : "animate"}
      className={`motion-gpu fixed inset-x-0 bottom-0 z-[100] border-t backdrop-blur-xl md:hidden ${isDayMode ? "border-sky-200/55 bg-white/[0.88] shadow-[0_-8px_20px_rgba(14,165,233,0.055)]" : "border-white/[0.08] bg-[#0b111c]/90 shadow-[0_-10px_24px_rgba(0,0,0,0.24)]"}`}
      aria-label={t("nav.mobile_tabbar", "移动端底部导航")}
    >
      <LayoutGroup id="mobile-tabbar">
      <div className="pb-[env(safe-area-inset-bottom)]">
      <div className="grid h-[58px] grid-cols-5 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path, item.key);

          const sharedClassName = `relative flex flex-col items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isActive ? (isDayMode ? "text-slate-900" : "text-white") : isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-400 hover:text-white"}`;
          const activeIconSurface = isDayMode
            ? "rounded-[5px] bg-sky-50/90 ring-1 ring-indigo-200/70"
            : "rounded-[5px] bg-[#172033] ring-1 ring-white/10";
          const iconClassName = `relative p-1.5 transition-colors duration-300 ${
            isActive
              ? isDayMode
                ? "text-indigo-600"
                : "text-indigo-200"
              : isDayMode
                ? "text-slate-500"
                : "text-gray-400"
          }`;

          const showUnreadBadge =
            item.key === "me" && user && unreadCount > 0;
          const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

          const inner = (
            <motion.div
              whileTap={prefersReducedMotion ? undefined : tapPress}
              className="flex flex-col items-center gap-1"
            >
              <div
                className={iconClassName}
              >
                {isActive &&
                  (prefersReducedMotion ? (
                    <span className={`absolute inset-0 ${activeIconSurface}`} />
                  ) : (
                    <motion.span
                      layoutId="mobile-tab-active-icon"
                      className={`absolute inset-0 ${activeIconSurface}`}
                      transition={motionTokens.spring.tab}
                    />
                  ))}
                  <Icon className="relative z-10" size={20} strokeWidth={isActive ? 2.4 : 2} />
                {showUnreadBadge && (
                  <span
                    aria-label={t(
                      "nav.unread_count",
                      "{{count}} 条未读通知",
                      { count: unreadCount },
                    )}
                    className={`absolute -top-0.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-md bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 shadow-sm ${isDayMode ? "ring-white" : "ring-[#101722]"}`}
                  >
                    {badgeLabel}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] leading-none transition-all ${isActive ? "font-semibold opacity-100" : "font-medium opacity-85"}`}
              >
                {item.label}
              </span>
            </motion.div>
          );

          if (item.key === "me" && !user) {
            return (
              <button
                key={item.key}
                type="button"
                aria-label={item.label}
                onClick={() => window.dispatchEvent(new Event("open-auth-modal"))}
                className={sharedClassName}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={item.key}
              to={item.path}
              aria-label={item.label}
              className={sharedClassName}
            >
              {inner}
            </Link>
          );
        })}
      </div>
      </div>
      </LayoutGroup>
    </motion.nav>
  );
};

export default MobileNavbar;
