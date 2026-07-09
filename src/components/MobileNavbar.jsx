import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, Rocket, Sparkles, Trees, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import {
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

  const profilePath =
    user?.id !== undefined && user?.id !== null && String(user.id).trim() !== ""
      ? `/user/${user.id}/center`
      : null;

  const navItems = [
    { key: "events", path: "/events", icon: Calendar, label: t("nav.events") },
    { key: "articles", path: "/articles", icon: Trees, label: t("nav.community") },
    { key: "projects", path: "/projects", icon: Rocket, label: t("nav.projects") },
    { key: "hackathon", path: "/hackathon", icon: Sparkles, label: t("nav.hackathon") },
    { key: "me", path: profilePath, icon: UserCircle, label: t("nav.profile") },
  ];

  const isItemActive = (path, key) => {
    if (key === "me") {
      return location.pathname.startsWith("/user/");
    }
    if (key === "hackathon") return location.pathname.startsWith("/hackathon");
    if (key === "articles") {
      return location.pathname.startsWith("/articles");
    }
    if (key === "projects") return location.pathname.startsWith("/projects");
    return location.pathname === path;
  };

  return (
    <motion.nav
      variants={tabbarEntrance}
      initial={prefersReducedMotion ? false : "initial"}
      animate={prefersReducedMotion ? undefined : "animate"}
      className="motion-gpu fixed inset-x-0 bottom-0 z-[80] flex justify-center px-3 md:hidden"
      aria-label={t("nav.mobile_tabbar")}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 ${
          isDayMode
            ? "bg-gradient-to-t from-white via-white/86 to-transparent"
            : "bg-gradient-to-t from-[#020711] via-[#020711]/92 to-transparent"
        }`}
      />
      <div className={`relative z-10 mb-1.5 w-full max-w-[390px] overflow-hidden rounded-[14px] border backdrop-blur-xl ${
        isDayMode
          ? "border-slate-900/[0.08] bg-white/90 shadow-[0_-10px_24px_rgba(31,45,61,0.045)]"
          : "border-white/[0.14] bg-[linear-gradient(180deg,rgba(13,29,51,0.98),rgba(4,10,20,0.99))] shadow-[0_-12px_28px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]"
      }`}>
      <div className="grid h-[56px] grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path, item.key);

          const sharedClassName = `relative flex min-w-0 flex-col items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isActive ? (isDayMode ? "text-slate-900" : "text-white") : isDayMode ? "text-slate-500 hover:text-slate-900" : "text-white/86 hover:text-white"}`;
          const activeIconSurface = isDayMode
            ? "rounded-[5px] bg-white ring-1 ring-slate-900/[0.12] shadow-[0_6px_14px_rgba(31,45,61,0.06)]"
            : "rounded-[7px] bg-indigo-500/28 ring-1 ring-indigo-300/32 shadow-[0_0_18px_rgba(99,102,241,0.24)]";
          const iconClassName = `relative p-1 transition-colors duration-300 ${
            isActive
              ? isDayMode
                ? "text-teal-700"
                : "text-white"
              : isDayMode
                ? "text-slate-500"
                : "text-white/86"
          }`;

          const showUnreadBadge =
            item.key === "me" && user && unreadCount > 0;
          const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

          const inner = (
            <motion.div
              whileTap={prefersReducedMotion ? undefined : tapPress}
              className="flex min-w-0 flex-col items-center gap-0.5"
            >
              <div
                className={iconClassName}
              >
                {isActive && (
                  <span className={`absolute inset-0 ${activeIconSurface}`} />
                )}
                  <Icon className="relative z-10" size={20} strokeWidth={isActive ? 2.35 : 2} />
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
                className={`max-w-full truncate px-0.5 text-[11px] leading-none transition-all ${isActive ? "font-semibold opacity-100" : "font-medium opacity-100"} ${isDayMode ? "" : "drop-shadow-[0_1px_4px_rgba(0,0,0,1)]"}`}
              >
                {item.label}
              </span>
            </motion.div>
          );

          if (item.key === "me" && !item.path) {
            return (
              <button
                key={item.key}
                type="button"
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
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
              aria-current={isActive ? "page" : undefined}
              className={sharedClassName}
            >
              {inner}
            </Link>
          );
        })}
      </div>
      </div>
    </motion.nav>
  );
};

export default MobileNavbar;
