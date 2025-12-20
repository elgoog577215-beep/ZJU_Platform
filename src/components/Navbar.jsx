import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera, MousePointer2, Cloud, Clock, CloudRain, Sun, CloudLightning, CloudSnow, CloudFog, MapPin, Search, LogOut, User, LogIn, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import UserProfileModal from './UserProfileModal';
import axios from 'axios';

import ReactDOM from 'react-dom';

const Portal = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

import { POPULAR_CITIES } from '../data/cities';

const Navbar = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const { cursorEnabled, toggleCursor } = useSettings();
  const { user, logout } = useAuth();
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [city, setCity] = useState(localStorage.getItem('weather_city') || 'Hangzhou');
  const [coords, setCoords] = useState(JSON.parse(localStorage.getItem('weather_coords')) || { lat: 30.27, lon: 120.15 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Weather
  useEffect(() => {
    if (!coords) return;
    
    axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`)
      .then(res => {
        setWeather(res.data.current_weather);
      })
      .catch(err => console.error("Weather fetch failed", err));
  }, [coords]);

  const handleCitySearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    
    const query = searchQuery.toLowerCase().trim();
    const localResults = POPULAR_CITIES.filter(city => 
        city.name.includes(query) || 
        city.name_en.toLowerCase().includes(query) ||
        (city.admin1 && city.admin1.toLowerCase().includes(query))
    ).map(city => ({
        id: `local-${city.id}`,
        name: city.name,
        country: city.country,
        admin1: city.admin1,
        latitude: city.lat,
        longitude: city.lon,
        isLocal: true
    }));

    try {
        const res = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${searchQuery}&count=10&language=zh&format=json`);
        
        let apiResults = [];
        if (res.data.results && res.data.results.length > 0) {
            apiResults = res.data.results;
        } else {
             const fallbackRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${searchQuery}&count=10&format=json`);
             if (fallbackRes.data.results && fallbackRes.data.results.length > 0) {
                  apiResults = fallbackRes.data.results;
             }
        }
        
        // Merge results, prioritizing local ones
        const mergedResults = [...localResults, ...apiResults];
        
        // Deduplicate based on coordinates (roughly)
        const uniqueResults = mergedResults.filter((v, i, a) => a.findIndex(v2 => (
            Math.abs(v2.latitude - v.latitude) < 0.1 && Math.abs(v2.longitude - v.longitude) < 0.1
        )) === i);

        setSearchResults(uniqueResults);

    } catch (err) {
        console.error("Geocoding failed", err);
        // Still show local results if API fails
        setSearchResults(localResults);
    } finally {
        setIsSearching(false);
    }
  };

  const selectCity = (result) => {
      const newCoords = { lat: result.latitude, lon: result.longitude };
      const newCity = result.name;
      
      setCoords(newCoords);
      setCity(newCity);
      localStorage.setItem('weather_city', newCity);
      localStorage.setItem('weather_coords', JSON.stringify(newCoords));
      
      setIsWeatherModalOpen(false);
      setSearchQuery('');
      setSearchResults([]);
  };

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
    { key: 'gallery', path: '/gallery' },
    { key: 'music', path: '/music' },
    { key: 'videos', path: '/videos' },
    { key: 'articles', path: '/articles' },
    { key: 'about', path: '/about' },
    { key: 'admin', path: '/admin' }
  ];

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-black/30 border-b border-white/10"
    >
      <Link to="/" className="flex items-center gap-2 text-white group z-50">
        <Camera className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
        <span className="font-bold font-serif text-xl tracking-tighter">LUMOS</span>
      </Link>
      
      {/* Desktop Menu */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((item) => (
          <Link 
            key={item.key} 
            to={item.path} 
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors relative group"
          >
            {t(`nav.${item.key}`)}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full" />
          </Link>
        ))}
        
        <div className="w-px h-6 bg-white/20 mx-2" />
        
        <button 
          onClick={() => window.dispatchEvent(new Event('open-search-palette'))}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
          title={t('nav.search_title')}
        >
          <Search size={18} />
        </button>

        {/* Weather & Clock Widget */}
        <button 
            onClick={() => setIsWeatherModalOpen(true)}
            className="flex items-center gap-3 text-xs text-gray-400 border border-white/10 px-3 py-1.5 rounded-full bg-black/20 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
        >
            <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="w-px h-3 bg-white/20" />
            <div className="flex items-center gap-1">
                {weather ? getWeatherIcon(weather.weathercode) : <Cloud size={12} />}
                <span>{weather ? `${Math.round(weather.temperature)}°C` : '...'}</span>
            </div>
            <div className="w-px h-3 bg-white/20" />
            <span className="truncate max-w-[60px]">{city}</span>
        </button>

        <button
          onClick={toggleCursor}
          className={`p-2 rounded-full transition-all ${cursorEnabled ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          title={cursorEnabled ? t('nav.cursor_disable') : t('nav.cursor_enable')}
        >
          <MousePointer2 size={18} />
        </button>
        
        <LanguageSwitcher />

        {user ? (
          <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsProfileOpen(true)}
               className="flex items-center gap-2 text-sm font-bold text-white hover:text-indigo-400 transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10"
             >
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white">
                    {user.username.charAt(0).toUpperCase()}
                </div>
                <span>{user.username}</span>
             </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAuthOpen(true)}
            className="text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full transition-all"
          >
            {t('auth.log_in')}
          </button>
        )}
      </div>

      {/* Mobile Actions */}
      <div className="md:hidden flex items-center gap-3 z-50">
        <button 
          onClick={() => window.dispatchEvent(new Event('open-search-palette'))}
          className="p-2 text-gray-300 hover:text-white"
        >
          <Search size={20} />
        </button>
        <LanguageSwitcher />
        {user ? (
            <button 
               onClick={() => setIsProfileOpen(true)}
               className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold border border-white/20"
            >
                {user.username.charAt(0).toUpperCase()}
            </button>
        ) : (
            <button 
                onClick={() => setIsAuthOpen(true)}
                className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors"
            >
                <LogIn size={18} />
            </button>
        )}
      </div>

      <AnimatePresence>
        {isWeatherModalOpen && (
          <Portal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsWeatherModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative z-10"
                onClick={e => e.stopPropagation()}
              >
                  {/* Glass Effect Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-50 pointer-events-none" />

                  <div className="flex justify-between items-center mb-6 relative z-10">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <MapPin size={24} className="text-indigo-400" /> {t('weather.location')}
                    </h3>
                    <button onClick={() => setIsWeatherModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleCitySearch} className="space-y-4 relative z-10">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">{t('weather.city_label')}</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('weather.placeholder')}
                                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all focus:bg-black/40"
                                autoFocus
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{t('weather.search_help')}</p>
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
                    <div className="mt-4 max-h-48 overflow-y-auto custom-scrollbar space-y-2 border-t border-white/10 pt-4 relative z-10">
                        <p className="text-xs text-gray-500 mb-2">{t('weather.select')}</p>
                        {searchResults.map((result) => (
                              <button
                                  key={result.id}
                                  onClick={() => selectCity(result)}
                                  className={`w-full text-left p-3 rounded-lg hover:bg-white/10 transition-colors flex flex-col group ${result.isLocal ? 'bg-indigo-900/20 border border-indigo-500/30' : 'bg-black/20'}`}
                              >
                                  <div className="flex justify-between items-center">
                                      <span className={`font-bold transition-colors ${result.isLocal ? 'text-indigo-400' : 'text-white group-hover:text-indigo-400'}`}>
                                          {result.name}
                                      </span>
                                      {result.country_code ? (
                                          <img 
                                              src={`https://flagcdn.com/16x12/${result.country_code.toLowerCase()}.png`} 
                                              alt={result.country}
                                              className="opacity-50 group-hover:opacity-100 transition-opacity"
                                          />
                                      ) : (
                                          <span className="text-[10px] bg-white/10 px-1.5 rounded text-gray-400">{result.country}</span>
                                      )}
                                  </div>
                                  <span className="text-xs text-gray-400 group-hover:text-gray-300">
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
      </AnimatePresence>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </motion.nav>
  );
};

export default Navbar;
