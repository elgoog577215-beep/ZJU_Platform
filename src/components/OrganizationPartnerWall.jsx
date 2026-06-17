import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Calendar, ExternalLink, Loader2, Search, Users, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import api from "../services/api";
import { getPartnerLogoSrc, getPartnerProfilePath } from "../data/partnerLogos";

const DESKTOP_PREVIEW_LIMIT = 10;
const MOBILE_PREVIEW_LIMIT = 8;

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return text.split(/[\n,]/);
    }
  }
  return [];
};

const uniqueTerms = (items) => {
  const seen = new Set();
  const terms = [];
  for (const item of items) {
    const term = String(item || "").trim();
    if (!term || seen.has(term)) continue;
    seen.add(term);
    terms.push(term);
  }
  return terms;
};

export const getPartnerEventTerms = (partner = {}) =>
  uniqueTerms([
    ...toArray(partner.event_organizer_aliases),
    partner.name,
    partner.name_en,
  ]).slice(0, 20);

export const getLocalizedPartnerName = (partner = {}, language = "zh") => {
  if (String(language || "").startsWith("en") && partner.name_en) {
    return partner.name_en;
  }
  return partner.name || partner.name_en || "";
};

const getLocalizedPartnerText = (partner = {}, baseKey, language = "zh") => {
  const englishKey = `${baseKey}_en`;
  if (String(language || "").startsWith("en") && partner[englishKey]) {
    return partner[englishKey];
  }
  return partner[baseKey] || partner[englishKey] || "";
};

const getFallbackMark = (name) => {
  const compact = String(name || "").replace(/\s+/g, "");
  return compact.slice(0, compact.length > 1 && /[\u4e00-\u9fff]/.test(compact) ? 2 : 3).toUpperCase();
};

const PartnerLogo = ({ partner, name, isDayMode, size = "md" }) => {
  const logoSrc = getPartnerLogoSrc(partner, isDayMode);
  const sizeClass = size === "sm" ? "h-9 w-9 text-[11px]" : "h-12 w-12 text-xs";
  if (logoSrc) {
    return (
      <span
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-[6px] border px-1 ${
          isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/6"
        }`}
      >
        <img
          src={logoSrc}
          alt={`${name} logo`}
          className="max-h-[70%] max-w-full object-contain"
          loading="lazy"
        />
      </span>
    );
  }

  return (
    <span
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-[6px] border font-black ${
        isDayMode
          ? "border-violet-100 bg-violet-50 text-violet-700"
          : "border-indigo-400/20 bg-indigo-500/12 text-indigo-100"
      }`}
    >
      {getFallbackMark(name)}
    </span>
  );
};

const formatDate = (value) => {
  if (!value) return "";
  return String(value).replace("T", " ").slice(0, 16);
};

const OrganizationPartnerWall = ({
  partners = [],
  isDayMode,
  className = "",
  onApplyPartnerFilter,
  onOpenEvent,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = i18n.resolvedLanguage || i18n.language || "zh";
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [directorySearch, setDirectorySearch] = useState("");
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const visiblePartners = useMemo(
    () =>
      partners
        .filter((partner) => partner?.enabled !== false && partner?.featured !== false),
    [partners],
  );
  const desktopPreviewPartners = useMemo(
    () => visiblePartners.slice(0, DESKTOP_PREVIEW_LIMIT),
    [visiblePartners],
  );
  const mobilePreviewPartners = useMemo(
    () => visiblePartners.slice(0, MOBILE_PREVIEW_LIMIT),
    [visiblePartners],
  );
  const directoryPartners = useMemo(() => {
    const keyword = directorySearch.trim().toLowerCase();
    if (!keyword) return visiblePartners;
    return visiblePartners.filter((partner) =>
      [
        partner.name,
        partner.name_en,
        partner.description,
        partner.description_en,
        partner.cooperation_direction,
        partner.cooperation_direction_en,
        ...toArray(partner.event_organizer_aliases),
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(keyword)),
    );
  }, [directorySearch, visiblePartners]);
  const hasMorePartners = visiblePartners.length > desktopPreviewPartners.length;

  const selectedName = selectedPartner
    ? getLocalizedPartnerName(selectedPartner, language)
    : "";
  const selectedTerms = useMemo(
    () => (selectedPartner ? getPartnerEventTerms(selectedPartner) : []),
    [selectedPartner],
  );

  useEffect(() => {
    if (!selectedPartner || selectedTerms.length === 0) {
      setRelatedEvents([]);
      return undefined;
    }

    let cancelled = false;
    setRelatedLoading(true);
    api
      .get("/events", {
        params: {
          limit: 3,
          status: "approved",
          sort: "date_desc",
          organizer_any: selectedTerms.join(","),
        },
        silent: true,
      })
      .then((response) => {
        if (cancelled) return;
        setRelatedEvents(Array.isArray(response.data?.data) ? response.data.data : []);
      })
      .catch(() => {
        if (!cancelled) setRelatedEvents([]);
      })
      .finally(() => {
        if (!cancelled) setRelatedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPartner, selectedTerms]);

  useEffect(() => {
    if ((!selectedPartner && !directoryOpen) || typeof document === "undefined") return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [directoryOpen, selectedPartner]);

  if (visiblePartners.length === 0) return null;

  const mutedClass = isDayMode ? "text-slate-500" : "text-slate-400";
  const strongClass = isDayMode ? "text-slate-950" : "text-white";
  const railClass = isDayMode
    ? "border-slate-200/70 bg-white/46"
    : "border-white/10 bg-white/[0.025]";
  const chipClass = isDayMode
    ? "border-slate-200/80 bg-white/72 text-slate-800 hover:border-violet-200 hover:bg-white"
    : "border-white/10 bg-white/[0.04] text-slate-100 hover:border-indigo-300/30 hover:bg-white/[0.07]";

  const applySelectedPartner = () => {
    if (!selectedPartner || selectedTerms.length === 0) return;
    onApplyPartnerFilter?.({
      id: selectedPartner.id,
      name: selectedName,
      terms: selectedTerms,
    });
    setSelectedPartner(null);
  };
  const openPartnerProfile = (partner) => {
    const profilePath = getPartnerProfilePath(partner);
    if (profilePath) {
      setDirectoryOpen(false);
      setSelectedPartner(null);
      navigate(profilePath);
      return;
    }
    setSelectedPartner(partner);
  };

  return (
    <>
      <section
        className={`${className} relative z-20`}
        aria-label={t("events.organizations.aria", "合作社团")}
        data-testid="organization-partner-wall"
      >
        <div className={`flex items-center gap-3 overflow-hidden border-y px-0 py-2 ${railClass}`}>
          <div className="flex shrink-0 items-center gap-2 pl-1 md:pl-3">
            <Users size={14} className={isDayMode ? "text-violet-700" : "text-indigo-200"} />
            <div className="leading-none">
              <div className={`text-xs font-black ${strongClass}`}>
                {t("events.organizations.kicker", "合作社团")}
              </div>
              <div className={`mt-1 text-[11px] font-semibold ${mutedClass}`}>
                {t("events.organizations.count", "{{count}} 个", {
                  count: visiblePartners.length,
                })}
              </div>
            </div>
          </div>

          <div className="scrollbar-none flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-0.5">
            {mobilePreviewPartners.map((partner) => {
              const name = getLocalizedPartnerName(partner, language);
              return (
                <button
                  key={partner.id}
                  type="button"
                  data-testid={`organization-partner-card-mobile-${partner.id}`}
                  onClick={() => openPartnerProfile(partner)}
                  className={`flex min-w-[8.5rem] items-center gap-2 rounded-[6px] border px-2 py-1.5 text-left md:hidden ${chipClass}`}
                >
                  <PartnerLogo partner={partner} name={name} isDayMode={isDayMode} size="sm" />
                  <span className={`line-clamp-2 text-xs font-bold leading-4 ${strongClass}`}>{name}</span>
                </button>
              );
            })}
            {visiblePartners.length > mobilePreviewPartners.length ? (
              <button
                type="button"
                onClick={() => setDirectoryOpen(true)}
                className={`flex min-w-[6rem] items-center justify-center gap-2 rounded-[6px] border px-3 py-1.5 text-xs font-black md:hidden ${
                  isDayMode
                    ? "border-slate-200 bg-white text-slate-700"
                    : "border-white/10 bg-white/[0.04] text-slate-200"
                }`}
              >
                <Search size={14} />
                {t("events.organizations.view_directory", "全部")}
              </button>
            ) : null}

            {desktopPreviewPartners.map((partner) => {
              const name = getLocalizedPartnerName(partner, language);
              const direction = getLocalizedPartnerText(partner, "cooperation_direction", language);
              return (
                <button
                  key={partner.id}
                  type="button"
                  data-testid={`organization-partner-card-desktop-${partner.id}`}
                  onClick={() => openPartnerProfile(partner)}
                  className={`hidden min-w-[10rem] items-center gap-2 rounded-[6px] border px-2.5 py-1.5 text-left transition-colors md:flex ${chipClass}`}
                >
                  <PartnerLogo partner={partner} name={name} isDayMode={isDayMode} size="sm" />
                  <div className="min-w-0">
                    <div className={`truncate text-xs font-black leading-4 ${strongClass}`}>{name}</div>
                    {direction ? (
                      <div className={`mt-0.5 truncate text-[11px] font-semibold ${isDayMode ? "text-violet-700" : "text-indigo-200"}`}>
                        {direction}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
            {hasMorePartners ? (
              <button
                type="button"
                onClick={() => setDirectoryOpen(true)}
                className={`hidden min-w-[6.5rem] items-center justify-center gap-2 rounded-[6px] border px-3 py-1.5 text-xs font-black md:flex ${
                  isDayMode
                    ? "border-slate-200 bg-white text-slate-700 hover:border-violet-200"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
                }`}
              >
                <Search size={14} />
                {t("events.organizations.view_directory", "查看全部")}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {directoryOpen && (
                <motion.div
                  className={`fixed inset-0 z-[110] flex items-end justify-center px-3 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] md:items-center md:p-6 ${
                    isDayMode ? "bg-white/70" : "bg-black/70"
                  } backdrop-blur-sm`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDirectoryOpen(false)}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={t("events.organizations.directory_title", "全部合作社团")}
                    data-testid="organization-partner-directory"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 18 }}
                    transition={{ type: "spring", damping: 28, stiffness: 320 }}
                    onClick={(event) => event.stopPropagation()}
                    className={`max-h-[86dvh] w-full max-w-5xl overflow-hidden rounded-[8px] border ${
                      isDayMode
                        ? "border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
                        : "border-white/10 bg-[#0b0d16] text-white shadow-[0_24px_70px_rgba(0,0,0,0.42)]"
                    }`}
                  >
                    <div className={`flex items-start justify-between gap-3 border-b p-4 md:p-5 ${isDayMode ? "border-slate-200" : "border-white/10"}`}>
                      <div className="min-w-0">
                        <div className={`text-xs font-black uppercase tracking-[0.2em] ${mutedClass}`}>
                          {t("events.organizations.kicker", "Campus Partners")}
                        </div>
                        <h3 className={`mt-1 text-xl font-black leading-tight md:text-2xl ${strongClass}`}>
                          {t("events.organizations.directory_title", "全部合作社团")}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDirectoryOpen(false)}
                        aria-label={t("common.close", "关闭")}
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] ${
                          isDayMode ? "bg-slate-100 text-slate-500 hover:text-slate-950" : "bg-white/10 text-slate-300 hover:text-white"
                        }`}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-4 md:p-5">
                      <label className={`relative block ${mutedClass}`}>
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={16} />
                        <input
                          value={directorySearch}
                          onChange={(event) => setDirectorySearch(event.target.value)}
                          placeholder={t("events.organizations.search_placeholder", "搜索社团、简介或合作方向")}
                          className={`h-11 w-full rounded-[6px] border pl-9 pr-3 text-sm font-semibold outline-none ${
                            isDayMode
                              ? "border-slate-200 bg-slate-50 text-slate-900 focus:border-violet-300"
                              : "border-white/10 bg-white/[0.04] text-white focus:border-indigo-300/40"
                          }`}
                        />
                      </label>

                      <div className="mt-4 max-h-[calc(86dvh-190px)] overflow-y-auto pr-1">
                        {directoryPartners.length > 0 ? (
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {directoryPartners.map((partner) => {
                              const name = getLocalizedPartnerName(partner, language);
                              const description = getLocalizedPartnerText(partner, "description", language);
                              const direction = getLocalizedPartnerText(partner, "cooperation_direction", language);
                              return (
                                <button
                                  key={partner.id}
                                  type="button"
                                  onClick={() => openPartnerProfile(partner)}
                                  className={`rounded-[6px] border p-3 text-left ${
                                    isDayMode
                                      ? "border-slate-200 bg-white hover:border-violet-200"
                                      : "border-white/10 bg-white/[0.04] hover:border-indigo-300/30"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <PartnerLogo partner={partner} name={name} isDayMode={isDayMode} size="sm" />
                                    <div className="min-w-0">
                                      <div className={`line-clamp-2 text-sm font-black leading-5 ${strongClass}`}>{name}</div>
                                      {direction ? (
                                        <div className={`mt-1 line-clamp-1 text-[11px] font-semibold ${isDayMode ? "text-violet-700" : "text-indigo-200"}`}>
                                          {direction}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                  {description ? (
                                    <p className={`mt-2 line-clamp-2 text-xs leading-5 ${mutedClass}`}>{description}</p>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className={`rounded-[6px] border border-dashed px-3 py-10 text-center text-sm ${isDayMode ? "border-slate-200 text-slate-500" : "border-white/10 text-slate-400"}`}>
                            {t("events.organizations.no_matches", "没有匹配的社团")}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {selectedPartner && (
                <motion.div
                  className={`fixed inset-0 z-[110] flex items-end justify-center px-3 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] md:items-center md:p-6 ${
                    isDayMode ? "bg-white/70" : "bg-black/70"
                  } backdrop-blur-sm`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedPartner(null)}
                >
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={selectedName}
                    data-testid="organization-partner-modal"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 18 }}
                    transition={{ type: "spring", damping: 28, stiffness: 320 }}
                    onClick={(event) => event.stopPropagation()}
                    className={`max-h-[86dvh] w-full max-w-3xl overflow-hidden rounded-[8px] border ${
                      isDayMode
                        ? "border-slate-200 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
                        : "border-white/10 bg-[#0b0d16] text-white shadow-[0_24px_70px_rgba(0,0,0,0.42)]"
                    }`}
                  >
                    <div className={`flex items-start justify-between gap-3 border-b p-4 md:p-5 ${isDayMode ? "border-slate-200" : "border-white/10"}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        <PartnerLogo partner={selectedPartner} name={selectedName} isDayMode={isDayMode} />
                        <div className="min-w-0">
                          <div className={`text-xs font-black uppercase tracking-[0.2em] ${mutedClass}`}>
                            {t("events.organizations.detail_label", "Partner Detail")}
                          </div>
                          <h3 className={`mt-1 text-xl font-black leading-tight md:text-2xl ${strongClass}`}>
                            {selectedName}
                          </h3>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPartner(null)}
                        aria-label={t("common.close", "关闭")}
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] ${
                          isDayMode ? "bg-slate-100 text-slate-500 hover:text-slate-950" : "bg-white/10 text-slate-300 hover:text-white"
                        }`}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="max-h-[calc(86dvh-88px)] overflow-y-auto p-4 md:p-5">
                      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
                        <div className="space-y-4">
                          <section>
                            <div className={`mb-2 text-xs font-black uppercase tracking-[0.18em] ${mutedClass}`}>
                              {t("common.description", "简介")}
                            </div>
                            <p className={`text-sm leading-7 ${isDayMode ? "text-slate-600" : "text-slate-300"}`}>
                              {getLocalizedPartnerText(selectedPartner, "description", language) ||
                                t("events.organizations.no_description", "暂无简介，后台可继续补充。")}
                            </p>
                          </section>

                          <section>
                            <div className={`mb-2 text-xs font-black uppercase tracking-[0.18em] ${mutedClass}`}>
                              {t("events.organizations.direction", "合作方向")}
                            </div>
                            <p className={`text-sm leading-7 ${isDayMode ? "text-violet-700" : "text-indigo-200"}`}>
                              {getLocalizedPartnerText(selectedPartner, "cooperation_direction", language) ||
                                t("events.organizations.no_direction", "活动协作 / 信息触达")}
                            </p>
                          </section>

                          <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          data-testid="organization-partner-view-all"
                          onClick={applySelectedPartner}
                              className={`inline-flex min-h-11 items-center gap-2 rounded-[6px] px-4 text-sm font-black ${
                                isDayMode
                                  ? "bg-violet-700 text-white hover:bg-violet-800"
                                  : "bg-indigo-500 text-white hover:bg-indigo-400"
                              }`}
                            >
                              <Search size={16} />
                              {t("events.organizations.view_all", "查看相关活动")}
                            </button>
                            {getPartnerProfilePath(selectedPartner) ? (
                            <Link
                              to={getPartnerProfilePath(selectedPartner)}
                              onClick={() => setSelectedPartner(null)}
                              className={`inline-flex min-h-11 items-center gap-2 rounded-[6px] border px-4 text-sm font-bold ${
                                isDayMode
                                  ? "border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300 hover:bg-white"
                                  : "border-indigo-400/30 bg-indigo-400/10 text-indigo-100 hover:border-indigo-300/50"
                              }`}
                            >
                              {t("events.organizations.profile", "主体主页")}
                              <ArrowRight size={15} />
                            </Link>
                            ) : null}
                            {selectedPartner.link_url ? (
                              <a
                                href={selectedPartner.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex min-h-11 items-center gap-2 rounded-[6px] border px-4 text-sm font-bold ${
                                  isDayMode
                                    ? "border-slate-200 bg-white text-slate-700 hover:border-violet-200"
                                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
                                }`}
                              >
                                {t("events.organizations.homepage", "社团信息")}
                                <ExternalLink size={15} />
                              </a>
                            ) : null}
                          </div>
                        </div>

                        <aside className={`rounded-[6px] border p-3 ${isDayMode ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-white/[0.04]"}`}>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] ${mutedClass}`}>
                              <Users size={14} />
                              {t("events.organizations.related", "相关活动")}
                            </div>
                            {relatedLoading ? <Loader2 size={15} className="animate-spin" /> : null}
                          </div>
                          <div className="space-y-2">
                            {relatedLoading && relatedEvents.length === 0 ? (
                              <div className={`py-5 text-center text-sm ${mutedClass}`}>
                                {t("events.organizations.loading_related", "正在加载相关活动...")}
                              </div>
                            ) : relatedEvents.length > 0 ? (
                              relatedEvents.map((event) => (
                                <button
                                  key={event.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPartner(null);
                                    onOpenEvent?.(event);
                                  }}
                                  className={`w-full rounded-[6px] border p-3 text-left transition-colors ${
                                    isDayMode
                                      ? "border-slate-200 bg-white hover:border-violet-200"
                                      : "border-white/10 bg-[#0b0d16] hover:border-indigo-300/30"
                                  }`}
                                >
                                  <div className={`line-clamp-2 text-sm font-bold leading-5 ${strongClass}`}>{event.title}</div>
                                  <div className={`mt-2 flex items-center gap-1.5 text-xs ${mutedClass}`}>
                                    <Calendar size={13} />
                                    <span>{formatDate(event.date)}</span>
                                    <ArrowRight size={13} className="ml-auto" />
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className={`rounded-[6px] border border-dashed px-3 py-5 text-center text-sm ${isDayMode ? "border-slate-200 text-slate-500" : "border-white/10 text-slate-400"}`}>
                                {t("events.organizations.no_related", "暂无匹配活动，可查看全部相关结果。")}
                              </div>
                            )}
                          </div>
                        </aside>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
};

export default OrganizationPartnerWall;
