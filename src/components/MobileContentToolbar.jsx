import React from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, ArrowUpDown, X } from "lucide-react";

const MobileContentToolbar = ({
  isDayMode,
  resultCount,
  sortLabel,
  filterCount = 0,
  onOpenSort,
  onOpenFilter,
  onClearFilters,
  clearLabel,
  sortButtonLabel,
  filterButtonLabel,
}) => {
  const { t } = useTranslation();
  const resetText = clearLabel || t("common.reset", "重置");
  const filterText = filterButtonLabel || t("common.filters", "筛选");
  const sortText = sortButtonLabel || sortLabel || t("common.sort", "排序");

  return (
    <div
      className={`mb-4 flex items-center gap-2 px-1 md:hidden ${isDayMode ? "text-slate-600" : "text-gray-400"}`}
    >
      {typeof resultCount === "number" && resultCount > 0 ? (
        <span
          className={`text-xs font-medium ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
        >
          {t("common.result_count", "{{count}} 项", { count: resultCount })}
        </span>
      ) : (
        <div />
      )}

      <div className="flex-1" />

      {onOpenSort && (
        <button
          type="button"
          onClick={onOpenSort}
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "day-quiet-button hover:text-indigo-600" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
        >
          <ArrowUpDown size={14} aria-hidden="true" />
          {sortText}
        </button>
      )}

      {onOpenFilter && (
        <button
          type="button"
          onClick={onOpenFilter}
          className={`relative inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "day-quiet-button hover:text-indigo-600" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          {filterText}
          {filterCount > 0 && (
            <span className="ml-1 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {filterCount}
            </span>
          )}
        </button>
      )}

      {filterCount > 0 && onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
        >
          <X size={12} aria-hidden="true" />
          {resetText}
        </button>
      )}
    </div>
  );
};

export default MobileContentToolbar;
