import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const PendingReviewManager = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/pending');
      setItems(response.data);
    } catch (error) {
      toast.error(t('admin.pending_review_ui.load_fail'));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (item, status, reason = '') => {
    try {
      await api.put(`/${item.type}/${item.id}/status`, { status, reason });
      setItems(prev => prev.filter(i => !(i.id === item.id && i.type === item.type)));
      toast.success(status === 'approved' ? t('admin.pending_review_ui.approved_success') : t('admin.pending_review_ui.rejected_success'));
    } catch (error) {
      toast.error(t('admin.pending_review_ui.action_fail'));
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t('admin.pending_review_ui.loading')}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-[#111] p-6 rounded-2xl border border-white/10 flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock size={20} className="text-yellow-400" />
          {t('admin.pending_review_ui.title')} ({items.length})
        </h3>
        <button 
            onClick={fetchPending}
            className="text-sm text-gray-400 hover:text-white underline"
        >
            {t('admin.pending_review_ui.refresh')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence>
          {items.length === 0 ? (
            <div className="p-12 text-center border border-white/5 rounded-2xl border-dashed">
                <Check size={48} className="mx-auto text-green-500/50 mb-4" />
                <p className="text-gray-500 font-bold">{t('admin.pending_review_ui.all_caught_up')}</p>
                <p className="text-gray-600 text-sm">{t('admin.pending_review_ui.no_pending')}</p>
            </div>
          ) : (
            items.map(item => (
              <motion.div
                key={`${item.type}-${item.id}`}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
              >
                {/* Preview */}
                <div className="w-full sm:w-24 h-24 bg-black rounded-xl overflow-hidden flex-shrink-0 border border-white/5 relative">
                    {item.preview_image ? (
                        <img src={item.preview_image} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">{t('admin.pending_review_ui.no_img')}</div>
                    )}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] font-bold uppercase text-white backdrop-blur-sm">
                        {item.type}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-bold text-white truncate">{item.title}</h4>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-1">
                        <span className="bg-white/5 px-2 py-1 rounded">ID: {item.id}</span>
                        {item.uploader_id && <span className="bg-white/5 px-2 py-1 rounded">{t('admin.pending_review_ui.user_label')} {item.uploader_id}</span>}
                        {item.category && <span className="bg-white/5 px-2 py-1 rounded">{item.category}</span>}
                    </div>
                    {item.description && <p className="text-sm text-gray-500 mt-2 line-clamp-1">{item.description}</p>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    <button 
                        onClick={() => handleAction(item, 'approved')}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white rounded-xl font-bold transition-all border border-green-600/20"
                    >
                        <Check size={18} /> {t('admin.pending_review_ui.approve')}
                    </button>
                    <button 
                        onClick={() => handleAction(item, 'rejected', t('admin.pending_review_ui.admin_rejected'))}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-xl font-bold transition-all border border-red-600/20"
                    >
                        <X size={18} /> {t('admin.pending_review_ui.reject')}
                    </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PendingReviewManager;
