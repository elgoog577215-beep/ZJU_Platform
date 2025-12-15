import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Inbox, LayoutGrid, Music, Film, BookOpen, 
  Calendar, LayoutTemplate, Folder, HardDrive, ClipboardList, 
  Settings, Users, Lock, Home, LogOut, ChevronRight 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

// Imported Components
import Overview from './Overview';
import PendingReviewManager from './PendingReviewManager';
import SettingsManager from './SettingsManager';
import FileManager from './FileManager';
import UserManager from './UserManager';
import DatabaseManager from './DatabaseManager';
import AuditLogViewer from './AuditLogViewer';
import PageContentEditor from './PageContentEditor';
import ResourceManager from './ResourceManager';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    const token = sessionStorage.getItem('token');
    if (auth === 'true' && token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (password === '12345') {
      try {
        // Authenticate with backend to get access token
        const res = await api.post('/auth/admin-login', { password });
        
        // Store token for API requests
        sessionStorage.setItem('token', res.data.token);
        // Store auth state for UI persistence
        sessionStorage.setItem('admin_auth', 'true');
        
        setIsAuthenticated(true);
        toast.success(t('admin.login.welcome_back'));
      } catch (error) {
        console.error('Login error:', error);
        toast.error(t('admin.login.incorrect'));
      }
    } else {
      toast.error(t('admin.login.incorrect'));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_auth');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    toast.success(t('admin.login.logged_out'));
  };

  const tabs = [
    { id: 'overview', label: t('admin.tabs.overview'), icon: LayoutDashboard },
    { id: 'pending', label: t('admin.tabs.pending'), icon: Inbox },
    { id: 'photos', label: t('admin.tabs.photos'), icon: LayoutGrid },
    { id: 'music', label: t('admin.tabs.music'), icon: Music },
    { id: 'videos', label: t('admin.tabs.videos'), icon: Film },
    { id: 'articles', label: t('admin.tabs.articles'), icon: BookOpen },
    { id: 'events', label: t('admin.tabs.events'), icon: Calendar },
    { id: 'pages', label: t('admin.tabs.pages'), icon: LayoutTemplate },
    { id: 'files', label: t('admin.tabs.files'), icon: Folder },
    { id: 'database', label: t('admin.tabs.database'), icon: HardDrive },
    { id: 'audit', label: t('admin.tabs.audit'), icon: ClipboardList },
    { id: 'settings', label: t('admin.tabs.settings'), icon: Settings },
    { id: 'users', label: t('admin.tabs.users'), icon: Users },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <Overview onChangeTab={setActiveTab} />;
      case 'pending': return <PendingReviewManager />;
      case 'settings': return <SettingsManager />;
      case 'files': return <FileManager />;
      case 'users': return <UserManager />;
      case 'database': return <DatabaseManager />;
      case 'audit': return <AuditLogViewer />;
      case 'pages': return <PageContentEditor />;
      case 'photos': return <ResourceManager key="photos" title={t('admin.tabs.photos')} apiEndpoint="photos" type="image" icon={LayoutGrid} />;
      case 'music': return <ResourceManager key="music" title={t('admin.tabs.music')} apiEndpoint="music" type="audio" icon={Music} />;
      case 'videos': return <ResourceManager key="videos" title={t('admin.tabs.videos')} apiEndpoint="videos" type="video" icon={Film} />;
      case 'articles': return <ResourceManager key="articles" title={t('admin.tabs.articles')} apiEndpoint="articles" type="article" icon={BookOpen} />;
      case 'events': return <ResourceManager key="events" title={t('admin.tabs.events')} apiEndpoint="events" type="event" icon={Calendar} />;
      default: return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{t('admin.login.access')}</h2>
            <p className="text-gray-400 text-sm">{t('admin.login.prompt')}</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('admin.login.placeholder')}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center tracking-widest"
                autoFocus
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              {t('admin.login.unlock')}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <a href="/" className="text-sm text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2">
              <Home size={14} /> {t('admin.login.back')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 md:px-8 pb-12">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold font-serif mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                {t('admin.dashboard')}
            </h1>
            <p className="text-gray-400">{t('admin.subtitle')}</p>
          </div>
          <div className="text-right hidden md:block">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg ml-auto"
              >
                <LogOut size={14} /> {t('admin.logout')}
              </button>
              <p className="text-xs text-gray-600 font-mono mt-2">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-4 space-y-2 sticky top-24 shadow-xl">
              <div className="px-4 py-2 mb-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  {t('admin.menu')}
              </div>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl text-sm font-bold transition-all group
                    ${activeTab === tab.id 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 translate-x-1' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-white hover:translate-x-1'}`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon size={20} className={activeTab === tab.id ? 'text-white' : 'text-gray-500 group-hover:text-white'} />
                    {tab.label}
                  </div>
                  {activeTab === tab.id && <ChevronRight size={16} />}
                </button>
              ))}
              
              <div className="my-2 border-t border-white/10"></div>

              <a
                href="/"
                className="w-full flex items-center justify-between p-3.5 rounded-xl text-sm font-bold transition-all group text-gray-400 hover:bg-white/5 hover:text-white hover:translate-x-1"
              >
                  <div className="flex items-center gap-3">
                    <Home size={20} className="text-gray-500 group-hover:text-white" />
                    {t('nav.home')}
                  </div>
              </a>
            </div>
            
            <div className="mt-6 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-2xl p-6 border border-white/5 text-center">
                <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider mb-2">{t('admin.pro_tip')}</p>
                <p className="text-sm text-gray-400">{t('admin.pro_tip_desc')}</p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;