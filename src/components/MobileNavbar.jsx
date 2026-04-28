import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, FileText, Home, Trophy, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useReducedMotion } from "../utils/animations";
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
    { key: "articles", path: "/articles", icon: FileText, label: t("nav.articles", "AI社区") },
    { key: "hackathon", path: "/hackathon", icon: Trophy, label: t("nav.hackathon", "黑客松") },
    { key: "me", path: user ? `/user/${user.id}` : null, icon: UserCircle, label: t("nav.profile", "我的") },
  ];

  const isItemActive = (path, key) => {
    if (key === "me") {
      return location.pathname.startsWith("/user/");
    }
    return location.pathname === path;
  };

  return (
    <nav
      className={`fixed left-3 right-3 bottom-[max(env(safe-area-inset-bottom),10px)] z-[100] overflow-hidden rounded-[24px] border backdrop-blur-2xl md:hidden sm:left-4 sm:right-4 ${isDayMode ? "border-slate-200/80 bg-white/94 shadow-[0_18px_36px_rgba(148,163,184,0.22)]" : "border-white/10 bg-[#111827]/90 shadow-[0_12px_36px_rgba(0,0,0,0.42)]"}`}
      aria-label={t("nav.mobile_tabbar", "移动端底部导航")}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${isDayMode ? "bg-gradient-to-r from-transparent via-indigo-300/70 to-transparent" : "bg-gradient-to-r from-transparent via-white/25 to-transparent"}`} />
      <div className="grid h-[72px] grid-cols-5 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isItemActive(item.path, item.key);

          const sharedClassName = `relative flex flex-col items-center justify-center rounded-2xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isActive ? (isDayMode ? "text-slate-900" : "text-white") : isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-400 hover:text-white"}`;

          const showUnreadBadge =
            item.key === "me" && user && unreadCount > 0;
          const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

          const inner = (
            <motion.div
              whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={`relative rounded-2xl p-2 transition-all duration-300 ${isActive ? "bg-indigo-500/18 text-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.26)]" : isDayMode ? "bg-slate-100/70" : "bg-white/[0.04]"}`}
              >
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                {showUnreadBadge && (
                  <span
                    aria-label={t(
                      "nav.unread_count",
                      "{{count}} 条未读通知",
                      { count: unreadCount },
                    )}
                    className={`absolute -top-0.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 shadow-sm ${isDayMode ? "ring-white" : "ring-[#111827]"}`}
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
    </nav>
  );
};

export default MobileNavbar;
