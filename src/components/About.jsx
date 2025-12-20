import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { Send, CheckCircle, AlertCircle, Mail, MapPin, Phone, Github, Twitter, Instagram, Linkedin } from 'lucide-react';
import api from '../services/api';

const About = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  
  // Contact Form State
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.name || !formState.email || !formState.message) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setStatus('submitting');
    
    try {
      await api.post('/contact', formState);
      setStatus('success');
      setFormState({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Failed to send message:', error);
      setStatus('error');
    } finally {
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleChange = (e) => {
    setFormState(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen">
      {/* About Section */}
      <section className="pt-36 pb-24 md:py-24 px-4 flex items-center">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute -inset-4 border-2 border-white/20 rounded-lg translate-x-4 translate-y-4" />
            <img 
              src={settings.about_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80"} 
              alt="Photographer" 
              className="relative z-10 rounded-lg shadow-2xl grayscale hover:grayscale-0 transition-all duration-500"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold font-serif mb-8 leading-tight">
              {settings.about_title || t('about.title')} <br />
              <span className="text-gray-500">{settings.about_subtitle || t('about.subtitle')}</span>
            </h2>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              {settings.about_p1 || t('about.p1')}
            </p>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              {settings.about_p2 || t('about.p2')}
            </p>
            
            <div className="flex gap-8">
              <div>
                <span className="block text-3xl font-bold font-serif">{settings.about_exp_count || "10+"}</span>
                <span className="text-sm text-gray-500">{t('about.exp')}</span>
              </div>
              <div>
                <span className="block text-3xl font-bold font-serif">{settings.about_exhibitions_count || "50+"}</span>
                <span className="text-sm text-gray-500">{t('about.exhibitions')}</span>
              </div>
              <div>
                <span className="block text-3xl font-bold font-serif">{settings.about_projects_count || "200+"}</span>
                <span className="text-sm text-gray-500">{t('about.projects')}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 px-4 relative overflow-hidden bg-white/5">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-6xl w-full mx-auto relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
          
          {/* Left: Info & Socials */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div>
              <h2 className="text-5xl md:text-7xl font-bold font-serif mb-6 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent leading-tight">
                {t('contact.title')}
              </h2>
              <p className="text-xl text-gray-400 max-w-md leading-relaxed">
                {t('contact.subtitle')}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 text-gray-300 group cursor-pointer">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                  <Mail size={24} className="text-indigo-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('contact.email_label')}</div>
                  <div className="text-lg font-medium">{settings.contact_email || 'hello@lumos.studio'}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-gray-300 group cursor-pointer">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                  <MapPin size={24} className="text-pink-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('contact.studio_label')}</div>
                  <div className="text-lg font-medium">{settings.contact_address || '123 Creative Ave, New York, NY'}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-gray-300 group cursor-pointer">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                  <Phone size={24} className="text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('contact.phone_label')}</div>
                  <div className="text-lg font-medium">{settings.contact_phone || '+1 (555) 123-4567'}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
               {[Github, Twitter, Instagram, Linkedin].map((Icon, i) => (
                 <a key={i} href="#" className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white hover:text-black transition-all">
                   <Icon size={20} />
                 </a>
               ))}
            </div>
          </motion.div>

          {/* Right: Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">{t('contact.name')}</label>
                <input 
                  type="text" 
                  name="name"
                  value={formState.name}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
                  placeholder={t('contact.name')}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">{t('contact.email')}</label>
                <input 
                  type="email" 
                  name="email"
                  value={formState.email}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600"
                  placeholder={t('contact.email')}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">{t('contact.message')}</label>
                <textarea 
                  name="message"
                  value={formState.message}
                  onChange={handleChange}
                  rows="4"
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600 resize-none"
                  placeholder={t('contact.message')}
                />
              </div>

              <button 
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {status === 'submitting' ? (
                  <span className="animate-pulse">{t('contact.sending')}</span>
                ) : status === 'success' ? (
                  <>
                    <CheckCircle size={20} className="text-green-600" />
                    <span>{t('contact.sent')}</span>
                  </>
                ) : status === 'error' ? (
                  <>
                    <AlertCircle size={20} className="text-red-600" />
                    <span>{t('contact.error')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('contact.send')}</span>
                    <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
