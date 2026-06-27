import React, { useState, useEffect, useRef, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Trash2, X, CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useReducedMotion } from "../utils/animations";

const NOTIFICATIONS_UPDATED_EVENT = "notifications:updated";

const isNotificationRead = (notification) => Boolean(notification?.is_read);

// news has no standalone route; it is embedded under /articles via ?news={id}.
// Use a builder per type instead of a flat base map so each URL can be shaped
// independently.
const NEW_CONTENT_ROUTE_BUILDERS = {
  article: (id) => `/articles?postTab=tech&id=${id}`,
  photo: (id) => `/gallery?id=${id}`,
  music: (id) => `/articles?music=${id}#community-podcast`,
  video: (id) => `/videos?id=${id}`,
  event: (id) => `/events?id=${id}`,
  news: (id) => `/articles?postTab=news&news=${id}`,
  project: (id) => `/projects?id=${id}`,
};

const buildNotificationTargetPath = (notification) => {
  const resourceId = notification?.related_resource_id;
  const rawType = String(notification?.related_resource_type || "").trim();
  const resourceType = rawType.toLowerCase();
  const notificationType = String(notification?.type || "").trim();

  // new_content notifications use a fixed whitelist of resource types.
  // Unknown types warn and return null (no navigation) per spec.
  if (notificationType === "new_content") {
    if (!resourceId || !resourceType) {
      console.warn(
        "[Notification] Unknown resource type:",
        resourceType,
        "id:",
        resourceId,
      );
      return null;
    }
    const build = NEW_CONTENT_ROUTE_BUILDERS[resourceType];
    if (!build) {
      console.warn("[Notification] Unknown resource type:", resourceType);
      return null;
    }
    return build(resourceId);
  }

  if (!resourceId || !resourceType) return null;

  if (resourceType === "user") {
    return `/user/${resourceId}`;
  }

  if (resourceType.startsWith("community_post:")) {
    const [, section = "help"] = resourceType.split(":");
    return `/articles?postTab=${encodeURIComponent(section)}&post=${resourceId}`;
  }

  const routeMap = {
    photo: "/gallery",
    photos: "/gallery",
    music: "/articles",
    video: "/videos",
    videos: "/videos",
    article: "/articles",
    articles: "/articles",
    event: "/events",
    events: "/events",
    project: "/projects",
  };

  const basePath = routeMap[resourceType];
  if (!basePath) return null;
  if (resourceType === "music") {
    return `${basePath}?music=${resourceId}#community-podcast`;
  }
  return `${basePath}?id=${resourceId}`;
};

const emitNotificationsUpdated = (unreadCount) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, {
      detail: { unreadCount },
    }),
  );
};

const NotificationCenter = ({
  embedded = false,
  onUnreadCountChange = null,
  limit = 20,
  className = "",
  enabled = true,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { uiMode } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const panelId = useId();
  const panelTitleId = useId();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const isDayMode = uiMode === "day";

  const fetchNotifications = useCallback(async () => {
    if (!enabled || !user) {
      setNotifications([]);
      setUnreadCount(0);
      setHasFetched(false);
      return;
    }

    setIsFetching(true);
    try {
      const res = await api.get(`/notifications?limit=${limit}`);
      setNotifications(Array.isArray(res.data?.data) ? res.data.data : []);
      setUnreadCount(Number(res.data?.unreadCount || 0));
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch notifications", error);
      }
    } finally {
      setIsFetching(false);
      setHasFetched(true);
    }
  }, [enabled, limit, user]);

  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setUnreadCount(0);
      setIsFetching(false);
      setHasFetched(false);
      return undefined;
    }

    fetchNotifications();
    if (!user) return undefined;

    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [enabled, fetchNotifications, user]);

  useEffect(() => {
    if (!enabled) return undefined;

    if (typeof onUnreadCountChange === "function") {
      onUnreadCountChange(unreadCount);
    }
  }, [enabled, onUnreadCountChange, unreadCount]);

  useEffect(() => {
    if (!enabled || !user || typeof window === "undefined") return undefined;

    const handleNotificationsUpdated = () => {
      fetchNotifications();
    };

    window.addEventListener(
      NOTIFICATIONS_UPDATED_EVENT,
      handleNotificationsUpdated,
    );
    return () =>
      window.removeEventListener(
        NOTIFICATIONS_UPDATED_EVENT,
        handleNotificationsUpdated,
      );
  }, [enabled, fetchNotifications, user]);

  useEffect(() => {
    if (!enabled || embedded || !isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [embedded, enabled, isOpen]);

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();

    const target = notifications.find((item) => item.id === id);
    if (!target || isNotificationRead(target)) return;

    try {
      await api.put(`/notifications/${id}/read`);
      const nextUnreadCount = Math.max(0, unreadCount - 1);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_read: true } : item,
        ),
      );
      setUnreadCount(nextUnreadCount);
      emitNotificationsUpdated(nextUnreadCount);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to mark as read", error);
      }
      toast.error(t("notifications.mark_read_failed", "标记已读失败"));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/all/read");
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true })),
      );
      setUnreadCount(0);
      emitNotificationsUpdated(0);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to mark all as read", error);
      }
      toast.error(
        t("notifications.mark_all_read_failed", "全部标记已读失败"),
      );
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();

    const target = notifications.find((item) => item.id === id);

    try {
      await api.delete(`/notifications/${id}`);
      const nextUnreadCount =
        target && !isNotificationRead(target)
          ? Math.max(0, unreadCount - 1)
          : unreadCount;
      setNotifications((prev) => prev.filter((item) => item.id !== id));
      setUnreadCount(nextUnreadCount);
      emitNotificationsUpdated(nextUnreadCount);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to delete notification", error);
      }
      toast.error(t("notifications.delete_failed", "删除失败"));
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete("/notifications/all");
      setNotifications([]);
      setUnreadCount(0);
      emitNotificationsUpdated(0);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to clear all notifications", error);
      }
      toast.error(t("notifications.clear_all_failed", "清空失败"));
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!isNotificationRead(notification)) {
      await handleMarkAsRead(notification.id);
    }

    const targetPath = buildNotificationTargetPath(notification);
    if (targetPath) {
      navigate(targetPath);
    }

    if (!embedded) {
      setIsOpen(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString(i18n.language, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!enabled || !user) return null;

  const unreadLabel = t("notifications.unread_count", "{{count}} 条未读", {
    count: unreadCount,
  });
  const openLabel =
    unreadCount > 0
      ? t(
          "notifications.open_with_unread",
          "打开通知中心，{{count}} 条未读",
          { count: unreadCount },
        )
      : t("notifications.open", "打开通知中心");
  const loadingLabel = t("notifications.loading", "正在加载通知...");
  const itemOpenLabel = t("notifications.open_item", "打开通知");

  const panel = (
    <div
      id={panelId}
      role={embedded ? "region" : "dialog"}
      aria-labelledby={panelTitleId}
      aria-busy={isFetching}
      className={`overflow-hidden border shadow-2xl ${
        embedded
          ? `rounded-3xl ${isDayMode ? "bg-white/96 border-slate-200/80 shadow-[0_26px_60px_rgba(148,163,184,0.16)]" : "bg-[#0a0a0a]/90 border-white/10"}`
          : `absolute right-0 mt-2 w-[min(22rem,calc(100vw-1.5rem))] md:w-96 origin-top-right rounded-2xl backdrop-blur-3xl ${isDayMode ? "bg-white/96 border-slate-200/80 shadow-[0_22px_52px_rgba(148,163,184,0.2)]" : "bg-[#0a0a0a]/90 border-white/10"}`
      } ${className}`}
    >
      <div
        className={`flex items-center justify-between p-4 border-b ${
          isDayMode
            ? "border-slate-200/80 bg-slate-50/90"
            : "border-white/10 bg-white/5"
        }`}
      >
        <div>
          <h3
            id={panelTitleId}
            className={`font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}
          >
            {t("notifications.title", "通知中心")}
          </h3>
          <p
            aria-live="polite"
            className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
          >
            {unreadLabel}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              aria-label={t("notifications.mark_all_read", "全部已读")}
              className="rounded-lg p-1 text-xs text-indigo-400 transition-colors hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-40"
              title={t("notifications.mark_all_read", "全部已读")}
            >
              <CheckCheck size={16} aria-hidden="true" focusable="false" />
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              aria-label={t("notifications.clear_all", "清空通知")}
              className="rounded-lg p-1 text-xs text-red-400 transition-colors hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400/60"
              title={t("notifications.clear_all", "清空通知")}
            >
              <Trash2 size={16} aria-hidden="true" focusable="false" />
            </button>
          </div>
        )}
      </div>

      <div
        className={`${embedded ? "max-h-[560px]" : "max-h-[400px]"} overflow-y-auto custom-scrollbar`}
      >
        {isFetching && !hasFetched ? (
          <div
            role="status"
            aria-live="polite"
            className={`p-8 text-center text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
          >
            {loadingLabel}
          </div>
        ) : notifications.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            className={`p-8 text-center flex flex-col items-center ${
              isDayMode ? "text-slate-500" : "text-gray-500"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                isDayMode ? "bg-slate-100" : "bg-white/5"
              }`}
            >
              <Bell size={24} className="opacity-50" aria-hidden="true" focusable="false" />
            </div>
            <p>{t("notifications.no_notifications", "暂无通知")}</p>
          </div>
        ) : (
          <div
            role="list"
            className={`divide-y ${isDayMode ? "divide-slate-200/70" : "divide-white/5"}`}
          >
            {notifications.map((notification) => {
              const unread = !isNotificationRead(notification);
              return (
                <div
                  key={notification.id}
                  role="listitem"
                  className={`flex transition-colors group ${
                    unread ? "bg-indigo-500/5" : "opacity-70"
                  } ${isDayMode ? "hover:bg-slate-50" : "hover:bg-white/5"}`}
                >
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    aria-label={`${itemOpenLabel}: ${notification.content || ""} ${
                      unread
                        ? t("notifications.unread", "未读")
                        : t("notifications.read", "已读")
                    }`}
                    className="flex min-w-0 flex-1 gap-3 p-4 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-400/60"
                  >
                    <div
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        unread ? "bg-indigo-500" : "bg-transparent"
                      }`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-relaxed ${
                          isDayMode ? "text-slate-700" : "text-gray-200"
                        }`}
                      >
                        {notification.content}
                      </p>
                      <p
                        className={`text-[10px] mt-1.5 font-mono ${
                          isDayMode ? "text-slate-500" : "text-gray-500"
                        }`}
                      >
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </button>
                  <div className="flex flex-col gap-1 shrink-0 py-3 pr-3">
                    {unread && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        aria-label={t("notifications.mark_read", "标记已读")}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDayMode
                            ? "hover:bg-indigo-50 text-slate-400 hover:text-indigo-500"
                            : "hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-300"
                        } focus:outline-none focus:ring-2 focus:ring-indigo-400/60`}
                        title={t("notifications.mark_read", "标记已读")}
                      >
                        <Check size={14} aria-hidden="true" focusable="false" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(notification.id, e)}
                      aria-label={t("notifications.delete", "删除通知")}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDayMode
                          ? "hover:bg-red-50 text-slate-400 hover:text-red-500"
                          : "hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                      } focus:outline-none focus:ring-2 focus:ring-red-400/60`}
                      title={t("common.delete", "删除")}
                    >
                      <X size={14} aria-hidden="true" focusable="false" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return panel;
  }

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={openLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        className={`relative p-2 transition-colors rounded-full ${
          isDayMode
            ? "text-slate-500 hover:text-slate-900 hover:bg-white/90"
            : "text-gray-300 hover:text-white hover:bg-white/10"
        }`}
      >
        <motion.div
          animate={unreadCount > 0 && !reduceMotion ? { rotate: [0, -15, 15, -15, 15, 0] } : {}}
          transition={{ repeat: reduceMotion ? 0 : Infinity, repeatDelay: 5, duration: 1 }}
        >
          <Bell size={20} aria-hidden="true" focusable="false" />
        </motion.div>
        {unreadCount > 0 && (
          <span
            className={`absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ${
              isDayMode ? "ring-white" : "ring-black"
            }`}
            aria-hidden="true"
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.95 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            {panel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
