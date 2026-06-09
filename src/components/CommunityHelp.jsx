import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import PostCard from './PostCard';
import UnifiedCommunityComposer from './UnifiedCommunityComposer';
import CommunityPostDetail from './CommunityPostDetail';
import CommunityFeedPanel from './CommunityFeedPanel';
import { useCommunityFeed } from '../hooks/useCommunityFeed';

const STATUS_TABS = [
  { key: 'all', label: 'community.tab_all' },
  { key: 'open', label: 'community.tab_help' },
  { key: 'solved', label: 'community.tab_solved' },
];

const WORKFLOW_TABS = [
  { key: 'approved', label: 'community.status_published' },
  { key: 'draft', label: 'community.status_draft' },
  { key: 'pending', label: 'community.status_pending' },
  { key: 'rejected', label: 'community.status_rejected' },
];

const CommunityHelp = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isDayMode = uiMode === 'day';
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [workflowView, setWorkflowView] = useState('approved');
  // Capture at mount: if the user arrived from their PublicProfile card,
  // closing the detail modal should pop back to that profile (two history
  // entries: our navigate + useBackClose's hash push).
  const fromUserProfileRef = useRef(Boolean(location.state?.fromUserProfile));
  const workflowQueryParams = useMemo(() => {
    if (!user || workflowView === 'approved') return {};
    return {
      workflow_status: workflowView,
      author_id: isAdmin ? undefined : user.id,
    };
  }, [isAdmin, user, workflowView]);

  const feed = useCommunityFeed({
    endpoint: '/community/posts',
    section: 'help',
    deepLinkParam: 'post',
    defaultPageSize: 10,
    extraQueryParams: workflowQueryParams,
    extraDependencies: [workflowView, user?.id || 'guest'],
  });

  const isOwnPost = useCallback((post) => Boolean(user && String(post?.author_id) === String(user.id)), [user]);

  const openComposerForPost = async (post) => {
    if (!post?.id) return;
    try {
      const res = await api.get(`/community/posts/${post.id}`);
      setEditingPost(res.data || post);
      setIsComposerOpen(true);
    } catch {
      toast.error(t('community.load_failed', '加载失败'));
    }
  };

  const handleSolve = async (commentId) => {
    if (!feed.selectedItem) return;
    try {
      await api.put(`/community/posts/${feed.selectedItem.id}/solve`, { comment_id: commentId });
      feed.setSelectedItem((prev) => prev ? { ...prev, status: 'solved', solved_comment_id: commentId } : prev);
      toast.success(t('community.post_marked_solved', '已采纳最佳答案'));
      feed.handleRefresh();
    } catch {
      toast.error(t('community.post_mark_solved_failed', '操作失败'));
    }
  };

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams);
    ['id', 'post', 'news', 'group'].forEach((key) => params.delete(key));
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    if (!params.get('postTab')) params.set('postTab', 'help');
    setSearchParams(params, { replace: false });
  };

  const handleRelatedSelect = (resource) => {
    if (!resource?.id) return;
    if (resource.type === 'article') return updateParams({ postTab: 'tech', id: resource.id });
    if (resource.type === 'group') return updateParams({ postTab: 'groups', group: resource.id });
    if (resource.type === 'news') return updateParams({ postTab: 'news', news: resource.id });
    return updateParams({ postTab: 'help', post: resource.id });
  };

  const handleOpenPost = (post) => {
    feed.handleItemClick(post);
    updateParams({ postTab: 'help', post: post.id });
  };

  const handleCloseDetail = () => {
    if (fromUserProfileRef.current) {
      fromUserProfileRef.current = false;
      navigate(-2);
      return;
    }
    feed.setSelectedItem(null);
    updateParams({ postTab: 'help' });
  };

  const handleCommentsCountChange = useCallback((postId, count) => {
    feed.updateItemById(postId, (item) => ({ ...item, comments_count: count }));
  }, [feed]);

  const renderCard = (post, index, { canAnimate, isDayMode: dm }) => {
    const canEdit = isAdmin || isOwnPost(post);
    return (
      <div key={post.id} className="relative">
        <PostCard post={post} index={index} onClick={handleOpenPost} canAnimate={canAnimate} isDayMode={dm} />
        {canEdit ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openComposerForPost(post);
            }}
            className={`absolute right-3 top-3 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${dm ? 'border-slate-200 bg-white text-slate-600 hover:text-slate-950' : 'border-white/10 bg-black/35 text-white/70 hover:text-white'}`}
          >
            {t('common.edit', '编辑')}
          </button>
        ) : null}
      </div>
    );
  };

  const renderDetail = () => (
    <CommunityPostDetail
      post={feed.selectedItem}
      onClose={handleCloseDetail}
      isDayMode={isDayMode}
      gradientFrom="from-amber-900/30"
      onSolve={handleSolve}
      onRelatedSelect={handleRelatedSelect}
      onCommentsCountChange={handleCommentsCountChange}
      headerContent={feed.selectedItem && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${feed.selectedItem.status === 'solved' ? (isDayMode ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20') : (isDayMode ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20')}`}>
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

  const helpControls = (
    <div className="grid gap-3">
      {user ? (
        <div className={`scrollbar-none flex items-center gap-1 overflow-x-auto rounded-lg border p-1 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/10'}`}>
          {WORKFLOW_TABS.map((tab) => (
            <button
              type="button"
              key={tab.key}
              onClick={() => {
                if (workflowView === tab.key) return;
                setWorkflowView(tab.key);
                feed.setStatusFilter('all');
              }}
              className={`min-h-[32px] rounded-md px-3 text-xs font-semibold transition-colors whitespace-nowrap ${
                workflowView === tab.key
                  ? (isDayMode ? 'bg-slate-950 text-white' : 'bg-amber-600 text-white')
                  : (isDayMode ? 'text-slate-600 hover:bg-slate-50' : 'text-gray-400 hover:bg-white/10')
              }`}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>
      ) : null}
      <input
        value={feed.searchQuery}
        onChange={(e) => feed.setSearchQuery(e.target.value)}
        placeholder={t('community.help_search_placeholder', '搜索求助帖（标题/正文）')}
        className={`w-full h-10 px-3 rounded-lg border text-sm ${isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`}
      />
    </div>
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
      extraControls={helpControls}
      onNewPost={() => {
        if (!user) { toast.error(t('auth.signin_required')); return; }
        setEditingPost(null);
        setIsComposerOpen(true);
      }}
      extraBottom={
        <UnifiedCommunityComposer
          isOpen={isComposerOpen}
          onClose={() => { setIsComposerOpen(false); setEditingPost(null); }}
          boardKey="help"
          initialData={editingPost}
          onSuccess={feed.handleRefresh}
        />
      }
    />
  );
};

export default CommunityHelp;
