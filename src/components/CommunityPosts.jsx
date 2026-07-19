import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Bot,
  ChevronRight,
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

const LEVELS = [
  {
    key: 'basic',
    titleKey: 'community_learning.level_basic',
    titleFallback: '基础',
    descKey: 'community_learning.level_basic_desc',
    descFallback: '先建立概念和最小可用方法。',
  },
  {
    key: 'advanced',
    titleKey: 'community_learning.level_advanced',
    titleFallback: '进阶',
    descKey: 'community_learning.level_advanced_desc',
    descFallback: '继续理解工程方法和系统取舍。',
  },
  {
    key: 'expert',
    titleKey: 'community_learning.level_expert',
    titleFallback: '高阶',
    descKey: 'community_learning.level_expert_desc',
    descFallback: '阅读复杂案例、安全边界和生产经验。',
  },
];

const CHAPTERS = [
  {
    key: 'basics',
    icon: Sparkles,
    tone: 'violet',
    titleKey: 'community_learning.chapter_basics_title',
    titleFallback: 'AI 基础',
    summaryKey: 'community_learning.chapter_basics_summary',
    summaryFallback: '从模型概念、参数设置和第一步实践开始，建立 AI 入门的共同语言。',
    topicsKey: 'community_learning.chapter_basics_topics',
    topicsFallback: '模型参数 / 推理方式 / 平台入门 / 基础实践',
    keywords: ['温度', 'top-p', '采样', '模型', '数据集', '推理', '基础', '入门'],
  },
  {
    key: 'prompt',
    icon: Tag,
    tone: 'blue',
    titleKey: 'community_learning.chapter_prompt_title',
    titleFallback: 'Prompt 实战',
    summaryKey: 'community_learning.chapter_prompt_summary',
    summaryFallback: '学会把需求说清楚，并让模型稳定输出可直接使用的结果。',
    topicsKey: 'community_learning.chapter_prompt_topics',
    topicsFallback: '提示词 / Few-shot / JSON 输出 / 版本管理',
    keywords: ['prompt', '提示词', 'few-shot', 'json', '结构化', 'schema', '思维链'],
  },
  {
    key: 'rag',
    icon: Layers,
    tone: 'emerald',
    titleKey: 'community_learning.chapter_rag_title',
    titleFallback: 'RAG 知识库',
    summaryKey: 'community_learning.chapter_rag_summary',
    summaryFallback: '从上下文、长文档、Embedding 到向量库，学习让 AI 读资料、查资料、引用资料。',
    topicsKey: 'community_learning.chapter_rag_topics',
    topicsFallback: '上下文 / 长文档 / Embedding / 向量库 / RAG 评测',
    keywords: ['rag', '上下文', 'context', '长文档', 'embedding', '向量库', '知识库', '幻觉'],
  },
  {
    key: 'agent',
    icon: Bot,
    tone: 'amber',
    titleKey: 'community_learning.chapter_agent_title',
    titleFallback: 'Agent 工作流',
    summaryKey: 'community_learning.chapter_agent_summary',
    summaryFallback: '从工具调用、记忆、人机协同到自动化执行，理解 Agent 如何稳定做事。',
    topicsKey: 'community_learning.chapter_agent_topics',
    topicsFallback: '工具调用 / MCP / 记忆 / HITL / 自动化 / 可观测性',
    keywords: ['agent', 'mcp', '工具调用', '记忆', 'human-in-the-loop', '自动化', '工作流', '可观测'],
  },
  {
    key: 'launch',
    icon: Gauge,
    tone: 'rose',
    titleKey: 'community_learning.chapter_launch_title',
    titleFallback: '评测与上线',
    summaryKey: 'community_learning.chapter_launch_summary',
    summaryFallback: '把能跑的 AI 应用变成可靠、安全、成本可控、可持续改进的产品。',
    topicsKey: 'community_learning.chapter_launch_topics',
    topicsFallback: '评测集 / LLM-as-judge / 安全 / 成本 / 缓存 / 反馈',
    keywords: ['评测', 'eval', 'judge', '安全', '审计', '上线', '生产', '成本', '缓存', '反馈'],
  },
  {
    key: 'cases',
    icon: Wrench,
    tone: 'violet',
    titleKey: 'community_learning.chapter_cases_title',
    titleFallback: '高阶案例',
    summaryKey: 'community_learning.chapter_cases_summary',
    summaryFallback: '把前面的能力放进真实复杂场景，阅读垂直领域、复杂编排和系统边界案例。',
    topicsKey: 'community_learning.chapter_cases_topics',
    topicsFallback: '科研 Agent / Lean / AlphaZero / 多 Agent / 安全架构 / 自动化管线',
    keywords: ['计算化学', 'lean', 'alphazero', '黑白棋', '支付防火墙', 'harness', 'subagent', 'gaussian', '托尔斯泰', '量化'],
  },
];

const ARTICLE_LEARNING_ROUTE = {
  65: { chapterKey: 'cases', levelKey: 'expert' },
  64: { chapterKey: 'cases', levelKey: 'expert' },
  63: { chapterKey: 'cases', levelKey: 'expert' },
  62: { chapterKey: 'cases', levelKey: 'expert' },
  61: { chapterKey: 'cases', levelKey: 'advanced' },
  60: { chapterKey: 'rag', levelKey: 'basic' },
  59: { chapterKey: 'agent', levelKey: 'expert' },
  58: { chapterKey: 'prompt', levelKey: 'basic' },
  57: { chapterKey: 'launch', levelKey: 'advanced' },
  56: { chapterKey: 'launch', levelKey: 'advanced' },
  55: { chapterKey: 'rag', levelKey: 'expert' },
  54: { chapterKey: 'launch', levelKey: 'expert' },
  53: { chapterKey: 'launch', levelKey: 'advanced' },
  52: { chapterKey: 'basics', levelKey: 'basic' },
  51: { chapterKey: 'rag', levelKey: 'advanced' },
  50: { chapterKey: 'cases', levelKey: 'advanced' },
  49: { chapterKey: 'rag', levelKey: 'advanced' },
  48: { chapterKey: 'rag', levelKey: 'advanced' },
  47: { chapterKey: 'launch', levelKey: 'advanced' },
  46: { chapterKey: 'launch', levelKey: 'basic' },
  45: { chapterKey: 'prompt', levelKey: 'advanced' },
  44: { chapterKey: 'rag', levelKey: 'expert' },
  43: { chapterKey: 'agent', levelKey: 'basic' },
  42: { chapterKey: 'rag', levelKey: 'basic' },
  41: { chapterKey: 'cases', levelKey: 'advanced' },
  40: { chapterKey: 'basics', levelKey: 'advanced' },
  39: { chapterKey: 'cases', levelKey: 'advanced' },
  38: { chapterKey: 'launch', levelKey: 'advanced' },
  37: { chapterKey: 'agent', levelKey: 'advanced' },
  36: { chapterKey: 'launch', levelKey: 'advanced' },
  35: { chapterKey: 'agent', levelKey: 'advanced' },
  34: { chapterKey: 'agent', levelKey: 'advanced' },
  33: { chapterKey: 'basics', levelKey: 'basic' },
  32: { chapterKey: 'prompt', levelKey: 'basic' },
  31: { chapterKey: 'rag', levelKey: 'advanced' },
  30: { chapterKey: 'agent', levelKey: 'expert' },
  29: { chapterKey: 'launch', levelKey: 'basic' },
  28: { chapterKey: 'cases', levelKey: 'expert' },
  27: { chapterKey: 'agent', levelKey: 'basic' },
  26: { chapterKey: 'rag', levelKey: 'basic' },
  25: { chapterKey: 'prompt', levelKey: 'advanced' },
  24: { chapterKey: 'launch', levelKey: 'expert' },
  23: { chapterKey: 'agent', levelKey: 'basic' },
  22: { chapterKey: 'launch', levelKey: 'expert' },
  21: { chapterKey: 'launch', levelKey: 'expert' },
  20: { chapterKey: 'agent', levelKey: 'advanced' },
  19: { chapterKey: 'cases', levelKey: 'advanced' },
};

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
  if (String(item?.title || '').includes('安全提醒')) return false;
  if (ARTICLE_LEARNING_ROUTE[Number(item?.id)]) return true;
  const text = getText(item);
  return LEARNING_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
};

const classifyChapter = (item) => {
  const explicit = ARTICLE_LEARNING_ROUTE[Number(item?.id)];
  if (explicit?.chapterKey) return explicit.chapterKey;
  const text = getText(item);
  const matched = CHAPTERS.find((chapter) =>
    chapter.keywords.some((keyword) => text.includes(keyword.toLowerCase())),
  );
  return matched?.key || 'cases';
};

const classifyLevel = (item) => {
  const explicit = ARTICLE_LEARNING_ROUTE[Number(item?.id)];
  if (explicit?.levelKey) return explicit.levelKey;
  const text = getText(item);
  if (['安全', '审计', '防御', '生产', '上线', '成本', '缓存', '可观测', '失败', 'harness', 'lean', 'alphazero'].some((keyword) => text.includes(keyword.toLowerCase()))) {
    return 'expert';
  }
  if (['工程', '系统', '架构', 'rag', 'agent', '自动化', '评测', '向量库', 'embedding'].some((keyword) => text.includes(keyword.toLowerCase()))) {
    return 'advanced';
  }
  return 'basic';
};

const formatDate = (value, language) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const locale = String(language || '').startsWith('zh') ? 'zh-CN' : 'en';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
};

const LearningCard = ({ item, chapter, level, isDayMode, onOpen, t, language }) => {
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
        {level ? (
          <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${isDayMode ? 'bg-slate-100 text-slate-600' : 'bg-white/[0.07] text-gray-300'}`}>
            {t(level.titleKey, level.titleFallback)}
          </span>
        ) : null}
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
  const [expandedChapterKey, setExpandedChapterKey] = useState(searchParams.get('lesson') || 'basics');

  const activeChapterKey = CHAPTERS.some((chapter) => chapter.key === searchParams.get('lesson'))
    ? searchParams.get('lesson')
    : 'basics';
  const activeLevelKey = LEVELS.some((level) => level.key === searchParams.get('level'))
    ? searchParams.get('level')
    : '';
  const activeChapter = CHAPTERS.find((chapter) => chapter.key === activeChapterKey) || CHAPTERS[0];
  const chapterTone = toneClasses[activeChapter.tone] || toneClasses.violet;
  const ActiveIcon = activeChapter.icon;

  const articleResource = useCachedResource(
    '/articles',
    { page: 1, limit: 100, category: 'tech', sort: 'newest', status: 'approved' },
    { keyPrefix: 'cache:v8:learning-community:', dependencies: [] },
  );

  const articles = useMemo(() => {
    const rows = Array.isArray(articleResource.data) ? articleResource.data : [];
    return rows
      .map(normalizeArticle)
      .filter(isLearningArticle)
      .map((item) => ({
        ...item,
        chapterKey: classifyChapter(item),
        levelKey: classifyLevel(item),
      }))
      .sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0));
  }, [articleResource.data]);

  const articlesByChapter = useMemo(() => {
    const map = Object.fromEntries(CHAPTERS.map((chapter) => [chapter.key, []]));
    articles.forEach((item) => {
      const key = map[item.chapterKey] ? item.chapterKey : 'cases';
      map[key].push(item);
    });
    return map;
  }, [articles]);

  const levelGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const chapterItems = articlesByChapter[activeChapterKey] || [];
    const filteredItems = query
      ? chapterItems.filter((item) => getText(item).includes(query))
      : chapterItems;

    return LEVELS
      .filter((level) => !activeLevelKey || level.key === activeLevelKey)
      .map((level) => ({
        ...level,
        items: filteredItems.filter((item) => item.levelKey === level.key),
      }));
  }, [activeChapterKey, activeLevelKey, articlesByChapter, searchQuery]);

  const visibleArticlesCount = useMemo(
    () => levelGroups.reduce((sum, level) => sum + level.items.length, 0),
    [levelGroups],
  );

  const articlesByChapterAndLevel = useMemo(() => {
    const map = Object.fromEntries(
      CHAPTERS.map((chapter) => [
        chapter.key,
        Object.fromEntries(LEVELS.map((level) => [level.key, 0])),
      ]),
    );
    articles.forEach((item) => {
      if (map[item.chapterKey]?.[item.levelKey] !== undefined) {
        map[item.chapterKey][item.levelKey] += 1;
      }
    });
    return map;
  }, [articles]);

  const handleChapterChange = useCallback((chapterKey, levelKey = '') => {
    setExpandedChapterKey(chapterKey);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('area', 'learn');
      next.set('lesson', chapterKey);
      if (levelKey) {
        next.set('level', levelKey);
      } else {
        next.delete('level');
      }
      next.delete('postTab');
      next.delete('id');
      next.delete('post');
      return next;
    }, { replace: false });
  }, [setSearchParams]);

  const toggleChapterLevels = useCallback((chapterKey) => {
    if (expandedChapterKey === chapterKey) {
      setExpandedChapterKey('');
      return;
    }

    setExpandedChapterKey(chapterKey);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('area', 'learn');
      next.set('lesson', chapterKey);
      next.delete('level');
      next.delete('postTab');
      next.delete('id');
      next.delete('post');
      return next;
    }, { replace: false });
  }, [expandedChapterKey, setSearchParams]);

  const handleOpenArticle = useCallback((item) => {
    setSelectedArticle(item);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('area', 'learn');
      next.set('lesson', item.chapterKey || activeChapterKey);
      next.set('level', item.levelKey || activeLevelKey || 'basic');
      next.set('id', item.id);
      next.delete('post');
      return next;
    }, { replace: false });
  }, [activeChapterKey, activeLevelKey, setSearchParams]);

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
              const expanded = chapter.key === expandedChapterKey;
              const tone = toneClasses[chapter.tone] || toneClasses.violet;
              return (
                  <div
                    key={chapter.key}
                    className={`rounded-lg border transition-all duration-200 ${
                      expanded
                        ? isDayMode
                          ? 'border-slate-200 bg-slate-50/80 shadow-sm'
                          : 'border-white/10 bg-white/[0.055] shadow-[0_14px_34px_rgba(0,0,0,0.22)]'
                        : 'border-transparent'
                    }`}
                  >
                    <div
                      className={`flex w-full items-center rounded-md border transition-colors ${
                        active
                          ? isDayMode
                            ? tone.card
                            : tone.nightCard
                          : isDayMode
                            ? 'border-transparent text-slate-600 hover:bg-slate-50'
                            : 'border-transparent text-gray-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleChapterChange(chapter.key)}
                        className="flex min-h-[58px] min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
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
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={t('community_learning.toggle_levels', '展开难度')}
                        onClick={() => toggleChapterLevels(chapter.key)}
                        className={`mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                          isDayMode
                            ? 'text-slate-500 hover:bg-white/70 hover:text-slate-900'
                            : 'text-gray-400 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        <ChevronRight size={15} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className={`mx-2 mb-2 mt-1 rounded-md border p-1.5 ${
                          isDayMode
                            ? 'border-white bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]'
                            : 'border-white/[0.08] bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                        }`}>
                        {LEVELS.map((level) => {
                          const levelActive = activeLevelKey === level.key;
                          const count = articlesByChapterAndLevel[chapter.key]?.[level.key] || 0;
                          return (
                            <button
                              key={level.key}
                              type="button"
                              onClick={() => handleChapterChange(chapter.key, level.key)}
                              className={`group flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-bold transition-all ${
                                levelActive
                                  ? isDayMode
                                    ? 'bg-slate-950 text-white shadow-sm'
                                    : 'bg-white text-slate-950 shadow-[0_8px_20px_rgba(0,0,0,0.2)]'
                                  : isDayMode
                                    ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                                    : 'text-gray-400 hover:bg-white/[0.07] hover:text-white'
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                  levelActive
                                    ? isDayMode
                                      ? 'bg-cyan-300'
                                      : 'bg-cyan-500'
                                    : isDayMode
                                      ? 'bg-slate-300 group-hover:bg-slate-500'
                                      : 'bg-white/20 group-hover:bg-white/45'
                                }`} />
                                <span>{t(level.titleKey, level.titleFallback)}</span>
                              </span>
                              <span className={`rounded px-1.5 py-0.5 text-[11px] ${
                                levelActive
                                  ? isDayMode
                                    ? 'bg-white/15 text-white/80'
                                    : 'bg-slate-950/10 text-slate-700'
                                  : isDayMode
                                    ? 'bg-slate-100 text-slate-500'
                                    : 'bg-white/[0.06] text-gray-400'
                              }`}>{count}</span>
                            </button>
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  </div>
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

        <div className="mt-5 space-y-5">
          {articleResource.loading && visibleArticlesCount === 0 ? (
            [0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className={`h-44 animate-pulse rounded-lg border ${isDayMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.05]'}`}
              />
            ))
          ) : articleResource.error ? (
            <div className={`rounded-lg border p-5 ${isDayMode ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-rose-400/20 bg-rose-400/10 text-rose-100'}`}>
              {t('community_learning.load_failed', '学习资源加载失败，请稍后重试。')}
            </div>
          ) : visibleArticlesCount > 0 ? (
            levelGroups.map((level) => (
              level.items.length > 0 ? (
                <section key={level.key} className="space-y-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className={`text-lg font-black ${isDayMode ? 'text-slate-950' : 'text-white'}`}>
                        {t(level.titleKey, level.titleFallback)}
                      </h3>
                      <p className={`mt-1 text-sm ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        {t(level.descKey, level.descFallback)}
                      </p>
                    </div>
                    <span className={`text-xs font-bold ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
                      {t('community_learning.level_count', { count: level.items.length, defaultValue: '{{count}} 篇' })}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {level.items.map((item) => (
                      <LearningCard
                        key={item.id}
                        item={item}
                        chapter={CHAPTERS.find((chapter) => chapter.key === item.chapterKey)}
                        level={level}
                        isDayMode={isDayMode}
                        onOpen={handleOpenArticle}
                        t={t}
                        language={i18n.language}
                      />
                    ))}
                  </div>
                </section>
              ) : null
            ))
          ) : (
            <div className={`rounded-lg border border-dashed p-8 text-center ${isDayMode ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-white/10 bg-white/[0.03] text-gray-400'}`}>
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
