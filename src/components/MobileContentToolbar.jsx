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
      className={`mb-3 flex w-full min-w-0 items-center gap-2 overflow-x-auto px-1 pb-1 md:hidden ${isDayMode ? "text-slate-600" : "text-gray-400"}`}
    >
      {typeof resultCount === "number" && resultCount > 0 ? (
        <span
          className={`shrink-0 text-xs font-medium ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
        >
          {t("common.result_count", "{{count}} 项", { count: resultCount })}
        </span>
      ) : (
        <div className="min-w-0" />
      )}

      <div className="min-w-2 flex-1" />

      {onOpenSort && (
        <button
          type="button"
          onClick={onOpenSort}
          className={`rect-button-secondary inline-flex min-h-10 shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 ${isDayMode ? "hover:text-slate-900" : "text-gray-300"}`}
        >
          <ArrowUpDown size={14} aria-hidden="true" />
          {sortText}
        </button>
      )}

      {onOpenFilter && (
        <button
          type="button"
          onClick={onOpenFilter}
          className={`rect-button-secondary relative inline-flex min-h-10 shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 ${isDayMode ? "hover:text-slate-900" : "text-gray-300"}`}
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          {filterText}
          {filterCount > 0 && (
            <span className="ml-1 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {filterCount}
            </span>
          )}
        </button>
      )}

      {filterCount > 0 && onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="rect-button inline-flex min-h-10 shrink-0 items-center gap-1 border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
        >
          <X size={12} aria-hidden="true" />
          {resetText}
        </button>
      )}
    </div>
  );
};

export default MobileContentToolbar;
