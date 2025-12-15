import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  LayoutGrid, Music, Film, BookOpen, Calendar, 
  Users, HardDrive, Activity, Clock
} from 'lucide-react';
import api from '../../services/api';

const StatCard = ({ title, value, icon: Icon, color, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-[#111] p-6 rounded-2xl border border-white/10 text-left hover:border-indigo-500/50 hover:bg-[#161616] transition-all group relative overflow-hidden"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
    
    <div className="relative z-10">
      <div className={`w-12 h-12 rounded-xl bg-${color}-500/20 flex items-center justify-center text-${color}-400 mb-4 group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
      <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
      <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</p>
    </div>
  </button>
);

const Overview = ({ onChangeTab }) => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    counts: { photos: 0, music: 0, videos: 0, articles: 0, events: 0 },
    system: { uptime: 0, nodeVersion: '', platform: '' }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t('admin.overview_ui.loading_stats')}</div>;

  return (
    <div className="space-y-8">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard 
          title={t('admin.tabs.photos')} 
          value={stats.counts.photos} 
          icon={LayoutGrid} 
          color="indigo"
          onClick={() => onChangeTab('photos')}
        />
        <StatCard 
          title={t('admin.tabs.music')} 
          value={stats.counts.music} 
          icon={Music} 
          color="pink"
          onClick={() => onChangeTab('music')}
        />
        <StatCard 
          title={t('admin.tabs.videos')} 
          value={stats.counts.videos} 
          icon={Film} 
          color="red"
          onClick={() => onChangeTab('videos')}
        />
        <StatCard 
          title={t('admin.tabs.articles')} 
          value={stats.counts.articles} 
          icon={BookOpen} 
          color="yellow"
          onClick={() => onChangeTab('articles')}
        />
        <StatCard 
          title={t('admin.tabs.events')} 
          value={stats.counts.events} 
          icon={Calendar} 
          color="green"
          onClick={() => onChangeTab('events')}
        />
      </div>

      {/* System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#111] p-6 rounded-2xl border border-white/10">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity size={20} className="text-indigo-400" />
            {t('admin.overview_ui.system_status')}
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
              <span className="text-gray-400">{t('admin.overview_ui.node_version')}</span>
              <span className="font-mono text-white">{stats.system.nodeVersion}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
              <span className="text-gray-400">{t('admin.overview_ui.platform')}</span>
              <span className="font-mono text-white capitalize">{stats.system.platform}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-xl">
              <span className="text-gray-400">{t('admin.overview_ui.uptime')}</span>
              <div className="flex items-center gap-2 text-green-400 font-mono">
                <Clock size={14} />
                {formatUptime(stats.system.uptime)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-2xl border border-white/10 flex flex-col justify-center text-center">
            <h3 className="text-2xl font-bold text-white mb-2">{t('admin.overview_ui.welcome_back')}</h3>
            <p className="text-gray-400 mb-6">{t('admin.overview_ui.control_text')}</p>
            <button 
                onClick={() => onChangeTab('pending')}
                className="mx-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20"
            >
                {t('admin.overview_ui.check_pending')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Overview;
