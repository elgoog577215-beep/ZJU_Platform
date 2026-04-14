import React from 'react';
import { SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';

const MobileContentToolbar = ({
  isDayMode,
  resultCount,
  sortLabel,
  filterCount = 0,
  onOpenSort,
  onOpenFilter,
  onClearFilters,
  clearLabel = '重置',
}) => (
  <div className={`flex items-center gap-2 md:hidden mb-4 px-1 ${isDayMode ? 'text-slate-600' : 'text-gray-400'}`}>
    <span className={`text-xs font-medium ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
      {resultCount ?? '—'}
    </span>

    <div className="flex-1" />

    <button
      type="button"
      onClick={onOpenSort}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isDayMode ? 'bg-white/80 border-slate-200/80 hover:bg-slate-50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
    >
      <ArrowUpDown size={12} />
      {sortLabel}
    </button>

    <button
      type="button"
      onClick={onOpenFilter}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isDayMode ? 'bg-white/80 border-slate-200/80 hover:bg-slate-50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
    >
      <SlidersHorizontal size={12} />
      筛选
      {filterCount > 0 && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white leading-none">
          {filterCount}
        </span>
      )}
    </button>

    {filterCount > 0 && (
      <button
        type="button"
        onClick={onClearFilters}
        className="flex items-center gap-1 px-2 py-1.5 rounded-full text-xs text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
      >
        <X size={10} />
        {clearLabel}
      </button>
    )}
  </div>
);

export default MobileContentToolbar;
