import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, Send, User, CheckCircle, Award } from 'lucide-react';
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
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const th = communityTheme(isDayMode);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const contentBlocks = useMemo(() => parseContentBlocks(post?.content_blocks), [post?.content_blocks]);

  const canAdopt = onSolve && post && post.status !== 'solved' && user && (user.id === post.author_id || user.role === 'admin');
  const bestAnswerId = post?.solved_comment_id;

  // Sort comments: best answer first
  const sortedComments = useMemo(() => {
    if (!bestAnswerId || comments.length === 0) return comments;
    const best = comments.find((c) => c.id === bestAnswerId);
    const rest = comments.filter((c) => c.id !== bestAnswerId);
    return best ? [best, ...rest] : comments;
  }, [comments, bestAnswerId]);

  // Fetch comments
  useEffect(() => {
    if (!post || !showComments) { setComments([]); return; }
    const ac = new AbortController();
    setLoadingComments(true);
    api.get(`/community/posts/${post.id}/comments`, { signal: ac.signal })
      .then((res) => { if (!ac.signal.aborted) setComments(res.data || []); })
      .catch(() => { if (!ac.signal.aborted) setComments([]); })
      .finally(() => { if (!ac.signal.aborted) setLoadingComments(false); });
    return () => ac.abort();
  }, [post?.id, showComments]);

  const handleSubmitComment = useCallback(async () => {
    if (!user) { toast.error(t('auth.signin_required')); return; }
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/community/posts/${post.id}/comments`, { content: commentText.trim() });
      setComments((prev) => [res.data, ...prev]);
      setCommentText('');
    } catch {
      toast.error(t('community.post_comment_failed', '评论失败'));
    } finally {
      setSubmittingComment(false);
    }
  }, [user, commentText, post?.id, t]);

  const handleAdopt = useCallback(async (commentId) => {
    if (!onSolve) return;
    onSolve(commentId);
  }, [onSolve]);

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

      {/* Comments */}
      {showComments && (
        <div className={`border-t pt-8 ${th.borderSubtle}`}>
          <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${th.textPrimary}`}>
            <MessageCircle size={20} />
            {comments.length} {t('community.post_replies', '条回复')}
          </h3>

          {/* Input */}
          <div className={`flex gap-3 mb-8 p-4 rounded-2xl border ${th.commentBg}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isDayMode ? 'bg-slate-200' : 'bg-gray-700'}`}>
              <User size={16} className={th.textSecondary} />
            </div>
            <div className="flex-1">
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
                      <p className={`text-sm leading-relaxed ${th.textContent}`}>{c.content}</p>
                      {canAdopt && !isBest && (
                        <button
                          onClick={() => handleAdopt(c.id)}
                          className={`mt-2 flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${isDayMode ? 'text-emerald-600 hover:bg-emerald-50 border border-emerald-200' : 'text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20'}`}
                        >
                          <CheckCircle size={13} />
                          {t('community.adopt_answer', '采纳为最佳答案')}
                        </button>
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
    />
  );
};

export default CommunityPostDetail;
