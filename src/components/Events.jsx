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
  ArrowRight,
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
  Search,
  SlidersHorizontal,
  Plus,
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
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case t("events.status.ongoing"):
        return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/80 animate-pulse";
      case t("events.status.past"):
        return "bg-slate-100 text-slate-500 border-slate-200/80";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200/80";
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

  // Check if time part exists (format: YYYY-MM-DDTHH:MM)
  if (dateStr.length > 10 && dateStr[10] === "T") {
    const timePart = dateStr.substring(11, 16); // HH:MM
    if (timePart && timePart !== "00:00") {
      return `${month}.${day} ${timePart}`;
    }
  }
  return `${month}.${day}`;
};

const VIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

const EVENT_THEME_VARIANTS = {
  cyan: {
    backdropGlow: "",
    heroGlow: "bg-slate-100",
    softGlow: "bg-slate-50",
    accentText: "text-blue-700",
    dot: "bg-blue-500",
    surface: "bg-white border border-slate-200/80",
    cta: "bg-slate-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] hover:bg-blue-700 hover:-translate-y-0.5 border border-slate-950 hover:border-blue-700",
    highlightCard: "border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.045)]",
    iconShell: "bg-slate-100 border-slate-200 text-blue-700",
    tagHover: "hover:border-blue-200/80 hover:text-blue-700",
  },
  pink: {
    backdropGlow: "",
    heroGlow: "bg-slate-100",
    softGlow: "bg-slate-50",
    accentText: "text-rose-600",
    dot: "bg-rose-400",
    surface: "bg-white border border-slate-200/80",
    cta: "bg-slate-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] hover:bg-blue-700 hover:-translate-y-0.5 border border-slate-950 hover:border-blue-700",
    highlightCard: "border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.045)]",
    iconShell: "bg-slate-100 border-slate-200 text-rose-600",
    tagHover: "hover:border-pink-200/80 hover:text-pink-600",
  },
  orange: {
    backdropGlow: "",
    heroGlow: "bg-slate-100",
    softGlow: "bg-slate-50",
    accentText: "text-amber-700",
    dot: "bg-amber-500",
    surface: "bg-white border border-slate-200/80",
    cta: "bg-slate-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] hover:bg-blue-700 hover:-translate-y-0.5 border border-slate-950 hover:border-blue-700",
    highlightCard: "border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.045)]",
    iconShell: "bg-slate-100 border-slate-200 text-amber-700",
    tagHover: "hover:border-orange-200/80 hover:text-orange-600",
  },
  green: {
    backdropGlow: "",
    heroGlow: "bg-slate-100",
    softGlow: "bg-slate-50",
    accentText: "text-emerald-600",
    dot: "bg-emerald-400",
    surface: "bg-white border border-slate-200/80",
    cta: "bg-slate-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] hover:bg-blue-700 hover:-translate-y-0.5 border border-slate-950 hover:border-blue-700",
    highlightCard: "border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.045)]",
    iconShell: "bg-slate-100 border-slate-200 text-emerald-600",
    tagHover: "hover:border-emerald-200/80 hover:text-emerald-600",
  },
  blue: {
    backdropGlow: "",
    heroGlow: "bg-slate-100",
    softGlow: "bg-slate-50",
    accentText: "text-blue-700",
    dot: "bg-blue-500",
    surface: "bg-white border border-slate-200/80",
    cta: "bg-slate-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] hover:bg-blue-700 hover:-translate-y-0.5 border border-slate-950 hover:border-blue-700",
    highlightCard: "border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.045)]",
    iconShell: "bg-slate-100 border-slate-200 text-blue-700",
    tagHover: "hover:border-blue-200/80 hover:text-blue-600",
  },
  rose: {
    backdropGlow: "",
    heroGlow: "bg-slate-100",
    softGlow: "bg-slate-50",
    accentText: "text-rose-600",
    dot: "bg-rose-400",
    surface: "bg-white border border-slate-200/80",
    cta: "bg-slate-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] hover:bg-blue-700 hover:-translate-y-0.5 border border-slate-950 hover:border-blue-700",
    highlightCard: "border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.045)]",
    iconShell: "bg-slate-100 border-slate-200 text-rose-600",
    tagHover: "hover:border-rose-200/80 hover:text-rose-600",
  },
};

const EventCard = memo(
  ({ event, index, onClick, onToggleFavorite, reduceMotion, isDayMode }) => {
    const { t } = useTranslation();

    const status = getEventLifecycle(event.date, event.end_date, t);
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
        };

    return (
      <motion.div
        {...motionProps}
        className={`group rect-media-card relative overflow-hidden cursor-pointer flex flex-row md:flex-col h-full transform-gpu will-change-transform transition-[background-color,border-color,box-shadow] duration-200 ${isDayMode ? "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.065)]" : "bg-[#050712]/94 border-white/15 hover:border-indigo-300/30 hover:bg-[#070914]"}`}
        onClick={() => onClick(event)}
      >
        {/* Image Section */}
        <div className="w-[112px] sm:w-1/3 md:w-full aspect-square md:h-56 overflow-hidden relative shrink-0 z-10 m-3 rounded-[5px] md:m-0 md:rounded-t-[6px] md:rounded-b-none">
          <SmartImage
            src={getThumbnailUrl(event.image)}
            alt={event.title}
            loading="lazy"
            priority={index < 6}
            className="absolute inset-0 w-full h-full"
            imageClassName="w-full h-full object-cover"
          />
          <div
            className={`absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-75 ${isDayMode ? "from-white" : "from-[#0a0a0a]"}`}
          />

          {/* Status Badge - Adjusted for mobile */}
          <div
            className={`absolute top-2 right-2 md:top-4 md:right-4 px-2.5 py-1 md:px-3 md:py-1.5 rounded-[4px] text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-none flex items-center gap-1.5 z-40 border ${getStatusColor(status, t, isDayMode)}`}
          >
            {status === t("events.status.upcoming") && (
              <Clock size={12} className="md:w-3.5 md:h-3.5" />
            )}
            {status === t("events.status.ongoing") && (
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-white animate-pulse" />
            )}
            {status}
          </div>

        </div>

        {/* Content Section */}
        <div className="p-3 md:p-5 relative flex-1 flex flex-col min-w-0 h-full justify-center md:justify-start">
          {/* Title */}
          <h3
            className={`text-base sm:text-lg md:text-xl font-bold mb-1.5 md:mb-2 line-clamp-2 leading-tight tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}
          >
            {event.title}
          </h3>

          {/* Date & Location - Clean Text Row */}
          <div
            className={`flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-xs sm:text-sm mb-2 md:mb-3 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar size={14} className={isDayMode ? "text-blue-600 md:w-4 md:h-4" : "text-indigo-400 md:w-4 md:h-4"} />
              <span
                className={`font-medium whitespace-nowrap ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
              >
                {formatDateTime(event.date)}
                {event.end_date &&
                  !isSameDay(event.date, event.end_date) &&
                  `-${formatDateTime(event.end_date)}`}
              </span>
            </div>

            <span
              className={`hidden md:inline ${isDayMode ? "text-slate-300" : "text-white/20"}`}
            >
              •
            </span>

            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin
                size={14}
                className={isDayMode ? "text-slate-400 shrink-0 md:w-4 md:h-4" : "text-indigo-400 shrink-0 md:w-4 md:h-4"}
              />
              <span className="truncate">
                {event.location || t("common.online", "线上")}
              </span>
            </div>
          </div>

          {/* Description - Max 3 lines (Hidden on Mobile) */}
          {event.description && (
            <p
              className={`hidden md:block text-sm mb-4 line-clamp-3 leading-6 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
            >
              {event.description}
            </p>
          )}

          {/* Benefits Badges */}
          {(event.score || event.volunteer_time) && (
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-4">
              {event.score && (
                <span
                  className={`rect-chip inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${isDayMode ? "bg-purple-50 text-purple-600 border-purple-200/80" : "bg-purple-500/10 text-purple-300 border-purple-500/20"}`}
                >
                  <Award size={12} />
                  {event.score}
                </span>
              )}
              {event.volunteer_time && (
                <span
                  className={`rect-chip inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${isDayMode ? "bg-emerald-50 text-emerald-600 border-emerald-200/80" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"}`}
                >
                  <Clock size={12} />
                  {event.volunteer_time}
                </span>
              )}
            </div>
          )}

          {/* Footer: Category & Actions */}
          <div
            className={`flex items-center justify-between mt-auto pt-2 md:pt-3 border-t ${isDayMode ? "border-slate-200/80" : "border-white/5"}`}
          >
            <div className="flex flex-wrap gap-1.5 md:gap-2 overflow-hidden min-h-[24px] md:min-h-[32px]">
              {event.category && (
                <span
                  className={`rect-chip px-1.5 py-0.5 md:px-2.5 md:py-1.5 text-[10px] md:text-xs font-medium flex items-center gap-1 shrink-0 max-w-[96px] md:max-w-[140px] ${isDayMode ? "bg-slate-50 text-slate-700 border-slate-200/80" : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"}`}
                >
                  <Tag size={10} className="md:w-3 md:h-3" />
                  <span className="truncate">
                    {getEventCategoryLabel(event.category)}
                  </span>
                </span>
              )}
              {event.target_audience && (
                <span
                  className={`rect-chip px-1.5 py-0.5 md:px-2.5 md:py-1.5 text-[10px] md:text-xs font-medium flex items-center gap-1 shrink-0 max-w-[110px] md:max-w-[160px] ${isDayMode ? "bg-slate-50 text-slate-600 border-slate-200/80" : "bg-white/5 text-gray-300 border-white/10"}`}
                >
                  <Users size={10} className="md:w-3 md:h-3" />
                  <span className="truncate">{event.target_audience}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto">
              <FavoriteButton
                itemId={event.id}
                itemType="event"
                size={16}
                showCount={true}
                count={event.likes || 0}
                favorited={event.favorited}
                initialFavorited={event.favorited}
                className={`rect-icon-button p-1.5 md:p-2 transition-colors ${isDayMode ? "hover:bg-slate-100 hover:text-blue-700" : "hover:bg-white/10"}`}
                onToggle={(favorited, likes) =>
                  onToggleFavorite(event.id, favorited, likes)
                }
              />
              <div
                className={`rect-icon-button p-1.5 md:p-2 transition-[background-color,color,transform] duration-200 group-hover:translate-x-0.5 ${isDayMode ? "bg-slate-100 text-slate-600 group-hover:bg-slate-950 group-hover:text-white" : "bg-white/5 group-hover:bg-white/10 group-hover:text-white"}`}
              >
                <ArrowRight
                  size={16}
                  className="md:w-[18px] md:h-[18px]"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  },
);
EventCard.displayName = "EventCard";

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
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);
  const [isMobileAssistantOpen, setIsMobileAssistantOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const shouldReduceCardMotion = prefersReducedMotion || isMobileViewport;
  const trackedViewTimestamps = useRef(new Map());
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
      setIsMobileViewport(window.innerWidth < 768);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport, { passive: true });
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const [sort, setSort] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [discoveryMode, setDiscoveryMode] = useState("filters");
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
    setSelectedEventRecommendationContext(null);
  }, [navigate]);

  useBackClose(selectedEvent !== null, closeEvent);
  useBackClose(isUploadOpen, () => setIsUploadOpen(false));
  useBackClose(isMobileAssistantOpen, () => setIsMobileAssistantOpen(false));

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
    setCurrentPage(1);
  }, [
    sort,
    debouncedSearch,
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
            setSelectedEventRecommendationContext(null);
            setSelectedEvent(res.data);
          }
        })
        .catch((err) => {
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to fetch deep linked event", err);
          }
        });
    }
  }, [searchParams]);

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
      if (!selectedEventId || !selectedEventRecommendationContext?.assistantRunId) {
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
            assistantRunId: selectedEventRecommendationContext.assistantRunId,
            recommendationRank:
              selectedEventRecommendationContext.recommendationRank || null,
            source:
              selectedEventRecommendationContext.source ||
              "event_assistant_detail",
            visitorKey: getOrCreateSiteVisitorKey(),
            metadata: {
              surface: metadata.surface || "event_detail",
              nextAction: selectedEventRecommendationContext.nextAction || "",
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
      setSelectedEventRecommendationContext(recommendationContext);
      setSelectedEvent(cachedEvent || assistantEvent);

      api
        .get(`/events/${assistantEvent.id}`, { silent: true })
        .then((response) => {
          if (response.data) {
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
    [displayEvents, events, t],
  );

  const discoveryToggleClasses = isDayMode
    ? "rect-surface-soft"
    : "rect-surface-soft";
  const daySegmentActiveClass =
    "border border-slate-300 bg-white text-slate-950 shadow-[0_4px_12px_rgba(15,23,42,0.06)]";
  const nightSegmentActiveClass =
    "border border-indigo-400/28 bg-indigo-500/16 text-indigo-100 shadow-none";
  const dayPrimaryActionClass =
    "rect-button-primary bg-slate-950 text-white border-slate-950 hover:bg-blue-700 hover:border-blue-700";

  const renderDiscoveryModeToggle = (compact = false) => (
    <div
      className={`flex ${compact ? "flex-col items-stretch gap-3" : "items-center justify-end gap-4"} w-full`}
    >
      <div
        className={`inline-flex items-center gap-1.5 p-1.5 ${discoveryToggleClasses} ${compact ? "w-full justify-between overflow-hidden" : ""}`}
      >
        <button
          type="button"
          aria-pressed={discoveryMode === "filters"}
          onClick={() => setDiscoveryMode("filters")}
          className={`rect-button inline-flex min-h-[42px] items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${compact ? "flex-1 min-w-0 whitespace-nowrap" : ""} ${
            discoveryMode === "filters"
              ? isDayMode
                ? daySegmentActiveClass
                : nightSegmentActiveClass
              : isDayMode
                ? "text-slate-500 hover:bg-white/62 hover:text-slate-900"
                : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
          }`}
        >
          <SlidersHorizontal size={15} className="shrink-0" />
          筛选
        </button>
        <button
          type="button"
          aria-pressed={discoveryMode === "assistant"}
          onClick={() => setDiscoveryMode("assistant")}
          className={`rect-button inline-flex min-h-[42px] items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${compact ? "flex-1 min-w-0 whitespace-nowrap px-3" : ""} ${
            discoveryMode === "assistant"
              ? isDayMode
                ? daySegmentActiveClass
                : nightSegmentActiveClass
              : isDayMode
                ? "text-slate-500 hover:bg-white/62 hover:text-slate-900"
                : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
          }`}
        >
          <Search size={15} className="shrink-0" />
          <span className="min-w-0 whitespace-nowrap">
            {compact ? "AI" : t("events.assistant.mode_ai", "AI 搜索")}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <section className="pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-20 md:pt-24 px-4 md:px-8 relative overflow-hidden flex-grow">
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
        className="mb-6 md:mb-9 relative z-40 md:pt-0 text-center"
      >
        <div className="md:hidden mb-4 text-left">
          <h1
            className={`text-2xl font-bold tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}
          >
            {t("events.title")}
          </h1>
          <p
            className={`text-sm mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
          >
            {t("events.subtitle")}
          </p>
        </div>
        <MobileContentToolbar
          isDayMode={isDayMode}
          resultCount={displayEvents.length}
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
        <div className="hidden md:block mb-6">
          <h2
            className={`text-3xl md:text-4xl lg:text-5xl font-bold font-serif mb-3 md:mb-5 ${isDayMode ? "text-slate-900" : "text-white"}`}
          >
            {t("events.title")}
          </h2>
          <p
            className={`max-w-xl mx-auto text-sm md:text-base ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
          >
            {t("events.subtitle")}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 w-full justify-center mb-4 xl:absolute xl:right-0 xl:top-0 xl:mb-0 xl:w-auto">
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
            className={`rect-button-secondary flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 transition-all font-bold text-sm shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "hover:text-slate-950" : "text-white"}`}
          >
            <Upload size={18} className="md:w-5 md:h-5" />{" "}
            {t("common.create_event")}
          </button>
        </div>

        {/* Desktop Filter Section */}
        <div className="hidden md:block w-full max-w-5xl mx-auto mb-7">
          <div className="mb-4">{renderDiscoveryModeToggle()}</div>

          {discoveryMode === "assistant" ? (
            <EventAssistantPanel
              isDayMode={isDayMode}
              onOpenEvent={handleOpenAssistantEvent}
            />
          ) : (
            <EventFilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              sort={sort}
              onSortChange={setSort}
            />
          )}
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
                          className={`text-[1.35rem] font-black leading-tight ${isDayMode ? "text-slate-950" : "text-white"}`}
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
                        className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "bg-slate-100 text-slate-500 hover:text-slate-900" : "bg-white/10 text-gray-400 hover:text-white"}`}
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
                          className={`rect-button-secondary min-h-[52px] text-base font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "text-slate-600" : "text-gray-200"}`}
                        >
                          {t("common.clear_all", "重置")}
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={t("common.done", "完成")}
                        onClick={() => setIsMobileFilterOpen(false)}
                        className={`rect-button min-h-[52px] text-base font-black focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? dayPrimaryActionClass : nightSegmentActiveClass}`}
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
                        className={`text-lg font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}
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
                      className={`rect-icon-button p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-400 hover:text-white"}`}
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

      {error ? (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle
            size={48}
            className="text-red-400 mb-4 opacity-50 mx-auto"
          />
          <p
            className={`mb-6 ${isDayMode ? "text-slate-600" : "text-gray-300"}`}
          >
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7 lg:gap-8 max-w-7xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`rect-media-card overflow-hidden h-full flex flex-row md:flex-col relative group ${isDayMode ? "bg-white/82 border-slate-200/80" : "bg-white/[0.04] border-white/5"}`}
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-skeleton" />

              {/* Image Skeleton */}
              <div
                className={`w-1/3 md:w-full aspect-square md:h-64 ${isDayMode ? "bg-slate-100" : "bg-white/5"}`}
              />
              {/* Content Skeleton */}
              <div className="p-4 md:p-6 flex-1 flex flex-col w-2/3 md:w-full">
                <div
                  className={`h-6 rounded-[2px] w-3/4 mb-4 ${isDayMode ? "bg-slate-100" : "bg-white/10"}`}
                />
                <div className="flex gap-2 mb-4">
                  <div
                    className={`h-6 rounded-[2px] w-20 ${isDayMode ? "bg-slate-100" : "bg-white/5"}`}
                  />
                  <div
                    className={`h-6 rounded-[2px] w-24 ${isDayMode ? "bg-slate-100" : "bg-white/5"}`}
                  />
                </div>
                <div
                  className={`h-4 rounded-[2px] w-full mb-2 ${isDayMode ? "bg-slate-100" : "bg-white/5"}`}
                />
                <div
                  className={`h-4 rounded-[2px] w-2/3 ${isDayMode ? "bg-slate-100" : "bg-white/5"}`}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7 lg:gap-8 max-w-7xl mx-auto">
          {displayEvents.map((event, index) => (
            <EventCard
              key={event.id}
              event={event}
              index={index}
              onClick={(nextEvent) => {
                setSelectedEventRecommendationContext(null);
                setSelectedEvent(nextEvent);
              }}
              onToggleFavorite={handleToggleFavorite}
              reduceMotion={shouldReduceCardMotion}
              isDayMode={isDayMode}
            />
          ))}
        </div>
      )}

      {!loading &&
        !error &&
        displayEvents.length > 0 &&
        !isPaginationEnabled &&
        hasMore && (
          <div className="flex items-center justify-center pt-10">
            <motion.button
              whileHover={shouldReduceCardMotion ? undefined : { scale: 1.02 }}
              whileTap={shouldReduceCardMotion ? undefined : { scale: 0.98 }}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
               className={`rect-button-secondary px-6 py-2.5 transition-colors text-sm font-semibold ${isDayMode ? "text-slate-700 hover:border-blue-200/80 hover:text-blue-700" : "text-white"}`}
            >
              {t("common.load_more", "加载更多")}
            </motion.button>
          </div>
        )}

      {!loading && displayEvents.length === 0 && (
        <div className="flex min-h-[52vh] flex-col items-center justify-center px-4 py-20 text-center md:min-h-[48vh] md:py-32">
          <div
             className={`rect-panel p-8 mb-6 relative group ${isDayMode ? "bg-white/82 border-slate-200/80" : "bg-white/5 border-white/5"}`}
          >
             <div className={`absolute inset-x-6 bottom-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${isDayMode ? "bg-slate-200" : "bg-indigo-400/0 group-hover:bg-indigo-400/60"}`} />
            <Calendar
              size={64}
              className={`relative z-10 ${isDayMode ? "text-slate-400" : "text-white/40"}`}
            />
          </div>
          <h3
            className={`text-3xl font-bold mb-3 tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}
          >
            {t("events.no_events")}
          </h3>
          <p
            className={`mb-8 max-w-md text-lg ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
          >
            {debouncedSearch || Object.values(filters).some((v) => v)
              ? `${t("advanced_filter.clear", "清除所有筛选")} ${t("common.or", "或")} ${t("common.search", "搜索...")}`
              : "暂时没有即将开始的活动，稍后再来看看吧"}
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
            className="rect-button-primary px-8 py-3.5 text-white font-bold transition-all flex items-center gap-3"
          >
            <Plus size={20} />
            {t("common.create_event")}
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
                              className={`prose prose-lg max-w-none leading-relaxed ${isDayMode ? "prose-slate prose-headings:text-slate-900 prose-p:text-slate-600 prose-strong:text-slate-800 prose-a:text-blue-700 prose-li:text-slate-600 text-slate-700" : "prose-invert text-gray-300"}`}
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
                              className={`rounded-lg p-4 border backdrop-blur-sm ${isDayMode ? "bg-slate-50 border-slate-200/80" : "bg-white/[0.03] border-white/5"}`}
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
                                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${isDayMode ? `bg-white text-slate-600 border-slate-200/80 shadow-[0_8px_20px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 ${eventThemeAccent.tagHover}` : "bg-white/5 text-gray-300 border-white/5 hover:bg-white/10"}`}
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
                              className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-slate-50 border-slate-200/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                            >
                              <div className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-slate-200 text-blue-700" : "bg-orange-500/5 border border-orange-500/10 text-orange-400 group-hover:bg-orange-500/10"}`}>
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
                              className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-slate-50 border-slate-200/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
                            >
                              <div className={`p-2 rounded-xl shrink-0 transition-colors sm:p-2.5 ${isDayMode ? "bg-white border border-slate-200 text-blue-700" : "bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/10"}`}>
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
                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-slate-50 border-slate-200/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
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
                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-slate-50 border-slate-200/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
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
                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-slate-50 border-slate-200/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
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
                                className={`flex items-start gap-2.5 group rounded-lg px-3 py-3 border transition-all sm:items-center sm:gap-3 sm:px-4 sm:py-4 ${isDayMode ? "bg-slate-50 border-slate-200/80 hover:bg-white" : "bg-white/[0.03] border-white/5"}`}
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
