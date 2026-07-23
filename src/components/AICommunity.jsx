import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import SEO from "./SEO";
import CommunityPosts from "./CommunityPosts";

const LEGACY_TAB_TO_AREA = {
  tech: "learn",
  featured: "learn",
  materials: "resources",
  help: "discuss",
  news: "learn",
  team: "discuss",
  groups: "discuss",
  project: "learn",
};

const LEGACY_TAB_TO_LESSON = {
  tech: "prompt",
  featured: "prompt",
  news: "launch",
  project: "agent",
};

const AICommunity = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const [searchParams, setSearchParams] = useSearchParams();

  const subtitle = useMemo(
    () => t(
      "community_learning.seo_description",
      "学习社区：连接 AI 教程、课程资源和同伴讨论。",
    ),
    [t],
  );

  const migrateLegacyParams = useCallback(() => {
    const legacyTab = searchParams.get("postTab") || searchParams.get("tab");
    if (!legacyTab && !searchParams.get("news") && !searchParams.get("group")) return;

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const area = LEGACY_TAB_TO_AREA[legacyTab] || (searchParams.get("group") ? "discuss" : "learn");
      next.set("area", area);
      if (area === "learn") {
        next.set("lesson", LEGACY_TAB_TO_LESSON[legacyTab] || "basics");
      } else {
        next.delete("lesson");
      }
      next.delete("postTab");
      next.delete("tab");
      next.delete("news");
      next.delete("group");
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    migrateLegacyParams();
  }, [migrateLegacyParams]);

  return (
    <section
      className={`relative z-10 min-h-screen overflow-x-clip px-3 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] pt-[calc(env(safe-area-inset-top)+64px)] sm:px-4 md:px-6 md:pb-20 md:pt-20 lg:pt-24 ${
        isDayMode ? "text-slate-950" : "text-white"
      }`}
    >
      <SEO title={t("community_learning.meta_title", "学习社区")} description={subtitle} />

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 hidden h-80 overflow-hidden md:block">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,182,212,0.055),transparent)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1680px]">
        <CommunityPosts />
      </div>
    </section>
  );
};

export default AICommunity;
