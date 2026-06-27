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
}) => {
  const { t } = useTranslation();

  return (
    <div role="search" className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 transition-colors ${isDayMode ? 'border-slate-200 bg-white text-slate-800 shadow-[0_4px_14px_rgba(15,23,42,0.035)] focus-within:border-slate-300' : 'border-white/10 bg-white/[0.045] text-white focus-within:border-white/20'} ${className}`}>
      <Search size={16} className={isDayMode ? 'text-slate-400' : 'text-gray-500'} />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder || t('common.search', '搜索...')}
        autoComplete="off"
        enterKeyHint="search"
        className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${isDayMode ? 'placeholder:text-slate-400' : 'placeholder:text-gray-500'}`}
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={t('common.clear', '清除')}
          className={`-mr-1 inline-flex min-h-10 min-w-10 items-center justify-center rounded-md transition-colors ${isDayMode ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700' : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
};

export default CommunitySearchInput;
