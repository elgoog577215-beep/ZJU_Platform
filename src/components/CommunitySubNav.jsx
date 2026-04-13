import { memo, useRef, useEffect } from 'react';
import { HelpCircle, Code2, Newspaper, Users, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const tabs = [
  { key: 'help',   icon: HelpCircle, labelKey: 'nav.community_help' },
  { key: 'tech',   icon: Code2,      labelKey: 'nav.community_tech' },
  { key: 'news',   icon: Newspaper,  labelKey: 'nav.community_news' },
  { key: 'team',   icon: Users,      labelKey: 'nav.community_team' },
  { key: 'groups', icon: QrCode,     labelKey: 'nav.community_groups' },
];

const CommunitySubNav = memo(({ activeTab, onTabChange, isDayMode }) => {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const activeRef = useRef(null);

  // Auto-scroll active tab into view on mobile
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeTab]);

  const handleKeyDown = (e) => {
    const currentIndex = tabs.findIndex((tab) => tab.key === activeTab);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else {
      return;
    }

    e.preventDefault();
    onTabChange(tabs[nextIndex].key);
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={t('nav.community', 'AI社区')}
      onKeyDown={handleKeyDown}
      className="flex gap-2 overflow-x-auto scrollbar-hidden pb-1 px-1"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;

        return (
          <button
            key={tab.key}
            ref={isActive ? activeRef : undefined}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-orange-400 transition-all duration-300 ${
              isActive
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : isDayMode
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'
            }`}
          >
            <Icon size={16} />
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
});

CommunitySubNav.displayName = 'CommunitySubNav';

export default CommunitySubNav;
