import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Inbox, LayoutGrid, Music, Film, BookOpen, 
  Calendar, LayoutTemplate, Folder, HardDrive, ClipboardList, 
  Settings, Users, Home, LogOut, ChevronRight, Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Imported Components
import Overview from './Overview';
import PendingReviewManager from './PendingReviewManager';
import SettingsManager from './SettingsManager';
import UserManager from './UserManager';
import PageContentEditor from './PageContentEditor';
import ResourceManager from './ResourceManager';
import MessageManager from './MessageManager';
import TagManager from './TagManager';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = '/';
  };

  const menuGroups = [
    {
      title: t('admin.menu.overview'),
      items: [
        { id: 'overview', label: t('admin.tabs.overview'), icon: LayoutDashboard },
        { id: 'pending', label: t('admin.tabs.pending'), icon: Inbox },
      ]
    },
    {
      title: t('admin.menu.content'),
      items: [
        { id: 'photos', label: t('admin.tabs.photos'), icon: LayoutGrid },
        { id: 'videos', label: t('admin.tabs.videos'), icon: Film },
        { id: 'music', label: t('admin.tabs.music'), icon: Music },
        { id: 'articles', label: t('admin.tabs.articles'), icon: BookOpen },
        { id: 'events', label: t('admin.tabs.events'), icon: Calendar },
        { id: 'pages', label: t('admin.tabs.pages'), icon: LayoutTemplate },
      ]
    },
    {
      title: t('admin.menu.system'),
      items: [
        { id: 'tags', label: t('admin.tabs.tags'), icon: Tag },
        { id: 'users', label: t('admin.tabs.users'), icon: Users },
        { id: 'messages', label: t('admin.tabs.messages'), icon: Inbox },
        { id: 'settings', label: t('admin.tabs.settings'), icon: Settings },
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <Overview onChangeTab={setActiveTab} />;
      case 'pending': return <PendingReviewManager />;
      case 'messages': return <MessageManager />;
      case 'tags': return <TagManager />;
      case 'settings': return <SettingsManager />;
      case 'users': return <UserManager />;
      case 'pages': return <PageContentEditor />;
      case 'photos': return <ResourceManager key="photos" title={t('admin.tabs.photos')} apiEndpoint="photos" type="image" icon={LayoutGrid} />;
      case 'music': return <ResourceManager key="music" title={t('admin.tabs.music')} apiEndpoint="music" type="audio" icon={Music} />;
      case 'videos': return <ResourceManager key="videos" title={t('admin.tabs.videos')} apiEndpoint="videos" type="video" icon={Film} />;
      case 'articles': return <ResourceManager key="articles" title={t('admin.tabs.articles')} apiEndpoint="articles" type="article" icon={BookOpen} />;
      case 'events': return <ResourceManager key="events" title={t('admin.tabs.events')} apiEndpoint="events" type="event" icon={Calendar} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 md:px-8 pb-12 pb-safe">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 bg-white/10 rounded-lg text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <LayoutGrid size={24} />
            </button>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold font-serif mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                  {t('admin.dashboard')}
              </h1>
              <p className="text-gray-400 text-sm md:text-base">{t('admin.subtitle')}</p>
            </div>
          </div>
          <div className="text-right hidden md:block">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg ml-auto"
              >
                <LogOut size={14} /> {t('admin.logout')}
              </button>
              <p className="text-xs text-gray-600 font-mono mt-2">{new Date().toLocaleDateString('zh-CN')}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className={`w-full lg:w-72 flex-shrink-0 ${isMobileMenuOpen ? '' : 'hidden'} lg:block`}>
            <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-4 space-y-6 sticky top-24 shadow-xl overflow-y-auto max-h-[80vh]">
              {menuGroups.map((group, index) => (
                <div key={index}>
                  <div className="px-4 py-2 mb-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                      {group.title}
                  </div>
                  <div className="space-y-1">
                    {group.items.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setIsMobileMenuOpen(false);
                        }}
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
                  </div>
                </div>
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
