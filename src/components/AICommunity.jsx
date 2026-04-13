import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import SEO from './SEO';
import CommunitySubNav from './CommunitySubNav';
import CommunityTech from './CommunityTech';
import CommunityNews from './CommunityNews';
import CommunityHelp from './CommunityHelp';
import CommunityTeam from './CommunityTeam';
import CommunityGroups from './CommunityGroups';

const panels = {
  help: CommunityHelp,
  tech: CommunityTech,
  news: CommunityNews,
  team: CommunityTeam,
  groups: CommunityGroups,
};

const AICommunity = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'tech';

  const handleTabChange = useCallback((tab) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  const ActivePanel = panels[activeTab] || CommunityTech;

  return (
    <section className="pt-24 pb-28 md:py-24 px-4 md:px-8 min-h-screen flex items-center justify-center relative z-10 overflow-hidden">
      <SEO
        title={t('nav.community', 'AI社区')}
        description={t('community.seo_description', '浙江大学 AI 社区：求助、技术分享、新闻与协作。')}
      />

      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-orange-500/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/10 blur-[120px]" />
      </div>

      <div className="max-w-5xl w-full mx-auto relative z-10">
        {/* Header */}
        <div className="mb-6 md:mb-10 text-center hidden md:block">
          <h2 className={`text-4xl md:text-5xl font-bold font-serif mb-4 md:mb-6 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
            {t('nav.community', 'AI社区')}
          </h2>
          <p className={`max-w-xl mx-auto text-sm md:text-base mb-8 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('community.seo_description', '浙江大学 AI 社区：求助、技术分享、新闻与协作。')}
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex justify-center mb-8">
          <CommunitySubNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isDayMode={isDayMode}
          />
        </div>

        {/* Active Panel */}
        <ActivePanel />
      </div>
    </section>
  );
};

export default AICommunity;
