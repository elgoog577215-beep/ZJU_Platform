import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HelpCircle, BookOpen, QrCode, Newspaper, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useBackClose } from "../hooks/useBackClose";
import api from "../services/api";
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
    fallback: "求助天地",
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
  const { user } = useAuth();
  const isDayMode = uiMode === "day";
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileNewsOpen, setIsMobileNewsOpen] = useState(false);
  useBackClose(isMobileNewsOpen, () => setIsMobileNewsOpen(false));
  const [metricsSummary, setMetricsSummary] = useState(null);

  const requestedTab = searchParams.get("tab") || DEFAULT_TAB;
  const activeTab = panels[requestedTab] ? requestedTab : DEFAULT_TAB;

  useEffect(() => {
    if (searchParams.get("news")) {
      setIsMobileNewsOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    let cancelled = false;
    api
      .get("/admin/community/metrics", { params: { days: 14 } })
      .then(({ data }) => {
        if (!cancelled) setMetricsSummary(data?.summary || null);
      })
      .catch(() => {
        if (!cancelled) setMetricsSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const handleTabChange = useCallback(
    (tab) => {
      setSearchParams({ tab }, { replace: true });
    },
    [setSearchParams],
  );

  const ActivePanel = panels[activeTab] || CommunityTech;
  const subtitle = useMemo(
    () =>
      t(
        "community.seo_description",
        "AI社区新结构：左侧新闻热榜，主内容为求助与技术分享，附二维码社群。",
      ),
    [t],
  );

  return (
    <section className="pt-24 pb-28 md:py-24 px-4 md:px-8 min-h-screen relative z-10 overflow-hidden">
      <SEO title={t("nav.community", "AI社区")} description={subtitle} />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-orange-500/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/10 blur-[120px]" />
      </div>

      <div className="hidden lg:block fixed left-4 xl:left-8 top-24 z-20 w-[300px] xl:w-[320px]">
        <CommunityNewsRail />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1760px] lg:grid lg:grid-cols-[300px_minmax(0,1fr)_300px] lg:gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px] xl:gap-12">
        <div className="hidden lg:block" aria-hidden="true" />
        <div className="w-full min-w-0 max-w-[1080px] mx-auto">
          <div className="mb-6 md:mb-8 text-center hidden md:block">
            <h2
              className={`text-4xl md:text-5xl font-bold font-serif mb-4 ${isDayMode ? "text-slate-900" : "text-white"}`}
            >
              {t("nav.community", "AI社区")}
            </h2>
            <p
              className={`max-w-3xl mx-auto text-sm md:text-base ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
            >
              {subtitle}
            </p>
          </div>

          <div className="mb-3 md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileNewsOpen(true)}
              className={`w-full h-11 px-4 rounded-2xl border text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                isDayMode
                  ? "bg-white border-slate-200 text-slate-700"
                  : "bg-white/5 border-white/10 text-gray-200"
              }`}
            >
              <Newspaper size={16} />
              {t("community.news_board", "新闻热榜")}
            </button>
          </div>

          <div
            className={`mb-5 p-2 rounded-2xl border backdrop-blur-xl flex items-center gap-2 overflow-x-auto ${isDayMode ? "bg-white/82 border-slate-200/80" : "bg-[#1a1a1a]/60 border-white/10"}`}
          >
            {TABS.map(({ key, icon: Icon, labelKey, fallback }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleTabChange(key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === key
                    ? isDayMode
                      ? "bg-orange-500 text-white shadow-[0_12px_28px_rgba(249,115,22,0.3)]"
                      : "bg-orange-500 text-black"
                    : isDayMode
                      ? "text-slate-600 hover:bg-slate-100"
                      : "text-gray-300 hover:bg-white/10"
                }`}
              >
                <Icon size={16} />
                <span>{t(labelKey, fallback)}</span>
              </button>
            ))}
          </div>

          {user?.role === "admin" && metricsSummary ? (
            <div
              className={`mb-5 p-4 rounded-2xl border ${isDayMode ? "bg-white/82 border-slate-200/80" : "bg-[#1a1a1a]/40 border-white/10"}`}
            >
              <p
                className={`text-xs uppercase tracking-[0.2em] mb-3 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
              >
                {t("community.metrics_14d", "社区转化指标（近14天）")}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div
                  className={`rounded-xl border p-3 ${isDayMode ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"}`}
                >
                  <p
                    className={`text-[11px] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    文章阅读
                  </p>
                  <p
                    className={`text-xl font-black mt-1 ${isDayMode ? "text-slate-900" : "text-white"}`}
                  >
                    {metricsSummary.article_view || 0}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-3 ${isDayMode ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"}`}
                >
                  <p
                    className={`text-[11px] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    文章分享
                  </p>
                  <p
                    className={`text-xl font-black mt-1 ${isDayMode ? "text-slate-900" : "text-white"}`}
                  >
                    {metricsSummary.article_share || 0}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-3 ${isDayMode ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"}`}
                >
                  <p
                    className={`text-[11px] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    新闻→文章
                  </p>
                  <p
                    className={`text-xl font-black mt-1 ${isDayMode ? "text-slate-900" : "text-white"}`}
                  >
                    {metricsSummary.news_to_article_click || 0}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-3 ${isDayMode ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/10"}`}
                >
                  <p
                    className={`text-[11px] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    文章→社群
                  </p>
                  <p
                    className={`text-xl font-black mt-1 ${isDayMode ? "text-slate-900" : "text-white"}`}
                  >
                    {metricsSummary.article_to_group_click || 0}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className={`rounded-2xl border p-3 md:p-4 ${isDayMode ? "bg-white/82 border-slate-200/80" : "bg-[#1a1a1a]/40 border-white/10"}`}
          >
            <ActivePanel />
          </div>
        </div>
        <div className="hidden lg:block" aria-hidden="true" />
      </div>

      <AnimatePresence>
        {isMobileNewsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`fixed inset-0 z-[130] md:hidden ${
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
              onClick={() => setIsMobileNewsOpen(false)}
              style={{
                top: "max(env(safe-area-inset-top), 1rem)",
                right: "1rem",
              }}
              className={`absolute z-20 p-2 rounded-full border transition-transform hover:rotate-90 ${
                isDayMode
                  ? "bg-slate-900 text-white border-slate-900 shadow-lg hover:bg-slate-700"
                  : "bg-white text-slate-900 border-white shadow-lg hover:bg-slate-100"
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
