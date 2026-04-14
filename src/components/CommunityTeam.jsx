import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Users, UserPlus, UserMinus, Calendar, ExternalLink, User } from 'lucide-react';
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
  { key: 'recruiting', label: 'community.tab_recruiting' },
  { key: 'full', label: 'community.tab_full' },
  { key: 'closed', label: 'community.tab_closed' },
];

const CommunityTeam = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isDayMode = uiMode === 'day';
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const feed = useCommunityFeed({
    endpoint: '/community/posts',
    section: 'team',
    deepLinkParam: 'post',
    defaultPageSize: 10,
  });

  const post = feed.selectedItem;
  const teamProgress = post?.max_members ? Math.min((post.current_members || 0) / post.max_members, 1) : 0;
  const isTeamFull = teamProgress >= 1;
  const isMember = user && members.some((m) => m.id === user.id);
  const isOwner = user && post && user.id === post.author_id;

  // Fetch members when post changes
  useEffect(() => {
    if (!post) { setMembers([]); return; }
    const ac = new AbortController();
    setLoadingMembers(true);
    api.get(`/community/posts/${post.id}/members`, { signal: ac.signal })
      .then((res) => { if (!ac.signal.aborted) setMembers(res.data || []); })
      .catch(() => { if (!ac.signal.aborted) setMembers([]); })
      .finally(() => { if (!ac.signal.aborted) setLoadingMembers(false); });
    return () => ac.abort();
  }, [post?.id]);

  const handleJoinTeam = useCallback(async () => {
    if (!user) { toast.error(t('auth.signin_required')); return; }
    if (!post) return;
    setJoining(true);
    try {
      await api.post(`/community/posts/${post.id}/join`);
      feed.setSelectedItem((prev) => prev ? { ...prev, current_members: (prev.current_members || 0) + 1 } : prev);
      toast.success(t('community.post_joined', '报名成功'));
      // Refresh members
      const res = await api.get(`/community/posts/${post.id}/members`);
      setMembers(res.data || []);
      feed.handleRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || t('community.post_join_failed', '报名失败'));
    } finally {
      setJoining(false);
    }
  }, [user, post, t, feed.handleRefresh]);

  const handleLeaveTeam = useCallback(async () => {
    if (!user || !post) return;
    setLeaving(true);
    try {
      await api.delete(`/community/posts/${post.id}/join`);
      feed.setSelectedItem((prev) => prev ? {
        ...prev,
        current_members: Math.max(0, (prev.current_members || 1) - 1),
        status: prev.status === 'full' ? 'recruiting' : prev.status,
      } : prev);
      toast.success(t('community.post_left', '已退出队伍'));
      const res = await api.get(`/community/posts/${post.id}/members`);
      setMembers(res.data || []);
      feed.handleRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || t('community.post_leave_failed', '退出失败'));
    } finally {
      setLeaving(false);
    }
  }, [user, post, t, feed.handleRefresh]);

  const renderCard = (item, index, { canAnimate, isDayMode: dm }) => (
    <PostCard key={item.id} post={item} index={index} onClick={feed.handleItemClick} canAnimate={canAnimate} isDayMode={dm} />
  );

  const statusBadge = useMemo(() => {
    if (!post) return null;
    const cfg = post.status === 'full'
      ? { cls: isDayMode ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20', label: t('community.post_status_full', '已满') }
      : post.status === 'closed'
      ? { cls: isDayMode ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-gray-500/15 text-gray-400 border border-gray-500/20', label: t('community.post_status_closed', '已结束') }
      : { cls: isDayMode ? 'bg-violet-50 text-violet-600 border border-violet-200' : 'bg-violet-500/15 text-violet-400 border border-violet-500/20', label: t('community.post_status_recruiting', '招募中') };
    return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>;
  }, [post, isDayMode, t]);

  const actionButton = useMemo(() => {
    if (!post) return undefined;
    // Already a member (not owner) -> show leave button
    if (isMember && !isOwner) {
      return (
        <button onClick={handleLeaveTeam} disabled={leaving} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${isDayMode ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'}`}>
          <UserMinus size={16} />
          {leaving ? t('community.post_leaving', '退出中...') : t('community.post_leave', '退出队伍')}
        </button>
      );
    }
    // Not a member and team is recruiting
    if (!isMember && post.status === 'recruiting' && !isTeamFull) {
      return (
        <button onClick={handleJoinTeam} disabled={joining} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${isDayMode ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-violet-600 text-white hover:bg-violet-500'}`}>
          <UserPlus size={16} />
          {joining ? t('community.post_joining', '报名中...') : t('community.post_join', '报名参加')}
        </button>
      );
    }
    // Team full, show label
    if (isTeamFull && !isMember) {
      return (
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${isDayMode ? 'bg-gray-100 text-gray-500' : 'bg-white/5 text-gray-400'}`}>
          {t('community.post_status_full', '已满员')}
        </span>
      );
    }
    return undefined;
  }, [post, isMember, isOwner, isTeamFull, joining, leaving, isDayMode, t, handleJoinTeam, handleLeaveTeam]);

  const renderDetail = () => (
    <CommunityPostDetail
      post={post}
      onClose={() => { feed.setSelectedItem(null); setMembers([]); }}
      isDayMode={isDayMode}
      gradientFrom="from-violet-900/30"
      showComments={false}
      headerContent={post && (
        <>
          <div className="flex items-center gap-3 mb-3">
            {statusBadge}
            <span className={`text-sm font-mono ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
              {post.created_at && new Date(post.created_at).toLocaleDateString('zh-CN')}
            </span>
          </div>
          <h2 className={`text-3xl md:text-5xl font-black leading-tight tracking-tight font-serif ${isDayMode ? 'text-slate-900' : 'text-white drop-shadow-2xl'}`}>{post.title}</h2>
        </>
      )}
      authorBar={actionButton}
      beforeContent={post && (
        <>
          {post.max_members && (
            <div className={`mb-8 p-5 rounded-2xl border ${isDayMode ? 'bg-violet-50/50 border-violet-100' : 'bg-violet-500/5 border-violet-500/15'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium flex items-center gap-2 ${isDayMode ? 'text-violet-700' : 'text-violet-300'}`}><Users size={16} />{t('community.post_team_progress', '组队进度')}</span>
                <span className={`text-sm font-bold ${isDayMode ? 'text-violet-600' : 'text-violet-400'}`}>{post.current_members || 0} / {post.max_members}</span>
              </div>
              <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDayMode ? 'bg-violet-100' : 'bg-white/10'}`}>
                <div className={`h-full rounded-full transition-all duration-700 ${isTeamFull ? (isDayMode ? 'bg-blue-500' : 'bg-blue-400') : (isDayMode ? 'bg-violet-500' : 'bg-violet-400')}`} style={{ width: `${teamProgress * 100}%` }} />
              </div>
              {post.deadline && (
                <div className={`flex items-center gap-1.5 mt-3 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}><Calendar size={12} />{t('community.post_deadline_prefix', '截止')}: {post.deadline}</div>
              )}
            </div>
          )}

          {/* Member list */}
          <div className={`mb-8 p-5 rounded-2xl border ${isDayMode ? 'bg-slate-50/80 border-slate-200' : 'bg-white/[0.02] border-white/10'}`}>
            <h4 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${isDayMode ? 'text-slate-700' : 'text-gray-300'}`}>
              <Users size={15} />
              {t('community.team_members', '队伍成员')} ({members.length})
            </h4>
            {loadingMembers ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-xl animate-pulse ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`}>
                    <div className={`w-8 h-8 rounded-full ${isDayMode ? 'bg-slate-200' : 'bg-white/10'}`} />
                    <div className={`h-3 w-16 rounded ${isDayMode ? 'bg-slate-200' : 'bg-white/10'}`} />
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className={`text-sm ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('community.team_no_members', '暂无成员')}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {members.map((m) => (
                  <div key={m.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${isDayMode ? 'bg-white border border-slate-100 hover:border-violet-200' : 'bg-white/5 border border-white/5 hover:border-violet-500/20'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${isDayMode ? 'bg-violet-100' : 'bg-violet-500/15'}`}>
                      {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : <User size={14} className={isDayMode ? 'text-violet-500' : 'text-violet-400'} />}
                    </div>
                    <span className={`text-sm font-medium truncate ${isDayMode ? 'text-slate-700' : 'text-gray-300'}`}>{m.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {post.link && (
            <a href={post.link} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 mb-8 p-4 rounded-2xl border transition-colors ${isDayMode ? 'bg-indigo-50/60 border-indigo-100 hover:bg-indigo-50' : 'bg-indigo-500/5 border-indigo-500/15 hover:bg-indigo-500/10'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDayMode ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-500/15 text-indigo-400'}`}><ExternalLink size={20} /></div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${isDayMode ? 'text-indigo-700' : 'text-indigo-300'}`}>{t('community.post_activity_link', '活动链接')}</div>
                <div className={`text-xs truncate ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{post.link}</div>
              </div>
              <ExternalLink size={14} className={isDayMode ? 'text-indigo-400 flex-shrink-0' : 'text-indigo-500 flex-shrink-0'} />
            </a>
          )}
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
      emptyIcon={Users}
      emptyTitle={t('community.team_empty', '暂无组队帖')}
      emptyDesc={t('community.team_empty_desc', '发布第一个组队帖吧！')}
      accentColor="violet"
      statusTabs={STATUS_TABS}
      onNewPost={() => {
        if (!user) { toast.error(t('auth.signin_required')); return; }
        setIsComposerOpen(true);
      }}
      extraBottom={
        <PostComposer isOpen={isComposerOpen} onClose={() => setIsComposerOpen(false)} section="team" onSuccess={feed.handleRefresh} />
      }
    />
  );
};

export default CommunityTeam;
