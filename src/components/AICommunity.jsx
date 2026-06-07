import { useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Newspaper, QrCode } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import SEO from "./SEO";
import CommunityGroups from "./CommunityGroups";
import CommunityPosts from "./CommunityPosts";
import CommunityNewsRail from "./CommunityNewsRail";
import Music from "./Music";

const SectionLabel = ({ code, title, desc, isDayMode }) => (
  <div className="mb-4">
    <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDayMode ? "text-blue-700" : "text-cyan-300"}`}>
      {code}
    </div>
    <h2 className="mt-1 text-xl font-black md:text-2xl">{title}</h2>
    {desc && (
      <p className={`mt-1 text-xs leading-5 ${isDayMode ? "text-slate-500" : "text-white/50"}`}>
        {desc}
      </p>
    )}
  </div>
);

const SidebarCard = ({ icon: Icon, code, title, desc, isDayMode, children }) => (
  <div>
    <div className={`mb-3 rounded-lg border p-4 ${isDayMode ? "border-slate-200/80 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.04)]" : "border-white/10 bg-white/[0.04]"}`}>
      <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] ${isDayMode ? "text-blue-700" : "text-cyan-300"}`}>
        <Icon size={12} />
        {code}
      </div>
      <h2 className="mt-1.5 text-base font-black leading-tight">{title}</h2>
      {desc && <p className={`mt-1 text-xs leading-5 ${isDayMode ? "text-slate-500" : "text-white/50"}`}>{desc}</p>}
    </div>
    {children}
  </div>
);

const AICommunity = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const subtitle = useMemo(
    () => t("community.seo_description", "浙江大学 AI 社区：求助、技术分享、新闻与协作。"),
    [t],
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("tab");
        if (tab === "tech" || tab === "help") next.set("postTab", tab);
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (location.hash !== "#community-podcast") return;
    window.requestAnimationFrame(() => {
      document.getElementById("community-podcast")?.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    });
  }, [location.hash]);

  return (
    <section
      className={`relative z-10 min-h-screen overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+96px)] md:px-6 md:pb-20 md:pt-20 lg:pt-24 ${isDayMode ? "text-slate-950" : "text-white"}`}
    >
      <SEO title={t("nav.community", "AI社区")} description={subtitle} />

      {!isDayMode && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute inset-x-0 top-0 h-80 bg-[linear-gradient(180deg,rgba(6,182,212,0.08),transparent)]" />
        </div>
      )}

      <div className="relative z-10 w-full">

        {/* ── Hero ── */}
        <header className="mb-8 md:mb-10">
          <div className={`relative overflow-hidden border p-4 md:p-6 lg:p-8 ${isDayMode ? "border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.045)]" : "border-white/10 bg-white/[0.045] shadow-[0_28px_90px_rgba(0,0,0,0.42)]"}`}>
            <div className={`absolute inset-x-0 top-0 h-[2px] ${isDayMode ? "bg-gradient-to-r from-blue-500 via-indigo-400 to-transparent" : "bg-gradient-to-r from-orange-400 via-amber-300 to-transparent"}`} />
            <div className="pointer-events-none absolute -right-10 -top-12 hidden text-[8rem] font-black uppercase leading-none opacity-[0.035] md:block md:text-[12rem]">
              COMMUNITY
            </div>
            <div className="relative max-w-2xl">
              <div className={`inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] ${isDayMode ? "text-blue-700" : "text-cyan-300"}`}>
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${isDayMode ? "bg-blue-400" : "bg-orange-400"}`} />
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${isDayMode ? "bg-blue-500" : "bg-orange-400"}`} />
                </span>
                ZJU AI Collaboration Hub
              </div>
              <h1 className="mt-3 text-[clamp(1.85rem,7vw,3rem)] font-black leading-[0.98] tracking-normal sm:text-5xl xl:text-[3.5rem]">
                AI 社区
                <span className={`block text-[0.62em] font-black ${isDayMode ? "text-slate-400" : "text-white/40"}`}>
                  让问题、经验和人群持续流动。
                </span>
              </h1>
              <p className={`mt-5 mb-2 text-sm font-medium leading-7 ${isDayMode ? "text-slate-600" : "text-white/65"}`}>
                {subtitle}
              </p>
            </div>
          </div>
        </header>

        {/* ── 三列主体 ── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(220px,1fr)_minmax(0,2.5fr)_minmax(220px,1fr)] xl:items-start">

          {/* ── 左列：播客 ── */}
          <aside id="community-podcast" className="xl:sticky xl:top-24">
            <SectionLabel
              code="LISTEN · 播客"
              title="播客"
              desc="收听校园播客与精选音频内容"
              isDayMode={isDayMode}
            />
            <Music embedded singleColumn />
          </aside>

          {/* ── 中列：发帖区 ── */}
          <main id="community-posts" className="min-w-0">
            <SectionLabel
              code="BUILD · ASK · 社区动态"
              title="发帖区"
              desc="分享项目经验，或把问题抛出来让社区接住"
              isDayMode={isDayMode}
            />
            <CommunityPosts />
          </main>

          {/* ── 右列：二维码社群 + 新闻资讯 ── */}
          <aside className="space-y-8 xl:sticky xl:top-24">
            <SidebarCard
              icon={QrCode}
              code="LINK · 加入社群"
              title="二维码社群"
              desc="扫码加入，沉淀真实关系与长期协作"
              isDayMode={isDayMode}
            >
              <CommunityGroups compact />
            </SidebarCard>

            <SidebarCard
              icon={Newspaper}
              code="NEWS · 资讯热榜"
              title="新闻资讯"
              desc="校内外 AI 动态，实时更新"
              isDayMode={isDayMode}
            >
              <CommunityNewsRail />
            </SidebarCard>
          </aside>

        </div>
      </div>
    </section>
  );
};

export default AICommunity;
