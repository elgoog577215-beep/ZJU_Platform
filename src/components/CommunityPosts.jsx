import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Clock3,
  FileStack,
  Gauge,
  Layers,
  MessageCircle,
  Search,
  Sparkles,
  Tag,
  Wrench,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useCachedResource } from '../hooks/useCachedResource';
import CommunityDetailModal from './CommunityDetailModal';
import CommunityHelp from './CommunityHelp';
import CommunityMaterials from './CommunityMaterials';
import CommunitySearchInput from './CommunitySearchInput';
import { calculateReadingTime, parseContentBlocks } from './communityUtils';

const AREAS = [
  {
    key: 'learn',
    icon: BookOpen,
    tone: 'violet',
    titleKey: 'community_learning.area_learn_title',
    titleFallback: '学习区',
    descKey: 'community_learning.area_learn_desc',
    descFallback: '按章节学习 AI 教程、笔记和实践方法。',
  },
  {
    key: 'resources',
    icon: FileStack,
    tone: 'emerald',
    titleKey: 'community_learning.area_resources_title',
    titleFallback: '资源区',
    descKey: 'community_learning.area_resources_desc',
    descFallback: '沉淀课程资料、复习文档和学习链接。',
  },
  {
    key: 'discuss',
    icon: MessageCircle,
    tone: 'amber',
    titleKey: 'community_learning.area_discuss_title',
    titleFallback: '讨论区',
    descKey: 'community_learning.area_discuss_desc',
    descFallback: '发起讨论、提出问题，和同学一起交流。',
  },
];

const LEGACY_TAB_TO_AREA = {
  tech: 'learn',
  featured: 'learn',
  materials: 'resources',
  help: 'discuss',
  news: 'learn',
  team: 'discuss',
  groups: 'discuss',
  project: 'learn',
};

const LEARNING_KEYWORDS = [
  'ai',
  'agent',
  'prompt',
  'context',
  'rag',
  'llm',
  'model',
  'workflow',
  'tutorial',
  'guide',
  'note',
  'notes',
  'learn',
  'study',
  '提示词',
  '上下文',
  '智能体',
  '大模型',
  '模型',
  '教程',
  '笔记',
  '学习',
  '实践',
  '案例',
  '工具',
  '评测',
];

const CHAPTERS = [
  {
    key: 'prompt',
    icon: Sparkles,
    tone: 'violet',
    titleKey: 'community_learning.chapter_prompt_title',
    titleFallback: '第一章 提示词',
    summaryKey: 'community_learning.chapter_prompt_summary',
    summaryFallback: '学习如何把目标、约束、上下文和输出格式交代清楚。',
    topicsKey: 'community_learning.chapter_prompt_topics',
    topicsFallback: '角色设定 / 任务拆解 / 输出格式 / 迭代改写',
    keywords: ['prompt', '提示词', '指令', 'system', 'role'],
  },
  {
    key: 'context',
    icon: Layers,
    tone: 'blue',
    titleKey: 'community_learning.chapter_context_title',
    titleFallback: '第二章 上下文',
    summaryKey: 'community_learning.chapter_context_summary',
    summaryFallback: '理解上下文窗口、资料组织、引用证据和多轮记忆。',
    topicsKey: 'community_learning.chapter_context_topics',
    topicsFallback: '上下文工程 / 文档喂入 / 记忆边界 / 信息压缩',
    keywords: ['context', '上下文', 'memory', '记忆', 'document', '文档'],
  },
  {
    key: 'agent',
    icon: Bot,
    tone: 'emerald',
    titleKey: 'community_learning.chapter_agent_title',
    titleFallback: '第三章 Agent Loop',
    summaryKey: 'community_learning.chapter_agent_summary',
    summaryFallback: '把“思考、行动、观察、修正”组织成可持续执行的智能体循环。',
    topicsKey: 'community_learning.chapter_agent_topics',
    topicsFallback: '计划循环 / 工具调用 / 状态观察 / 失败恢复',
    keywords: ['agent', 'loop', '智能体', '工具调用', '规划', 'workflow'],
  },
  {
    key: 'tools',
    icon: Wrench,
    tone: 'amber',
    titleKey: 'community_learning.chapter_tools_title',
    titleFallback: '第四章 工具与工作流',
    summaryKey: 'community_learning.chapter_tools_summary',
    summaryFallback: '沉淀常用 AI 工具、自动化流程和项目实践方法。',
    topicsKey: 'community_learning.chapter_tools_topics',
    topicsFallback: '工具链 / 自动化 / 工作流 / 项目案例',
    keywords: ['tool', 'tools', '工具', 'workflow', '自动化', '实践', '案例'],
  },
  {
    key: 'evaluation',
    icon: Gauge,
    tone: 'rose',
    titleKey: 'community_learning.chapter_eval_title',
    titleFallback: '第五章 评测与改进',
    summaryKey: 'community_learning.chapter_eval_summary',
    summaryFallback: '用评测、复盘和案例对比判断 AI 输出是否真的可靠。',
    topicsKey: 'community_learning.chapter_eval_topics',
    topicsFallback: '质量评测 / 事实核验 / 复盘改进 / 安全边界',
    keywords: ['eval', 'evaluation', '评测', '测试', '复盘', '安全', '质量'],
  },
];

const toneClasses = {
  violet: {
    card: 'border-violet-200 bg-violet-50 text-violet-800',
    nightCard: 'border-violet-300/20 bg-violet-300/10 text-violet-100',
    accent: 'text-violet-600',
    nightAccent: 'text-violet-200',
  },
  blue: {
    card: 'border-sky-200 bg-sky-50 text-sky-800',
    nightCard: 'border-sky-300/20 bg-sky-300/10 text-sky-100',
    accent: 'text-sky-600',
    nightAccent: 'text-sky-200',
  },
  emerald: {
    card: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    nightCard: 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100',
    accent: 'text-emerald-600',
    nightAccent: 'text-emerald-200',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50 text-amber-800',
    nightCard: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
    accent: 'text-amber-600',
    nightAccent: 'text-amber-200',
  },
  rose: {
    card: 'border-rose-200 bg-rose-50 text-rose-800',
    nightCard: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
    accent: 'text-rose-600',
    nightAccent: 'text-rose-200',
  },
};

const getText = (item) => [
  item?.title,
  item?.excerpt,
  item?.description,
  item?.content,
  item?.tags,
].filter(Boolean).join(' ').toLowerCase();

const stripHtml = (value) => String(value || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const normalizeArticle = (item) => ({
  ...item,
  sourceType: 'article',
  sortDate: item?.updated_at || item?.created_at || item?.published_at || item?.date || '',
  excerpt: stripHtml(item?.excerpt || item?.description || item?.content).slice(0, 150),
});

const isLearningArticle = (item) => {
  const text = getText(item);
  return LEARNING_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
};

const classifyChapter = (item) => {
  const text = getText(item);
  const matched = CHAPTERS.find((chapter) =>
    chapter.keywords.some((keyword) => text.includes(keyword.toLowerCase())),
  );
  return matched?.key || 'tools';
};

const formatDate = (value, language) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const locale = String(language || '').startsWith('zh') ? 'zh-CN' : 'en';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
};

const LearningCard = ({ item, chapter, isDayMode, onOpen, t, language }) => {
  const tone = toneClasses[chapter?.tone || 'violet'] || toneClasses.violet;
  const Icon = chapter?.icon || BookOpen;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`group rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 md:p-5 ${
        isDayMode
          ? 'border-slate-200/80 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:shadow-[0_14px_32px_rgba(15,23,42,0.07)]'
          : 'border-white/10 bg-white/[0.045] hover:border-white/20 hover:bg-white/[0.07]'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${isDayMode ? tone.card : tone.nightCard}`}>
          <Icon size={13} />
          {t(chapter?.titleKey, chapter?.titleFallback || 'AI')}
        </span>
        <span className={`text-xs ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
          {formatDate(item.sortDate, language)}
        </span>
      </div>
      <h3 className={`line-clamp-2 text-base font-black leading-snug md:text-xl ${isDayMode ? 'text-slate-950' : 'text-white'}`}>
        {item.title || t('community.untitled', '未命名')}
      </h3>
      <p className={`mt-2 line-clamp-3 text-sm leading-6 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
        {item.excerpt || t('community_learning.no_excerpt', '暂无摘要，打开后查看完整内容。')}
      </p>
      <div className={`mt-4 flex flex-wrap items-center gap-2 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
        <span className="inline-flex items-center gap-1">
          <Clock3 size={12} />
          {calculateReadingTime(item.content || item.excerpt, t)}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 font-bold">
          {t('community_learning.open_resource', '阅读')}
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
};

const LearningArea = ({ isDayMode }) => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);

  const activeChapterKey = CHAPTERS.some((chapter) => chapter.key === searchParams.get('lesson'))
    ? searchParams.get('lesson')
    : 'prompt';
  const activeChapter = CHAPTERS.find((chapter) => chapter.key === activeChapterKey) || CHAPTERS[0];
  const chapterTone = toneClasses[activeChapter.tone] || toneClasses.violet;
  const ActiveIcon = activeChapter.icon;

  const articleResource = useCachedResource(
    '/articles',
    { page: 1, limit: 36, category: 'tech', sort: 'newest', status: 'approved' },
    { keyPrefix: 'cache:v7:learning-community:', dependencies: [] },
  );

  const articles = useMemo(() => {
    const rows = Array.isArray(articleResource.data) ? articleResource.data : [];
    return rows
      .map(normalizeArticle)
      .filter(isLearningArticle)
      .map((item) => ({ ...item, chapterKey: classifyChapter(item) }))
      .sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0));
  }, [articleResource.data]);

  const articlesByChapter = useMemo(() => {
    const map = Object.fromEntries(CHAPTERS.map((chapter) => [chapter.key, []]));
    articles.forEach((item) => {
      const key = map[item.chapterKey] ? item.chapterKey : 'tools';
      map[key].push(item);
    });
    return map;
  }, [articles]);

  const visibleArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const chapterItems = articlesByChapter[activeChapterKey] || [];
    if (!query) return chapterItems;
    return chapterItems.filter((item) => getText(item).includes(query));
  }, [activeChapterKey, articlesByChapter, searchQuery]);

  const handleChapterChange = useCallback((chapterKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('area', 'learn');
      next.set('lesson', chapterKey);
      next.delete('postTab');
      next.delete('id');
      next.delete('post');
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  const handleOpenArticle = useCallback((item) => {
    setSelectedArticle(item);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('area', 'learn');
      next.set('lesson', item.chapterKey || activeChapterKey);
      next.set('id', item.id);
      next.delete('post');
      return next;
    }, { replace: false });
  }, [activeChapterKey, setSearchParams]);

  const handleCloseArticle = useCallback(() => {
    setSelectedArticle(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('id');
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return;
    const match = articles.find((item) => String(item.id) === String(id));
    if (match) setSelectedArticle(match);
  }, [articles, searchParams]);

  return (
    <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-24 xl:self-start">
        <div className={`rounded-lg border p-3 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.04]'}`}>
          <div className={`mb-3 px-1 text-[11px] font-black uppercase tracking-[0.22em] ${isDayMode ? 'text-violet-700' : 'text-cyan-300'}`}>
            {t('community_learning.curriculum_label', 'AI LEARNING PATH')}
          </div>
          <div className="space-y-1.5">
            {CHAPTERS.map((chapter, index) => {
              const Icon = chapter.icon;
              const active = chapter.key === activeChapterKey;
              const tone = toneClasses[chapter.tone] || toneClasses.violet;
              return (
                <button
                  key={chapter.key}
                  type="button"
                  onClick={() => handleChapterChange(chapter.key)}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? isDayMode
                        ? tone.card
                        : tone.nightCard
                      : isDayMode
                        ? 'border-transparent text-slate-600 hover:bg-slate-50'
                        : 'border-transparent text-gray-300 hover:bg-white/[0.06]'
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${active ? 'bg-white/35' : isDayMode ? 'bg-slate-100' : 'bg-white/[0.06]'}`}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-black uppercase tracking-[0.16em] opacity-60">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="block truncate text-sm font-bold">
                      {t(chapter.titleKey, chapter.titleFallback)}
                    </span>
                  </span>
                  <span className="ml-auto text-xs opacity-70">{articlesByChapter[chapter.key]?.length || 0}</span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <section className={`min-w-0 rounded-lg border p-5 md:p-6 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.04]'}`}>
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className={`mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] ${isDayMode ? chapterTone.accent : chapterTone.nightAccent}`}>
              <ActiveIcon size={14} />
              {t(activeChapter.titleKey, activeChapter.titleFallback)}
            </div>
            <h2 className={`text-2xl font-black md:text-3xl ${isDayMode ? 'text-slate-950' : 'text-white'}`}>
              {t('community_learning.chapter_overview', '章节概览')}
            </h2>
            <p className={`mt-2 max-w-2xl text-sm leading-7 ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
              {t(activeChapter.summaryKey, activeChapter.summaryFallback)}
            </p>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${isDayMode ? chapterTone.card : chapterTone.nightCard}`}>
            <BookOpen size={14} />
            {t(activeChapter.topicsKey, activeChapter.topicsFallback)}
          </span>
        </div>

        <CommunitySearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder={t('community_learning.search_placeholder', '搜索本章教程、笔记和资料')}
          isDayMode={isDayMode}
        />

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {articleResource.loading && visibleArticles.length === 0 ? (
            [0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className={`h-44 animate-pulse rounded-lg border ${isDayMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.05]'}`}
              />
            ))
          ) : articleResource.error ? (
            <div className={`rounded-lg border p-5 md:col-span-2 ${isDayMode ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-rose-400/20 bg-rose-400/10 text-rose-100'}`}>
              {t('community_learning.load_failed', '学习资源加载失败，请稍后重试。')}
            </div>
          ) : visibleArticles.length > 0 ? (
            visibleArticles.map((item) => (
              <LearningCard
                key={item.id}
                item={item}
                chapter={CHAPTERS.find((chapter) => chapter.key === item.chapterKey)}
                isDayMode={isDayMode}
                onOpen={handleOpenArticle}
                t={t}
                language={i18n.language}
              />
            ))
          ) : (
            <div className={`rounded-lg border border-dashed p-8 text-center md:col-span-2 ${isDayMode ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-white/10 bg-white/[0.03] text-gray-400'}`}>
              <Search className="mx-auto mb-3 h-9 w-9 opacity-45" />
              <p className="font-bold">{t('community_learning.empty_title', '本章暂时没有匹配的学习资料')}</p>
              <p className="mt-1 text-sm">{t('community_learning.empty_desc', '已自动隐藏求助、组队、新闻和无关内容，只保留教程、笔记和学习资源。')}</p>
            </div>
          )}
        </div>
      </section>

      {selectedArticle ? (
        <CommunityDetailModal
          item={selectedArticle}
          onClose={handleCloseArticle}
          isDayMode={isDayMode}
          gradientFrom={isDayMode ? 'from-slate-100' : 'from-violet-900/40'}
          headerHeight="h-52 sm:h-64 md:h-80"
          coverImage={selectedArticle.cover}
          shareParam="id"
          contentBlocks={parseContentBlocks(selectedArticle.content_blocks)}
          htmlContent={selectedArticle.content}
          headerContent={(
            <>
              <div className={`mb-3 text-xs font-black uppercase tracking-[0.2em] ${isDayMode ? chapterTone.accent : chapterTone.nightAccent}`}>
                {t(CHAPTERS.find((chapter) => chapter.key === selectedArticle.chapterKey)?.titleKey, 'AI 学习')}
              </div>
              <h2 className={`text-2xl font-black leading-tight md:text-5xl ${isDayMode ? 'text-slate-950' : 'text-white drop-shadow-2xl'}`}>
                {selectedArticle.title}
              </h2>
            </>
          )}
        />
      ) : null}
    </div>
  );
};

const CommunityPosts = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const [searchParams, setSearchParams] = useSearchParams();

  const activeArea = useMemo(() => {
    const area = searchParams.get('area');
    if (AREAS.some((item) => item.key === area)) return area;
    return LEGACY_TAB_TO_AREA[searchParams.get('postTab')] || 'learn';
  }, [searchParams]);

  const handleAreaChange = useCallback((areaKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('area', areaKey);
      next.delete('tab');
      next.delete('postTab');
      next.delete('id');
      next.delete('post');
      next.delete('news');
      next.delete('group');
      if (areaKey !== 'learn') next.delete('lesson');
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  const activeAreaConfig = AREAS.find((area) => area.key === activeArea) || AREAS[0];

  return (
    <div className="space-y-5">
      <section className={`overflow-hidden rounded-lg border p-5 md:p-7 ${isDayMode ? 'border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.045)]' : 'border-white/10 bg-white/[0.045]'}`}>
        <div>
          <div className={`mb-4 inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${isDayMode ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-violet-300/20 bg-violet-300/10 text-violet-100'}`}>
            <Sparkles size={14} />
            {t('community_learning.zone_badge', 'Learning Community')}
          </div>
          <h1 className={`max-w-3xl text-3xl font-black leading-tight md:text-5xl ${isDayMode ? 'text-slate-950' : 'text-white'}`}>
            {t('community_learning.hero_title', '学习社区')}
          </h1>
        </div>
      </section>

      <nav className="grid gap-3 md:grid-cols-3" aria-label={t('community_learning.area_nav_label', '学习社区分区')}>
        {AREAS.map((area) => {
          const Icon = area.icon;
          const active = area.key === activeAreaConfig.key;
          const tone = toneClasses[area.tone] || toneClasses.violet;
          return (
            <button
              key={area.key}
              type="button"
              aria-pressed={active}
              onClick={() => handleAreaChange(area.key)}
              className={`min-h-[118px] rounded-lg border p-4 text-left transition-all ${
                active
                  ? isDayMode
                    ? `${tone.card} shadow-[0_12px_26px_rgba(15,23,42,0.06)]`
                    : tone.nightCard
                  : isDayMode
                    ? 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    : 'border-white/10 bg-white/[0.035] text-gray-300 hover:border-white/20 hover:bg-white/[0.06]'
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-md ${active ? 'bg-white/35' : isDayMode ? 'bg-slate-100' : 'bg-white/[0.06]'}`}>
                  <Icon size={19} />
                </span>
                {active ? <ArrowRight size={18} /> : null}
              </div>
              <div className="text-lg font-black">{t(area.titleKey, area.titleFallback)}</div>
              <p className="mt-1 text-sm leading-6 opacity-80">{t(area.descKey, area.descFallback)}</p>
            </button>
          );
        })}
      </nav>

      {activeArea === 'learn' ? <LearningArea isDayMode={isDayMode} /> : null}
      {activeArea === 'resources' ? <CommunityMaterials /> : null}
      {activeArea === 'discuss' ? <CommunityHelp discussionMode /> : null}
    </div>
  );
};

export default CommunityPosts;
