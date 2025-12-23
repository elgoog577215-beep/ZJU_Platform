import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    pagination_enabled: 'false',
    theme: 'space',
    language: 'zh',
    site_title: '拓途浙享'
  });
  // Client-side only settings (not persisted to DB, but maybe localStorage)
  const [cursorEnabled, setCursorEnabled] = useState(() => {
    const saved = localStorage.getItem('cursorEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [backgroundScene, setBackgroundScene] = useState(() => {
    return localStorage.getItem('background_scene') || 'space';
  });

  const changeBackgroundScene = (scene) => {
    setBackgroundScene(scene);
    localStorage.setItem('background_scene', scene);
    updateSetting('theme', scene);
  };

  const changeBackgroundBrightness = (value) => {
    updateSetting('background_brightness', value);
  };

  const toggleCursor = () => {
    setCursorEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('cursorEnabled', JSON.stringify(newValue));
      return newValue;
    });
  };

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

  const updateSetting = (key, value) => {
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
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loading, cursorEnabled, toggleCursor, backgroundScene, changeBackgroundScene, changeBackgroundBrightness }}>
      {children}
    </SettingsContext.Provider>
  );
};
