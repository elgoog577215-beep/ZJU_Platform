import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Save, RefreshCw, Key, Globe, Shield } from 'lucide-react';
import api from '../../services/api';

const SettingsManager = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      toast.error(t('admin.toast.load_fail'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key, value) => {
    setSaving(true);
    try {
      await api.post('/settings', { key, value });
      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success(t('admin.toast.save_success'));
    } catch (error) {
      toast.error(t('admin.toast.save_fail'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="p-8 text-center text-gray-500">{t('admin.loading_settings')}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-[#111] p-6 rounded-2xl border border-white/10">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Key size={20} className="text-indigo-400" />
          {t('admin.security_settings')}
        </h3>
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-400">{t('admin.invite_code_label')}</label>
            <div className="flex gap-4">
              <input 
                type="text" 
                value={settings.invite_code || ''} 
                onChange={(e) => handleChange('invite_code', e.target.value)}
                placeholder={t('admin.enter_invite_code')}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
              />
              <button 
                onClick={() => handleSave('invite_code', settings.invite_code)}
                disabled={saving}
                className="px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {t('admin.save_btn')}
              </button>
            </div>
            <p className="text-xs text-gray-500">{t('admin.invite_code_desc')}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#111] p-6 rounded-2xl border border-white/10">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Globe size={20} className="text-indigo-400" />
          {t('admin.general_settings')}
        </h3>
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-400">{t('admin.site_name_label')}</label>
            <div className="flex gap-4">
              <input 
                type="text" 
                value={settings.site_name || '777'} 
                onChange={(e) => handleChange('site_name', e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
              />
              <button 
                onClick={() => handleSave('site_name', settings.site_name)}
                disabled={saving}
                className="px-6 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {t('admin.save_btn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
