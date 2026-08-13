import React, { useState, useMemo, useEffect, useCallback, memo, useRef } from "react";
import { useMobileSortLabel } from "../hooks/useContentPage";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar,
    MapPin,
    ArrowLeft,
    LayoutGrid,
    List,
    X,
    Upload,
    Clock,
    CheckCircle,
    ExternalLink,
    Download,
    FileText,
    AlertCircle,
    Share2,
    Copy,
    Award,
    Users,
    Building2,
    Tag,
    Plus,
    Sparkles,
    Search,
    ChevronDown,
    ChevronRight,
    Menu,
    SlidersHorizontal,
} from "lucide-react";
import UploadModal from "./UploadModal";
import FavoriteButton from "./FavoriteButton";
import { useTranslation } from "react-i18next";
import Pagination from "./Pagination";
import { useSettings } from "../context/SettingsContext";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import SmartImage from "./SmartImage";
import { useBackClose, useBodyScrollLock } from "../hooks/useBackClose";
import { useCachedResource } from "../hooks/useCachedResource";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import { useHorizontalDragScroll } from "../hooks/useHorizontalDragScroll";
import EventFilterPanel from "./EventFilterPanel";
import OrganizationPartnerWall from "./OrganizationPartnerWall";
import SortSelector from "./SortSelector";
import EventAssistantPanel from "./EventAssistantPanel";
import MobileEventAssistantFullscreen from "./MobileEventAssistantFullscreen";
import DOMPurify from "dompurify";
import SEO from "./SEO";
import OfficialVerificationBadge from "./OfficialVerificationBadge";
import {
    COLLEGE_NOTICE_CATEGORY_VALUE,
    EVENT_CATEGORIES,
    COLLEGE_NOTICE_TAG,
    getCollegeNoticeTypeLabel,
    getEventAudienceLabel,
    getEventCategoryLabel,
    inferEventSourceCollege,
} from "../data/eventTaxonomy";

import { Link as RouterLink, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { getThumbnailUrl } from "../utils/imageUtils";
import { useReducedMotion } from "../utils/animations";
import { getOrCreateSiteVisitorKey } from "../utils/visitorKey";
import { isMiniProgramWebView } from "../utils/miniProgramEnv";
import { shareViaNativeMiniProgram, shareViaMiniProgram } from "../utils/wechatMiniProgramBridge";

const EVENT_CARD_GRID_CLASS =
    "grid grid-cols-1 items-start gap-y-0 md:grid-cols-2 md:gap-x-6 md:gap-y-12 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-7 xl:gap-y-14";
const EVENT_CONTENT_WIDTH_CLASS = "mx-auto w-full max-w-[84rem]";
const EVENT_FILTER_WIDTH_CLASS = "mx-auto w-full max-w-[84rem]";
const MOBILE_EVENT_CATEGORY_ICONS = {
    all: LayoutGrid,
    [COLLEGE_NOTICE_CATEGORY_VALUE]: FileText,
    lecture: Calendar,
    competition: Award,
    volunteer: Users,
    recruitment: Building2,
    culture_sports: Sparkles,
    exchange: Users,
    other: Tag,
};

const getEventTags = (event = {}) =>
    String(event.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

const buildEventShareData = (event) => {
    if (!event || typeof window === "undefined") return null;
    const shareUrl = new URL("/events", window.location.origin);
    shareUrl.searchParams.set("id", String(event.id));
    return {
        title: event.title,
        text: `${event.title}\n${event.date}\n${event.location}\n\n${event.description}`,
        url: shareUrl.toString(),
        path: `/events?id=${encodeURIComponent(String(event.id))}`,
        imageUrl: getEventCoverUrl(event),
    };
};

const isCollegeNoticeEvent = (event = {}) =>
    Boolean(Number(event.is_college_notice)) || getEventTags(event).includes(COLLEGE_NOTICE_TAG);

const getCollegeNoticeSource = (event = {}) => {
    const sourceCollege = String(event.source_college || "").trim();
    if (sourceCollege) return sourceCollege;
    const inferred = inferEventSourceCollege(event);
    if (inferred) return inferred;
    const organizer = String(event.organizer || "").trim();
    if (organizer) return organizer;
    const audience = String(event.target_audience || "").trim();
    if (audience) return audience;
    return "";
};

const organizerProfileFromEvent = (event = {}) => ({
    type: event.organizer_profile_type,
    verified:
        event.organizer_profile_verified === true || Number(event.organizer_profile_verified) === 1,
    status: event.organizer_profile_status,
});

const getEventLifecycle = (date, endDate, t) => {
    if (!date) return t("events.status.unknown");
    try {
        const now = new Date();
        // For YYYY-MM-DD (no time), treat as local midnight by replacing - with /
        const startDate = new Date(date.includes("T") ? date : date.replace(/-/g, "/"));

        if (endDate) {
            // For YYYY-MM-DD (no time), treat as end of that day (23:59:59)
            let end;
            if (endDate.includes("T")) {
                end = new Date(endDate);
            } else {
                end = new Date(endDate.replace(/-/g, "/"));
                end.setHours(23, 59, 59, 999);
            }

            if (now < startDate) return t("events.status.upcoming");
            if (now >= startDate && now <= end) return t("events.status.ongoing");
            return t("events.status.past");
        }

        // Fallback: only start date — treat as ongoing for the full start day
        if (now < startDate) return t("events.status.upcoming");
        const startDayEnd = new Date(startDate);
        startDayEnd.setHours(23, 59, 59, 999);
        if (now <= startDayEnd) return t("events.status.ongoing");
        return t("events.status.past");
    } catch (e) {
        return t("events.status.unknown");
    }
};

const getStatusColor = (status, t, isDayMode = false) => {
    if (isDayMode) {
        switch (status) {
            case t("events.status.upcoming"):
                return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
            case t("events.status.ongoing"):
                return "bg-sky-50 text-sky-700 border-sky-200/80 animate-pulse";
            case t("events.status.past"):
                return "bg-white text-slate-500 border-slate-200/80";
            default:
                return "bg-white text-slate-600 border-slate-200/80";
        }
    }

    switch (status) {
        case t("events.status.upcoming"):
            return "bg-emerald-500 text-white border-white/10";
        case t("events.status.ongoing"):
            return "bg-blue-500 text-white border-white/10 animate-pulse";
        case t("events.status.past"):
            return "bg-gray-500 text-gray-200 border-white/10";
        default:
            return "bg-gray-500 text-white border-white/10";
    }
};

const getStatusTextColor = (status, t, isDayMode = false) => {
    if (status === t("events.status.upcoming")) {
        return isDayMode ? "text-emerald-700" : "text-emerald-300";
    }
    if (status === t("events.status.ongoing")) {
        return isDayMode ? "text-blue-700" : "text-cyan-200";
    }
    return isDayMode ? "text-slate-500" : "text-slate-400";
};

const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    // Compare only the date portion (first 10 chars: YYYY-MM-DD) to avoid timezone issues
    return d1.substring(0, 10) === d2.substring(0, 10);
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return "";
    // Extract date parts from string directly to avoid timezone issues
    // Supports: YYYY-MM-DD, YYYY-MM-DDTHH:MM, YYYY-MM-DDTHH:MM:SS
    const datePart = dateStr.substring(0, 10); // YYYY-MM-DD
    const parts = datePart.split("-");
    if (parts.length < 3) return dateStr;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(month) || isNaN(day)) return dateStr;

    // Check if time part exists (format: YYYY-MM-DDTHH:MM)
    if (dateStr.length > 10 && dateStr[10] === "T") {
        const timePart = dateStr.substring(11, 16); // HH:MM
        if (timePart && timePart !== "00:00") {
            return `${month}.${day} ${timePart}`;
        }
    }
    return `${month}.${day}`;
};

const formatMobileEventSchedule = (dateStr, endDateStr, language = "zh") => {
    if (!dateStr) return "";
    const datePart = dateStr.substring(0, 10);
    const [year, monthText, dayText] = datePart.split("-");
    const month = parseInt(monthText, 10);
    const day = parseInt(dayText, 10);
    if (!year || Number.isNaN(month) || Number.isNaN(day)) return formatDateTime(dateStr);

    let weekday = "";
    const isEnglish = String(language).toLowerCase().startsWith("en");
    try {
        const date = new Date(datePart.replace(/-/g, "/"));
        weekday = isEnglish
            ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()] || ""
            : ["日", "一", "二", "三", "四", "五", "六"][date.getDay()] || "";
    } catch {
        weekday = "";
    }

    const rawStartTime = dateStr.length > 10 ? dateStr.substring(11, 16) : "";
    const rawEndTime =
        endDateStr && isSameDay(dateStr, endDateStr) && endDateStr.length > 10
            ? endDateStr.substring(11, 16)
            : "";
    const startTime = rawStartTime === "00:00" ? "" : rawStartTime;
    const endTime = rawEndTime === "00:00" ? "" : rawEndTime;
    const timeRange = startTime ? (endTime ? `${startTime}–${endTime}` : startTime) : "";
    const weekdayLabel = weekday ? (isEnglish ? ` · ${weekday}` : `（周${weekday}）`) : "";

    return `${month}.${day}${weekdayLabel}${timeRange ? `  ${timeRange}` : ""}`;
};

const EVENT_FALLBACK_COVER_URLS = {
    [COLLEGE_NOTICE_CATEGORY_VALUE]:
        "https://images.pexels.com/photos/207692/pexels-photo-207692.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    lecture:
        "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    competition:
        "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    volunteer:
        "https://images.pexels.com/photos/6646918/pexels-photo-6646918.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    recruitment:
        "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    culture_sports:
        "https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    exchange:
        "https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
    other: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=900&h=900&fit=crop",
};

const getEventFallbackCoverKey = (event = {}) => {
    const category = String(event.category || "").trim();
    if (isCollegeNoticeEvent(event) || category === COLLEGE_NOTICE_CATEGORY_VALUE) {
        return COLLEGE_NOTICE_CATEGORY_VALUE;
    }
    if (EVENT_FALLBACK_COVER_URLS[category]) return category;

    const text = `${event.title || ""} ${event.description || ""} ${event.tags || ""} ${event.organizer || ""}`;
    if (/志愿|公益|助老|服务|volunteer/i.test(text)) return "volunteer";
    if (/竞赛|比赛|挑战|competition|contest|hackathon/i.test(text)) {
        return "competition";
    }
    if (/招新|招募|招聘|recruit/i.test(text)) return "recruitment";
    if (/文体|运动|体育|音乐|艺术|culture|sport|music|art/i.test(text)) {
        return "culture_sports";
    }
    if (/交流|校友|国际|exchange|forum|meetup/i.test(text)) return "exchange";
    if (/讲座|报告|分享|AI|人工智能|lecture|talk|workshop/i.test(text)) {
        return "lecture";
    }
    return "other";
};

const getEventCoverUrl = (event = {}) => {
    const uploadedCover = getThumbnailUrl(event.image);
    if (uploadedCover) return uploadedCover;
    return (
        EVENT_FALLBACK_COVER_URLS[getEventFallbackCoverKey(event)] ||
        EVENT_FALLBACK_COVER_URLS.other
    );
};

const VIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

const EVENT_THEME_VARIANTS = {
    cyan: {
        backdropGlow: "",
        heroGlow: "bg-sky-50",
        softGlow: "bg-blue-50",
        accentText: "text-blue-700",
        dot: "bg-sky-500",
        surface: "bg-white border border-blue-100/80",
        cta: "bg-blue-700 text-white hover:bg-blue-800 hover:-translate-y-0.5 border border-blue-700",
        highlightCard: "border-blue-100/90 bg-white",
        iconShell: "bg-white border-blue-200/80 text-blue-600",
        tagHover: "hover:border-blue-200/80 hover:text-blue-700",
    },
    pink: {
        backdropGlow: "",
        heroGlow: "bg-slate-50",
        softGlow: "bg-blue-50",
        accentText: "text-blue-700",
        dot: "bg-blue-500",
        surface: "bg-white border border-slate-200/80",
        cta: "bg-blue-700 text-white hover:bg-blue-800 hover:-translate-y-0.5 border border-blue-700",
        highlightCard: "border-slate-200/80 bg-white",
        iconShell: "bg-white border-slate-200/80 text-blue-700",
        tagHover: "hover:border-slate-300 hover:text-slate-900",
    },
    orange: {
        backdropGlow: "",
        heroGlow: "bg-slate-50",
        softGlow: "bg-amber-50",
        accentText: "text-amber-700",
        dot: "bg-amber-500",
        surface: "bg-white border border-slate-200/80",
        cta: "bg-blue-700 text-white hover:bg-blue-800 hover:-translate-y-0.5 border border-blue-700",
        highlightCard: "border-slate-200/80 bg-white",
        iconShell: "bg-white border-slate-200/80 text-amber-700",
        tagHover: "hover:border-slate-300 hover:text-slate-900",
    },
    green: {
        backdropGlow: "",
        heroGlow: "bg-slate-50",
        softGlow: "bg-emerald-50",
        accentText: "text-emerald-600",
        dot: "bg-emerald-400",
        surface: "bg-white border border-slate-200/80",
        cta: "bg-blue-700 text-white hover:bg-blue-800 hover:-translate-y-0.5 border border-blue-700",
        highlightCard: "border-slate-200/80 bg-white",
        iconShell: "bg-white border-slate-200/80 text-emerald-600",
        tagHover: "hover:border-slate-300 hover:text-slate-900",
    },
    blue: {
        backdropGlow: "",
        heroGlow: "bg-slate-50",
        softGlow: "bg-blue-50",
        accentText: "text-blue-700",
        dot: "bg-blue-500",
        surface: "bg-white border border-slate-200/80",
        cta: "bg-blue-700 text-white hover:bg-blue-800 hover:-translate-y-0.5 border border-blue-700",
        highlightCard: "border-slate-200/80 bg-white",
        iconShell: "bg-white border-slate-200/80 text-blue-700",
        tagHover: "hover:border-slate-300 hover:text-slate-900",
    },
    rose: {
        backdropGlow: "",
        heroGlow: "bg-slate-50",
        softGlow: "bg-blue-50",
        accentText: "text-rose-600",
        dot: "bg-rose-400",
        surface: "bg-white border border-slate-200/80",
        cta: "bg-blue-700 text-white hover:bg-blue-800 hover:-translate-y-0.5 border border-blue-700",
        highlightCard: "border-slate-200/80 bg-white",
        iconShell: "bg-white border-slate-200/80 text-rose-600",
        tagHover: "hover:border-slate-300 hover:text-slate-900",
    },
};

const EventCard = memo(({ event, index, onClick, reduceMotion, isDayMode }) => {
    const { t, i18n } = useTranslation();

    const status = getEventLifecycle(event.date, event.end_date, t);
    const eventLanguage = i18n.resolvedLanguage || i18n.language || "zh";
    const formatEventCategory = (value) => getEventCategoryLabel(value, eventLanguage);
    const formatEventAudience = (value) => getEventAudienceLabel(value, eventLanguage);
    const motionProps = reduceMotion
        ? {}
        : {
              initial: { opacity: 0, y: 18 },
              animate: {
                  opacity: 1,
                  y: 0,
                  transition: {
                      duration: 0.32,
                      ease: [0.22, 1, 0.36, 1],
                      delay: Math.min(index, 6) * 0.04,
                  },
              },
              whileHover: {
                  y: -2,
                  transition: {
                      duration: 0.16,
                      ease: [0.22, 1, 0.36, 1],
                  },
              },
              whileTap: {
                  scale: 0.985,
                  transition: {
                      duration: 0.12,
                      ease: [0.22, 1, 0.36, 1],
                  },
              },
          };

    return (
        <motion.article
            {...motionProps}
            role="button"
            tabIndex={0}
            data-testid="event-card"
            onClick={() => onClick(event)}
            onKeyDown={(eventKey) => {
                if (eventKey.key === "Enter" || eventKey.key === " ") {
                    eventKey.preventDefault();
                    onClick(event);
                }
            }}
            className={`group hidden cursor-pointer border-b pb-6 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/70 md:block ${
                isDayMode
                    ? "border-slate-200/80 hover:border-blue-400/70"
                    : "events-card-surface border-white/[0.08] hover:border-indigo-300/55"
            }`}
        >
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-slate-900">
                <SmartImage
                    src={getThumbnailUrl(event.image)}
                    alt={event.title}
                    loading="lazy"
                    priority={index === 0}
                    className="absolute inset-0 h-full w-full"
                    imageClassName="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                />
                {!isDayMode && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/35 via-transparent to-transparent" />
                )}
            </div>

            <div className="pt-4">
                <div className="flex min-w-0 items-center justify-between gap-3 text-[11px] font-bold tracking-wide">
                    <span className={`truncate ${isDayMode ? "text-blue-700" : "text-indigo-200"}`}>
                        {event.category
                            ? formatEventCategory(event.category)
                            : t("common.other", "其他")}
                    </span>
                    <span
                        className={`inline-flex shrink-0 items-center gap-1.5 ${getStatusTextColor(status, t, isDayMode)}`}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                        {status}
                    </span>
                </div>

                <h3
                    className={`mt-2 line-clamp-2 min-h-[3.25rem] text-[1.08rem] font-bold leading-[1.5] tracking-[-0.015em] ${isDayMode ? "text-slate-950" : "text-white"}`}
                >
                    {event.title}
                </h3>

                <div
                    className={`mt-3 grid gap-1.5 text-sm leading-6 ${isDayMode ? "text-slate-500" : "text-slate-300"}`}
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <Calendar
                            size={14}
                            className={
                                isDayMode ? "shrink-0 text-blue-600" : "shrink-0 text-indigo-300"
                            }
                        />
                        <span
                            className={`truncate font-medium ${isDayMode ? "text-slate-700" : "text-slate-200"}`}
                        >
                            {formatDateTime(event.date)}
                            {event.end_date &&
                                !isSameDay(event.date, event.end_date) &&
                                ` – ${formatDateTime(event.end_date)}`}
                        </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                        <MapPin size={14} className="shrink-0" />
                        <span className="truncate">
                            {event.location || t("common.online", "线上")}
                        </span>
                    </div>
                </div>

                {(event.score || event.volunteer_time) && (
                    <div
                        className={`mt-3 flex min-w-0 items-center gap-3 text-xs font-semibold ${isDayMode ? "text-amber-700" : "text-amber-200"}`}
                    >
                        {event.score && (
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Award size={13} className="shrink-0" />
                                <span className="truncate">{event.score}</span>
                            </span>
                        )}
                        {event.volunteer_time && (
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Clock size={13} className="shrink-0" />
                                <span className="truncate">{event.volunteer_time}</span>
                            </span>
                        )}
                    </div>
                )}

                {(isCollegeNoticeEvent(event) || event.target_audience) && (
                    <div
                        className={`mt-4 flex min-w-0 items-center gap-2 text-[11px] ${isDayMode ? "text-slate-500" : "text-slate-400"}`}
                    >
                        {isCollegeNoticeEvent(event) && (
                            <span className="inline-flex shrink-0 items-center gap-1">
                                <FileText size={11} />
                                {t("events.college_notice.badge")}
                            </span>
                        )}
                        {isCollegeNoticeEvent(event) && event.target_audience && (
                            <span aria-hidden="true">·</span>
                        )}
                        {event.target_audience && (
                            <span className="truncate">
                                {formatEventAudience(event.target_audience)}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </motion.article>
    );
});
EventCard.displayName = "EventCard";

const MobileReferenceEventCard = memo(({ event, index, onClick, reduceMotion, isDayMode }) => {
    const { t, i18n } = useTranslation();
    const status = getEventLifecycle(event.date, event.end_date, t);
    const eventLanguage = i18n.resolvedLanguage || i18n.language || "zh";
    const formatEventCategory = (value) => getEventCategoryLabel(value, eventLanguage);
    const formatEventAudience = (value) => getEventAudienceLabel(value, eventLanguage);
    const motionProps = reduceMotion
        ? {}
        : {
              initial: { opacity: 0, y: 16 },
              animate: {
                  opacity: 1,
                  y: 0,
                  transition: {
                      duration: 0.28,
                      ease: [0.22, 1, 0.36, 1],
                      delay: Math.min(index, 5) * 0.04,
                  },
              },
              whileTap: { scale: 0.992 },
          };

    return (
        <motion.article
            {...motionProps}
            data-testid="event-card"
            onClick={() => onClick(event)}
            className={`group relative grid min-h-[132px] cursor-pointer grid-cols-[106px_minmax(0,1fr)] gap-4 border-b py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
                isDayMode ? "border-slate-200/80 text-slate-950" : "events-card-surface border-white/[0.08] text-white"
            }`}
        >
            <div className="relative h-[106px] overflow-hidden rounded-[2px] bg-slate-900 min-[390px]:h-[110px]">
                <SmartImage
                    src={getEventCoverUrl(event)}
                    alt={event.title}
                    type="event"
                    iconSize={18}
                    loading="lazy"
                    priority={index === 0}
                    className="absolute inset-0 h-full w-full"
                    imageClassName="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            </div>

            <div className="relative flex min-w-0 flex-col py-0.5">
                <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold tracking-wide">
                    <span className={`truncate ${isDayMode ? "text-blue-700" : "text-indigo-200"}`}>
                        {event.category
                            ? formatEventCategory(event.category)
                            : t("common.other", "其他")}
                    </span>
                    <span
                        aria-hidden="true"
                        className={isDayMode ? "text-slate-300" : "text-white/20"}
                    >
                        ·
                    </span>
                    <span
                        className={`inline-flex shrink-0 items-center gap-1 ${getStatusTextColor(status, t, isDayMode)}`}
                    >
                        <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
                        {status}
                    </span>
                </div>

                <h3
                    className={`mt-1.5 line-clamp-2 text-[16px] font-bold leading-[22px] tracking-[-0.01em] ${isDayMode ? "text-slate-950" : "text-white"}`}
                >
                    {event.title}
                </h3>

                <div
                    className={`mt-2 grid gap-1 text-[13px] font-medium leading-[18px] ${isDayMode ? "text-slate-600" : "text-slate-200"}`}
                >
                    <div className="flex min-w-0 items-center gap-1.5">
                        <Clock
                            size={13}
                            className={
                                isDayMode ? "shrink-0 text-blue-600" : "shrink-0 text-indigo-300"
                            }
                        />
                        <span className="truncate">
                            {formatMobileEventSchedule(event.date, event.end_date, eventLanguage)}
                        </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                        <MapPin size={13} className="shrink-0" />
                        <span className="truncate">
                            {event.location || t("common.online", "线上")}
                        </span>
                    </div>
                </div>

                {event.target_audience && (
                    <div
                        className={`mt-auto truncate pt-2 text-[10px] ${isDayMode ? "text-slate-500" : "text-slate-400"}`}
                    >
                        {formatEventAudience(event.target_audience)}
                    </div>
                )}
            </div>
        </motion.article>
    );
});
MobileReferenceEventCard.displayName = "MobileReferenceEventCard";

const EventListRow = memo(({ event, index, onClick, reduceMotion, isDayMode }) => {
    const { t, i18n } = useTranslation();
    const status = getEventLifecycle(event.date, event.end_date, t);
    const eventLanguage = i18n.resolvedLanguage || i18n.language || "zh";
    const formatEventCategory = (value) => getEventCategoryLabel(value, eventLanguage);
    const formatEventAudience = (value) => getEventAudienceLabel(value, eventLanguage);
    const motionProps = reduceMotion
        ? {}
        : {
              initial: { opacity: 0, y: 10 },
              animate: {
                  opacity: 1,
                  y: 0,
                  transition: {
                      duration: 0.24,
                      ease: [0.22, 1, 0.36, 1],
                      delay: Math.min(index, 8) * 0.025,
                  },
              },
              whileHover: {
                  y: -1,
                  transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
              },
          };

    return (
        <motion.div
            role="button"
            tabIndex={0}
            {...motionProps}
            onClick={() => onClick(event)}
            onKeyDown={(eventKey) => {
                if (eventKey.key === "Enter" || eventKey.key === " ") {
                    eventKey.preventDefault();
                    onClick(event);
                }
            }}
            className={`group grid w-full cursor-pointer grid-cols-[152px_minmax(0,1fr)] items-stretch border-b py-5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/70 lg:grid-cols-[176px_minmax(0,1fr)_104px] ${
                isDayMode
                    ? "border-slate-200/80 hover:border-blue-400/70"
                    : "border-white/[0.08] hover:border-indigo-300/55"
            }`}
        >
            <div className="relative min-h-[126px] overflow-hidden rounded-[2px]">
                <SmartImage
                    src={getThumbnailUrl(event.image)}
                    alt={event.title}
                    loading="lazy"
                    priority={index === 0}
                    className="absolute inset-0 h-full w-full"
                    imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {!isDayMode && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-55" />
                )}
            </div>

            <div className="flex min-w-0 flex-col px-5 py-0.5 lg:px-6">
                <div className="flex min-w-0 items-start gap-3">
                    <h3
                        className={`line-clamp-2 min-w-0 flex-1 text-base font-bold leading-snug tracking-tight lg:text-lg ${
                            isDayMode ? "text-slate-950" : "text-white"
                        }`}
                    >
                        {event.title}
                    </h3>
                    <span
                        className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold lg:hidden ${getStatusTextColor(status, t, isDayMode)}`}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                        {status}
                    </span>
                </div>

                <div
                    className={`mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs lg:gap-x-4 lg:text-[15px] ${
                        isDayMode ? "text-slate-500" : "text-gray-400"
                    }`}
                >
                    <span className="inline-flex min-w-0 items-center gap-1.5 lg:gap-2">
                        <Calendar
                            size={14}
                            className={
                                isDayMode
                                    ? "h-[17px] w-[17px] text-blue-600"
                                    : "h-[17px] w-[17px] text-indigo-400"
                            }
                        />
                        <span
                            className={
                                isDayMode
                                    ? "font-medium text-slate-700"
                                    : "font-medium text-gray-200"
                            }
                        >
                            {formatDateTime(event.date)}
                            {event.end_date &&
                                !isSameDay(event.date, event.end_date) &&
                                `-${formatDateTime(event.end_date)}`}
                        </span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5 lg:gap-2">
                        <MapPin
                            size={14}
                            className={
                                isDayMode
                                    ? "h-[17px] w-[17px] shrink-0 text-slate-400"
                                    : "h-[17px] w-[17px] shrink-0 text-indigo-400"
                            }
                        />
                        <span className="truncate">
                            {event.location || t("common.online", "线上")}
                        </span>
                    </span>
                    {event.organizer && (
                        <span className="hidden min-w-0 items-center gap-1.5 xl:inline-flex">
                            <Building2
                                size={14}
                                className={
                                    isDayMode
                                        ? "shrink-0 text-slate-400"
                                        : "shrink-0 text-indigo-400"
                                }
                            />
                            {event.organizer_profile_handle ? (
                                <RouterLink
                                    to={`/org/${event.organizer_profile_handle}`}
                                    onClick={(linkEvent) => linkEvent.stopPropagation()}
                                    className={`truncate hover:underline ${isDayMode ? "hover:text-slate-800" : "hover:text-white"}`}
                                >
                                    {event.organizer}
                                </RouterLink>
                            ) : (
                                <span className="truncate">{event.organizer}</span>
                            )}
                            <OfficialVerificationBadge
                                profile={organizerProfileFromEvent(event)}
                                compact
                                isDayMode={isDayMode}
                            />
                        </span>
                    )}
                </div>

                {event.description && (
                    <p
                        className={`mt-2 line-clamp-2 text-[13px] leading-5 lg:max-w-3xl ${
                            isDayMode ? "text-slate-500" : "text-gray-400"
                        }`}
                    >
                        {event.description}
                    </p>
                )}

                <div
                    className={`mt-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-[11px] ${isDayMode ? "text-slate-500" : "text-slate-400"}`}
                >
                    {isCollegeNoticeEvent(event) && (
                        <span
                            className={`inline-flex max-w-[150px] items-center gap-1 font-medium ${isDayMode ? "text-blue-700" : "text-indigo-200"}`}
                        >
                            <FileText size={11} className="shrink-0" />
                            <span className="truncate">{t("events.college_notice.badge")}</span>
                        </span>
                    )}
                    {event.category && (
                        <span className="inline-flex max-w-[150px] items-center gap-1 font-medium">
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{formatEventCategory(event.category)}</span>
                        </span>
                    )}
                    {event.target_audience && (
                        <span className="inline-flex max-w-[180px] items-center gap-1 font-medium">
                            <span aria-hidden="true">·</span>
                            <span className="truncate">
                                {formatEventAudience(event.target_audience)}
                            </span>
                        </span>
                    )}
                    {event.score && (
                        <span
                            className={`inline-flex items-center gap-1 font-semibold ${isDayMode ? "text-amber-700" : "text-amber-200"}`}
                        >
                            <span aria-hidden="true">·</span>
                            <Award size={11} />
                            {event.score}
                        </span>
                    )}
                </div>
            </div>

            <div className="col-span-2 flex items-center justify-end gap-3 pt-3 lg:col-span-1 lg:flex-col lg:items-end lg:justify-center lg:pt-0">
                <span
                    className={`hidden items-center gap-1.5 text-[11px] font-bold lg:inline-flex ${getStatusTextColor(status, t, isDayMode)}`}
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                    {status}
                </span>
            </div>
        </motion.div>
    );
});
EventListRow.displayName = "EventListRow";

const CollegeNoticeRow = memo(({ event, index, onClick, reduceMotion, isDayMode }) => {
    const { t, i18n } = useTranslation();
    const status = getEventLifecycle(event.date, event.end_date, t);
    const noticeSource = getCollegeNoticeSource(event);
    const noticeTypeLabel = getCollegeNoticeTypeLabel(
        event.notice_type || "other",
        i18n.resolvedLanguage || i18n.language
    );
    const eventLanguage = i18n.resolvedLanguage || i18n.language || "zh";
    const formatEventCategory = (value) => getEventCategoryLabel(value, eventLanguage);
    const formatEventAudience = (value) => getEventAudienceLabel(value, eventLanguage);
    const motionProps = reduceMotion
        ? {}
        : {
              initial: { opacity: 0, y: 10 },
              animate: {
                  opacity: 1,
                  y: 0,
                  transition: {
                      duration: 0.24,
                      ease: [0.22, 1, 0.36, 1],
                      delay: Math.min(index, 8) * 0.025,
                  },
              },
              whileHover: {
                  y: -1,
                  transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
              },
          };

    return (
        <motion.article
            role="button"
            tabIndex={0}
            {...motionProps}
            data-testid="event-card"
            onClick={() => onClick(event)}
            onKeyDown={(eventKey) => {
                if (eventKey.key === "Enter" || eventKey.key === " ") {
                    eventKey.preventDefault();
                    onClick(event);
                }
            }}
            className={`group w-full cursor-pointer border-b py-5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
                isDayMode
                    ? "border-slate-200/80 hover:border-blue-400/70"
                    : "border-white/[0.08] hover:border-indigo-300/55"
            }`}
        >
            <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_140px]">
                <div className="min-w-0 py-1 pr-5">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {noticeSource && (
                            <span
                                className={`inline-flex min-w-0 max-w-[240px] items-center gap-1.5 text-[11px] font-black ${isDayMode ? "text-blue-700" : "text-indigo-200"}`}
                            >
                                <Building2 size={12} className="shrink-0" />
                                <span className="min-w-0 truncate">
                                    <span>{t("events.college_notice.source_label")}</span>
                                    <span className="ml-1">{noticeSource}</span>
                                </span>
                            </span>
                        )}
                        {event.category && (
                            <span
                                className={`inline-flex max-w-[150px] items-center gap-1 text-[11px] font-medium ${isDayMode ? "text-slate-500" : "text-slate-400"}`}
                            >
                                <span aria-hidden="true">·</span>
                                <span className="truncate">
                                    {formatEventCategory(event.category)}
                                </span>
                            </span>
                        )}
                        {noticeTypeLabel && (
                            <span
                                className={`inline-flex max-w-[150px] items-center gap-1 text-[11px] font-medium ${isDayMode ? "text-sky-700" : "text-slate-300"}`}
                            >
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{noticeTypeLabel}</span>
                            </span>
                        )}
                        <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold ${getStatusTextColor(status, t, isDayMode)}`}
                        >
                            <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
                            {status}
                        </span>
                    </div>

                    <h3
                        className={`mt-3 line-clamp-2 text-base font-black leading-snug tracking-tight md:text-lg ${
                            isDayMode ? "text-slate-950" : "text-white"
                        }`}
                    >
                        {event.title}
                    </h3>

                    <div
                        className={`mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm ${
                            isDayMode ? "text-slate-500" : "text-gray-400"
                        }`}
                    >
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Calendar
                                size={14}
                                className={isDayMode ? "text-blue-600" : "text-indigo-400"}
                            />
                            <span
                                className={
                                    isDayMode
                                        ? "font-medium text-slate-700"
                                        : "font-medium text-gray-200"
                                }
                            >
                                {formatDateTime(event.date)}
                                {event.end_date &&
                                    !isSameDay(event.date, event.end_date) &&
                                    `-${formatDateTime(event.end_date)}`}
                            </span>
                        </span>
                        {event.target_audience && event.target_audience !== noticeSource && (
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Users
                                    size={14}
                                    className={
                                        isDayMode
                                            ? "shrink-0 text-slate-400"
                                            : "shrink-0 text-indigo-400"
                                    }
                                />
                                <span className="truncate">
                                    {formatEventAudience(event.target_audience)}
                                </span>
                            </span>
                        )}
                    </div>

                    {event.description && (
                        <p
                            className={`mt-3 line-clamp-3 text-sm leading-6 ${
                                isDayMode ? "text-slate-600" : "text-gray-300"
                            }`}
                        >
                            {event.description}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 md:flex-col md:items-end md:justify-center md:pt-0">
                    {event.link ? (
                        <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                                isDayMode ? "text-blue-700" : "text-indigo-200"
                            }`}
                        >
                            <ExternalLink size={14} />
                            {t("events.college_notice.link_available")}
                        </span>
                    ) : (
                        <span
                            className={`text-xs font-medium ${
                                isDayMode ? "text-slate-500" : "text-gray-400"
                            }`}
                        >
                            {t("events.college_notice.text_notice")}
                        </span>
                    )}
                </div>
            </div>
        </motion.article>
    );
});
CollegeNoticeRow.displayName = "CollegeNoticeRow";

const Events = () => {
    const { t, i18n } = useTranslation();
    const { settings, uiMode } = useSettings();
    const { user } = useAuth();
    const { eventOrganizationPartners } = useEcosystemPartners();
    const prefersReducedMotion = useReducedMotion();
    const isDayMode = uiMode === "day";
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedEventRecommendationContext, setSelectedEventRecommendationContext] =
        useState(null);
    const selectedEventRecommendationContextRef = useRef(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
    const [isMobileAssistantOpen, setIsMobileAssistantOpen] = useState(false);
    const [isDesktopAssistantOpen, setIsDesktopAssistantOpen] = useState(false);
    const [viewMode, setViewMode] = useState("cards");
    const [isMobileViewport, setIsMobileViewport] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth < 768 : false
    );
    const [canRenderDesktopAssistant, setCanRenderDesktopAssistant] = useState(() =>
        typeof window !== "undefined" ? window.innerWidth >= 768 : false
    );
    const isMiniProgramMode = isMiniProgramWebView();
    const useMiniProgramModalScroll = isMiniProgramMode && isMobileViewport;
    const shouldReduceCardMotion = prefersReducedMotion;
    const trackedViewTimestamps = useRef(new Map());
    const updateSelectedEventRecommendationContext = useCallback((context) => {
        selectedEventRecommendationContextRef.current = context;
        setSelectedEventRecommendationContext(context);
    }, []);
    const eventThemeAccent = useMemo(
        () => EVENT_THEME_VARIANTS[isDayMode ? "cyan" : "blue"],
        [isDayMode]
    );
    const showLegacyHeaderImage = false;
    const eventLanguage = i18n.resolvedLanguage || i18n.language || "zh";
    const formatEventCategory = useCallback(
        (value) => getEventCategoryLabel(value, eventLanguage),
        [eventLanguage]
    );
    const formatEventAudience = useCallback(
        (value) => getEventAudienceLabel(value, eventLanguage),
        [eventLanguage]
    );

    // Listen for global events from Navbar
    useEffect(() => {
        const handleOpenUpload = (e) => {
            if (e.detail.type === "event") setIsUploadOpen(true);
        };

        window.addEventListener("open-upload-modal", handleOpenUpload);
        return () => {
            window.removeEventListener("open-upload-modal", handleOpenUpload);
        };
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const updateViewport = () => {
            const isMobile = window.innerWidth < 768;
            setIsMobileViewport(isMobile);
            setCanRenderDesktopAssistant(!isMobile);
            if (isMobile) {
                setIsDesktopAssistantOpen(false);
            }
        };

        updateViewport();
        window.addEventListener("resize", updateViewport, { passive: true });
        return () => window.removeEventListener("resize", updateViewport);
    }, []);

    const [sort, setSort] = useState("newest");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filters, setFilters] = useState({
        category: null,
        target_audience: null,
    });
    const isCollegeNoticeFilter = filters.category === COLLEGE_NOTICE_CATEGORY_VALUE;
    const selectedEventIsCollegeNotice = selectedEvent && isCollegeNoticeEvent(selectedEvent);
    const selectedEventNoticeSource = selectedEventIsCollegeNotice
        ? getCollegeNoticeSource(selectedEvent)
        : "";
    const selectedEventNoticeTypeLabel = selectedEventIsCollegeNotice
        ? getCollegeNoticeTypeLabel(
              selectedEvent?.notice_type || "other",
              i18n.resolvedLanguage || i18n.language
          )
        : "";
    const selectedOrganizerProfilePath = selectedEvent?.organizer_profile_handle
        ? `/org/${selectedEvent.organizer_profile_handle}`
        : "";
    const [partnerFilter, setPartnerFilter] = useState(null);
    const partnerFilterKey = partnerFilter?.terms?.join("|") || "";
    const hasActiveMobileAudienceFilter = Boolean(filters.target_audience);
    const mobileSortLabel = useMobileSortLabel(sort, t);
    const mobileAudienceLabel = filters.target_audience
        ? formatEventAudience(filters.target_audience)
        : t("events.filter.all_audiences", "全部学院");

    const clearMobileAudienceFilter = useCallback(() => {
        setFilters((prev) => ({
            ...prev,
            target_audience: null,
        }));
    }, []);

    const { scrollRef: mobileCategoryScrollRef, dragScrollProps: mobileCategoryDragProps } =
        useHorizontalDragScroll();
    const mobileCategoryTabs = useMemo(
        () => [
            { value: null, label: t("common.all", "全部"), icon: MOBILE_EVENT_CATEGORY_ICONS.all },
            {
                value: COLLEGE_NOTICE_CATEGORY_VALUE,
                label: t("events.college_notice.badge", "学院通知"),
                icon: MOBILE_EVENT_CATEGORY_ICONS[COLLEGE_NOTICE_CATEGORY_VALUE],
            },
            ...EVENT_CATEGORIES.map((category) => ({
                value: category.value,
                label: getEventCategoryLabel(category.value, eventLanguage),
                icon: MOBILE_EVENT_CATEGORY_ICONS[category.value] || Tag,
            })),
        ],
        [eventLanguage, t]
    );
    const handleMobileCategoryChange = useCallback((value) => {
        setFilters((prev) => ({
            ...prev,
            category: value || null,
        }));
    }, []);
    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Capture on mount — useBackClose pushes a hash entry whose state overwrites location.state.
    const fromFavoritesRef = useRef(location.state?.fromFavorites === true);
    const fromUserProfileRef = useRef(Boolean(location.state?.fromUserProfile));
    const closeEvent = useCallback(() => {
        if (fromFavoritesRef.current) {
            fromFavoritesRef.current = false; // guard against popstate re-entry
            navigate(-2);
            return;
        }
        if (fromUserProfileRef.current) {
            fromUserProfileRef.current = false;
            navigate(-2);
            return;
        }
        setSelectedEvent(null);
        updateSelectedEventRecommendationContext(null);
    }, [navigate, updateSelectedEventRecommendationContext]);

    useBackClose(selectedEvent !== null, closeEvent);
    useBackClose(isUploadOpen, () => setIsUploadOpen(false));
    useBackClose(isMobileFilterOpen, () => setIsMobileFilterOpen(false));
    useBackClose(isMobileSortOpen, () => setIsMobileSortOpen(false));
    useBackClose(isMobileAssistantOpen, () => setIsMobileAssistantOpen(false));
    useBackClose(isDesktopAssistantOpen, () => setIsDesktopAssistantOpen(false));

    useBodyScrollLock(
        Boolean(selectedEvent || isMobileFilterOpen || isMobileSortOpen || isMobileAssistantOpen)
    );

    const isPaginationEnabled = settings.pagination_enabled === "true";
    const pageSize = isPaginationEnabled ? 6 : 12;
    const [displayEvents, setDisplayEvents] = useState([]);

    const {
        data: events,
        pagination,
        loading,
        error,
        setData: setEvents,
        refresh,
    } = useCachedResource(
        "/events",
        {
            page: currentPage,
            limit: pageSize,
            sort,
            status: "approved",
            search: debouncedSearch,
            ...(partnerFilterKey ? { organizer_any: partnerFilter.terms.join(",") } : {}),
            ...filters,
        },
        {
            dependencies: [
                settings.pagination_enabled,
                debouncedSearch,
                JSON.stringify(filters),
                partnerFilterKey,
            ],
        }
    );

    const totalPages = pagination?.totalPages || 1;
    const hasMore = !isPaginationEnabled && currentPage < totalPages;

    useEffect(() => {
        setCurrentPage(1);
    }, [
        sort,
        debouncedSearch,
        JSON.stringify(filters),
        partnerFilterKey,
        settings.pagination_enabled,
    ]);

    useEffect(() => {
        const safeEvents = Array.isArray(events) ? events : [];

        if (isPaginationEnabled) {
            setDisplayEvents(safeEvents);
            return;
        }

        setDisplayEvents((prev) => {
            if (currentPage === 1) return safeEvents;
            const seen = new Set(prev.map((item) => item.id));
            const next = safeEvents.filter((item) => !seen.has(item.id));
            return next.length === 0 ? prev : [...prev, ...next];
        });
    }, [events, currentPage, isPaginationEnabled]);

    // Deep linking
    useEffect(() => {
        const id = searchParams.get("id");
        if (id) {
            api.get(`/events/${id}`)
                .then((res) => {
                    if (res.data) {
                        updateSelectedEventRecommendationContext(null);
                        setSelectedEvent(res.data);
                    }
                })
                .catch((err) => {
                    if (process.env.NODE_ENV === "development") {
                        console.error("Failed to fetch deep linked event", err);
                    }
                });
        }
    }, [searchParams, updateSelectedEventRecommendationContext]);

    const syncEventViews = useCallback(
        (eventId, views) => {
            setEvents((prev) =>
                prev.map((event) => (event.id === eventId ? { ...event, views } : event))
            );

            setDisplayEvents((prev) =>
                prev.map((event) => (event.id === eventId ? { ...event, views } : event))
            );

            setSelectedEvent((prev) => (prev && prev.id === eventId ? { ...prev, views } : prev));
        },
        [setEvents, setDisplayEvents]
    );

    const recordSelectedEventAssistantAction = useCallback(
        async (actionType, metadata = {}) => {
            const selectedEventId = selectedEvent?.id;
            const recommendationContext =
                selectedEventRecommendationContextRef.current || selectedEventRecommendationContext;

            if (!selectedEventId || !recommendationContext?.assistantRunId) {
                return;
            }

            let hrefHost = "";
            if (metadata.href && typeof window !== "undefined") {
                try {
                    hrefHost = new URL(metadata.href, window.location.origin).host;
                } catch {
                    hrefHost = "";
                }
            }

            try {
                await api.post(
                    "/events/assistant/action",
                    {
                        eventId: selectedEventId,
                        actionType,
                        assistantRunId: recommendationContext.assistantRunId,
                        recommendationRank: recommendationContext.recommendationRank || null,
                        source: recommendationContext.source || "event_assistant_detail",
                        visitorKey: getOrCreateSiteVisitorKey(),
                        metadata: {
                            surface: metadata.surface || "event_detail",
                            nextAction: recommendationContext.nextAction || "",
                            hrefHost,
                        },
                    },
                    { silent: true }
                );
            } catch {
                // Recommendation attribution should never block the user's action.
            }
        },
        [selectedEvent?.id, selectedEventRecommendationContext]
    );

    useEffect(() => {
        if (!selectedEvent?.id || user?.role === "admin" || typeof window === "undefined") {
            return undefined;
        }

        const eventId = selectedEvent.id;
        const visitorKey = getOrCreateSiteVisitorKey();
        if (!visitorKey) {
            return undefined;
        }

        const now = Date.now();
        const storageKey = `event-view:${eventId}`;
        const lastTrackedAt = Number(
            window.sessionStorage.getItem(storageKey) ||
                trackedViewTimestamps.current.get(eventId) ||
                0
        );

        if (lastTrackedAt && now - lastTrackedAt < VIEW_DEDUPE_WINDOW_MS) {
            return undefined;
        }

        let cancelled = false;

        api.post(`/events/${eventId}/view`, { visitorKey })
            .then((res) => {
                if (cancelled) return;

                const nextViews = Number(res.data?.views);
                const trackedAt = Date.now();
                window.sessionStorage.setItem(storageKey, String(trackedAt));
                trackedViewTimestamps.current.set(eventId, trackedAt);

                if (!Number.isNaN(nextViews)) {
                    syncEventViews(eventId, nextViews);
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [selectedEvent?.id, user?.role, syncEventViews]);

    const addToGoogleCalendar = () => {
        if (!selectedEvent) return;
        const title = encodeURIComponent(selectedEvent.title);
        // FIX: BUG-30 — Guard against null values in calendar export strings
        const details = encodeURIComponent(
            (selectedEvent.description || "") + "\n\n" + (selectedEvent.content || "")
        );
        const location = encodeURIComponent(selectedEvent.location || "");
        const hasTime = (str) => str && str.length > 10 && str[10] === "T";

        let dates;
        if (hasTime(selectedEvent.date)) {
            // FIX: BUG-20 — Append Z for UTC to ensure correct timezone interpretation
            const toGCalDateTime = (str) => str.substring(0, 16).replace(/-|:|T/g, "") + "00Z";
            const startStr = toGCalDateTime(selectedEvent.date);
            const endStr = selectedEvent.end_date
                ? toGCalDateTime(selectedEvent.end_date)
                : toGCalDateTime(selectedEvent.date);
            dates = `${startStr}/${endStr}`;
        } else {
            // all-day event: format YYYYMMDD/YYYYMMDD (end is exclusive, add 1 day)
            const startStr = selectedEvent.date.replace(/-/g, "");
            let endStr = startStr;
            if (selectedEvent.end_date) {
                const d = new Date(selectedEvent.end_date.replace(/-/g, "/"));
                d.setDate(d.getDate() + 1);
                endStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            }
            dates = `${startStr}/${endStr}`;
        }

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
        window.open(url, "_blank");
    };

    const downloadICS = () => {
        if (!selectedEvent) return;
        // FIX: BUG-30 — Guard against null values
        const title = selectedEvent.title || "";
        const desc = selectedEvent.description || "";
        const location = selectedEvent.location || "";
        const hasTime = (str) => str && str.length > 10 && str[10] === "T";

        let dtStart, dtEnd;
        if (hasTime(selectedEvent.date)) {
            // FIX: BUG-20 — Append Z for UTC timezone in ICS datetime
            const toICSDateTime = (str) => str.substring(0, 16).replace(/-|:|T/g, "") + "00Z";
            dtStart = `DTSTART:${toICSDateTime(selectedEvent.date)}`;
            dtEnd = `DTEND:${selectedEvent.end_date ? toICSDateTime(selectedEvent.end_date) : toICSDateTime(selectedEvent.date)}`;
        } else {
            // all-day event: DTSTART;VALUE=DATE:YYYYMMDD (end is exclusive)
            const startStr = selectedEvent.date.replace(/-/g, "");
            let endStr = startStr;
            if (selectedEvent.end_date) {
                const d = new Date(selectedEvent.end_date.replace(/-/g, "/"));
                d.setDate(d.getDate() + 1);
                endStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            }
            dtStart = `DTSTART;VALUE=DATE:${startStr}`;
            dtEnd = `DTEND;VALUE=DATE:${endStr}`;
        }

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//777//Events//EN
BEGIN:VEVENT
UID:${selectedEvent.id}@777.com
DTSTAMP:${new Date().toISOString().replace(/-|:/g, "").split(".")[0]}Z
${dtStart}
${dtEnd}
SUMMARY:${title}
DESCRIPTION:${desc}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], {
            type: "text/calendar;charset=utf-8",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${title}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopyLocation = () => {
        if (selectedEvent && selectedEvent.location) {
            navigator.clipboard
                .writeText(selectedEvent.location)
                .then(() => toast.success(t("common.copied_to_clipboard")))
                .catch(() => toast.error(t("common.copy_failed")));
        }
    };

    const handleShare = async () => {
        if (!selectedEvent) return;
        const shareData = buildEventShareData(selectedEvent);
        if (!shareData) return;

        if (isMiniProgramWebView()) {
            try {
                await shareViaNativeMiniProgram(shareData);
                return;
            } catch (nativeShareError) {
                console.error("Error opening native mini program share page:", nativeShareError);
            }

            try {
                await shareViaMiniProgram(shareData);
                toast.success(t("common.miniapp_share_ready"));
                return;
            } catch (error) {
                console.error("Error preparing mini program share:", error);
                handleCopyInfo();
                return;
            }
        }

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error("Error sharing:", err);
            }
        } else {
            // Fallback to copy
            handleCopyInfo();
        }
    };

    useEffect(() => {
        if (!isMiniProgramMode || !selectedEvent) return;
        const shareData = buildEventShareData(selectedEvent);
        if (!shareData) return;
        shareViaMiniProgram(shareData).catch((error) => {
            if (process.env.NODE_ENV === "development") {
                console.warn("Failed to sync mini program share payload:", error);
            }
        });
    }, [isMiniProgramMode, selectedEvent]);

    const handleCopyInfo = () => {
        if (!selectedEvent) return;
        const info = `${selectedEvent.title}\n${selectedEvent.date}\n${selectedEvent.location}\n\n${selectedEvent.description}`;
        navigator.clipboard
            .writeText(info)
            .then(() => toast.success(t("common.copied_to_clipboard")))
            .catch(() => toast.error(t("common.copy_failed")));
    };

    const addEvent = (newItem) => {
        return api
            .post("/events", newItem)
            .then(() => {
                return refresh({ clearCache: true });
            })
            .catch((err) => {
                console.error("Failed to save event", err);
                throw err;
            });
    };

    const handleUpload = (newItem) => {
        return addEvent(newItem);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleApplyPartnerFilter = useCallback((nextFilter) => {
        if (!nextFilter?.terms?.length) return;
        setPartnerFilter(nextFilter);
        setCurrentPage(1);
        if (typeof window !== "undefined") {
            window.requestAnimationFrame(() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }
    }, []);

    const clearPartnerFilter = useCallback(() => {
        setPartnerFilter(null);
        setCurrentPage(1);
    }, []);

    const handleOpenAssistantEvent = useCallback(
        (assistantEvent, recommendationContext = null) => {
            if (!assistantEvent?.id) return;

            const cachedEvent =
                displayEvents.find((event) => event.id === assistantEvent.id) ||
                (Array.isArray(events)
                    ? events.find((event) => event.id === assistantEvent.id)
                    : null);

            setIsMobileAssistantOpen(false);
            setIsDesktopAssistantOpen(false);
            updateSelectedEventRecommendationContext(recommendationContext);
            setSelectedEvent(cachedEvent || assistantEvent);

            api.get(`/events/${assistantEvent.id}`, { silent: true })
                .then((response) => {
                    if (response.data) {
                        updateSelectedEventRecommendationContext(recommendationContext);
                        setSelectedEvent(response.data);
                    }
                })
                .catch(() => {
                    toast.error(
                        t("events.assistant.detail_error", "活动详情加载失败，请稍后再试。")
                    );
                });
        },
        [displayEvents, events, t, updateSelectedEventRecommendationContext]
    );

    const nightSegmentActiveClass =
        "border border-indigo-400/28 bg-indigo-500/16 text-indigo-100 shadow-none";
    const dayPrimaryActionClass =
        "rect-button-primary bg-blue-700 text-white border-blue-700 hover:bg-blue-800 hover:border-blue-800";
    const openEventFromList = useCallback(
        (nextEvent) => {
            updateSelectedEventRecommendationContext(null);
            setSelectedEvent(nextEvent);
        },
        [updateSelectedEventRecommendationContext]
    );
    const viewModeOptions = useMemo(
        () => [
            {
                value: "cards",
                label: t("events.view_mode.cards"),
                ariaLabel: t("events.view_mode.cards_aria"),
                icon: LayoutGrid,
            },
            {
                value: "list",
                label: t("events.view_mode.list"),
                ariaLabel: t("events.view_mode.list_aria"),
                icon: List,
            },
        ],
        [t]
    );
    const mobileControlMotion = prefersReducedMotion
        ? {}
        : {
              whileHover: { y: -1 },
              whileTap: { scale: 0.94 },
              transition: { type: "spring", stiffness: 520, damping: 34 },
          };
    const mobileTabMotion = prefersReducedMotion
        ? {}
        : {
              whileHover: { opacity: 0.92 },
              whileTap: { opacity: 0.72 },
              transition: { type: "spring", stiffness: 520, damping: 34 },
          };
    const pageHeaderMotion =
        isMobileViewport || prefersReducedMotion
            ? { initial: false }
            : {
                  initial: { opacity: 0, y: 20 },
                  whileInView: { opacity: 1, y: 0 },
                  transition: { duration: 0.6 },
                  viewport: { once: true },
              };

    return (
        <section className="day-page-theme day-page-theme-events relative flex-grow overflow-x-hidden px-3 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)] md:px-8 md:pb-20 md:pt-20">
            <SEO title={t("events.meta_title")} description={t("events.meta_desc")} />
            {null}

            <motion.div
                {...pageHeaderMotion}
                className="relative z-40 mb-3 text-center md:mb-6 md:pt-0"
            >
                <div className="mb-3 grid grid-cols-[88px_minmax(0,1fr)_88px] items-center gap-2 px-0.5 md:hidden">
                    <motion.button
                        {...mobileControlMotion}
                        type="button"
                        aria-label={t("nav.more", "更多")}
                        aria-haspopup="dialog"
                        onClick={() => window.dispatchEvent(new Event("open-mobile-more-menu"))}
                        className={`inline-flex h-9 w-9 items-center justify-center border-b border-transparent transition-[border-color,color] ${
                            isDayMode
                                ? "text-slate-600 hover:border-blue-500/60 hover:text-slate-950"
                                : "text-slate-300 hover:border-indigo-400/70 hover:text-white"
                        }`}
                    >
                        <Menu size={18} />
                    </motion.button>
                    <div className="min-w-0 text-center">
                        <h1
                            className={`truncate text-base font-bold leading-9 tracking-wide ${isDayMode ? "text-slate-800" : "text-white/90"}`}
                        >
                            {t("events.title", "发现校园机会")}
                        </h1>
                    </div>
                    <div className="flex justify-end gap-1.5">
                        <motion.button
                            {...mobileControlMotion}
                            type="button"
                            aria-label={t("search.placeholder", "搜索")}
                            onClick={() => window.dispatchEvent(new Event("open-search-palette"))}
                            className={`inline-flex h-9 w-9 items-center justify-center border-b border-transparent transition-[border-color,color] ${isDayMode ? "text-slate-600 hover:border-blue-500/60 hover:text-slate-950" : "text-slate-300 hover:border-indigo-400/70 hover:text-white"}`}
                        >
                            <Search size={18} />
                        </motion.button>
                        <motion.button
                            {...mobileControlMotion}
                            type="button"
                            aria-label={t("common.create_event")}
                            data-testid="event-create-mobile"
                            onClick={() => {
                                if (!user) {
                                    toast.error(t("auth.signin_required"));
                                    return;
                                }
                                setIsUploadOpen(true);
                            }}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-[8px] ${isDayMode ? "bg-blue-600 text-white" : "bg-indigo-400 text-slate-950"}`}
                        >
                            <Plus size={19} strokeWidth={3} />
                        </motion.button>
                    </div>
                </div>

                <nav
                    aria-label={t("events.category_label", "活动分类")}
                    className={`relative -mx-3 mb-3 border-b md:hidden ${
                        isDayMode ? "border-slate-200/80" : "border-white/10"
                    }`}
                >
                    <div
                        ref={mobileCategoryScrollRef}
                        {...mobileCategoryDragProps}
                        className="scrollbar-none flex cursor-grab select-none snap-x snap-proximity gap-1 overflow-x-auto overscroll-x-contain scroll-smooth px-3 touch-pan-x active:cursor-grabbing"
                        role="tablist"
                    >
                        {mobileCategoryTabs.map((tab) => {
                            const active = (filters.category || null) === tab.value;
                            const Icon = tab.icon || Tag;
                            return (
                                <motion.button
                                    {...mobileTabMotion}
                                    key={tab.value || "all"}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    aria-pressed={active}
                                    onClick={() => handleMobileCategoryChange(tab.value)}
                                    className={`inline-flex min-h-10 shrink-0 snap-start items-center justify-center gap-1.5 border-b-2 px-2.5 text-xs font-bold transition-colors ${
                                        active
                                            ? isDayMode
                                                ? "border-blue-500 text-blue-700"
                                                : "border-indigo-300 text-indigo-100"
                                            : isDayMode
                                              ? "border-transparent text-slate-600 hover:text-blue-700"
                                              : "border-transparent text-gray-300 hover:text-white"
                                    }`}
                                >
                                    <Icon size={14} />
                                    {tab.label}
                                </motion.button>
                            );
                        })}
                    </div>
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-0 right-0 top-0 w-12 bg-gradient-to-l from-[var(--theme-bg)] to-transparent"
                    />
                </nav>

                <div
                    className={`mb-3 grid grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] border-y md:hidden ${
                        isDayMode ? "border-slate-200/80" : "border-white/10"
                    }`}
                >
                    <motion.button
                        {...mobileControlMotion}
                        type="button"
                        onClick={() => {
                            setIsMobileFilterOpen(false);
                            setIsMobileSortOpen(true);
                        }}
                        className={`inline-flex h-10 items-center justify-center gap-1.5 border-r text-[13px] font-semibold transition-colors ${isDayMode ? "border-slate-200/80 text-slate-600 hover:text-slate-950" : "border-white/10 text-slate-300 hover:text-white"}`}
                    >
                        <Clock size={16} />
                        <span className="truncate">{mobileSortLabel}</span>
                        <ChevronDown size={15} />
                    </motion.button>
                    <motion.button
                        {...mobileControlMotion}
                        type="button"
                        aria-label={t("events.assistant.open_assistant", "打开 AI 活动助手")}
                        onClick={() => {
                            setIsMobileFilterOpen(false);
                            setIsMobileSortOpen(false);
                            setIsMobileAssistantOpen(true);
                        }}
                        className={`relative inline-flex h-10 min-w-0 items-center justify-center gap-1.5 overflow-hidden px-2 text-[12px] font-black transition-colors ${
                            isDayMode
                                ? "text-cyan-700 hover:text-cyan-900"
                                : "text-cyan-200 hover:text-white"
                        }`}
                    >
                        <Sparkles
                            size={14}
                            className={
                                isDayMode ? "shrink-0 text-cyan-600" : "shrink-0 text-cyan-200"
                            }
                        />
                        <span className="truncate">{t("events.assistant.ask_ai", "问AI")}</span>
                    </motion.button>
                    <motion.button
                        {...mobileControlMotion}
                        type="button"
                        aria-label={t("events.filter.open_audience_sheet", "打开学院筛选")}
                        onClick={() => {
                            setIsMobileSortOpen(false);
                            setIsMobileFilterOpen(true);
                        }}
                        className={`inline-flex h-10 items-center justify-center gap-1.5 border-l text-[13px] font-semibold transition-colors ${isDayMode ? "border-slate-200/80 text-slate-600 hover:text-slate-950" : "border-white/10 text-slate-300 hover:text-white"}`}
                    >
                        <SlidersHorizontal size={17} />
                        <span className="truncate">{mobileAudienceLabel}</span>
                    </motion.button>
                </div>

                <div className="scroll-mt-4 md:hidden">
                    <OrganizationPartnerWall
                        partners={eventOrganizationPartners}
                        isDayMode={isDayMode}
                        className="mb-4 text-left"
                        activePartnerId={partnerFilter?.id}
                        onApplyPartnerFilter={handleApplyPartnerFilter}
                        onClearPartnerFilter={clearPartnerFilter}
                    />
                </div>
                {partnerFilter && (
                    <div
                        className={`${EVENT_CONTENT_WIDTH_CLASS} mb-4 hidden justify-start md:flex`}
                    >
                        <button
                            type="button"
                            data-testid="organization-partner-active-filter"
                            onClick={clearPartnerFilter}
                            className={`inline-flex min-h-9 max-w-full items-center gap-2 border-b border-transparent px-1 text-xs font-bold transition-colors ${isDayMode ? "text-slate-700 hover:border-blue-500/60 hover:text-blue-800" : "text-indigo-100 hover:border-indigo-300/70 hover:text-white"}`}
                        >
                            <Users size={14} />
                            <span className="truncate">
                                {t("events.organizations.active_filter", "社团：{{name}}", {
                                    name: partnerFilter.name,
                                })}
                            </span>
                            <X size={14} />
                        </button>
                    </div>
                )}

                <div
                    className={`${EVENT_CONTENT_WIDTH_CLASS} mb-4 hidden items-end justify-between gap-8 text-left md:flex`}
                >
                    <div className="min-w-0">
                        <h2
                            className={`text-balance font-serif text-3xl font-bold leading-tight md:text-4xl ${isDayMode ? "text-slate-950" : "text-white"}`}
                        >
                            {t("events.title")}
                        </h2>
                        <p
                            className={`mt-1.5 max-w-2xl text-sm md:text-base ${isDayMode ? "text-slate-600" : "text-slate-300"}`}
                        >
                            {t("events.subtitle")}
                        </p>
                    </div>

                    {!isMiniProgramMode && (
                        <button
                            type="button"
                            aria-label={t("common.create_event")}
                            onClick={() => {
                                if (!user) {
                                    toast.error(t("auth.signin_required"));
                                    return;
                                }
                                setIsUploadOpen(true);
                            }}
                            className={`group flex shrink-0 items-center gap-2 border-b border-transparent px-1 py-2 text-sm font-bold transition-[border-color,color] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 ${isDayMode ? "text-slate-600 hover:border-blue-500/60 hover:text-blue-800" : "text-slate-300 hover:border-cyan-300/60 hover:text-white"}`}
                        >
                            <Upload size={18} className="md:w-5 md:h-5" />{" "}
                            {t("common.create_event")}
                        </button>
                    )}
                </div>

                {/* Desktop Filter Section */}
                <div className={`${EVENT_FILTER_WIDTH_CLASS} mb-3 hidden md:block`}>
                    <EventFilterPanel
                        filters={filters}
                        onFiltersChange={setFilters}
                        sort={sort}
                        onSortChange={setSort}
                    />
                </div>

                <OrganizationPartnerWall
                    partners={eventOrganizationPartners}
                    isDayMode={isDayMode}
                    className={`${EVENT_FILTER_WIDTH_CLASS} mb-3 hidden text-left md:block`}
                    activePartnerId={partnerFilter?.id}
                    onApplyPartnerFilter={handleApplyPartnerFilter}
                    onClearPartnerFilter={clearPartnerFilter}
                />

                <div
                    className={`${EVENT_CONTENT_WIDTH_CLASS} hidden items-center justify-between gap-4 md:flex`}
                >
                    <div
                        className={`text-left text-sm font-medium ${
                            isDayMode ? "text-slate-500" : "text-gray-400"
                        }`}
                    >
                        {t("events.result_count", { count: displayEvents.length })}
                    </div>
                    {!isCollegeNoticeFilter && (
                        <div
                            className={`inline-flex items-center gap-1 border-b ${
                                isDayMode ? "border-slate-200/80" : "border-white/10"
                            }`}
                            role="group"
                            aria-label={t("events.view_mode.aria")}
                        >
                            {viewModeOptions.map((option) => {
                                const active = viewMode === option.value;
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-label={option.ariaLabel}
                                        aria-pressed={active}
                                        onClick={() => setViewMode(option.value)}
                                        className={`inline-flex min-h-9 items-center gap-2 border-b-2 px-2.5 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
                                            active
                                                ? isDayMode
                                                    ? "border-blue-600 text-blue-700"
                                                    : "border-indigo-300 text-white"
                                                : isDayMode
                                                  ? "border-transparent text-slate-500 hover:text-slate-900"
                                                  : "border-transparent text-gray-400 hover:text-white"
                                        }`}
                                    >
                                        <Icon size={15} />
                                        {option.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Mobile Filter Drawer (Bottom Sheet) */}
                {createPortal(
                    isMobileFilterOpen ? (
                        <>
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="events-mobile-filter-title"
                                className={`fixed inset-0 z-[101] flex h-[100svh] w-full flex-col overflow-hidden transform-gpu md:hidden ${isDayMode ? "bg-white text-slate-900" : "bg-[#030817] text-white"}`}
                            >
                                <div
                                    className={`shrink-0 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] ${isDayMode ? "bg-white" : "bg-[#030817]"}`}
                                >
                                    <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-start gap-2">
                                        <button
                                            type="button"
                                            aria-label={t("common.close", "关闭")}
                                            onClick={() => setIsMobileFilterOpen(false)}
                                            className={`inline-flex h-9 w-9 items-center justify-center rounded-[6px] ${isDayMode ? "text-slate-600" : "text-slate-200"}`}
                                        >
                                            <X size={18} />
                                        </button>
                                        <div className="text-center">
                                            <h3
                                                id="events-mobile-filter-title"
                                                className={`text-[1.2rem] font-black leading-6 ${isDayMode ? "text-slate-950" : "text-white"}`}
                                            >
                                                {t("events.filter.audience_title", "学院范围")}
                                            </h3>
                                            <p
                                                className={`mt-1 truncate text-[8px] font-black uppercase tracking-[0.42em] ${isDayMode ? "text-cyan-700" : "text-cyan-300"}`}
                                            >
                                                {t(
                                                    "events.filter.audience_sheet_hint",
                                                    "只按学院范围收窄活动"
                                                )}
                                            </p>
                                        </div>
                                        {hasActiveMobileAudienceFilter ? (
                                            <button
                                                type="button"
                                                aria-label={t("common.clear", "清除")}
                                                onClick={clearMobileAudienceFilter}
                                                className={`inline-flex h-9 items-center justify-end text-[11px] font-bold ${isDayMode ? "text-slate-600" : "text-slate-300"}`}
                                            >
                                                {t("common.clear", "清除")}
                                            </button>
                                        ) : (
                                            <div aria-hidden="true" />
                                        )}
                                    </div>
                                </div>
                                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scrollbar-none">
                                    <EventFilterPanel
                                        filters={filters}
                                        onFiltersChange={setFilters}
                                        sort={sort}
                                        onSortChange={setSort}
                                        hideSort={true}
                                        mode="sheet"
                                        sheetScope="audience"
                                    />
                                </div>
                                <div
                                    className={`shrink-0 border-t px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 ${isDayMode ? "border-slate-200/80 bg-white" : "border-white/10 bg-[#030817]"}`}
                                >
                                    <div
                                        className={`grid items-center gap-3 ${hasActiveMobileAudienceFilter ? "grid-cols-[0.82fr_1.18fr]" : "grid-cols-1"}`}
                                    >
                                        {hasActiveMobileAudienceFilter && (
                                            <button
                                                type="button"
                                                aria-label={t("common.clear_all", "重置")}
                                                onClick={clearMobileAudienceFilter}
                                                className={`rect-button-secondary min-h-[44px] text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "text-slate-600" : "text-gray-200"}`}
                                            >
                                                {t("common.clear_all", "重置")}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            aria-label={t("common.done", "完成")}
                                            onClick={() => setIsMobileFilterOpen(false)}
                                            className={`rect-button min-h-[44px] text-sm font-black focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? dayPrimaryActionClass : nightSegmentActiveClass}`}
                                        >
                                            {t("common.done", "完成")}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    ) : null,
                    document.body
                )}

                {createPortal(
                    <MobileEventAssistantFullscreen
                        isOpen={isMobileAssistantOpen}
                        isDayMode={isDayMode}
                        onClose={() => setIsMobileAssistantOpen(false)}
                        onOpenEvent={handleOpenAssistantEvent}
                    />,
                    document.body
                )}

                {canRenderDesktopAssistant &&
                    createPortal(
                        <div className="pointer-events-none fixed inset-y-0 right-0 z-[90] hidden md:block">
                            <button
                                type="button"
                                onClick={() => setIsDesktopAssistantOpen(true)}
                                aria-expanded={isDesktopAssistantOpen}
                                aria-label={t(
                                    "events.assistant.open_assistant",
                                    "打开 AI 活动助手"
                                )}
                                className={`pointer-events-auto absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-lg border transition-all hover:-translate-x-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 md:inline-flex ${
                                    isDayMode
                                        ? "border-indigo-700/14 bg-white text-indigo-700 hover:border-indigo-700/24 hover:bg-indigo-50"
                                        : "border-white/10 bg-[#10121d]/92 text-blue-200 hover:border-white/20"
                                }`}
                            >
                                <Sparkles size={20} />
                            </button>

                            <AnimatePresence>
                                {isDesktopAssistantOpen && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => setIsDesktopAssistantOpen(false)}
                                            className={`pointer-events-auto fixed inset-0 z-[91] hidden md:block ${isDayMode ? "bg-slate-950/5" : "bg-black/45"}`}
                                        />
                                        <motion.aside
                                            initial={{ opacity: 0, x: 28 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{
                                                type: "spring",
                                                damping: 30,
                                                stiffness: 340,
                                            }}
                                            role="dialog"
                                            aria-modal="true"
                                            aria-label={t(
                                                "events.assistant.mobile_title",
                                                "AI 活动助手"
                                            )}
                                            className="pointer-events-auto fixed right-4 top-[calc(env(safe-area-inset-top)+88px)] z-[92] hidden h-[calc(100vh-112px)] w-[min(400px,calc(100vw-2rem))] md:block"
                                        >
                                            <EventAssistantPanel
                                                isDayMode={isDayMode}
                                                onOpenEvent={handleOpenAssistantEvent}
                                                onClose={() => setIsDesktopAssistantOpen(false)}
                                                variant="rail"
                                                className="h-full"
                                            />
                                        </motion.aside>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>,
                        document.body
                    )}

                {/* Mobile Sort Drawer (Bottom Sheet) */}
                {createPortal(
                    isMobileSortOpen ? (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                onClick={() => setIsMobileSortOpen(false)}
                                className={`fixed inset-0 z-[100] md:hidden ${isDayMode ? "bg-transparent" : "bg-black/60 backdrop-blur-sm"}`}
                            />
                            <motion.div
                                initial={{ y: 36 }}
                                animate={{ y: 0 }}
                                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="events-mobile-sort-title"
                                className={`fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[72dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[18px] border-x border-t md:hidden ${isDayMode ? "border-slate-200/80 bg-white" : "border-white/10 bg-[#171c2b]/96 shadow-[0_-18px_48px_rgba(0,0,0,0.42)]"}`}
                            >
                                <div
                                    className={`relative flex items-center justify-between border-b px-5 pb-4 pt-7 ${isDayMode ? "border-slate-200/80 bg-white" : "border-white/10 bg-transparent"}`}
                                >
                                    <div className="absolute left-1/2 top-3 h-1 w-12 -translate-x-1/2 rounded-full bg-slate-400/45" />
                                    <div>
                                        <h3
                                            id="events-mobile-sort-title"
                                            className={`text-base font-black ${isDayMode ? "text-slate-900" : "text-white"}`}
                                        >
                                            排序方式
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={t("common.close", "关闭")}
                                        onClick={() => setIsMobileSortOpen(false)}
                                        className={`rect-icon-button p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-400 hover:text-white"}`}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                                    <SortSelector
                                        sort={sort}
                                        onSortChange={(val) => {
                                            setSort(val);
                                            setTimeout(() => setIsMobileSortOpen(false), 300);
                                        }}
                                        className="w-full"
                                        extraOptions={[
                                            {
                                                value: "date_asc",
                                                label: t("sort_filter.date_asc", "日期（最早）"),
                                            },
                                            {
                                                value: "date_desc",
                                                label: t("sort_filter.date_desc", "日期（最晚）"),
                                            },
                                        ]}
                                        renderMode="list"
                                    />
                                </div>
                            </motion.div>
                        </>
                    ) : null,
                    document.body
                )}
            </motion.div>

            {error ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                    <AlertCircle size={48} className="text-red-400 mb-4 opacity-50 mx-auto" />
                    <p className={`mb-6 ${isDayMode ? "text-slate-600" : "text-gray-300"}`}>
                        {t("common.error_fetching_data", "获取数据失败")}
                    </p>
                    <button
                        onClick={refresh}
                        className={`rect-button-secondary px-6 py-2 transition-all ${isDayMode ? "text-slate-700" : "text-white"}`}
                    >
                        {t("common.retry", "重试")}
                    </button>
                </div>
            ) : loading && displayEvents.length === 0 ? (
                <div className={`${EVENT_CARD_GRID_CLASS} ${EVENT_CONTENT_WIDTH_CLASS}`}>
                    {Array.from({ length: 8 }, (_, index) => index + 1).map((i) => (
                        <div
                            key={i}
                            className={`relative border-b pb-6 ${isDayMode ? "border-slate-200/80" : "border-white/[0.08]"}`}
                        >
                            {/* Shimmer Effect */}
                            {!isDayMode && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-skeleton" />
                            )}

                            {/* Image Skeleton */}
                            <div
                                className={`aspect-[4/3] w-full rounded-[2px] ${isDayMode ? "bg-slate-100" : "bg-white/5"}`}
                            />
                            {/* Content Skeleton */}
                            <div className="flex flex-1 flex-col pt-4">
                                <div
                                    className={`mb-3 h-5 w-3/4 rounded-[2px] ${isDayMode ? "bg-slate-100" : "bg-white/10"}`}
                                />
                                <div className="flex gap-2 mb-4">
                                    <div
                                        className={`h-4 w-20 rounded-[2px] ${isDayMode ? "bg-slate-100" : "bg-white/5"}`}
                                    />
                                    <div
                                        className={`h-4 w-24 rounded-[2px] ${isDayMode ? "bg-slate-100" : "bg-white/5"}`}
                                    />
                                </div>
                                <div
                                    className={`mb-2 h-4 w-full rounded-[2px] ${isDayMode ? "bg-slate-100" : "bg-white/5"}`}
                                />
                                <div
                                    className={`h-4 w-2/3 rounded-[2px] ${isDayMode ? "bg-slate-100" : "bg-white/5"}`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            ) : isCollegeNoticeFilter && !isMobileViewport ? (
                <div className={`${EVENT_CONTENT_WIDTH_CLASS} flex flex-col gap-3`}>
                    {displayEvents.map((event, index) => (
                        <CollegeNoticeRow
                            key={event.id}
                            event={event}
                            index={index}
                            onClick={openEventFromList}
                            reduceMotion={shouldReduceCardMotion}
                            isDayMode={isDayMode}
                        />
                    ))}
                </div>
            ) : viewMode === "list" && !isMobileViewport ? (
                <div className={`${EVENT_CONTENT_WIDTH_CLASS} flex flex-col gap-3`}>
                    {displayEvents.map((event, index) => (
                        <EventListRow
                            key={event.id}
                            event={event}
                            index={index}
                            onClick={openEventFromList}
                            reduceMotion={shouldReduceCardMotion}
                            isDayMode={isDayMode}
                        />
                    ))}
                </div>
            ) : (
                <div className={`${EVENT_CARD_GRID_CLASS} ${EVENT_CONTENT_WIDTH_CLASS}`}>
                    {displayEvents.map((event, index) => (
                        <React.Fragment key={event.id}>
                            {isMobileViewport ? (
                                <MobileReferenceEventCard
                                    event={event}
                                    index={index}
                                    onClick={openEventFromList}
                                    reduceMotion={shouldReduceCardMotion}
                                    isDayMode={isDayMode}
                                />
                            ) : (
                                <EventCard
                                    event={event}
                                    index={index}
                                    onClick={openEventFromList}
                                    reduceMotion={shouldReduceCardMotion}
                                    isDayMode={isDayMode}
                                />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            )}

            {!loading && !error && displayEvents.length > 0 && !isPaginationEnabled && hasMore && (
                <div className="flex items-center justify-center pt-12">
                    <motion.button
                        whileHover={shouldReduceCardMotion ? undefined : { scale: 1.02 }}
                        whileTap={shouldReduceCardMotion ? undefined : { scale: 0.98 }}
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        className={`inline-flex items-center gap-2 border-b border-transparent px-2 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "text-blue-800 hover:border-blue-500/60 hover:text-blue-950" : "text-slate-200 hover:border-indigo-300/70 hover:text-white"}`}
                    >
                        {t("common.load_more", "加载更多")}
                        <ChevronDown size={16} />
                    </motion.button>
                </div>
            )}

            {!loading && displayEvents.length === 0 && (
                <div className="flex min-h-[52vh] flex-col items-center justify-center px-4 py-20 text-center md:min-h-[48vh] md:py-32">
                    <Calendar
                        size={54}
                        className={`mb-6 ${isDayMode ? "text-slate-300" : "text-white/25"}`}
                    />
                    <h3
                        className={`text-3xl font-bold mb-3 tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}
                    >
                        {t("events.no_events")}
                    </h3>
                    <p
                        className={`mb-8 max-w-md text-lg ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                    >
                        {debouncedSearch || Object.values(filters).some((v) => v) || partnerFilter
                            ? `${t("advanced_filter.clear", "清除所有筛选")} ${t("common.or", "或")} ${t("common.search", "搜索...")}`
                            : t("events.empty_desc")}
                    </p>
                    {Object.values(filters).some((v) => v) && (
                        <button
                            type="button"
                            onClick={() => {
                                setFilters({ category: null, target_audience: null });
                            }}
                            className={`rect-button-secondary mb-4 px-5 py-2 text-sm font-medium ${isDayMode ? "text-slate-700" : "text-white"}`}
                        >
                            {t("advanced_filter.clear", "清除所有筛选")}
                        </button>
                    )}
                    {!isMiniProgramMode && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                if (!user) {
                                    toast.error(t("auth.signin_required"));
                                    return;
                                }
                                setIsUploadOpen(true);
                            }}
                            className={`px-8 py-3.5 text-white font-bold transition-all flex items-center gap-3 ${isDayMode ? dayPrimaryActionClass : "rect-button-primary"}`}
                        >
                            <Plus size={20} />
                            {t("common.create_event")}
                        </motion.button>
                    )}
                </div>
            )}

            {isPaginationEnabled && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            )}

            {/* Event Details Modal */}
            {createPortal(
                <AnimatePresence>
                    {selectedEvent && (
                        <motion.div
                            initial={prefersReducedMotion ? false : { opacity: 0 }}
                            animate={prefersReducedMotion ? undefined : { opacity: 1 }}
                            exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                            transition={
                                prefersReducedMotion
                                    ? undefined
                                    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
                            }
                            role="dialog"
                            aria-modal="true"
                            aria-label={selectedEvent?.title || t("events.title")}
                            className={`event-detail-modal-root ${useMiniProgramModalScroll ? "event-detail-modal-root-miniapp" : ""} fixed inset-0 z-[140] flex justify-center p-0 md:items-center md:p-4 ${
                                useMiniProgramModalScroll
                                    ? "items-start overflow-hidden"
                                    : "items-end overflow-hidden md:overflow-y-auto"
                            } ${isDayMode ? "bg-white/[0.12] backdrop-blur-md" : "bg-black/80 backdrop-blur-md"}`}
                            onClick={closeEvent}
                        >
                            <motion.div
                                initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
                                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                                exit={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
                                transition={
                                    prefersReducedMotion
                                        ? undefined
                                        : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
                                }
                                className={`event-detail-modal-panel ${useMiniProgramModalScroll ? "event-detail-modal-panel-miniapp" : ""} w-full max-w-5xl overscroll-contain relative flex flex-col ${
                                    useMiniProgramModalScroll
                                        ? "min-h-[100dvh] max-h-[100dvh] rounded-none border-0 overflow-y-auto overflow-x-hidden touch-pan-y"
                                        : isMobileViewport
                                          ? "min-h-[100dvh] max-h-[100dvh] rounded-none border-0 overflow-hidden"
                                          : "min-h-[100dvh] md:min-h-0 max-h-[100dvh] md:max-h-[90vh] rounded-t-[7px] md:rounded-[7px] border-x-0 border-b-0 md:border overflow-hidden"
                                } ${isDayMode ? "bg-white border-slate-200/90 shadow-[0_24px_72px_rgba(15,23,42,0.16)]" : "bg-[#0f0f0f] border-white/10 shadow-2xl"}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {!isMobileViewport && (
                                    <button
                                        onClick={closeEvent}
                                        aria-label={t("common.close", "关闭")}
                                        className={`absolute right-5 top-5 h-12 w-12 rounded-lg border transition-all duration-300 z-40 group inline-flex items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${isDayMode ? `bg-white text-slate-700 border-slate-200 hover:bg-white focus-visible:ring-slate-400/70 focus-visible:ring-offset-white` : "bg-black/45 hover:bg-black/65 text-white border-white/10 hover:border-white/20 backdrop-blur-xl focus-visible:ring-white/60 focus-visible:ring-offset-[#0f0f0f]"}`}
                                    >
                                        <span
                                            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-all duration-300 ${isDayMode ? "bg-white border border-slate-200 group-hover:bg-white" : "bg-white/10 border border-white/10 group-hover:bg-white/15"}`}
                                        >
                                            <X
                                                size={20}
                                                className="group-hover:rotate-90 group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </span>
                                    </button>
                                )}
                                <div
                                    className={`event-detail-modal-scroll ${useMiniProgramModalScroll ? "event-detail-modal-scroll-miniapp" : ""} relative overscroll-contain custom-scrollbar ${
                                        useMiniProgramModalScroll
                                            ? "flex-none overflow-visible"
                                            : "flex-1 overflow-y-auto"
                                    }`}
                                >
                                    {!isMobileViewport && showLegacyHeaderImage && (
                                        <>
                                            {/* Modal Header Image */}
                                            <div
                                                className={`relative shrink-0 overflow-hidden h-80 sm:h-[27rem] ${isDayMode ? "border-b border-slate-200/70" : ""}`}
                                            >
                                                <SmartImage
                                                    src={selectedEvent.image}
                                                    alt={selectedEvent.title}
                                                    type="event"
                                                    className="w-full h-full"
                                                    imageClassName={`w-full h-full object-cover ${isDayMode ? "scale-[1.02] saturate-[1.05] contrast-[1.02]" : ""}`}
                                                    iconSize={64}
                                                />
                                                {!isDayMode && (
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/40 to-transparent" />
                                                )}

                                                <button
                                                    onClick={closeEvent}
                                                    aria-label={t("common.close", "关闭")}
                                                    className={`absolute right-4 top-4 sm:top-6 sm:right-6 h-11 w-11 sm:h-12 sm:w-12 rounded-lg border transition-all duration-300 z-30 group inline-flex items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${isDayMode ? `bg-white hover:bg-white text-slate-700 border-slate-200 focus-visible:ring-slate-400/70 focus-visible:ring-offset-white` : "bg-black/45 hover:bg-black/65 text-white border-white/10 hover:border-white/20 backdrop-blur-xl focus-visible:ring-white/60 focus-visible:ring-offset-[#0f0f0f]"}`}
                                                >
                                                    <span
                                                        className={`relative inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md transition-all duration-300 ${isDayMode ? "bg-white border border-slate-200 group-hover:bg-white" : "bg-white/10 border border-white/10 group-hover:bg-white/15"}`}
                                                    >
                                                        <X
                                                            size={20}
                                                            className="group-hover:rotate-90 group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    </span>
                                                </button>

                                                <div
                                                    className={`absolute bottom-0 left-0 w-full px-5 pt-12 pb-5 sm:px-10 sm:pt-16 sm:pb-8 z-10 ${isDayMode ? "bg-white" : "bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/90 to-transparent backdrop-blur-[2px]"}`}
                                                >
                                                    {/* Editorial Eyebrow: Date & Location & Status */}
                                                    <div className="flex justify-between items-end w-full mb-3 sm:mb-4">
                                                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                                                            <div
                                                                className={`px-3 sm:px-4 py-1.5 sm:py-2 border rounded-xl flex items-center gap-2 ${isDayMode ? "bg-white border-slate-200" : "bg-white/10 border-white/20 backdrop-blur-xl shadow-inner"}`}
                                                            >
                                                                <Calendar
                                                                    size={14}
                                                                    className={
                                                                        isDayMode
                                                                            ? "text-slate-700 sm:w-4 sm:h-4"
                                                                            : "text-white sm:w-4 sm:h-4"
                                                                    }
                                                                />
                                                                <span
                                                                    className={`font-bold text-xs sm:text-sm tracking-wide ${isDayMode ? "text-slate-700" : "text-white"}`}
                                                                >
                                                                    {formatDateTime(
                                                                        selectedEvent.date
                                                                    )}
                                                                </span>
                                                            </div>
                                                            {selectedEvent.location && (
                                                                <div
                                                                    className={`px-3 sm:px-4 py-1.5 sm:py-2 border rounded-xl flex items-center gap-2 ${isDayMode ? "bg-white border-slate-200/80 text-slate-600" : "bg-white/8 border-white/15 text-white/85 backdrop-blur-xl"}`}
                                                                >
                                                                    <MapPin
                                                                        size={14}
                                                                        className={`sm:w-4 sm:h-4 ${eventThemeAccent.accentText}`}
                                                                    />
                                                                    <span className="font-semibold text-xs sm:text-sm tracking-wide truncate max-w-[180px] sm:max-w-[240px]">
                                                                        {selectedEvent.location}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-end sm:justify-between">
                                                        <div className="max-w-full sm:max-w-[82%]">
                                                            <div
                                                                className={`inline-flex items-center gap-2 rounded-md px-3 py-1 mb-3 sm:mb-4 border ${isDayMode ? "bg-white border-slate-200 text-slate-500" : "bg-white/10 border-white/15 text-white/70"}`}
                                                            >
                                                                <span
                                                                    className={`h-1.5 w-1.5 rounded-full ${eventThemeAccent.dot}`}
                                                                />
                                                                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.24em]">
                                                                    {t("events.title")}
                                                                </span>
                                                            </div>
                                                            <h2
                                                                className={`text-2xl sm:text-4xl md:text-5xl font-black leading-[1.2] sm:leading-[1.08] tracking-tight ${isMobileViewport ? "max-w-[calc(100%-0.5rem)]" : ""} ${isDayMode ? "text-slate-950 [text-wrap:balance]" : "text-white"}`}
                                                            >
                                                                {selectedEvent.title}
                                                                <span
                                                                    className={`inline-flex items-center justify-center align-middle ml-3 sm:ml-4 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider border font-sans translate-y-[-0.1em] sm:translate-y-[-0.2em] ${isDayMode ? "ring-1 ring-white/50 shadow-none" : "backdrop-blur-md shadow-lg"} ${getStatusColor(getEventLifecycle(selectedEvent.date, selectedEvent.end_date, t), t, isDayMode)}`}
                                                                >
                                                                    {getEventLifecycle(
                                                                        selectedEvent.date,
                                                                        selectedEvent.end_date,
                                                                        t
                                                                    )}
                                                                </span>
                                                            </h2>
                                                            {selectedEvent.description && (
                                                                <p
                                                                    className={`mt-4 max-w-3xl text-sm sm:text-base leading-7 ${isDayMode ? "text-slate-600" : "text-white/75"}`}
                                                                >
                                                                    {selectedEvent.description}
                                                                </p>
                                                            )}
                                                            <div className="mt-4 flex flex-wrap items-center gap-2.5">
                                                                {selectedEvent.organizer &&
                                                                    (selectedOrganizerProfilePath ? (
                                                                        <RouterLink
                                                                            to={
                                                                                selectedOrganizerProfilePath
                                                                            }
                                                                            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 border text-xs sm:text-sm font-medium transition-colors ${isDayMode ? "bg-white text-slate-600 border-slate-200 hover:text-slate-950" : "bg-white/10 text-white/80 border-white/15 hover:text-white"}`}
                                                                        >
                                                                            <Building2
                                                                                size={14}
                                                                                className={
                                                                                    eventThemeAccent.accentText
                                                                                }
                                                                            />
                                                                            {
                                                                                selectedEvent.organizer
                                                                            }
                                                                            <OfficialVerificationBadge
                                                                                profile={organizerProfileFromEvent(
                                                                                    selectedEvent
                                                                                )}
                                                                                compact
                                                                                isDayMode={
                                                                                    isDayMode
                                                                                }
                                                                            />
                                                                        </RouterLink>
                                                                    ) : (
                                                                        <span
                                                                            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 border text-xs sm:text-sm font-medium ${isDayMode ? "bg-white text-slate-600 border-slate-200" : "bg-white/10 text-white/80 border-white/15"}`}
                                                                        >
                                                                            <Building2
                                                                                size={14}
                                                                                className={
                                                                                    eventThemeAccent.accentText
                                                                                }
                                                                            />
                                                                            {
                                                                                selectedEvent.organizer
                                                                            }
                                                                            <OfficialVerificationBadge
                                                                                profile={organizerProfileFromEvent(
                                                                                    selectedEvent
                                                                                )}
                                                                                compact
                                                                                isDayMode={
                                                                                    isDayMode
                                                                                }
                                                                            />
                                                                        </span>
                                                                    ))}
                                                                {selectedEvent.target_audience && (
                                                                    <span
                                                                        className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 border text-xs sm:text-sm font-medium ${isDayMode ? "bg-white text-slate-600 border-slate-200" : "bg-white/10 text-white/80 border-white/15"}`}
                                                                    >
                                                                        <Users
                                                                            size={14}
                                                                            className={
                                                                                eventThemeAccent.accentText
                                                                            }
                                                                        />
                                                                        {formatEventAudience(
                                                                            selectedEvent.target_audience
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-row justify-start sm:justify-end sm:flex-col items-start sm:items-end gap-3 shrink-0 mb-1">
                                                            <FavoriteButton
                                                                itemId={selectedEvent.id}
                                                                itemType="event"
                                                                size={24}
                                                                showCount={true}
                                                                count={selectedEvent.likes || 0}
                                                                favorited={selectedEvent.favorited}
                                                                testId="event-detail-favorite-desktop"
                                                                className={`p-3 rounded-md transition-all shrink-0 border ${isDayMode ? "bg-white hover:bg-white border-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md"}`}
                                                                onToggle={(favorited, likes) => {
                                                                    recordSelectedEventAssistantAction(
                                                                        favorited
                                                                            ? "favorite"
                                                                            : "unfavorite",
                                                                        {
                                                                            surface:
                                                                                "event_detail_desktop",
                                                                        }
                                                                    );
                                                                    setSelectedEvent((prev) => ({
                                                                        ...prev,
                                                                        likes:
                                                                            likes !== undefined
                                                                                ? likes
                                                                                : prev.likes,
                                                                        favorited,
                                                                    }));
                                                                    setEvents((prev) =>
                                                                        prev.map((e) =>
                                                                            e.id ===
                                                                            selectedEvent.id
                                                                                ? {
                                                                                      ...e,
                                                                                      likes:
                                                                                          likes !==
                                                                                          undefined
                                                                                              ? likes
                                                                                              : e.likes,
                                                                                      favorited,
                                                                                  }
                                                                                : e
                                                                        )
                                                                    );
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {isMobileViewport && (
                                        <div
                                            className={`relative border-b ${isDayMode ? "bg-white border-slate-200/70" : "bg-[#030817] border-white/10"}`}
                                        >
                                            <div className="relative h-[170px] overflow-hidden">
                                                <SmartImage
                                                    src={getEventCoverUrl(selectedEvent)}
                                                    alt={selectedEvent.title}
                                                    type="event"
                                                    className="absolute inset-0 h-full w-full"
                                                    imageClassName="h-full w-full object-cover"
                                                    priority
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#030817] via-black/20 to-black/45" />
                                                <button
                                                    type="button"
                                                    onClick={closeEvent}
                                                    aria-label={t(
                                                        "events.assistant.back_to_events",
                                                        "返回活动列表"
                                                    )}
                                                    className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 inline-flex h-9 w-9 items-center justify-center rounded-[6px] bg-black/35 text-white backdrop-blur-md"
                                                >
                                                    <ArrowLeft size={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={t("common.share", "分享")}
                                                    data-testid="event-detail-share-mobile"
                                                    onClick={handleShare}
                                                    className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 inline-flex h-9 w-9 items-center justify-center rounded-[6px] bg-black/35 text-white backdrop-blur-md"
                                                >
                                                    <Share2 size={17} />
                                                </button>
                                                <span className="absolute left-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 rounded-[5px] bg-black/62 px-2 py-1 text-[10px] font-black leading-4 text-white">
                                                    {
                                                        formatDateTime(selectedEvent.date).split(
                                                            " "
                                                        )[0]
                                                    }
                                                </span>
                                            </div>

                                            <div className="px-4 pb-4 pt-3">
                                                <div className="flex items-start gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <h2
                                                            className={`line-clamp-2 text-[1.05rem] font-black leading-6 tracking-tight ${isDayMode ? "text-slate-950" : "text-white"}`}
                                                        >
                                                            {selectedEvent.title}
                                                        </h2>
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {selectedEvent.category ? (
                                                                <span
                                                                    className={`rounded-[4px] px-2 py-0.5 text-[10px] font-bold ${isDayMode ? "bg-blue-50 text-blue-700" : "bg-white/8 text-indigo-100"}`}
                                                                >
                                                                    {formatEventCategory(
                                                                        selectedEvent.category
                                                                    )}
                                                                </span>
                                                            ) : null}
                                                            {selectedEvent.target_audience ? (
                                                                <span
                                                                    className={`rounded-[4px] px-2 py-0.5 text-[10px] font-bold ${isDayMode ? "bg-slate-100 text-slate-600" : "bg-white/8 text-slate-300"}`}
                                                                >
                                                                    {formatEventAudience(
                                                                        selectedEvent.target_audience
                                                                    )}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <FavoriteButton
                                                        itemId={selectedEvent.id}
                                                        itemType="event"
                                                        size={18}
                                                        showCount={false}
                                                        count={selectedEvent.likes || 0}
                                                        favorited={selectedEvent.favorited}
                                                        testId="event-detail-favorite-mobile"
                                                        className={`h-9 w-9 rounded-full border ${isDayMode ? "bg-white border-slate-200 text-slate-700" : "bg-white/10 border-white/10 text-white"}`}
                                                        onToggle={(favorited, likes) => {
                                                            recordSelectedEventAssistantAction(
                                                                favorited
                                                                    ? "favorite"
                                                                    : "unfavorite",
                                                                { surface: "event_detail_mobile" }
                                                            );
                                                            setSelectedEvent((prev) => ({
                                                                ...prev,
                                                                likes:
                                                                    likes !== undefined
                                                                        ? likes
                                                                        : prev.likes,
                                                                favorited,
                                                            }));
                                                            setEvents((prev) =>
                                                                prev.map((e) =>
                                                                    e.id === selectedEvent.id
                                                                        ? {
                                                                              ...e,
                                                                              likes:
                                                                                  likes !==
                                                                                  undefined
                                                                                      ? likes
                                                                                      : e.likes,
                                                                              favorited,
                                                                          }
                                                                        : e
                                                                )
                                                            );
                                                        }}
                                                    />
                                                </div>
                                                <div
                                                    className={`mt-3 space-y-2 text-xs ${isDayMode ? "text-slate-600" : "text-slate-300"}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={13} />
                                                        <span>
                                                            {formatDateTime(selectedEvent.date)}
                                                            {selectedEvent.end_date &&
                                                            !isSameDay(
                                                                selectedEvent.date,
                                                                selectedEvent.end_date
                                                            )
                                                                ? ` - ${formatDateTime(selectedEvent.end_date)}`
                                                                : ""}
                                                        </span>
                                                    </div>
                                                    {selectedEvent.location ? (
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={13} />
                                                            <span className="truncate">
                                                                {selectedEvent.location}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                    {selectedEvent.organizer ? (
                                                        <div className="flex items-center gap-2">
                                                            <Building2 size={13} />
                                                            <span className="truncate">
                                                                {selectedEvent.organizer}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                                {selectedEvent.description ? (
                                                    <p
                                                        className={`mt-4 text-xs leading-6 ${isDayMode ? "text-slate-600" : "text-white/75"}`}
                                                    >
                                                        {selectedEvent.description}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}

                                    {!isMobileViewport && (
                                        <div
                                            className={`relative px-8 pt-8 pb-6 border-b ${isDayMode ? "bg-white border-slate-200/70" : "bg-[#0f0f0f] border-white/10"}`}
                                        >
                                            <div className="pr-20 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                                                <div className="min-w-0 max-w-4xl">
                                                    <h2
                                                        className={`text-4xl xl:text-5xl font-black leading-[1.06] tracking-tight ${isDayMode ? "text-slate-950 [text-wrap:balance]" : "text-white"}`}
                                                    >
                                                        {selectedEvent.title}
                                                    </h2>

                                                    {selectedEvent.description && (
                                                        <p
                                                            className={`mt-4 max-w-3xl text-base leading-8 ${isDayMode ? "text-slate-600" : "text-white/75"}`}
                                                        >
                                                            {selectedEvent.description}
                                                        </p>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-2.5 mt-4">
                                                        <div
                                                            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 border ${isDayMode ? "bg-white border-slate-200 text-slate-700" : "bg-white/8 border-white/15 text-white/85"}`}
                                                        >
                                                            <Calendar
                                                                size={15}
                                                                className={
                                                                    eventThemeAccent.accentText
                                                                }
                                                            />
                                                            <span className="text-sm font-semibold tracking-wide">
                                                                {formatDateTime(selectedEvent.date)}
                                                                {selectedEvent.end_date &&
                                                                    !isSameDay(
                                                                        selectedEvent.date,
                                                                        selectedEvent.end_date
                                                                    ) &&
                                                                    ` - ${formatDateTime(selectedEvent.end_date)}`}
                                                            </span>
                                                        </div>
                                                        {selectedEvent.location && (
                                                            <button
                                                                type="button"
                                                                onClick={handleCopyLocation}
                                                                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 border text-sm font-semibold transition-colors ${isDayMode ? "bg-white border-slate-200 text-slate-700 hover:bg-white" : "bg-white/8 border-white/15 text-white/85 hover:bg-white/12"}`}
                                                            >
                                                                <MapPin
                                                                    size={15}
                                                                    className={
                                                                        eventThemeAccent.accentText
                                                                    }
                                                                />
                                                                <span className="truncate max-w-[320px]">
                                                                    {selectedEvent.location}
                                                                </span>
                                                                <Copy size={14} />
                                                            </button>
                                                        )}
                                                        <span
                                                            className={`inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${isDayMode ? "ring-1 ring-white/50" : ""} ${getStatusColor(getEventLifecycle(selectedEvent.date, selectedEvent.end_date, t), t, isDayMode)}`}
                                                        >
                                                            {getEventLifecycle(
                                                                selectedEvent.date,
                                                                selectedEvent.end_date,
                                                                t
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 flex-wrap items-center gap-3">
                                                    <FavoriteButton
                                                        itemId={selectedEvent.id}
                                                        itemType="event"
                                                        size={22}
                                                        showCount={true}
                                                        count={selectedEvent.likes || 0}
                                                        favorited={selectedEvent.favorited}
                                                        testId="event-detail-favorite-desktop"
                                                        className={`h-12 px-4 rounded-lg transition-all border ${isDayMode ? "bg-white hover:bg-white border-slate-200 text-slate-700" : "bg-white/10 hover:bg-white/20 border border-white/10 text-white backdrop-blur-md"}`}
                                                        onToggle={(favorited, likes) => {
                                                            recordSelectedEventAssistantAction(
                                                                favorited
                                                                    ? "favorite"
                                                                    : "unfavorite",
                                                                { surface: "event_detail_desktop" }
                                                            );
                                                            setSelectedEvent((prev) => ({
                                                                ...prev,
                                                                likes:
                                                                    likes !== undefined
                                                                        ? likes
                                                                        : prev.likes,
                                                                favorited,
                                                            }));
                                                            setEvents((prev) =>
                                                                prev.map((e) =>
                                                                    e.id === selectedEvent.id
                                                                        ? {
                                                                              ...e,
                                                                              likes:
                                                                                  likes !==
                                                                                  undefined
                                                                                      ? likes
                                                                                      : e.likes,
                                                                              favorited,
                                                                          }
                                                                        : e
                                                                )
                                                            );
                                                        }}
                                                    />
                                                    {selectedEvent.link ? (
                                                        <a
                                                            href={selectedEvent.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={() =>
                                                                recordSelectedEventAssistantAction(
                                                                    "register",
                                                                    {
                                                                        surface:
                                                                            "detail_link_desktop",
                                                                        href: selectedEvent.link,
                                                                    }
                                                                )
                                                            }
                                                            className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition-all group ${isDayMode ? eventThemeAccent.cta : "bg-indigo-500/90 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 backdrop-blur-md border border-white/10"}`}
                                                        >
                                                            {t("events.visit_link")}
                                                            <ExternalLink
                                                                size={17}
                                                                className="group-hover:translate-x-0.5 transition-transform"
                                                            />
                                                        </a>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Modal Content */}
                                    <div className="p-4 sm:p-8 pt-5 pb-[max(env(safe-area-inset-bottom),24px)] sm:pb-8">
                                        <div className="flex flex-col-reverse lg:flex-row gap-6">
                                            <div className="flex-1 space-y-4">
                                                <div
                                                    className={`rounded-lg p-5 sm:p-7 border h-full relative overflow-hidden ${isDayMode ? "bg-white border-slate-200/80" : "bg-white/5 border-white/5"}`}
                                                >
                                                    <div className="relative">
                                                        <div
                                                            className={`inline-flex items-center gap-2 rounded-md px-3 py-1 mb-4 border ${isDayMode ? "bg-white text-slate-500 border-slate-200/80" : "bg-white/10 text-white/70 border-white/10"}`}
                                                        >
                                                            <FileText
                                                                size={16}
                                                                className={
                                                                    eventThemeAccent.accentText
                                                                }
                                                            />
                                                            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
                                                                {t("common.description")}
                                                            </span>
                                                        </div>
                                                        <h3
                                                            className={`text-xl sm:text-2xl font-bold mb-4 ${isMobileViewport ? "" : "hidden"} ${isDayMode ? "text-slate-900" : "text-white"}`}
                                                        >
                                                            {selectedEvent.title}
                                                        </h3>
                                                        {/* Render HTML content safely */}
                                                        <div
                                                            className={`prose prose-lg max-w-none leading-relaxed ${isDayMode ? "prose-slate prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-800 prose-a:text-blue-700 prose-li:text-slate-600 text-slate-700" : "prose-invert text-gray-300"}`}
                                                            dangerouslySetInnerHTML={{
                                                                __html: DOMPurify.sanitize(
                                                                    selectedEvent.content ||
                                                                        `<p>${selectedEvent.description}</p>`
                                                                ),
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sidebar - Details & Link */}
                                            <div className="lg:w-[360px] xl:w-[400px] space-y-4">
                                                <div
                                                    className={`rounded-lg p-5 sm:p-6 border lg:sticky lg:top-8 space-y-5 relative overflow-hidden ${isDayMode ? "bg-white border-slate-200/80" : "bg-white/5 border-white/5"}`}
                                                >
                                                    {/* Key Attributes Grid */}
                                                    {selectedEvent.category && (
                                                        <div
                                                            className={`rounded-lg p-4 border ${isDayMode ? "bg-white border-blue-100/80" : "bg-white/[0.03] border-white/5 backdrop-blur-sm"}`}
                                                        >
                                                            <div
                                                                className={`flex items-center gap-2 mb-3 ${eventThemeAccent.accentText}`}
                                                            >
                                                                <Tag size={18} />
                                                                <span className="text-sm font-bold uppercase tracking-wider">
                                                                    {t("event_fields.category")}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                <span
                                                                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${isDayMode ? `bg-white text-slate-600 border-blue-100/80 ${eventThemeAccent.tagHover}` : "bg-white/5 text-gray-300 border-white/5 hover:bg-white/10"}`}
                                                                >
                                                                    {formatEventCategory(
                                                                        selectedEvent.category
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`h-px ${isDayMode ? "bg-slate-200" : "bg-gradient-to-r from-transparent via-white/10 to-transparent"}`}
                                                    />

                                                    {/* Detailed Info List */}
                                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                                        {selectedEventNoticeSource && (
                                                            <div
                                                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-blue-50/70 border-blue-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                                                            >
                                                                <div
                                                                    className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-blue-100 text-blue-700" : "bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/10"}`}
                                                                >
                                                                    <Building2
                                                                        size={18}
                                                                        className="sm:h-5 sm:w-5"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4
                                                                        className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                                                    >
                                                                        {t(
                                                                            "event_fields.source_college"
                                                                        )}
                                                                    </h4>
                                                                    <p
                                                                        className={`text-sm leading-snug break-words sm:text-base ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                                                                    >
                                                                        {selectedEventNoticeSource}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedEventNoticeTypeLabel && (
                                                            <div
                                                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-sky-50/70 border-sky-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                                                            >
                                                                <div
                                                                    className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-sky-100 text-sky-700" : "bg-purple-500/5 border border-purple-500/10 text-purple-400 group-hover:bg-purple-500/10"}`}
                                                                >
                                                                    <FileText
                                                                        size={18}
                                                                        className="sm:h-5 sm:w-5"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4
                                                                        className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                                                    >
                                                                        {t(
                                                                            "event_fields.notice_type"
                                                                        )}
                                                                    </h4>
                                                                    <p
                                                                        className={`text-sm leading-snug break-words sm:text-base ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                                                                    >
                                                                        {
                                                                            selectedEventNoticeTypeLabel
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div
                                                            className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-blue-50/70 border-blue-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                                                        >
                                                            <div
                                                                className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-blue-100 text-blue-700" : "bg-orange-500/5 border border-orange-500/10 text-orange-400 group-hover:bg-orange-500/10"}`}
                                                            >
                                                                <Calendar
                                                                    size={18}
                                                                    className="sm:h-5 sm:w-5"
                                                                />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4
                                                                    className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                                                >
                                                                    {t("events.date_label")}
                                                                </h4>
                                                                <span
                                                                    className={`block text-sm leading-snug sm:text-base ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                                                                >
                                                                    {formatDateTime(
                                                                        selectedEvent.date
                                                                    )}
                                                                    {selectedEvent.end_date &&
                                                                        !isSameDay(
                                                                            selectedEvent.date,
                                                                            selectedEvent.end_date
                                                                        ) &&
                                                                        `-${formatDateTime(selectedEvent.end_date)}`}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div
                                                            className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-sky-50/70 border-sky-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                                                        >
                                                            <div
                                                                className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-sky-100 text-sky-700" : "bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/10"}`}
                                                            >
                                                                <MapPin
                                                                    size={18}
                                                                    className="sm:h-5 sm:w-5"
                                                                />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h4
                                                                    className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                                                >
                                                                    {t("events.location_label")}
                                                                </h4>
                                                                <p
                                                                    className={`text-sm leading-snug break-words sm:text-base ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                                                                >
                                                                    {selectedEvent.location ||
                                                                        t("common.online")}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {selectedEvent.organizer && (
                                                            <div
                                                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-blue-50/70 border-blue-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                                                            >
                                                                <div
                                                                    className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-emerald-100 text-emerald-700" : "bg-green-500/5 border border-green-500/10 text-green-400 group-hover:bg-green-500/10"}`}
                                                                >
                                                                    <Building2
                                                                        size={18}
                                                                        className="sm:h-5 sm:w-5"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4
                                                                        className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                                                    >
                                                                        {t(
                                                                            "event_fields.organizer"
                                                                        )}
                                                                    </h4>
                                                                    {selectedOrganizerProfilePath ? (
                                                                        <RouterLink
                                                                            to={
                                                                                selectedOrganizerProfilePath
                                                                            }
                                                                            className={`inline-flex items-center gap-2 text-sm leading-snug break-words sm:text-base hover:underline ${isDayMode ? "text-slate-700 hover:text-slate-950" : "text-gray-200 hover:text-white"}`}
                                                                        >
                                                                            {
                                                                                selectedEvent.organizer
                                                                            }
                                                                            <OfficialVerificationBadge
                                                                                profile={organizerProfileFromEvent(
                                                                                    selectedEvent
                                                                                )}
                                                                                compact
                                                                                isDayMode={
                                                                                    isDayMode
                                                                                }
                                                                            />
                                                                        </RouterLink>
                                                                    ) : (
                                                                        <p
                                                                            className={`text-sm leading-snug break-words sm:text-base ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                                                                        >
                                                                            {
                                                                                selectedEvent.organizer
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedEvent.target_audience && (
                                                            <div
                                                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-white border-slate-200/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                                                            >
                                                                <div
                                                                    className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-slate-200 text-blue-700 group-hover:text-blue-800" : "bg-blue-500/5 border border-blue-500/10 text-blue-300 group-hover:bg-blue-500/10"}`}
                                                                >
                                                                    <Users
                                                                        size={18}
                                                                        className="sm:h-5 sm:w-5"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4
                                                                        className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                                                    >
                                                                        {t(
                                                                            "event_fields.target_audience"
                                                                        )}
                                                                    </h4>
                                                                    <p
                                                                        className={`text-sm leading-snug break-words sm:text-base ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                                                                    >
                                                                        {formatEventAudience(
                                                                            selectedEvent.target_audience
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedEvent.volunteer_time && (
                                                            <div
                                                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-emerald-50/70 border-emerald-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                                                            >
                                                                <div
                                                                    className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-emerald-100 text-emerald-700" : "bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/10"}`}
                                                                >
                                                                    <Clock
                                                                        size={18}
                                                                        className="sm:h-5 sm:w-5"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4
                                                                        className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                                                    >
                                                                        {t(
                                                                            "event_fields.volunteer_duration"
                                                                        )}
                                                                    </h4>
                                                                    <p
                                                                        className={`text-sm leading-snug break-words sm:text-base ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                                                                    >
                                                                        {
                                                                            selectedEvent.volunteer_time
                                                                        }
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {selectedEvent.score && (
                                                            <div
                                                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-amber-50/70 border-amber-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                                                            >
                                                                <div
                                                                    className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-amber-100 text-amber-700" : "bg-purple-500/5 border border-purple-500/10 text-purple-400 group-hover:bg-purple-500/10"}`}
                                                                >
                                                                    <Award
                                                                        size={18}
                                                                        className="sm:h-5 sm:w-5"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4
                                                                        className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                                                    >
                                                                        {t(
                                                                            "event_fields.score_label"
                                                                        )}
                                                                    </h4>
                                                                    <p
                                                                        className={`text-sm leading-snug break-words sm:text-base ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                                                                    >
                                                                        {selectedEvent.score}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            <UploadModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onUpload={handleUpload}
                type="event"
            />
        </section>
    );
};

export default Events;
