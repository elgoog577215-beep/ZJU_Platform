import React, { Suspense, lazy, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

import {
    User,
    Calendar,
    Grid,
    Briefcase,
    Settings,
    Heart,
    CloudSun,
    Lock,
    Loader2,
    Image,
    Film,
    FileText,
    Download,
    Globe,
    LogOut,
    Moon,
    Sun,
    UserCheck,
    Sparkles,
    MapPin,
    Clock3,
    MessageCircle,
    ShieldCheck,
    RotateCcw,
} from "lucide-react";
import api, {
    createIdentityClaim,
    getProfileCard,
    listIdentityClaims,
    listOutcomeLinks,
    updateOutcomeLink,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import Dropdown from "./Dropdown";
import FavoriteButton from "./FavoriteButton";
import PersonalCenterShell from "./PersonalCenterShell";
import SEO from "./SEO";
import UserCommunitySubmissions from "./UserCommunitySubmissions";
import ProfileHome from "./profile/ProfileHome";
import RegistrationProfileForm from "./RegistrationProfileForm";

import { isMiniProgramWebView } from "../utils/miniProgramEnv";
import {
    buildWechatBindBridgeUrl,
    navigateToMiniProgramPage,
} from "../utils/wechatMiniProgramBridge";

const NotificationCenter = lazy(() => import("./NotificationCenter"));

const EVENT_CATEGORY_OPTIONS = [
    { value: "lecture", labelKey: "user_profile.center.event_categories.lecture" },
    { value: "competition", labelKey: "user_profile.center.event_categories.competition" },
    { value: "volunteer", labelKey: "user_profile.center.event_categories.volunteer" },
    { value: "recruitment", labelKey: "user_profile.center.event_categories.recruitment" },
    { value: "culture_sports", labelKey: "user_profile.center.event_categories.culture_sports" },
    { value: "exchange", labelKey: "user_profile.center.event_categories.exchange" },
];

const EVENT_BENEFIT_OPTIONS = [
    { value: "score", labelKey: "user_profile.center.event_benefits.score" },
    { value: "volunteer_time", labelKey: "user_profile.center.event_benefits.volunteer_time" },
    { value: "skill", labelKey: "user_profile.center.event_benefits.skill" },
    { value: "social", labelKey: "user_profile.center.event_benefits.social" },
];

const EVENT_FORMAT_OPTIONS = [
    { value: "", labelKey: "user_profile.center.event_formats.any" },
    { value: "offline", labelKey: "user_profile.center.event_formats.offline" },
    { value: "online", labelKey: "user_profile.center.event_formats.online" },
    { value: "hybrid", labelKey: "user_profile.center.event_formats.hybrid" },
];

const PROFILE_TAB_KEYS = new Set([
    "published",
    "relations",
    "submissions",
    "favorites",
    "messages",
    "settings",
]);
const SETTINGS_TAB_KEYS = new Set(["activity-profile", "security", "identity"]);

const splitPreferenceText = (value) =>
    String(value || "")
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

// Visual metadata per content type. The badge lives inside the caption
// (glass chip), so we only need type-coloured text tokens for day / night.
// `placeholder{Day,Night}` define the soft gradient used by
// TitleArtPlaceholder when the item has no cover image — 小红书-style
// text-as-image cards.

/**
 * Text-as-image placeholder for items that have no cover asset
 * (help / team posts, the occasional article-without-cover, etc.).
 * Inspired by 小红书's "纯文字笔记" cards: the title itself becomes the
 * hero artwork on a gentle, type-coloured gradient.
 *
 * Sits inside the cover slot (aspect-[4/3]), so nothing about layout
 * shifts — cover = image vs cover = TitleArtPlaceholder is a clean swap.
 */

// Backend returns `type` as the singular resource kind (photo/video/music/
// article/event/news) for resource tables and `section` (help/team) for
// community posts. This helper normalises to the tab keys above.

const identityTypeLabel = (type, t) =>
    t(
        `user_profile.center.identity_types.${type}`,
        t("user_profile.center.identity_types.identity")
    );

const identityStatusLabel = (status, t) =>
    t(
        `user_profile.center.identity_status.${status}`,
        t("user_profile.center.identity_status.unknown")
    );

const outcomeStatusLabel = (status, t) =>
    t(
        `user_profile.center.outcome_status.${status}`,
        t("user_profile.center.outcome_status.unknown")
    );

const PublicProfile = ({ profileId = null, initialTab = "published" }) => {
    const { id: routeId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { user: currentUser, logout, refreshUser } = useAuth();
    const { settings, uiMode, changeUiMode, showWeatherWidget, toggleWeatherWidget } =
        useSettings();
    const id = profileId ?? routeId;

    const [user, setUser] = useState(null);

    const [profileCard, setProfileCard] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [activeTab, setActiveTab] = useState("published");

    const isOwner = currentUser && user && String(currentUser.id) === String(user.id);

    const isDayMode = uiMode === "day";
    const profileContentRef = React.useRef(null);
    const settingsContentRef = React.useRef(null);

    const activityProfileRef = React.useRef(null);
    const managedProfilesRef = React.useRef(null);
    const identityClaimsRef = React.useRef(null);
    const outcomeClaimsRef = React.useRef(null);
    const settingsPanelClass = isDayMode
        ? "rounded-2xl p-4 md:p-6 border h-fit bg-white/82 border-slate-200/80 shadow-[0_18px_40px_rgba(148,163,184,0.12)]"
        : "rounded-2xl p-4 md:p-6 border h-fit bg-white/5 border-white/10";
    const dayActiveSegmentClass = "border border-blue-200 bg-blue-50 text-blue-700 shadow-none";
    const nightActiveSegmentClass =
        "border border-indigo-400/35 bg-indigo-500/20 text-indigo-100 shadow-none";
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

    const [relationTab, setRelationTab] = useState(() =>
        new URLSearchParams(location.search).get("relation") === "following"
            ? "following"
            : "followers"
    );
    const [relationLoading, setRelationLoading] = useState(false);
    const [relations, setRelations] = useState([]);
    const [relationPage, setRelationPage] = useState(1);
    const [relationPages, setRelationPages] = useState(1);
    const [relationError, setRelationError] = useState(false);
    const [relationRetry, setRelationRetry] = useState(0);
    const [relationFollowLoadingIds, setRelationFollowLoadingIds] = useState({});

    // Settings State
    const [profileData, setProfileData] = useState({
        organization: "",
        nickname: "",
        inviteCode: "",
    });

    const [identityClaims, setIdentityClaims] = useState([]);
    const [identityType, setIdentityType] = useState("person");
    const [identityName, setIdentityName] = useState("");
    const [identityInviteCode, setIdentityInviteCode] = useState("");
    const [identityLoading, setIdentityLoading] = useState(false);
    const [outcomeLinks, setOutcomeLinks] = useState([]);
    const [outcomeLinksLoading, setOutcomeLinksLoading] = useState(false);
    const [outcomeActionId, setOutcomeActionId] = useState(null);
    const [activeSettingsTab, setActiveSettingsTab] = useState("security");
    const [eventPreferenceForm, setEventPreferenceForm] = useState(EMPTY_EVENT_PREFERENCE_FORM);
    const [eventPreferenceLoading, setEventPreferenceLoading] = useState(false);
    const [eventPreferenceSaving, setEventPreferenceSaving] = useState(false);
    const [eventPreferenceLoaded, setEventPreferenceLoaded] = useState(false);
    const [eventAiProfile, setEventAiProfile] = useState(null);
    const [eventAiProfileResetting, setEventAiProfileResetting] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [wechatBindingStatus, setWechatBindingStatus] = useState({ bound: false });
    const [wechatBindingLoading, setWechatBindingLoading] = useState(false);
    const [wechatBindingActionLoading, setWechatBindingActionLoading] = useState(false);

    const profileTabPath = (tabKey, settingsKey = activeSettingsTab) => {
        if (tabKey === "settings") {
            return `${location.pathname}?tab=settings&settings=${settingsKey}`;
        }
        return tabKey === "published"
            ? location.pathname
            : `${location.pathname}?tab=${tabKey}${tabKey === "relations" ? `&relation=${settingsKey || relationTab}` : ""}`;
    };

    const navigateProfileTab = (tabKey, settingsKey) => {
        if (tabKey === "settings" && settingsKey && SETTINGS_TAB_KEYS.has(settingsKey)) {
            setActiveSettingsTab(settingsKey);
        }
        setActiveTab(tabKey);
        navigate(profileTabPath(tabKey, settingsKey), { replace: true });
    };

    const fetchWechatBindingStatus = useCallback(async () => {
        if (!isOwner) return;
        setWechatBindingLoading(true);
        try {
            const response = await api.get("/auth/wechat-miniapp/status", {
                silent: true,
                noRetry: true,
            });
            setWechatBindingStatus(response.data || { bound: false });
        } catch {
            setWechatBindingStatus({ bound: false, unavailable: true });
        } finally {
            setWechatBindingLoading(false);
        }
    }, [isOwner]);

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
                    noRetry: true,
                }).then((res) => res.data);
                const [userRes, profileCardData] = await Promise.all([
                    api.get(`/users/${id}/profile`, { signal: abortController.signal }),
                    profileCardPromise,
                ]);
                if (abortController.signal.aborted) return;
                setUser(userRes.data);
                setProfileCard(profileCardData);

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
        if (!isOwner || activeTab !== "settings" || activeSettingsTab !== "security") return;
        fetchWechatBindingStatus();
    }, [isOwner, activeTab, activeSettingsTab, fetchWechatBindingStatus]);

    useEffect(() => {
        const handleWechatBindReturn = () => {
            fetchWechatBindingStatus();
        };
        window.addEventListener("wechat-miniapp-bind-return", handleWechatBindReturn);
        return () => {
            window.removeEventListener("wechat-miniapp-bind-return", handleWechatBindReturn);
        };
    }, [fetchWechatBindingStatus]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const requestedTab = params.get("tab");
        const requestedSettingsTab = params.get("settings");
        if (requestedSettingsTab === "profile-card") {
            setActiveTab("published");
            return;
        }
        if (requestedTab && PROFILE_TAB_KEYS.has(requestedTab)) {
            setActiveTab(requestedTab);
        }
        if (requestedSettingsTab && SETTINGS_TAB_KEYS.has(requestedSettingsTab)) {
            setActiveSettingsTab(requestedSettingsTab);
        }
    }, [isOwner, location.search]);

    useEffect(() => {
        if (
            !isOwner ||
            activeTab !== "settings" ||
            activeSettingsTab !== "activity-profile" ||
            eventPreferenceLoaded ||
            eventPreferenceLoading
        ) {
            return;
        }

        let cancelled = false;
        const loadEventPreference = async () => {
            setEventPreferenceLoading(true);
            try {
                const [response, profileResponse] = await Promise.all([
                    api.get("/events/assistant/preferences"),
                    api.get("/events/assistant/profile").catch(() => ({ data: null })),
                ]);
                if (cancelled) return;
                const data = response.data || {};
                setEventAiProfile(profileResponse.data || null);
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
                    toast.error(
                        error?.response?.status === 401
                            ? t("user_profile.center.toast.login_to_edit_activity")
                            : t("user_profile.center.toast.activity_load_failed")
                    );
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

    useEffect(() => {
        if (activeTab !== "relations" || !id) return;
        let cancelled = false;
        const fetchRelations = async () => {
            setRelationLoading(true);
            setRelationError(false);
            try {
                const endpoint = relationTab === "followers" ? "followers" : "following";
                const res = await api.get(`/users/${id}/${endpoint}`, {
                    params: { limit: 30, page: relationPage },
                });
                if (!cancelled) {
                    setRelations(Array.isArray(res.data?.data) ? res.data.data : []);
                    setRelationPages(res.data?.pagination?.totalPages || 1);
                }
            } catch (err) {
                if (!cancelled) setRelationError(true);
            } finally {
                if (!cancelled) setRelationLoading(false);
            }
        };
        fetchRelations();
        return () => {
            cancelled = true;
        };
    }, [activeTab, id, relationTab, relationPage, relationRetry]);

    const fetchFavorites = async () => {
        setLoadingFavorites(true);
        try {
            const endpoint =
                favoriteType === "all" ? "/favorites" : `/favorites?type=${favoriteType}`;
            const res = await api.get(endpoint);
            setFavorites(res.data || []);
        } catch (err) {
            // Silently fail if endpoint not ready
        } finally {
            setLoadingFavorites(false);
        }
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
            toast.error(t("user_profile.center.toast.identity_name_short"));
            return;
        }
        if (identityType === "club" && identityInviteCode.trim().length === 0) {
            toast.error(t("user_profile.center.toast.invite_required"));
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
                prev && identityType === "club" ? { ...prev, organization_cr: displayName } : prev
            );
            toast.success(
                identityType === "club"
                    ? t("user_profile.center.toast.org_verified")
                    : t("user_profile.center.toast.identity_added")
            );
        } catch (err) {
            toast.error(
                err.response?.data?.error || t("user_profile.center.toast.identity_failed")
            );
        } finally {
            setIdentityLoading(false);
        }
    };

    const handleOutcomeAction = async (linkId, action) => {
        setOutcomeActionId(linkId);
        try {
            await updateOutcomeLink(linkId, action);
            await Promise.all([fetchOutcomeLinks()]);
            toast.success(t("user_profile.center.toast.outcome_updated"));
        } catch (err) {
            toast.error(err.response?.data?.error || t("user_profile.center.toast.outcome_failed"));
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
            const interestTags = splitPreferenceText(eventPreferenceForm.interestTagsText).slice(
                0,
                16
            );
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
            toast.success(t("user_profile.center.toast.activity_saved"));
        } catch (error) {
            toast.error(
                error?.response?.status === 401
                    ? t("user_profile.center.toast.login_to_save_activity")
                    : t("user_profile.center.toast.activity_save_failed")
            );
        } finally {
            setEventPreferenceSaving(false);
        }
    };

    const handleEventAiProfileReset = async () => {
        if (!window.confirm(t("user_profile.center.activity_profile.ai_profile.reset_confirm"))) {
            return;
        }
        setEventAiProfileResetting(true);
        try {
            const response = await api.delete("/events/assistant/profile");
            setEventAiProfile(response.data || null);
            toast.success(t("user_profile.center.activity_profile.ai_profile.reset_success"));
        } catch {
            toast.error(t("user_profile.center.activity_profile.ai_profile.reset_failed"));
        } finally {
            setEventAiProfileResetting(false);
        }
    };

    const buildFavoriteTargetPath = (item) => {
        const itemType = String(item?.type || favoriteType || "")
            .trim()
            .toLowerCase();
        const itemId = item?.id;
        if (!itemId) return null;

        const routeMap = {
            photo: "/gallery",
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
            toast.error(err.response?.data?.message || t("user_profile.security.update_fail"));
        } finally {
            setPasswordLoading(false);
        }
    };

    const getWechatBindingErrorMessage = (err) => {
        const errorCode = err?.response?.data?.errorCode;
        const messageKeyByCode = {
            WECHAT_NOT_CONFIGURED: "user_profile.security.wechat.not_configured",
            WECHAT_ALREADY_BOUND: "user_profile.security.wechat.already_bound",
            WECHAT_USER_ALREADY_BOUND: "user_profile.security.wechat.user_already_bound",
            WECHAT_BIND_TICKET_INVALID: "user_profile.security.wechat.ticket_invalid",
            WECHAT_BIND_RATE_LIMITED: "user_profile.security.wechat.rate_limited",
        };
        return t(messageKeyByCode[errorCode] || "user_profile.security.wechat.bind_failed");
    };

    const handleWechatBind = async () => {
        if (wechatBindingActionLoading || wechatBindingStatus.bound) return;

        if (!isMiniProgramWebView()) {
            toast.error(t("user_profile.security.wechat.open_in_miniapp"));
            return;
        }

        setWechatBindingActionLoading(true);
        try {
            const response = await api.post("/auth/wechat-miniapp/bind-ticket");
            const ticket = response.data?.ticket;
            if (!ticket) {
                throw new Error("Missing WeChat bind ticket");
            }

            const redirectPath = `${location.pathname}${location.search || ""}${location.hash || ""}`;
            await navigateToMiniProgramPage(
                buildWechatBindBridgeUrl({
                    redirectPath,
                    ticket,
                })
            );
        } catch (err) {
            toast.error(getWechatBindingErrorMessage(err));
        } finally {
            setWechatBindingActionLoading(false);
        }
    };

    const handleRelationItemFollowToggle = async (targetUserId, currentlyFollowing) => {
        if (!currentUser) {
            toast.error(t("auth.signin_required"));
            return;
        }
        setRelationFollowLoadingIds((prev) => ({ ...prev, [targetUserId]: true }));
        try {
            await api[currentlyFollowing ? "delete" : "post"](`/users/${targetUserId}/follow`);
            setRelations((prev) =>
                prev.map((item) =>
                    String(item.id) === String(targetUserId)
                        ? { ...item, is_following: !currentlyFollowing }
                        : item
                )
            );
            if (String(user?.id) === String(targetUserId)) {
                setUser((prev) =>
                    prev
                        ? {
                              ...prev,
                              is_following: !currentlyFollowing,
                              followers_count: Math.max(
                                  0,
                                  (prev.followers_count || 0) + (currentlyFollowing ? -1 : 1)
                              ),
                          }
                        : prev
                );
            }
        } catch (err) {
            toast.error(
                err.response?.data?.error || t("user_profile.center.toast.operation_failed")
            );
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
                    {t(
                        error === "load_failed"
                            ? "user_profile.load_failed"
                            : "user_profile.user_not_found"
                    )}
                </h2>
                {error === "load_failed" && (
                    <button
                        className="mb-4 rounded-xl border px-6 py-2"
                        onClick={() => window.location.reload()}
                    >
                        {t("common.retry")}
                    </button>
                )}
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
        { value: "video", label: t("nav.videos"), icon: Film },
        { value: "article", label: t("nav.articles"), icon: FileText },
        { value: "event", label: t("nav.events"), icon: Calendar },
        { value: "project", label: t("user_profile.center.content_types.project"), icon: Sparkles },
    ];
    const settingsTabItems = [
        {
            key: "activity-profile",
            label: t("user_profile.center.settings_tabs.activity_profile"),
            icon: Sparkles,
        },
        { key: "security", label: t("user_profile.center.settings_tabs.security"), icon: Lock },
        {
            key: "identity",
            label: t("user_profile.center.settings_tabs.identity"),
            icon: Briefcase,
        },
    ];
    const canBindWechatInMiniProgram = isMiniProgramWebView();

    return (
        <PersonalCenterShell
            isDayMode={isDayMode}
            maxWidthClass="max-w-7xl"
            showAmbient={false}
            className="pt-24 md:pt-24 pb-28"
        >
            <SEO
                title={user.nickname || user.username}
                description={profileCard?.slogan || profileCard?.description}
                image={user.avatar}
                url={`${window.location.origin}/user/${user.id}`}
            />
            {activeTab === "published" ? (
                <ProfileHome
                    key={`${id}:${currentUser?.id || "guest"}`}
                    user={user}
                    setUser={setUser}
                    currentUser={currentUser}
                    profileCard={profileCard}
                    setProfileCard={setProfileCard}
                    isDayMode={isDayMode}
                    refreshUser={refreshUser}
                    onOpenRelations={(kind) => {
                        setRelationTab(kind);
                        setRelationPage(1);
                        navigateProfileTab("relations", kind);
                    }}
                    onManage={(key) =>
                        navigateProfileTab(
                            ["submissions", "favorites", "messages"].includes(key)
                                ? key
                                : "settings",
                            key
                        )
                    }
                />
            ) : (
                <button
                    type="button"
                    className="mb-6 rounded-xl border px-4 py-2"
                    onClick={() => navigateProfileTab("published")}
                >
                    {t("profile_home.back_home")}
                </button>
            )}
            <div ref={profileContentRef} className="scroll-mt-24" />
            <div>
                {activeTab === "relations" && (
                    <div className="space-y-4">
                        <div
                            className={`grid grid-cols-2 gap-1 rounded-3xl border p-1 md:inline-grid ${isDayMode ? "border-slate-200/80 bg-white/82" : "border-white/10 bg-white/[0.04]"}`}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setRelationTab("followers");
                                    setRelationPage(1);
                                    navigateProfileTab("relations", "followers");
                                }}
                                className={`min-h-[42px] rounded-2xl px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${relationTab === "followers" ? (isDayMode ? dayActiveSegmentClass : nightActiveSegmentClass) : isDayMode ? "text-slate-600" : "text-gray-300"}`}
                            >
                                {t("user_profile.center.follow.followers")}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setRelationTab("following");
                                    setRelationPage(1);
                                    navigateProfileTab("relations", "following");
                                }}
                                className={`min-h-[42px] rounded-2xl px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${relationTab === "following" ? (isDayMode ? dayActiveSegmentClass : nightActiveSegmentClass) : isDayMode ? "text-slate-600" : "text-gray-300"}`}
                            >
                                {t("user_profile.center.follow.following_count")}
                            </button>
                        </div>
                        {relationLoading ? (
                            <div className="py-12 flex justify-center">
                                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : relationError ? (
                            <div role="alert">
                                {t("profile_home.load_failed")}{" "}
                                <button onClick={() => setRelationRetry((value) => value + 1)}>
                                    {t("common.retry")}
                                </button>
                            </div>
                        ) : relations.length === 0 ? (
                            <div
                                className={`text-center py-12 rounded-xl border border-dashed ${isDayMode ? "text-slate-500 bg-white/82 border-slate-200/80" : "text-gray-500 bg-black/20 border-white/5"}`}
                            >
                                {t("common.no_data", "No data yet")}
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
                                                    loading="lazy"
                                                    decoding="async"
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
                                                            Boolean(item.is_following)
                                                        )
                                                    }
                                                    disabled={Boolean(
                                                        relationFollowLoadingIds[item.id]
                                                    )}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${item.is_following ? (isDayMode ? "bg-indigo-600 text-white border-indigo-600 shadow-[0_10px_22px_rgba(99,102,241,0.2)]" : nightActiveSegmentClass) : isDayMode ? "bg-white text-slate-700 border-slate-200/80" : "bg-white/5 text-gray-300 border-white/10"} disabled:opacity-60`}
                                                >
                                                    {relationFollowLoadingIds[item.id]
                                                        ? t("common.processing", "Processing...")
                                                        : item.is_following
                                                          ? t(
                                                                "user_profile.center.follow.following"
                                                            )
                                                          : t("user_profile.center.follow.follow")}
                                                </button>
                                            )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "relations" &&
                    !relationLoading &&
                    !relationError &&
                    relationPages > 1 && (
                        <div className="flex items-center gap-4 py-4">
                            <button
                                disabled={relationPage === 1}
                                onClick={() => setRelationPage((value) => value - 1)}
                            >
                                {t("profile_home.previous")}
                            </button>
                            <span>
                                {relationPage} / {relationPages}
                            </span>
                            <button
                                disabled={relationPage >= relationPages}
                                onClick={() => setRelationPage((value) => value + 1)}
                            >
                                {t("profile_home.next")}
                            </button>
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
                                            if (targetPath)
                                                navigate(targetPath, {
                                                    state: { fromFavorites: true },
                                                });
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
                                                loading="lazy"
                                                decoding="async"
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
                                                        prev.filter((f) => f.id !== item.id)
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
                        <Suspense fallback={null}>
                            <NotificationCenter embedded />
                        </Suspense>
                    </div>
                )}

                {isOwner && activeTab === "settings" && (
                    <div
                        ref={settingsContentRef}
                        data-testid="profile-settings-panel"
                        className="scroll-mt-24 space-y-6"
                    >
                        <div
                            className={`flex gap-2 overflow-x-auto rounded-2xl border p-2 ${isDayMode ? "border-slate-200/80 bg-white/80" : "border-white/10 bg-white/[0.04]"}`}
                        >
                            {settingsTabItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeSettingsTab === item.key;
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => {
                                            setActiveSettingsTab(item.key);
                                            navigate(profileTabPath("settings", item.key), {
                                                replace: true,
                                            });
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

                        {activeSettingsTab === "activity-profile" && (
                            <div className="space-y-6">
                                <div
                                    ref={activityProfileRef}
                                    data-testid="activity-profile-section"
                                    className={`${settingsPanelClass} scroll-mt-24`}
                                >
                                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h3
                                                className={`flex items-center gap-2 text-xl font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}
                                            >
                                                <Sparkles size={20} className="text-indigo-500" />
                                                {t("user_profile.center.activity_profile.title")}
                                            </h3>
                                            <p
                                                className={`mt-2 max-w-2xl text-sm leading-6 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                            >
                                                {t("user_profile.center.activity_profile.desc")}
                                            </p>
                                        </div>
                                        <div
                                            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold ${isDayMode ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"}`}
                                        >
                                            <UserCheck size={15} />
                                            {t("user_profile.center.activity_profile.source_badge")}
                                        </div>
                                    </div>

                                    {eventPreferenceLoading ? (
                                        <div
                                            className={`flex min-h-[180px] items-center justify-center gap-2 rounded-2xl border ${isDayMode ? "border-slate-200/80 bg-slate-50/80 text-slate-500" : "border-white/10 bg-black/20 text-gray-400"}`}
                                        >
                                            <Loader2 size={18} className="animate-spin" />
                                            {t("user_profile.center.activity_profile.loading")}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <section
                                                className={`border-y py-5 ${isDayMode ? "border-slate-200/80" : "border-white/10"}`}
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <h4
                                                            className={`text-sm font-bold ${isDayMode ? "text-slate-800" : "text-white"}`}
                                                        >
                                                            {t(
                                                                "user_profile.center.activity_profile.ai_profile.title"
                                                            )}
                                                        </h4>
                                                        <p
                                                            className={`mt-1 text-xs ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                                        >
                                                            {eventAiProfile?.updatedAt
                                                                ? `${t("user_profile.center.activity_profile.ai_profile.updated_at")} ${new Date(eventAiProfile.updatedAt).toLocaleString()}`
                                                                : t(
                                                                      "user_profile.center.activity_profile.ai_profile.pending"
                                                                  )}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleEventAiProfileReset}
                                                        disabled={eventAiProfileResetting}
                                                        className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors disabled:opacity-50 ${isDayMode ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-rose-400/20 text-rose-200 hover:bg-rose-400/10"}`}
                                                    >
                                                        {eventAiProfileResetting ? (
                                                            <Loader2
                                                                size={14}
                                                                className="animate-spin"
                                                            />
                                                        ) : (
                                                            <RotateCcw size={14} />
                                                        )}
                                                        {t(
                                                            "user_profile.center.activity_profile.ai_profile.reset"
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                                    {[
                                                        [
                                                            "longTermPreferences",
                                                            "user_profile.center.activity_profile.ai_profile.long_term",
                                                        ],
                                                        [
                                                            "shortTermInterests",
                                                            "user_profile.center.activity_profile.ai_profile.short_term",
                                                        ],
                                                        [
                                                            "dislikes",
                                                            "user_profile.center.activity_profile.ai_profile.dislikes",
                                                        ],
                                                        [
                                                            "decisionFactors",
                                                            "user_profile.center.activity_profile.ai_profile.factors",
                                                        ],
                                                    ].map(([key, label]) => (
                                                        <div key={key}>
                                                            <div
                                                                className={`mb-2 text-xs font-bold ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                                            >
                                                                {t(label)}
                                                            </div>
                                                            <div className="flex min-h-7 flex-wrap gap-1.5">
                                                                {(eventAiProfile?.[key] || [])
                                                                    .length ? (
                                                                    eventAiProfile[key].map(
                                                                        (item) => (
                                                                            <span
                                                                                key={item}
                                                                                className={`rounded-md px-2 py-1 text-xs ${isDayMode ? "bg-slate-100 text-slate-700" : "bg-white/10 text-gray-200"}`}
                                                                            >
                                                                                {item}
                                                                            </span>
                                                                        )
                                                                    )
                                                                ) : (
                                                                    <span
                                                                        className={`text-xs ${isDayMode ? "text-slate-400" : "text-gray-500"}`}
                                                                    >
                                                                        {t(
                                                                            "user_profile.center.activity_profile.ai_profile.empty"
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                {[
                                                    [
                                                        "college",
                                                        "user_profile.center.activity_profile.fields.college",
                                                        "user_profile.center.activity_profile.placeholders.college",
                                                        User,
                                                    ],
                                                    [
                                                        "division",
                                                        "user_profile.center.activity_profile.fields.division",
                                                        "user_profile.center.activity_profile.placeholders.division",
                                                        Briefcase,
                                                    ],
                                                    [
                                                        "grade",
                                                        "user_profile.center.activity_profile.fields.grade",
                                                        "user_profile.center.activity_profile.placeholders.grade",
                                                        Calendar,
                                                    ],
                                                    [
                                                        "campus",
                                                        "user_profile.center.activity_profile.fields.campus",
                                                        "user_profile.center.activity_profile.placeholders.campus",
                                                        MapPin,
                                                    ],
                                                ].map(([key, label, placeholder, Icon]) => (
                                                    <label
                                                        key={key}
                                                        className={`grid gap-2 text-sm font-semibold ${isDayMode ? "text-slate-600" : "text-gray-300"}`}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <Icon size={15} />
                                                            {t(label)}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={eventPreferenceForm[key]}
                                                            onChange={(event) =>
                                                                updateEventPreferenceField(
                                                                    key,
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder={t(placeholder)}
                                                            className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 ${isDayMode ? "border border-slate-200/80 bg-slate-50 text-slate-900 placeholder:text-slate-400" : "border border-white/10 bg-black/20 text-white placeholder:text-gray-500"}`}
                                                        />
                                                    </label>
                                                ))}
                                            </div>

                                            <label
                                                className={`grid gap-2 text-sm font-semibold ${isDayMode ? "text-slate-600" : "text-gray-300"}`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Clock3 size={15} />
                                                    {t(
                                                        "user_profile.center.activity_profile.fields.availability"
                                                    )}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={eventPreferenceForm.availability}
                                                    onChange={(event) =>
                                                        updateEventPreferenceField(
                                                            "availability",
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder={t(
                                                        "user_profile.center.activity_profile.placeholders.availability"
                                                    )}
                                                    className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 ${isDayMode ? "border border-slate-200/80 bg-slate-50 text-slate-900 placeholder:text-slate-400" : "border border-white/10 bg-black/20 text-white placeholder:text-gray-500"}`}
                                                />
                                            </label>

                                            <label
                                                className={`grid gap-2 text-sm font-semibold ${isDayMode ? "text-slate-600" : "text-gray-300"}`}
                                            >
                                                {t(
                                                    "user_profile.center.activity_profile.fields.interest_tags"
                                                )}
                                                <input
                                                    type="text"
                                                    value={eventPreferenceForm.interestTagsText}
                                                    onChange={(event) =>
                                                        updateEventPreferenceField(
                                                            "interestTagsText",
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder={t(
                                                        "user_profile.center.activity_profile.placeholders.interest_tags"
                                                    )}
                                                    className={`w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 ${isDayMode ? "border border-slate-200/80 bg-slate-50 text-slate-900 placeholder:text-slate-400" : "border border-white/10 bg-black/20 text-white placeholder:text-gray-500"}`}
                                                />
                                            </label>

                                            <div className="grid gap-5 lg:grid-cols-2">
                                                <div>
                                                    <div
                                                        className={`mb-3 text-sm font-bold ${isDayMode ? "text-slate-700" : "text-white"}`}
                                                    >
                                                        {t(
                                                            "user_profile.center.activity_profile.preferred_categories"
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {EVENT_CATEGORY_OPTIONS.map((option) => {
                                                            const active =
                                                                eventPreferenceForm.preferredCategories.includes(
                                                                    option.value
                                                                );
                                                            return (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        toggleEventPreferenceArrayValue(
                                                                            "preferredCategories",
                                                                            option.value
                                                                        )
                                                                    }
                                                                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${active ? "border-indigo-500 bg-indigo-600 text-white" : isDayMode ? "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-700" : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"}`}
                                                                >
                                                                    {t(option.labelKey)}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div
                                                        className={`mb-3 text-sm font-bold ${isDayMode ? "text-slate-700" : "text-white"}`}
                                                    >
                                                        {t(
                                                            "user_profile.center.activity_profile.preferred_benefits"
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {EVENT_BENEFIT_OPTIONS.map((option) => {
                                                            const active =
                                                                eventPreferenceForm.preferredBenefits.includes(
                                                                    option.value
                                                                );
                                                            return (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        toggleEventPreferenceArrayValue(
                                                                            "preferredBenefits",
                                                                            option.value
                                                                        )
                                                                    }
                                                                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${active ? "border-emerald-500 bg-emerald-600 text-white" : isDayMode ? "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700" : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"}`}
                                                                >
                                                                    {t(option.labelKey)}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex flex-wrap gap-2">
                                                    {EVENT_FORMAT_OPTIONS.map((option) => {
                                                        const active =
                                                            eventPreferenceForm.preferredFormat ===
                                                            option.value;
                                                        return (
                                                            <button
                                                                key={option.value || "any"}
                                                                type="button"
                                                                onClick={() =>
                                                                    updateEventPreferenceField(
                                                                        "preferredFormat",
                                                                        option.value
                                                                    )
                                                                }
                                                                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${active ? "border-sky-500 bg-sky-600 text-white" : isDayMode ? "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700" : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"}`}
                                                            >
                                                                {t(option.labelKey)}
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
                                                    {eventPreferenceSaving ? (
                                                        <Loader2
                                                            size={16}
                                                            className="animate-spin"
                                                        />
                                                    ) : (
                                                        <Sparkles size={16} />
                                                    )}
                                                    {t("user_profile.center.activity_profile.save")}
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
                                <details className={settingsPanelClass}>
                                    <summary>{t("accountProfile.complete")}</summary>
                                    <RegistrationProfileForm variant="account" />
                                </details>

                                <div className={settingsPanelClass}>
                                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h3
                                                className={`flex items-center gap-2 text-xl font-bold ${isDayMode ? "text-slate-900" : "text-white"}`}
                                            >
                                                <ShieldCheck
                                                    size={20}
                                                    className="text-emerald-500"
                                                />
                                                {t("user_profile.security.wechat.title")}
                                            </h3>
                                            <p
                                                className={`mt-2 text-sm leading-6 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                            >
                                                {t("user_profile.security.wechat.description")}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex shrink-0 items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${
                                                wechatBindingStatus.bound
                                                    ? "bg-emerald-500/12 text-emerald-400"
                                                    : isDayMode
                                                      ? "bg-slate-100 text-slate-600"
                                                      : "bg-white/10 text-gray-300"
                                            }`}
                                        >
                                            {wechatBindingLoading
                                                ? t("common.loading")
                                                : wechatBindingStatus.bound
                                                  ? t("user_profile.security.wechat.bound")
                                                  : t("user_profile.security.wechat.unbound")}
                                        </span>
                                    </div>

                                    <div
                                        className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 ${isDayMode ? "border-slate-200/80 bg-slate-50/90" : "border-white/10 bg-white/5"}`}
                                    >
                                        <div
                                            className={`${settingsIconClass} ${wechatBindingStatus.bound ? "text-emerald-400" : ""}`}
                                        >
                                            <MessageCircle size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div
                                                className={`text-sm font-semibold ${isDayMode ? "text-slate-800" : "text-white"}`}
                                            >
                                                {wechatBindingStatus.bound
                                                    ? t("user_profile.security.wechat.bound_hint")
                                                    : t(
                                                          "user_profile.security.wechat.unbound_hint"
                                                      )}
                                            </div>
                                            <div
                                                className={`mt-1 text-xs leading-5 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                            >
                                                {wechatBindingStatus.bound &&
                                                wechatBindingStatus.lastLoginAt
                                                    ? t("user_profile.security.wechat.last_login", {
                                                          time: new Date(
                                                              wechatBindingStatus.lastLoginAt
                                                          ).toLocaleString(),
                                                      })
                                                    : t(
                                                          "user_profile.security.wechat.no_openid_exposed"
                                                      )}
                                            </div>
                                        </div>
                                    </div>

                                    {!wechatBindingStatus.bound && (
                                        <button
                                            type="button"
                                            onClick={handleWechatBind}
                                            disabled={
                                                wechatBindingActionLoading ||
                                                !canBindWechatInMiniProgram
                                            }
                                            className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                                canBindWechatInMiniProgram
                                                    ? "bg-[#07c160] text-white hover:bg-[#06ad56]"
                                                    : isDayMode
                                                      ? "bg-slate-100 text-slate-500"
                                                      : "bg-white/10 text-gray-300"
                                            }`}
                                        >
                                            {wechatBindingActionLoading ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <MessageCircle size={16} />
                                            )}
                                            {canBindWechatInMiniProgram
                                                ? t("user_profile.security.wechat.bind_button")
                                                : t("user_profile.security.wechat.open_in_miniapp")}
                                        </button>
                                    )}
                                </div>

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
                                                        ? t(
                                                              "me.weather_widget_on",
                                                              "右上角显示时间和天气"
                                                          )
                                                        : t(
                                                              "me.weather_widget_off",
                                                              "右上角默认隐藏"
                                                          )}
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
                                                i18n.changeLanguage(
                                                    i18n.language.startsWith("zh") ? "en" : "zh"
                                                )
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
                                            onClick={() =>
                                                window.dispatchEvent(
                                                    new Event("request-pwa-install")
                                                )
                                            }
                                            className={settingsActionClass}
                                        >
                                            <div
                                                className={`${settingsIconClass} ${isDayMode ? "bg-indigo-50 text-indigo-500" : ""}`}
                                            >
                                                <Download size={18} />
                                            </div>
                                            <div className="min-w-0 flex-1 text-left">
                                                <div className="text-sm font-semibold">
                                                    {t("me.install_app", "安装 App")}
                                                </div>
                                                <div
                                                    className={`text-xs mt-1 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                                >
                                                    {t(
                                                        "me.install_app_hint",
                                                        "像 App 一样打开拓浙AI生态。"
                                                    )}
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
                                    {t("user_profile.center.identity.title")}
                                </h3>

                                <div className="space-y-5">
                                    <div
                                        ref={managedProfilesRef}
                                        data-testid="managed-profiles-section"
                                        className={`scroll-mt-24 rounded-2xl border p-4 ${isDayMode ? "bg-slate-50/80 border-slate-200/80" : "bg-black/20 border-white/10"}`}
                                    >
                                        <div
                                            className={`text-sm font-bold mb-3 ${isDayMode ? "text-slate-800" : "text-white"}`}
                                        >
                                            {t("user_profile.center.identity.current_org")}
                                        </div>
                                        <div
                                            className={`rounded-xl border px-3 py-2 text-sm font-bold ${isDayMode ? "bg-white border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-gray-200"}`}
                                        >
                                            {user?.organization_cr ||
                                                profileData.organization ||
                                                t("user_profile.center.identity.no_org")}
                                        </div>
                                        <p
                                            className={`mt-2 text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                                        >
                                            {t("user_profile.center.identity.org_hint")}
                                        </p>
                                    </div>

                                    <div
                                        ref={identityClaimsRef}
                                        data-testid="identity-claims-section"
                                        className={`scroll-mt-24 rounded-2xl border p-4 ${isDayMode ? "bg-slate-50/80 border-slate-200/80" : "bg-black/20 border-white/10"}`}
                                    >
                                        <div
                                            className={`text-sm font-bold mb-3 ${isDayMode ? "text-slate-800" : "text-white"}`}
                                        >
                                            {t("user_profile.center.identity.claims_title")}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2">
                                            <select
                                                value={identityType}
                                                onChange={(event) =>
                                                    setIdentityType(event.target.value)
                                                }
                                                className={`rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 ${isDayMode ? "bg-white border border-slate-200 text-slate-900" : "bg-black/30 border border-white/10 text-white"}`}
                                            >
                                                <option value="person">
                                                    {t("user_profile.center.identity_types.person")}
                                                </option>
                                                <option value="team">
                                                    {t("user_profile.center.identity_types.team")}
                                                </option>
                                                <option value="club">
                                                    {t("user_profile.center.identity_types.club")}
                                                </option>
                                            </select>
                                            <input
                                                type="text"
                                                value={identityName}
                                                onChange={(event) =>
                                                    setIdentityName(event.target.value)
                                                }
                                                placeholder={
                                                    identityType === "club"
                                                        ? t(
                                                              "user_profile.center.identity.org_name_placeholder"
                                                          )
                                                        : t(
                                                              "user_profile.center.identity.name_placeholder"
                                                          )
                                                }
                                                className={`rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 ${isDayMode ? "bg-white border border-slate-200 text-slate-900" : "bg-black/30 border border-white/10 text-white"}`}
                                            />
                                        </div>
                                        {identityType === "club" && (
                                            <input
                                                type="text"
                                                value={identityInviteCode}
                                                onChange={(event) =>
                                                    setIdentityInviteCode(event.target.value)
                                                }
                                                placeholder={t(
                                                    "user_profile.center.identity.invite_placeholder"
                                                )}
                                                className={`mt-2 w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 ${isDayMode ? "bg-white border border-slate-200 text-slate-900" : "bg-black/30 border border-white/10 text-white"}`}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleCreateIdentityClaim}
                                            disabled={identityLoading}
                                            className="mt-3 inline-flex min-h-[38px] items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {identityLoading
                                                ? t("common.submitting", "Submitting...")
                                                : identityType === "club"
                                                  ? t("user_profile.center.identity.verify_org")
                                                  : t("user_profile.center.identity.add_identity")}
                                        </button>
                                        <div className="mt-4 space-y-2">
                                            {identityClaims.length === 0 ? (
                                                <p
                                                    className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                                                >
                                                    {t("user_profile.center.identity.empty_claims")}
                                                </p>
                                            ) : (
                                                identityClaims.map((claim) => (
                                                    <div
                                                        key={claim.id}
                                                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${isDayMode ? "bg-white border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-gray-200"}`}
                                                    >
                                                        <span className="font-bold">
                                                            {claim.display_name}
                                                        </span>
                                                        <span
                                                            className={`ml-auto text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                                                        >
                                                            {identityTypeLabel(claim.type, t)} ·{" "}
                                                            {identityStatusLabel(claim.status, t)}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        ref={outcomeClaimsRef}
                                        data-testid="outcome-claims-section"
                                        className={`scroll-mt-24 rounded-2xl border p-4 ${isDayMode ? "bg-slate-50/80 border-slate-200/80" : "bg-black/20 border-white/10"}`}
                                    >
                                        <div
                                            className={`text-sm font-bold mb-3 ${isDayMode ? "text-slate-800" : "text-white"}`}
                                        >
                                            {t("user_profile.center.identity.outcomes_title")}
                                        </div>
                                        {outcomeLinksLoading ? (
                                            <p
                                                className={`text-sm ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                                            >
                                                {t("common.loading")}
                                            </p>
                                        ) : outcomeLinks.length === 0 ? (
                                            <p
                                                className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                                            >
                                                {t("user_profile.center.identity.empty_outcomes")}
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {outcomeLinks.slice(0, 8).map((link) => (
                                                    <div
                                                        key={
                                                            link.link_id ||
                                                            `${link.id}-${link.identity_claim_id}`
                                                        }
                                                        className={`rounded-xl border p-3 ${isDayMode ? "bg-white border-slate-200" : "bg-white/5 border-white/10"}`}
                                                    >
                                                        <div
                                                            className={`text-sm font-bold line-clamp-1 ${isDayMode ? "text-slate-900" : "text-white"}`}
                                                        >
                                                            {link.title}
                                                        </div>
                                                        <div
                                                            className={`mt-1 text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                                                        >
                                                            {link.bound_identity_name ||
                                                                link.matched_text ||
                                                                link.author}{" "}
                                                            ·{" "}
                                                            {outcomeStatusLabel(
                                                                link.binding_status,
                                                                t
                                                            )}
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {link.binding_status !==
                                                                "confirmed" && (
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        outcomeActionId ===
                                                                        link.link_id
                                                                    }
                                                                    onClick={() =>
                                                                        handleOutcomeAction(
                                                                            link.link_id,
                                                                            "confirm"
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                                                                >
                                                                    {t(
                                                                        "user_profile.center.identity.confirm"
                                                                    )}
                                                                </button>
                                                            )}
                                                            {link.binding_status ===
                                                                "candidate" && (
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        outcomeActionId ===
                                                                        link.link_id
                                                                    }
                                                                    onClick={() =>
                                                                        handleOutcomeAction(
                                                                            link.link_id,
                                                                            "reject"
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                                                                >
                                                                    {t(
                                                                        "user_profile.center.identity.reject"
                                                                    )}
                                                                </button>
                                                            )}
                                                            {link.binding_status ===
                                                                "confirmed" && (
                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        outcomeActionId ===
                                                                        link.link_id
                                                                    }
                                                                    onClick={() =>
                                                                        handleOutcomeAction(
                                                                            link.link_id,
                                                                            "revoke"
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                                                                >
                                                                    {t(
                                                                        "user_profile.center.identity.revoke"
                                                                    )}
                                                                </button>
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
