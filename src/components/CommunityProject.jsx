import React, { useCallback, useRef } from 'react';
import { Rocket } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useCommunityFeed } from '../hooks/useCommunityFeed';
import PostCard from './PostCard';
import CommunityPostDetail from './CommunityPostDetail';
import CommunityFeedPanel from './CommunityFeedPanel';
import CommunitySearchInput from './CommunitySearchInput';

const CommunityProject = ({ onNewPost, hideNewPostButton = false }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromUserProfileRef = useRef(Boolean(location.state?.fromUserProfile));
  const isDayMode = uiMode === 'day';

  const feed = useCommunityFeed({
    endpoint: '/community/posts',
    section: 'project',
    deepLinkParam: 'post',
    defaultPageSize: 10,
  });

  const updateParams = useCallback((next) => {
    const params = new URLSearchParams(searchParams);
    ['id', 'post', 'news', 'group'].forEach((key) => params.delete(key));
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    if (!params.get('postTab')) params.set('postTab', 'project');
    setSearchParams(params, { replace: false });
  }, [searchParams, setSearchParams]);

  const handleOpenPost = (post) => {
    feed.handleItemClick(post);
    updateParams({ postTab: 'project', post: post.id });
  };

  const handleCloseDetail = () => {
    if (fromUserProfileRef.current) {
      fromUserProfileRef.current = false;
      navigate(-2);
      return;
    }
    feed.setSelectedItem(null);
    updateParams({ postTab: 'project' });
  };

  const handleCommentsCountChange = useCallback((postId, count) => {
    feed.updateItemById(postId, (item) => ({ ...item, comments_count: count }));
  }, [feed]);

  React.useEffect(() => {
    const onRefresh = (event) => {
      if (event.detail?.boardKey === 'project') feed.handleRefresh();
    };
    window.addEventListener('community-feed-refresh', onRefresh);
    return () => window.removeEventListener('community-feed-refresh', onRefresh);
  }, [feed]);

  const renderCard = (post, index, { canAnimate, isDayMode: dm }) => (
    <PostCard key={post.id} post={post} index={index} onClick={handleOpenPost} canAnimate={canAnimate} isDayMode={dm} />
  );

  const renderDetail = () => (
    <CommunityPostDetail
      post={feed.selectedItem}
      onClose={handleCloseDetail}
      isDayMode={isDayMode}
      gradientFrom="from-emerald-900/30"
      onRelatedSelect={(resource) => {
        if (resource.type === 'article') updateParams({ postTab: 'tech', id: resource.id });
        if (resource.type === 'news') updateParams({ postTab: 'news', news: resource.id });
        if (resource.type === 'post') updateParams({ postTab: 'project', post: resource.id });
        if (resource.type === 'group') updateParams({ group: resource.id });
      }}
      onCommentsCountChange={handleCommentsCountChange}
      headerContent={feed.selectedItem && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <span className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold ${isDayMode ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'}`}>
              {t('community.tab_project_updates', '项目动态')}
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
        placeholder={t('community.project_search_placeholder', '搜索项目动态')}
        isDayMode={isDayMode}
      />
    </div>
  );

  return (
    <CommunityFeedPanel
      feed={feed}
      isDayMode={isDayMode}
      renderCard={renderCard}
      renderDetail={renderDetail}
      emptyIcon={Rocket}
      emptyTitle={t('community.project_empty', '暂无项目动态')}
      emptyDesc={t('community.project_empty_desc', '发布第一个项目进展、Demo 或版本更新。')}
      accentColor="green"
      extraControls={controls}
      onNewPost={onNewPost}
      hideNewPostButton={hideNewPostButton}
      hideSortSelector
    />
  );
};

export default CommunityProject;
