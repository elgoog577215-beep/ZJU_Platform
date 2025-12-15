import React from 'react';
import { useTranslation } from 'react-i18next';
import { Github, Twitter, Instagram, Linkedin, Mail, Heart } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const Footer = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  return (
    <footer className="bg-black/80 backdrop-blur-lg text-white py-16 px-4 border-t border-white/10 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Brand */}
        <div className="md:col-span-2">
          <h4 className="text-3xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
            {settings.site_title || "LUMOS"}
          </h4>
          <p className="text-gray-400 text-sm max-w-md leading-relaxed mb-6">
            {t('footer.description')}
          </p>
          <div className="flex gap-4">
            {[
              { icon: Twitter, href: settings.social_twitter || '#' },
              { icon: Instagram, href: settings.social_instagram || '#' },
              { icon: Github, href: settings.social_github || '#' },
              { icon: Linkedin, href: settings.social_linkedin || '#' }
            ].map((social, index) => (
              <a 
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white/5 rounded-full hover:bg-white/20 transition-all hover:scale-110"
              >
                <social.icon size={18} />
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h5 className="font-bold mb-6 text-lg">{t('footer.explore')}</h5>
          <ul className="space-y-3">
            {[
              { label: t('nav.gallery'), href: '/gallery' },
              { label: t('nav.music'), href: '/music' },
              { label: t('nav.videos'), href: '/videos' },
              { label: t('nav.articles'), href: '/articles' },
              { label: t('nav.events'), href: '/events' }
            ].map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-gray-400 hover:text-white hover:translate-x-1 transition-all inline-block">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Newsletter / Contact */}
        <div>
          <h5 className="font-bold mb-6 text-lg">{t('footer.connect_title')}</h5>
          <p className="text-gray-400 text-sm mb-4">
            {t('footer.connect_text')}
          </p>
          <a 
            href="/contact" 
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors"
          >
            <Mail size={18} />
            {t('footer.get_in_touch')}
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
        <p>{t('footer.rights')}</p>
        <p className="flex items-center gap-1">
          {t('footer.made_with')} <Heart size={12} className="text-red-500 fill-red-500" /> {t('footer.by_trae')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
