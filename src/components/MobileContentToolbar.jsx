import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, ChevronDown, SlidersHorizontal, X } from "lucide-react";

const MobileContentToolbar = ({
  isDayMode,
  sortLabel,
  filterCount = 0,
  onOpenSort,
  onOpenFilter,
  onClearFilters,
  clearLabel,
  filterButtonLabel,
}) => {
  const { t } = useTranslation();
  const resetText = clearLabel || t("common.clear_all", "清空");
  const filterText = filterButtonLabel || t("common.filters", "筛选");
  const sortText = sortLabel || t("sort_filter.newest", "最新发布");

  const baseButtonClass = isDayMode
    ? "border-slate-200 bg-white text-slate-700"
    : "border-white/10 bg-white/[0.045] text-slate-200";
  const motionProps = {
    whileHover: { y: -1 },
    whileTap: { scale: 0.965 },
    transition: { type: "spring", stiffness: 520, damping: 34 },
  };

  return (
    <div className="mb-3 grid w-full grid-cols-[1fr_1fr_0.92fr] gap-2 md:hidden">
      <motion.button
        {...motionProps}
        type="button"
        onClick={onOpenSort}
        className={`inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-[6px] border px-2 text-[11px] font-bold transition-[background-color,border-color,box-shadow] ${baseButtonClass}`}
        aria-label={sortText}
        title={sortText}
      >
        <ArrowUpDown size={13} />
        <span className="truncate">{sortText}</span>
        <ChevronDown size={13} />
      </motion.button>

      <motion.button
        {...motionProps}
        type="button"
        onClick={onOpenFilter}
        className={`relative inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-[6px] border px-2 text-[11px] font-bold transition-[background-color,border-color,box-shadow] ${baseButtonClass}`}
        aria-label={filterText}
        title={filterText}
      >
        <SlidersHorizontal size={13} />
        <span>{filterText}</span>
        {filterCount > 0 ? (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] leading-none text-white">
            {filterCount}
          </span>
        ) : null}
      </motion.button>

      <motion.button
        {...motionProps}
        type="button"
        onClick={onClearFilters}
        className={`inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-[6px] border px-2 text-[11px] font-bold transition-[background-color,border-color,box-shadow] ${baseButtonClass}`}
        aria-label={resetText}
        title={resetText}
      >
        <X size={12} />
        <span>{resetText}</span>
      </motion.button>
    </div>
  );
};

export default MobileContentToolbar;
