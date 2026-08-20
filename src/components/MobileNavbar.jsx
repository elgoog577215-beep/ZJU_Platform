import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, Sparkles, Trees, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { tabbarEntrance, tapPress, useReducedMotion } from "../utils/animations";
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
            window.removeEventListener("notifications:updated", onNotificationsUpdated);
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
        {
            key: "events",
            path: "/events",
            icon: Calendar,
            label: t("nav.mobile_events"),
            ariaLabel: t("nav.events"),
        },
        {
            key: "articles",
            path: "/articles",
            icon: Trees,
            label: t("nav.mobile_community"),
            ariaLabel: t("nav.community"),
        },
        {
            key: "hackathon",
            path: "/hackathon",
            icon: Sparkles,
            label: t("nav.mobile_hackathon"),
            ariaLabel: t("nav.hackathon"),
        },
        {
            key: "me",
            path: profilePath,
            icon: UserCircle,
            label: t("nav.mobile_me"),
            ariaLabel: t("nav.profile"),
        },
    ];

    const isItemActive = (path, key) => {
        if (key === "me") {
            return location.pathname.startsWith("/user/");
        }
        if (key === "hackathon") {
            return (
                location.pathname.startsWith("/hackathon") ||
                location.pathname.startsWith("/projects") ||
                location.pathname.startsWith("/media")
            );
        }
        if (key === "articles") {
            return location.pathname.startsWith("/articles");
        }
        return location.pathname === path;
    };

    return (
        <motion.nav
            variants={tabbarEntrance}
            initial={prefersReducedMotion ? false : "initial"}
            animate={prefersReducedMotion ? undefined : "animate"}
            className={`motion-gpu fixed inset-x-0 bottom-0 z-[80] border-t md:hidden ${isDayMode ? "border-slate-900/[0.08] bg-white shadow-[0_-10px_24px_rgba(31,45,61,0.045)]" : "border-white/[0.075] bg-[#07101b] shadow-[0_-14px_30px_rgba(0,0,0,0.32)]"}`}
            aria-label={t("nav.mobile_tabbar")}
        >
            <div className="pb-[env(safe-area-inset-bottom)]">
                <div className="grid h-[72px] grid-cols-4 px-1.5">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = isItemActive(item.path, item.key);

                        const sharedClassName = `relative flex min-w-0 flex-col items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isActive ? (isDayMode ? "text-slate-900" : "text-indigo-300") : isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-400 hover:text-white"}`;
                        const activeIconSurface = isDayMode
                            ? "rounded-[5px] bg-white ring-1 ring-slate-900/[0.12] shadow-[0_6px_14px_rgba(31,45,61,0.06)]"
                            : "rounded-[8px] bg-indigo-500/18 ring-1 ring-indigo-400/20 shadow-[0_0_22px_rgba(99,102,241,0.22)]";
                        const iconClassName = `relative p-1.5 transition-colors duration-300 ${
                            isActive
                                ? isDayMode
                                    ? "text-teal-700"
                                    : "text-indigo-300"
                                : isDayMode
                                  ? "text-slate-500"
                                  : "text-gray-400"
                        }`;

                        const showUnreadBadge = item.key === "me" && user && unreadCount > 0;
                        const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

                        const inner = (
                            <motion.div
                                whileTap={prefersReducedMotion ? undefined : tapPress}
                                className="flex min-w-0 flex-col items-center gap-1.5"
                            >
                                <div className={iconClassName}>
                                    {isActive && (
                                        <span className={`absolute inset-0 ${activeIconSurface}`} />
                                    )}
                                    <Icon
                                        className="relative z-10"
                                        size={24}
                                        strokeWidth={isActive ? 2.35 : 2}
                                    />
                                    {showUnreadBadge && (
                                        <span
                                            aria-label={t(
                                                "nav.unread_count",
                                                "{{count}} 条未读通知",
                                                { count: unreadCount }
                                            )}
                                            className={`absolute -top-0.5 -right-1 min-w-[18px] h-[18px] px-1 rounded-md bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 shadow-sm ${isDayMode ? "ring-white" : "ring-[#101722]"}`}
                                        >
                                            {badgeLabel}
                                        </span>
                                    )}
                                </div>
                                <span
                                    className={`max-w-full truncate px-0.5 text-[12px] leading-none transition-all ${isActive ? "font-semibold opacity-100" : "font-medium opacity-85"}`}
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
                                    aria-label={item.ariaLabel}
                                    aria-current={isActive ? "page" : undefined}
                                    onClick={() =>
                                        window.dispatchEvent(new Event("open-auth-modal"))
                                    }
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
                                aria-label={item.ariaLabel}
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
