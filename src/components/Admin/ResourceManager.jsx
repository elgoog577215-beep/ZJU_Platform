import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { 
  Search, Plus, Trash2, Edit2, Check, X, 
  ChevronLeft, ChevronRight, Upload, Filter, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import Dropdown from '../Dropdown';
import TagInput from '../TagInput';

const ResourceManager = ({ title, apiEndpoint, type, icon: Icon }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [uploading, setUploading] = useState(false);

  // Define fields based on type
  const getFields = () => {
    switch (type) {
      case 'image': // photos
        return [
          { name: 'title', type: 'text', label: t('admin.fields.title') },
          { name: 'category', type: 'text', label: t('admin.fields.category') },
          { name: 'url', type: 'file', label: t('admin.fields.url') },
          { name: 'tags', type: 'tag-input', label: t('admin.fields.tags') },
          { name: 'size', type: 'text', label: t('admin.fields.size') },
          { name: 'featured', type: 'checkbox', label: t('admin.fields.featured') }
        ];
      case 'audio': // music
        return [
          { name: 'title', type: 'text', label: t('admin.fields.title') },
          { name: 'artist', type: 'text', label: t('admin.fields.artist') },
          { name: 'category', type: 'text', label: t('admin.fields.category') },
          { name: 'audio', type: 'file', label: t('admin.fields.audio') },
          { name: 'cover', type: 'file', label: t('admin.fields.cover') },
          { name: 'duration', type: 'number', label: t('admin.fields.duration') },
          { name: 'tags', type: 'tag-input', label: t('admin.fields.tags') },
          { name: 'featured', type: 'checkbox', label: t('admin.fields.featured') }
        ];
      case 'video': // videos
        return [
          { name: 'title', type: 'text', label: t('admin.fields.title') },
          { name: 'category', type: 'text', label: t('admin.fields.category') },
          { name: 'video', type: 'file', label: t('admin.fields.video') },
          { name: 'thumbnail', type: 'file', label: t('admin.fields.thumbnail') },
          { name: 'tags', type: 'text', label: t('admin.fields.tags') },
          { name: 'featured', type: 'checkbox', label: t('admin.fields.featured') }
        ];
      case 'article': // articles
        return [
          { name: 'title', type: 'text', label: t('admin.fields.title') },
          { name: 'tag', type: 'text', label: t('admin.fields.category') },
          { name: 'date', type: 'date', label: t('admin.fields.date') },
          { name: 'cover', type: 'file', label: t('admin.fields.cover') },
          { name: 'excerpt', type: 'textarea', label: t('admin.fields.excerpt') },
          { name: 'content', type: 'textarea', label: t('admin.fields.content') },
          { name: 'tags', type: 'text', label: t('admin.fields.tags') },
          { name: 'featured', type: 'checkbox', label: t('admin.fields.featured') }
        ];
      case 'event': // events
        return [
          { name: 'title', type: 'text', label: t('admin.fields.title') },
          { name: 'date', type: 'date', label: t('admin.fields.date') },
          { name: 'location', type: 'text', label: t('admin.fields.location') },
          { name: 'category', type: 'text', label: t('admin.fields.category') },
          { name: 'image', type: 'file', label: t('admin.fields.image') },
          { name: 'description', type: 'textarea', label: t('admin.fields.description') },
          { name: 'link', type: 'text', label: t('admin.fields.link') },
          { name: 'status', type: 'select', label: t('admin.fields.status'), options: ['upcoming', 'ongoing', 'past'] },
          { name: 'tags', type: 'tag-input', label: t('admin.fields.tags') },
          { name: 'featured', type: 'checkbox', label: t('admin.fields.featured') }
        ];
      default:
        return [];
    }
  };

  const fields = getFields();

  const fetchItems = async (page = 1) => {
    setLoading(true);
    try {
      // Add timestamp to prevent browser caching
      const timestamp = new Date().getTime();
      const response = await api.get(`/${apiEndpoint}?page=${page}&limit=10&search=${search}&status=all&_t=${timestamp}`);
      setItems(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(t('admin.toast.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [apiEndpoint, type]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems(1);
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  // ... (previous code)

  const handleDelete = (id) => {
    setDeleteConfirmation(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      console.log(`Deleting item ${deleteConfirmation} from ${apiEndpoint}...`);
      await api.delete(`/${apiEndpoint}/${deleteConfirmation}`);
      toast.success(t('admin.toast.delete_success'));
      fetchItems(pagination.page);
    } catch (error) {
      console.error('Delete failed:', error);
      const errorMessage = error.response?.data?.error || error.message || t('admin.toast.delete_fail');
      toast.error(errorMessage);
    } finally {
      setDeleteConfirmation(null);
    }
  };

  // ... (rest of the code)

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({});
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);

    setUploading(true);
    try {
      const response = await api.post('/upload', uploadData);
      setFormData(prev => ({ ...prev, [fieldName]: response.data.fileUrl }));
      toast.success(t('admin.resource_manager_ui.upload_success'));
    } catch (error) {
      toast.error(t('admin.resource_manager_ui.upload_fail'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        console.log(`Updating item ${editingItem.id} in ${apiEndpoint}...`);
        await api.put(`/${apiEndpoint}/${editingItem.id}`, formData);
        toast.success(t('admin.toast.update_success'));
      } else {
        console.log(`Creating new item in ${apiEndpoint}...`);
        await api.post(`/${apiEndpoint}`, formData);
        toast.success(t('admin.toast.create_success'));
      }
      setIsModalOpen(false);
      fetchItems(pagination.page);
    } catch (error) {
      console.error('Save failed:', error);
      const errorMessage = error.response?.data?.error || error.message || t('admin.toast.save_fail');
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#111] p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
            <Icon size={20} />
          </div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.search_placeholder')}
              className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </form>
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{t('admin.add_new')}</span>
          </button>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-[#111] rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4">{t('admin.id')}</th>
                <th className="p-4">{t('admin.fields.title')}</th>
                {type === 'image' && <th className="p-4">{t('admin.fields.preview')}</th>}
                {type === 'music' && <th className="p-4">{t('admin.fields.artist')}</th>}
                <th className="p-4">{t('admin.fields.category')}</th>
                <th className="p-4 text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    {t('admin.resource_manager_ui.loading')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    {t('admin.no_items')}
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-gray-500 font-mono text-xs">#{item.id}</td>
                    <td className="p-4 font-bold text-white">{item.title}</td>
                    {type === 'image' && (
                      <td className="p-4">
                        <img src={item.url} alt={item.title} className="w-12 h-12 object-cover rounded-lg border border-white/10" />
                      </td>
                    )}
                    {type === 'music' && <td className="p-4 text-gray-400">{item.artist}</td>}
                    <td className="p-4">
                      <span className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400 border border-white/5">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-center gap-4">
            <button 
              disabled={pagination.page === 1}
              onClick={() => fetchItems(pagination.page - 1)}
              className="p-2 bg-white/5 rounded-lg disabled:opacity-50 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-400">
              {t('admin.resource_manager_ui.pagination_info', { page: pagination.page, total: pagination.totalPages })}
            </span>
            <button 
              disabled={pagination.page === pagination.totalPages}
              onClick={() => fetchItems(pagination.page + 1)}
              className="p-2 bg-white/5 rounded-lg disabled:opacity-50 hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t('admin.delete_confirm')}</h3>
                <p className="text-gray-400 mb-6 text-sm">
                  {t('admin.delete_warning_desc')}
                </p>
                
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setDeleteConfirmation(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {t('admin.cancel')}
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/25"
                  >
                    {t('admin.delete')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                  {editingItem ? t('admin.edit_item') : t('admin.add_item')}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                <form id="resourceForm" onSubmit={handleSubmit} className="space-y-4">
                  {fields.map(field => (
                    <div key={field.name}>
                      <label className="block text-sm font-bold text-gray-400 mb-2">
                        {field.label}
                      </label>
                      
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 h-32"
                        />
                      ) : field.type === 'tag-input' ? (
                        <TagInput
                          value={formData[field.name] || ''}
                          onChange={(val) => setFormData({ ...formData, [field.name]: val })}
                          placeholder={field.label}
                        />
                      ) : field.type === 'file' ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                            placeholder={t('admin.resource_manager_ui.file_url_placeholder')}
                          />
                          <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-center transition-colors">
                            <Upload size={20} className="text-gray-400" />
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => handleFileUpload(e, field.name)}
                              disabled={uploading}
                            />
                          </label>
                        </div>
                      ) : field.type === 'select' ? (
                        <Dropdown
                            value={formData[field.name]}
                            onChange={(value) => setFormData({ ...formData, [field.name]: value })}
                            options={field.options.map(opt => ({
                                value: opt,
                                label: t(`events.status.${opt}`) || opt // Try to translate if it's an event status, else use raw
                            }))}
                            placeholder={t('admin.resource_manager_ui.select_placeholder')}
                            buttonClassName="bg-black/40 border-white/10 w-full"
                        />
                      ) : field.type === 'checkbox' ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={!!formData[field.name]}
                                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                                className="w-5 h-5 rounded border-gray-600 bg-black/40 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-white">{t('admin.resource_manager_ui.yes')}</span>
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                        />
                      )}
                    </div>
                  ))}
                </form>
              </div>

              <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {t('admin.cancel')}
                </button>
                <button 
                  type="submit"
                  form="resourceForm"
                  disabled={uploading}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                >
                  {uploading ? t('admin.resource_manager_ui.uploading') : t('admin.save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResourceManager;
