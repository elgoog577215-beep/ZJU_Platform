import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HelpCircle, BookOpen, QrCode, Newspaper, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSettings } from '../context/SettingsContext';
import SEO from './SEO';
import CommunityTech from './CommunityTech';
import CommunityHelp from './CommunityHelp';
import CommunityGroups from './CommunityGroups';
import CommunityNewsRail from './CommunityNewsRail';

const panels = {
  help: CommunityHelp,
  tech: CommunityTech,
  groups: CommunityGroups,
};

const TABS = [
  { key: 'help', icon: HelpCircle, labelKey: 'community.tab_help', fallback: '求助天地' },
  { key: 'tech', icon: BookOpen, labelKey: 'community.tab_tech', fallback: '技术分享' },
  { key: 'groups', icon: QrCode, labelKey: 'community.tab_groups', fallback: '二维码社群' },
];

const AICommunity = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileNewsOpen, setIsMobileNewsOpen] = useState(false);

  const requestedTab = searchParams.get('tab') || 'help';
  const activeTab = panels[requestedTab] ? requestedTab : 'help';

  const handleTabChange = useCallback((tab) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  const ActivePanel = panels[activeTab] || CommunityHelp;
  const subtitle = useMemo(() => (
    t(
      'community.seo_description',
      'AI社区新结构：左侧新闻热榜，主内容为求助与技术分享，附二维码社群。'
    )
  ), [t]);

  return (
    <section className="pt-24 pb-28 md:py-24 px-4 md:px-8 min-h-screen relative z-10 overflow-hidden">
      <SEO
        title={t('nav.community', 'AI社区')}
        description={subtitle}
      />

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-orange-500/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/10 blur-[120px]" />
      </div>

      <div className="hidden lg:block fixed left-4 xl:left-8 top-24 z-20 w-[300px] xl:w-[320px]">
        <CommunityNewsRail />
      </div>

      <div className="max-w-[1320px] w-full mx-auto relative z-10 lg:pl-[340px] xl:pl-[368px]">
        <div className="mb-6 md:mb-8 text-center hidden md:block">
          <h2 className={`text-4xl md:text-5xl font-bold font-serif mb-4 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
            {t('nav.community', 'AI社区')}
          </h2>
          <p className={`max-w-3xl mx-auto text-sm md:text-base ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {subtitle}
          </p>
        </div>

        <div className="mb-3 md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileNewsOpen(true)}
            className={`w-full h-11 px-4 rounded-2xl border text-sm font-semibold inline-flex items-center justify-center gap-2 ${
              isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'
            }`}
          >
            <Newspaper size={16} />
            {t('community.news_board', '新闻热榜')}
          </button>
        </div>

        <div className={`mb-5 p-2 rounded-2xl border backdrop-blur-xl flex items-center gap-2 overflow-x-auto ${isDayMode ? 'bg-white/82 border-slate-200/80' : 'bg-[#1a1a1a]/60 border-white/10'}`}>
          {TABS.map(({ key, icon: Icon, labelKey, fallback }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTabChange(key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === key
                  ? (isDayMode ? 'bg-orange-500 text-white shadow-[0_12px_28px_rgba(249,115,22,0.3)]' : 'bg-orange-500 text-black')
                  : (isDayMode ? 'text-slate-600 hover:bg-slate-100' : 'text-gray-300 hover:bg-white/10')
              }`}
            >
              <Icon size={16} />
              <span>{t(labelKey, fallback)}</span>
            </button>
          ))}
        </div>

        <div className={`rounded-2xl border p-3 md:p-4 ${isDayMode ? 'bg-white/82 border-slate-200/80' : 'bg-[#1a1a1a]/40 border-white/10'}`}>
          <ActivePanel />
        </div>
      </div>

      <AnimatePresence>
        {isMobileNewsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[130] md:hidden ${isDayMode ? 'bg-white/65' : 'bg-black/80'} backdrop-blur-md`}
            onClick={() => setIsMobileNewsOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className={`absolute inset-x-0 bottom-0 max-h-[86vh] rounded-t-3xl border-t p-3 overflow-y-auto ${
                isDayMode ? 'bg-white border-slate-200' : 'bg-[#0f0f0f] border-white/10'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 pb-2 mb-2 flex items-center justify-between">
                <h3 className={`text-sm font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                  {t('community.news_board', '新闻热榜')}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileNewsOpen(false)}
                  className={`p-2 rounded-full border ${isDayMode ? 'bg-white text-slate-700 border-slate-200' : 'bg-white/5 text-white border-white/10'}`}
                >
                  <X size={16} />
                </button>
              </div>
              <CommunityNewsRail />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default AICommunity;
