import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AdvancedFilter from './AdvancedFilter';
import TagFilter from './TagFilter';
import SortSelector from './SortSelector';

const EventFilterPanel = ({
  filters,
  onFiltersChange,
  selectedTags,
  onTagsChange,
  lifecycle,
  onLifecycleChange,
  sort,
  onSortChange,
  refreshTrigger = 0,
}) => {
  const { t } = useTranslation();

  const sortExtraOptions = [
    { value: 'date_asc', label: t('sort_filter.date_asc') || 'Date (Earliest)' },
    { value: 'date_desc', label: t('sort_filter.date_desc') || 'Date (Latest)' },
  ];

  const hasActiveFilters =
    Object.values(filters).some(v => v) ||
    selectedTags.length > 0 ||
    lifecycle !== 'all';

  const clearAll = () => {
    onFiltersChange({ location: null, organizer: null, target_audience: null });
    onTagsChange([]);
    onLifecycleChange('all');
  };

  // Stable filters object for TagFilter — prevents new reference on every render
  const tagFilters = useMemo(() => ({
    ...filters,
    ...(lifecycle !== 'all' ? { lifecycle } : {}),
  }), [filters, lifecycle]);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Attribute filters + lifecycle in one card */}
      <AdvancedFilter
        filters={filters}
        onChange={onFiltersChange}
        refreshTrigger={refreshTrigger}
        lifecycle={lifecycle}
        onLifecycleChange={onLifecycleChange}
      />

      {/* Tag filter — independent card, receives filters + lifecycle for count sync */}
      <TagFilter
        selectedTags={selectedTags}
        onChange={onTagsChange}
        type="events"
        filters={tagFilters}
      />

      {/* Sort row */}
      <div className="flex justify-end items-center gap-3">
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onClick={clearAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all border border-red-500/10 text-sm font-medium shrink-0"
            >
              <X size={14} />
              {t('advanced_filter.clear') || '清除所有筛选'}
            </motion.button>
          )}
        </AnimatePresence>
        <SortSelector
          sort={sort}
          onSortChange={onSortChange}
          className="w-48"
          buttonClassName="bg-[#0a0a0a]/60 border border-white/10 hover:bg-[#0a0a0a]/80 w-full py-3 rounded-xl text-white backdrop-blur-3xl transition-all shadow-lg"
          extraOptions={sortExtraOptions}
        />
      </div>
    </div>
  );
};

export default EventFilterPanel;
