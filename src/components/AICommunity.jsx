import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HelpCircle, BookOpen, QrCode, Newspaper, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import { useBackClose } from "../hooks/useBackClose";
import SEO from "./SEO";
import CommunityTech from "./CommunityTech";
import CommunityHelp from "./CommunityHelp";
import CommunityGroups from "./CommunityGroups";
import CommunityNewsRail from "./CommunityNewsRail";

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
  },
  {
    key: "help",
    icon: HelpCircle,
    labelKey: "community.tab_help",
    fallback: "求助",
  },
  {
    key: "groups",
    icon: QrCode,
    labelKey: "community.tab_groups",
    fallback: "二维码社群",
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

  return (
    <section className="relative z-10 min-h-screen px-4 pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+96px)] md:px-6 md:pb-20 md:pt-40 lg:pt-44">
      <SEO title={t("nav.community", "AI社区")} description={subtitle} />

      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className={`absolute inset-0 ${
            isDayMode
              ? "bg-[radial-gradient(1100px_520px_at_18%_6%,rgba(199,210,254,0.24),transparent_58%),radial-gradient(900px_500px_at_82%_10%,rgba(186,230,253,0.2),transparent_56%),linear-gradient(180deg,#fbfcff_0%,#f6f8fc_48%,#ffffff_100%)]"
              : "bg-[#0f1014]"
          }`}
        />
        {isDayMode ? (
          <div className="absolute inset-x-0 top-0 h-px bg-slate-200/80" />
        ) : null}
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1120px] gap-6 2xl:max-w-[1500px] 2xl:grid-cols-[320px_minmax(0,1fr)] 2xl:items-start">
        <aside className="hidden 2xl:sticky 2xl:top-24 2xl:block">
          <CommunityNewsRail />
        </aside>

        <div className="mx-auto w-full min-w-0 max-w-[1040px] 2xl:max-w-none">
          <header className="mb-5 flex flex-col gap-4 md:mb-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1
                  className={`text-2xl font-black tracking-tight md:text-3xl ${
                    isDayMode ? "text-slate-950" : "text-white"
                  }`}
                >
                  {t("nav.community", "AI社区")}
                </h1>
                <p
                  className={`mt-1 max-w-2xl text-sm leading-6 ${
                    isDayMode ? "text-slate-500" : "text-gray-400"
                  }`}
                >
                  {subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsNewsOpen(true)}
                className={`inline-flex min-h-[42px] self-start items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-all 2xl:hidden ${
                  isDayMode
                    ? "border-slate-200/80 bg-white text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.045)] hover:border-indigo-200 hover:text-slate-950"
                    : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/10"
                }`}
              >
                <Newspaper size={16} />
                {t("community.news_board", "新闻热榜")}
              </button>
            </div>

            <div
              role="tablist"
              aria-label={t("nav.community", "AI社区")}
              className={`scrollbar-none flex w-full items-center gap-1 overflow-x-auto rounded-2xl border p-1 ${
                isDayMode
                  ? "border-slate-200/70 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.045)]"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              {TABS.map(({ key, icon: Icon, labelKey, fallback }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === key}
                  onClick={() => handleTabChange(key)}
                  className={`inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold whitespace-nowrap transition-all ${
                    activeTab === key
                      ? isDayMode
                        ? "bg-indigo-500 text-white shadow-[0_10px_24px_rgba(99,102,241,0.18)]"
                        : "bg-orange-500 text-black"
                      : isDayMode
                        ? "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        : "text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <Icon size={16} />
                  <span>{t(labelKey, fallback)}</span>
                </button>
              ))}
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
              className={`absolute z-20 rounded-full border p-2 transition-transform hover:rotate-90 ${
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
