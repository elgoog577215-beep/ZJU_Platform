import React from "react";
import { SlidersHorizontal, ArrowUpDown, X } from "lucide-react";

const MobileContentToolbar = ({
  isDayMode,
  resultCount,
  sortLabel,
  filterCount = 0,
  onOpenSort,
  onOpenFilter,
  onClearFilters,
  clearLabel = "重置",
}) => (
  <div
    className={`mb-4 flex items-center gap-2 px-1 md:hidden ${isDayMode ? "text-slate-600" : "text-gray-400"}`}
  >
    {typeof resultCount === "number" && resultCount > 0 ? (
      <span
        className={`text-xs font-medium ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
      >
        {`${resultCount} 项`}
      </span>
    ) : (
      <div />
    )}

    <div className="flex-1" />

    <button
      type="button"
      onClick={onOpenSort}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${isDayMode ? "border-slate-200/80 bg-white/80 hover:bg-slate-50" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
    >
      <ArrowUpDown size={12} />
      {sortLabel}
    </button>

    <button
      type="button"
      onClick={onOpenFilter}
      className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${isDayMode ? "border-slate-200/80 bg-white/80 hover:bg-slate-50" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
    >
      <SlidersHorizontal size={12} />
      筛选
      {filterCount > 0 && (
        <span className="ml-1 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {filterCount}
        </span>
      )}
    </button>

    {filterCount > 0 && (
      <button
        type="button"
        onClick={onClearFilters}
        className="flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20"
      >
        <X size={10} />
        {clearLabel}
      </button>
    )}
  </div>
);

export default MobileContentToolbar;
