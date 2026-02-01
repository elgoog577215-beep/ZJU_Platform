import React from 'react';
import { useTranslation } from 'react-i18next';
import { Github, Twitter, Instagram, Linkedin, Mail, Heart } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const Footer = () => {
  return (
    <footer className="bg-[#0a0a0a] text-white py-8 px-4 border-t border-white/5 relative z-10">
      <div className="max-w-7xl mx-auto flex justify-center items-center">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-xs tracking-wider text-gray-600 uppercase font-medium">
          浙ICP备2025221213号
        </a>
      </div>
    </footer>
  );
};

export default Footer;
