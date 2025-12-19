import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Tag, Search, Plus, Trash2, Edit2, Check, X, 
  RefreshCw, AlertTriangle 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const TagManager = () => {
  const { t } = useTranslation();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [newTagMode, setNewTagMode] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tags');
      setTags(response.data);
    } catch (error) {
      toast.error(t('admin.tag_manager.load_fail'));
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/tags/sync');
      toast.success(t('admin.tag_manager.sync_success'));
      fetchTags();
    } catch (error) {
      toast.error(t('admin.tag_manager.sync_fail'));
    } finally {
      setSyncing(false);
    }
  };

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    try {
      const response = await api.post('/tags', { name: newTagName });
      setTags([...tags, response.data]);
      setNewTagName('');
      setNewTagMode(false);
      toast.success(t('admin.tag_manager.create_success'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('admin.tag_manager.create_fail'));
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/tags/${id}`, { name: editName });
      setTags(tags.map(tag => tag.id === id ? { ...tag, name: editName } : tag));
      setEditingId(null);
      toast.success(t('admin.tag_manager.update_success'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('admin.tag_manager.update_fail'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.tag_manager.delete_confirm'))) return;
    try {
      await api.delete(`/tags/${id}`);
      setTags(tags.filter(tag => tag.id !== id));
      toast.success(t('admin.tag_manager.delete_success'));
    } catch (error) {
      toast.error(t('admin.tag_manager.delete_fail'));
    }
  };

  const startEdit = (tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
  };

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-3xl p-8 border border-white/10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Tag className="text-indigo-400" />
            {t('admin.tag_manager.title')}
          </h2>
          <p className="text-gray-400">{t('admin.tag_manager.subtitle')}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
            {t('admin.tag_manager.sync_btn')}
          </button>
          <button 
            onClick={() => setNewTagMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus size={18} />
            {t('admin.tag_manager.create_btn')}
          </button>
        </div>
      </div>

      {newTagMode && (
        <div className="mb-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex gap-4 items-center animate-in fade-in slide-in-from-top-4">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder={t('admin.tag_manager.name_placeholder')}
            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button 
            onClick={handleCreate}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            <Check size={18} />
          </button>
          <button 
            onClick={() => setNewTagMode(false)}
            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
        <input 
          type="text" 
          placeholder={t('admin.tag_manager.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('admin.tag_manager.loading')}</div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-white/5 rounded-2xl border-dashed">
          {t('admin.tag_manager.no_tags')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTags.map(tag => (
            <div key={tag.id} className="bg-[#111] border border-white/5 rounded-xl p-4 flex justify-between items-center group hover:border-indigo-500/30 transition-all">
              {editingId === tag.id ? (
                <div className="flex gap-2 flex-1 mr-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 bg-black/40 border border-indigo-500 rounded px-2 py-1 text-white text-sm focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                  />
                  <button onClick={() => handleUpdate(tag.id)} className="text-green-400 hover:text-green-300"><Check size={16} /></button>
                  <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{tag.name}</span>
                  <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-gray-400">
                    {tag.count} {t('admin.tag_manager.items_count')}
                  </span>
                </div>
              )}
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {editingId !== tag.id && (
                  <>
                    <button onClick={() => startEdit(tag)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(tag.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagManager;
