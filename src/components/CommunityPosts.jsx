import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, HelpCircle, Newspaper, Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import CommunityTech from './CommunityTech';
import CommunityHelp from './CommunityHelp';
import CommunityNewsBoard from './CommunityNewsBoard';
import CommunityTeam from './CommunityTeam';

const POST_TABS = [
  { key: 'tech', labelKey: 'community.tab_tech', fallback: '技术分享', icon: BookOpen },
  { key: 'help', labelKey: 'community.tab_help_qa', fallback: '求助问答', icon: HelpCircle },
  { key: 'news', labelKey: 'community.tab_news_hot', fallback: '新闻热点', icon: Newspaper },
  { key: 'team', labelKey: 'community.tab_team_collab', fallback: '组队协作', icon: Users },
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
    <div className="relative">
      <div
        role="tablist"
        className={`scrollbar-none -mx-1 mb-4 flex items-center gap-1 overflow-x-auto rounded-lg border p-1 sm:mx-0 md:overflow-visible ${
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
            className={`inline-flex min-h-[40px] min-w-[112px] flex-none items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] font-bold whitespace-nowrap transition-all md:min-h-[42px] md:min-w-0 md:flex-1 md:gap-2 md:text-sm ${
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

      {activeTab === 'tech' ? <CommunityTech /> : null}
      {activeTab === 'help' ? <CommunityHelp /> : null}
      {activeTab === 'news' ? <CommunityNewsBoard /> : null}
      {activeTab === 'team' ? <CommunityTeam /> : null}

      {createPortal(
        <button
          type="button"
          onClick={() => {
            if (activeTab === 'tech') {
              window.dispatchEvent(new CustomEvent('open-upload-modal', { detail: { type: 'article' } }));
              return;
            }
            window.dispatchEvent(new CustomEvent('open-community-composer', { detail: { boardKey: activeTab } }));
          }}
          aria-label={t('community.post_new', '发帖')}
          className={`fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-4 z-[88] inline-flex h-12 w-12 items-center justify-center rounded-lg border shadow-[0_18px_34px_rgba(15,23,42,0.22)] transition-transform active:scale-95 md:hidden ${
            isDayMode
              ? 'border-violet-200 bg-violet-700 text-white'
              : 'border-orange-300/30 bg-orange-400 text-slate-950'
          }`}
        >
          <Plus size={22} />
        </button>,
        document.body,
      )}
    </div>
  );
};

export default CommunityPosts;
