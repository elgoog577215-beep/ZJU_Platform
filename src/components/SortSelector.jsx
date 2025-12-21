import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown } from 'lucide-react';
import Dropdown from './Dropdown';

const SortSelector = ({ sort, onSortChange, className, buttonClassName }) => {
  const { t } = useTranslation();

  const options = [
    { value: 'newest', label: t('sort_filter.newest') },
    { value: 'oldest', label: t('sort_filter.oldest') },
    { value: 'likes', label: t('sort_filter.likes') },
    { value: 'title', label: t('sort_filter.title') },
  ];

  return (
    <div className={className || "w-40"}>
      <Dropdown
        value={sort}
        onChange={onSortChange}
        options={options}
        icon={ArrowUpDown}
        buttonClassName={buttonClassName || "bg-neutral-900 rounded-full px-4 py-2 border-white/10 hover:bg-neutral-800"}
      />
    </div>
  );
};

export default SortSelector;