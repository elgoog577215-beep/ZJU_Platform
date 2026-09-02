import { useCallback, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Clock3, MapPin, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useCommunityFeed } from "../hooks/useCommunityFeed";
import api from "../services/api";
import CommunityFeedPanel from "./CommunityFeedPanel";
import CommunitySearchInput from "./CommunitySearchInput";
import UploadModal from "./UploadModal";

const SALON_CATEGORY = "lecture";
const SALON_TAG = "沙龙";
const SALON_TAGS = [SALON_TAG];

const toLocalDate = (value, endOfDay = false) => {
    const source = String(value || "").trim();
    if (!source) return null;
    const match = source.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match;
    return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour == null ? (endOfDay ? 23 : 0) : Number(hour),
        minute == null ? (endOfDay ? 59 : 0) : Number(minute),
        endOfDay ? 59 : 0,
        endOfDay ? 999 : 0
    );
};

const getLifecycle = (event = {}) => {
    const start = toLocalDate(event.date);
    if (!start) return "unknown";
    const end = toLocalDate(event.end_date || event.date, true);
    const now = new Date();
    if (now < start) return "upcoming";
    if (end && now <= end) return "ongoing";
    return "past";
};

const formatSchedule = (event = {}, language = "zh") => {
    const start = toLocalDate(event.date);
    if (!start) return "";
    const hasTime = String(event.date || "").includes("T");
    const locale = String(language).startsWith("en") ? "en-US" : "zh-CN";
    return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        weekday: "short",
        ...(hasTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    }).format(start);
};

const mergeTags = (value = "") =>
    Array.from(
        new Set(
            `${value || ""},${SALON_TAG}`
                .split(/[，,;；、\n\t]+/)
                .map((tag) => tag.trim())
                .filter(Boolean)
        )
    ).join(",");

const SalonEventCard = ({ event, index, canAnimate, isDayMode, onOpen }) => {
    const { t, i18n } = useTranslation();
    const lifecycle = getLifecycle(event);
    const statusClasses = {
        upcoming: isDayMode
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
        ongoing: isDayMode
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : "border-sky-300/20 bg-sky-300/10 text-sky-200",
        past: isDayMode
            ? "border-slate-200 bg-slate-50 text-slate-500"
            : "border-white/10 bg-white/[0.04] text-slate-400",
        unknown: isDayMode
            ? "border-slate-200 bg-slate-50 text-slate-500"
            : "border-white/10 bg-white/[0.04] text-slate-400",
    };

    return (
        <motion.article
            initial={canAnimate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: Math.min(index, 6) * 0.035 }}
        >
            <button
                type="button"
                onClick={() => onOpen(event)}
                className={`group grid w-full min-w-0 gap-4 rounded-[14px] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:grid-cols-[9.5rem_minmax(0,1fr)_auto] sm:items-center sm:p-5 ${
                    isDayMode
                        ? "border-slate-200 bg-white/90 hover:border-violet-300"
                        : "border-white/10 bg-white/[0.035] hover:border-violet-300/35 hover:bg-white/[0.055]"
                }`}
            >
                <div
                    className={`flex min-w-0 items-center gap-2 text-sm font-bold sm:block ${
                        isDayMode ? "text-slate-700" : "text-slate-200"
                    }`}
                >
                    <span className="inline-flex items-center gap-2">
                        <Clock3 aria-hidden="true" size={16} className="text-violet-500" />
                        {formatSchedule(event, i18n.resolvedLanguage || i18n.language)}
                    </span>
                    <span
                        className={`ml-auto inline-flex rounded-[8px] border px-2 py-1 text-xs sm:ml-0 sm:mt-3 ${statusClasses[lifecycle]}`}
                    >
                        {t(`community_salon.status_${lifecycle}`)}
                    </span>
                </div>

                <div className="min-w-0">
                    <h2
                        className={`line-clamp-2 text-lg font-black leading-7 tracking-[-0.02em] ${
                            isDayMode ? "text-slate-950" : "text-white"
                        }`}
                    >
                        {event.title}
                    </h2>
                    {event.description ? (
                        <p
                            className={`mt-1.5 line-clamp-2 text-sm leading-6 ${
                                isDayMode ? "text-slate-600" : "text-slate-400"
                            }`}
                        >
                            {event.description}
                        </p>
                    ) : null}
                    <div
                        className={`mt-3 flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-xs ${
                            isDayMode ? "text-slate-500" : "text-slate-400"
                        }`}
                    >
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                            <MapPin aria-hidden="true" size={14} className="shrink-0" />
                            <span className="truncate">
                                {event.location || t("community_salon.online", "线上")}
                            </span>
                        </span>
                        {event.organizer ? (
                            <span className="inline-flex min-w-0 items-center gap-1.5">
                                <Users aria-hidden="true" size={14} className="shrink-0" />
                                <span className="truncate">{event.organizer}</span>
                            </span>
                        ) : null}
                    </div>
                </div>

                <ArrowUpRight
                    aria-hidden="true"
                    size={21}
                    className={`hidden shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block ${
                        isDayMode ? "text-violet-600" : "text-violet-300"
                    }`}
                />
            </button>
        </motion.article>
    );
};

const SalonExchange = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { uiMode } = useSettings();
    const navigate = useNavigate();
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const isDayMode = uiMode === "day";
    const feed = useCommunityFeed({
        endpoint: "/community/salon-events",
        deepLinkParam: "salonEvent",
        defaultPageSize: 12,
    });
    const sortOptions = useMemo(
        () => [
            { value: "newest", label: t("community_salon.sort_newest") },
            { value: "date_asc", label: t("community_salon.sort_soonest") },
            { value: "date_desc", label: t("community_salon.sort_latest") },
        ],
        [t]
    );

    const openComposer = useCallback(() => {
        if (!user) {
            toast.error(t("auth.signin_required"));
            return;
        }
        setIsComposerOpen(true);
    }, [t, user]);

    const handleUpload = useCallback(
        async (item) => {
            const tags = mergeTags(item.tags);
            await api.post("/community/salon-events", {
                ...item,
                category: SALON_CATEGORY,
                tags,
                tag: tags,
            });
            feed.handleRefresh();
        },
        [feed]
    );

    const openEvent = useCallback(
        (event) => {
            if (!event?.id) return;
            navigate(`/events?id=${encodeURIComponent(String(event.id))}`);
        },
        [navigate]
    );

    return (
        <CommunityFeedPanel
            feed={feed}
            isDayMode={isDayMode}
            renderCard={(event, index, context) => (
                <SalonEventCard
                    key={event.id}
                    event={event}
                    index={index}
                    canAnimate={context.canAnimate}
                    isDayMode={context.isDayMode}
                    onOpen={openEvent}
                />
            )}
            emptyIcon={CalendarDays}
            emptyTitle={t("community_salon.empty_title")}
            emptyDesc={t("community_salon.empty_desc")}
            accentColor="violet"
            extraControls={
                <CommunitySearchInput
                    value={feed.searchQuery}
                    onChange={feed.setSearchQuery}
                    onClear={() => feed.setSearchQuery("")}
                    placeholder={t("community_salon.search_placeholder")}
                    isDayMode={isDayMode}
                />
            }
            onNewPost={openComposer}
            newPostLabel={t("community_salon.publish_action")}
            sortOptions={sortOptions}
            surfaceVariant="learning"
            extraBottom={
                <UploadModal
                    isOpen={isComposerOpen}
                    onClose={() => setIsComposerOpen(false)}
                    onUpload={handleUpload}
                    type="event"
                    fixedEventCategory={SALON_CATEGORY}
                    fixedEventCategoryLabel={t("community_salon.fixed_type")}
                    fixedEventTags={SALON_TAGS}
                />
            }
        />
    );
};

export default SalonExchange;
