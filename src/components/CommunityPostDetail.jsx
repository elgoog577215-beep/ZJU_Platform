import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MessageCircle, Send, User, CheckCircle, Award, Reply, Quote, X, Flag, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CommunityDetailModal from './CommunityDetailModal';
import { parseContentBlocks, communityTheme } from './communityUtils';

/**
 * Full post-detail view with comments, used by Help and Team sections.
 *
 * Props:
 *   post            - selected post object (null = closed)
 *   onClose         - callback
 *   isDayMode       - theme
 *   gradientFrom    - e.g. "from-amber-900/30"
 *   headerContent   - JSX for title overlay
 *   authorBar       - JSX for author-bar right side
 *   beforeContent   - JSX before content blocks (e.g. team progress)
 *   showComments    - boolean (default true)
 *   onSolve         - callback(commentId) for adopting best answer (help section)
 */
const CommunityPostDetail = ({
  post,
  onClose,
  isDayMode,
  gradientFrom,
  headerContent,
  authorBar,
  beforeContent,
  showComments = true,
  onSolve,
  onRelatedSelect,
  onCommentsCountChange,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const th = communityTheme(isDayMode);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyContext, setReplyContext] = useState(null);
  const [commentSort, setCommentSort] = useState('oldest');
  const [expandedFloors, setExpandedFloors] = useState({});
  const [expandedCommentText, setExpandedCommentText] = useState({});

  const contentBlocks = useMemo(() => parseContentBlocks(post?.content_blocks), [post?.content_blocks]);

  const canAdopt = onSolve && post && post.status !== 'solved' && user && (user.id === post.author_id || user.role === 'admin');
  const canDeletePost = Boolean(post && user && (user.id === post.author_id || user.role === 'admin'));
  const bestAnswerId = post?.solved_comment_id;

  const sortedComments = useMemo(() => {
    if (!bestAnswerId || comments.length === 0) return comments;
    const best = comments.find((c) => c.id === bestAnswerId || (Array.isArray(c.replies) && c.replies.some((r) => r.id === bestAnswerId)));
    const rest = comments.filter((c) => c.id !== best?.id);
    return best ? [best, ...rest] : comments;
  }, [comments, bestAnswerId]);

  const totalCommentCount = useMemo(
    () =>
      comments.reduce(
        (sum, floor) => sum + 1 + (Array.isArray(floor.replies) ? floor.replies.length : 0),
        0,
      ),
    [comments],
  );

  const postId = post?.id;

  // FIX: Keep latest callback in a ref so fetchComments doesn't depend on it.
  // Parents often pass a new function reference each render (useCommunityFeed's
  // return object is a fresh literal every render), which would otherwise make
  // fetchComments unstable and re-fetch on every parent render.
  const onCommentsCountChangeRef = useRef(onCommentsCountChange);
  useEffect(() => {
    onCommentsCountChangeRef.current = onCommentsCountChange;
  });

  const fetchComments = useCallback((signal) => {
    if (!postId || !showComments) {
      setComments([]);
      setLoadingComments(false);
      return Promise.resolve();
    }
    setLoadingComments(true);
    return api
      .get(`/community/posts/${postId}/comments`, { params: { sort: commentSort }, signal })
      .then((res) => {
        if (signal?.aborted) return;
        const loaded = Array.isArray(res.data) ? res.data : [];
        setComments(loaded);
        setLoadingComments(false);
        // FIX: Only push count to parent AFTER a successful load. Previously a
        // useEffect fired on mount with comments=[] (total=0), overwriting the
        // list's real comments_count with 0.
        const total = loaded.reduce(
          (sum, floor) => sum + 1 + (Array.isArray(floor.replies) ? floor.replies.length : 0),
          0,
        );
        onCommentsCountChangeRef.current?.(postId, total);
      })
      .catch((err) => {
        if (signal?.aborted) return;
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          setComments([]);
        }
        setLoadingComments(false);
      });
  }, [postId, showComments, commentSort]);

  // Fetch comments
  useEffect(() => {
    const ac = new AbortController();
    fetchComments(ac.signal);
    return () => ac.abort();
  }, [fetchComments]);

  useEffect(() => {
    setReplyContext(null);
    setCommentText('');
    setExpandedFloors({});
    setExpandedCommentText({});
  }, [post?.id]);

  const handleSubmitComment = useCallback(async () => {
    if (!user) { toast.error(t('auth.signin_required')); return; }
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post(`/community/posts/${post.id}/comments`, {
        content: commentText.trim(),
        parent_id: replyContext?.parentId || null,
        reply_to_comment_id: replyContext?.replyToCommentId || null,
      });
      await fetchComments();
      setCommentText('');
      setReplyContext(null);
    } catch {
      toast.error(t('community.post_comment_failed', '评论失败'));
    } finally {
      setSubmittingComment(false);
    }
  }, [user, commentText, post?.id, replyContext, t, fetchComments]);

  const handleAdopt = useCallback(async (commentId) => {
    if (!onSolve) return;
    onSolve(commentId);
  }, [onSolve]);

  const handleReport = useCallback(async ({ targetType, targetId = null }) => {
    if (!post?.id) return;
    if (!user) {
      toast.error(t('auth.signin_required'));
      return;
    }
    const reason = window.prompt('可选：补充举报原因（最多 300 字）') || '';
    try {
      await api.post(`/community/posts/${post.id}/report`, {
        target_type: targetType,
        target_id: targetId,
        reason: reason.trim().slice(0, 300),
      });
      toast.success('已提交举报，管理员会尽快处理');
    } catch (error) {
      if (error?.response?.status === 409) {
        toast.error('你已举报过该内容');
      } else {
        toast.error('举报失败，请稍后再试');
      }
    }
  }, [post?.id, t, user]);

  const handleDeletePost = useCallback(async () => {
    if (!post?.id) return;
    if (!canDeletePost) {
      toast.error('无删除权限');
      return;
    }
    if (!window.confirm('确认删除该求助帖吗？删除后将不可恢复。')) return;
    try {
      await api.delete(`/community/posts/${post.id}`);
      toast.success('帖子已删除');
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.error || '删除帖子失败');
    }
  }, [canDeletePost, onClose, post?.id]);

  const handleDeleteComment = useCallback(async (commentId) => {
    if (!post?.id || !commentId) return;
    if (!window.confirm('确认删除这条回复吗？')) return;
    try {
      await api.delete(`/community/posts/${post.id}/comments/${commentId}`);
      toast.success('回复已删除');
      await fetchComments();
    } catch (error) {
      toast.error(error?.response?.data?.error || '删除回复失败');
    }
  }, [fetchComments, post?.id]);

  const openReply = useCallback((floor, target, asQuote = false) => {
    const safeText = String(target?.content || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    setReplyContext({
      parentId: floor.id,
      replyToCommentId: target.id,
      mode: asQuote ? 'quote' : 'reply',
      author: target.author || target.author_name || t('common.anonymous', '匿名用户'),
      preview: safeText,
    });
  }, [t]);

  const toggleReplies = useCallback((floorId) => {
    setExpandedFloors((prev) => ({ ...prev, [floorId]: !prev[floorId] }));
  }, []);

  const toggleCommentText = useCallback((commentId) => {
    setExpandedCommentText((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  }, []);

  const renderCommentText = useCallback((commentId, content, size = 'base') => {
    const text = String(content || '');
    const threshold = size === 'small' ? 180 : 280;
    const expanded = !!expandedCommentText[commentId];
    const shouldCollapse = text.length > threshold;
    const shown = shouldCollapse && !expanded ? `${text.slice(0, threshold)}...` : text;
    return (
      <div>
        <p className={`${size === 'small' ? 'text-xs' : 'text-sm'} leading-relaxed ${th.textContent} whitespace-pre-wrap break-words`}>{shown}</p>
        {shouldCollapse && (
          <button
            type="button"
            onClick={() => toggleCommentText(commentId)}
            className={`mt-1 text-[11px] font-medium ${isDayMode ? 'text-amber-700 hover:text-amber-800' : 'text-amber-300 hover:text-amber-200'}`}
          >
            {expanded ? t('community.collapse_text', '收起') : t('community.expand_text', '展开全文')}
          </button>
        )}
      </div>
    );
  }, [expandedCommentText, isDayMode, t, th.textContent, toggleCommentText]);

  const floorsWithExtraReplies = useMemo(
    () => (sortedComments || []).filter((c) => Array.isArray(c.replies) && c.replies.length > 3).map((c) => c.id),
    [sortedComments]
  );
  const hasExpandedFloor = useMemo(
    () => floorsWithExtraReplies.some((id) => expandedFloors[id]),
    [floorsWithExtraReplies, expandedFloors]
  );
  const toggleAllReplies = useCallback(() => {
    if (floorsWithExtraReplies.length === 0) return;
    if (hasExpandedFloor) {
      const next = {};
      floorsWithExtraReplies.forEach((id) => { next[id] = false; });
      setExpandedFloors((prev) => ({ ...prev, ...next }));
    } else {
      const next = {};
      floorsWithExtraReplies.forEach((id) => { next[id] = true; });
      setExpandedFloors((prev) => ({ ...prev, ...next }));
    }
  }, [floorsWithExtraReplies, hasExpandedFloor]);

  // Tags + comments JSX
  const afterContent = post && (
    <>
      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {(Array.isArray(post.tags) ? post.tags : []).map((tag) => (
            <span key={tag} className={`px-3 py-1 rounded-lg text-xs font-medium ${isDayMode ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-gray-400'}`}>
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleReport({ targetType: 'post' })}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border ${isDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10'}`}
        >
          <Flag size={12} />
          {t('community.report', '举报')}
        </button>
        {canDeletePost && (
          <button
            type="button"
            onClick={handleDeletePost}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border ${isDayMode ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-rose-300 border-rose-500/25 hover:bg-rose-500/10'}`}
          >
            <Trash2 size={12} />
            {t('common.delete', '删除')}
          </button>
        )}
      </div>
      {post.status === 'solved' && Array.isArray(post.linked_resources?.articles) && post.linked_resources.articles.length > 0 && (
        <div className={`mb-8 rounded-2xl border p-4 ${isDayMode ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
          <div className={`text-xs font-semibold uppercase tracking-[0.2em] mb-2 ${isDayMode ? 'text-emerald-700' : 'text-emerald-300'}`}>
            {t('community.solved_recommend', '已解决推荐阅读')}
          </div>
          <p className={`text-sm mb-3 ${isDayMode ? 'text-emerald-800' : 'text-emerald-100'}`}>
            {t('community.solved_recommend_desc', '该问题已解决，可继续阅读相关文章深入了解。')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {post.linked_resources.articles.slice(0, 2).map((article) => (
              <button
                key={`solved-article-${article.id}`}
                type="button"
                onClick={() => onRelatedSelect?.({ ...article, type: 'article' })}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${isDayMode ? 'bg-white border-emerald-200 hover:bg-emerald-50' : 'bg-black/20 border-emerald-500/20 hover:bg-emerald-500/10'}`}
              >
                <p className={`text-sm font-semibold line-clamp-1 ${isDayMode ? 'text-slate-800' : 'text-white'}`}>{article.title}</p>
                <p className={`mt-1 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('community.read_article', '查看文章详情')}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      {Array.isArray(post.linked_resources?.groups) && post.linked_resources.groups.length > 0 && (
        <div className={`mb-8 rounded-2xl border p-4 ${isDayMode ? 'bg-blue-50/70 border-blue-200' : 'bg-blue-500/10 border-blue-500/30'}`}>
          <div className={`text-xs font-semibold uppercase tracking-[0.2em] mb-2 ${isDayMode ? 'text-blue-700' : 'text-blue-300'}`}>
            {t('community.group_entry', '社群入口')}
          </div>
          <p className={`text-sm mb-3 ${isDayMode ? 'text-blue-800' : 'text-blue-100'}`}>
            {t('community.group_entry_desc', '相关社群正在持续讨论这个问题，点击可直接查看。')}
          </p>
          <button
            type="button"
            onClick={() => onRelatedSelect?.({ ...post.linked_resources.groups[0], type: 'group' })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${isDayMode ? 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50' : 'bg-blue-500/20 text-blue-200 border-blue-400/40 hover:bg-blue-500/30'}`}
          >
            {t('community.join_related_group', '加入相关社群')}
          </button>
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className={`border-t pt-8 ${th.borderSubtle}`}>
          <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${th.textPrimary}`}>
            <MessageCircle size={20} />
            {totalCommentCount} {t('community.post_replies', '条回复')}
          </h3>
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCommentSort('oldest')}
              className={`px-2.5 py-1 rounded-md text-xs border ${commentSort === 'oldest' ? 'bg-amber-500 text-white border-amber-500' : (isDayMode ? 'text-slate-600 border-slate-200' : 'text-gray-300 border-white/10')}`}
            >
              {t('community.reply_sort_oldest', '楼层')}
            </button>
            <button
              type="button"
              onClick={() => setCommentSort('newest')}
              className={`px-2.5 py-1 rounded-md text-xs border ${commentSort === 'newest' ? 'bg-amber-500 text-white border-amber-500' : (isDayMode ? 'text-slate-600 border-slate-200' : 'text-gray-300 border-white/10')}`}
            >
              {t('community.reply_sort_newest', '最新')}
            </button>
            <button
              type="button"
              onClick={() => setCommentSort('hot')}
              className={`px-2.5 py-1 rounded-md text-xs border ${commentSort === 'hot' ? 'bg-amber-500 text-white border-amber-500' : (isDayMode ? 'text-slate-600 border-slate-200' : 'text-gray-300 border-white/10')}`}
            >
              {t('community.reply_sort_hot', '最热')}
            </button>
            {floorsWithExtraReplies.length > 0 && (
              <button
                type="button"
                onClick={toggleAllReplies}
                className={`ml-auto px-2.5 py-1 rounded-md text-xs border ${isDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10'}`}
              >
                {hasExpandedFloor
                  ? t('community.collapse_all_replies', '收起全部二级回复')
                  : t('community.expand_all_replies', '展开全部二级回复')}
              </button>
            )}
          </div>

          {/* Input */}
          <div className={`flex gap-3 mb-8 p-4 rounded-2xl border ${th.commentBg}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isDayMode ? 'bg-slate-200' : 'bg-gray-700'}`}>
              <User size={16} className={th.textSecondary} />
            </div>
            <div className="flex-1">
              {replyContext && (
                <div className={`mb-2 rounded-lg border px-3 py-2 flex items-start justify-between gap-3 ${isDayMode ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${isDayMode ? 'text-amber-700' : 'text-amber-300'}`}>
                      {replyContext.mode === 'quote'
                        ? t('community.quote_replying_to', '正在引用 {{name}}', { name: replyContext.author })
                        : t('community.replying_to', '正在回复 {{name}}', { name: replyContext.author })}
                    </p>
                    <p className={`text-xs truncate ${isDayMode ? 'text-amber-600' : 'text-amber-200/80'}`}>{replyContext.preview}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyContext(null)}
                    className={`p-1 rounded-md ${isDayMode ? 'text-amber-700 hover:bg-amber-100' : 'text-amber-300 hover:bg-amber-500/20'}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('community.post_write_reply', '写回复...')}
                rows={2}
                className={`w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none transition-all focus:ring-2 ${th.inputBg} focus:ring-amber-300/50`}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSubmitComment}
                  disabled={submittingComment || !commentText.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 bg-amber-500 text-white hover:bg-amber-600"
                >
                  <Send size={12} />
                  {t('community.post_send_reply', '发送')}
                </button>
              </div>
            </div>
          </div>

          {/* List */}
          {loadingComments ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`flex gap-3 p-4 rounded-2xl animate-pulse ${isDayMode ? 'bg-slate-50' : 'bg-white/[0.02]'}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 ${isDayMode ? 'bg-slate-200' : 'bg-white/10'}`} />
                  <div className="flex-1 space-y-2">
                    <div className={`h-3 w-24 rounded ${isDayMode ? 'bg-slate-200' : 'bg-white/10'}`} />
                    <div className={`h-4 w-full rounded ${th.skeleton}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedComments.length === 0 ? (
            <p className={`text-center py-8 text-sm ${th.textTertiary}`}>
              {t('community.post_no_replies', '暂无回复，来说两句吧')}
            </p>
          ) : (
            <div className="space-y-3">
              {sortedComments.map((c) => {
                const isBest = bestAnswerId && c.id === bestAnswerId;
                return (
                  <div
                    key={c.id}
                    className={`flex gap-3 p-4 rounded-2xl border transition-all ${
                      isBest
                        ? (isDayMode
                          ? 'border-l-4 border-l-emerald-500 border-emerald-200 bg-emerald-50/60'
                          : 'border-l-4 border-l-emerald-400 border-emerald-500/20 bg-emerald-500/5')
                        : th.commentItem
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${isDayMode ? 'bg-slate-200' : 'bg-gray-700'}`}>
                      {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full object-cover" /> : <User size={14} className={th.textSecondary} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-sm font-semibold ${th.textPrimary}`}>{c.author || c.author_name || t('common.anonymous', '匿名用户')}</span>
                        <span className={`text-xs ${th.textTertiary}`}>{c.created_at && new Date(c.created_at).toLocaleDateString('zh-CN')}</span>
                        {isBest && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isDayMode ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            <Award size={12} />
                            {t('community.best_answer', '最佳答案')}
                          </span>
                        )}
                      </div>
                      {renderCommentText(c.id, c.content, 'base')}
                      {c.quote_snapshot && (
                        <div className={`mt-2 rounded-lg border px-2.5 py-2 text-xs break-words ${isDayMode ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white/[0.02] border-white/10 text-gray-400'}`}>
                          <span className="font-semibold">@{c.quote_snapshot.author}:</span> {c.quote_snapshot.content}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openReply(c, c, false)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border ${isDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10'}`}
                        >
                          <Reply size={12} />
                          {t('community.reply', '回复')}
                        </button>
                        <button
                          type="button"
                          onClick={() => openReply(c, c, true)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border ${isDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10'}`}
                        >
                          <Quote size={12} />
                          {t('community.quote', '引用')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReport({ targetType: 'comment', targetId: c.id })}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border ${isDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10'}`}
                        >
                          <Flag size={12} />
                          {t('community.report', '举报')}
                        </button>
                        {user && (user.role === 'admin' || user.id === c.user_id || user.id === post?.author_id) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border ${isDayMode ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-rose-300 border-rose-500/25 hover:bg-rose-500/10'}`}
                          >
                            <Trash2 size={12} />
                            {t('common.delete', '删除')}
                          </button>
                        )}
                      </div>
                      {canAdopt && !isBest && (
                        <button
                          onClick={() => handleAdopt(c.id)}
                          className={`mt-2 flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${isDayMode ? 'text-emerald-600 hover:bg-emerald-50 border border-emerald-200' : 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20'}`}
                        >
                          <CheckCircle size={13} />
                          {t('community.adopt_answer', '采纳为最佳答案')}
                        </button>
                      )}
                      {Array.isArray(c.replies) && c.replies.length > 0 && (
                        <div className={`mt-3 pl-3 border-l space-y-2 ${isDayMode ? 'border-slate-200' : 'border-white/10'}`}>
                          <div className={`text-[11px] ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                            {t('community.reply_count', '共 {{count}} 条二级回复', { count: c.replies.length })}
                          </div>
                          {(expandedFloors[c.id] ? c.replies : c.replies.slice(0, 3)).map((reply) => {
                            const replyIsBest = bestAnswerId && reply.id === bestAnswerId;
                            return (
                              <div
                                key={reply.id}
                                className={`rounded-xl border px-3 py-2 ${replyIsBest
                                  ? (isDayMode ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/25')
                                  : (isDayMode ? 'bg-white border-slate-200' : 'bg-white/[0.02] border-white/10')
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-semibold ${th.textPrimary}`}>{reply.author || reply.author_name || t('common.anonymous', '匿名用户')}</span>
                                  <span className={`text-[11px] ${th.textTertiary}`}>{reply.created_at && new Date(reply.created_at).toLocaleDateString('zh-CN')}</span>
                                  {replyIsBest && (
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${isDayMode ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                      <Award size={10} />
                                      {t('community.best_answer', '最佳答案')}
                                    </span>
                                  )}
                                </div>
                                {reply.quote_snapshot && (
                                  <div className={`mb-1 rounded-md border px-2 py-1 text-[11px] break-words ${isDayMode ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white/[0.02] border-white/10 text-gray-400'}`}>
                                    <span className="font-semibold">@{reply.quote_snapshot.author}:</span> {reply.quote_snapshot.content}
                                  </div>
                                )}
                                {reply.reply_to_author && (
                                  <div className={`mb-1 text-[11px] ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                                    {t('community.reply_to', '回复')} @{reply.reply_to_author}
                                  </div>
                                )}
                                {renderCommentText(reply.id, reply.content, 'small')}
                                <div className="mt-1.5 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openReply(c, reply, false)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${isDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10'}`}
                                  >
                                    <Reply size={11} />
                                    {t('community.reply', '回复')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openReply(c, reply, true)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${isDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10'}`}
                                  >
                                    <Quote size={11} />
                                    {t('community.quote', '引用')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReport({ targetType: 'comment', targetId: reply.id })}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${isDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10'}`}
                                  >
                                    <Flag size={11} />
                                    {t('community.report', '举报')}
                                  </button>
                                  {user && (user.role === 'admin' || user.id === reply.user_id || user.id === post?.author_id) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${isDayMode ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-rose-300 border-rose-500/25 hover:bg-rose-500/10'}`}
                                    >
                                      <Trash2 size={11} />
                                      {t('common.delete', '删除')}
                                    </button>
                                  )}
                                  {canAdopt && !replyIsBest && (
                                    <button
                                      onClick={() => handleAdopt(reply.id)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${isDayMode ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50' : 'text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10'}`}
                                    >
                                      <CheckCircle size={11} />
                                      {t('community.adopt_answer', '采纳')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {c.replies.length > 3 && (
                            <button
                              type="button"
                              onClick={() => toggleReplies(c.id)}
                              className={`text-[11px] font-medium px-2.5 py-1 rounded-md border ${isDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10'}`}
                            >
                              {expandedFloors[c.id]
                                ? t('community.collapse_replies', '收起回复')
                                : t('community.expand_replies', '展开 {{count}} 条回复', { count: c.replies.length - 3 })}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <CommunityDetailModal
      item={post}
      onClose={onClose}
      isDayMode={isDayMode}
      gradientFrom={gradientFrom}
      headerContent={headerContent}
      authorBar={authorBar}
      beforeContent={beforeContent}
      contentBlocks={contentBlocks}
      htmlContent={post?.content}
      afterContent={afterContent}
      onRelatedSelect={onRelatedSelect}
    />
  );
};

export default CommunityPostDetail;
