import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';

const Hero = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const { t } = useTranslation();
  const { settings } = useSettings();

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden flex items-center justify-center">
      {/* Background Image with Parallax */}
      <motion.div 
        style={{ y }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black z-10" />
        <img 
          src={settings.hero_bg_url || "/uploads/1767349451839-56405188.jpg"} 
          srcSet={`${settings.hero_bg_url || "/uploads/1767349451839-56405188.jpg"} 800w, ${settings.hero_bg_url || "/uploads/1767349451839-56405188.jpg"} 1600w`}
          sizes="(max-width: 768px) 800px, 1600px"
          alt="Hero Background" 
          className="w-full h-full object-cover"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
      </motion.div>

      {/* Content */}
      <motion.div 
        style={{ opacity }}
        className="relative z-20 text-center px-4"
      >
        <div className="md:bg-transparent bg-black/20 rounded-3xl p-6 md:p-0 border border-white/5 md:border-none">
        <motion.h1 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl md:text-7xl lg:text-9xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-white/70 tracking-tighter mb-4 md:mb-6 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] animate-text-gradient"
        >
          {settings.hero_title || "浙江大学信息聚合平台"}
        </motion.h1>
        <motion.p 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-2xl text-gray-200 font-light tracking-wide max-w-2xl mx-auto px-4"
        >
          {settings.hero_subtitle || "打破信息差，共建信息网络"}
        </motion.p>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div 
        style={{ opacity }}
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 text-white/50 hover:text-white transition-colors cursor-pointer"
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
      >
        <div className="p-2 rounded-full border border-white/10 backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">
             <ArrowDown className="w-6 h-6" />
        </div>
      </motion.div>
    </div>
  );
};

export default Hero;
