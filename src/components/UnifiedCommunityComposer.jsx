import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Code2,
  Eye,
  FileText,
  Film,
  GripVertical,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  Paperclip,
  Plus,
  Quote,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { uploadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { buildContentHtml, createCommunityBlock, extractPlainText, parseComposerBlocks } from './unifiedCommunityEditorUtils';

const IMPORTABLE_DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.md,.markdown';

const BOARD_CONFIG = {
  tech: {
    accent: 'blue',
    titleKey: 'community.composer_title_tech',
    titleFallback: '撰写技术分享',
    endpoint: '/articles',
    supportsCover: true,
    supportsExcerpt: true,
    supportsSource: false,
    supportsTeamFields: false,
    supportsCode: true,
    publishStatus: 'pending',
    category: 'tech',
  },
  help: {
    accent: 'amber',
    titleKey: 'community.composer_title_help',
    titleFallback: '发布求助问答',
    endpoint: '/community/posts',
    section: 'help',
    supportsCover: false,
    supportsExcerpt: false,
    supportsSource: false,
    supportsTeamFields: false,
    supportsCode: true,
    publishStatus: 'approved',
  },
  materials: {
    accent: 'green',
    titleKey: 'community.composer_title_materials',
    titleFallback: '发布期末资料',
    endpoint: '/community/posts',
    section: 'materials',
    supportsCover: false,
    supportsExcerpt: false,
    supportsSource: false,
    supportsTeamFields: false,
    supportsMaterialFields: true,
    supportsCode: true,
    publishStatus: 'pending',
  },
  news: {
    accent: 'sky',
    titleKey: 'community.composer_title_news',
    titleFallback: '投稿新闻热点',
    endpoint: '/news',
    supportsCover: true,
    supportsExcerpt: true,
    supportsSource: true,
    supportsTeamFields: false,
    supportsCode: false,
    publishStatus: 'pending',
  },
  team: {
    accent: 'violet',
    titleKey: 'community.composer_title_team',
    titleFallback: '发布组队协作',
    endpoint: '/community/posts',
    section: 'team',
    supportsCover: false,
    supportsExcerpt: false,
    supportsSource: false,
    supportsTeamFields: true,
    supportsCode: true,
    publishStatus: 'pending',
  },
};

const accentClasses = {
  amber: {
    button: 'bg-amber-500 text-white hover:bg-amber-600',
    ring: 'focus:ring-amber-300/50 focus:border-amber-300',
    darkButton: 'bg-amber-600 text-white hover:bg-amber-500',
  },
  blue: {
    button: 'bg-blue-600 text-white hover:bg-blue-700',
    ring: 'focus:ring-blue-300/50 focus:border-blue-300',
    darkButton: 'bg-blue-600 text-white hover:bg-blue-500',
  },
  sky: {
    button: 'bg-sky-600 text-white hover:bg-sky-700',
    ring: 'focus:ring-sky-300/50 focus:border-sky-300',
    darkButton: 'bg-sky-600 text-white hover:bg-sky-500',
  },
  violet: {
    button: 'bg-violet-600 text-white hover:bg-violet-700',
    ring: 'focus:ring-violet-300/50 focus:border-violet-300',
    darkButton: 'bg-violet-600 text-white hover:bg-violet-500',
  },
  green: {
    button: 'bg-emerald-600 text-white hover:bg-emerald-700',
    ring: 'focus:ring-emerald-300/50 focus:border-emerald-300',
    darkButton: 'bg-emerald-600 text-white hover:bg-emerald-500',
  },
};

const deriveBlocksFromText = (text = '') => {
  const parts = String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return [createCommunityBlock('text')];
  return parts.map((part) => ({ ...createCommunityBlock('text'), text: part }));
};

const normalizeImportedContentBlocks = (rawBlocks = []) => {
  if (!Array.isArray(rawBlocks)) return [];
  return rawBlocks
    .filter((block) => block?.type === 'text' && String(block?.text || '').trim())
    .map((block) => ({
      ...createCommunityBlock(block.style === 'code' ? 'code' : 'text'),
      text: String(block.text || ''),
      style: ['paragraph', 'heading', 'quote', 'list', 'code'].includes(block.style) ? block.style : 'paragraph',
      language: block.style === 'code' ? String(block.language || '').trim() : '',
    }));
};

const blockLabel = (block, t) => {
  if (block.style === 'heading') return t('community.block_heading', '标题');
  if (block.style === 'quote') return t('community.block_quote', '引用');
  if (block.style === 'list') return t('community.block_list', '列表');
  if (block.style === 'code') return t('community.block_code', '代码');
  if (block.type === 'image') return t('community.block_image', '图片');
  if (block.type === 'video') return t('community.block_video', '视频');
  if (block.type === 'file') return t('community.block_file', '附件');
  return t('community.block_text', '文字');
};

const getAccept = (type) => {
  if (type === 'image') return 'image/*';
  if (type === 'video') return 'video/*';
  return '*/*';
};

const MATERIAL_TYPE_OPTIONS = [
  { value: '', labelKey: 'community.material_type_placeholder', fallback: '选择资料类型' },
  { value: 'exam', labelKey: 'community.material_type_exam', fallback: '往年题' },
  { value: 'outline', labelKey: 'community.material_type_outline', fallback: '复习提纲' },
  { value: 'slides', labelKey: 'community.material_type_slides', fallback: '课件摘要' },
  { value: 'notes', labelKey: 'community.material_type_notes', fallback: '笔记整理' },
  { value: 'solution', labelKey: 'community.material_type_solution', fallback: '题解/答案' },
  { value: 'other', labelKey: 'community.material_type_other', fallback: '其他资料' },
];

const UnifiedCommunityComposer = ({
  isOpen,
  boardKey = 'help',
  initialData = null,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';
  const normalizedBoardKey = boardKey === 'project' ? 'tech' : boardKey;
  const config = BOARD_CONFIG[normalizedBoardKey] || BOARD_CONFIG.help;
  const accent = accentClasses[config.accent] || accentClasses.amber;
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [cover, setCover] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [tags, setTags] = useState('');
  const [link, setLink] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [materialCourse, setMaterialCourse] = useState('');
  const [materialTeacher, setMaterialTeacher] = useState('');
  const [materialSemester, setMaterialSemester] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [relatedArticleIds, setRelatedArticleIds] = useState('');
  const [relatedPostIds, setRelatedPostIds] = useState('');
  const [relatedNewsIds, setRelatedNewsIds] = useState('');
  const [relatedGroupIds, setRelatedGroupIds] = useState('');
  const [blocks, setBlocks] = useState([createCommunityBlock('text')]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState(null);
  const [importingDocument, setImportingDocument] = useState(false);
  const fileInputRefs = useRef({});
  const documentImportInputRef = useRef(null);

  const inputCls = `w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 ${
    isDayMode
      ? `bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 ${accent.ring}`
      : 'bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:ring-white/15 focus:border-white/20'
  }`;
  const labelCls = `text-xs font-bold uppercase tracking-[0.14em] ${isDayMode ? 'text-slate-600' : 'text-gray-400'}`;
  const shellCls = isDayMode
    ? 'bg-white text-slate-950 border-slate-200'
    : 'bg-neutral-950 text-white border-white/10';

  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialData?.title || '');
    setExcerpt(initialData?.excerpt || initialData?.description || '');
    setCover(initialData?.cover || initialData?.thumbnail || '');
    setSourceName(initialData?.source_name || '');
    setSourceUrl(initialData?.source_url || '');
    setTags(Array.isArray(initialData?.tags) ? initialData.tags.join(',') : (initialData?.tags || ''));
    setLink(initialData?.link || '');
    setDeadline(initialData?.deadline || '');
    setMaxMembers(initialData?.max_members ? String(initialData.max_members) : '');
    setMaterialCourse(initialData?.material_course || '');
    setMaterialTeacher(initialData?.material_teacher || '');
    setMaterialSemester(initialData?.material_semester || '');
    setMaterialType(initialData?.material_type || '');
    setRelatedArticleIds(Array.isArray(initialData?.related_article_ids) ? initialData.related_article_ids.join(',') : (initialData?.related_article_ids || ''));
    setRelatedPostIds(Array.isArray(initialData?.related_post_ids) ? initialData.related_post_ids.join(',') : (initialData?.related_post_ids || ''));
    setRelatedNewsIds(Array.isArray(initialData?.related_news_ids) ? initialData.related_news_ids.join(',') : (initialData?.related_news_ids || ''));
    setRelatedGroupIds(Array.isArray(initialData?.related_group_ids) ? initialData.related_group_ids.join(',') : (initialData?.related_group_ids || ''));
    const parsed = parseComposerBlocks(initialData?.content_blocks);
    setBlocks(parsed.length ? parsed : deriveBlocksFromText(extractPlainText(initialData?.content || '')));
    setPreviewOpen(false);
  }, [initialData, isOpen]);

  const addBlock = useCallback((type) => {
    setBlocks((prev) => [...prev, createCommunityBlock(type)]);
  }, []);

  const updateBlock = useCallback((id, updates) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, ...updates } : block)));
  }, []);

  const removeBlock = useCallback((id) => {
    setBlocks((prev) => (prev.length <= 1 ? prev : prev.filter((block) => block.id !== id)));
  }, []);

  const moveBlock = useCallback((id, direction) => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === id);
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }, []);

  const handleBlockFileUpload = useCallback(async (blockId, file) => {
    if (!file) return;
    setUploadingBlockId(blockId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadFile('/upload', formData);
      const url = res.data?.fileUrl || res.data?.url || res.data?.path;
      if (!url) throw new Error('No upload URL');
      updateBlock(blockId, { url, name: file.name, size: file.size, mime: file.type, file: null });
    } catch {
      toast.error(t('community.post_upload_failed', '文件上传失败'));
    } finally {
      setUploadingBlockId(null);
    }
  }, [t, updateBlock]);

  const handleImportDocument = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImportingDocument(true);
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
        const text = await file.text();
        setBlocks(deriveBlocksFromText(text));
        setTitle((prev) => prev || file.name.replace(/\.(md|markdown)$/i, ''));
        toast.success(t('community.post_import_success', '文档内容已导入正文'));
        return;
      }
      const formData = new FormData();
      formData.append('document', file);
      const res = await uploadFile('/community/posts/import-document', formData);
      const importedBlocks = normalizeImportedContentBlocks(res.data?.content_blocks);
      if (!importedBlocks.length) throw new Error('Empty imported content');
      setBlocks(importedBlocks);
      setTitle((prev) => prev || String(res.data?.title || '').trim());
      toast.success(t('community.post_import_success', '文档内容已导入正文'));
    } catch (error) {
      toast.error(error?.message || t('community.post_import_failed', '文档导入失败，请检查文件格式'));
    } finally {
      setImportingDocument(false);
      if (event.target) event.target.value = '';
    }
  }, [t]);

  const availableBlocks = useMemo(() => {
    const base = [
      { type: 'text', icon: FileText, label: t('community.block_text', '文字') },
      { type: 'heading', icon: FileText, label: t('community.block_heading', '标题') },
      { type: 'quote', icon: Quote, label: t('community.block_quote', '引用') },
      { type: 'list', icon: FileText, label: t('community.block_list', '列表') },
      { type: 'image', icon: ImagePlus, label: t('community.block_image', '图片') },
      { type: 'video', icon: Film, label: t('community.block_video', '视频') },
      { type: 'file', icon: Paperclip, label: t('community.block_file', '附件') },
    ];
    if (config.supportsCode) base.splice(4, 0, { type: 'code', icon: Code2, label: t('community.block_code', '代码') });
    return base;
  }, [config.supportsCode, t]);

  const cleanBlocks = useMemo(() => blocks
    .filter((block) => (block.type === 'text' ? String(block.text || '').trim() : block.url))
    .map(({ file: _file, ...block }) => block), [blocks]);
  const plainContent = useMemo(() => cleanBlocks
    .filter((block) => block.type === 'text')
    .map((block) => String(block.text || '').trim())
    .filter(Boolean)
    .join('\n\n'), [cleanBlocks]);
  const htmlContent = useMemo(() => buildContentHtml(cleanBlocks), [cleanBlocks]);

  const buildPayload = useCallback((status) => {
    const fallbackExcerpt = excerpt.trim() || plainContent.replace(/\s+/g, ' ').slice(0, 140);
    const materialPayload = config.supportsMaterialFields ? {
      material_course: materialCourse.trim(),
      material_teacher: materialTeacher.trim(),
      material_semester: materialSemester.trim(),
      material_type: materialType,
    } : {};
    if (normalizedBoardKey === 'tech') {
      return {
        id: initialData?.id,
        title: title.trim(),
        excerpt: fallbackExcerpt,
        content: htmlContent || `<p>${plainContent}</p>`,
        content_blocks: JSON.stringify(cleanBlocks),
        cover: cover.trim() || cleanBlocks.find((block) => block.type === 'image')?.url || '',
        tags: tags.trim(),
        category: config.category,
        status,
        related_article_ids: relatedArticleIds.trim(),
        related_post_ids: relatedPostIds.trim(),
        related_news_ids: relatedNewsIds.trim(),
        related_group_ids: relatedGroupIds.trim(),
      };
    }
    if (normalizedBoardKey === 'news') {
      return {
        id: initialData?.id,
        title: title.trim(),
        excerpt: fallbackExcerpt,
        content: plainContent,
        content_blocks: JSON.stringify(cleanBlocks),
        cover: cover.trim() || cleanBlocks.find((block) => block.type === 'image')?.url || '',
        source_name: sourceName.trim(),
        source_url: sourceUrl.trim(),
        status,
        related_article_ids: relatedArticleIds.trim(),
        related_post_ids: relatedPostIds.trim(),
        related_news_ids: relatedNewsIds.trim(),
        related_group_ids: relatedGroupIds.trim(),
      };
    }
    return {
      id: initialData?.id,
      section: config.section,
      title: title.trim(),
      content: plainContent,
      content_blocks: JSON.stringify(cleanBlocks),
      tags: tags.trim(),
      status,
      post_status: config.section === 'team'
        ? (initialData?.status || 'recruiting')
        : config.section
          ? (initialData?.status || 'published')
          : (initialData?.status || 'open'),
      link: link.trim(),
      deadline,
      max_members: maxMembers ? parseInt(maxMembers, 10) : undefined,
      ...materialPayload,
      related_article_ids: relatedArticleIds.trim(),
      related_post_ids: relatedPostIds.trim(),
      related_news_ids: relatedNewsIds.trim(),
      related_group_ids: relatedGroupIds.trim(),
    };
  }, [cleanBlocks, config.category, config.section, config.supportsMaterialFields, cover, deadline, excerpt, htmlContent, initialData, link, materialCourse, materialSemester, materialTeacher, materialType, maxMembers, normalizedBoardKey, plainContent, relatedArticleIds, relatedGroupIds, relatedNewsIds, relatedPostIds, sourceName, sourceUrl, tags, title]);

  const submit = useCallback(async (status) => {
    if (!user) {
      toast.error(t('auth.signin_required'));
      return;
    }
    if (title.trim().length < 4) {
      toast.error(t('community.post_title_too_short', '标题至少 4 个字'));
      return;
    }
    if (plainContent.trim().length < 8) {
      toast.error(t('community.post_content_too_short', '正文至少 8 个字'));
      return;
    }
    const payload = buildPayload(status);
    setSubmitting(true);
    try {
      if (payload.id) {
        await api.put(`${config.endpoint}/${payload.id}`, payload);
      } else {
        await api.post(config.endpoint, payload);
      }
      toast.success(status === 'draft' ? t('community.draft_saved', '草稿已保存') : t('community.post_created', '发布成功'));
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.error || t('community.post_create_failed', '发布失败'));
    } finally {
      setSubmitting(false);
    }
  }, [buildPayload, config.endpoint, onClose, onSuccess, plainContent, t, title, user]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    onClose?.();
  }, [onClose, submitting]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[120] ${isDayMode ? 'bg-white' : 'bg-black'}`}
        >
          <div className={`community-composer-shell flex h-[100dvh] flex-col border ${shellCls}`}>
            <header className={`community-composer-header flex items-center justify-between gap-3 border-b px-4 py-3 md:px-6 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-neutral-950'}`}>
              <div className="min-w-0">
                <p className={`community-composer-eyebrow text-[11px] font-black uppercase tracking-[0.22em] ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
                  {t('community.unified_composer', '统一社区编辑器')}
                </p>
                <h2 className="community-composer-title truncate text-lg font-black md:text-xl">
                  {t(config.titleKey, config.titleFallback)}
                </h2>
              </div>
              <div className="community-composer-header-actions flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen((prev) => !prev)}
                  className={`community-composer-button inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${isDayMode ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-white/10 text-gray-200 hover:bg-white/10'}`}
                >
                  <Eye size={16} />
                  {t('community.preview', '预览')}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className={`community-composer-icon-button inline-flex h-10 w-10 items-center justify-center rounded-lg border ${isDayMode ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-white/10 text-gray-300 hover:bg-white/10'}`}
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <main className="community-composer-main grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="community-composer-editor min-h-0 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
                <div className="community-composer-editor-inner mx-auto max-w-4xl space-y-5">
                  <div className="community-composer-field space-y-2">
                    <label className={labelCls}>{t('community.post_title_label', '标题')}</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} className={`community-composer-input ${inputCls} text-lg font-bold`} maxLength={120} />
                  </div>

                  <div className="community-composer-meta-grid grid grid-cols-1 gap-4 md:grid-cols-2">
                    {config.supportsExcerpt && (
                      <div className="community-composer-field space-y-2 md:col-span-2">
                        <label className={labelCls}>{t('community.excerpt', '摘要')}</label>
                        <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3} className={`community-composer-input community-composer-short-textarea ${inputCls} resize-none`} />
                      </div>
                    )}
                    {config.supportsCover && (
                      <div className="community-composer-field space-y-2 md:col-span-2">
                        <label className={labelCls}>{t('common.cover', '封面')}</label>
                        <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://..." className={`community-composer-input ${inputCls}`} />
                      </div>
                    )}
                    {config.supportsSource && (
                      <>
                        <div className="community-composer-field space-y-2">
                          <label className={labelCls}>{t('community.news_source_name', '来源名称')}</label>
                          <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} className={`community-composer-input ${inputCls}`} />
                        </div>
                        <div className="community-composer-field space-y-2">
                          <label className={labelCls}>{t('community.news_source_url', '来源链接')}</label>
                          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={`community-composer-input ${inputCls}`} />
                        </div>
                      </>
                    )}
                    {config.supportsTeamFields && (
                      <>
                        <div className="community-composer-field space-y-2">
                          <label className={labelCls}>{t('community.post_link_label', '活动链接')}</label>
                          <input value={link} onChange={(e) => setLink(e.target.value)} className={`community-composer-input ${inputCls}`} />
                        </div>
                        <div className="community-composer-mini-grid grid grid-cols-2 gap-3">
                          <div className="community-composer-field space-y-2">
                            <label className={labelCls}>{t('community.post_deadline_label', '截止日期')}</label>
                            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`community-composer-input ${inputCls}`} />
                          </div>
                          <div className="community-composer-field space-y-2">
                            <label className={labelCls}>{t('community.post_max_members_label', '招募人数')}</label>
                            <input type="number" min={2} max={100} value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} className={`community-composer-input ${inputCls}`} />
                          </div>
                        </div>
                      </>
                    )}
                    {config.supportsMaterialFields && (
                      <>
                        <div className="community-composer-field space-y-2">
                          <label className={labelCls}>{t('community.material_course', '课程')}</label>
                          <input
                            value={materialCourse}
                            onChange={(e) => setMaterialCourse(e.target.value)}
                            className={`community-composer-input ${inputCls}`}
                            placeholder={t('community.material_course_placeholder', '如：微积分 / 大学物理')}
                            maxLength={80}
                          />
                        </div>
                        <div className="community-composer-field space-y-2">
                          <label className={labelCls}>{t('community.material_teacher', '老师')}</label>
                          <input
                            value={materialTeacher}
                            onChange={(e) => setMaterialTeacher(e.target.value)}
                            className={`community-composer-input ${inputCls}`}
                            placeholder={t('community.material_teacher_placeholder', '可选')}
                            maxLength={60}
                          />
                        </div>
                        <div className="community-composer-field space-y-2">
                          <label className={labelCls}>{t('community.material_semester', '学期')}</label>
                          <input
                            value={materialSemester}
                            onChange={(e) => setMaterialSemester(e.target.value)}
                            className={`community-composer-input ${inputCls}`}
                            placeholder={t('community.material_semester_placeholder', '如：2025-2026 秋冬')}
                            maxLength={40}
                          />
                        </div>
                        <div className="community-composer-field space-y-2">
                          <label className={labelCls}>{t('community.material_type', '资料类型')}</label>
                          <select
                            value={materialType}
                            onChange={(e) => setMaterialType(e.target.value)}
                            className={`community-composer-input ${inputCls}`}
                          >
                            {MATERIAL_TYPE_OPTIONS.map((option) => (
                              <option key={option.value || 'empty'} value={option.value}>
                                {t(option.labelKey, option.fallback)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="community-composer-content space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className={labelCls}>{t('community.post_content_label', '内容')}</label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input ref={documentImportInputRef} type="file" accept={IMPORTABLE_DOCUMENT_ACCEPT} onChange={handleImportDocument} className="hidden" />
                        <button
                          type="button"
                          onClick={() => documentImportInputRef.current?.click()}
                          disabled={importingDocument}
                          className={`community-composer-small-button inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${isDayMode ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-white/10 text-gray-200 hover:bg-white/10'}`}
                        >
                          {importingDocument ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                          {t('community.post_import_document', '导入文档')}
                        </button>
                      </div>
                    </div>

                    <div className="community-composer-blocks space-y-3">
                      {blocks.map((block, index) => (
                        <div key={block.id} className={`community-composer-block rounded-lg border p-3 ${isDayMode ? 'border-slate-200 bg-slate-50/70' : 'border-white/10 bg-white/[0.025]'}`}>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className={`flex items-center gap-1.5 text-xs font-semibold ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
                              <GripVertical size={13} />
                              {blockLabel(block, t)}
                            </div>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => moveBlock(block.id, 'up')} disabled={index === 0} className={`rounded-md border p-1 disabled:opacity-30 ${isDayMode ? 'border-slate-200 text-slate-500' : 'border-white/10 text-gray-400'}`}><ArrowUp size={13} /></button>
                              <button type="button" onClick={() => moveBlock(block.id, 'down')} disabled={index === blocks.length - 1} className={`rounded-md border p-1 disabled:opacity-30 ${isDayMode ? 'border-slate-200 text-slate-500' : 'border-white/10 text-gray-400'}`}><ArrowDown size={13} /></button>
                              <button type="button" onClick={() => removeBlock(block.id)} disabled={blocks.length <= 1} className="rounded-md border border-red-500/30 p-1 text-red-400 disabled:opacity-30"><Trash2 size={13} /></button>
                            </div>
                          </div>
                          {block.type === 'text' ? (
                            <>
                              <select
                                value={block.style || 'paragraph'}
                                onChange={(e) => updateBlock(block.id, { style: e.target.value })}
                                className={`community-composer-select mb-2 rounded-lg border px-2 py-1 text-xs ${isDayMode ? 'border-slate-200 bg-white text-slate-700' : 'border-white/10 bg-neutral-900 text-gray-200'}`}
                              >
                                <option value="paragraph">{t('community.block_text', '文字')}</option>
                                <option value="heading">{t('community.block_heading', '标题')}</option>
                                <option value="quote">{t('community.block_quote', '引用')}</option>
                                <option value="list">{t('community.block_list', '列表')}</option>
                                {config.supportsCode && <option value="code">{t('community.block_code', '代码')}</option>}
                              </select>
                              <textarea
                                value={block.text}
                                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                rows={block.style === 'code' ? 8 : 5}
                                className={`community-composer-textarea ${inputCls} resize-y ${block.style === 'code' ? 'font-mono' : 'font-sans'}`}
                              />
                            </>
                          ) : (
                            <div className="space-y-2">
                              {!block.url ? (
                                <div className="relative">
                                  <input
                                    ref={(el) => { fileInputRefs.current[block.id] = el; }}
                                    type="file"
                                    accept={getAccept(block.type)}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleBlockFileUpload(block.id, file);
                                      e.target.value = '';
                                    }}
                                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                                  />
                                  <div className={`community-composer-file-drop flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-xs ${isDayMode ? 'border-slate-200 text-slate-500' : 'border-white/15 text-gray-500'}`}>
                                    {uploadingBlockId === block.id ? <Loader2 size={16} className="animate-spin" /> : t('community.select_file', '点击选择文件')}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {block.type === 'image' && <img src={block.url} alt="" className="community-composer-media-preview max-h-64 w-full rounded-lg object-contain" />}
                                  {block.type === 'video' && <video src={block.url} controls className="community-composer-media-preview max-h-64 w-full rounded-lg" />}
                                  {block.type === 'file' && (
                                    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isDayMode ? 'border-slate-200 bg-white text-slate-700' : 'border-white/10 bg-white/5 text-gray-200'}`}>
                                      <Paperclip size={15} />
                                      <span className="truncate">{block.name || t('community.block_file', '附件')}</span>
                                    </div>
                                  )}
                                  {block.type !== 'file' && (
                                    <input value={block.caption || ''} onChange={(e) => updateBlock(block.id, { caption: e.target.value })} placeholder={t('community.caption_optional', '可选说明文字')} className={`community-composer-input ${inputCls}`} />
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="community-composer-add-buttons flex flex-wrap gap-2">
                      {availableBlocks.map(({ type, icon: Icon, label }) => (
                        <button key={type} type="button" onClick={() => addBlock(type)} className={`community-composer-small-button inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${isDayMode ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-white/10 text-gray-300 hover:bg-white/10'}`}>
                          <Plus size={13} />
                          <Icon size={13} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <aside className={`community-composer-side min-h-0 overflow-y-auto border-t p-4 lg:border-l lg:border-t-0 ${isDayMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/[0.025]'}`}>
                <div className="community-composer-side-inner space-y-4">
                  {previewOpen ? (
                    <div className={`community-composer-preview rounded-lg border p-4 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-neutral-950'}`}>
                      <p className={labelCls}>{t('community.preview', '预览')}</p>
                      <h3 className="mt-2 text-xl font-black">{title || t('community.untitled', '未命名')}</h3>
                      {excerpt && <p className={`mt-2 text-sm ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{excerpt}</p>}
                      <div className="mt-4 space-y-3 text-sm">
                        {cleanBlocks.map((block) => (
                          <div key={block.id}>
                            {block.type === 'text' && block.style === 'heading' && <h4 className="text-lg font-bold">{block.text}</h4>}
                            {block.type === 'text' && block.style === 'quote' && <blockquote className={`border-l-4 pl-3 ${isDayMode ? 'border-slate-300 text-slate-600' : 'border-white/20 text-gray-300'}`}>{block.text}</blockquote>}
                            {block.type === 'text' && block.style !== 'heading' && block.style !== 'quote' && <p className="whitespace-pre-wrap leading-7">{block.text}</p>}
                            {block.type === 'image' && <img src={block.url} alt="" className="rounded-lg" />}
                            {block.type === 'video' && <video src={block.url} controls className="rounded-lg" />}
                            {block.type === 'file' && <a href={block.url} className="underline">{block.name || block.url}</a>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="community-composer-field space-y-2">
                    <label className={labelCls}>{t('community.post_tags_label', '标签')}</label>
                    <input value={tags} onChange={(e) => setTags(e.target.value)} className={`community-composer-input ${inputCls}`} placeholder={t('community.tags_placeholder', '用逗号分隔')} />
                  </div>

                  <div className="community-composer-field space-y-2">
                    <label className={labelCls}>{t('community.related_resources', '跨模块关联')}</label>
                    <input value={relatedArticleIds} onChange={(e) => setRelatedArticleIds(e.target.value)} className={`community-composer-input ${inputCls}`} placeholder={t('community.related_articles_placeholder', '相关文章 ID')} />
                    <input value={relatedPostIds} onChange={(e) => setRelatedPostIds(e.target.value)} className={`community-composer-input ${inputCls}`} placeholder={t('community.related_posts_placeholder', '相关帖子 ID')} />
                    <input value={relatedNewsIds} onChange={(e) => setRelatedNewsIds(e.target.value)} className={`community-composer-input ${inputCls}`} placeholder={t('community.related_news_placeholder', '相关新闻 ID')} />
                    <input value={relatedGroupIds} onChange={(e) => setRelatedGroupIds(e.target.value)} className={`community-composer-input ${inputCls}`} placeholder={t('community.related_groups_placeholder', '相关社群 ID')} />
                  </div>
                </div>
              </aside>
            </main>

            <footer className={`community-composer-footer flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3 md:px-6 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-neutral-950'}`}>
              <button type="button" onClick={() => submit('draft')} disabled={submitting} className={`community-composer-footer-button inline-flex min-h-[42px] items-center gap-2 rounded-lg border px-4 text-sm font-semibold disabled:opacity-50 ${isDayMode ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-white/10 text-gray-200 hover:bg-white/10'}`}>
                <Save size={16} />
                {t('community.save_draft', '保存草稿')}
              </button>
              <button type="button" onClick={() => submit(isAdmin ? 'approved' : config.publishStatus)} disabled={submitting} className={`community-composer-footer-button inline-flex min-h-[42px] items-center gap-2 rounded-lg px-5 text-sm font-semibold disabled:opacity-50 ${isDayMode ? accent.button : accent.darkButton}`}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {config.publishStatus === 'approved' || isAdmin ? t('community.publish_now', '发布') : t('community.submit_for_review', '提交审核')}
              </button>
            </footer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default UnifiedCommunityComposer;
