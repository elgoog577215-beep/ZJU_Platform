import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Upload, Calendar, CheckCircle, Clock, XCircle, LogOut, Heart, Image, Music, Film, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api, { uploadFile } from '../services/api';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Dropdown from './Dropdown';
import FavoriteButton from './FavoriteButton';
import { useSettings } from '../context/SettingsContext';
import { useBackClose } from '../hooks/useBackClose';

const UserProfileModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { user, logout, updateProfile } = useAuth();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState('profile'); // profile, uploads, favorites, security
  const [editing, setEditing] = useState(false);
  
  useBackClose(isOpen, onClose);
  const [uploads, setUploads] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [uploadType, setUploadType] = useState('photos');
  const [favoriteType, setFavoriteType] = useState('photo');
  
  // Profile edit state
  const [profileData, setProfileData] = useState({
      organization: '',
      inviteCode: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [isInviteCodeVerified, setIsInviteCodeVerified] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
        setProfileData({
            organization: user.organization || '',
            inviteCode: ''
        });
        setIsInviteCodeVerified(!!user.organization);
    }
    if (isOpen && activeTab === 'uploads' && user) {
        fetchUploads();
    }
    if (isOpen && activeTab === 'favorites' && user) {
        fetchFavorites();
    }
  }, [isOpen, activeTab, uploadType, favoriteType, user]);

  const fetchUploads = async () => {
      setLoadingUploads(true);
      try {
          const res = await api.get(`/${uploadType}?uploader_id=${user.id}&status=all&limit=50`);
          setUploads(res.data.data || []);
      } catch (err) {
          console.error(err);
          toast.error(t('common.error_fetching_data'));
      } finally {
          setLoadingUploads(false);
      }
  };

  const fetchFavorites = async () => {
      setLoadingFavorites(true);
      try {
          // Assuming endpoint structure for favorites
          const res = await api.get(`/favorites?type=${favoriteType}`);
          setFavorites(res.data || []);
      } catch (err) {
           // Silently fail if endpoint not ready
      } finally {
          setLoadingFavorites(false);
      }
  };

  const handleLogout = () => {
      logout();
      onClose();
      toast.success(t('user_profile.logout'));
  };

  const isSubmittingRef = React.useRef(false);

  const handleProfileUpdate = async (e) => {
      e.preventDefault();
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setProfileLoading(true);
      
      try {
          const payload = { 
            organization_cr: profileData.organization,
            invitation_code: profileData.inviteCode
          };
          
          await api.put('/auth/profile', payload);
          toast.success(t('user_profile.profile_updated'));
          await refreshUser();
      } catch (err) {
          toast.error(err.response?.data?.error || t('admin.toast.update_fail'));
      } finally {
          setProfileLoading(false);
          isSubmittingRef.current = false;
      }
  };

  const handleVerifyInviteCode = () => {
    if (!profileData.inviteCode) {
        toast.error(t('user_profile.invite_code_required'));
        return;
    }
    
    // Check against global settings (in a real app, verify with backend)
    if (profileData.inviteCode === settings.invite_code) {
        setIsInviteCodeVerified(true);
        toast.success(t('user_profile.invite_code_verified'));
    } else {
        toast.error(t('user_profile.invite_code_invalid'));
        setIsInviteCodeVerified(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          toast.error(t('user_profile.security.password_mismatch'));
          return;
      }
      setPasswordLoading(true);
      try {
          await api.put('/auth/password', { currentPassword, newPassword });
          toast.success(t('user_profile.security.update_success'));
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
      } catch (err) {
          toast.error(err.response?.data?.message || t('user_profile.security.update_fail'));
      } finally {
          setPasswordLoading(false);
      }
  };

  if (!isOpen || !user) return null;

  const typeOptions = [
      { value: 'photos', label: t('nav.gallery'), icon: Image },
      { value: 'music', label: t('nav.music'), icon: Music },
      { value: 'videos', label: t('nav.videos'), icon: Film },
      { value: 'articles', label: t('nav.articles'), icon: FileText },
      { value: 'events', label: t('nav.events'), icon: Calendar },
  ];

  // Map singular type for favorites (if backend uses singular)
  const favoriteTypeOptions = [
      { value: 'photo', label: t('nav.gallery'), icon: Image },
      { value: 'music', label: t('nav.music'), icon: Music },
      { value: 'video', label: t('nav.videos'), icon: Film },
      { value: 'article', label: t('nav.articles'), icon: FileText },
      { value: 'event', label: t('nav.events'), icon: Calendar },
  ];

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[600px] z-10"
        >
          {/* Glass Effect Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-50 pointer-events-none" />
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-20 md:hidden"
          >
            <X size={20} />
          </button>

          <div className="w-full md:w-64 bg-black/20 border-b md:border-b-0 md:border-r border-white/10 p-4 md:p-6 flex flex-col relative z-10 shrink-0">
              <div className="flex items-center gap-4 mb-4 md:mb-8">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg md:text-xl shrink-0">
                      {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                      <h3 className="text-white font-bold truncate text-sm md:text-base">{user?.username}</h3>
                      <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
              </div>

              <nav className="grid grid-cols-2 gap-2 md:flex md:flex-col md:space-y-2 flex-1 mb-4 md:mb-0">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={`w-full text-left px-3 py-2 md:px-4 md:py-3 rounded-xl flex items-center gap-2 md:gap-3 transition-colors text-sm md:text-base ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                      <User size={16} className="md:w-[18px] md:h-[18px]" /> {t('user_profile.tabs.profile')}
                  </button>
                  <button 
                    onClick={() => setActiveTab('uploads')}
                    className={`w-full text-left px-3 py-2 md:px-4 md:py-3 rounded-xl flex items-center gap-2 md:gap-3 transition-colors text-sm md:text-base ${activeTab === 'uploads' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                      <Upload size={16} className="md:w-[18px] md:h-[18px]" /> {t('user_profile.tabs.uploads')}
                  </button>
                  <button 
                    onClick={() => setActiveTab('favorites')}
                    className={`w-full text-left px-3 py-2 md:px-4 md:py-3 rounded-xl flex items-center gap-2 md:gap-3 transition-colors text-sm md:text-base ${activeTab === 'favorites' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                      <Heart size={16} className="md:w-[18px] md:h-[18px]" /> {t('user_profile.tabs.favorites')}
                  </button>
                  <button 
                    onClick={() => setActiveTab('security')}
                    className={`w-full text-left px-3 py-2 md:px-4 md:py-3 rounded-xl flex items-center gap-2 md:gap-3 transition-colors text-sm md:text-base ${activeTab === 'security' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                      <Lock size={16} className="md:w-[18px] md:h-[18px]" /> {t('user_profile.tabs.security')}
                  </button>
              </nav>

              <button 
                onClick={handleLogout}
                className="mt-auto w-full text-left px-3 py-2 md:px-4 md:py-3 rounded-xl flex items-center gap-2 md:gap-3 text-red-400 hover:bg-red-500/10 transition-colors text-sm md:text-base"
              >
                  <LogOut size={16} className="md:w-[18px] md:h-[18px]" /> {t('user_profile.logout')}
              </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar relative z-10 bg-[#1a1a1a]">
              <div className="max-w-2xl mx-auto">
                  {activeTab === 'profile' && (
                      <div className="space-y-6">
                          <h3 className="text-xl font-bold text-white mb-6">{t('user_profile.tabs.profile')}</h3>
                          
                          <form onSubmit={handleProfileUpdate} className="space-y-4">
                              <div className="pt-4">
                                  <label className="block text-sm font-medium text-gray-400 mb-2">{t('user_profile.fields.organization')}</label>
                                  
                                  {/* Invite Code Section - Only show if not verified */}
                                  {!isInviteCodeVerified && (
                                    <div className="mb-4 space-y-2">
                                        <label className="text-xs text-gray-500">{t('user_profile.fields.invite_code_label')}</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={profileData.inviteCode}
                                                onChange={(e) => setProfileData({...profileData, inviteCode: e.target.value})}
                                                placeholder={t('user_profile.fields.invite_code_hint')}
                                                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleVerifyInviteCode}
                                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
                                            >
                                                {t('common.verify')}
                                            </button>
                                        </div>
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                      <input 
                                          type="text" 
                                          value={profileData.organization}
                                          onChange={(e) => setProfileData({...profileData, organization: e.target.value})}
                                          placeholder={t('user_profile.fields.org_placeholder')}
                                          disabled={!isInviteCodeVerified}
                                          className={`w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 ${!isInviteCodeVerified ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      />
                                      <p className="text-xs text-gray-500">{t('user_profile.fields.org_help')}</p>
                                  </div>
                              </div>

                              {isInviteCodeVerified && (
                                <div className="flex justify-end pt-4">
                                    <button 
                                        type="submit"
                                        disabled={profileLoading}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                                    >
                                        {profileLoading ? t('common.saving') : t('common.save')}
                                    </button>
                                </div>
                              )}
                          </form>

                          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mt-8">
                              <div className="grid grid-cols-2 gap-6">
                                  <div>
                                      <p className="text-sm text-gray-400 mb-1">{t('user_profile.profile.username')}</p>
                                      <p className="font-bold text-white text-lg">{user?.username}</p>
                                  </div>
                                  <div>
                                      <p className="text-sm text-gray-400 mb-1">{t('user_profile.profile.role')}</p>
                                      <p className="font-bold text-white text-lg uppercase">{t(`user_profile.roles.${user?.role}`) || user?.role}</p>
                                  </div>
                                  <div>
                                      <p className="text-sm text-gray-400 mb-1">{t('user_profile.profile.joined')}</p>
                                      <p className="font-bold text-white">{new Date(user?.created_at || Date.now()).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                      <p className="text-sm text-gray-400 mb-1">{t('user_profile.profile.id')}</p>
                                      <p className="font-bold text-white font-mono">#{user?.id}</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'uploads' && (
                      <div className="space-y-6">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="text-xl font-bold text-white">{t('user_profile.uploads.title')}</h3>
                              <div className="w-40">
                                <Dropdown
                                    value={uploadType}
                                    onChange={setUploadType}
                                    options={typeOptions}
                                    buttonClassName="bg-black/40 border-white/10 w-full"
                                />
                              </div>
                          </div>

                          {loadingUploads ? (
                              <div className="flex justify-center py-12">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                              </div>
                          ) : uploads.length === 0 ? (
                              <div className="text-center py-12 text-gray-500 bg-black/20 rounded-xl border border-white/5 border-dashed">
                                  <Upload size={48} className="mx-auto mb-4 opacity-20" />
                                  <p>{t('user_profile.uploads.no_uploads')}</p>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 gap-3">
                                  {uploads.map(item => (
                                      <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                                          <div className="w-16 h-16 rounded-lg bg-black/50 overflow-hidden flex-shrink-0">
                                              <img 
                                                src={item.cover || item.thumbnail || item.url || item.image} 
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                              />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <h4 className="font-bold text-white truncate">{item.title}</h4>
                                              <p className="text-xs text-gray-500 truncate">{new Date(item.created_at || Date.now()).toLocaleDateString()}</p>
                                          </div>
                                          <div className="flex-shrink-0">
                                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                  item.status === 'approved' ? 'bg-green-500/20 text-green-400' : 
                                                  item.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                                              }`}>
                                                  {t(`user_profile.uploads.status.${item.status}`) || item.status}
                                              </span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}

                  {activeTab === 'favorites' && (
                      <div className="space-y-6">
                           <div className="flex justify-between items-center mb-4">
                              <h3 className="text-xl font-bold text-white">{t('user_profile.favorites.title')}</h3>
                              <div className="w-40">
                                <Dropdown
                                    value={favoriteType}
                                    onChange={setFavoriteType}
                                    options={favoriteTypeOptions}
                                    buttonClassName="bg-black/40 border-white/10 w-full"
                                />
                              </div>
                          </div>

                          {loadingFavorites ? (
                              <div className="flex justify-center py-12">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                              </div>
                          ) : favorites.length === 0 ? (
                              <div className="text-center py-12 text-gray-500 bg-black/20 rounded-xl border border-white/5 border-dashed">
                                  <Heart size={48} className="mx-auto mb-4 opacity-20" />
                                  <p>{t('user_profile.favorites.no_favorites')}</p>
                              </div>
                          ) : (
                              <div className="grid grid-cols-1 gap-3">
                                  {favorites.map(item => (
                                      <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                                          <div className="w-16 h-16 rounded-lg bg-black/50 overflow-hidden flex-shrink-0">
                                              <img 
                                                src={item.cover || item.thumbnail || item.url || item.image} 
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                              />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <h4 className="font-bold text-white truncate">{item.title}</h4>
                                              <p className="text-xs text-gray-500 truncate">{item.artist || item.category}</p>
                                          </div>
                                          <FavoriteButton 
                                              itemId={item.id}
                                              itemType={favoriteType}
                                              initialFavorited={true}
                                              size={18}
                                              showCount={false}
                                              className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                              onToggle={(favorited) => {
                                                  if (!favorited) {
                                                      setFavorites(prev => prev.filter(f => f.id !== item.id));
                                                  }
                                              }}
                                          />
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}

                  {activeTab === 'security' && (
                      <div className="space-y-6">
                          <h3 className="text-xl font-bold text-white mb-6">{t('user_profile.security.title')}</h3>
                          
                          <form onSubmit={handlePasswordUpdate} className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
                              <h4 className="text-lg font-bold text-white mb-4">{t('user_profile.security.change_password')}</h4>
                              <div>
                                  <label className="block text-sm font-medium text-gray-400 mb-1">{t('user_profile.security.current_password')}</label>
                                  <input 
                                    type="password" 
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                    required
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-400 mb-1">{t('user_profile.security.new_password')}</label>
                                  <input 
                                    type="password" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                    required
                                    minLength={6}
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-400 mb-1">{t('user_profile.security.confirm_password')}</label>
                                  <input 
                                    type="password" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                                    required
                                    minLength={6}
                                  />
                              </div>
                              <button 
                                type="submit" 
                                disabled={passwordLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                              >
                                  {passwordLoading ? t('user_profile.security.updating') : t('user_profile.security.update_btn')}
                              </button>
                          </form>
                      </div>
                  )}
              </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default UserProfileModal;