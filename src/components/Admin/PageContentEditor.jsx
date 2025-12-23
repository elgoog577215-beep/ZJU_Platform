import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { LayoutTemplate, Save, Globe, FileText, Image, Mail, Upload } from 'lucide-react';
import api from '../../services/api';

const PageContentEditor = () => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('home');
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

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const loadingToast = toast.loading(t('common.uploading'));

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.fileUrl) {
        handleChange(key, res.data.fileUrl);
        toast.success(t('upload.upload_success'), { id: loadingToast });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(t('upload.upload_failed'), { id: loadingToast });
    }
  };

  const handleSave = async (section) => {
    setSaving(true);
    try {
      // Save all settings in current section
      const keysToSave = Object.keys(settings).filter(key => {
        if (activeSection === 'home') return key.startsWith('hero_') || key.startsWith('site_');
        if (activeSection === 'about') return key.startsWith('about_') || key.startsWith('profile_');
        if (activeSection === 'contact') return key.startsWith('contact_') || key.startsWith('social_');
        return false;
      });

      // Save sequentially to avoid race conditions with simple backend
      for (const key of keysToSave) {
          await api.post('/settings', { key, value: settings[key] });
      }
      
      toast.success(t('admin.toast.save_success'));
    } catch (error) {
      toast.error(t('admin.toast.save_fail'));
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'home', label: t('nav.home'), icon: Globe },
    { id: 'about', label: t('nav.about'), icon: FileText },
    { id: 'contact', label: t('nav.contact'), icon: Mail },
  ];

  if (loading) return <div className="p-8 text-center text-gray-500">{t('admin.audit_logs.loading')}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-[#111] p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
            <LayoutTemplate size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">{t('admin.editor.title')}</h2>
        </div>
        
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
            {sections.map(section => (
                <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                        activeSection === section.id 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <section.icon size={14} />
                    {section.label}
                </button>
            ))}
        </div>
      </div>

      <div className="bg-[#111] p-6 rounded-2xl border border-white/10">
        <div className="space-y-6 max-w-3xl">
            {activeSection === 'home' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.site_title')}</label>
                            <input 
                                type="text"
                                value={settings.site_title || ''}
                                onChange={(e) => handleChange('site_title', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.favicon_url')}</label>
                            <input 
                                type="text"
                                value={settings.favicon_url || ''}
                                onChange={(e) => handleChange('favicon_url', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.hero_title')}</label>
                        <input 
                            type="text"
                            value={settings.hero_title || ''}
                            onChange={(e) => handleChange('hero_title', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.hero_subtitle')}</label>
                        <input 
                            type="text"
                            value={settings.hero_subtitle || ''}
                            onChange={(e) => handleChange('hero_subtitle', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.hero_bg_url')}</label>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={settings.hero_bg_url || ''}
                                onChange={(e) => handleChange('hero_bg_url', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                            <label className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl cursor-pointer transition-colors whitespace-nowrap">
                                <Upload size={20} />
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'hero_bg_url')}
                                />
                            </label>
                        </div>
                        {settings.hero_bg_url && (
                            <img src={settings.hero_bg_url} alt={t('admin.fields.preview')} className="mt-4 h-32 w-full object-cover rounded-xl border border-white/10" />
                        )}
                    </div>
                </>
            )}

            {activeSection === 'about' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.about_title')}</label>
                            <input 
                                type="text"
                                value={settings.about_title || ''}
                                onChange={(e) => handleChange('about_title', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.about_subtitle')}</label>
                            <input 
                                type="text"
                                value={settings.about_subtitle || ''}
                                onChange={(e) => handleChange('about_subtitle', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.profile_image_url')}</label>
                         <input 
                            type="text"
                            value={settings.profile_image_url || ''}
                            onChange={(e) => handleChange('profile_image_url', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                        />
                        {settings.profile_image_url && (
                            <img src={settings.profile_image_url} alt={t('admin.fields.preview')} className="mt-4 w-32 h-32 object-cover rounded-full border border-white/10" />
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.intro_p')}</label>
                        <textarea 
                            value={settings.about_intro || ''}
                            onChange={(e) => handleChange('about_intro', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 h-24"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.detail_p')}</label>
                        <textarea 
                            value={settings.about_detail || ''}
                            onChange={(e) => handleChange('about_detail', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 h-32"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                         <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.exp_years')}</label>
                            <input 
                                type="text"
                                value={settings.about_exp_years || ''}
                                onChange={(e) => handleChange('about_exp_years', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.exhibitions')}</label>
                            <input 
                                type="text"
                                value={settings.about_exhibitions || ''}
                                onChange={(e) => handleChange('about_exhibitions', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.projects')}</label>
                            <input 
                                type="text"
                                value={settings.about_projects || ''}
                                onChange={(e) => handleChange('about_projects', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </>
            )}

            {activeSection === 'contact' && (
                <>
                     <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.contact_email')}</label>
                        <input 
                            type="text"
                            value={settings.contact_email || ''}
                            onChange={(e) => handleChange('contact_email', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.contact_phone')}</label>
                        <input 
                            type="text"
                            value={settings.contact_phone || ''}
                            onChange={(e) => handleChange('contact_phone', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.address')}</label>
                        <input 
                            type="text"
                            value={settings.contact_address || ''}
                            onChange={(e) => handleChange('contact_address', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="pt-4 border-t border-white/10">
                        <h4 className="text-white font-bold mb-4">{t('admin.editor.social_links')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.github_url')}</label>
                                <input 
                                    type="text"
                                    value={settings.social_github || ''}
                                    onChange={(e) => handleChange('social_github', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.twitter_url')}</label>
                                <input 
                                    type="text"
                                    value={settings.social_twitter || ''}
                                    onChange={(e) => handleChange('social_twitter', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.instagram_url')}</label>
                                <input 
                                    type="text"
                                    value={settings.social_instagram || ''}
                                    onChange={(e) => handleChange('social_instagram', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-400 mb-2">{t('admin.editor.linkedin_url')}</label>
                                <input 
                                    type="text"
                                    value={settings.social_linkedin || ''}
                                    onChange={(e) => handleChange('social_linkedin', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="flex justify-end pt-6 border-t border-white/10">
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                    <Save size={18} />
                    {saving ? t('admin.file_manager_ui.saving') : t('admin.editor.save_changes')}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PageContentEditor;
