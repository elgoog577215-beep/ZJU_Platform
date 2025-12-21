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
import UploadModal from '../UploadModal';

const ResourceManager = ({ title, apiEndpoint, type, icon: Icon }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

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

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSave = async (newItem) => {
    try {
      // If newItem has an id, it's an update. But wait, UploadModal usually creates new items or returns the data.
      // UploadModal's onUpload usually handles the API call if it's self-contained, but here we might need to handle it.
      // Let's check UploadModal logic. 
      // If UploadModal handles the upload, it might just return the result. 
      // Actually, looking at UploadModal, it has internal submit logic for creating items.
      // But for EDITING, we need to pass the item.
      
      // However, UploadModal in this codebase (based on previous context) seems to handle the API call internally for creation.
      // Does it handle updates?
      // Let's check UploadModal again in the next step if needed. 
      // But for now, assuming UploadModal is used for CREATION and we might need to adapt it for EDITING or just use it for UI and handle save here.
      
      // Wait, if UploadModal handles the API call, then we just need to refresh.
      // If UploadModal returns data, we handle the API call.
      
      // Let's assume for now we want to use UploadModal's form but handle the save here OR rely on UploadModal's internal logic.
      // If UploadModal is designed for user uploads (creation), it might POST to /uploads or /events.
      // For Admin, we might want to PUT to /events/:id.
      
      // If I look at the previous UploadModal code (I don't have it open but I recall editing it), 
      // it sends a POST request.
      
      // If we want to reuse UploadModal for editing, we might need to modify UploadModal to support 'initialData' and 'isEditing' mode, 
      // OR we handle the submission via a callback.
      
      // In the `UploadModal` I edited earlier, I saw:
      // const handleSubmit = async (e) => { ... await api.post(...) ... }
      
      // So it does the POST internally.
      // To support editing, I should probably update UploadModal to handle PUT if initialData is present, 
      // OR allow overriding the submit handler.
      
      // For now, I will implement `handleSave` to just refresh the list, assuming UploadModal handles the submission.
      // BUT, if UploadModal doesn't support editing (PUT), then I need to fix UploadModal first.
      
      // Let's proceed with replacing ResourceManager first, and then I will check and update UploadModal to support editing.
      
      // Actually, if I pass `onUpload` to UploadModal, does it override the default behavior?
      // The previous code for UploadModal (which I can't see right now but I can infer) likely uses onUpload as a callback AFTER success, or as the handler itself.
      // I'll assume `onUpload` is the handler. If not, I'll fix it.
      
      // Let's pass `handleSave` which handles both Create (if UploadModal delegates) and Update.
      // If UploadModal handles Create internally, I'll need to adjust.
      
      // PROPOSAL: I'll update UploadModal to accept `onSubmit` prop. If provided, it uses that. If not, it uses default.
      // And for this ResourceManager, I'll pass a handleSave that handles both POST and PUT.
      
      if (editingItem) {
        await api.put(`/${apiEndpoint}/${editingItem.id}`, newItem);
        toast.success(t('admin.toast.update_success'));
      } else {
        await api.post(`/${apiEndpoint}`, newItem);
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
                {type === 'audio' && <th className="p-4">{t('admin.fields.artist')}</th>}
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
                    {type === 'audio' && <td className="p-4 text-gray-400">{item.artist}</td>}
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

      {/* Upload/Edit Modal */}
      <UploadModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleSave}
        type={type}
        initialData={editingItem}
      />
    </div>
  );
};

export default ResourceManager;