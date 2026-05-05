import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GraduationCap, Search, X } from "lucide-react";
import SortSelector from "./SortSelector";
import { useSettings } from "../context/SettingsContext";
import { EVENT_AUDIENCE_GROUPS, EVENT_CATEGORIES } from "../data/eventTaxonomy";

const EventFilterPanel = ({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  hideSort = false,
  mode = "default",
}) => {
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const isSheetMode = mode === "sheet";
  const [audienceSearch, setAudienceSearch] = useState("");
  const [showAllAudiences, setShowAllAudiences] = useState(false);
  const [isAudienceOpen, setIsAudienceOpen] = useState(false);

  const selectedCategory = filters?.category || null;
  const selectedAudience = filters?.target_audience || null;
  const hasActiveFilters = Boolean(selectedCategory || selectedAudience);
  const sortExtraOptions = [
    { value: "date_asc", label: "日期（最早）" },
    { value: "date_desc", label: "日期（最晚）" },
  ];

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
        items: group.items.filter((item) => item.toLowerCase().includes(query)),
      }))
      .filter((group) => group.items.length > 0);
  }, [audienceSearch, isSheetMode, showAllAudiences]);

  const setCategory = (value) => {
    onFiltersChange({
      ...filters,
      category: value || null,
    });
  };

  const setAudience = (value) => {
    const nextAudience =
      value === "全校" || selectedAudience === value ? null : value;

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

  const shellClass = isSheetMode ? "space-y-3" : "relative z-10 space-y-3";
  const glassClass = isDayMode
    ? "border-slate-200/80 bg-white/78 shadow-[0_18px_48px_rgba(148,163,184,0.16)]"
    : "border-white/10 bg-white/[0.065] shadow-[0_18px_52px_rgba(0,0,0,0.28)]";
  const subtleGlassClass = isDayMode
    ? "border-slate-200/80 bg-slate-50/84"
    : "border-white/10 bg-black/20";
  const mutedTextClass = isDayMode ? "text-slate-500" : "text-gray-400";
  const strongTextClass = isDayMode ? "text-slate-900" : "text-white";
  const activeLayoutId = `event-channel-active-${isSheetMode ? "sheet" : "desktop"}`;

  const channelButtonClass = (active) =>
    `relative h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
      active
        ? isDayMode
          ? "text-white"
          : "text-black"
        : isDayMode
          ? "text-slate-600 hover:text-slate-900"
          : "text-gray-300 hover:text-white"
    }`;

  const renderActivePill = () => (
    <motion.span
      layoutId={activeLayoutId}
      className={`absolute inset-0 rounded-full ${
        isDayMode
          ? "bg-[linear-gradient(135deg,#4f46e5,#7c3aed)] shadow-[0_12px_26px_rgba(99,102,241,0.24)]"
          : "bg-white shadow-[0_10px_26px_rgba(255,255,255,0.12)]"
      }`}
      transition={{ type: "spring", bounce: 0.12, duration: 0.42 }}
    />
  );

  const isAudienceSelected = (audience) =>
    (!selectedAudience && audience === "全校") || selectedAudience === audience;
  const isCompactAudiencePreview =
    isSheetMode && !audienceQuery && !showAllAudiences;

  if (isSheetMode) {
    const sheetBorderClass = isDayMode
      ? "border-slate-200/80"
      : "border-white/10";
    const sheetSectionTitleClass = `text-sm font-black ${strongTextClass}`;
    const sheetHintClass = `mt-1 text-xs leading-5 ${mutedTextClass}`;
    const sheetCategoryClass = (active) =>
      `relative min-h-[44px] rounded-full px-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
        active
          ? isDayMode
            ? "text-white"
            : "text-black"
          : isDayMode
            ? "bg-slate-100/80 text-slate-600"
            : "bg-white/10 text-gray-300"
      }`;
    const sheetAudienceChipClass = (active) =>
      `min-h-[44px] rounded-full border px-3.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
        active
          ? isDayMode
            ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-[0_10px_22px_rgba(99,102,241,0.14)]"
            : "border-indigo-300/50 bg-indigo-400/20 text-white"
          : isDayMode
            ? "border-slate-200/80 bg-white/80 text-slate-600"
            : "border-white/10 bg-white/10 text-gray-300"
      }`;

    return (
      <div className="space-y-5">
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className={sheetSectionTitleClass}>活动类型</div>
              <p className={sheetHintClass}>先选类型，再按对象收窄结果。</p>
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
              <span className="relative z-10 whitespace-nowrap">全部</span>
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
                    {category.label}
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
                className={`min-h-[44px] rounded-full px-3.5 text-xs font-bold ${isDayMode ? "bg-indigo-50 text-indigo-700" : "bg-indigo-400/20 text-indigo-100"}`}
              >
                取消
              </button>
            )}
            {!selectedAudience && !audienceQuery && (
              <button
                type="button"
                aria-expanded={showAllAudiences}
                onClick={() => setShowAllAudiences((value) => !value)}
                className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1 rounded-full px-3.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "bg-slate-100 text-slate-600" : "bg-white/10 text-gray-300"}`}
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showAllAudiences ? "rotate-180" : ""}`}
                />
                {showAllAudiences ? "收起" : `全部 ${totalAudienceCount}`}
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
              aria-label="搜索学院或学园"
              className={`h-12 w-full rounded-2xl border pl-11 pr-12 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "border-slate-200/80 bg-white/90 text-slate-800 placeholder:text-slate-400" : "border-white/10 bg-white/10 text-white placeholder:text-gray-500"}`}
              placeholder="搜索学院 / 学园"
            />
            {audienceSearch && (
              <button
                type="button"
                aria-label="清空搜索"
                onClick={() => setAudienceSearch("")}
                className={`absolute right-1 top-1/2 inline-flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full ${isDayMode ? "text-slate-400 hover:bg-slate-100 hover:text-slate-700" : "text-gray-500 hover:bg-white/10 hover:text-white"}`}
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
                        {audience}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {visibleAudienceGroups.length === 0 && (
              <div
                className={`rounded-2xl border px-4 py-8 text-center text-sm ${isDayMode ? "border-slate-200/80 bg-white/80 text-slate-500" : "border-white/10 bg-white/10 text-gray-400"}`}
              >
                没有匹配的学院或学园
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
        className={`relative overflow-visible rounded-[2rem] border p-2 backdrop-blur-2xl ${glassClass}`}
      >
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div
            className={`relative min-w-0 overflow-hidden rounded-full xl:max-w-[760px] ${isDayMode ? "bg-slate-100/82" : "bg-black/24"}`}
          >
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto p-1 pr-10 custom-scrollbar md:pr-1">
              <button
                type="button"
                aria-pressed={!selectedCategory}
                onClick={() => setCategory(null)}
                className={channelButtonClass(!selectedCategory)}
              >
                {!selectedCategory && renderActivePill()}
                <span className="relative z-10 whitespace-nowrap">全部</span>
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
                      {category.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              className={`pointer-events-none absolute inset-y-1 right-1 w-10 rounded-r-full ${isDayMode ? "bg-gradient-to-l from-slate-100 via-slate-100/90 to-transparent" : "bg-gradient-to-l from-[#242431] via-[#242431]/85 to-transparent"}`}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
            <button
              type="button"
              aria-expanded={isAudienceOpen}
              onClick={() => setIsAudienceOpen((value) => !value)}
              className={`inline-flex min-h-[44px] items-center justify-between gap-2 rounded-full border px-4 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 sm:min-w-[176px] ${isDayMode ? "border-slate-200/80 bg-white/82 text-slate-700 hover:border-indigo-200 hover:bg-white" : "border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"}`}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <GraduationCap
                  size={16}
                  className={isDayMode ? "text-indigo-600" : "text-indigo-300"}
                />
                <span className="truncate">
                  面向：{selectedAudience || "全校"}
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
                className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "border-slate-200/80 bg-white/70 text-slate-500 hover:bg-white hover:text-slate-900" : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"}`}
              >
                <X size={13} />
                重置
              </button>
            )}

            {!hideSort && (
              <SortSelector
                sort={sort}
                onSortChange={onSortChange}
                className="sm:w-44"
                buttonClassName={
                  isDayMode
                    ? "bg-white/82 border border-slate-200/80 hover:bg-white hover:border-indigo-200/80 w-full py-3 rounded-full text-slate-700 backdrop-blur-3xl transition-all shadow-[0_12px_28px_rgba(148,163,184,0.12)]"
                    : "bg-white/5 border border-white/10 hover:bg-white/10 w-full py-3 rounded-full text-white backdrop-blur-3xl transition-all"
                }
                extraOptions={sortExtraOptions}
                renderMode={isSheetMode ? "list" : "dropdown"}
              />
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
            className={`rounded-[1.75rem] border p-3 backdrop-blur-2xl ${subtleGlassClass}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="relative w-full sm:w-72">
                <Search
                  size={15}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDayMode ? "text-slate-400" : "text-gray-500"}`}
                />
                <input
                  value={audienceSearch}
                  onChange={(event) => setAudienceSearch(event.target.value)}
                  className={`h-11 w-full rounded-full border pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "border-slate-200/80 bg-white/90 text-slate-700 placeholder:text-slate-400" : "border-white/10 bg-white/5 text-white placeholder:text-gray-500"}`}
                  placeholder="搜索学院/学园"
                />
              </div>
            </div>

            {selectedAudience && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAudience(selectedAudience)}
                  className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-3 text-xs font-bold ${isDayMode ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-indigo-400/25 bg-indigo-500/15 text-indigo-100"}`}
                >
                  {selectedAudience}
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
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((audience) => {
                        const selected = selectedAudience === audience;
                        return (
                          <button
                            key={audience}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setAudience(audience)}
                            className={`min-h-[38px] rounded-full border px-3 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
                              selected
                                ? isDayMode
                                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-[0_10px_22px_rgba(99,102,241,0.14)]"
                                  : "border-indigo-400/50 bg-indigo-500/20 text-indigo-100"
                                : isDayMode
                                  ? "border-slate-200/80 bg-white text-slate-600 hover:border-indigo-200 hover:text-slate-900"
                                  : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10"
                            }`}
                          >
                            {audience}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {visibleAudienceGroups.length === 0 && (
                  <div
                    className={`rounded-2xl border px-4 py-6 text-center text-sm ${isDayMode ? "border-slate-200/80 bg-white text-slate-500" : "border-white/10 bg-white/5 text-gray-400"}`}
                  >
                    没有匹配的学院或学园
                  </div>
                )}
              </div>
            </div>

            {!audienceQuery && (
              <button
                type="button"
                onClick={() => setShowAllAudiences((value) => !value)}
                className={`mt-3 inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "border-slate-200/80 bg-white text-slate-600 hover:border-indigo-200 hover:text-slate-900" : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"}`}
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
                  ? "收起到常用对象"
                  : `展开全部学院/学园（${totalAudienceCount}）`}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventFilterPanel;
