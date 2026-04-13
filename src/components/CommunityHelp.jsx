import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, User, Upload, AlertCircle, MessageCircle, Send, CheckCircle, Clock, FileText, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import SortSelector from './SortSelector';
import { useCachedResource } from '../hooks/useCachedResource';
import DOMPurify from 'dompurify';
import { useReducedMotion } from '../utils/animations';
import { useBackClose } from '../hooks/useBackClose';
import PostCard from './PostCard';
import PostComposer from './PostComposer';
import { parseContentBlocks } from './communityUtils';

const STATUS_TABS = [
  { key: 'all', label: 'community.tab_all' },
  { key: 'open', label: 'community.tab_help' },
  { key: 'solved', label: 'community.tab_solved' },
];


const CommunityHelp = () => {
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === 'day';
  const isPaginationEnabled = settings.pagination_enabled === 'true';
  const pageSize = isPaginationEnabled ? 10 : 15;
  const [displayPosts, setDisplayPosts] = useState([]);

  useBackClose(selectedPost !== null, () => setSelectedPost(null));

  const queryParams = useMemo(() => {
    const p = { page: currentPage, limit: pageSize, sort, section: 'help' };
    if (statusFilter !== 'all') p.status = statusFilter;
    return p;
  }, [currentPage, pageSize, sort, statusFilter]);

  const {
    data: posts,
    pagination,
    loading: isLoading,
    error,
    refresh
  } = useCachedResource('/community/posts', queryParams, {
    dependencies: [settings.pagination_enabled, statusFilter]
  });

  const totalPages = pagination?.totalPages || 1;
  const hasMore = !isPaginationEnabled && currentPage < totalPages;

  const effectivePosts = useMemo(() => posts || [], [posts]);

  useEffect(() => { setCurrentPage(1); }, [sort, statusFilter, settings.pagination_enabled]);

  useEffect(() => {
    if (isPaginationEnabled) {
      setDisplayPosts(effectivePosts);
      return;
    }
    setDisplayPosts((prev) => {
      if (currentPage === 1) return effectivePosts;
      const seen = new Set(prev.map((item) => item.id));
      const next = effectivePosts.filter((item) => !seen.has(item.id));
      return next.length === 0 ? prev : [...prev, ...next];
    });
  }, [effectivePosts, currentPage, isPaginationEnabled]);

  // FIX: B8 — Add AbortController to deep-link fetch
  useEffect(() => {
    const postId = searchParams.get('post');
    if (!postId) return;
    const ac = new AbortController();
    api.get(`/community/posts/${postId}`, { signal: ac.signal })
      .then((res) => { if (res.data) setSelectedPost(res.data); })
      .catch(() => {});
    return () => ac.abort();
  }, [searchParams]);

  // FIX: B10 — Add AbortController to comment fetch
  useEffect(() => {
    if (!selectedPost) { setComments([]); return; }
    const ac = new AbortController();
    setLoadingComments(true);
    api.get(`/community/posts/${selectedPost.id}/comments`, { signal: ac.signal })
      .then((res) => { if (!ac.signal.aborted) setComments(res.data || []); })
      .catch(() => { if (!ac.signal.aborted) setComments([]); })
      .finally(() => { if (!ac.signal.aborted) setLoadingComments(false); });
    return () => ac.abort();
  }, [selectedPost?.id]);

  const handlePostClick = useCallback((post) => {
    setSelectedPost(post);
  }, []);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleComposerSuccess = useCallback(() => {
    refresh({ clearCache: true });
  }, [refresh]);

  const handleSubmitComment = useCallback(async () => {
    if (!user) { toast.error(t('auth.signin_required')); return; }
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/community/posts/${selectedPost.id}/comments`, { content: commentText.trim() });
      setComments((prev) => [res.data, ...prev]);
      setCommentText('');
      // Update comment count in post
      setSelectedPost((prev) => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev);
    } catch {
      toast.error(t('community.post_comment_failed', '评论失败'));
    } finally {
      setSubmittingComment(false);
    }
  }, [user, commentText, selectedPost?.id, t]);

  const handleMarkSolved = useCallback(async () => {
    if (!selectedPost) return;
    try {
      await api.put(`/community/posts/${selectedPost.id}/status`, { status: 'solved' });
      setSelectedPost((prev) => prev ? { ...prev, status: 'solved' } : prev);
      toast.success(t('community.post_marked_solved', '已标记为解决'));
      refresh({ clearCache: true });
    } catch {
      toast.error(t('community.post_mark_solved_failed', '操作失败'));
    }
  }, [selectedPost, t, refresh]);

  const selectedContentBlocks = useMemo(
    () => parseContentBlocks(selectedPost?.content_blocks),
    [selectedPost?.content_blocks]
  );

  return (
    <div role="tabpanel" aria-labelledby="tab-help">
      {/* Controls: status tabs + sort + post button */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-3">
          {/* Status filter tabs */}
          <div className="flex items-center gap-2">
            {STATUS_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${statusFilter === key
                  ? (isDayMode ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-amber-600 text-white border-amber-600')
                  : (isDayMode ? 'bg-white/80 text-slate-600 border-slate-200/80 hover:bg-slate-50' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10')
                }`}
              >
                {t(label)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block w-40">
              <SortSelector sort={sort} onSortChange={setSort} />
            </div>
            <button
              onClick={() => {
                if (!user) { toast.error(t('auth.signin_required')); return; }
                setIsComposerOpen(true);
              }}
              className={`p-2 md:p-3 rounded-full backdrop-blur-md border transition-all ${isDayMode ? 'bg-white/85 hover:bg-white text-slate-700 border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
              title={t('community.post_new_help', '发帖')}
            >
              <Upload size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Post List */}
      <div className="space-y-4">
        {isLoading && displayPosts.length === 0 ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className={`backdrop-blur-xl border rounded-3xl p-5 md:p-6 animate-pulse ${isDayMode ? 'bg-white/82 border-slate-200/80' : 'bg-[#1a1a1a]/40 border-white/5'}`}>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className={`h-5 rounded-full w-14 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
                  <div className={`h-5 rounded w-20 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
                </div>
                <div className={`h-6 rounded w-3/4 ${isDayMode ? 'bg-slate-100' : 'bg-white/10'}`} />
                <div className={`h-4 rounded w-full ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
                <div className={`h-4 rounded w-1/2 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
              </div>
            </div>
          ))
        ) : displayPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className={`rounded-3xl p-8 mb-6 border backdrop-blur-xl ${isDayMode ? 'bg-amber-50/80 border-amber-100/80' : 'bg-amber-500/10 border-white/5'}`}>
              <HelpCircle size={64} className="text-amber-400 opacity-80" />
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('community.help_empty', '暂无帖子')}</h3>
            <p className={`text-center max-w-md ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {t('community.help_empty_desc', '成为第一个发帖的人吧！')}
            </p>
          </div>
        ) : (
          displayPosts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              index={index}
              onClick={handlePostClick}
              canAnimate={!prefersReducedMotion && index < 8}
              isDayMode={isDayMode}
            />
          ))
        )}
      </div>

      {/* Load more */}
      {!isLoading && !error && displayPosts.length > 0 && !isPaginationEnabled && hasMore && (
        <div className="flex items-center justify-center pt-10">
          <motion.button
            whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            className={`px-6 py-2.5 rounded-full border transition-colors text-sm font-semibold ${isDayMode ? 'bg-white/88 hover:bg-white text-slate-700 border-slate-200/80' : 'bg-white/10 hover:bg-white/15 text-white border-white/10'}`}
          >
            {t('common.load_more', '加载更多')}
          </motion.button>
        </div>
      )}

      {settings.pagination_enabled === 'true' && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}

      {/* Post Detail Modal (方案A: 全屏弹窗) */}
      {createPortal(
        <AnimatePresence>
          {selectedPost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-[100] backdrop-blur-md overflow-y-auto ${isDayMode ? 'bg-white/70' : 'bg-black/90'}`}
              onClick={() => setSelectedPost(null)}
            >
              <div className="min-h-full">
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className={`relative w-full min-h-screen shadow-2xl overflow-hidden ${isDayMode ? 'bg-white' : 'bg-[#0a0a0a]'}`}
                >
                  {/* Header Gradient (no cover image for posts) */}
                  <div className="h-56 sm:h-72 bg-gradient-to-br from-amber-900/30 to-black relative">
                    <button
                      onClick={() => setSelectedPost(null)}
                      className={`absolute top-6 right-6 p-2 rounded-full backdrop-blur-md border transition-all z-20 group ${isDayMode ? 'bg-white/82 hover:bg-white text-slate-700 border-slate-200/80' : 'bg-black/40 hover:bg-black/60 text-white border-white/10'}`}
                    >
                      <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                    <div className={`absolute bottom-0 left-0 px-6 pt-6 pb-6 md:px-10 md:pt-10 md:pb-8 w-full z-20 pt-32 -mb-1 backdrop-blur-[2px] ${isDayMode ? 'bg-gradient-to-t from-white via-white/92 to-transparent' : 'bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent'}`}>
                      {/* Status badge */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${selectedPost.status === 'solved' ? (isDayMode ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20') : (isDayMode ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20')}`}>
                          {selectedPost.status === 'solved' ? t('community.post_status_solved', '已解决') : t('community.post_status_open', '待答')}
                        </span>
                        <span className={`text-sm font-mono ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                          {selectedPost.created_at && new Date(selectedPost.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <h2 className={`text-3xl md:text-5xl font-black leading-tight tracking-tight font-serif ${isDayMode ? 'text-slate-900' : 'text-white drop-shadow-2xl'}`}>
                        {selectedPost.title}
                      </h2>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-5 sm:px-8 md:px-12 pt-4 pb-12 max-w-5xl mx-auto">
                    {/* Author bar */}
                    <div className={`flex items-center justify-between gap-3 mb-8 pb-6 border-b ${isDayMode ? 'border-slate-200/80' : 'border-white/5'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${isDayMode ? 'bg-slate-100' : 'bg-gray-700'}`}>
                          {selectedPost.author_avatar ? (
                            <img src={selectedPost.author_avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className={isDayMode ? 'text-slate-500' : 'text-gray-400'} />
                          )}
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                            {selectedPost.author_name || t('common.anonymous', '匿名用户')}
                          </div>
                          <div className={`text-xs flex items-center gap-2 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
                            <span className="flex items-center gap-1"><Clock size={11} />{selectedPost.views_count || 0} {t('community.post_views', '浏览')}</span>
                          </div>
                        </div>
                      </div>
                      {/* Mark as solved (only for post owner or admin, and only if open) */}
                      {selectedPost.status !== 'solved' && user && (user.id === selectedPost.author_id || user.role === 'admin') && (
                        <button
                          onClick={handleMarkSolved}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${isDayMode ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}
                        >
                          <CheckCircle size={16} />
                          {t('community.post_mark_solved', '标记已解决')}
                        </button>
                      )}
                    </div>

                    {/* Post body */}
                    {selectedContentBlocks.length > 0 ? (
                      <div className="space-y-6 mb-10">
                        {selectedContentBlocks.map((block, bIdx) => (
                          <div key={block.id || `${block.type}-${bIdx}`}>
                            {block.type === 'text' && (
                              <p className={`whitespace-pre-wrap leading-8 text-lg ${isDayMode ? 'text-slate-700' : 'text-gray-300'}`}>
                                {block.text}
                              </p>
                            )}
                            {block.type === 'image' && block.url && (
                              <figure className="space-y-2">
                                <div className={`rounded-2xl overflow-hidden border ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/20'}`}>
                                  <img src={block.url} alt={block.caption || ''} className="w-full object-cover" />
                                </div>
                                {block.caption && <figcaption className={`text-sm ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{block.caption}</figcaption>}
                              </figure>
                            )}
                            {block.type === 'video' && block.url && (
                              <figure className="space-y-2">
                                <div className={`rounded-2xl overflow-hidden border ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/20'}`}>
                                  <video src={block.url} controls className="w-full" preload="metadata">
                                    {t('community.video_not_supported', '您的浏览器不支持视频播放')}
                                  </video>
                                </div>
                                {block.caption && <figcaption className={`text-sm ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{block.caption}</figcaption>}
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
                                  <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-medium truncate ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{block.name || t('community.file_attachment', '附件')}</div>
                                  {block.size && <div className={`text-xs ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>{(block.size / 1024).toFixed(1)} KB</div>}
                                </div>
                                <Download size={16} className={isDayMode ? 'text-slate-400' : 'text-gray-500'} />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : selectedPost.content && (
                      <div
                        className={`prose prose-lg max-w-none leading-relaxed mb-10 ${isDayMode ? 'prose-slate text-slate-700' : 'prose-invert text-gray-300'}`}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedPost.content) }}
                      />
                    )}

                    {/* Tags */}
                    {selectedPost.tags && selectedPost.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-8">
                        {(Array.isArray(selectedPost.tags) ? selectedPost.tags : []).map((tag) => (
                          <span
                            key={tag}
                            className={`px-3 py-1 rounded-lg text-xs font-medium ${isDayMode ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-gray-400'}`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Comments section */}
                    <div className={`border-t pt-8 ${isDayMode ? 'border-slate-200/80' : 'border-white/5'}`}>
                      <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                        <MessageCircle size={20} />
                        {comments.length} {t('community.post_replies', '条回复')}
                      </h3>

                      {/* Comment input */}
                      <div className={`flex gap-3 mb-8 p-4 rounded-2xl border ${isDayMode ? 'bg-slate-50/80 border-slate-200/80' : 'bg-white/[0.03] border-white/10'}`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isDayMode ? 'bg-slate-200' : 'bg-gray-700'}`}>
                          <User size={16} className={isDayMode ? 'text-slate-500' : 'text-gray-400'} />
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder={t('community.post_write_reply', '写回复...')}
                            rows={2}
                            className={`w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none transition-all focus:ring-2 ${isDayMode ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-amber-300/50' : 'bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:ring-amber-500/30'}`}
                          />
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={handleSubmitComment}
                              disabled={submittingComment || !commentText.trim()}
                              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${isDayMode ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-amber-600 text-white hover:bg-amber-500'}`}
                            >
                              <Send size={12} />
                              {t('community.post_send_reply', '发送')}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Comment list */}
                      {loadingComments ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className={`flex gap-3 p-4 rounded-2xl animate-pulse ${isDayMode ? 'bg-slate-50' : 'bg-white/[0.02]'}`}>
                              <div className={`w-8 h-8 rounded-full flex-shrink-0 ${isDayMode ? 'bg-slate-200' : 'bg-white/10'}`} />
                              <div className="flex-1 space-y-2">
                                <div className={`h-3 w-24 rounded ${isDayMode ? 'bg-slate-200' : 'bg-white/10'}`} />
                                <div className={`h-4 w-full rounded ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : comments.length === 0 ? (
                        <p className={`text-center py-8 text-sm ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
                          {t('community.post_no_replies', '暂无回复，来说两句吧')}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {comments.map((comment) => (
                            <div
                              key={comment.id}
                              className={`flex gap-3 p-4 rounded-2xl border ${isDayMode ? 'bg-slate-50/60 border-slate-200/60' : 'bg-white/[0.02] border-white/5'}`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${isDayMode ? 'bg-slate-200' : 'bg-gray-700'}`}>
                                {comment.avatar ? (
                                  <img src={comment.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User size={14} className={isDayMode ? 'text-slate-500' : 'text-gray-400'} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-sm font-semibold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                                    {comment.author || comment.author_name || t('common.anonymous', '匿名用户')}
                                  </span>
                                  <span className={`text-xs ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                    {comment.created_at && new Date(comment.created_at).toLocaleDateString('zh-CN')}
                                  </span>
                                </div>
                                <p className={`text-sm leading-relaxed ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Post Composer */}
      <PostComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        section="help"
        onSuccess={handleComposerSuccess}
      />
    </div>
  );
};

export default CommunityHelp;
