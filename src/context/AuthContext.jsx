import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { showSuccess, showError } from '../utils/notify';
import errorMonitor from '../utils/errorMonitor';
import { useTranslation } from 'react-i18next';
import { clearStoredAuthToken, getStoredAuthToken, storeAuthToken } from '../shared/authTokenStorage';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!getStoredAuthToken());

  const getAuthErrorMessage = (err, fallbackKey) => {
    const data = err?.response?.data;
    const validationMessage = data?.errors?.[0]?.msg || data?.details?.[0]?.message;
    return data?.error || validationMessage || t(fallbackKey);
  };

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch((err) => {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          clearStoredAuthToken();
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password, options = {}) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, user } = res.data;
      storeAuthToken(token, { persistent: options.remember === true });
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      errorMonitor.setUser(user);
      showSuccess(t('auth.welcome_back_user', { username: user.username }));
      return true;
    } catch (err) {
      errorMonitor.report(err, { action: 'login', username });
      showError(getAuthErrorMessage(err, 'auth.login_failed'));
      return false;
    }
  };

  const register = async (username, password, options = {}) => {
    try {
      const res = await api.post('/auth/register', { username, password });
      const { token, user } = res.data;
      storeAuthToken(token, { persistent: options.remember === true });
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      errorMonitor.setUser(user);
      showSuccess(t('auth.welcome_user', { username: user.username }));
      return true;
    } catch (err) {
      errorMonitor.report(err, { action: 'register', username });
      showError(getAuthErrorMessage(err, 'auth.registration_failed'));
      return false;
    }
  };

  const logout = () => {
    clearStoredAuthToken();
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    errorMonitor.setUser(null);
    showSuccess(t('auth.logout_success'));
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      // 静默失败，不影响用户体验
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, refreshUser, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};
