import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Share2, Copy, ChevronRight, Newspaper, BookOpen, MessageSquare, Users } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../services/api';
import { communityTheme, extractTocItems, flattenLinkedResources } from './communityUtils';
import { LinkifiedText, linkifyHtml } from '../utils/linkify';

const TYPE_META = {
  article: { label: '文章', icon: BookOpen },
  post: { label: '讨论', icon: MessageSquare },
  news: { label: '新闻', icon: Newspaper },
  group: { label: '社群', icon: Users },
};

const CommunityDetailModal = ({
  item,
  onClose,
  isDayMode,
  gradientFrom = 'from-amber-900/30',
  headerHeight = 'h-56 sm:h-72',
  coverImage,
  headerContent,
  authorBar,
  beforeContent,
  contentBlocks = [],
  htmlContent,
  afterContent,
  shareParam = 'id',
  onRelatedSelect,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const th = communityTheme(isDayMode);
  const tocItems = useMemo(() => extractTocItems(contentBlocks), [contentBlocks]);
  const uploaderId = item?.uploader_id ?? item?.author_id ?? null;
  const canGoProfile = uploaderId != null;

  const handleAuthorNavigate = () => {
    if (!canGoProfile) return;
    navigate(`/user/${uploaderId}`);
  };

  const handleAuthorKeyDown = (event) => {
    if (!canGoProfile) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAuthorNavigate();
    }
  };
  const relatedGroups = useMemo(() => flattenLinkedResources(item?.linked_resources), [item?.linked_resources]);
  const relatedGroupCandidates = useMemo(() => (Array.isArray(item?.linked_resources?.groups) ? item.linked_resources.groups : []), [item?.linked_resources?.groups]);
  const primaryJoinGroup = useMemo(
    () => relatedGroupCandidates.find((group) => group?.id && String(group.id) !== String(item?.id)) || null,
    [item?.id, relatedGroupCandidates],
  );

  const shareUrl = useMemo(() => {
    if (!item?.id || typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set(shareParam, String(item.id));
    return url.toString();
  }, [item?.id, shareParam]);

  const handleShare = async () => {
    if (!item) return;
    const payload = {
      title: item.title || item.name || t('community.detail', '内容详情'),
      text: item.excerpt || item.description || '',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        if (shareParam === 'id') {
          api.post('/community/metrics/track', {
            metric_type: 'article_share',
            source_type: 'article',
            source_id: item.id,
          }).catch(() => {});
        }
        return;
      }
    } catch (_error) {
      // Fallback to clipboard below.
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl || payload.title);
      toast.success('链接已复制');
      if (shareParam === 'id') {
        api.post('/community/metrics/track', {
          metric_type: 'article_share',
          source_type: 'article',
          source_id: item.id,
        }).catch(() => {});
      }
    }
  };

  const scrollToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderTextBlock = (block, blockKey, headingId) => {
    if (block.style === 'heading') {
      return (
        <h3 id={headingId} className={`scroll-mt-24 text-2xl md:text-3xl font-black tracking-tight ${th.textPrimary}`}>
          {block.text}
        </h3>
      );
    }

    if (block.style === 'quote') {
      return (
        <blockquote className={`border-l-4 pl-5 italic text-lg leading-8 ${isDayMode ? 'border-orange-300 text-slate-600 bg-orange-50/60' : 'border-orange-400/50 text-gray-200 bg-orange-500/5'} rounded-r-2xl py-3`}>
          <LinkifiedText text={block.text} />
        </blockquote>
      );
    }

    if (block.style === 'list') {
      const items = String(block.text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      return (
        <ul className={`space-y-2 pl-6 list-disc text-lg leading-8 ${th.textContent}`}>
          {items.map((line, idx) => (
            <li key={`${blockKey}-li-${idx}`}>
              <LinkifiedText text={line} />
            </li>
          ))}
        </ul>
      );
    }

    if (block.style === 'code' || block.type === 'code') {
      return (
        <div className={`rounded-2xl border overflow-hidden ${isDayMode ? 'bg-white border-slate-200/80 shadow-[0_16px_34px_rgba(148,163,184,0.14)]' : 'bg-black border-white/10'}`}>
          <div className={`px-4 py-2 text-xs uppercase tracking-[0.2em] ${isDayMode ? 'bg-slate-50 text-slate-500' : 'bg-white/5 text-gray-400'}`}>
            {block.language || 'code'}
          </div>
          <pre className="overflow-x-auto px-4 py-4 text-sm leading-6 text-slate-100">
            <code>{block.text || ''}</code>
          </pre>
        </div>
      );
    }

    return (
      <p className={`whitespace-pre-wrap break-words leading-8 text-lg ${th.textContent}`}>
        <LinkifiedText text={block.text} />
      </p>
    );
  };

  const renderRelatedCard = (resource) => {
    const meta = TYPE_META[resource.type] || TYPE_META.article;
    const Icon = meta.icon;
    const title = resource.title || resource.name || '未命名内容';
    const desc = resource.excerpt || resource.description || '';
    const clickable = typeof onRelatedSelect === 'function';

    return (
      <button
        key={`${resource.type}-${resource.id}`}
        type="button"
        onClick={() => clickable && onRelatedSelect(resource)}
        disabled={!clickable}
        className={`w-full text-left rounded-2xl border p-4 transition-colors ${isDayMode ? 'bg-white border-slate-200 hover:bg-slate-50' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'} ${!clickable ? 'cursor-default' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center ${isDayMode ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-gray-300'}`}>
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className={`text-sm font-bold truncate ${th.textPrimary}`}>{title}</div>
              {clickable && <ChevronRight size={16} className={th.textTertiary} />}
            </div>
            <div className={`mt-1 text-[11px] uppercase tracking-[0.18em] ${th.textTertiary}`}>{meta.label}</div>
            {desc ? (
              <p className={`mt-2 text-sm line-clamp-2 ${th.textSecondary}`}>{desc}</p>
            ) : null}
          </div>
        </div>
      </button>
    );
  };

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] backdrop-blur-md overflow-y-auto ${th.modalBackdrop}`}
          onClick={onClose}
        >
          <div className="min-h-full">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative w-full min-h-screen shadow-2xl overflow-hidden ${th.modalSurface}`}
            >
              <div
                className={`${headerHeight} bg-gradient-to-br ${gradientFrom} ${th.gradientTo} relative ${coverImage ? 'bg-cover bg-center' : ''}`}
                style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
              >
                {!coverImage && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${th.gradientTo}`} />
                )}

                <button
                  onClick={onClose}
                  className={`absolute top-6 right-6 p-2 rounded-full backdrop-blur-md border transition-all z-20 group ${th.closeBtn}`}
                >
                  <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>

                <div
                  className={`absolute bottom-0 left-0 px-6 pt-6 pb-6 md:px-10 md:pt-10 md:pb-8 w-full z-20 ${coverImage ? 'pt-48' : 'pt-32'} -mb-1 backdrop-blur-[2px] ${th.titleOverlay}`}
                >
                  {headerContent}
                </div>
              </div>

              <div className="px-5 sm:px-8 md:px-12 pt-4 pb-12 max-w-5xl mx-auto">
                <div className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b ${th.borderSubtle}`}>
                  <div
                    role="button"
                    tabIndex={canGoProfile ? 0 : -1}
                    aria-disabled={!canGoProfile}
                    aria-label={
                      canGoProfile
                        ? t('community.view_author_profile', '查看作者主页')
                        : t('community.anonymous_author_no_profile', '匿名作者无主页')
                    }
                    onClick={canGoProfile ? handleAuthorNavigate : undefined}
                    onKeyDown={canGoProfile ? handleAuthorKeyDown : undefined}
                    className={`flex items-center gap-3 rounded-2xl -mx-2 px-2 py-1 transition-colors ${
                      canGoProfile
                        ? `cursor-pointer ${isDayMode ? 'hover:bg-slate-100 focus:bg-slate-100' : 'hover:bg-white/10 focus:bg-white/10'} focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60`
                        : 'cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${
                        canGoProfile
                          ? th.avatarBg
                          : isDayMode
                            ? 'bg-slate-200 text-slate-400'
                            : 'bg-white/10 text-gray-500'
                      }`}
                    >
                      {canGoProfile && item.author_avatar ? (
                        <img src={item.author_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className={canGoProfile ? th.textSecondary : ''} />
                      )}
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${th.textPrimary}`}>
                        {canGoProfile
                          ? item.author_name || t('common.anonymous', '匿名用户')
                          : t('common.anonymous', '匿名用户')}
                      </div>
                      <div className={`text-xs ${th.textTertiary}`}>{t('common.author')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleShare}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${isDayMode ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-white/5 text-gray-200 border-white/10 hover:bg-white/10'}`}
                    >
                      <Share2 size={16} />
                      分享
                    </button>
                    {shareUrl ? (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(shareUrl)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${isDayMode ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-white/5 text-gray-200 border-white/10 hover:bg-white/10'}`}
                      >
                        <Copy size={16} />
                        复制链接
                      </button>
                    ) : null}
                    {authorBar}
                  </div>
                </div>

                {tocItems.length >= 2 ? (
                  <div className={`mb-8 rounded-3xl border p-5 ${isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'}`}>
                    <div className={`text-xs uppercase tracking-[0.22em] mb-3 ${th.textTertiary}`}>目录</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {tocItems.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => scrollToSection(entry.id)}
                          className={`text-left rounded-xl px-3 py-2 text-sm transition-colors ${isDayMode ? 'text-slate-700 hover:bg-white' : 'text-gray-300 hover:bg-white/5'}`}
                        >
                          {entry.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {beforeContent}

                {primaryJoinGroup ? (
                  <div className={`mb-8 rounded-2xl border p-4 ${isDayMode ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/10 border-blue-500/30'}`}>
                    <div className={`text-xs uppercase tracking-[0.2em] mb-2 ${isDayMode ? 'text-blue-700' : 'text-blue-300'}`}>
                      社群入口
                    </div>
                    <p className={`text-sm mb-3 ${isDayMode ? 'text-blue-800' : 'text-blue-100'}`}>
                      当前内容有对应社群，可直接加入继续交流。
                    </p>
                    <button
                      type="button"
                      onClick={() => onRelatedSelect?.({ ...primaryJoinGroup, type: 'group' })}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${isDayMode ? 'bg-white text-blue-700 border-blue-300 hover:bg-blue-100' : 'bg-blue-500/20 text-blue-200 border-blue-400/40 hover:bg-blue-500/30'}`}
                    >
                      加入相关社群
                      <ChevronRight size={15} />
                    </button>
                  </div>
                ) : null}

                {contentBlocks.length > 0 ? (
                  <div className="space-y-6 mb-10">
                    {contentBlocks.map((block, bIdx) => {
                      const headingEntry = tocItems.find((entry) => entry.index === bIdx);
                      const headingId = headingEntry?.id;
                      return (
                        <div key={block.id || `${block.type}-${bIdx}`}>
                          {block.type === 'text' || block.type === 'code'
                            ? renderTextBlock(block, block.id || `${block.type}-${bIdx}`, headingId)
                            : null}
                          {block.type === 'image' && block.url ? (
                            <figure className="space-y-2">
                              <div className={`rounded-2xl overflow-hidden border ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/20'}`}>
                                <img src={block.url} alt={block.caption || ''} className="w-full object-cover" />
                              </div>
                              {block.caption ? (
                                <figcaption className={`text-sm ${th.textSecondary}`}>{block.caption}</figcaption>
                              ) : null}
                            </figure>
                          ) : null}
                          {block.type === 'video' && block.url ? (
                            <figure className="space-y-2">
                              <div className={`rounded-2xl overflow-hidden border ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/20'}`}>
                                <video src={block.url} controls className="w-full" preload="metadata">
                                  {t('community.video_not_supported', '您的浏览器不支持视频播放')}
                                </video>
                              </div>
                              {block.caption ? (
                                <figcaption className={`text-sm ${th.textSecondary}`}>{block.caption}</figcaption>
                              ) : null}
                            </figure>
                          ) : null}
                          {block.type === 'file' && block.url ? (
                            <a
                              href={block.url}
                              download={block.name || true}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${isDayMode ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'}`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDayMode ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/15 text-amber-400'}`}>
                                <Copy size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium truncate ${th.textPrimary}`}>
                                  {block.name || t('community.file_attachment', '附件')}
                                </div>
                                {block.size ? (
                                  <div className={`text-xs ${th.textTertiary}`}>{(block.size / 1024).toFixed(1)} KB</div>
                                ) : null}
                              </div>
                            </a>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : htmlContent ? (
                  <div
                    className={`prose prose-lg max-w-none leading-relaxed break-words mb-10 ${th.prose}`}
                    dangerouslySetInnerHTML={{
                      // linkify first (wraps bare URLs in <a>), then sanitize
                      // so DOMPurify keeps our added anchors and strips
                      // anything else unsafe.
                      __html: DOMPurify.sanitize(linkifyHtml(htmlContent), {
                        ADD_ATTR: ['target', 'rel'],
                      }),
                    }}
                  />
                ) : null}

                {relatedGroups.length > 0 ? (
                  <div className="mb-10 space-y-6">
                    {relatedGroups.map((group) => (
                      <section key={group.key}>
                        <div className={`text-xs uppercase tracking-[0.22em] mb-3 ${th.textTertiary}`}>{group.label}</div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {group.items.map(renderRelatedCard)}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : null}

                {afterContent}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default CommunityDetailModal;
