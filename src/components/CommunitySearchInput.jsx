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
    <div role="search" className={`flex ${isLarge ? 'min-h-14 gap-3 px-4' : 'min-h-11 gap-2 px-3'} items-center rounded-lg border transition-colors ${isDayMode ? 'border-[#ddd6c8] bg-[#faf7f0] text-[#201f1a] shadow-[0_4px_14px_rgba(64,54,37,0.04)] focus-within:border-[#b9aa90]' : 'border-[#2a312b] bg-[#141a15] text-[#e7e0d2] focus-within:border-[#657466]'} ${className}`}>
      <Search size={isLarge ? 19 : 16} className={isDayMode ? 'text-[#8b8272]' : 'text-[#7f8b7f]'} />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder || t('common.search', '搜索...')}
        autoComplete="off"
        enterKeyHint="search"
        className={`min-w-0 flex-1 bg-transparent ${isLarge ? 'text-base' : 'text-sm'} outline-none ${isDayMode ? 'placeholder:text-[#9c9383]' : 'placeholder:text-[#777f76]'}`}
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={t('common.clear', '清除')}
          className={`-mr-1 inline-flex ${isLarge ? 'min-h-11 min-w-11' : 'min-h-10 min-w-10'} items-center justify-center rounded-md transition-colors ${isDayMode ? 'text-[#8b8272] hover:bg-[#eee8dc] hover:text-[#201f1a]' : 'text-[#7f8b7f] hover:bg-[#20261f] hover:text-[#e7e0d2]'}`}
        >
          <X size={isLarge ? 16 : 14} />
        </button>
      ) : null}
    </div>
  );
};

export default CommunitySearchInput;
