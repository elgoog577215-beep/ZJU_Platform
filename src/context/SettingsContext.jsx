import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    pagination_enabled: 'false',
    theme: 'space',
    language: 'zh'
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
    api.post('/settings', { key, value })
      .then(res => {
        if (res.data.success) {
          setSettings(prev => ({ ...prev, [key]: String(value) }));
        }
      })
      .catch(err => console.error("Failed to update setting:", err));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loading, cursorEnabled, toggleCursor, backgroundScene, changeBackgroundScene }}>
      {children}
    </SettingsContext.Provider>
  );
};
