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
    <section className="relative z-10 min-h-screen overflow-visible px-4 pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+96px)] md:overflow-hidden md:px-8 md:py-24">
      <SEO title={t("nav.community", "AI社区")} description={subtitle} />

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] h-[60%] w-[60%] rounded-full bg-orange-500/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-red-500/10 blur-[120px]" />
      </div>

      <div className="fixed left-4 top-24 z-20 hidden w-[300px] xl:left-8 xl:w-[320px] lg:block">
        <CommunityNewsRail />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1760px] lg:grid lg:grid-cols-[300px_minmax(0,1fr)_300px] lg:gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px] xl:gap-12">
        <div className="hidden lg:block" aria-hidden="true" />
        <div className="mx-auto w-full min-w-0 max-w-[1040px]">
          <div className="mb-5 hidden text-center md:mb-7 md:block">
            <h1
              className={`mb-4 text-4xl font-bold font-serif md:text-5xl ${
                isDayMode ? "text-slate-900" : "text-white"
              }`}
            >
              {t("nav.community", "AI社区")}
            </h1>
            <p
              className={`mx-auto max-w-3xl text-sm md:text-base ${
                isDayMode ? "text-slate-500" : "text-gray-400"
              }`}
            >
              {subtitle}
            </p>
          </div>

          <div className="-mx-1 mb-4 px-1 md:mx-0 md:mb-5 md:px-0">
            <div
              className={`space-y-2 rounded-[24px] border p-2 backdrop-blur-xl ${
                isDayMode
                  ? "border-slate-200/80 bg-white/88 shadow-[0_14px_32px_rgba(148,163,184,0.12)]"
                  : "border-white/10 bg-[#16151f]/74 shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
              }`}
            >
              <div className="md:hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileNewsOpen(true)}
                  className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold ${
                    isDayMode
                      ? "border-slate-200 bg-slate-50 text-slate-700"
                      : "border-white/10 bg-white/[0.04] text-gray-200"
                  }`}
                >
                  <Newspaper size={16} />
                  {t("community.news_board", "新闻热榜")}
                </button>
              </div>

              <div
                className={`flex items-center gap-2 overflow-x-auto rounded-[20px] p-1 ${
                  isDayMode ? "bg-slate-50/90" : "bg-black/15"
                }`}
              >
                {TABS.map(({ key, icon: Icon, labelKey, fallback }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTabChange(key)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                      activeTab === key
                        ? isDayMode
                          ? "bg-orange-500 text-white shadow-[0_12px_28px_rgba(249,115,22,0.3)]"
                          : "bg-orange-500 text-black"
                        : isDayMode
                          ? "text-slate-600 hover:bg-white"
                          : "text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{t(labelKey, fallback)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {user?.role === "admin" && metricsSummary ? (
            <div
              className={`mb-5 rounded-[24px] border p-4 ${
                isDayMode
                  ? "border-slate-200/80 bg-white/82"
                  : "border-white/10 bg-[#1a1a1a]/40"
              }`}
            >
              <p
                className={`mb-3 text-xs uppercase tracking-[0.2em] ${
                  isDayMode ? "text-slate-500" : "text-gray-400"
                }`}
              >
                {t("community.metrics_14d", "社区转化指标（近14天）")}
              </p>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                <div
                  className={`rounded-xl border p-3 ${
                    isDayMode
                      ? "border-slate-200 bg-slate-50"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <p
                    className={`text-[11px] ${
                      isDayMode ? "text-slate-500" : "text-gray-400"
                    }`}
                  >
                    文章阅读
                  </p>
                  <p
                    className={`mt-1 text-xl font-black ${
                      isDayMode ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {metricsSummary.article_view || 0}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-3 ${
                    isDayMode
                      ? "border-slate-200 bg-slate-50"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <p
                    className={`text-[11px] ${
                      isDayMode ? "text-slate-500" : "text-gray-400"
                    }`}
                  >
                    文章分享
                  </p>
                  <p
                    className={`mt-1 text-xl font-black ${
                      isDayMode ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {metricsSummary.article_share || 0}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-3 ${
                    isDayMode
                      ? "border-slate-200 bg-slate-50"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <p
                    className={`text-[11px] ${
                      isDayMode ? "text-slate-500" : "text-gray-400"
                    }`}
                  >
                    新闻到文章
                  </p>
                  <p
                    className={`mt-1 text-xl font-black ${
                      isDayMode ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {metricsSummary.news_to_article_click || 0}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-3 ${
                    isDayMode
                      ? "border-slate-200 bg-slate-50"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <p
                    className={`text-[11px] ${
                      isDayMode ? "text-slate-500" : "text-gray-400"
                    }`}
                  >
                    文章到社群
                  </p>
                  <p
                    className={`mt-1 text-xl font-black ${
                      isDayMode ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {metricsSummary.article_to_group_click || 0}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className={`rounded-[24px] border p-2.5 md:p-4 ${
              isDayMode
                ? "border-slate-200/80 bg-white/82"
                : "border-white/10 bg-[#1a1a1a]/40"
            }`}
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
              className={`absolute z-20 rounded-full border p-2 transition-transform hover:rotate-90 ${
                isDayMode
                  ? "border-slate-900 bg-slate-900 text-white shadow-lg hover:bg-slate-700"
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
