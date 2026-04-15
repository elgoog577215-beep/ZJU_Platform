import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image, Film, Music, FileText, Plus, Calendar, Tag, Link, Check, Sparkles, RotateCcw, GripVertical, ArrowUp, ArrowDown, Trash2, Paperclip, PenSquare, Eye, Clock3, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { uploadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TagInput from './TagInput';
import { useBackClose } from '../hooks/useBackClose';

const createArticleBlock = (blockType = 'text') => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type: blockType,
  style: blockType === 'text' ? 'paragraph' : 'default',
  align: blockType === 'image' ? 'center' : 'default',
  width: blockType === 'image' ? 'wide' : 'default',
  text: '',
  file: null,
  url: '',
  caption: '',
  name: '',
  size: 0,
  mime: ''
});

const toParagraphHtml = (text = '') => {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return escaped
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p>${line}</p>`)
    .join('');
};

const extractPlainText = (html = '') => html
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const escapeHtml = (text = '') => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildArticleHtmlFromBlocks = (blocks = []) => blocks
  .map((block) => {
    if (block.type === 'text') {
      const paragraphs = toParagraphHtml(block.text || '');
      if (!paragraphs) return '';
      if (block.style === 'heading') return `<h2>${extractPlainText(paragraphs)}</h2>`;
      if (block.style === 'quote') return `<blockquote>${extractPlainText(paragraphs)}</blockquote>`;
      if (block.style === 'list') {
        const items = (block.text || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => `<li>${escapeHtml(line.replace(/^[-*]\s*/, ''))}</li>`)
          .join('');
        return items ? `<ul>${items}</ul>` : '';
      }
      return paragraphs;
    }
    if (block.type === 'image' && block.url) {
      const safeCaption = block.caption ? `<figcaption>${toParagraphHtml(block.caption)}</figcaption>` : '';
      const alignMap = { left: 'left', center: 'center', right: 'right' };
      const widthMap = { small: '420px', medium: '680px', wide: '980px', full: '100%' };
      const imageAlign = alignMap[block.align] || 'center';
      const imageWidth = widthMap[block.width] || '980px';
      return `<figure style="text-align:${imageAlign};"><img style="width:${imageWidth};max-width:100%;display:inline-block;" src="${block.url}" alt="${(block.caption || '').replace(/"/g, '&quot;')}" />${safeCaption}</figure>`;
    }
    if (block.type === 'video' && block.url) {
      const safeCaption = block.caption ? `<p>${toParagraphHtml(block.caption)}</p>` : '';
      return `<figure><video controls src="${block.url}"></video>${safeCaption}</figure>`;
    }
    if (block.type === 'file' && block.url) {
      const label = (block.name || '下载附件').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<p><a href="${block.url}" target="_blank" rel="noopener noreferrer" download>${label}</a></p>`;
    }
    return '';
  })
  .join('');

const buildBlocksFromPlainText = (rawText = '') => {
  const normalized = (rawText || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [createArticleBlock('text')];
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const blocks = paragraphs.map((paragraph) => {
    const block = createArticleBlock('text');
    const listLines = paragraph
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const isList = listLines.length > 1 && listLines.every((line) => /^[-*•]\s+/.test(line));
    if (isList) {
      block.style = 'list';
      block.text = listLines.map((line) => line.replace(/^[-*•]\s+/, '')).join('\n');
      return block;
    }
    block.text = paragraph;
    return block;
  });
  return blocks.length ? blocks : [createArticleBlock('text')];
};

const buildBlocksFromMarkdown = (rawMarkdown = '') => {
  const lines = (rawMarkdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let currentParagraph = [];
  let currentList = [];
  const pushParagraph = () => {
    const text = currentParagraph.join('\n').trim();
    if (!text) return;
    const block = createArticleBlock('text');
    block.text = text;
    blocks.push(block);
    currentParagraph = [];
  };
  const pushList = () => {
    if (!currentList.length) return;
    const block = createArticleBlock('text');
    block.style = 'list';
    block.text = currentList.join('\n');
    blocks.push(block);
    currentList = [];
  };
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      pushParagraph();
      pushList();
      return;
    }
    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      pushParagraph();
      pushList();
      const block = createArticleBlock('text');
      block.style = 'heading';
      block.text = headingMatch[1].trim();
      blocks.push(block);
      return;
    }
    const quoteMatch = trimmed.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      pushParagraph();
      pushList();
      const block = createArticleBlock('text');
      block.style = 'quote';
      block.text = quoteMatch[1].trim();
      blocks.push(block);
      return;
    }
    const listMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (listMatch) {
      pushParagraph();
      currentList.push(listMatch[1].trim());
      return;
    }
    pushList();
    currentParagraph.push(trimmed);
  });
  pushParagraph();
  pushList();
  return blocks.length ? blocks : [createArticleBlock('text')];
};

const ARTICLE_BLOCK_META = {
  text: {
    label: '文字',
    icon: FileText,
    chipClass: 'text-blue-200 bg-blue-500/15 border-blue-400/25'
  },
  image: {
    label: '图片',
    icon: Image,
    chipClass: 'text-emerald-200 bg-emerald-500/15 border-emerald-400/25'
  },
  video: {
    label: '视频',
    icon: Film,
    chipClass: 'text-purple-200 bg-purple-500/15 border-purple-400/25'
  },
  file: {
    label: '附件',
    icon: Paperclip,
    chipClass: 'text-amber-200 bg-amber-500/15 border-amber-400/25'
  }
};

const UploadModal = ({ isOpen, onClose, onUpload, type = 'image', initialData = null }) => {
  const { t } = useTranslation();
  useBackClose(isOpen, onClose);
  const { user, isAdmin } = useAuth();
  const isEditing = !!initialData;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initialData?.url || initialData?.audio || initialData?.video || null);
  
  // Secondary file (Cover image for Music/Video/Event)
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(initialData?.cover || initialData?.thumbnail || initialData?.image || null);

  const [title, setTitle] = useState(initialData?.title || '');
  const [tags, setTags] = useState(initialData?.tags || ''); // Tags state
  const [description, setDescription] = useState(initialData?.excerpt || initialData?.description || '');
  const [content, setContent] = useState(initialData?.content || ''); // Full content
  const [articleBlocks, setArticleBlocks] = useState(() => {
    const raw = initialData?.content_blocks;
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((block) => ({
            id: block.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: block.type || 'text',
            style: block.style || 'paragraph',
            align: block.align || 'default',
            width: block.width || 'default',
            text: block.text || '',
            file: null,
            url: block.url || '',
            caption: block.caption || '',
            name: block.name || '',
            size: block.size || 0,
            mime: block.mime || ''
          }));
        }
      } catch (error) {
        console.error('Failed to parse content_blocks:', error);
      }
    }
    if (initialData?.content) {
      return [{ ...createArticleBlock('text'), text: extractPlainText(initialData.content) }];
    }
    return [createArticleBlock('text')];
  });
  const [draggingBlockId, setDraggingBlockId] = useState(null);
  const [dragOverBlockId, setDragOverBlockId] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState('before');
  const [artist, setArtist] = useState(initialData?.artist || '');
  const [featured, setFeatured] = useState(initialData?.featured || false);
  const [size, setSize] = useState(initialData?.size || '');
  const [dragTarget, setDragTarget] = useState(null);

  // Photo specific
  
  // Event specific
  const [eventDate, setEventDate] = useState(initialData?.date || '');
  const [eventEndDate, setEventEndDate] = useState(initialData?.end_date || '');
  const [eventLocation, setEventLocation] = useState(initialData?.location || '');
  const [eventLink, setEventLink] = useState(initialData?.link || '');
  
  // Phase 1 New Fields
  const [eventScore, setEventScore] = useState(initialData?.score || '');
  const [eventVolunteerTime, setEventVolunteerTime] = useState(initialData?.volunteer_time || '');
  const [eventTarget, setEventTarget] = useState(initialData?.target_audience || '');
  const [eventOrganizer, setEventOrganizer] = useState(initialData?.organizer || '');
  const [dateReasoning, setDateReasoning] = useState('');

  // WeChat Parsing
  const [wechatUrl, setWechatUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [articleEditorMode, setArticleEditorMode] = useState('edit');
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [activeTextBlockId, setActiveTextBlockId] = useState(null);
  const [slashMenuBlockId, setSlashMenuBlockId] = useState(null);
  const [isImportingDocument, setIsImportingDocument] = useState(false);
  const articleImportInputRef = React.useRef(null);

  const articleDraftStorageKey = React.useMemo(
    () => `zju-article-draft-${user?.id || 'guest'}`,
    [user?.id]
  );
  const articleWordCount = React.useMemo(() => articleBlocks
    .filter((block) => block.type === 'text')
    .reduce((total, block) => total + (block.text?.trim() ? block.text.trim().split(/\s+/).length : 0), 0), [articleBlocks]);
  const articleReadingMinutes = Math.max(1, Math.ceil(articleWordCount / 240));
  const activeTextStyle = React.useMemo(() => {
    if (!activeTextBlockId) return 'paragraph';
    const activeBlock = articleBlocks.find((block) => block.id === activeTextBlockId);
    return activeBlock?.style || 'paragraph';
  }, [activeTextBlockId, articleBlocks]);
  const articleCompletion = React.useMemo(() => {
    const total = articleBlocks.length || 1;
    const completed = articleBlocks.filter((block) => {
      if (block.type === 'text') return !!block.text?.trim();
      if (block.type === 'file') return !!block.file || !!block.url;
      return !!block.url || !!block.file;
    }).length;
    return {
      completed,
      total,
      percent: Math.round((completed / total) * 100)
    };
  }, [articleBlocks]);

  const restoreArticleDraft = React.useCallback(() => {
    if (type !== 'article' || isEditing) return;
    try {
      const rawDraft = localStorage.getItem(articleDraftStorageKey);
      if (!rawDraft) {
        toast('没有可恢复的草稿');
        return;
      }
      const draft = JSON.parse(rawDraft);
      if (draft.title) setTitle(draft.title);
      if (draft.tags) setTags(draft.tags);
      if (draft.description) setDescription(draft.description);
      if (draft.eventDate) setEventDate(draft.eventDate);
      if (draft.coverPreview) setCoverPreview(draft.coverPreview);
      if (Array.isArray(draft.articleBlocks) && draft.articleBlocks.length > 0) {
        setArticleBlocks(draft.articleBlocks.map((block) => ({
          ...createArticleBlock(block.type || 'text'),
          ...block,
          file: null
        })));
      }
      setHasLocalDraft(true);
      toast.success('已恢复本地草稿');
    } catch {
      toast.error('草稿恢复失败');
    }
  }, [articleDraftStorageKey, isEditing, type]);

  const clearArticleDraft = React.useCallback(() => {
    localStorage.removeItem(articleDraftStorageKey);
    setHasLocalDraft(false);
    toast.success('草稿已清除');
  }, [articleDraftStorageKey]);

  const handleParseWeChat = async () => {
    if (!wechatUrl) {
        toast.error('请输入微信公众号文章链接');
        return;
    }
    
    // Validate URL format
    const wechatUrlRegex = /^https?:\/\/(mp\.weixin\.qq\.com|www\.weixin\.qq\.com)/i;
    if (!wechatUrlRegex.test(wechatUrl)) {
        toast.error('请输入有效的微信公众号文章链接 (mp.weixin.qq.com)');
        return;
    }
    
    setIsParsing(true);
    try {
        const { data } = await api.post('/resources/parse-wechat', { url: wechatUrl });
        
        if (data) {
            if (data.title) setTitle(data.title);
            
            // date and end_date are now YYYY-MM-DDTHH:MM format from AI parsing
            if (data.date) setEventDate(data.date);
            if (data.end_date) setEventEndDate(data.end_date);
            if (data.location) setEventLocation(data.location);
            if (data.content) setContent(data.content); // Store full content for parsing/editing
            if (data.description) setDescription(data.description); // Summary for description
            
            // New fields mapping
            if (data.organizer) setEventOrganizer(data.organizer);
            if (data.target_audience) setEventTarget(data.target_audience);
            if (data.volunteer_time) setEventVolunteerTime(data.volunteer_time);
            if (data.score) setEventScore(data.score);
            if (data.date_reasoning) setDateReasoning(data.date_reasoning);

            // Auto-generate tags if available
            if (data.tags && data.tags.length > 0) {
                // Merge with existing tags
                const currentTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                const newTags = [...new Set([...currentTags, ...data.tags])];
                setTags(newTags.join(','));
            }

            // Set cover image if available
            if (data.coverImage) {
                setCoverPreview(data.coverImage);
            }

            // Auto-fill event link with source WeChat URL if not already set
            if (!eventLink) setEventLink(wechatUrl);

            toast.success(t('upload.parse_success'));
        }
    } catch (error) {
        console.error('WeChat Parse Error:', error);
        const errorMessage = error.response?.data?.message || error.response?.data?.error || t('upload.parse_failed');
        toast.error(errorMessage);
    } finally {
        setIsParsing(false);
    }
  };

  const handleClearParsedData = () => {
      setWechatUrl('');
      setTitle('');
      setDescription('');
      setContent('');
      setEventDate('');
      setEventEndDate('');
      setEventLocation('');
      setEventOrganizer('');
      setEventTarget('');
      setEventVolunteerTime('');
      setEventScore('');
      setDateReasoning('');
      setEventLink('');
      setTags('');
      toast.success(t('upload.cleared'));
  };

  // Reset form when modal opens with new data or closes
  React.useEffect(() => {
    if (isOpen) {
        setSubmitIntent('publish');
        if (!user) {
            toast.error(t('auth.signin_desc'));
            onClose();
            return;
        }

        if (initialData) {
            setTitle(initialData.title || '');
            setTags(initialData.tags || '');
            setDescription(initialData.excerpt || initialData.description || '');
            setContent(initialData.content || '');
            if (type === 'article') {
              if (initialData.content_blocks) {
                try {
                  const parsed = typeof initialData.content_blocks === 'string'
                    ? JSON.parse(initialData.content_blocks)
                    : initialData.content_blocks;
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    setArticleBlocks(parsed.map((block) => ({
                      id: block.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      type: block.type || 'text',
                      style: block.style || 'paragraph',
                      align: block.align || 'default',
                      width: block.width || 'default',
                      text: block.text || '',
                      file: null,
                      url: block.url || '',
                      caption: block.caption || '',
                      name: block.name || '',
                      size: block.size || 0,
                      mime: block.mime || ''
                    })));
                  } else {
                    setArticleBlocks([{ ...createArticleBlock('text'), text: extractPlainText(initialData.content || '') }]);
                  }
                } catch (error) {
                  console.error('Failed to parse content blocks on reset:', error);
                  setArticleBlocks([{ ...createArticleBlock('text'), text: extractPlainText(initialData.content || '') }]);
                }
              } else {
                setArticleBlocks([{ ...createArticleBlock('text'), text: extractPlainText(initialData.content || '') }]);
              }
            }
            setArtist(initialData.artist || '');
            setEventDate(initialData.date || '');
            setEventEndDate(initialData.end_date || '');
            setEventLocation(initialData.location || '');
            setEventLink(initialData.link || '');
            setEventScore(initialData.score || '');
            setEventVolunteerTime(initialData.volunteer_time || '');
            setEventTarget(initialData.target_audience || '');
            setEventOrganizer(initialData.organizer || '');
            setFeatured(initialData.featured || false);
            setSize(initialData.size || '');
            setPreview(initialData.url || initialData.audio || initialData.video || null);
            setCoverPreview(initialData.cover || initialData.thumbnail || initialData.image || null);
        } else {
            setTitle('');
            setTags('');
            setDescription('');
            setContent('');
            if (type === 'article') {
              setArticleBlocks([createArticleBlock('text')]);
            }
            setArtist('');
            setEventDate('');
            setEventEndDate('');
            setEventLocation('');
            setEventLink('');
            setEventScore('');
            setEventTarget('');
            setEventOrganizer('');
            setFeatured(false);
            setSize('');
            setPreview(null);
            setCoverPreview(null);
        }
        setFile(null);
        setCoverFile(null);
        setWechatUrl('');
        setIsParsing(false);
        setArticleEditorMode('edit');
        setActiveTextBlockId(null);
        setSlashMenuBlockId(null);
    }
  }, [isOpen, initialData, user, t, onClose, type]);

  React.useEffect(() => {
    if (!isOpen || type !== 'article' || isEditing) return;
    const existingDraft = localStorage.getItem(articleDraftStorageKey);
    setHasLocalDraft(!!existingDraft);
  }, [articleDraftStorageKey, isEditing, isOpen, type]);

  React.useEffect(() => {
    if (!isOpen || type !== 'article' || isEditing) return;
    const draftPayload = {
      title,
      tags,
      description,
      eventDate,
      coverPreview,
      articleBlocks: articleBlocks.map((block) => {
        const serialized = { ...block };
        delete serialized.file;
        return serialized;
      }),
      updatedAt: Date.now()
    };
    localStorage.setItem(articleDraftStorageKey, JSON.stringify(draftPayload));
    setHasLocalDraft(true);
  }, [articleBlocks, articleDraftStorageKey, coverPreview, description, eventDate, isEditing, isOpen, tags, title, type]);

  const addArticleBlock = (blockType) => {
    const nextBlock = createArticleBlock(blockType);
    setArticleBlocks((prev) => [...prev, nextBlock]);
    if (blockType === 'text') {
      setActiveTextBlockId(nextBlock.id);
    }
  };

  const updateArticleBlock = (blockId, patch) => {
    setArticleBlocks((prev) => prev.map((block) => (block.id === blockId ? { ...block, ...patch } : block)));
  };

  const updateActiveTextStyle = (style) => {
    const isCurrentActiveText = articleBlocks.some((block) => block.id === activeTextBlockId && block.type === 'text');
    const targetTextBlockId = isCurrentActiveText
      ? activeTextBlockId
      : articleBlocks.find((block) => block.type === 'text')?.id;
    if (!targetTextBlockId) return;
    setActiveTextBlockId(targetTextBlockId);
    updateArticleBlock(targetTextBlockId, { style });
  };

  React.useEffect(() => {
    if (type !== 'article') return;
    if (!articleBlocks.length) {
      setActiveTextBlockId(null);
      return;
    }
    const hasActiveText = articleBlocks.some((block) => block.id === activeTextBlockId && block.type === 'text');
    if (hasActiveText) return;
    const firstTextBlockId = articleBlocks.find((block) => block.type === 'text')?.id || null;
    setActiveTextBlockId(firstTextBlockId);
  }, [activeTextBlockId, articleBlocks, type]);

  const deriveTitleFromFileName = (fileName = '') => fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const applyImportedDocumentBlocks = (rawContent, sourceType, fileName) => {
    const parsedBlocks = sourceType === 'markdown'
      ? buildBlocksFromMarkdown(rawContent)
      : buildBlocksFromPlainText(rawContent);
    if (!parsedBlocks.length || parsedBlocks.every((block) => !(block.text || '').trim())) {
      toast.error('文档没有可导入的内容');
      return;
    }
    setArticleBlocks(parsedBlocks);
    const firstTextBlockId = parsedBlocks.find((block) => block.type === 'text')?.id || null;
    setActiveTextBlockId(firstTextBlockId);
    setArticleEditorMode('edit');
    setContent(buildArticleHtmlFromBlocks(parsedBlocks));
    setTitle((prev) => (prev?.trim() ? prev : deriveTitleFromFileName(fileName)));
    setDescription((prev) => {
      if (prev?.trim()) return prev;
      const firstText = parsedBlocks.find((block) => block.type === 'text' && block.text?.trim())?.text || '';
      return firstText.slice(0, 120);
    });
  };

  const parsePdfFileToText = async (file) => {
    const [pdfjsLib, workerModule] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    ]);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
    const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
    const pdf = await loadingTask.promise;
    const pageTexts = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const contentData = await page.getTextContent();
      const text = contentData.items.map((item) => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
      if (text) pageTexts.push(text);
    }
    return pageTexts.join('\n\n');
  };

  const handleImportArticleDocument = async (event) => {
    const fileToImport = event.target.files?.[0];
    if (!fileToImport) return;
    try {
      setIsImportingDocument(true);
      const fileNameLower = fileToImport.name.toLowerCase();
      if (fileNameLower.endsWith('.md') || fileNameLower.endsWith('.markdown')) {
        const markdownText = await fileToImport.text();
        applyImportedDocumentBlocks(markdownText, 'markdown', fileToImport.name);
        toast.success('Markdown 导入成功');
        return;
      }
      if (fileNameLower.endsWith('.docx')) {
        const mammothModule = await import('mammoth/mammoth.browser');
        const result = await mammothModule.extractRawText({ arrayBuffer: await fileToImport.arrayBuffer() });
        applyImportedDocumentBlocks(result.value || '', 'plain', fileToImport.name);
        toast.success('DOCX 导入成功');
        return;
      }
      if (fileNameLower.endsWith('.pdf')) {
        const pdfText = await parsePdfFileToText(fileToImport);
        applyImportedDocumentBlocks(pdfText, 'plain', fileToImport.name);
        toast.success('PDF 导入成功');
        return;
      }
      toast.error('仅支持 docx、pdf、md 文档');
    } catch (error) {
      console.error('Document import failed:', error);
      toast.error('文档导入失败，请检查文件格式');
    } finally {
      setIsImportingDocument(false);
      if (event.target) event.target.value = '';
    }
  };

  const insertArticleBlockAfter = (blockId, blockType) => {
    setArticleBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === blockId);
      if (index < 0) return [...prev, createArticleBlock(blockType)];
      const next = [...prev];
      next.splice(index + 1, 0, createArticleBlock(blockType));
      return next;
    });
  };

  const removeArticleBlock = (blockId) => {
    setArticleBlocks((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((block) => block.id !== blockId);
    });
  };

  const moveArticleBlock = (blockId, direction) => {
    setArticleBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === blockId);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const moveArticleBlockTo = (sourceId, targetId, position = 'before') => {
    setArticleBlocks((prev) => {
      const sourceIndex = prev.findIndex((block) => block.id === sourceId);
      const targetIndex = prev.findIndex((block) => block.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      let insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      if (position === 'after') insertIndex += 1;
      next.splice(insertIndex, 0, moved);
      return next;
    });
  };

  const handleArticleBlockDragStart = (blockId) => {
    setDraggingBlockId(blockId);
  };

  const handleArticleBlockDrop = (targetId) => {
    if (!draggingBlockId || draggingBlockId === targetId) {
      setDraggingBlockId(null);
      setDragOverBlockId(null);
      setDragOverPosition('before');
      return;
    }
    moveArticleBlockTo(draggingBlockId, targetId, dragOverPosition);
    setDraggingBlockId(null);
    setDragOverBlockId(null);
    setDragOverPosition('before');
  };

  const readFileAsDataUrl = (sourceFile) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(sourceFile);
  });

  const resolveDragOverPosition = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    return event.clientY <= midpoint ? 'before' : 'after';
  };

  const handleArticleEditorPaste = (event) => {
    const clipboardItems = Array.from(event.clipboardData?.items || []);
    const imageItems = clipboardItems.filter((item) => item.type?.startsWith('image/'));
    if (imageItems.length === 0) return;
    event.preventDefault();
    Promise.all(
      imageItems.map(async (item, index) => {
        const pastedFile = item.getAsFile();
        if (!pastedFile) return null;
        const dataUrl = await readFileAsDataUrl(pastedFile);
        return {
          ...createArticleBlock('image'),
          file: pastedFile,
          url: dataUrl,
          name: pastedFile.name || `粘贴图片-${Date.now()}-${index + 1}.png`,
          size: pastedFile.size || 0,
          mime: pastedFile.type || ''
        };
      })
    ).then((newBlocks) => {
      const validBlocks = newBlocks.filter(Boolean);
      if (validBlocks.length === 0) return;
      setArticleBlocks((prev) => [...prev, ...validBlocks]);
      toast.success(`已插入 ${validBlocks.length} 张粘贴图片`);
    }).catch(() => {
      toast.error('粘贴图片失败，请重试');
    });
  };

  const handleArticleTextKeyDown = (event, block) => {
    if (event.key === 'Escape') {
      setSlashMenuBlockId(null);
      return;
    }
    if (event.key !== 'Enter') return;
    const lines = (block.text || '').split('\n');
    const commandText = lines[lines.length - 1].trim().toLowerCase();
    const commandMap = {
      '/image': 'image',
      '/img': 'image',
      '/video': 'video',
      '/file': 'file',
      '/text': 'text'
    };
    const commandType = commandMap[commandText];
    if (!commandType) return;
    event.preventDefault();
    const cleanedText = lines.slice(0, -1).join('\n');
    updateArticleBlock(block.id, { text: cleanedText });
    insertArticleBlockAfter(block.id, commandType);
    setSlashMenuBlockId(null);
    toast.success(`已插入${ARTICLE_BLOCK_META[commandType]?.label || commandType}块`);
  };

  const handleSlashCommandInsert = (block, commandType) => {
    const lines = (block.text || '').split('\n');
    const lastLine = lines[lines.length - 1];
    const cleanedLastLine = lastLine.trim() === '/' ? '' : lastLine.replace(/\/$/, '');
    const cleanedText = [...lines.slice(0, -1), cleanedLastLine].join('\n').trimEnd();
    updateArticleBlock(block.id, { text: cleanedText });
    insertArticleBlockAfter(block.id, commandType);
    setSlashMenuBlockId(null);
  };

  const getArticleBlockAccept = (blockType) => {
    if (blockType === 'image') return 'image/*';
    if (blockType === 'video') return 'video/*';
    return '*/*';
  };

  const handleArticleBlockFileChange = (blockId, blockType, selectedFile) => {
    if (!selectedFile) return;
    const accept = getArticleBlockAccept(blockType);
    if (accept !== '*/*') {
      const pattern = new RegExp(accept.replace('*', '.*'));
      if (!selectedFile.type.match(pattern)) {
        toast.error(t('upload.invalid_file_type', { type: accept }));
        return;
      }
    }
    if (blockType === 'image' || blockType === 'video') {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateArticleBlock(blockId, {
          file: selectedFile,
          url: reader.result,
          name: selectedFile.name,
          size: selectedFile.size || 0,
          mime: selectedFile.type || ''
        });
      };
      reader.readAsDataURL(selectedFile);
      return;
    }
    updateArticleBlock(blockId, {
      file: selectedFile,
      url: '',
      name: selectedFile.name,
      size: selectedFile.size || 0,
      mime: selectedFile.type || ''
    });
  };

  const handleFileChange = (e, isCover = false) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isCover) {
            setCoverFile(selectedFile);
            setCoverPreview(reader.result);
        } else {
            setFile(selectedFile);
            setPreview(reader.result);
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [submitIntent, setSubmitIntent] = useState('publish');
  const formRef = React.useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) {
        toast.error(t('upload.title_required'));
        return;
    }
    if (!isEditing && type !== 'event' && type !== 'article' && !file) {
        toast.error(t('upload.file_required'));
        return;
    }

    if (type === 'event' && !eventEndDate) {
        toast.error(t('upload.required_end_date'));
        return;
    }
    if (type === 'article') {
      const hasEffectiveContent = articleBlocks.some((block) => {
        if (block.type === 'text') return !!block.text?.trim();
        return !!block.file || !!block.url;
      });
      if (!hasEffectiveContent && !description.trim()) {
        toast.error('请至少添加一段正文或一个媒体块');
        return;
      }
    }

    setIsUploading(true);

    try {
      // 1. Upload files to server
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (coverFile) formData.append('cover', coverFile);

      let fileUrl = preview;
      let coverUrl = coverPreview;

      if (file || coverFile) {
          const uploadRes = await uploadFile('/upload', formData);
          const uploadData = uploadRes.data;
          if (file) fileUrl = uploadData.fileUrl;
          if (coverFile) coverUrl = uploadData.coverUrl;
      }

      let normalizedBlocks = articleBlocks;
      if (type === 'article') {
        normalizedBlocks = await Promise.all(articleBlocks.map(async (block) => {
          if (!block.file) return block;
          const blockData = new FormData();
          blockData.append('file', block.file);
          const blockUploadRes = await uploadFile('/upload', blockData);
          return {
            ...block,
            url: blockUploadRes.data.fileUrl,
            name: block.name || block.file.name,
            file: null
          };
        }));
      }

      const articleHtml = type === 'article'
        ? buildArticleHtmlFromBlocks(normalizedBlocks)
        : content;
      const firstTextBlock = normalizedBlocks.find((block) => block.type === 'text' && block.text?.trim());
      const firstImageBlock = normalizedBlocks.find((block) => block.type === 'image' && block.url);
      const fallbackExcerpt = firstTextBlock?.text?.trim()?.slice(0, 160) || description;

      // 2. Construct new item
      const resolvedStatus = submitIntent === 'draft'
        ? 'draft'
        : (isAdmin ? 'approved' : 'pending');

      const newItem = {
        ...initialData, // Keep existing ID and other fields if editing
        title,
        tags, // Include tags
        tag: tags, // For backward compatibility with article 'tag'
        url: fileUrl, 
        
        // Music specific
        audio: type === 'audio' ? fileUrl : null,
        artist: type === 'audio' ? (artist || t('common.unknown_artist')) : null,
        
        // Video specific
        video: type === 'video' ? fileUrl : null,
        
        // Event specific
        image: type === 'event' ? (coverUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1000&auto=format&fit=crop') : null,
        date: (type === 'event' || type === 'article') ? eventDate : new Date().toLocaleDateString(),
        end_date: type === 'event' ? eventEndDate : null,
        time: null,
        location: type === 'event' ? eventLocation : null,
        link: type === 'event' ? eventLink : null,
        score: type === 'event' ? eventScore : null,
        target_audience: type === 'event' ? eventTarget : null,
        organizer: type === 'event' ? eventOrganizer : null,
        status: resolvedStatus,
        volunteer_time: type === 'event' ? eventVolunteerTime : null,

        // Cover/Thumbnail logic
        cover: coverUrl || (type === 'image' ? fileUrl : null) || (type === 'article' ? (fileUrl || firstImageBlock?.url || null) : null) || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
        thumbnail: coverUrl || (type === 'image' ? fileUrl : null) || (type === 'article' ? (fileUrl || firstImageBlock?.url || null) : null) || 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',

        excerpt: type === 'article' ? fallbackExcerpt : description,
        content: type === 'article' ? (articleHtml || `<p>${description}</p>`) : (content || `<p>${description}</p>`),
        content_blocks: type === 'article' ? JSON.stringify(normalizedBlocks.map((block) => {
          const serialized = { ...block };
          delete serialized.file;
          return serialized;
        })) : null,
        description: description, // for events/photos consistency
        featured: featured ? 1 : 0,
        size: type === 'image' ? size : null,
        
        // Defaults if new
        ...(!isEditing ? {
            duration: 0,
        } : {
            // If editing, update these too if type matches
        })
      };

      await onUpload(newItem, { intent: submitIntent });
      if (type === 'article') {
        localStorage.removeItem(articleDraftStorageKey);
        setHasLocalDraft(false);
      }
      
      const successMessage = submitIntent === 'draft'
        ? '草稿已保存'
        : (isEditing
          ? t('upload.update_success')
          : (isAdmin ? t('upload.upload_success') : t('upload.upload_pending_review')));
      
      toast.success(successMessage);
      onClose();

    } catch (err) {
      console.error("Upload failed:", err);
      toast.error(t('upload.upload_failed'));
    } finally {
        setIsUploading(false);
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'video': return <Film size={48} className="text-gray-400" />;
      case 'audio': return <Music size={48} className="text-gray-400" />;
      case 'article': return <FileText size={48} className="text-gray-400" />;
      case 'event': return <Calendar size={48} className="text-gray-400" />;
      default: return <Image size={48} className="text-gray-400" />;
    }
  };

  const getAcceptType = (isCover = false) => {
    if (isCover) return "image/*";
    switch(type) {
        case 'video': return "video/*";
        case 'audio': return "audio/*";
        case 'article': return "image/*"; 
        case 'event': return "image/*";
        default: return "image/*";
      }
  };

  const handleDragEnter = (e, target) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(target);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(null);
  };

  const handleDragOver = (e, target) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(target);
  };

  const handleDrop = (e, isCover = false) => {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget(null);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
        const accept = getAcceptType(isCover);
        const typeRegex = new RegExp(accept.replace('*', '.*'));
        if (!droppedFile.type.match(typeRegex)) {
             toast.error(t('upload.invalid_file_type', { type: accept }));
             return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (isCover) {
                setCoverFile(droppedFile);
                setCoverPreview(reader.result);
            } else {
                setFile(droppedFile);
                setPreview(reader.result);
            }
        };
        reader.readAsDataURL(droppedFile);
    }
  };

  // UI Constants
  const inputClasses = "w-full bg-black/35 border border-white/10 rounded-2xl px-4 py-3.5 sm:py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-400/70 focus:bg-white/10 transition-all duration-300 text-base min-h-[48px] sm:min-h-[44px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";
  const labelClasses = "block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider pl-1";
  const cardClasses = "bg-gradient-to-br from-[#1a1a1a]/80 to-[#111111]/70 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-6 space-y-5 sm:space-y-6 shadow-[0_24px_48px_rgba(0,0,0,0.45)]";
  const uploadBoxClasses = (isActive) => `relative border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center group transition-all duration-300 bg-black/20 ${isActive ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02] shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'border-white/10 hover:border-white/30 hover:bg-white/5'}`;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] flex items-center justify-center ${type === 'article' ? 'p-0 bg-black/90' : 'p-0 sm:p-4 bg-black/80'} backdrop-blur-md`}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative bg-[#0f0f0f] w-full h-[100dvh] overflow-hidden flex flex-col z-10 ${type === 'article' ? 'max-w-none border-0 rounded-none shadow-none' : `border-0 sm:border border-white/10 rounded-none sm:rounded-[2rem] ${type === 'event' ? 'sm:max-w-5xl' : 'sm:max-w-2xl'} shadow-2xl sm:max-h-[90vh]`}`}
            onClick={e => e.stopPropagation()}
          >
             {/* Gradient Ambience */}
            {type !== 'article' && <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent opacity-50 pointer-events-none" />}

            {/* Header - Fixed at top */}
            <div className={`px-5 ${type === 'article' ? 'sm:px-6 py-3 sm:py-4 border-white/10' : 'sm:px-8 py-4 sm:py-6 border-white/5'} border-b flex justify-between items-center bg-[#0f0f0f]/95 backdrop-blur-xl z-20 flex-shrink-0 pt-[max(env(safe-area-inset-top),16px)]`}>
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 tracking-tight">
                <span className="p-2 sm:p-2.5 bg-white/5 rounded-xl border border-white/10 shadow-inner">
                    {React.cloneElement(getIcon(), { size: 24 })}
                </span>
                <span className="truncate">
                    {type === 'article' ? '文章撰写' : `${isEditing ? t('admin.edit_item') : t('common.upload')} `}
                    {type !== 'article' && <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{t(`common.${type}`)}</span>}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                {type === 'article' && hasLocalDraft && !isEditing && (
                  <button type="button" onClick={restoreArticleDraft} className="hidden sm:inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
                    恢复草稿
                  </button>
                )}
                {type === 'article' && hasLocalDraft && !isEditing && (
                  <button type="button" onClick={clearArticleDraft} className="hidden sm:inline-flex px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-300 hover:bg-red-500/20 transition-colors">
                    清除草稿
                  </button>
                )}
                <button onClick={onClose} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-full transition-all border border-white/5">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Form Content - Scrollable */}
            <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar relative z-10 flex flex-col">
              <div className={`${type === 'article' ? 'p-4 sm:p-6' : 'p-5 sm:p-8'} flex-1 ${type === 'article' ? 'space-y-4 sm:space-y-5' : 'space-y-6 sm:space-y-8'}`}>
              {type === 'event' ? (
                <>
                {/* Event Specific Fields */}
                <div className="p-5 sm:p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-3xl relative overflow-hidden group shadow-lg">
                    <div className="absolute -right-4 -top-4 p-4 opacity-10 group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-500">
                        <Link size={100} className="text-green-500 transform rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Sparkles size={18} />
                            {t('upload.smart_parse_title', '智能识别')}
                        </h4>
                        <p className="text-sm text-green-100/60 mb-5 max-w-xl leading-relaxed">
                            {t('upload.smart_parse_desc', '粘贴微信公众号文章链接，一键自动提取活动详情。')}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Link size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500/50" />
                                <input
                                    type="text"
                                    value={wechatUrl}
                                    onChange={(e) => setWechatUrl(e.target.value)}
                                    placeholder="https://mp.weixin.qq.com/s/..."
                                    className="w-full bg-black/40 border border-green-500/30 rounded-2xl pl-11 pr-4 py-3.5 sm:py-3 text-white placeholder:text-green-500/30 focus:outline-none focus:border-green-500 focus:bg-black/60 transition-all text-sm shadow-inner"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleParseWeChat}
                                disabled={!wechatUrl || isParsing}
                                className="w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 whitespace-nowrap"
                            >
                                {isParsing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                                        {t('common.loading')}
                                    </>
                                ) : (
                                    <>
                                        <Check size={18} />
                                        {t('upload.smart_parse')}
                                    </>
                                )}
                            </button>
                            
                            {(wechatUrl || title) && (
                                <button 
                                    type="button"
                                    onClick={handleClearParsedData}
                                    className="w-full sm:w-auto px-6 py-3.5 sm:px-4 sm:py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-all border border-white/5 flex items-center justify-center gap-2"
                                    title={t('common.clear')}
                                >
                                    <RotateCcw size={18} />
                                    <span className="sm:hidden font-medium">{t('common.clear')}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Left Column: Media & Core Info */}
                  <div className="space-y-6 sm:space-y-8">
                     {/* Cover Image (Event Image) */}
                     <div className="space-y-3">
                        <label className={labelClasses}>{t('common.image')}</label>
                        <div 
                            className={`${uploadBoxClasses(dragTarget === 'cover')} h-48 sm:h-64`}
                            onDragEnter={(e) => handleDragEnter(e, 'cover')}
                            onDragLeave={handleDragLeave}
                            onDragOver={(e) => handleDragOver(e, 'cover')}
                            onDrop={(e) => handleDrop(e, true)}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, true)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            {coverPreview ? (
                                <div className="relative h-full w-full flex justify-center items-center pointer-events-none">
                                    <img src={coverPreview} alt="Cover Preview" className="h-full rounded-2xl object-contain shadow-lg" />
                                    <div className={`absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm ${dragTarget === 'cover' ? 'opacity-100' : ''}`}>
                                        <p className="text-sm font-medium text-white flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/20"><Upload size={16} /> {t('upload.replace')}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center pointer-events-none text-center">
                                    <div className={`p-4 rounded-full mb-4 transition-transform duration-300 ${dragTarget === 'cover' ? 'bg-indigo-500/20 text-indigo-400 scale-110' : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:text-white group-hover:scale-110'}`}>
                                        <Plus size={28} />
                                    </div>
                                    <span className={`text-base font-bold transition-colors ${dragTarget === 'cover' ? 'text-indigo-300' : 'text-gray-400 group-hover:text-white'}`}>
                                        {dragTarget === 'cover' ? t('upload.drop_image') : `${t('common.upload')} ${t('common.image')}`}
                                    </span>
                                </div>
                            )}
                        </div>
                     </div>

                     {/* Title & Description */}
                     <div className={cardClasses}>
                        <div>
                            <label className={labelClasses}>{t('common.title')}</label>
                            <input
                              type="text"
                              required
                              value={title}
                              onChange={e => setTitle(e.target.value)}
                              className={`${inputClasses} text-lg font-bold`}
                              placeholder={t('upload.title_placeholder')}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>{t('admin.fields.description')}</label>
                            <textarea
                              value={description}
                              onChange={e => setDescription(e.target.value)}
                              className={`${inputClasses} h-36 resize-none leading-relaxed py-4`}
                              placeholder={t('upload.description_placeholder')}
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>{t('upload.tags')}</label>
                            <TagInput 
                              value={tags}
                              onChange={setTags}
                              placeholder={t('upload.tags_placeholder')}
                              type="events"
                            />
                        </div>
                     </div>
                  </div>

                  {/* Right Column: Event Details */}
                  <div className="space-y-6 sm:space-y-8">
                      {/* Basic Info Card */}
                      <div className={cardClasses}>
                           <h4 className="text-sm font-black text-gray-300 uppercase tracking-widest flex items-center gap-2.5 pb-4 border-b border-white/10">
                               <Calendar size={16} className="text-indigo-400" /> {t('event_fields.basic_info')}
                           </h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 pt-2">
                               <div className="col-span-1">
                                    <label className={labelClasses}>{t('event_fields.start_date')}</label>
                                    <input
                                        type="datetime-local"
                                        step="1800"
                                        required
                                        value={eventDate ? (eventDate.length === 10 ? eventDate + 'T00:00' : eventDate.substring(0, 16)) : ''}
                                        onChange={e => setEventDate(e.target.value)}
                                        className={inputClasses}
                                    />
                               </div>
                               <div className="col-span-1">
                                    <label className={labelClasses}>{t('event_fields.end_date')}</label>
                                    <input
                                        type="datetime-local"
                                        step="1800"
                                        required
                                        value={eventEndDate ? (eventEndDate.length === 10 ? eventEndDate + 'T00:00' : eventEndDate.substring(0, 16)) : ''}
                                        onChange={e => setEventEndDate(e.target.value)}
                                        className={inputClasses}
                                    />
                               </div>
                               
                               {/* Date Reasoning Display */}
                               {dateReasoning && (
                                   <div className="col-span-1 sm:col-span-2 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 relative overflow-hidden">
                                       <div className="absolute top-0 right-0 p-3 opacity-10">
                                            <Sparkles size={40} className="text-indigo-400" />
                                       </div>
                                       <div className="flex items-start gap-3 sm:gap-4 relative z-10">
                                           <div className="p-2 bg-indigo-500/20 rounded-lg mt-0.5">
                                                <Sparkles size={16} className="text-indigo-400" />
                                           </div>
                                           <div>
                                               <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1.5">
                                                   {t('upload.ai_reasoning', 'AI 日期推断逻辑')}
                                               </h5>
                                               <p className="text-sm text-indigo-100/80 leading-relaxed font-medium">
                                                   {dateReasoning}
                                               </p>
                                           </div>
                                       </div>
                                   </div>
                               )}

                               <div className="col-span-1 md:col-span-2">
                                    <label className={labelClasses}>{t('common.location')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={eventLocation}
                                        onChange={e => setEventLocation(e.target.value)}
                                        className={inputClasses}
                                        placeholder={t('upload.location_placeholder')}
                                    />
                               </div>
                           </div>
                      </div>

                      {/* Attributes Card */}
                      <div className={cardClasses}>
                           <h4 className="text-sm font-black text-gray-300 uppercase tracking-widest flex items-center gap-2.5 pb-4 border-b border-white/10">
                               <Tag size={16} className="text-indigo-400" /> {t('event_fields.attributes')}
                           </h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 pt-2">
                               <div className="col-span-1">
                                   <label className={labelClasses}>{t('event_fields.volunteer_duration')}</label>
                                   <input
                                       type="text"
                                       value={eventVolunteerTime}
                                       onChange={e => setEventVolunteerTime(e.target.value)}
                                       className={inputClasses}
                                       placeholder={t('event_fields.volunteer_time_placeholder')}
                                   />
                               </div>
                               <div className="col-span-1">
                                   <label className={labelClasses}>{t('event_fields.organizer')}</label>
                                   <input
                                       type="text"
                                       value={eventOrganizer}
                                       onChange={e => setEventOrganizer(e.target.value)}
                                       className={inputClasses}
                                       placeholder={t('event_fields.organizer_placeholder')}
                                   />
                               </div>
                               <div className="col-span-1">
                                   <label className={labelClasses}>{t('event_fields.score_label')}</label>
                                   <input
                                       type="text"
                                       value={eventScore}
                                       onChange={e => setEventScore(e.target.value)}
                                       className={inputClasses}
                                       placeholder={t('event_fields.score_placeholder')}
                                   />
                               </div>
                               <div className="col-span-1">
                                   <label className={labelClasses}>{t('event_fields.target_audience')}</label>
                                   <input
                                       type="text"
                                       value={eventTarget}
                                       onChange={e => setEventTarget(e.target.value)}
                                       className={inputClasses}
                                       placeholder={t('event_fields.target_placeholder')}
                                   />
                               </div>
                               <div className="col-span-1 sm:col-span-2">
                                   <label className={labelClasses}>{t('upload.event_link')}</label>
                                   <div className="relative group">
                                       <Link size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                                       <input
                                           type="text"
                                           value={eventLink}
                                           onChange={e => setEventLink(e.target.value)}
                                           className={`${inputClasses} pl-11`}
                                           placeholder="https://..."
                                       />
                                   </div>
                               </div>
                           </div>
                      </div>
                  </div>
                </div>
                </>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {type === 'article' && (
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4 sm:gap-5">
                      <div className="space-y-4">
                        <input
                          type="text"
                          required
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          className="w-full bg-transparent border-0 border-b border-white/10 focus:border-white/25 text-2xl sm:text-3xl font-black tracking-tight text-white placeholder:text-gray-500 px-1 py-3 focus:outline-none"
                          placeholder="输入标题，开始写作"
                        />

                        <div className="py-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setArticleEditorMode('edit')} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${articleEditorMode === 'edit' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
                              <PenSquare size={14} />
                              撰写
                            </button>
                            <button type="button" onClick={() => setArticleEditorMode('preview')} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${articleEditorMode === 'preview' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}>
                              <Eye size={14} />
                              预览
                            </button>
                            <button type="button" onClick={() => articleImportInputRef.current?.click()} disabled={isImportingDocument} className="px-3 py-2 rounded-xl text-xs font-bold border bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 transition-colors inline-flex items-center gap-1.5 disabled:opacity-60">
                              <Upload size={14} />
                              {isImportingDocument ? '导入中...' : '导入文档'}
                            </button>
                            <input
                              ref={articleImportInputRef}
                              type="file"
                              accept=".docx,.pdf,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown"
                              className="hidden"
                              onChange={handleImportArticleDocument}
                            />
                            {hasLocalDraft && !isEditing && (
                              <button type="button" onClick={restoreArticleDraft} className="sm:hidden px-3 py-2 rounded-xl text-xs font-bold border bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 transition-colors">
                                恢复草稿
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 inline-flex items-center gap-1.5">
                            <span>{articleBlocks.length} 块</span>
                            <span>·</span>
                            <span>{articleWordCount} 词</span>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1"><Clock3 size={11} />{articleReadingMinutes} 分钟</span>
                          </div>
                        </div>

                        {articleEditorMode === 'edit' ? (
                          <div onPaste={handleArticleEditorPaste} className="space-y-3">
                            <div className="sticky top-0 z-20 bg-[#0f0f0f]/95 py-2 border-b border-white/10">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => updateActiveTextStyle('paragraph')} className={`px-2.5 py-1.5 rounded-md border text-[11px] transition-colors ${activeTextStyle === 'paragraph' ? 'bg-white text-black border-white' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10'}`}>正文</button>
                                <button type="button" onClick={() => updateActiveTextStyle('heading')} className={`px-2.5 py-1.5 rounded-md border text-[11px] transition-colors ${activeTextStyle === 'heading' ? 'bg-white text-black border-white' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10'}`}>标题</button>
                                <button type="button" onClick={() => updateActiveTextStyle('quote')} className={`px-2.5 py-1.5 rounded-md border text-[11px] transition-colors ${activeTextStyle === 'quote' ? 'bg-white text-black border-white' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10'}`}>引用</button>
                                <button type="button" onClick={() => updateActiveTextStyle('list')} className={`px-2.5 py-1.5 rounded-md border text-[11px] transition-colors inline-flex items-center gap-1.5 ${activeTextStyle === 'list' ? 'bg-white text-black border-white' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10'}`}><List size={12} />列表</button>
                                </div>
                                <div className="flex flex-wrap gap-2 sm:justify-end sm:ml-3">
                                {Object.entries(ARTICLE_BLOCK_META).map(([blockType, meta]) => {
                                  const BlockIcon = meta.icon;
                                  return (
                                    <button
                                      key={blockType}
                                      type="button"
                                      onClick={() => addArticleBlock(blockType)}
                                      className="px-2 py-1.5 rounded-md bg-white/[0.03] border border-white/10 text-gray-200 text-[11px] font-medium hover:bg-white/10 transition-all inline-flex items-center gap-1.5"
                                    >
                                      <BlockIcon size={12} />
                                      <span>+{meta.label}</span>
                                    </button>
                                  );
                                })}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {articleBlocks.map((block, index) => (
                                <div
                                  key={block.id}
                                  draggable
                                  onDragStart={() => handleArticleBlockDragStart(block.id)}
                                  onDragEnd={() => {
                                    setDraggingBlockId(null);
                                    setDragOverBlockId(null);
                                    setDragOverPosition('before');
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    if (draggingBlockId && draggingBlockId !== block.id) {
                                      setDragOverBlockId(block.id);
                                      setDragOverPosition(resolveDragOverPosition(e));
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverBlockId === block.id) {
                                      setDragOverBlockId(null);
                                      setDragOverPosition('before');
                                    }
                                  }}
                                  onDrop={() => handleArticleBlockDrop(block.id)}
                                  className={`relative border rounded-lg p-3 transition-all ${draggingBlockId === block.id ? 'opacity-60 border-indigo-400/50 bg-indigo-500/10' : 'border-white/10 bg-transparent hover:border-white/20'} ${dragOverBlockId === block.id && draggingBlockId !== block.id ? 'ring-2 ring-indigo-400/40 border-indigo-300/50' : ''}`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                      <GripVertical size={14} />
                                      <span>
                                        {(ARTICLE_BLOCK_META[block.type]?.label || block.type) + (block.type === 'text' ? ` · ${block.style === 'heading' ? '标题' : block.style === 'quote' ? '引用' : block.style === 'list' ? '列表' : '正文'}` : '')}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button type="button" aria-label="上移内容块" onClick={() => moveArticleBlock(block.id, 'up')} disabled={index === 0} className="p-1.5 rounded-md bg-white/5 border border-white/10 text-gray-300 disabled:opacity-40 hover:bg-white/10">
                                        <ArrowUp size={14} />
                                      </button>
                                      <button type="button" aria-label="下移内容块" onClick={() => moveArticleBlock(block.id, 'down')} disabled={index === articleBlocks.length - 1} className="p-1.5 rounded-md bg-white/5 border border-white/10 text-gray-300 disabled:opacity-40 hover:bg-white/10">
                                        <ArrowDown size={14} />
                                      </button>
                                      <button type="button" aria-label="删除内容块" onClick={() => removeArticleBlock(block.id)} disabled={articleBlocks.length <= 1} className="p-1.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 disabled:opacity-40 hover:bg-red-500/20">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                  {block.type === 'text' && (
                                    <>
                                      <textarea
                                        value={block.text}
                                        onChange={(e) => {
                                          const nextText = e.target.value;
                                          updateArticleBlock(block.id, { text: nextText });
                                          const lastLine = nextText.split('\n').at(-1)?.trim();
                                          setSlashMenuBlockId(lastLine === '/' ? block.id : null);
                                        }}
                                        onFocus={() => setActiveTextBlockId(block.id)}
                                        onKeyDown={(e) => handleArticleTextKeyDown(e, block)}
                                        className={`${inputClasses} h-32 text-[15px] leading-7`}
                                        placeholder="输入正文内容，输入 / 后回车可快速插入块"
                                      />
                                      {slashMenuBlockId === block.id && (
                                        <div className="mt-2 rounded-lg border border-white/15 bg-white/[0.04] p-2 flex flex-wrap gap-2">
                                          <button type="button" onClick={() => handleSlashCommandInsert(block, 'image')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-[11px] text-white hover:bg-white/15">图片块</button>
                                          <button type="button" onClick={() => handleSlashCommandInsert(block, 'video')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-[11px] text-white hover:bg-white/15">视频块</button>
                                          <button type="button" onClick={() => handleSlashCommandInsert(block, 'file')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-[11px] text-white hover:bg-white/15">附件块</button>
                                          <button type="button" onClick={() => handleSlashCommandInsert(block, 'text')} className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-[11px] text-white hover:bg-white/15">文字块</button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {(block.type === 'image' || block.type === 'video' || block.type === 'file') && (
                                    <div className="space-y-3">
                                      <div className="relative">
                                        <input
                                          type="file"
                                          accept={getArticleBlockAccept(block.type)}
                                          onChange={(e) => handleArticleBlockFileChange(block.id, block.type, e.target.files?.[0])}
                                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="h-24 rounded-xl border border-dashed border-white/20 bg-white/[0.03] flex items-center justify-center text-xs text-gray-300">
                                          {block.name || (block.type === 'file' ? '选择附件文件' : `选择${block.type === 'image' ? '图片' : '视频'}文件`)}
                                        </div>
                                      </div>
                                      {(block.type === 'image' || block.type === 'video') && block.url && (
                                        <div className="rounded-xl border border-white/10 bg-black/40 p-2">
                                          {block.type === 'image' ? (
                                            <img src={block.url} alt={block.caption || 'preview'} className="max-h-56 w-full rounded-lg object-contain" />
                                          ) : (
                                            <video src={block.url} controls className="max-h-56 rounded-lg w-full" />
                                          )}
                                        </div>
                                      )}
                                      {block.type === 'file' && (block.name || block.url) && (
                                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-gray-300 flex items-center gap-2">
                                          <Paperclip size={14} />
                                          <span className="truncate">{block.name || '附件'}</span>
                                        </div>
                                      )}
                                      {block.type !== 'file' && (
                                        <input
                                          type="text"
                                          value={block.caption || ''}
                                          onChange={(e) => updateArticleBlock(block.id, { caption: e.target.value })}
                                          className={inputClasses}
                                          placeholder="可选：说明文字"
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-white/10 bg-[#121212] p-5 space-y-4">
                            <div className="text-sm font-semibold text-white/90">{title || '未命名文章'}</div>
                            {articleBlocks.map((block) => (
                              <div key={`preview-${block.id}`} className="space-y-2">
                                {block.type === 'text' && (
                                  block.style === 'heading' ? (
                                    <h3 className="text-2xl font-black text-white leading-tight">{block.text || '（空标题）'}</h3>
                                  ) : block.style === 'quote' ? (
                                    <blockquote className="text-gray-300 leading-8 whitespace-pre-wrap border-l-4 border-indigo-400/60 pl-4 italic">{block.text || '（空引用）'}</blockquote>
                                  ) : block.style === 'list' ? (
                                    <ul className="list-disc pl-6 space-y-2 text-gray-200 leading-8">
                                      {(block.text || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line, idx) => (
                                        <li key={`${block.id}-list-${idx}`}>{line.replace(/^[-*]\s*/, '')}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-gray-200 leading-8 whitespace-pre-wrap">{block.text || '（空段落）'}</p>
                                  )
                                )}
                                {block.type === 'image' && block.url && (
                                  <figure className="space-y-2">
                                    <img src={block.url} alt={block.caption || 'preview'} className="w-full rounded-xl border border-white/10" />
                                    {block.caption && <figcaption className="text-xs text-gray-400">{block.caption}</figcaption>}
                                  </figure>
                                )}
                                {block.type === 'video' && block.url && (
                                  <figure className="space-y-2">
                                    <video src={block.url} controls className="w-full rounded-xl border border-white/10" />
                                    {block.caption && <figcaption className="text-xs text-gray-400">{block.caption}</figcaption>}
                                  </figure>
                                )}
                                {block.type === 'file' && (block.url || block.name) && (
                                  <a href={block.url || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-200">
                                    <Paperclip size={14} />
                                    <span>{block.name || '附件'}</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <aside className="space-y-4 xl:sticky xl:top-4 self-start">
                        <div className="rounded-xl border border-white/10 bg-[#121212] p-4 space-y-3.5">
                          <div className="text-xs font-semibold tracking-wider text-gray-400">发布设置</div>
                          <div>
                            <label className={labelClasses}>发布时间</label>
                            <input
                              type="date"
                              value={eventDate ? eventDate.split('T')[0] : ''}
                              onChange={e => setEventDate(e.target.value)}
                              className={inputClasses}
                            />
                          </div>
                          <div>
                            <label className={labelClasses}>文章封面</label>
                            <div className="h-[48px] rounded-2xl border border-white/10 bg-white/5 px-4 flex items-center justify-between gap-3 text-xs text-gray-400 relative overflow-hidden">
                              <input type="file" accept="image/*" onChange={e => handleFileChange(e, true)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                              <span className="truncate">{coverFile?.name || (coverPreview ? '已设置封面，点击可替换' : '点击上传封面图')}</span>
                              <span className="px-2 py-0.5 rounded-lg border border-white/10 bg-white/5 text-[10px]">JPG/PNG</span>
                            </div>
                          </div>
                          <div>
                            <label className={labelClasses}>{t('upload.tags')}</label>
                            <TagInput value={tags} onChange={setTags} placeholder={t('upload.tags_placeholder')} type="articles" />
                          </div>
                          <div>
                            <label className={labelClasses}>文章摘要</label>
                            <textarea
                              value={description}
                              onChange={e => setDescription(e.target.value)}
                              className={`${inputClasses} h-28 resize-none`}
                              placeholder="用于列表展示与搜索摘要，建议 40-120 字"
                            />
                          </div>
                          <div className="flex items-center gap-3 pt-1">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${featured ? 'bg-indigo-500 border-indigo-500' : 'bg-white/5 border-white/20 hover:border-white/40'}`} onClick={() => setFeatured(!featured)}>
                              {featured && <Check size={12} className="text-white" />}
                            </div>
                            <label className="text-sm text-gray-300 cursor-pointer" onClick={() => setFeatured(!featured)}>{t('common.featured')}</label>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                            <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
                              <span>发布完整度</span>
                              <span>{articleCompletion.percent}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full rounded-full bg-white/70" style={{ width: `${articleCompletion.percent}%` }} />
                            </div>
                            <div className="mt-2 text-[11px] text-gray-500">
                              已完成 {articleCompletion.completed}/{articleCompletion.total} 个内容块
                            </div>
                          </div>
                        </div>
                      </aside>
                    </div>
                  )}
                  <div className={type === 'article' ? 'hidden' : ''}>
                  {/* Main File Upload */}
                  {type !== 'event' && type !== 'article' && (
                  <div className="space-y-2">
                    <label className={labelClasses}>
                        {type === 'article' ? t('common.cover', '封面') : t(`common.${type}`)}
                    </label>
                     <div 
                        className={`${uploadBoxClasses(dragTarget === 'main')} min-h-[160px] sm:min-h-[200px]`}
                        onDragEnter={(e) => handleDragEnter(e, 'main')}
                        onDragLeave={handleDragLeave}
                        onDragOver={(e) => handleDragOver(e, 'main')}
                        onDrop={(e) => handleDrop(e, false)}
                    >
                        <input
                        type="file"
                        accept={getAcceptType()}
                        onChange={(e) => handleFileChange(e, false)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        
                        {preview ? (
                            type === 'audio' ? (
                                <div className="text-center relative z-20 pointer-events-none px-4">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2 sm:mb-3">
                                        <Music size={24} className="text-green-400 sm:w-8 sm:h-8" />
                                    </div>
                                    <p className="text-white font-medium text-sm break-all">{file?.name}</p>
                                    <p className="text-xs text-gray-400 mt-1">{t('upload.click_drag_replace')}</p>
                                </div>
                            ) : type === 'video' ? (
                                <div className="relative z-20 pointer-events-none w-full flex justify-center px-4">
                                    <video src={preview} className="max-h-48 sm:max-h-64 rounded-xl shadow-lg" controls />
                                </div>
                            ) : (
                                <div className="relative z-20 pointer-events-none px-4">
                                    <img src={preview} alt="Preview" className="max-h-48 sm:max-h-64 rounded-xl object-contain shadow-2xl" />
                                </div>
                            )
                        ) : (
                        <div className="flex flex-col items-center justify-center text-center pointer-events-none px-4">
                            <div className={`p-3 sm:p-4 rounded-full mb-3 sm:mb-4 transition-transform duration-300 ${dragTarget === 'main' ? 'bg-indigo-500/20 scale-110 text-indigo-400' : 'bg-white/5 text-gray-400 group-hover:bg-white/10 group-hover:scale-110 group-hover:text-white'}`}>
                               {dragTarget === 'main' ? <Upload size={24} className="sm:w-8 sm:h-8" /> : React.cloneElement(getIcon(), { size: 24, className: 'sm:w-8 sm:h-8' })}
                            </div>
                            <p className="text-white font-medium text-base sm:text-lg">
                            {dragTarget === 'main' ? t('upload.drop_file') : `${t('common.upload')} ${t(`common.${type}`)}`}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 max-w-xs mx-auto">
                                {t('upload.drag_drop_browse')}
                            </p>
                        </div>
                        )}
                    </div>
                  </div>
                  )}
                  

                  {/* Cover Image Upload (For Audio/Video) */}
                  {(type === 'audio' || type === 'video') && (
                     <div className="space-y-2">
                        <label className={labelClasses}>{t('common.cover')}</label>
                        <div 
                            className={`${uploadBoxClasses(dragTarget === 'cover')} h-32 sm:h-40`}
                            onDragEnter={(e) => handleDragEnter(e, 'cover')}
                            onDragLeave={handleDragLeave}
                            onDragOver={(e) => handleDragOver(e, 'cover')}
                            onDrop={(e) => handleDrop(e, true)}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, true)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            {coverPreview ? (
                                <div className="relative h-full w-full flex justify-center items-center pointer-events-none px-4">
                                    <img src={coverPreview} alt="Cover Preview" className="h-full rounded-lg object-contain" />
                                    <div className={`absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm ${dragTarget === 'cover' ? 'opacity-100' : ''}`}>
                                        <p className="text-xs text-white flex items-center gap-1"><Upload size={14}/> {t('upload.replace')}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center pointer-events-none">
                                    <Plus size={20} className={`mb-2 transition-colors sm:w-6 sm:h-6 ${dragTarget === 'cover' ? 'text-indigo-400' : 'text-gray-400'}`} />
                                    <span className={`text-xs font-medium transition-colors ${dragTarget === 'cover' ? 'text-indigo-300' : 'text-gray-500'}`}>
                                        {dragTarget === 'cover' ? t('upload.drop_image') : `${t('common.upload')} ${t('common.image')}`}
                                    </span>
                                </div>
                            )}
                        </div>
                     </div>
                  
                  )}

                  {/* Inputs Card */}
                  <div className={cardClasses}>
                    <div>
                      <label className={labelClasses}>{t('common.title')}</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className={`${inputClasses} text-lg font-medium`}
                        placeholder={t('upload.title_placeholder')}
                      />
                    </div>

                    {/* Image Specific Fields: Size */}
                    {type === 'image' && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className={labelClasses}>{t('common.size')}</label>
                                <input
                                    type="text"
                                    value={size}
                                    onChange={e => setSize(e.target.value)}
                                    className={inputClasses}
                                    placeholder={t('upload.size_placeholder')}
                                />
                            </div>
                            <div className="col-span-1">
                                <label className={labelClasses}>{t('upload.tags')}</label>
                                <TagInput 
                                    value={tags}
                                    onChange={setTags}
                                    placeholder={t('upload.tags_placeholder')}
                                    type={type === 'image' ? 'photos' : type === 'audio' ? 'music' : type}
                                />
                            </div>
                         </div>
                    )}
                    
                    {type !== 'image' && (
                        <div>
                            <label className={labelClasses}>{t('upload.tags')}</label>
                            <TagInput 
                                value={tags}
                                onChange={setTags}
                                placeholder={t('upload.tags_placeholder')}
                                type={type === 'image' ? 'photos' : type === 'audio' ? 'music' : type}
                            />
                        </div>
                    )}


                    {/* Audio Specific Fields */}
                    {type === 'audio' && (
                        <div>
                            <label className={labelClasses}>{t('common.artist')}</label>
                            <input
                                type="text"
                                value={artist}
                                onChange={e => setArtist(e.target.value)}
                                className={inputClasses}
                                placeholder={t('upload.artist_placeholder')}
                            />
                        </div>
                    )}

                    <div>
                      <label className={labelClasses}>{type === 'article' ? '文章摘要' : t('admin.fields.description')}</label>
                      <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className={`${inputClasses} ${type === 'article' ? 'h-28 sm:h-32' : 'h-20 sm:h-24'} resize-none`}
                        placeholder={type === 'article' ? '用于列表展示与搜索摘要，建议 40-120 字' : t('upload.description_placeholder')}
                      />
                    </div>
                    
                    {/* Featured Checkbox */}
                    <div className="flex items-center gap-3 pt-2">
                        <div 
                            className={`w-6 h-6 sm:w-5 sm:h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${featured ? 'bg-indigo-500 border-indigo-500' : 'bg-white/5 border-white/20 hover:border-white/40'}`}
                            onClick={() => setFeatured(!featured)}
                        >
                            {featured && <Check size={14} className="text-white sm:w-3 sm:h-3" />}
                        </div>
                        <label 
                            className="text-sm font-medium text-gray-300 select-none cursor-pointer hover:text-white transition-colors"
                            onClick={() => setFeatured(!featured)}
                        >
                            {t('common.featured')}
                        </label>
                    </div>
                  </div>
                  </div>
              </div>
              )}
              </div>

              {/* Submit Buttons - Sticky at bottom */}
              <div className="sticky bottom-0 bg-[#0f0f0f]/95 backdrop-blur-2xl border-t border-white/5 p-5 sm:p-8 mt-auto z-20 pb-[max(env(safe-area-inset-bottom),20px)] sm:pb-8 flex flex-col-reverse sm:flex-row justify-end gap-3 shadow-[0_-20px_40px_rgba(0,0,0,0.8)]">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-4 sm:py-3.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold text-sm border border-white/5 sm:border-none bg-white/5 sm:bg-transparent"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type={type === 'article' ? 'button' : 'submit'}
                  onClick={() => {
                    if (type === 'article') {
                      setSubmitIntent('publish');
                      formRef.current?.requestSubmit();
                    }
                  }}
                  disabled={isUploading}
                  className="w-full sm:w-auto px-8 py-4 sm:py-3.5 bg-white text-black rounded-2xl hover:bg-gray-100 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 font-black text-sm shadow-xl shadow-white/10"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                      <span>{t('upload.uploading')}...</span>
                    </>
                  ) : (
                    <>
                      {type === 'article' ? <PenSquare size={20} /> : <Upload size={20} />}
                      <span>{isEditing ? t('common.save') : type === 'article' ? '提交发布' : t('common.upload_now')}</span>
                    </>
                  )}
                </button>
                {type === 'article' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitIntent('draft');
                      formRef.current?.requestSubmit();
                    }}
                    disabled={isUploading}
                    className="w-full sm:w-auto px-6 py-4 sm:py-3.5 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10"
                  >
                    <PenSquare size={18} />
                    <span>保存草稿</span>
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default UploadModal;
