import { memo, useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { QrCode, ExternalLink, Loader2, Plus, Trash2, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const PLATFORM_LABELS = { wechat: '微信', qq: 'QQ', discord: 'Discord', telegram: 'Telegram', other: '其他' };
const ADMIN_REVIEW_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
];

const isValidHttpUrl = (value) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const GroupCard = memo(({ group, index, isDayMode, isAdmin, onQuickAction, onEdit, onDelete }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      className={`backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 ${isDayMode ? 'bg-white/82 border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)] hover:shadow-[0_24px_52px_rgba(148,163,184,0.18)]' : 'bg-[#1a1a1a]/60 border-white/10 hover:border-white/20'}`}
    >
      {/* QR Code area */}
      <div className={`w-full aspect-square rounded-2xl mb-5 flex items-center justify-center border-2 border-dashed ${isDayMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
        {group.qr_code_url ? (
          <img src={group.qr_code_url} alt={group.name} className="w-full h-full object-contain rounded-2xl" />
        ) : (
          <div className="text-center">
            <QrCode size={48} className={`mx-auto mb-3 ${isDayMode ? 'text-slate-300' : 'text-gray-600'}`} />
            <p className={`text-xs ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('community.groups.qr_placeholder', '二维码待上传')}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className={`text-lg font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{group.name}</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isDayMode ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white/5 text-gray-400 border-white/10'}`}>
          {PLATFORM_LABELS[group.platform] || group.platform}
        </span>
      </div>
      <p className={`text-sm leading-relaxed mb-4 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{group.description}</p>
      {group.valid_until && (
        <p className={`text-[11px] mb-3 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
          有效期至 {String(group.valid_until).slice(0, 10)}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        {group.invite_link ? (
          <a href={group.invite_link} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isDayMode ? 'text-orange-600 hover:text-orange-700' : 'text-orange-300 hover:text-orange-200'}`}>
            {t('community.groups.join_link', '加入链接')}
            <ExternalLink size={14} />
          </a>
        ) : <span />}
        <div className="flex items-center gap-1.5">
          {group.review_status === 'pending' && <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDayMode ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/15 text-amber-300'}`}>待审核</span>}
          {Number(group.is_expired) === 1 && <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDayMode ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-gray-300'}`}>已过期</span>}
          {Number(group.is_recommended) === 1 && <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDayMode ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/15 text-emerald-300'}`}>推荐</span>}
        </div>
      </div>
      {group.review_status === 'rejected' && group.review_note && (
        <p className={`mt-3 text-[11px] leading-relaxed rounded-lg border px-2.5 py-2 ${isDayMode ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'}`}>
          驳回备注：{group.review_note}
        </p>
      )}
      {isAdmin && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {group.review_status !== 'approved' && (
            <button type="button" onClick={() => onQuickAction(group, { review_status: 'approved', review_note: null })} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${isDayMode ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' : 'text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10'}`}>
              <CheckCircle2 size={12} />通过
            </button>
          )}
          {group.review_status !== 'rejected' && (
            <button
              type="button"
              onClick={() => {
                const note = window.prompt('请输入驳回原因（可选）', group.review_note || '');
                if (note === null) return;
                onQuickAction(group, { review_status: 'rejected', review_note: note.trim() || null });
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${isDayMode ? 'text-rose-700 border-rose-200 hover:bg-rose-50' : 'text-rose-300 border-rose-500/20 hover:bg-rose-500/10'}`}
            >
              <XCircle size={12} />驳回
            </button>
          )}
          <button type="button" onClick={() => onQuickAction(group, { is_expired: Number(group.is_expired) !== 1 })} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${isDayMode ? 'text-slate-700 border-slate-200 hover:bg-slate-100' : 'text-gray-300 border-white/15 hover:bg-white/10'}`}>
            <Clock3 size={12} />{Number(group.is_expired) === 1 ? '恢复有效' : '标记过期'}
          </button>
          <button type="button" onClick={() => onQuickAction(group, { is_recommended: Number(group.is_recommended) !== 1 })} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${isDayMode ? 'text-blue-700 border-blue-200 hover:bg-blue-50' : 'text-blue-300 border-blue-400/20 hover:bg-blue-500/10'}`}>
            {Number(group.is_recommended) === 1 ? '取消推荐' : '设为推荐'}
          </button>
          <button
            type="button"
            onClick={() => {
              const note = window.prompt('编辑审核备注（留空可清除）', group.review_note || '');
              if (note === null) return;
              onQuickAction(group, { review_note: note.trim() || null });
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${isDayMode ? 'text-indigo-700 border-indigo-200 hover:bg-indigo-50' : 'text-indigo-300 border-indigo-400/20 hover:bg-indigo-500/10'}`}
          >
            备注
          </button>
          <button type="button" onClick={() => onEdit(group)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${isDayMode ? 'text-slate-700 border-slate-200 hover:bg-slate-100' : 'text-gray-200 border-white/15 hover:bg-white/10'}`}>
            编辑
          </button>
          <button type="button" onClick={() => onDelete(group.id)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${isDayMode ? 'text-rose-700 border-rose-200 hover:bg-rose-50' : 'text-rose-300 border-rose-500/20 hover:bg-rose-500/10'}`}>
            <Trash2 size={12} />删除
          </button>
        </div>
      )}
    </motion.div>
  );
});
GroupCard.displayName = 'GroupCard';

const CommunityGroups = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isDayMode = uiMode === 'day';
  const isAdmin = user?.role === 'admin';
  const canSubmitGroup = !!user;
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [adminReviewFilter, setAdminReviewFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    platform: 'wechat',
    qr_code_url: '',
    invite_link: '',
    valid_until: '',
    is_recommended: false,
    sort_order: 0,
  });

  const loadGroups = async (signal) => {
    const review = isAdmin ? adminReviewFilter : 'approved';
    const res = await api.get('/community/groups', { params: { review_status: review }, signal });
    setGroups(Array.isArray(res.data) ? res.data : []);
  };

  useEffect(() => {
    const ac = new AbortController();
    loadGroups(ac.signal)
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [isAdmin, adminReviewFilter]);

  const filteredGroups = useMemo(() => groups.filter((g) => {
    const matchPlatform = platform === 'all' ? true : (g.platform === platform);
    const keyword = search.trim().toLowerCase();
    const matchSearch = !keyword || `${g.name} ${g.description || ''}`.toLowerCase().includes(keyword);
    return matchPlatform && matchSearch;
  }), [groups, platform, search]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      platform: 'wechat',
      qr_code_url: '',
      invite_link: '',
      valid_until: '',
      is_recommended: false,
      sort_order: 0,
    });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('请填写社群名称');
      return;
    }
    try {
      if (form.qr_code_url && !isValidHttpUrl(form.qr_code_url)) {
        toast.error('二维码 URL 格式不正确');
        return;
      }
      if (form.invite_link && !isValidHttpUrl(form.invite_link)) {
        toast.error('加入链接格式不正确');
        return;
      }
      const payload = {
        ...form,
        sort_order: Number(form.sort_order) || 0,
        valid_until: form.valid_until || null,
      };
      if (editingId) {
        await api.put(`/community/groups/${editingId}`, payload);
      } else {
        await api.post('/community/groups', payload);
      }
      if (editingId) {
        toast.success('已更新社群');
      } else {
        toast.success(isAdmin ? '已创建社群' : '投稿成功，等待审核');
      }
      setShowForm(false);
      resetForm();
      await loadGroups();
    } catch {
      toast.error('操作失败，请重试');
    }
  };

  const handleQuickAction = async (group, patch) => {
    try {
      await api.put(`/community/groups/${group.id}`, { ...group, ...patch });
      toast.success('已更新');
      await loadGroups();
    } catch {
      toast.error('更新失败');
    }
  };

  const handleEdit = (group) => {
    setEditingId(group.id);
    setShowForm(true);
    setForm({
      name: group.name || '',
      description: group.description || '',
      platform: group.platform || 'wechat',
      qr_code_url: group.qr_code_url || '',
      invite_link: group.invite_link || '',
      valid_until: group.valid_until ? String(group.valid_until).slice(0, 10) : '',
      is_recommended: Number(group.is_recommended) === 1,
      sort_order: group.sort_order || 0,
    });
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/community/groups/${id}`);
      toast.success('已删除');
      await loadGroups();
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div role="tabpanel" aria-labelledby="tab-groups">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <div className="mb-6">
          <p className={`max-w-lg text-sm ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {t('community.groups.subtitle', '扫描二维码加入我们的社群，获取最新消息与资源')}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索社群"
              className={`h-10 px-3 rounded-xl border text-sm ${isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`}
            />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className={`h-10 px-3 rounded-xl border text-sm ${isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`}
            >
              <option value="all">全部平台</option>
              {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {isAdmin && (
              <div className="flex items-center gap-1.5">
                {ADMIN_REVIEW_FILTERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setAdminReviewFilter(item.key)}
                    className={`h-10 px-3 rounded-xl border text-xs ${adminReviewFilter === item.key
                      ? (isDayMode ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-indigo-500 text-white border-indigo-500')
                      : (isDayMode ? 'bg-white text-slate-600 border-slate-200' : 'bg-white/5 text-gray-300 border-white/10')
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            {canSubmitGroup && (
              <button
                type="button"
                onClick={() => {
                  if (showForm) resetForm();
                  setShowForm((v) => !v);
                }}
                className={`h-10 px-3 rounded-xl border text-sm inline-flex items-center gap-1.5 ${isDayMode ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-500 text-black border-orange-500'}`}
              >
                <Plus size={14} />
                {showForm ? '收起表单' : (isAdmin ? '新建社群' : '投稿社群')}
              </button>
            )}
          </div>
        </div>
        {canSubmitGroup && showForm && (
          <form onSubmit={handleSubmitForm} className={`mb-6 p-4 rounded-2xl border grid grid-cols-1 md:grid-cols-2 gap-3 ${isDayMode ? 'bg-white border-slate-200' : 'bg-white/[0.03] border-white/10'}`}>
            <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="社群名称" className={`h-10 px-3 rounded-xl border text-sm ${isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`} />
            <select value={form.platform} onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))} className={`h-10 px-3 rounded-xl border text-sm ${isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`}>
              {Object.entries(PLATFORM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input value={form.qr_code_url} onChange={(e) => setForm((p) => ({ ...p, qr_code_url: e.target.value }))} placeholder="二维码 URL" className={`h-10 px-3 rounded-xl border text-sm ${isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`} />
            <input value={form.invite_link} onChange={(e) => setForm((p) => ({ ...p, invite_link: e.target.value }))} placeholder="加入链接" className={`h-10 px-3 rounded-xl border text-sm ${isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`} />
            <input value={form.valid_until} onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))} type="date" className={`h-10 px-3 rounded-xl border text-sm ${isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`} />
            {isAdmin && (
              <input value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))} type="number" placeholder="排序值" className={`h-10 px-3 rounded-xl border text-sm ${isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`} />
            )}
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="描述" className={`md:col-span-2 min-h-[84px] px-3 py-2 rounded-xl border text-sm ${isDayMode ? 'bg-white border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`} />
            {isAdmin && (
              <label className={`inline-flex items-center gap-2 text-sm ${isDayMode ? 'text-slate-700' : 'text-gray-200'}`}>
                <input type="checkbox" checked={form.is_recommended} onChange={(e) => setForm((p) => ({ ...p, is_recommended: e.target.checked }))} />
                推荐展示
              </label>
            )}
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className={`px-3 py-2 rounded-lg text-sm border ${isDayMode ? 'border-slate-200 text-slate-600' : 'border-white/10 text-gray-300'}`}>取消</button>
              <button type="submit" className={`px-4 py-2 rounded-lg text-sm font-semibold ${isDayMode ? 'bg-orange-500 text-white' : 'bg-orange-500 text-black'}`}>{editingId ? '保存修改' : (isAdmin ? '创建社群' : '提交审核')}</button>
            </div>
          </form>
        )}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <QrCode size={64} className="text-gray-500 mb-4 opacity-60" />
            <p className={`${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('community.groups.empty', '暂无社群')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group, index) => (
              <GroupCard
                key={group.id}
                group={group}
                index={index}
                isDayMode={isDayMode}
                isAdmin={isAdmin}
                onQuickAction={handleQuickAction}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CommunityGroups;
