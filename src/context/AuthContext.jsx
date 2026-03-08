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
    if (!token) return;

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch((err) => {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, refreshUser, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};
