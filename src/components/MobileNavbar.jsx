import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Image, Music, Film, Compass, X, Calendar, FileText, Info, User, Users, UserCircle, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useBackClose } from '../hooks/useBackClose';

import AuthModal from './AuthModal';

const MobileNavbar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const { onNavigate } = useBackClose(showMenu, () => setShowMenu(false));
  useBackClose(showAuthModal, () => setShowAuthModal(false));

  const navItems = [
    { key: 'home', path: '/', icon: Home },
    { key: 'events', path: '/events', icon: Calendar },
    { key: 'menu', action: 'menu', icon: Compass }, // Replaced Users with Menu icon for clarity
    { key: 'about', path: '/about', icon: Info },
  ];

  const menuItems = [
    { key: 'gallery', path: '/gallery', icon: Image },
    { key: 'music', path: '/music', icon: Music },
    { key: 'videos', path: '/videos', icon: Film },
    { key: 'articles', path: '/articles', icon: FileText },
  ];

  const handleAction = (action) => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (action === 'menu') {
      setShowMenu(true);
    } else if (action === 'login') {
      setShowAuthModal(true);
    } else if (action === 'profile') {
      // Logic to open profile modal, might need to lift state or use context
      // For now, let's just use a simple way or assume we can trigger it.
      // But wait, Navbar has the state. We might need to expose it or use a global UI context.
      // Or simply duplicate the modal here? Ideally context.
      // Given constraints, I'll emit a custom event like the search palette does.
      window.dispatchEvent(new Event('open-profile-modal'));
    }
  };

  const handleNavClick = () => {
      if (navigator.vibrate) navigator.vibrate(10);
      onNavigate();
      setShowMenu(false);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[90] bg-black/90 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden app-select-none">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            if (item.action) {
               return (
                  <button
                    key={item.key}
                    onClick={() => handleAction(item.action)}
                    className={`flex flex-col items-center justify-center w-full h-full transition-colors ${showMenu && item.action === 'menu' ? 'text-indigo-400' : 'text-gray-400 hover:text-white'}`}
                  >
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <Icon size={20} />
                      <span className="text-[10px] font-medium">
                          {item.key === 'menu' ? '社区' : item.key === 'about' ? '关于' : t(`nav.${item.key}`, item.key.charAt(0).toUpperCase() + item.key.slice(1))}
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
                className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                  isActive && !showMenu ? 'text-indigo-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex flex-col items-center gap-1"
                >
                  <Icon size={20} strokeWidth={isActive && !showMenu ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">{t(`nav.${item.key}`, item.key.charAt(0).toUpperCase() + item.key.slice(1))}</span>
                  {isActive && !showMenu && (
                      <motion.div 
                          layoutId="activeTab"
                          className="absolute bottom-1 w-1 h-1 bg-indigo-400 rounded-full"
                      />
                  )}
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
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.1}
                onDragEnd={(e, info) => {
                    if (info.offset.y > 100) {
                        setShowMenu(false);
                    }
                }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[100] bg-[#0a0a0a] md:hidden flex flex-col touch-none"
            >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setShowMenu(false)}>
                    <div className="w-12 h-1.5 bg-white/20 rounded-full" />
                </div>
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/50 backdrop-blur-md">
                    <h2 className="text-2xl font-bold text-white">{t('nav.more', 'Menu')}</h2>
                    <button 
                        onClick={() => setShowMenu(false)}
                        className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Grid Menu */}
                <div className="flex-1 overflow-y-auto p-6">
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
