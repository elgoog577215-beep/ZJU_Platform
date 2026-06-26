import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { QrCode } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import SEO from "./SEO";
import CommunityPosts from "./CommunityPosts";

const CommunityGroups = lazy(() => import("./CommunityGroups"));
const Music = lazy(() => import("./Music"));

const SectionLabel = ({ code, title, isDayMode, compactOnMobile = false }) => (
  <div className={compactOnMobile ? "mb-3 md:mb-4" : "mb-4"}>
    <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDayMode ? "text-violet-700" : "text-cyan-300"}`}>
      {code}
    </div>
    <h2 className={`${compactOnMobile ? "mt-0.5 text-lg md:mt-1 md:text-2xl" : "mt-1 text-xl md:text-2xl"} font-black`}>
      {title}
    </h2>
  </div>
);

const SidebarCard = ({ icon: Icon, code, title, isDayMode, children }) => (
  <div>
    <div className={`mb-3 rounded-lg border p-4 ${isDayMode ? "border-violet-100/80 bg-white shadow-[0_4px_14px_rgba(168,85,247,0.045)]" : "border-white/10 bg-white/[0.04]"}`}>
      <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] ${isDayMode ? "text-violet-700" : "text-cyan-300"}`}>
        <Icon size={12} />
        {code}
      </div>
      <h2 className="mt-1.5 text-base font-black leading-tight">{title}</h2>
    </div>
    {children}
  </div>
);

const DESKTOP_RAIL_QUERY = "(min-width: 1280px)";
const MOBILE_COMMUNITY_QUERY = "(max-width: 1279px)";
const VALID_POST_TABS = new Set(["tech", "help", "materials", "news", "team", "podcast", "groups"]);

const AICommunity = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDesktopRail, setIsDesktopRail] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(DESKTOP_RAIL_QUERY).matches;
  });
  const [isMobileCommunity, setIsMobileCommunity] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_COMMUNITY_QUERY).matches;
  });

  const subtitle = useMemo(
    () => t("community.seo_description", "浙江大学 AI 社区：求助、技术分享、新闻与协作。"),
    [t],
  );

  const setCommunityTab = useCallback((tab, { replace = true } = {}) => {
    if (!tab) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("tab");
        if (tab === "project") next.set("postTab", "tech");
        if (VALID_POST_TABS.has(tab)) next.set("postTab", tab);
        return next;
      },
      { replace },
    );
  }, [setSearchParams]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    setCommunityTab(tab);
  }, [searchParams, setCommunityTab]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_COMMUNITY_QUERY);
    const handleChange = () => setIsMobileCommunity(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!isMobileCommunity) return;
    if (location.hash === "#community-podcast") {
      setCommunityTab("podcast");
      return;
    }
    if (location.hash === "#community-groups") {
      setCommunityTab("groups");
    }
  }, [isMobileCommunity, location.hash, setCommunityTab]);

  useEffect(() => {
    if (isMobileCommunity) return;
    if (location.hash !== "#community-podcast" && location.hash !== "#community-groups") return;
    window.requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }, [isMobileCommunity, location.hash]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_RAIL_QUERY);
    const handleChange = () => setIsDesktopRail(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <section
      className={`relative z-10 min-h-screen overflow-hidden px-3 pt-[calc(env(safe-area-inset-top)+72px)] pb-6 sm:px-4 md:px-6 md:pb-20 md:pt-20 lg:pt-24 ${isDayMode ? "text-slate-950" : "text-white"}`}
    >
      <SEO title={t("nav.community", "AI社区")} description={subtitle} />

      {!isDayMode && (
        <div className="pointer-events-none fixed inset-0 z-0 hidden md:block">
          <div className="absolute inset-x-0 top-0 h-80 bg-[linear-gradient(180deg,rgba(6,182,212,0.08),transparent)]" />
        </div>
      )}

      <div className="relative z-10 w-full">

        <div className="grid grid-cols-1 gap-5 md:gap-6 xl:grid-cols-[18rem_minmax(0,1fr)_22rem] 2xl:grid-cols-[19rem_minmax(0,1fr)_24rem] xl:items-start">

          <main id="community-posts" className="order-1 min-w-0 xl:order-2">
            <CommunityPosts
              headingCode={t("community.main_posts_code", "BUILD · ASK · 社区动态")}
              headingTitle={t("community.main_posts_title", "发帖区")}
            />
          </main>

          <aside id="community-podcast" className="order-2 hidden xl:sticky xl:top-24 xl:order-1 xl:block">
            <SectionLabel
              code={t("community.sidebar_podcast_code", "LISTEN · 播客")}
              title={t("community.sidebar_podcast_title", "播客")}
              isDayMode={isDayMode}
              compactOnMobile
            />
            <Suspense fallback={null}>
              {isDesktopRail ? (
                <Music embedded singleColumn sidebarCompact />
              ) : (
                <Music embedded singleColumn />
              )}
            </Suspense>
          </aside>

          <aside className="order-3 hidden space-y-5 md:space-y-6 xl:sticky xl:top-24 xl:block xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1 custom-scrollbar">
            <div id="community-groups">
              <SidebarCard
                icon={QrCode}
                code={t("community.sidebar_groups_code", "LINK · 加入社群")}
                title={t("community.sidebar_groups_title", "二维码社群")}
                isDayMode={isDayMode}
              >
                <Suspense fallback={null}>
                  <CommunityGroups compact compactLimit={2} />
                </Suspense>
              </SidebarCard>
            </div>
          </aside>

        </div>
      </div>
    </section>
  );
};

export default AICommunity;
