import { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  Film,
  Handshake,
  Music2,
  Network,
  Orbit,
  Trees,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { getPartnerDisplayName, getPartnerLogoSrc } from "../data/partnerLogos";
import { useCachedResource } from "../hooks/useCachedResource";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import api from "../services/api";
import {
  listContainer,
  listItem,
  motionTokens,
  sectionReveal,
  tapPress,
  useReducedMotion,
} from "../utils/animations";

const LinkButton = ({ children, onClick, isDayMode, variant = "primary" }) => {
  const isPrimary = variant === "primary";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`motion-press inline-flex min-h-11 items-center justify-center gap-2 border px-5 text-sm font-black transition focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/30 ${
        isPrimary
          ? isDayMode
            ? "border-cyan-500 bg-cyan-500 theme-on-dark shadow-[0_18px_42px_rgba(6,182,212,0.28)] hover:bg-cyan-600"
            : "border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_42px_rgba(103,232,249,0.28)] hover:bg-white"
          : isDayMode
            ? "border-slate-300 bg-white/72 text-slate-800 hover:border-cyan-400 hover:text-cyan-700"
            : "border-white/16 bg-white/[0.045] text-white hover:border-cyan-300/70 hover:bg-cyan-300/10"
      }`}
    >
      {children}
    </button>
  );
};

const EcosystemRadar = memo(({ isDayMode, shouldAnimate, labels }) => {
  const ringClass = isDayMode ? "border-cyan-500/24" : "border-cyan-300/22";
  const nodeClass = isDayMode
    ? "border-cyan-500/28 bg-white/92 text-slate-950 shadow-[0_16px_48px_rgba(6,182,212,0.16)]"
    : "border-cyan-300/24 bg-[#061013]/88 text-white shadow-[0_0_48px_rgba(103,232,249,0.12)]";

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[500px] overflow-hidden">
      <motion.div
        animate={shouldAnimate ? { rotate: 360 } : undefined}
        transition={
          shouldAnimate
            ? { duration: 32, ease: "linear", repeat: Infinity }
            : undefined
        }
        className={`absolute inset-[9%] rounded-full border ${ringClass}`}
      />
      <motion.div
        animate={shouldAnimate ? { rotate: -360 } : undefined}
        transition={
          shouldAnimate
            ? { duration: 46, ease: "linear", repeat: Infinity }
            : undefined
        }
        className={`absolute inset-[21%] rounded-full border ${ringClass}`}
      />
      <div
        className={`absolute left-[7%] right-[7%] top-1/2 h-px ${
          isDayMode
            ? "bg-gradient-to-r from-transparent via-cyan-500/44 to-transparent"
            : "bg-gradient-to-r from-transparent via-cyan-300/42 to-transparent"
        }`}
      />
      <div
        className={`absolute bottom-[7%] left-1/2 top-[7%] w-px ${
          isDayMode
            ? "bg-gradient-to-b from-transparent via-cyan-500/34 to-transparent"
            : "bg-gradient-to-b from-transparent via-cyan-300/34 to-transparent"
        }`}
      />
      <div
        className={`absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px] ${
          isDayMode ? "bg-cyan-200/34" : "bg-cyan-300/12"
        }`}
      />

      <motion.div
        animate={
          shouldAnimate
            ? { scale: [1, 1.035, 1], opacity: [0.92, 1, 0.92] }
            : undefined
        }
        transition={
          shouldAnimate
            ? { duration: 4.6, ease: "easeInOut", repeat: Infinity }
            : undefined
        }
        className={`absolute left-1/2 top-1/2 flex h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border ${nodeClass}`}
      >
        <Orbit
          className={`h-8 w-8 ${
            isDayMode ? "text-cyan-600" : "text-cyan-200"
          }`}
        />
        <div className="mt-3 text-center text-[11px] font-black uppercase tracking-[0.2em] opacity-60">
          ZJU AI
        </div>
        <div className="mt-1 text-center text-2xl font-black leading-none tracking-tight sm:text-3xl">
          {labels.center}
        </div>
      </motion.div>

      {[
        { title: labels.entry, className: "left-[2%] top-[17%]" },
        { title: labels.community, className: "right-[2%] top-[17%]" },
        {
          title: labels.projects,
          className: "bottom-[8%] left-1/2 -translate-x-1/2",
        },
      ].map((item) => (
        <div
          key={item.title}
          className={`absolute ${item.className} min-w-[108px] border px-3 py-3 text-center text-sm font-black ${nodeClass}`}
        >
          {item.title}
        </div>
      ))}
    </div>
  );
});

EcosystemRadar.displayName = "EcosystemRadar";

const EnginePathVisual = memo(({ items, isDayMode, shouldAnimate, loopLabel }) => {
  return (
    <div className="relative mx-auto aspect-[1.45] w-full max-w-[920px] overflow-hidden px-3 py-6 sm:px-8 sm:py-10 lg:aspect-[1.34] lg:px-10 lg:py-12">
      <div
        className={`pointer-events-none absolute inset-x-[5%] top-1/2 h-px -translate-y-1/2 ${
          isDayMode
            ? "bg-gradient-to-r from-transparent via-cyan-500/42 to-transparent"
            : "bg-gradient-to-r from-transparent via-cyan-300/46 to-transparent"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-y-[14%] left-1/2 w-px -translate-x-1/2 ${
          isDayMode
            ? "bg-gradient-to-b from-transparent via-cyan-500/26 to-transparent"
            : "bg-gradient-to-b from-transparent via-cyan-300/32 to-transparent"
        }`}
      />
      <motion.div
        animate={shouldAnimate ? { rotate: 360 } : undefined}
        transition={
          shouldAnimate
            ? { duration: 58, ease: "linear", repeat: Infinity }
            : undefined
        }
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[78%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-full border ${
          isDayMode ? "border-cyan-500/20" : "border-cyan-300/20"
        }`}
      />
      <motion.div
        animate={
          shouldAnimate
            ? { scale: [1, 1.06, 1], opacity: [0.58, 0.86, 0.58] }
            : undefined
        }
        transition={
          shouldAnimate
            ? { duration: 5.4, ease: "easeInOut", repeat: Infinity }
            : undefined
        }
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[42%] w-[32%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px] ${
          isDayMode ? "bg-cyan-200/42" : "bg-cyan-300/16"
        }`}
      />
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 flex h-[34%] w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border text-center ${
          isDayMode
            ? "border-cyan-500/24 bg-white/82 text-slate-950 shadow-[0_24px_80px_rgba(6,182,212,0.16)]"
            : "border-cyan-300/22 bg-[#061013]/88 text-white shadow-[0_0_70px_rgba(103,232,249,0.14)]"
        }`}
      >
        <Orbit className={isDayMode ? "h-7 w-7 text-cyan-700" : "h-7 w-7 text-cyan-200"} />
        <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-55">
          Operating Loop
        </div>
        <div className="mt-1 text-xl font-black leading-none sm:text-2xl">{loopLabel}</div>
      </div>

      {items.map((item, index) => {
        const Icon = item.icon;
        const positions = [
          "left-[3%] top-[9%]",
          "right-[3%] top-[9%]",
          "left-[3%] bottom-[9%]",
          "right-[3%] bottom-[9%]",
        ];
        return (
          <Link
            key={item.code}
            to={item.route}
            className={`group absolute ${positions[index]} w-[39%] border border-l-4 p-4 transition duration-300 hover:-translate-y-1 sm:p-5 ${
              isDayMode
                ? "border-slate-200/80 bg-white/86 shadow-[0_22px_70px_rgba(15,23,42,0.1)] hover:bg-white"
                : "border-white/10 bg-white/[0.045] hover:border-cyan-300/28 hover:bg-cyan-300/[0.07]"
            } ${index === 3 ? (isDayMode ? "border-l-amber-500" : "border-l-amber-300") : isDayMode ? "border-l-cyan-500" : "border-l-cyan-300"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className={`font-mono text-[10px] font-black uppercase tracking-[0.2em] ${item.accent}`}>
                {item.index} / {item.code}
              </div>
              <div className={`flex h-8 w-8 items-center justify-center ${item.iconBg} text-slate-950 shadow-[0_0_30px_rgba(103,232,249,0.18)]`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <h3 className="mt-4 text-xl font-black leading-none tracking-tight sm:text-3xl">
              {item.title}
            </h3>
            <div className={`mt-4 flex items-center justify-between border-t pt-3 text-sm font-black ${paletteSafeDivider(isDayMode)} ${item.accent}`}>
              <span>{item.loop}</span>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
});

EnginePathVisual.displayName = "EnginePathVisual";

const paletteSafeDivider = (isDayMode) =>
  isDayMode ? "border-slate-200/80" : "border-white/10";

const homeSnapSections = [
  { id: "home-hero", labelKey: "home.platform.nav_home", fallback: "Home", icon: Zap },
  { id: "home-ecosystem", labelKey: "home.platform.nav_ecosystem", fallback: "Ecosystem", icon: Network },
  { id: "home-engine", labelKey: "home.platform.nav_engine", fallback: "Engine", icon: Orbit },
  { id: "home-resources", labelKey: "home.platform.nav_resources", fallback: "Resources", icon: Handshake },
  { id: "home-live", labelKey: "home.platform.nav_live", fallback: "Live", icon: Zap },
];

const PlatformStats = ({ hero } = {}) => {
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const { schoolPartners, organizationPartners, enterpriseLogos } = useEcosystemPartners();
  const { user } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  const {
    data: featuredData,
    loading: featuredLoading,
    error: featuredError,
    refresh: refreshFeatured,
  } = useCachedResource(
    "/featured",
    {},
    {
      keyPrefix: "home-featured-mix",
      ttl: 1000 * 60 * 3,
      silent: true,
    },
  );
  const [followingFeed, setFollowingFeed] = useState([]);
  const [followRecommendations, setFollowRecommendations] = useState([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState([]);
  const pageRef = useRef(null);
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const featuredItems = [
    ...(featuredData?.photos || []).slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title || t("home.platform.featured_photo", "Featured Photo"),
      subtitle: t("home.platform.media_photo", "Photo"),
      image: item.url,
      targetPath: `/gallery?id=${item.id}`,
      icon: Camera,
    })),
    ...(featuredData?.articles || []).slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title || t("home.platform.featured_article", "Featured Article"),
      subtitle: t("home.platform.media_article", "Article"),
      image: item.cover,
      targetPath: `/articles?id=${item.id}`,
      icon: BookOpen,
    })),
    ...(featuredData?.videos || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || t("home.platform.featured_video", "Featured Video"),
      subtitle: t("home.platform.media_video", "Video"),
      image: item.thumbnail,
      targetPath: `/videos?id=${item.id}`,
      icon: Film,
    })),
    ...(featuredData?.music || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || t("home.platform.featured_audio", "Featured Audio"),
      subtitle: t("home.platform.media_audio", "Audio"),
      image: item.cover,
      targetPath: `/articles?music=${item.id}#community-podcast`,
      icon: Music2,
    })),
    ...(featuredData?.events || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || t("home.platform.featured_event", "Featured Event"),
      subtitle: t("home.platform.media_event", "Event"),
      image: item.image,
      targetPath: `/events?id=${item.id}`,
      icon: CalendarDays,
    })),
  ]
    .filter((item) => item?.id)
    .slice(0, 7);
  const featuredPreviewItems = featuredItems.slice(0, 3);

  const schoolSupport = schoolPartners.map((partner) => partner.name);
  const studentOrganizations = organizationPartners.map((partner) => partner.name);

  const proofStats = [
    {
      value: settings.about_stat_1_value || "1000+",
      label: settings.about_stat_1_label || t("home.platform.stat_user_base", "Platform User Base"),
      hint: t("home.platform.stat_user_base_hint", "Supports event reach, community connections, and project conversion"),
    },
    {
      value: "4",
      label: t("home.platform.stat_service_chain", "Core Service Chain"),
      hint: t("home.platform.stat_service_chain_hint", "Information publishing, community collaboration, scenario access, and practice validation"),
    },
    {
      value: settings.about_stat_3_value || t("home.platform.stat_sprint_value", "5 Hours"),
      label: settings.about_stat_3_label || t("home.platform.stat_sprint_label", "Timed Practice Mechanism"),
      hint: t("home.platform.stat_sprint_hint", "Helps topics become prototype outcomes quickly"),
    },
  ];

  const radarLabels = {
    center: t("home.platform.radar_center", "Ecosystem Hub"),
    entry: t("home.platform.radar_entry", "Event Entry"),
    community: t("home.platform.radar_community", "Community Ties"),
    projects: t("home.platform.radar_projects", "Project Momentum"),
  };

  const operatingHandles = [
    {
      index: "01",
      code: "ENTRY",
      title: t("home.platform.handle_events_title", "Events Hub"),
      short: t("home.platform.handle_events_short", "Unified Entry"),
      loop: t("home.platform.handle_events_loop", "Gather Resources"),
      icon: CalendarDays,
      description: t("home.platform.handle_events_desc", "Publish campus AI events, enterprise topics, project calls, and learning resources from one entry point."),
      route: "/events",
      accent: isDayMode ? "text-emerald-700" : "text-emerald-300",
      iconBg: isDayMode ? "bg-emerald-500" : "bg-emerald-300",
    },
    {
      index: "02",
      code: "LINK",
      title: t("home.platform.handle_community_title", "AI Community"),
      short: t("home.platform.handle_community_short", "Sustained Co-Creation"),
      loop: t("home.platform.handle_community_loop", "Organize People"),
      icon: Users,
      description: t("home.platform.handle_community_desc", "Connect learners, developers, student organizations, and project leads for ongoing exchange and collaboration."),
      route: "/community",
      accent: isDayMode ? "text-cyan-700" : "text-cyan-300",
      iconBg: isDayMode ? "bg-cyan-500" : "bg-cyan-300",
    },
    {
      index: "03",
      code: "LEARN",
      title: t("home.platform.handle_learning_title", "Future Learning Center"),
      short: t("home.platform.handle_learning_short", "Scenario Base"),
      loop: t("home.platform.handle_learning_loop", "Open Scenarios"),
      icon: Trees,
      description: t("home.platform.handle_learning_desc", "Open real learning scenarios and interdisciplinary topics with space, coordination, and long-term operations."),
      route: "/future-learning",
      accent: isDayMode ? "text-teal-700" : "text-teal-300",
      iconBg: isDayMode ? "bg-teal-500" : "bg-teal-300",
    },
    {
      index: "04",
      code: "BUILD",
      title: t("home.platform.handle_hackathon_title", "Rapid Hackathon"),
      short: t("home.platform.handle_hackathon_short", "Outcome Recognition"),
      loop: t("home.platform.handle_hackathon_loop", "Validate Capability"),
      icon: Trophy,
      description: t("home.platform.handle_hackathon_desc", "Run timed builds and reviews around enterprise topics to validate AI-native development capability."),
      route: "/hackathon",
      accent: isDayMode ? "text-amber-700" : "text-amber-300",
      iconBg: isDayMode ? "bg-amber-500" : "bg-amber-300",
    },
  ];

  const palette = isDayMode
    ? {
        page: "bg-[linear-gradient(180deg,#f6f8fb_0%,#f7fafc_100%)] text-slate-950",
        textSoft: "text-slate-600",
        textMuted: "text-slate-500",
        label: "text-cyan-700",
        border: "border-slate-200/80",
        panel:
          "border-slate-200 bg-white/88 shadow-[0_28px_90px_rgba(15,23,42,0.12)]",
        panelStrong:
          "border-cyan-500/20 bg-white/92 shadow-[0_36px_110px_rgba(15,23,42,0.14)]",
        card:
          "border-slate-200 bg-white/88 shadow-[0_24px_70px_rgba(15,23,42,0.1)]",
        accent: "text-cyan-700",
        accentBg: "bg-cyan-500",
        divider: "border-slate-200",
        watermark: "text-slate-900/[0.045]",
        grid: "border-cyan-500/18 bg-cyan-500/18",
        cell: "bg-white/88",
        firstText: "text-white",
        firstSoft: "text-white/72",
      }
    : {
        page: "bg-[#020617] text-white",
        textSoft: "text-white/72",
        textMuted: "text-white/48",
        label: "text-cyan-300",
        border: "border-white/10",
        panel:
          "border-white/10 bg-[#101516]/88 shadow-[0_28px_90px_rgba(0,0,0,0.46)]",
        panelStrong:
          "border-cyan-300/24 bg-[#081012]/86 shadow-[0_36px_120px_rgba(0,0,0,0.62)]",
        card:
          "border-white/10 bg-[linear-gradient(180deg,rgba(16,21,22,0.92),rgba(16,21,22,0.64))]",
        accent: "text-cyan-300",
        accentBg: "bg-cyan-300",
        divider: "border-white/10",
        watermark: "text-white/[0.04]",
        grid: "border-cyan-300/18 bg-cyan-300/18",
        cell: "bg-[#071113]/94",
        firstText: "text-white",
        firstSoft: "text-white/72",
      };

  useEffect(() => {
    const container = pageRef.current;
    if (!container) return undefined;

    const handleScroll = () => {
      const scrollHeight = container.scrollHeight - container.clientHeight;
      setScrollProgress(
        scrollHeight > 0 ? (container.scrollTop / scrollHeight) * 100 : 0,
      );

      const viewportAnchor = container.scrollTop + container.clientHeight * 0.45;
      const currentIndex = homeSnapSections.reduce((activeIndex, item, index) => {
        const section = document.getElementById(item.id);
        if (!section) return activeIndex;
        return section.offsetTop <= viewportAnchor ? index : activeIndex;
      }, 0);
      setActiveSection(currentIndex);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const smoothScrollTo = (id) => {
    const container = pageRef.current;
    const target = document.getElementById(id);
    if (!container || !target) return;

    container.scrollTo({
      top: target.offsetTop,
      behavior: shouldAnimate ? "smooth" : "auto",
    });
  };

  useEffect(() => {
    if (!user) {
      setFollowingFeed([]);
      setFollowRecommendations([]);
      setFollowingIds([]);
      return;
    }
    let cancelled = false;
    setFollowLoading(true);
    Promise.all([
      api.get("/users/following/feed", { params: { limit: 5 } }),
      api.get("/users/recommendations/follow", { params: { limit: 4 } }),
      api.get("/users/following/ids"),
    ])
      .then(([feedRes, recRes, idsRes]) => {
        if (cancelled) return;
        setFollowingFeed(
          Array.isArray(feedRes.data?.data) ? feedRes.data.data : [],
        );
        setFollowRecommendations(Array.isArray(recRes.data) ? recRes.data : []);
        setFollowingIds(Array.isArray(idsRes.data?.ids) ? idsRes.data.ids : []);
      })
      .catch(() => {
        if (cancelled) return;
        setFollowingFeed([]);
        setFollowRecommendations([]);
        setFollowingIds([]);
      })
      .finally(() => {
        if (!cancelled) setFollowLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFollow = async (targetUserId, event) => {
    event?.stopPropagation();
    if (!user || !targetUserId || Number(targetUserId) === Number(user.id)) {
      return;
    }
    const isFollowing = followingIds.includes(Number(targetUserId));
    try {
      await api[isFollowing ? "delete" : "post"](
        `/users/${targetUserId}/follow`,
      );
      setFollowingIds((prev) =>
        isFollowing
          ? prev.filter((id) => id !== Number(targetUserId))
          : [...prev, Number(targetUserId)],
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <section
      ref={pageRef}
      className={`scrollbar-none relative h-[100svh] snap-y snap-mandatory overflow-y-auto overflow-x-hidden scroll-smooth overscroll-y-contain ${palette.page}`}
    >
      <div className="sticky top-0 z-30 h-0">
        <div className="h-0.5 bg-transparent">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </div>

      <div className="pointer-events-none sticky top-1/2 z-30 hidden h-0 -translate-y-1/2 xl:block">
        <div className="absolute right-6 flex -translate-y-1/2 flex-col items-center gap-4">
          {homeSnapSections.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => smoothScrollTo(item.id)}
              className="pointer-events-auto group relative flex items-center gap-3"
              aria-label={t("home.platform.jump_to_section", "Jump to {{section}}", {
                section: t(item.labelKey, item.fallback),
              })}
            >
              <span
                className={`absolute right-full mr-3 whitespace-nowrap text-xs font-black uppercase tracking-[0.18em] opacity-0 transition group-hover:opacity-100 ${
                  activeSection === index ? "opacity-100" : ""
                } ${isDayMode ? "text-slate-600" : "text-white/60"}`}
              >
                {t(item.labelKey, item.fallback)}
              </span>
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border text-[10px] font-black transition ${
                  activeSection === index
                    ? isDayMode
                      ? "border-cyan-500 bg-cyan-500 theme-on-dark shadow-lg shadow-cyan-200"
                      : "border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_30px_rgba(103,232,249,0.26)]"
                    : isDayMode
                      ? "border-slate-200 bg-white/82 text-slate-400 hover:border-cyan-400 hover:text-cyan-600"
                      : "border-white/10 bg-white/[0.05] text-white/34 hover:border-cyan-300/60 hover:text-cyan-200"
                }`}
              >
                {activeSection === index ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(103,232,249,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.12)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div
        className={`pointer-events-none absolute -right-[9vw] top-28 select-none text-[16vw] font-black uppercase leading-[0.8] tracking-tight ${palette.watermark}`}
      >
        HOME
      </div>

      {hero ? (
        <div className="relative z-10">
          {hero({ onScrollNext: () => smoothScrollTo("home-ecosystem") })}
        </div>
      ) : null}

      <section
        id="home-ecosystem"
        className="relative z-10 flex min-h-[100svh] snap-start snap-always items-start px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))] sm:px-6 lg:items-center lg:px-10 lg:pb-[calc(4.75rem+env(safe-area-inset-bottom))] 2xl:px-16"
      >
        <motion.div
          variants={sectionReveal}
          initial={prefersReducedMotion ? false : "initial"}
          whileInView={prefersReducedMotion ? undefined : "animate"}
          viewport={motionTokens.viewport}
          className="mx-auto grid w-full max-w-[1880px] items-center gap-7 lg:min-h-[calc(100svh-10rem)] lg:grid-cols-[minmax(0,0.92fr)_minmax(390px,0.68fr)] lg:gap-12 xl:pr-20 2xl:pr-24"
        >
          <div className={palette.firstText}>
            <div
              className={`inline-flex items-center gap-2 border px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] ${palette.label} ${
                isDayMode
                  ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                  : "border-cyan-300/30 bg-cyan-300/[0.07]"
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              ZJU AI Ecosystem
            </div>

            <h2 className="mt-6 max-w-[min(100%,48rem)] text-[2.15rem] font-black leading-[0.96] tracking-tight text-balance min-[360px]:text-[2.45rem] sm:text-5xl lg:text-[clamp(3.25rem,3.75vw,4.45rem)] lg:leading-[0.96] 2xl:text-[4.9rem]">
              <span className="block">{t("home.platform.ecosystem_title_1", "Connect real")}</span>
              <span className={`block ${palette.accent}`}>{t("home.platform.ecosystem_title_2", "enterprise briefs")}</span>
              <span className="block">{t("home.platform.ecosystem_title_3", "to a campus AI network.")}</span>
            </h2>

            <p
              className={`mt-5 max-w-3xl text-sm font-medium leading-7 sm:mt-6 sm:text-lg sm:leading-8 ${palette.firstSoft}`}
            >
              {t("home.platform.ecosystem_desc", "The platform connects students, campus support units, and enterprise partners around AI events, community co-creation, real briefs, and practice competitions.")}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-row sm:gap-3">
              <LinkButton
                isDayMode={isDayMode}
                onClick={() => navigate("/events")}
              >
                {t("home.platform.cta_events", "View Recent Events")}
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton
                isDayMode={isDayMode}
                variant="secondary"
                onClick={() => navigate("/about")}
              >
                {t("home.platform.cta_loop", "Understand the Loop")}
              </LinkButton>
            </div>

            <div className={`mt-4 grid grid-cols-3 gap-px border ${palette.grid} sm:mt-8`}>
              {proofStats.map((item) => (
                <div key={item.label} className={`min-h-[76px] p-3 sm:min-h-0 sm:p-5 ${palette.cell}`}>
                  <div className={`text-2xl font-black leading-none tracking-tight min-[360px]:text-3xl sm:text-[2rem] ${palette.accent}`}>
                    {item.value}
                  </div>
                  <div className="mt-2 text-[11px] font-black leading-4 sm:mt-3 sm:text-sm">
                    {item.label}
                  </div>
                  <p className={`mt-2 hidden text-xs leading-5 sm:block ${palette.textMuted}`}>
                    {item.hint}
                  </p>
                </div>
              ))}
            </div>

            <div className={`mt-4 grid gap-px overflow-hidden border md:hidden ${
              isDayMode
                ? "border-slate-200/80 bg-slate-200/80 shadow-[0_16px_46px_rgba(15,23,42,0.05)]"
                : "border-white/10 bg-white/10"
            }`}>
              {operatingHandles.slice(0, 3).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => navigate(item.route)}
                    className={`group grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 px-4 py-2.5 text-left transition ${
                      isDayMode
                        ? "bg-white/78 hover:bg-cyan-50"
                        : "bg-[#071113]/86 hover:bg-cyan-300/10"
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center ${item.iconBg} text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.18)]`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className={`block font-mono text-[10px] font-black uppercase tracking-[0.18em] ${item.accent}`}>
                        {item.code}
                      </span>
                      <span className="mt-0.5 block text-[0.95rem] font-black leading-tight">
                        {item.loop}
                      </span>
                    </span>
                    <ArrowRight className={`h-4 w-4 transition group-hover:translate-x-0.5 ${palette.textMuted}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`relative hidden min-h-[430px] border p-4 sm:p-6 md:block lg:flex lg:min-h-[560px] lg:items-center ${palette.panelStrong}`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(103,232,249,0.18),transparent_36%),linear-gradient(135deg,rgba(103,232,249,0.08),transparent_46%)]" />
            <div
              className={`pointer-events-none absolute -right-8 -top-8 text-[7rem] font-black uppercase leading-none tracking-tight ${palette.watermark}`}
            >
              LIVE
            </div>
            <EcosystemRadar
              isDayMode={isDayMode}
              shouldAnimate={shouldAnimate}
              labels={radarLabels}
            />
          </div>
        </motion.div>
      </section>

      <section
        id="home-engine"
        className="relative z-10 flex min-h-[100svh] snap-start snap-always items-center px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-[calc(4.75rem+env(safe-area-inset-bottom))] 2xl:px-16"
      >
        <motion.div
          variants={sectionReveal}
          initial={prefersReducedMotion ? false : "initial"}
          whileInView={prefersReducedMotion ? undefined : "animate"}
          viewport={motionTokens.viewport}
          className="mx-auto grid w-full max-w-[1880px] gap-8 lg:grid-cols-[minmax(0,0.66fr)_minmax(0,1.34fr)] lg:items-center lg:gap-16 xl:pr-20 2xl:pr-24"
        >
          <div className="relative">
            <div className={`pointer-events-none absolute -left-4 -top-20 hidden text-[12vw] font-black uppercase leading-none tracking-tight lg:block ${palette.watermark}`}>
              PATH
            </div>
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
              {t("home.platform.engine_kicker", "Core Engine")}
            </p>
            <h2 className="relative mt-3 max-w-[min(100%,37rem)] text-[1.9rem] font-black leading-none tracking-tight text-balance sm:text-5xl lg:text-[clamp(2.45rem,2.85vw,3.55rem)]">
              <span className="block">{t("home.platform.engine_title_1", "Not just more events.")}</span>
              <span className="block">{t("home.platform.engine_title_2", "A clearer path.")}</span>
            </h2>
            <p className={`relative mt-5 max-w-2xl text-sm font-bold leading-7 sm:text-base sm:leading-8 ${palette.textSoft}`}>
              {t("home.platform.engine_desc", "The homepage keeps four actionable entries: discover first, connect next, enter real scenarios, then validate outcomes through timed practice.")}
            </p>

            <div className={`relative mt-7 overflow-hidden border px-4 py-5 md:hidden ${palette.panelStrong}`}>
              <div className={`pointer-events-none absolute left-7 top-8 bottom-8 w-px ${isDayMode ? "bg-cyan-500/24" : "bg-cyan-300/28"}`} />
              <div className="relative z-10 grid gap-4">
                {operatingHandles.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => navigate(item.route)}
                      className="group grid grid-cols-[2.75rem_1fr_auto] items-center gap-3 text-left"
                    >
                      <span className={`relative flex h-9 w-9 items-center justify-center ${item.iconBg} text-slate-950 shadow-[0_0_26px_rgba(103,232,249,0.2)]`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className={`block font-mono text-[10px] font-black uppercase tracking-[0.18em] ${item.accent}`}>
                          {item.index} / {item.code}
                        </span>
                        <span className="mt-1 block text-lg font-black leading-tight">
                          {item.title}
                        </span>
                      </span>
                      <ArrowRight className={`h-4 w-4 transition group-hover:translate-x-1 ${item.accent}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`relative mt-8 hidden max-w-2xl grid-cols-4 gap-5 border-t pt-5 sm:grid lg:grid-cols-2 ${palette.divider}`}>
              {operatingHandles.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => navigate(item.route)}
                  className="group text-left transition hover:-translate-y-0.5"
                >
                  <div className={`font-mono text-[10px] font-black uppercase tracking-[0.18em] ${item.accent}`}>
                    {item.index} / {item.code}
                  </div>
                  <div className="mt-1 text-base font-black sm:text-lg">
                    {item.loop}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={`relative hidden overflow-hidden md:block lg:min-h-[600px] ${isDayMode ? "bg-white/58 shadow-[0_34px_110px_rgba(15,23,42,0.1)]" : "bg-white/[0.025] shadow-[0_36px_120px_rgba(0,0,0,0.32)]"}`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(103,232,249,0.18),transparent_34%),radial-gradient(circle_at_78%_76%,rgba(251,191,36,0.08),transparent_28%),linear-gradient(135deg,rgba(103,232,249,0.06),transparent_48%)]" />
            <div className={`pointer-events-none absolute right-4 top-2 text-[18vw] font-black uppercase leading-none tracking-tight lg:text-[9rem] ${palette.watermark}`}>
              LOOP
            </div>
            <EnginePathVisual
              items={operatingHandles}
              isDayMode={isDayMode}
              shouldAnimate={shouldAnimate}
              loopLabel={t("home.platform.loop_label", "Loop")}
            />
          </div>
        </motion.div>
      </section>

      <section
        id="home-resources"
        className="relative z-10 flex min-h-[100svh] snap-start snap-always items-start px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))] sm:px-6 lg:items-center lg:px-10 lg:pb-[calc(4.75rem+env(safe-area-inset-bottom))] 2xl:px-16"
      >
        <motion.div
          variants={sectionReveal}
          initial={prefersReducedMotion ? false : "initial"}
          whileInView={prefersReducedMotion ? undefined : "animate"}
          viewport={motionTokens.viewport}
          className="mx-auto grid w-full max-w-[1880px] gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-center lg:gap-14 xl:pr-20 2xl:pr-24"
        >
          <div className={`relative overflow-hidden p-4 sm:p-7 lg:min-h-[620px] lg:p-10 ${isDayMode ? "bg-white/64 shadow-[0_34px_110px_rgba(15,23,42,0.1)]" : "bg-white/[0.025] shadow-[0_36px_120px_rgba(0,0,0,0.3)]"}`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(103,232,249,0.18),transparent_38%),radial-gradient(circle_at_78%_78%,rgba(45,212,191,0.1),transparent_30%)]" />
            <div
              className={`pointer-events-none absolute -right-16 bottom-8 text-[11rem] font-black uppercase leading-none tracking-tight ${palette.watermark}`}
            >
              BASE
            </div>
            <div className={`pointer-events-none absolute left-0 top-0 h-full w-1 ${palette.accentBg}`} />
            <div className="relative z-10 flex h-full flex-col justify-between gap-7 lg:min-h-[540px]">
              <div>
                <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                  01 / Foundation
                </div>
                <h2 className="mt-3 max-w-lg text-[1.9rem] font-black leading-[0.96] tracking-tight min-[360px]:text-[2.1rem] sm:mt-6 sm:text-[3.65rem] lg:text-[clamp(3.45rem,4.2vw,4.6rem)]">
                  {t("home.platform.resources_title_1", "Three-way")}
                  <br />
                  {t("home.platform.resources_title_2", "resources meet here")}
                </h2>
                <p className={`mt-3 max-w-lg text-xs leading-5 sm:mt-5 sm:text-[0.95rem] sm:leading-7 ${palette.textSoft}`}>
                  {t("home.platform.resources_desc", "Campus support units provide scenarios, spaces, and organization. Student groups drive reach and execution. Enterprise partners bring real briefs, technology, and outcome pathways.")}
                </p>
              </div>

              <div className="relative hidden min-h-[170px] md:block">
                <div className={`absolute left-1/2 top-1/2 h-px w-[78%] -translate-x-1/2 ${isDayMode ? "bg-cyan-500/26" : "bg-cyan-300/28"}`} />
                <div className={`absolute left-1/2 top-1/2 h-[76%] w-px -translate-y-1/2 ${isDayMode ? "bg-cyan-500/18" : "bg-cyan-300/22"}`} />
                {[
                  { label: t("home.platform.node_school", "Campus Scenarios"), className: "left-0 top-0" },
                  { label: t("home.platform.node_students", "Student Groups"), className: "right-0 top-1/2 -translate-y-1/2" },
                  { label: t("home.platform.node_enterprise", "Enterprise Briefs"), className: "left-[18%] bottom-0" },
                ].map((node) => (
                  <div
                    key={node.label}
                    className={`absolute ${node.className} min-w-[128px] border px-4 py-3 text-sm font-black ${
                      isDayMode
                        ? "border-cyan-500/18 bg-white/78 text-slate-950"
                        : "border-cyan-300/16 bg-[#061013]/78 text-white"
                    }`}
                  >
                    {node.label}
                  </div>
                ))}
                <div className={`absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center border text-center text-xs font-black uppercase tracking-[0.16em] ${
                  isDayMode
                    ? "border-cyan-500/24 bg-cyan-50 text-cyan-700"
                    : "border-cyan-300/22 bg-cyan-300/[0.08] text-cyan-200"
                }`}>
                  Resource<br />Flow
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-3">
                {schoolSupport.map((item) => (
                  <div
                    key={item}
                    className={`grid gap-0.5 border-l-4 px-3 py-2 sm:gap-2 sm:px-4 sm:py-3.5 ${
                      isDayMode
                        ? "border-l-cyan-500 bg-white/76"
                        : "border-l-cyan-300 bg-cyan-300/[0.05]"
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.1em] sm:gap-2 sm:text-[11px] sm:tracking-[0.18em] ${palette.textMuted}`}>
                      <Building2 className="h-3.5 w-3.5" />
                      School Support
                    </div>
                    <div className="text-sm font-black leading-tight sm:text-xl">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-7 lg:min-h-[620px] lg:grid-rows-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
            <div className={`relative overflow-hidden border-t px-0 py-2 sm:py-0 lg:flex lg:items-center ${palette.divider}`}>
              <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)] lg:items-center">
                <div>
                  <div className={`flex items-center gap-2 font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                    <Users className="h-3.5 w-3.5" />
                    Campus Force
                  </div>
                  <h3 className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-[2.35rem] lg:text-[clamp(2.3rem,3vw,3.25rem)]">
                    {t("home.platform.student_orgs_title", "Student Organizations")}
                  </h3>
                  <p className={`mt-2 hidden max-w-md text-sm font-bold leading-6 sm:block ${palette.textMuted}`}>
                    {t("home.platform.student_orgs_desc", "Responsible for reach, operations, collaboration, and review so AI practice communities keep gathering.")}
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {studentOrganizations.map((item) => (
                    <span
                      key={item}
                      className={`flex min-h-[52px] items-center justify-center border px-2 py-2 text-sm font-black transition duration-300 hover:-translate-y-0.5 sm:min-h-[68px] sm:px-4 sm:py-3 sm:text-xl lg:min-h-[86px] ${
                        isDayMode
                          ? "border-slate-200/80 bg-white/72 shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
                          : "border-white/10 bg-white/[0.035] hover:border-cyan-300/24 hover:bg-cyan-300/[0.055]"
                      }`}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={`relative overflow-hidden p-4 sm:p-7 lg:p-8 ${isDayMode ? "bg-white/58 shadow-[0_26px_80px_rgba(15,23,42,0.1)]" : "bg-white/[0.025] shadow-[0_30px_100px_rgba(0,0,0,0.28)]"}`}>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_10%,rgba(103,232,249,0.14),transparent_36%)]" />
              <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.66fr)]">
                <div className="flex flex-col justify-between gap-5">
                  <div>
                  <div className={`flex items-center gap-2 font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                    <Handshake className="h-3.5 w-3.5" />
                    Technical Backing
                  </div>
                  <h3 className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-[2.35rem] lg:text-[clamp(2.3rem,3vw,3.25rem)]">
                    {t("home.platform.enterprise_title", "Enterprise Partners")}
                  </h3>
                  <p className={`mt-2 hidden max-w-md text-sm font-bold leading-6 sm:block ${palette.textMuted}`}>
                    {t("home.platform.enterprise_desc", "Provide real briefs, model capabilities, cloud resources, and outcome evaluation so prototypes can be tested.")}
                  </p>
                  </div>
                  <div className={`hidden border-l-4 px-4 py-3 text-sm font-black leading-6 lg:block ${isDayMode ? "border-l-cyan-500 bg-white/70 text-slate-600" : "border-l-cyan-300 bg-cyan-300/[0.05] text-white/64"}`}>
                    {t("home.platform.resource_chain", "Resources are not a sponsor wall; they form a scenario - people - technology - competition conversion chain.")}
                  </div>
                </div>

              <div className="scrollbar-none flex snap-x gap-3 overflow-x-auto pb-1 sm:grid sm:auto-rows-fr sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-4 xl:gap-4">
                {enterpriseLogos.map((logo) => (
                  <div
                    key={logo.id || logo.src || logo.name}
                    className={`group flex min-h-[58px] min-w-[48%] snap-start items-center justify-center overflow-hidden border px-3 py-3 transition duration-300 hover:-translate-y-0.5 sm:min-h-[72px] sm:min-w-0 sm:px-4 sm:py-4 lg:min-h-[88px] lg:px-3 lg:py-4 xl:px-4 ${
                      isDayMode
                        ? "border-slate-200/80 bg-white/80 shadow-[0_16px_44px_rgba(15,23,42,0.08)]"
                        : "border-white/10 bg-white/[0.04] hover:border-cyan-300/30 hover:bg-cyan-300/[0.065]"
                    }`}
                  >
                    {getPartnerLogoSrc(logo, isDayMode) ? (
                      <img
                        src={getPartnerLogoSrc(logo, isDayMode)}
                        alt={logo.alt}
                        className={`w-auto max-w-full object-contain transition duration-300 group-hover:scale-[1.04] ${
                          logo.size || "h-5 sm:h-7 lg:h-[clamp(1.35rem,2.7vh,1.9rem)]"
                        } ${!isDayMode ? logo.darkClassName || "" : ""}`}
                      />
                    ) : (
                      <span
                        className={`text-center text-xs font-black leading-tight sm:text-sm ${
                          isDayMode ? "text-slate-950" : "text-white"
                        }`}
                      >
                        {getPartnerDisplayName(logo)}
                      </span>
                    )}
                    {logo.text ? (
                      <span
                        className={`ml-2 whitespace-nowrap text-sm font-black leading-none tracking-tight sm:text-base lg:text-[clamp(0.8rem,1.15vw,1rem)] ${
                          isDayMode ? "text-slate-950" : "text-white"
                        }`}
                      >
                        {logo.text}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section
        id="home-live"
        className="relative z-10 flex min-h-[100svh] snap-start snap-always items-center px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(4.75rem+env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-20 2xl:px-16"
      >
        <motion.div
          variants={sectionReveal}
          initial={prefersReducedMotion ? false : "initial"}
          whileInView={prefersReducedMotion ? undefined : "animate"}
          viewport={motionTokens.viewport}
          className="mx-auto grid w-full max-w-[1880px] gap-6 lg:grid-cols-[minmax(0,0.68fr)_minmax(0,1.32fr)] lg:items-center lg:gap-10 xl:pr-20 2xl:pr-24"
        >
          <div className="relative">
            <div
              className={`pointer-events-none absolute -left-6 -top-16 hidden text-[11vw] font-black uppercase leading-none tracking-tight lg:block ${palette.watermark}`}
            >
              LIVE
            </div>
            <div className="relative">
              <p className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
                <Zap className="h-3.5 w-3.5" />
                Now Live
              </p>
              <h2 className="mt-3 max-w-5xl text-[2.15rem] font-black leading-none tracking-tight text-balance sm:text-5xl lg:text-[clamp(3.1rem,5.4vw,5.45rem)]">
                {t("home.platform.live_title_1", "Works, events,")}
                <br />
                {t("home.platform.live_title_2", "and ideas in motion.")}
              </h2>
              <p className={`mt-5 max-w-xl text-sm font-bold leading-7 sm:text-base sm:leading-8 ${palette.textSoft}`}>
                {t("home.platform.live_desc", "The last homepage section returns from platform narrative to real content users can click, join, and follow.")}
              </p>
            </div>
            <div className="relative mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-start">
              <LinkButton
                isDayMode={isDayMode}
                onClick={() => navigate("/articles")}
              >
                {t("home.platform.cta_discover", "Enter Discovery")}
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton
                isDayMode={isDayMode}
                variant="secondary"
                onClick={() => navigate("/hackathon")}
              >
                {t("home.platform.handle_hackathon_title", "Rapid Hackathon")}
              </LinkButton>
            </div>
            <div className={`relative mt-6 hidden max-w-xl grid-cols-3 gap-px border sm:grid ${palette.grid}`}>
              {[
                { label: t("home.platform.metric_content", "Content"), value: featuredPreviewItems.length || 0 },
                { label: t("home.platform.metric_entries", "Entries"), value: "3+" },
                { label: t("home.platform.metric_following", "Following"), value: user ? followingFeed.length : t("auth.log_in", "Log In") },
              ].map((item) => (
                <div key={item.label} className={`p-3 sm:p-4 ${palette.cell}`}>
                  <div className={`text-2xl font-black leading-none ${palette.accent}`}>
                    {item.value}
                  </div>
                  <div className={`mt-2 text-[11px] font-black uppercase tracking-[0.16em] ${palette.textMuted}`}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:min-h-[620px] lg:grid-rows-[minmax(0,1fr)_auto]">
          <div>
            {featuredLoading && featuredPreviewItems.length === 0 ? (
              <motion.div
                variants={listContainer}
                initial={prefersReducedMotion ? false : "initial"}
                whileInView={prefersReducedMotion ? undefined : "animate"}
                viewport={motionTokens.viewport}
                className="grid gap-3 sm:gap-4 lg:h-full lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.82fr)]"
                aria-busy="true"
                aria-label={t("common.loading")}
              >
                {[0, 1, 2].map((item, index) => (
                  <motion.div
                    key={item}
                    variants={listItem}
                    className={`min-h-[230px] overflow-hidden border lg:min-h-0 ${
                      index > 1 ? "hidden" : index > 0 ? "hidden sm:block" : ""
                    } ${palette.card}`}
                  >
                    <div
                      className={`relative overflow-hidden ${
                        index === 0 ? "h-32 lg:h-48" : "h-32 lg:h-40"
                      } ${isDayMode ? "bg-slate-100" : "bg-black/40"}`}
                    >
                      <div
                        className={`absolute inset-y-0 w-1/2 animate-skeleton bg-gradient-to-r from-transparent ${
                          isDayMode ? "via-white/80" : "via-white/10"
                        } to-transparent`}
                      />
                    </div>
                    <div className="space-y-4 p-4 lg:p-5">
                      <div
                        className={`h-3 w-28 ${
                          isDayMode ? "bg-slate-200" : "bg-white/10"
                        }`}
                      />
                      <div className="space-y-2">
                        <div
                          className={`h-6 w-full ${
                            isDayMode ? "bg-slate-200" : "bg-white/10"
                          }`}
                        />
                        <div
                          className={`h-6 w-2/3 ${
                            isDayMode ? "bg-slate-200" : "bg-white/10"
                          }`}
                        />
                      </div>
                      <div
                        className={`h-4 w-24 ${
                          isDayMode ? "bg-cyan-100" : "bg-cyan-300/15"
                        }`}
                      />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : featuredError && featuredPreviewItems.length === 0 ? (
              <div className={`border px-5 py-6 text-sm ${palette.card}`}>
                <div>{t("home.platform.featured_load_failed", "Featured content failed to load")}</div>
                <button
                  type="button"
                  onClick={() => refreshFeatured()}
                  className={`motion-press mt-4 min-h-10 border px-4 text-xs font-black ${
                    isDayMode
                      ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
                  }`}
                >
                  {t("common.refresh", "Refresh")}
                </button>
              </div>
            ) : featuredPreviewItems.length === 0 ? (
              <div className={`border px-5 py-6 text-sm ${palette.card}`}>
                {t("home.platform.featured_empty", "No featured content yet")}
              </div>
            ) : (
              <motion.div
                variants={listContainer}
                initial={prefersReducedMotion ? false : "initial"}
                whileInView={prefersReducedMotion ? undefined : "animate"}
                viewport={motionTokens.viewport}
                className="grid gap-3 sm:gap-4 lg:h-full lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.82fr)]"
              >
                {featuredPreviewItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      variants={listItem}
                      whileTap={prefersReducedMotion ? undefined : tapPress}
                      key={`${item.subtitle}-${item.id}`}
                      type="button"
                      aria-label={`${item.subtitle} ${item.title}`}
                      onClick={() => navigate(item.targetPath)}
                      className={`motion-gpu motion-lift group min-h-[230px] overflow-hidden border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 lg:min-h-0 ${
                        index > 1 ? "hidden" : index > 0 ? "hidden sm:block" : ""
                      } ${palette.card}`}
                    >
                      <div className={`${index === 0 ? "h-32 lg:h-[360px]" : "h-32 lg:h-[210px]"} ${isDayMode ? "bg-slate-100" : "bg-black/40"}`}>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon
                              size={22}
                              className={isDayMode ? "text-slate-400" : "text-gray-500"}
                            />
                          </div>
                        )}
                      </div>
                      <div className="p-4 lg:p-6">
                        <div className={`mb-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] ${palette.textMuted}`}>
                          <Icon size={13} />
                          {item.subtitle}
                        </div>
                        <div className={`line-clamp-2 text-xl font-black leading-7 ${index === 0 ? "lg:text-[2.1rem] lg:leading-tight" : ""} ${isDayMode ? "text-slate-950" : "text-white"}`}>
                          {item.title}
                        </div>
                        <div className={`mt-5 inline-flex items-center gap-2 text-sm font-black ${palette.accent}`}>
                          {t("common.view_details", "View Details")}
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </div>

          {user && (
            <motion.div
              variants={sectionReveal}
              initial={prefersReducedMotion ? false : "initial"}
              whileInView={prefersReducedMotion ? undefined : "animate"}
              viewport={motionTokens.viewport}
              className={`grid gap-5 border p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px] ${palette.panel}`}
            >
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-9 w-9 items-center justify-center ${isDayMode ? "bg-indigo-50 text-indigo-500" : "bg-indigo-400/10 text-indigo-300"}`}>
                      <Users size={16} />
                    </div>
                    <span className={`text-xs font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                      {t("home.platform.following_feed", "Following Feed")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/articles")}
                    className={`motion-press inline-flex min-h-9 items-center gap-1 px-3 text-xs font-black ${
                      isDayMode
                        ? "text-indigo-600 hover:bg-indigo-50"
                        : "text-indigo-300 hover:bg-white/5"
                    }`}
                  >
                    {t("common.view_details", "View Details")}
                    <ArrowRight size={12} />
                  </button>
                </div>

                {followLoading ? (
                  <div className={`text-sm ${palette.textMuted}`}>
                    {t("common.loading")}
                  </div>
                ) : followingFeed.length === 0 ? (
                  <div className={`border px-4 py-5 text-sm ${isDayMode ? "border-slate-200/80 bg-slate-50/80 text-slate-500" : "border-white/10 bg-black/20 text-gray-400"}`}>
                    {t("home.platform.following_empty", "Authors you follow have not posted new content yet")}
                  </div>
                ) : (
                  <motion.div
                    variants={listContainer}
                    initial={prefersReducedMotion ? false : "initial"}
                    whileInView={prefersReducedMotion ? undefined : "animate"}
                    viewport={motionTokens.viewport}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    {followingFeed.map((item) => (
                      <motion.button
                        variants={listItem}
                        whileTap={prefersReducedMotion ? undefined : tapPress}
                        key={`${item.resource_type}-${item.id}`}
                        type="button"
                        onClick={() => navigate(item.target_path || "/articles")}
                        className={`motion-gpu motion-lift w-full border px-4 py-4 text-left ${palette.card}`}
                      >
                        <div className={`truncate text-base font-black ${isDayMode ? "text-slate-950" : "text-white"}`}>
                          {item.title}
                        </div>
                        <div className={`mt-2 text-xs leading-5 ${palette.textMuted}`}>
                          {[item.author_name, item.resource_type]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </div>

              <div className={`border p-4 ${isDayMode ? "border-slate-200 bg-white/72" : "border-white/10 bg-black/20"}`}>
                <div className={`mb-3 text-xs font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                  {t("home.platform.recommended_follows", "Recommended Follows")}
                </div>
                <div className="space-y-2">
                  {followRecommendations.slice(0, 4).map((item) => {
                    const followed = followingIds.includes(Number(item.id));
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className={`motion-link truncate text-sm font-bold ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                          onClick={() => navigate(`/user/${item.id}`)}
                        >
                          {item.nickname || item.username}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => toggleFollow(item.id, event)}
                          className={`motion-press min-h-[34px] border px-3 py-1.5 text-[11px] font-bold ${
                            followed
                              ? isDayMode
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-indigo-400/35 bg-indigo-500/20 text-indigo-100"
                              : isDayMode
                                ? "border-slate-200/80 bg-white text-slate-700"
                                : "border-white/10 bg-white/5 text-gray-200"
                          }`}
                        >
                          {followed ? t("home.platform.followed", "Following") : t("home.platform.follow", "Follow")}
                        </button>
                      </div>
                    );
                  })}
                  {followRecommendations.length === 0 && (
                    <div className={`text-xs ${palette.textMuted}`}>{t("home.platform.no_recommendations", "No recommendations")}</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {!user && (
            <div className={`hidden border p-4 sm:block sm:p-5 ${palette.panel}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className={`text-xs font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                    Personalized Feed
                  </div>
                  <div className="mt-1 text-lg font-black">{t("home.platform.login_to_view_feed", "Log in to view your following feed")}</div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className={`motion-press min-h-10 border px-4 text-xs font-black ${
                    isDayMode
                      ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
                  }`}
                >
                  {t("auth.log_in", "Log In")}
                </button>
              </div>
            </div>
          )}
          </div>
        </motion.div>
      </section>
    </section>
  );
};

export default PlatformStats;
