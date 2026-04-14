import React, { useState, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import PostCard from './PostCard';
import PostComposer from './PostComposer';
import CommunityPostDetail from './CommunityPostDetail';
import CommunityFeedPanel from './CommunityFeedPanel';
import { useCommunityFeed } from '../hooks/useCommunityFeed';

const STATUS_TABS = [
  { key: 'all', label: 'community.tab_all' },
  { key: 'open', label: 'community.tab_help' },
  { key: 'solved', label: 'community.tab_solved' },
];

const CommunityHelp = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isDayMode = uiMode === 'day';
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const feed = useCommunityFeed({
    endpoint: '/community/posts',
    section: 'help',
    deepLinkParam: 'post',
    defaultPageSize: 10,
  });

  const handleSolve = useCallback(async (commentId) => {
    if (!feed.selectedItem) return;
    try {
      await api.put(`/community/posts/${feed.selectedItem.id}/solve`, { comment_id: commentId });
      feed.setSelectedItem((prev) => prev ? { ...prev, status: 'solved', solved_comment_id: commentId } : prev);
      toast.success(t('community.post_marked_solved', '已采纳最佳答案'));
      feed.handleRefresh();
    } catch {
      toast.error(t('community.post_mark_solved_failed', '操作失败'));
    }
  }, [feed.selectedItem, t, feed.handleRefresh]);

  const renderCard = (post, index, { canAnimate, isDayMode: dm }) => (
    <PostCard key={post.id} post={post} index={index} onClick={feed.handleItemClick} canAnimate={canAnimate} isDayMode={dm} />
  );

  const renderDetail = () => (
    <CommunityPostDetail
      post={feed.selectedItem}
      onClose={() => feed.setSelectedItem(null)}
      isDayMode={isDayMode}
      gradientFrom="from-amber-900/30"
      onSolve={handleSolve}
      headerContent={feed.selectedItem && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${feed.selectedItem.status === 'solved' ? (isDayMode ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20') : (isDayMode ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20')}`}>
              {feed.selectedItem.status === 'solved' ? t('community.post_status_solved', '已解决') : t('community.post_status_open', '待答')}
            </span>
            <span className={`text-sm font-mono ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {feed.selectedItem.created_at && new Date(feed.selectedItem.created_at).toLocaleDateString('zh-CN')}
            </span>
          </div>
          <h2 className={`text-3xl md:text-5xl font-black leading-tight tracking-tight font-serif ${isDayMode ? 'text-slate-900' : 'text-white drop-shadow-2xl'}`}>
            {feed.selectedItem.title}
          </h2>
        </>
      )}
    />
  );

  return (
    <CommunityFeedPanel
      feed={feed}
      isDayMode={isDayMode}
      renderCard={renderCard}
      renderDetail={renderDetail}
      emptyIcon={HelpCircle}
      emptyTitle={t('community.help_empty', '暂无帖子')}
      emptyDesc={t('community.help_empty_desc', '成为第一个发帖的人吧！')}
      accentColor="amber"
      statusTabs={STATUS_TABS}
      onNewPost={() => {
        if (!user) { toast.error(t('auth.signin_required')); return; }
        setIsComposerOpen(true);
      }}
      extraBottom={
        <PostComposer isOpen={isComposerOpen} onClose={() => setIsComposerOpen(false)} section="help" onSuccess={feed.handleRefresh} />
      }
    />
  );
};

export default CommunityHelp;
