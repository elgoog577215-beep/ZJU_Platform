import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  FileStack,
  FileText,
  HelpCircle,
  Loader2,
  Newspaper,
  RefreshCcw,
  Search,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../services/api';
import UnifiedCommunityComposer from './UnifiedCommunityComposer';

const BOARD_OPTIONS = [
  { key: 'all', labelKey: 'user_profile.submissions.board_all', fallback: '全部版面', icon: FileText },
  { key: 'tech', labelKey: 'community.tab_tech', fallback: '技术分享', icon: BookOpen },
  { key: 'help', labelKey: 'community.tab_help_qa', fallback: '求助问答', icon: HelpCircle },
  { key: 'materials', labelKey: 'community.tab_materials', fallback: '期末资料', icon: FileStack },
  { key: 'news', labelKey: 'community.tab_news_hot', fallback: '新闻热点', icon: Newspaper },
  { key: 'team', labelKey: 'community.tab_team_collab', fallback: '组队协作', icon: Users },
];

const STATUS_OPTIONS = [
  { key: 'all', labelKey: 'user_profile.submissions.status_all', fallback: '全部状态' },
  { key: 'draft', labelKey: 'community.status_draft', fallback: '草稿' },
  { key: 'pending', labelKey: 'community.status_pending', fallback: '待审核' },
  { key: 'rejected', labelKey: 'community.status_rejected', fallback: '已驳回' },
  { key: 'approved', labelKey: 'community.status_published', fallback: '已发布' },
];

const BOARD_FETCHERS = {
  tech: {
    endpoint: '/articles',
    detail: (id) => `/articles/${id}`,
    delete: (id) => `/articles/${id}`,
    params: ({ userId, status }) => ({
      category: 'tech',
      uploader_id: userId,
      status,
      sort: 'newest',
      limit: 50,
    }),
    path: (id) => `/articles?postTab=tech&id=${id}`,
  },
  help: {
    endpoint: '/community/posts',
    detail: (id) => `/community/posts/${id}`,
    delete: (id) => `/community/posts/${id}`,
    params: ({ userId, status }) => ({
      section: 'help',
      author_id: userId,
      workflow_status: status,
      sort: 'newest',
      limit: 50,
    }),
    path: (id) => `/articles?postTab=help&post=${id}`,
  },
  materials: {
    endpoint: '/community/posts',
    detail: (id) => `/community/posts/${id}`,
    delete: (id) => `/community/posts/${id}`,
    params: ({ userId, status }) => ({
      section: 'materials',
      author_id: userId,
      workflow_status: status,
      sort: 'newest',
      limit: 50,
    }),
    path: (id) => `/articles?postTab=materials&post=${id}`,
  },
  news: {
    endpoint: '/news',
    detail: (id) => `/news/${id}`,
    delete: (id) => `/news/${id}`,
    params: ({ userId, status }) => ({
      uploader_id: userId,
      status,
      sort: 'latest',
      limit: 50,
    }),
    path: (id) => `/articles?postTab=news&news=${id}`,
  },
  team: {
    endpoint: '/community/posts',
    detail: (id) => `/community/posts/${id}`,
    delete: (id) => `/community/posts/${id}`,
    params: ({ userId, status }) => ({
      section: 'team',
      author_id: userId,
      workflow_status: status,
      sort: 'newest',
      limit: 50,
    }),
    path: (id) => `/articles?postTab=team&post=${id}`,
  },
};

const STATUS_ICON = {
  draft: FileText,
  pending: Clock3,
  rejected: XCircle,
  approved: CheckCircle2,
};

const normalizeListPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(payload?.news)) return payload.news;
  if (Array.isArray(payload?.articles)) return payload.articles;
  return [];
};

const getWorkflowStatus = (board, item) => {
  if (board === 'help' || board === 'team' || board === 'materials') {
    return item.workflow_status || item.review_status || 'approved';
  }
  return item.workflow_status || item.review_status || item.status || 'approved';
};

const normalizeSubmission = (board, item) => ({
  ...item,
  board,
  workflowStatus: getWorkflowStatus(board, item),
  businessStatus: board === 'help' || board === 'team' || board === 'materials' ? item.status : '',
  rejectionReason: item.rejection_reason || item.review_note || '',
  sortDate: item.updated_at || item.created_at || item.published_at || item.date || '',
});

const formatDate = (value, locale) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
};

const UserCommunitySubmissions = ({ userId, isDayMode }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeBoard, setActiveBoard] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editorState, setEditorState] = useState(null);
  const [actionId, setActionId] = useState('');

  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const boards = activeBoard === 'all'
          ? ['tech', 'help', 'materials', 'news', 'team']
          : [activeBoard];
        const status = activeStatus === 'all' ? 'all' : activeStatus;
        const results = await Promise.all(
          boards.map(async (board) => {
            const config = BOARD_FETCHERS[board];
            const response = await api.get(config.endpoint, {
              params: config.params({ userId, status }),
              signal: controller.signal,
            });
            return normalizeListPayload(response.data).map((item) => normalizeSubmission(board, item));
          }),
        );
        setItems(results.flat().sort((a, b) => new Date(b.sortDate || 0) - new Date(a.sortDate || 0)));
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [activeBoard, activeStatus, refreshKey, userId]);

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const haystack = [
        item.title,
        item.excerpt,
        item.content,
        item.tags,
        item.source_name,
        item.material_course,
        item.material_teacher,
        item.material_semester,
        item.material_type ? t(`community.material_type_${item.material_type}`, item.material_type) : '',
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [items, query, t]);

  const statusLabel = (status) => t(`user_profile.submissions.status_${status}`, status);
  const boardLabel = (board) => {
    const option = BOARD_OPTIONS.find((item) => item.key === board);
    return option ? t(option.labelKey, option.fallback) : board;
  };

  const openEditor = async (item) => {
    const key = `${item.board}:${item.id}:edit`;
    setActionId(key);
    try {
      const config = BOARD_FETCHERS[item.board];
      const response = await api.get(config.detail(item.id));
      setEditorState({ board: item.board, data: response.data || item });
    } catch (err) {
      toast.error(err?.response?.data?.error || t('user_profile.submissions.load_failed', '加载投稿失败'));
    } finally {
      setActionId('');
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(t('user_profile.submissions.delete_confirm', '确认删除这条投稿吗？'))) return;
    const key = `${item.board}:${item.id}:delete`;
    setActionId(key);
    try {
      const config = BOARD_FETCHERS[item.board];
      await api.delete(config.delete(item.id));
      toast.success(t('user_profile.submissions.delete_success', '投稿已删除'));
      setRefreshKey((value) => value + 1);
    } catch (err) {
      toast.error(err?.response?.data?.error || t('user_profile.submissions.delete_failed', '删除失败'));
    } finally {
      setActionId('');
    }
  };

  const openInCommunity = (item) => {
    const config = BOARD_FETCHERS[item.board];
    navigate(config.path(item.id), { state: { fromUserProfile: { userId, scrollY: 0, contentTab: item.board } } });
  };

  const closeEditor = () => setEditorState(null);
  const refresh = () => setRefreshKey((value) => value + 1);

  const panelClass = isDayMode
    ? 'border-slate-200/80 bg-white/82 text-slate-950 shadow-[0_18px_40px_rgba(148,163,184,0.12)]'
    : 'border-white/10 bg-white/[0.04] text-white';
  const subtleText = isDayMode ? 'text-slate-500' : 'text-gray-400';
  const controlShell = isDayMode ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/15';
  const activePill = isDayMode ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-indigo-400/35 bg-indigo-500/20 text-indigo-100';
  const idlePill = isDayMode ? 'border-transparent text-slate-600 hover:bg-white hover:text-slate-950' : 'border-transparent text-gray-300 hover:bg-white/10 hover:text-white';

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 md:p-5 ${panelClass}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold">{t('user_profile.submissions.title', '我的投稿')}</h3>
          </div>
          <button
            type="button"
            onClick={refresh}
            className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors ${isDayMode ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'border-white/10 bg-white/8 text-gray-200 hover:bg-white/12'}`}
          >
            <RefreshCcw size={16} />
            {t('user_profile.submissions.refresh', '刷新')}
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div className={`scrollbar-none flex gap-1 overflow-x-auto rounded-xl border p-1 ${controlShell}`}>
            {BOARD_OPTIONS.map(({ key, labelKey, fallback, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveBoard(key)}
                className={`inline-flex min-h-[36px] shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors ${activeBoard === key ? activePill : idlePill}`}
              >
                <Icon size={14} />
                {t(labelKey, fallback)}
              </button>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
            <div className={`scrollbar-none flex gap-1 overflow-x-auto rounded-xl border p-1 ${controlShell}`}>
              {STATUS_OPTIONS.map(({ key, labelKey, fallback }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveStatus(key)}
                  className={`min-h-[36px] shrink-0 rounded-lg border px-3 text-xs font-bold transition-colors ${activeStatus === key ? activePill : idlePill}`}
                >
                  {t(labelKey, fallback)}
                </button>
              ))}
            </div>
            <div className={`flex min-h-[40px] items-center gap-2 rounded-xl border px-3 ${isDayMode ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'}`}>
              <Search size={16} className={subtleText} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('user_profile.submissions.search_placeholder', '搜索投稿')}
                className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${isDayMode ? 'text-slate-800 placeholder:text-slate-400' : 'text-white placeholder:text-gray-500'}`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className={`flex items-center justify-center rounded-2xl border py-14 ${panelClass}`}>
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className={`rounded-2xl border p-5 text-sm ${panelClass}`}>
            {t('user_profile.submissions.load_failed', '加载投稿失败')}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={`rounded-2xl border border-dashed py-14 text-center ${isDayMode ? 'border-slate-200 bg-white/70 text-slate-500' : 'border-white/10 bg-white/[0.03] text-gray-400'}`}>
            <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-bold">{t('user_profile.submissions.empty_title', '暂无投稿')}</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const StatusIcon = STATUS_ICON[item.workflowStatus] || FileText;
            const editKey = `${item.board}:${item.id}:edit`;
            const deleteKey = `${item.board}:${item.id}:delete`;
            return (
              <div
                key={`${item.board}-${item.id}`}
                className={`rounded-2xl border p-4 transition-colors ${panelClass}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className={`mb-2 flex flex-wrap items-center gap-2 text-xs font-bold ${subtleText}`}>
                      <span>{boardLabel(item.board)}</span>
                      <span className="inline-flex items-center gap-1">
                        <StatusIcon size={13} />
                        {statusLabel(item.workflowStatus)}
                      </span>
                      {item.sortDate ? <span>{formatDate(item.sortDate, i18n.language)}</span> : null}
                    </div>
                    <h4 className="line-clamp-2 text-lg font-bold">{item.title || t('user_profile.submissions.untitled', '未命名投稿')}</h4>
                    {(item.excerpt || item.content) ? (
                      <p className={`mt-2 line-clamp-2 text-sm leading-6 ${subtleText}`}>
                        {item.excerpt || item.content}
                      </p>
                    ) : null}
                    {item.workflowStatus === 'rejected' && item.rejectionReason ? (
                      <p className={`mt-3 rounded-xl border px-3 py-2 text-xs leading-5 ${isDayMode ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-rose-400/20 bg-rose-500/10 text-rose-200'}`}>
                        {t('user_profile.submissions.rejected_reason', '驳回原因')}：{item.rejectionReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditor(item)}
                      disabled={actionId === editKey}
                      className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors disabled:opacity-60 ${isDayMode ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'border-white/10 bg-white/8 text-gray-200 hover:bg-white/12'}`}
                    >
                      {actionId === editKey ? <Loader2 size={15} className="animate-spin" /> : <Edit3 size={15} />}
                      {t('user_profile.submissions.edit', '编辑')}
                    </button>
                    <button
                      type="button"
                      onClick={() => openInCommunity(item)}
                      className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors ${isDayMode ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'border-white/10 bg-white/8 text-gray-200 hover:bg-white/12'}`}
                    >
                      <ExternalLink size={15} />
                      {t('user_profile.submissions.view', '打开')}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(item)}
                      disabled={actionId === deleteKey}
                      className={`inline-flex min-h-[38px] items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors disabled:opacity-60 ${isDayMode ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'}`}
                    >
                      {actionId === deleteKey ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      {t('user_profile.submissions.delete', '删除')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <UnifiedCommunityComposer
        isOpen={Boolean(editorState)}
        boardKey={editorState?.board || 'help'}
        initialData={editorState?.data || null}
        onClose={closeEditor}
        onSuccess={() => {
          closeEditor();
          refresh();
        }}
      />
    </div>
  );
};

export default UserCommunitySubmissions;
