import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  HelpCircle,
  Newspaper,
  QrCode,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import { useBackClose } from "../hooks/useBackClose";
import SEO from "./SEO";
import CommunityTech from "./CommunityTech";
import CommunityHelp from "./CommunityHelp";
import CommunityGroups from "./CommunityGroups";
import CommunityNewsRail from "./CommunityNewsRail";
import ResourceSearchBar from "./ResourceSearchBar";

const panels = {
  help: CommunityHelp,
  tech: CommunityTech,
  groups: CommunityGroups,
};

const TABS = [
  {
    key: "tech",
    icon: BookOpen,
    labelKey: "community.tab_tech",
    fallback: "技术分享",
    code: "BUILD",
    desc: "复盘工具、方法和校内项目经验",
  },
  {
    key: "help",
    icon: HelpCircle,
    labelKey: "community.tab_help",
    fallback: "求助",
    code: "ASK",
    desc: "把问题抛出来，等同学和组织接住",
  },
  {
    key: "groups",
    icon: QrCode,
    labelKey: "community.tab_groups",
    fallback: "二维码社群",
    code: "LINK",
    desc: "进入长期协作群，沉淀真实关系",
  },
];

const DEFAULT_TAB = "tech";

const AICommunity = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const [searchParams, setSearchParams] = useSearchParams();
  const [isNewsOpen, setIsNewsOpen] = useState(false);

  useBackClose(isNewsOpen, () => setIsNewsOpen(false));

  const requestedTab = searchParams.get("tab") || DEFAULT_TAB;
  const activeTab = panels[requestedTab] ? requestedTab : DEFAULT_TAB;
  const ActivePanel = panels[activeTab] || CommunityTech;

  const subtitle = useMemo(
    () =>
      t(
        "community.seo_description",
        "浙江大学 AI 社区：求助、技术分享、新闻与协作。",
      ),
    [t],
  );

  useEffect(() => {
    if (searchParams.get("news")) {
      setIsNewsOpen(true);
    }
  }, [searchParams]);

  const handleTabChange = useCallback(
    (tab) => {
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams],
  );

  const activeTabMeta = TABS.find((tab) => tab.key === activeTab) || TABS[0];
  const ActiveIcon = activeTabMeta.icon;
  const dayCommunityPalette = {
    page:
      "bg-[radial-gradient(900px_420px_at_78%_3%,rgba(251,146,60,0.16),transparent_60%),radial-gradient(760px_360px_at_18%_0%,rgba(253,186,116,0.11),transparent_60%),radial-gradient(620px_320px_at_56%_30%,rgba(14,165,233,0.055),transparent_64%),linear-gradient(180deg,#fcfbf8_0%,#f8faf9_48%,#fffaf5_100%)] text-slate-950",
    hero:
      "border-orange-100/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,247,237,0.72)_58%,rgba(248,250,252,0.78))] shadow-[0_24px_70px_rgba(154,52,18,0.075)] ring-1 ring-white/70",
    rail:
      "border-orange-100/70 bg-white/74 shadow-[0_18px_46px_rgba(154,52,18,0.055)]",
    muted: "text-slate-600",
    soft: "text-slate-500",
    label: "text-orange-700",
    tabShell:
      "border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(255,247,237,0.62))]",
    tabActive:
      "border-orange-300/80 bg-[linear-gradient(135deg,rgba(255,237,213,0.96),rgba(254,215,170,0.8)_54%,rgba(255,255,255,0.82))] text-orange-950 shadow-[0_12px_26px_rgba(234,88,12,0.11)]",
    tabIdle: "border-transparent text-slate-600 hover:bg-white/86 hover:text-orange-900",
    stat:
      "border-orange-100/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,247,237,0.62))]",
    action:
      "bg-[linear-gradient(135deg,#f97316,#f59e0b_58%,#fde68a)] text-slate-950 shadow-[0_14px_28px_rgba(234,88,12,0.16)] hover:shadow-[0_18px_36px_rgba(234,88,12,0.2)] hover:-translate-y-0.5 border border-white/45",
  };
  const palette = isDayMode
    ? {
        ...dayCommunityPalette,
      }
    : {
        page:
          "text-white",
        hero:
          "border-white/10 bg-white/[0.045] shadow-[0_28px_90px_rgba(0,0,0,0.42)]",
        rail:
          "border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(0,0,0,0.28)]",
        muted: "text-white/72",
        soft: "text-white/48",
        label: "text-cyan-300",
        tabShell: "border-white/10 bg-black/18",
        tabActive: "border-orange-300 bg-orange-400 text-slate-950 shadow-[0_0_32px_rgba(251,146,60,0.22)]",
        tabIdle: "border-transparent text-white/58 hover:bg-white/[0.06] hover:text-white",
        stat: "border-white/10 bg-white/[0.045]",
        action: "bg-orange-300 text-slate-950 shadow-[0_0_26px_rgba(251,146,60,0.18)] hover:bg-orange-200",
      };

  return (
    <section
      className={`relative z-10 min-h-screen overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+96px)] md:px-6 md:pb-20 md:pt-28 lg:pt-32 ${palette.page}`}
    >
      <SEO title={t("nav.community", "AI社区")} description={subtitle} />

      <div className="fixed inset-0 z-0 pointer-events-none">
        {isDayMode ? null : (
          <div className="absolute inset-x-0 top-0 h-80 bg-[linear-gradient(180deg,rgba(6,182,212,0.08),transparent)]" />
        )}
        {isDayMode ? (
          <>
            <div className="absolute inset-x-0 top-0 h-px bg-orange-100/80" />
            <div className="absolute right-[8%] top-20 hidden h-72 w-72 rounded-full bg-orange-200/18 blur-[110px] md:block" />
            <div className="absolute left-[6%] top-32 hidden h-64 w-64 rounded-full bg-amber-100/22 blur-[100px] md:block" />
          </>
        ) : null}
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1180px] gap-6 2xl:max-w-[1540px] 2xl:grid-cols-[320px_minmax(0,1fr)] 2xl:items-start">
        <aside className="hidden 2xl:sticky 2xl:top-24 2xl:block">
          <CommunityNewsRail />
        </aside>

        <div className="mx-auto w-full min-w-0 max-w-[1100px] 2xl:max-w-none">
          <header className="mb-5 md:mb-7">
            <div className={`relative overflow-hidden border p-4 backdrop-blur-2xl md:p-6 lg:p-7 ${palette.hero}`}>
              {isDayMode && (
                <>
                  <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.2),transparent_66%)] blur-2xl" />
                  <div className="pointer-events-none absolute left-10 top-0 h-px w-2/5 bg-gradient-to-r from-transparent via-orange-200/80 to-transparent" />
                </>
              )}
              <div className="pointer-events-none absolute -right-10 -top-12 hidden text-[8rem] font-black uppercase leading-none tracking-normal opacity-[0.045] md:block md:text-[12rem]">
                COMMUNITY
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-stretch">
                <div className="relative">
                  <div className={`inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] ${palette.label}`}>
                    <Sparkles size={14} />
                    ZJU AI Collaboration Hub
                  </div>
                  <h1 className="mt-3 max-w-3xl text-[clamp(1.85rem,7vw,3rem)] font-black leading-[0.98] tracking-normal sm:text-5xl xl:text-[3.75rem]">
                    AI 社区
                    <span className="block">让问题、经验和人群持续流动。</span>
                  </h1>
                  <p className={`mt-4 max-w-2xl text-sm font-medium leading-7 md:text-base md:leading-8 ${palette.muted}`}>
                    {subtitle} 从一次活动后的讨论，到下一次项目协作，都在这里接上。
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTabChange(activeTab)}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-md px-5 text-sm font-black transition ${palette.action}`}
                    >
                      <ActiveIcon size={16} />
                      进入{t(activeTabMeta.labelKey, activeTabMeta.fallback)}
                      <ArrowRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNewsOpen(true)}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-bold transition-all 2xl:hidden ${isDayMode ? "border-slate-200/80 bg-white/70 text-slate-700 hover:bg-white" : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/10"}`}
                    >
                      <Newspaper size={16} />
                      {t("community.news_board", "新闻热榜")}
                    </button>
                  </div>
                </div>

                <div className={`hidden gap-px overflow-hidden border md:grid ${isDayMode ? "border-slate-200/80 bg-slate-200/80" : "border-white/10 bg-white/10"}`}>
                  {TABS.map(({ key, icon: Icon, labelKey, fallback, code, desc }) => {
                    const isActive = activeTab === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleTabChange(key)}
                        className={`group grid grid-cols-[2.75rem_1fr_auto] items-center gap-3 px-4 py-4 text-left transition ${
                          isActive
                            ? isDayMode
                              ? "bg-[linear-gradient(135deg,rgba(255,237,213,0.98),rgba(254,215,170,0.82),rgba(255,255,255,0.9))] text-orange-950"
                              : "bg-orange-300 text-slate-950"
                            : isDayMode
                              ? "bg-white/76 text-slate-700 hover:bg-orange-50/70"
                              : "bg-black/16 text-white/72 hover:bg-white/[0.06] hover:text-white"
                        }`}
                      >
                        <span className={`flex h-10 w-10 items-center justify-center border ${isActive ? (isDayMode ? "border-orange-200/80 bg-white/70 text-orange-700" : "border-slate-950/10 bg-slate-950/10") : isDayMode ? "border-orange-100 bg-white/70 text-orange-600" : "border-white/10 bg-white/[0.04]"}`}>
                          <Icon size={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-mono text-[10px] font-black uppercase tracking-[0.2em] opacity-58">
                            {code}
                          </span>
                          <span className="mt-1 block text-base font-black leading-tight">
                            {t(labelKey, fallback)}
                          </span>
                          <span className="mt-1 block text-xs leading-5 opacity-68">
                            {desc}
                          </span>
                        </span>
                        <ArrowRight size={16} className="opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <ResourceSearchBar
                placeholder="搜索活动、AI 社区、影像库与校园资源"
                hint="社区内容 · 活动资源 · 影像记录"
              />
            </div>

            <div
              role="tablist"
              aria-label={t("nav.community", "AI社区")}
              className={`scrollbar-none mt-3 flex w-full items-center gap-1 overflow-x-auto rounded-lg border p-1 ${palette.tabShell}`}
            >
              {TABS.map(({ key, icon: Icon, labelKey, fallback }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => handleTabChange(key)}
                  className={`inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold whitespace-nowrap transition-all ${
                    activeTab === key ? palette.tabActive : palette.tabIdle
                  }`}
                >
                  <Icon size={16} />
                  <span>{t(labelKey, fallback)}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 hidden gap-2 md:grid md:grid-cols-3">
              {[
                { label: "当前分区", value: t(activeTabMeta.labelKey, activeTabMeta.fallback), icon: ActiveIcon },
                { label: "协作方式", value: activeTabMeta.code, icon: Users },
                { label: "内容状态", value: "Live", icon: Sparkles },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${palette.stat}`}>
                    <div>
                      <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${palette.soft}`}>{item.label}</div>
                      <div className="mt-1 text-lg font-black leading-none">{item.value}</div>
                    </div>
                    <Icon size={18} className={palette.label} />
                  </div>
                );
              })}
            </div>
          </header>

          <ActivePanel />
        </div>
      </div>

      <AnimatePresence>
        {isNewsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`fixed inset-0 z-[130] 2xl:hidden ${
              isDayMode ? "bg-white" : "bg-[#0f0f0f]"
            }`}
            style={{ height: "100dvh" }}
          >
            <div className="absolute inset-0 overflow-y-auto overscroll-contain p-3 pt-16">
              <CommunityNewsRail />
            </div>
            <button
              type="button"
              aria-label={t("common.close", "关闭")}
              onClick={() => setIsNewsOpen(false)}
              style={{
                top: "max(env(safe-area-inset-top), 1rem)",
                right: "1rem",
              }}
              className={`absolute z-20 rounded-lg border p-2 transition-transform hover:rotate-90 ${
                isDayMode
                  ? "border-slate-200/80 bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:bg-slate-50 hover:text-slate-950"
                  : "border-white bg-white text-slate-900 shadow-lg hover:bg-slate-100"
              }`}
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default AICommunity;
