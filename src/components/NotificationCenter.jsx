import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, X, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const NotificationCenter = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications?limit=20');
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every minute
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e && e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read', error);
      toast.error(t('notifications.mark_read_failed'));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/all/read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
      toast.error(t('notifications.mark_all_read_failed'));
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notifications.find(n => n.id === id)?.is_read === 0) {
          setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification', error);
      toast.error(t('notifications.delete_failed'));
    }
  };

  const handleClearAll = async () => {
    try {
      await api.delete('/notifications/all');
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to clear all notifications', error);
      toast.error(t('notifications.clear_all_failed'));
    }
  };

  const handleNotificationClick = async (notification) => {
    if (notification.is_read === 0) {
        await handleMarkAsRead(notification.id);
    }
    
    // Navigate if related resource exists
    if (notification.related_resource_id && notification.related_resource_type) {
        // Map singular/plural if needed, but usually frontend routes are like /gallery for photos
        // Let's assume singular type for detail pages if they exist, or just stay on notification
        // For now, let's just close the dropdown
    }
    setIsOpen(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString(i18n.language, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) return null;

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors hover:bg-white/10 rounded-full"
      >
        <motion.div
            animate={unreadCount > 0 ? { rotate: [0, -15, 15, -15, 15, 0] } : {}}
            transition={{ repeat: Infinity, repeatDelay: 5, duration: 1 }}
        >
            <Bell size={20} />
        </motion.div>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-black" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden origin-top-right"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
              <h3 className="font-bold text-white">{t('notifications.title')}</h3>
              {notifications.length > 0 && (
                  <div className="flex gap-2">
                    <button 
                        onClick={handleMarkAllRead}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        title={t('notifications.mark_all_read')}
                    >
                        <CheckCheck size={16} />
                    </button>
                    <button 
                        onClick={handleClearAll}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        title={t('notifications.clear_all')}
                    >
                        <Trash2 size={16} />
                    </button>
                  </div>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-3">
                        <Bell size={24} className="opacity-50" />
                    </div>
                    <p>{t('notifications.empty')}</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-white/5 transition-colors cursor-pointer group relative ${notification.is_read ? 'opacity-60' : 'bg-indigo-500/5'}`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 transition-colors ${notification.is_read ? 'bg-transparent' : 'bg-indigo-500'}`} />
                        <div className="flex-1 pr-6">
                          <p className="text-sm text-gray-200 leading-relaxed line-clamp-2">{notification.content}</p>
                          <p className="text-[10px] text-gray-500 mt-1.5 font-mono">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => handleDelete(notification.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-all absolute top-2 right-2"
                          title={t('common.delete')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
