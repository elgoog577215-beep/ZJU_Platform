import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Check } from 'lucide-react';
import Dropdown from './Dropdown';

const SortSelector = ({
  sort,
  onSortChange,
  className,
  buttonClassName,
  extraOptions = [],
  renderMode = 'dropdown'
}) => {
  const { t } = useTranslation();

  const options = [
    { value: 'newest', label: t('sort_filter.newest') },
    { value: 'oldest', label: t('sort_filter.oldest') },
    { value: 'likes', label: t('sort_filter.likes') },
    { value: 'title', label: t('sort_filter.title') },
    ...extraOptions
  ];

  if (renderMode === 'list') {
    return (
      <div className={className || 'w-full'}>
        <div className="flex flex-col gap-2">
          {options.map((option) => {
            const active = option.value === sort;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSortChange(option.value)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-4 rounded-2xl border transition-all text-left ${
                  active
                    ? 'bg-indigo-500/15 border-indigo-400/40 text-white shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl ${active ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-gray-400'}`}>
                    <ArrowUpDown size={16} />
                  </div>
                  <span className="font-medium truncate">{option.label}</span>
                </div>
                <div className={`shrink-0 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>
                  <Check size={18} className="text-indigo-300" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={className || "w-40"}>
      <Dropdown
        value={sort}
        onChange={onSortChange}
        options={options}
        icon={ArrowUpDown}
        buttonClassName={buttonClassName || "bg-[#0a0a0a]/60 border border-white/10 hover:bg-[#0a0a0a]/80 hover:border-indigo-500/30 rounded-full px-6 py-2.5 backdrop-blur-3xl transition-all text-sm font-medium shadow-lg text-white hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"}
      />
    </div>
  );
};

export default SortSelector;
