import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronDown, Clock, SlidersHorizontal, XCircle } from "lucide-react";

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
    ? "border-blue-100 bg-white/92 text-slate-700 shadow-[0_10px_24px_rgba(30,64,175,0.08)] active:bg-blue-50"
    : "border-white/10 bg-white/[0.045] text-slate-200";
  const motionProps = {
    whileHover: { y: -1 },
    whileTap: { scale: 0.965 },
    transition: { type: "spring", stiffness: 520, damping: 34 },
  };

  return (
    <div className="mb-3 grid w-full grid-cols-[1fr_1fr_0.98fr] gap-2 md:hidden">
      <motion.button
        {...motionProps}
        type="button"
        onClick={onOpenSort}
        className={`inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-[8px] border px-2.5 text-[14px] font-semibold transition-[background-color,border-color,box-shadow] ${baseButtonClass}`}
        aria-label={sortText}
        title={sortText}
      >
        <Clock size={17} />
        <span className="truncate">{sortText}</span>
        <ChevronDown size={16} />
      </motion.button>

      <motion.button
        {...motionProps}
        type="button"
        onClick={onOpenFilter}
        className={`relative inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-[8px] border px-2.5 text-[14px] font-semibold transition-[background-color,border-color,box-shadow] ${baseButtonClass}`}
        aria-label={filterText}
        title={filterText}
      >
        <SlidersHorizontal size={17} />
        <span>{filterText}</span>
        {filterCount > 0 ? (
          <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] leading-none text-white ${
            isDayMode ? "bg-blue-600" : "bg-indigo-500"
          }`}>
            {filterCount}
          </span>
        ) : null}
      </motion.button>

      <motion.button
        {...motionProps}
        type="button"
        onClick={onClearFilters}
        className={`inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-[8px] border px-2.5 text-[14px] font-semibold transition-[background-color,border-color,box-shadow] ${baseButtonClass}`}
        aria-label={resetText}
        title={resetText}
      >
        <XCircle size={17} />
        <span>{resetText}</span>
      </motion.button>
    </div>
  );
};

export default MobileContentToolbar;
