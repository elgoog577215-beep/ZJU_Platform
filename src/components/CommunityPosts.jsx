import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    tone: 'orange',
    titleKey: 'community_learning.area_learn_title',
    titleFallback: '学习区',
    descKey: 'community_learning.area_learn_desc',
    descFallback: '按章节学习 AI 教程、笔记和实践方法。',
  },
  {
    key: 'resources',
    icon: FileStack,
    tone: 'amber',
    titleKey: 'community_learning.area_resources_title',
    titleFallback: '资源区',
    descKey: 'community_learning.area_resources_desc',
    descFallback: '沉淀课程资料、复习文档和学习链接。',
  },
  {
    key: 'discuss',
    icon: MessageCircle,
    tone: 'yellow',
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
    tone: 'amber',
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
    tone: 'orange',
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
    tone: 'yellow',
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
    tone: 'orange',
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
    tone: 'amber',
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
  65: { chapterKey: 'cases', levelKey: 'expert', order: 30, trackKey: 'ai-science-automation', trackOrder: 30 },
  64: { chapterKey: 'cases', levelKey: 'expert', order: 20, trackKey: 'agent-security', trackOrder: 30 },
  63: { chapterKey: 'cases', levelKey: 'expert', order: 10, trackKey: 'agent-workflow', trackOrder: 30 },
  62: { chapterKey: 'cases', levelKey: 'advanced', order: 40, trackKey: 'ai-science-automation', trackOrder: 20 },
  61: { chapterKey: 'cases', levelKey: 'basic', order: 20, trackKey: 'quant-cost-awareness', trackOrder: 10 },
  60: { chapterKey: 'rag', levelKey: 'basic', order: 20, trackKey: 'rag-engineering', trackOrder: 10 },
  59: { chapterKey: 'agent', levelKey: 'basic', order: 10, trackKey: 'multi-agent-orchestration', trackOrder: 10 },
  58: { chapterKey: 'prompt', levelKey: 'basic', order: 20, trackKey: 'prompt-practice', trackOrder: 20 },
  57: { chapterKey: 'launch', levelKey: 'basic', order: 10, trackKey: 'launch-reliability', trackOrder: 10 },
  56: { chapterKey: 'launch', levelKey: 'advanced', order: 30, trackKey: 'launch-reliability', trackOrder: 40 },
  55: { chapterKey: 'launch', levelKey: 'advanced', order: 20, trackKey: 'llm-app-selection', trackOrder: 20 },
  54: { chapterKey: 'launch', levelKey: 'advanced', order: 20, trackKey: 'agent-security', trackOrder: 20 },
  53: { chapterKey: 'launch', levelKey: 'advanced', order: 70, trackKey: 'eval-feedback', trackOrder: 20 },
  52: { chapterKey: 'basics', levelKey: 'basic', order: 10, trackKey: 'llm-parameters-reasoning', trackOrder: 10 },
  51: { chapterKey: 'rag', levelKey: 'advanced', order: 20, trackKey: 'rag-engineering', trackOrder: 20 },
  50: { chapterKey: 'cases', levelKey: 'basic', order: 30, trackKey: 'ai-science-automation', trackOrder: 10 },
  49: { chapterKey: 'rag', levelKey: 'advanced', order: 30, trackKey: 'rag-engineering', trackOrder: 40 },
  48: { chapterKey: 'rag', levelKey: 'advanced', order: 10, trackKey: 'rag-engineering', trackOrder: 30 },
  47: { chapterKey: 'launch', levelKey: 'expert', order: 40, trackKey: 'agent-memory-context', trackOrder: 30 },
  46: { chapterKey: 'launch', levelKey: 'basic', order: 20, trackKey: 'eval-feedback', trackOrder: 10 },
  45: { chapterKey: 'prompt', levelKey: 'advanced', order: 20, trackKey: 'prompt-practice', trackOrder: 40 },
  44: { chapterKey: 'rag', levelKey: 'expert', order: 10, trackKey: 'rag-engineering', trackOrder: 60 },
  43: { chapterKey: 'agent', levelKey: 'basic', order: 10, trackKey: 'agent-tooling', trackOrder: 10 },
  42: { chapterKey: 'basics', levelKey: 'basic', order: 30, trackKey: 'llm-app-selection', trackOrder: 10 },
  41: { chapterKey: 'agent', levelKey: 'advanced', order: 10, trackKey: 'multi-agent-orchestration', trackOrder: 20 },
  40: { chapterKey: 'basics', levelKey: 'advanced', order: 20, trackKey: 'llm-parameters-reasoning', trackOrder: 20 },
  39: { chapterKey: 'cases', levelKey: 'basic', order: 10, trackKey: 'corpus-data-engineering', trackOrder: 10 },
  38: { chapterKey: 'launch', levelKey: 'advanced', order: 50, trackKey: 'launch-reliability', trackOrder: 30 },
  37: { chapterKey: 'agent', levelKey: 'advanced', order: 40, trackKey: 'agent-workflow', trackOrder: 20 },
  36: { chapterKey: 'launch', levelKey: 'advanced', order: 60, trackKey: 'launch-reliability', trackOrder: 20 },
  35: { chapterKey: 'agent', levelKey: 'advanced', order: 30, trackKey: 'agent-workflow', trackOrder: 15 },
  34: { chapterKey: 'agent', levelKey: 'advanced', order: 20, trackKey: 'agent-memory-context', trackOrder: 20 },
  33: { chapterKey: 'basics', levelKey: 'basic', order: 20, trackKey: 'model-data-publishing', trackOrder: 10 },
  32: { chapterKey: 'prompt', levelKey: 'basic', order: 10, trackKey: 'prompt-practice', trackOrder: 10 },
  31: { chapterKey: 'rag', levelKey: 'expert', order: 40, trackKey: 'rag-engineering', trackOrder: 50 },
  30: { chapterKey: 'agent', levelKey: 'expert', order: 20, trackKey: 'agent-tooling', trackOrder: 30 },
  29: { chapterKey: 'launch', levelKey: 'advanced', order: 10, trackKey: 'eval-feedback', trackOrder: 30 },
  28: { chapterKey: 'cases', levelKey: 'basic', order: 50, trackKey: 'ai-algorithm-cases', trackOrder: 10 },
  27: { chapterKey: 'agent', levelKey: 'advanced', order: 20, trackKey: 'agent-tooling', trackOrder: 20 },
  26: { chapterKey: 'rag', levelKey: 'basic', order: 10, trackKey: 'agent-memory-context', trackOrder: 10 },
  25: { chapterKey: 'prompt', levelKey: 'advanced', order: 10, trackKey: 'prompt-practice', trackOrder: 30 },
  24: { chapterKey: 'agent', levelKey: 'expert', order: 30, trackKey: 'multi-agent-orchestration', trackOrder: 40 },
  23: { chapterKey: 'agent', levelKey: 'basic', order: 30, trackKey: 'agent-workflow', trackOrder: 10 },
  22: { chapterKey: 'launch', levelKey: 'basic', order: 30, trackKey: 'agent-security', trackOrder: 10 },
  21: { chapterKey: 'launch', levelKey: 'expert', order: 30, trackKey: 'llm-parameters-reasoning', trackOrder: 30 },
  20: { chapterKey: 'agent', levelKey: 'basic', order: 50, trackKey: 'browser-automation', trackOrder: 10 },
  19: { chapterKey: 'agent', levelKey: 'expert', order: 40, trackKey: 'multi-agent-orchestration', trackOrder: 30 },
};

const LEVEL_SEQUENCE = ['basic', 'advanced', 'expert'];

const getProgressionItems = (currentArticle, trackItems) => {
  if (!currentArticle?.trackKey || !Array.isArray(trackItems) || trackItems.length <= 1) return [];

  const levelItems = LEVEL_SEQUENCE.map((levelKey) => {
    const levelArticles = trackItems
      .filter((item) => item.levelKey === levelKey)
      .sort((a, b) => a.trackOrder - b.trackOrder || a.learningOrder - b.learningOrder);
    const currentInLevel = levelArticles.find((item) => String(item.id) === String(currentArticle.id));
    return {
      levelKey,
      article: currentInLevel || levelArticles[0] || null,
      isCurrent: Boolean(currentInLevel),
    };
  });

  return levelItems.filter((item) => item.article).length > 1 ? levelItems : [];
};

const toneClasses = {
  amber: {
    card: 'border-amber-200 bg-amber-50 text-amber-800',
    nightCard: 'border-amber-400/35 bg-amber-400/[0.12] text-amber-100',
    accent: 'text-amber-600',
    nightAccent: 'text-amber-200',
    desktopNav: 'md:border-amber-500 md:bg-transparent md:text-amber-700',
    desktopNightNav: 'md:border-amber-300 md:bg-transparent md:text-amber-100',
  },
  orange: {
    card: 'border-orange-200 bg-orange-50 text-orange-800',
    nightCard: 'border-orange-400/40 bg-orange-500/[0.15] text-orange-50',
    accent: 'text-orange-600',
    nightAccent: 'text-orange-200',
    desktopNav: 'md:border-orange-500 md:bg-transparent md:text-orange-700',
    desktopNightNav: 'md:border-orange-300 md:bg-transparent md:text-orange-100',
  },
  yellow: {
    card: 'border-yellow-200 bg-yellow-50 text-yellow-800',
    nightCard: 'border-yellow-300/35 bg-yellow-300/[0.12] text-yellow-50',
    accent: 'text-yellow-600',
    nightAccent: 'text-yellow-200',
    desktopNav: 'md:border-yellow-500 md:bg-transparent md:text-yellow-700',
    desktopNightNav: 'md:border-yellow-300 md:bg-transparent md:text-yellow-100',
  },
  rose: {
    card: 'border-rose-200 bg-rose-50 text-rose-800',
    nightCard: 'border-rose-300/20 bg-rose-300/10 text-rose-100',
    accent: 'text-rose-600',
    nightAccent: 'text-rose-200',
    desktopNav: 'md:border-rose-500 md:bg-transparent md:text-rose-700',
    desktopNightNav: 'md:border-rose-300 md:bg-transparent md:text-rose-100',
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

const getLearningOrder = (item) => (
  ARTICLE_LEARNING_ROUTE[Number(item?.id)]?.order ?? Number.MAX_SAFE_INTEGER
);

const getTrackOrder = (item) => (
  ARTICLE_LEARNING_ROUTE[Number(item?.id)]?.trackOrder ?? Number.MAX_SAFE_INTEGER
);

const formatDate = (value, language) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const locale = String(language || '').startsWith('zh') ? 'zh-CN' : 'en';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
};

const LearningProgressionDock = ({ items, isDayMode, onOpen, t, variant = 'footer' }) => {
  if (!Array.isArray(items) || items.length === 0) return null;

  const getLevelLabel = (levelKey) => {
    const level = LEVELS.find((item) => item.key === levelKey);
    return t(level?.titleKey, level?.titleFallback || levelKey);
  };

  const buttonClass = (isCurrent, article, compact = false) => {
    const base = `${compact ? 'min-h-9 px-2 py-1 text-xs' : 'min-h-[108px] p-3 text-sm'} rounded-lg border text-left transition-colors`;
    if (!article) {
      return `${base} cursor-default border-dashed ${isDayMode ? 'border-slate-200 bg-slate-100/70 text-slate-400' : 'border-white/10 bg-white/[0.025] text-gray-500'}`;
    }
    if (isCurrent) {
      return `${base} cursor-default ${isDayMode ? 'border-orange-300 bg-orange-50 text-orange-950 shadow-[0_10px_24px_rgba(249,115,22,0.08)]' : 'border-orange-300/25 bg-orange-300/10 text-orange-100'}`;
    }
    return `${base} ${isDayMode ? 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50/50' : 'border-white/10 bg-white/[0.035] text-gray-200 hover:border-orange-300/25 hover:bg-orange-300/[0.07]'}`;
  };

  const renderLevelButton = ({ levelKey, article, isCurrent }, compact = false) => {
    const levelLabel = getLevelLabel(levelKey);
    const disabled = !article || isCurrent;
    return (
      <button
        key={levelKey}
        type="button"
        disabled={disabled}
        onClick={() => article && !isCurrent && onOpen(article)}
        className={buttonClass(isCurrent, article, compact)}
      >
        <div className={`flex items-center justify-between gap-2 ${compact ? '' : 'mb-3'}`}>
          <span className={`font-black ${compact ? 'text-[11px]' : 'text-xs'} uppercase tracking-[0.16em] opacity-75`}>
            {levelLabel}
          </span>
          {isCurrent ? (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${isDayMode ? 'bg-orange-100 text-orange-700' : 'bg-orange-950/60 text-orange-200'}`}>
              {t('community_learning.progression_current_short', '当前')}
            </span>
          ) : article ? (
            <ChevronRight size={compact ? 14 : 16} />
          ) : null}
        </div>
        {!compact ? (
          <>
            <div className="line-clamp-2 font-bold leading-6">
              {article?.title || t('community_learning.progression_missing', '暂无对应篇')}
            </div>
            {article?.excerpt ? (
              <p className={`mt-2 line-clamp-2 text-xs leading-5 ${isCurrent ? 'opacity-75' : isDayMode ? 'text-slate-600' : 'text-gray-400'}`}>
                {article.excerpt}
              </p>
            ) : null}
          </>
        ) : null}
      </button>
    );
  };

  if (variant === 'header') {
    const current = items.find((item) => item.isCurrent);
    const nextItems = items.filter((item) => item.article && !item.isCurrent);
    return (
      <div className={`mt-4 rounded-lg border p-3 ${isDayMode ? 'border-orange-200 bg-orange-50/90 text-orange-800' : 'border-orange-300/20 bg-orange-300/[0.08] text-orange-100'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em]">
              <BookOpen size={14} />
              {t('community_learning.progression_path_label', '学习路径')}
            </div>
            <div className={`mt-1 text-sm font-bold ${isDayMode ? 'text-slate-950' : 'text-white'}`}>
              {t('community_learning.progression_current_level', {
                level: getLevelLabel(current?.levelKey || ''),
                defaultValue: '当前：{{level}}',
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextItems.map(({ levelKey, article }) => (
              <button
                key={levelKey}
                type="button"
                onClick={() => onOpen(article)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-black transition-colors ${
                  isDayMode
                    ? 'border-orange-200 bg-white text-orange-800 hover:border-orange-300 hover:bg-orange-50'
                    : 'border-orange-300/20 bg-orange-300/10 text-orange-100 hover:bg-orange-300/15'
                }`}
              >
                {t('community_learning.progression_continue_level', {
                  level: getLevelLabel(levelKey),
                  defaultValue: '继续读{{level}}',
                })}
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'desktopRail') {
    return (
      <aside className="sticky top-24 hidden self-start lg:block">
        <div className={`rounded-lg border p-3 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.04]'}`}>
          <div className={`mb-3 text-xs font-black uppercase tracking-[0.18em] ${isDayMode ? 'text-orange-600' : 'text-orange-200'}`}>
            {t('community_learning.progression_same_topic', '同主题路径')}
          </div>
          <div className="space-y-2">
            {items.map((item) => renderLevelButton(item, false))}
          </div>
        </div>
      </aside>
    );
  }

  if (variant === 'mobileBar') {
    return (
      <div className={`fixed inset-x-0 bottom-0 z-[120] border-t px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-14px_34px_rgba(0,0,0,0.28)] lg:hidden ${
        isDayMode ? 'border-slate-200 bg-white/95' : 'border-white/10 bg-slate-950/95'
      }`}>
        <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] items-center gap-1.5">
          <div className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] ${isDayMode ? 'text-orange-600' : 'text-orange-200'}`}>
            <BookOpen size={13} />
            <span>{t('community_learning.progression_path_label', '学习路径')}</span>
          </div>
          {items.map((item) => renderLevelButton(item, true))}
        </div>
      </div>
    );
  }

  return (
    <section className={`mt-10 rounded-lg border p-4 md:p-5 ${isDayMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.04]'}`}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('community_learning.progression_kicker', '学习进阶')}
          </div>
          <h3 className={`mt-1 text-lg font-black ${isDayMode ? 'text-slate-950' : 'text-white'}`}>
            {t('community_learning.progression_title', '同主题阅读路径')}
          </h3>
        </div>
        <div className={`text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
          {t('community_learning.progression_hint', '按基础、进阶、高阶补齐理解。')}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => renderLevelButton(item, false))}
      </div>
    </section>
  );
};

const LearningCard = ({ item, chapter, level, isDayMode, onOpen, t, language }) => {
  const tone = toneClasses[chapter?.tone || 'orange'] || toneClasses.orange;
  const Icon = chapter?.icon || BookOpen;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`group rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 md:p-5 ${
        isDayMode
          ? 'border-slate-200/80 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)] hover:border-orange-200 hover:shadow-[0_14px_32px_rgba(249,115,22,0.08)]'
          : 'border-white/10 bg-white/[0.045] hover:border-orange-300/25 hover:bg-orange-300/[0.06]'
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

const FeaturedLearningCard = ({ item, chapter, level, isDayMode, onOpen, t, language }) => {
  const tone = toneClasses[chapter?.tone || 'orange'] || toneClasses.orange;
  const Icon = chapter?.icon || BookOpen;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`group grid w-full gap-4 rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 md:grid-cols-[minmax(0,1fr)_10rem] md:p-5 ${
        isDayMode
          ? 'border-orange-200 bg-white shadow-[0_16px_42px_rgba(249,115,22,0.09)] hover:border-orange-300 hover:shadow-[0_22px_52px_rgba(249,115,22,0.13)]'
          : 'border-orange-300/20 bg-orange-300/[0.055] shadow-[0_18px_46px_rgba(0,0,0,0.26)] hover:border-orange-300/35 hover:bg-orange-300/[0.08]'
      }`}
    >
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-black ${isDayMode ? tone.card : tone.nightCard}`}>
            <Sparkles size={13} />
            {t('community_learning.first_read', '建议先读')}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${isDayMode ? 'bg-slate-100 text-slate-600' : 'bg-white/[0.07] text-gray-300'}`}>
            <Icon size={13} />
            {t(level.titleKey, level.titleFallback)}
          </span>
          <span className={`ml-auto text-xs ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
            {formatDate(item.sortDate, language)}
          </span>
        </div>
        <h4 className={`line-clamp-2 text-xl font-black leading-tight md:text-2xl ${isDayMode ? 'text-slate-950' : 'text-white'}`}>
          {item.title || t('community.untitled', '未命名')}
        </h4>
        <p className={`mt-3 line-clamp-3 text-sm leading-7 ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
          {item.excerpt || t('community_learning.no_excerpt', '暂无摘要，打开后查看完整内容。')}
        </p>
      </div>
      <div className={`flex min-h-24 flex-col justify-between rounded-md border p-3 ${
        isDayMode
          ? 'border-orange-100 bg-orange-50/70'
          : 'border-orange-300/15 bg-orange-950/25'
      }`}>
        <span className={`text-xs font-bold ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
          {t(chapter?.titleKey, chapter?.titleFallback || 'AI')}
        </span>
        <div className={`mt-4 flex items-center justify-between gap-3 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
          <span className="inline-flex items-center gap-1">
            <Clock3 size={12} />
            {calculateReadingTime(item.content || item.excerpt, t)}
          </span>
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            isDayMode
              ? 'bg-orange-600 text-white group-hover:bg-orange-700'
              : 'bg-amber-200 text-slate-950 group-hover:bg-amber-100'
          }`}>
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </button>
  );
};

const LearningArea = ({ isDayMode }) => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const levelSectionRefs = useRef({});

  const activeChapterKey = CHAPTERS.some((chapter) => chapter.key === searchParams.get('lesson'))
    ? searchParams.get('lesson')
    : 'basics';
  const activeLevelKey = LEVELS.some((level) => level.key === searchParams.get('level'))
    ? searchParams.get('level')
    : '';
  const activeChapter = CHAPTERS.find((chapter) => chapter.key === activeChapterKey) || CHAPTERS[0];
  const chapterTone = toneClasses[activeChapter.tone] || toneClasses.orange;
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
        learningOrder: getLearningOrder(item),
        trackKey: ARTICLE_LEARNING_ROUTE[Number(item?.id)]?.trackKey || '',
        trackOrder: getTrackOrder(item),
      }))
      .sort((a, b) => {
        const orderDiff = a.learningOrder - b.learningOrder;
        if (orderDiff !== 0) return orderDiff;
        return new Date(b.sortDate || 0) - new Date(a.sortDate || 0);
      });
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

    return LEVELS.map((level) => ({
      ...level,
      items: filteredItems.filter((item) => item.levelKey === level.key),
    }));
  }, [activeChapterKey, articlesByChapter, searchQuery]);

  const visibleArticlesCount = useMemo(
    () => levelGroups.reduce((sum, level) => sum + level.items.length, 0),
    [levelGroups],
  );

  const articlesByTrack = useMemo(() => {
    const map = {};
    articles.forEach((item) => {
      if (!item.trackKey) return;
      if (!map[item.trackKey]) map[item.trackKey] = [];
      map[item.trackKey].push(item);
    });
    Object.values(map).forEach((items) => {
      items.sort((a, b) => (
        LEVEL_SEQUENCE.indexOf(a.levelKey) - LEVEL_SEQUENCE.indexOf(b.levelKey)
        || a.trackOrder - b.trackOrder
        || a.learningOrder - b.learningOrder
      ));
    });
    return map;
  }, [articles]);

  const handleChapterChange = useCallback((chapterKey, levelKey = '') => {
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

  useEffect(() => {
    if (!activeLevelKey) return;
    const target = levelSectionRefs.current[activeLevelKey];
    if (!target) return;
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }, [activeChapterKey, activeLevelKey, visibleArticlesCount]);

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

  const selectedProgressionItems = useMemo(() => (
    getProgressionItems(selectedArticle, articlesByTrack[selectedArticle?.trackKey] || [])
  ), [articlesByTrack, selectedArticle]);

  return (
    <div className="grid min-w-0 gap-3 md:gap-5 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start">
      <div className="-mx-3 min-w-0 overflow-hidden border-y border-white/10 lg:hidden">
        <div
          className="scrollbar-none flex w-full max-w-full snap-x snap-proximity gap-1 overflow-x-auto overscroll-x-contain px-3 py-2"
          aria-label={t('community_learning.curriculum_label', 'AI LEARNING PATH')}
        >
          {CHAPTERS.map((chapter, index) => {
            const Icon = chapter.icon;
            const active = chapter.key === activeChapterKey;
            const tone = toneClasses[chapter.tone] || toneClasses.orange;
            return (
              <button
                key={chapter.key}
                type="button"
                aria-pressed={active}
                onClick={() => handleChapterChange(chapter.key)}
                className={`inline-flex min-h-10 min-w-fit snap-start items-center gap-2 rounded-md border px-3 text-xs font-bold transition-colors ${
                  active
                    ? isDayMode
                      ? tone.card
                      : tone.nightCard
                    : isDayMode
                      ? 'border-slate-200 bg-white/90 text-slate-600'
                      : 'border-white/10 bg-white/[0.035] text-gray-300'
                }`}
              >
                <Icon size={14} />
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span>{t(chapter.titleKey, chapter.titleFallback)}</span>
                <span className="opacity-65">{articlesByChapter[chapter.key]?.length || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <nav
          className={`border-l ${isDayMode ? 'border-slate-200' : 'border-white/10'}`}
          aria-label={t('community_learning.curriculum_label', 'AI LEARNING PATH')}
        >
          {CHAPTERS.map((chapter) => {
            const active = chapter.key === activeChapterKey;
            return (
              <button
                key={chapter.key}
                type="button"
                aria-pressed={active}
                onClick={() => handleChapterChange(chapter.key)}
                className={`block min-h-11 w-full border-l-2 px-4 py-2.5 text-left text-sm font-bold transition-colors ${
                  active
                    ? isDayMode
                      ? 'border-orange-500 bg-orange-50 text-orange-800'
                      : 'border-amber-300 bg-orange-400/10 text-amber-100'
                    : isDayMode
                      ? 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                      : 'border-transparent text-gray-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {t(chapter.titleKey, chapter.titleFallback)}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className={`min-w-0 rounded-lg border p-4 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.04] backdrop-blur-sm'}`}>
        <div className="mb-4 md:mb-5">
          <h2 className={`flex items-center gap-2 text-2xl font-black md:text-3xl ${isDayMode ? 'text-slate-950' : 'text-white'}`}>
            <ActiveIcon size={18} className={isDayMode ? chapterTone.accent : chapterTone.nightAccent} />
            {t(activeChapter.titleKey, activeChapter.titleFallback)}
          </h2>
          <p className={`mt-1 max-w-3xl text-sm leading-6 ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
            {t(activeChapter.summaryKey, activeChapter.summaryFallback)}
          </p>
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
            levelGroups.map((level) => {
              const [firstItem, ...moreItems] = level.items;
              const levelActive = activeLevelKey === level.key;
              const levelTitle = t(level.titleKey, level.titleFallback);
              const chapter = CHAPTERS.find((chapter) => chapter.key === activeChapterKey) || activeChapter;

              return (
                <section
                  key={level.key}
                  ref={(node) => {
                    levelSectionRefs.current[level.key] = node;
                  }}
                  className={`scroll-mt-28 rounded-lg border p-4 transition-colors duration-200 md:rounded-none md:border-x-0 md:border-b-0 md:bg-transparent md:px-0 md:py-5 md:shadow-none ${
                    levelActive
                      ? isDayMode
                        ? 'border-orange-200 bg-orange-50/50 shadow-[0_18px_48px_rgba(249,115,22,0.1)] md:bg-transparent'
                        : 'border-amber-300/25 bg-amber-300/[0.055] shadow-[0_18px_48px_rgba(245,158,11,0.08)] md:bg-transparent'
                      : isDayMode
                        ? 'border-slate-200 bg-white md:bg-transparent'
                        : 'border-white/10 bg-white/[0.035] md:bg-transparent'
                  }`}
                >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between md:items-center">
                    <div className="flex min-w-0 gap-3 md:items-center">
                      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ${
                        levelActive
                          ? isDayMode
                            ? 'bg-orange-600 ring-orange-100'
                            : 'bg-amber-300 ring-amber-300/15'
                          : isDayMode
                            ? 'bg-slate-300 ring-slate-100'
                            : 'bg-white/25 ring-white/[0.06]'
                      }`} />
                      <div className="min-w-0 md:flex md:items-baseline md:gap-3">
                        <h3 className={`text-xl font-black ${isDayMode ? 'text-slate-950' : 'text-white'}`}>
                          {levelTitle}
                        </h3>
                        <p className={`mt-1 text-sm leading-6 md:mt-0 ${isDayMode ? 'text-slate-600' : 'text-gray-400'}`}>
                          {t(level.descKey, level.descFallback)}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex shrink-0 items-center justify-center rounded-md border px-2.5 py-1 text-xs font-bold md:border-0 md:bg-transparent md:px-0 ${
                      isDayMode
                        ? 'border-orange-200 bg-orange-50 text-orange-700'
                        : 'border-amber-300/20 bg-amber-300/10 text-amber-100'
                    }`}>
                      {t('community_learning.level_count', { count: level.items.length, defaultValue: '{{count}} 篇' })}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {firstItem ? (
                      <FeaturedLearningCard
                        item={firstItem}
                        chapter={chapter}
                        level={level}
                        isDayMode={isDayMode}
                        onOpen={handleOpenArticle}
                        t={t}
                        language={i18n.language}
                      />
                    ) : (
                      <div className={`rounded-lg border border-dashed p-5 text-sm md:rounded-none md:border-0 md:bg-transparent md:p-0 ${
                        isDayMode
                          ? 'border-slate-200 bg-slate-50 text-slate-500'
                          : 'border-white/10 bg-white/[0.03] text-gray-400'
                      }`}>
                        {t('community_learning.level_empty', {
                          level: levelTitle,
                          defaultValue: '暂无{{level}}文章',
                        })}
                      </div>
                    )}

                    {moreItems.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className={`text-sm font-black ${isDayMode ? 'text-slate-700' : 'text-gray-200'}`}>
                            {t('community_learning.more_level_articles', {
                              level: levelTitle,
                              defaultValue: '更多{{level}}文章',
                            })}
                          </h4>
                          <span className={`h-px flex-1 ${isDayMode ? 'bg-slate-200' : 'bg-white/10'}`} />
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {moreItems.map((item) => (
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
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })
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
          gradientFrom={isDayMode ? 'from-orange-100' : 'from-orange-900/40'}
          headerHeight="h-52 sm:h-64 md:h-80"
          coverImage={selectedArticle.cover}
          shareParam="id"
          contentBlocks={parseContentBlocks(selectedArticle.content_blocks)}
          htmlContent={selectedArticle.content}
          headerAssistContent={(
            <LearningProgressionDock
              items={selectedProgressionItems}
              isDayMode={isDayMode}
              onOpen={handleOpenArticle}
              t={t}
              variant="header"
            />
          )}
          desktopAssistContent={(
            <LearningProgressionDock
              items={selectedProgressionItems}
              isDayMode={isDayMode}
              onOpen={handleOpenArticle}
              t={t}
              variant="desktopRail"
            />
          )}
          mobileAssistContent={(
            <LearningProgressionDock
              items={selectedProgressionItems}
              isDayMode={isDayMode}
              onOpen={handleOpenArticle}
              t={t}
              variant="mobileBar"
            />
          )}
          afterContent={(
            <LearningProgressionDock
              items={selectedProgressionItems}
              isDayMode={isDayMode}
              onOpen={handleOpenArticle}
              t={t}
              variant="footer"
            />
          )}
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
    <div className="space-y-3 md:space-y-4">
      <nav
        className={`-mx-3 grid grid-cols-3 border-b px-3 md:mx-0 md:gap-7 md:px-0 ${
          isDayMode ? 'border-slate-200' : 'border-white/10'
        }`}
        aria-label={t('community_learning.area_nav_label', '学习社区分区')}
      >
        {AREAS.map((area) => {
          const Icon = area.icon;
          const active = area.key === activeAreaConfig.key;
          const tone = toneClasses[area.tone] || toneClasses.orange;
          return (
            <button
              key={area.key}
              type="button"
              aria-pressed={active}
              onClick={() => handleAreaChange(area.key)}
              className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 border-b-2 px-1.5 text-center text-xs font-bold transition-colors md:min-h-12 md:justify-start md:gap-2 md:px-0 md:text-left md:text-sm ${
                active
                  ? isDayMode
                    ? `${tone.card} ${tone.desktopNav}`
                    : `${tone.nightCard} ${tone.desktopNightNav}`
                  : isDayMode
                    ? 'border-transparent text-slate-600 hover:text-slate-950 md:bg-transparent md:hover:border-slate-300'
                    : 'border-transparent text-gray-300 hover:text-white md:bg-transparent md:hover:border-white/30'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md md:h-7 md:w-7 md:bg-transparent">
                <Icon size={16} className="md:h-[17px] md:w-[17px]" />
              </span>
              <span className="truncate md:font-black">{t(area.titleKey, area.titleFallback)}</span>
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
