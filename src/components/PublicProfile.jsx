import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  User,
  Calendar,
  Grid,
  Briefcase,
  Settings,
  Heart,
  Bell,
  Lock,
  Image,
  Music,
  Film,
  FileText,
  Download,
  Globe,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import Dropdown from "./Dropdown";
import FavoriteButton from "./FavoriteButton";
import NotificationCenter from "./NotificationCenter";
import PersonalCenterShell from "./PersonalCenterShell";
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
];

// Visual metadata per content type (badge + gradient placeholder).
const TYPE_META = {
  photo: { label: "图片", color: "from-pink-500 to-rose-400", icon: "📷" },
  video: { label: "视频", color: "from-emerald-500 to-teal-400", icon: "📹" },
  music: { label: "音乐", color: "from-purple-500 to-fuchsia-400", icon: "🎵" },
  article: { label: "文章", color: "from-orange-500 to-amber-400", icon: "📝" },
  event: { label: "活动", color: "from-blue-500 to-cyan-400", icon: "🎪" },
  news: { label: "新闻", color: "from-gray-500 to-slate-400", icon: "📰" },
  help: { label: "求助", color: "from-yellow-500 to-amber-400", icon: "💬" },
  team: { label: "组队", color: "from-indigo-500 to-violet-400", icon: "👥" },
};

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
  return raw;
};

function ProfileContentCard({ item, onClick, isDayMode }) {
  const typeKey = normalizeContentType(item) || "article";
  const meta = TYPE_META[typeKey] || TYPE_META.article;
  const cover =
    item.cover || item.thumbnail || (typeKey === "photo" ? item.url || item.image : null);
  const dateSource = item.created_at || item.createdAt || item.published_at;
  const dateStr = dateSource ? new Date(dateSource).toLocaleDateString() : "";
  const title = item.title || "(无标题)";
  const likes = Number(item.likes) || 0;
  const cardBorder = isDayMode
    ? "border border-slate-200/80 bg-white/82 shadow-[0_16px_36px_rgba(148,163,184,0.12)] hover:border-indigo-300"
    : "border border-white/10 bg-white/5 hover:border-orange-400/40";
  const titleColor = isDayMode ? "text-slate-900" : "text-white";
  const dateColor = isDayMode ? "text-slate-500" : "text-gray-400";
  const captionBg = isDayMode
    ? "bg-white/90 backdrop-blur"
    : "bg-black/50 backdrop-blur";
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
      className={`group cursor-pointer rounded-2xl overflow-hidden transition ${cardBorder}`}
    >
      <div className="aspect-[3/4] relative">
        {cover ? (
          <img
            src={cover}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${meta.color} opacity-70 flex items-center justify-center text-5xl`}
          >
            <span aria-hidden="true">{meta.icon}</span>
          </div>
        )}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-md text-[10px] font-bold bg-black/60 backdrop-blur text-white tracking-wide uppercase">
          {meta.label}
        </div>
        {likes > 0 && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-md text-[11px] bg-black/60 backdrop-blur text-white flex items-center gap-1">
            <span aria-hidden="true">♥</span>
            <span>{likes}</span>
          </div>
        )}
      </div>
      <div className={`px-3 py-2 ${captionBg}`}>
        <div className={`text-sm font-semibold line-clamp-1 ${titleColor}`}>
          {title}
        </div>
        {dateStr && (
          <div className={`text-[10px] mt-1 ${dateColor}`}>{dateStr}</div>
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
  const { settings, uiMode, changeUiMode } = useSettings();
  const id = profileId ?? routeId;

  const [user, setUser] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("published");
  const [activeContentType, setActiveContentType] = useState("all");
  const isOwner =
    currentUser && user && String(currentUser.id) === String(user.id);
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === "day";
  const settingsPanelClass = isDayMode
    ? "rounded-2xl p-4 md:p-6 border h-fit bg-white/82 border-slate-200/80 shadow-[0_18px_40px_rgba(148,163,184,0.12)]"
    : "rounded-2xl p-4 md:p-6 border h-fit bg-white/5 border-white/10";
  const settingsActionClass = isDayMode
    ? "w-full flex items-center gap-3 rounded-2xl border px-4 py-4 transition-colors bg-slate-50/90 border-slate-200/80 text-slate-800 hover:bg-white"
    : "w-full flex items-center gap-3 rounded-2xl border px-4 py-4 transition-colors bg-white/5 border-white/10 text-white hover:bg-white/10";
  const settingsIconClass = isDayMode
    ? "h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700"
    : "h-10 w-10 rounded-xl flex items-center justify-center bg-white/10 text-white";

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
  const [isInviteCodeVerified, setIsInviteCodeVerified] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // FIX: BUG-24 — Add AbortController to cancel stale requests when switching profiles
  useEffect(() => {
    if (!id) return;

    const abortController = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        const [userRes, resourcesRes] = await Promise.all([
          api.get(`/users/${id}/profile`, { signal: abortController.signal }),
          api.get(`/users/${id}/resources`, { signal: abortController.signal }),
        ]);
        if (abortController.signal.aborted) return;
        setUser(userRes.data);
        setResources(resourcesRes.data);

        // Init profile data if owner
        if (currentUser && String(currentUser.id) === String(userRes.data.id)) {
          setProfileData({
            organization:
              userRes.data.organization_cr || currentUser.organization || "",
            nickname: userRes.data.nickname || currentUser.nickname || "",
            inviteCode: "",
          });
          setIsInviteCodeVerified(
            !!(userRes.data.organization_cr || currentUser.organization),
          );
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch profile", err);
        }
        setError("User not found");
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

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      // Nickname is handled via PUT /users/:id (backend validates + 409s on
      // collision). Only send if it has actually changed, so untouched
      // profiles don't run through unique-index checks unnecessarily.
      const trimmedNickname = (profileData.nickname || "").trim();
      const currentNickname = user?.nickname || "";
      if (trimmedNickname !== currentNickname) {
        await api.put(`/users/${user.id}`, { nickname: trimmedNickname });
      }

      // Only PUT organization when the invite code has been verified in
      // this session — otherwise a nickname-only save would blank out the
      // user's existing organization_cr on the server.
      if (isInviteCodeVerified) {
        const payload = {
          organization_cr: profileData.organization,
          invitation_code: profileData.inviteCode,
        };
        await api.put("/auth/profile", payload);
      }

      toast.success(t("user_profile.profile_updated"));
      await refreshUser();

      // Update local user state to reflect changes immediately
      setUser((prev) => ({
        ...prev,
        organization_cr: profileData.organization,
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

  const handleVerifyInviteCode = () => {
    if (!profileData.inviteCode) {
      toast.error(t("user_profile.invite_code_required"));
      return;
    }
    if (profileData.inviteCode === settings.invite_code) {
      setIsInviteCodeVerified(true);
      toast.success(t("user_profile.invite_code_verified"));
    } else {
      toast.error(t("user_profile.invite_code_invalid"));
      setIsInviteCodeVerified(false);
    }
  };

  const buildFavoriteTargetPath = (item) => {
    const itemType = String(item?.type || favoriteType || "").trim().toLowerCase();
    const itemId = item?.id;
    if (!itemId) return null;

    const routeMap = {
      photo: "/gallery",
      music: "/music",
      video: "/videos",
      // Articles live under the AICommunity "tech" tab — must pin the tab
      // or AICommunity defaults to the help board and the id is ignored.
      article: "/articles?tab=tech",
      event: "/events",
    };

    const basePath = routeMap[itemType];
    if (!basePath) return null;
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
      music: `/music?id=${item.id}`,
      article: `/articles?id=${item.id}&tab=tech`,
      event: `/events?id=${item.id}`,
      news: `/news?id=${item.id}`,
      help: `/articles?tab=help&post=${item.id}`,
      team: `/articles?tab=team&post=${item.id}`,
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
          {t("user_profile.user_not_found")}
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
  ];

  return (
    <PersonalCenterShell
      isDayMode={isDayMode}
      maxWidthClass="max-w-7xl"
      showAmbient={!prefersReducedMotion}
    >
        {/* Profile Header */}
        <div
          className={`glass-panel rounded-[2rem] p-5 md:p-12 mb-6 md:mb-8 relative overflow-hidden shadow-2xl border group ${isDayMode ? "border-slate-200/80 bg-white/72 shadow-[0_28px_80px_rgba(148,163,184,0.18)]" : "border-white/10"}`}
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
                    onClick={() => setActiveTab("settings")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${isDayMode ? "bg-white/90 hover:bg-white text-slate-700 border border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]" : "bg-white/10 hover:bg-white/20 text-white"}`}
                  >
                    <Settings size={16} />
                    {t("user_profile.edit_profile")}
                  </button>
                )}
                {!isOwner && (
                  <button
                    onClick={() =>
                      handleFollowToggle(user.id, Boolean(user.is_following))
                    }
                    disabled={followLoading || !currentUser}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${user.is_following ? (isDayMode ? "bg-indigo-600 text-white shadow-[0_12px_28px_rgba(99,102,241,0.22)]" : "bg-white text-black") : isDayMode ? "bg-white/90 hover:bg-white text-slate-700 border border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]" : "bg-white/10 hover:bg-white/20 text-white border border-white/10"} disabled:opacity-60`}
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
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex overflow-x-auto pb-2 custom-scrollbar gap-2 px-1">
          <button
            onClick={() => setActiveTab("relations")}
            className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "relations"
                ? isDayMode
                  ? "bg-indigo-600 text-white shadow-[0_12px_28px_rgba(99,102,241,0.22)]"
                  : "bg-white text-black"
                : isDayMode
                  ? "bg-white/85 text-slate-500 border border-slate-200/80 hover:bg-white hover:text-slate-900"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            <User size={18} />
            关注关系
          </button>

          <button
            onClick={() => setActiveTab("published")}
            className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === "published"
                ? isDayMode
                  ? "bg-indigo-600 text-white shadow-[0_12px_28px_rgba(99,102,241,0.22)]"
                  : "bg-white text-black"
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
                onClick={() => setActiveTab("favorites")}
                className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "favorites"
                    ? isDayMode
                      ? "bg-indigo-600 text-white shadow-[0_12px_28px_rgba(99,102,241,0.22)]"
                      : "bg-white text-black"
                    : isDayMode
                      ? "bg-white/85 text-slate-500 border border-slate-200/80 hover:bg-white hover:text-slate-900"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Heart size={18} />
                {t("user_profile.tabs.favorites")}
              </button>
              <button
                onClick={() => setActiveTab("messages")}
                className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "messages"
                    ? isDayMode
                      ? "bg-indigo-600 text-white shadow-[0_12px_28px_rgba(99,102,241,0.22)]"
                      : "bg-white text-black"
                    : isDayMode
                      ? "bg-white/85 text-slate-500 border border-slate-200/80 hover:bg-white hover:text-slate-900"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Bell size={18} />
                {t("user_profile.tabs.messages", "消息")}
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "settings"
                    ? isDayMode
                      ? "bg-indigo-600 text-white shadow-[0_12px_28px_rgba(99,102,241,0.22)]"
                      : "bg-white text-black"
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
              <div className="flex flex-wrap gap-2">
                {tabsWithCount.map((ct) => {
                  const active = activeContentType === ct.key;
                  return (
                    <button
                      key={ct.key}
                      type="button"
                      onClick={() => setActiveContentType(ct.key)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                        active
                          ? isDayMode
                            ? "bg-indigo-600 text-white shadow-[0_12px_28px_rgba(99,102,241,0.22)]"
                            : "bg-white text-black"
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRelationTab("followers")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${relationTab === "followers" ? (isDayMode ? "bg-indigo-600 text-white shadow-[0_12px_28px_rgba(99,102,241,0.2)]" : "bg-white text-black") : isDayMode ? "bg-white border border-slate-200/80 text-slate-600" : "bg-white/5 border border-white/10 text-gray-300"}`}
                >
                  粉丝
                </button>
                <button
                  type="button"
                  onClick={() => setRelationTab("following")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${relationTab === "following" ? (isDayMode ? "bg-indigo-600 text-white shadow-[0_12px_28px_rgba(99,102,241,0.2)]" : "bg-white text-black") : isDayMode ? "bg-white border border-slate-200/80 text-slate-600" : "bg-white/5 border border-white/10 text-gray-300"}`}
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
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${item.is_following ? (isDayMode ? "bg-indigo-600 text-white border-indigo-600 shadow-[0_10px_22px_rgba(99,102,241,0.2)]" : "bg-white text-black border-white") : isDayMode ? "bg-white text-slate-700 border-slate-200/80" : "bg-white/5 text-gray-300 border-white/10"} disabled:opacity-60`}
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Profile Settings */}
              <div className={settingsPanelClass}>
                <h3
                  className={`text-xl font-bold mb-6 flex items-center gap-2 ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  <User size={20} className="text-indigo-500" />
                  {t("user_profile.tabs.profile")}
                </h3>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
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

                  <div className="pt-2">
                    <label
                      className={`block text-sm font-medium mb-2 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                    >
                      {t("user_profile.fields.organization")}
                    </label>

                    {!isInviteCodeVerified && (
                      <div className="mb-4 space-y-2">
                        <label
                          className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                        >
                          {t("user_profile.fields.invite_code_label")}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={profileData.inviteCode}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                inviteCode: e.target.value,
                              })
                            }
                            placeholder={t(
                              "user_profile.fields.invite_code_hint",
                            )}
                            className={`flex-1 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 ${isDayMode ? "bg-slate-50 border border-slate-200/80 text-slate-900" : "bg-black/20 border border-white/10 text-white"}`}
                          />
                          <button
                            type="button"
                            onClick={handleVerifyInviteCode}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
                          >
                            {t("common.verify")}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={profileData.organization}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            organization: e.target.value,
                          })
                        }
                        placeholder={t("user_profile.fields.org_placeholder")}
                        disabled={!isInviteCodeVerified}
                        className={`w-full rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 ${isDayMode ? "bg-slate-50 border border-slate-200/80 text-slate-900" : "bg-black/20 border border-white/10 text-white"} ${!isInviteCodeVerified ? "opacity-50 cursor-not-allowed" : ""}`}
                      />
                      <p
                        className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                      >
                        {t("user_profile.fields.org_help")}
                      </p>
                    </div>
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

              {/* Security Settings */}
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
        </div>
    </PersonalCenterShell>
  );
};

export default PublicProfile;
