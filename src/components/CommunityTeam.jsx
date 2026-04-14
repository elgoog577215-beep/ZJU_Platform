import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Upload, Calendar, UserPlus, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import SortSelector from './SortSelector';
import { useCachedResource } from '../hooks/useCachedResource';
import { useReducedMotion } from '../utils/animations';
import { useBackClose } from '../hooks/useBackClose';
import PostCard from './PostCard';
import PostComposer from './PostComposer';
import CommunityDetailModal from './CommunityDetailModal';
import { parseContentBlocks } from './communityUtils';
import { useCommunitySection } from '../hooks/useCommunitySection';

const STATUS_TABS = [
  { key: 'all', label: 'community.tab_all' },
  { key: 'recruiting', label: 'community.tab_recruiting' },
  { key: 'full', label: 'community.tab_full' },
  { key: 'closed', label: 'community.tab_closed' },
];


const CommunityTeam = () => {
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === 'day';
  const isPaginationEnabled = settings.pagination_enabled === 'true';
  const pageSize = isPaginationEnabled ? 10 : 15;
  const [displayPosts, setDisplayPosts] = useState([]);

  useBackClose(selectedPost !== null, () => setSelectedPost(null));

  const queryParams = useMemo(() => {
    const p = { page: currentPage, limit: pageSize, sort, section: 'team' };
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

  // FIX: B9 — Add AbortController to deep-link fetch
  useEffect(() => {
    const postId = searchParams.get('post');
    if (!postId) return;
    const ac = new AbortController();
    api.get(`/community/posts/${postId}`, { signal: ac.signal })
      .then((res) => { if (res.data) setSelectedPost(res.data); })
      .catch(() => {});
    return () => ac.abort();
  }, [searchParams]);

  const { handleItemClick: handlePostClick, handlePageChange, handleComposerSuccess } = useCommunitySection({
    setSelectedItem: setSelectedPost,
    setCurrentPage,
    refresh,
  });

  const handleJoinTeam = useCallback(async () => {
    if (!user) { toast.error(t('auth.signin_required')); return; }
    if (!selectedPost) return;
    setJoining(true);
    try {
      await api.post(`/community/posts/${selectedPost.id}/join`);
      setSelectedPost((prev) => prev ? { ...prev, current_members: (prev.current_members || 0) + 1 } : prev);
      toast.success(t('community.post_joined', '报名成功'));
      refresh({ clearCache: true });
    } catch (err) {
      const msg = err.response?.data?.error || t('community.post_join_failed', '报名失败');
      toast.error(msg);
    } finally {
      setJoining(false);
    }
  }, [user, selectedPost, t, refresh]);

  const selectedContentBlocks = useMemo(
    () => parseContentBlocks(selectedPost?.content_blocks),
    [selectedPost?.content_blocks]
  );

  const teamProgress = selectedPost?.max_members
    ? Math.min((selectedPost.current_members || 0) / selectedPost.max_members, 1)
    : 0;
  const isTeamFull = teamProgress >= 1;

  return (
    <div role="tabpanel" aria-labelledby="tab-team">
      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {STATUS_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${statusFilter === key
                  ? (isDayMode ? 'bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-500/20' : 'bg-violet-600 text-white border-violet-600')
                  : (isDayMode ? 'bg-white/80 text-slate-600 border-slate-200/80 hover:bg-slate-50' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10')
                }`}
              >
                {t(label)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden md:block w-40">
              <SortSelector sort={sort} onSortChange={setSort} />
            </div>
            <button
              onClick={() => {
                if (!user) { toast.error(t('auth.signin_required')); return; }
                setIsComposerOpen(true);
              }}
              className={`p-2 md:p-3 rounded-full backdrop-blur-md border transition-all ${isDayMode ? 'bg-white/85 hover:bg-white text-slate-700 border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.14)]' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
              title={t('community.post_new_team', '发帖')}
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
                <div className={`h-2 rounded-full w-1/3 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
              </div>
            </div>
          ))
        ) : displayPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className={`rounded-3xl p-8 mb-6 border backdrop-blur-xl ${isDayMode ? 'bg-violet-50/80 border-violet-100/80' : 'bg-violet-500/10 border-white/5'}`}>
              <Users size={64} className="text-violet-400 opacity-80" />
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('community.team_empty', '暂无组队帖')}</h3>
            <p className={`text-center max-w-md ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {t('community.team_empty_desc', '发布第一个组队帖吧！')}
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

      {/* Post Detail Modal — uses shared CommunityDetailModal */}
      <CommunityDetailModal
        item={selectedPost}
        onClose={() => setSelectedPost(null)}
        isDayMode={isDayMode}
        gradientFrom="from-violet-900/30"
        headerContent={selectedPost && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                selectedPost.status === 'full'
                  ? (isDayMode ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20')
                  : selectedPost.status === 'closed'
                  ? (isDayMode ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-gray-500/15 text-gray-400 border border-gray-500/20')
                  : (isDayMode ? 'bg-violet-50 text-violet-600 border border-violet-200' : 'bg-violet-500/15 text-violet-400 border border-violet-500/20')
              }`}>
                {selectedPost.status === 'full' ? t('community.post_status_full', '已满')
                  : selectedPost.status === 'closed' ? t('community.post_status_closed', '已结束')
                  : t('community.post_status_recruiting', '招募中')}
              </span>
              <span className={`text-sm font-mono ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                {selectedPost.created_at && new Date(selectedPost.created_at).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <h2 className={`text-3xl md:text-5xl font-black leading-tight tracking-tight font-serif ${isDayMode ? 'text-slate-900' : 'text-white drop-shadow-2xl'}`}>
              {selectedPost.title}
            </h2>
          </>
        )}
        authorBar={
          selectedPost && selectedPost.status === 'recruiting' && !isTeamFull ? (
            <button
              onClick={handleJoinTeam}
              disabled={joining}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${isDayMode ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-violet-600 text-white hover:bg-violet-500'}`}
            >
              <UserPlus size={16} />
              {joining ? t('community.post_joining', '报名中...') : t('community.post_join', '报名参加')}
            </button>
          ) : undefined
        }
        beforeContent={selectedPost && (
          <>
            {/* Team progress card */}
            {selectedPost.max_members && (
              <div className={`mb-8 p-5 rounded-2xl border ${isDayMode ? 'bg-violet-50/50 border-violet-100' : 'bg-violet-500/5 border-violet-500/15'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium flex items-center gap-2 ${isDayMode ? 'text-violet-700' : 'text-violet-300'}`}>
                    <Users size={16} />
                    {t('community.post_team_progress', '组队进度')}
                  </span>
                  <span className={`text-sm font-bold ${isDayMode ? 'text-violet-600' : 'text-violet-400'}`}>
                    {selectedPost.current_members || 0} / {selectedPost.max_members}
                  </span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDayMode ? 'bg-violet-100' : 'bg-white/10'}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${isTeamFull ? (isDayMode ? 'bg-blue-500' : 'bg-blue-400') : (isDayMode ? 'bg-violet-500' : 'bg-violet-400')}`}
                    style={{ width: `${teamProgress * 100}%` }}
                  />
                </div>
                {selectedPost.deadline && (
                  <div className={`flex items-center gap-1.5 mt-3 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    <Calendar size={12} />
                    {t('community.post_deadline_prefix', '截止')}: {selectedPost.deadline}
                  </div>
                )}
              </div>
            )}

            {/* Activity link */}
            {selectedPost.link && (
              <a
                href={selectedPost.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 mb-8 p-4 rounded-2xl border transition-colors ${isDayMode ? 'bg-indigo-50/60 border-indigo-100 hover:bg-indigo-50' : 'bg-indigo-500/5 border-indigo-500/15 hover:bg-indigo-500/10'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDayMode ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-500/15 text-indigo-400'}`}>
                  <ExternalLink size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isDayMode ? 'text-indigo-700' : 'text-indigo-300'}`}>
                    {t('community.post_activity_link', '活动链接')}
                  </div>
                  <div className={`text-xs truncate ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    {selectedPost.link}
                  </div>
                </div>
                <ExternalLink size={14} className={isDayMode ? 'text-indigo-400 flex-shrink-0' : 'text-indigo-500 flex-shrink-0'} />
              </a>
            )}
          </>
        )}
        contentBlocks={selectedContentBlocks}
        htmlContent={selectedPost?.content}
        afterContent={selectedPost && selectedPost.tags && selectedPost.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {(Array.isArray(selectedPost.tags) ? selectedPost.tags : []).map((tag) => (
              <span key={tag} className={`px-3 py-1 rounded-lg text-xs font-medium ${isDayMode ? 'bg-slate-100 text-slate-600' : 'bg-white/5 text-gray-400'}`}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      />

      {/* Post Composer */}
      <PostComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        section="team"
        onSuccess={handleComposerSuccess}
      />
    </div>
  );
};

export default CommunityTeam;
