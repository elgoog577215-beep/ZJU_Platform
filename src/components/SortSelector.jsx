import { useTranslation } from 'react-i18next';
import { ArrowUpDown, Check } from 'lucide-react';
import Dropdown from './Dropdown';
import { useSettings } from '../context/SettingsContext';

const SortSelector = ({
  sort,
  onSortChange,
  className,
  buttonClassName,
  extraOptions = [],
  renderMode = 'dropdown'
}) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';

  const options = [
    { value: 'newest', label: t('sort_filter.newest', '最新发布') },
    { value: 'oldest', label: t('sort_filter.oldest', '最早发布') },
    { value: 'likes', label: t('sort_filter.likes', '最多喜欢') },
    { value: 'title', label: t('sort_filter.title_option', '标题排序') },
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
                aria-pressed={active}
                onClick={() => onSortChange(option.value)}
                className={`w-full min-h-[48px] flex items-center justify-between gap-3 px-4 py-4 rounded-lg border transition-all text-left focus:outline-none focus-visible:ring-2 ${isDayMode ? 'focus-visible:ring-blue-300/60' : 'focus-visible:ring-indigo-400/70'} ${
                  active
                    ? isDayMode
                      ? 'bg-white text-slate-950 border-slate-300 shadow-[0_4px_12px_rgba(15,23,42,0.06)]'
                      : 'bg-indigo-500/15 border-indigo-400/40 text-white shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                    : isDayMode
                      ? 'day-quiet-button text-slate-600 hover:border-blue-200/80 hover:text-blue-700'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-md ${active ? (isDayMode ? 'bg-blue-50 text-blue-700' : 'bg-indigo-500/20 text-indigo-300') : (isDayMode ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-gray-400')}`}>
                    <ArrowUpDown size={16} />
                  </div>
                  <span className="font-medium truncate">{option.label}</span>
                </div>
                <div className={`shrink-0 transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>
                  <Check size={18} className={isDayMode ? 'text-blue-700' : 'text-indigo-300'} />
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
        buttonClassName={buttonClassName || (isDayMode
          ? "day-quiet-button border rounded-lg px-6 py-2.5 min-h-[44px] transition-all text-sm font-medium text-slate-700 hover:text-blue-700"
          : "bg-[#0a0a0a]/60 border border-white/10 hover:bg-[#0a0a0a]/80 hover:border-indigo-500/30 rounded-lg px-6 py-2.5 min-h-[44px] backdrop-blur-3xl transition-all text-sm font-medium shadow-lg text-white hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]")}
      />
    </div>
  );
};

export default SortSelector;
