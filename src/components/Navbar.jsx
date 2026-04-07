import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cloud, Clock, CloudRain, Sun, CloudLightning, CloudSnow, CloudFog, Search, LogOut, Palette, X, MapPin, Plus, Filter, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useBackClose } from '../hooks/useBackClose';
import { useWeather } from '../hooks/useWeather';
import { useReducedMotion } from '../utils/animations';
import AuthModal from './AuthModal';
import { themeConfig } from '../data/themeConfig';
import NotificationCenter from './NotificationCenter';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';

const Portal = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

const Navbar = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [mobileToolbarState, setMobileToolbarState] = useState({ filterCount: 0, sortLabel: '' });
  const location = useLocation();
  const { t } = useTranslation();
  const { backgroundScene, changeBackgroundScene, uiMode, changeUiMode } = useSettings();
  const { user, logout, isAdmin } = useAuth();
  const [time, setTime] = useState(new Date());
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === 'day';

  const {
    weather,
    city,
    isWeatherModalOpen,
    setIsWeatherModalOpen,
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    handleCitySearch,
    selectCity
  } = useWeather();

  useBackClose(isWeatherModalOpen, () => setIsWeatherModalOpen(false));
  useBackClose(isThemeOpen, () => setIsThemeOpen(false));

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getWeatherIcon = (code) => {
      if (code === 0 || code === 1) return <Sun size={14} className="text-yellow-400" />;
      if (code === 2 || code === 3) return <Cloud size={14} className="text-gray-400" />;
      if (code >= 45 && code <= 48) return <CloudFog size={14} className="text-gray-400" />;
      if (code >= 51 && code <= 67) return <CloudRain size={14} className="text-blue-400" />;
      if (code >= 71 && code <= 77) return <CloudSnow size={14} className="text-white" />;
      if (code >= 80 && code <= 82) return <CloudRain size={14} className="text-blue-500" />;
      if (code >= 95 && code <= 99) return <CloudLightning size={14} className="text-yellow-500" />;
      return <Cloud size={14} />;
  };

  const navLinks = [
    { key: 'home', path: '/' },
    { key: 'events', path: '/events' },
    { key: 'community', path: '/community' },
    { key: 'gallery', path: '/gallery' },
    { key: 'music', path: '/music' },
    { key: 'videos', path: '/videos' },
    { key: 'articles', path: '/articles' },
    { key: 'about', path: '/about' },
    ...(isAdmin ? [{ key: 'admin', path: '/admin' }] : [])
  ];
  const isNavItemActive = (path) => {
    if (path === '/community') return location.pathname.startsWith('/community');
    return location.pathname === path;
  };
  const currentNavLink = navLinks.find((link) => isNavItemActive(link.path));

  // Map route to specific upload type, and dispatch custom event
  const handleUploadClick = () => {
    if (!user) {
        toast.error(t('auth.signin_required'));
        setIsAuthOpen(true);
        return;
    }
    
    let type = '';
    if (location.pathname === '/events') type = 'event';
    else if (location.pathname === '/gallery') type = 'image';
    else if (location.pathname === '/music') type = 'audio';
    else if (location.pathname === '/videos') type = 'video';
    else if (location.pathname === '/articles') type = 'article';
    
    if (type) {
        window.dispatchEvent(new CustomEvent('open-upload-modal', { detail: { type } }));
    }
  };

  const uploadablePaths = ['/events', '/gallery', '/music', '/videos', '/articles'];
  const showUploadButton = uploadablePaths.includes(location.pathname);

  useEffect(() => {
    const handleToolbarState = (event) => {
      setMobileToolbarState({
        filterCount: event.detail?.filterCount || 0,
        sortLabel: event.detail?.sortLabel || ''
      });
    };

    window.addEventListener('set-mobile-toolbar-state', handleToolbarState);
    return () => window.removeEventListener('set-mobile-toolbar-state', handleToolbarState);
  }, []);

  useEffect(() => {
    setMobileToolbarState({ filterCount: 0, sortLabel: '' });
  }, [location.pathname]);

  const shellClasses = isDayMode
    ? 'bg-white/70 border-slate-200/70 shadow-[0_10px_30px_rgba(148,163,184,0.18)]'
    : 'bg-black/20 border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.12)]';
  const desktopPillClasses = isDayMode
    ? 'bg-white/55 border-slate-200/70 shadow-[0_6px_22px_rgba(148,163,184,0.14)]'
    : 'bg-white/5 border-white/5';
  const navLinkClasses = isDayMode
    ? 'px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-all relative group rounded-full hover:bg-slate-200/70'
    : 'px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-all relative group rounded-full hover:bg-white/10';
  const navIndicatorClasses = isDayMode
    ? 'absolute inset-0 rounded-full border border-indigo-200/90 bg-white/90 shadow-[0_10px_24px_rgba(99,102,241,0.14)]'
    : 'absolute inset-0 bg-white/10 rounded-full border border-white/10';
  const weatherButtonClasses = isDayMode
    ? 'flex items-center gap-3 text-xs text-slate-500 border border-slate-200/80 px-3 py-1.5 rounded-full bg-white/70 hover:bg-white hover:text-slate-900 hover:border-indigo-200 transition-all cursor-pointer active:scale-95 group shadow-[0_8px_20px_rgba(148,163,184,0.12)]'
    : 'flex items-center gap-3 text-xs text-gray-400 border border-white/5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 hover:text-white hover:border-indigo-500/20 transition-all cursor-pointer active:scale-95 group';
  const authButtonClasses = isDayMode
    ? 'text-sm font-medium bg-white/92 text-slate-800 border border-slate-200/80 px-4 py-1.5 rounded-full transition-all hover:bg-white hover:text-indigo-600 hover:border-indigo-200/80 active:scale-95 shadow-[0_10px_24px_rgba(148,163,184,0.16)]'
    : 'text-sm font-medium bg-white text-black px-4 py-1.5 rounded-full transition-all hover:bg-gray-200 active:scale-95';
  const themeModalClasses = isDayMode
    ? 'bg-white/92 backdrop-blur-xl border border-slate-200/80 text-slate-900'
    : 'bg-[#0f172a]/92 backdrop-blur-lg border border-white/10';
  const themeModalHeaderClasses = isDayMode
    ? 'text-slate-700 bg-white/90 border border-slate-200/70'
    : 'text-white/80 bg-[#0f172a]/95';
  const weatherModalClasses = isDayMode
    ? 'bg-white/94 border border-slate-200/80 shadow-[0_18px_44px_rgba(148,163,184,0.2)]'
    : 'bg-[#1a1a1a] border border-white/10 shadow-2xl';

  return (
    <motion.nav
      initial={prefersReducedMotion ? false : { y: -32, opacity: 0 }}
      animate={prefersReducedMotion ? undefined : { y: 0, opacity: 1 }}
      transition={prefersReducedMotion ? undefined : { duration: 0.28, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-3 backdrop-blur-lg border-b ${shellClasses}`}
      role="navigation"
      aria-label="主导航"
    >
      <Link to="/" className="hidden md:flex items-center gap-3 text-white group z-50" aria-label="拓途浙享首页">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/35 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
          <img src="/newlogo.png" alt="拓途浙享 Logo" className="relative h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className={`text-lg font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r transition-all duration-300 ${isDayMode ? 'from-slate-900 to-slate-500 group-hover:to-indigo-500' : 'from-white to-white/70 group-hover:to-indigo-300'}`}>拓途浙享</span>
          <span className={`text-[10px] font-medium tracking-widest mt-0.5 transition-colors ${isDayMode ? 'text-slate-500 group-hover:text-indigo-500' : 'text-gray-400 group-hover:text-indigo-400'}`}>数字艺术与科技</span>
        </div>
      </Link>
      
      <div className={`hidden md:flex items-center gap-1 px-2 py-1 rounded-full border backdrop-blur-sm ${desktopPillClasses}`} role="menubar" aria-label="导航菜单">
        {navLinks.map((item) => (
          <Link 
            key={item.key} 
            to={item.path} 
            className={`${navLinkClasses}${
              item.key === 'community' && isNavItemActive(item.path)
                ? isDayMode
                  ? ' !text-blue-700'
                  : ' !text-blue-400'
                : ''
            }`}
            role="menuitem"
            aria-current={isNavItemActive(item.path) ? 'page' : undefined}
          >
            <span className="relative z-10">{t(`nav.${item.key}`)}</span>
            {isNavItemActive(item.path) && (
              prefersReducedMotion ? (
                <div className={navIndicatorClasses} />
              ) : (
                <motion.div
                  layoutId="navbar-indicator"
                  className={navIndicatorClasses}
                  transition={{ type: 'spring', bounce: 0.08, duration: 0.3 }}
                />
              )
            )}
          </Link>
        ))}
        
        <div className={`w-px h-5 mx-2 ${isDayMode ? 'bg-slate-200/80' : 'bg-white/10'}`} role="separator" />
        
        <button 
          onClick={() => window.dispatchEvent(new Event('open-search-palette'))}
          className="btn-icon"
          title={t('nav.search_title')}
          aria-label={t('nav.search_title', '搜索')}
        >
          <Search size={18} aria-hidden="true" />
        </button>

        <button 
            onClick={() => setIsWeatherModalOpen(true)}
            className={weatherButtonClasses}
            aria-label={`天气信息：${city}，${weather ? `${Math.round(weather.temperature)}°C` : '加载中'}`}
        >
            <div className="flex items-center gap-1 group-hover:text-indigo-300 transition-colors">
                <Clock size={12} aria-hidden="true" />
                <span>{time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            </div>
            <div className={`w-px h-3 transition-colors ${isDayMode ? 'bg-slate-200/80 group-hover:bg-indigo-200/80' : 'bg-white/10 group-hover:bg-indigo-500/30'}`} role="separator" aria-hidden="true" />
            <div className="flex items-center gap-1 group-hover:text-indigo-300 transition-colors">
                {weather ? getWeatherIcon(weather.weathercode) : <Cloud size={12} aria-hidden="true" />}
                <span>{weather ? `${Math.round(weather.temperature)}°C` : '...'}</span>
            </div>
            <div className={`w-px h-3 transition-colors ${isDayMode ? 'bg-slate-200/80 group-hover:bg-indigo-200/80' : 'bg-white/10 group-hover:bg-indigo-500/30'}`} role="separator" aria-hidden="true" />
            <span className={`truncate max-w-[60px] transition-colors ${isDayMode ? 'group-hover:text-slate-900' : 'group-hover:text-white'}`}>{city}</span>
        </button>

        <button
          onClick={() => setIsThemeOpen(true)}
            className={`btn-icon ${isThemeOpen ? (isDayMode ? 'text-slate-900 bg-white/90 shadow-[0_8px_20px_rgba(148,163,184,0.12)]' : 'text-white bg-white/10') : ''}`}
            title={t('nav.theme_settings')}
            aria-label={t('nav.theme_settings', '主题设置')}
            aria-expanded={isThemeOpen}
        >
            <Palette size={18} aria-hidden="true" />
        </button>
        
        <NotificationCenter />
        
        <LanguageSwitcher />

        {user ? (
          <div className="flex items-center gap-3">
             <Link 
                to={`/public-profile/${user.id}`}
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full border transition-all active:scale-95 ${isDayMode ? 'text-slate-900 border-slate-200/80 bg-white/80 hover:bg-white shadow-[0_8px_18px_rgba(148,163,184,0.12)]' : 'text-white border-white/10 bg-white/5 hover:bg-white/10'}`}
                aria-label={`访问 ${user.username} 的个人主页`}
             >
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white" aria-hidden="true">
                    {user.username.charAt(0).toUpperCase()}
                </div>
                <span>{user.username}</span>
             </Link>
             <button
                onClick={logout}
                className="btn-icon"
                title={t('auth.log_out')}
                aria-label={t('auth.log_out', '退出登录')}
             >
                <LogOut size={18} aria-hidden="true" />
             </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthOpen(true)}
            className={authButtonClasses}
            aria-label={t('auth.log_in', '登录')}
          >
            {t('auth.log_in')}
          </button>
        )}
      </div>

      <div className="md:hidden flex items-center justify-between w-full z-50 px-2">
        <div className={`text-lg font-bold tracking-wide absolute left-1/2 -translate-x-1/2 pointer-events-none ${isDayMode ? 'text-slate-800' : 'text-white/90'}`}>
          {currentNavLink?.key ? t(`nav.${currentNavLink.key}`) : ''}
        </div>

        <div className="flex items-center gap-2">
            <button 
              onClick={() => window.dispatchEvent(new Event('open-search-palette'))}
              className={`p-2 transition-colors ${isDayMode ? 'text-slate-500 hover:text-slate-900' : 'text-gray-300 hover:text-white'}`}
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => changeUiMode(isDayMode ? 'dark' : 'day')}
              className={`p-2 rounded-full transition-colors ${isDayMode ? 'bg-white/80 text-amber-500 shadow-[0_8px_18px_rgba(148,163,184,0.12)]' : 'bg-white/10 text-yellow-300'}`}
              title={t(isDayMode ? 'nav.night_mode' : 'nav.day_mode')}
            >
              <Sun size={18} />
            </button>
            <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-2">
            {showUploadButton && (
               <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sort'))}
                  className={`flex items-center gap-1.5 px-2 py-1.5 transition-colors relative rounded-full border ${isDayMode ? 'text-slate-500 hover:text-slate-900 bg-white/82 border-slate-200/80 shadow-[0_8px_18px_rgba(148,163,184,0.12)]' : 'text-gray-300 hover:text-white bg-white/5 border-white/10'}`}
               >
                  <ArrowUpDown size={18} />
                  {mobileToolbarState.sortLabel && (
                    <span className="text-[10px] font-semibold leading-none">
                      {mobileToolbarState.sortLabel}
                    </span>
                  )}
               </button>
            )}
            {showUploadButton && (
               <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-filter'))}
                  className={`p-1.5 transition-colors relative rounded-full border ${isDayMode ? 'text-slate-500 hover:text-slate-900 bg-white/82 border-slate-200/80 shadow-[0_8px_18px_rgba(148,163,184,0.12)]' : 'text-gray-300 hover:text-white bg-white/5 border-white/10'}`}
               >
                  <Filter size={18} />
                  {mobileToolbarState.filterCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.45)]">
                      {mobileToolbarState.filterCount}
                    </span>
                  )}
               </button>
            )}
            {showUploadButton && (
               <button 
                  onClick={handleUploadClick}
                  className="p-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-colors ml-1"
               >
                  <Plus size={16} strokeWidth={3} />
               </button>
            )}
            <NotificationCenter />
            {user ? (
                <Link 
                   to={`/public-profile/${user.id}`}
                   className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-[10px] text-white font-bold border border-white/20"
                >
                    {user.username.charAt(0).toUpperCase()}
                </Link>
            ) : (
                <button 
                    onClick={() => setIsAuthOpen(true)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${isDayMode ? 'bg-white/92 text-slate-800 border border-slate-200/80 hover:bg-white hover:text-indigo-600 shadow-[0_10px_24px_rgba(148,163,184,0.16)]' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                >
                    {t('auth.log_in')}
                </button>
            )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isWeatherModalOpen && (
          <Portal>
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm ${isDayMode ? 'bg-white/68' : 'bg-black/80'}`}
              onClick={() => setIsWeatherModalOpen(false)}
            >
              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0.96, opacity: 0 }}
                animate={prefersReducedMotion ? undefined : { scale: 1, opacity: 1 }}
                exit={prefersReducedMotion ? undefined : { scale: 0.96, opacity: 0 }}
                className={`rounded-2xl w-full max-w-sm overflow-hidden p-6 relative z-10 ${weatherModalClasses}`}
                onClick={e => e.stopPropagation()}
              >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-50 pointer-events-none" />

                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                        <MapPin size={24} className="text-indigo-400" /> {t('weather.location')}
                    </h3>
                    <button onClick={() => setIsWeatherModalOpen(false)} className={`transition-colors ${isDayMode ? 'text-slate-400 hover:text-slate-900' : 'text-gray-400 hover:text-white'}`}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleCitySearch} className="space-y-4 relative z-10">
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('weather.city_label')}</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('weather.placeholder')}
                                className={`w-full border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500 transition-all ${isDayMode ? 'bg-white/80 border-slate-200/80 text-slate-900 focus:bg-white' : 'bg-black/20 border-white/10 text-white focus:bg-black/40'}`}
                                autoFocus
                            />
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDayMode ? 'text-slate-400' : 'text-gray-500'}`} size={18} />
                        </div>
                        <p className={`text-xs mt-2 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('weather.search_help')}</p>
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25"
                    >
                        {isSearching ? t('weather.searching') : t('weather.search_btn')}
                    </button>
                </form>

                {searchResults.length > 0 && (
                    <div className={`mt-4 max-h-48 overflow-y-auto custom-scrollbar space-y-2 border-t pt-4 relative z-10 ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
                        <p className={`text-xs mb-2 ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>{t('weather.select')}</p>
                        {searchResults.map((result) => (
                              <button
                                  key={result.id}
                                  onClick={() => selectCity(result)}
                              className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col group border ${result.isLocal ? (isDayMode ? 'bg-indigo-50 border-indigo-200/80' : 'bg-indigo-900/20 border-indigo-500/30') : isDayMode ? 'bg-white/70 border-slate-200/70 hover:bg-white' : 'bg-black/20 border-transparent hover:bg-white/10'}`}
                              >
                                  <div className="flex justify-between items-center">
                                      <span className={`font-bold transition-colors ${result.isLocal ? (isDayMode ? 'text-indigo-600' : 'text-indigo-400') : isDayMode ? 'text-slate-900 group-hover:text-indigo-500' : 'text-white group-hover:text-indigo-400'}`}>
                                          {result.name}
                                      </span>
                                      {result.country_code ? (
                                          <img 
                                              src={`https://flagcdn.com/16x12/${result.country_code.toLowerCase()}.png`} 
                                              alt={result.country}
                                              className="opacity-50 group-hover:opacity-100 transition-opacity"
                                          />
                                      ) : (
                                          <span className={`text-[10px] px-1.5 rounded ${isDayMode ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-gray-400'}`}>{result.country}</span>
                                      )}
                                  </div>
                                  <span className={`text-xs ${isDayMode ? 'text-slate-500 group-hover:text-slate-700' : 'text-gray-400 group-hover:text-gray-300'}`}>
                                      {[result.admin1, result.country].filter(Boolean).join(', ')}
                                  </span>
                              </button>
                          ))}
                      </div>
                  )}
              </motion.div>
            </motion.div>
          </Portal>
        )}
        {isThemeOpen && (
          <Portal>
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm ${isDayMode ? 'bg-white/68' : 'bg-black/80'}`}
              onClick={() => setIsThemeOpen(false)}
            >
              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0.97, opacity: 0, y: 12 }}
                animate={prefersReducedMotion ? undefined : { scale: 1, opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { scale: 0.97, opacity: 0, y: 12 }}
                className={`p-4 rounded-2xl shadow-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto custom-scrollbar relative z-10 ${themeModalClasses}`}
                onClick={e => e.stopPropagation()}
              >
                <div className={`flex items-center justify-between mb-4 sticky top-0 p-2 rounded-lg z-10 backdrop-blur-md ${themeModalHeaderClasses}`}>
                  <div className="flex items-center gap-2">
                      <Palette size={16} />
                      <h3 className="text-sm font-bold uppercase tracking-widest">{t('nav.theme_settings')}</h3>
                  </div>
                  <button onClick={() => setIsThemeOpen(false)} className={isDayMode ? 'text-slate-400 hover:text-slate-900' : 'text-gray-400 hover:text-white'}>
                    <X size={20} />
                  </button>
                </div>

                <div className={`mb-4 rounded-2xl border p-1.5 ${isDayMode ? 'border-slate-200/80 bg-slate-50/90' : 'border-white/10 bg-white/5'}`}>
                  <div className={`mb-2 px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
                    {t('nav.appearance_mode')}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['dark', 'day'].map((mode) => {
                      const isActiveMode = uiMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => changeUiMode(mode)}
                          className={`rounded-xl px-3 py-3 text-left transition-all border ${isActiveMode ? 'bg-indigo-500/15 border-indigo-400/30 shadow-[0_10px_22px_rgba(99,102,241,0.14)]' : isDayMode ? 'bg-transparent border-transparent hover:bg-white/90' : 'bg-transparent border-transparent hover:bg-white/10'}`}
                        >
                          <div className={`text-sm font-semibold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t(mode === 'day' ? 'nav.day_mode' : 'nav.night_mode')}</div>
                          <div className={`mt-1 text-[11px] ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{t(mode === 'day' ? 'nav.day_mode_hint' : 'nav.night_mode_hint')}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {themeConfig.map((s) => {
                    const Icon = s.icon;
                    const isActive = backgroundScene === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => changeBackgroundScene(s.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all duration-300 border group relative overflow-hidden
                          ${isActive ? `${s.bg} ${s.borderColor}` : isDayMode ? 'bg-slate-50/80 border-slate-200/70 hover:bg-white' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                      >
                        <div className="relative z-10 flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${isActive ? (isDayMode ? 'bg-white/80' : 'bg-black/20') : (isDayMode ? 'bg-white/90' : 'bg-black/40')} ${s.color}`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <div className={`font-bold text-sm ${isActive ? (isDayMode ? 'text-slate-900' : 'text-white') : (isDayMode ? 'text-slate-700' : 'text-gray-300')}`}>{t(s.labelKey)}</div>
                            <div className={`text-[10px] font-mono uppercase tracking-wider ${isDayMode ? 'text-slate-400' : 'text-white/50'}`}>{t(s.descKey)}</div>
                          </div>
                          {isActive && (
                            <span className={`ml-auto inline-flex h-2 w-2 rounded-full ${s.dotColor}`} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </motion.nav>
  );
};

export default Navbar;
