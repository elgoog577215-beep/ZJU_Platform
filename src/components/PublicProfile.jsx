import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import SmartImage from "./SmartImage";
import {
  User,
  Users,
  Calendar,
  Grid,
  Briefcase,
  Settings,
  Heart,
  Bell,
  CloudSun,
  Lock,
  Loader2,
  Image,
  Music,
  Film,
  FileText,
  Download,
  Globe,
  LogOut,
  Moon,
  Sun,
  Pencil,
  UserPlus,
  UserCheck,
  Upload,
  Sparkles,
  MapPin,
  Clock3,
} from "lucide-react";
import api, {
  createIdentityClaim,
  getProfileCard,
  listIdentityClaims,
  listOutcomeLinks,
  updateOutcomeLink,
  uploadAvatar,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import Dropdown from "./Dropdown";
import FavoriteButton from "./FavoriteButton";
import NotificationCenter from "./NotificationCenter";
import PersonalCenterShell from "./PersonalCenterShell";
import UserCommunitySubmissions from "./UserCommunitySubmissions";
import ProfileCardEditor from "./profile/ProfileCardEditor";
import ProfileCustomCards from "./profile/ProfileCustomCards";
import ProfileSocialLinks from "./profile/ProfileSocialLinks";
import { useReducedMotion } from "../utils/animations";

// Content type tabs shown in the "published" area.
const CONTENT_TYPES = [
  { key: "all", label: "所有" },
  { key: "photo", label: "图片" },
  { key: "video", label: "视频" },
  { key: "music", label: "音乐" },
  { key: "article", label: "文章" },
  { key: "event", label: "活动" },
  { key: "news", label: "新闻" },
  { key: "help", label: "求助" },
  { key: "team", label: "组队" },
  { key: "project", label: "项目" },
  { key: "competition_work", label: "成果" },
];

const EVENT_CATEGORY_OPTIONS = [
  { value: "lecture", label: "讲座" },
  { value: "competition", label: "竞赛" },
  { value: "volunteer", label: "志愿" },
  { value: "recruitment", label: "招新/职业" },
  { value: "culture_sports", label: "文体" },
  { value: "exchange", label: "交流" },
];

const EVENT_BENEFIT_OPTIONS = [
  { value: "score", label: "综测" },
  { value: "volunteer_time", label: "志愿时长" },
  { value: "skill", label: "技能成长" },
  { value: "social", label: "社交放松" },
];

const EVENT_FORMAT_OPTIONS = [
  { value: "", label: "不限方式" },
  { value: "offline", label: "偏线下" },
  { value: "online", label: "偏线上" },
  { value: "hybrid", label: "都可以" },
];

const PROFILE_TAB_KEYS = new Set(["published", "submissions", "favorites", "messages", "settings"]);
const SETTINGS_TAB_KEYS = new Set(["profile-card", "activity-profile", "security", "identity"]);

const splitPreferenceText = (value) => String(value || "")
  .split(/[,，、;；\s]+/)
  .map((item) => item.trim())
  .filter(Boolean);

const EMPTY_EVENT_PREFERENCE_FORM = {
  college: "",
  division: "",
  grade: "",
  campus: "",
  availability: "",
  interestTagsText: "",
  preferredCategories: [],
  preferredBenefits: [],
  preferredFormat: "",
};

const createEmptyProfileCard = (userId) => ({
  user_id: userId,
  slogan: "",
  status: "",
  tags: [],
  social_links: [],
  cards: [],
});

// Visual metadata per content type. The badge lives inside the caption
// (glass chip), so we only need type-coloured text tokens for day / night.
// `placeholder{Day,Night}` define the soft gradient used by
// TitleArtPlaceholder when the item has no cover image — 小红书-style
// text-as-image cards.
const TYPE_META = {
  photo: {
    label: "图片", textDay: "text-pink-600", textNight: "text-pink-300",
    smartImageType: "image",
    placeholderDay:   "from-pink-50 via-rose-50 to-amber-50",
    placeholderNight: "from-pink-500/20 via-rose-500/15 to-amber-500/20",
  },
  video: {
    label: "视频", textDay: "text-emerald-600", textNight: "text-emerald-300",
    smartImageType: "video",
    placeholderDay:   "from-emerald-50 via-teal-50 to-cyan-50",
    placeholderNight: "from-emerald-500/20 via-teal-500/15 to-cyan-500/20",
  },
  music: {
    label: "音乐", textDay: "text-purple-600", textNight: "text-purple-300",
    smartImageType: "music",
    placeholderDay:   "from-purple-50 via-fuchsia-50 to-pink-50",
    placeholderNight: "from-purple-500/20 via-fuchsia-500/15 to-pink-500/20",
  },
  article: {
    label: "文章", textDay: "text-orange-600", textNight: "text-orange-300",
    smartImageType: "article",
    placeholderDay:   "from-orange-50 via-amber-50 to-yellow-50",
    placeholderNight: "from-orange-500/20 via-amber-500/15 to-yellow-500/20",
  },
  event: {
    label: "活动", textDay: "text-blue-600", textNight: "text-blue-300",
    smartImageType: "event",
    placeholderDay:   "from-blue-50 via-sky-50 to-cyan-50",
    placeholderNight: "from-blue-500/20 via-sky-500/15 to-cyan-500/20",
  },
  news: {
    label: "新闻", textDay: "text-slate-600", textNight: "text-slate-300",
    smartImageType: "article",
    placeholderDay:   "from-slate-50 via-gray-50 to-zinc-100",
    placeholderNight: "from-slate-500/20 via-gray-500/15 to-zinc-500/20",
  },
  help: {
    label: "求助", textDay: "text-amber-600", textNight: "text-amber-300",
    smartImageType: "article",
    placeholderDay:   "from-amber-50 via-yellow-50 to-orange-50",
    placeholderNight: "from-amber-500/20 via-yellow-500/15 to-orange-500/20",
  },
  team: {
    label: "组队", textDay: "text-indigo-600", textNight: "text-indigo-300",
    smartImageType: "article",
    placeholderDay:   "from-indigo-50 via-violet-50 to-purple-50",
    placeholderNight: "from-indigo-500/20 via-violet-500/15 to-purple-500/20",
  },
  competition_work: {
    label: "成果", textDay: "text-amber-700", textNight: "text-amber-200",
    smartImageType: "article",
    placeholderDay:   "from-amber-50 via-sky-50 to-indigo-50",
    placeholderNight: "from-amber-500/20 via-sky-500/15 to-indigo-500/20",
  },
  project: {
    label: "项目", textDay: "text-cyan-700", textNight: "text-cyan-300",
    smartImageType: "article",
    placeholderDay:   "from-cyan-50 via-sky-50 to-blue-50",
    placeholderNight: "from-cyan-500/20 via-sky-500/15 to-blue-500/20",
  },
};

/**
 * Text-as-image placeholder for items that have no cover asset
 * (help / team posts, the occasional article-without-cover, etc.).
 * Inspired by 小红书's "纯文字笔记" cards: the title itself becomes the
 * hero artwork on a gentle, type-coloured gradient.
 *
 * Sits inside the cover slot (aspect-[4/3]), so nothing about layout
 * shifts — cover = image vs cover = TitleArtPlaceholder is a clean swap.
 */
function TitleArtPlaceholder({ title, meta, isDayMode }) {
  const gradient = isDayMode ? meta.placeholderDay : meta.placeholderNight;
  const accent = isDayMode ? meta.textDay : meta.textNight;
  const titleColor = isDayMode ? "text-slate-900" : "text-white";
  // Shorter titles get bigger type, longer titles scale down so the string
  // still fits in the aspect-[4/3] slot without being cut mid-word.
  // line-clamp also scales with size so each tier has matching breathing room.
  const safeTitle = title || "(无标题)";
  const len = safeTitle.length;
  const { sizeClass, clamp } = len <= 8
    ? { sizeClass: "text-2xl md:text-4xl", clamp: "line-clamp-3" }
    : len <= 20
      ? { sizeClass: "text-xl md:text-3xl", clamp: "line-clamp-4" }
      : len <= 40
        ? { sizeClass: "text-lg md:text-2xl", clamp: "line-clamp-5" }
        : { sizeClass: "text-base md:text-xl", clamp: "line-clamp-6" };
  return (
    // overflow-hidden on the outer container guarantees that a runaway
    // title or a single long CJK word cannot paint past the card edges.
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex flex-col justify-between p-5 overflow-hidden`}>
      {/* Small accent row at top — a subtle "this is a card" cue. */}
      <div className={`flex items-center gap-1.5 text-xs font-semibold tracking-wider ${accent} opacity-70 shrink-0`}>
        <span className="w-6 h-[2px] rounded-full bg-current" aria-hidden="true" />
        <span>{meta.label.toUpperCase()}</span>
      </div>
      {/* Title fills the middle. flex-1 + min-h-0 lets the clamp compute
          against the real remaining height rather than intrinsic content
          size. break-words handles long CJK-less tokens (URLs, English). */}
      <div className="flex-1 min-h-0 flex items-center py-2">
        <div
          className={`${sizeClass} ${clamp} font-bold leading-tight break-words ${titleColor} w-full`}
        >
          {safeTitle}
        </div>
      </div>
      {/* Footer dots — pure decoration so the card doesn't feel empty. */}
      <div className={`flex items-center gap-1 ${accent} opacity-60 shrink-0`} aria-hidden="true">
        <span className="w-1 h-1 rounded-full bg-current" />
        <span className="w-1 h-1 rounded-full bg-current" />
        <span className="w-1 h-1 rounded-full bg-current" />
      </div>
    </div>
  );
}

// Backend returns `type` as the singular resource kind (photo/video/music/
// article/event/news) for resource tables and `section` (help/team) for
// community posts. This helper normalises to the tab keys above.
const normalizeContentType = (item) => {
  if (!item) return null;
  const raw = item.type;
  if (!raw) return null;
  if (raw === "help" || raw === "team") return raw;
  if (raw === "photos") return "photo";
  if (raw === "videos") return "video";
  if (raw === "music") return "music";
  if (raw === "articles") return "article";
  if (raw === "events") return "event";
  if (raw === "news") return "news";
  if (raw === "competition_works") return "competition_work";
  return raw;
};

const identityTypeLabel = (type) => ({
  person: "个人",
  team: "团队",
  club: "组织/社团",
  organization: "组织/社团",
}[type] || "身份");

const identityStatusLabel = (status) => ({
  pending: "待确认",
  verified: "已认证",
  rejected: "已拒绝",
}[status] || "未知状态");

const outcomeStatusLabel = (status) => ({
  candidate: "待认领",
  confirmed: "已确认",
  rejected: "已拒绝",
  revoked: "已撤销",
}[status] || "未知状态");

const profileStatusLabel = (status) => ({
  open_chat: "开放交流",
  seeking_collab: "寻求合作",
  coffee_chat: "Coffee Chat",
  team_up: "组队开发",
  joining_events: "活动参与",
  busy: "暂时忙碌",
}[status] || "");

function ProfileContentCard({ item, onClick, isDayMode }) {
  const typeKey = normalizeContentType(item) || "article";
  const meta = TYPE_META[typeKey] || TYPE_META.article;

  // Cover source by resource type:
  //  - events.image / photos.url / videos.thumbnail / articles.cover
  //  - help/team posts: no cover column; SmartImage renders FileText icon
  //    over a hash gradient (same look as article card with no cover).
  const cover =
    item.cover || item.image || item.thumbnail || item.url || null;
  const dateSource = item.created_at || item.createdAt || item.published_at;
  const dateStr = dateSource ? new Date(dateSource).toLocaleDateString() : "";
  const title = item.title || "(无标题)";
  const likes = Number(item.likes) || Number(item.likes_count) || 0;
  const isCompetitionWork = typeKey === "competition_work";
  const competitionMeta = [
    item.competition_title,
    item.award ? `奖项：${item.award}` : null,
    item.rank ? `排名：${item.rank}` : null,
  ].filter(Boolean).join(" · ");
  const boundIdentityMeta = item.bound_identity_name
    ? `归属：${item.bound_identity_name}`
    : item.author
      ? `获奖者：${item.author}`
      : "";

  // Project-standard glass shell (matches ArticleCard in Articles.jsx).
  const cardShell = isDayMode
    ? "bg-white/82 border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)] hover:bg-white hover:border-indigo-300 hover:shadow-[0_24px_50px_rgba(99,102,241,0.18)]"
    : "bg-[#1a1a1a]/60 border-white/10 hover:bg-[#1a1a1a]/80 hover:border-orange-400/40";
  const titleColor = isDayMode ? "text-slate-900" : "text-white";
  const metaColor = isDayMode ? "text-slate-500" : "text-gray-400";
  // Glass badge inside the caption — shared neutral surface, type-coloured text.
  const badgeGlass = isDayMode
    ? "bg-white/70 border-white/60 backdrop-blur-md shadow-[0_4px_12px_rgba(148,163,184,0.12)]"
    : "bg-white/10 border-white/15 backdrop-blur-md";
  const badgeText = isDayMode ? meta.textDay : meta.textNight;
  const heartTint = isDayMode ? "text-rose-500" : "text-rose-300";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`group cursor-pointer rounded-3xl overflow-hidden backdrop-blur-xl border transition-all duration-300 ${cardShell}`}
    >
      {/* Cover (aspect 4/3). When the item has a real cover asset we render
          it with SmartImage. When it doesn't (help/team posts, articles
          without a cover uploaded, etc.) we swap in TitleArtPlaceholder so
          the title itself becomes 小红书-style text-as-image — reads better
          than a lone FileText icon over a hash-gradient block. */}
      <div className="aspect-[4/3] relative overflow-hidden">
        {cover ? (
          <SmartImage
            src={cover}
            alt={title}
            type={meta.smartImageType}
            className="absolute inset-0 w-full h-full"
            imageClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            iconSize={56}
          />
        ) : (
          <TitleArtPlaceholder title={title} meta={meta} isDayMode={isDayMode} />
        )}
      </div>
      {/* Caption — the emphasised half of the card.
          Row 1: type badge (glass chip) + like count with lucide Heart.
          Row 2: bold title.
          Row 3: date meta. */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeGlass} ${badgeText}`}
          >
            {meta.label}
          </span>
          {likes > 0 && (
            <span className={`ml-auto inline-flex items-center gap-1.5 text-sm font-bold ${heartTint}`}>
              <Heart className="w-4 h-4 fill-current" strokeWidth={0} />
              <span>{likes}</span>
            </span>
          )}
        </div>
        <div
          className={`text-base font-bold leading-snug line-clamp-2 ${titleColor}`}
          title={title}
        >
          {title}
        </div>
        {dateStr && (
          <div className={`text-xs font-mono ${metaColor}`}>{dateStr}</div>
        )}
        {isCompetitionWork && (competitionMeta || boundIdentityMeta) && (
          <div className={`space-y-1 text-xs leading-relaxed ${metaColor}`}>
            {competitionMeta && <div className="line-clamp-1">{competitionMeta}</div>}
            {boundIdentityMeta && <div className="line-clamp-1">{boundIdentityMeta}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

const PublicProfile = ({ profileId = null, initialTab = "published" }) => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user: currentUser, logout, refreshUser } = useAuth();
  const {
    settings,
    uiMode,
    changeUiMode,
    showWeatherWidget,
    toggleWeatherWidget,
  } = useSettings();
  const id = profileId ?? routeId;

  const [user, setUser] = useState(null);
  const [resources, setResources] = useState([]);
  const [profileCard, setProfileCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("published");
  const [activeContentType, setActiveContentType] = useState("all");
  const isOwner =
    currentUser && user && String(currentUser.id) === String(user.id);

  // Unread-notification count for the "消息" tab dot. NotificationCenter
  // only mounts when that tab is active, so we poll directly from this
  // component (mirrors MobileNavbar's approach) and also listen for the
  // `notifications:updated` event emitted by NotificationCenter / the
  // mobile navbar fetch so counts stay in sync across UIs.
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (!isOwner) {
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
        /* transient errors — keep last known value */
      }
    };
    fetchUnread();
    const pollId = setInterval(fetchUnread, 60_000);
    const onUpdate = (event) => {
      const n = Number(event?.detail?.unreadCount);
      if (Number.isFinite(n)) setUnreadCount(n);
    };
    window.addEventListener("notifications:updated", onUpdate);
    return () => {
      cancelled = true;
      clearInterval(pollId);
      window.removeEventListener("notifications:updated", onUpdate);
    };
  }, [isOwner]);
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === "day";
  const settingsPanelClass = isDayMode
    ? "rounded-2xl p-4 md:p-6 border h-fit bg-white/82 border-slate-200/80 shadow-[0_18px_40px_rgba(148,163,184,0.12)]"
    : "rounded-2xl p-4 md:p-6 border h-fit bg-white/5 border-white/10";
  const dayActiveSegmentClass = "border border-blue-200 bg-blue-50 text-blue-700 shadow-none";
  const nightActiveSegmentClass = "border border-indigo-400/35 bg-indigo-500/20 text-indigo-100 shadow-none";
  const settingsActionClass = isDayMode
    ? "w-full flex items-center gap-3 rounded-2xl border px-4 py-4 transition-colors bg-slate-50/90 border-slate-200/80 text-slate-800 hover:bg-white"
    : "w-full flex items-center gap-3 rounded-2xl border px-4 py-4 transition-colors bg-white/5 border-white/10 text-white hover:bg-white/10";
  const settingsIconClass = isDayMode
    ? "h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700"
    : "h-10 w-10 rounded-xl flex items-center justify-center bg-white/10 text-white";
  const settingsSwitchTrackClass = showWeatherWidget
    ? "bg-indigo-600"
    : isDayMode
      ? "bg-slate-200"
      : "bg-white/15";
  const settingsSwitchThumbClass = showWeatherWidget
    ? "translate-x-5 bg-white"
    : "translate-x-0 bg-white";

  // Favorites State
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favoriteType, setFavoriteType] = useState("all");
  const [followLoading, setFollowLoading] = useState(false);
  const [relationTab, setRelationTab] = useState("followers");
  const [relationLoading, setRelationLoading] = useState(false);
  const [relations, setRelations] = useState([]);
  const [relationFollowLoadingIds, setRelationFollowLoadingIds] = useState({});

  // Settings State
  const [profileData, setProfileData] = useState({
    organization: "",
    nickname: "",
    inviteCode: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarSaveState, setAvatarSaveState] = useState("saved");
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0, size: 1 });
  const avatarCropDragRef = React.useRef(null);
  const [identityClaims, setIdentityClaims] = useState([]);
  const [identityType, setIdentityType] = useState("person");
  const [identityName, setIdentityName] = useState("");
  const [identityInviteCode, setIdentityInviteCode] = useState("");
  const [identityLoading, setIdentityLoading] = useState(false);
  const [outcomeLinks, setOutcomeLinks] = useState([]);
  const [outcomeLinksLoading, setOutcomeLinksLoading] = useState(false);
  const [outcomeActionId, setOutcomeActionId] = useState(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState("profile-card");
  const [eventPreferenceForm, setEventPreferenceForm] = useState(EMPTY_EVENT_PREFERENCE_FORM);
  const [eventPreferenceLoading, setEventPreferenceLoading] = useState(false);
  const [eventPreferenceSaving, setEventPreferenceSaving] = useState(false);
  const [eventPreferenceLoaded, setEventPreferenceLoaded] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const profileTabPath = (tabKey, settingsKey = activeSettingsTab) => {
    if (tabKey === "settings") {
      return `${location.pathname}?tab=settings&settings=${settingsKey}`;
    }
    return tabKey === "published" || tabKey === "relations"
      ? location.pathname
      : `${location.pathname}?tab=${tabKey}`;
  };

  const navigateProfileTab = (tabKey, settingsKey) => {
    setActiveTab(tabKey);
    navigate(profileTabPath(tabKey, settingsKey), { replace: true });
  };

  // FIX: BUG-24 — Add AbortController to cancel stale requests when switching profiles
  useEffect(() => {
    if (!id) return;

    const abortController = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const profileCardPromise = getProfileCard(id, {
          signal: abortController.signal,
          silent: true,
          noRetry: true,
        })
          .then((res) => res.data)
          .catch((profileCardError) => {
            if (abortController.signal.aborted) throw profileCardError;
            if (process.env.NODE_ENV === "development") {
              console.warn("Failed to fetch profile card", profileCardError);
            }
            return null;
          });
        const [userRes, resourcesRes, profileCardData] = await Promise.all([
          api.get(`/users/${id}/profile`, { signal: abortController.signal }),
          api.get(`/users/${id}/resources`, { signal: abortController.signal }),
          profileCardPromise,
        ]);
        if (abortController.signal.aborted) return;
        setUser(userRes.data);
        setResources(resourcesRes.data);
        setProfileCard(profileCardData || createEmptyProfileCard(userRes.data.id));

        // Init profile data if owner
        if (currentUser && String(currentUser.id) === String(userRes.data.id)) {
          setProfileData({
            organization:
              userRes.data.organization_cr || currentUser.organization || "",
            nickname: userRes.data.nickname || currentUser.nickname || "",
            inviteCode: "",
          });
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch profile", err);
        }
        setError(err?.response?.status === 404 ? "not_found" : "load_failed");
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchData();
      setActiveTab(initialTab); // Reset tab on profile source change
    }

    return () => abortController.abort();
  }, [id, currentUser?.id, initialTab]);

  useEffect(() => {
    if (!isOwner) return;

    if (activeTab === "favorites") {
      fetchFavorites();
    }
  }, [activeTab, favoriteType, isOwner]);

  useEffect(() => {
    if (!isOwner || activeTab !== "settings") return;
    fetchIdentityClaims();
    fetchOutcomeLinks();
  }, [isOwner, activeTab]);

  useEffect(() => {
    if (!isOwner) return;
    const params = new URLSearchParams(location.search);
    const requestedTab = params.get("tab");
    const requestedSettingsTab = params.get("settings");
    if (requestedTab && PROFILE_TAB_KEYS.has(requestedTab)) {
      setActiveTab(requestedTab);
    }
    if (requestedSettingsTab && SETTINGS_TAB_KEYS.has(requestedSettingsTab)) {
      setActiveSettingsTab(requestedSettingsTab);
    }
  }, [isOwner, location.search]);

  useEffect(() => {
    if (!isOwner || activeTab !== "settings" || activeSettingsTab !== "activity-profile" || eventPreferenceLoaded || eventPreferenceLoading) {
      return;
    }

    let cancelled = false;
    const loadEventPreference = async () => {
      setEventPreferenceLoading(true);
      try {
        const response = await api.get("/events/assistant/preferences");
        if (cancelled) return;
        const data = response.data || {};
        setEventPreferenceForm({
          college: data.college || "",
          division: data.division || "",
          grade: data.grade || "",
          campus: data.campus || "",
          availability: data.availability || "",
          interestTagsText: (data.interestTags || []).join("、"),
          preferredCategories: data.preferredCategories || [],
          preferredBenefits: data.preferredBenefits || [],
          preferredFormat: data.preferredFormat || "",
        });
        setEventPreferenceLoaded(true);
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.response?.status === 401 ? "登录后可以维护活动画像" : "活动画像加载失败");
        }
      } finally {
        if (!cancelled) setEventPreferenceLoading(false);
      }
    };
    loadEventPreference();

    return () => {
      cancelled = true;
    };
  }, [isOwner, activeTab, activeSettingsTab, eventPreferenceLoaded, eventPreferenceLoading]);

  // Group resources by normalized content type. Tabs with zero items
  // (other than "all") are hidden so visitors of a user with no photos
  // don't see a dead "图片" button. Backend already filters anonymous
  // help posts for non-owner non-admin viewers, so the count here is
  // authoritative for visibility.
  const contentByType = useMemo(() => {
    const map = { all: resources || [] };
    for (const ct of CONTENT_TYPES) {
      if (ct.key === "all") continue;
      map[ct.key] = (resources || []).filter(
        (item) => normalizeContentType(item) === ct.key,
      );
    }
    return map;
  }, [resources]);

  const tabsWithCount = useMemo(
    () =>
      CONTENT_TYPES.map((ct) => ({
        ...ct,
        count: (contentByType[ct.key] || []).length,
      })).filter((ct) => ct.key === "all" || ct.count > 0),
    [contentByType],
  );

  const visibleContent = contentByType[activeContentType] || [];
  useEffect(() => {
    if (tabsWithCount.some((ct) => ct.key === activeContentType)) return;
    setActiveContentType("all");
  }, [activeContentType, tabsWithCount]);

  const totalLikes = useMemo(
    () => resources.reduce((acc, curr) => acc + (Number(curr.likes) || 0), 0),
    [resources],
  );

  // Restore tab + scroll position when returning from a resource detail.
  // We only restore when the state belongs to this same user's profile —
  // otherwise a shared state object from another profile shouldn't leak.
  useEffect(() => {
    const state = location.state?.fromUserProfile;
    if (!state || !user?.id) return;
    if (String(state.userId) !== String(user.id)) return;
    if (state.contentTab) {
      setActiveContentType(state.contentTab);
    }
    if (typeof state.scrollY === "number") {
      const y = state.scrollY;
      // Delay to next tick so the grid has rendered before we scroll.
      setTimeout(() => window.scrollTo(0, y), 0);
    }
    // Intentionally not clearing location.state here — react-router will
    // discard it on the next navigate, and leaving it lets a rapid re-render
    // during tab restoration still see the same snapshot.
  }, [location.state, user?.id]);

  useEffect(() => {
    if (activeTab !== "relations" || !id) return;
    let cancelled = false;
    const fetchRelations = async () => {
      setRelationLoading(true);
      try {
        const endpoint =
          relationTab === "followers" ? "followers" : "following";
        const res = await api.get(`/users/${id}/${endpoint}`, {
          params: { limit: 100 },
        });
        if (!cancelled)
          setRelations(Array.isArray(res.data?.data) ? res.data.data : []);
      } catch (err) {
        if (!cancelled) setRelations([]);
      } finally {
        if (!cancelled) setRelationLoading(false);
      }
    };
    fetchRelations();
    return () => {
      cancelled = true;
    };
  }, [activeTab, id, relationTab]);

  const fetchFavorites = async () => {
    setLoadingFavorites(true);
    try {
      const endpoint =
        favoriteType === "all"
          ? "/favorites"
          : `/favorites?type=${favoriteType}`;
      const res = await api.get(endpoint);
      setFavorites(res.data || []);
    } catch (err) {
      // Silently fail if endpoint not ready
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleAvatarSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("头像必须是 JPG、PNG 或 WebP 图片");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("头像文件不能超过 5MB");
      event.target.value = "";
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarCrop({ x: 0, y: 0, size: 1 });
    setAvatarSaveState("dirty");
  };

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarLoading(true);
    setAvatarSaveState("saving");
    try {
      const res = await uploadAvatar(avatarFile, {
        crop_x: avatarCrop.x,
        crop_y: avatarCrop.y,
        crop_size: avatarCrop.size,
      });
      const nextAvatar = res.data?.avatar || res.data?.user?.avatar;
      if (!nextAvatar) throw new Error("缺少头像地址");
      setUser((prev) => (prev ? { ...prev, avatar: nextAvatar } : prev));
      setAvatarFile(null);
      setAvatarPreview("");
      setAvatarSaveState("saved");
      await refreshUser();
      toast.success("头像已更新");
    } catch (err) {
      setAvatarSaveState("error");
      toast.error(err.response?.data?.error || err.response?.data?.message || "头像上传失败");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleAvatarCropStart = (event) => {
    event.preventDefault();
    const box = event.currentTarget.closest("[data-avatar-crop-box]")?.getBoundingClientRect();
    if (!box) return;
    avatarCropDragRef.current = {
      box,
      startX: event.clientX,
      startY: event.clientY,
      crop: { ...avatarCrop },
    };
    window.addEventListener("pointermove", handleAvatarCropMove);
    window.addEventListener("pointerup", handleAvatarCropEnd, { once: true });
  };

  const handleAvatarCropMove = (event) => {
    const drag = avatarCropDragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.box.width;
    const dy = (event.clientY - drag.startY) / drag.box.height;
    const nextX = Math.min(1 - drag.crop.size, Math.max(0, drag.crop.x + dx));
    const nextY = Math.min(1 - drag.crop.size, Math.max(0, drag.crop.y + dy));
    setAvatarCrop((prev) => ({ ...prev, x: nextX, y: nextY }));
    setAvatarSaveState("dirty");
  };

  const handleAvatarCropEnd = () => {
    window.removeEventListener("pointermove", handleAvatarCropMove);
    avatarCropDragRef.current = null;
  };

  const fetchIdentityClaims = async () => {
    setIdentityLoading(true);
    try {
      const res = await listIdentityClaims();
      setIdentityClaims(Array.isArray(res.data) ? res.data : []);
    } catch {
      setIdentityClaims([]);
    } finally {
      setIdentityLoading(false);
    }
  };

  const fetchOutcomeLinks = async () => {
    setOutcomeLinksLoading(true);
    try {
      const res = await listOutcomeLinks("all");
      setOutcomeLinks(Array.isArray(res.data) ? res.data : []);
    } catch {
      setOutcomeLinks([]);
    } finally {
      setOutcomeLinksLoading(false);
    }
  };

  const handleCreateIdentityClaim = async () => {
    const displayName = identityName.trim();
    if (displayName.length < 2) {
      toast.error("认证名称至少需要 2 个字符");
      return;
    }
    if (identityType === "club" && identityInviteCode.trim().length === 0) {
      toast.error("请填写组织/社团邀请码");
      return;
    }
    setIdentityLoading(true);
    try {
      await createIdentityClaim({
        type: identityType,
        displayName,
        invitationCode: identityType === "club" ? identityInviteCode.trim() : undefined,
      });
      setIdentityName("");
      setIdentityInviteCode("");
      await Promise.all([fetchIdentityClaims(), fetchOutcomeLinks()]);
      await refreshUser();
      setUser((prev) =>
        prev && identityType === "club"
          ? { ...prev, organization_cr: displayName }
          : prev,
      );
      toast.success(identityType === "club" ? "组织/社团认证已通过" : "身份已添加");
    } catch (err) {
      toast.error(err.response?.data?.error || "添加身份失败");
    } finally {
      setIdentityLoading(false);
    }
  };

  const handleOutcomeAction = async (linkId, action) => {
    setOutcomeActionId(linkId);
    try {
      await updateOutcomeLink(linkId, action);
      await Promise.all([fetchOutcomeLinks(), api.get(`/users/${id}/resources`).then((res) => setResources(res.data || []))]);
      toast.success("成果认领状态已更新");
    } catch (err) {
      toast.error(err.response?.data?.error || "更新成果认领失败");
    } finally {
      setOutcomeActionId(null);
    }
  };

  const updateEventPreferenceField = (key, value) => {
    setEventPreferenceForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const toggleEventPreferenceArrayValue = (key, value) => {
    setEventPreferenceForm((previous) => {
      const current = previous[key] || [];
      return {
        ...previous,
        [key]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const handleEventPreferenceSave = async () => {
    setEventPreferenceSaving(true);
    try {
      const interestTags = splitPreferenceText(eventPreferenceForm.interestTagsText).slice(0, 16);
      const response = await api.put("/events/assistant/preferences", {
        college: eventPreferenceForm.college,
        division: eventPreferenceForm.division,
        grade: eventPreferenceForm.grade,
        campus: eventPreferenceForm.campus,
        availability: eventPreferenceForm.availability,
        interestTags,
        preferredCategories: eventPreferenceForm.preferredCategories,
        preferredBenefits: eventPreferenceForm.preferredBenefits,
        preferredFormat: eventPreferenceForm.preferredFormat,
      });
      const data = response.data || {};
      setEventPreferenceForm({
        college: data.college || "",
        division: data.division || "",
        grade: data.grade || "",
        campus: data.campus || "",
        availability: data.availability || "",
        interestTagsText: (data.interestTags || interestTags).join("、"),
        preferredCategories: data.preferredCategories || [],
        preferredBenefits: data.preferredBenefits || [],
        preferredFormat: data.preferredFormat || "",
      });
      setEventPreferenceLoaded(true);
      toast.success("活动画像已保存");
    } catch (error) {
      toast.error(error?.response?.status === 401 ? "登录后可以保存活动画像" : "活动画像保存失败");
    } finally {
      setEventPreferenceSaving(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      // Nickname goes through PUT /auth/profile (self-profile endpoint; the
      // backend's updateUser handler validates + 409s on collision). Only
      // send if changed, so untouched profiles don't run through unique-
      // index checks unnecessarily.
      const trimmedNickname = (profileData.nickname || "").trim();
      const currentNickname = user?.nickname || "";
      if (trimmedNickname !== currentNickname) {
        await api.put("/auth/profile", { nickname: trimmedNickname });
      }

      // Only PUT organization when the invite code has been verified in
      // this session — otherwise a nickname-only save would blank out the
      // user's existing organization_cr on the server.
      toast.success(t("user_profile.profile_updated"));
      await refreshUser();

      // Update local user state to reflect changes immediately
      setUser((prev) => ({
        ...prev,
        nickname: trimmedNickname,
      }));
    } catch (err) {
      // Backend returns fixed "该昵称已被使用" for 409 nickname collisions
      // (see community-identity-and-follow-notifications spec). Surface the
      // server message verbatim when present so collision / format errors
      // read naturally; fall back to generic text otherwise.
      toast.error(err.response?.data?.error || t("admin.toast.update_fail"));
    } finally {
      setProfileLoading(false);
    }
  };

  const buildFavoriteTargetPath = (item) => {
    const itemType = String(item?.type || favoriteType || "").trim().toLowerCase();
    const itemId = item?.id;
    if (!itemId) return null;

    const routeMap = {
      photo: "/gallery",
      music: "/articles",
      video: "/videos",
      // Articles live under the AICommunity "tech" tab — must pin the tab
      // or AICommunity defaults to the help board and the id is ignored.
      article: "/articles?postTab=tech",
      event: "/events",
      // Carry the favorites marker in the query (router state is wiped by the
      // detail's history push); ProjectPlaza reads ?fromfav=1 to return here.
      project: "/projects?fromfav=1",
    };

    const basePath = routeMap[itemType];
    if (!basePath) return null;
    if (itemType === "music") {
      return `${basePath}?music=${itemId}#community-podcast`;
    }
    const separator = basePath.includes("?") ? "&" : "?";
    return `${basePath}${separator}id=${itemId}`;
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("user_profile.security.password_mismatch"));
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      toast.success(t("user_profile.security.update_success"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(
        err.response?.data?.message || t("user_profile.security.update_fail"),
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleFollowToggle = async (targetUserId, currentlyFollowing) => {
    if (!currentUser) {
      toast.error(t("auth.signin_required"));
      return;
    }
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const method = currentlyFollowing ? "delete" : "post";
      const res = await api[method](`/users/${targetUserId}/follow`);
      const payload = res.data || {};
      setUser((prev) =>
        prev
          ? {
              ...prev,
              is_following: Boolean(payload.is_following),
              followers_count:
                typeof payload.followers_count === "number"
                  ? payload.followers_count
                  : prev.followers_count,
            }
          : prev,
      );
      if (activeTab === "relations" && relationTab === "followers") {
        setRelations((prev) =>
          prev.map((item) =>
            String(item.id) === String(currentUser.id)
              ? { ...item, is_following: Boolean(payload.is_following) }
              : item,
          ),
        );
      }
      toast.success(currentlyFollowing ? "已取消关注" : "关注成功");
    } catch (err) {
      toast.error(err.response?.data?.error || "操作失败，请稍后再试");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRelationItemFollowToggle = async (
    targetUserId,
    currentlyFollowing,
  ) => {
    if (!currentUser) {
      toast.error(t("auth.signin_required"));
      return;
    }
    setRelationFollowLoadingIds((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      await api[currentlyFollowing ? "delete" : "post"](
        `/users/${targetUserId}/follow`,
      );
      setRelations((prev) =>
        prev.map((item) =>
          String(item.id) === String(targetUserId)
            ? { ...item, is_following: !currentlyFollowing }
            : item,
        ),
      );
      if (String(user?.id) === String(targetUserId)) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                is_following: !currentlyFollowing,
                followers_count: Math.max(
                  0,
                  (prev.followers_count || 0) + (currentlyFollowing ? -1 : 1),
                ),
              }
            : prev,
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "操作失败，请稍后再试");
    } finally {
      setRelationFollowLoadingIds((prev) => ({
        ...prev,
        [targetUserId]: false,
      }));
    }
  };

  // Navigate to the matching resource detail route, stamping the current
  // profile context into history.state so the back-navigation effect above
  // can restore tab + scroll.
  const handleContentClick = (item) => {
    const typeKey = normalizeContentType(item);
    if (!typeKey || item?.id == null) return;
    const path = {
      photo: `/gallery?id=${item.id}`,
      video: `/videos?id=${item.id}`,
      music: `/articles?music=${item.id}#community-podcast`,
      article: `/articles?postTab=tech&id=${item.id}`,
      event: `/events?id=${item.id}`,
      news: `/articles?postTab=news&news=${item.id}`,
      help: `/articles?postTab=help&post=${item.id}`,
      team: `/articles?postTab=team&post=${item.id}`,
      competition_work: item.target_path || `/hackathon?view=showcase&work=${item.id}`,
      project: `/projects?fromfav=1&id=${item.id}`,
    }[typeKey];
    if (!path) return;
    navigate(path, {
      state: {
        fromUserProfile: {
          userId: user?.id,
          scrollY: typeof window !== "undefined" ? window.scrollY : 0,
          contentTab: activeContentType,
        },
      },
    });
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${isDayMode ? "bg-[#f8fafc]" : "bg-[#0a0a0a]"}`}
      >
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center ${isDayMode ? "bg-[#f8fafc] text-slate-900" : "bg-[#0a0a0a] text-white"}`}
      >
        <h2 className="text-2xl font-bold mb-4">
          {t(error === "load_failed" ? "user_profile.load_failed" : "user_profile.user_not_found")}
        </h2>
        <button
          onClick={() => navigate("/")}
          className={`px-6 py-2 rounded-full transition-colors ${isDayMode ? "bg-white border border-slate-200/80 hover:bg-slate-50" : "bg-white/10 hover:bg-white/20"}`}
        >
          {t("user_profile.go_home")}
        </button>
      </div>
    );
  }

  const favoriteTypeOptions = [
    { value: "all", label: t("common.all", "全部"), icon: Grid },
    { value: "photo", label: t("nav.gallery"), icon: Image },
    { value: "music", label: t("nav.music"), icon: Music },
    { value: "video", label: t("nav.videos"), icon: Film },
    { value: "article", label: t("nav.articles"), icon: FileText },
    { value: "event", label: t("nav.events"), icon: Calendar },
    { value: "project", label: "项目", icon: Sparkles },
  ];
  const displayName = user.nickname || user.username || t("user_profile.unknown_user", "用户");
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const roleLabel = user.role === "admin" ? "Admin" : user.role || "Member";
  const primaryFollowLabel = !currentUser
    ? "登录关注"
    : followLoading
      ? "处理中..."
      : user.is_following
        ? "已关注"
        : "关注";
  const PrimaryFollowIcon = user.is_following ? UserCheck : UserPlus;
  const profileStats = [
    {
      key: "works",
      label: t("user_profile.stats.works", "作品"),
      value: resources.length,
      onClick: () => setActiveTab("published"),
    },
    {
      key: "likes",
      label: t("user_profile.stats.likes", "获赞"),
      value: totalLikes,
    },
    {
      key: "followers",
      label: "粉丝",
      value: user.followers_count || 0,
      onClick: () => {
        setRelationTab("followers");
        setActiveTab("relations");
      },
    },
    {
      key: "following",
      label: "关注",
      value: user.following_count || 0,
      onClick: () => {
        setRelationTab("following");
        setActiveTab("relations");
      },
    },
  ];
  const profileTabItems = isOwner
    ? [
        { key: "published", label: t("user_profile.tabs.published", "作品"), icon: Grid },
        { key: "submissions", label: t("user_profile.tabs.submissions", "投稿"), icon: FileText },
        { key: "favorites", label: t("user_profile.tabs.favorites", "收藏"), icon: Heart },
        { key: "messages", label: t("user_profile.tabs.messages", "消息"), icon: Bell, badge: unreadCount },
        { key: "settings", label: t("user_profile.tabs.settings", "设置"), icon: Settings },
      ]
    : [
        { key: "published", label: t("user_profile.tabs.published", "作品"), icon: Grid },
        { key: "relations", label: "关系", icon: Users },
      ];
  const settingsTabItems = [
    { key: "profile-card", label: "个人名片设置", icon: User },
    { key: "activity-profile", label: "活动画像", icon: Sparkles },
    { key: "security", label: "安全相关", icon: Lock },
    { key: "identity", label: "个人认证", icon: Briefcase },
  ];

  const hasProfileCardContent = Boolean(
    profileCard?.slogan ||
    profileCard?.status ||
    profileCard?.tags?.length ||
    profileCard?.social_links?.length ||
    profileCard?.cards?.length
  );

  return (
    <PersonalCenterShell
      isDayMode={isDayMode}
      maxWidthClass="max-w-7xl"
      showAmbient={!prefersReducedMotion}
      className="pt-24 md:pt-12"
    >
        {/* Mobile account hub */}
        <div className="mb-5 space-y-4 md:hidden">
          <div
            className={`relative overflow-hidden rounded-[28px] border p-4 ${isDayMode ? "border-slate-200/80 bg-white/92 shadow-[0_18px_42px_rgba(148,163,184,0.16)]" : "border-white/10 bg-white/[0.04] shadow-[0_18px_42px_rgba(0,0,0,0.28)]"}`}
          >
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 ${isDayMode ? "bg-gradient-to-br from-indigo-100/90 via-white to-rose-50/70" : "bg-gradient-to-br from-indigo-500/18 via-transparent to-rose-500/10"}`} />
            <div className="relative flex items-start gap-3">
              <div className="relative shrink-0">
                <div
                  className={`h-[76px] w-[76px] overflow-hidden rounded-3xl border ${isDayMode ? "border-white bg-slate-100 shadow-[0_12px_24px_rgba(99,102,241,0.16)]" : "border-white/10 bg-white/10"}`}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-rose-500 text-2xl font-bold text-white">
                      {avatarInitial}
                    </div>
                  )}
                </div>
                <span
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isDayMode ? "border-white bg-white text-indigo-600 shadow-sm" : "border-white/10 bg-[#111827] text-indigo-200"}`}
                >
                  {roleLabel}
                </span>
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  {isOwner ? "我的主页" : "用户主页"}
                </div>
                <h1
                  className={`mt-1 truncate text-2xl font-bold leading-tight ${isDayMode ? "text-slate-950" : "text-white"}`}
                >
                  {displayName}
                </h1>
                <div className={`mt-1 flex min-h-[22px] items-center gap-1.5 text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  <Briefcase size={13} aria-hidden="true" />
                  <span className="truncate">
                    {user.organization_cr || user.username || "拓途浙享成员"}
                  </span>
                </div>
              </div>

              {isOwner ? (
                <button
                  type="button"
                  onClick={() => {
                    navigateProfileTab("settings");
                  }}
                  aria-label={t("user_profile.edit_profile", "编辑资料")}
                  className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "bg-white text-slate-700 shadow-[0_10px_20px_rgba(148,163,184,0.14)]" : "bg-white/10 text-white"}`}
                >
                  <Pencil size={18} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    currentUser
                      ? handleFollowToggle(user.id, Boolean(user.is_following))
                      : window.dispatchEvent(new Event("open-auth-modal"))
                  }
                  disabled={followLoading}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 disabled:opacity-60 ${user.is_following ? (isDayMode ? dayActiveSegmentClass : nightActiveSegmentClass) : "bg-indigo-600 text-white"}`}
                >
                  <PrimaryFollowIcon size={16} aria-hidden="true" />
                  {primaryFollowLabel}
                </button>
              )}
            </div>

            <div className={`relative mt-6 grid grid-cols-4 rounded-3xl border p-2 ${isDayMode ? "border-slate-200/80 bg-white/82" : "border-white/10 bg-black/16"}`}>
              {profileStats.map((stat) => {
                const content = (
                  <>
                    <div className={`text-lg font-bold leading-tight ${isDayMode ? "text-slate-950" : "text-white"}`}>
                      {stat.value}
                    </div>
                    <div className={`mt-1 text-[11px] font-medium ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                      {stat.label}
                    </div>
                  </>
                );

                if (stat.onClick) {
                  return (
                    <button
                      key={stat.key}
                      type="button"
                      onClick={stat.onClick}
                      className="min-h-[50px] rounded-2xl text-center transition-colors hover:bg-indigo-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <div key={stat.key} className="min-h-[50px] rounded-2xl text-center">
                    {content}
                  </div>
                );
              })}
            </div>
            {hasProfileCardContent && (
              <div className="relative mt-5 space-y-3">
                {profileCard.status && (
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${isDayMode ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-200"}`}>
                    {profileStatusLabel(profileCard.status)}
                  </span>
                )}
                {profileCard.slogan && (
                  <p className={`text-sm leading-relaxed ${isDayMode ? "text-slate-700" : "text-gray-200"}`}>
                    {profileCard.slogan}
                  </p>
                )}
                {profileCard.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {profileCard.tags.map((tag) => (
                      <span key={tag.id || tag.label} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isDayMode ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/15 text-indigo-200"}`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}
                <ProfileSocialLinks links={profileCard.social_links || []} isDayMode={isDayMode} />
                <ProfileCustomCards cards={profileCard.cards || []} isDayMode={isDayMode} />
              </div>
            )}
          </div>

        </div>

        {/* Profile Header */}
        <div
          className={`glass-panel hidden rounded-[2rem] p-5 md:block md:p-12 mb-6 md:mb-8 relative overflow-hidden shadow-2xl border group ${isDayMode ? "border-slate-200/80 bg-white/72 shadow-[0_28px_80px_rgba(148,163,184,0.18)]" : "border-white/10"}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-50 blur-3xl -z-10 group-hover:scale-105 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 -z-10" />

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 relative z-10">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div
                className={`w-24 h-24 md:w-40 md:h-40 rounded-full overflow-hidden border-4 shadow-2xl ${isDayMode ? "border-white/80" : "border-white/10"}`}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.nickname || user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl md:text-4xl font-bold text-white">
                    {(user.nickname || user.username || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <div
                className={`absolute -bottom-2 -right-2 backdrop-blur-md border px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-medium text-indigo-400 uppercase tracking-wider ${isDayMode ? "bg-white/90 border-slate-200/80" : "bg-black/80 border-white/10"}`}
              >
                {user.role}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left w-full">
              <div className="flex flex-col md:flex-row items-center md:justify-between gap-4 mb-4">
                <h1
                  className={`text-2xl md:text-5xl font-bold tracking-tight ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  {user.nickname || user.username}
                </h1>
                {isOwner && (
                  <button
                    onClick={() => {
                      navigateProfileTab("settings");
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${isDayMode ? "bg-white/90 hover:bg-white text-slate-700 border border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]" : "bg-white/10 hover:bg-white/20 text-white"}`}
                  >
                    <Settings size={16} />
                    {t("user_profile.edit_profile")}
                  </button>
                )}
                {!isOwner && (
                  <button
                    onClick={() =>
                      currentUser
                        ? handleFollowToggle(user.id, Boolean(user.is_following))
                        : window.dispatchEvent(new Event("open-auth-modal"))
                    }
                    disabled={followLoading}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${user.is_following ? (isDayMode ? dayActiveSegmentClass : nightActiveSegmentClass) : isDayMode ? "bg-white/90 hover:bg-white text-slate-700 border border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]" : "bg-white/10 hover:bg-white/20 text-white border border-white/10"} disabled:opacity-60`}
                  >
                    {!currentUser
                      ? "登录后关注"
                      : followLoading
                        ? "处理中..."
                        : user.is_following
                          ? "已关注"
                          : "关注"}
                  </button>
                )}
              </div>

              {user.organization_cr && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs md:text-sm font-medium mb-6">
                  <Briefcase size={14} />
                  {user.organization_cr}
                </div>
              )}

              {/* Stats */}
              <div
                className={`grid grid-cols-2 md:flex md:items-center justify-center md:justify-start gap-4 md:gap-12 border-t pt-6 ${isDayMode ? "border-slate-200/80" : "border-white/5"}`}
              >
                <div className="text-center md:text-left">
                  <div
                    className={`text-lg md:text-2xl font-bold mb-0.5 md:mb-1 ${isDayMode ? "text-slate-900" : "text-white"}`}
                  >
                    {resources.reduce(
                      (acc, curr) => acc + (curr.likes || 0),
                      0,
                    )}
                  </div>
                  <div
                    className={`text-[10px] md:text-xs uppercase tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                  >
                    {t("user_profile.stats.likes")}
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <div
                    className={`text-lg md:text-2xl font-bold mb-0.5 md:mb-1 ${isDayMode ? "text-slate-900" : "text-white"}`}
                  >
                    {resources.length}
                  </div>
                  <div
                    className={`text-[10px] md:text-xs uppercase tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                  >
                    {t("user_profile.stats.works")}
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <div
                    className={`text-lg md:text-2xl font-bold mb-0.5 md:mb-1 ${isDayMode ? "text-slate-900" : "text-white"}`}
                  >
                    {user.followers_count || 0}
                  </div>
                  <div
                    className={`text-[10px] md:text-xs uppercase tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                  >
                    粉丝
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <div
                    className={`text-lg md:text-2xl font-bold mb-0.5 md:mb-1 ${isDayMode ? "text-slate-900" : "text-white"}`}
                  >
                    {user.following_count || 0}
                  </div>
                  <div
                    className={`text-[10px] md:text-xs uppercase tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                  >
                    关注
                  </div>
                </div>
              </div>
              {hasProfileCardContent && (
                <div className={`mt-8 space-y-4 border-t pt-6 ${isDayMode ? "border-slate-200/80" : "border-white/5"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {profileCard.status && (
                      <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${isDayMode ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/15 text-emerald-200"}`}>
                        {profileStatusLabel(profileCard.status)}
                      </span>
                    )}
                    {profileCard.tags?.map((tag) => (
                      <span key={tag.id || tag.label} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isDayMode ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/15 text-indigo-200"}`}>
                        {tag.label}
                      </span>
                    ))}
                  </div>
                  {profileCard.slogan && (
                    <p className={`max-w-3xl text-base leading-relaxed ${isDayMode ? "text-slate-700" : "text-gray-200"}`}>
                      {profileCard.slogan}
                    </p>
                  )}
                  <ProfileSocialLinks links={profileCard.social_links || []} isDayMode={isDayMode} />
                  <ProfileCustomCards cards={profileCard.cards || []} isDayMode={isDayMode} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`mb-5 grid gap-1 rounded-3xl border p-1 md:hidden ${profileTabItems.length > 4 ? "grid-cols-5" : profileTabItems.length > 2 ? "grid-cols-4" : "grid-cols-2"} ${isDayMode ? "border-slate-200/80 bg-white/82 shadow-[0_12px_28px_rgba(148,163,184,0.12)]" : "border-white/10 bg-white/[0.04]"}`}>
          {profileTabItems.map(({ key, label, icon: Icon, badge }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  navigateProfileTab(key);
                }}
                className={`relative flex min-h-[46px] items-center justify-center gap-1.5 rounded-[20px] px-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${active ? (isDayMode ? dayActiveSegmentClass : nightActiveSegmentClass) : isDayMode ? "text-slate-500 hover:text-slate-950" : "text-gray-400 hover:text-white"}`}
              >
                <Icon size={15} aria-hidden="true" />
                <span className="truncate">{label}</span>
                {badge > 0 ? (
                  <span className={`absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ${active ? (isDayMode ? "ring-blue-50" : "ring-white") : isDayMode ? "ring-white" : "ring-[#111827]"}`} />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mb-6 hidden overflow-x-auto pb-2 custom-scrollbar gap-2 px-1 md:flex">
          <button
            onClick={() => {
              navigateProfileTab("relations");
            }}
            className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "relations"
                ? isDayMode
                  ? dayActiveSegmentClass
                  : nightActiveSegmentClass
                : isDayMode
                  ? "bg-white/85 text-slate-500 border border-slate-200/80 hover:bg-white hover:text-slate-900"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <User size={18} />
            关注关系
          </button>

          <button
            onClick={() => {
              navigateProfileTab("published");
            }}
            className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "published"
                ? isDayMode
                  ? dayActiveSegmentClass
                  : nightActiveSegmentClass
                : isDayMode
                  ? "bg-white/85 text-slate-500 border border-slate-200/80 hover:bg-white hover:text-slate-900"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Grid size={18} />
            {t("user_profile.tabs.published", "Published")}
          </button>

          {isOwner && (
            <>
              <button
                onClick={() => {
                  navigateProfileTab("submissions");
                }}
                className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "submissions"
                    ? isDayMode
                      ? dayActiveSegmentClass
                      : nightActiveSegmentClass
                    : isDayMode
                      ? "bg-white/85 text-slate-500 border border-slate-200/80 hover:bg-white hover:text-slate-900"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FileText size={18} />
                {t("user_profile.tabs.submissions", "投稿")}
              </button>
              <button
                onClick={() => {
                  navigateProfileTab("favorites");
                }}
                className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "favorites"
                    ? isDayMode
                      ? dayActiveSegmentClass
                      : nightActiveSegmentClass
                    : isDayMode
                      ? "bg-white/85 text-slate-500 border border-slate-200/80 hover:bg-white hover:text-slate-900"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Heart size={18} />
                {t("user_profile.tabs.favorites")}
              </button>
              <button
                onClick={() => {
                  navigateProfileTab("messages");
                }}
                className={`relative px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "messages"
                    ? isDayMode
                      ? dayActiveSegmentClass
                      : nightActiveSegmentClass
                    : isDayMode
                      ? "bg-white/85 text-slate-500 border border-slate-200/80 hover:bg-white hover:text-slate-900"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Bell size={18} />
                {t("user_profile.tabs.messages", "消息")}
                {isOwner && unreadCount > 0 && (
                  <span
                    aria-label={t(
                      "nav.unread_count",
                      "{{count}} 条未读通知",
                      { count: unreadCount },
                    )}
                    className={`absolute top-1.5 right-2 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ${
                      isDayMode ? "ring-white" : "ring-[#0a0a0a]"
                    }`}
                  />
                )}
              </button>
              <button
                onClick={() => {
                  navigateProfileTab("settings");
                }}
                className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "settings"
                    ? isDayMode
                      ? dayActiveSegmentClass
                      : nightActiveSegmentClass
                    : isDayMode
                      ? "bg-white/85 text-slate-500 border border-slate-200/80 hover:bg-white hover:text-slate-900"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Settings size={18} />
                {t("user_profile.tabs.settings", "Settings")}
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {activeTab === "published" && (
            <div className="space-y-6">
              {/* Content-type tabs. Always render so users can tell whether
                  they have any work at all; "all" is never hidden. */}
              <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
                {tabsWithCount.map((ct) => {
                  const active = activeContentType === ct.key;
                  return (
                    <button
                      key={ct.key}
                      type="button"
                      onClick={() => setActiveContentType(ct.key)}
                      className={`inline-flex min-h-[40px] shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
                        active
                          ? isDayMode
                            ? dayActiveSegmentClass
                            : nightActiveSegmentClass
                          : isDayMode
                            ? "bg-white/85 text-slate-600 border border-slate-200/80 hover:bg-white hover:text-slate-900"
                            : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{ct.label}</span>
                      <span
                        className={`ml-1.5 text-xs ${active ? "opacity-90" : "opacity-70"}`}
                      >
                        {ct.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {visibleContent.length === 0 ? (
                <div
                  className={`text-center py-20 rounded-3xl border border-dashed ${isDayMode ? "bg-white/82 border-slate-200/80" : "bg-white/5 border-white/5"}`}
                >
                  <p className={isDayMode ? "text-slate-500" : "text-gray-500"}>
                    {t("user_profile.no_published_works")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  {visibleContent.map((item) => (
                    <ProfileContentCard
                      key={`${item.type || "unknown"}-${item.id}`}
                      item={item}
                      onClick={() => handleContentClick(item)}
                      isDayMode={isDayMode}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "relations" && (
            <div className="space-y-4">
              <div className={`grid grid-cols-2 gap-1 rounded-3xl border p-1 md:inline-grid ${isDayMode ? "border-slate-200/80 bg-white/82" : "border-white/10 bg-white/[0.04]"}`}>
                <button
                  type="button"
                  onClick={() => setRelationTab("followers")}
                  className={`min-h-[42px] rounded-2xl px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${relationTab === "followers" ? (isDayMode ? dayActiveSegmentClass : nightActiveSegmentClass) : isDayMode ? "text-slate-600" : "text-gray-300"}`}
                >
                  粉丝
                </button>
                <button
                  type="button"
                  onClick={() => setRelationTab("following")}
                  className={`min-h-[42px] rounded-2xl px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${relationTab === "following" ? (isDayMode ? dayActiveSegmentClass : nightActiveSegmentClass) : isDayMode ? "text-slate-600" : "text-gray-300"}`}
                >
                  关注
                </button>
              </div>
              {relationLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : relations.length === 0 ? (
                <div
                  className={`text-center py-12 rounded-xl border border-dashed ${isDayMode ? "text-slate-500 bg-white/82 border-slate-200/80" : "text-gray-500 bg-black/20 border-white/5"}`}
                >
                  暂无数据
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {relations.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${isDayMode ? "bg-white/82 border-slate-200/80" : "bg-white/5 border-white/10"}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full overflow-hidden ${isDayMode ? "bg-slate-100" : "bg-black/40"}`}
                      >
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.nickname || item.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-indigo-400">
                            {(item.nickname || item.username || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/user/${item.id}`)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div
                          className={`font-semibold truncate ${isDayMode ? "text-slate-900" : "text-white"}`}
                        >
                          {item.nickname || item.username}
                        </div>
                        <div
                          className={`text-xs truncate ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                        >
                          {item.organization_cr || item.username}
                        </div>
                      </button>
                      {currentUser &&
                        String(currentUser.id) !== String(item.id) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRelationItemFollowToggle(
                                item.id,
                                Boolean(item.is_following),
                              )
                            }
                            disabled={Boolean(
                              relationFollowLoadingIds[item.id],
                            )}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${item.is_following ? (isDayMode ? "bg-indigo-600 text-white border-indigo-600 shadow-[0_10px_22px_rgba(99,102,241,0.2)]" : nightActiveSegmentClass) : isDayMode ? "bg-white text-slate-700 border-slate-200/80" : "bg-white/5 text-gray-300 border-white/10"} disabled:opacity-60`}
                          >
                            {relationFollowLoadingIds[item.id]
                              ? "处理中..."
                              : item.is_following
                                ? "已关注"
                                : "关注"}
                          </button>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isOwner && activeTab === "submissions" && (
            <UserCommunitySubmissions userId={user.id} isDayMode={isDayMode} />
          )}

          {isOwner && activeTab === "favorites" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3
                  className={`text-xl font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  {t("user_profile.favorites.title")}
                </h3>
                <div className="w-40">
                  <Dropdown
                    value={favoriteType}
                    onChange={setFavoriteType}
                    options={favoriteTypeOptions}
                    buttonClassName={
                      isDayMode
                        ? "bg-white/85 border-slate-200/80 text-slate-700 w-full"
                        : "bg-black/40 border-white/10 w-full"
                    }
                  />
                </div>
              </div>

              {loadingFavorites ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : favorites.length === 0 ? (
                <div
                  className={`text-center py-12 rounded-xl border border-dashed ${isDayMode ? "text-slate-500 bg-white/82 border-slate-200/80" : "text-gray-500 bg-black/20 border-white/5"}`}
                >
                  <Heart size={48} className="mx-auto mb-4 opacity-20" />
                  <p>{t("user_profile.favorites.no_favorites")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {favorites.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        const targetPath = buildFavoriteTargetPath(item);
                        // Mark so the detail page's close (X) can return here
                        // instead of stranding the user on the list.
                        if (targetPath) navigate(targetPath, { state: { fromFavorites: true } });
                      }}
                      className={`group flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl border backdrop-blur-md transition-all duration-300 ${isDayMode ? "bg-white/82 border-slate-200/80 hover:bg-white hover:border-indigo-200/80 shadow-[0_16px_36px_rgba(148,163,184,0.12)]" : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 hover:shadow-lg hover:shadow-black/20"}`}
                    >
                      <div
                        className={`w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg ${isDayMode ? "bg-slate-100" : "bg-black/50"}`}
                      >
                        <img
                          src={
                            item.cover ||
                            item.cover_url ||
                            item.thumbnail ||
                            item.url ||
                            item.image
                          }
                          alt={item.title}
                          className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`font-bold truncate text-base md:text-lg group-hover:text-indigo-400 transition-colors ${isDayMode ? "text-slate-900" : "text-white"}`}
                        >
                          {item.title}
                        </h4>
                        <p
                          className={`text-xs truncate ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                        >
                          {item.artist ||
                            item.category ||
                            t(`common.${item.type || favoriteType}`)}
                        </p>
                      </div>
                      <FavoriteButton
                        itemId={item.id}
                        itemType={item.type || favoriteType}
                        initialFavorited={true}
                        size={18}
                        showCount={true}
                        count={item.likes || 0}
                        className={`p-2.5 rounded-full transition-colors border border-transparent ${isDayMode ? "text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 hover:border-indigo-200/80" : "hover:bg-white/10 text-gray-400 hover:text-white hover:border-white/10"}`}
                        onToggle={(favorited) => {
                          if (!favorited) {
                            setFavorites((prev) =>
                              prev.filter((f) => f.id !== item.id),
                            );
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isOwner && activeTab === "messages" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3
                  className={`text-xl font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  {t("notifications.title", "通知中心")}
                </h3>
              </div>
              <NotificationCenter embedded />
            </div>
          )}

          {isOwner && activeTab === "settings" && (
            <div className="space-y-6">
              <div className={`flex gap-2 overflow-x-auto rounded-2xl border p-2 ${isDayMode ? "border-slate-200/80 bg-white/80" : "border-white/10 bg-white/[0.04]"}`}>
                {settingsTabItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSettingsTab === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setActiveSettingsTab(item.key);
                        navigate(profileTabPath("settings", item.key), { replace: true });
                      }}
                      className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                        isActive
                          ? isDayMode
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-indigo-500/20 text-indigo-100"
                          : isDayMode
                            ? "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            : "text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {activeSettingsTab === "profile-card" && (
                <div className="space-y-8">
              <div className={settingsPanelClass}>
                <h3
                  className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  <User size={20} className="text-indigo-500" />
                  头像与显示名称
                </h3>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="pt-2">
                    <label className={`block text-sm font-medium mb-2 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                      头像
                    </label>
                    <div className={`flex items-center gap-4 rounded-2xl border p-4 ${isDayMode ? "bg-slate-50/80 border-slate-200/80" : "bg-black/20 border-white/10"}`}>
                      <div className={`h-28 w-28 shrink-0 overflow-hidden rounded-2xl border ${isDayMode ? "border-white bg-slate-100" : "border-white/10 bg-white/10"}`}>
                        {avatarPreview ? (
                          <div data-avatar-crop-box className="relative h-full w-full select-none overflow-hidden">
                            <img src={avatarPreview} alt={displayName} className="absolute inset-0 h-full w-full object-cover opacity-55" draggable={false} />
                            <div
                              className="absolute cursor-move border-2 border-white bg-white/10 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]"
                              style={{
                                left: `${avatarCrop.x * 100}%`,
                                top: `${avatarCrop.y * 100}%`,
                                width: `${avatarCrop.size * 100}%`,
                                height: `${avatarCrop.size * 100}%`,
                              }}
                              onPointerDown={handleAvatarCropStart}
                            >
                              <div className="absolute bottom-1 right-1 rounded bg-black/45 px-1 py-0.5 text-[9px] font-bold text-white">1:1</div>
                            </div>
                          </div>
                        ) : user.avatar ? (
                          <img src={user.avatar} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-rose-500 text-2xl font-bold text-white">
                            {avatarInitial}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <label className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors ${isDayMode ? "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50" : "bg-white/10 text-white border border-white/10 hover:bg-white/15"}`}>
                          <Upload size={16} />
                          选择图片
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleAvatarSelect} />
                        </label>
                        <button type="button" onClick={handleAvatarUpload} disabled={!avatarFile || avatarLoading} className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                          {avatarLoading ? "上传中..." : "保存头像"}
                        </button>
                        <p className={`text-xs font-bold ${
                          avatarSaveState === "dirty"
                            ? "text-amber-500"
                            : avatarSaveState === "error"
                              ? "text-rose-500"
                              : isDayMode
                                ? "text-slate-500"
                                : "text-gray-500"
                        }`}>
                          {avatarSaveState === "dirty" ? "头像未保存" : avatarSaveState === "saving" ? "头像保存中..." : avatarSaveState === "error" ? "头像保存失败" : "头像已保存"}
                        </p>
                        <p className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>
                          支持 JPG、PNG 或 WebP，最大 5MB。选择图片后拖动 1:1 方框选择头像区域。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label
                      className={`block text-sm font-medium mb-2 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                    >
                      {t("user_profile.fields.nickname", "显示名称")}
                    </label>
                    <input
                      type="text"
                      value={profileData.nickname}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          nickname: e.target.value,
                        })
                      }
                      placeholder={t(
                        "user_profile.fields.nickname_placeholder",
                        "2-20 字符，可选；不填则显示账号名",
                      )}
                      maxLength={20}
                      className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 ${
                        isDayMode
                          ? "bg-slate-50 border border-slate-200/80 text-slate-900"
                          : "bg-black/20 border border-white/10 text-white"
                      }`}
                    />
                    <p
                      className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                    >
                      {t(
                        "user_profile.fields.nickname_help",
                        "允许中英文、数字、下划线；留空则清空。",
                      )}
                    </p>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                      {profileLoading ? t("common.saving") : t("common.save")}
                    </button>
                  </div>
                </form>
              </div>

              <div className={settingsPanelClass}>
                <h3
                  className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  <User size={20} className="text-indigo-500" />
                  个人名片
                </h3>
                <ProfileCardEditor
                  profileCard={profileCard}
                  isDayMode={isDayMode}
                  onSaved={(nextProfileCard) => setProfileCard(nextProfileCard)}
                />
              </div>
                </div>
              )}

              {activeSettingsTab === "activity-profile" && (
                <div className="space-y-6">
                  <div className={settingsPanelClass}>
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className={`flex items-center gap-2 text-xl font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}>
                          <Sparkles size={20} className="text-indigo-500" />
                          活动推荐画像
                        </h3>
                        <p className={`mt-2 max-w-2xl text-sm leading-6 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                          这里维护长期资料，活动推荐助手会自动读取这些信息，再结合收藏、报名和反馈做个性化排序。
                        </p>
                      </div>
                      <div className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${isDayMode ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"}`}>
                        <UserCheck size={15} />
                        用户系统资料源
                      </div>
                    </div>

                    {eventPreferenceLoading ? (
                      <div className={`flex min-h-[180px] items-center justify-center gap-2 rounded-2xl border ${isDayMode ? "border-slate-200/80 bg-slate-50/80 text-slate-500" : "border-white/10 bg-black/20 text-gray-400"}`}>
                        <Loader2 size={18} className="animate-spin" />
                        正在读取活动画像...
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          {[
                            ["college", "学院/组织", "计算机学院 / AI 社团", User],
                            ["division", "方向/专业", "人工智能 / 产品设计", Briefcase],
                            ["grade", "年级身份", "本科新生 / 研一", Calendar],
                            ["campus", "常用校区", "紫金港 / 玉泉", MapPin],
                          ].map(([key, label, placeholder, Icon]) => (
                            <label key={key} className={`grid gap-2 text-sm font-semibold ${isDayMode ? "text-slate-600" : "text-gray-300"}`}>
                              <span className="flex items-center gap-2">
                                <Icon size={15} />
                                {label}
                              </span>
                              <input
                                type="text"
                                value={eventPreferenceForm[key]}
                                onChange={(event) => updateEventPreferenceField(key, event.target.value)}
                                placeholder={placeholder}
                                className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 ${isDayMode ? "border border-slate-200/80 bg-slate-50 text-slate-900 placeholder:text-slate-400" : "border border-white/10 bg-black/20 text-white placeholder:text-gray-500"}`}
                              />
                            </label>
                          ))}
                        </div>

                        <label className={`grid gap-2 text-sm font-semibold ${isDayMode ? "text-slate-600" : "text-gray-300"}`}>
                          <span className="flex items-center gap-2">
                            <Clock3 size={15} />
                            空闲时间
                          </span>
                          <input
                            type="text"
                            value={eventPreferenceForm.availability}
                            onChange={(event) => updateEventPreferenceField("availability", event.target.value)}
                            placeholder="周三晚上、周末下午、考试周前不推荐"
                            className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 ${isDayMode ? "border border-slate-200/80 bg-slate-50 text-slate-900 placeholder:text-slate-400" : "border border-white/10 bg-black/20 text-white placeholder:text-gray-500"}`}
                          />
                        </label>

                        <label className={`grid gap-2 text-sm font-semibold ${isDayMode ? "text-slate-600" : "text-gray-300"}`}>
                          兴趣关键词
                          <input
                            type="text"
                            value={eventPreferenceForm.interestTagsText}
                            onChange={(event) => updateEventPreferenceField("interestTagsText", event.target.value)}
                            placeholder="AI、创业、志愿、摄影，用顿号或空格分隔"
                            className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 ${isDayMode ? "border border-slate-200/80 bg-slate-50 text-slate-900 placeholder:text-slate-400" : "border border-white/10 bg-black/20 text-white placeholder:text-gray-500"}`}
                          />
                        </label>

                        <div className="grid gap-5 lg:grid-cols-2">
                          <div>
                            <div className={`mb-3 text-sm font-bold ${isDayMode ? "text-slate-700" : "text-white"}`}>偏好活动类型</div>
                            <div className="flex flex-wrap gap-2">
                              {EVENT_CATEGORY_OPTIONS.map((option) => {
                                const active = eventPreferenceForm.preferredCategories.includes(option.value);
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleEventPreferenceArrayValue("preferredCategories", option.value)}
                                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${active ? "border-indigo-500 bg-indigo-600 text-white" : isDayMode ? "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700" : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"}`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <div className={`mb-3 text-sm font-bold ${isDayMode ? "text-slate-700" : "text-white"}`}>偏好收益</div>
                            <div className="flex flex-wrap gap-2">
                              {EVENT_BENEFIT_OPTIONS.map((option) => {
                                const active = eventPreferenceForm.preferredBenefits.includes(option.value);
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => toggleEventPreferenceArrayValue("preferredBenefits", option.value)}
                                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${active ? "border-emerald-500 bg-emerald-600 text-white" : isDayMode ? "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700" : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"}`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap gap-2">
                            {EVENT_FORMAT_OPTIONS.map((option) => {
                              const active = eventPreferenceForm.preferredFormat === option.value;
                              return (
                                <button
                                  key={option.value || "any"}
                                  type="button"
                                  onClick={() => updateEventPreferenceField("preferredFormat", option.value)}
                                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${active ? "border-sky-500 bg-sky-600 text-white" : isDayMode ? "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700" : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"}`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            onClick={handleEventPreferenceSave}
                            disabled={eventPreferenceSaving}
                            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {eventPreferenceSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            保存活动画像
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeSettingsTab === "security" && (
                <div className="space-y-8">
              <div className={settingsPanelClass}>
                <h3
                  className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  <Lock size={20} className="text-indigo-500" />
                  {t("user_profile.security.title")}
                </h3>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                    >
                      {t("user_profile.security.current_password")}
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 ${isDayMode ? "bg-slate-50 border border-slate-200/80 text-slate-900" : "bg-black/20 border border-white/10 text-white"}`}
                      required
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                    >
                      {t("user_profile.security.new_password")}
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 ${isDayMode ? "bg-slate-50 border border-slate-200/80 text-slate-900" : "bg-black/20 border border-white/10 text-white"}`}
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-medium mb-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                    >
                      {t("user_profile.security.confirm_password")}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 ${isDayMode ? "bg-slate-50 border border-slate-200/80 text-slate-900" : "bg-black/20 border border-white/10 text-white"}`}
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                  >
                    {passwordLoading
                      ? t("user_profile.security.updating")
                      : t("user_profile.security.update_btn")}
                  </button>
                </form>
              </div>

              <div className={settingsPanelClass}>
                <h3
                  className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  <Settings size={20} className="text-indigo-500" />
                  {t("me.preferences", "偏好与设备")}
                </h3>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => changeUiMode(isDayMode ? "dark" : "day")}
                    className={settingsActionClass}
                  >
                    <div
                      className={`${settingsIconClass} ${isDayMode ? "bg-amber-100 text-amber-500" : "text-yellow-300"}`}
                    >
                      {isDayMode ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-sm font-semibold">
                        {t("nav.appearance_mode", "显示模式")}
                      </div>
                      <div
                        className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                      >
                        {isDayMode
                          ? t("nav.night_mode", "夜间模式")
                          : t("nav.day_mode", "日间模式")}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={toggleWeatherWidget}
                    aria-pressed={showWeatherWidget}
                    className={settingsActionClass}
                  >
                    <div
                      className={`${settingsIconClass} ${isDayMode ? "bg-sky-50 text-sky-500" : "text-sky-300"}`}
                    >
                      <CloudSun size={18} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-sm font-semibold">
                        {t("me.weather_widget", "时间与天气")}
                      </div>
                      <div
                        className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                      >
                        {showWeatherWidget
                          ? t("me.weather_widget_on", "右上角显示时间和天气")
                          : t("me.weather_widget_off", "右上角默认隐藏")}
                      </div>
                    </div>
                    <span
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${settingsSwitchTrackClass}`}
                      aria-hidden="true"
                    >
                      <span
                        className={`h-5 w-5 rounded-full shadow-sm transition-transform ${settingsSwitchThumbClass}`}
                      />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      i18n.changeLanguage(i18n.language.startsWith("zh") ? "en" : "zh")
                    }
                    className={settingsActionClass}
                  >
                    <div className={settingsIconClass}>
                      <Globe size={18} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-sm font-semibold">
                        {t("me.language", "语言")}
                      </div>
                      <div
                        className={`text-xs mt-1 uppercase ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                      >
                        {i18n.language}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event("request-pwa-install"))}
                    className={settingsActionClass}
                  >
                    <div
                      className={`${settingsIconClass} ${isDayMode ? "bg-indigo-50 text-indigo-500" : ""}`}
                    >
                      <Download size={18} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-sm font-semibold">
                        {t("me.install_app", "安装应用")}
                      </div>
                      <div
                        className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                      >
                        {t("me.install_app_hint", "在支持的浏览器中安装为桌面应用。")}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className={settingsActionClass}
                  >
                    <div className={settingsIconClass}>
                      <LogOut size={18} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-sm font-semibold">
                        {t("auth.log_out", "退出登录")}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
                </div>
              )}

              {activeSettingsTab === "identity" && (
              <div className={settingsPanelClass}>
                <h3
                  className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  <Briefcase size={20} className="text-indigo-500" />
                  成果认领
                </h3>

                <div className="space-y-5">
                  <div className={`rounded-2xl border p-4 ${isDayMode ? "bg-slate-50/80 border-slate-200/80" : "bg-black/20 border-white/10"}`}>
                    <div className={`text-sm font-bold mb-3 ${isDayMode ? "text-slate-800" : "text-white"}`}>当前组织/社团</div>
                    <div className={`rounded-xl border px-3 py-2 text-sm font-bold ${isDayMode ? "bg-white border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-gray-200"}`}>
                      {user?.organization_cr || profileData.organization || "暂未认证组织/社团"}
                    </div>
                    <p className={`mt-2 text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>
                      组织/社团认证请使用下方认证入口，并填写对应邀请码。
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-4 ${isDayMode ? "bg-slate-50/80 border-slate-200/80" : "bg-black/20 border-white/10"}`}>
                    <div className={`text-sm font-bold mb-3 ${isDayMode ? "text-slate-800" : "text-white"}`}>身份认证</div>
                    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2">
                      <select
                        value={identityType}
                        onChange={(event) => setIdentityType(event.target.value)}
                        className={`rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 ${isDayMode ? "bg-white border border-slate-200 text-slate-900" : "bg-black/30 border border-white/10 text-white"}`}
                      >
                        <option value="person">个人</option>
                        <option value="team">团队</option>
                        <option value="club">组织/社团</option>
                      </select>
                      <input
                        type="text"
                        value={identityName}
                        onChange={(event) => setIdentityName(event.target.value)}
                        placeholder={identityType === "club" ? "填写组织或社团名称" : "填写用于匹配成果的名称"}
                        className={`rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 ${isDayMode ? "bg-white border border-slate-200 text-slate-900" : "bg-black/30 border border-white/10 text-white"}`}
                      />
                    </div>
                    {identityType === "club" && (
                      <input
                        type="text"
                        value={identityInviteCode}
                        onChange={(event) => setIdentityInviteCode(event.target.value)}
                        placeholder="填写组织/社团邀请码"
                        className={`mt-2 w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 ${isDayMode ? "bg-white border border-slate-200 text-slate-900" : "bg-black/30 border border-white/10 text-white"}`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={handleCreateIdentityClaim}
                      disabled={identityLoading}
                      className="mt-3 inline-flex min-h-[38px] items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {identityLoading ? "提交中..." : identityType === "club" ? "认证组织/社团" : "添加身份"}
                    </button>
                    <div className="mt-4 space-y-2">
                      {identityClaims.length === 0 ? (
                        <p className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>暂无认证身份。</p>
                      ) : identityClaims.map((claim) => (
                        <div key={claim.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${isDayMode ? "bg-white border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-gray-200"}`}>
                          <span className="font-bold">{claim.display_name}</span>
                          <span className={`ml-auto text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>{identityTypeLabel(claim.type)} · {identityStatusLabel(claim.status)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`rounded-2xl border p-4 ${isDayMode ? "bg-slate-50/80 border-slate-200/80" : "bg-black/20 border-white/10"}`}>
                    <div className={`text-sm font-bold mb-3 ${isDayMode ? "text-slate-800" : "text-white"}`}>可能属于你的成果</div>
                    {outcomeLinksLoading ? (
                      <p className={`text-sm ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>加载中...</p>
                    ) : outcomeLinks.length === 0 ? (
                      <p className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>暂未匹配到可认领成果。</p>
                    ) : (
                      <div className="space-y-3">
                        {outcomeLinks.slice(0, 8).map((link) => (
                          <div key={link.link_id || `${link.id}-${link.identity_claim_id}`} className={`rounded-xl border p-3 ${isDayMode ? "bg-white border-slate-200" : "bg-white/5 border-white/10"}`}>
                            <div className={`text-sm font-bold line-clamp-1 ${isDayMode ? "text-slate-900" : "text-white"}`}>{link.title}</div>
                            <div className={`mt-1 text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>
                              {link.bound_identity_name || link.matched_text || link.author} · {outcomeStatusLabel(link.binding_status)}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {link.binding_status !== "confirmed" && (
                                <button type="button" disabled={outcomeActionId === link.link_id} onClick={() => handleOutcomeAction(link.link_id, "confirm")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">确认</button>
                              )}
                              {link.binding_status === "candidate" && (
                                <button type="button" disabled={outcomeActionId === link.link_id} onClick={() => handleOutcomeAction(link.link_id, "reject")} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">拒绝</button>
                              )}
                              {link.binding_status === "confirmed" && (
                                <button type="button" disabled={outcomeActionId === link.link_id} onClick={() => handleOutcomeAction(link.link_id, "revoke")} className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">撤销</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
    </PersonalCenterShell>
  );
};

export default PublicProfile;
