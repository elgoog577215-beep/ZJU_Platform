import { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import api from '../services/api';

const DEFAULT_SETTINGS = {
  pagination_enabled: 'false',
  theme: 'cyber',
  language: 'zh',
  site_title: '拓途浙享 | TUOTUZJU',
  hero_title: '浙江大学信息聚合平台',
  hero_subtitle: '打破信息差，共建信息网络',
  background_brightness: '1.0',
  background_vignette: '0.5',
  background_bloom: '0.8',
  background_enabled: 'false',
  background_scene: 'cyber',
  hero_bg_url: '/uploads/1767349451839-56405188.jpg',
  about_title: '浙江大学信息聚合平台',
  about_subtitle: '打破信息差，共建信息网络',
  about_intro: '我们致力于消除信息差，提供一个优质信息共享平台。',
  about_detail: '欢迎加入我们!在这里，你可以参与优质活动，并分享活动有关的影象、文章、音乐，共建一个有温度、有情怀的优质社区!',
  contact_email: 'yq20070130@outlook.com',
  contact_phone: '18668079838',
  contact_address: '浙江大学SQTP项目：拓途浙享团队'
};

const readStorage = (key, fallbackValue) => {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
};

const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
};

const normalizeSettings = (nextSettings = {}) => {
  const merged = { ...DEFAULT_SETTINGS, ...nextSettings };
  const normalizedScene = merged.background_scene || merged.theme || DEFAULT_SETTINGS.background_scene;
  const normalizedEnabled = merged.background_enabled ?? merged.backgroundEnabled ?? DEFAULT_SETTINGS.background_enabled;

  return {
    ...merged,
    background_scene: String(normalizedScene),
    background_enabled: String(normalizedEnabled)
  };
};

const defaultSettingsValue = {
  settings: DEFAULT_SETTINGS,
  updateSetting: async () => ({ data: { success: false } }),
  loading: false,
  cursorEnabled: false,
  toggleCursor: () => {},
  uiMode: 'dark',
  changeUiMode: () => {},
  backgroundEnabled: false,
  changeBackgroundEnabled: () => {},
  themeScene: 'cyber',
  changeThemeScene: () => {},
  backgroundScene: 'cyber',
  changeBackgroundScene: () => {},
  changeBackgroundBrightness: () => {}
};

const SettingsContext = createContext(defaultSettingsValue);

export const useSettings = () => useContext(SettingsContext) || defaultSettingsValue;

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [cursorEnabled, setCursorEnabled] = useState(() => {
    const saved = readStorage('cursorEnabled', 'false');
    return saved === 'true';
  });

  const [themeScene, setThemeScene] = useState(() => {
    return readStorage('background_scene', DEFAULT_SETTINGS.background_scene);
  });

  const [uiMode, setUiMode] = useState(() => {
    const saved = readStorage('ui_mode', 'dark');
    return saved === 'day' || saved === 'dark' ? saved : 'dark';
  });

  const updateSetting = useCallback((key, value) => {
    return api.post('/settings', { key, value })
      .then(res => {
        if (res.data.success) {
          setSettings(prev => normalizeSettings({ ...prev, [key]: String(value) }));
        }
        return res;
      })
      .catch(err => {
        console.error('Failed to update setting:', err);
        throw err;
      });
  }, []);

  const syncThemeScene = useCallback((scene) => {
    setThemeScene(scene);
    writeStorage('background_scene', scene);
    setSettings(prev => normalizeSettings({ ...prev, background_scene: scene, theme: scene }));
  }, []);

  const changeThemeScene = useCallback(async (scene) => {
    syncThemeScene(scene);
    try {
      await Promise.all([
        updateSetting('background_scene', scene),
        updateSetting('theme', scene)
      ]);
    } catch {
      return;
    }
  }, [syncThemeScene, updateSetting]);

  const changeBackgroundScene = changeThemeScene;

  const changeBackgroundBrightness = useCallback((value) => {
    return updateSetting('background_brightness', value);
  }, [updateSetting]);

  const backgroundEnabled = String(settings.background_enabled) !== 'false';

  const changeBackgroundEnabled = useCallback((enabled) => {
    const nextValue = enabled ? 'true' : 'false';
    setSettings(prev => normalizeSettings({ ...prev, background_enabled: nextValue }));
    updateSetting('background_enabled', nextValue).catch(() => {});
  }, [updateSetting]);

  const toggleCursor = useCallback(() => {
    setCursorEnabled(prev => {
      const newValue = !prev;
      writeStorage('cursorEnabled', String(newValue));
      return newValue;
    });
  }, []);

  const changeUiMode = useCallback((mode) => {
    const nextMode = mode === 'day' ? 'day' : 'dark';
    setUiMode(nextMode);
    writeStorage('ui_mode', nextMode);
  }, []);

  const [loading, setLoading] = useState(true);

  const fetchSettings = () => {
    api.get('/settings')
      .then(res => {
        const normalizedSettings = normalizeSettings(res.data);
        setSettings(normalizedSettings);
        const remoteScene = normalizedSettings.background_scene;
        if (remoteScene) {
          syncThemeScene(remoteScene);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch settings:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSettings();
  }, [syncThemeScene]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.theme = uiMode;
    document.documentElement.style.colorScheme = uiMode === 'day' ? 'light' : 'dark';
    document.body.dataset.theme = uiMode;
  }, [uiMode]);

  const value = useMemo(() => ({
    settings,
    updateSetting,
    loading,
    cursorEnabled,
    toggleCursor,
    uiMode,
    changeUiMode,
    backgroundEnabled,
    changeBackgroundEnabled,
    themeScene,
    changeThemeScene,
    backgroundScene: themeScene,
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
    backgroundEnabled,
    changeBackgroundEnabled,
    themeScene,
    changeThemeScene,
    changeBackgroundScene, 
    changeBackgroundBrightness
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
