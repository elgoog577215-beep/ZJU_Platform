import React from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CommunitySearchInput = ({
  value,
  onChange,
  onClear,
  placeholder,
  isDayMode,
  className = '',
  size = 'default',
}) => {
  const { t } = useTranslation();
  const isLarge = size === 'large';

  return (
    <div role="search" className={`flex ${isLarge ? 'min-h-14 gap-3 px-4' : 'min-h-11 gap-2 px-3'} items-center rounded-lg border transition-colors ${isDayMode ? 'border-slate-200 bg-white text-slate-800 shadow-[0_4px_14px_rgba(15,23,42,0.035)] focus-within:border-violet-300' : 'border-white/10 bg-white/[0.045] text-white focus-within:border-violet-300/30'} ${className}`}>
      <Search size={isLarge ? 19 : 16} className={isDayMode ? 'text-violet-400' : 'text-violet-300/60'} />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder || t('common.search', '搜索...')}
        autoComplete="off"
        enterKeyHint="search"
        className={`min-w-0 flex-1 bg-transparent ${isLarge ? 'text-base' : 'text-sm'} outline-none ${isDayMode ? 'placeholder:text-slate-400' : 'placeholder:text-gray-500'}`}
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={t('common.clear', '清除')}
          className={`-mr-1 inline-flex ${isLarge ? 'min-h-11 min-w-11' : 'min-h-10 min-w-10'} items-center justify-center rounded-md transition-colors ${isDayMode ? 'text-slate-400 hover:bg-violet-50 hover:text-violet-700' : 'text-gray-500 hover:bg-violet-300/10 hover:text-white'}`}
        >
          <X size={isLarge ? 16 : 14} />
        </button>
      ) : null}
    </div>
  );
};

export default CommunitySearchInput;
