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
  news: "evaluation",
  project: "tools",
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
        next.set("lesson", LEGACY_TAB_TO_LESSON[legacyTab] || "prompt");
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
      className={`relative z-10 min-h-screen overflow-x-hidden px-3 pt-[calc(env(safe-area-inset-top)+72px)] pb-6 sm:px-4 md:px-6 md:pb-20 md:pt-20 lg:pt-24 ${
        isDayMode ? "text-slate-950" : "text-white"
      }`}
    >
      <SEO title={t("community_learning.meta_title", "学习社区")} description={subtitle} />

      {!isDayMode && (
        <div className="pointer-events-none fixed inset-0 z-0 hidden md:block">
          <div className="absolute inset-x-0 top-0 h-96 bg-[linear-gradient(180deg,rgba(124,58,237,0.14),transparent)]" />
          <div className="absolute inset-y-0 right-0 w-96 bg-[linear-gradient(270deg,rgba(14,165,233,0.08),transparent)]" />
        </div>
      )}

      <div className="relative z-10 mx-auto w-full max-w-[1680px]">
        <CommunityPosts />
      </div>
    </section>
  );
};

export default AICommunity;
