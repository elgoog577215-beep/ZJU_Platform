import { ArrowUpDown, Filter, X } from "lucide-react";

const MobileContentToolbar = ({
  isDayMode,
  resultCount,
  sortLabel,
  filterCount = 0,
  onOpenSort,
  onOpenFilter,
  onClearFilters,
  clearLabel,
}) => {
  const hasFilters = filterCount > 0;

  return (
    <div
      className={`md:hidden sticky top-[72px] z-30 mb-5 rounded-[22px] border px-3 py-3 backdrop-blur-xl ${
        isDayMode
          ? "bg-white/88 border-slate-200/80 shadow-[0_16px_40px_rgba(148,163,184,0.16)]"
          : "bg-[#111111]/78 border-white/10 shadow-[0_18px_44px_rgba(0,0,0,0.28)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[11px] uppercase tracking-[0.2em] ${
              isDayMode ? "text-slate-400" : "text-gray-500"
            }`}
          >
            Results
          </p>
          <p
            className={`text-sm font-semibold truncate ${
              isDayMode ? "text-slate-900" : "text-white"
            }`}
          >
            {resultCount}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasFilters && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className={`min-h-[40px] px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                isDayMode
                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  : "bg-white/10 text-gray-200 hover:bg-white/15"
              }`}
            >
              <X size={14} />
              <span>{clearLabel}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSort}
            className={`min-h-[40px] px-3 rounded-full text-xs font-medium inline-flex items-center gap-2 transition-colors ${
              isDayMode
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-white/10 text-gray-100 hover:bg-white/15"
            }`}
          >
            <ArrowUpDown size={14} />
            <span className="truncate max-w-[72px]">{sortLabel}</span>
          </button>

          <button
            type="button"
            onClick={onOpenFilter}
            className={`relative min-h-[40px] min-w-[40px] px-3 rounded-full inline-flex items-center justify-center transition-colors ${
              isDayMode
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            <Filter size={14} />
            {hasFilters && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileContentToolbar;
