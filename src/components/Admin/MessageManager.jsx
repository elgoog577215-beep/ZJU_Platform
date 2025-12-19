import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Trash2, Check, Clock, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const MessageManager = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/messages');
      setMessages(res.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error(t('admin.messages.load_fail'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.messages.delete_confirm'))) return;
    try {
      await api.delete(`/admin/messages/${id}`);
      setMessages(prev => prev.filter(msg => msg.id !== id));
      toast.success(t('admin.messages.deleted'));
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error(t('admin.messages.delete_fail'));
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/admin/messages/${id}/read`);
      setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, read: 1 } : msg));
      toast.success(t('admin.messages.marked_read'));
    } catch (error) {
      console.error('Failed to mark as read:', error);
      toast.error(t('admin.messages.mark_fail'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Mail className="text-indigo-400" /> {t('admin.messages.title')}
        </h2>
        <button 
          onClick={fetchMessages}
          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          title={t('admin.pending_review_ui.refresh')}
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">{t('admin.messages.loading')}</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-20 bg-[#111] rounded-2xl border border-white/5">
          <Mail size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">{t('admin.messages.no_messages')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {messages.map(msg => (
            <div 
              key={msg.id} 
              className={`bg-[#111] border rounded-xl p-6 transition-all ${msg.read ? 'border-white/5 opacity-75' : 'border-indigo-500/30 bg-indigo-900/5'}`}
            >
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg text-white">{msg.name}</h3>
                    <span className="text-sm text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        {msg.email}
                    </span>
                    {!msg.read && (
                        <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full font-bold">{t('admin.messages.new')}</span>
                    )}
                  </div>
                  <p className="text-gray-300 whitespace-pre-wrap">{msg.message}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                    <Clock size={12} />
                    {new Date(msg.date).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-start md:self-center">
                  {!msg.read && (
                    <button 
                      onClick={() => handleMarkAsRead(msg.id)}
                      className="p-2 hover:bg-green-500/10 text-green-500 rounded-lg transition-colors"
                      title={t('admin.messages.mark_read')}
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(msg.id)}
                    className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                    title={t('admin.messages.delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageManager;
