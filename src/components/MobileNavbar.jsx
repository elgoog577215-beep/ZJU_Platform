import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Image, Music, Film, Grid3X3, X, Calendar, FileText, Info, UserCircle, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useBackClose } from '../hooks/useBackClose';
import { useReducedMotion } from '../utils/animations';

import AuthModal from './AuthModal';

const MobileNavbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [showMenu, setShowMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const { onNavigate } = useBackClose(showMenu, () => setShowMenu(false));
  useBackClose(showAuthModal, () => setShowAuthModal(false));

  const navItems = [
    { key: 'home', path: '/', icon: Home },
    { key: 'events', path: '/events', icon: Calendar },
    { key: 'menu', action: 'menu', icon: Grid3X3 },
    { key: 'about', path: '/about', icon: Info },
  ];

  const menuItems = [
    { key: 'gallery', path: '/gallery', icon: Image },
    { key: 'music', path: '/music', icon: Music },
    { key: 'videos', path: '/videos', icon: Film },
    { key: 'articles', path: '/articles', icon: FileText },
    ...(user ? [{ key: 'profile', path: `/user/${user.id}`, icon: UserCircle }] : [{ key: 'login', action: 'login', icon: LogIn }])
  ];

  const handleAction = (action) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (action === 'menu') {
      setShowMenu(true);
    } else if (action === 'login') {
      setShowAuthModal(true);
    }
  };

  const handleNavClick = () => {
      if (navigator.vibrate) navigator.vibrate(10);
      onNavigate();
      setShowMenu(false);
  };

  return (
    <>
      <nav className="fixed left-3 right-3 bottom-[max(env(safe-area-inset-bottom),12px)] sm:left-4 sm:right-4 z-[100] bg-[#1a1a1a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl md:hidden app-select-none shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            if (item.action) {
               return (
                  <button
                    key={item.key}
                    onClick={() => handleAction(item.action)}
                    className={`relative flex flex-col items-center justify-center w-full h-full transition-colors ${showMenu && item.action === 'menu' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    <motion.div
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div className={`p-1.5 rounded-xl transition-all duration-300 ${showMenu && item.action === 'menu' ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : ''}`}>
                        <Icon size={22} strokeWidth={showMenu && item.action === 'menu' ? 2.5 : 2} />
                      </div>
                      <span className={`text-[10px] font-medium transition-all ${showMenu && item.action === 'menu' ? 'opacity-100 font-semibold' : 'opacity-70'}`}>
                          {item.key === 'menu' ? t('nav.more', '更多') : item.key === 'about' ? t('nav.about', '关于') : t(`nav.${item.key}`, item.key.charAt(0).toUpperCase() + item.key.slice(1))}
                      </span>
                    </motion.div>
                  </button>
               );
            }

            return (
              <Link
                key={item.key}
                to={item.path}
                onClick={handleNavClick}
                className={`relative flex flex-col items-center justify-center w-full h-full transition-colors ${
                  isActive && !showMenu ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <motion.div
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive && !showMenu ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : ''}`}>
                    <Icon size={22} strokeWidth={isActive && !showMenu ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-medium transition-all ${isActive && !showMenu ? 'opacity-100 font-semibold' : 'opacity-70'}`}>
                    {t(`nav.${item.key}`, item.key.charAt(0).toUpperCase() + item.key.slice(1))}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Full Screen Menu Overlay */}
      <AnimatePresence>
        {showMenu && (
            <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: '100%' }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: '100%' }}
                drag={prefersReducedMotion ? false : 'y'}
                dragConstraints={prefersReducedMotion ? undefined : { top: 0 }}
                dragElastic={prefersReducedMotion ? 0 : 0.1}
                onDragEnd={(e, info) => {
                    if (info.offset.y > 100) {
                        setShowMenu(false);
                    }
                }}
                transition={prefersReducedMotion ? undefined : { type: "spring", damping: 30, stiffness: 400 }}
                className="fixed inset-0 z-[100] bg-[#0a0a0a]/80 backdrop-blur-xl md:hidden flex flex-col touch-none"
            >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setShowMenu(false)}>
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),24px)] pb-6 border-b border-white/10 bg-black/20 backdrop-blur-3xl">
                    <h2 className="text-2xl font-bold text-white">{t('nav.more', 'Menu')}</h2>
                    <button 
                        onClick={() => setShowMenu(false)}
                        className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Grid Menu */}
                <div className="flex-1 overflow-y-auto p-6 pb-[max(env(safe-area-inset-bottom),24px)]">
                    <div className="grid grid-cols-2 gap-3">
                        {menuItems.map(item => {
                            if (item.action) {
                                return (
                                    <button
                                        key={item.key}
                                        onClick={() => {
                                            setShowMenu(false);
                                            handleAction(item.action);
                                        }}
                                        className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors h-24 active:scale-95 touch-manipulation"
                                    >
                                        <item.icon size={24} className="text-indigo-400" />
                                        <span className="font-medium text-white text-xs">
                                            {item.key === 'login' ? t('auth.log_in') : 
                                             item.key === 'profile' ? t('user_profile.title') : 
                                             t(`nav.${item.key}`, item.key)}
                                        </span>
                                    </button>
                                );
                            }
                            return (
                                <Link
                                    key={item.key}
                                    to={item.path}
                                    replace
                                    onClick={handleNavClick}
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors h-24 active:scale-95 touch-manipulation"
                                >
                                    <item.icon size={24} className="text-indigo-400" />
                                    <span className="font-medium text-white text-xs">{t(`nav.${item.key}`, item.key.charAt(0).toUpperCase() + item.key.slice(1))}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

export default MobileNavbar;
