import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ImagePlus, Film, Paperclip, Calendar, Users, Loader2, ArrowUp, ArrowDown, Trash2, Link as LinkIcon, Plus, GripVertical, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api, { uploadFile } from '../services/api';

const createBlock = (type = 'text') => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  text: '',
  url: '',
  caption: '',
  name: '',
  size: 0,
  mime: '',
  file: null,
});

const PostComposer = ({ isOpen, onClose, section = 'help', onSuccess }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isDayMode = uiMode === 'day';

  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState([createBlock('text')]);
  const [tags, setTags] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [link, setLink] = useState('');
  const [relatedArticleIds, setRelatedArticleIds] = useState('');
  const [relatedPostIds, setRelatedPostIds] = useState('');
  const [relatedNewsIds, setRelatedNewsIds] = useState('');
  const [relatedGroupIds, setRelatedGroupIds] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState(null);
  const fileInputRefs = useRef({});

  const isTeam = section === 'team';
  const isHelp = section === 'help';
  const accentInputClass = isDayMode
    ? (isTeam ? 'focus:ring-violet-300/50 focus:border-violet-300' : 'focus:ring-amber-300/50 focus:border-amber-300')
    : (isTeam ? 'focus:ring-violet-500/30 focus:border-violet-500/40' : 'focus:ring-amber-500/30 focus:border-amber-500/40');
  const accentTextareaClass = isDayMode
    ? (isTeam ? 'focus:ring-violet-300/50' : 'focus:ring-amber-300/50')
    : (isTeam ? 'focus:ring-violet-500/30' : 'focus:ring-amber-500/30');

  const resetForm = useCallback(() => {
    setTitle('');
    setBlocks([createBlock('text')]);
    setTags('');
    setDeadline('');
    setMaxMembers('');
    setLink('');
    setRelatedArticleIds('');
    setRelatedPostIds('');
    setRelatedNewsIds('');
    setRelatedGroupIds('');
  }, []);

  const handleClose = useCallback(() => {
    if (submitting) return;
    resetForm();
    onClose();
  }, [submitting, resetForm, onClose]);

  // Block operations
  const addBlock = useCallback((type) => {
    setBlocks((prev) => [...prev, createBlock(type)]);
  }, []);

  const removeBlock = useCallback((id) => {
    setBlocks((prev) => prev.length <= 1 ? prev : prev.filter((b) => b.id !== id));
  }, []);

  const updateBlock = useCallback((id, updates) => {
    setBlocks((prev) => prev.map((b) => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const moveBlock = useCallback((id, direction) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
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
      if (url) {
        updateBlock(blockId, { url, name: file.name, size: file.size, mime: file.type, file: null });
      }
    } catch {
      toast.error(t('community.post_upload_failed', '文件上传失败'));
    } finally {
      setUploadingBlockId(null);
    }
  }, [updateBlock, t]);

  const handleSubmit = useCallback(async () => {
    if (!user) { toast.error(t('auth.signin_required')); return; }
    if (title.trim().length < 4) {
      toast.error(t('community.post_title_too_short', '标题至少 4 个字'));
      return;
    }

    // Validate: at least one text block with content
    const hasText = blocks.some((b) => b.type === 'text' && b.text.trim().length >= 8);
    if (!hasText) {
      toast.error(t('community.post_content_too_short', '正文至少 8 个字'));
      return;
    }

    // Build content_blocks (strip file objects)
    const contentBlocks = blocks
      .filter((b) => {
        if (b.type === 'text') return b.text.trim();
        return b.url;
      })
      .map(({ file: _file, ...rest }) => ({ ...rest, style: rest.type === 'text' ? 'paragraph' : undefined }));

    // Plain text content for backward compat
    const plainContent = blocks
      .filter((b) => b.type === 'text' && b.text.trim())
      .map((b) => b.text.trim())
      .join('\n\n');

    const body = {
      section,
      title: title.trim(),
      content: plainContent,
      content_blocks: JSON.stringify(contentBlocks),
      tags: tags.trim(),
      related_article_ids: relatedArticleIds.trim(),
      related_post_ids: relatedPostIds.trim(),
      related_news_ids: relatedNewsIds.trim(),
      related_group_ids: relatedGroupIds.trim(),
    };

    if (isTeam) {
      if (deadline) body.deadline = deadline;
      if (maxMembers) body.max_members = parseInt(maxMembers, 10) || undefined;
      if (link.trim()) body.link = link.trim();
    }

    setSubmitting(true);
    try {
      await api.post('/community/posts', body);
      toast.success(t('community.post_created', '发布成功'));
      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = err.response?.data?.error || t('community.post_create_failed', '发布失败');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [user, title, blocks, tags, section, isTeam, deadline, maxMembers, link, t, resetForm, onClose, onSuccess]);

  const getAccept = (type) => {
    if (type === 'image') return 'image/*';
    if (type === 'video') return 'video/*';
    return '*/*';
  };

  const blockTypesForSection = isHelp
    ? [
        { type: 'text', icon: FileText, label: '文字' },
        { type: 'image', icon: ImagePlus, label: '图片' },
        { type: 'video', icon: Film, label: '视频' },
        { type: 'file', icon: Paperclip, label: '附件' },
      ]
    : [
        { type: 'text', icon: FileText, label: '文字' },
        { type: 'image', icon: ImagePlus, label: '图片' },
        { type: 'file', icon: Paperclip, label: '附件' },
      ];

  const inputCls = `w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 ${isDayMode ? `bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 ${accentInputClass}` : `bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${accentInputClass}`}`;
  const labelCls = `text-sm font-medium ${isDayMode ? 'text-slate-700' : 'text-gray-300'}`;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md ${isDayMode ? 'bg-white/60' : 'bg-black/70'}`}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl ${isDayMode ? 'bg-white border-slate-200/80' : 'bg-[#141414] border-white/10'}`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
              <h3 className={`text-lg font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                {isTeam ? t('community.post_new_team', '发布组队帖') : t('community.post_new_help', '发布求助帖')}
              </h3>
              <button onClick={handleClose} className={`p-2 rounded-full transition-colors ${isDayMode ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                <X size={20} />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <label className={labelCls}>
                  {t('community.post_title_label', '标题')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isTeam ? t('community.post_title_placeholder_team', '例：招募 CV 方向组队伙伴') : t('community.post_title_placeholder_help', '例：CUDA 报错求助')}
                  maxLength={100}
                  className={inputCls}
                />
              </div>

              {/* Content Blocks */}
              <div className="space-y-2">
                <label className={labelCls}>
                  {t('community.post_content_label', '内容')} <span className="text-red-400">*</span>
                </label>
                <div className="space-y-3">
                  {blocks.map((block, index) => (
                    <div key={block.id} className={`relative rounded-xl border p-3 transition-all ${isDayMode ? 'border-slate-200/80 bg-slate-50/50' : 'border-white/10 bg-white/[0.02]'}`}>
                      {/* Block header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className={`flex items-center gap-1.5 text-xs ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          <GripVertical size={12} />
                          <span>{blockTypesForSection.find((bt) => bt.type === block.type)?.label || block.type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveBlock(block.id, 'up')} disabled={index === 0} className={`p-1 rounded-md border transition-colors disabled:opacity-30 ${isDayMode ? 'border-slate-200 text-slate-400 hover:bg-slate-100' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                            <ArrowUp size={12} />
                          </button>
                          <button type="button" onClick={() => moveBlock(block.id, 'down')} disabled={index === blocks.length - 1} className={`p-1 rounded-md border transition-colors disabled:opacity-30 ${isDayMode ? 'border-slate-200 text-slate-400 hover:bg-slate-100' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                            <ArrowDown size={12} />
                          </button>
                          <button type="button" onClick={() => removeBlock(block.id)} disabled={blocks.length <= 1} className={`p-1 rounded-md border transition-colors disabled:opacity-30 ${isDayMode ? 'border-red-200 text-red-400 hover:bg-red-50' : 'border-red-500/30 text-red-400 hover:bg-red-500/10'}`}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Block content */}
                      {block.type === 'text' && (
                        <textarea
                          value={block.text}
                          onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                          placeholder={t('community.post_content_placeholder', '描述你的问题或需求...')}
                          rows={4}
                          className={`w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none transition-all focus:ring-2 ${isDayMode ? `bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 ${accentTextareaClass}` : `bg-white/5 border-white/10 text-white placeholder:text-gray-500 ${accentTextareaClass}`}`}
                        />
                      )}

              {(block.type === 'image' || block.type === 'video' || block.type === 'file') && (
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
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              />
                              <div className={`h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-xs transition-colors ${isDayMode ? 'border-slate-200 text-slate-400 hover:border-slate-300' : 'border-white/15 text-gray-500 hover:border-white/25'}`}>
                                {uploadingBlockId === block.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <span>点击选择{block.type === 'image' ? '图片' : block.type === 'video' ? '视频' : '文件'}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              {block.type === 'image' && (
                                <div className={`rounded-lg overflow-hidden border ${isDayMode ? 'border-slate-200' : 'border-white/10'}`}>
                                  <img src={block.url} alt={block.caption || ''} className="max-h-48 w-full object-contain bg-black/5" />
                                </div>
                              )}
                              {block.type === 'video' && (
                                <div className={`rounded-lg overflow-hidden border ${isDayMode ? 'border-slate-200' : 'border-white/10'}`}>
                                  <video src={block.url} controls className="max-h-48 w-full" />
                                </div>
                              )}
                              {block.type === 'file' && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${isDayMode ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-gray-300'}`}>
                                  <Paperclip size={14} />
                                  <span className="truncate">{block.name || '附件'}</span>
                                  {!!block.size && <span className="text-gray-400 ml-auto">{(block.size / 1024).toFixed(0)}KB</span>}
                                </div>
                              )}
                              {block.type !== 'file' && (
                                <input
                                  type="text"
                                  value={block.caption || ''}
                                  onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                                  placeholder="可选：说明文字"
                                  className={`w-full px-3 py-1.5 rounded-lg border text-xs outline-none transition-all ${isDayMode ? 'bg-white border-slate-200 text-slate-700 placeholder:text-slate-400' : 'bg-white/5 border-white/10 text-gray-300 placeholder:text-gray-500'}`}
                                />
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add block buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {blockTypesForSection.map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addBlock(type)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isDayMode ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <Plus size={12} />
                      <Icon size={12} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>跨模块关联（ID）</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={relatedArticleIds} onChange={(e) => setRelatedArticleIds(e.target.value)} placeholder="相关文章 ID，如 12,15" className={inputCls} />
                  <input value={relatedPostIds} onChange={(e) => setRelatedPostIds(e.target.value)} placeholder="相关讨论 ID，如 31,35" className={inputCls} />
                  <input value={relatedNewsIds} onChange={(e) => setRelatedNewsIds(e.target.value)} placeholder="相关新闻 ID，如 5,6" className={inputCls} />
                  <input value={relatedGroupIds} onChange={(e) => setRelatedGroupIds(e.target.value)} placeholder="相关社群 ID，如 8,9" className={inputCls} />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className={labelCls}>{t('community.post_tags_label', '标签')}</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder={t('community.post_tags_placeholder', '用逗号分隔，如 PyTorch, CUDA')}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 ${isDayMode ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-slate-300/50' : 'bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:ring-white/10'}`}
                />
              </div>

              {/* Team-specific fields */}
              {isTeam && (
                <div className={`space-y-4 p-4 rounded-2xl border ${isDayMode ? 'bg-violet-50/50 border-violet-100' : 'bg-violet-500/5 border-violet-500/15'}`}>
                  {/* Activity link */}
                  <div className="space-y-2">
                    <label className={`text-sm font-medium flex items-center gap-1.5 ${isDayMode ? 'text-slate-700' : 'text-gray-300'}`}>
                      <LinkIcon size={14} />
                      {t('community.post_link_label', '活动链接')}
                    </label>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://example.com/event"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 ${isDayMode ? 'bg-white border-violet-200 text-slate-900 focus:ring-violet-300/50' : 'bg-white/5 border-white/10 text-white focus:ring-violet-500/30'}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`text-sm font-medium flex items-center gap-1.5 ${isDayMode ? 'text-slate-700' : 'text-gray-300'}`}>
                        <Calendar size={14} />
                        {t('community.post_deadline_label', '截止日期')}
                      </label>
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 ${isDayMode ? 'bg-white border-violet-200 text-slate-900 focus:ring-violet-300/50' : 'bg-white/5 border-white/10 text-white focus:ring-violet-500/30'}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-sm font-medium flex items-center gap-1.5 ${isDayMode ? 'text-slate-700' : 'text-gray-300'}`}>
                        <Users size={14} />
                        {t('community.post_max_members_label', '招募人数')}
                      </label>
                      <input
                        type="number"
                        value={maxMembers}
                        onChange={(e) => setMaxMembers(e.target.value)}
                        min={2}
                        max={50}
                        placeholder="5"
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 ${isDayMode ? 'bg-white border-violet-200 text-slate-900 focus:ring-violet-300/50' : 'bg-white/5 border-white/10 text-white focus:ring-violet-500/30'}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium border transition-all ${isDayMode ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                >
                  {t('common.cancel', '取消')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !title.trim()}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isTeam ? (isDayMode ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-violet-600 text-white hover:bg-violet-500') : (isDayMode ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-600 text-white hover:bg-amber-500')}`}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      {t('community.post_submitting', '发布中...')}
                    </span>
                  ) : (
                    t('community.post_submit', '发布')
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default PostComposer;
