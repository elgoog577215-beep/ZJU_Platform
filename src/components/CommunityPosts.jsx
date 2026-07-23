import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Braces,
  ChevronRight,
  Clock3,
  Code2,
  FileStack,
  Gauge,
  Layers,
  MessageCircle,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Terminal,
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
    tone: 'sky',
    titleKey: 'community_learning.area_resources_title',
    titleFallback: '资源区',
    descKey: 'community_learning.area_resources_desc',
    descFallback: '沉淀课程资料、复习文档和学习链接。',
  },
  {
    key: 'discuss',
    icon: MessageCircle,
    tone: 'orange',
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
  'loop',
  'codex',
  'mcp',
  'function calling',
  'tool calling',
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
  '编程',
  '代码库',
  '循环',
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
    tone: 'sky',
    titleKey: 'community_learning.chapter_prompt_title',
    titleFallback: 'Prompt 实战',
    summaryKey: 'community_learning.chapter_prompt_summary',
    summaryFallback: '学会把需求说清楚，并让模型稳定输出可直接使用的结果。',
    topicsKey: 'community_learning.chapter_prompt_topics',
    topicsFallback: '提示词 / Few-shot / JSON 输出 / 版本管理',
    keywords: ['prompt', '提示词', 'few-shot', 'json', '结构化', 'schema', '思维链'],
  },
  {
    key: 'context',
    icon: Braces,
    tone: 'amber',
    titleKey: 'community_learning.chapter_context_title',
    titleFallback: 'Context 工程',
    summaryKey: 'community_learning.chapter_context_summary',
    summaryFallback: '理解上下文窗口、文件选择、规则注入和压缩方法，让模型持续拿到正确的信息。',
    topicsKey: 'community_learning.chapter_context_topics',
    topicsFallback: '上下文窗口 / 文件选择 / 规则文件 / 压缩 / 上下文污染',
    keywords: ['context', '上下文', '上下文窗口', '上下文工程', 'context window', '规则文件', 'agents.md', '压缩'],
  },
  {
    key: 'rag',
    icon: Layers,
    tone: 'emerald',
    titleKey: 'community_learning.chapter_rag_title',
    titleFallback: 'RAG 知识库',
    summaryKey: 'community_learning.chapter_rag_summary',
    summaryFallback: '从长文档、Embedding 到向量库，学习让 AI 查资料、引用资料并验证检索质量。',
    topicsKey: 'community_learning.chapter_rag_topics',
    topicsFallback: '切片 / Embedding / 向量库 / 检索重排 / RAG 评测',
    keywords: ['rag', '长文档', 'embedding', '向量库', '知识库', '检索', '切片', 'chunk', 'rerank'],
  },
  {
    key: 'tools',
    icon: Wrench,
    tone: 'orange',
    titleKey: 'community_learning.chapter_tools_title',
    titleFallback: '工具调用',
    summaryKey: 'community_learning.chapter_tools_summary',
    summaryFallback: '学习 Function Calling、MCP、命令行和权限控制，让模型安全地使用外部工具。',
    topicsKey: 'community_learning.chapter_tools_topics',
    topicsFallback: 'Function Calling / MCP / CLI / 文件系统 / 权限',
    keywords: ['工具调用', 'tool calling', 'function calling', 'function call', 'mcp', '命令行', 'cli', '浏览器自动化', 'browser automation'],
  },
  {
    key: 'agent-loop',
    icon: RefreshCw,
    tone: 'sky',
    titleKey: 'community_learning.chapter_agent_loop_title',
    titleFallback: 'Agent Loop',
    summaryKey: 'community_learning.chapter_agent_loop_summary',
    summaryFallback: '理解 Agent 如何观察、规划、行动、读取反馈，并在正确的条件下继续或停止。',
    topicsKey: 'community_learning.chapter_agent_loop_topics',
    topicsFallback: '观察 / 规划 / 行动 / 反馈 / 重试 / 停止条件',
    keywords: ['agent loop', '循环', 'observe', 'plan', 'act', 'reflection', '反思', '重试', '停止条件'],
  },
  {
    key: 'agent',
    icon: Bot,
    tone: 'amber',
    titleKey: 'community_learning.chapter_agent_title',
    titleFallback: 'Agent 工作流',
    summaryKey: 'community_learning.chapter_agent_summary',
    summaryFallback: '把任务规划、记忆、子 Agent 和人机协同组织成可重复执行的完整流程。',
    topicsKey: 'community_learning.chapter_agent_topics',
    topicsFallback: '任务规划 / 记忆 / 子 Agent / 多 Agent / HITL / 自动化',
    keywords: ['agent', 'subagent', '子agent', '多agent', 'multi-agent', '记忆', 'human-in-the-loop', '自动化', '工作流', 'orchestration'],
  },
  {
    key: 'ai-coding',
    icon: Code2,
    tone: 'violet',
    titleKey: 'community_learning.chapter_ai_coding_title',
    titleFallback: 'AI 编程',
    summaryKey: 'community_learning.chapter_ai_coding_summary',
    summaryFallback: '学习让 AI 理解代码库、修改代码、调试问题、运行测试并配合 Git 完成交付。',
    topicsKey: 'community_learning.chapter_ai_coding_topics',
    topicsFallback: '代码库理解 / 修改 / 调试 / 测试 / Git / 代码审查',
    keywords: ['ai编程', 'ai 编程', '代码库', '代码助手', 'coding agent', 'debug', '调试', '单元测试', 'git', '代码审查'],
  },
  {
    key: 'codex',
    icon: Terminal,
    tone: 'sky',
    titleKey: 'community_learning.chapter_codex_title',
    titleFallback: 'Codex 实战',
    summaryKey: 'community_learning.chapter_codex_summary',
    summaryFallback: '围绕真实仓库学习 Codex 的规则、Skills、MCP、任务协作和验证交付方法。',
    topicsKey: 'community_learning.chapter_codex_topics',
    topicsFallback: 'AGENTS.md / Skills / MCP / 任务管理 / Worktree / 验证',
    keywords: ['codex', 'agents.md', 'skill', 'skills', 'worktree', 'codex cli', 'codex desktop'],
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
    icon: BookOpen,
    tone: 'orange',
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
  47: { chapterKey: 'context', levelKey: 'expert', order: 40, trackKey: 'agent-memory-context', trackOrder: 30 },
  46: { chapterKey: 'launch', levelKey: 'basic', order: 20, trackKey: 'eval-feedback', trackOrder: 10 },
  45: { chapterKey: 'prompt', levelKey: 'advanced', order: 20, trackKey: 'prompt-practice', trackOrder: 40 },
  44: { chapterKey: 'rag', levelKey: 'expert', order: 10, trackKey: 'rag-engineering', trackOrder: 60 },
  43: { chapterKey: 'tools', levelKey: 'basic', order: 10, trackKey: 'agent-tooling', trackOrder: 10 },
  42: { chapterKey: 'basics', levelKey: 'basic', order: 30, trackKey: 'llm-app-selection', trackOrder: 10 },
  41: { chapterKey: 'agent', levelKey: 'advanced', order: 10, trackKey: 'multi-agent-orchestration', trackOrder: 20 },
  40: { chapterKey: 'basics', levelKey: 'advanced', order: 20, trackKey: 'llm-parameters-reasoning', trackOrder: 20 },
  39: { chapterKey: 'cases', levelKey: 'basic', order: 10, trackKey: 'corpus-data-engineering', trackOrder: 10 },
  38: { chapterKey: 'launch', levelKey: 'advanced', order: 50, trackKey: 'launch-reliability', trackOrder: 30 },
  37: { chapterKey: 'agent', levelKey: 'advanced', order: 40, trackKey: 'agent-workflow', trackOrder: 20 },
  36: { chapterKey: 'launch', levelKey: 'advanced', order: 60, trackKey: 'launch-reliability', trackOrder: 20 },
  35: { chapterKey: 'agent', levelKey: 'advanced', order: 30, trackKey: 'agent-workflow', trackOrder: 15 },
  34: { chapterKey: 'context', levelKey: 'advanced', order: 20, trackKey: 'agent-memory-context', trackOrder: 20 },
  33: { chapterKey: 'basics', levelKey: 'basic', order: 20, trackKey: 'model-data-publishing', trackOrder: 10 },
  32: { chapterKey: 'prompt', levelKey: 'basic', order: 10, trackKey: 'prompt-practice', trackOrder: 10 },
  31: { chapterKey: 'rag', levelKey: 'expert', order: 40, trackKey: 'rag-engineering', trackOrder: 50 },
  30: { chapterKey: 'tools', levelKey: 'expert', order: 20, trackKey: 'agent-tooling', trackOrder: 30 },
  29: { chapterKey: 'launch', levelKey: 'advanced', order: 10, trackKey: 'eval-feedback', trackOrder: 30 },
  28: { chapterKey: 'cases', levelKey: 'basic', order: 50, trackKey: 'ai-algorithm-cases', trackOrder: 10 },
  27: { chapterKey: 'tools', levelKey: 'advanced', order: 20, trackKey: 'agent-tooling', trackOrder: 20 },
  26: { chapterKey: 'context', levelKey: 'basic', order: 10, trackKey: 'agent-memory-context', trackOrder: 10 },
  25: { chapterKey: 'prompt', levelKey: 'advanced', order: 10, trackKey: 'prompt-practice', trackOrder: 30 },
  24: { chapterKey: 'agent', levelKey: 'expert', order: 30, trackKey: 'multi-agent-orchestration', trackOrder: 40 },
  23: { chapterKey: 'agent-loop', levelKey: 'basic', order: 30, trackKey: 'agent-workflow', trackOrder: 10 },
  22: { chapterKey: 'launch', levelKey: 'basic', order: 30, trackKey: 'agent-security', trackOrder: 10 },
  21: { chapterKey: 'launch', levelKey: 'expert', order: 30, trackKey: 'llm-parameters-reasoning', trackOrder: 30 },
  20: { chapterKey: 'tools', levelKey: 'basic', order: 50, trackKey: 'browser-automation', trackOrder: 10 },
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
  violet: {
    card: 'border-violet-200 bg-violet-50/70 text-violet-700',
    nightCard: 'border-violet-400/20 bg-violet-500/[0.055] text-violet-200',
    rail: 'border-violet-500 bg-transparent text-violet-700',
    nightRail: 'border-violet-400 bg-transparent text-violet-200',
    accent: 'text-violet-600',
    nightAccent: 'text-violet-300',
  },
  sky: {
    card: 'border-sky-200 bg-sky-50/70 text-sky-700',
    nightCard: 'border-sky-400/20 bg-sky-500/[0.055] text-sky-200',
    rail: 'border-sky-500 bg-transparent text-sky-700',
    nightRail: 'border-sky-400 bg-transparent text-sky-200',
    accent: 'text-sky-600',
    nightAccent: 'text-sky-300',
  },
  emerald: {
    card: 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
    nightCard: 'border-emerald-400/20 bg-emerald-500/[0.055] text-emerald-200',
    rail: 'border-emerald-500 bg-transparent text-emerald-700',
    nightRail: 'border-emerald-400 bg-transparent text-emerald-200',
    accent: 'text-emerald-600',
    nightAccent: 'text-emerald-300',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50/70 text-amber-700',
    nightCard: 'border-amber-400/20 bg-amber-500/[0.055] text-amber-200',
    rail: 'border-amber-500 bg-transparent text-amber-700',
    nightRail: 'border-amber-400 bg-transparent text-amber-200',
    accent: 'text-amber-600',
    nightAccent: 'text-amber-300',
  },
  orange: {
    card: 'border-orange-200 bg-orange-50/70 text-orange-700',
    nightCard: 'border-orange-400/20 bg-orange-500/[0.055] text-orange-200',
    rail: 'border-orange-500 bg-transparent text-orange-700',
    nightRail: 'border-orange-400 bg-transparent text-orange-200',
    accent: 'text-orange-600',
    nightAccent: 'text-orange-300',
  },
  rose: {
    card: 'border-rose-200 bg-rose-50/70 text-rose-700',
    nightCard: 'border-rose-400/20 bg-rose-500/[0.055] text-rose-200',
    rail: 'border-rose-500 bg-transparent text-rose-700',
    nightRail: 'border-rose-400 bg-transparent text-rose-200',
    accent: 'text-rose-600',
    nightAccent: 'text-rose-300',
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
  const [matched] = CHAPTERS
    .map((chapter) => ({
      chapter,
      score: chapter.keywords.reduce(
        (total, keyword) => total + (text.includes(keyword.toLowerCase()) ? 1 : 0),
        0,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return matched?.chapter.key || 'cases';
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
      return `${base} cursor-default ${isDayMode ? 'border-violet-200 bg-violet-50/70 text-violet-900 shadow-[0_10px_24px_rgba(124,58,237,0.06)]' : 'border-orange-400/20 bg-orange-400/[0.055] text-orange-200'}`;
    }
    return `${base} ${isDayMode ? 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/40' : 'border-white/10 bg-white/[0.035] text-gray-200 hover:border-white/20 hover:bg-white/[0.055]'}`;
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
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${isDayMode ? 'bg-violet-100 text-violet-700' : 'bg-orange-400/10 text-orange-200'}`}>
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
      <div className={`mt-4 rounded-lg border p-3 ${isDayMode ? 'border-violet-200 bg-violet-50/70 text-violet-800' : 'border-white/10 bg-white/[0.045] text-gray-200'}`}>
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
                    ? 'border-violet-200 bg-white text-violet-800 hover:border-violet-300 hover:bg-violet-50'
                    : 'border-white/10 bg-white/[0.04] text-gray-200 hover:border-orange-400/20 hover:bg-orange-400/[0.055]'
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
          <div className={`mb-3 text-xs font-black uppercase tracking-[0.18em] ${isDayMode ? 'text-violet-600' : 'text-orange-300'}`}>
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
          <div className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.12em] ${isDayMode ? 'text-violet-600' : 'text-orange-300'}`}>
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
  const tone = toneClasses[chapter?.tone || 'violet'] || toneClasses.violet;
  const Icon = chapter?.icon || BookOpen;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`group border-t py-4 text-left transition-all md:rounded-lg md:border md:p-5 md:hover:-translate-y-0.5 ${
        isDayMode
          ? 'border-slate-200 bg-transparent md:border-slate-200/80 md:bg-white md:shadow-[0_8px_20px_rgba(15,23,42,0.04)] md:hover:border-violet-200 md:hover:shadow-[0_14px_32px_rgba(124,58,237,0.06)]'
          : 'border-white/10 bg-transparent md:bg-white/[0.045] md:hover:border-violet-400/20 md:hover:bg-white/[0.06]'
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
  const tone = toneClasses[chapter?.tone || 'violet'] || toneClasses.violet;
  const Icon = chapter?.icon || BookOpen;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`group grid w-full gap-4 border-t py-4 text-left transition-all md:grid-cols-[minmax(0,1fr)_10rem] md:rounded-lg md:border md:p-5 md:hover:-translate-y-0.5 ${
        isDayMode
          ? 'border-slate-200 bg-transparent md:border-slate-200/80 md:bg-white md:shadow-[0_16px_42px_rgba(15,23,42,0.055)] md:hover:border-violet-200 md:hover:shadow-[0_22px_52px_rgba(124,58,237,0.07)]'
          : 'border-white/10 bg-transparent md:bg-white/[0.045] md:shadow-[0_18px_46px_rgba(0,0,0,0.24)] md:hover:border-orange-400/20 md:hover:bg-white/[0.06]'
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
      <div className={`flex min-h-0 items-center justify-between gap-3 bg-transparent p-0 md:min-h-24 md:flex-col md:items-stretch md:rounded-md md:border md:p-3 ${
        isDayMode
          ? 'md:border-violet-100 md:bg-violet-50/60'
          : 'md:border-white/10 md:bg-white/[0.035]'
      }`}>
        <span className={`text-xs font-bold ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
          {t(chapter?.titleKey, chapter?.titleFallback || 'AI')}
        </span>
        <div className={`flex items-center justify-between gap-3 text-xs md:mt-4 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
          <span className="inline-flex items-center gap-1">
            <Clock3 size={12} />
            {calculateReadingTime(item.content || item.excerpt, t)}
          </span>
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            isDayMode
              ? 'bg-violet-600 text-white group-hover:bg-violet-700'
              : 'bg-orange-400 text-slate-950 group-hover:bg-orange-300'
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

  const handleCompanionResources = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('area', 'resources');
      ['lesson', 'level', 'postTab', 'id', 'post', 'news', 'group', 'type'].forEach((key) => next.delete(key));
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
    <div className="grid min-w-0 gap-3 md:gap-5 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
      <div className={`-mx-3 min-w-0 overflow-hidden border-y lg:hidden ${isDayMode ? 'border-slate-200' : 'border-white/10'}`}>
        <div
          className="scrollbar-none flex w-full max-w-full snap-x snap-proximity overflow-x-auto overscroll-x-contain px-3"
          aria-label={t('community_learning.curriculum_label', 'AI LEARNING PATH')}
        >
          {CHAPTERS.map((chapter, index) => {
            const Icon = chapter.icon;
            const active = chapter.key === activeChapterKey;
            const tone = toneClasses[chapter.tone] || toneClasses.violet;
            return (
              <button
                key={chapter.key}
                type="button"
                aria-pressed={active}
                onClick={() => handleChapterChange(chapter.key)}
                className={`inline-flex min-h-11 min-w-fit snap-start items-center gap-2 border-x-0 border-t-0 border-b-2 px-3 text-xs font-bold transition-colors ${
                  active
                    ? isDayMode
                      ? tone.rail
                      : tone.nightRail
                    : isDayMode
                      ? 'border-transparent bg-transparent text-slate-500 hover:text-slate-950'
                      : 'border-transparent bg-transparent text-gray-400 hover:text-white'
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
          className={`max-h-[calc(100vh-7rem)] overflow-y-auto rounded-lg border p-2 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/[0.035]'}`}
          aria-label={t('community_learning.curriculum_label', 'AI LEARNING PATH')}
        >
          <div className={`mb-2 px-1 text-[11px] font-black uppercase tracking-[0.22em] ${isDayMode ? 'text-violet-600' : 'text-violet-300'}`}>
            {t('community_learning.curriculum_label', 'AI LEARNING PATH')}
          </div>
          <div className="space-y-1">
            {CHAPTERS.map((chapter, index) => {
              const Icon = chapter.icon;
              const active = chapter.key === activeChapterKey;
              const tone = toneClasses[chapter.tone] || toneClasses.violet;
              return (
                <button
                  key={chapter.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleChapterChange(chapter.key)}
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-md border px-3 py-1 text-left transition-colors ${
                    active
                      ? isDayMode
                        ? tone.card
                        : tone.nightCard
                      : isDayMode
                        ? 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                        : 'border-transparent text-gray-300 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${active ? 'bg-white/35' : isDayMode ? 'bg-slate-100' : 'bg-white/[0.06]'}`}>
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
            <div className={`mt-1.5 border-t pt-1.5 ${isDayMode ? 'border-slate-200' : 'border-white/10'}`}>
              <button
                type="button"
                onClick={handleCompanionResources}
                className={`flex min-h-11 w-full items-center gap-2.5 rounded-md border px-3 py-1 text-left transition-colors ${
                  isDayMode
                    ? 'border-transparent text-sky-700 hover:border-sky-200 hover:bg-sky-50/70'
                    : 'border-transparent text-sky-200 hover:border-sky-400/20 hover:bg-sky-500/[0.055]'
                }`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isDayMode ? 'bg-sky-50' : 'bg-sky-500/[0.07]'}`}>
                  <FileStack size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black uppercase tracking-[0.16em] opacity-60">
                    {String(CHAPTERS.length + 1).padStart(2, '0')}
                  </span>
                  <span className="block truncate text-sm font-bold">
                    {t('community_learning.companion_resources_title', '配套资源')}
                  </span>
                </span>
                <ArrowRight size={15} className="ml-auto shrink-0 opacity-70" />
              </button>
            </div>
          </div>
        </nav>
      </aside>

      <section className="min-w-0">
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
                  className={`scroll-mt-28 border-t py-5 transition-colors duration-200 ${
                    levelActive
                      ? isDayMode
                        ? 'border-violet-200 bg-transparent'
                        : 'border-orange-400/20 bg-transparent'
                      : isDayMode
                        ? 'border-slate-200 bg-transparent'
                        : 'border-white/10 bg-transparent'
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3 md:items-center">
                    <div className="flex min-w-0 gap-3 md:items-center">
                      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ${
                        levelActive
                          ? isDayMode
                            ? 'bg-violet-600 ring-violet-100'
                            : 'bg-orange-400 ring-orange-400/10'
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
                    <span className={`inline-flex shrink-0 items-center justify-center pt-1 text-xs font-bold md:pt-0 ${
                      isDayMode
                        ? 'text-violet-700'
                        : 'text-orange-200'
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
                      <div className={`border-t border-dashed py-4 text-sm md:border-0 md:py-0 ${
                        isDayMode
                          ? 'border-slate-200 bg-transparent text-slate-500'
                          : 'border-white/10 bg-transparent text-gray-400'
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
            <div className={`border-y border-dashed py-8 text-center md:rounded-lg md:border md:p-8 ${isDayMode ? 'border-slate-200 bg-transparent md:bg-slate-50 text-slate-500' : 'border-white/10 bg-transparent md:bg-white/[0.03] text-gray-400'}`}>
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
          gradientFrom={isDayMode ? 'from-violet-100' : 'from-slate-900/30'}
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
    <div className="space-y-3 md:space-y-5">
      <nav
        className={`-mx-3 grid grid-cols-3 border-b px-3 md:mx-0 md:gap-3 md:border-0 md:px-0 ${
          isDayMode ? 'border-slate-200' : 'border-white/10'
        }`}
        aria-label={t('community_learning.area_nav_label', '学习社区分区')}
      >
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
              className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 border-b-2 px-1.5 text-center text-xs font-bold transition-all md:block md:min-h-[118px] md:rounded-lg md:border md:p-4 md:text-left ${
                active
                  ? isDayMode
                    ? tone.card
                    : tone.nightCard
                  : isDayMode
                    ? 'border-transparent text-slate-600 hover:text-slate-950 md:border-slate-200 md:bg-white md:hover:border-slate-300 md:hover:bg-slate-50'
                    : 'border-transparent text-gray-300 hover:text-white md:border-white/10 md:bg-white/[0.035] md:hover:border-white/20 md:hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center justify-between gap-3 md:mb-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-md md:h-10 md:w-10 ${active ? 'md:bg-white/35' : isDayMode ? 'md:bg-slate-100' : 'md:bg-white/[0.06]'}`}>
                  <Icon size={16} className="md:h-[19px] md:w-[19px]" />
                </span>
                {active ? <ArrowRight size={18} className="hidden md:block" /> : null}
              </div>
              <div className="truncate md:text-lg md:font-black">{t(area.titleKey, area.titleFallback)}</div>
              <p className="mt-1 hidden text-sm leading-6 opacity-80 md:block">{t(area.descKey, area.descFallback)}</p>
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
