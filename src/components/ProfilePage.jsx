import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Edit3,
  ExternalLink,
  FileText,
  Grid3X3,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  MapPin,
  Newspaper,
  Radio,
  Save,
  Search,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import api, { getUserSystemOverview, uploadFile } from "../services/api";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import SEO from "./SEO";
import OfficialVerificationBadge from "./OfficialVerificationBadge";
import UserSystemOverview from "./profile/UserSystemOverview";
import { useTranslation } from "react-i18next";

const TYPE_META = {
  person: { labelKey: "profiles.types.person", icon: User, tone: "sky" },
  club: { labelKey: "profiles.types.club", icon: Users, tone: "violet" },
  school: { labelKey: "profiles.types.school", icon: Building2, tone: "emerald" },
  enterprise: { labelKey: "profiles.types.enterprise", icon: Building2, tone: "amber" },
  organization: { labelKey: "profiles.types.organization", icon: Users, tone: "indigo" },
};

const FEED_TABS = [
  { key: "all", labelKey: "profiles.page.tabs.all", icon: Grid3X3 },
  { key: "events", labelKey: "profiles.page.tabs.events", icon: CalendarDays },
  { key: "articles", labelKey: "profiles.page.tabs.articles", icon: FileText },
  { key: "news", labelKey: "profiles.page.tabs.news", icon: Newspaper },
  { key: "media", labelKey: "profiles.page.tabs.media", icon: ImageIcon },
  { key: "posts", labelKey: "profiles.page.tabs.posts", icon: Radio },
];

const typeMeta = (type) => TYPE_META[type] || TYPE_META.organization;

const formatDate = (value) => {
  if (!value) return "";
  return String(value).replace("T", " ").slice(0, 16);
};

const profileImage = (profile) =>
  profile?.logo_url || profile?.avatar_url || profile?.cover_url || "";

const profileRoute = (profile) =>
  profile?.type === "person" ? `/u/${profile.handle}` : `/org/${profile.handle}`;

const feedTarget = (item) => {
  if (item.type === "event") return `/events?id=${item.id}`;
  if (item.type === "article") return `/articles?article=${item.id}`;
  if (item.type === "news") return `/articles?news=${item.id}`;
  return "";
};

const editableFormFromProfile = (profile = {}) => ({
  display_name: profile.display_name || "",
  display_name_en: profile.display_name_en || "",
  avatar_url: profile.avatar_url || "",
  logo_url: profile.logo_url || "",
  cover_url: profile.cover_url || "",
  bio: profile.bio || "",
  description: profile.description || "",
  description_en: profile.description_en || "",
  cooperation_direction: profile.cooperation_direction || "",
  cooperation_direction_en: profile.cooperation_direction_en || "",
  link_url: profile.link_url || "",
});

const canEditProfile = (profile, currentUser) => {
  if (!profile || !currentUser) return false;
  if (currentUser.role === "admin") return true;
  if (profile.owner_user_id && String(profile.owner_user_id) === String(currentUser.id)) return true;
  return profile.member_role === "owner" || profile.member_role === "admin";
};

const isOwnPersonalProfile = (profile, currentUser) => {
  if (!profile || !currentUser?.id || profile.type !== "person") return false;
  if (profile.owner_user_id && String(profile.owner_user_id) === String(currentUser.id)) return true;
  return profile.source_type === "user" && String(profile.source_id) === String(currentUser.id);
};

const ProfileMark = ({ profile, isDayMode, displayName }) => {
  const src = profileImage(profile);
  const name = displayName || profile?.display_name || "Profile";
  if (src) {
    return (
      <div className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border md:h-24 md:w-24 ${
        isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/[0.04]"
      }`}>
        <img src={src} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[8px] border text-2xl font-black md:h-24 md:w-24 ${
      isDayMode ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/10 bg-white/[0.04] text-white"
    }`}>
      {String(name).replace(/\s+/g, "").slice(0, 2).toUpperCase()}
    </div>
  );
};

const localizedProfileText = (profile, language, enField, zhField) => {
  const isEnglish = String(language || "").startsWith("en");
  return isEnglish ? (profile?.[enField] || profile?.[zhField] || "") : (profile?.[zhField] || profile?.[enField] || "");
};

const FeedCard = ({ item, isDayMode, t }) => {
  const target = feedTarget(item);
  const feedTypeLabel = t(`profiles.page.feed_type.${item.type}`, item.type);
  const content = (
    <article className={`group grid min-h-[148px] grid-cols-[108px_1fr] overflow-hidden rounded-[8px] border transition-colors md:grid-cols-[148px_1fr] ${
      isDayMode
        ? "border-slate-200 bg-white hover:border-sky-200"
        : "border-white/10 bg-white/[0.04] hover:border-white/20"
    }`}>
      <div className={`relative min-h-full ${isDayMode ? "bg-slate-100" : "bg-white/[0.04]"}`}>
        {item.cover ? (
          <img src={item.cover} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full min-h-[148px] items-center justify-center">
            <FileText className={isDayMode ? "text-slate-400" : "text-white/35"} size={28} />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col p-3 md:p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className={`rounded-[4px] border px-2 py-1 text-[11px] font-black uppercase ${
            isDayMode ? "border-slate-200 bg-slate-50 text-slate-600" : "border-white/10 bg-white/[0.05] text-slate-300"
          }`}>
            {feedTypeLabel}
          </span>
          {item.relation === "organized" ? (
            <span className={`rounded-[4px] px-2 py-1 text-[11px] font-bold ${
              isDayMode ? "bg-violet-50 text-violet-700" : "bg-indigo-500/15 text-indigo-100"
            }`}>
              {t("profiles.page.organized_relation")}
            </span>
          ) : null}
        </div>
        <h3 className={`line-clamp-2 text-base font-black leading-6 md:text-lg ${
          isDayMode ? "text-slate-950" : "text-white"
        }`}>
          {item.title}
        </h3>
        {item.excerpt ? (
          <p className={`mt-2 line-clamp-2 text-sm leading-6 ${
            isDayMode ? "text-slate-600" : "text-slate-300"
          }`}>
            {item.excerpt}
          </p>
        ) : null}
        <div className={`mt-auto flex items-center gap-3 pt-3 text-xs font-semibold ${
          isDayMode ? "text-slate-500" : "text-slate-400"
        }`}>
          {item.date ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} />
              {formatDate(item.date)}
            </span>
          ) : null}
          {item.organizer ? (
            <span className="hidden min-w-0 items-center gap-1.5 md:inline-flex">
              <MapPin size={14} />
              <span className="truncate">{item.organizer}</span>
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (!target) return content;
  return (
    <Link to={target} className="block focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/30">
      {content}
    </Link>
  );
};

const ProfilePage = ({ forcedHandle = null }) => {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const navigate = useNavigate();
  const { uiMode } = useSettings();
  const { user: currentUser, refreshUser } = useAuth();
  const isDayMode = uiMode === "day";
  const handle = forcedHandle || params.handle;
  const [profile, setProfile] = useState(null);
  const [feed, setFeed] = useState([]);
  const [pagination, setPagination] = useState({});
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(() => editableFormFromProfile());
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [editError, setEditError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [userSystemOverview, setUserSystemOverview] = useState(null);
  const [userSystemOverviewLoading, setUserSystemOverviewLoading] = useState(false);

  useEffect(() => {
    if (!handle) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get(`/profiles/${handle}`, { signal: controller.signal })
      .then((response) => {
        setProfile(response.data);
        setEditing(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err);
        setProfile(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [handle]);

  useEffect(() => {
    if (!handle || error) return undefined;
    const controller = new AbortController();
    setFeedLoading(true);
    api
      .get(`/profiles/${handle}/feed`, {
        params: { type: activeTab, limit: 24 },
        signal: controller.signal,
      })
      .then((response) => {
        setFeed(Array.isArray(response.data?.data) ? response.data.data : []);
        setPagination(response.data?.pagination || {});
      })
      .catch(() => {
        if (!controller.signal.aborted) setFeed([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setFeedLoading(false);
      });
    return () => controller.abort();
  }, [activeTab, error, handle]);

  const meta = useMemo(() => typeMeta(profile?.type), [profile?.type]);
  const TypeIcon = meta.icon;
  const editable = canEditProfile(profile, currentUser);
  const showUserSystemOverview = isOwnPersonalProfile(profile, currentUser);
  const language = i18n.resolvedLanguage || i18n.language || "zh";
  const isEnglish = language.startsWith("en");
  const displayName = isEnglish
    ? (profile?.display_name_en || profile?.display_name || t("profiles.types.subject"))
    : (profile?.display_name || profile?.display_name_en || t("profiles.types.subject"));
  const secondaryDisplayName = isEnglish
    ? (profile?.display_name && profile.display_name !== displayName ? profile.display_name : "")
    : profile?.display_name_en;
  const canChangePassword =
    profile?.type === "person" &&
    currentUser?.id &&
    profile?.owner_user_id &&
    String(profile.owner_user_id) === String(currentUser.id);
  const inputClass = isDayMode
    ? "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-sky-400"
    : "border-white/10 bg-white/[0.06] text-white placeholder:text-white/35 focus:border-sky-300/60";
  const labelClass = isDayMode ? "text-slate-600" : "text-slate-300";
  const metaLabel = t(meta.labelKey);

  const refreshUserSystemOverview = useCallback(async () => {
    if (!showUserSystemOverview) return;
    setUserSystemOverviewLoading(true);
    try {
      const response = await getUserSystemOverview();
      setUserSystemOverview(response.data || null);
    } catch {
      setUserSystemOverview(null);
    } finally {
      setUserSystemOverviewLoading(false);
    }
  }, [showUserSystemOverview]);

  useEffect(() => {
    if (!showUserSystemOverview) {
      setUserSystemOverview(null);
      return;
    }
    refreshUserSystemOverview();
  }, [refreshUserSystemOverview, showUserSystemOverview]);

  const openUserSystemTarget = (target) => {
    const userId = currentUser?.id;
    if (!userId) return;
    if (target === "submissions") {
      navigate(`/user/${userId}/center?tab=submissions`);
      return;
    }
    if (target === "published") {
      navigate(`/user/${userId}/center`);
      return;
    }
    navigate(`/user/${userId}/center?tab=settings&settings=${target || "profile-card"}`);
  };

  const updateEditField = (field, value) => {
    setEditForm((previous) => ({ ...previous, [field]: value }));
  };

  const startEditing = () => {
    setEditForm(editableFormFromProfile(profile));
    setEditError("");
    setPasswordError("");
    setPasswordMessage("");
    setEditing(true);
  };

  const handleProfileImageUpload = async (field, file) => {
    if (!file) return;
    setUploadingField(field);
    setEditError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await uploadFile("/upload", formData);
      const url = response.data?.fileUrl || response.data?.url || "";
      if (!url) throw new Error("Upload did not return a file URL");
      updateEditField(field, url);
      if (field === "logo_url" && !editForm.avatar_url) updateEditField("avatar_url", url);
    } catch (uploadError) {
      setEditError(uploadError.response?.data?.error || uploadError.message || t("profiles.page.upload_failed"));
    } finally {
      setUploadingField("");
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setEditError("");
    try {
      const response = await api.put(`/profiles/${profile.handle}`, editForm);
      setProfile((previous) => ({
        ...previous,
        ...response.data,
        stats: previous?.stats || response.data?.stats || {},
      }));
      setEditing(false);
      refreshUser?.();
      refreshUserSystemOverview();
    } catch (saveError) {
      setEditError(saveError.response?.data?.error || saveError.message || t("profiles.page.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const updatePasswordField = (field, value) => {
    setPasswordForm((previous) => ({ ...previous, [field]: value }));
    setPasswordError("");
    setPasswordMessage("");
  };

  const changePassword = async () => {
    const currentPassword = passwordForm.currentPassword;
    const newPassword = passwordForm.newPassword;
    const confirmPassword = passwordForm.confirmPassword;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t("profiles.page.password_missing"));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t("profiles.page.password_min"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("profiles.page.password_mismatch"));
      return;
    }

    setPasswordSaving(true);
    setPasswordError("");
    setPasswordMessage("");
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage(t("profiles.page.password_updated"));
    } catch (error) {
      const validationMessage = error.response?.data?.errors?.[0]?.msg;
      setPasswordError(error.response?.data?.error || validationMessage || error.message || t("profiles.page.password_failed"));
    } finally {
      setPasswordSaving(false);
    }
  };
  const description = localizedProfileText(profile, language, "description_en", "description")
    || localizedProfileText(profile, language, "bio_en", "bio")
    || t("profiles.page.default_description");
  const cooperationDirection = localizedProfileText(
    profile,
    language,
    "cooperation_direction_en",
    "cooperation_direction",
  );

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-sky-500" size={28} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center ${
        isDayMode ? "text-slate-900" : "text-white"
      }`}>
        <Search className={isDayMode ? "text-slate-400" : "text-white/35"} size={48} />
        <h1 className="mt-5 text-2xl font-black">{t("profiles.page.not_found_title")}</h1>
        <p className={`mt-2 text-sm ${isDayMode ? "text-slate-500" : "text-slate-400"}`}>
          {t("profiles.page.not_found_desc")}
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`mt-6 inline-flex min-h-11 items-center gap-2 rounded-[6px] border px-4 text-sm font-bold ${
            isDayMode ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-white/5 text-white"
          }`}
        >
          <ArrowLeft size={16} />
          {t("profiles.page.back")}
        </button>
      </div>
    );
  }

  return (
    <section className={`min-h-screen px-4 py-8 md:px-8 md:py-12 ${
      isDayMode ? "bg-slate-50 text-slate-950" : "text-white"
    }`}>
      <SEO title={`${displayName} - ${t("profiles.page.title_suffix")}`} description={description} />
      <div className="mx-auto w-full max-w-6xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`mb-5 inline-flex min-h-10 items-center gap-2 rounded-[6px] border px-3 text-sm font-bold ${
            isDayMode ? "border-slate-200 bg-white text-slate-600 hover:text-slate-950" : "border-white/10 bg-white/[0.04] text-slate-300 hover:text-white"
          }`}
        >
          <ArrowLeft size={16} />
          {t("profiles.page.back")}
        </button>

        <header className={`overflow-hidden rounded-[8px] border ${
          isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/[0.035]"
        }`}>
          <div className={`h-28 md:h-36 ${
            profile.cover_url
              ? ""
              : isDayMode
                ? "bg-[linear-gradient(120deg,#e0f2fe,#f8fafc,#dcfce7)]"
                : "bg-[linear-gradient(120deg,rgba(14,165,233,0.22),rgba(99,102,241,0.18),rgba(16,185,129,0.12))]"
          }`}>
            {profile.cover_url ? (
              <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>

          <div className="grid gap-5 p-4 md:grid-cols-[auto_1fr_auto] md:gap-6 md:p-6">
              <ProfileMark profile={profile} isDayMode={isDayMode} displayName={displayName} />
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1 text-xs font-black ${
                  isDayMode ? "border-sky-200 bg-sky-50 text-sky-700" : "border-sky-300/20 bg-sky-400/10 text-sky-100"
                }`}>
                  <TypeIcon size={14} />
                  {metaLabel}
                </span>
                <OfficialVerificationBadge profile={profile} isDayMode={isDayMode} />
              </div>
              <h1 className="profile-page-title text-3xl font-black leading-tight md:text-5xl">
                {profile.display_name}
              </h1>
              {secondaryDisplayName ? (
                <p className={`mt-1 text-sm font-bold md:text-base ${
                  isDayMode ? "text-slate-500" : "text-slate-400"
                }`}>
                  {secondaryDisplayName}
                </p>
              ) : null}
              <p className={`mt-4 max-w-3xl text-sm leading-7 md:text-base ${
                isDayMode ? "text-slate-600" : "text-slate-300"
              }`}>
                {description}
              </p>
              {cooperationDirection ? (
                <p className={`mt-3 text-sm font-bold ${
                  isDayMode ? "text-violet-700" : "text-indigo-100"
                }`}>
                  {cooperationDirection}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
              {editable ? (
                <button
                  type="button"
                  data-testid="profile-edit-button"
                  onClick={startEditing}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] border px-4 text-sm font-bold ${
                    isDayMode ? "border-sky-200 bg-sky-50 text-sky-700 hover:bg-white" : "border-sky-300/25 bg-sky-400/10 text-sky-100 hover:border-sky-200/45"
                  }`}
                >
                  <Edit3 size={16} />
                  {t("profiles.page.edit_homepage")}
                </button>
              ) : null}
              {profile.link_url ? (
                <a
                  href={profile.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] border px-4 text-sm font-bold ${
                    isDayMode ? "border-slate-200 bg-white text-slate-700 hover:border-sky-200" : "border-white/10 bg-white/[0.04] text-white hover:border-white/20"
                  }`}
                >
                  {t("profiles.page.external_link")}
                  <ExternalLink size={16} />
                </a>
              ) : null}
              <Link
                to={profileRoute(profile)}
                className={`inline-flex min-h-11 min-w-0 max-w-full items-center justify-center rounded-[6px] border px-4 text-sm font-mono font-bold ${
                  isDayMode ? "border-slate-200 bg-slate-50 text-slate-500" : "border-white/10 bg-white/[0.04] text-slate-400"
                }`}
              >
                <span className="truncate">@{profile.handle}</span>
              </Link>
            </div>
          </div>

          <div className={`grid grid-cols-2 border-t md:grid-cols-4 ${
            isDayMode ? "border-slate-200" : "border-white/10"
          }`}>
            {[
              [t("profiles.page.stats_content"), profile.stats?.published_count || 0],
              [t("profiles.page.stats_events"), profile.stats?.event_count || 0],
              [t("profiles.page.stats_type"), metaLabel],
              [t("profiles.page.stats_status"), profile.verified ? t("profiles.page.verified") : t("profiles.page.normal")],
            ].map(([label, value]) => (
              <div key={label} className={`px-4 py-4 ${
                isDayMode ? "border-slate-200" : "border-white/10"
              } md:border-r last:border-r-0`}>
                <div className={`text-xs font-black uppercase ${isDayMode ? "text-slate-400" : "text-slate-500"}`}>
                  {label}
                </div>
                <div className="mt-1 text-xl font-black">{value}</div>
              </div>
            ))}
          </div>
        </header>

        {showUserSystemOverview ? (
          <div className="mt-4">
            <UserSystemOverview
              overview={userSystemOverview}
              loading={userSystemOverviewLoading}
              isDayMode={isDayMode}
              t={t}
              onOpenTarget={openUserSystemTarget}
            />
          </div>
        ) : null}

        {editing ? (() => {
          const primaryImageField = profile.type === "person" ? "avatar_url" : "logo_url";
          const primaryImageLabel = profile.type === "person" ? t("profiles.page.avatar") : t("profiles.page.logo");
          return (
            <form
              onSubmit={saveProfile}
              className={`mt-4 rounded-[8px] border p-4 md:p-5 ${
                isDayMode ? "border-sky-100 bg-white" : "border-sky-300/15 bg-white/[0.04]"
              }`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{t("profiles.page.edit_title")}</h2>
                  <p className={`mt-1 text-sm ${isDayMode ? "text-slate-500" : "text-slate-400"}`}>
                    {t("profiles.page.edit_desc")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-[6px] ${
                    isDayMode ? "bg-slate-100 text-slate-600 hover:text-slate-950" : "bg-white/10 text-slate-300 hover:text-white"
                  }`}
                  aria-label={t("profiles.page.close_edit")}
                >
                  <X size={18} />
                </button>
              </div>

              {editError ? (
                <div className={`mb-4 rounded-[6px] border px-3 py-2 text-sm font-semibold ${
                  isDayMode ? "border-red-200 bg-red-50 text-red-700" : "border-red-400/25 bg-red-500/10 text-red-100"
                }`}>
                  {editError}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className={`grid gap-2 text-sm font-bold ${labelClass}`}>
                  {t("profiles.page.display_name")}
                  <input
                    value={editForm.display_name}
                    onChange={(event) => updateEditField("display_name", event.target.value)}
                    className={`h-11 rounded-[6px] border px-3 outline-none ${inputClass}`}
                    maxLength={120}
                    required
                  />
                </label>
                <label className={`grid gap-2 text-sm font-bold ${labelClass}`}>
                  {t("profiles.page.display_name_en")}
                  <input
                    value={editForm.display_name_en}
                    onChange={(event) => updateEditField("display_name_en", event.target.value)}
                    className={`h-11 rounded-[6px] border px-3 outline-none ${inputClass}`}
                    maxLength={160}
                  />
                </label>

                <label className={`grid gap-2 text-sm font-bold ${labelClass}`}>
                  {t("profiles.page.primary_image_url", { label: primaryImageLabel })}
                  <div className="flex gap-2">
                    <input
                      value={editForm[primaryImageField]}
                      onChange={(event) => updateEditField(primaryImageField, event.target.value)}
                      className={`h-11 min-w-0 flex-1 rounded-[6px] border px-3 outline-none ${inputClass}`}
                      placeholder="/uploads/..."
                    />
                    <span className={`relative inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[6px] border px-3 text-sm font-black ${
                      isDayMode ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/10 bg-white/[0.05] text-slate-100"
                    }`}>
                      {uploadingField === primaryImageField ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
                      {t("profiles.page.upload")}
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(event) => handleProfileImageUpload(primaryImageField, event.target.files?.[0])}
                      />
                    </span>
                  </div>
                </label>

                <label className={`grid gap-2 text-sm font-bold ${labelClass}`}>
                  {t("profiles.page.cover_url")}
                  <div className="flex gap-2">
                    <input
                      value={editForm.cover_url}
                      onChange={(event) => updateEditField("cover_url", event.target.value)}
                      className={`h-11 min-w-0 flex-1 rounded-[6px] border px-3 outline-none ${inputClass}`}
                      placeholder="/uploads/..."
                    />
                    <span className={`relative inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[6px] border px-3 text-sm font-black ${
                      isDayMode ? "border-slate-200 bg-slate-50 text-slate-700" : "border-white/10 bg-white/[0.05] text-slate-100"
                    }`}>
                      {uploadingField === "cover_url" ? <Loader2 className="animate-spin" size={15} /> : <Upload size={15} />}
                      {t("profiles.page.upload")}
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(event) => handleProfileImageUpload("cover_url", event.target.files?.[0])}
                      />
                    </span>
                  </div>
                </label>

                <label className={`grid gap-2 text-sm font-bold ${labelClass}`}>
                  {t("profiles.page.bio")}
                  <textarea
                    value={editForm.bio}
                    onChange={(event) => updateEditField("bio", event.target.value)}
                    className={`min-h-24 rounded-[6px] border px-3 py-2 outline-none ${inputClass}`}
                    maxLength={500}
                  />
                </label>
                <label className={`grid gap-2 text-sm font-bold ${labelClass}`}>
                  {t("profiles.page.description")}
                  <textarea
                    value={editForm.description}
                    onChange={(event) => updateEditField("description", event.target.value)}
                    className={`min-h-24 rounded-[6px] border px-3 py-2 outline-none ${inputClass}`}
                    maxLength={1200}
                  />
                </label>

                {profile.type !== "person" ? (
                  <label className={`grid gap-2 text-sm font-bold ${labelClass}`}>
                    {t("profiles.page.cooperation_direction")}
                    <input
                      value={editForm.cooperation_direction}
                      onChange={(event) => updateEditField("cooperation_direction", event.target.value)}
                      className={`h-11 rounded-[6px] border px-3 outline-none ${inputClass}`}
                      maxLength={500}
                    />
                  </label>
                ) : null}
                <label className={`grid gap-2 text-sm font-bold ${labelClass}`}>
                  {t("profiles.page.external_link")}
                  <input
                    value={editForm.link_url}
                    onChange={(event) => updateEditField("link_url", event.target.value)}
                    className={`h-11 rounded-[6px] border px-3 outline-none ${inputClass}`}
                    placeholder="https://..."
                    maxLength={1000}
                  />
                </label>
              </div>

              {canChangePassword ? (
                <section
                  className={`mt-5 rounded-[8px] border p-4 ${
                    isDayMode ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-white/[0.035]"
                  }`}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <KeyRound size={17} className={isDayMode ? "text-sky-600" : "text-sky-200"} />
                    <div>
                      <h3 className="text-base font-black">{t("profiles.page.password_title")}</h3>
                      <p className={`mt-0.5 text-xs ${isDayMode ? "text-slate-500" : "text-slate-400"}`}>
                        {t("profiles.page.password_desc")}
                      </p>
                    </div>
                  </div>

                  {passwordError ? (
                    <div className={`mb-3 rounded-[6px] border px-3 py-2 text-sm font-semibold ${
                      isDayMode ? "border-red-200 bg-red-50 text-red-700" : "border-red-400/25 bg-red-500/10 text-red-100"
                    }`}>
                      {passwordError}
                    </div>
                  ) : null}
                  {passwordMessage ? (
                    <div className={`mb-3 rounded-[6px] border px-3 py-2 text-sm font-semibold ${
                      isDayMode ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                    }`}>
                      {passwordMessage}
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className={`grid gap-2 text-sm font-bold ${labelClass}`}>
                      {t("profiles.page.current_password")}
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
                        className={`h-11 rounded-[6px] border px-3 outline-none ${inputClass}`}
                        autoComplete="current-password"
                      />
                    </label>
                    <label className={`grid gap-2 text-sm font-bold ${labelClass}`}>
                      {t("profiles.page.new_password")}
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(event) => updatePasswordField("newPassword", event.target.value)}
                        className={`h-11 rounded-[6px] border px-3 outline-none ${inputClass}`}
                        autoComplete="new-password"
                      />
                    </label>
                    <label className={`grid gap-2 text-sm font-bold ${labelClass}`}>
                      {t("profiles.page.confirm_password")}
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) => updatePasswordField("confirmPassword", event.target.value)}
                        className={`h-11 rounded-[6px] border px-3 outline-none ${inputClass}`}
                        autoComplete="new-password"
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      data-testid="profile-password-save-button"
                      onClick={changePassword}
                      disabled={passwordSaving}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-[6px] px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-55 ${
                        isDayMode ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-white text-slate-950 hover:bg-sky-100"
                      }`}
                    >
                      {passwordSaving ? <Loader2 className="animate-spin" size={15} /> : <KeyRound size={15} />}
                      {t("user_profile.security.update_btn")}
                    </button>
                  </div>
                </section>
              ) : null}

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-[6px] border px-4 text-sm font-bold ${
                    isDayMode ? "border-slate-200 bg-white text-slate-700" : "border-white/10 bg-white/[0.04] text-slate-200"
                  }`}
                >
                  {t("profiles.page.cancel")}
                </button>
                <button
                  type="submit"
                  data-testid="profile-save-button"
                  disabled={saving || Boolean(uploadingField)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-[6px] px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-55 ${
                    isDayMode ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-sky-300 text-slate-950 hover:bg-white"
                  }`}
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {t("profiles.page.save_homepage")}
                </button>
              </div>
            </form>
          );
        })() : null}

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {FEED_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[6px] border px-3 text-sm font-black ${
                  active
                    ? isDayMode
                      ? "border-sky-200 bg-sky-50 text-sky-700"
                      : "border-sky-300/25 bg-sky-400/10 text-sky-100"
                    : isDayMode
                      ? "border-slate-200 bg-white text-slate-600"
                      : "border-white/10 bg-white/[0.035] text-slate-300"
                }`}
              >
                <Icon size={15} />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </nav>

        <div className="mt-4">
          {feedLoading ? (
            <div className={`flex min-h-56 items-center justify-center rounded-[8px] border ${
              isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/[0.035]"
            }`}>
              <Loader2 className="animate-spin text-sky-500" size={24} />
            </div>
          ) : feed.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {feed.map((item) => (
                <FeedCard key={`${item.type}-${item.id}-${item.relation || "published"}`} item={item} isDayMode={isDayMode} t={t} />
              ))}
            </div>
          ) : (
            <div className={`flex min-h-64 flex-col items-center justify-center rounded-[8px] border border-dashed px-4 text-center ${
              isDayMode ? "border-slate-200 bg-white text-slate-500" : "border-white/10 bg-white/[0.035] text-slate-400"
            }`}>
              <Grid3X3 size={34} />
              <h2 className={`mt-4 text-lg font-black ${isDayMode ? "text-slate-900" : "text-white"}`}>
                {t("profiles.page.empty_title")}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6">
                {t("profiles.page.empty_desc")}
              </p>
            </div>
          )}
        </div>

        {pagination.totalPages > 1 ? (
          <div className={`mt-5 text-center text-xs font-semibold ${
            isDayMode ? "text-slate-500" : "text-slate-400"
          }`}>
            {t("profiles.page.page_indicator", { page: pagination.page || 1, total: pagination.totalPages })}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ProfilePage;
