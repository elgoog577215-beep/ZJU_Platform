import React, { useCallback, useRef, useState } from 'react';
import { Calendar, Users } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useCommunityFeed } from '../hooks/useCommunityFeed';
import api from '../services/api';
import PostCard from './PostCard';
import CommunityPostDetail from './CommunityPostDetail';
import CommunityFeedPanel from './CommunityFeedPanel';
import UnifiedCommunityComposer from './UnifiedCommunityComposer';
import CommunitySearchInput from './CommunitySearchInput';

const STATUS_TABS = [
  { key: 'all', label: 'community.tab_all' },
  { key: 'recruiting', label: 'community.post_status_recruiting' },
  { key: 'full', label: 'community.post_status_full' },
  { key: 'closed', label: 'community.post_status_closed' },
];

const CommunityTeam = ({ onNewPost, hideNewPostButton = false }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isDayMode = uiMode === 'day';
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const fromUserProfileRef = useRef(Boolean(location.state?.fromUserProfile));

  const feed = useCommunityFeed({
    endpoint: '/community/posts',
    section: 'team',
    deepLinkParam: 'post',
    defaultPageSize: 10,
  });

  const openComposer = useCallback(() => {
    if (!user) { toast.error(t('auth.signin_required')); return; }
    setEditingPost(null);
    setComposerOpen(true);
  }, [t, user]);

  React.useEffect(() => {
    const onOpenComposer = (event) => {
      if (event.detail?.boardKey !== 'team') return;
      openComposer();
    };
    window.addEventListener('open-community-composer', onOpenComposer);
    return () => window.removeEventListener('open-community-composer', onOpenComposer);
  }, [openComposer]);

  React.useEffect(() => {
    const onRefresh = (event) => {
      if (event.detail?.boardKey === 'team') feed.handleRefresh();
    };
    window.addEventListener('community-feed-refresh', onRefresh);
    return () => window.removeEventListener('community-feed-refresh', onRefresh);
  }, [feed]);

  const updateParams = useCallback((next) => {
    const params = new URLSearchParams(searchParams);
    ['id', 'post', 'news', 'group'].forEach((key) => params.delete(key));
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    if (!params.get('postTab')) params.set('postTab', 'team');
    setSearchParams(params, { replace: false });
  }, [searchParams, setSearchParams]);

  const handleOpenPost = (post) => {
    feed.handleItemClick(post);
    updateParams({ postTab: 'team', post: post.id });
  };

  const handleCloseDetail = () => {
    if (fromUserProfileRef.current) {
      fromUserProfileRef.current = false;
      navigate(-2);
      return;
    }
    feed.setSelectedItem(null);
    updateParams({ postTab: 'team' });
  };

  const handleCommentsCountChange = useCallback((postId, count) => {
    feed.updateItemById(postId, (item) => ({ ...item, comments_count: count }));
  }, [feed]);

  const handleJoin = async () => {
    if (!feed.selectedItem?.id) return;
    if (!user) {
      toast.error(t('auth.signin_required'));
      return;
    }
    try {
      await api.post(`/community/posts/${feed.selectedItem.id}/join`);
      toast.success(t('community.team_joined', '已加入组队'));
      feed.handleRefresh();
    } catch (error) {
      toast.error(error?.response?.data?.error || t('community.team_join_failed', '加入失败'));
    }
  };

  const renderCard = (post, index, { canAnimate, isDayMode: dm }) => (
    <PostCard key={post.id} post={post} index={index} onClick={handleOpenPost} canAnimate={canAnimate} isDayMode={dm} />
  );

  const renderDetail = () => (
    <CommunityPostDetail
      post={feed.selectedItem}
      onClose={handleCloseDetail}
      isDayMode={isDayMode}
      gradientFrom="from-violet-900/30"
      onRelatedSelect={(resource) => {
        if (resource.type === 'article') updateParams({ postTab: 'tech', id: resource.id });
        if (resource.type === 'news') updateParams({ postTab: 'news', news: resource.id });
        if (resource.type === 'post') updateParams({ postTab: 'team', post: resource.id });
      }}
      onCommentsCountChange={handleCommentsCountChange}
      beforeContent={feed.selectedItem && (
        <div className={`mb-6 rounded-lg border p-4 ${isDayMode ? 'border-violet-100 bg-violet-50/70' : 'border-violet-500/20 bg-violet-500/10'}`}>
          <div className={`flex flex-wrap items-center gap-4 text-sm ${isDayMode ? 'text-slate-700' : 'text-violet-100'}`}>
            {feed.selectedItem.deadline ? <span className="inline-flex items-center gap-1.5"><Calendar size={15} />{t('community.post_deadline_label', '截止日期')}: {feed.selectedItem.deadline}</span> : null}
            {feed.selectedItem.max_members ? <span className="inline-flex items-center gap-1.5"><Users size={15} />{feed.selectedItem.current_members || 0}/{feed.selectedItem.max_members}</span> : null}
          </div>
          <button type="button" onClick={handleJoin} className={`mt-3 rounded-lg px-4 py-2 text-sm font-semibold ${isDayMode ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-violet-500 text-white hover:bg-violet-400'}`}>
            {t('community.team_join', '加入协作')}
          </button>
        </div>
      )}
      headerContent={feed.selectedItem && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <span className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold ${isDayMode ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-violet-500/20 bg-violet-500/15 text-violet-300'}`}>
              {t('community.tab_team_collab', '组队协作')}
            </span>
          </div>
          <h2 className={`text-2xl font-black leading-tight tracking-tight md:text-5xl ${isDayMode ? 'text-slate-900' : 'text-white drop-shadow-2xl'}`}>
            {feed.selectedItem.title}
          </h2>
        </>
      )}
    />
  );

  const controls = (
    <div className="grid gap-3">
      <CommunitySearchInput
        value={feed.searchQuery}
        onChange={feed.setSearchQuery}
        onClear={() => feed.setSearchQuery('')}
        placeholder={t('community.team_search_placeholder', '搜索组队协作')}
        isDayMode={isDayMode}
      />
    </div>
  );

  return (
    <>
      <CommunityFeedPanel
        feed={feed}
        isDayMode={isDayMode}
        renderCard={renderCard}
        renderDetail={renderDetail}
        emptyIcon={Users}
        emptyTitle={t('community.team_empty', '暂无组队帖')}
        emptyDesc={t('community.team_empty_desc', '发布第一个组队帖吧！')}
        accentColor="violet"
        statusTabs={STATUS_TABS}
        extraControls={controls}
        onNewPost={onNewPost || openComposer}
        hideNewPostButton={hideNewPostButton}
      />
      <UnifiedCommunityComposer
        isOpen={composerOpen}
        boardKey="team"
        initialData={editingPost}
        onClose={() => { setComposerOpen(false); setEditingPost(null); }}
        onSuccess={feed.handleRefresh}
      />
    </>
  );
};

export default CommunityTeam;
