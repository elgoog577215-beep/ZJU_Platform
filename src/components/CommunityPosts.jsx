import { useMemo } from 'react';
import { BookOpen, FileStack, HelpCircle, Newspaper, Podcast, QrCode, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useSettings } from '../context/SettingsContext';
import CommunityGroups from './CommunityGroups';
import CommunityHelp from './CommunityHelp';
import CommunityMaterials from './CommunityMaterials';
import CommunityNewsBoard from './CommunityNewsBoard';
import CommunityTeam from './CommunityTeam';
import CommunityTech from './CommunityTech';
import Music from './Music';

const POST_TABS = [
  { key: 'tech', labelKey: 'community.tab_tech', fallback: '技术分享', icon: BookOpen },
  { key: 'help', labelKey: 'community.tab_help_qa', fallback: '求助问答', icon: HelpCircle },
  { key: 'materials', labelKey: 'community.tab_materials', fallback: '期末资料', icon: FileStack },
  { key: 'news', labelKey: 'community.tab_news_hot', fallback: '新闻热点', icon: Newspaper },
  { key: 'team', labelKey: 'community.tab_team_collab', fallback: '组队协作', icon: Users },
  { key: 'podcast', labelKey: 'community.tab_podcast', fallback: '播客', icon: Podcast },
  { key: 'groups', labelKey: 'community.tab_groups', fallback: '二维码社群', icon: QrCode },
];

const VALID_TABS = new Set(POST_TABS.map((tab) => tab.key));

const CommunityPosts = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('postTab') || 'tech';
  const activeTab = VALID_TABS.has(requestedTab) ? requestedTab : 'tech';

  const activeMeta = useMemo(
    () => POST_TABS.find((tab) => tab.key === activeTab) || POST_TABS[0],
    [activeTab],
  );

  const setActiveTab = (tab) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set('postTab', tab);
      ['id', 'post', 'news', 'group'].forEach((key) => next.delete(key));
      return next;
    }, { replace: false });
  };

  const renderActivePanel = () => {
    if (activeTab === 'help') return <CommunityHelp />;
    if (activeTab === 'materials') return <CommunityMaterials />;
    if (activeTab === 'news') return <CommunityNewsBoard />;
    if (activeTab === 'team') return <CommunityTeam />;
    if (activeTab === 'podcast') return <Music embedded singleColumn />;
    if (activeTab === 'groups') return <CommunityGroups />;
    return <CommunityTech />;
  };

  return (
    <div>
      <div
        className={`mb-4 overflow-x-auto rounded-lg border p-1 ${
          isDayMode ? 'border-slate-200 bg-white/82' : 'border-white/10 bg-white/[0.035]'
        }`}
      >
        <div className="flex min-w-max gap-1">
          {POST_TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                  selected
                    ? (isDayMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-950')
                    : (isDayMode ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-300 hover:bg-white/10')
                }`}
              >
                <Icon size={16} />
                {t(tab.labelKey, tab.fallback)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {t(activeMeta.labelKey, activeMeta.fallback)}
      </div>

      {renderActivePanel()}
    </div>
  );
};

export default CommunityPosts;
