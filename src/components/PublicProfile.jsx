import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Calendar,
  MapPin,
  Grid,
  Briefcase,
  Clock,
  Award,
  Settings,
  Heart,
  Lock,
  Image,
  Music,
  Film,
  FileText,
} from "lucide-react";
import api from "../services/api";
import SmartImage from "./SmartImage";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import Dropdown from "./Dropdown";
import FavoriteButton from "./FavoriteButton";
import { useReducedMotion } from "../utils/animations";

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user: currentUser, logout, refreshUser } = useAuth();
  const { settings, uiMode } = useSettings();

  const [user, setUser] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("published");
  const isOwner =
    currentUser && user && String(currentUser.id) === String(user.id);
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === "day";

  // Favorites State
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favoriteType, setFavoriteType] = useState("photo");
  const [followLoading, setFollowLoading] = useState(false);
  const [relationTab, setRelationTab] = useState("followers");
  const [relationLoading, setRelationLoading] = useState(false);
  const [relations, setRelations] = useState([]);
  const [relationFollowLoadingIds, setRelationFollowLoadingIds] = useState({});

  // Settings State
  const [profileData, setProfileData] = useState({
    organization: "",
    inviteCode: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [isInviteCodeVerified, setIsInviteCodeVerified] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [userRes, resourcesRes] = await Promise.all([
          api.get(`/users/${id}/profile`),
          api.get(`/users/${id}/resources`),
        ]);
        setUser(userRes.data);
        setResources(resourcesRes.data);

        // Init profile data if owner
        if (currentUser && String(currentUser.id) === String(userRes.data.id)) {
          setProfileData({
            organization: currentUser.organization || "",
            inviteCode: "",
          });
          setIsInviteCodeVerified(!!currentUser.organization);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch profile", err);
        }
        setError("User not found");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
      setActiveTab("published"); // Reset tab on id change
    }
  }, [id, currentUser?.id]);

  useEffect(() => {
    if (!isOwner) return;

    if (activeTab === "favorites") {
      fetchFavorites();
    }
  }, [activeTab, favoriteType, isOwner]);

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
      const res = await api.get(`/favorites?type=${favoriteType}`);
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
      const payload = {
        organization_cr: profileData.organization,
        invitation_code: profileData.inviteCode,
      };

      await api.put("/auth/profile", payload);
      toast.success(t("user_profile.profile_updated"));
      await refreshUser();

      // Update local user state to reflect changes immediately
      setUser((prev) => ({
        ...prev,
        organization_cr: profileData.organization,
      }));
    } catch (err) {
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
    { value: "photo", label: t("nav.gallery"), icon: Image },
    { value: "music", label: t("nav.music"), icon: Music },
    { value: "video", label: t("nav.videos"), icon: Film },
    { value: "article", label: t("nav.articles"), icon: FileText },
    { value: "event", label: t("nav.events"), icon: Calendar },
  ];

  return (
    <div
      className={`min-h-screen pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+88px)] px-3 md:px-8 relative overflow-hidden ${isDayMode ? "bg-transparent" : "bg-[#0a0a0a]"}`}
    >
      {!prefersReducedMotion && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[130px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[130px]" />
        </div>
      )}

      <div className="max-w-7xl mx-auto relative z-10">
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
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${user.is_following ? (isDayMode ? "bg-slate-900 text-white" : "bg-white text-black") : isDayMode ? "bg-white/90 hover:bg-white text-slate-700 border border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]" : "bg-white/10 hover:bg-white/20 text-white border border-white/10"} disabled:opacity-60`}
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
                  ? "bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
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
                  ? "bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
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
                      ? "bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
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
                onClick={() => setActiveTab("settings")}
                className={`px-6 py-3 rounded-full font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "settings"
                    ? isDayMode
                      ? "bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
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
          {activeTab === "published" &&
            (resources.length === 0 ? (
              <div
                className={`text-center py-20 rounded-3xl border border-dashed ${isDayMode ? "bg-white/82 border-slate-200/80" : "bg-white/5 border-white/5"}`}
              >
                <p className={isDayMode ? "text-slate-500" : "text-gray-500"}>
                  {t("user_profile.no_published_works")}
                </p>
              </div>
            ) : (
              <div className="columns-2 gap-3 space-y-3 md:columns-2 lg:columns-3 md:gap-6 md:space-y-6">
                {resources.map((item) => (
                  <motion.div
                    key={`${item.type}-${item.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`break-inside-avoid relative group rounded-xl md:rounded-2xl overflow-hidden border hover:border-indigo-500/30 transition-all duration-300 ${isDayMode ? "bg-white/82 border-slate-200/80 shadow-[0_16px_36px_rgba(148,163,184,0.12)]" : "bg-white/5 border-white/10"}`}
                  >
                    <div
                      className={`aspect-w-16 aspect-h-9 relative ${isDayMode ? "bg-slate-100" : "bg-black/50"}`}
                    >
                      {isOwner && item.status && (
                        <div className="absolute top-2 right-2 z-20">
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase backdrop-blur-md shadow-lg ${
                              item.status === "approved"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : item.status === "rejected"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            }`}
                          >
                            {t(`user_profile.uploads.status.${item.status}`) ||
                              item.status}
                          </span>
                        </div>
                      )}
                      {(item.type === "photos" || item.type === "events") && (
                        <SmartImage
                          src={item.url || item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {item.type === "videos" && (
                        <SmartImage
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {item.type === "articles" && (
                        <SmartImage
                          src={item.cover}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {item.type === "music" && (
                        <div
                          className={`w-full h-full flex items-center justify-center ${isDayMode ? "bg-gradient-to-br from-slate-200 to-slate-100" : "bg-gradient-to-br from-gray-800 to-black"}`}
                        >
                          {item.cover ? (
                            <img
                              src={item.cover}
                              alt={item.title}
                              className="w-full h-full object-cover opacity-50"
                            />
                          ) : (
                            <div
                              className={
                                isDayMode ? "text-slate-400" : "text-gray-600"
                              }
                            >
                              <Briefcase />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className={`p-3 md:p-4 relative z-10 -mt-10 pt-14 md:-mt-12 md:pt-16 ${isDayMode ? "bg-gradient-to-t from-white via-white/95 to-transparent" : "bg-gradient-to-t from-black/90 to-transparent"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                          {t(
                            `common.${item.type === "music" ? "music" : item.type.slice(0, -1)}`,
                          )}
                        </span>
                        <span
                          className={`text-[10px] md:text-xs flex items-center gap-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                        >
                          <Award size={10} className="md:w-3 md:h-3" />{" "}
                          {item.likes || 0}
                        </span>
                      </div>
                      <h3
                        className={`text-xs md:text-lg font-bold leading-tight mb-0.5 md:mb-1 line-clamp-1 md:line-clamp-2 ${isDayMode ? "text-slate-900" : "text-white"}`}
                      >
                        {item.title}
                      </h3>
                      <p
                        className={`text-[10px] md:text-xs line-clamp-1 md:line-clamp-2 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                      >
                        {item.description || item.excerpt || item.artist}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}

          {activeTab === "relations" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRelationTab("followers")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${relationTab === "followers" ? (isDayMode ? "bg-slate-900 text-white" : "bg-white text-black") : isDayMode ? "bg-white border border-slate-200/80 text-slate-600" : "bg-white/5 border border-white/10 text-gray-300"}`}
                >
                  粉丝
                </button>
                <button
                  type="button"
                  onClick={() => setRelationTab("following")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${relationTab === "following" ? (isDayMode ? "bg-slate-900 text-white" : "bg-white text-black") : isDayMode ? "bg-white border border-slate-200/80 text-slate-600" : "bg-white/5 border border-white/10 text-gray-300"}`}
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
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${item.is_following ? (isDayMode ? "bg-slate-900 text-white border-slate-900" : "bg-white text-black border-white") : isDayMode ? "bg-white text-slate-700 border-slate-200/80" : "bg-white/5 text-gray-300 border-white/10"} disabled:opacity-60`}
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
                        itemType={favoriteType}
                        initialFavorited={true}
                        size={18}
                        showCount={false}
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

          {isOwner && activeTab === "settings" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Profile Settings */}
              <div
                className={`rounded-2xl p-4 md:p-6 border h-fit ${isDayMode ? "bg-white/82 border-slate-200/80 shadow-[0_18px_40px_rgba(148,163,184,0.12)]" : "bg-white/5 border-white/10"}`}
              >
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

                  {isInviteCodeVerified && (
                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                      >
                        {profileLoading ? t("common.saving") : t("common.save")}
                      </button>
                    </div>
                  )}
                </form>
              </div>

              {/* Security Settings */}
              <div
                className={`rounded-2xl p-4 md:p-6 border h-fit ${isDayMode ? "bg-white/82 border-slate-200/80 shadow-[0_18px_40px_rgba(148,163,184,0.12)]" : "bg-white/5 border-white/10"}`}
              >
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
