import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle, AlertCircle, Mail, MapPin, Phone, Github, Twitter, Instagram, Linkedin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';

const Contact = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error
  const { t } = useTranslation();
  const { settings } = useSettings();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formState.name || !formState.email || !formState.message) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setStatus('submitting');
    
    // Simulate API call
    setTimeout(() => {
      setStatus('success');
      setFormState({ name: '', email: '', message: '' });
      setTimeout(() => setStatus('idle'), 3000);
    }, 1500);
  };

  const handleChange = (e) => {
    setFormState(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <section className="py-24 px-4 min-h-screen flex items-center justify-center relative overflow-hidden">
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
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</div>
                <div className="text-lg font-medium">{settings.contact_email || 'hello@lumos.studio'}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-gray-300 group cursor-pointer">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                <MapPin size={24} className="text-pink-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Studio</div>
                <div className="text-lg font-medium">{settings.contact_address || '123 Creative Ave, New York, NY'}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-gray-300 group cursor-pointer">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                <Phone size={24} className="text-cyan-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Phone</div>
                <div className="text-lg font-medium">{settings.contact_phone || '+1 (555) 123-4567'}</div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10">
             <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">Follow Us</div>
             <div className="flex gap-4">
                {settings.social_github && (
                  <a href={settings.social_github} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-white hover:text-black transition-all hover:-translate-y-1">
                    <Github size={20} />
                  </a>
                )}
                {settings.social_twitter && (
                  <a href={settings.social_twitter} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-white hover:text-black transition-all hover:-translate-y-1">
                    <Twitter size={20} />
                  </a>
                )}
                {settings.social_instagram && (
                  <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-white hover:text-black transition-all hover:-translate-y-1">
                    <Instagram size={20} />
                  </a>
                )}
                {settings.social_linkedin && (
                  <a href={settings.social_linkedin} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-white hover:text-black transition-all hover:-translate-y-1">
                    <Linkedin size={20} />
                  </a>
                )}
             </div>
          </div>
        </motion.div>

        {/* Right: Form */}
        <motion.div
           initial={{ opacity: 0, x: 50 }}
           whileInView={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8 }}
           viewport={{ once: true }}
           className="bg-[#111] border border-white/10 rounded-3xl p-8 md:p-10 relative overflow-hidden group"
        >
          {/* Shine Effect on Form Card */}
          <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <h3 className="text-2xl font-bold text-white mb-6">Send a Message</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">{t('contact.name')}</label>
                <input 
                  type="text" 
                  name="name"
                  value={formState.name}
                  onChange={handleChange}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/5 transition-all" 
                  placeholder="John Doe" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">{t('contact.email')}</label>
                <input 
                  type="email" 
                  name="email"
                  value={formState.email}
                  onChange={handleChange}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/5 transition-all" 
                  placeholder="john@example.com" 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400 ml-1">{t('contact.message')}</label>
              <textarea 
                name="message"
                rows="5" 
                value={formState.message}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/5 transition-all resize-none" 
                placeholder="Tell us about your project..."
              ></textarea>
            </div>

            <div className="pt-4">
               <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={status === 'submitting' || status === 'success'}
                className={`w-full font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg
                  ${status === 'success' ? 'bg-green-500 text-white shadow-green-500/25' : 
                    status === 'error' ? 'bg-red-500 text-white shadow-red-500/25' : 
                    'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-indigo-500/25'}`}
              >
                {status === 'submitting' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('contact.sending')}
                  </span>
                ) : status === 'success' ? (
                  <>{t('contact.sent')} <CheckCircle className="w-5 h-5" /></>
                ) : status === 'error' ? (
                  <>{t('contact.error')} <AlertCircle className="w-5 h-5" /></>
                ) : (
                  <>{t('contact.send')} <Send className="w-5 h-5" /></>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;
