import { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import api from '../services/api';

const defaultSettingsValue = {
  settings: {
    pagination_enabled: 'false',
    theme: 'cyber',
    language: 'zh',
    site_title: '拓途浙享 | TUOTUZJU',
    hero_title: '浙江大学信息聚合平台',
    hero_subtitle: '打破信息差，共建信息网络',
    background_brightness: '1.0',
    background_vignette: '0.5',
    background_bloom: '0.8',
    hero_bg_url: '/uploads/1767349451839-56405188.jpg',
    about_title: '浙江大学信息聚合平台',
    about_subtitle: '打破信息差，共建信息网络',
    about_intro: '我们致力于消除信息差，提供一个优质信息共享平台。',
    about_detail: '欢迎加入我们!在这里，你可以参与优质活动，并分享活动有关的影象、文章、音乐，共建一个有温度、有情怀的优质社区!',
    contact_email: 'yq20070130@outlook.com',
    contact_phone: '18668079838',
    contact_address: '浙江大学SQTP项目：拓途浙享团队'
  },
  updateSetting: async () => ({ data: { success: false } }),
  loading: false,
  cursorEnabled: false,
  toggleCursor: () => {},
  uiMode: 'dark',
  changeUiMode: () => {},
  backgroundScene: 'cyber',
  changeBackgroundScene: () => {},
  changeBackgroundBrightness: () => {}
};

const SettingsContext = createContext(defaultSettingsValue);

export const useSettings = () => useContext(SettingsContext) || defaultSettingsValue;

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    pagination_enabled: 'false',
    theme: 'cyber',
    language: 'zh',
    site_title: '拓途浙享 | TUOTUZJU',
    hero_title: '浙江大学信息聚合平台',
    hero_subtitle: '打破信息差，共建信息网络',
    background_brightness: '1.0',
    background_vignette: '0.5',
    background_bloom: '0.8',
    hero_bg_url: '/uploads/1767349451839-56405188.jpg',
    about_title: '浙江大学信息聚合平台',
    about_subtitle: '打破信息差，共建信息网络',
    about_intro: '我们致力于消除信息差，提供一个优质信息共享平台。',
    about_detail: '欢迎加入我们!在这里，你可以参与优质活动，并分享活动有关的影象、文章、音乐，共建一个有温度、有情怀的优质社区!',
    contact_email: 'yq20070130@outlook.com',
    contact_phone: '18668079838',
    contact_address: '浙江大学SQTP项目：拓途浙享团队'
  });
  // Client-side only settings (not persisted to DB, but maybe localStorage)
  const [cursorEnabled, setCursorEnabled] = useState(() => {
    const saved = localStorage.getItem('cursorEnabled');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [backgroundScene, setBackgroundScene] = useState(() => {
    return localStorage.getItem('background_scene') || 'cyber';
  });

  const [uiMode, setUiMode] = useState(() => {
    try {
      const saved = localStorage.getItem('ui_mode');
      // Validate the saved value to ensure it's either 'day' or 'dark'
      if (saved === 'day' || saved === 'dark') {
        return saved;
      }
      // If invalid or missing, default to 'dark'
      return 'dark';
    } catch (e) {
      // localStorage may be unavailable in private browsing or restricted contexts
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SettingsContext] localStorage unavailable, using default theme:', e);
      }
      return 'dark';
    }
  });

  const updateSetting = useCallback((key, value) => {
    return api.post('/settings', { key, value })
      .then(res => {
        if (res.data.success) {
          setSettings(prev => ({ ...prev, [key]: String(value) }));
        }
        return res;
      })
      .catch(err => {
        console.error("Failed to update setting:", err);
        throw err;
      });
  }, []);

  const changeBackgroundScene = useCallback((scene) => {
    setBackgroundScene(scene);
    localStorage.setItem('background_scene', scene);
    // Don't sync to DB - theme preference is user-specific
  }, []);

  const changeBackgroundBrightness = useCallback((value) => {
    updateSetting('background_brightness', value);
  }, [updateSetting]);

  const toggleCursor = useCallback(() => {
    setCursorEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('cursorEnabled', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  const changeUiMode = useCallback((mode) => {
    const nextMode = mode === 'day' ? 'day' : 'dark';
    setUiMode(nextMode);
    try {
      localStorage.setItem('ui_mode', nextMode);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SettingsContext] Failed to save uiMode to localStorage:', e);
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[SettingsContext] Changed uiMode to:', nextMode);
    }
  }, []);

  const [loading, setLoading] = useState(true);

  const fetchSettings = () => {
    api.get('/settings')
      .then(res => {
        setSettings(prev => ({ ...prev, ...res.data }));
        // Sync background scene with DB setting if available
        if (res.data.theme) {
            setBackgroundScene(res.data.theme);
            localStorage.setItem('background_scene', res.data.theme);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch settings:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.theme = uiMode;
    document.documentElement.style.colorScheme = uiMode === 'day' ? 'light' : 'dark';
    document.body.dataset.theme = uiMode;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[SettingsContext] Applied theme to DOM:', {
        uiMode,
        datasetTheme: document.documentElement.dataset.theme,
        colorScheme: document.documentElement.style.colorScheme
      });
    }
  }, [uiMode]);

  const value = useMemo(() => ({
    settings,
    updateSetting,
    loading,
    cursorEnabled,
    toggleCursor,
    uiMode,
    changeUiMode,
    backgroundScene,
    changeBackgroundScene,
    changeBackgroundBrightness
  }), [
    settings, 
    updateSetting, 
    loading, 
    cursorEnabled, 
    toggleCursor, 
    uiMode,
    changeUiMode,
    backgroundScene, 
    changeBackgroundScene, 
    changeBackgroundBrightness
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
