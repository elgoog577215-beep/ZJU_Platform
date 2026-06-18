import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Clock3, FileStack, HelpCircle, MessageCircle, Newspaper, PenLine, Podcast, QrCode, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useCachedResource } from '../hooks/useCachedResource';
import CommunityTech from './CommunityTech';
import CommunityHelp from './CommunityHelp';
import CommunityMaterials from './CommunityMaterials';
import CommunityNewsBoard from './CommunityNewsBoard';
import CommunityTeam from './CommunityTeam';
import CommunityGroups from './CommunityGroups';
import CommunityPostTypePicker from './CommunityPostTypePicker';
import UnifiedCommunityComposer from './UnifiedCommunityComposer';
import Music from './Music';

const POST_TABS = [
  { key: 'featured', labelKey: 'community.tab_featured', fallback: '精选', icon: Clock3 },
  { key: 'tech', labelKey: 'community.tab_tech', fallback: '技术分享', icon: BookOpen },
  { key: 'help', labelKey: 'community.tab_help_qa', fallback: '求助问答', icon: HelpCircle },
  { key: 'materials', labelKey: 'community.tab_materials', fallback: '期末资料', icon: FileStack },
  { key: 'news', labelKey: 'community.tab_news_hot', fallback: '新闻热点', icon: Newspaper },
  { key: 'team', labelKey: 'community.tab_team_collab', fallback: '组队协作', icon: Users },
  { key: 'podcast', labelKey: 'community.tab_podcast', fallback: '播客', icon: Podcast, mobileOnly: true },
  { key: 'groups', labelKey: 'community.tab_groups', fallback: '二维码社群', icon: QrCode, mobileOnly: true },
];

const FEATURED_META = {
  tech: { labelKey: 'community.tab_tech', fallback: '技术分享', icon: BookOpen, tone: 'orange' },
  help: { labelKey: 'community.tab_help_qa', fallback: '求助问答', icon: HelpCircle, tone: 'amber' },
  materials: { labelKey: 'community.tab_materials', fallback: '期末资料', icon: FileStack, tone: 'emerald' },
  news: { labelKey: 'community.tab_news_hot', fallback: '新闻热点', icon: Newspaper, tone: 'blue' },
  team: { labelKey: 'community.tab_team_collab', fallback: '组队协作', icon: Users, tone: 'violet' },
};

const toneClasses = {
  orange: {
    badge: 'bg-orange-500/12 text-orange-300 border-orange-400/20',
    dayBadge: 'bg-orange-50 text-orange-700 border-orange-200',
    hover: 'group-hover:text-orange-300',
    dayHover: 'group-hover:text-orange-700',
  },
  amber: {
    badge: 'bg-amber-500/12 text-amber-300 border-amber-400/20',
    dayBadge: 'bg-amber-50 text-amber-700 border-amber-200',
    hover: 'group-hover:text-amber-300',
    dayHover: 'group-hover:text-amber-700',
  },
  emerald: {
    badge: 'bg-emerald-500/12 text-emerald-300 border-emerald-400/20',
    dayBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    hover: 'group-hover:text-emerald-300',
    dayHover: 'group-hover:text-emerald-700',
  },
  blue: {
    badge: 'bg-sky-500/12 text-sky-300 border-sky-400/20',
    dayBadge: 'bg-sky-50 text-sky-700 border-sky-200',
    hover: 'group-hover:text-sky-300',
    dayHover: 'group-hover:text-sky-700',
  },
  violet: {
    badge: 'bg-violet-500/12 text-violet-300 border-violet-400/20',
    dayBadge: 'bg-violet-50 text-violet-700 border-violet-200',
    hover: 'group-hover:text-violet-300',
    dayHover: 'group-hover:text-violet-700',
  },
};

const toDateValue = (item) => item?.updated_at || item?.created_at || item?.published_at || item?.date || '';

const formatFeaturedDate = (value, language) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const locale = String(language || '').startsWith('zh') ? 'zh-CN' : 'en';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
};

const getExcerpt = (item) => String(item?.excerpt || item?.content || item?.description || '').replace(/<[^>]+>/g, '').slice(0, 120);

const isPublishableTab = (tab) => ['featured', 'tech', 'help', 'materials', 'news', 'team'].includes(tab);
const MOBILE_COMMUNITY_QUERY = '(max-width: 1279px)';
const MOBILE_ONLY_TABS = new Set(POST_TABS.filter((tab) => tab.mobileOnly).map((tab) => tab.key));

const CommunityPosts = ({ headingCode, headingTitle }) => {
  const { t, i18n } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isDayMode = uiMode === 'day';
  const [searchParams, setSearchParams] = useSearchParams();
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [composerState, setComposerState] = useState({ open: false, boardKey: 'help' });
  const [isMobileCommunity, setIsMobileCommunity] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MOBILE_COMMUNITY_QUERY).matches;
  });

  const rawTab = searchParams.get('postTab') === 'project' ? 'tech' : searchParams.get('postTab') || 'featured';
  const requestedTab = POST_TABS.some((tb) => tb.key === rawTab) ? rawTab : 'featured';
  const activeTab = !isMobileCommunity && MOBILE_ONLY_TABS.has(requestedTab) ? 'featured' : requestedTab;

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_COMMUNITY_QUERY);
    const handleChange = () => setIsMobileCommunity(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const techFeatured = useCachedResource('/articles', { page: 1, limit: 3, category: 'tech', sort: 'newest', status: 'approved' }, { keyPrefix: 'cache:v5:', dependencies: [] });
  const helpFeatured = useCachedResource('/community/posts', { page: 1, limit: 3, section: 'help', sort: 'newest' }, { keyPrefix: 'cache:v5:', dependencies: [] });
  const materialsFeatured = useCachedResource('/community/posts', { page: 1, limit: 3, section: 'materials', sort: 'newest' }, { keyPrefix: 'cache:v5:', dependencies: [] });
  const newsFeatured = useCachedResource('/news', { page: 1, limit: 3, sort: 'latest', status: 'approved' }, { keyPrefix: 'cache:v5:', dependencies: [] });
  const teamFeatured = useCachedResource('/community/posts', { page: 1, limit: 3, section: 'team', sort: 'newest' }, { keyPrefix: 'cache:v5:', dependencies: [] });

  const featuredResources = useMemo(() => [
    { board: 'tech', resource: techFeatured },
    { board: 'help', resource: helpFeatured },
    { board: 'materials', resource: materialsFeatured },
    { board: 'news', resource: newsFeatured },
    { board: 'team', resource: teamFeatured },
  ], [helpFeatured, materialsFeatured, newsFeatured, teamFeatured, techFeatured]);

  const featuredItems = useMemo(() => featuredResources
    .flatMap(({ board, resource }) => (Array.isArray(resource.data) ? resource.data : []).map((item) => ({ ...item, board, sortDate: toDateValue(item) })))
    .sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0))
    .slice(0, 8), [featuredResources]);

  const featuredLoading = featuredResources.some(({ resource }) => resource.loading) && featuredItems.length === 0;
  const featuredError = featuredResources.every(({ resource }) => resource.error);

  const handleTabChange = useCallback(
    (tab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          ['id', 'post', 'news', 'group'].forEach((key) => next.delete(key));
          if (tab === 'featured') {
            next.delete('postTab');
          } else {
            next.set('postTab', tab);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleOpenTypePicker = useCallback(() => {
    setTypePickerOpen(true);
  }, []);

  const handleSelectPostType = useCallback((boardKey) => {
    setTypePickerOpen(false);
    if (!isPublishableTab(boardKey)) {
      handleTabChange(boardKey);
      return;
    }
    if (!user) {
      toast.error(t('auth.signin_required'));
      return;
    }
    const nextBoardKey = boardKey === 'project' ? 'tech' : boardKey;
    handleTabChange(nextBoardKey);
    setComposerState({ open: true, boardKey: nextBoardKey });
  }, [handleTabChange, t, user]);

  const handleComposerClose = useCallback(() => {
    setComposerState((prev) => ({ ...prev, open: false }));
  }, []);

  const handleComposerSuccess = useCallback(() => {
    window.dispatchEvent(new CustomEvent('community-feed-refresh', { detail: { boardKey: composerState.boardKey } }));
  }, [composerState.boardKey]);

  const handleOpenFeatured = useCallback((item) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        ['id', 'post', 'news', 'group'].forEach((key) => next.delete(key));
        next.set('postTab', item.board);
        if (item.board === 'tech') next.set('id', item.id);
        else if (item.board === 'news') next.set('news', item.id);
        else next.set('post', item.id);
        return next;
      },
      { replace: false },
    );
  }, [setSearchParams]);

  const refreshFeatured = useCallback(() => {
    featuredResources.forEach(({ resource }) => resource.refresh({ clearCache: true }));
  }, [featuredResources]);

  const renderFeatured = () => (
    <div className="space-y-4">
      {featuredLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <div key={index} className={`h-36 animate-pulse rounded-lg border ${isDayMode ? 'border-slate-200 bg-white/70' : 'border-white/10 bg-white/[0.04]'}`} />
          ))}
        </div>
      ) : featuredError ? (
        <div className={`rounded-lg border p-6 text-center ${isDayMode ? 'border-slate-200 bg-white text-slate-600' : 'border-white/10 bg-white/[0.035] text-gray-300'}`}>
          <p className="text-sm">{t('community.featured_load_failed', '精选内容加载失败')}</p>
          <button type="button" onClick={refreshFeatured} className={`mt-4 rounded-lg border px-4 py-2 text-sm font-semibold ${isDayMode ? 'border-slate-200 hover:bg-slate-50' : 'border-white/10 hover:bg-white/10'}`}>
            {t('common.retry', '重试')}
          </button>
        </div>
      ) : featuredItems.length === 0 ? (
        <div className={`rounded-lg border border-dashed p-10 text-center ${isDayMode ? 'border-slate-200 bg-white/70 text-slate-500' : 'border-white/10 bg-white/[0.03] text-gray-400'}`}>
          <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-35" />
          <p className="font-bold">{t('community.featured_empty', '暂无精选内容')}</p>
          <p className="mt-1 text-sm">{t('community.featured_empty_desc', '切换分类查看最新内容，或发布第一条社区动态。')}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {featuredItems.map((item) => {
            const meta = FEATURED_META[item.board] || FEATURED_META.help;
            const Icon = meta.icon;
            const tone = toneClasses[meta.tone] || toneClasses.amber;
            const metric = item.board === 'news'
              ? `${Number(item.hot_score || 0)} ${t('community.hot_metric', '热度')}`
              : `${Number(item.comments_count || item.likes || item.likes_count || 0)} ${item.board === 'tech' ? t('community.likes_metric', '赞') : t('community.replies_metric', '回复')}`;
            return (
              <button
                key={`${item.board}-${item.id}`}
                type="button"
                onClick={() => handleOpenFeatured(item)}
                className={`group min-h-[142px] rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 md:p-5 ${isDayMode ? 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]' : 'border-white/10 bg-white/[0.045] hover:border-white/18 hover:bg-white/[0.07]'}`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${isDayMode ? tone.dayBadge : tone.badge}`}>
                    <Icon size={13} />
                    {t(meta.labelKey, meta.fallback)}
                  </span>
                  <span className={`text-xs ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {formatFeaturedDate(item.sortDate, i18n.language)}
                  </span>
                </div>
                <h3 className={`line-clamp-2 text-base font-black leading-snug transition-colors md:text-lg ${isDayMode ? `text-slate-950 ${tone.dayHover}` : `text-white ${tone.hover}`}`}>
                  {item.title || t('community.untitled', '未命名')}
                </h3>
                <p className={`mt-2 line-clamp-2 text-sm leading-6 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  {getExcerpt(item)}
                </p>
                <div className={`mt-3 flex items-center gap-2 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
                  <MessageCircle size={13} />
                  <span>{metric}</span>
                  {(item.author_name || item.source_name) ? <span className="truncate">· {item.author_name || item.source_name}</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative">
      {(headingCode || headingTitle) ? (
        <div className="mb-3 flex flex-col gap-3 md:mb-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            {headingCode ? (
              <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${isDayMode ? 'text-violet-700' : 'text-cyan-300'}`}>
                {headingCode}
              </div>
            ) : null}
            {headingTitle ? (
              <h2 className={`mt-0.5 text-lg font-black md:mt-1 md:text-2xl ${isDayMode ? 'text-slate-950' : 'text-white'}`}>
                {headingTitle}
              </h2>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleOpenTypePicker}
            className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-black transition-all active:scale-95 md:self-center ${
              isDayMode
                ? 'border-violet-200 bg-violet-600 text-white shadow-[0_10px_24px_rgba(124,58,237,0.18)] hover:bg-violet-700'
                : 'border-orange-300/40 bg-orange-400 text-slate-950 shadow-[0_0_28px_rgba(251,146,60,0.18)] hover:bg-orange-300'
            }`}
          >
            <PenLine size={18} />
            {t('community.post_new', '发帖')}
          </button>
        </div>
      ) : null}
      <div className={`mb-4 rounded-lg border p-4 md:mb-6 md:p-5 ${
        isDayMode
          ? 'border-slate-200/80 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.04)]'
          : 'border-white/10 bg-white/[0.035]'
      }`}>
        <div className={`scrollbar-none flex gap-1 overflow-x-auto rounded-lg border p-1 ${isDayMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/15'}`}>
          {POST_TABS.map(({ key, labelKey, fallback, icon: Icon, mobileOnly }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTabChange(key)}
              className={`inline-flex min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-colors md:flex-1 ${
                mobileOnly ? 'xl:hidden' : ''
              } ${
                activeTab === key
                  ? isDayMode
                    ? 'border-violet-200 bg-violet-50 text-violet-700 shadow-[0_4px_12px_rgba(124,58,237,0.08)]'
                    : 'border-orange-300/50 bg-orange-400 text-slate-950'
                  : isDayMode
                    ? 'border-transparent text-slate-600 hover:bg-white hover:text-violet-700'
                    : 'border-transparent text-gray-300 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon size={14} />
              {t(labelKey, fallback)}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'featured' ? renderFeatured() : null}
      {activeTab === 'tech' ? <CommunityTech hideNewPostButton /> : null}
      {activeTab === 'help' ? <CommunityHelp hideNewPostButton /> : null}
      {activeTab === 'materials' ? <CommunityMaterials /> : null}
      {activeTab === 'news' ? <CommunityNewsBoard hideNewPostButton /> : null}
      {activeTab === 'team' ? <CommunityTeam hideNewPostButton /> : null}
      {activeTab === 'podcast' ? (
        <div id="community-podcast-mobile" className="xl:hidden">
          <Music embedded singleColumn />
        </div>
      ) : null}
      {activeTab === 'groups' ? (
        <div id="community-groups-mobile" className="xl:hidden">
          <CommunityGroups />
        </div>
      ) : null}

      <CommunityPostTypePicker
        isOpen={typePickerOpen}
        activeType={isPublishableTab(activeTab) && activeTab !== 'featured' ? activeTab : 'tech'}
        onSelect={handleSelectPostType}
        onClose={() => setTypePickerOpen(false)}
      />

      <UnifiedCommunityComposer
        isOpen={composerState.open}
        boardKey={composerState.boardKey}
        onClose={handleComposerClose}
        onSuccess={handleComposerSuccess}
      />
    </div>
  );
};

export default CommunityPosts;
