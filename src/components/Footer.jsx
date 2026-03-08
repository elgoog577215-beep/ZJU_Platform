import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-black/40 backdrop-blur-xl text-white pt-12 pb-[calc(3rem+4rem+env(safe-area-inset-bottom))] md:pb-12 px-6 border-t border-white/5 relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tighter">拓途浙享</span>
            <span className="text-white/20">|</span>
            <span className="text-sm text-gray-400 tracking-widest">TUOTUZJU</span>
          </div>
          <p className="text-xs text-gray-500">
            © {currentYear} 浙江大学SQTP项目组. All rights reserved.
          </p>
        </div>

        <a 
          href="https://beian.miit.gov.cn/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-xs tracking-wider text-gray-500 hover:text-gray-300 font-medium"
        >
          浙ICP备2025221213号
        </a>
      </div>
    </footer>
  );
};

export default Footer;
