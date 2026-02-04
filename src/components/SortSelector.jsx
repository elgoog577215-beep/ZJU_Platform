import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown } from 'lucide-react';
import Dropdown from './Dropdown';

const SortSelector = ({ sort, onSortChange, className, buttonClassName, extraOptions = [] }) => {
  const { t } = useTranslation();

  const options = [
    { value: 'newest', label: t('sort_filter.newest') },
    { value: 'oldest', label: t('sort_filter.oldest') },
    { value: 'likes', label: t('sort_filter.likes') },
    { value: 'title', label: t('sort_filter.title') },
    ...extraOptions
  ];

  return (
    <div className={className || "w-40"}>
      <Dropdown
        value={sort}
        onChange={onSortChange}
        options={options}
        icon={ArrowUpDown}
        buttonClassName={buttonClassName || "bg-[#0a0a0a]/60 border border-white/10 hover:bg-[#0a0a0a]/80 rounded-full px-6 py-2.5 backdrop-blur-3xl transition-all text-sm font-medium shadow-lg text-white"}
      />
    </div>
  );
};

export default SortSelector;