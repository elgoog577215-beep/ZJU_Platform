import React, { useCallback, useRef, useState } from 'react';
import { BookOpen, FileStack, Layers3, Link as LinkIcon, Tags, Upload, X } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useCommunityFeed } from '../hooks/useCommunityFeed';
import api, { isCanceledRequest } from '../services/api';
import PostCard from './PostCard';
import CommunityPostDetail from './CommunityPostDetail';
import CommunityFeedPanel from './CommunityFeedPanel';
import UnifiedCommunityComposer from './UnifiedCommunityComposer';
import CommunitySearchInput from './CommunitySearchInput';

const normalizeCourseName = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const MATERIAL_TYPE_KEYS = ['exam', 'outline', 'slides', 'notes', 'solution', 'other'];
const normalizeMaterialType = (value) => {
  const type = String(value || '').trim().toLowerCase();
  return MATERIAL_TYPE_KEYS.includes(type) ? type : '';
};

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
  const [materialCourses, setMaterialCourses] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [selectedMaterialCourse, setSelectedMaterialCourse] = useState(() => normalizeCourseName(searchParams.get('course')));
  const [selectedMaterialType, setSelectedMaterialType] = useState(() => normalizeMaterialType(searchParams.get('type')));
  const fromUserProfileRef = useRef(Boolean(location.state?.fromUserProfile));
  const materialQueryParams = React.useMemo(
    () => ({
      ...(selectedMaterialCourse ? { material_course: selectedMaterialCourse } : {}),
      ...(selectedMaterialType ? { material_type: selectedMaterialType } : {}),
    }),
    [selectedMaterialCourse, selectedMaterialType],
  );
  const clearMaterialFilters = useCallback(() => {
    setSelectedMaterialCourse('');
    setSelectedMaterialType('');
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete('course');
      params.delete('type');
      params.set('postTab', 'materials');
      return params;
    }, { replace: false });
  }, [setSearchParams]);

  const feed = useCommunityFeed({
    endpoint: '/community/posts',
    section: 'materials',
    deepLinkParam: 'post',
    defaultPageSize: 10,
    extraQueryParams: materialQueryParams,
    extraDependencies: [selectedMaterialCourse, selectedMaterialType],
    extraFiltersActive: Boolean(selectedMaterialCourse || selectedMaterialType),
    onResetExtraFilters: clearMaterialFilters,
  });

  const loadMaterialCourses = useCallback(async ({ signal } = {}) => {
    try {
      const res = await api.get('/community/material-courses', {
        params: { limit: 24 },
        signal,
      });
      setMaterialCourses(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      if (!isCanceledRequest(error)) {
        setMaterialCourses([]);
      }
    }
  }, []);

  const loadMaterialTypes = useCallback(async ({ signal } = {}) => {
    try {
      const res = await api.get('/community/material-types', { signal });
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setMaterialTypes(rows);
    } catch (error) {
      if (!isCanceledRequest(error)) {
        setMaterialTypes(MATERIAL_TYPE_KEYS.map((type) => ({ type, count: 0 })));
      }
    }
  }, []);

  React.useEffect(() => {
    const ac = new AbortController();
    loadMaterialCourses({ signal: ac.signal });
    loadMaterialTypes({ signal: ac.signal });
    return () => ac.abort();
  }, [loadMaterialCourses, loadMaterialTypes]);

  React.useEffect(() => {
    setSelectedMaterialCourse(normalizeCourseName(searchParams.get('course')));
    setSelectedMaterialType(normalizeMaterialType(searchParams.get('type')));
  }, [searchParams]);

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
      if (event.detail?.boardKey === 'materials') {
        feed.handleRefresh();
        loadMaterialCourses();
        loadMaterialTypes();
      }
    };
    window.addEventListener('community-feed-refresh', onRefresh);
    return () => window.removeEventListener('community-feed-refresh', onRefresh);
  }, [feed, loadMaterialCourses, loadMaterialTypes]);

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

  const handleCourseFilter = useCallback((courseName) => {
    const nextCourse = normalizeCourseName(courseName);
    const params = new URLSearchParams(searchParams);
    ['id', 'post', 'news', 'group'].forEach((key) => params.delete(key));
    params.set('postTab', 'materials');
    if (nextCourse) {
      params.set('course', nextCourse);
    } else {
      params.delete('course');
    }
    setSelectedMaterialCourse(nextCourse);
    feed.setCurrentPage(1);
    setSearchParams(params, { replace: false });
  }, [feed, searchParams, setSearchParams]);

  const handleTypeFilter = useCallback((typeValue) => {
    const nextType = normalizeMaterialType(typeValue);
    const params = new URLSearchParams(searchParams);
    ['id', 'post', 'news', 'group'].forEach((key) => params.delete(key));
    params.set('postTab', 'materials');
    if (nextType) {
      params.set('type', nextType);
    } else {
      params.delete('type');
    }
    setSelectedMaterialType(nextType);
    feed.setCurrentPage(1);
    setSearchParams(params, { replace: false });
  }, [feed, searchParams, setSearchParams]);

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
  const materialTypeRows = MATERIAL_TYPE_KEYS.map((type) => ({
    type,
    count: materialTypes.find((item) => item.type === type)?.count || 0,
    label: t(`community.material_type_${type}`, type),
  }));

  const beforeContent = feed.selectedItem && (
    <div className={`mb-6 rounded-lg border p-4 ${isDayMode ? 'border-slate-200 bg-slate-50/80' : 'border-white/10 bg-white/[0.045]'}`}>
      <div className={`flex flex-wrap items-center gap-3 text-sm ${isDayMode ? 'text-slate-700' : 'text-gray-200'}`}>
        <span className="inline-flex items-center gap-1.5">
          <BookOpen size={15} />
          {t('community.materials_detail_tip', '支持上传 PDF、Word、Markdown 与附件块')}
        </span>
        {feed.selectedItem.link ? (
          <a
            href={feed.selectedItem.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${isDayMode ? 'border-slate-200 text-slate-700 hover:bg-white' : 'border-white/10 text-gray-200 hover:bg-white/[0.08]'}`}
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
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${isDayMode ? 'border-slate-200 bg-white text-slate-700' : 'border-white/10 bg-white/[0.05] text-gray-200'}`}
            >
              <span className={isDayMode ? 'text-slate-500' : 'text-gray-400'}>{item.label}</span>
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
      gradientFrom="from-slate-900/30"
      onRelatedSelect={handleRelatedSelect}
      onCommentsCountChange={handleCommentsCountChange}
      beforeContent={beforeContent}
      headerContent={feed.selectedItem && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <span className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold ${isDayMode ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-white/10 bg-white/[0.06] text-gray-200'}`}>
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
      <div className={`rounded-lg border p-3 ${isDayMode ? 'border-slate-200 bg-white/88 shadow-[0_8px_22px_rgba(15,23,42,0.045)]' : 'border-white/10 bg-white/[0.045]'}`}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${isDayMode ? 'text-slate-800' : 'text-gray-100'}`}>
            <Layers3 size={14} />
            {t('community.materials_type_filter_title', '资源栏目')}
          </div>
          {selectedMaterialType ? (
            <button
              type="button"
              onClick={() => handleTypeFilter('')}
              className={`inline-flex min-h-[28px] items-center gap-1 rounded-md border px-2 text-xs font-semibold ${isDayMode ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white' : 'border-white/10 bg-white/[0.05] text-gray-200 hover:bg-white/[0.08]'}`}
            >
              <X size={12} />
              {t('community.materials_type_filter_all', '全部栏目')}
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {materialTypeRows.map((item) => {
            const isActive = selectedMaterialType === item.type;
            return (
              <button
                key={item.type}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleTypeFilter(item.type)}
                className={`group flex min-h-[58px] min-w-0 flex-col justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                  isActive
                    ? isDayMode
                      ? 'border-slate-900 bg-slate-950 text-white shadow-[0_10px_26px_rgba(15,23,42,0.14)]'
                      : 'border-white bg-white text-slate-950'
                    : isDayMode
                      ? 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white'
                      : 'border-white/10 bg-white/[0.035] text-gray-200 hover:bg-white/[0.075]'
                }`}
              >
                <span className="truncate text-xs font-bold">{item.label}</span>
                <span className={`mt-1 text-[11px] font-semibold ${isActive ? 'opacity-80' : isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  {t('community.material_type_count', { count: item.count })}
                </span>
              </button>
            );
          })}
        </div>
        {selectedMaterialType ? (
          <div className={`mt-2 text-xs font-semibold ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
            {t('community.materials_type_filter_active', { type: t(`community.material_type_${selectedMaterialType}`, selectedMaterialType) })}
          </div>
        ) : (
          <div className={`mt-2 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('community.materials_type_filter_hint', '根据现有资源内容，先按资料用途分栏，再用课程标签精确查找。')}
          </div>
        )}
      </div>
      <div className={`rounded-lg border p-3 ${isDayMode ? 'border-slate-200 bg-slate-50/65' : 'border-white/10 bg-white/[0.035]'}`}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className={`inline-flex items-center gap-1.5 text-xs font-bold ${isDayMode ? 'text-slate-700' : 'text-gray-200'}`}>
            <Tags size={14} />
            {t('community.materials_course_filter_title', '课程标签')}
          </div>
          {selectedMaterialCourse ? (
            <button
              type="button"
              onClick={() => handleCourseFilter('')}
              className={`inline-flex min-h-[28px] items-center gap-1 rounded-md border px-2 text-xs font-semibold ${isDayMode ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50' : 'border-white/10 bg-white/[0.05] text-gray-200 hover:bg-white/[0.08]'}`}
            >
              <X size={12} />
              {t('community.materials_course_filter_all', '全部课程')}
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {materialCourses.length > 0 ? materialCourses.map((course) => {
            const isActive = selectedMaterialCourse === course.name;
            return (
              <button
                key={course.name}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleCourseFilter(course.name)}
                className={`inline-flex min-h-[32px] max-w-full items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? isDayMode
                      ? 'border-slate-900 bg-slate-950 text-white'
                      : 'border-white bg-white text-slate-950'
                    : isDayMode
                      ? 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      : 'border-white/10 bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]'
                }`}
              >
                <span className="truncate">{course.name}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-white/20' : isDayMode ? 'bg-slate-100 text-slate-500' : 'bg-white/[0.06] text-gray-400'}`}>
                  {t('community.material_course_count', { count: course.count })}
                </span>
              </button>
            );
          }) : (
            <span className={`text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {t('community.materials_course_filter_empty', '通过审核的资料会在这里形成课程标签')}
            </span>
          )}
        </div>
        {selectedMaterialCourse ? (
          <div className={`mt-2 text-xs font-semibold ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
            {t('community.materials_course_filter_active', { course: selectedMaterialCourse })}
          </div>
        ) : null}
      </div>
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
        accentColor="slate"
        extraControls={controls}
        onNewPost={onNewPost || openComposer}
        newPostLabel={t('community.materials_upload_action', '上传资料')}
        hideNewPostButton={hideNewPostButton}
        surfaceVariant="learning"
      />
      <UnifiedCommunityComposer
        isOpen={composerOpen}
        boardKey="materials"
        initialData={editingPost}
        onClose={() => { setComposerOpen(false); setEditingPost(null); }}
        onSuccess={() => {
          feed.handleRefresh();
          loadMaterialCourses();
          loadMaterialTypes();
        }}
      />
    </>
  );
};

export default CommunityMaterials;
