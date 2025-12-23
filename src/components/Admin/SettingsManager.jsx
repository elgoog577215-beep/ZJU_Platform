import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Save, RefreshCw, Key, Globe, Shield, Palette } from 'lucide-react';
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

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setSaving(true);
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.fileUrl) {
        await api.post('/settings', { key: 'logo_url', value: res.data.fileUrl });
        setSettings(prev => ({ ...prev, logo_url: res.data.fileUrl }));
        toast.success(t('admin.toast.save_success'));
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(t('admin.toast.upload_fail') || 'Upload failed');
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

      <div className="bg-[#111] p-6 rounded-2xl border border-white/10">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Palette size={20} className="text-indigo-400" />
          {t('admin.appearance_settings')}
        </h3>
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-400">
                {t('admin.bg_brightness_label')} ({settings.background_brightness || 1.0})
            </label>
            <div className="flex gap-4 items-center">
              <input 
                type="range" 
                min="0.2" 
                max="2.0" 
                step="0.1"
                value={settings.background_brightness || 1.0} 
                onChange={(e) => handleChange('background_brightness', e.target.value)}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <button 
                onClick={() => handleSave('background_brightness', settings.background_brightness)}
                disabled={saving}
                className="px-6 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                {t('admin.save_btn')}
              </button>
            </div>
             <p className="text-xs text-gray-500">{t('admin.bg_brightness_desc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManager;
