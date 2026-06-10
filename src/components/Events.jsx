import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  memo,
  useRef,
} from "react";
import { useMobileSortLabel } from "../hooks/useContentPage";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  X,
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
  Bookmark,
  ChevronRight,
  ChevronDown,
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
import { useBackClose } from "../hooks/useBackClose";
import { useCachedResource } from "../hooks/useCachedResource";
import EventFilterPanel from "./EventFilterPanel";
import SortSelector from "./SortSelector";
import EventAssistantPanel from "./EventAssistantPanel";
import MobileEventAssistantFullscreen, {
  MobileEventAssistantLauncher,
} from "./MobileEventAssistantFullscreen";
import DOMPurify from "dompurify";
import MobileContentToolbar from "./MobileContentToolbar";
import SEO from "./SEO";
import { getEventCategoryLabel } from "../data/eventTaxonomy";

import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { getThumbnailUrl } from "../utils/imageUtils";
import { useReducedMotion } from "../utils/animations";
import { getOrCreateSiteVisitorKey } from "../utils/visitorKey";

const getEventLifecycle = (date, endDate, t) => {
  if (!date) return t("events.status.unknown");
  try {
    const now = new Date();
    // For YYYY-MM-DD (no time), treat as local midnight by replacing - with /
    const startDate = new Date(
      date.includes("T") ? date : date.replace(/-/g, "/"),
    );

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
        return "bg-teal-50/80 text-teal-700 border-teal-200/70";
      case t("events.status.ongoing"):
        return "bg-sky-50/80 text-sky-700 border-sky-200/70 animate-pulse";
      case t("events.status.past"):
        return "bg-slate-100/80 text-slate-500 border-slate-200/80";
      default:
        return "bg-slate-100/80 text-slate-600 border-slate-200/80";
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

  // Check if time part exists (format: YYYY-MM-DDTHH:MM or YYYY-MM-DD HH:MM)
  if (dateStr.length > 10 && (dateStr[10] === "T" || dateStr[10] === " ")) {
    const timePart = dateStr.substring(11, 16); // HH:MM
    if (timePart && timePart !== "00:00") {
      return `${month}.${day} ${timePart}`;
    }
  }
  return `${month}.${day}`;
};

const getTimePart = (dateStr) => {
  if (!dateStr || dateStr.length <= 10) return "";
  const separator = dateStr[10];
  if (separator !== "T" && separator !== " ") return "";
  const timePart = dateStr.substring(11, 16);
  return timePart && timePart !== "00:00" ? timePart : "";
};

const formatEventTimeRange = (event) => {
  const start = formatDateTime(event?.date);
  if (!event?.end_date) return start;

  const endTime = getTimePart(event.end_date);
  if (isSameDay(event.date, event.end_date) && endTime) {
    return `${start}-${endTime}`;
  }

  const end = formatDateTime(event.end_date);
  return end ? `${start}-${end}` : start;
};

const EVENT_CATEGORY_TABS = [
  { value: null, label: "全部" },
  { value: "lecture", label: "讲座" },
  { value: "competition", label: "竞赛" },
  { value: "volunteer", label: "志愿" },
  { value: "recruitment", label: "招新" },
  { value: "culture_sports", label: "文体" },
  { value: "exchange", label: "交流" },
  { value: "other", label: "其他" },
];

const CAMPUS_QUICK_FILTERS = [
  { value: "zijingang", label: "紫金港", keywords: ["紫金港", "zijingang"] },
  { value: "yuquan", label: "玉泉", keywords: ["玉泉", "yuquan"] },
  { value: "xixi", label: "西溪", keywords: ["西溪", "xixi"] },
  { value: "huajiachi", label: "华家池", keywords: ["华家池", "huajiachi"] },
  { value: "zhijiang", label: "之江", keywords: ["之江", "zhijiang"] },
  {
    value: "haining",
    label: "海宁国际",
    keywords: ["海宁", "国际校区", "haining"],
  },
  { value: "zhoushan", label: "舟山", keywords: ["舟山", "zhoushan"] },
  {
    value: "online",
    label: "线上",
    keywords: ["线上", "在线", "直播", "腾讯会议", "zoom", "online"],
    type: "online",
  },
  { value: "offcampus", label: "校外", keywords: [], type: "offcampus" },
];

const OFF_CAMPUS_KEYWORDS = [
  "校外",
  "社区",
  "街道",
  "企业",
  "公司",
  "研究院",
  "园区",
  "文三路",
  "西湖区",
  "滨江",
  "余杭",
  "拱墅",
  "上城",
  "萧山",
  "临平",
];

const EVENT_SORT_OPTIONS = [
  { value: "newest", label: "最新发布" },
  { value: "date_asc", label: "日期最早" },
  { value: "date_desc", label: "日期最晚" },
  { value: "likes", label: "最多点赞" },
  { value: "title", label: "标题排序" },
];

const HERO_SLOT_COUNT = 3;
const HERO_SLOT_ROTATION_INTERVAL_MS = 3600;

const EVENT_CATEGORY_LABEL_MAP = {
  lecture: "讲座",
  competition: "竞赛",
  volunteer: "志愿",
  recruitment: "招新",
  culture_sports: "文体",
  exchange: "交流",
  other: "其他",
};

const EVENT_NEUTRAL_TONE = {
  badge: "border border-white/24 bg-slate-950/78 text-white shadow-[0_10px_24px_rgba(15,23,42,0.28)] backdrop-blur-sm",
  chip: "border-slate-200/80 bg-white/88 text-slate-600",
};

const EVENT_TONES = {
  lecture: {
    ...EVENT_NEUTRAL_TONE,
    label: "精选推荐",
  },
  competition: {
    ...EVENT_NEUTRAL_TONE,
    label: "竞赛训练",
  },
  volunteer: {
    ...EVENT_NEUTRAL_TONE,
    label: "志愿招募",
  },
  recruitment: {
    ...EVENT_NEUTRAL_TONE,
    label: "招新活动",
  },
  culture_sports: {
    ...EVENT_NEUTRAL_TONE,
    label: "文体活动",
  },
  exchange: {
    ...EVENT_NEUTRAL_TONE,
    label: "交流活动",
  },
  other: {
    ...EVENT_NEUTRAL_TONE,
    label: "活动推荐",
  },
};

const getDisplayCategoryLabel = (category) =>
  EVENT_CATEGORY_LABEL_MAP[category] || getEventCategoryLabel(category) || "活动";

const getEventToneKey = (category = "") => {
  const raw = String(category).toLowerCase();
  if (EVENT_TONES[raw]) return raw;
  if (raw.includes("讲") || raw.includes("报告") || raw.includes("lecture")) {
    return "lecture";
  }
  if (raw.includes("赛") || raw.includes("competition")) {
    return "competition";
  }
  if (raw.includes("志愿") || raw.includes("公益") || raw.includes("volunteer")) {
    return "volunteer";
  }
  if (raw.includes("招") || raw.includes("recruit")) {
    return "recruitment";
  }
  if (raw.includes("文") || raw.includes("体") || raw.includes("sport")) {
    return "culture_sports";
  }
  if (raw.includes("交流") || raw.includes("exchange")) {
    return "exchange";
  }
  return "other";
};

const getEventTone = (event) =>
  EVENT_TONES[getEventToneKey(event?.category)] || EVENT_TONES.other;

const uniqueEvents = (events) => {
  const seen = new Set();
  return events.filter((event) => {
    if (!event?.id || seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
};

const getEventLocationText = (event) =>
  `${event?.location || ""} ${event?.tags || ""}`.toLowerCase();

const hasAnyKeyword = (text, keywords = []) =>
  keywords.some((keyword) => text.includes(String(keyword).toLowerCase()));

const isOnlineEvent = (event) => {
  const text = getEventLocationText(event);
  return !String(event?.location || "").trim() || hasAnyKeyword(text, [
    "线上",
    "在线",
    "直播",
    "腾讯会议",
    "zoom",
    "online",
  ]);
};

const isKnownCampusEvent = (event) => {
  const text = getEventLocationText(event);
  return CAMPUS_QUICK_FILTERS.some(
    (campus) =>
      !campus.type &&
      hasAnyKeyword(text, campus.keywords),
  );
};

const matchesCampusFilter = (event, campusValue) => {
  if (!campusValue) return true;
  const campus = CAMPUS_QUICK_FILTERS.find((item) => item.value === campusValue);
  if (!campus) return true;

  if (campus.type === "online") return isOnlineEvent(event);
  if (campus.type === "offcampus") {
    const text = getEventLocationText(event);
    return (
      !isOnlineEvent(event) &&
      !isKnownCampusEvent(event) &&
      hasAnyKeyword(text, OFF_CAMPUS_KEYWORDS)
    );
  }

  return hasAnyKeyword(getEventLocationText(event), campus.keywords);
};

const VIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

const EVENT_THEME_VARIANTS = {
  cyan: {
    backdropGlow: "",
    heroGlow: "bg-slate-50",
    softGlow: "bg-cyan-50/70",
    accentText: "text-indigo-600",
    dot: "bg-cyan-500",
    surface: "bg-white/84 border border-slate-200/80",
    cta: "bg-indigo-600 text-white shadow-[0_12px_26px_rgba(79,70,229,0.12)] hover:bg-indigo-700 hover:shadow-[0_14px_30px_rgba(79,70,229,0.15)] hover:-translate-y-0.5 border border-indigo-600",
    highlightCard: "border-slate-200/90 bg-white/86 shadow-[0_16px_34px_rgba(15,23,42,0.07)]",
    iconShell: "bg-white/86 border-slate-200/80 text-indigo-600 shadow-[0_8px_18px_rgba(15,23,42,0.07)]",
    tagHover: "hover:border-indigo-200/80 hover:text-indigo-600",
  },
  pink: {
    backdropGlow: "",
    heroGlow: "bg-pink-50",
    softGlow: "bg-fuchsia-50",
    accentText: "text-rose-600",
    dot: "bg-rose-400",
    surface: "bg-white border border-pink-100/80",
    cta: "bg-indigo-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.12)] hover:bg-indigo-700 hover:-translate-y-0.5 border border-indigo-600",
    highlightCard: "border-pink-100/80 bg-white shadow-[0_8px_22px_rgba(236,72,153,0.055)]",
    iconShell: "bg-pink-50 border-pink-100 text-rose-600",
    tagHover: "hover:border-pink-200/80 hover:text-pink-600",
  },
  orange: {
    backdropGlow: "",
    heroGlow: "bg-pink-50",
    softGlow: "bg-violet-50",
    accentText: "text-amber-700",
    dot: "bg-amber-500",
    surface: "bg-white border border-pink-100/70",
    cta: "bg-indigo-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.12)] hover:bg-indigo-700 hover:-translate-y-0.5 border border-indigo-600",
    highlightCard: "border-pink-100/80 bg-white shadow-[0_8px_22px_rgba(236,72,153,0.045)]",
    iconShell: "bg-pink-50 border-pink-100 text-amber-700",
    tagHover: "hover:border-orange-200/80 hover:text-orange-600",
  },
  green: {
    backdropGlow: "",
    heroGlow: "bg-slate-50",
    softGlow: "bg-teal-50/70",
    accentText: "text-emerald-600",
    dot: "bg-emerald-400",
    surface: "bg-white/84 border border-slate-200/80",
    cta: "bg-indigo-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.12)] hover:bg-indigo-700 hover:-translate-y-0.5 border border-indigo-600",
    highlightCard: "border-slate-200/80 bg-white/86 shadow-[0_8px_22px_rgba(15,23,42,0.05)]",
    iconShell: "bg-teal-50/70 border-teal-100 text-emerald-600",
    tagHover: "hover:border-emerald-200/80 hover:text-emerald-600",
  },
  blue: {
    backdropGlow: "",
    heroGlow: "bg-slate-50",
    softGlow: "bg-indigo-50/70",
    accentText: "text-indigo-600",
    dot: "bg-indigo-500",
    surface: "bg-white/84 border border-slate-200/80",
    cta: "bg-indigo-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.12)] hover:bg-indigo-700 hover:-translate-y-0.5 border border-indigo-600",
    highlightCard: "border-slate-200/80 bg-white/86 shadow-[0_8px_22px_rgba(15,23,42,0.05)]",
    iconShell: "bg-indigo-50/70 border-indigo-100 text-indigo-600",
    tagHover: "hover:border-indigo-200/80 hover:text-indigo-600",
  },
  rose: {
    backdropGlow: "",
    heroGlow: "bg-pink-50",
    softGlow: "bg-fuchsia-50",
    accentText: "text-rose-600",
    dot: "bg-rose-400",
    surface: "bg-white border border-pink-100/80",
    cta: "bg-indigo-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.12)] hover:bg-indigo-700 hover:-translate-y-0.5 border border-indigo-600",
    highlightCard: "border-pink-100/80 bg-white shadow-[0_8px_22px_rgba(236,72,153,0.055)]",
    iconShell: "bg-pink-50 border-pink-100 text-rose-600",
    tagHover: "hover:border-rose-200/80 hover:text-rose-600",
  },
};

const EventMetaItem = ({ icon: Icon, children, className = "" }) => (
  <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
    <Icon size={14} className="shrink-0" />
    <span className="truncate">{children}</span>
  </span>
);

const FavoriteControl = ({ event, onToggleFavorite, isDayMode, compact = false }) => (
  <div
    className="shrink-0"
    onClick={(eventClick) => eventClick.stopPropagation()}
  >
    <FavoriteButton
      itemId={event.id}
      itemType="event"
      size={compact ? 14 : 15}
      showCount={true}
      count={event.likes || 0}
      favorited={event.favorited}
      initialFavorited={event.favorited}
      className={`min-h-8 px-1.5 text-xs transition-colors ${
        isDayMode
          ? "text-slate-500 hover:bg-slate-100/80 hover:text-slate-700"
          : "text-slate-300 hover:bg-white/10"
      }`}
      onToggle={(favorited, likes) =>
        onToggleFavorite(event.id, favorited, likes)
      }
    />
  </div>
);

const HeroEventCard = memo(({ event, index = 0, label, onClick, variant = "large" }) => {
  if (!event) return null;
  const tone = getEventTone(event);
  const isLarge = variant === "large";

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className={`group relative block w-full overflow-hidden rounded-lg bg-slate-900 text-left shadow-[0_18px_44px_rgba(15,23,42,0.13)] ring-1 ring-slate-900/5 transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
        isLarge
          ? "h-[238px] sm:h-[270px] lg:h-[314px]"
          : "h-[128px] sm:h-[140px] lg:h-[149px]"
      }`}
    >
      <SmartImage
        src={getThumbnailUrl(event.image)}
        alt={event.title}
        loading={index === 0 ? "eager" : "lazy"}
        priority={index < 3}
        placeholderTone="neutral"
        className="absolute inset-0 h-full w-full"
        imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/76 via-slate-900/30 to-slate-900/4" />
      <div className="absolute left-4 top-4 z-10">
        <span className={`inline-flex rounded-md px-3 py-1.5 text-[13px] font-bold ${tone.badge}`}>
          {label || tone.label}
        </span>
      </div>
      <div className={`absolute inset-x-0 bottom-0 z-10 ${isLarge ? "p-4 sm:p-5 lg:p-6" : "p-3.5 sm:p-4"}`}>
        <h3
          className={`max-w-[92%] font-bold leading-tight text-white/95 drop-shadow-[0_2px_10px_rgba(15,23,42,0.32)] ${
            isLarge ? "text-xl sm:text-2xl lg:text-[1.78rem]" : "text-base sm:text-lg"
          }`}
        >
          <span className="line-clamp-2">{event.title}</span>
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-white/82">
          <EventMetaItem icon={Clock}>{formatEventTimeRange(event)}</EventMetaItem>
          <EventMetaItem icon={MapPin}>{event.location || "线上"}</EventMetaItem>
        </div>
      </div>
    </button>
  );
});
HeroEventCard.displayName = "HeroEventCard";

const EventCard = memo(
  ({ event, index, onClick, onToggleFavorite, reduceMotion, isDayMode }) => {
    const { t } = useTranslation();
    const status = getEventLifecycle(event.date, event.end_date, t);
    const tone = getEventTone(event);
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
              delay: Math.min(index, 5) * 0.035,
            },
          },
          whileHover: { y: -2 },
        };

    return (
      <motion.article
        {...motionProps}
        onClick={() => onClick(event)}
        className={`rect-media-card glass-shine group relative flex min-h-[334px] cursor-pointer flex-col overflow-hidden rounded-lg border transition-[border-color,box-shadow,transform] duration-200 md:min-h-[356px] ${
          isDayMode
            ? "border-slate-200/70 bg-white/94 shadow-[0_18px_45px_rgba(15,23,42,0.07)] hover:border-slate-300/80 hover:shadow-[0_24px_58px_rgba(15,23,42,0.1)]"
            : "border-white/10 bg-[#080b14]/94 hover:border-white/18"
        }`}
      >
        <div className="relative h-44 overflow-hidden md:h-48">
          <SmartImage
            src={getThumbnailUrl(event.image)}
            alt={event.title}
            loading="lazy"
            priority={index < 3}
            placeholderTone="neutral"
            className="h-full w-full"
            imageClassName="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]"
          />
          <div
            className={`absolute inset-0 ${
              isDayMode
                ? "bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.12)_100%)]"
                : "bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.34)_100%)]"
            }`}
          />
          <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
            <span className={`rounded-md px-3 py-1.5 text-[13px] font-bold ${tone.badge}`}>
              {tone.label}
            </span>
            <span
              className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                isDayMode
                  ? "border-slate-200/80 bg-white/90 text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.06)]"
                  : "border-white/10 bg-black/34 text-slate-200"
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        <div
          className={`relative flex flex-1 flex-col px-4 pb-4 pt-3.5 ${
            isDayMode
              ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.94)_100%)]"
              : "bg-[linear-gradient(180deg,rgba(8,11,20,0.98)_0%,rgba(8,11,20,0.94)_100%)]"
          }`}
        >
          <div
            className={`pointer-events-none absolute inset-x-0 -top-10 h-10 ${
              isDayMode
                ? "bg-gradient-to-t from-white/98 to-white/0"
                : "bg-gradient-to-t from-[#080b14]/98 to-transparent"
            }`}
          />
          <h3
            className={`line-clamp-2 text-xl font-bold leading-snug tracking-normal ${
              isDayMode ? "text-slate-700" : "text-white"
            }`}
          >
            {event.title}
          </h3>

          <div
            className={`mt-3 space-y-1.5 text-sm font-medium ${
              isDayMode ? "text-slate-500" : "text-slate-300"
            }`}
          >
            <EventMetaItem icon={Clock}>{formatEventTimeRange(event)}</EventMetaItem>
            <EventMetaItem icon={MapPin}>{event.location || "线上"}</EventMetaItem>
            {event.organizer && (
              <EventMetaItem icon={Users}>{event.organizer}</EventMetaItem>
            )}
          </div>

          {event.description && (
            <p
              className={`mt-3 line-clamp-2 text-sm leading-6 ${
                isDayMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {event.description}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <span className={`inline-flex max-w-[11rem] items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${tone.chip}`}>
              <Tag size={12} className="shrink-0" />
              <span className="truncate">{getDisplayCategoryLabel(event.category)}</span>
            </span>
            <div className="flex items-center gap-2">
              <FavoriteControl
                event={event}
                onToggleFavorite={onToggleFavorite}
                isDayMode={isDayMode}
              />
              <Bookmark size={16} className={isDayMode ? "text-slate-500" : "text-slate-500"} />
            </div>
          </div>
        </div>
      </motion.article>
    );
  },
);
EventCard.displayName = "EventCard";

const CompactEventCard = memo(
  ({ event, index, onClick, onToggleFavorite, isDayMode }) => {
    const tone = getEventTone(event);

    return (
      <article
        onClick={() => onClick(event)}
        className={`group grid min-h-[126px] cursor-pointer grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-lg border text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 ${
          isDayMode
            ? "border-slate-200/80 bg-white/86 shadow-[0_8px_22px_rgba(15,23,42,0.045)] hover:border-slate-300/85 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
            : "border-white/10 bg-white/[0.045] hover:border-white/18"
        }`}
      >
        <div className="relative h-full min-h-[126px] overflow-hidden">
          <SmartImage
            src={getThumbnailUrl(event.image)}
            alt={event.title}
            loading="lazy"
            priority={index < 4}
            placeholderTone="neutral"
            className="absolute inset-0 h-full w-full"
            imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
        <div className="flex min-w-0 flex-col p-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`line-clamp-2 text-base font-semibold leading-snug ${
                isDayMode ? "text-slate-700" : "text-white"
              }`}
            >
              {event.title}
            </h3>
            <span className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold ${tone.chip}`}>
              {getDisplayCategoryLabel(event.category)}
            </span>
          </div>
          <div
            className={`mt-2 space-y-1 text-xs font-medium ${
              isDayMode ? "text-slate-600" : "text-slate-300"
            }`}
          >
            <EventMetaItem icon={Clock}>{formatEventTimeRange(event)}</EventMetaItem>
            <EventMetaItem icon={MapPin}>{event.location || "线上"}</EventMetaItem>
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className={isDayMode ? "text-xs font-medium text-slate-500" : "text-xs font-semibold text-slate-300"}>
              {event.target_audience || event.organizer || "校园活动"}
            </span>
            <FavoriteControl
              event={event}
              onToggleFavorite={onToggleFavorite}
              isDayMode={isDayMode}
              compact
            />
          </div>
        </div>
      </article>
    );
  },
);
CompactEventCard.displayName = "CompactEventCard";

const EventSectionHeader = ({ title, onViewAll, isDayMode }) => (
  <div className="mb-4 flex items-center justify-between gap-4">
    <h2
      className={`text-xl font-bold tracking-normal md:text-2xl ${
        isDayMode ? "text-slate-800" : "text-slate-100"
      }`}
    >
      {title}
    </h2>
    <button
      type="button"
      onClick={onViewAll}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${
        isDayMode
          ? "text-slate-500 hover:bg-slate-100/80 hover:text-slate-700"
          : "text-slate-400 hover:bg-white/8 hover:text-slate-100"
      }`}
    >
      查看全部
      <ChevronRight size={16} />
    </button>
  </div>
);

const EventsSkeleton = ({ isDayMode }) => (
  <div className="space-y-7">
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className={`h-[318px] animate-pulse rounded-lg border ${
            isDayMode
              ? "border-slate-200/80 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.045)]"
              : "border-white/10 bg-white/[0.055] shadow-[0_18px_42px_rgba(0,0,0,0.22)]"
          }`}
        >
          <div className={isDayMode ? "h-44 bg-slate-100" : "h-44 bg-white/8"} />
          <div className="space-y-3 p-4">
            <div className={isDayMode ? "h-5 w-3/4 rounded bg-slate-100" : "h-5 w-3/4 rounded bg-white/8"} />
            <div className={isDayMode ? "h-4 w-1/2 rounded bg-slate-100" : "h-4 w-1/2 rounded bg-white/8"} />
            <div className={isDayMode ? "h-4 w-2/3 rounded bg-slate-100" : "h-4 w-2/3 rounded bg-white/8"} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Events = () => {
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const { user } = useAuth();
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
  const [heroSlotIndices, setHeroSlotIndices] = useState(() =>
    Array.from({ length: HERO_SLOT_COUNT }, (_, index) => index),
  );
  const heroNextSlotRef = useRef(0);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [canRenderDesktopAssistant, setCanRenderDesktopAssistant] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth >= 1024 : false),
  );
  const shouldReduceCardMotion = prefersReducedMotion || isMobileViewport;
  const trackedViewTimestamps = useRef(new Map());
  const updateSelectedEventRecommendationContext = useCallback((context) => {
    selectedEventRecommendationContextRef.current = context;
    setSelectedEventRecommendationContext(context);
  }, []);
  const eventThemeAccent = useMemo(
    () => EVENT_THEME_VARIANTS[isDayMode ? "cyan" : "blue"],
    [isDayMode],
  );
  const showLegacyHeaderImage = false;

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
      const canShowDesktopAssistant = window.innerWidth >= 1024;
      setIsMobileViewport(isMobile);
      setCanRenderDesktopAssistant(canShowDesktopAssistant);
      if (!canShowDesktopAssistant) {
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
  const [campusFilter, setCampusFilter] = useState(null);
  const [campusCountEvents, setCampusCountEvents] = useState([]);
  const [filters, setFilters] = useState({
    category: null,
    target_audience: null,
  });
  const hasActiveMobileFilters = Object.values(filters).some((v) => v);
  const mobileSortLabel = useMobileSortLabel(sort, t);

  const resetMobileFilters = () => {
    setFilters({ category: null, target_audience: null });
  };

  const mobileFilterCount = Object.values(filters).filter(Boolean).length;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
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
  useBackClose(isMobileAssistantOpen, () => setIsMobileAssistantOpen(false));
  useBackClose(isDesktopAssistantOpen, () => setIsDesktopAssistantOpen(false));

  useEffect(() => {
    if (
      (!selectedEvent && !isMobileAssistantOpen) ||
      typeof document === "undefined"
    ) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedEvent, isMobileAssistantOpen]);

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
      ...filters,
    },
    {
      dependencies: [
        settings.pagination_enabled,
        debouncedSearch,
        JSON.stringify(filters),
      ],
    },
  );

  const totalPages = pagination?.totalPages || 1;
  const hasMore = !isPaginationEnabled && currentPage < totalPages;

  useEffect(() => {
    let cancelled = false;

    api
      .get("/events", {
        params: {
          page: 1,
          limit: 200,
          sort: "newest",
          status: "approved",
        },
        silent: true,
      })
      .then((res) => {
        if (cancelled) return;
        const nextEvents = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        setCampusCountEvents(nextEvents);
      })
      .catch(() => {
        if (!cancelled) setCampusCountEvents([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    sort,
    debouncedSearch,
    campusFilter,
    JSON.stringify(filters),
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
      api
        .get(`/events/${id}`)
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
        prev.map((event) =>
          event.id === eventId ? { ...event, views } : event,
        ),
      );

      setDisplayEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, views } : event,
        ),
      );

      setSelectedEvent((prev) =>
        prev && prev.id === eventId ? { ...prev, views } : prev,
      );
    },
    [setEvents, setDisplayEvents],
  );

  const recordSelectedEventAssistantAction = useCallback(
    async (actionType, metadata = {}) => {
      const selectedEventId = selectedEvent?.id;
      const recommendationContext =
        selectedEventRecommendationContextRef.current ||
        selectedEventRecommendationContext;

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
            recommendationRank:
              recommendationContext.recommendationRank || null,
            source: recommendationContext.source || "event_assistant_detail",
            visitorKey: getOrCreateSiteVisitorKey(),
            metadata: {
              surface: metadata.surface || "event_detail",
              nextAction: recommendationContext.nextAction || "",
              hrefHost,
            },
          },
          { silent: true },
        );
      } catch {
        // Recommendation attribution should never block the user's action.
      }
    },
    [selectedEvent?.id, selectedEventRecommendationContext],
  );

  useEffect(() => {
    if (
      !selectedEvent?.id ||
      user?.role === "admin" ||
      typeof window === "undefined"
    ) {
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
        0,
    );

    if (lastTrackedAt && now - lastTrackedAt < VIEW_DEDUPE_WINDOW_MS) {
      return undefined;
    }

    let cancelled = false;

    api
      .post(`/events/${eventId}/view`, { visitorKey })
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
      (selectedEvent.description || "") +
        "\n\n" +
        (selectedEvent.content || ""),
    );
    const location = encodeURIComponent(selectedEvent.location || "");
    const hasTime = (str) => str && str.length > 10 && str[10] === "T";

    let dates;
    if (hasTime(selectedEvent.date)) {
      // FIX: BUG-20 — Append Z for UTC to ensure correct timezone interpretation
      const toGCalDateTime = (str) =>
        str.substring(0, 16).replace(/-|:|T/g, "") + "00Z";
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
      const toICSDateTime = (str) =>
        str.substring(0, 16).replace(/-|:|T/g, "") + "00Z";
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
    const shareData = {
      title: selectedEvent.title,
      text: `${selectedEvent.title}\n${selectedEvent.date}\n${selectedEvent.location}\n\n${selectedEvent.description}`,
      url: window.location.href,
    };

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

  const handleCopyInfo = () => {
    if (!selectedEvent) return;
    const info = `${selectedEvent.title}\n${selectedEvent.date}\n${selectedEvent.location}\n\n${selectedEvent.description}`;
    navigator.clipboard
      .writeText(info)
      .then(() => toast.success(t("common.copied_to_clipboard")))
      .catch(() => toast.error(t("common.copy_failed")));
  };

  const addEvent = (newItem) => {
    api
      .post("/events", newItem)
      .then(() => {
        refresh({ clearCache: true });
      })
      .catch((err) => console.error("Failed to save event", err));
  };

  const handleUpload = (newItem) => {
    addEvent(newItem);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleFavorite = useCallback(
    (eventId, favorited, likes) => {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, likes: likes !== undefined ? likes : e.likes, favorited }
            : e,
        ),
      );

      setDisplayEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, likes: likes !== undefined ? likes : e.likes, favorited }
            : e,
        ),
      );

      setSelectedEvent((prev) => {
        if (prev && prev.id === eventId) {
          return {
            ...prev,
            likes: likes !== undefined ? likes : prev.likes,
            favorited,
          };
        }
        return prev;
      });
    },
    [setEvents, setSelectedEvent, setDisplayEvents],
  );

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

      api
        .get(`/events/${assistantEvent.id}`, { silent: true })
        .then((response) => {
          if (response.data) {
            updateSelectedEventRecommendationContext(recommendationContext);
            setSelectedEvent(response.data);
          }
        })
        .catch(() => {
          toast.error(
            t(
              "events.assistant.detail_error",
              "活动详情加载失败，请稍后再试。",
            ),
          );
        });
    },
    [displayEvents, events, t, updateSelectedEventRecommendationContext],
  );

  const dayPrimaryActionClass =
    "rect-button-primary border-slate-800 bg-slate-800 text-white shadow-[0_10px_22px_rgba(15,23,42,0.12)] hover:border-slate-700 hover:bg-slate-700";
  const primaryActionClass = isDayMode
    ? dayPrimaryActionClass
    : "rect-button-primary border-slate-300/70 bg-slate-100 text-slate-950 shadow-[0_14px_30px_rgba(0,0,0,0.24)] hover:border-white hover:bg-white";
  const activeCampusFilter = campusFilter;
  const baseVisibleEvents = Array.isArray(displayEvents) ? displayEvents : [];
  const visibleEvents = useMemo(
    () =>
      campusFilter
        ? baseVisibleEvents.filter((event) =>
            matchesCampusFilter(event, campusFilter),
          )
        : baseVisibleEvents,
    [baseVisibleEvents, campusFilter],
  );
  const campusCounts = useMemo(() => {
    const countSource = campusCountEvents.length
      ? campusCountEvents
      : baseVisibleEvents;

    return CAMPUS_QUICK_FILTERS.reduce((counts, campus) => {
      counts[campus.value] = countSource.filter((event) =>
        matchesCampusFilter(event, campus.value),
      ).length;
      return counts;
    }, {});
  }, [baseVisibleEvents, campusCountEvents]);
  const featuredEvents = useMemo(() => {
    const featured = visibleEvents.filter((event) => Number(event.featured) === 1);
    return uniqueEvents([...featured, ...visibleEvents]);
  }, [visibleEvents]);
  const featuredEventKey = useMemo(
    () => featuredEvents.map((event) => event.id).join("|"),
    [featuredEvents],
  );
  const heroSlotCount = Math.min(HERO_SLOT_COUNT, featuredEvents.length);
  const normalizedHeroSlotIndices = useMemo(() => {
    if (!heroSlotCount) return [];

    return Array.from({ length: heroSlotCount }, (_, slotIndex) => {
      const rawIndex = heroSlotIndices[slotIndex];
      if (!Number.isInteger(rawIndex)) {
        return slotIndex % featuredEvents.length;
      }
      return ((rawIndex % featuredEvents.length) + featuredEvents.length) % featuredEvents.length;
    });
  }, [featuredEvents.length, heroSlotCount, heroSlotIndices]);
  const heroSlotEvents = normalizedHeroSlotIndices
    .map((eventIndex) => featuredEvents[eventIndex])
    .filter(Boolean);
  const heroMainEvent = heroSlotEvents[0] || null;
  const heroSideEvents = heroSlotEvents.slice(1);
  useEffect(() => {
    heroNextSlotRef.current = 0;
    setHeroSlotIndices(Array.from({ length: HERO_SLOT_COUNT }, (_, index) => index));
  }, [featuredEventKey]);
  useEffect(() => {
    const eventCount = featuredEvents.length;
    const slotCount = Math.min(HERO_SLOT_COUNT, eventCount);
    if (eventCount <= 1) return undefined;

    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      setHeroSlotIndices((currentIndices) => {
        const normalizedIndices = Array.from({ length: slotCount }, (_, slotIndex) => {
          const rawIndex = currentIndices[slotIndex];
          if (!Number.isInteger(rawIndex)) return slotIndex % eventCount;
          return ((rawIndex % eventCount) + eventCount) % eventCount;
        });
        const slotToUpdate = heroNextSlotRef.current % slotCount;
        heroNextSlotRef.current = (heroNextSlotRef.current + 1) % slotCount;

        if (eventCount <= slotCount) {
          const slotToSwap = (slotToUpdate + 1) % slotCount;
          const nextIndices = [...normalizedIndices];
          [nextIndices[slotToUpdate], nextIndices[slotToSwap]] = [
            nextIndices[slotToSwap],
            nextIndices[slotToUpdate],
          ];
          return nextIndices;
        }

        const occupiedIndices = new Set(
          normalizedIndices.filter((_, slotIndex) => slotIndex !== slotToUpdate),
        );
        const currentIndex = normalizedIndices[slotToUpdate];
        let nextIndex = (currentIndex + 1) % eventCount;

        for (let attempt = 0; attempt < eventCount; attempt += 1) {
          if (nextIndex !== currentIndex && !occupiedIndices.has(nextIndex)) {
            const nextIndices = [...normalizedIndices];
            nextIndices[slotToUpdate] = nextIndex;
            return nextIndices;
          }
          nextIndex = (nextIndex + 1) % eventCount;
        }

        return currentIndices;
      });
    };
    const timer = window.setInterval(tick, HERO_SLOT_ROTATION_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [featuredEvents.length]);
  const weeklyEvents = (featuredEvents.length ? featuredEvents : visibleEvents).slice(0, 3);
  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    const futureEvents = visibleEvents
      .filter((event) => {
        if (!event?.date) return false;
        const normalizedDate = String(event.date).includes("T")
          ? event.date
          : String(event.date).replace(/-/g, "/");
        const time = new Date(normalizedDate).getTime();
        return !Number.isNaN(time) && time >= now;
      })
      .sort((a, b) => {
        const aTime = new Date(String(a.date).replace(/-/g, "/")).getTime();
        const bTime = new Date(String(b.date).replace(/-/g, "/")).getTime();
        return aTime - bTime;
      });

    return (futureEvents.length ? futureEvents : visibleEvents).slice(0, 3);
  }, [visibleEvents]);
  const latestEvents = visibleEvents.slice(0, 4);
  const clearAllDesktopFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearch("");
    setCampusFilter(null);
    setFilters({ category: null, target_audience: null });
  }, []);
  const openEventDetail = useCallback(
    (nextEvent) => {
      updateSelectedEventRecommendationContext(null);
      setSelectedEvent(nextEvent);
    },
    [updateSelectedEventRecommendationContext],
  );
  const applyCampusFilter = useCallback(
    (value) => {
      setCampusFilter((currentValue) =>
        currentValue === value ? null : value,
      );
    },
    [],
  );

  const mobileHeroTitleClass = isDayMode ? "text-slate-800" : "text-slate-100";
  const mobileHeroCopyClass = isDayMode ? "text-slate-500" : "text-slate-400";
  const desktopHeroTitleClass = isDayMode ? "text-slate-800" : "text-slate-100";
  const desktopHeroAccentClass = isDayMode ? "text-slate-700" : "text-slate-200";
  const desktopHeroCopyClass = isDayMode ? "text-slate-600" : "text-slate-400";
  const searchShellClass = isDayMode
    ? "border-slate-200/80 bg-white/86 shadow-[0_10px_28px_rgba(15,23,42,0.055)]"
    : "border-white/10 bg-white/[0.065] shadow-[0_16px_36px_rgba(0,0,0,0.2)]";
  const heroControlWidthClass = "w-full max-w-[34rem] xl:max-w-[36rem]";
  const campusControlWidthClass = "w-full max-w-full xl:max-w-[36rem]";
  const searchInputClass = isDayMode
    ? "text-slate-700 placeholder:text-slate-400"
    : "text-slate-100 placeholder:text-slate-500";
  const quietIconButtonClass = isDayMode
    ? "text-slate-400 hover:bg-slate-100/80 hover:text-slate-600 focus-visible:ring-indigo-300"
    : "text-slate-500 hover:bg-white/8 hover:text-slate-200 focus-visible:ring-slate-500/70";
  const searchButtonClass = isDayMode
    ? "text-slate-600 hover:bg-slate-100/80 hover:text-slate-700 focus-visible:ring-slate-300"
    : "text-slate-300 hover:bg-white/8 hover:text-white focus-visible:ring-slate-500/70";
  const campusFilterButtonClass = (active) =>
    active
      ? isDayMode
        ? "border-slate-300/85 bg-slate-100/80 text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
        : "border-slate-500/50 bg-white/[0.095] text-slate-100 shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
      : isDayMode
        ? "border-slate-200/80 bg-white/76 text-slate-600 hover:border-slate-300/85 hover:text-slate-700"
        : "border-white/10 bg-white/[0.045] text-slate-400 hover:border-slate-500/45 hover:bg-white/[0.075] hover:text-slate-100";
  const campusCountClass = (active) =>
    active
      ? isDayMode
        ? "bg-white/80 text-slate-600"
        : "bg-white/12 text-slate-200"
      : isDayMode
        ? "bg-slate-100 text-slate-500"
        : "bg-white/8 text-slate-500";
  const categoryTabClass = (active) =>
    active
      ? isDayMode
        ? "border-slate-300/85 bg-slate-100/85 text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.06)]"
        : "border-slate-500/50 bg-white/[0.095] text-slate-100 shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
      : isDayMode
        ? "border-transparent bg-white/76 text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-700"
        : "border-transparent bg-white/[0.035] text-slate-400 hover:border-white/10 hover:bg-white/[0.07] hover:text-slate-100";
  const desktopDividerClass = isDayMode ? "border-slate-200/70" : "border-white/10";
  const resetButtonClass = isDayMode
    ? "text-slate-500 hover:bg-slate-100/80 hover:text-slate-700 focus-visible:ring-slate-300"
    : "text-slate-400 hover:bg-white/8 hover:text-slate-100 focus-visible:ring-slate-500/70";
  const sortShellClass = isDayMode
    ? "border-slate-200/80 bg-white/82 text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.035)]"
    : "border-white/10 bg-white/[0.055] text-slate-300 shadow-[0_14px_28px_rgba(0,0,0,0.18)]";
  const sortIconClass = isDayMode ? "text-slate-400" : "text-slate-500";
  const activeLocationValue = activeCampusFilter;
  const emptyPanelClass = isDayMode
    ? "border-slate-200/80 bg-white text-slate-800 shadow-[0_10px_26px_rgba(15,23,42,0.045)]"
    : "border-white/10 bg-white/[0.055] text-slate-100 shadow-[0_18px_42px_rgba(0,0,0,0.24)]";
  const emptyIconShellClass = isDayMode
    ? "border-slate-200 bg-slate-50 text-slate-400"
    : "border-white/10 bg-white/[0.055] text-slate-500";
  const loadMoreButtonClass = isDayMode
    ? "border-slate-200 bg-white/86 text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:text-slate-700 focus-visible:ring-slate-300"
    : "border-white/10 bg-white/[0.055] text-slate-300 shadow-[0_12px_26px_rgba(0,0,0,0.18)] hover:border-slate-500/45 hover:bg-white/[0.08] hover:text-slate-100 focus-visible:ring-slate-500/70";

  return (
    <section className="day-page-theme day-page-theme-events relative flex-grow overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-[calc(env(safe-area-inset-top)+76px)] md:px-8 md:pb-20 md:pt-24">
      <SEO
        title="活动"
        description="浏览浙江大学校内活动、志愿服务、讲座与报名信息。"
      />
      {null}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="relative z-40 mx-auto mb-6 max-w-[1360px] text-center md:mb-9 md:pt-0"
      >
        <div className="md:hidden mb-4 text-left">
          <h1 className={`text-3xl font-bold leading-tight tracking-normal ${mobileHeroTitleClass}`}>
            发现精彩活动
          </h1>
          <p className={`mt-2 text-sm font-medium leading-6 ${mobileHeroCopyClass}`}>
            探索讲座、竞赛、志愿、招新与文体活动。
          </p>
        </div>
        <MobileContentToolbar
          isDayMode={isDayMode}
          resultCount={visibleEvents.length}
          sortLabel={mobileSortLabel}
          filterCount={mobileFilterCount}
          onOpenSort={() => {
            setIsMobileFilterOpen(false);
            setIsMobileSortOpen(true);
          }}
          onOpenFilter={() => {
            setIsMobileSortOpen(false);
            setIsMobileFilterOpen(true);
          }}
          onClearFilters={resetMobileFilters}
          clearLabel={t("common.clear_all", "重置")}
        />
        <MobileEventAssistantLauncher
          isDayMode={isDayMode}
          onOpen={() => {
            setIsMobileFilterOpen(false);
            setIsMobileSortOpen(false);
            setIsMobileAssistantOpen(true);
          }}
        />
        <div className="hidden md:block">
          <div className="grid items-start gap-6 lg:gap-8 xl:grid-cols-[minmax(360px,0.86fr)_minmax(620px,1.54fr)]">
            <div className="pt-2 text-left lg:pt-3">
              <h1 className={`max-w-[560px] text-4xl font-bold leading-tight tracking-normal lg:text-5xl xl:text-6xl ${desktopHeroTitleClass}`}>
                发现<span className={desktopHeroAccentClass}>精彩</span>活动
              </h1>
              <p className={`mt-4 max-w-[520px] text-base font-medium leading-7 lg:mt-5 lg:max-w-[470px] lg:text-lg lg:leading-8 ${desktopHeroCopyClass}`}>
                探索讲座、竞赛、志愿、招新与文体活动，连接兴趣同好，丰富你的校园生活。
              </p>

              <form
                className={`mt-5 flex h-[52px] ${heroControlWidthClass} items-center rounded-lg border pl-4 pr-2 backdrop-blur-xl lg:mt-6 lg:h-14 lg:pl-5 ${searchShellClass}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  setDebouncedSearch(searchQuery.trim());
                }}
              >
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className={`min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none ${searchInputClass}`}
                  placeholder="搜索活动名称、关键词或组织"
                  aria-label="搜索活动"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="清空搜索"
                    onClick={() => {
                      setSearchQuery("");
                      setDebouncedSearch("");
                    }}
                    className={`mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 ${quietIconButtonClass}`}
                  >
                    <X size={17} />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="搜索"
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors focus:outline-none focus-visible:ring-2 ${searchButtonClass}`}
                >
                  <Search size={22} />
                </button>
              </form>

              <div className={`-mx-1 mt-4 overflow-x-auto px-1 pb-2 scrollbar-none md:mx-0 md:overflow-visible md:px-0 md:pb-0 ${campusControlWidthClass}`}>
                <div className="flex w-max gap-2 md:w-auto md:flex-wrap md:gap-2.5">
                  {CAMPUS_QUICK_FILTERS.map((item) => {
                    const active = activeCampusFilter === item.value;
                    const count = campusCounts[item.value] || 0;
                    const showLocationPin = item.value === activeLocationValue;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => applyCampusFilter(item.value)}
                        className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${campusFilterButtonClass(active)}`}
                      >
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                          {showLocationPin && (
                            <MapPin
                              size={16}
                              className="transition-opacity duration-200"
                            />
                          )}
                        </span>
                        <span>{item.label}</span>
                        <span
                          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold ${campusCountClass(active)}`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 lg:h-[314px] lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.64fr)]">
              <motion.div
                key={heroMainEvent?.id || "hero-empty"}
                className="h-full"
                initial={shouldReduceCardMotion ? false : { opacity: 0.96, y: 2 }}
                animate={shouldReduceCardMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <HeroEventCard
                  event={heroMainEvent}
                  index={0}
                  label="本周精选"
                  onClick={openEventDetail}
                  variant="large"
                />
              </motion.div>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:h-[314px] lg:grid-cols-1 lg:grid-rows-2">
                {heroSideEvents.map((event, index) => (
                  <motion.div
                    key={`hero-side-slot-${index}-${event.id}`}
                    className="h-full"
                    initial={shouldReduceCardMotion ? false : { opacity: 0.96, y: 2 }}
                    animate={shouldReduceCardMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <HeroEventCard
                      event={event}
                      index={index + 1}
                      onClick={openEventDetail}
                      variant="small"
                    />
                  </motion.div>
                ))}
                {heroSideEvents.length === 0 && (
                  <div
                    className={`flex min-h-[142px] items-center justify-center rounded-lg border border-dashed text-sm font-semibold ${
                      isDayMode
                        ? "border-slate-200 bg-white/70 text-slate-400"
                        : "border-white/10 bg-white/[0.045] text-slate-500"
                    }`}
                  >
                    暂无更多推荐
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`mt-7 flex flex-col items-stretch gap-4 border-t pt-5 md:flex-row md:items-center md:justify-between md:gap-5 lg:mt-8 ${desktopDividerClass}`}>
            <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 pb-1 scrollbar-none md:mx-0 md:overflow-visible md:px-0 md:pb-0">
              <div className="flex w-max gap-2.5 md:w-auto md:flex-wrap md:gap-3">
                {EVENT_CATEGORY_TABS.map((tab) => {
                  const active = filters.category === tab.value;
                  return (
                    <button
                      key={tab.value || "all"}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setFilters((currentFilters) => ({
                          ...currentFilters,
                          category: tab.value,
                        }))
                      }
                      className={`min-h-10 shrink-0 rounded-md border px-4 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${categoryTabClass(active)}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-3">
              {(debouncedSearch || campusFilter || filters.category || filters.target_audience) && (
                <button
                  type="button"
                  onClick={clearAllDesktopFilters}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 ${resetButtonClass}`}
                >
                  重置
                </button>
              )}
              <label className={`relative inline-flex min-h-10 items-center rounded-md border pl-3 pr-9 text-sm font-semibold backdrop-blur-xl ${sortShellClass}`}>
                <SlidersHorizontal size={15} className={`mr-2 ${sortIconClass}`} />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="appearance-none bg-transparent pr-1 outline-none"
                  aria-label="活动排序"
                >
                  {EVENT_SORT_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className={isDayMode ? "bg-white text-slate-700" : "bg-slate-900 text-slate-100"}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className={`pointer-events-none absolute right-3 ${sortIconClass}`}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Mobile Filter Drawer (Bottom Sheet) */}
        {createPortal(
          <AnimatePresence>
            {isMobileFilterOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileFilterOpen(false)}
                  className={`fixed inset-0 backdrop-blur-sm z-[100] md:hidden ${isDayMode ? "bg-white/60" : "bg-black/60"}`}
                />
                <motion.div
                  initial={{ y: 36 }}
                  animate={{ y: 0 }}
                  exit={{ y: 36 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="events-mobile-filter-title"
                  className={`fixed inset-x-0 bottom-0 z-[101] mx-auto flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden border-x border-t transform-gpu md:hidden ${isDayMode ? "border-slate-200/80 bg-white shadow-[0_-18px_48px_rgba(148,163,184,0.18)]" : "border-white/10 bg-neutral-950 shadow-[0_-18px_48px_rgba(0,0,0,0.42)]"}`}
                >
                  <div
                    className={`shrink-0 border-b px-5 pb-3 pt-4 ${isDayMode ? "border-slate-200/80 bg-white" : "border-white/10 bg-neutral-950"}`}
                  >
                    <div className="mx-auto mb-3 h-px w-12 bg-slate-400/50" />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3
                          id="events-mobile-filter-title"
                          className={`text-[1.35rem] font-bold leading-tight ${isDayMode ? "text-slate-800" : "text-white"}`}
                        >
                          筛选活动
                        </h3>
                        <p
                          className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                        >
                          类型和对象会立即生效
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={t("common.close", "关闭")}
                        onClick={() => setIsMobileFilterOpen(false)}
                        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${isDayMode ? "bg-slate-100/80 text-slate-500 hover:text-slate-700" : "bg-white/10 text-gray-400 hover:text-white"}`}
                      >
                        <X size={20} />
                      </button>
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
                    />
                  </div>
                  <div
                    className={`shrink-0 border-t px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 ${isDayMode ? "border-slate-200/80 bg-white" : "border-white/10 bg-neutral-950"}`}
                  >
                    <div
                      className={`grid items-center gap-3 ${hasActiveMobileFilters ? "grid-cols-[0.82fr_1.18fr]" : "grid-cols-1"}`}
                    >
                      {hasActiveMobileFilters && (
                        <button
                          type="button"
                          aria-label={t("common.clear_all", "重置")}
                          onClick={resetMobileFilters}
                          className={`rect-button-secondary min-h-[52px] text-base font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${isDayMode ? "text-slate-600" : "text-gray-200"}`}
                        >
                          {t("common.clear_all", "重置")}
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={t("common.done", "完成")}
                        onClick={() => setIsMobileFilterOpen(false)}
                        className={`rect-button min-h-[52px] text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${primaryActionClass}`}
                      >
                        {t("common.done", "完成")}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}

        {createPortal(
          <MobileEventAssistantFullscreen
            isOpen={isMobileAssistantOpen}
            isDayMode={isDayMode}
            onClose={() => setIsMobileAssistantOpen(false)}
            onOpenEvent={handleOpenAssistantEvent}
          />,
          document.body,
        )}

        {canRenderDesktopAssistant && createPortal(
          <div className="pointer-events-none fixed inset-y-0 right-0 z-[90] hidden md:block">
            <div className="pointer-events-none absolute right-4 top-[calc(env(safe-area-inset-top)+104px)] hidden 2xl:block">
              <div className="pointer-events-auto flex h-[calc(100vh-136px)] w-[min(400px,calc(100vw-2rem))] flex-col">
                <EventAssistantPanel
                  isDayMode={isDayMode}
                  onOpenEvent={handleOpenAssistantEvent}
                  variant="rail"
                  className="h-full"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDesktopAssistantOpen(true)}
              aria-label={t("events.assistant.open_assistant", "打开 AI 活动助手")}
              className={`pointer-events-auto absolute bottom-8 right-6 hidden h-12 w-12 items-center justify-center rounded-lg border shadow-[0_14px_34px_rgba(15,23,42,0.12)] transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 lg:inline-flex xl:hidden ${
                isDayMode
                  ? "border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
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
                    className={`pointer-events-auto fixed inset-0 z-[91] hidden lg:block xl:hidden ${isDayMode ? "bg-white/50" : "bg-black/45"}`}
                  />
                  <motion.aside
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: "spring", damping: 30, stiffness: 340 }}
                    role="dialog"
                    aria-modal="true"
                    aria-label={t("events.assistant.mobile_title", "AI 活动助手")}
                    className="pointer-events-auto fixed right-4 top-[calc(env(safe-area-inset-top)+96px)] z-[92] hidden h-[calc(100vh-128px)] w-[min(400px,calc(100vw-2rem))] lg:block xl:hidden"
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
          document.body,
        )}

        {/* Mobile Sort Drawer (Bottom Sheet) */}
        {createPortal(
          <AnimatePresence>
            {isMobileSortOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileSortOpen(false)}
                  className={`fixed inset-0 backdrop-blur-sm z-[100] md:hidden ${isDayMode ? "bg-white/55" : "bg-black/60"}`}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 16 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="events-mobile-sort-title"
                  className={`fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit border z-[101] md:hidden flex flex-col max-w-sm mx-auto ${isDayMode ? "bg-white/95 border-slate-200/80 shadow-[0_20px_48px_rgba(148,163,184,0.18)]" : "bg-[#1a1a1a]/95 border-white/10 shadow-[0_18px_48px_rgba(0,0,0,0.42)]"}`}
                >
                  <div
                    className={`p-4 border-b flex justify-between items-center sticky top-0 z-10 ${isDayMode ? "border-slate-200/80 bg-white/92" : "border-white/10 bg-[#1a1a1a]/95"}`}
                  >
                    <div>
                      <h3
                        id="events-mobile-sort-title"
                        className={`text-lg font-semibold ${isDayMode ? "text-slate-800" : "text-white"}`}
                      >
                        {t("common.sort", "排序")}
                      </h3>
                      <p
                        className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                      >
                        {t("sort_filter.title", "选择活动排序方式")}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={t("common.close", "关闭")}
                      onClick={() => setIsMobileSortOpen(false)}
                      className={`rect-icon-button p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${isDayMode ? "text-slate-500 hover:text-slate-700" : "text-gray-400 hover:text-white"}`}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4">
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
            )}
          </AnimatePresence>,
          document.body,
        )}
      </motion.div>

      <div className="relative z-30 mx-auto max-w-[1360px] space-y-8">
        {error ? (
          <div
            className={`flex flex-col items-center justify-center rounded-lg border px-6 py-20 text-center ${
              isDayMode
                ? "border-red-100 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.045)]"
                : "border-red-500/20 bg-white/[0.055] shadow-[0_18px_42px_rgba(0,0,0,0.24)]"
            }`}
          >
            <AlertCircle
              size={48}
              className="mx-auto mb-4 text-red-400 opacity-70"
            />
            <p className={`mb-6 font-semibold ${isDayMode ? "text-slate-600" : "text-slate-300"}`}>
              {t("common.error_fetching_data", "获取数据失败")}
            </p>
            <button
              type="button"
              onClick={refresh}
              className={primaryActionClass}
            >
              {t("common.retry", "重试")}
            </button>
          </div>
        ) : loading && visibleEvents.length === 0 ? (
          <EventsSkeleton isDayMode={isDayMode} />
        ) : visibleEvents.length > 0 ? (
          <>
            <section>
              <EventSectionHeader
                title="本周精选"
                onViewAll={clearAllDesktopFilters}
                isDayMode={isDayMode}
              />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {weeklyEvents.map((event, index) => (
                  <EventCard
                    key={`weekly-${event.id}`}
                    event={event}
                    index={index}
                    onClick={openEventDetail}
                    onToggleFavorite={handleToggleFavorite}
                    reduceMotion={shouldReduceCardMotion}
                    isDayMode={isDayMode}
                  />
                ))}
              </div>
            </section>

            {upcomingEvents.length > 0 && (
              <section>
                <EventSectionHeader
                  title="即将开始"
                  onViewAll={clearAllDesktopFilters}
                  isDayMode={isDayMode}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {upcomingEvents.map((event, index) => (
                    <CompactEventCard
                      key={`upcoming-${event.id}`}
                      event={event}
                      index={index}
                      onClick={openEventDetail}
                      onToggleFavorite={handleToggleFavorite}
                      isDayMode={isDayMode}
                    />
                  ))}
                </div>
              </section>
            )}

            {latestEvents.length > 0 && (
              <section>
                <EventSectionHeader
                  title="最新发布"
                  onViewAll={clearAllDesktopFilters}
                  isDayMode={isDayMode}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {latestEvents.map((event, index) => (
                    <CompactEventCard
                      key={`latest-${event.id}`}
                      event={event}
                      index={index}
                      onClick={openEventDetail}
                      onToggleFavorite={handleToggleFavorite}
                      isDayMode={isDayMode}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className={`flex min-h-[48vh] flex-col items-center justify-center rounded-lg border px-4 py-20 text-center ${emptyPanelClass}`}>
            <div className={`mb-6 rounded-lg border p-8 ${emptyIconShellClass}`}>
              <Calendar size={58} />
            </div>
            <h3 className={`mb-3 text-3xl font-bold tracking-normal ${isDayMode ? "text-slate-800" : "text-slate-100"}`}>
              {t("events.no_events")}
            </h3>
            <p className={`mb-8 max-w-md text-base font-medium leading-7 ${isDayMode ? "text-slate-500" : "text-slate-400"}`}>
              {debouncedSearch || campusFilter || Object.values(filters).some((v) => v)
                ? "当前条件下没有匹配活动，重置筛选后再看看。"
                : "暂时没有可展示的活动，稍后再来看看吧。"}
            </p>
            {(debouncedSearch || campusFilter || Object.values(filters).some((v) => v)) && (
              <button
                type="button"
                onClick={clearAllDesktopFilters}
                className={`mb-3 rounded-md border px-5 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 ${loadMoreButtonClass}`}
              >
                重置筛选
              </button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (!user) {
                  toast.error(t("auth.signin_required"));
                  return;
                }
                setIsUploadOpen(true);
              }}
              className={primaryActionClass}
            >
              <Plus size={18} />
              {t("common.create_event")}
            </motion.button>
          </div>
        )}

        {!loading &&
          !error &&
          visibleEvents.length > 0 &&
          !isPaginationEnabled &&
          hasMore && (
            <div className="flex items-center justify-center pt-2">
              <motion.button
                whileHover={shouldReduceCardMotion ? undefined : { scale: 1.02 }}
                whileTap={shouldReduceCardMotion ? undefined : { scale: 0.98 }}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className={`rounded-md border px-6 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 ${loadMoreButtonClass}`}
              >
                {t("common.load_more", "加载更多")}
              </motion.button>
            </div>
          )}

        {isPaginationEnabled && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>

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
              className={`fixed inset-0 z-[140] flex items-end justify-center p-0 md:items-center md:p-4 backdrop-blur-md ${isDayMode ? "bg-white/82" : "bg-black/80"}`}
              onClick={closeEvent}
            >
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
                animate={
                  prefersReducedMotion ? undefined : { opacity: 1, y: 0 }
                }
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
                transition={
                  prefersReducedMotion
                    ? undefined
                    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
                }
                className={`w-full max-w-5xl overflow-hidden overscroll-contain shadow-2xl relative flex flex-col ${isMobileViewport ? "min-h-[100dvh] max-h-[100dvh] rounded-none border-0" : "min-h-[100dvh] md:min-h-0 max-h-[100dvh] md:max-h-[90vh] rounded-t-[7px] md:rounded-[7px] border-x-0 border-b-0 md:border"} ${isDayMode ? "bg-white border-slate-200/90 shadow-[0_28px_80px_rgba(15,23,42,0.14)]" : "bg-[#0f0f0f] border-white/10"}`}
                onClick={(e) => e.stopPropagation()}
              >
                {isDayMode && (
                  <div className="pointer-events-none absolute inset-0">
                    <div
                      className={`absolute inset-x-0 top-0 h-48 ${eventThemeAccent.backdropGlow}`}
                    />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                  </div>
                )}
                {!isMobileViewport && (
                  <button
                    onClick={closeEvent}
                    aria-label={t("common.close", "关闭")}
                    className={`absolute right-5 top-5 h-12 w-12 rounded-lg backdrop-blur-xl border transition-all duration-300 z-40 group inline-flex items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${isDayMode ? `bg-white/90 hover:bg-white text-slate-700 border-white/85 shadow-[0_16px_34px_rgba(15,23,42,0.14)] hover:shadow-[0_22px_42px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 focus-visible:ring-slate-400/70 focus-visible:ring-offset-white` : "bg-black/45 hover:bg-black/65 text-white border-white/10 hover:border-white/20 focus-visible:ring-white/60 focus-visible:ring-offset-[#0f0f0f]"}`}
                  >
                    {isDayMode && (
                      <>
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-lg opacity-90 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.16))]"
                        />
                        <span
                          aria-hidden="true"
                          className={`absolute inset-[1px] rounded-lg opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100 ${eventThemeAccent.heroGlow}`}
                        />
                      </>
                    )}
                    <span
                      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md transition-all duration-300 ${isDayMode ? "bg-white/70 border border-slate-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] group-hover:bg-white" : "bg-white/10 border border-white/10 group-hover:bg-white/15"}`}
                    >
                      <X
                        size={20}
                        className="group-hover:rotate-90 group-hover:scale-105 transition-transform duration-300"
                      />
                    </span>
                  </button>
                )}
                <div className="relative flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
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
                          placeholderTone="neutral"
                          className="w-full h-full"
                          imageClassName={`w-full h-full object-cover ${isDayMode ? "scale-[1.02] saturate-[1.05] contrast-[1.02]" : ""}`}
                          iconSize={64}
                        />
                        <div
                          className={`absolute inset-0 ${isDayMode ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0)_24%,rgba(255,255,255,0.12)_58%,rgba(255,255,255,0.92)_100%)]" : "bg-gradient-to-t via-transparent to-transparent from-[#0f0f0f] via-[#0f0f0f]/40"}`}
                        />
                        {isDayMode && (
                          <>
                            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/12 via-slate-950/0 to-transparent" />
                            <div
                              className={`absolute -bottom-12 right-0 h-44 w-44 rounded-full blur-3xl ${eventThemeAccent.heroGlow}`}
                            />
                            <div className="absolute left-8 top-10 h-28 w-28 rounded-full bg-white/18 blur-3xl" />
                          </>
                        )}

                        <button
                          onClick={closeEvent}
                          aria-label={t("common.close", "关闭")}
                          className={`absolute right-4 top-4 sm:top-6 sm:right-6 h-11 w-11 sm:h-12 sm:w-12 rounded-lg backdrop-blur-xl border transition-all duration-300 z-30 group inline-flex items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${isDayMode ? `bg-white/86 hover:bg-white text-slate-700 border-white/85 shadow-[0_16px_34px_rgba(15,23,42,0.14)] hover:shadow-[0_22px_42px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 focus-visible:ring-slate-400/70 focus-visible:ring-offset-white` : "bg-black/45 hover:bg-black/65 text-white border-white/10 hover:border-white/20 focus-visible:ring-white/60 focus-visible:ring-offset-[#0f0f0f]"}`}
                        >
                          {isDayMode && (
                            <>
                              <span
                                aria-hidden="true"
                                className={`absolute inset-0 rounded-lg opacity-90 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.16))]`}
                              />
                              <span
                                aria-hidden="true"
                                className={`absolute inset-[1px] rounded-lg opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100 ${eventThemeAccent.heroGlow}`}
                              />
                            </>
                          )}
                          <span
                            className={`relative inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md transition-all duration-300 ${isDayMode ? "bg-white/70 border border-slate-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] group-hover:bg-white" : "bg-white/10 border border-white/10 group-hover:bg-white/15"}`}
                          >
                            <X
                              size={20}
                              className="group-hover:rotate-90 group-hover:scale-105 transition-transform duration-300"
                            />
                          </span>
                        </button>

                        <div
                          className={`absolute bottom-0 left-0 w-full px-5 pt-12 pb-5 sm:px-10 sm:pt-16 sm:pb-8 z-10 backdrop-blur-[2px] ${isDayMode ? "bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.78)_24%,rgba(255,255,255,0.97)_60%,rgba(255,255,255,1)_100%)]" : "bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/90 to-transparent"}`}
                        >
                          {/* Editorial Eyebrow: Date & Location & Status */}
                          <div className="flex justify-between items-end w-full mb-3 sm:mb-4">
                            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                              <div
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 backdrop-blur-xl border rounded-xl shadow-inner flex items-center gap-2 ${isDayMode ? "bg-white/92 border-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_25px_rgba(15,23,42,0.08)]" : "bg-white/10 border-white/20"}`}
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
                                  {formatDateTime(selectedEvent.date)}
                                </span>
                              </div>
                              {selectedEvent.location && (
                                <div
                                  className={`px-3 sm:px-4 py-1.5 sm:py-2 backdrop-blur-xl border rounded-xl flex items-center gap-2 ${isDayMode ? "bg-white/72 border-slate-200/80 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)]" : "bg-white/8 border-white/15 text-white/85"}`}
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
                                className={`inline-flex items-center gap-2 rounded-md px-3 py-1 mb-3 sm:mb-4 border ${isDayMode ? "bg-white/80 border-white/80 text-slate-500 shadow-[0_10px_22px_rgba(15,23,42,0.08)]" : "bg-white/10 border-white/15 text-white/70"}`}
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
                                  className={`inline-flex items-center justify-center align-middle ml-3 sm:ml-4 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold uppercase tracking-wider border backdrop-blur-md font-sans shadow-lg translate-y-[-0.1em] sm:translate-y-[-0.2em] ${isDayMode ? "ring-1 ring-white/50" : ""} ${getStatusColor(getEventLifecycle(selectedEvent.date, selectedEvent.end_date, t), t, isDayMode)}`}
                                >
                                  {getEventLifecycle(
                                    selectedEvent.date,
                                    selectedEvent.end_date,
                                    t,
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
                                {selectedEvent.organizer && (
                                  <span
                                    className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 border text-xs sm:text-sm font-medium ${isDayMode ? "bg-white/82 text-slate-600 border-white/80 shadow-[0_10px_22px_rgba(15,23,42,0.06)]" : "bg-white/10 text-white/80 border-white/15"}`}
                                  >
                                    <Building2
                                      size={14}
                                      className={eventThemeAccent.accentText}
                                    />
                                    {selectedEvent.organizer}
                                  </span>
                                )}
                                {selectedEvent.target_audience && (
                                  <span
                                    className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 border text-xs sm:text-sm font-medium ${isDayMode ? "bg-white/82 text-slate-600 border-white/80 shadow-[0_10px_22px_rgba(15,23,42,0.06)]" : "bg-white/10 text-white/80 border-white/15"}`}
                                  >
                                    <Users
                                      size={14}
                                      className={eventThemeAccent.accentText}
                                    />
                                    {selectedEvent.target_audience}
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
                                className={`p-3 rounded-md backdrop-blur-md transition-all shrink-0 border ${isDayMode ? "bg-white/90 hover:bg-white border-white/80 text-slate-700 shadow-[0_14px_28px_rgba(15,23,42,0.1)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.16)]" : "bg-white/10 hover:bg-white/20 border border-white/10"}`}
                                onToggle={(favorited, likes) => {
                                  recordSelectedEventAssistantAction(
                                    favorited ? "favorite" : "unfavorite",
                                    { surface: "event_detail_desktop" },
                                  );
                                  setSelectedEvent((prev) => ({
                                    ...prev,
                                    likes:
                                      likes !== undefined ? likes : prev.likes,
                                    favorited,
                                  }));
                                  setEvents((prev) =>
                                    prev.map((e) =>
                                      e.id === selectedEvent.id
                                        ? {
                                            ...e,
                                            likes:
                                              likes !== undefined
                                                ? likes
                                                : e.likes,
                                            favorited,
                                          }
                                        : e,
                                    ),
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
                      className={`relative px-4 pt-5 pb-4 border-b ${isDayMode ? "bg-white border-slate-200/70" : "bg-[#0f0f0f] border-white/10"}`}
                    >
                      <button
                        onClick={closeEvent}
                        aria-label={t("common.close", "关闭")}
                        className={`absolute right-4 top-4 h-11 w-11 rounded-lg backdrop-blur-xl border transition-all duration-300 z-30 group inline-flex items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer ${isDayMode ? `bg-white/86 hover:bg-white text-slate-700 border-white/85 shadow-[0_16px_34px_rgba(15,23,42,0.14)] hover:shadow-[0_22px_42px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 focus-visible:ring-slate-400/70 focus-visible:ring-offset-white` : "bg-black/45 hover:bg-black/65 text-white border-white/10 hover:border-white/20 focus-visible:ring-white/60 focus-visible:ring-offset-[#0f0f0f]"}`}
                      >
                        {isDayMode && (
                          <>
                            <span
                              aria-hidden="true"
                              className="absolute inset-0 rounded-lg opacity-90 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.16))]"
                            />
                            <span
                              aria-hidden="true"
                              className={`absolute inset-[1px] rounded-lg opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100 ${eventThemeAccent.heroGlow}`}
                            />
                          </>
                        )}
                        <span
                          className={`relative inline-flex h-8 w-8 items-center justify-center rounded-md transition-all duration-300 ${isDayMode ? "bg-white/70 border border-slate-200/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] group-hover:bg-white" : "bg-white/10 border border-white/10 group-hover:bg-white/15"}`}
                        >
                          <X
                            size={20}
                            className="group-hover:rotate-90 group-hover:scale-105 transition-transform duration-300"
                          />
                        </span>
                      </button>
                      <div className="pr-14">
                        <div className="min-w-0">
                          <h2
                            className={`text-[1.7rem] font-black leading-[1.15] tracking-tight ${isDayMode ? "text-slate-950" : "text-white"}`}
                          >
                            {selectedEvent.title}
                          </h2>
                          {selectedEvent.link ? (
                            <a
                              href={selectedEvent.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                recordSelectedEventAssistantAction("register", {
                                  surface: "detail_link_mobile",
                                  href: selectedEvent.link,
                                })
                              }
                              className={`mt-3 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all group ${isDayMode ? eventThemeAccent.cta : "bg-indigo-500/90 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 backdrop-blur-md border border-white/10"}`}
                            >
                              {t("events.visit_link")}
                              <ExternalLink
                                size={16}
                                className="group-hover:translate-x-0.5 transition-transform"
                              />
                            </a>
                          ) : null}
                        </div>
                      </div>

                      {selectedEvent.description && (
                        <p
                          className={`mt-4 text-sm leading-7 ${isDayMode ? "text-slate-600" : "text-white/75"}`}
                        >
                          {selectedEvent.description}
                        </p>
                      )}

                      <div className="mt-4 flex justify-start">
                        <FavoriteButton
                          itemId={selectedEvent.id}
                          itemType="event"
                          size={24}
                          showCount={true}
                          count={selectedEvent.likes || 0}
                          favorited={selectedEvent.favorited}
                          testId="event-detail-favorite-mobile"
                          className={`p-3 rounded-md backdrop-blur-md transition-all shrink-0 border ${isDayMode ? "bg-white/90 hover:bg-white border-white/80 text-slate-700 shadow-[0_14px_28px_rgba(15,23,42,0.1)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.16)]" : "bg-white/10 hover:bg-white/20 border border-white/10"}`}
                          onToggle={(favorited, likes) => {
                            recordSelectedEventAssistantAction(
                              favorited ? "favorite" : "unfavorite",
                              { surface: "event_detail_mobile" },
                            );
                            setSelectedEvent((prev) => ({
                              ...prev,
                              likes: likes !== undefined ? likes : prev.likes,
                              favorited,
                            }));
                            setEvents((prev) =>
                              prev.map((e) =>
                                e.id === selectedEvent.id
                                  ? {
                                      ...e,
                                      likes:
                                        likes !== undefined ? likes : e.likes,
                                      favorited,
                                    }
                                  : e,
                              ),
                            );
                          }}
                        />
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
                              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 border ${isDayMode ? "bg-white border-slate-200 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]" : "bg-white/8 border-white/15 text-white/85"}`}
                            >
                              <Calendar
                                size={15}
                                className={eventThemeAccent.accentText}
                              />
                              <span className="text-sm font-semibold tracking-wide">
                                {formatDateTime(selectedEvent.date)}
                                {selectedEvent.end_date &&
                                  !isSameDay(
                                    selectedEvent.date,
                                    selectedEvent.end_date,
                                  ) &&
                                  ` - ${formatDateTime(selectedEvent.end_date)}`}
                              </span>
                            </div>
                            {selectedEvent.location && (
                              <button
                                type="button"
                                onClick={handleCopyLocation}
                                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 border text-sm font-semibold transition-colors ${isDayMode ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50" : "bg-white/8 border-white/15 text-white/85 hover:bg-white/12"}`}
                              >
                                <MapPin
                                  size={15}
                                  className={eventThemeAccent.accentText}
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
                                t,
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
                            className={`h-12 px-4 rounded-lg backdrop-blur-md transition-all border ${isDayMode ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)]" : "bg-white/10 hover:bg-white/20 border border-white/10 text-white"}`}
                            onToggle={(favorited, likes) => {
                              recordSelectedEventAssistantAction(
                                favorited ? "favorite" : "unfavorite",
                                { surface: "event_detail_desktop" },
                              );
                              setSelectedEvent((prev) => ({
                                ...prev,
                                likes: likes !== undefined ? likes : prev.likes,
                                favorited,
                              }));
                              setEvents((prev) =>
                                prev.map((e) =>
                                  e.id === selectedEvent.id
                                    ? {
                                        ...e,
                                        likes:
                                          likes !== undefined ? likes : e.likes,
                                        favorited,
                                      }
                                    : e,
                                ),
                              );
                            }}
                          />
                          {selectedEvent.link ? (
                            <a
                              href={selectedEvent.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                recordSelectedEventAssistantAction("register", {
                                  surface: "detail_link_desktop",
                                  href: selectedEvent.link,
                                })
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
                          className={`rounded-lg p-5 sm:p-7 border h-full relative overflow-hidden ${isDayMode ? "bg-white border-slate-200/80 shadow-[0_8px_22px_rgba(15,23,42,0.045)]" : "bg-white/5 border-white/5"}`}
                        >
                          <div className="relative">
                            <div
                              className={`inline-flex items-center gap-2 rounded-md px-3 py-1 mb-4 border ${isDayMode ? "bg-slate-50/90 text-slate-500 border-slate-200/80" : "bg-white/10 text-white/70 border-white/10"}`}
                            >
                              <FileText
                                size={16}
                                className={eventThemeAccent.accentText}
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
                              className={`prose prose-lg max-w-none leading-relaxed ${isDayMode ? "prose-slate prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-800 prose-a:text-violet-700 prose-li:text-slate-600 text-slate-700" : "prose-invert text-gray-300"}`}
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(
                                  selectedEvent.content ||
                                    `<p>${selectedEvent.description}</p>`,
                                ),
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sidebar - Details & Link */}
                      <div className="lg:w-[360px] xl:w-[400px] space-y-4">
                        <div
                          className={`rounded-lg p-5 sm:p-6 border lg:sticky lg:top-8 space-y-5 relative overflow-hidden ${isDayMode ? "bg-white border-slate-200/80 shadow-[0_8px_22px_rgba(15,23,42,0.045)]" : "bg-white/5 border-white/5"}`}
                        >

                          {/* Key Attributes Grid */}
                          {selectedEvent.category && (
                            <div
                              className={`rounded-lg p-4 border backdrop-blur-sm ${isDayMode ? "bg-violet-50/70 border-violet-100/80" : "bg-white/[0.03] border-white/5"}`}
                            >
                              <div
                                className={`flex items-center gap-2 mb-3 ${eventThemeAccent.accentText}`}
                              >
                                <Tag size={18} />
                                <span className="text-sm font-bold uppercase tracking-wider">
                                  活动分类
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span
                                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${isDayMode ? `bg-white text-slate-600 border-violet-100/80 shadow-[0_8px_20px_rgba(168,85,247,0.045)] hover:-translate-y-0.5 ${eventThemeAccent.tagHover}` : "bg-white/5 text-gray-300 border-white/5 hover:bg-white/10"}`}
                                >
                                  {getEventCategoryLabel(selectedEvent.category)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div
                            className={`h-px bg-gradient-to-r from-transparent ${isDayMode ? "via-slate-200" : "via-white/10"} to-transparent`}
                          />

                          {/* Detailed Info List */}
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div
                              className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-violet-50/70 border-violet-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                            >
                              <div className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-violet-100 text-violet-700" : "bg-orange-500/5 border border-orange-500/10 text-orange-400 group-hover:bg-orange-500/10"}`}>
                                <Calendar size={18} className="sm:h-5 sm:w-5" />
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
                                  {formatDateTime(selectedEvent.date)}
                                  {selectedEvent.end_date &&
                                    !isSameDay(
                                      selectedEvent.date,
                                      selectedEvent.end_date,
                                    ) &&
                                    `-${formatDateTime(selectedEvent.end_date)}`}
                                </span>
                              </div>
                            </div>

                            <div
                              className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-pink-50/70 border-pink-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                            >
                              <div className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-pink-100 text-rose-600" : "bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/10"}`}>
                                <MapPin size={18} className="sm:h-5 sm:w-5" />
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
                                  {selectedEvent.location || t("common.online")}
                                </p>
                              </div>
                            </div>

                            {selectedEvent.organizer && (
                              <div
                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-violet-50/70 border-violet-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                              >
                                <div className="p-2 bg-green-500/5 border border-green-500/10 rounded-xl text-green-400 shrink-0 group-hover:bg-green-500/10 transition-colors sm:p-2.5">
                                  <Building2
                                    size={18}
                                    className="sm:h-5 sm:w-5"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h4
                                    className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                  >
                                    {t("event_fields.organizer")}
                                  </h4>
                                  <p
                                    className={`text-sm leading-snug break-words sm:text-base ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                                  >
                                    {selectedEvent.organizer}
                                  </p>
                                </div>
                              </div>
                            )}

                            {selectedEvent.target_audience && (
                              <div
                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-pink-50/70 border-pink-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                              >
                                <div className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-fuchsia-50/80 border border-fuchsia-100 text-fuchsia-500 group-hover:bg-fuchsia-100/70" : "bg-blue-500/5 border border-blue-500/10 text-blue-400 group-hover:bg-blue-500/10"}`}>
                                  <Users size={18} className="sm:h-5 sm:w-5" />
                                </div>
                                <div className="min-w-0">
                                  <h4
                                    className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                  >
                                    {t("event_fields.target_audience")}
                                  </h4>
                                  <p
                                    className={`text-sm leading-snug break-words sm:text-base ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                                  >
                                    {selectedEvent.target_audience}
                                  </p>
                                </div>
                              </div>
                            )}

                            {selectedEvent.volunteer_time && (
                              <div
                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-violet-50/70 border-violet-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                              >
                                <div className="p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-emerald-400 shrink-0 group-hover:bg-emerald-500/10 transition-colors sm:p-2.5">
                                  <Clock size={18} className="sm:h-5 sm:w-5" />
                                </div>
                                <div className="min-w-0">
                                  <h4
                                    className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                  >
                                    {t("event_fields.volunteer_duration")}
                                  </h4>
                                  <p
                                    className={`text-sm leading-snug break-words sm:text-base ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                                  >
                                    {selectedEvent.volunteer_time}
                                  </p>
                                </div>
                              </div>
                            )}

                            {selectedEvent.score && (
                              <div
                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-pink-50/70 border-pink-100/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                              >
                                <div className="p-2 bg-purple-500/5 border border-purple-500/10 rounded-xl text-purple-400 shrink-0 group-hover:bg-purple-500/10 transition-colors sm:p-2.5">
                                  <Award size={18} className="sm:h-5 sm:w-5" />
                                </div>
                                <div className="min-w-0">
                                  <h4
                                    className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm sm:tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                  >
                                    {t("event_fields.score_label")}
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
        document.body,
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
