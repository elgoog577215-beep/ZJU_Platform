import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Database, Download, AlertTriangle, HardDrive } from 'lucide-react';
import api from '../../services/api';

const DatabaseManager = () => {
  const { t } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/stats').then(res => setStats(res.data));
  }, []);

  const handleBackup = async () => {
    setDownloading(true);
    try {
      // Direct download link
      const link = document.createElement('a');
      link.href = `${api.defaults.baseURL}/db/backup`;
      link.setAttribute('download', `backup-${Date.now()}.sqlite`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t('admin.database.toast_start'));
    } catch (error) {
      toast.error(t('admin.database.toast_fail'));
    } finally {
      setDownloading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111] p-6 rounded-2xl border border-white/10">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Database size={20} className="text-indigo-400" />
          {t('admin.database.title')}
        </h3>
        
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-8 flex gap-4 items-start">
            <AlertTriangle className="text-yellow-500 flex-shrink-0" size={24} />
            <div>
                <h4 className="font-bold text-yellow-500 mb-1">{t('admin.database.warning_title')}</h4>
                <p className="text-sm text-yellow-200/70">
                    {t('admin.database.warning_desc')}
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-3 mb-2">
                    <HardDrive size={18} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-400">{t('admin.database.size')}</span>
                </div>
                <div className="text-2xl font-bold text-white">
                    {stats ? formatSize(stats.system.dbSize) : '...'}
                </div>
            </div>
            
            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="flex items-center gap-3 mb-2">
                    <Database size={18} className="text-gray-400" />
                    <span className="text-sm font-bold text-gray-400">{t('admin.database.records')}</span>
                </div>
                <div className="text-2xl font-bold text-white">
                    {stats ? Object.values(stats.counts).reduce((a, b) => a + b, 0) : '...'}
                </div>
            </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
             <div>
                <h4 className="font-bold text-white">{t('admin.database.backup_title')}</h4>
                <p className="text-sm text-gray-400">{t('admin.database.backup_desc')}</p>
             </div>
             <button 
                onClick={handleBackup}
                disabled={downloading}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
             >
                <Download size={18} />
                {downloading ? t('admin.database.preparing') : t('admin.database.download')}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManager;
