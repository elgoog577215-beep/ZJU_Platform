import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { 
  Search, Trash2, Edit2, Shield, User, Key, Check, X, Loader, AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const UserManager = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');
  // Delete Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      if (Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        console.error("Unexpected response format:", res.data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error(t('common.error_fetching_data'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirmation(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      await api.delete(`/admin/users/${deleteConfirmation}`);
      setUsers(prev => prev.filter(u => u.id !== deleteConfirmation));
      toast.success(t('admin.toast.delete_success'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('admin.toast.delete_fail'));
    } finally {
      setDeleteConfirmation(null);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setNewRole(user.role);
    setNewPassword('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {};
      if (newRole !== editingUser.role) payload.role = newRole;
      if (newPassword) payload.password = newPassword;

      if (Object.keys(payload).length === 0) {
        setIsModalOpen(false);
        return;
      }

      await api.put(`/admin/users/${editingUser.id}`, payload);
      
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...payload } : u));
      toast.success(t('admin.toast.save_success'));
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.error || t('admin.toast.save_fail'));
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-12"><Loader className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#111] p-4 rounded-2xl border border-white/10">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <User size={24} className="text-indigo-400" /> {t('admin.users_manage')}
        </h3>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder={t('admin.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-indigo-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4">{t('admin.fields.username')}</th>
                <th className="p-4">{t('admin.fields.role')}</th>
                <th className="p-4">{t('admin.fields.created_at')}</th>
                <th className="p-4 text-right">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-white">{user.username}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => handleEdit(user)}
                            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                            title={t('admin.edit_user')}
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={() => handleDelete(user.id)}
                            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                            title={t('admin.delete_user')}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                  <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">
                          {t('admin.no_items')}
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                onClick={() => setIsModalOpen(false)}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6"
                    onClick={e => e.stopPropagation()}
                >
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <User size={24} className="text-indigo-400" /> {t('admin.edit_user')}
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.fields.username')}</label>
                            <input 
                                type="text" 
                                value={editingUser?.username} 
                                disabled
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.fields.role')}</label>
                            <select 
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                            >
                                <option value="user">{t('admin.user_manager_ui.role_user')}</option>
                                <option value="admin">{t('admin.user_manager_ui.role_admin')}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                                <Key size={14} /> {t('admin.fields.new_password')}
                            </label>
                            <input 
                                type="password" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder={t('admin.fields.password_placeholder')}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">{t('admin.fields.password_hint')}</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            {t('admin.cancel')}
                        </button>
                        <button 
                            onClick={handleSave}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/25"
                        >
                            {t('admin.save')}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{t('admin.delete_confirm')}</h3>
                <p className="text-gray-400 mb-6 text-sm">
                  Are you sure you want to delete this user? This action cannot be undone.
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
                    Delete User
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManager;
