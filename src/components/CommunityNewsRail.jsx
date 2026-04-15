import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Newspaper, Flame, Clock3, Pin, X, ExternalLink, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import UploadModal from './UploadModal';
import { useCachedResource } from '../hooks/useCachedResource';
import { parseContentBlocks, calculateReadingTime } from './communityUtils';
import toast from 'react-hot-toast';

const TAB_CONFIG = [
  { key: 'hot', icon: Flame, labelKey: 'community.news_hot', fallback: '热榜' },
  { key: 'latest', icon: Clock3, labelKey: 'community.news_latest', fallback: '最新' },
];
const ADMIN_STATUS_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'pending', label: '待审' },
  { key: 'approved', label: '已发' },
  { key: 'rejected', label: '驳回' },
];

const CommunityNewsRail = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isDayMode = uiMode === 'day';
  const isAdmin = user?.role === 'admin';

  const [activeSort, setActiveSort] = useState('hot');
  const [selectedNews, setSelectedNews] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');
  const [sourceHealth, setSourceHealth] = useState({ loading: false, checked: false, reachable: true, status: null, reason: null });

  const {
    data: newsItems,
    loading,
    error,
    refresh,
  } = useCachedResource(
    '/news',
    { page: 1, limit: 12, sort: activeSort, status: isAdmin ? adminStatusFilter : 'approved' },
    { dependencies: [activeSort, isAdmin, adminStatusFilter], keyPrefix: 'cache:v2:' }
  );

  const list = Array.isArray(newsItems) ? newsItems : [];
  const contentBlocks = useMemo(() => parseContentBlocks(selectedNews?.content_blocks), [selectedNews?.content_blocks]);

  useEffect(() => {
    if (!selectedNews) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedNews(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedNews]);

  useEffect(() => {
    if (!selectedNews?.id) {
      setSourceHealth({ loading: false, checked: false, reachable: true, status: null, reason: null });
      return undefined;
    }
    if (!selectedNews?.source_url) {
      setSourceHealth({ loading: false, checked: true, reachable: false, status: null, reason: 'missing_source_url' });
      return undefined;
    }
    let cancelled = false;
    setSourceHealth((prev) => ({ ...prev, loading: true, checked: false }));
    api.get(`/news/${selectedNews.id}/source-health`)
      .then(({ data }) => {
        if (cancelled) return;
        setSourceHealth({
          loading: false,
          checked: true,
          reachable: Boolean(data?.reachable),
          status: data?.status || null,
          reason: data?.reason || null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSourceHealth({ loading: false, checked: true, reachable: false, status: null, reason: 'network_error' });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedNews?.id, selectedNews?.source_url]);

  const handleOpen = async (item) => {
    setSelectedNews(item);
    try {
      const { data } = await api.get(`/news/${item.id}`);
      setSelectedNews(data);
    } catch {
      // keep optimistic modal content
    }
  };

  const handleCreateNews = async (form, meta = {}) => {
    const payload = {
      title: form.title,
      excerpt: form.excerpt,
      content: form.content,
      cover: form.cover || null,
      content_blocks: form.content_blocks || null,
      status: form.status,
      source_name: form.source_name || null,
      source_url: form.source_url || null,
      hot_score: form.hot_score || 0,
      pin_weight: form.pin_weight || 0,
      is_pinned: !!form.is_pinned,
      featured: !!form.featured,
    };
    if (form.id) {
      await api.put(`/news/${form.id}`, payload);
    } else {
      await api.post('/news', payload);
    }
    await refresh({ clearCache: true });
    setEditingNews(null);
    if (meta?.intent !== 'draft') {
      setIsUploadOpen(false);
    }
  };

  const handleImportNews = async () => {
    const url = String(importUrl || '').trim();
    if (!url) {
      toast.error(t('community.news_import_url_required', '请先输入新闻链接'));
      return;
    }
    setIsImporting(true);
    try {
      const { data } = await api.post('/news/import', { source_url: url });
      toast.success(t('community.news_import_success', '已导入草稿，请编辑确认后发布'));
      setImportUrl('');
      await refresh({ clearCache: true });
      setEditingNews(data || null);
      setIsUploadOpen(true);
    } catch (error) {
      if (error?.response?.status === 409) {
        toast.error(t('community.news_import_duplicated', '该链接已导入，无需重复导入'));
      } else {
        toast.error(t('community.news_import_failed', '导入失败，请检查链接后重试'));
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleReview = async (item, status) => {
    try {
      await api.put(`/news/${item.id}/review`, { status });
      toast.success(status === 'approved' ? '已通过' : '已驳回');
      await refresh({ clearCache: true });
    } catch {
      toast.error('审核失败');
    }
  };

  const handlePinToggle = async (item) => {
    try {
      await api.put(`/news/${item.id}`, {
        is_pinned: !item.is_pinned,
        pin_weight: item.is_pinned ? 0 : Math.max(Number(item.pin_weight || 0), 10),
      });
      toast.success(item.is_pinned ? '已取消置顶' : '已置顶');
      await refresh({ clearCache: true });
    } catch {
      toast.error('更新置顶状态失败');
    }
  };

  const handleTuneScore = async (item, field, delta) => {
    const current = Number(item?.[field] || 0);
    const next = Math.max(0, current + delta);
    try {
      await api.put(`/news/${item.id}`, { [field]: next });
      await refresh({ clearCache: true });
    } catch {
      toast.error(field === 'hot_score' ? '更新热度失败' : '更新权重失败');
    }
  };

  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-4 md:p-5 ${isDayMode ? 'bg-white/82 border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)]' : 'bg-[#141414]/70 border-white/10'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDayMode ? 'bg-blue-50 text-blue-600' : 'bg-blue-500/15 text-blue-300'}`}>
            <Newspaper size={16} />
          </div>
          <h3 className={`text-sm md:text-base font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
            {t('community.news_board', '新闻热榜')}
          </h3>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border ${isDayMode ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-white/5 text-gray-200 border-white/10 hover:bg-white/10'}`}
          >
            <PlusCircle size={13} />
            {t('common.publish', '发布')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4">
        {TAB_CONFIG.map(({ key, icon: Icon, labelKey, fallback }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSort(key)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
              activeSort === key
                ? (isDayMode ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-500 text-white border-blue-500')
                : (isDayMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10')
            }`}
          >
            <Icon size={13} />
            {t(labelKey, fallback)}
          </button>
        ))}
      </div>
      {isAdmin && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {ADMIN_STATUS_FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setAdminStatusFilter(item.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] border transition-all ${
                adminStatusFilter === item.key
                  ? (isDayMode ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-indigo-500 text-white border-indigo-500')
                  : (isDayMode ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10')
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {isAdmin && (
        <div className={`mb-4 p-2 rounded-xl border ${isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'}`}>
          <div className="flex gap-2">
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder={t('community.news_import_placeholder', '粘贴新闻链接进行导入')}
              className={`flex-1 h-9 px-3 rounded-lg text-xs border ${isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-black/20 border-white/10 text-gray-200'}`}
            />
            <button
              type="button"
              onClick={handleImportNews}
              disabled={isImporting}
              className={`px-3 h-9 rounded-lg text-xs font-semibold ${isDayMode ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white'} disabled:opacity-60`}
            >
              {isImporting ? t('common.loading', '加载中') : t('community.import', '导入')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
        {loading && (
          [...Array(6)].map((_, i) => (
            <div key={i} className={`rounded-xl border p-3 animate-pulse ${isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-white/[0.03] border-white/10'}`}>
              <div className={`h-3 rounded w-4/5 mb-2 ${isDayMode ? 'bg-slate-200' : 'bg-white/10'}`} />
              <div className={`h-3 rounded w-1/2 ${isDayMode ? 'bg-slate-200' : 'bg-white/10'}`} />
            </div>
          ))
        )}

        {!loading && error && (
          <button
            type="button"
            onClick={() => refresh({ clearCache: true })}
            className={`w-full rounded-xl border p-3 text-sm ${isDayMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-300 border-red-500/20'}`}
          >
            {t('common.retry', '重试')}
          </button>
        )}

        {!loading && !error && list.length === 0 && (
          <div className={`rounded-xl border p-4 text-sm text-center ${isDayMode ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-white/[0.03] text-gray-400 border-white/10'}`}>
            {t('community.news_empty', '暂无新闻')}
          </div>
        )}

        {!loading && !error && list.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleOpen(item)}
            className={`w-full text-left rounded-xl border p-3 transition-all group ${
              isDayMode ? 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/40' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-blue-400/40'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className={`text-xs font-black mt-0.5 ${index < 3 ? 'text-orange-500' : (isDayMode ? 'text-slate-400' : 'text-gray-500')}`}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold line-clamp-2 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                  {item.title}
                </div>
                <div className={`text-[11px] mt-1 flex items-center gap-2 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  {item.is_pinned ? <span className="inline-flex items-center gap-1"><Pin size={10} />{t('common.pinned', '置顶')}</span> : null}
                  <span>{item.source_name || t('community.news_source_internal', '站内')}</span>
                  {isAdmin && item.status && (
                    <span className={`px-1.5 py-0.5 rounded-full border text-[10px] ${
                      item.status === 'approved'
                        ? (isDayMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30')
                        : item.status === 'draft'
                          ? (isDayMode ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/10 text-gray-300 border-white/20')
                        : item.status === 'rejected'
                          ? (isDayMode ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-500/15 text-rose-300 border-rose-500/30')
                          : (isDayMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/15 text-amber-300 border-amber-500/30')
                    }`}>
                      {item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '已驳回' : item.status === 'draft' ? '草稿待确认' : '待审核'}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${isDayMode ? 'text-slate-600 border-slate-200 bg-slate-50' : 'text-gray-300 border-white/15 bg-white/[0.03]'}`}>
                      热度 {Number(item.hot_score || 0)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${isDayMode ? 'text-slate-600 border-slate-200 bg-slate-50' : 'text-gray-300 border-white/15 bg-white/[0.03]'}`}>
                      权重 {Number(item.pin_weight || 0)}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handleTuneScore(item, 'hot_score', 1); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleTuneScore(item, 'hot_score', 1); } }}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${isDayMode ? 'text-amber-700 border-amber-200 hover:bg-amber-50' : 'text-amber-300 border-amber-500/30 hover:bg-amber-500/10'}`}
                    >
                      热度+1
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handleTuneScore(item, 'pin_weight', 1); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleTuneScore(item, 'pin_weight', 1); } }}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${isDayMode ? 'text-indigo-700 border-indigo-200 hover:bg-indigo-50' : 'text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10'}`}
                    >
                      权重+1
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handleTuneScore(item, 'pin_weight', -1); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleTuneScore(item, 'pin_weight', -1); } }}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${isDayMode ? 'text-slate-700 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/20 hover:bg-white/10'}`}
                    >
                      权重-1
                    </span>
                    {item.status !== 'approved' && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); handleReview(item, 'approved'); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleReview(item, 'approved'); } }}
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${isDayMode ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' : 'text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10'}`}
                      >
                        发布
                      </span>
                    )}
                    {item.status !== 'rejected' && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); handleReview(item, 'rejected'); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleReview(item, 'rejected'); } }}
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${isDayMode ? 'text-rose-700 border-rose-200 hover:bg-rose-50' : 'text-rose-300 border-rose-500/30 hover:bg-rose-500/10'}`}
                      >
                        驳回
                      </span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); handlePinToggle(item); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handlePinToggle(item); } }}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${isDayMode ? 'text-blue-700 border-blue-200 hover:bg-blue-50' : 'text-blue-300 border-blue-500/30 hover:bg-blue-500/10'}`}
                    >
                      {item.is_pinned ? '取消置顶' : '置顶'}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const { data } = await api.get(`/news/${item.id}`);
                          setEditingNews(data);
                          setIsUploadOpen(true);
                        } catch {
                          toast.error('加载新闻详情失败');
                        }
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          try {
                            const { data } = await api.get(`/news/${item.id}`);
                            setEditingNews(data);
                            setIsUploadOpen(true);
                          } catch {
                            toast.error('加载新闻详情失败');
                          }
                        }
                      }}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${isDayMode ? 'text-slate-700 border-slate-200 hover:bg-slate-100' : 'text-gray-200 border-white/20 hover:bg-white/10'}`}
                    >
                      编辑
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selectedNews && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[130] backdrop-blur-md ${isDayMode ? 'bg-white/70' : 'bg-black/85'}`}
            onClick={() => setSelectedNews(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t('community.news_detail', '新闻详情')}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative mx-auto mt-10 mb-10 w-[92vw] max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl border ${isDayMode ? 'bg-white border-slate-200' : 'bg-[#0e0e0e] border-white/10'}`}
            >
              <button
                type="button"
                onClick={() => setSelectedNews(null)}
                className={`absolute top-4 right-4 z-10 p-2 rounded-full border ${isDayMode ? 'bg-white text-slate-700 border-slate-200' : 'bg-black/40 text-white border-white/10'}`}
              >
                <X size={18} />
              </button>

              {selectedNews.cover && (
                <div className="h-56 sm:h-72 bg-cover bg-center rounded-t-2xl" style={{ backgroundImage: `url(${selectedNews.cover})` }} />
              )}

              <div className="p-6 md:p-8">
                <h2 className={`text-2xl md:text-4xl font-black leading-tight mb-3 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                  {selectedNews.title}
                </h2>
                <div className={`text-xs md:text-sm flex items-center gap-3 mb-6 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  <span>{selectedNews.source_name || t('community.news_source_internal', '站内')}</span>
                  <span>•</span>
                  <span>{selectedNews.created_at ? new Date(selectedNews.created_at).toLocaleDateString('zh-CN') : ''}</span>
                  <span>•</span>
                  <span>{calculateReadingTime(selectedNews.content, t)}</span>
                </div>

                {contentBlocks.length > 0 ? (
                  <div className="space-y-4">
                    {contentBlocks.map((block, idx) => (
                      <div key={block.id || `${block.type}-${idx}`}>
                        {block.type === 'text' && <p className={`${isDayMode ? 'text-slate-700' : 'text-gray-300'} whitespace-pre-wrap leading-7`}>{block.text}</p>}
                        {block.type === 'image' && block.url && <img src={block.url} alt={block.caption || ''} className="w-full rounded-xl border border-white/10" />}
                        {block.type === 'video' && block.url && <video src={block.url} controls className="w-full rounded-xl border border-white/10" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`${isDayMode ? 'text-slate-700' : 'text-gray-300'} whitespace-pre-wrap leading-7`}>{selectedNews.content}</p>
                )}

                {selectedNews.source_url && (
                  <div className="mt-6 space-y-2">
                    {sourceHealth.checked && !sourceHealth.reachable && (
                      <div className={`rounded-lg border px-3 py-2 text-xs ${isDayMode ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'}`}>
                        {t('community.news_source_unreachable', '原文链接可能已失效，建议使用标题搜索来源站点。')}
                        {sourceHealth.status ? ` (HTTP ${sourceHealth.status})` : ''}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={selectedNews.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 text-sm font-semibold ${isDayMode ? 'text-blue-600 hover:text-blue-700' : 'text-blue-300 hover:text-blue-200'}`}
                      >
                        {t('community.open_original', '查看原文')}
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const fallbackText = `${selectedNews.title || ''} ${selectedNews.source_name || ''}`.trim();
                          navigator.clipboard?.writeText(fallbackText);
                          toast.success(t('community.news_copy_search_hint', '已复制“标题 + 来源”，可直接粘贴搜索'));
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md border ${isDayMode ? 'text-slate-600 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/10 hover:bg-white/10'}`}
                      >
                        {t('community.news_copy_search', '复制标题+来源')}
                      </button>
                      {sourceHealth.loading && (
                        <span className={`text-[11px] ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                          {t('community.news_source_checking', '正在检测原文链接...')}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isAdmin && (
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => {
            setIsUploadOpen(false);
            setEditingNews(null);
          }}
          onUpload={handleCreateNews}
          type="article"
          initialData={editingNews}
        />
      )}
    </div>
  );
};

export default CommunityNewsRail;
