import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';

const About = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  return (
    <section className="py-24 px-4 min-h-[80vh] flex items-center">
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
  );
};

export default About;
