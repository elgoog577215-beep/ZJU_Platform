import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import CommunityTech from './CommunityTech';
import CommunityHelp from './CommunityHelp';

const POST_TABS = [
  { key: 'tech', labelKey: 'community.tab_tech', fallback: '技术分享', icon: BookOpen },
  { key: 'help', labelKey: 'community.tab_help', fallback: '求助', icon: HelpCircle },
];

const CommunityPosts = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('postTab') || 'tech';
  const activeTab = POST_TABS.some((tb) => tb.key === rawTab) ? rawTab : 'tech';

  const handleTabChange = useCallback(
    (tab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('postTab', tab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <div>
      <div
        role="tablist"
        className={`mb-4 flex items-center gap-1 rounded-lg border p-1 ${
          isDayMode
            ? 'border-slate-200/80 bg-slate-100/80'
            : 'border-white/10 bg-black/18'
        }`}
      >
        {POST_TABS.map(({ key, labelKey, fallback, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => handleTabChange(key)}
            className={`inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === key
                ? isDayMode
                  ? 'border-slate-300 bg-white text-slate-950 shadow-[0_4px_12px_rgba(15,23,42,0.06)]'
                  : 'border-orange-300 bg-orange-400 text-slate-950 shadow-[0_0_32px_rgba(251,146,60,0.22)]'
                : isDayMode
                  ? 'border-transparent text-slate-600 hover:bg-white hover:text-slate-950'
                  : 'border-transparent text-white/58 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <Icon size={16} />
            <span>{t(labelKey, fallback)}</span>
          </button>
        ))}
      </div>

      {activeTab === 'tech' ? <CommunityTech /> : <CommunityHelp />}
    </div>
  );
};

export default CommunityPosts;
