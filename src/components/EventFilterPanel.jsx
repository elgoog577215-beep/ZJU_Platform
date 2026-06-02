import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GraduationCap, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import SortSelector from "./SortSelector";
import { useSettings } from "../context/SettingsContext";
import {
  EVENT_AUDIENCE_GROUPS,
  EVENT_CATEGORIES,
  getEventAudienceGroupLabel,
  getEventAudienceLabel,
  getEventCategoryLabel,
} from "../data/eventTaxonomy";

const EventFilterPanel = ({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  hideSort = false,
  mode = "default",
}) => {
  const { t, i18n } = useTranslation();
  const { uiMode } = useSettings();
  const language = i18n.resolvedLanguage || i18n.language || "zh";
  const isDayMode = uiMode === "day";
  const isSheetMode = mode === "sheet";
  const [audienceSearch, setAudienceSearch] = useState("");
  const [showAllAudiences, setShowAllAudiences] = useState(false);
  const [isAudienceOpen, setIsAudienceOpen] = useState(false);

  const selectedCategory = filters?.category || null;
  const selectedAudience = filters?.target_audience || null;
  const hasActiveFilters = Boolean(selectedCategory || selectedAudience);
  const sortExtraOptions = [
    { value: "date_asc", label: t("sort_filter.date_asc", "日期（最早）") },
    { value: "date_desc", label: t("sort_filter.date_desc", "日期（最晚）") },
  ];
  const allAudienceValue = "全校";

  const audienceQuery = audienceSearch.trim().toLowerCase();
  const totalAudienceCount = EVENT_AUDIENCE_GROUPS.reduce(
    (total, group) => total + group.items.length,
    0,
  );
  const visibleAudienceGroups = useMemo(() => {
    const query = audienceSearch.trim().toLowerCase();
    const sourceGroups =
      query || showAllAudiences
        ? EVENT_AUDIENCE_GROUPS
        : isSheetMode
          ? [
              {
                ...EVENT_AUDIENCE_GROUPS[0],
                items: EVENT_AUDIENCE_GROUPS[0].items.slice(0, 5),
              },
            ]
          : EVENT_AUDIENCE_GROUPS.slice(0, 1);

    if (!query) return sourceGroups;
    return sourceGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const rawLabel = item.toLowerCase();
          const displayLabel = getEventAudienceLabel(item, language).toLowerCase();
          return rawLabel.includes(query) || displayLabel.includes(query);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [audienceSearch, isSheetMode, language, showAllAudiences]);

  const setCategory = (value) => {
    onFiltersChange({
      ...filters,
      category: value || null,
    });
  };

  const setAudience = (value) => {
    const nextAudience =
      value === allAudienceValue || selectedAudience === value ? null : value;

    onFiltersChange({
      ...filters,
      target_audience: nextAudience,
    });
    if (!isSheetMode) setIsAudienceOpen(false);
  };

  const clearAll = () => {
    onFiltersChange({ category: null, target_audience: null });
    setAudienceSearch("");
    setShowAllAudiences(false);
    setIsAudienceOpen(false);
  };

  const handleSortChange = (nextSort) => {
    setIsAudienceOpen(false);
    onSortChange(nextSort);
  };

  const shellClass = isSheetMode ? "space-y-3" : "relative z-10 space-y-3";
  const glassClass = isDayMode
    ? "border-teal-900/[0.08] bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(232,245,242,0.58)_54%,rgba(238,247,255,0.56))] shadow-[0_14px_34px_rgba(15,118,110,0.055)]"
    : "border-white/[0.12] bg-[#070a14]/92 shadow-none";
  const subtleGlassClass = isDayMode
    ? "border-teal-900/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,248,245,0.78))] shadow-[0_12px_30px_rgba(15,118,110,0.055)]"
    : "border-white/[0.12] bg-[#080b14]/92 shadow-none";
  const mutedTextClass = isDayMode ? "text-slate-500" : "text-gray-400";
  const strongTextClass = isDayMode ? "text-slate-900" : "text-white";
  const nightControlClass =
    "border-white/[0.11] bg-[#101421]/62 text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-white/[0.18] hover:bg-[#171c2b]/74 hover:text-white";
  const nightControlActiveClass =
    "border-[#8b93ff]/45 bg-[#252849] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";
  const nightFocusClass = isDayMode
    ? "focus-visible:ring-indigo-400/70"
    : "focus-visible:border-white/[0.22] focus-visible:ring-slate-300/35 focus-visible:shadow-[0_0_0_4px_rgba(148,163,184,0.12)]";
  const activeLayoutId = `event-channel-active-${isSheetMode ? "sheet" : "desktop"}`;

  const channelButtonClass = (active) =>
    `rect-button relative h-10 shrink-0 px-4 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 ${nightFocusClass} ${
        active
          ? isDayMode
          ? "text-teal-900"
          : "text-indigo-100"
        : isDayMode
          ? "text-slate-500 hover:bg-white/70 hover:text-teal-900"
          : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
    }`;

  const renderActivePill = () => (
    <motion.span
      layoutId={activeLayoutId}
      className={`absolute inset-0 ${
        isDayMode
          ? "border border-teal-700/18 bg-[linear-gradient(135deg,rgba(232,245,242,0.98),rgba(238,247,255,0.76)_54%,rgba(250,253,251,0.86))] shadow-[0_10px_22px_rgba(15,118,110,0.09)]"
          : "border border-indigo-400/35 bg-indigo-500/20 shadow-none"
      }`}
      transition={{ type: "spring", bounce: 0.12, duration: 0.42 }}
    />
  );

  const isAudienceSelected = (audience) =>
    (!selectedAudience && audience === allAudienceValue) || selectedAudience === audience;
  const audienceLabel = (value) => getEventAudienceLabel(value, language);
  const categoryLabel = (value) => getEventCategoryLabel(value, language);
  const isCompactAudiencePreview =
    isSheetMode && !audienceQuery && !showAllAudiences;

  if (isSheetMode) {
    const sheetBorderClass = isDayMode
      ? "border-slate-200/80"
      : "border-white/10";
    const sheetSectionTitleClass = `text-sm font-black ${strongTextClass}`;
    const sheetHintClass = `mt-1 text-xs leading-5 ${mutedTextClass}`;
    const sheetCategoryClass = (active) =>
      `relative min-h-[44px] rounded-md px-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 ${nightFocusClass} ${
        active
            ? isDayMode
            ? "text-teal-900"
            : "text-indigo-100"
            : isDayMode
            ? "bg-white/70 text-slate-600"
            : "bg-white/[0.06] text-slate-300"
      }`;
    const sheetAudienceChipClass = (active) =>
      `min-h-[44px] rounded-md border px-3.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 ${nightFocusClass} ${
        active
            ? isDayMode
            ? "border-teal-700/18 bg-[linear-gradient(135deg,rgba(232,245,242,0.98),rgba(238,247,255,0.72))] text-teal-800 shadow-[0_10px_22px_rgba(15,118,110,0.08)]"
            : nightControlActiveClass
          : isDayMode
            ? "border-slate-200/80 bg-white/80 text-slate-600"
            : nightControlClass
      }`;

    return (
      <div className="space-y-5">
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className={sheetSectionTitleClass}>
                {t("events.filter.category_title", "活动类型")}
              </div>
              <p className={sheetHintClass}>
                {t("events.filter.category_hint", "先选类型，再按对象收窄结果。")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              aria-pressed={!selectedCategory}
              onClick={() => setCategory(null)}
              className={sheetCategoryClass(!selectedCategory)}
            >
              {!selectedCategory && renderActivePill()}
              <span className="relative z-10 whitespace-nowrap">
                {t("common.all", "全部")}
              </span>
            </button>

            {EVENT_CATEGORIES.map((category) => {
              const active = selectedCategory === category.value;
              return (
                <button
                  key={category.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(category.value)}
                  className={sheetCategoryClass(active)}
                >
                  {active && renderActivePill()}
                  <span className="relative z-10 whitespace-nowrap">
                    {categoryLabel(category.value)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`space-y-3 border-t pt-5 ${sheetBorderClass}`}>
          <div className="flex items-center justify-end gap-3">
            {selectedAudience && (
              <button
                type="button"
                onClick={() => setAudience(selectedAudience)}
                className={`min-h-[44px] rounded-md border px-3.5 text-xs font-bold ${isDayMode ? "border-teal-700/18 bg-teal-50 text-teal-700" : nightControlActiveClass}`}
              >
                {t("common.cancel", "取消")}
              </button>
            )}
            {!selectedAudience && !audienceQuery && (
              <button
                type="button"
                aria-expanded={showAllAudiences}
                onClick={() => setShowAllAudiences((value) => !value)}
                className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1 rounded-md px-3.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 ${nightFocusClass} ${isDayMode ? "bg-white/78 text-slate-600" : "bg-white/[0.06] text-slate-300"}`}
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showAllAudiences ? "rotate-180" : ""}`}
                />
                {showAllAudiences
                  ? t("common.show_less", "收起")
                  : `${t("common.all", "全部")} ${totalAudienceCount}`}
              </button>
            )}
          </div>

          <label className="relative block">
            <Search
              size={18}
              className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${isDayMode ? "text-slate-400" : "text-gray-500"}`}
            />
            <input
              value={audienceSearch}
              onChange={(event) => setAudienceSearch(event.target.value)}
              aria-label={t("events.filter.search_audience", "搜索学院或学园")}
              className={`h-12 w-full rounded-lg border pl-11 pr-12 text-base outline-none transition-colors focus-visible:ring-2 ${nightFocusClass} ${isDayMode ? "border-slate-200/80 bg-white/90 text-slate-800 placeholder:text-slate-400" : "border-white/[0.11] bg-[#171a26] text-white placeholder:text-slate-500"}`}
              placeholder={t("events.filter.search_audience_placeholder", "搜索学院 / 学园")}
            />
            {audienceSearch && (
              <button
                type="button"
                aria-label={t("common.clear", "清除")}
                onClick={() => setAudienceSearch("")}
                className={`absolute right-1 top-1/2 inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-md ${isDayMode ? "text-slate-400 hover:bg-slate-100 hover:text-slate-700" : "text-slate-500 hover:bg-white/[0.07] hover:text-white"}`}
              >
                <X size={16} />
              </button>
            )}
          </label>

          <div className={isCompactAudiencePreview ? "space-y-2" : "space-y-4"}>
            {visibleAudienceGroups.map((group) => (
              <div key={group.group}>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((audience) => {
                    const selected = isAudienceSelected(audience);
                    return (
                      <button
                        key={audience}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setAudience(audience)}
                        className={sheetAudienceChipClass(selected)}
                      >
                        {audienceLabel(audience)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {visibleAudienceGroups.length === 0 && (
              <div
              className={`border px-4 py-8 text-center text-sm ${isDayMode ? "border-slate-200/80 bg-white/80 text-slate-500" : "border-white/[0.11] bg-[#171a26] text-slate-400"}`}
              >
                {t("events.filter.no_audience_matches", "没有匹配的学院或学园")}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div
        className={`relative overflow-visible border p-2 ${glassClass}`}
      >
        <div
          className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${isDayMode ? "via-white/80" : "via-white/18"}`}
        />
        <div
              className={`pointer-events-none absolute inset-y-3 left-3 w-px ${isDayMode ? "bg-gradient-to-b from-violet-200/20 via-fuchsia-200/50 to-sky-200/20" : "bg-indigo-400/20"}`}
        />

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div
          className={`relative min-w-0 overflow-hidden border lg:flex-1 lg:max-w-[690px] xl:max-w-[760px] ${isDayMode ? "border-violet-100/80 bg-white/66" : "border-white/[0.09] bg-[#050712]/88"}`}
          >
            <div className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto p-1 pr-10 md:pr-1">
              <button
                type="button"
                aria-pressed={!selectedCategory}
                onClick={() => setCategory(null)}
                className={channelButtonClass(!selectedCategory)}
              >
                {!selectedCategory && renderActivePill()}
                <span className="relative z-10 whitespace-nowrap">
                  {t("common.all", "全部")}
                </span>
              </button>

              {EVENT_CATEGORIES.map((category) => {
                const active = selectedCategory === category.value;
                return (
                  <button
                    key={category.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(category.value)}
                    className={channelButtonClass(active)}
                  >
                    {active && renderActivePill()}
                    <span className="relative z-10 whitespace-nowrap">
                      {categoryLabel(category.value)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              className={`pointer-events-none absolute inset-y-1 right-1 w-10 ${isDayMode ? "bg-gradient-to-l from-white via-white/88 to-transparent" : "bg-gradient-to-l from-[#0a0d14] via-[#0a0d14]/88 to-transparent"}`}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            <button
              type="button"
              aria-expanded={isAudienceOpen}
              onClick={() => setIsAudienceOpen((value) => !value)}
              className={`rect-button-secondary inline-flex min-h-[44px] items-center justify-between gap-2 px-4 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 ${nightFocusClass} sm:min-w-[184px] ${isDayMode ? "text-slate-700 hover:border-violet-200 hover:text-violet-900" : nightControlClass}`}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <GraduationCap
                  size={16}
                  className={isDayMode ? "text-violet-600" : "text-[#aab0ff]"}
                />
                <span className="truncate">
                  {t("events.filter.audience_prefix", "面向：")}
                  {audienceLabel(selectedAudience || allAudienceValue)}
                </span>
              </span>
              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform ${isAudienceOpen ? "rotate-180" : ""}`}
              />
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAll}
                className={`rect-button-secondary inline-flex min-h-[44px] items-center justify-center gap-1.5 px-3 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 ${nightFocusClass} ${isDayMode ? "text-slate-500 hover:border-rose-200 hover:text-rose-600" : nightControlClass}`}
              >
                <X size={13} />
                {t("common.clear_all", "重置")}
              </button>
            )}

            {!hideSort && (
              <div
                className="sm:w-44"
                onMouseDownCapture={() => setIsAudienceOpen(false)}
              >
                <SortSelector
                  sort={sort}
                  onSortChange={handleSortChange}
                  className="w-full"
                  buttonClassName={
                    isDayMode
                      ? "rect-button-secondary bg-white/76 hover:bg-white hover:border-violet-200 w-full py-3 text-slate-700 transition-all hover:text-violet-900"
                      : `rect-button-secondary ${nightControlClass} w-full py-3 transition-all`
                  }
                  extraOptions={sortExtraOptions}
                  renderMode={isSheetMode ? "list" : "dropdown"}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isAudienceOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className={`border p-3 ${subtleGlassClass}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div
                  className={`text-xs font-bold ${isDayMode ? "text-slate-700" : "text-slate-200"}`}
                >
                  {t("events.filter.audience_title", "面向对象")}
                </div>
                <p
                  className={`mt-0.5 text-xs ${isDayMode ? "text-slate-500" : "text-slate-500"}`}
                >
                  {t("events.filter.audience_hint", "选择学院、学园或保持全校")}
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search
                  size={15}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDayMode ? "text-slate-400" : "text-gray-500"}`}
                />
                <input
                  value={audienceSearch}
                  onChange={(event) => setAudienceSearch(event.target.value)}
                  className={`rect-field h-11 w-full pl-9 pr-3 text-sm outline-none transition-all focus-visible:ring-2 ${nightFocusClass} ${isDayMode ? "text-slate-700 placeholder:text-slate-400 hover:bg-white" : "text-white placeholder:text-slate-500"}`}
                  placeholder={t("events.filter.search_audience_placeholder", "搜索学院/学园")}
                />
              </div>
            </div>

            {selectedAudience && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAudience(selectedAudience)}
                  className={`rect-chip inline-flex min-h-[32px] items-center gap-1.5 px-3 text-xs font-bold ${isDayMode ? "border-violet-200 bg-violet-50 text-violet-700" : nightControlActiveClass}`}
                >
                  {audienceLabel(selectedAudience)}
                  <X size={12} />
                </button>
              </div>
            )}

            <div
              className={`${showAllAudiences || audienceQuery ? "mt-3 max-h-[18rem] overflow-y-auto pr-1 custom-scrollbar" : "mt-3"}`}
            >
              <div className="space-y-4">
                {visibleAudienceGroups.map((group) => (
                  <div key={group.group}>
                    {(showAllAudiences || audienceQuery) && (
                      <div className={`mb-2 text-[11px] font-black uppercase tracking-[0.16em] ${mutedTextClass}`}>
                        {getEventAudienceGroupLabel(group.group, language)}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((audience) => {
                        const selected = selectedAudience === audience;
                        return (
                          <button
                            key={audience}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setAudience(audience)}
                            className={`rect-button min-h-[38px] border px-3 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 ${nightFocusClass} ${
                              selected
                                ? isDayMode
                                    ? "border-violet-200 bg-[linear-gradient(135deg,rgba(245,243,255,0.94),rgba(253,242,248,0.72))] text-violet-800 shadow-none"
                                    : nightControlActiveClass
                                : isDayMode
                                  ? "border-slate-200/80 bg-white/72 text-slate-600 shadow-none hover:border-violet-200 hover:bg-white hover:text-violet-900"
                                  : nightControlClass
                            }`}
                          >
                            {audienceLabel(audience)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {visibleAudienceGroups.length === 0 && (
                  <div
                    className={`border px-4 py-6 text-center text-sm ${isDayMode ? "border-slate-200/80 bg-white/70 text-slate-500" : "border-white/[0.11] bg-[#171a26] text-slate-400"}`}
                  >
                    {t("events.filter.no_audience_matches", "没有匹配的学院或学园")}
                  </div>
                )}
              </div>
            </div>

            {!audienceQuery && (
              <button
                type="button"
                onClick={() => setShowAllAudiences((value) => !value)}
                className={`rect-button-secondary mt-3 inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 px-3 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 ${nightFocusClass} ${isDayMode ? "text-slate-600 hover:border-violet-200 hover:text-violet-900" : nightControlClass}`}
              >
                <ChevronDown
                  size={14}
                  className={
                    showAllAudiences
                      ? "rotate-180 transition-transform"
                      : "transition-transform"
                  }
                />
                {showAllAudiences
                  ? t("events.filter.collapse_common_audiences", "收起到常用对象")
                  : t("events.filter.expand_all_audiences", "展开全部学院/学园（{{count}}）", { count: totalAudienceCount })}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventFilterPanel;
