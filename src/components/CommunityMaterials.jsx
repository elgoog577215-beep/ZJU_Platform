import React, { useCallback, useRef, useState } from 'react';
import { BookOpen, FileStack, Link as LinkIcon, Upload } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useCommunityFeed } from '../hooks/useCommunityFeed';
import PostCard from './PostCard';
import CommunityPostDetail from './CommunityPostDetail';
import CommunityFeedPanel from './CommunityFeedPanel';
import UnifiedCommunityComposer from './UnifiedCommunityComposer';
import CommunitySearchInput from './CommunitySearchInput';

const CommunityMaterials = ({ onNewPost, hideNewPostButton = false }) => {
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
    section: 'materials',
    deepLinkParam: 'post',
    defaultPageSize: 10,
  });

  const openComposer = useCallback(() => {
    if (!user) {
      toast.error(t('auth.signin_required'));
      return;
    }
    setEditingPost(null);
    setComposerOpen(true);
  }, [t, user]);

  React.useEffect(() => {
    const onOpenComposer = (event) => {
      if (event.detail?.boardKey !== 'materials') return;
      openComposer();
    };
    window.addEventListener('open-community-composer', onOpenComposer);
    return () => window.removeEventListener('open-community-composer', onOpenComposer);
  }, [openComposer]);

  React.useEffect(() => {
    const onRefresh = (event) => {
      if (event.detail?.boardKey === 'materials') feed.handleRefresh();
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
    if (!params.get('postTab')) params.set('postTab', 'materials');
    setSearchParams(params, { replace: false });
  }, [searchParams, setSearchParams]);

  const handleOpenPost = (post) => {
    feed.handleItemClick(post);
    updateParams({ postTab: 'materials', post: post.id });
  };

  const handleCloseDetail = () => {
    if (fromUserProfileRef.current) {
      fromUserProfileRef.current = false;
      navigate(-2);
      return;
    }
    feed.setSelectedItem(null);
    updateParams({ postTab: 'materials' });
  };

  const handleCommentsCountChange = useCallback((postId, count) => {
    feed.updateItemById(postId, (item) => ({ ...item, comments_count: count }));
  }, [feed]);

  const handleRelatedSelect = useCallback((resource) => {
    if (!resource?.id) return;
    if (resource.type === 'article') return updateParams({ postTab: 'tech', id: resource.id });
    if (resource.type === 'group') return updateParams({ group: resource.id });
    if (resource.type === 'news') return updateParams({ postTab: 'news', news: resource.id });
    if (resource.type === 'post') return updateParams({ postTab: resource.section || 'materials', post: resource.id });
  }, [updateParams]);

  const renderCard = (post, index, { canAnimate, isDayMode: dm }) => (
    <PostCard key={post.id} post={post} index={index} onClick={handleOpenPost} canAnimate={canAnimate} isDayMode={dm} />
  );

  const getMaterialMeta = (post) => [
    post?.material_course ? { key: 'course', label: t('community.material_course', '课程'), value: post.material_course } : null,
    post?.material_teacher ? { key: 'teacher', label: t('community.material_teacher', '老师'), value: post.material_teacher } : null,
    post?.material_semester ? { key: 'semester', label: t('community.material_semester', '学期'), value: post.material_semester } : null,
    post?.material_type ? { key: 'type', label: t('community.material_type', '资料类型'), value: t(`community.material_type_${post.material_type}`, post.material_type) } : null,
  ].filter(Boolean);

  const selectedMaterialMeta = feed.selectedItem ? getMaterialMeta(feed.selectedItem) : [];

  const beforeContent = feed.selectedItem && (
    <div className={`mb-6 rounded-lg border p-4 ${isDayMode ? 'border-emerald-100 bg-emerald-50/80' : 'border-emerald-500/20 bg-emerald-500/10'}`}>
      <div className={`flex flex-wrap items-center gap-3 text-sm ${isDayMode ? 'text-slate-700' : 'text-emerald-100'}`}>
        <span className="inline-flex items-center gap-1.5">
          <BookOpen size={15} />
          {t('community.materials_detail_tip', '支持上传 PDF、Word、Markdown 与附件块')}
        </span>
        {feed.selectedItem.link ? (
          <a
            href={feed.selectedItem.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${isDayMode ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'border-emerald-400/25 text-emerald-200 hover:bg-emerald-500/10'}`}
          >
            <LinkIcon size={13} />
            {t('community.open_original', '查看原文')}
          </a>
        ) : null}
      </div>
      {selectedMaterialMeta.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedMaterialMeta.map((item) => (
            <span
              key={item.key}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${isDayMode ? 'border-emerald-200 bg-white text-emerald-700' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'}`}
            >
              <span className={isDayMode ? 'text-slate-500' : 'text-emerald-200/75'}>{item.label}</span>
              {item.value}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  const renderDetail = () => (
    <CommunityPostDetail
      post={feed.selectedItem}
      onClose={handleCloseDetail}
      isDayMode={isDayMode}
      gradientFrom="from-emerald-900/30"
      onRelatedSelect={handleRelatedSelect}
      onCommentsCountChange={handleCommentsCountChange}
      beforeContent={beforeContent}
      headerContent={feed.selectedItem && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <span className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold ${isDayMode ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'}`}>
              {t('community.tab_materials', '期末资料')}
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
        placeholder={t('community.materials_search_placeholder', '搜索课程、老师、科目或资料类型')}
        isDayMode={isDayMode}
      />
      <div className={`flex flex-wrap items-center gap-2 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${isDayMode ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/[0.04] text-gray-300'}`}>
          <Upload size={13} />
          {t('community.materials_upload_hint', '上传资料后进入后台审核，通过后全站可见')}
        </span>
        <span className="hidden sm:inline">{t('community.materials_scope_hint', '适合分享往年题、复习提纲、课件摘要和经验整理')}</span>
      </div>
    </div>
  );

  return (
    <>
      <CommunityFeedPanel
        feed={feed}
        isDayMode={isDayMode}
        renderCard={renderCard}
        renderDetail={renderDetail}
        emptyIcon={FileStack}
        emptyTitle={t('community.materials_empty', '暂无期末资料')}
        emptyDesc={t('community.materials_empty_desc', '上传第一份复习资料，帮后来者少走弯路。')}
        accentColor="green"
        extraControls={controls}
        onNewPost={onNewPost || openComposer}
        newPostLabel={t('community.materials_upload_action', '上传资料')}
        hideNewPostButton={hideNewPostButton}
      />
      <UnifiedCommunityComposer
        isOpen={composerOpen}
        boardKey="materials"
        initialData={editingPost}
        onClose={() => { setComposerOpen(false); setEditingPost(null); }}
        onSuccess={feed.handleRefresh}
      />
    </>
  );
};

export default CommunityMaterials;
