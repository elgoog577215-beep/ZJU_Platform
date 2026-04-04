import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

  const getAuthErrorMessage = (err, fallbackKey) => {
    const data = err?.response?.data;
    const validationMessage = data?.errors?.[0]?.msg || data?.details?.[0]?.message;
    return data?.error || validationMessage || t(fallbackKey);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch((err) => {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      toast.success(t('auth.welcome_back_user', { username: user.username }));
      return true;
    } catch (err) {
      // 错误已在 API 拦截器中处理
      toast.error(getAuthErrorMessage(err, 'auth.login_failed'));
      return false;
    }
  };

  const register = async (username, password) => {
    try {
      const res = await api.post('/auth/register', { username, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      toast.success(t('auth.welcome_user', { username: user.username }));
      return true;
    } catch (err) {
      // 错误已在 API 拦截器中处理
      toast.error(getAuthErrorMessage(err, 'auth.registration_failed'));
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success(t('auth.logout_success'));
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
