import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import { communityTheme } from './communityUtils';

/**
 * Shared full-screen detail modal used by all community sections.
 *
 * Props:
 *   item            – the selected post/article; null = closed
 *   onClose         – callback to close
 *   isDayMode       – day/night toggle
 *   gradientFrom    – Tailwind gradient-from class (e.g. "from-amber-900/30")
 *   headerHeight    – header div height classes (default "h-56 sm:h-72")
 *   coverImage      – optional cover image URL for article modals
 *   headerContent   – JSX rendered inside the title overlay area
 *   authorBar       – JSX for the right side of the author bar (buttons, etc.)
 *   beforeContent   – JSX inserted before the content blocks (e.g. team progress)
 *   contentBlocks   – parsed content blocks array
 *   htmlContent     – fallback HTML string (sanitised before render)
 *   afterContent    – JSX inserted after content blocks (e.g. tags, comments)
 */
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
}) => {
  const { t } = useTranslation();
  const th = communityTheme(isDayMode);

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
              {/* Header gradient / cover */}
              <div
                className={`${headerHeight} bg-gradient-to-br ${gradientFrom} ${th.gradientTo} relative ${coverImage ? 'bg-cover bg-center' : ''}`}
                style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
              >
                {!coverImage && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${th.gradientTo}`} />
                )}

                {/* Close button */}
                <button
                  onClick={onClose}
                  className={`absolute top-6 right-6 p-2 rounded-full backdrop-blur-md border transition-all z-20 group ${th.closeBtn}`}
                >
                  <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>

                {/* Title overlay */}
                <div
                  className={`absolute bottom-0 left-0 px-6 pt-6 pb-6 md:px-10 md:pt-10 md:pb-8 w-full z-20 ${coverImage ? 'pt-48' : 'pt-32'} -mb-1 backdrop-blur-[2px] ${th.titleOverlay}`}
                >
                  {headerContent}
                </div>
              </div>

              {/* Body */}
              <div className="px-5 sm:px-8 md:px-12 pt-4 pb-12 max-w-5xl mx-auto">
                {/* Author bar */}
                <div className={`flex items-center justify-between gap-3 mb-8 pb-6 border-b ${th.borderSubtle}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${th.avatarBg}`}>
                      {item.author_avatar ? (
                        <img src={item.author_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className={th.textSecondary} />
                      )}
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${th.textPrimary}`}>
                        {item.author_name || t('common.anonymous', '匿名用户')}
                      </div>
                      <div className={`text-xs ${th.textTertiary}`}>{t('common.author')}</div>
                    </div>
                  </div>
                  {authorBar}
                </div>

                {beforeContent}

                {/* Content blocks */}
                {contentBlocks.length > 0 ? (
                  <div className="space-y-6 mb-10">
                    {contentBlocks.map((block, bIdx) => (
                      <div key={block.id || `${block.type}-${bIdx}`}>
                        {block.type === 'text' && (
                          <p className={`whitespace-pre-wrap break-words leading-8 text-lg ${th.textContent}`}>
                            {block.text}
                          </p>
                        )}
                        {block.type === 'image' && block.url && (
                          <figure className="space-y-2">
                            <div className={`rounded-2xl overflow-hidden border ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/20'}`}>
                              <img src={block.url} alt={block.caption || ''} className="w-full object-cover" />
                            </div>
                            {block.caption && (
                              <figcaption className={`text-sm ${th.textSecondary}`}>{block.caption}</figcaption>
                            )}
                          </figure>
                        )}
                        {block.type === 'video' && block.url && (
                          <figure className="space-y-2">
                            <div className={`rounded-2xl overflow-hidden border ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/20'}`}>
                              <video src={block.url} controls className="w-full" preload="metadata">
                                {t('community.video_not_supported', '您的浏览器不支持视频播放')}
                              </video>
                            </div>
                            {block.caption && (
                              <figcaption className={`text-sm ${th.textSecondary}`}>{block.caption}</figcaption>
                            )}
                          </figure>
                        )}
                        {block.type === 'file' && block.url && (
                          <a
                            href={block.url}
                            download={block.name || true}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${isDayMode ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'}`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDayMode ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/15 text-amber-400'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium truncate ${th.textPrimary}`}>
                                {block.name || t('community.file_attachment', '附件')}
                              </div>
                              {block.size && (
                                <div className={`text-xs ${th.textTertiary}`}>{(block.size / 1024).toFixed(1)} KB</div>
                              )}
                            </div>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : htmlContent ? (
                  <div
                    className={`prose prose-lg max-w-none leading-relaxed break-words mb-10 ${th.prose}`}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
                  />
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
