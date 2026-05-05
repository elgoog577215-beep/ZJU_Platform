import { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import api from '../services/api';

const DEFAULT_SETTINGS = {
  pagination_enabled: 'false',
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
  about_intro: '我们致力于消除信息差，提供一个高质量的信息共享平台。',
  about_detail:
    '欢迎加入我们。在这里，你可以参与优质活动，并分享相关影像、文章、音乐与视频，一起建设有温度的校园社区。',
  contact_email: 'service@tuotuzju.com',
  contact_phone: '0571-87950000',
  contact_address: '浙江大学 SQTP 项目：拓途浙享团队',
};

const DEFAULT_UI_MODE = 'dark';
const UI_MODE_STORAGE_KEY = 'ui_mode_v2';

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

  return {
    ...merged,
    background_brightness: String(merged.background_brightness),
    background_vignette: String(merged.background_vignette),
    background_bloom: String(merged.background_bloom),
  };
};

const defaultSettingsValue = {
  settings: DEFAULT_SETTINGS,
  updateSetting: async () => ({ data: { success: false } }),
  loading: false,
  cursorEnabled: false,
  toggleCursor: () => {},
  uiMode: DEFAULT_UI_MODE,
  changeUiMode: () => {},
  changeBackgroundBrightness: () => {},
};

const SettingsContext = createContext(defaultSettingsValue);

export const useSettings = () => useContext(SettingsContext) || defaultSettingsValue;

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [cursorEnabled, setCursorEnabled] = useState(() => {
    const saved = readStorage('cursorEnabled', 'false');
    return saved === 'true';
  });
  const [uiMode, setUiMode] = useState(() => {
    const saved = readStorage(UI_MODE_STORAGE_KEY, DEFAULT_UI_MODE);
    return saved === 'day' || saved === 'dark' ? saved : DEFAULT_UI_MODE;
  });
  const [loading, setLoading] = useState(true);

  const updateSetting = useCallback((key, value) => {
    return api
      .post('/settings', { key, value })
      .then((res) => {
        if (res.data.success) {
          setSettings((prev) => normalizeSettings({ ...prev, [key]: String(value) }));
        }
        return res;
      })
      .catch((err) => {
        console.error('Failed to update setting:', err);
        throw err;
      });
  }, []);

  const changeBackgroundBrightness = useCallback(
    (value) => updateSetting('background_brightness', value),
    [updateSetting],
  );

  const toggleCursor = useCallback(() => {
    setCursorEnabled((prev) => {
      const newValue = !prev;
      writeStorage('cursorEnabled', String(newValue));
      return newValue;
    });
  }, []);

  const changeUiMode = useCallback((mode) => {
    const nextMode = mode === 'day' ? 'day' : 'dark';
    setUiMode(nextMode);
    writeStorage(UI_MODE_STORAGE_KEY, nextMode);
  }, []);

  const fetchSettings = useCallback(() => {
    api
      .get('/settings')
      .then((res) => {
        setSettings(normalizeSettings(res.data));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch settings:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.theme = uiMode;
    document.documentElement.style.colorScheme = uiMode === 'day' ? 'light' : 'dark';
    document.body.dataset.theme = uiMode;
  }, [uiMode]);

  const value = useMemo(
    () => ({
      settings,
      updateSetting,
      loading,
      cursorEnabled,
      toggleCursor,
      uiMode,
      changeUiMode,
      changeBackgroundBrightness,
    }),
    [
      settings,
      updateSetting,
      loading,
      cursorEnabled,
      toggleCursor,
      uiMode,
      changeUiMode,
      changeBackgroundBrightness,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
